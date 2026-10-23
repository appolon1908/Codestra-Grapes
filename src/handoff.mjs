const id =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function savedAuthoringReference(project, tenant, kind) {
  if (
    !project ||
    !id.test(project.id) ||
    project.tenant_id !== tenant ||
    typeof tenant !== "string" ||
    !tenant ||
    tenant.length > 128 ||
    project.kind !== kind ||
    !["grapes", "react-flow"].includes(kind) ||
    !Number.isSafeInteger(project.version) ||
    project.version < 1
  )
    throw Error(
      "Load or save a project in your workspace before exporting its reference.",
    );
  return {
    schemaVersion: 1,
    source: {
      workspaceId: tenant,
      projectId: project.id,
      kind,
      revision: project.version,
    },
    purpose: "authoring-reference",
    publishAuthorized: false,
    executionAuthorized: false,
  };
}
