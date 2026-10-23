import test from "node:test";
import assert from "node:assert/strict";
const handoff = await import("../src/handoff.mjs").catch(() => null);
test("handoff names only a saved source revision and never includes credentials or draft content", () => {
  assert.equal(typeof handoff?.savedAuthoringReference, "function");
  const project = {
    id: "00000000-0000-4000-8000-000000000001",
    tenant_id: "company-a",
    kind: "grapes",
    version: 3,
    name: "Private draft",
    content: { secret: "private" },
    access_token: "never-export",
  };
  const ref = handoff.savedAuthoringReference(project, "company-a", "grapes");
  assert.deepEqual(ref, {
    schemaVersion: 1,
    source: {
      workspaceId: "company-a",
      projectId: project.id,
      kind: "grapes",
      revision: 3,
    },
    purpose: "authoring-reference",
    publishAuthorized: false,
    executionAuthorized: false,
  });
  assert.equal(JSON.stringify(ref).includes("private"), false);
  assert.equal(JSON.stringify(ref).includes("never-export"), false);
  assert.throws(() =>
    handoff.savedAuthoringReference(
      { ...project, version: 0 },
      "company-a",
      "grapes",
    ),
  );
  assert.throws(() =>
    handoff.savedAuthoringReference(project, "company-b", "grapes"),
  );
  assert.throws(() =>
    handoff.savedAuthoringReference(project, "company-a", "react-flow"),
  );
  assert.throws(() =>
    handoff.savedAuthoringReference(null, "company-a", "grapes"),
  );
});
