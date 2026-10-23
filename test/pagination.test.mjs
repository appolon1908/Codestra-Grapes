import test from "node:test";
import assert from "node:assert/strict";
import { createProjectClient } from "../src/api.mjs";
test("saved project listing can reach projects after the first page", async () => {
  let seen;
  const api = createProjectClient({
    getSession: async () => ({ token: "token", tenantId: "tenant-a" }),
    fetchImpl: async (url) => {
      seen = url;
      return Response.json([{ id: "project-51" }]);
    },
  });
  const projects = await api.list("grapes", 50);
  assert.equal(
    seen,
    "/api/v1/marketing/workspaces/tenant-a/projects?kind=grapes&limit=50&offset=50",
  );
  assert.equal(projects[0].id, "project-51");
});
