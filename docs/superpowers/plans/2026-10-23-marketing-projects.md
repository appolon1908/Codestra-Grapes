# Marketing project security and gateway implementation

Authorization: user requested implementation, tests, commits and pushes on dev-desktop. Production effects remain disabled.

Architecture: Marketing-Backend stores editor projects only; Landing-Pages uses Vue and Breero retains business data authority. Editors authenticate with Keycloak Authorization Code + PKCE and send bearer tokens through Codestra Caddy/Kong. Backend verifies RS256, issuer, audience, expiry, subject, azp, tenant_id, marketing.read/write scopes. PostgreSQL stores workspace-owned project JSON with optimistic version checks. No runtime schema creation or publishing/delivery route.

1. Backend: add signed-token rejection and tenant CRUD tests first; implement app/config.py, auth.py, db.py, models.py and routes; explicit Alembic migration; run real PostgreSQL tests including restart persistence and cross-tenant IDs.
2. Editors: preserve starter apps, add client tests first, Keycloak login and token refresh, tenant workspace from token, gateway-only transport, project list/create/load/save, conflict errors; test and build both.
3. Gateway: inspect existing ingress contract, ship reviewable Caddy/Kong integration fragments and local gateway test with production disabled. Do not reload shared infrastructure or create identity clients.
4. Review/security: validate config fail-closed, malformed tokens and IDs, role escalation, foreign project IDs, stale updates, database failure, redirect credential leakage. Fresh independent code review before final verification.
5. Delivery: atomic branches only. Backend targets existing subsection/backend-foundation; editors are empty repositories and their initial atomic branches require bootstrap review before promotion. Push verified commits; do not invent main/protection or claim production activation.

Review focus: JWT algorithm confusion/key rotation, client controlled tenant identity, lost updates, token leakage on redirects, unbounded project payloads.
