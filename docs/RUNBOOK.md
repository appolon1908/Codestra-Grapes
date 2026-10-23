# Independent editor operation

This repository is an authoring application. It edits tenant-scoped drafts through the existing Codestra API gateway. It cannot publish landing pages or execute automation graphs.

## Build and run

Use Node 22 and the checked-in lockfile:

```sh
npm ci
npm test
npm run build
npm start
```

The packaged server defaults to `127.0.0.1:4173`. Missing identity or gateway configuration leaves protected operations unavailable. `/healthz` reports liveness, gateway configuration and `productionEffects: false`; it does not certify a working login or backend connection.

For a new local image:

```sh
docker compose up --build -d
```

The image runs as `node`, uses a read-only filesystem, drops capabilities and publishes only on loopback. Set `EDITOR_PORT` to use a different local port. Configure `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM` and `VITE_KEYCLOAK_CLIENT_ID` before building: these are public identity identifiers, never secrets. `VITE_KEYCLOAK_URL` is an HTTPS origin without a path. A configuration change requires rebuilding the browser bundle. Runtime `KEYCLOAK_ORIGIN` must match that origin for the content security policy.

Set `CODESTRA_GATEWAY_ORIGIN` to the existing approved HTTPS gateway origin, without credentials or a path. The packaged same-origin proxy permits only marketing project routes, bearer authorization, a UUID correlation ID and bounded JSON bodies. It discards caller-supplied identity/tenant forwarding headers, does not forward cookies, rejects gateway redirects, and limits response size and duration. The backend remains responsible for JWT verification and tenant authorization.

The local development server's proxy settings and production-shaped packaged server are separate entry points. Use the packaged server when validating hosting behavior. Do not point preview configuration at production. No gateway configuration is deployed by this repository.

## Saved authoring handoff

After saving or loading a project, **Export saved reference** downloads a schema-versioned JSON reference naming the workspace, project kind, ID and saved revision. Unsaved edits are excluded. The export contains no token, project content, publication approval or execution approval. A session/workspace mismatch rejects the export.

Landing-Pages renders Vue runtime documents; it does not execute GrapesJS JSON or React Flow graphs. Breero must authorize the authoring binding, fetch and validate the named saved revision server-side, and compile an immutable approved runtime document before any future publication. The draft API does not promise historical revision retrieval: an outdated reference must be rejected or refreshed. Do not treat possession of the downloaded file as authorization.

## Checks, rollback and ownership

```sh
npm run format:check
npm run test:browser
python3 scripts/test_branch.py
python3 scripts/container_smoke.py
```

Install Playwright Chromium first, or set `CHROME_BIN` to an installed Chrome executable. The image smoke check builds a temporary image, verifies an actual non-root read-only startup and disabled effects, and removes only its own resources. `DOCKER='sudo -n docker'` is supported locally.

Rollback a hosted preview by selecting the previous verified image and its matching public identity configuration; project records remain in Marketing Backend. Preserve atomic → declared subsection → section/editor → development → testing → staging → production and independent review. See `VERIFICATION.md` for tested boundaries and remaining owner gates. No merge, publication, domain change, workflow execution or deployment is part of this foundation.
