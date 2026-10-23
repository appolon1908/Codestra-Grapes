# Branch and review governance

Work enters through atomic → subsection/bootstrap-editor → section/editor → development → testing → staging → production. The declared branch path is tested by scripts/test_branch.py and enforced for pull requests by scripts/check_branch.py. No merge or promotion was performed.

GitHub ruleset 25729442 was created and independently read back as active on 2026-10-23. It covers subsection/section and development/testing/staging/production/main/master branches, has no bypass actors, rejects deletion and force pushes, requires one independent approving review, code-owner review when ownership is present in the base branch, dismissal of stale reviews, approval after the latest push and resolution of review threads. Required checks: editor-checks, branch-governance, container-smoke. Checks must be current with the target branch.

CODEOWNERS lists appolon1908 and kazan555. The owner may not self-approve a PR. An invitation is not an approval; review requests require accepted collaborator access. Landing-Pages access was accepted; the other three invitations remained pending at the last check. Repository rules are not runtime tenant authorization. No production deployment or external effects are enabled by these controls.
