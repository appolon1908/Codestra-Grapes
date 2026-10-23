const gateway = "/api/v1/marketing";
const identifier = (value) => {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)
  ) {
    throw new Error("Invalid project or workspace identifier.");
  }
  return encodeURIComponent(value);
};
const messages = {
  401: "Your session expired. Sign in again.",
  403: "You do not have access to this workspace or action.",
  404: "This project is unavailable.",
  409: "A newer version exists. Reload the project before saving.",
  413: "The project is too large to save.",
  422: "Check the project name and content.",
  503: "Project storage or sign-in is temporarily unavailable.",
};
export function createProjectClient({
  getSession,
  fetchImpl = globalThis.fetch,
}) {
  async function request(path, method = "GET", payload) {
    const session = await getSession();
    if (!session?.token) throw new Error("Sign in to access your projects.");
    const tenant = identifier(session.tenantId);
    const response = await fetchImpl(
      gateway + "/workspaces/" + tenant + "/projects" + path,
      {
        method,
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: {
          "X-Correlation-ID": globalThis.crypto.randomUUID(),
          Authorization: "Bearer " + session.token,
          "Content-Type": "application/json",
        },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      },
    );
    if (!response.ok) {
      const error = new Error(
        messages[response.status] || "The project request failed.",
      );
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  return {
    list: async (kind, offset = 0) => {
      if (!Number.isSafeInteger(offset) || offset < 0)
        throw new Error("Invalid project offset.");
      return request(
        "?kind=" + identifier(kind) + "&limit=50&offset=" + offset,
      );
    },
    get: async (id) => request("/" + identifier(id)),
    create: async (payload) => request("", "POST", payload),
    update: async (id, payload) =>
      request("/" + identifier(id), "PUT", payload),
    remove: async (id, version) =>
      request(
        "/" + identifier(id) + "?version=" + encodeURIComponent(version),
        "DELETE",
      ),
  };
}
