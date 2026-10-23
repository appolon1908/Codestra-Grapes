import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const MAX = 1048576;
const correlation =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pathPattern =
  /^\/api\/v1\/marketing\/workspaces\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\/projects(?:\/[0-9a-f-]{36})?$/i;
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
function origin(value, allowLocalHttp = false) {
  if (!value) return null;
  const url = new URL(value);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" &&
      !(allowLocalHttp && local && url.protocol === "http:")) ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("Use an HTTPS gateway origin without credentials or a path.");
  return url.origin;
}
function body(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let exceeded = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX) {
        exceeded = true;
        chunks.length = 0;
        reject(Object.assign(Error("Too large"), { status: 413 }));
      } else if (!exceeded) chunks.push(chunk);
    });
    req.on("end", () => {
      if (!exceeded) resolveBody(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}
export function createEditorServer({
  dist,
  gatewayOrigin = "",
  identityOrigin = "",
  allowLocalHttp = false,
  timeoutMs = 10000,
}) {
  const gateway = origin(gatewayOrigin, allowLocalHttp);
  const identity = origin(identityOrigin);
  const connect = identity ? ` ${identity}` : "";
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'${connect}; frame-src 'self'${connect}; frame-ancestors 'none'; base-uri 'none'; object-src 'none'`,
    );
    const send = (status, value) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    const raw = req.url || "/";
    const path = raw.split("?")[0];
    try {
      if (path === "/healthz" && req.method === "GET")
        return send(200, {
          status: "ok",
          gatewayConfigured: Boolean(gateway),
          productionEffects: false,
        });
      if (path.startsWith("/api/")) {
        if (
          !pathPattern.test(path) ||
          !["GET", "POST", "PUT", "DELETE"].includes(req.method)
        )
          return send(404, { error: "Unknown API route." });
        if (!gateway) return send(503, { error: "Gateway is not configured." });
        const requestId = req.headers["x-correlation-id"];
        if (typeof requestId !== "string" || !correlation.test(requestId))
          return send(400, { error: "A UUID correlation ID is required." });
        if (!req.headers.authorization?.startsWith("Bearer "))
          return send(401, { error: "Bearer token required." });
        const params = new URL(raw, "http://local.invalid").searchParams;
        for (const [key, value] of params)
          if (
            !["kind", "limit", "offset", "version", "summary"].includes(key) ||
            value.length > 100
          )
            return send(400, { error: "Invalid project query." });
        const bytes = ["POST", "PUT"].includes(req.method)
          ? await body(req)
          : undefined;
        const response = await fetch(gateway + raw, {
          method: req.method,
          headers: {
            Authorization: req.headers.authorization,
            "X-Correlation-ID": requestId,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: bytes,
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status >= 300 && response.status < 400) {
          await response.body?.cancel();
          return send(502, { error: "Gateway redirects are not allowed." });
        }
        const chunks = [];
        let size = 0;
        if (response.body)
          for await (const chunk of response.body) {
            size += chunk.length;
            if (size > 2 * MAX) throw Error("Gateway response too large.");
            chunks.push(chunk);
          }
        res.setHeader("X-Correlation-ID", requestId);
        if (response.headers.get("retry-after")?.match(/^\d{1,6}$/))
          res.setHeader("Retry-After", response.headers.get("retry-after"));
        res.writeHead(response.status, { "Content-Type": "application/json" });
        return res.end(Buffer.concat(chunks));
      }
      if (!["GET", "HEAD"].includes(req.method))
        return send(405, { error: "Method not allowed." });
      let file;
      if (path === "/") file = "index.html";
      else if (path === "/integrations.json") file = "integrations.json";
      else if (/^\/assets\/[A-Za-z0-9_-]+\.(js|css|svg|png|woff2)$/.test(path))
        file = path.slice(1);
      else return send(404, { error: "Not found." });
      const target = join(resolve(dist), file);
      if (!(await stat(target)).isFile())
        return send(404, { error: "Not found." });
      const bytes = await readFile(target);
      const type =
        file === "index.html"
          ? "text/html"
          : file === "integrations.json"
            ? "application/json"
            : types[file.slice(file.lastIndexOf("."))];
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": bytes.length,
      });
      return res.end(req.method === "HEAD" ? undefined : bytes);
    } catch (error) {
      if (!res.headersSent)
        return send(error.status || (path.startsWith("/api/") ? 503 : 404), {
          error: path.startsWith("/api/")
            ? "Gateway request unavailable."
            : "Not found.",
        });
      res.destroy();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 40;
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = createEditorServer({
    dist: process.env.DIST_DIR || new URL("../dist", import.meta.url).pathname,
    gatewayOrigin: process.env.CODESTRA_GATEWAY_ORIGIN,
    identityOrigin: process.env.KEYCLOAK_ORIGIN,
  });
  const port = Number(process.env.PORT || 4173);
  server.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(`Editor listening on ${port}; production effects disabled.`),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => server.close(() => process.exit(0)));
}
