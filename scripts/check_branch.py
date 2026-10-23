"""Validate this repository's explicit, adjacent promotion boundaries."""

import json
import os
from pathlib import Path


def allowed(base: str, head: str, policy: dict) -> bool:
    subsection = policy["subsection"]
    section = policy["section"]
    if head.startswith("atomic/") and len(head) > len("atomic/"):
        return base == subsection
    return (head, base) in {
        (subsection, section),
        (section, "development"),
        ("development", "testing"),
        ("testing", "staging"),
        ("staging", "production"),
    }


def main():
    root = Path(__file__).resolve().parents[1]
    policy = json.loads((root / "branch-policy.json").read_text())
    if os.getenv("GITHUB_EVENT_NAME") != "pull_request":
        print("No promotion requested; branch policy tests apply.")
        return
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    pr = event["pull_request"]
    head, base = pr["head"]["ref"], pr["base"]["ref"]
    same_repository = pr["head"]["repo"]["full_name"] == pr["base"]["repo"]["full_name"]
    if not same_repository or not allowed(base, head, policy):
        raise SystemExit(f"Invalid promotion: {head} -> {base}")
    print(f"Permitted promotion: {head} -> {base}; independent review remains required.")


if __name__ == "__main__":
    main()
