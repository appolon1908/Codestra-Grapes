import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const runtime = await import("../runtime/server.mjs").catch(() => null);

test("standalone host serves only build assets and fails closed without gateway", async (t) => {
  assert.equal(typeof runtime?.createEditorServer, "function");
  const dist = await mkdtemp(join(tmpdir(), "codestra-host-"));
  await writeFile(
    join(dist, "index.html"),
    "<!doctype html><title>Editor</title>",
  );
  await mkdir(join(dist, "assets"));
  await writeFile(
    join(dist, "assets/index-test.js"),
    "export const safe = true;",
  );
  const server = runtime.createEditorServer({ dist });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dist, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin)).status, 200);
  assert.equal((await fetch(origin + "/assets/index-test.js")).status, 200);
  assert.equal((await fetch(origin + "/package.json")).status, 404);
  assert.equal((await fetch(origin + "/.env")).status, 404);
  assert.equal(
    (await fetch(origin + "/assets/%252e%252e/secret.js")).status,
    404,
  );
  assert.equal(
    (await fetch(origin + "/api/v1/marketing/workspaces/company-a/projects"))
      .status,
    503,
  );
  const health = await fetch(origin + "/healthz");
  assert.equal((await health.json()).productionEffects, false);
  assert.match(
    health.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
});

test("gateway proxy preserves auth/path, discards identity spoofing and refuses redirects", async (t) => {
  assert.equal(typeof runtime?.createEditorServer, "function");
  const seen = [];
  const upstream = http.createServer((req, res) => {
    seen.push({ path: req.url, headers: req.headers });
    if (req.url.includes("offset=1")) {
      res.writeHead(302, { location: "https://outside.example/" });
      return res.end();
    }
    res.setHeader("Content-Type", "application/json");
    res.end("[]");
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const upstreamOrigin = `http://127.0.0.1:${upstream.address().port}`;
  assert.throws(() =>
    runtime.createEditorServer({ dist: ".", gatewayOrigin: upstreamOrigin }),
  );
  assert.throws(() =>
    runtime.createEditorServer({
      dist: ".",
      gatewayOrigin: "https://example.test/private",
    }),
  );
  const server = runtime.createEditorServer({
    dist: ".",
    gatewayOrigin: upstreamOrigin,
    allowLocalHttp: true,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = {
    authorization: "Bearer synthetic-token",
    "x-correlation-id": "00000000-0000-4000-8000-000000000001",
    "x-tenant-id": "forged-company",
    "x-forwarded-host": "production.example",
  };
  const path =
    "/api/v1/marketing/workspaces/company-a/projects?kind=grapes&offset=0";
  assert.equal((await fetch(origin + path, { headers })).status, 200);
  assert.equal(seen[0].path, path);
  assert.equal(seen[0].headers.authorization, "Bearer synthetic-token");
  assert.equal(seen[0].headers["x-tenant-id"], undefined);
  assert.equal(seen[0].headers["x-forwarded-host"], undefined);
  assert.equal(
    (
      await fetch(origin + path.replace("offset=0", "offset=1"), {
        headers,
        redirect: "manual",
      })
    ).status,
    502,
  );
  assert.equal(
    (await fetch(origin + "/api/v1/other", { headers })).status,
    404,
  );
  assert.equal(
    (
      await fetch(origin + "/api/v1/marketing/workspaces/company-a/projects", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: "x".repeat(1048577),
      })
    ).status,
    413,
  );
});
