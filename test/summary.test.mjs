import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createProjectClient } from "../src/api.mjs";
import { createEditorServer } from "../runtime/server.mjs";

test("editor lists large projects through bounded metadata summaries and loads full detail separately", async (t) => {
  const projects = Array.from({ length: 3 }, (_, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    tenant_id: "tenant-a",
    name: "Large project",
    kind: "grapes",
    version: 1,
    content: { large: "x".repeat(800000) },
  }));
  const upstream = http.createServer((req, res) => {
    const url = new URL(req.url, "http://local.invalid");
    res.setHeader("Content-Type", "application/json");
    if (url.pathname.endsWith("/projects")) {
      assert.equal(url.searchParams.get("summary"), "true");
      res.end(
        JSON.stringify(projects.map(({ content, ...summary }) => summary)),
      );
    } else res.end(JSON.stringify(projects[0]));
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const proxy = createEditorServer({
    dist: ".",
    gatewayOrigin: `http://127.0.0.1:${upstream.address().port}`,
    allowLocalHttp: true,
  });
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => proxy.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
  });
  const client = createProjectClient({
    getSession: async () => ({ token: "synthetic", tenantId: "tenant-a" }),
    fetchImpl: (url, options) => {
      assert.equal(
        new URL(url, "http://local.invalid").searchParams.get("summary"),
        url.includes("/projects?") ? "true" : null,
      );
      return fetch(`http://127.0.0.1:${proxy.address().port}${url}`, options);
    },
  });
  const summaries = await client.list("grapes");
  assert.equal(summaries.length, 3);
  assert.ok(summaries.every((project) => !("content" in project)));
  assert.deepEqual(
    (await client.get(projects[0].id)).content,
    projects[0].content,
  );
});
