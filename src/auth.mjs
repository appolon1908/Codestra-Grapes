import Keycloak from "keycloak-js";

const env = import.meta.env;
let client;
let initialization;
export const authConfigured = Boolean(
  env.VITE_KEYCLOAK_URL &&
  env.VITE_KEYCLOAK_REALM &&
  env.VITE_KEYCLOAK_CLIENT_ID,
);

export function initializeSession() {
  if (!authConfigured) return Promise.resolve(false);
  if (!initialization) {
    const url = new URL(env.VITE_KEYCLOAK_URL);
    if (url.protocol !== "https:" || url.username || url.password) {
      return Promise.reject(
        new Error("Sign-in requires a trusted HTTPS identity server."),
      );
    }
    client = new Keycloak({
      url: url.href,
      realm: env.VITE_KEYCLOAK_REALM,
      clientId: env.VITE_KEYCLOAK_CLIENT_ID,
    });
    initialization = client.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
    });
  }
  return initialization;
}
export async function login() {
  await initializeSession();
  if (!client) throw new Error("Sign-in is not configured.");
  return client.login();
}
export async function logout() {
  if (client) return client.logout({ redirectUri: window.location.origin });
}
export async function getSession() {
  await initializeSession();
  if (!client?.authenticated)
    throw new Error("Sign in to access your projects.");
  try {
    await client.updateToken(30);
  } catch {
    client.clearToken();
    throw new Error("Your session expired. Sign in again.");
  }
  return { token: client.token, tenantId: client.tokenParsed?.tenant_id };
}
