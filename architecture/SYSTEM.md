# Integration boundaries

Each editor runs independently. Codestra-Marketing-Backend owns draft project persistence, tenant authorization and versioned writes for both editor kinds. Frontends never become the authority for tenant access.

Browser → same-origin hosting proxy → existing Codestra Caddy/Kong gateway → Marketing Backend → PostgreSQL. Keycloak issues the access token; the gateway and backend verify it. The browser never calls PostgreSQL, OpenBao, Odoo, n8n or a provider directly.

All five project operations use /api/v1/marketing/workspaces/{workspace_id}/projects, optionally followed by /{project_id}. Lists use kind, limit and offset. Writes require marketing.write; reads require marketing.read. The token's tenant_id must match the workspace and the stored project. Versioned PUT/DELETE reject stale writes. The gateway additionally applies its registered role, request-context, body-size and rate-limit policies.

GrapesJS is a visual page design tool. React Flow is a visual graph editor, not an execution engine. The shared Landing-Pages Vue application serves campaign pages and signup journeys under its own contract; Grapes content is not automatically a Vue component. Breero remains responsible for Landing-Pages business operations. Middleware and approved adapters retain orchestration and integration authority.

No publish, domain provisioning, campaign activation, message sending, billing, or workflow-execution APIs are exposed. A future publishing/rendering contract and security review are required before any stored design becomes a public page.

The gateway and identity onboarding details live in the backend's gateway directory. Registration source is prepared for review; runtime activation remains disabled.
