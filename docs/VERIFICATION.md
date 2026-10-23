# Verification — 2026-10-23

Executed on dev-desktop in the isolated atomic worktree with Node 22 and installed Google Chrome.

| Check | Result |
| --- | --- |
| npm ci | PASS |
| npm run format:check | PASS |
| npm test | PASS, 10 tests |
| CHROME_BIN=/usr/bin/google-chrome npm run test:browser | PASS, 9 browser tests |
| npm run build | PASS |
| npm audit --audit-level=high | Zero known vulnerabilities |

Unit checks cover gateway paths, bearer/session handling, tenant/ID validation, correlation IDs, safe errors, redirect credential protection and pagination. Browser tests exercise the real Grapes editor with synthetic identity and API fixtures: six hostile saved-project cases, a visible safe project/versioned save, signed-out drafting, and computed CSS preservation across save/reload. They do not certify live Keycloak/Kong.

Independent review reproduced executable saved component scripts in the same-origin editor iframe. The original attack failed the browser assertion before the fix. Allowlists and DOMPurify now rebuild data before both load and save; unsafe script/event/frame/URL/CSS inputs do not execute. A zero-height canvas was also diagnosed and corrected. The follow-up review caught lost CSS selector types; the new computed-style regression failed (black instead of red) before the selector fix, then passed across save/reload.

Known non-failing build warning: the Grapes editor bundle exceeds Vite's 500 kB chunk recommendation. The build completes; performance optimization remains separate from this authorization/storage change.

Original local starter hashes remain unchanged. The remote was empty and had no rulesets; this first atomic branch is a bootstrap review candidate, not a promoted subsection or production release. An empty subsection/bootstrap-editor base was subsequently created for the initial PR; application code remains on the atomic branch. Live gateway/identity setup remains pending.
