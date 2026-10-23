import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const port = 31000 + Math.floor(Math.random() * 10000);
const child = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
});
const base = `http://127.0.0.1:${port}`;
async function ready() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw Error("server exited before becoming ready");
    try {
      const r = await fetch(base + "/api/v1/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("server did not start");
}
test("health and API catalog; project CRUD fails closed", async () => {
  try {
    await ready();
    let r = await fetch(base + "/api/v1/health", {
      signal: AbortSignal.timeout(2000),
    });
    assert.equal((await r.json()).productionEffects, false);
    r = await fetch(base + "/api/v1/integrations");
    assert.equal((await r.json()).length, 12);
    r = await fetch(base + "/api/v1/workspaces/other/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "cross-tenant" }),
    });
    assert.equal(r.status, 501);
  } finally {
    child.kill();
  }
});
