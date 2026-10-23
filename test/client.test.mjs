import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createProjectClient } from "../src/api.mjs";

const session = async () => ({
  token: "signed-access-token",
  tenantId: "tenant-a",
});
test("list goes through gateway with bearer and refreshed tenant session", async () => {
  let request;
  const api = createProjectClient({
    getSession: session,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response("[]", { status: 200 });
    },
  });
  assert.deepEqual(await api.list("grapes"), []);
  assert.equal(
    request.url,
    "/api/v1/marketing/workspaces/tenant-a/projects?kind=grapes&limit=50&offset=0&summary=true",
  );
  assert.equal(
    request.options.headers.Authorization,
    "Bearer signed-access-token",
  );
  assert.equal(request.options.redirect, "error");
  assert.equal(request.options.credentials, "omit");
});
test("save preserves version and content and cannot select another tenant", async () => {
  let request;
  const api = createProjectClient({
    getSession: session,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return Response.json({ id: "project-1", version: 3 });
    },
  });
  await api.update("project-1", {
    name: "Page",
    content: { images: { hero: "asset-1" } },
    version: 2,
  });
  assert.equal(
    request.url,
    "/api/v1/marketing/workspaces/tenant-a/projects/project-1",
  );
  assert.deepEqual(JSON.parse(request.options.body), {
    name: "Page",
    content: { images: { hero: "asset-1" } },
    version: 2,
  });
});
test("unauthenticated and malformed tenant sessions cause no network requests", async () => {
  for (const value of [
    { token: "", tenantId: "tenant-a" },
    { token: "token", tenantId: "../tenant-b" },
    { token: "token", tenantId: null },
  ]) {
    let calls = 0;
    const api = createProjectClient({
      getSession: async () => value,
      fetchImpl: async () => {
        calls++;
      },
    });
    await assert.rejects(() => api.list("grapes"));
    assert.equal(calls, 0);
  }
});
test("refresh failure is not retried with stale token", async () => {
  let calls = 0;
  const api = createProjectClient({
    getSession: async () => {
      throw Error("expired");
    },
    fetchImpl: async () => {
      calls++;
    },
  });
  await assert.rejects(() => api.list("grapes"), /expired/);
  assert.equal(calls, 0);
});
test("API errors expose actionable safe messages", async () => {
  for (const status of [401, 403, 409, 503]) {
    const api = createProjectClient({
      getSession: session,
      fetchImpl: async () => new Response("private-token-debug", { status }),
    });
    await assert.rejects(
      () => api.list("grapes"),
      (e) => e.status === status && !e.message.includes("private-token-debug"),
    );
  }
});
test("project identifiers cannot alter the request path", async () => {
  const api = createProjectClient({
    getSession: session,
    fetchImpl: async () => {
      throw Error("network should not run");
    },
  });
  await assert.rejects(() => api.get("../tenant-b"), /identifier/);
});
test("redirect response cannot forward credentials to another path", async () => {
  let leaked = false;
  const server = http.createServer((req, res) => {
    if (req.url === "/leak") {
      leaked = !!req.headers.authorization;
      res.end("{}");
    } else {
      res.writeHead(302, { Location: "/leak" });
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const api = createProjectClient({
      getSession: session,
      fetchImpl: (url, options) =>
        fetch("http://127.0.0.1:" + server.address().port + url, options),
    });
    await assert.rejects(() => api.list("grapes"));
    assert.equal(leaked, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("every gateway request has a new correlation ID", async () => {
  const headers = [];
  const api = createProjectClient({
    getSession: session,
    fetchImpl: async (_url, options) => {
      headers.push(options.headers);
      return Response.json([]);
    },
  });
  await api.list("grapes");
  await api.list("grapes");
  assert.match(headers[0]["X-Correlation-ID"], /^[0-9a-f-]{36}$/);
  assert.notEqual(
    headers[0]["X-Correlation-ID"],
    headers[1]["X-Correlation-ID"],
  );
});
