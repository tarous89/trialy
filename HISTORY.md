## 13 November 2026 — PR #155 review corrections

Preserve same-scope metadata/editors during refresh, suppress obsolete idle Home results, and force fresh account reads after workspace creation/sign-in. Queue return events received during checks, avoid duplicate Home reads on re-enable, and detect abandoned Home responses with `res.close` / `writableFinished`. Revision hashing excludes revoked project memberships and uses bounded aggregate state while retaining historical document access coverage. Scope notes now explicitly cover idle card samples/totals, deployment recovery, safety items and measurement limits. No template, migration or external integration changes. PR remains unmerged and undeployed; evidence is in [performance measurement](docs/PERFORMANCE_MEASUREMENT.md).

## 13 November 2026 — Performance increment 6: save receipts and refresh recovery

Basic P12 separates a successful save from loading its result. App edits, draft saves and standard/custom layouts retain their submitted screen, show “Saved” as soon as the server acknowledges the write, and offer a persistent reload action if the follow-up read fails. Retained content stays read-only until refresh succeeds. Reload attempts do not repeat the mutation; an expired read lease can be renewed, while access loss removes the retained view without losing the acknowledgement. Late draft/layout reads cannot reopen a view the user has left.

No template edits, migrations or integration-contract changes. This improves feedback and prevents duplicate save attempts; authoritative refresh still runs and selective refresh remains deferred. P06 CI is green. Current validation and release status are recorded in [PR #155](https://github.com/tarous89/trialy/pull/155) and [performance measurement](docs/PERFORMANCE_MEASUREMENT.md). Not merged or deployed. Next: P11a, then N3.

## 13 November 2026 — Performance increment 5: foreground loading feedback

P06 keeps routine account/access/Home checks, automatic return-to-tab refreshes, collapsed archive counts and optional tracker prefetches out of the global progress bar. Initial loads, navigation, searches, expanded details, saves, retries and explicit Refresh keep visible foreground feedback. The shared 150 ms delay and main-column placement remain intact. A click joining an in-flight prefetch shows progress for the user's wait without duplicating its request. Background work cannot prolong a completed foreground action's bar, and errors/revocation still surface through their existing handlers.

No template edits, migrations, permission or integration-contract changes. This improves loading feedback rather than backend latency. A separate P03 CI test correction checks zero inactive Home reads and metadata-only active checks. Validation and release status are in [PR #155](https://github.com/tarous89/trialy/pull/155) and [performance measurement](docs/PERFORMANCE_MEASUREMENT.md). Next: basic P12 save-receipt and refresh/retry clarity.

## 13 November 2026 — Performance increment 4: coordinate refresh checks

P03 merges return-to-tab event bursts and shares in-flight account reads. Idle Home now checks metadata instead of rebuilding content and archives every 30 seconds. Changed metadata clears old Home/archive content before an authorized reload; return, local changes, filtering and retry still load content. Temporary account failures retain mounted apps/drafts, while revoked sessions clear them. Open apps keep periodic access/version checks and explicit Refresh; hidden panels pause automatic checks. Superseded web Home reads abort, with server cancellation at safe stage boundaries; embedded late replies are ignored.

The populated Home fixture uses 4 application queries for the idle check, versus 32 for the former full read; a full read now uses 33 to include its baseline stamp. Metadata scans grow with account size, and production speed remains unmeasured. No template edits, data migrations or integration-contract changes. Older host tool catalogs fall back to authorized full reads. Validation: production build/type checks, 19 focused backend checks and 72 distinct browser scenarios across focused runs pass, including all 37 cases in the final continuity/app/refresh run. Full CI and deployment status are tracked in [PR #155](https://github.com/tarous89/trialy/pull/155) and [performance measurement](docs/PERFORMANCE_MEASUREMENT.md). Next: P06 foreground/background progress feedback, then basic P12.

## 13 November 2026 — Performance increment 3: defer startup reads

P02 removes workspace-wide schema/view reads from Home, modern Database and direct app/draft startup. Legacy consumers load their metadata on demand with retry and user/workspace-scoped response guards. Collapsed archive sections fetch authorized counts; expansion retains the original detail, restore/delete and dependency checks, including a remembered expanded state.

Archive count visibility retains owner/creator, ancestor, app, assistant and tenant rules. A two-app runtime-role fixture drops from 18 to 14 application queries by skipping inventories; per-app authorization still runs. No template edits, data migrations or integration changes. Production timing and live-host acceptance remain pending release; status and validation are tracked in [PR #155](https://github.com/tarous89/trialy/pull/155) and [performance measurement](docs/PERFORMANCE_MEASUREMENT.md). Validation: production build/type checks, 19 focused backend checks and 52 distinct browser scenarios across the focused runs pass locally. Full CI is tracked on the PR. Next: P03 refresh/access-trigger coordination.

## 13 November 2026 — Performance increment 2: redundant session writes

N2 now shares identical in-flight session expiry writes and avoids a PostgreSQL row update when the stored expiry is already identical. The actual session-store fixture reduces 12 overlapping touches from 12 driver queries/row updates to one; a later identical expiry still queries the database but does not update the row. Numeric counters expose coalesced touches, updated rows and no-op expiry queries. All session reads, current revocation checks, immediate session-data saves, cookie behavior and existing expiry precision remain intact. Sharing lasts only while a query is running and is cleared by session saves/deletes; errors reach all waiting callbacks and retries perform fresh work.

The recommendation's hourly throttle is excluded because it cannot preserve exact rolling expiry without another authentication/expiry design. This is narrower burst-load reduction; isolated polls still refresh expiry normally. No migration, template, installed-app, permission or integration change. Type/build checks and 15 focused store/auth/MFA/metrics/static tests pass; current full-CI and deployment status remain in [PR #155](https://github.com/tarous89/trialy/pull/155). The preceding P14/P04 head passed both full GitHub jobs. See [measurement definitions and limitations](docs/PERFORMANCE_MEASUREMENT.md). Next: P02 startup deferral.

## 13 November 2026 — Performance increment 1: measurement and public assets

Owner-authorized sequential implementation of the [reviewed performance scope](docs/scopes/PLATFORM_AND_APP_PERFORMANCE_2026-11-13.md). Measurement commit `d20ed30` adds numeric transaction/context/session driver-call counters, sandbox startup/capability timing, busy-admission counts and Claude MCP tool labels without logging payloads or changing access, session lifetime, runtime limits or execution behavior. A repeatable populated fixture profiles Runway, Programs and Contracts; definitions, results and outstanding production measurements are in [performance measurement](docs/PERFORMANCE_MEASUREMENT.md).

P04 serves Vite's public fingerprinted `/assets` before authentication with one-year immutable caching. Missing assets return a real error instead of SPA HTML; root/index/deep-link HTML revalidates; unhashed public files and private APIs keep their existing cache/auth boundaries. The signed-in HTTP fixture reduces driver calls per existing hashed asset from six to zero and verifies session revocation still blocks API access. No migration, catalog version, installed app, data, permission, integration or automation changes. Build/type checks, focused measurement/HTTP/runtime/context checks and 11 login/runtime-recovery browser checks pass. Full-suite results and release status are tracked with the implementation change; production deployment and before/after latency are not yet verified.

## 13 November 2026 — Data Room 1.0.0 (draft) and room additions

Built `life.data-room` 1.0.0, display name Data Room, from the final scope [DATA_ROOM.md](docs/product/app-template-blueprints/apps/DATA_ROOM.md) (BT2-08, which also covers the former Diligence Q&A, BT2-12). It runs on the exchange rooms of #152.
- **Screens:** seven screens on the Vivid kit, theme forest: Overview, Rooms, Index, Parties, Activity, Q&A and Settings.
- **Index:** the standard 9-section biotech index for financing, licensing, partnering and M&A, with required items weighted by purpose and readiness per room and per section.
- **Documents:** one platform document set reused across rooms; a newer version keeps its place in the room.
- **Levels and entry steps:** Non-confidential, Confidential and custom levels, each with an entry step. CDA options are send PDF, Contracts, in place elsewhere or none.
- **Sharing:** one link per person and invitations in one confirmed send.
- **Tracking:** engagement per party, section and document, with quiet and hot parties, what changed since each party's last visit, a call brief and a disclosure record.
- **Q&A:** assign, draft, approve, then answer privately or publish to the room or a level.
- **Emails:** default texts per email type and room purpose, plus an approved daily digest.
- **Outputs:** writes `dataroom.v1`; the registry writer is now `life.data-room`, and `room_purpose` gains `partnering` (additive).
- **Assistants:** draft only.
- **Status:** a draft; the seed does not name it.

Room additions for it (guidance 1.3.25), all additive:
- Room operations can carry the app's record changes in the same review.
- `set_exchange_levels` can record a level's entry step as met for one person, with a required note (migration 067 extends `exchange_level_open`).
- `accept_exchange_file` can email the access change when a signed document opens a level.
- Room status adds `openLevels` and an access history.

## 13 November 2026 — External exchange rooms (platform, for Data Room)

Built the room extension of the [external exchange](docs/product/EXTERNAL_EXCHANGE.md#5-room-extension-for-data-room) (§5, R1–R8) before the Data Room app (migration 065). Room groups (`kind:"room"`) have no form, submissions or deadline; access lasts until revoked or an end date of 1–730 days, and a room link stops at its end date. Shared documents carry a section, order, level, view-only and "to sign" flag; the page shows Room · Q&A with a numbered index, search and New / Updated badges since the last visit. Ordered levels have their own entry step (none, click-through, or a signed document using the existing slot and acceptance, so a signed CDA unlocks only its level); one function decides what a person sees and is used by the page, search, "what changed", answers, the digest and room emails, and row security enforces the same rule for document versions and answers (sections with only locked documents are not even named). Inline viewer for PDF and images with a `viewed` event per version, 30-minute repeat-open rule and approximate seconds from heartbeats; view-only hides the download; `exchange.status` adds per-document views, seconds, downloads and last seen. New reviewed operations: `define_exchange_levels`, `set_exchange_levels`, `replace_exchange_document` (same place and level, shown as Updated), `answer_exchange_question` (private), `publish_exchange_answer` (room or level, asker anonymised, refused when a referenced document is above some recipients' levels), `approve_exchange_digest`, `archive_exchange_group`; all are human-confirmed, as are room invitations and revocations. Bound output tables (access and engagement) are kept current by the worker as source "tracked" without review; a database trigger refuses those fields to people, assistants and every other write path. New email types access granted, access changed, documents updated (daily digest, automatic only with owner-approved text), question answered, answer published, access ending and access revoked, rendered in each review exactly as sent; workspace notifications for first open, question asked, access ending and optional hot or quiet parties. App runtime `exchange.*` additions, MCP `list_exchange_questions`, template guidance 1.3.23. Page CSP now allows `blob:` images and frames for the viewer. Tests: `tests/exchange-rooms.test.ts` (§5 acceptance 1–8 under the runtime role) and `tests/visual/exchange-room.spec.cjs` (390 and 1440 px, keyboard, contrast).

## 13 November 2026 — CRO Selection 2.0.0 (draft)

Built `life.cro-selection` 2.0.0, display name CRO Selection, from the final scope [CRO_SELECTION.md](docs/product/app-template-blueprints/apps/CRO_SELECTION.md) (BT2-05). It is the first app on the platform external exchange. Each RFI or RFP round is one exchange group, and each supplier has one exchange bound to its invitation record. Submissions are accepted into `croselection.proposals`, decision notices go out as private messages, and email defaults are set per email type and request kind. Every exchange write is one reviewed change confirmed by a person.

The app has eight screens with quick quote and full selection modes. It covers a bid grid with deviations and unconverted currencies, blind weighted scoring, qualification with an override reason, the bid defence, decision, onboarding and a handoff that never writes another app's own tables. Its roles follow scope §7, and the output `croselection.awards` (croselection.v1, writer `life.cro-selection`) is published in the contract registry (version 2026-11-13).

The released 1.0.1 package is archived unchanged under `templates/source/cro-selection/archive/1.0.1/`. 1.0.1 and `life.sponsor-rfp-management` 1.0.1 are marked for archival in `templates/catalog-retirements.json`, to be withdrawn when the owner approves 2.0.0. 2.0.0 is a draft, and the seed still names 1.0.1. Package QA: `templates/source/cro-selection/QA.md`.

## 13 November 2026 — External exchange (platform)

Built the [external exchange scope](docs/product/EXTERNAL_EXCHANGE.md) as a platform feature extending the public forms: exchange groups and per-recipient exchanges bound to app records (migration 064), unguessable links with optional one-time-code email verification, 1–90 day deadlines with extend and revoke (received content is always kept), a recipient page in the TrialAgents design system (Brief · Documents · Your response · Messages; drafts and versioned resubmission until the deadline; up to 10 files of 25 MB; named document slots requested / received / accepted; private thread plus anonymised clarifications and addenda; sender company and logo, privacy notice, "Powered by TrialAgents"), confidentiality gates (none, click-through acknowledgement, signed document required), outbound email from `no-reply@trialagents.com` ("<name> at TrialAgents", Reply-To the sender, defaults per type with placeholders, app and workspace defaults, batch edit and per-recipient personalisation shown exactly as sent, human confirmation, scheduled pre-approved reminders, delivery status, suppression list, per-workspace and per-recipient daily limits), workspace notifications, the Access right "Send to people outside the workspace", AI limits (accepted submissions and messages only; unaccepted uploads unreadable), archive/restore behaviour, app runtime `exchange.*` capabilities and MCP tools, an owner panel under Collections, and an audit trail for invitations, sends, opens, verifications, acknowledgements, downloads, submissions, messages, clarifications, acceptances, extensions and revocations. Tests: `tests/external-exchange.test.ts` (every §4 acceptance criterion under the runtime role) and `tests/visual/external-exchange.spec.cjs` (390 and 1440 px, keyboard, contrast ≥ 4.5:1). DNS (SPF, DKIM, DMARC) and the provider webhook are operator steps listed in the pull request. Template guidance 1.3.22.

## 12 November 2026 — Contracts 1.0.0 approved

The owner approved Contracts (`life.contracts`) 1.0.0 for app templates. As for Runway and Programs, this is an explicit, owner-authorized exception: `templates/catalog-seed.json` names 1.0.0 for new databases, and migration 063 approves, once, the draft row the deployment of #140 imported (a later operator withdrawal sticks). The catalog JSON and digest are unchanged; the gallery screenshot and manifest entry are added.

## 12 November 2026 — Contracts 1.0.0 (draft) and documents inside apps

New template `life.contracts` 1.0.0 (“Contracts”, scope [CONTRACTS.md](docs/product/app-template-blueprints/apps/CONTRACTS.md)), a draft until the owner approves it: register on the shared `agreements` table, families with value per currency, key terms with stored notice deadline and confidentiality end, obligations (published output `contracts.obligations`, contracts.v1, writer `life.contracts`), CDA check, pre-signature pipeline, due-diligence list, Programs milestones as an in-app integration. The seven Contracts-owned optional `agreements` fields are in `templates/core-contract/v1.json`. Platform: saved `frontend-js` apps can call `documents.list`, `documents.search`, `documents.text` and `documents.quote` with the user's own document permissions, and a sanitized `data-trialy-document="upload …"` button opens the platform upload review in the host (`DocumentUploadDialog`) and returns the new version to the app. Assistant extraction (Claude or ChatGPT, each through its own connection) proposes unverified records with quotes and pages; a person verifies in the app; Database column rules can deny assistant writes to the verification fields. Template guidance 1.3.21. Tests: `tests/contracts.test.ts`, `tests/contracts-integration.test.ts`, `scripts/test-contracts-browser.ts`; results in `templates/source/contracts/QA.md`.

## 12 November 2026 — Programs 2.1.0 approved

The owner approved Programs 2.1.0 (monthly cash forecast; in-app Runway integration). As with Runway and Programs 2.0.0, this is an explicit, owner-authorized exception: `templates/catalog-seed.json` names 2.1.0 for new databases, and because the deployment of #134 had already imported 2.1.0 as a draft, one-time migration 062 approves that exact version (it runs once, so a later operator withdrawal sticks; digests and schemas are unchanged). Gallery screenshot and manifest entry added. 2.0.0 stays approved and installed copies are unchanged; new installs use 2.1.0.

## 12 November 2026 — Role-based connections: connect at install, integrations inside apps

Implemented [modular apps §7](docs/product/MODULAR_APPS_AND_SHARED_DATA.md#7-role-based-connections-standard-for-all-apps). When a template is added and existing tables can serve its roles, one small "Use existing data?" dialog (standard confirm-dialog style) lists those tables with **Connect** or **Create new** for each and **Connect all**, and lets the signed-in owner choose who can use the app (members view/edit, ChatGPT and Claude read/propose) before it exists; Add app installs and applies access in one transaction and logs the choices. With nothing to connect the app gets new tables. An optional role the app writes now gets a new table when not connected; only another app's read-only output is never created. Owner decision: no automatic late connection and no "not connected" state; instead **in-app integrations** (7.1): an app keeps its own table for data another app can provide, shows a subtle hint (Add *App* / Use its data), and Connect shows both sources side by side so the user picks one, used from then on; nothing is merged. Programs 2.1.0 (2.0.0 archived unchanged) enters a monthly cash forecast by hand or uses Runway's month closes. Assistants may propose choices (`prepare_data_access`) but cannot confirm them (`confirm_data_access` is app-only). Gaps 7.2–7.5: role and contract labels on any app manifest with compatibility checks; the contract registry (`templates/contracts/outputs.json` with the core contract) through `read_app_template_guidance(resource:"contracts")`; one writer per output role (migration 061 `role_writers`; takeover only from an archived or deleted writer by explicit owner choice); contract versions with superset compatibility. Template guidance 1.3.20. The embedded template gallery now passes the workspace to workspace-scoped calls (its archived-app check had silently failed). Tests: `tests/data-access.test.ts`.

## 11 November 2026 — Programs 2.0.0 replaces Project Oversight 1.0.1 in platform templates

The owner asked for Programs 2.0.0 to be deployed into the platform. As with Runway, this is an explicit, owner-authorized exception to the rule against publishing through the bootstrap seed: `templates/catalog-seed.json` now names 2.0.0, and the pre-deploy catalog sync inserts it as approved. Galleries and `list_app_templates` show only the latest approved version, so new installs get Programs 2.0.0. The 1.0.1 row, its payload and installed 1.0.1 apps are unchanged.

## 11 November 2026 — Programs 2.0.0 template and shared-data install

Built `life.project-oversight` 2.0.0, display name Programs, from the final scope in [PROGRAMS.md](docs/product/app-template-blueprints/apps/PROGRAMS.md): seven screens (Overview, Timeline, Plan, Gates & decisions, RAID, Updates, Settings), the core `programs` table plus seven `programs.*` app tables, an integrated Gantt by program and function with baselines, the critical path and "what drives this date", slips with reasons written in the same review as the date change, a downstream preview applied only when accepted, gates with criteria and same-review follow-ups, a RAID log with a heat matrix and promotion, monthly updates and frozen leadership reports, and cash markers from Runway snapshots when connected. The as-of date is today's date from the app runtime. The 1.0.1 catalog JSON is unchanged; its source package moved byte-for-byte to `templates/source/project-oversight/archive/1.0.1/`, and its installer and seed paths follow.

Platform: Use now reuses existing compatible shared tables by default (modular apps rule 1, roadmap item 2), with the choice shown in the Use dialog and a new read-only `read_template_installation` app tool. Template guidance 1.3.19 documents the installer-schema markers. Evidence: [Programs QA](templates/source/project-oversight/QA.md).

## 11 November 2026 — Runway 2.1.0: modular apps and shared data

Runway 2.1.0 follows [modular apps and shared data](docs/product/MODULAR_APPS_AND_SHARED_DATA.md). Shared tables use the core data contract v1 role keys and fields; the contract is now in `templates/core-contract/v1.json`. App tables use stable `runway.*` role keys. The Programs app's key milestones are read from `programs.plan_items` read-only. Missing, unreadable, archived or deleted partner data degrades with short explanations and never changes totals. The rule 9 acceptance test runs on the real installer and the archive, restore and revision paths. Platform fixes: "install a new copy" (`createNew`) no longer fails the strict preparation schema, and installer manifest IDs accept namespaced role keys. The owner approved 2.1.0 to replace 2.0.0 in the platform templates; `catalog-seed.json` names 2.1.0 under the same owner-authorized exception used for 2.0.0.

## 11 November 2026 — Runway 2.0.0 replaces Cash Runway 1.2.2 in platform templates

The owner approved publishing Runway 2.0.0 in place of Cash Runway 1.2.2. This is an explicit, owner-authorized exception to the rule against publishing through the bootstrap seed: `templates/catalog-seed.json` now names 2.0.0, and the pre-deploy catalog sync inserts it as approved. Galleries and `list_app_templates` show only the latest approved version, so new installs get Runway 2.0.0. The 1.2.2 row, its payload and installed 1.x apps are unchanged.

## 10 November 2026 — Runway 2.0.0 template

Built `life.cash-runway` 2.0.0, display name Runway, from the final scope in [RUNWAY.md](docs/product/app-template-blueprints/apps/RUNWAY.md). It has seven screens, 13 role-keyed tables, one live forecast, a locked budget per year, monthly close with frozen snapshots and a runway bridge, preview-first scenarios and 12 currencies with monthly rates. The 1.2.2 catalog JSON is unchanged; its source package moved byte-for-byte to `templates/source/cash-runway/archive/1.2.2/`, and its installer and seed paths point there. It was initially added as a draft catalog version.

## 10 November 2026 — In-plugin installation and unified automation setup

Supersedes the temporary plugin-to-web installation handoff and the ChatGPT/Email category tabs. Approved templates now install and open inside the plugin through the existing atomic, permission-checked installer. All workspace surfaces share indeterminate progress feedback. Automation creation uses Trigger → Worker/connector → Setup with one Ignore changes action. App/part deletion cancels dependent workflows and removes only unshared empty fields, preserving records and schema/audit history.

## 9 November 2026 — Dedicated template gallery and compact app header

Templates now have a dedicated page, team/workflow filters, versioned screenshots and sandboxed interactive sample previews with fullscreen mode. Approval and immutable digest checks gate both images and demos. Cards show short descriptions and only Preview/Use actions; expanded previews show the full description. Apps has a refined browse link. Persistent header actions use ChatGPT/Claude icons, and the simpler sidebar toggle retains contrast in every state.

## 9 November 2026 — Platform apps and approved template catalog

- Unified the web app shell with a fixed TrialAgents header, collapsible platform sidebar and same-tab app navigation. Home is now Apps.
- Added direct installation of the 23 existing life-science apps with isolated empty tables, separate ChatGPT/Claude customization links, and a default catalog for new users.
- Added migration 056, a database-backed draft/approved catalog, operator publishing workflow, immutable source/schema versions, runtime read-only catalog access, and atomic/idempotent installs.
- Preserved existing app permissions, edits, history, sharing and optional ChatGPT research scheduling. Updated guidance to 1.3.16 for the host header and same-tab navigation.

# Trialy — Project History

This file records meaningful decisions and completed development work. It is not the application's customer-record audit trail.

- [Scope and decisions](README.md)
- [Current development plan](DEVELOPMENT.md)

## New-app approval, uniform cards and dashboard guidance — 7 November 2026

Release 0.2.56 restores the dark floating first-publication footer in the web and embedded bundles, reserves its measured height around tracker controls, and preserves native save behavior for ordinary platform/app editing. Extension Home cards and Open menu actions now stay inside the extension. Quiet app preparation returns the exact finalization handoff; guidance requires displaying that app for approval before returning Home. Home cards keep equal dimensions with bounded text and a Preview badge outside content flow.

Template guidance 1.3.15, the live design kit, server instructions and packaged skill source define reusable dashboard completeness: meaningful navigation, filters, inspectable data and functioning settings/persistence, while respecting explicit simple-report requests. Existing app source, data, access and automations are unchanged. No migration. Verified build/type checks, preview lifecycle and template tests, desktop/mobile card geometry, preview save/discard and return to Home, in-extension navigation, tracker footer clearance, ordinary edits and save-failure recovery. Browser checks use isolated fixtures; actual ChatGPT host integration remains a user acceptance check.

## App account and branding standards — 1 November 2026

Release 0.2.42 adds explicit no-app-auth/account rules and official-icon/canonical-link requirements to template guidance 1.3.7, plugin authoring skills, QA guardrails and the live design kit. Supplied PNGs match the existing assets exactly. Standalone and public-share watermarks consistently include the official icon and link to https://platform.trialagents.com, preserving the standalone unsaved-edit guard. Platform authentication/permissions and existing customer source remain intact.

## Explicit automation status and current template guidance — 1 November 2026

Automation rows now show Enabled or Disabled as a readable badge on both desktop and mobile, independently of the action button label. Template guidance 1.3.6 distinguishes no automation, ChatGPT processing, standalone scheduled/database email and processing-to-email handoffs. It includes concrete authoring examples, current recipient/delivery safeguards and minimal UI expectations. Definition state remains distinct from connection readiness and delivery outcome; no scheduling or permission behavior changes.

## Simple automations and guarded email — 1 November 2026

Release 0.2.41 implements the approved notification scope with daily-or-slower email schedules, explicit database transitions, two-minute settling and current-state/access checks. Pending items coalesce, recipient deliveries are serialized globally (one/hour) and per account (15/rolling day), and ordinary limits defer delivery without disabling the rule. Bounded queue growth suspends abnormal rules. Research and its receipts remain independent of email failures. Migration 051 cancels unsent legacy app emails and fences old workers; unsafe legacy definitions pause for review.

Desktop/mobile authoring retains app/name, schedule/condition, instructions or message and approved team recipients. Backend controls are hidden. Dynamic template guidance 1.3.5, automation guide 1.2.0 and app-services guide 0.7.0 describe the same contract. Local verification includes synthetic bulk, revocation, idempotency, concurrency/budget and emergency-stop scenarios; no real emails are used in tests. Deployment verification is recorded separately after rollout.

## Definition-only automations and app-filtered Logs — 1 November 2026

Release 0.2.40 simplifies Automations to full-width app-linked instructions with trigger/frequency and direct Disable/Enable and Edit. Empty lists no longer display search, pagination, history or shared daily-runner settings. Sidebar order is Home, Database, Access, Automations, Connectors, Logs.

Logs now includes research and platform action run metadata, app filtering and CSV attribution, while preserving owner/current-app access checks and withholding private payloads. New app writes carry verified app context; existing unattributed database events are not guessed. Additional filters wrap in normal flow on both surfaces. Template guidance 1.3.2 and current context reflect these boundaries. No scheduler, app publication or database migration is required by these management changes. Validation covers 178 backend tests and 80 browser scenarios, including current-access filtering, run metadata privacy, empty states, draft preservation and inline filter geometry at desktop/mobile widths.

## App configuration and shared automation management — 1 November 2026

Release 0.2.39 shipped in [PR #86](https://github.com/tarous89/trialy/pull/86), commit `345eb6bb55ccd23110ac73d5690dd75bdea5ac27`. Both Render services were verified live; migrations and public MCP smoke checks passed. CI: 177 backend tests, 75 browser tests, build and production browser verification.

Added Projects/app/optional-tab access, unified app-linked Automations with reviewed schedule/prompt editing and history, disabled-state preservation, archive suspension, and repeated shared-runner setup guidance. Existing apps remain unchanged. Research uses the shared ChatGPT event connection; platform actions handle email. Model/reasoning preferences remain requested and unverified.

Live unattended activation was not established: worker signing storage and host event discovery/subscription remain explicit checks. [Current context](CONTEXT.md) and [operator setup](docs/OPERATIONS.md#shared-automation-activation) distinguish deployed code from activation. Shared template guidance and blueprint instructions now use this contract, including an explicit no-automation path and failure-isolation acceptance.

## Documentation baseline — 2026-10-10

**Status:** scope agreed; development plan prepared; application implementation not started. No runtime, database, deployment, customer migration, or public-brand cutover has been performed by this documentation task.

### Original brief

- Establish a ChatGPT-first, configurable clinical and medical operations platform for small biotech teams.
- Use reusable workspaces, records/relationships, views/forms, documents, permissions, rules/actions, and templates.
- Make the full permitted application available in ChatGPT; retain a standalone application on the same backend.
- Use RFP → CRO selection → study/CRO oversight as the first complete workflow, while retaining the broader template scope.
- Develop one complete product in dependency order, not a sequence of marketed releases.

### Decisions agreed during scope review

1. Use **Trialy** for development; switch the public brand to **Trialegions** at a separate publication cutover. Keep the existing Trialegions project isolated.
2. Target EU and US regulated operational use. Trialy holds authoritative committed records rather than relying on another clinical platform.
3. Allow professional personal information. Explain patient-level data unsuitability through licence/onboarding; do not implement patient-content screening or quarantine.
4. Introduce preview → explicit save → version 0. Conversation and experimentation are not automatically persisted as official records.
5. Preserve history after commitment. Saved working drafts and formally approved records are different states.
6. Offer one-time or revocable future-action permissions with defined scopes.
7. Separate human access from model access; permit verified UI-only display of model-restricted information.
8. Do not require an organisational ChatGPT account. Actual availability remains subject to OpenAI's supported capabilities.
9. Authenticate all private data access and save only through the shared backend.
10. Start with modest paid Render infrastructure and PostgreSQL, including original file bytes. No additional object store or vector database initially.
11. Build text/structure extraction and full-text retrieval; defer vector indexing until needed.
12. Confirm Saved only after source persistence. Derived-processing failures retain the source, use bounded retries, show only quiet availability flags, and do not block unrelated work.
13. Record incomplete search coverage for AI; never treat unavailable extraction as evidence of absent information.
14. Implement transaction integrity, safe retries, and concurrency handling now. Resolve stronger production durability before real customer reliance; no absolute no-loss promise based merely on direct writes.
15. Include electronic signatures conditionally on suitable production API cost and requirements; otherwise defer explicitly and retain internal approvals.
16. Keep testing lean: critical integrity/access checks and one representative end-to-end workflow, without exhaustive cosmetic or template-by-template suites.

### Repository documentation

- README.md: full agreed vision, scope, boundaries, and decisions.
- HISTORY.md: this dated decision and change log.
- DEVELOPMENT.md: ordered implementation tasks, dependencies, practical defaults, acceptance checks, and current status.

## Development foundation implemented — 2026-10-10

**Status:** substantial implementation across Steps 1–11 and template/export groundwork in Steps 13–15. No step with missing acceptance evidence is represented as complete. No deployment, existing-product cutover or customer-data migration occurred.

- Added Node/TypeScript shared backend, React standalone UI, PostgreSQL migrations, durable worker, typed MCP transport, Docker and Render staging configuration, and focused CI.
- Built configurable tables/records/relationships, safe field changes, preview/confirm/discard, atomic versions/audit/job writes, save receipts, stale-edit handling and internal review tied to saved versions.
- Added tenant/workspace permissions, restricted fields/tables, independent AI access, audited registered-user sharing, and revocable one-time/future permissions. OIDC/OAuth wiring awaits a real provider and live verification.
- Store original files in Postgres with checksums and immutable versions. Extraction/OCR runs separately with bounded attempts, isolated subprocesses, quiet failure flags, and permission-aware full-text retrieval/coverage.
- Added eleven starter configuration templates, a related RFP/oversight data model, recurring permission-checked workspace summaries, and owner JSON exports containing original bytes and history.
- Kept patient suitability as a notice, with no content screening. Formal licence acceptance remains to implement. Internal approvals are not labelled electronic signatures.
- Practical defaults: 25 MiB uploads, 100 MiB temporary preview budget, 24-hour expiry, single web instance until shared preview routing/storage exists. Synthetic loopback demo uses PGlite only; real deployment uses PostgreSQL.
- Verification: production build/type check and eight focused subtests passed (nine counted with parent); local MCP transport tested against the shared permission checks. Local demo started. Browser visual check was blocked by a failed Chromium download. Real PostgreSQL, live identity/ChatGPT, OCR fixture acceptance and production restore have not been verified.
- Next: configure and prove the identity/ChatGPT connection, complete the embedded reusable UI, then work through unchecked DEVELOPMENT.md items. Communications, signatures, retention enforcement and production durability remain explicit unfinished work.

## ChatGPT-first connection and embedded workspace — 2026-10-10

- Confirmed the original platform scope remains unchanged. Work continues in this repository; plugin creator will register the hosted MCP connection rather than rebuild the app elsewhere.
- Verified MCP users can create their local account on first connection and later use standalone sign-in with the same identity. No email-based identity merging and no mandatory standalone onboarding detour.
- Replaced the raw result view with an interactive MCP Apps workspace: select workspace/table, search/page records, add/edit via preview, confirm/discard, install starter templates, and explicitly create a first AI-accessible workspace.
- Added global/thread entrypoints with fullscreen preference. ChatGPT/provider control the OAuth return and resumption; immediate automatic opening remains a live acceptance requirement, not a proven guarantee.
- Verification: build and nine focused subtests passed (ten including parent). No Render deployment, identity-provider setup or live plugin registration performed. The connector requires confirmation of the Render workspace before provisioning.
- Added docs/CHATGPT_SETUP.md with exact callback separation, provider configuration and minimal live acceptance steps.

## Existing authentication inspected — 2026-10-10

- User confirmed Render workspace `tea-cspqipl6l47c739nslfg` and requested reuse of existing authentication approaches rather than assuming Auth0 is needed.
- Read-only inspection confirmed Atablez has self-hosted email/password login and MCP SDK OAuth; Intel has self-hosted email/password sessions and account-bound OAuth consent with a signup/login return path to ChatGPT.
- Selected reuse of those patterns with separate Trialy identities, sessions, scopes, secrets and database. No shared existing-app accounts or infrastructure changes are implied.
- Removed Auth0 as a setup prerequisite and recorded the concrete replacement steps in docs/CHATGPT_SETUP.md. Trialy's external OIDC/JWT adapter has not yet been replaced; no deployment or live authentication test was performed in this inspection.

## Self-hosted authentication implemented — 2026-10-10

- Replaced external OIDC/JWT authentication with Trialy-local signup/login and MCP SDK OAuth, reusing the existing-app approach without sharing their accounts.
- Added migration 003 for local accounts, OAuth requests/clients and hashed access/refresh tokens. Implemented account-bound consent, signup continuation, exact callback return, S256 PKCE, single-use codes, refresh rotation/reuse revocation and CSRF/login throttling.
- Removed external-provider environment requirements and dependencies. Recovery/email verification/MFA and production account administration remain unfinished.
- Build and all 11 reported tests passed, including local HTTP signup → callback → authenticated MCP and negative replay/account-switch checks.
- Created paid Render Postgres `trialy-db` (`dpg-db58k25ckfvc739bb5f0-a`), Frankfurt, PostgreSQL 17/basic 256 MB/1 GB storage. No existing-app resources were changed.
- Prepared Blueprint to adopt the matching database and create web/worker with generated secrets. Dashboard application is pending because the connector cannot apply Blueprints or create a worker. Live ChatGPT registration/auto-opening is not yet verified.

## Render deployment and private plugin — 2026-10-10

- Applied Blueprint in the confirmed workspace using user-approved browser fallback. Associated existing database; created web and worker on Starter in Frankfurt. Both are deployed and real PostgreSQL migrations completed.
- Verified live health, login and OAuth discovery; MCP POST requires authentication and supplies the resource-metadata challenge. No customer data or existing apps were changed.
- Created private Trialy plugin 0.1.0, `Plugin_145611061ed08191b8c73a391b6c6806`, release `pluginrel_6aca8d839e908191a19121a10e4c0c5d`, backed by verified https://trialy-web.onrender.com/mcp. Added reproducible package source and preview/save workflow instructions.
- No new application test suite added for deployment-only work. User OAuth connection, real ChatGPT return/automatic opening and embedded save/read-back remain the next acceptance check, not claimed as complete.

## Shared record history and document reading — 2026-10-10

- Continued Steps 4–6, 8 and 10 while the user-account ChatGPT acceptance check remains pending.
- Added reusable version-history and extracted-text views to standalone and embedded surfaces, plus three permission-filtered MCP read tools.
- Added previewed restoration with reason, exact source/current/schema versions, all-field permission requirement, stale-edit rejection, new revision and preserved approval history. No old approval is reapplied.
- Added standalone document replacement upload preserving older originals. Processing failures remain quiet coverage states.
- Build and 13 reported tests pass; focused new checks cover permission leakage, restore/discard/retry/stale edits, approval preservation and original version integrity. Actual host rendering/automatic opening is still unverified.

- Deployment confirmed: commit `89bbf7b`, web `dep-db596tnavr4c73et7vug`, worker `dep-db596tnavr4c73et802g`; both live. Health 200.

## Configurable saved views and shared layouts — 2026-10-10

- Continued Steps 3, 5 and 6: shared record layouts in both surfaces, including comparison and calendar, plus saved-view configuration for columns, typed filters, sorting, grouping and dates.
- Saved configuration still uses explicit preview/commit and version/audit history. Updates reject stale view versions. Backend applies filters/sorting before pagination; UI identifies page-scoped layouts/groups.
- Views referencing any inaccessible field are withheld and cannot be executed by ID. Added `list_views`; `read_records` accepts an authorised saved-view ID.
- Build and 14 reported tests pass, with one targeted new test for sorting/pagination, history/stale updates and restricted criteria. Actual ChatGPT connection/rendering remains unverified.

- Deployment confirmed for `5ceb14c`: web `dep-db59hijbc2fs738ijneg` and worker `dep-db59hirbc2fs738ijnig` live. Public UI bundle and health verified after web switchover.

## How to maintain history

Append a dated entry after meaningful completed work or a changed decision. Include what changed, why, the affected development step, a short verification result, relevant commit/deployment reference when known, and the next action.

Do not mark planned work as implemented. Keep older decisions visible and mark later replacements explicitly. Do not confuse these documentation entries with document/record version 0 or software release numbers.


## 2026-10-10 — Extended configurable workflow and preservation implementation

- Added atomic CSV/bulk writes, uniqueness and validated person/document references, whole-result aggregates/month filtering, protected numeric calculations and bounded previewed field/data migrations. Stale schema/data previews cannot silently change the confirmed outcome.
- Extended embedded field editing, CSV imports and original upload/download via host-supported APIs; actual ChatGPT file/return behavior still needs host acceptance.
- Added document metadata/review/expiry controls, exact-version acknowledgements, archival/retention/hold policies and readable inspection packages. These are internal approvals, not regulated electronic signatures.
- Expanded the RFP configuration with source-linked weighted evaluations, contracts and change orders; added due/overdue report conditions with current-rights checks.
- Added signup intended-use acknowledgement, own-connection revocation, expired authentication cleanup, database readiness, prepared least-privilege role grants and offline integrity/recovery tooling.
- Replaced memory-heavy pdf-parse with installed Poppler after a synthetic isolated extraction exposed an out-of-memory failure. The replacement passed the same synthetic PDF check. Added quiet bounded CSV/PDF table extraction states.
- Added operations, acceptance, customer responsibilities, migration/cutover and signature-decision documents. Formal signatures remain conditional pending provider and production terms.
- Validation: production build and 18 reported tests pass (17 leaf checks plus parent), including atomic bulk failure, full-result aggregates, formula permissions, stale schema/data migration, preservation and inspector access. Synthetic isolated PDF extraction passed. Deployment verification follows below. Production recovery, provider credentials, real host acceptance and the advanced items left open in DEVELOPMENT.md are not claimed complete.

### Final access-boundary review

- Prevent AI-visible older originals from revealing control metadata or reviewed-version IDs belonging to a later restricted original. Added the case to the document permission check.
- Keep access revocation and pausing available on an archived workspace, and serialize grant changes with workspace commits/worker execution.

### Render verification — 2026-10-10

- Commit `97c143f35ead57c21fe12502844bc4037870134b` deployed successfully: web `dep-db5a487avr4c73eu6gi0`, worker `dep-db5a487avr4c73eu6gmg`; both report live. Migration 004 applied. Health/readiness return 200 and public UI bundle matches `index-CZqj9bjn.js`.
- Live synthetic signup/notice acceptance, authenticated workspace/table/record creation, preview/confirmation, identical retry receipt, formula read-back and full-result numeric aggregate passed against Render PostgreSQL.
- One small synthetic text original downloaded byte-for-byte, matched the exported SHA-256 and reached extraction status ready. JSON and HTML inspection exports succeeded. The synthetic workspace `f405a932-635e-43a7-b581-37d6f7adc241` was archived after verification. No external messages were sent.
- This verifies the deployed basic save/processing/export path, not managed disaster recovery or the real ChatGPT connection/automatic opening. No existing Trialegions service, data or domain was changed.

## Account security and integration sequencing — 2026-10-10

- User deferred real plugin testing and integrations requiring developer accounts until the end. Independent implementation continues without those prerequisites.
- Added standalone account-security controls for password changes and explicit account-wide revocation. Both require the current password and CSRF protection, invalidate all browser sessions, revoke connected-app tokens and account-bound pending OAuth codes/consents, and require a fresh sign-in. Saved clinical work is untouched.
- Session epochs prevent a stale browser session from becoming valid again. OAuth exchanges and consent serialize with account revocation to prevent concurrent token issuance escaping revocation. Already-authorized requests in flight may finish; these controls apply at subsequent authorization checks.
- Added append-only account security activity without storing credentials; latest 20 events are visible only to the account owner. Migration 005 and the prepared runtime role include the new table.
- Basic checks: build passed; existing test suite passed (18 reported), extended for incorrect-password/CSRF rejection, old-password failure after change, other-session invalidation, token invalidation and immutable security activity. MFA and provider-backed recovery/verification remain unfinished. No new provider account or email sending was required.

## Remaining core implementation batch — 2026-10-10

- Added independent table AI exclusions, table-scoped field keys, colleague table selectors/editing, version-checked permission changes, and document-level user/AI rules across reads, search, original downloads, writes and reviews. Restricted inspectors cannot bypass rules through inspection exports/history.
- Added authenticator MFA using maintained otplib, encrypted secrets, replay prevention, single-use hashed recovery codes, enrollment confirmation, login challenges and disable confirmation. No new provider account required.
- Added expiring/revocable bearer links for selected-column saved views and external forms. Immutable source submissions identify respondents as unverified link holders. Duplicate-safe submission and separate owner preview/acceptance preserve the source and create versioned working records atomically. No emails sent.
- Added record/document event-triggered reports and daily schedules in local IANA time zones. Existing grant revocation and execution-time access remain enforced. DST gaps skip a day; repeated times run once.
- Added tracked template baselines and explicit additive upgrade previews, conflict detection and preservation of customer modifications and records. Older untracked installations remain untouched.
- Seven additive migrations (006–012); prepared runtime-role grants and recovery inventory updated. No runtime role/production credential changes applied.
- Build passed. 26 reported checks passed, including focused new access, MFA, intake/shared view, event summary, DST and template upgrade checks. Fixed an old flaky check to inspect protected fields instead of searching random identifiers for a numeric substring.
- Isolated PGlite data-directory backup/restore passed: records, originals, revisions, audits, receipts and queued jobs matched; original bytes and history protection verified. Evidence: docs/recovery-synthetic.json. This is not evidence of a Render managed-backup restore or production RPO/RTO.
- Real ChatGPT/plugin testing, provider registration and publication remain deferred by the user. Remaining independent refinements remain listed in DEVELOPMENT.md; this is not a claim that every original scope item is finished.

- Extended the batch with scoped automated draft creation, atomic grant/receipt/run handling, non-cascading worker changes, due-date gating and visible paused failures. Added inherited folder restrictions and owner-only moves across controlled folders, with focused bypass/revocation checks.

### Deployment evidence

- Code commit `f9cca6bcf840e8c3f18224504a2783ded3d111cc` deployed successfully to both Render services. Web deployment `dep-db5b9r3rjlhs73al3oig`; worker deployment `dep-db5b9r3rjlhs73al3on0`.
- `/ready` returned 200. `/` and `/collect` returned 200 with the current `index-CJeiyYxt.js` bundle. Plugin-host acceptance remains deferred.

## Full-scope continuation — 2026-10-10

- Added owner-created, expiring/revocable single-use colleague invitations, signup/login return to invitation review, explicit recipient acceptance and table-scoped access with AI disabled. No email provider or messages required.
- Added ordered conditional questionnaire rules/help/required answers, server-side hidden-answer rejection, recipient file preview/confirmation, atomic immutable PostgreSQL source intake, duplicate-safe retry and owner acceptance into versioned documents. Exports retain external sources and provenance.
- Added explicit adoption of compatible older template installations, preserving renamed tables/custom extra fields and requiring migration for conflicts.
- Added bounded offline XLSX/PPTX extraction; cached/raw spreadsheet values and slide-order text are labelled partial. Originals survive unsupported or failed processing.
- Build and 29 reported checks passed. The old core-test setup was changed to load every migration, fixing an outdated-schema failure. Recovery rehearsal now includes unaccepted external-file bytes; isolated restore passed (not a managed Render restore).
- Real ChatGPT host testing, provider-account integrations, production recovery decisions and public brand cutover remain deferred. Generalized review routing/action types and optional record restrictions remain unfinished.

Deployment verification: code `c5015cec1b188c3919e1a0118c8d00fedb938b42` is live on both existing Render services. Web deploy `dep-db5bmlc9v7es738vvc1g`; worker deploy `dep-db5bmlc9v7es738vvbug`. `/join` returned 200 with `index-DrExHbhY.js`; `/ready` returned 200/ready. No private-plugin package change, existing-product change or real external messaging occurred.

## Review routing and in-app reminders — 2026-10-11

- Added previewed owner routing to a named reviewer, creating an exact-version in-review revision. Added immutable approve/request-changes/cancel outcomes and idempotent decision retries. Enforced the assignment on the existing approval endpoint too; stale requests cannot approve edited records.
- Added a Reviews & reminders screen with saved-record selection, review instructions/due dates, assigned document reviews and reminder read receipts. Fixed legacy template adoption previews to display the mapping/diff instead of an empty generic record preview.
- Added workspace-scoped once/future self-reminder automations on existing schedule/event/condition machinery. Execution rechecks grants/access; completion and inbox storage are atomic. No external notifications or real recipient messages sent.
- Updated inspection exports, runtime-role SQL and recovery inventory for migration 015. Build and 30 reported tests pass. Managed backup testing, ChatGPT host acceptance and provider setup remain deferred.

Deployment: `b2dce02b15c602f4c58294836b38dc2283d3ca1f` is live on both existing Render services: web `dep-db5bsuivcj2c73ei7pu0`, worker `dep-db5bsuivcj2c73ei7q20`. No plugin package change or new infrastructure/account was needed.

Live read-only verification for `b2dce02`: home returned 200 with `index-DQkJhY92.js`; `/ready` returned 200/ready. Live browser/ChatGPT review-workflow acceptance remains outstanding.

## Foundation scope correction — 11 October 2026

The user clarified that Trialy is currently only a foundation for ChatGPT to use persistent data, execute code and access tools. Templates and specific workflows are not in the current build scope. The user approved keeping the existing project, correcting the architecture and separating reusable infrastructure from rigid business features.

- Created `foundation-reset` from `87adf5d`; no new repository or live infrastructure.
- Replaced README.md and DEVELOPMENT.md with the corrected scope and dependency-ordered foundation plan. The old scope/checklist are preserved under `docs/archive/` and explicitly superseded.
- Added docs/FOUNDATION_ARCHITECTURE.md: responsibility boundaries, proposed execution/broker/data contracts, experiment/commit/function persistence, capability grants, dependency map, retirement/rollback and one generic acceptance example.
- Froze further template/business-feature expansion. The old remaining-feature list is no longer the active backlog.
- No arbitrary-code runtime, general tool gateway or saved-function registry is claimed implemented. Runtime-host selection is a later feasibility decision; extraction subprocesses are not a substitute for an untrusted-code sandbox.
- This checkpoint changes documentation only. No saved records, original files, audit histories, applied migrations, existing schedules or deployed screens are deleted or changed. Last live runtime remains `b2dce02`.
- Validation: checked local Markdown targets in active root/architecture documents and verified the diff contains documentation only. No application tests or deployment were necessary for this checkpoint.

## 2026-10-11 — Foundation execution implementation

Implemented the corrected data/code/tools scope on foundation-reset: extracted permission-filtered data/query/document service; added bounded QuickJS/WASM runtime with JSON-only capability broker, temporary run/proposal staging, exact atomic commits, immutable function revisions, once/future grants, leased jobs/cancellation/recovery, interval/daily/event schedules, source-run audit provenance, result/artifact original-file saves, and shared web/MCP/embedded controls. Generic schema proposals are supported; predefined clinical workflows are not expanded. Legacy management remains explicitly available and existing rules/history/data are preserved.

Migration 016 is additive. No new provider account or Render service is needed. Updated inspection exports, runtime-role SQL and synthetic recovery evidence include saved functions. Pinned runtime: quickjs-wasm-0.32.0-v1. Plugin skill updated in place to the new scope, preserving identity and connection configuration. Actual host acceptance, live external providers, production credentials/recovery policies and managed backup restore remain deferred/open as documented in EXECUTION.md.

Deployment verified: runtime commit `3234b5b12a08db4147bd4f9c1d35e25bb5ce32dd`; Render web deploy `dep-db5ikdjbc2fs738pn0gg` and worker deploy `dep-db5ikdjbc2fs738pn0kg` both live. `/health`, `/ready`, and root returned 200; served bundle `index-D4Z-BT8U.js` matches the built implementation. Initial post-deploy error-log scan was empty. Existing 32 reported regression checks passed; final focused foundation acceptance and production build passed after boundary fixes. Synthetic recovery evidence includes migration 016 and saved functions. No real ChatGPT host session or external provider was exercised.

Private plugin identity and audience preserved. Instructions updated and obsolete template claims removed from its listing. Version `0.2.1`, release `pluginrel_6acb2b134dc881918d6f4fce33d9e84e`; source read-back confirmed the skill, connection and default prompt.

## Shared database and saved-component product clarification — 2026-10-11

Documentation-only update following explicit user agreement. No runtime, migration, deployment or customer-data change in this task.

- Expanded the active product definition to connected shared data maintained during normal work, projects/folders hosting ChatGPT-created components, and tools/workers with granular access and audit/version history.
- Added source observations, aliases, project-specific facts and reversible AI-led reconciliation. Preserve originals and alternatives; scoped ongoing maintenance need not ask about every normalization. Ambiguous identity never grants access or external-action authority.
- Added stable component identities/revisions, arbitrary generated-interface hosting within a supported isolated runtime, permission-aware moves/drag and drop, shared data bindings, external collection and cross-chat reopening.
- Replaced the execution-only roadmap with nine dependency-ordered development steps for the full clarified product. Archived the earlier execution checklist without changing historical completion evidence.
- Removed the minimal execution UI as the completion target and the exclusion of generated UI hosting. Retained the exclusion of fixed templates, business workflows and hardcoded action catalogues; user-generated workflows remain in scope.
- Retained Render/Postgres/original-file storage, self-hosted auth, preview/save and scoped future permissions, quiet extraction failure, source preservation, existing histories and lean testing. Provider accounts, conditional signatures, production recovery and publication remain explicit dependencies.
- Marked user-driven ChatGPT testing as started, without asserting complete host acceptance or treating unbuilt features as implemented.

## Database layers and interface behavior clarification — 2026-10-11

Documentation only; no runtime/deployment changes.

- Accepted platform/common/customer-specific schema layers, flexible ChatGPT-designed fields/types, inspect-before-create, contextual roles, record/schema reconciliation and logical customer isolation in shared PostgreSQL.
- Replaced study as a proposed common concept with general-purpose project; study remains an optional specialization. Project containers and their semantic relationships use one identity. Retained optional location; no required education concept.
- Recorded editable-by-default interfaces within permissions, authorized source inspection, and detail pages or short modals instead of below-content expansion.
- Added INTERFACE_RULES.md to separate these preferences from a proposed binding-based edit policy: live record updates versus presentation edits, protected calculations/snapshots and no silent overrides. Same-session versus later-session editing is not recommended as the authority boundary. Detailed editing semantics await user feedback.
- Updated roadmap contracts and UI tasks; preserved historical checklists and existing implementation status.

## Task-driven setup and scoped automatic maintenance approved — 2026-10-11

Documentation-only update; no application behavior or deployment changes.

- New structures are justified by multiple entries, repeated steps/actions, tracking/workflows or expected future growth, even with one initial record. Reuse existing authorized structures first; review and approve setup and maintenance scope.
- Within approved fields, relationships, purpose and inclusion criteria, automatically extract relevant facts, add eligible records and reconcile/update existing ones under revocable permission, without per-entry approval.
- Passing mentions do not create tables/columns or whole-message archives. Explicitly stored original files remain preserved. Scope applies to information available through authorized work, not every ChatGPT conversation.
- Explicitly requested structure changes require reviewed expansion; approved new fields can be populated from permitted sources and maintained thereafter. Preserve uncertainty, prior facts and reversible reconciliation.
- Updated active scope, architecture and roadmap, with focused capture-boundary acceptance checks. Existing implemented status and separately proposed interface edit semantics are unchanged.

## Projects and approved maintenance implementation — 2026-10-11

- Added additive migration 017: project/folder nodes, temporary database-backed workspace previews, maintenance scopes, durable receipts, immutable record observations and reversible identity links. No legacy records are deleted.
- Added shared Projects UI to standalone and embedded clients, separate detail/review screens, drag/drop and explicit moves, setup review and revocation. New project organization requires full workspace access until finer project permissions exist.
- Maintenance pins approved schema versions, tables, writable fields, operations and batch limit. Atomic writes reuse existing validation/audit/revisions and receipts; schema changes/revocation stop subsequent maintenance. Inclusion/source meaning is judged by ChatGPT, not a deterministic semantic classifier.
- Identity linking is non-destructive, same-table and reversible. It does not merge query output, rewrite historical relationships or implement general canonical-entity resolution yet.
- Added REST/MCP tools, source-evidence reads, export/inspection coverage and runtime-role grants. Plugin instruction update 0.2.2 preserves identity, audience, endpoint and default prompt.
- Basic validation: production build and 33 reported tests passed, including a synthetic capture/identity/permission/rollback scenario. Real ChatGPT UI acceptance remains unverified. Runtime `55dbeaf` is live on the existing Render web and worker services. Migration 017 applied successfully. Web deployment: `dep-db5oh0c9v7es7399vulg`; worker: `dep-db5oh0c9v7es7399vupg`. Private plugin 0.2.2 release `pluginrel_6acb88bb19c08191aa2022aebafded77` was read back with preserved endpoint, audience and default prompt. Initial runtime error scan was empty.

## 11 October 2026 — Saved component foundation

- Added durable source/configuration in projects, reviewed saves/moves/archive/recovery, immutable revision history, and source editor in web/ChatGPT workspace.
- Recovery creates a new revision without moving the component or duplicating shared records.
- Added conservative full-data-access checks for saved source, including AI field restrictions; generated HTML/JavaScript remains inert.
- Extended MCP/REST, export and synthetic restore coverage. Build and all 33 reported tests pass. Full ChatGPT rendering and production backup restoration remain unverified.
- Granular project/component sharing and generated interface execution remain next; no new provider, infrastructure cost, or fixed workflow was introduced.

Deployment: `ec9c67e` is live on the existing Render web and worker services. Initial error-log check is empty. No plugin package change or new resources were required; existing ChatGPT connections may need a tool refresh to discover the component read tools.

## 11 October 2026 — Project permissions and initial live interfaces

Added migration 019, inherited human/AI restrictions, owner-reviewed sharing and restriction-preserving moves. Pending confirmations, maintenance, observations, history and export honor the new boundaries. Added the generic `trialy-ui-v1` runtime for composed text/layout and live editable tables; confirmed cell edits update shared records. HTML/JavaScript remain inert source. Richer blocks, arbitrary frontend code, partial-data component access and provider/function integration remain pending. No new paid resources.

Deployment: `cb220b8` is live on the existing Render web and worker. Build, 34 reported tests, focused live-edit/access checks and synthetic restore passed; health/readiness returned 200 and the new interface bundle was verified. Initial deployment error logs are empty. Private plugin 0.2.3 (`pluginrel_6acb8fdc26e88191a143c0b25448c9ec`) was updated and read back; identity, audience, connection and default prompt were preserved. Actual ChatGPT/browser interaction remains unverified.

## 11 October 2026 — Correct frontend scope to code hosting

The user clarified that ChatGPT writes frontend code and Trialy stores/runs it. The custom text/table catalogue direction was a deviation. New authoring of `trialy-ui` is disabled, with existing data/history retained. Added migration 020, `frontend-js` isolated JavaScript render/event execution, HTML/CSS frame hosting, declared data reads and exact reviewed database-write proposals. Added read-only code previews before save, custom form/button events and unchanged component organization/access/history. Standard browser DOM/React/npm code and external providers are not implemented. Local Chromium launch was blocked by the environment, so browser/ChatGPT acceptance remains open.

Deployment: `bba0be6` is live on the existing Render web and worker. Build, 36 reported tests, focused frontend bridge checks and synthetic restore passed. Health/readiness/root/frame returned 200; bundle `index-HZ6lFYLU.js` and sandbox/CSP headers were verified. The rollout logs contained SIGTERM shutdowns of the previous instances; the subsequent error window was empty. Private plugin 0.2.4 (`pluginrel_6acb9569ccfc8191bdb03a034fbf981f`) was published and its changed files read back. Browser and real ChatGPT interaction remain unverified because Chromium could not launch locally.

## Durable data and file previews — 2026-10-11

Moved the remaining ordinary data/file previews from process memory into PostgreSQL (migration 021). Any replacement service can confirm the original preview ID/digest; binary originals are staged as bytea and transferred into original storage in the same transaction as metadata/history/receipt. A successful save removes its staging row atomically, retries return the receipt, failed or stale saves keep the draft until discard/expiry. Ownership and current authorization are checked at confirmation.

Previews expire after 24 hours and remain outside authoritative revisions/inspection exports. Limits are 1,000 previews/100 MiB per workspace, serialized against concurrent admissions. Periodic cleanup failures are logged without unhandled promise rejections. Infrastructure backups can retain staged content until those backups expire. Existing in-memory drafts from the old process cannot be migrated and require re-preparation on this one-time rollout; previously confirmed records are unaffected. No new resources, paid accounts or plugin package changes.

Validation: production build and focused service-replacement/file-integrity/expiry/permission tests, alongside the existing suite. Real ChatGPT/browser acceptance and managed-backup recovery remain open.

Runtime commit: `a8c0002`, additive migration 021. The existing 36 tests passed; the new focused persistence test passed after correcting its test-fixture parameter types. Build passed. No browser/ChatGPT acceptance claimed.

## Scope correction: explicit database-write approval — 11 October 2026

The user superseded automatic maintenance by default. Every database change must have a visible exact review and approval unless the user explicitly granted longer-term permission for that data type. Existing schema/task approval is not future-write authority. Longer-term permissions cannot be general workspace-wide write permissions. Every changed field value must retain before/after history linked to the exact approval or versioned grant, including changes made under longer-term permission. A fixed Changes and permissions area in both surfaces must support inspection, permission management and reviewed reversal as a new audited change.

Updated README, DEVELOPMENT, INTERFACE_RULES and the detailed WRITE_AUTHORIZATION contract. Moved enforcement, field-level authorization evidence, shared UI and safe reversal ahead of further automatic-maintenance work. This update changes scope/roadmap only; runtime and plugin enforcement are pending implementation. No customer data, grants or deployed runtime were changed by this documentation update.

## Approval enforcement, identity reads and component execution — 11 October 2026

Implemented migrations 022–023. Ordinary commits, workspace confirmations, function saves and grant/schedule approval require an authenticated human session. Embedded buttons open the secure standalone Changes & permissions review; model tool access alone cannot approve. Task scopes default to proposals; longer-term maintenance requires explicit autoWrite, one data type and expiry. New function grants pin one type, fields, schema version and expiry; old grants are retained but cannot write. Legacy fixed record-writing jobs pause.

Added immutable field-level before/after logging (including null versus unset and calculated fields), exact approval/grant references, permission-filtered history/export, recoverable pending reviews and grant management in both surfaces. Current-field reversal creates a new audited correction; stale versions, controlled records and unsafe required/derived changes are rejected. No historical approval evidence was fabricated. Full change-set reversal and some richer filtering remain open.

Added candidate search and accepted identity-group reads preserving originals, conflicting facts, observations and incoming references. Bounded functions can use entities.search/entities.read within declared types; no semantic auto-merge or relationship retargeting.

Saved components now declare exact owned function bindings and optional existing type-specific grants. Runtime functions.invoke stages up to three invocations per event, admitted atomically after successful render; functions.status reads the attached run. Generic UI/API run/status/cancel and componentContext schedules reuse the worker. Component version/access/archive and field coverage are checked before execution, after computation, on read and before writes. Source restore clears execution bindings. No external provider/account/paid infrastructure added.

Production build, all 38 reported tests, the focused duplicate-run admission rollback check, and isolated synthetic backup/restore passed for this checkpoint. Real browser/ChatGPT acceptance and managed production backup restore remain unverified.

Deployment: `f79f269` is live on the existing Render web and worker, migrations through 023. Web deploy `dep-db5sdmn40ujc73cq6o9g`, worker `dep-db5sdmn40ujc73cq6odg`. Health/readiness/root returned 200 and the current bundle is `index-BcT69dvP.js`. Private plugin 0.2.5 (`pluginrel_6acbc73edba48191bfded228547ac363`) was published and its changed files matched on readback; identity, audience, connection and default prompt were preserved. Rollout error entries were SIGTERM shutdowns of the old 14:07 instances, not failures of the new runtime. Real ChatGPT/browser acceptance remains open.

## 11 October 2026 — Reviewed batch reversal and history filters

Implemented selected field reversal across records through the same durable preview/human approval path. Multiple selected fields on one record become one validated correction/version; all records succeed together or none are changed. Later edits, hidden/derived fields, controlled records and invalid resulting values are rejected. Original history remains immutable and the reversal records the original change IDs.

New saved field deltas include a unique data-commit receipt ID, independent of a reused standing permission. REST/MCP and Changes & permissions support record, actor, date range, authorization kind/ID and saved-batch filters. Selection is explicit and limited to the current visible page. No schema migration, new infrastructure or external provider was introduced. Creation archival and real browser/ChatGPT verification remain open.

Added name search across accessible projects/folders/components and reviewed saved-component copies. Copies retain inherited source restrictions and destination access, preserve data bindings, have independent version-zero history with source provenance, and clear all function bindings. They never duplicate records, worker grants or schedules. Focused checks cover stale source rejection, AI access denial, sticky restrictions, cleared execution authority and idempotent save.

Validation: production build passed. The full 39-test suite passed after the history changes; the four focused authorization/workspace checks passed again after component copying. Browser/ChatGPT acceptance is still pending.

Deployment: commit `ee919f97936ad1be2ca9a72ecb1d399c5ad9c464` is live on the existing Render web (`dep-db5tf62vcj2c73f1g0lg`, 18:39:12 UTC) and worker (`dep-db5tf62vcj2c73f1g0pg`, 18:39:01 UTC). Health, readiness and root returned HTTP 200; the root serves `index-BwiHEkQu.js`. No error-level logs appeared in the checked post-deployment interval (18:39:13–18:39:29 UTC). Private plugin identity, connection and packaged version 0.2.5 are unchanged; the existing MCP endpoint serves the added operation/filter schemas. No real-host interaction acceptance is claimed.

## 11 October 2026 — Retained entry and project archival

Implemented reviewed archive/restore for unchanged new draft records. Whole-record access, current version and cross-workspace-type dependency checks protect linked work without exposing restricted values. Original data and field history are retained; each state change creates a revision and immutable audit event containing the exact authorization. Changes & permissions adds an Archived entries view with reviewed restoration. Active reads and aggregates exclude archived records; explicit archived/all queries retain access. Corrected input reversal/restoration validation for calculated fields so derived values are recalculated rather than treated as editable inputs.

Migration 024 adds owner-reviewed project/folder archive/restore with inherited state and exact descendant review. Archival clears component execution bindings in new revisions, revokes task scopes and pauses attached schedules. Restore retains those stopped permissions. Repeated component checks prevent old run contexts from resuming after restoration. Shared records and independently invoked workspace functions remain separate from project organization. Both web and embedded UI expose the new controls. No external provider, paid resource or customer-data deletion was introduced.

Validation: production build, four focused authorization/archival checks and synthetic PGlite backup/restore passed with migration 024. The broad run reported 40 passing checks and a native V8/WASM allocation crash in the execution test file (not an assertion failure). Both execution tests passed when rerun separately. Actual managed Render restore and browser/ChatGPT interaction verification remain outstanding.

Deployment: runtime `3bb1ccc79b054b2e345a1262c4c7726413b65ea3` is live on Render web (`dep-db5u6v3bc2fs739506j0`, 19:30:10 UTC) and worker (`dep-db5u6v3bc2fs739506n0`, 19:29:57 UTC), with migration 024. Health and readiness returned HTTP 200. No error-level logs appeared in the checked 19:30:11–19:30:31 UTC interval. The private plugin identity and packaged version 0.2.5 remain unchanged; new tools and UI are served by its existing MCP endpoint. Browser/ChatGPT interaction acceptance remains pending.

## 11 October 2026 — Shared project records and contextual facts

Migration 025 adds stable project-record associations, immutable candidate field values and immutable retractions. Reviewed linking/unlinking preserves a single shared record and all history. Current project and field access apply to reads; affiliation with a project never expands record permission. Candidate facts include source labels, rationale and optional project/date context. A reviewed undated global preference updates only the named main record through the existing field ledger; contextual claims remain contextual. The shared project UI exposes records, sources, candidate preferences, withdrawals and authorization evidence.

Added a scoped entities.facts code capability and a ChatGPT-directed backfill tool. Backfill is always preview-only until human confirmation, even with a standing grant, and only fills absent/null/empty fields on existing in-scope records. Source extraction/semantic judgment remains ChatGPT's role. Export, restricted-role SQL and synthetic recovery inventory include all new tables. Generated frontend record reads now honor the active-record archive filter consistently with standard APIs. Broader schema semantics, alias propagation, original-source citation binding and real-host UI verification remain open.

Validation: production build passed; nine focused shared-data, authorization, workspace and frontend checks passed. The expanded shared-data test also passed with mandatory backfill review and declared-table facts capability checks. Synthetic backup/restore passed with actual project links, a candidate and its withdrawal included in the inventory. No real browser/ChatGPT acceptance or managed Render recovery is claimed.

Deployment: runtime `23bede148d39cf3bb4479c31bee6e39728b1454a` is live on the existing Render web (`dep-db5uij2vcj2c73f2rujg`, 19:54:54 UTC) and worker (`dep-db5uij2vcj2c73f2rung`, 19:55:06 UTC), with migration 025. Health and readiness returned HTTP 200; the checked post-deployment error log interval (19:55:07–19:55:23 UTC) was empty. Private plugin identity and packaged version 0.2.5 are unchanged; its existing MCP endpoint serves the new tools and shared UI. No real ChatGPT/browser interaction verification is claimed.

## 11 October 2026 — direct cross-table identity claims

Added migration 026 and reviewed pair-specific field correspondence between records from different tables. Both originals and current values are preserved; every link/withdrawal requires human confirmation with current schema, version and access rechecks. Same-table maintenance grants and `entities.read` remain unchanged. REST/MCP reads and a separate shared-project comparison page show mapped differences and withdrawal evidence. Added export, archive-dependency, runtime-role and synthetic recovery coverage. No provider, account, resource or plugin-package change is required. Live deployment verification follows below; real host acceptance remains outstanding.

Verification: production build passed; seven focused cross-table/workspace/write-authorization checks passed, plus the shared-records scenario. Synthetic restore passed with populated cross-table link and withdrawal evidence. This remains an isolated PGlite rehearsal, not a managed Render restore. Browser/ChatGPT acceptance remains open.

Deployment closeout: runtime `ee74524185b17a9462e00ff420d6ec1744079929` is live on the existing Render web (`dep-db5uq5vavr4c73fgq8og`, 20:11:33 UTC) and worker (`dep-db5uq5vavr4c73fgq8lg`, 20:12:27 UTC). Pre-deploy migrations completed through 026. Health, readiness and root return HTTP 200; the root serves `index-EFLH4Dcy.js`. Private plugin identity, audience and package 0.2.5 remain unchanged; runtime tools are served by the existing MCP endpoint. Real ChatGPT acceptance and custom-app tool metadata refresh remain unverified. No user action or new account is required for the next implementation step.

Post-deploy log review found npm SIGTERM messages from the previous web process (its log began at 19:54:41 UTC) during replacement. These are recorded as shutdown messages, not evidence of a new runtime failure.

## 11 October 2026 — reusable reviewed table mappings

Added migration 027: immutable named field correspondence, append-only revocation and optional mapping references on cross-table links. Added reviewed save/revoke operations, permission-filtered REST/MCP listing and a shared Projects mapping-detail screen. Reusing a mapping still requires a separate human-approved record-link preview. Table direction, schema changes, hidden fields and revocation are enforced at confirmation; old links and originals remain unchanged. Export, restricted-role provisioning scripts and synthetic restore include the new evidence. No infrastructure, provider or plugin-package changes are needed.

Verification: production build and both focused cross-table/mapping scenarios passed. Checks cover human-only approval, stale schemas, revoked pending links, table direction, original/link preservation, hidden-field and workspace isolation, and immutable history. Synthetic restore with a populated mapping, linked record and mapping revocation passed. Real ChatGPT/browser acceptance and managed Render backup restore remain unverified. Deployment closeout follows.

Deployment: runtime `3f1fdafd7a9d3f5c49f3ce9bc315aea01d50cdf3` is live on the existing Render web (`dep-db5uvk3rjlhs73b6ngg0`, 20:22:48 UTC) and worker (`dep-db5uvk3rjlhs73b6ng9g`, 20:22:39 UTC), with migration 027. The initial post-deploy error-log window 20:22:39–20:22:58 UTC is empty. Private plugin package 0.2.5, identity and audience remain unchanged; MCP changes are served by the existing endpoint. No new paid resource/account or user decision is needed for the next step.

Health, readiness and root each returned HTTP 200 after deployment; the root serves the new `index-Bw7JulAV.js` bundle.

## 11 October 2026 — remaining foundation implementation and deployment

Migrations 028–031 add component document-version assets, owner-reviewed binding-scoped source release, worker health and optional common concept tags. Added atomic reviewed tracking setup; project relationship queries and bound frontend project/file reads; selected direct linked-value corrections; reviewed collection links/response acceptance; component drag/drop and owner operational status. Preserved approval-by-default, exact per-field history, original files and generic ChatGPT-authored code. No provider accounts, paid infrastructure, patient screening or templates introduced.

Roadmap consolidated into implemented foundation and explicit host/provider/production gates. Plugin source prepared as 0.2.6, preserving presentation, private audience, MCP binding and default prompt. Focused checks and populated synthetic recovery are recorded with final deployment evidence below.

### Verified deployment closeout

- Foundation commit `d91cbecf9565700e8654685c27c5acda08e7749a`; final runtime `4552f771a5647381d46b573a3ad5f825ea4773d3` (adds a tested AI guard for retired fields in historical collection responses). Both main and foundation-reset contain the changes.
- Render web deploy `dep-db5vdmvavr4c73fhg9v0` live 20:52:50 UTC; worker `dep-db5vdmvavr4c73fhg9rg` live 20:52:36 UTC. Migration predeploy succeeded through 031. Web bundle `index-C3KIO62n.js`; health/readiness and root return 200.
- Private workspace plugin 0.2.6 published as `pluginrel_6acbf6e9976c8191b2c42fef0dad7f89`. Readback verifies version, updated guidance, unchanged MCP endpoint and default prompt “Open my Trialy workspace.” Audience remains private. Updating this package does not refresh a separately configured custom app's tool metadata automatically.
- Build/type-check passed. Eight nearby focused scenarios passed; final combined and cross-table scenarios passed after bridge changes; the retired-field regression passed. Populated synthetic backup/restore passed through migration 031, including concept metadata, assets/source access, task setup and accepted responses. Evidence: docs/recovery-synthetic.json. No broad cosmetic testing added.
- Direct production SQL inspection was unavailable because the database's external allowlist is empty; networking was not broadened. Deployment and migration logs were inspected. No actual managed-backup restoration, production credential rotation or real ChatGPT/browser acceptance is claimed.
- Remaining gates and known runtime limits are in DEVELOPMENT.md. No new paid infrastructure, external provider account, recipient message or public publication occurred.


## 20 October 2026 — Approved field capability upgrade

Extended the existing foundation with permission-aware multi-reference fields, stable table/field references, typed read-time QuickJS computations and cross-table lookups, dependency checks, current-value queries, column renderers and graphical timelines. Shared app/embedded selectors and bulk editing retain exact review and version checks. Stored records are not rewritten by derived reads. Definitions are versioned through existing schema/view revisions. See docs/FIELD_CAPABILITIES.md for limits and host acceptance boundaries.

## 2026-10-20 — Anonymous tracker-to-account transition

Added isolated 24-hour tracker/page previews, persistent workspace save footer, account signup/sign-in return, explicit human account review, atomic import through existing audit/version paths and idempotent save receipts. Reused Intel connection/recovery behavior with the requested one-day retention. Protected account tools still require OAuth; no new grants or existing-data access. Guest-save integration test and full build/backend suite cover the change; real ChatGPT/browser acceptance remains unverified. See docs/GUEST_SAVE_FLOW.md.

## Customizable tools and interaction repairs — 2026-10-29

**Release:** 0.2.22; commit associated with this entry. No database migration or customer-record rewrite.

- Treat Vivid as an unchanged default preset; remove design-exception gates and allow saved tools to adopt custom interfaces while retaining data/access contracts. Dashboard edit capability follows explicitly reviewed bindings rather than its display category.
- Add persisted theme tokens, scoped CSS, custom tab icon paths, and Style settings. Explicit column appearance overrides semantic defaults; ordinary categories and multiple text values stay plain.
- Add Settings tab/column creation and removal, reviewed atomic schema additions, visibility/delete icon buttons, and spacing. Removing a view retains shared tables/records.
- Use one paginated Overview next-steps area; fix multiple-value Add/Remove focus and cached-value mutation; expire dismissible save notifications.
- Prefetch neighboring tabs and next pages with controls, retain bounded session snapshots for two minutes, coalesce pending tab clicks, and preserve permission/version revalidation and invalidation after writes.
- Validation: production build and type check; 104 backend tests; 15 browser scenarios including real Settings saves, brand overrides, pagination, multi-value keyboard editing, cache navigation after 20 seconds, and desktop/mobile preset parity. Plugin instructions independently forward-tested for branding and custom board requests without live writes. Actual ChatGPT host behavior still requires a user session check after publication.

### 2026-10-29 — Account page performance
- Reduced repeated metadata reads with per-read reuse and uncached final verification.
- Batched the database catalog; shared identical thumbnail samples; streamlined authorized audit reads.
- Removed duplicate Access loading and off-screen Tools polling; retained all UI and interaction contracts.
- Added query/connection timing diagnostics and performance/security/browser regression coverage.


## 9 November 2026 — apps-first cross-platform context consolidation

The product name is TrialAgents. Current README, CONTEXT, development, product scope and documentation index now describe a suite of connected customizable apps for ChatGPT, Claude and standalone web, followed by assistant customization and custom app creation. They capture same-tab app hosting, sidebar defaults, persistent assistant CTAs, plugin Open TrialAgents, dedicated gallery entry points, screenshot previews and publisher-approved database templates. Landing-page direction records suite/platform sections before custom creation.

Superseded context, new-tab/watermark-only plans, old showcase research and dated UI release notes moved to [archive snapshots](docs/archive/2026-11-09-product-reset/README.md); old paths retain pointers. Hosted and repository-bundled guidance reflect the same product identity and shell. Template guidance advances to 1.3.17; immutable released template JSON and saved user apps remain unchanged. This is a documentation/guidance change, not proof of real-host parity, plugin package publication or unattended activation. Legacy technical identifiers remain compatible.


## 10 November 2026 — shared plugin UI and view context

ChatGPT and Claude share the web sidebar icon, visible hover/active states, expanded platform navigation and collapsed app/preview defaults. The embedded header stays full width, removes the wordmark dot and styles Open TrialAgents like the web assistant CTAs. The embed build now includes the shared platform stylesheet.

Embedded Apps and New → App open the shared dedicated template gallery with search, Team/Workflow filters, screenshots and sandboxed fullscreen sample previews. A read-only app-visible MCP tool serves only approved catalog media in UI metadata; preview CSP blocks network requests. Use opens the selected template in the authenticated web platform, preserving human-only installation.

Supported MCP Apps hosts receive bounded current-view metadata for apps/routes, standard tracker sections, templates, automations, database fields and access scopes. No record values, secrets or unsaved text are included; updates do not start conversation turns or grant permissions. Unsupported hosts remain usable. Actual acceptance in a signed-in ChatGPT or Claude conversation requires host verification beyond the synthetic integration tests. Saved apps, template versions, authorization and assistant-specific frame handling remain unchanged.
