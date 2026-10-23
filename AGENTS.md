# Editor repository rules
This repository owns its standalone editor UI and authenticated API client.
Codestra-Marketing-Backend owns editor project persistence and tenant authorization.
Landing-Pages owns public Vue rendering; Breero owns business data. Do not duplicate those backends.
Use one writer and an isolated worktree. Preserve original starter files.
Atomic -> subsection -> section -> development -> testing -> staging -> production.
This repository began empty: the initial atomic branch is a bootstrap review candidate, not a protected main.
Run npm ci, npm test, npm run build and dependency audit. Independent review is required before promotion.
Keep tokens in memory, use PKCE, and send project operations only through the Codestra API gateway.
No publishing, workflow execution, ads, messaging, billing or production activation.
