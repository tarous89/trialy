# App automations — platform implementation plan

**Status:** Platform implementation prepared 14 November 2026 behind `APP_AUTOMATION_RECIPES_ENABLED` (default off). Live host acceptance and catalog approval remain release gates. Product authority: [App automations scope](RECOMMENDED_AUTOMATIONS.md). New installation offers and setup reconciliation remain disabled until the feature gate is enabled. Read [CONTEXT](../../CONTEXT.md) and [DEVELOPMENT](../../DEVELOPMENT.md) before implementation.

## Objective

An app can ship with pre-built automations selected by default in a concise installation popup. Add app approves and enables the eligible selection. The same owner can add and activate automations later from Automations, ChatGPT or Claude, using existing app features or custom configuration. Automation failures cannot make the app unavailable.

## Existing foundation to preserve

Verified against main after PR #165 (`eb2548f`); recheck at implementation start.

| Area | Existing source | Required extension |
|---|---|---|
| Atomic app/table install and retry receipts | `src/workspace/template-catalog.ts`, `src/workspace/data-access.ts` | Keep the core transaction; record reviewed setup intent and reconcile optional automation setup after commit |
| Shared installation UI | `src/shared/DataAccessStep.tsx`, `src/shared/TemplateCatalog.tsx` | Concise default-on rows, draft editing and truthful partial setup results on all hosts |
| Research definitions and readiness | `src/app-services/monitoring.ts`, `src/app-services/monitoring-schema.ts`, `src/automations/service.ts` | Recipe resolution plus disabled/pending setup without requiring a ready runner merely to install an app |
| Action/email definitions | `src/app-services/schema.ts`, `src/app-services/service.ts`, `src/app-services/notifications.ts` | Summary content and current record-member routing; preserve separate email actions and quotas |
| Existing record-date dispatch | `src/app-services/service.ts` (`recordDue`, `dispatchAppActions`) | Reuse due/occurrence handling; explicit new-recipe catch-up policy and grouping, not a date-equality scanner |
| Research completion dependencies | `src/automations/run-data.ts`, `src/automations/dependencies.ts`, `src/automations/completion-scope.ts` | Resolve `after` within the installed app; typed conditions for relevant outputs, including proposals |
| User and assistant approvals | `src/automations/management.ts`, `src/server/automations.ts`, `src/server/app-services.ts` | Preserve `confirm_app_service_review` and owner/assistant checks; feature discovery/preparation adapters |
| Shared editor and management | `src/shared/AutomationsPage.tsx`, `src/shared/AutomationScheduleEditor.tsx`, `src/web/AutomationRecord.tsx` | From app features, context selection, setup states and canonical schemas |
| Archive/copy and cleanup | `src/workspace/archive.ts`, `src/workspace/service.ts`, `src/automations/copy.ts` | Retire/fence pending setup and preserve app-instance identity/dependencies |
| Guidance and catalog packaging | `src/server/workspace-guidance.ts`, `templates/TEMPLATE_AUTHORING.md`, `templates/TEMPLATE_USAGE.md`, `scripts/template-catalog.ts` | Document shipped declarations and maintain hosted/bundled guidance parity at release |

## Delivery sequence

Use focused, reviewable PRs in this order. Keep new offers gated until their required backend behavior and shared UI are ready; an intermediate deploy must not expose recipes that cannot execute safely. Reuse the existing worker, queues and review services throughout.

### RA1 — Recipe contract, identity and discovery

- Define one canonical recipe schema/resolver for `recommendedAutomations` and later `automationFeatures`, including manifest support for custom apps. Install recommendations are fully configured and selected by default; record-specific features require later context selection.
- Add additive storage for provenance and setup intents/status/receipts. Include installed app ID and optional feature context in uniqueness; template version records provenance only. Keep definitions, setup attempts and available recipes distinct.
- Resolve role keys to the final app's bindings, validate current permissions/capabilities, and expose bounded feature discovery. Validate dependencies and malformed declarations without breaking legacy catalog reads.
- Define approved function binding/revision and structured research-output conditions. A new brief/summary implementation requires review; data refresh alone does not expand instructions or scope.
- **Gate:** two copies of one template resolve independently; repeated same-app/record setup is idempotent; no cross-owner discovery; entries without declarations remain valid.

### RA2 — Failure-isolated install and activation services

- Extend the install review digest with selected recipes, settings, intended runner/recipient identities and any reviewed write grant. Bind it to the template digest, request key and owner context.
- Keep mandatory app/data/access installation atomic. Persist the immutable approved setup intent with the receipt, then materialize/activate automations after commit with bounded reconciliation and no provider calls during installation.
- Support a disabled draft or retained pending intent when no runner is ready. Existing `AppMonitoring.confirm` requires readiness for new shared research; do not call it unmodified inside the install transaction.
- Reconcile independent recipes separately; dependent chains wait for their parent. Distinguish retriable technical failures from missing setup, changed authority and deliberate pause.
- Fence stale retries using current intent/definition versions, permissions and archive/pause state. Return app success separately from automation status. The rollback/kill switch must leave existing workflows and ordinary app operations usable.
- **Gate:** crash after app commit, lost response, quota exhaustion, unavailable runner, changed recipient access and setup failure preserve the app; retries create no duplicates and never undo a pause.

### RA3 — Supported recipe execution (E1–E4)

- **E1:** read-only summary execution through the bound isolated runtime and approved revision; cap execution/result sizes, authorize each recipient against included data, and suppress empty results. Preserve existing email behavior for definitions without summary content.
- **E2:** extend existing record-date occurrences with timezone-aware due calculations, seven-local-day coalesced catch-up for new recipes, skipped history beyond the window, and send-time rechecks. Reassignment re-resolves eligible recipients safely.
- **E3:** compile after-research recipes into existing successful-run dependencies and immutable result/version references. Add only the typed output conditions needed by recipes; support relevant proposed findings with zero committed writes. Parent opt-out/disable/edit/archive cannot produce an independent email schedule.
- **E4:** add missing nth-weekday/nth-business-day forms to the shared scheduler/editor. Define Monday–Friday business days, anchors, absent-day and DST rules; retain existing triggers and legacy behavior.
- Preserve research/email separation, settling, limits, suppression, permission checks, receipts and unknown-provider-outcome reconciliation. Never introduce a second queue or relax email action validation globally to accept arbitrary recipe chains.
- **Gate:** outage/catch-up, changed date/member, proposal-only research, dependency edits, duplicate completion, empty summary, data revocation, quota contention and provider uncertainty regressions pass.

### RA4 — Shared install popup, Automations and MCP flows

- Add compact rows to the install popup: toggle on, name, timing/trigger, quiet Edit; show common runner/recipient/timezone once, exceptions inline and direct-write consequences visibly. Do not embed full editor cards by default.
- Keep popup edits local until Add app. Show the section even without existing reusable tables; omit it when no recommendations exist. Cancel creates nothing.
- Confirm the owner's actual UI action in web/ChatGPT/Claude. Preserve the distinction between user interaction and arbitrary assistant tool calls; use the authorized chat route when a host cannot attest UI confirmation.
- Add **From app features** in Automations with context selection, existing-definition reuse and the shared editor. App buttons may open it; app business-data save alone cannot authorize background execution.
- Let both assistants discover, prepare, create and activate through existing exact reviews and ownership checks. Preserve custom automations, expected-version checks and pause behavior.
- Display active versus pending state accurately, open the saved app promptly, and link to Automations for remaining setup. Keep lists bounded and failures local; no automatic full-workspace refresh or loss of unsaved input.
- **Gate:** all-selected install, opt-out/edit/cancel, later setup from every surface, unauthorized users, pending setup, parent opt-out and desktop/embedded/mobile layout pass. No mandatory second approval for the unchanged installation selection.

### RA5 — Integration, guidance and release

- Exercise at least one catalog consumer covering research → email and one deterministic reminder/summary. Use new immutable draft versions or test fixtures; production catalog approval is separate. Do not silently retrofit deployed templates.
- Validate a contextual feature (Investor Updates scheduled draft) from Automations and both assistants, with one definition per schedule record. Saving the schedule remains successful when optional automation setup fails.
- Run approval, ownership, shared-runner, notification, data-access, archive/copy and isolation regressions plus focused new tests. Starting suites: `tests/chat-automation-approval.test.ts`, `tests/assistant-automations.test.ts`, `tests/shared-automations.test.ts`, `tests/notification-guardrails.test.ts`, `tests/data-access.test.ts` and the automation browser suites. Do not use old test totals as current evidence.
- Verify 1440-pixel desktop, approximately 900-pixel embedded and 390-pixel mobile, keyboard navigation and no horizontal overflow. Observe actual web/ChatGPT/Claude behavior; synthetic browser success does not establish real-host support.
- Update both template guidance Markdown versions, dynamic `templateGuidance.version`, bundled/hosted guidance and MCP descriptions when shipped; run synchronization, type/build and applicable tests.
- Enable the additive feature gate only after acceptance. Record shipped commit, migration/rollback strategy, approved catalog versions and observed host evidence in CONTEXT/operations. Actual unattended delivery requires a verified background cycle, not just installation success.

## Boundaries and acceptance handoff

- Includes platform declarations, install/later setup, failure isolation, E1–E4, lifecycle integration and cross-host acceptance. No bulk rewrite or activation of deployed templates.
- Preserve app data/access transactions, source restrictions, write grants and assistant ownership. No delegated management or cross-assistant takeover.
- External exchange sends and their approved follow-ups remain under the exchange contract. An investor draft automation cannot become an automatic external send.
- Default-on is approved at install. Existing disabled definitions, copied drafts, reconnects and later template changes remain opt-in.
- Demonstrate every [product acceptance criterion](RECOMMENDED_AUTOMATIONS.md#9-acceptance-criteria), especially the five PR #165 findings: chat activation retained, app continuity, per-app deduplication, missed-date recovery and later feature setup.

## Implementation and rollout record — 14 November 2026

- Canonical portable declarations and tolerant runtime discovery: `src/automations/recipes-schema.ts`. Catalog sync/approval validates declarations strictly. Install recommendations are complete, while contextual features require an app record.
- Immutable reviewed snapshots in `automation_recipe_approvals` authorize the mutable setup ledger in `automation_recipe_setups`; workspace/owner/app/key/context is the identity. App and access installation remains atomic. The existing isolated automation worker materializes one setup at a time after commit, without provider calls. Missing prerequisites stop at Needs setup and require a new owner action. Replays never resume a definition. Copy retains definition links with disabled copies; archive retires pending setup, including project archive.
- Existing review services still authorize definitions; existing research/email queues execute them. Typed `findings[].relevant` permits relevant proposal-only completion. Summary functions and research briefs pin bound read-only revisions; background execution preserves the owning assistant. Summary output is bounded and empty output suppresses mail. Record-member routing accepts registered member UUIDs, rechecks access, coalesces per recipient and reroutes unsent collecting batches. Once delivery has started, reassignment suppresses obsolete items rather than risking a duplicate provider delivery.
- New record-date recipes use seven local calendar days of catch-up. The existing occurrence ledger remains authoritative. Monthly schedules support an nth weekday or nth Monday–Friday business day, without holiday calendars.
- Shared installation rows default on, keep edits local, and return explicit pending/opted-out states. Automations offers From app features and pending setup cancellation. ChatGPT and Claude use discovery/preparation plus the existing exact confirmation route.
- Research recipes are proposal-only by default; this delivery does not manufacture write grants. Existing custom automation authoring still supports separately approved maintenance grants. App records and external exchange sending remain outside implicit recipe authority.

Deployment order: run migration 069 with the migration account, reapply `ops/runtime-role.sql`, deploy API/UI/worker, then validate the gate in a staging workspace. Do not roll back by dropping the additive tables/columns: preserve receipts and set the new gate false to stop new offers/setup. Existing automations retain their established controls and kill switches.

Before enabling in production: observe a real installation and authorized feature setup in web, ChatGPT and Claude, plus a verified unattended research cycle and email outcome; approve new immutable catalog versions separately. Browser fixtures cover shared responsive UI, not signed-in host attestation. No deployed template is retrofitted by this implementation.
