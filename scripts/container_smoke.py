"""Build and inspect only this task's disposable, loopback-only container."""
import json
import os
import secrets
import shlex
import subprocess
import time
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
docker = shlex.split(os.getenv("DOCKER", "docker"))
name = "codestra-image-check-" + secrets.token_hex(5)
image = "local/" + name
port = int(os.getenv("CONTAINER_PORT", "4173"))
health_path = os.getenv("HEALTH_PATH", "/healthz")
started = False


def run(args):
    result = subprocess.run(docker + args, cwd=root, capture_output=True, text=True, timeout=480)
    if result.returncode:
        raise RuntimeError(result.stderr[-3000:])
    return result.stdout.strip()


try:
    run(["build", "--label", "codestra.task=standalone-image-check", "-t", image, "."])
    user = run(["image", "inspect", image, "--format", "{{.Config.User}}"])
    assert user not in ("", "root", "0", "0:0"), "Image must declare a non-root user"
    run(["run", "-d", "--rm", "--name", name, "--label", "codestra.task=standalone-image-check", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "-p", f"127.0.0.1::{port}", image])
    started = True
    published = run(["port", name, f"{port}/tcp"]).rsplit(":", 1)[1]
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{published}{health_path}", timeout=2) as response:
                health = json.load(response)
            break
        except (OSError, ValueError):
            time.sleep(0.5)
    else:
        raise RuntimeError("Image health check did not become ready")
    effects = health.get("productionEffects", health.get("production_effects"))
    assert effects is False, "Production effects must remain disabled"
    assert run(["exec", name, "id", "-u"]) != "0", "Runtime user must be non-root"
    print(json.dumps({"result": "PASS", "image": run(["image", "inspect", image, "--format", "{{.Id}}"]), "runtime_user": user, "health": health, "loopback_only": True, "read_only": True}))
finally:
    if started:
        subprocess.run(docker + ["rm", "-f", name], capture_output=True, check=False)
    subprocess.run(docker + ["image", "rm", image], capture_output=True, check=False)
