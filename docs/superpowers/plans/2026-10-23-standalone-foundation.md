# Standalone foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Each repository builds, tests and starts independently with disabled external effects.
**Architecture:** Vue public renderer, existing React authoring apps, FastAPI project service; documented contracts through Codestra gateway and Breero ownership.
**Tech Stack:** Node 22, Vue 3/TypeScript/Vite, React 18, Python 3.12, PostgreSQL 17, Docker.
**Spec:** ../specs/2026-10-23-standalone-foundation-design.md

## Global Constraints
- Production effects OFF. No existing database migrations or protected-branch writes.
- Preserve independent Breero business authority and Marketing editor-draft authority.
- One active writer per repository; use existing isolated atomic worktrees.
- No approval or successful runtime evidence may be inferred from UI state.
- Sources and tests live on dev-desktop; publish via atomic-to-subsection PRs.

## Review Focus
- Unknown or spoofed host must never select another company's context.
- A lost submission response must not rotate the retry key unless payload/context changes.
- Static hosting must not expose source, traversal paths, credentials or redirects from gateway.
- An authoring reference must name an actual saved revision, not unsaved local edits or publication authority.
- Database restore must target a new disposable database and prove preserved project data.

### Task 1: Landing-Pages runtime and contracts
**Files:** package.json; apps/public/App.vue; apps/public/main.ts; packages/contracts/site.ts; packages/api-clients/submissions.ts; packages/industry-templates/catalog.ts; server/index.mjs; tests/contracts.test.ts; tests/hosting.test.mjs; tests/e2e/landing.spec.ts.
**Interfaces:** parseSiteContext(value), resolvePage(path), prepareAttempt(previous,payload,context), submitAttempt(attempt,fetcher) returns validated REQUEST_ACCEPTED receipt; hosting GET /api/site-context and disabled /api/public-submissions/*.
- [ ] Write and run failing route, schema, retry, receipt, host-isolation and disabled-submit tests.
- [ ] Implement validated public config, five bilingual category/audience layouts, accessible forms with retained input and truthful preview states.
- [ ] Run npm test, npm run typecheck, npm run build and browser accessibility/responsive tests.
- [ ] Add own image/Compose, CI, instructions, contracts and owner handoff.

### Task 2: Editor hosting and authoring handoff
**Files:** runtime/server.mjs; test/runtime.test.mjs; src/handoff.mjs; test/handoff.test.mjs; src/ProjectBar.jsx; Dockerfile; compose.yaml; docs/RUNBOOK.md.
**Interfaces:** createServer({dist,gatewayOrigin}); savedAuthoringReference(project,sessionTenant,kind) -> schemaVersion 1 reference; proxy only canonical marketing paths.
- [ ] Run failing real HTTP static/proxy/path/redirect tests and reference validation tests.
- [ ] Implement bounded hosting and saved-reference download; no raw HTML publication or graph execution.
- [ ] Run existing unit/browser/build suites plus image smoke and dependency audits for each editor.
- [ ] Record exact test evidence and independent deployment/runbook.

### Task 3: Backend application packaging and recovery
**Files:** Dockerfile; compose.dev.yaml; scripts/backup_restore.py; tests/test_operations.py; docs/RUNBOOK.md; requirements-runtime.lock.
**Interfaces:** explicit compose migration job; existing health/readiness; logical backup/restore command restricted to separately named test destinations.
- [ ] Test configuration readiness, effects disabled and operational counters; execute backup/restore against disposable PG17.
- [ ] Implement non-root image and isolated local stack; no production or shared database targets.
- [ ] Run Ruff, full PostgreSQL security/storage tests, image startup and restore round-trip.

### Task 4: Governed delivery
**Files:** .github/workflows/ci.yml; scripts/check_branch.py; tests for allowed/rejected promotion paths; README and verification.
**Interfaces:** atomic -> subsection -> section -> development -> testing -> staging -> production; main is never an ordinary target.
- [ ] Test allowed paths and rejected skipped levels; preserve existing jobs.
- [ ] Independently review source, fix meaningful findings, then commit verified changes.
- [ ] Publish exact verified trees, open/update proper PRs, read back CI and request kazan555 review after invitation acceptance.
- [ ] Verify server-side required reviews/checks where account plan permits; record any API limitation without weakening controls.
