# App automations — installation and later setup

**Status:** Owner-approved scope, revised 14 November 2026 after review of PR #165; platform implementation is gated pending live acceptance, not a deployment claim. This revision supersedes the earlier default-off choices, blanket prohibition on assistant activation, workspace/template-wide deduplication and all-or-nothing app/automation installation in that PR. Build sequence: [implementation plan](RECOMMENDED_AUTOMATIONS_IMPLEMENTATION.md).

Applies to catalog templates and supported custom apps across the website, ChatGPT and Claude. Related contracts: [Modular apps §7](MODULAR_APPS_AND_SHARED_DATA.md#install-dialog-data-access-and-automations), [Apps, access and automations](APP_CONFIGURATION_AND_AUTOMATIONS.md#recommended-automations-at-install), [write authorization](../WRITE_AUTHORIZATION.md) and [notification guardrails](../scopes/NOTIFICATION_GUARDRAILS_2026-11-01.md).

## 1. Confirmed decisions

1. **Platform ownership and execution.** Automations are ordinary TrialAgents definitions linked to a saved app. The platform stores, validates, schedules and runs them using existing research runners and action/email workers. Apps may declare automation features and initiate the platform's authorized setup flow; they never operate a separate scheduler or grant themselves permissions.
2. **Pre-built automations are selected by default.** If an app includes install recommendations, show them concisely in the install popup with every toggle on. **Add app** approves the displayed selection and activates eligible automations. The user may opt out of any row. Nothing activates merely from opening a preview, reading a catalog, or receiving an assistant proposal.
3. **Add and activate later from any supported surface.** The authorized owner can create, edit and activate automations at any time through the platform Automations tab, ChatGPT or Claude, including automations based on an existing app feature. Preserve exact reviewed authorization and existing assistant ownership boundaries. The install dialog remains a user-confirmed action; this does not prohibit authorized activation through chat.
4. **Apps remain independently usable.** Missing runners, optional setup errors, quota exhaustion and failed background runs must not prevent installation, opening, ordinary saves, navigation or data use. Genuine app/data permission failures still apply.
5. **External sends remain separate.** User-triggered sends to suppliers, investors and other people outside the workspace, including their pre-approved follow-ups, remain in the external exchange. Automation email goes only to authorized workspace members under existing limits.
6. **Defaults do not override an existing choice.** Default-on applies to new install recommendations only. Edits, reconnects, app restores, copies and later template releases do not silently resume paused work or activate declined/new recommendations.

## 2. Declarations and reusable app features

Add optional `recommendedAutomations` to the catalog for complete install recommendations. Add optional `automationFeatures` for reusable setup recipes exposed in Automations, including features requiring a record or other user selection (for example, an Investor Updates schedule). Both use one shared validated recipe schema and resolver; no duplicated scheduler or independently implemented UI/MCP schema. Custom apps may declare equivalent reviewed features in their manifest under the same capability and permission checks.

| Field | Contract |
|---|---|
| `key` | Stable recipe key, unique across both declaration lists within the app/template |
| `name`, `purpose` | Concise user-facing labels; name ≤ 60 characters, purpose ≤ 120 |
| Install selection | Every `recommendedAutomations` entry starts selected. Remove configurable `defaultOn: false`; if a compatibility field is retained it must be literal `true`. Later setup recipes do not activate until approved |
| `context` | Optional typed selection required by a feature, such as an authorized schedule record. Resolve a stable instance key from the selected record; never trust caller-supplied table or recipient IDs as authorization |
| `trigger` | Calendar schedule; specific record creation/field transition; record-date offset; or `after` a successful research recommendation of the same installed app |
| `steps` | Research, an existing typed platform action, and/or email. Compile to existing executor definitions and explicit dependencies. Email remains a separate action; this is not a general workflow designer |
| Research brief | Bound read-only function plus input/output contracts. Resolve current authorized app records at execution; pin the reviewed function revision, permitted sources and write scope |
| Research writes | Research and drafts must be saved in the app database. The same install/setup approval includes narrow, expiring create/update grants within the app’s writable fields and current assistant access. No separate write opt-in. Missing writable storage means Needs setup; never activate a proposal-only substitute |
| `email` | Subject/body with named variables; static, deterministic summary or research content; a typed condition; owner, selected members, or a record member resolved to a registered member identity |
| `editableAtInstall` | Cadence, day, time and recipients through the shared editor; expose full instructions and scope in expanded details |

**Validation and compatibility:**

- An install recommendation must be complete without choosing a business record. Incomplete or per-record features belong in `automationFeatures` and are available after installation.
- Validate known roles, fields, typed schedules, action capabilities, brief/summary functions and their read-only scopes. Bound functions execute through the existing isolated runtime, never by evaluating arbitrary client code on the server.
- Validate email recipients against current app/data access as well as workspace membership, including `record_member`. No external email columns or arbitrary address substitution.
- Require explicit field transitions for update-triggered email; retain daily-or-slower calendar email and existing event-email limits.
- Validate `after` references, reject missing/self/cyclic dependencies, and bind them to the exact parent definition/version in the same app. An opted-out or unavailable parent leaves its dependent recommendation waiting, never independently active.
- At most ten install recommendations. Other reusable features are available through the normal paginated Automations setup flow.
- Validate new declarations during build and catalog approval/load. Existing catalog entries without declarations remain valid. A bad optional declaration is localized to that template's automation offer; it must not crash the gallery or prevent an otherwise valid app from being installed without automations. Do not claim invalid recommendations were approved or activated.
- New immutable template versions carry new declarations; do not rewrite deployed payloads, approvals or existing user automations.

## 3. Concise install popup

Use the existing shared install dialog with a compact **Automations** section below data and access. Show it whenever install recommendations exist, including when there are no existing tables to connect. Omit it for apps without recommendations.

- One line under the heading: **“Included with this app. Turn off anything you don’t need.”**
- One compact row per automation: an on-by-default toggle, name, readable schedule/trigger, and a quiet **Edit** action. Example: **Weekly digest · Mon 07:00 · Email to you**. Use a short second line only when needed to explain the effect or a blocker.
- Show shared defaults once: selected **Claude / ChatGPT** runner where research is involved, and **Email to you** where appropriate. Respect an existing owner preference; otherwise preselect an eligible ready runner. Never reactivate a deliberately paused runner. Per-row exceptions and record-assigned recipients remain visible.
- Do not expand prompts, technical IDs, full editor cards or configuration fields by default. Details must be accessible by keyboard and touch. Any direct-write effect must have a visible plain-language scope summary, not be hidden only in a tooltip.
- **Edit** opens the shared automation editor in draft mode. Saving returns the edited draft to the popup; it does not persist or activate an automation before Add app. Cancel discards the entire unsubmitted installation draft.
- A short line by **Add app** states **“Adding this app also enables the selected automations.”** Show a specific pending note instead for rows that cannot activate, such as **“Connect Claude or ChatGPT to activate research.”** Display the effective timezone once and preserve it in the receipt.
- Add app is the single approval for the exact displayed app/data/access choices and eligible automation configuration. No second approval is required for the same unchanged configuration. Preserve choices on validation failure and never report an uncommitted save as successful.
- Only an authorized owner may approve automation setup. Other installers can install the app normally; their choices cannot authorize work for the owner. The owner can later configure available recommendations from Automations.
- Embedded confirmation must prove the authenticated owner's actual UI action through the supported app-only action, without relabeling arbitrary assistant calls as human. If the host cannot provide that supported confirmation, install without automation activation and retain a clear setup path through Automations or authorized chat.
- Saves, copies and restores do not reopen this installation popup. Restore may offer a separate, explicit resume action.

## 4. Installation, activation and failure isolation

**One user approval, separate commit boundaries.** Keep app, tables and access choices atomic under the existing install receipt. Never call runner setup, providers, automation activation or optional automation validation inside that mandatory transaction.

Persist an exact authorized setup intent with the install request key and reviewed digest so a lost response or crash cannot lose the selection or create duplicates. Its durable storage may be part of the core install receipt, but resolving/validating/materializing optional automations happens only after the app commits. A core database/receipt failure can fail installation; an optional automation error cannot undo it.

After commit, resolve the final app/table IDs and create/activate selected definitions through the normal automation services. Independent recommendations settle independently. A failed research recommendation holds only its dependent email, not unrelated reminders. Bound this work so the app opens promptly; use existing background infrastructure for unfinished setup reconciliation, not a second scheduler. Never run provider calls or research during the installation request.

| Outcome | Required behavior |
|---|---|
| Selected, valid, ready | Save and enable automatically under the install approval; schedule its first eligible occurrence without rerunning past work |
| User opted out | Create no active definition; show the recipe as available later |
| No ready runner / missing required input or authority | Save a disabled draft where supported, otherwise retain the setup intent; show **Needs setup**, never an active badge |
| Transient setup failure after approval | App remains saved and usable; show **Setup pending** and retry the same reviewed intent with bounded backoff and stable identities |
| Scope/recipient/version changed since approval | Retain a disabled draft or failed intent with the reason; require renewed approval of the changed configuration |
| User pauses, opts out or revokes permission during reconciliation | Fence pending setup/activation; an old retry or receipt replay must not reverse the newer choice |

Connecting or restoring a runner that was absent, unverified or deliberately paused does not silently activate pending definitions. Offer Enable through Automations or accept the existing supported exact chat authorization. This is distinct from retrying an unchanged, previously ready installation setup after a transient technical failure.

The installation result reports the app receipt and per-recommendation active/pending/opted-out states separately. Open the saved app even when some setup is pending; use a brief non-blocking status with a link to Automations. Logs hold details. Never replace the app with an automation error page or force a refresh that discards input.

## 5. Automations tab and chat after installation

- **Add automation** offers **From app features** after an app is selected, alongside the existing custom setup. Show available recommendations and reusable features with concise descriptions; obtain required context and open the normal editor prefilled.
- For Investor Updates, select the scheduled-update record and configure its draft automation here. An app's **Set up automation** action can open this same platform editor; saving app business data alone does not create an active background job. If one app action combines data save and automation approval, it must show the exact review and use the same failure-isolated platform flow.
- ChatGPT and Claude may discover these same features, prepare and add new automations, edit existing ones and activate authorized definitions using the existing `confirm_app_service_review` path. Preserve owner checks, current permissions, expected versions, reviewed content and assistant ownership. Neither assistant may resume the other assistant's work through a new bypass.
- Existing automations retain IDs, revisions, grants, run history and deliberate pauses. A recipe is a starting point; user edits remain authoritative. Editing an app feature or its record must not silently expand an approved automation's instructions, recipients or data scope.
- Show **Available**, **Needs setup**, **Setup pending**, **Enabled** or **Disabled** truthfully. A saved definition, verified runner and completed background run are separate facts. A recommendation with an existing disabled definition opens that definition, rather than creating another.

## 6. Identity and lifecycle

Store the app ID and provenance, including template ID/version (when applicable), recipe key, source kind and optional feature instance key. Idempotency is scoped to **workspace + authorizing owner + installed app ID + recipe key + feature instance key**, with the installation request key for retries. Template version is provenance, not a reason to duplicate an existing setup.

| Event | Required effect |
|---|---|
| Repeat Add app / replay install receipt | Return the same app and reconcile the same setup; never duplicate or undo a later pause |
| Install another copy of the same template | New app identity and separately resolved bindings; its own recommendations start selected even if another copy has active/paused automations |
| Set up an existing recommendation/record feature again | Open/reconcile that app's existing definition; allow separate instances only through explicitly distinct context |
| Archive app | Suspend linked automation setup and execution; preserve definitions/history and stop uncommitted effects |
| Restore app | Restore definitions disabled; offer explicit resume under current scope/readiness checks |
| Permanently delete archived app | Retire its attached definitions under existing lifecycle/retention rules; cancel setup intents and preserve required audit/run receipts and shared app data |
| Copy app | Copied automation drafts stay disabled, with dependencies remapped to the new app; no copied active grants or execution history |
| Remove an automation through a supported management flow | Never remove app records; its recipe may be offered again only through a fresh explicit setup |
| Template update / runner reconnect | Do not overwrite edits or activate declined/paused/new work |
| Change/remove app bindings or execution capability | Apply existing revocation and compatibility checks; block only affected automation work; layout-only updates must not disable valid work |

## 7. Execution additions and existing engine reuse

| ID | Scope | Required behavior |
|---|---|---|
| **E1** | Deterministic summary email | Evaluate a reviewed, bound read-only summary function within approved app/data scope. Recheck each recipient's current access to included data; owner access alone is insufficient. Empty `nonEmpty` output sends nothing. Pin executable revision/contracts, bound execution and result size, and preserve isolated runtime/queue limits |
| **E2** | Record-date reminders | Extend/reuse the existing record-date executor, occurrence ledger and notification batching. Compute due time in the approved IANA timezone; select **due and not processed**, not date equality with today. Default new reminder catch-up to at most seven local calendar days, coalesced into one current reminder per recipient; record older occurrences as skipped. Recheck record date, relevance, assignment and access before delivery; date changes invalidate obsolete queued work. Do not change legacy policies silently |
| **E3** | After-research email | Compile `after` into existing immutable completed-run dependencies (`automation_runs`), not a second schedule. Deliver once per eligible parent run/version and child definition. Preserve current blocking on parent pause, archive, permission or version change; skip tests, failed and partial runs. New research/drafting must save output before completing. Meaningful zero-write results remain supported for previously approved legacy monitors |
| **E4** | Calendar recipe support | Reuse current calendar schedules and add only missing typed forms: nth weekday and nth business day of a month. Define business day as Monday–Friday in the schedule timezone (holiday calendars out of scope). Every N months covers quarterly/half-yearly/yearly; retain one-time triggers. Define anchors, absent-day handling and DST behavior through the shared scheduler and editor |
| **E5** | Research + email in one automation | A recipe may declare `research` and `email`. It installs as one automation: one popup row, one Automations card with both connectors, one on/off switch. Internally the email is an action row with `follow_up_of` = the research, released once per completed run of that research version (`when: meaningful` by default, or `completed`); it follows research edits and the switch; copies keep the grouping, switched off. Separate `after` recipes stay separate and keep their review-on-parent-change rule. Email limits, recipient checks and the no-rerun rule are unchanged |
| **E6** | Fields resolved at run time | `fields: "all"` (+ `exceptFields`) on read and write bindings approves every field the app binds on that table, now or later. Bindings and grants are stored `dynamic` and re-resolved at every check against the app's current binding and the assistant's current access; the approval stamp covers the table and exclusions, not the field list or schema version. Adding, renaming or hiding fields keeps the automation running; removing the table, access or assistant rights still blocks or retires it. Run-reporting emails keep their approval across field edits (legacy stamps unchanged). Explicit field lists keep exact-schema behavior |

Email remains a separate delivery action and never reruns research after delivery failure. A research → saved report → email recipe uses the research step's existing reviewed report output and a separate email dependency; it must not imply a new unrestricted multi-step workflow engine. Unsupported recipe sequences fail validation clearly.

`record_member` delivery resolves a current registered member from the authorized record and batches only that member's eligible records. Reassignment cancels the old recipient's queued notification and re-evaluates the current recipient, without bypassing quota or deduplication. All summaries and research outputs obey recipient data access, not just membership.

Keep two-minute settling, cancellation of obsolete work, one email per normalized recipient per rolling hour across TrialAgents, 15 recipient deliveries per account per rolling 24 hours, calendar per-rule/recipient/local-date limits, suppression handling and ambiguous-provider-outcome reconciliation. Calendar email is daily or slower; explicit record/run events retain the existing hourly/daily limits rather than a new blanket one-email-per-day rule.

## 8. MCP, guidance and rollout

- `read_app_template` returns supported declarations. Add a bounded saved-app feature read path shared by Automations and both assistants; discover saved/custom app features without requiring a catalog install.
- `prepare_data_access` accepts proposed selections, runner and recipients as draft-only inputs. The server recomputes the exact review/digest; only the supported owner UI action confirms installation choices.
- `list_app_automations` preserves existing definitions and exposes provenance/setup states with bounded pagination. Available recipes must not fabricate enabled automation IDs or be counted as running jobs.
- Reuse current prepare/read/`confirm_app_service_review` tools for later chat creation and activation. The install restriction must not remove those capabilities.
- At implementation release, update and version dynamic/bundled authoring and usage guidance together; describe only capabilities actually shipped. This scope update does not advertise unimplemented MCP fields as available today.
- Roll out behind an additive feature gate. Existing apps, monitors, actions, IDs, schedules and installed template versions remain unchanged. Publish new declarations in separately reviewed immutable template versions; retrofitting deployed templates is separate work. Disabling the new offers must not disable already approved existing automations or ordinary app use.
- No new provider, billing system, global scheduler, cross-owner delegation or external-send automation is authorized by this scope.

## 9. Acceptance criteria

1. Install an app with three recommendations: all three toggles are on; opt one out; one Add app approval installs the app and enables the two eligible definitions with the exact displayed timing, recipient and scope.
2. Install an app with no shareable existing tables: the automation section still appears. No recommendations means no empty section. Verify compact layout, keyboard/touch access and no horizontal overflow at 1440, approximately 900 (embedded), and 390 pixels.
3. Edit in the popup then cancel: no app, automation or effect is created. Add app retries and lost responses return the same receipt and definitions. A later pause defeats stale retry/confirmation.
4. Inject runner, validation, quota and post-commit setup failures: the app still opens and saves normally; pending setup is visible and recoverable. No orphan work runs for a failed/unsaved installation.
5. Missing/unverified/paused runner: research and dependent email stay inactive; unrelated ready email can enable. Connecting later offers explicit enable; it never silently reverses a pause.
6. Install two copies with separate data and identical recipe keys: each has correctly bound independent automations. Archive/restore/copy/delete follows §6, preserving records and required history.
7. Add and enable from Automations → From app features, ChatGPT and Claude after installation, including one Investor Updates draft per schedule record. Repeat setup does not duplicate. Keep existing chat authorization, ownership and revocation regression tests passing.
8. Non-owner/public/forged assistant confirmation cannot activate work for the owner or broaden access. Genuine authorized owner confirmation works on each supported host; unsupported UI confirmation has an honest fallback.
9. Miss a reminder day, recover within the catch-up window: one current reminder sends, never zero due only to date equality and never twice. Verify expired window, changed date, reassignment, DST and stale/irrelevant records.
10. Summary email and research follow-ups honor current recipient field/record access, empty results, budgets and delivery receipts. New research/drafting cannot complete with unsaved output. Legacy relevant zero-write results retain their existing notification behavior; test/failed/partial runs cannot notify.
11. Parent opted out, paused, edited or removed: dependent email stays blocked with a reason. Independent recommendations continue. Retries never repeat completed research or resend an uncertain provider delivery blindly.
12. Catalog recipes with unknown roles/functions, unsupported triggers, invalid dependencies or external recipients fail declaration validation locally; legacy entries and the rest of the gallery stay usable. No template update overwrites user edits.

Production enablement requires the implementation gates in the [build plan](RECOMMENDED_AUTOMATIONS_IMPLEMENTATION.md), including observed host behavior. A green unit suite or a saved recipe alone is not proof of unattended delivery.
