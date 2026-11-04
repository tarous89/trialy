# TrialAgents 0.2.55 release candidate

This release keeps the existing private plugin identity, server key `trialy`, OAuth scope, endpoint, default prompt and audience. It does not submit a public directory release. The two visible skills are **TrialAgents Workspace** and **TrialAgents App Builder**.

## Architecture and preservation

| Responsibility | Source |
| --- | --- |
| Current templates, renderer and detailed workflows | Server-owned `resources/` and existing `templates/`; retrieved through MCP |
| Plugin routing and lifecycle reminders | Two small skills in `plugin/trialy/skills/` |
| Stable visual fallback | `resources/design-baseline.md`, synchronized into the App Builder skill by `scripts/sync-plugin-guidance.mjs` |
| Authorization, isolation, review digests, versions and audit logs | Existing backend enforcement |
| Pure MCP bootstrap | Initialize instructions and `read_workspace_guide` topic reads |

Legacy `read_tracker_design` resource names remain supported. Runtime/build code no longer reads the installed skill package. Approved Vivid assets are moved byte-for-byte; `preserved-assets.json` and regression tests verify them. Catalog templates, app IDs, database content, saved source, permissions, renderer hashes, schemas, migrations, subscriptions and automation execution are unchanged. The `trialy` server key and internal skill slugs deliberately remain stable for connection compatibility; visible agent metadata uses TrialAgents.

Every workflow section remains accessible through a focused guide or the full compatibility resource. The skill baseline is a visual fallback only. Missing required templates, schemas, runtime contracts or validation must stop dependent writes without damaging the saved app. Draft preparation stays quiet; `finalize_app_preview` is the single completed review display, and confirmation uses its returned digest. Full-table search/sort/filter precedes pagination.

## Repeatable zero-state acceptance

A new chat or plugin reinstall alone is **not** a clean state. Server accounts, OAuth grants, app records, standing permissions, connections and runner subscriptions can survive it.

1. Record a unique run ID, plugin version/release ID, server commit, template version/digest, host/build, account plan and browser/OS. Pin the candidate under test; do not mix releases during a run.
2. Use a dedicated test ChatGPT account/workspace with no old TrialAgents plugin, manually added MCP connection, copied custom instructions, relevant memories or separately installed TrialAgents skills. Disable memory/reference history for the test and start outside an existing project/custom GPT. Use a fresh browser profile with no extensions or cookies. Incognito alone does not reset account settings.
3. Use a **new disposable TrialAgents test account/tenant per run**. Start with no apps, data, approvals, standing grants, connector secrets, automations, shared-runner subscriptions or seed/demo data. Do not delete or reset production users. If reusing an account, inventory and explicitly reset every test-owned resource and revoke its grants before calling the result equivalent to new-account testing.
4. Install the exact private **plugin package** through the normal ChatGPT install flow from an account that has access. A copied detail URL is not an access grant. Workspace sharing only grants access in its supported audience; it does not establish cross-workspace installability. Verify the actual target account can open and install it. Keep pure-MCP installation as a separate test, with no plugin skills present.
5. Confirm two expected skills and one MCP connection. Run the first positive review prompt from a signed-out state. Complete new-account signup, consent and callback; check correct account identity and empty Home. Test sign-out, cancelled consent, refresh/reconnect and repeated opening without duplicate account databases. Never copy the developer's OAuth tokens or manually pre-authorize data access.
6. Run the five positive and three negative cases in `plugin.json`. Add a second restricted member and a second tenant with synthetic data; verify denied tables/fields/source and cross-tenant isolation. For app creation test one current catalog template, one legacy Vivid tracker and one custom calculator.
7. Exercise edit/save/discard, duplicate request-key retries, stale versions, interrupted save reconciliation and failed display recovery. Capture app IDs, preview IDs/digests, receipts and before/after record counts. Expect no duplicate apps, no intermediate saved versions, no schema/data mutation on discard and no widened access.
8. In a controlled test environment simulate optional design-guide failure and required template/schema/validation failure separately. Optional visual fallback may continue; required-contract failure must preserve the draft/saved app and block dependent writes. Do not deliberately break the production endpoint.
9. Check desktop and narrow layouts: selected-template fidelity, readable typography/contrast/spacing, filters, full-table sorting across page boundaries, details/editing, multi-value fields, Duplicate/Delete, drag layout settings, fixed footer and watermark clearance. Confirm existing saved apps have unchanged appearance and behavior.
10. For research plus email, use only an authorized test recipient and test-owned automation. Verify saved/enabled definitions, shared runner and readiness including the completion action. Then observe one **real unattended occurrence** and its actual output/write receipt and email delivery. Setup/readiness alone is not this evidence. Test disabled definitions, reconnection and a failed occurrence; ordinary app use must remain intact.
11. Revoke/disconnect only this run's test resources and archive evidence. Repeat with another fresh account/profile, ideally on a second laptop. Keep a separate repeat-user upgrade test because it exercises different risks from first installation.

For every case record Passed / Failed / Blocked / Not run, exact returned IDs, screenshots where useful, and the specific failure. Never include passwords, tokens or real user data in evidence or the package. Stop the release for an unexplained denied-access bypass, unintended write, duplicate app or incorrect success claim.

## Automated verification

Run `npm run build`, `npm test`, and `npm run test:visual` with the pinned Playwright browser and fonts. Tests cover moved-resource completeness and hashes, focused-guide coverage, package identity/default prompt, baseline synchronization, MCP initialize/annotations/operation preservation, unauthenticated denial, existing OAuth PKCE/replay/revocation, authorization, app lifecycle and template/renderer behavior. Automated and local-browser results do not establish a fresh ChatGPT host install.

Verification on 2026-11-04:

| Check | Observed result |
| --- | --- |
| Production build and TypeScript | Passed |
| Full backend suite | 424/428 passed initially; four browser-backed checks reported unavailable before the test browser was installed |
| Recheck of all four affected test files after browser installation | 19/19 passed, including all four earlier failures; no source workaround or relaxed validation |
| Visual and interaction suite | 114/114 passed; no snapshot updates |
| Final focused release checks | 5/5 passed, including all 152 existing MCP operation names |
| Source preservation | All 10 moved visual/renderer assets equal the original commit bytes; no changes to the template catalog/source |
| Package inspection | Two skills, valid manifest/reference checks, matching compatibility metadata and original prompt, five positive/three negative cases |
| Live deployment/private plugin update | Not performed: GitHub push blocked by automatic approval review pending explicit authorization to publish source to `tarous89/trialy` |
| Clean ChatGPT-account installation, unattended run and reviewer demo | Not run; remain separate release gates |

The candidate is committed locally on `release/plugin-0.2.55`. A read-only remote check confirmed that branch was not created. The installed private plugin remains 0.2.54 until the server rollout and guarded package update are authorized and verified. No plugin ZIP was created.

Deploy server changes before updating the private plugin. Read back the saved plugin release and verify removed package files are absent. Check live MCP initialize, tools/list, each guide resource and `/ready`; compare live/server versions and asset hashes. Keep the previous release and commit available for rollback. This change needs no migration or data rewrite.

## Public submission status and remaining inputs

The manifest contains five positive and three negative review cases, prompts and release notes. Their **real ChatGPT-host execution status is Not run** until evidence is captured with the procedure above. Public submission remains blocked by the following evidence/owner inputs, not by a missing ZIP:

- **Applicable privacy and terms pages.** The public Platform home and contact route at https://trialagents.com/ identify this product. Its linked https://trialagents.com/privacy-policy and https://trialagents.com/terms-of-service currently explicitly cover Intel / EU Trial Intelligence, including Intel-specific retention and pricing. Do not use those as verified Platform policies. Confirm Platform data use, retention/deletion, external processing, support and commercial terms before publishing applicable pages and setting `privacyPolicyURL` / `termsOfServiceURL`. No legal commitments are invented in this release.
- **Real-host acceptance and demo recording.** Install the candidate in a dedicated clean account; record actual connection, create/finalize/save, reopen/revise and one denied/failed operation. Show only synthetic data. Rehearse first, then record with a screen recorder, play back for readability and secrets, and host at a reviewer-accessible URL. Add the verified `review.demo_recording_url`; a script or screenshots are not a recording.
- **Reviewer access and publication settings.** Provide a dedicated working test account with sample data and the required subscription/runner access through secure reviewer fields only. Confirm verified publisher identity, supported countries and commerce declarations in the submission portal. Do not infer country targeting or credentials. Source includes website subscription flows; do not claim the product has no commerce without checking its current review classification.

The supplied 810×810 black/white PNG icons meet the size requirement. Public listing identity and the default prompt are preserved. No public directory submission or ZIP handoff is part of this implementation.
