# Code review notes: Automations (T1–T7, A9, A11, B2, P7)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Produced by reading the code at commit `376f29d` on 19 November 2026; nothing was run. Line numbers refer to that commit. Where these notes list open questions, the scope's **Defaults adopted** section gives the answer to build to.

# Automations gap analysis (T1–T7, A11, A9, B2, P7)

All findings are from reading code; nothing was executed. Paths are relative to `/home/user/trialy/`. Sizes: S under half a day, M 1–2 days, L 3+ days.

## 1. Current model

1. There are four separate stores. `app_monitors` holds assistant research (`migrations/047_app_monitoring.sql`), and `app_actions` holds platform email, connector and function steps (`migrations/046_app_services.sql`).
2. The other two have no app link: `foundation_functions` / `foundation_schedules` (code schedules, `migrations/016_foundation.sql:2,20`) and the legacy `automations` rules table (`migrations/002_controlled_work.sql:1`, run by `src/worker/automations.ts:7`).
3. Research has two modes. Legacy has no `config.automation`: the schedule is descriptive text and a ChatGPT host task is linked via `task`. Shared-runner mode adds `automation_runners`, `automation_dispatch`, `automation_occurrences`, `automation_attempts` and `automation_outbox` (`migrations/049_shared_automations.sql`).
4. Everything is private to the creating user. Every query filters `user_id=a.userId`, and RLS is `user_id=actor_id()` (`047:26`, `049:53`).
5. "Owner" means organization or workspace owner, not app owner (`src/automations/management.ts:24`, `src/app-services/monitoring.ts:30`).
6. A second ownership axis is the assistant: each row has an `assistant` column and there is one runner per user, workspace and assistant (`migrations/058_assistant_automations.sql:7-18`). The other assistant may only read and pause (`src/automations/ownership.ts:10-15`).
7. Runs execute as the creator through that assistant (`ownership.ts:22`; `src/app-services/service.ts:109`).
8. Research writes need a per-table `maintenance_scopes` grant with `autoWrite` and an expiry (`monitoring.ts:47`, `src/app-services/monitoring-storage.ts:47`, `src/workspace/service.ts:1114-1115`).
9. Bundled automations are "recipes" in `automation_recipe_setups`, unique per app and recipe (`migrations/069_automation_recipe_setups.sql:10`).
10. Archiving happens only with the app; restore brings automations back switched off (`migrations/071_app_function_dependencies.sql:9-10`).

## 2. Per decision

**T1 · belongs to app, app owners manage, linked owner, move — partly met, L**
- **Met:** `app_id` is NOT NULL on monitors, actions and recipe setups. The add flow selects an existing active app (`management.ts:25-27`). Runs use the creator's rights.
- **Gap:** authorization is workspace owner plus creator, not app owner. Co-owners cannot see or manage (`management.ts:59,117`; `monitoring.ts:53`). There is no move operation. Users listed in `config.users` can run manual actions (`service.ts:81,92`). Functions, code schedules and legacy rules have no app.
- **Data model:** treat `user_id` as the linked owner. Replace user-scoped RLS with an app-owner predicate on all nine automation tables. Make authoring-key indexes per app instead of per user (`049` `automation_authoring_key`). Add `switched_off_reason`.
- **Server:** an `appOwner()` guard replaces `owner()` in `management.ts`, `monitoring.ts`, `service.ts`, `src/automations/recipes.ts:5` and `src/automations/testing.ts:21`. Add `moveAutomation`: rebind to the mover's runner, re-issue grants under the mover, re-validate, cancel queued occurrences.
- **UI:** show "Linked to <owner>" and "Move to my account" in `src/shared/AutomationsPage.tsx`.
- **MCP:** add `prepare_app_automation_move`; update the guide.
- **Tests:** co-owner sees and manages; editor and viewer get 403; move.

**A11 · member removal — not met, M**
- **Gap:** the only removal path is `unshare` (`src/domain/service.ts:538`), and it does not touch automations. After removal, research dispatch fails validation and retries hourly indefinitely (`src/automations/worker.ts:55`). Actions pause with a code (`service.ts:132`). Rows become invisible to everyone because of the user-scoped RLS.
- **Server:** a removal hook in the same transaction: disable or pause all the member's automations, cancel queued and running work, disable their runners and subscriptions, set reason `linked_owner_removed`.
- **UI:** "Set up again / Move to my account".
- **Tests:** removal then no dispatch; co-owner can move.

**A9 · restore stays disabled — mostly met, S–M**
- **Met:** restore sets `enabled=false` / `paused=true` (`071:9-10`). Enabling revalidates scope and runner (`monitoring.ts:106`).
- **Likely defect (inferred, not reproduced):** archive deletes the `automation_dispatch` row (`071:36`) and restore nulls `next_at` (`071:10`). Neither `AppMonitoring.control` nor `AppActions.control` (`service.ts:99`) recreates them, so a restored and re-enabled automation appears never to fire until edited. Fix by calling `syncDispatch` or `nextAction` on enable from the current time, with no replay.
- **Tests:** restore, enable, next occurrence scheduled, no historical occurrences.

**B2 · helpers shown as standalone — not met, M**
- **Cause:** `src/workspace/home.ts:26` lists every function as `kind:'automation'`, and `home.ts:29` lists legacy rules. The app link exists only inside the revision JSON (`scope.appId`).
- **Duplicates:** `saveAppFunction` inserts a new function row on every helper change and never retires the old one (`src/foundation/service.ts:48-55`).
- **Data model:** add `foundation_functions.app_id`, backfilled from `scope.appId` or `workspace_components.execution`, with one function per app and name.
- **Server:** make `saveAppFunction` idempotent (new revision on the existing function). Drop app helpers from Home. Return helpers under their app in `AutomationManagement.list`.
- **Tests:** `tests/home-archived-helpers.test.ts:28` currently asserts helpers appear on Home and must be inverted. Add an install-retry test for no duplicates.

**T2 · scheduling — mostly met, S–M**
- **Met:** calendar anchors survive failures (`worker.ts:52`). Completion dependency exists via the `automation_runs` trigger (`src/app-services/schema.ts:13-15`). Database triggers exist for research and actions (`worker.ts:40`, `service.ts:119`).
- **Gap:** the 60-minute minimum is hard-coded and only applies to `after_success` (`src/automations/schema.ts:10`). Otherwise the only limit is `maxRunsPerDay ≤ 24` (`src/app-services/monitoring-schema.ts:22`). Database-triggered research has no spacing.
- **Change:** an organization-level setting, default 60, enforced in schema validation and `dispatchDue` (coalesce within the window). Guide: prefer calendar; `resources/workspace/references/SHARED_AUTOMATIONS.md:163` currently discourages converting elapsed-time schedules.

**T3 · retries, Needs attention, one alert — not met, L**
- **Research:** fixed 15-minute delay (`worker.ts:64`, `src/automations/service.ts:108`). `retry_limit` 3 means two retries (`049:28`). A runner-reported `failed` is final with no retry (`service.ts:105`).
- **Permission or connection failure:** stored as an opaque `authorization_or_schedule_unavailable` and retried hourly forever (`worker.ts:55`). It is not shown in the list; `blockedReason` covers only runner and dependency state (`management.ts:66-67`).
- **Actions:** any non-429 dispatch error pauses the whole action, including transient ones (`service.ts:132`), which stops future calendar runs. A step failure is terminal (`service.ts:151`).
- **Email jobs:** exponential backoff up to 5 minutes, six attempts (`src/app-services/jobs.ts:82-83`).
- **Owner alert:** none exists.
- **Data model:** `needs_attention_cause` and `needs_attention_at` on both definition tables; `retry_schedule` and `alerted_at` on occurrences and action runs.
- **Server:** a shared error classifier (transient vs permission/connection). Backoff 5/15/60 on the same occurrence. A transient action failure retries the run without pausing the definition. One alert per logical run via the existing notification queue.
- **UI:** a "Needs attention" state with cause and fix link, plus a system notice (P7).
- **Tests:** timing, classification, single alert, calendar continues.

**T4 · outage and duplicates — largely met, M**
- **Met:** missed calendar runs coalesce (`worker.ts:51-52`, `service.ts:130`). Batches re-read current state and drop obsolete items (`src/app-services/notifications.ts:60-66,101-117`). Email keeps a stable provider idempotency key (`jobs.ts:39,46`). A connector lease loss becomes `unknown` and is never replayed (`jobs.ts:45`). Email failure does not rerun research.
- **Gap:** the dedupe key is `(action_id, action_version, occurrence)` (`046` `app_action_runs` UNIQUE; `notifications.ts:71`). It includes the version and is not per recipient, so an edit can re-notify the same due occurrence. There is no active provider lookup once the 23-hour key window passes (`jobs.ts:64`). Resuming after a long pause fires the stale `next_at` once.
- **Change:** a delivery ledger keyed on automation, recipient, business event and due occurrence, independent of version. Reconcile `unknown` via the provider before retry. Recompute `next_at` on resume.

**T5 · what can write — partly met, with a conflict, L**
- **Met:** access is rechecked per dispatch, claim and write (`worker.ts:37`, `src/app-services/monitoring-guard.ts:13-19`, `service.ts:93`). Setup declares read and write tables (`readBindings` / `writeBindings`). Research runs never propose (`workspace/service.ts:1115`).
- **Gap — proposal-style paths remain:**
  - Scopes without `autoWrite` show "Review each change" (`workspace/service.ts:1116-1119`).
  - Code schedules without a grant produce unsaved proposals (`src/foundation/worker.ts:67`).
  - The assistant level is named `propose` (`src/workspace/data-access.ts:43`).
- **Gap — executing principal:** platform actions run as `origin:'ai'` (`service.ts:109`), so blocking an assistant would stop email-only jobs.
- **Gap — history:** `management.ts:153` returns status only. `savedChanges` and `delivery_status` exist but are not exposed, and `AutomationsPage.tsx` has no history view.
- **Server:** effective write = declared tables ∩ runner assistant's Data level ∩ linked owner's rights. Edit writes, View only yields Needs attention "cannot write", Blocked yields "cannot run". Platform executors use the linked owner's rights.
- **UI and MCP:** a run-history panel with Applied and Delivered columns; guides drop grant and proposal language.

**T6 · copy — mostly met, M**
- **Met:** copies are disabled or paused, dispatch is fresh, and runs and approvals are not copied (`src/automations/copy.ts:32,41`). Result grants are dropped (`copy.ts:29`).
- **Gap:** legacy explicit `writeScopes` are kept (`copy.ts:29` only clears for `storeResults`). Copy takes only the copier's rows and needs workspace owner (`copy.ts:14-16`). Enable is a plain toggle when the scope stamp matches, with no forced review of tables, connections and recipients. Copy is opt-in (`src/workspace/schema.ts:82` defaults to false).
- **Change:** add `review_required` (copied-from) that blocks enable until a review is confirmed. Copy all of the app's automations, linked to the copier. Always clear grants.

**T7 · retire legacy monitoring — partly met, L**
- **Met:** a manual per-monitor path exists: disable, detach (owner attests the host task is paused), re-prepare with `automation` (`monitoring.ts:71,87,105`). Double handling is fenced by `dispatch_mode` (`monitoring.ts:109,128`). History stays on the same monitor ID.
- **Gap:** no guided or bulk migration. The legacy schedule is free text (`monitoring-schema.ts:18,28`), so it needs conversion to a structured trigger. There is no verification report for schedule, recipient, write scope and last completed occurrence. The platform cannot stop the host task.
- **Change:** a migration command per monitor that proposes the trigger, seeds `coverage_through` and the next occurrence after the last completed run, fences legacy start, and keeps paused monitors paused. Then remove `link_app_monitoring_task`, `start_app_monitor_run`, `finish_app_monitor_run` and legacy guide mode. Decide the fate of code schedules and legacy rules (question 5).

**P7 · background never slows people — partly met, M**
- **Met:** separate worker, a two-connection pool with 5 s deadlines (`src/worker/index.ts:26,36`), isolated steps.
- **Risk:** scheduler transactions take the workspace row lock that interactive saves also take (`worker.ts:22,32,62,76`; `src/worker/automations.ts:9`) and validate inside it. Database-trigger polls rescan workspace audit events every 1 s per action and 30 s per monitor (`service.ts:118,125`; `worker.ts:45`).
- **Change:** lock the dispatch row rather than the workspace, validate outside the lock, share one event cursor scan per workspace.

## 3. Conflicts and recommended resolution

1. **"Each assistant owns the automations it created" vs T1 move.** The contract is in `ownership.ts`, migration 058 and the MCP instructions (`src/server/workspace-guidance.ts:20`). Recommend redefining `assistant` as "runs on" rather than ownership. Definition edits follow A4 Apps permission with user approval; only claim and run stay bound to the runner's assistant. A move rebinds to the mover's runner and may switch assistant.
2. **Owner-private promise vs app-owner visibility.** Earlier docs say prompts and history are private to the creator (`docs/scopes/APP_AUTOMATION_ENGINE_2026-10-31.md` §2, `docs/ACCESS_CONTROL.md`). T1 and A7 open them to all app owners. Run tables are immutable (`047` `protect_monitor_run`), so visibility must be by app, not by rewriting `user_id`. Historical run details should still respect current table permissions (A7).
3. **No proposal mode vs saved grants.** Recommend keeping `maintenance_scopes` only as internal storage of declared write tables. Stop requiring approval or expiry for writes. Migrate non-`autoWrite` scopes attached to automations, and grantless code schedules, to "Needs attention: set up again", not to silent direct writes.
4. **Platform actions run as an assistant principal.** This conflicts with "connector that runs it". Resolve as in T5.
5. **Manual actions runnable by `config.users`** conflict with "only owners run". See question 1.
6. **Action dispatch pauses on any error** conflicts with "future calendar runs still occur".

## 4. Build order, dependencies, risks, questions

**Order**
1. B2 Home fix and idempotent helpers. Small and visible; needs only the `app_id` backfill.
2. App-owner predicate from the roles work, then the RLS and guard swap (T1).
3. A11 hook, move, and the A9 resume fix.
4. Error classifier, 5/15/60, Needs attention, alert (T3); minimum interval (T2).
5. T5 write model and history UI.
6. T6 review gate.
7. T4 delivery ledger.
8. T7 migration tool, then legacy tool and guide removal.
9. P7 lock narrowing alongside steps 4 and 8.

**Cross-area dependencies**
- Roles: app Owner role storage, a SQL function usable in RLS, and the member-removal flow that A11 hooks into.
- Assistants: Data and Apps levels replacing `none/read/propose`.
- Installation popup: bundled automations use `installationRecipeIntent`.
- Logs: A7 automation logs per app.
- U2: the system notice for Needs attention.

**Risks**
- Widening RLS on nine tables; a leak or lockout is possible.
- In-flight occurrences during migration.
- The 100-monitor limit is per user (`monitoring.ts:88`).
- The live ChatGPT and Claude runner contract changes need a plugin rescan.
- The guides are large (`SHARED_AUTOMATIONS.md` is 41 KB) and must change together with the tools.

**Open questions, with defaults**
1. Are in-app manual actions triggered by editors "automations"? Default: no. They stay app features; only owners configure them.
2. Do platform email and connector jobs follow the linked owner's rights rather than an assistant's Data level? Default: yes.
3. Keep mandatory `expiresAt` on automations? Default: make it optional; expiry surfaces as Needs attention.
4. Does a moved automation stay on? Default: only if the mover's connector is ready and access validates; otherwise switched off with the cause.
5. What happens to functions, code schedules and legacy rules bound to no app? Default: switch off, list for organization owners to attach to an app or archive, and remove the creation tools (`confirm_code_schedule`, `create_automation`).
6. Is the minimum interval per organization or global? Default: organization setting, platform default 60, research only.

### Critical Files for Implementation
- /home/user/trialy/src/automations/management.ts
- /home/user/trialy/src/app-services/monitoring.ts
- /home/user/trialy/src/app-services/service.ts
- /home/user/trialy/src/automations/worker.ts
- /home/user/trialy/src/automations/ownership.ts
- /home/user/trialy/src/workspace/home.ts
- /home/user/trialy/migrations/071_app_function_dependencies.sql

