# Codestra-Grapes

An internal visual page designer with authenticated project save/load. Public landing and signup pages remain in the shared Landing-Pages frontend; Breero retains its business backend responsibilities.

## Run locally

Use Node 22 or later.

```sh
npm ci
npm test
npm run build
npm run dev
```

Without identity configuration, local drafting works and save/load remain disabled. Copy `.env.example` to a private local environment file and supply the approved staging settings. VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and VITE_KEYCLOAK_CLIENT_ID are public configuration, never secrets. Keycloak uses authorization-code + PKCE S256; access tokens stay in memory and refresh before API requests.

Set CODESTRA_GATEWAY_ORIGIN to the approved staging gateway origin. The development proxy forwards only `/api/v1/marketing`, preserves the path, verifies TLS, and does not follow redirects. Loopback HTTP is allowed only for local test gateways. Do not target a backend or production host. In a static deployment, configure the hosting server's same-origin proxy to the existing Codestra gateway; Vite's development proxy is not included in the built files.

## Project behavior

The signed session supplies the workspace. The client sends a bearer token and a unique X-Correlation-ID on every request. The backend independently verifies identity, scope and ownership.

Create and save an grapes project; load it later, paginate through saved projects, or begin a new local draft. Save sends the loaded version; a conflict leaves the draft available for reconciliation. New draft and loading a different project replace unsaved local edits. No autosave, publication or workflow execution occurs.

Saved page JSON is rebuilt from allowlisted component properties before loading or saving. Raw HTML is sanitized with DOMPurify. Script components, event handlers, embedded frames, executable URLs and CSS imports/URLs are rejected; use image blocks for imagery. Arbitrary custom plugins/scripts and multi-frame pages are not supported.

The API contract is owned by [Codestra-Marketing-Backend](https://github.com/appolon1908/Codestra-Marketing-Backend). Its native gateway registration and registry changes are review candidates; real gateway activation and Keycloak configuration have not been applied. The bundled integration catalog is informational and all providers remain disconnected. The legacy `server/index.mjs` is a read-only catalog/test stub, not project storage and not the editor's API transport.

## Checks and review

```sh
npm run format:check
npm test
npm run build
npm audit --audit-level=high
npx playwright install chromium
npm run test:browser
```

Browser tests use synthetic identity and intercepted project API responses to exercise the actual editor. They do not certify live Keycloak or Kong. On dev-desktop, `CHROME_BIN=/usr/bin/google-chrome npm run test:browser` uses the installed browser. See [verification](docs/VERIFICATION.md).

Work is on an atomic bootstrap branch. The repository began empty. An empty subsection/bootstrap-editor commit supplies the first PR review base; all application files are proposed on the atomic branch. Preserve the untouched local starter worktree and require review before promotion. No main/development/testing/staging/production branches, protection settings, or deployments are created by the application. CODEOWNERS and CI are included; the observed repository ruleset list was empty. Require independent review and `Editor checks / editor-checks` before any promotion.
