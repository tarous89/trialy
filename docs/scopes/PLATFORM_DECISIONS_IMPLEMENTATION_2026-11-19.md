# Implementation scope for the platform decisions of 19 November 2026

**Status:** built. Sessions 1 to 7 are merged; the rebuilt catalog versions wait for the owner's approval (O4). See the progress table (section 9).
**Decisions:** [snapshot with codes](PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md) (72 records: 69 in scope, 3 backlog or draft).
**Evidence:** six code reviews in [`platform-decisions-2026-11-19/`](platform-decisions-2026-11-19/), read at commit `376f29d`. They hold the file and line references for every item below.
**How to cite:** decisions by code (`R3`, `A6`, `P5`); work packages by number (`2.3` = session 2, package 3).

---

## 1. Summary in plain language

The decisions change four things at once:

1. **Who can do what.** Apps get their own Owner, Editor and Viewer roles. Assistants get two simple permissions (Data and Apps). Organizations can have several owners. None of this exists in the code today.
2. **How apps are created, installed and changed.** One installation popup, one approval footer that never gets lost, no rollback of old versions, and three bugs fixed.
3. **How fast apps feel.** App screens and edits move from the server into the browser. Edits save instantly in one step. This is the largest single piece of work.
4. **How apps look and are authored.** One short guide, one general style with shared building blocks, and, as the very last step, every switched-on catalog app rebuilt to the new rules.

The work is split into **seven build sessions**. Each session is one large, self-contained batch that ends with passing checks and one pull request. Inside a session I do not stop to ask about individual decisions: section 3 lists the defaults I will build to, and section 4 lists the few things only the owner can do.

| Session | Theme | Main outcome for users |
| --- | --- | --- |
| 1 | Foundations and quick fixes | Bug B2 fixed, restore-from-history removed, one platform message, header status, speed measured |
| 2 | Roles and access | App roles, co-owners, assistant permissions, sharing and access requests, member removal |
| 3 | App lifecycle and installation | Persistent approval footer (bug B1), installation popup, dependency warnings |
| 4 | Data path and server speed | Instant edits (bug B3), validation on every write, Undo, faster reads |
| 5 | Browser runtime, style and guide | Instant screen changes, phone and assistant-panel layout, general style, the new authoring guide |
| 6 | Automations and external sharing | App-owned automations, retries and alerts, Publish / Collect / Disclose |
| 7 | Catalog rebuild (last) | All switched-on catalog apps on the new rules, style and speed; automatic speed updates |

Size, from the six reviews: roughly 25 to 35 engineer-weeks by conventional estimates. Sessions 2, 5 and 7 are the largest. If a session cannot finish everything, it ships what is complete and records the remainder in the progress table (section 9); it does not leave half-built features switched on.

---

## 2. Working agreement for the build sessions

**Start of every session**

1. Read this file, the decisions snapshot and the evidence file(s) named in the session.
2. Compare the snapshot with the live decisions table. If a decision changed, update the snapshot first and adjust the affected packages.
3. `npm ci`, `npm run build`, `npm test` to confirm a clean start. Record any failures that already exist.

**During a session**

- Build the packages in the order given. Commit per package, with the package number and decision codes in the message.
- Resolve open points with section 3 (Defaults adopted). Do not ask the owner about them again.
- Stop and ask only when: a step would break one of the decisions; a migration could lose or expose existing customer data in a way this scope did not foresee; or an action in section 4 is needed.
- Every behavior change ships with tests. Tests that assert the old behavior are rewritten in the same package, never skipped or deleted without a replacement.
- Database changes are additive first: new columns and tables, backfill, switch reads, then remove old paths in a later package. Every workspace table needs row-security policies (`docs/DATABASE_ROLE_ROLLOUT.md`).
- Keep the application check and the database row-security check in step. A role or permission rule is not done until both enforce it.

**End of every session**

1. `npm run build`, `npm test` and `npm run test:visual -- --trace off` pass.
2. Update the progress table (section 9), `HISTORY.md`, `CONTEXT.md` and the affected docs.
3. Update the guidance that assistants read (server instructions, workspace guide, tool descriptions) for everything that shipped, so guidance never describes behavior that does not exist.
4. Push the branch and open one pull request for the session (see section 4).
5. Update the *Platform Capability Review* app: mark changed capability items and note which decisions are now live.

---

## 3. Defaults adopted

These answer the open points the reviews raised. They are the build target unless the owner changes them. Each is reversible before its package ships.

### Access

| # | Point | Default |
| --- | --- | --- |
| D1 | Existing per-column restrictions (`A2`) | **Freeze, never widen.** Existing hidden fields, column rules and "not for AI" fields keep working as read-only legacy restrictions. No new ones can be created. Access shows them with a "move to a separate table" prompt; only an organization owner can lift one. |
| D2 | Existing member roles | Tenant owner stays owner. Workspace editors and viewers become members and keep their current table access as explicit table rules. Inspectors become members with Viewer on every app and lose the organization-wide audit log. |
| D3 | App roles for existing apps | The creator (if still a member) becomes Owner. Existing per-user rules become Editor, Viewer or none. Every other app gets the team default that reproduces today's access, not a blanket Editor. New installs default to Editor (`A1`). |
| D4 | Organization owner and apps | An organization owner counts as owner of every app. |
| D5 | Tables that belong to no app | Existing organizations keep current access. New organizations: members get View; Edit is granted per table. |
| D6 | Assistant permissions (`A4`) | Set separately for ChatGPT and Claude, as stored today. |
| D7 | People who arrive through a public link or an email share | They are guests, not organization members, and never receive the team default. |
| D8 | Member removal (`A11`) | The removing organization owner receives the departed member's app Owner roles. Co-owners keep theirs. |

### Apps, installation and versions

| # | Point | Default |
| --- | --- | --- |
| D9 | "One review per assistant response" (`A6`) | A response cannot be identified over the connector. All pending assistant changes to one app form one review. |
| D10 | How long a pending change lives | No expiry. If the app changed underneath it, the change must be prepared again; it is never approved blind. |
| D11 | Who approves assistant app changes (`A4`, `A6`) | A person, in the platform footer (web or inside the assistant). The server refuses an assistant confirming its own app change. |
| D12 | Existing folders (`I1`) | Flatten. Child projects move to the top level and keep every restriction they inherited. Folders are archived. |
| D13 | Archived fields (`A9`) | A field is part of a table: it stays restorable from the Database archived list only. Saving or restoring an app no longer restores tables or fields silently. |
| D14 | "Customized" app (`P11`) | The app's code differs from every published catalog version. Layout and option changes do not count. |
| D15 | "Speed-only" catalog update (`P11`) | Declared by the publisher per version, approved with the version, and machine-checked: same tables, options, defaults and helpers. |

### Speed, saving and Undo

| # | Point | Default |
| --- | --- | --- |
| D16 | Record edits in existing apps | Become direct (no review dialog) when the platform change ships, not when each app is rebuilt. |
| D17 | Two people edit the same record | Edits to different fields both save. An edit to the same field: the second person sees the newer value and is not saved (`P5`). |
| D18 | Undo session (`G8`, `A10`) | While the app stays open, up to 60 minutes and the last 20 actions. Only your own actions. Sends and connector calls get no Undo. |
| D19 | Deleting inside an app | Allowed for anyone who can edit the whole record. A delete is an archive; Undo brings it back. |
| D20 | Remembered content (`P2`) | Kept in memory only. Nothing is stored on the device. |
| D21 | A host that blocks in-browser execution | That host keeps the current server mode. Everything still works, without instant screen changes. |
| D22 | Contrast and text size | Reported as warnings in the self-check, because the owner chose to keep them overridable. Broken layout (clipped or overlapping content) and the non-negotiable rules (`G1`) block. |

### Automations

| # | Point | Default |
| --- | --- | --- |
| D23 | "Each assistant owns its automations" | Replaced by "runs on". The assistant column says which assistant runs it, not who owns it. Any app owner can manage and move it (`T1`). |
| D24 | Earlier promise that prompts and run history are private to the creator | Replaced by `T1` and `A7`: all owners of the app see them, within current table permissions. |
| D25 | Automations and functions tied to no app | Kept in their current state, listed as "Unassigned" for organization owners to attach to an app or archive. New ones cannot be created without an app. |
| D26 | Buttons in an app that editors press to run an action | App features, not automations. Only owners configure them. |
| D27 | Platform email and connector jobs with no assistant | Run with the linked owner's rights. |
| D28 | Existing "review each change" automations and schedules without a write grant | Become "Needs attention: set up again". They never turn into silent direct writes. |
| D29 | A moved automation | Stays on only if the new owner's connection is ready and access checks pass. Otherwise it is switched off with the reason shown. |
| D30 | Minimum interval (`T2`) | An organization setting, default 60 minutes, for recurring research only. |
| D31 | Automation expiry date | Optional. When one passes, the automation shows Needs attention. |

### External sharing and data

| # | Point | Default |
| --- | --- | --- |
| D32 | Publish (`X1`) | Read-only, including a live view that is labelled as live. Editing through a public link is removed. |
| D33 | Routine submission (`X2`) | A new record in a table the app marks as intake. Any change to an existing record, and every file, goes to a reviewer. |
| D34 | Who reviews | An app owner or editor with write access to the target table. |
| D35 | File screening (`X2`) | Allowed file types, content matches the type, size limit, executables, macros and encrypted archives blocked. A malware scanner is a separate service decision (section 4). |
| D36 | Direct intake and automations | A routine submission does not start an assistant run. |

### Guidance and catalog

| # | Point | Default |
| --- | --- | --- |
| D37 | "One short guide" (`G12`) | One design guide, plus a separate technical reference that contains no design rules. |
| D38 | General style (`G10`) | Built from the existing Vivid look, turned into a versioned kit. The byte-for-byte lock on Vivid is removed. |
| D39 | Catalog rebuild scope (`G14`) | The 16 switched-on apps (9 codebases). The 16 switched-off apps stay off and unchanged. |
| D40 | Demo data | Allowed in catalog gallery previews, clearly labelled. Never in an installed app (`G11`). |
| D41 | How rebuilt apps ship | New major versions with an owner-approved upgrade for installed copies. Old versions stay approved until copies have moved. |
| D42 | Activity and disclosure screens inside apps (Fundraise, Partnerships, Data Room) | Stay. They are business records, not platform history. |

---

## 4. What only the owner can do

These are the only planned stops. Everything else proceeds without prompts.

| # | Action | When |
| --- | --- | --- |
| O1 | Confirm or change the defaults in section 3 | Once, before session 1. Silence on a default means it stands. |
| O2 | Allow each session to open its pull request, and merge it after review | Once for all sessions, or per session. |
| O3 | Publish new versions of the ChatGPT and Claude plugin packages | After sessions 1 and 5. Installed plugins keep the old wording until then. |
| O4 | Approve new catalog versions. Deployments never approve versions. | Session 7, per app. |
| O5 | Add server capacity if measurements show the need (`P8`) | After session 5 reports real numbers. |
| O6 | Decide on a malware-scanning service for uploaded files (`D35`) | Before or after session 6. Not blocking. |
| O7 | Run the production migrations for sessions 2 and 6 at a quiet time, after reviewing the migration report | At release of those sessions. |
| O8 | Archive the *Platform Discussion* table from the Database page | Any time. |

---

## 5. Architecture choices that several sessions rely on

Recorded here so no session has to decide them again.

**A. App roles.** A new `app_members` table (app, user, role, granted by, granted at) plus a team default role per app. One resolver, `appAccess`, returns owner, editor, viewer or none, and is the only place app authority is decided. It replaces the roughly 60 "organization owner required" gates for app administration. Role grants live in their own table with their own version, not in the workspace permission rules. Existing "data-contract roles" in the code (`appRoles`, `role_writers`) are a different thing and are renamed where they collide.

**B. Tables know their app.** `entity_types.origin_app_id` marks a table created for an app. Such tables resolve access through `appAccess` (`A2`). Other tables use per-table Edit, View or Blocked.

**C. Assistant permissions.** `data_level` and `apps_level` per assistant at two places: the organization maximum and each member's personal limit. Effective level = the lowest of organization maximum, the person's own rights, and the personal limit.

**D. Pending app changes.** The existing `workspace_previews` rows become the durable store for pending app changes: they gain origin, app, change class (new, revision, assistant) and review group; they stop expiring; and one shell-level footer shows them everywhere (`A6`, `B1`).

**E. Runtime: one app source, two hosts ("hybrid").** The same app code runs in the browser frame for interaction and on the server for first render, assistant commands, automations and public links.
- The frame runs the same engine as the server (QuickJS), so results match. A frame-local store answers reads; a miss shows "pending" and is filled by one batched server call.
- A server `AppCapabilities` class (extracted from `runFrontend`) is the single authority for what an app may read or do. A new `read_app_data` endpoint serves reads with no sandbox and no queue.
- Actions with outside effects (send, connector call, exchange) always run on the server.
- Rollout in three steps: (1) **v1 server mode**, unchanged, the default for every installed app; (2) **v1 browser-compat**, the same source running in the frame, switched on per unchanged catalog version once its browser test passes, with no change to installed copies; (3) **v2 contract** (direct save, pending reads, per-screen data, notice, undo), used by rebuilt apps in session 7.
- Customized copies stay on v1 server mode.

**F. Direct save.** One operation, `save_app_records`: validate once, apply in one transaction, write the audit entry and a receipt keyed by a request key so a retry never saves twice, and return only the changed rows. Field-level conflict handling as in `D17`. Assistant edits with Data = Edit use the same operation.

**G. Platform interface for apps (`PlatformChrome`).** One shared service provided by the web shell, the embedded top bar and the public shell: `notify` (one message at a time; info and success close after 5 seconds; errors stay until dismissed and yield only to a newer error), `setAppStatus` (app name, read-only, access removed, newer version, refresh state, in the header) and `footerInset` (space for the approval footer).

**H. Guidance.** One guide version and checksum replaces six separate version strings. Old resource names stay as aliases so older plugin versions keep working.

---

## 6. Sessions and work packages

Sizes: **S** under half a day, **M** one to two days, **L** three days or more, **XL** a week or more (conventional estimates from the reviews).

### Session 1 · Foundations and quick fixes

**Goal:** remove what the decisions forbid, fix the simplest bug, give every later session the shared message and header service, and start measuring.
**Evidence:** files 2, 3 and 5. **Depends on:** nothing.

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 1.1 | Helpers no longer appear as apps | `B2`, `T1` | Add `app_id` and `retired_at` to `foundation_functions`; backfill from the saved link; retire helpers an app no longer uses; `saveAppFunction` updates the existing helper instead of adding a new one; Home excludes app helpers; they are listed under their app in Automations. Install retry key survives a page reload. No rows are deleted. | M |
| 1.2 | No rollback of old app versions | `A12` | Remove `restore_component` (operation, validation, "Review recovery" button, tool text). Version history stays readable. | S |
| 1.3 | No restore from logs or history | `A10` | Remove `restore_record`, `reverse_field_change(s)`, `archive_created_record`, `restore_archived_creation` and their buttons and routes. Keep the underlying engines for Undo (4.6). Keep all history and audit rows. Remove the unused `ChangesPanel`. | M |
| 1.4 | Restore only from archived lists | `A9`, `I2` | Remove the restore offer in the catalog install flow. Saving or restoring an app no longer restores tables or fields silently; it stops with "restore the table from Database first". Field restore stays in the Database archived list (`D13`). | S–M |
| 1.5 | Projects, no folders | `I1` | Migration flattens folders and copies inherited restrictions down (`D12`); server rejects new folders; add a Projects destination to the sidebar; remove folder controls and wording. | M |
| 1.6 | Platform message, header status, footer space | `U1`, `U2`, `G2`, `B1` | Build `PlatformChrome` (architecture G). Replace the stacking 3-second notice and the banners drawn inside the app runtime. Header shows app name and status. Create the app frame at once and replace the fixed 8-second "Retry loading" timer with header status. | M |
| 1.7 | Minimal assistant context and display rule | `A14`, `A15` | Context handoff sends only the app or tab identifier. Rewrite "open before anything else" to "open once, after the first response" in server instructions, workspace guide, tool descriptions and both plugin skills. | S |
| 1.8 | Speed baseline | `P1`, `P10` | Client timing for tap response, screen change, edit, and open-to-content, by host and screen width, with no business data. Daily histograms. Record the first baseline in `docs/PERFORMANCE_MEASUREMENT.md`. | M |
| 1.9 | Runtime spike | `P4`, `D21` | Prove the in-frame engine under the real Claude and ChatGPT hosts and time the three largest app sources on a mid-range phone profile. Write the result into this scope. If a host blocks it, that host stays on server mode. | S–M |

**Done when:** installing Deal Radar creates one Apps entry and its helpers show only under the app in Automations; no restore control remains in Logs, record history or app settings; only one platform message shows at a time with the 5-second and until-dismissed rules; a baseline exists for every target in `P1`.

### Session 2 · Roles and access

**Goal:** the access model the decisions describe, enforced in both the application and the database.
**Evidence:** files 1 and 5. **Depends on:** session 1 (header status for 2.9).

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 2.1 | Data model and resolver | `R1`–`R5`, `A2`, `A4`, `A8` | One migration: member kind (member, guest, public link), last-owner guard, `app_members`, team default role, `origin_app_id`, assistant levels, billing on the organization. The `appAccess` and `assistantLevel` resolvers (architecture A–C). Backfill per `D2`–`D7`, with a per-organization migration report. | L |
| 2.2 | Several organization owners | `R1` | Promote and demote with the last-owner rule; Settings → Team role control; review every place pinned to "the" owner. | M |
| 2.3 | App Owner, Editor, Viewer enforced | `R2`–`R5`, `A3` | Replace the organization-owner gates for sharing, app access, automations, monitoring, catalog update and code change with `appAccess`. Rewrite the row-security functions to match. Keep the saved-source check so an owner blocked from a table cannot publish code that holds its values. | L |
| 2.4 | Table access without per-column settings | `A2` | Per-table Edit, View, Blocked per member; app tables follow the app role; remove the column and hidden-field editors; legacy restrictions frozen per `D1` with the "move to a separate table" prompt. | L |
| 2.5 | Assistant permissions | `A4` | Data and Apps levels, organization maximum and personal limit, a self-service page for the personal limit. Apps is Blocked unless the person owns the app or is creating one. Existing assistant switches mapped per the access review. | L |
| 2.6 | Sharing and access requests | `A5`, `R3`–`R5` | Grant endpoint with the allowed-role matrix; lowering or removing limited to owners; warning when the recipient is blocked from the app's tables; access requests with email to every eligible grantor, first approval wins, "granted by, on, at" with time zone. | M–L |
| 2.7 | Access tab rebuilt | `R3`–`R5`, `A1`, `A2`, `A4` | Access tab organized around app roles, table access and assistant levels. | L |
| 2.8 | Logs by role, billing by role | `A7`, `A8` | App owners see their app's operational and automation logs; editors and viewers see history of records they can read; organization owners see everything. Billing endpoints and tab limited to organization owners. | M |
| 2.9 | Member removal and access messages | `A11`, `U3` | One transaction removes membership, access and rules, moves app Owner roles (`D8`) and switches off the person's automations with a reason (the "set up again or move" flow is 6.2). Header messages for read-only and removed access plus the request-access control. | M–L |

**Done when:** a member who installs an app is its Owner and can grant roles; an Editor cannot change code, automations or settings; an app owner blocked from a table cannot read it through the app, logs or an assistant; no screen offers a per-column permission; every rule holds in both the application tests and the database-isolation tests; the migration report shows no organization gained access it did not have.

### Session 3 · App lifecycle and installation

**Goal:** one approval footer that is never lost, one installation popup, and warnings before a change breaks something.
**Evidence:** file 2. **Depends on:** sessions 1 and 2.

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 3.1 | Durable pending changes | `A6`, `B1` | Architecture D: new columns, no expiry, no silent deletion when a new preview is prepared, "needs preparing again" when the app moved underneath. Opening an app attaches its pending change. | M |
| 3.2 | One approval footer everywhere | `A6`, `B1`, `A3`, `D9`–`D11` | One `PendingChangesFooter` in the shared shell for web, standalone app and embedded hosts: Save / Discard, Publish / Discard, Approve / Decline. Remove the inline block, the modal and the embed page actions. Server refuses an assistant confirming its own app change. Teammates keep the published version until approval. | L |
| 3.3 | One installation popup | `I2`, `I3`, `A1`, `R2`, `G9` | Generalize the catalog dialog into `InstallationPopup`: app name and purpose, then Project and team access, Table connections, Optional automations; one Install, one Cancel. Shown on first save of any new app, catalog or assistant-built. The server requires it: an app cannot be installed without the reviewed choices. | L |
| 3.4 | Popup again when a change affects access, connections or automations | `A4`, `I2` | Compute the impact of an approved change; when non-empty, the footer's approval opens the popup with only the affected sections. | M |
| 3.5 | Table connections | `I4`, `I5` | Show source app and Read or Read/write on each row; show unavailable sources as unavailable; cross-app links read-only by default with explicit write-back; assistant-built apps carry suggested connections the installer accepts or replaces with a new table. | M |
| 3.6 | Dependency warnings | `A13` | An impact report for app and schema changes (other apps, views, links, automations), limited to what the caller may see; returned to the assistant only when something is affected; rechecked at save; unresolved breaking changes cannot be published. Replaces the silent retirement of automations by a database trigger. | L |
| 3.7 | Owner-only settings and platform admin links | `U4`, `U5`, `A3` | Settings and layout proposals limited to app owners. One documented link contract from apps to Access, Logs and Automations with the app selected; Logs gets a deep link. | M |

**Done when:** a pending change survives leaving the app, signing out and switching device, and its footer is visible from any app; a retry after a failed refresh never saves twice; every new app passes through the popup; an assistant cannot approve its own app change; a change that would break another app is reported before save and blocked if unresolved.

### Session 4 · Data path and server speed

**Goal:** instant, safe edits and the server pieces the browser runtime needs.
**Evidence:** files 3 and 5. **Depends on:** session 2 (roles, assistant levels), session 1 (messages, baseline).

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 4.1 | Validation core | `X3`, `P6` | `validateData` collects every problem as field, row, code and message; adds configured ranges, formats and declared unique keys (including combined keys); one shared parser for dates and numbers; used by forms, imports, API, external submissions, tracked exchange writes and automations. | L |
| 4.2 | Import report, duplicates and formatting rules | `X4`, `X3` | Server-side import validation with a per-row report; declared formatting rules; duplicate and conflict report without guessing or merging; assistants normalize only on request with Data = Edit. | M |
| 4.3 | App data without the sandbox | `P3`, `P6`, `P8` | Extract `AppCapabilities`; add `read_app_data` (one access check per request) and `records.summarize` for totals on full data. | L |
| 4.4 | Direct save | `P5`, `B3`, `A6`, `D16`, `D17` | `save_app_records` (architecture F). Record edits in existing apps commit directly; the review dialog and full reload for record edits are removed; the app is never locked. Assistant Data = Edit uses the same operation. | L |
| 4.5 | Instant edits in standard trackers | `P5`, `B3` | Value shows at once, saves in the background, rolls back with a message on failure; only changed rows refresh. | M |
| 4.6 | Undo and delete in apps | `G8`, `A10`, `D18`, `D19` | `app_undo_entries` and `undo_app_change`; the server computes the reverse change; delete as archive available to apps. Apps place the Undo control themselves. | M–L |
| 4.7 | Show first, quiet background, no queueing | `P2`, `P7`, `P8` | Frame served as a cached file; previous screen stays while loading; remembered output in memory (`D20`); saves and rechecks run quietly with failures as messages; record saves stop locking the whole workspace. | M |

**Done when:** editing a value in an installed catalog app makes exactly one request, shows at once and never locks the app; an invalid import returns every problem by row and field and writes nothing; two people editing the same field get the conflict message; Undo reverses your own edit, delete and stage move within the session and refuses a record someone else changed; measured edit time meets `P1`.

### Session 5 · Browser runtime, responsive shell, style and guide

**Goal:** instant screen changes, one app on every screen size, the general style and the single authoring guide.
**Evidence:** files 3 and 6. **Depends on:** session 4. Uses the result of spike 1.9.

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 5.1 | Engine and store in the frame | `P4`, `P2` | Architecture E: in-frame engine, local store, local event loop, server-action forwarding, first render seeded with its reads. | XL |
| 5.2 | Browser-compat mode for existing catalog apps | `P4`, `P8` | A per-version switch for unchanged catalog code; switched on as each app's browser test passes. Installed copies untouched. | M |
| 5.3 | v2 app contract | `P3`, `P4`, `P5`, `G8`, `U2` | `records.save`, pending reads, per-screen data, `notice`, `undo`, caller's app role and a per-person remembered context (`G4`, `G6`). | L |
| 5.4 | One app, every screen | `P9` | Full-height frame with internal scroll; the frame reports width class and touch; header collapses on phones; messages and footer full width above the safe area; embedded hosts honour inline and fullscreen widths. | L |
| 5.5 | General style and kit | `G10`, `G5`, `G8`, `D38` | One token set and component styles injected by the runtime (apps stop carrying their own CSS). Shared building blocks: navigation that folds on phones, table that becomes cards, inline-edit cell, side panel, drag-and-drop board, empty state with first action, pager, context picker, owner-only settings form, Undo, adapters to the platform message and header. Standard tracker restyled to the same tokens. Remove the Vivid byte lock. | L |
| 5.6 | The single authoring guide | `G1`–`G13`, `D37` | Write the guide (outline in evidence file 6) and the separate technical reference. Delete or archive the superseded sources. One guide version and checksum; old resource names kept as aliases. Rewrite server instructions and both plugin skills. Remove default example rows. | L |
| 5.7 | Checks that match the new rules | `G1`, `G13`, `D22` | Remove the checks that enforce the old rules (required Settings, four shells, fixed sections). Add a check for the non-negotiable rules that can be detected (own header, own message bar, own footer, sign-in forms). Check every screen at browser, assistant-panel and phone widths. Contrast and text size become warnings. | M |
| 5.8 | Speed gates | `P1`, `P10` | Hard gate in CI per switched-on app: screen change and filter make no request; an edit makes one. Soft gate against the baseline for 0.1 s, 1 s and 2.5 s. | M |

**Done when:** in a compat-mode app, changing screens, opening menus and filtering loaded data make no server request; each switched-on app passes at three widths; the old guidance files are gone or aliased and the guide carries no fixed counts or pixel sizes; a newly built app uses the kit and draws no header, message bar or footer of its own.

### Session 6 · Automations and external sharing

**Goal:** automations that belong to apps and behave predictably; three clear ways to share outside.
**Evidence:** files 4 and 5. **Depends on:** sessions 2 and 4. May run before session 5.

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 6.1 | App owners manage automations | `T1`, `A7`, `D23`–`D26` | Replace creator-only visibility with an app-owner rule on all nine automation tables; "Linked to" and "Move to my account"; `moveAutomation` (`D29`); Unassigned list (`D25`). | L |
| 6.2 | Member removal, restore and resume | `A11`, `A9` | Removal switches the person's automations off with the reason and offers "set up again" or "move". Fix: a restored and re-enabled automation is scheduled again from now, with no replay. Automations can be archived and restored on their own. | M |
| 6.3 | Retries, Needs attention, one alert | `T3`, `T2`, `U2` | Shared error classifier; retries at 5, 15 and 60 minutes as the same run; permission and connection failures stop with a visible cause; a failed step blocks only what depends on it; one alert per run; a temporary failure no longer pauses the whole automation. Minimum interval setting (`D30`). | L |
| 6.4 | What can write, and run history | `T5`, `D27`, `D28`, `D31` | Effective write = declared tables, limited by the running assistant's Data level and the linked owner's rights. No proposal mode. Run history shows Applied and Delivered. | L |
| 6.5 | Copy, duplicates and outages | `T6`, `T4` | Copies stay off until an owner reviews tables, connections and recipients; grants never copy. Delivery ledger keyed by automation, recipient, business event and due occurrence; unknown sends are checked with the provider before retry; resume recalculates the next run. | M |
| 6.6 | Retire legacy monitoring | `T7` | Guided migration per monitor with a verification report (schedule, recipient, write scope, last completed run); the old trigger is fenced off; paused stay paused. Then remove the legacy tools and guide text. | L |
| 6.7 | Background work never slows people | `P7` | Scheduler locks its own row, not the workspace; validation outside the lock; one shared event scan per workspace. | M |
| 6.8 | Publish, Collect, Disclose | `X1`, `D7`, `D32` | A mode on links, exchange groups and app shares, with backfill; mixed configurations rejected; email verification forced for confidential disclosures; public editing removed; link holders are guests. Mode choice in the panels. | L |
| 6.9 | Direct intake, review and file screening | `X2`, `D33`–`D36` | Valid routine submissions create records directly; changes to existing data and all files go to review; screening status on files; reject operations; the submitter sees whether to retry. CRO Selection's acceptance flow follows. | L |

**Done when:** a co-owner sees and manages an automation someone else set up; an Editor cannot; a temporary failure retries on schedule and future runs continue; a permission failure shows Needs attention with its cause and alerts once; editing an automation never re-sends the same due notice; each external link has exactly one mode; a valid routine submission appears as a record without review, and a file never reaches an assistant before it is accepted.

### Session 7 · Catalog rebuild (last)

**Goal:** every switched-on catalog app follows the authoring and performance decisions, in one pass.
**Evidence:** file 6. **Depends on:** all earlier sessions.

| # | Package | Decisions | What changes | Size |
| --- | --- | --- | --- | --- |
| 7.1 | Upgrade path for installed copies | `A3`, `D41` | An owner-approved upgrade to a new major version that carries records, connections and settings across. | M |
| 7.2 | Automatic speed updates | `P11`, `D14`, `D15` | Publisher flag per version, machine check, a background job that applies it to non-customized copies with a revision and audit entry, and a header "updated" status. | M–L |
| 7.3 | Rebuild on the kit and the v2 contract | `G14`, `G2`–`G8`, `G11`, `P3`–`P5`, `P9` | Order: Bio Radars (one source, eight apps) → Fundraise → Contracts → Programs → Partnerships → Runway → Data Room → CRO Selection → Investor Updates. Per app: no own header, messages through the platform, inline instant edits, drag and drop where it fits, Settings reduced to business choices, data lists moved to their own screens, platform notes and raw technical data removed, each screen loads only its data, first action on every empty screen, Undo where it makes sense. Branded sidebars may stay below the platform header. The single confirmation when something goes out to external people stays. | XL |
| 7.4 | Tests, gallery and app instructions | `G11`, `G13`, `D40` | Per-app tests and browser scripts rewritten; gallery media regenerated with labelled demo data; per-app instructions rewritten for assistants. | L |
| 7.5 | Final gates and close-out | `P1`, `P10` | All speed gates enforced for every rebuilt app; final measurements recorded; capability inventory and decisions updated. | S–M |

**Done when:** each rebuilt app passes the self-check questions (`G13`) and the speed gates at three widths; an installed copy can be upgraded by its owner without losing data; a speed-only update reaches a non-customized copy automatically and skips a customized one. New versions wait for owner approval (`O4`).

---

## 7. Traceability: every decision to its packages

| Code | Decision | Packages |
| --- | --- | --- |
| R1 | Organization owner | 2.1, 2.2 |
| R2 | Organization member | 2.1, 2.3, 3.3 |
| R3 | App owner | 2.1, 2.3, 2.6, 2.7 |
| R4 | App editor | 2.1, 2.3, 2.6, 2.7 |
| R5 | App viewer | 2.1, 2.3, 2.6, 2.7 |
| A1 | App and team defaults | 2.1, 2.7, 3.3 |
| A2 | Database and records | 2.1, 2.4, 2.7 |
| A3 | Code, UI and versions | 2.3, 3.2, 3.7, 7.1 |
| A4 | Assistants | 2.1, 2.5, 2.7, 3.2, 3.4, 4.4 |
| A5 | Requests and sharing | 2.6 |
| A6 | Approval footer | 1.6, 3.1, 3.2, 4.4 |
| A7 | Logs and history | 2.8, 6.1 |
| A8 | Billing and subscription | 2.1, 2.8 |
| A9 | Restore archived apps, automations and tables | 1.4, 6.2 |
| A10 | Deleted records and record history | 1.3, 4.6 |
| A11 | Remove a member and inherit their apps | 2.9, 6.2 |
| A12 | Published app versions | 1.2 |
| A13 | Dependency warnings for assistant edits | 3.6 |
| A14 | Minimal automatic assistant context | 1.7 |
| A15 | Workspace display in ChatGPT and Claude | 1.7, 5.6 |
| I1 | Projects as the organizing unit | 1.5 |
| I2 | Installation and project records | 1.4, 3.3, 3.4 |
| I3 | Installation popup layout | 3.3 |
| I4 | Install-time table connections | 3.5 |
| I5 | Assistant-built app connections | 3.5 |
| U1 | Shared platform UI | 1.6, 5.4, 5.6 |
| U2 | Platform system messages | 1.6, 5.3, 6.3 |
| U3 | Access messages within the standard UI | 2.9 |
| U4 | Platform-managed app administration | 3.7 |
| U5 | Feature settings | 3.7, 5.3 |
| T1 | Automations | 1.1, 6.1 |
| T2 | Automation 1 · Scheduling and intervals | 6.3 |
| T3 | Automation 2 · Retries and failed dependencies | 6.3 |
| T4 | Automation 3 · Outages and duplicate delivery | 6.5 |
| T5 | Automation 4 · What can write | 6.4 |
| T6 | Automation 5 · Copy and activation | 6.5 |
| T7 | Automation 6 · Retire legacy monitoring | 6.6 |
| X1 | External sharing by purpose | 6.8 |
| X2 | External submissions and files | 6.9 |
| X3 | Platform validation on every write | 4.1, 4.2 |
| X4 | Normalization and duplicate handling | 4.2 |
| G1 | Authoring · Non-negotiable rules | 5.6, 5.7 |
| G2 | Authoring · Frame and navigation | 1.6, 5.5, 5.6, 7.3 |
| G3 | Authoring · Platform features stay on the platform | 3.7, 5.6, 7.3 |
| G4 | Authoring · Built around the job | 5.3, 5.6, 7.3 |
| G5 | Authoring · Fewest clicks | 5.5, 5.6, 7.3 |
| G6 | Authoring · Only what helps | 3.7, 5.3, 5.6, 7.3 |
| G7 | Authoring · Customization | 5.6, 7.3 |
| G8 | Authoring · Undo | 4.6, 5.3, 5.5, 5.6, 7.3 |
| G9 | Authoring · App catalog | 3.3, 5.6 |
| G10 | Authoring · General style | 5.5, 5.6 |
| G11 | Authoring · Every feature works | 5.6, 7.3, 7.4 |
| G12 | Authoring · Principles over constraints | 5.6, 5.7 |
| G13 | Authoring · Self-check before preview | 5.6, 5.7, 7.4 |
| G14 | Authoring · Bring catalog apps in line (last step) | 7.3, 7.4 |
| P1 | Performance · Speed targets | 1.8, 5.8, 7.5 |
| P2 | Performance · Show first, fill in after | 4.7, 5.1 |
| P3 | Performance · Load only what the screen needs | 4.3, 5.3, 7.3 |
| P4 | Performance · Instant interaction | 1.9, 5.1, 5.2, 5.3, 7.3 |
| P5 | Performance · Instant edits | 4.4, 4.5, 5.3, 7.3 |
| P6 | Performance · Check once, never skip | 4.1, 4.3 |
| P7 | Performance · Background work stays in the background | 4.7, 6.7 |
| P8 | Performance · No waiting on other users | 4.3, 4.7, 5.2 |
| P9 | Performance · One app, every screen | 5.4, 5.7, 7.3 |
| P10 | Performance · Measure real speed | 1.8, 5.8, 7.5 |
| P11 | Performance · Automatic speed updates | 7.2 |
| B1 | Bug · Save footer and refresh retries | 1.6, 3.1, 3.2 |
| B2 | Bug · Bundled automations appear as standalone apps | 1.1 |
| B3 | Bug · Slow, freezing edits inside apps | 4.4, 4.5 |
| K1 | Backlog · Subscription packages | Not in scope |
| K2 | Backlog · Self-service onboarding | Not in scope |
| K3 | Accounts · Sign-in and recovery transition | Not in scope (draft) |

---

## 8. Risks

| Risk | Where | How it is handled |
| --- | --- | --- |
| Application checks and database row-security drift apart during the access rewrite | Session 2 | One resolver, mirrored in SQL in the same package; database-isolation tests extended before the old gates are removed. |
| The migration widens or removes someone's access | 2.1, 2.4 | Reproduce today's effective access (`D2`, `D3`); freeze column restrictions (`D1`); per-organization migration report reviewed before production (`O7`). |
| Restricted values survive in old revisions, audit entries, stored previews or app source | 2.4 | History stays projected through current permissions; the saved-source check stays. |
| An assistant host blocks in-browser execution | 1.9, 5.1 | Proven early in the spike; that host stays on server mode (`D21`). |
| The frame becomes heavier with the engine inlined | 5.1 | Size budget in the speed gates (5.8); frame served as a cached file (4.7). |
| The `runFrontend` refactor touches every app | 4.3 | Extract with the existing tests green before any behavior change; v1 server mode stays the default. |
| Widening automation visibility from creator to app owners leaks or locks out | 6.1 | App-owner rule tested on all nine tables; run details still respect table permissions. |
| In-flight runs during the automation migration | 6.1, 6.6 | Fencing by dispatch mode, already in place; migrate per monitor with a verification report. |
| Installed plugins lag behind the server wording | 1.7, 5.6 | Old resource names aliased; owner publishes plugin versions (`O3`). |
| The popup and footer become server-enforced gates and break existing flows | Session 3 | Catalog integration tests and both embedded hosts move in the same package. |
| The catalog rebuild is very large (about 60 test files, 30 browser scripts) | Session 7 | Kit first, Radars first (eight apps from one source), one app per commit; each app ships only when its gates pass. |
| Withdrawing an old catalog version too early stops installed copies opening | 7.1 | Old versions stay approved until copies have moved (`D41`). |
| Direct intake starts automations that bring an assistant into a routine submission | 6.9 | Excluded by rule (`D36`). |

---

## 9. Progress

Updated at the end of every session.

| Session | Status | Pull request | Shipped | Carried over |
| --- | --- | --- | --- | --- |
| 1 · Foundations and quick fixes | Shipped and live, 20 November 2026 (checked on the live platform after release). | [#196](https://github.com/tarous89/trialy/pull/196) | 1.1 to 1.9, with the changes listed under "Session 1 notes" | Listed under "Session 1 notes" |
| 2 · Roles and access | Built and merged, 20 November 2026 | [#197](https://github.com/tarous89/trialy/pull/197) | 2.1 to 2.9, with the changes listed under "Session 2 notes" | Listed under "Session 2 notes" |
| 3 · App lifecycle and installation | Built and merged, 20 November 2026 | [#198](https://github.com/tarous89/trialy/pull/198) | 3.1 to 3.7, with the changes listed under "Session 3 notes" | Listed under "Session 3 notes" |
| 4 · Data path and server speed | Built and merged, 20 November 2026 | [#199](https://github.com/tarous89/trialy/pull/199) | 4.1 to 4.7, with the changes listed under "Session 4 notes" | Listed under "Session 4 notes" |
| 5 · Browser runtime, style and guide | Built and merged, 21 November 2026 | [#200](https://github.com/tarous89/trialy/pull/200) | 5.1 to 5.8, with the changes listed under "Session 5 notes" | Listed under "Session 5 notes" |
| 6 · Automations and external sharing | Built and merged, 21 November 2026 | see HISTORY.md | 6.1 to 6.9, with the changes listed under "Session 6 notes" | Listed under "Session 6 notes" |
| 7 · Catalog rebuild | Built and merged, 21 November 2026; new versions are drafts until approved (O4) | see HISTORY.md | 7.1 to 7.5, with the changes listed under "Session 7 notes" | Listed under "Session 7 notes" |

**Spike result (package 1.9):** run on 20 November 2026; full write-up in [7-frame-engine-spike.md](platform-decisions-2026-11-19/7-frame-engine-spike.md).

- **Viable.** The server's engine (QuickJS) runs inside the sandboxed app frame once the frame's policy allows WebAssembly, and gives output identical to the server for the three largest apps.
- **Fast enough for screen changes.** With the engine kept alive, a screen change takes 11 to 26 ms on a desktop-class machine and 39 to 108 ms at four times slower (a mid-range phone stand-in), against a 1 s target. The 0.1 s tap target is met by the render itself on faster devices; on slow phones the two largest apps sit at the line, so the frame should acknowledge the tap before rendering (to build in 5.1).
- **One open risk: Claude.** The web platform and ChatGPT load the frame from our origin, so only our own policy matters. Claude inlines the frame, which inherits Claude's policy; if that policy refuses WebAssembly, Claude stays on server mode (default D21). This could not be tested here and must be checked in the real host at the start of session 5.
- **Not measured:** real ChatGPT and Claude hosts, real phones, Safari and Firefox.
- **Cost:** the frame document grows by about 0.7 MB before compression (about 0.25 MB compressed).

### Session 1 notes

What changed against the scope as written:

- **1.4 was narrower than written.** The scope said saving an app restored archived tables and fields silently. It does not: it is a reviewed, owner-only step listed in the save's review. That stays. What was removed is the restore offer in the install flow and the server refusal behind it.
- **1.5 adds no sidebar entry.** Projects are already navigable from the Apps page (project groups, New → Project, project settings), so a separate Projects item in the sidebar was not added. The legacy "Projects & maintenance" screen lost its folder and move controls.
- **1.6 kept the existing "app updated" bar.** It already sits in the header area on the web. The app name now shows in the platform header. Creating the app frame before the first result moves to package 4.7, where the frame is also served as a cached file.
- **1.6 covers the shared message component.** Its eleven uses now follow the one-message rule. About 85 inline alerts inside individual platform pages and the banners drawn by catalog apps are not converted; they move with packages 5.4 (shell) and 7.3 (catalog rebuild).
- **1.6 follow-up for 5.4.** An error now stays until dismissed, so on small screens it can cover a control in the bottom-right corner. Package 5.4 places messages full width above the safe area and must check this.
- **1.8 sends samples from the web host only.** The embedded ChatGPT and Claude hosts need their own transport (package 5.8). No production baseline exists until this session is released and used; record the first real numbers in `docs/PERFORMANCE_MEASUREMENT.md` before session 4 changes the save path.
- **1.7 leaves two things for later.** In-page code still gathers the richer view details, but they no longer leave the page. The plugin manifest's review test cases still list the open tools first; that changes with the plugin release (O3).

- **1.8 had a gap, found and fixed in session 2.** The live service uses a restricted database login that was not allowed to write the speed table, so no speed numbers were stored between the session 1 release and the session 2 release. The permission and a test for it were added on 20 November 2026.

### Session 2 notes

How the roles are built (so later sessions do not redo it):

- **App roles sit on top of the existing access rules.** Migration 081 records who owns each app, who granted which role and when (`app_members`), and the team default role (`team_default_role` on the app). The existing per-person access rules stay the thing that is enforced; granting a role writes the matching rule. `appRole` in `src/domain/app-roles.ts` and `trialy_security.app_role` in the database give the same answer. The grant rules (`R3`–`R5`) are checked in the application (`src/domain/app-sharing.ts`) and again in the database (`trialy_security.set_app_role`); a database guard stops anyone but an owner changing an app's code, team default or audience.
- **Whoever creates an app owns it** (a database trigger, so every creation path is covered). Existing apps: the creator became Owner when still a team member (`D3`). The team default for existing apps is Editor, which reproduces today's access; existing restrictions (audience lists, per-person rules) keep working unchanged.
- **Editors no longer change layout or settings of an app** (`A3`, `R4`). Before, any team member with edit rights could. Owners of the app and organization owners can.
- **Sharing an app never opens tables.** A team member granted a role keeps their own table access; the person sharing is told which of the app's tables the recipient cannot see (`A5`). Guests keep the existing scoped sharing.
- **Session 2 was built in two parts but ships as one release.** Part A: app roles, team default, several organization owners, access requests, member removal, billing limited to organization owners. Part B: table access without per-column settings (2.4), assistant permissions as Data and Apps levels (2.5), the Access view in three parts (2.7), logs by role (2.8). A person whose table access is view-only can be made Editor of an app, but still cannot change records in those tables (`R4`); the person sharing is told.
- **Automations stay with their creator until session 6** (`T1`), because the database isolates automation rows per creator today.

- **Assistant permissions (`A4`).** Migration 085: an organization maximum per assistant (four columns on the workspace) and a personal limit per person (`assistant_limits`). The lowest applies, on top of the older on/off switches, which stay. Record reads and writes are enforced in the database too; everything about Apps is enforced in the application. With Data = Blocked an assistant sees no tables at all, so it can only work on apps without table connections. Clicks a person makes inside an assistant count as the assistant's.
- **Table access (`A2`, `D1`).** No screen offers a per-column permission. Existing column rules and hidden fields keep working and can only be loosened or lifted by an organization owner; every interface refuses new ones (`column_permissions_retired`). The "not for assistants" flag on a field is table design and is unchanged. Tables created by a catalog install or together with a new app follow the app role (migration 086); the rule only narrows. Tables an assistant creates one by one before saving a custom app are not marked yet: package 3.3 (installation popup) decides which tables are new for the app. Existing viewers and inspectors keep their organization-level role; it now reads as their default table access (`D2` is met without converting data).
- **Logs (`A7`).** Inspectors no longer read or export the organization log. Earlier versions of an app are for its owners. The app log shows research runs and email batches only to the person who set them up until session 6 opens those rows to all owners of the app.

Carried over, with the package that takes it:

- **Billing on the organization (`A8`) — owner decision needed.** Billing records still sit on the person who pays; only the gate changed. Moving them touches payment records and has real risks (two owners who both pay, checkouts in flight, a paying owner who steps down). Not started.
- **Stepping down as owner (`R1`) → 6.1 / 6.2 and 6.x external sharing.** Things a person set up as organization owner are tied to that person still being an owner: outside-sharing links and public forms stop; research automations stop; action automations keep running but nobody else can pause them. Member removal already switches automations off; demotion does not yet.
- **Sharing outside the team by an app owner who is not an organization owner → 2.7 follow-up in 3.3.** The server allows it; the "Sharing & actions" screen is still shown to organization owners only.
- **Embedded hosts (ChatGPT, Claude) → 5.4.** The no-access page, the "View only" header status and role changes exist on the website only; inside an assistant the People and roles list is read-only.
- **Small items.** A pending access request is not cancelled when its requester is removed from the team (it is hidden). The Team tab is still shown to non-owners with an error. Messages that still say "the owner" or "account owner" were not reworded. `docs/ACCESS_CONTROL.md` still describes column editing.

Environment note for later sessions: this build container cannot run the project's pinned browser for screenshots, so screenshot comparisons here are indicative only. The pull request's checks are the authority for them.

### Session 3 notes

How it is built (so later sessions do not redo it):

- **Pending changes (3.1).** Migration 087 adds origin, assistant, app, kind (`change_class`: new, revision, assistant), review group and base version to `workspace_previews`, filled by a trigger from the preview body, so every path that writes a preview is covered and the runtime role keeps insert/delete-only rights. "No expiry" is the date 9999-12-31, so existing `expires_at>now()` checks keep working. "Needs preparing again" is computed when a change is read (app version moved, app archived, or the app's access stamp changed), never stored. The access stamp for an app change now covers only the app, its project, its tables, the rules on them and its roles; changes elsewhere in the organization no longer invalidate it.
- **One review per app (D9).** All pending changes to one app by one person form one review: a second preparation is refused (`pending_change_exists`, with the existing ID and digest), the same content again is a retry that returns the existing change, and `begin_app_update` keeps a change under review. Unfinished drafts are still replaced.
- **Footer (3.2).** `src/shared/PendingChanges.tsx`: a provider in each host reads `list_pending_app_changes` (on open, focus and after every save or discard) and the shell renders the footer. The page that shows a change registers it as the on-screen review; only that one can be approved, so nothing is approved blind. Every other pending change is listed with Open and Discard. Teammates never see someone else's pending change.
- **Who approves (D11).** `confirm_workspace_change` refuses app changes from an assistant, however it is asked. Inside ChatGPT and Claude the person approves through `approve_workspace_change`, a tool visible to the TrialAgents view only (the same host-enforced visibility the existing install and data-access tools rely on); the embedded view sends all of its own Save clicks through it. In a host that cannot show the view (Claude Code), the person approves on the website.
- **Installation popup (3.3).** `src/workspace/installation.ts` builds the popup for any new app; the catalog uses its own step (`data-access.ts`), which now also shows the project and team default and is always shown. The requirement is enforced at every entry point a person or assistant reaches (the website's confirm route, the view's approval tool, `confirm_workspace_change`): a new app without the reviewed choices returns `installation_required` with the popup's content. Internal callers that showed their own popup (the catalog installer) pass none. The view reads the popup's content first (`read_app_installation`) and sends one approval with the choices.
- **Tables new for an app (from session 2).** A table the installer created (per the audit log), used by no other app, is offered as the app's own and marked with `origin_app_id` on install. The rule only narrows access.
- **Impact (3.4).** `changeImpact` compares the app before and after. The popup opens only for what needs a decision: a new table connection, a change of who may read the app's code (`sourceAccess`), or a new helper, function, recommended automation or automation feature. Removals need no decision (what relies on them is checked by 3.6); they are listed when the popup opens for another reason.
- **Connections (3.5).** Read-only use of a table the app would write narrows the app's reviewed field contract (manifest fields set to read), which the platform already enforces on every write. Apps without a field contract, and trackers built from tabs, offer their tables as Read/write only. "Create new" makes an empty table with the same fields and rebinds the app (a tracker gets a draft table instead).
- **Dependencies (3.6).** `trialy_security.dependency_report` (migration 088) is a definer function because automation rows are isolated per creator; it answers only for a signed-in person with workspace access. App changes: this app's automations that read, are triggered by or run what is removed (breaking), and apps that read a role this app stops writing (warning). Table changes: apps showing the fields (breaking), saved views and outside links (warnings), automations (breaking). Names of apps the caller cannot open are hidden. The database trigger that retires automations stays as a safety net for paths other than a reviewed save.
- **Settings and links (3.7).** Layout and feature-setting proposals are refused for anyone but an owner before anything is prepared (the save itself was already owner-only since session 2). The link contract is `platform:access` (the app's own Access panel), `platform:logs` and `platform:automations` (those pages with the app selected, on the website and inside the extension). No other `platform:` link exists.

Carried over, with the package that takes it:

- **In-app record reviews → 4.4.** The app runtime's own dialogs for creating, duplicating and deleting records and for record changes proposed by an app are unchanged. Record edits become direct in session 4 (D16); those dialogs go then.
- **Duplicate an app → 4.x or 7.1.** Copying an app creates a new app through its own dialog, not the installation popup.
- **Sharing outside the team by an app owner who is not an organization owner (session 2 carry-over) → 5.4.** Not done here; the screen is still shown to organization owners only.
- **Access page with an app selected.** `platform:access` opens the app's own Access panel. The workspace Access page itself has no app selection; the link's `appId` parameter is ignored there.
- **Plugin packages (O3).** The design baseline shipped in both plugins now describes the one approval footer. Installed plugins keep the old wording until the owner publishes new plugin versions. The server instructions and workspace guide are current already.
- **Existing pending changes at release.** Assistant changes prepared before migration 087 recorded no origin; unfinished drafts are classified as the assistant's, others as revisions. Their access stamp was computed the old way, so each shows once as "needs preparing again".

Environment note: browser tests run here only with the browser path overridden (`executablePath: /opt/pw-browsers/chromium`). Twenty screenshot comparisons fail identically on `main` in this container (font rendering), so they are not counted as regressions; the pull request's checks are the authority for them.

### Session 4 notes

Start of session: the live decisions table matched the snapshot (72 records, same versions), so no package changed.

How it is built (so later sessions do not redo it):

- **Validation (4.1).** `src/shared/validation.ts` is the one parser and value check (no server imports, so session 5's frame can run it). `Service.validateData` collects every problem as `{field,row,code,message}`: the error keeps the first problem's status, code and message (so existing callers behave as before) and lists all of them in `details.issues` (at most 200, with `issueCount`). Fields can declare `range` (numbers, dates, text length), `format` (email, url, phone, code), `normalize` (trim, collapse_spaces, lowercase, uppercase; applied by `Service.normalizeOperation` before a record write is checked) and a combined key (`unique` with `uniqueWith`). Settings are checked when a table is defined. Unique keys now ignore archived and replaced records and compare text trimmed and case-insensitively. Batches (`bulk_records`, Database edits) report every row and rows that repeat a key. Tracked exchange writes drop a value that fails the value checks instead of writing it.
- **External submissions keep unique checks off at submit time** (as before). Telling a person outside the team that a value already exists would reveal data; the check runs when the submission is accepted. Session 6 (6.9, direct intake) must decide how a routine submission reports a duplicate without that leak.
- **Import report (4.2).** `check_import` (MCP) and `POST …/import-check` take the header and cells as text, parse them on the server and return one result per row: ready, problem, duplicate (same key, same values) or conflict (same key, other values), against the file and saved records. A record the person cannot open is reported without its id or values. The import dialog offers only the ready rows. Client-side value parsing (`csvRecords`) is gone.
- **AppCapabilities (4.3).** `src/workspace/app-capabilities.ts` holds every read an app may make; `runFrontend` and `read_app_data` both use it. Custom code still rechecks the app before each record read inside a sandbox run (its run can be long); `read_app_data` checks once per request and rechecks access once at the end. `records.summarize` wraps `Service.aggregate`, limited to bound fields; it is refused for project-scoped apps until the aggregate can apply a project scope.
- **Direct save (4.4).** `saveAppRecords` / `saveRecordsIn` in `src/workspace/service.ts`: advisory lock and `commit_receipts` row keyed by the request key, workspace lock shared, D17 merge (`mergeConcurrentEdits` compares the edited fields with the revision at the client's version), the app's own checks once (`apply_component_records` validation), then `Service.applyRecordChanges`, which validates the record changes once and returns the reverse changes. Authorization context `app_direct_edit`; audit `component.records_applied` with `direct:true`.
- **Retries and unchanged edits.** Each explicit action in an app carries one request key; Retry after a failed or lost response reuses it, and a key that already has a receipt returns that save with a fresh screen without running the action again. An edit that changes no value passes the same checks but writes nothing (no version, history or Undo entry), so an app that saves on both change and submit does not save twice.
- **What saves directly.** Record changes from a person's click, change or submit, from a click inside ChatGPT or Claude (these count as the assistant's, so Data = Edit applies), and from a write app command with a request key. After the save, a v1 app is rendered once more with event `open` and the state it returned, in the same request, so the screen shows saved data. Changes an app proposes while opening, and record changes that travel with an exchange operation, keep their review. The reviewed `apply_component_records` path no longer prepares a second, inner preview.
- **Standard tracker (4.5).** A cell edit saves without making the frame inert; edits made meanwhile are kept and saved next; a failed save brings back the earlier value, marks the cell and shows one platform message; a conflict reloads the newer value. Add, duplicate and delete save directly; delete is an archive with an Undo bar. The screen after a save is still rendered on the server in the same request; patching only the changed rows in the browser comes with the frame store (5.1).
- **Undo and delete (4.6).** Migration 089 (`app_undo_entries`, row security: the person's own entries only). An entry is usable by the same person in the same open app view (a live runtime view), for 60 minutes and the last 20 actions, while each record is at the version the action left it; undoing in reverse order works (an entry records the versions its Undo produced). Delete (`archive_record`) needs edit rights on every field of the table (the person's own rights, not the app's bindings); Undo restores the earlier state after checking the values again. App code uses `undo.list` and `undo.run` (a person's click only). Sends and connector calls never get an Undo entry.
- **Show first, no queueing (4.7).** The frame is served at `/frontend/frame?v=<fingerprint>` with an immutable cache header (`src/workspace/frame-url.ts`); the bare address stays revalidated for older clients. The frame is created at once when its address is known, and the last screen of each app is kept in memory for two minutes (`FrontendCodeRuntime`, D20). Record saves take the workspace lock shared, plus row locks; reviews, layout and function runs keep it exclusive. Reads through `read_app_data` use no queue slot.

Carried over, with the package that takes it:

- **Measured edit time against `P1` → after release.** No production numbers exist in this container. Direct saves are timed as `save` from the edit to the saved screen; record the first real numbers in `docs/PERFORMANCE_MEASUREMENT.md` after release.
- **Only changed rows in the browser, pending reads, keeping the previous screen while a screen loads → 5.1, 5.3.** They need the frame store. The server already returns only the changed rows (`saved.rows`) and an `invalidated` list.
- **The app's own review step for record edits ("unless the app's design asks for a Save step") → 5.3.** v1 apps cannot ask for one yet; every record edit from an explicit action saves directly.
- **Catalog apps' own confirmation dialogs and "prepared for review" notices → 7.3.** Apps still say a change was "prepared for review" although it is now saved; the rebuild rewrites those texts.
- **Database deletion stays owner-only** for draft records in the Database page; deleting inside an app follows D19.
- **Owner action.** The *Platform Capability Review* app was not updated from this session: marking decisions live belongs after merge and release, and changing that workspace needs the owner's approval.

Environment note: as in session 3, the design check cannot launch the pinned browser here (32 unit tests fail with `design_check_unavailable`, the same on `48dd234`), and browser tests run only with the browser path overridden. In the last full browser run, every failure (font-rendering screenshots, settings and Vivid template timeouts) also fails on `48dd234` in this container; the pull request's checks are the authority for them. The browser tests that asserted the old review-then-confirm flow for record edits (native saving, publication, save-refresh, app changes) were rewritten for direct saves, and the 390 px tracker details screenshot was refreshed: it had recorded leftover data from a restoring save that never landed.

### Session 5 notes

Start of session: no decision changed since session 4 (the snapshot was used as is). The spike's open question (does Claude's widget allow WebAssembly?) could not be checked from the build container; the frame detects a refusal at start and that host stays on server mode (D21), so nothing depends on the answer.

How it is built (so later sessions do not redo it):

- **Engine (5.1).** `src/frame-engine/engine-core.ts` (the guest wrapper, the same as the server's but kept alive per open app) and `local-runtime.ts` (store and event loop) run unchanged in Node tests and in the frame. `scripts/build-frame-engine.mjs` bundles them into `src/shared/frame-engine.generated.ts` (checked in `npm run build`); the engine binary is read from the installed quickjs package at run time and carried in the frame document as a non-executable data block. Frame policy: two script hashes and `'wasm-unsafe-eval'`. Frame document: about 690 KB gzip, most of it the bundled font; budget 720 KB in `tests/browser-runtime.test.ts`.
- **Server side.** A request with `browser:{source}` gets `browser:{mode,version,digest,reads,reset,input,styles,source?}` (`src/workspace/service.ts`, decision in `src/workspace/browser-runtime.ts`). Every read the render made is seeded (errors too, so a failing read fails the same way in the frame). `read_app_data` also serves an app's documents, exchange and file reads now, answered exactly as in the sandboxed run.
- **Frame loop.** A local screen is posted as `trialy.local` (no request); missing reads as `trialy.reads` (the host calls `read_app_data`); outside effects as `trialy.event` with the state before the event. The host answers `trialy.server-idle` after each server event. The first screen is rendered again in the frame and compared with the server's; a difference keeps the view on server mode.
- **Compat (5.2).** The browser test of a catalog version is `tests/frame-engine.test.ts`: every screen identical in both engines, made from seeded reads. All 16 switched-on versions pass and are listed in `templates/browser-runtime.json`.
- **v2 (5.3).** Marker `'use trialagents v2'` in the first lines (after the generated configuration lines). `records.save` is refused outside a person's click, change or submit (or a command with a request key). Migration 090 `app_person_context` (own rows only, runtime grant in `ops/runtime-role.sql`).
- **Shell (5.4) and kit (5.5).** v2 apps and trackers fill the frame; v1 apps keep growing with their content. `src/shared/app-kit.ts` holds tokens, CSS (in a `trialagents-kit` layer, container queries, no hover) and the helper source placed ahead of v2 code. The Vivid stylesheet's colour rule is generated from the kit tokens with the approved values, so the tracker looks the same; the stylesheet body is `theme.source.css`.
- **Guide (5.6).** `templates/APP_GUIDE.md` and `templates/APP_REFERENCE.md`, `GUIDE_VERSION` 2.0.0 and `guideChecksum()` in `src/workspace/guide.ts`, used by template guidance, the workspace guide, `read_tracker_design` and `read_app_design`. Old names (`authoring`, `usage`, `baseline`, `skill`, `theme`, `interaction`, `qa`, `discovery`, `integration`, `data`, `parity`, `configuration`, `template`) are aliases. Plugins ship the guide under their old `DESIGN_BASELINE.md` name.
- **Checks (5.7).** `DESIGN_WIDTHS` 1440, 400, 390; custom apps are checked on each screen their navigation names. `APP_DESIGN_CHROMIUM` lets a build container point the check at its own Chromium.
- **Gates (5.8).** `tests/visual/frame-runtime.spec.cjs` (data from `scripts/frame-gate-data.ts`): hard gate on requests and identical screens; soft gate reports times and fails only above 2.5 s.

Carried over, with the package that takes it:

- **Owner actions.** Publish the ChatGPT and Claude plugin versions with the new skills and bundled guide (O3); installed plugins keep the old wording until then. Report real speed numbers after release (O5). Update the *Platform Capability Review* app (needs the owner's approval of that workspace change).
- **Real hosts.** WebAssembly in the Claude widget and in the ChatGPT and Claude mobile apps, Safari and real phones were not tested here; the frame falls back to server mode where refused.
- **v1 apps at narrow widths → 7.3.** The browser gate reports (does not fail) horizontal overflow of v1 catalog screens at panel and phone widths; the rebuild on the kit fixes them.
- **Embedded carry-overs from sessions 2 and 3 → 6.8.** The no-access page and role changes inside an assistant, and the sharing screen for app owners who are not organization owners, move with Publish / Collect / Disclose.
- **Per-screen data in catalog apps → 7.3.** v1 catalog apps still read whole tables per screen; the frame makes that fast once loaded, but the first open still reads everything.
- **Catalog code and the new checks → 7.3.** Unchanged catalog code is checked as it was published (browser and phone widths, without the G1 bar and sign-in rules); new and custom apps get the current rules. At the assistant-panel width Contracts 1.1.1 has overlapping controls on one review screen; the switched-off CO06 and CR05 draw their own fixed bars. The rebuild brings switched-on apps under the current rules.
- **Header status from apps.** Apps cannot set the header status themselves; the platform sets it. A `status` output can be added when a rebuilt app needs one.

Environment note: `npm test` here ran the real design checks for the first time (`APP_DESIGN_CHROMIUM=/opt/pw-browsers/chromium`): 927 passed; the remaining failures were fixed except CO06's design test, which fails identically on `main` in this container (font rendering). In the browser suite (`pw-local` config with the same Chromium), 16 screenshot and timing tests fail identically on `main` here; every other test, including the 49 new frame-runtime gates, passes. The pull request's checks are the authority for screenshots.

### Session 6 notes

Start of session: no decision changed since session 5 (the snapshot was used as is). Baseline in this container: 931 of 933 unit tests passed on `8db20a2`; the two failures were CO06's design test (font rendering, as before) and the worker revocation test in `postgres-context`, which this session rewrote for the new failure rule (it passes now).

How it is built (so later sessions do not redo it):

- **App-owned automations (6.1).** Migration 091: `trialy_security.manages_app` (and `manages_monitor`, `manages_run`, `manages_occurrence`) and the row rule "linked owner or an owner of the app" on `app_monitors`, `app_monitor_runs`, `app_monitor_receipts`, `automation_dispatch`, `automation_occurrences`, `automation_attempts` and `automation_recipe_setups`; `app_actions` and `app_action_runs` already used the workspace rule and the application decides (`requireAutomationManager` in `src/automations/app-owners.ts`). Runners and subscriptions stay personal (one person's connection); an app owner may read the runner state of their app's research. Authoring keys are unique per app. `user_id` is the linked owner. A co-owner may see, read history, switch off, archive and move; editing or switching on someone else's automation returns `move_required`, because that would start work under another person's rights. `AutomationManagement.move` re-points research to the mover's runner for the same assistant, clears write grants (they belong to the person who gave them), cancels queued work and switches it on again only when it was on and the mover's checks pass (D29). Creating automations and connecting a runner are open to any app owner, not only organization owners.
- **Unassigned (D25).** `automations.app_id` and `archived_at`, `foundation_schedules.archived_at`. Organization owners attach a function, code schedule or record rule to an app or archive it (`/automations/unassigned`).
- **Lifecycle (6.2).** Migration 092 `archived_at` on research and action automations; `archive` and `restore` in `AutomationManagement`. Switching on after a restore or a pause whose next run passed calls `syncDispatch` (research) or `resumeAction` (actions), from now, with the event cursor moved to now.
- **Failures (6.3).** `src/automations/attention.ts`: `classifyFailure` (temporary, permission, connection, setup), `RETRY_MINUTES` 5/15/60, `needsAttention` and `alertOnce` (migration 093 `automation_alerts`, unique per automation and run or cause). Temporary: retried, never switched off. Permission and connection: runs stop, the cause shows, checked again hourly, cleared when a check passes. Setup (what it was approved for changed, an end date passed): switched off with the cause, as before, so the existing "set up again" behaviour holds. Occurrences now allow four attempts. `tenants.automation_min_interval_minutes` (15–1440, default 60) for after-success research and as spacing for database and date triggers.
- **Writes and history (6.4).** Research validation checks the running assistant's Data level first (`assistant_data_blocked`, `assistant_data_view`). A maintenance scope without `autoWrite` returns `write_setup_required`. A code schedule run that would leave proposals without a write grant fails with `write_setup_required` and pauses the schedule with "Set up again". `expiresAt` is optional for research and actions. History rows carry `applied` and `delivered`.
- **Copies and deliveries (6.5).** Migration 094 `copy_review_required` (cleared when the copy is saved), `automation_deliveries` (automation, recipient, business event, due occurrence). Notification batches and action runs are looked up per occurrence across versions.
- **Legacy monitors (6.6).** `src/automations/legacy-migration.ts`: `proposeSchedule` from the saved description, the verification report, `migrateLegacyMonitor` (needs the person's runner; coverage continues from the last completed run). `start_app_monitor_run` already refused a monitor with a TrialAgents schedule; that is the fence.
- **Locks (6.7).** Scheduler transactions take `FOR SHARE` on the workspace row; their own row locks keep work single. `src/automations/event-watermark.ts` and the `audit_workspace_sequence` index (migration 095).
- **Modes (6.8).** Migration 096: `mode` on `external_links` (publish, collect), `exchange_groups` (collect, disclose) and `app_shares` (publish; email invitations are `invite`), derived by triggers and checked by constraints. `exchangeMode` mirrors the rule in code. Verification is forced for documents shared behind an acknowledgement or signature (the migration reports how many groups change). Public edit links were made read-only (config, bindings, tool rules, app roles).
- **Intake and screening (6.9).** Migration 097: `external_links.intake`, `submission_acceptances.intake`, `screening_status` and `screening_reason` on both file tables (recorded once; files stored before screening are screened when first opened or accepted), `external_rejections`. Direct intake writes as the link's owner under `external_intake` inside a savepoint; a duplicate rolls back to review. The research database trigger skips records created by intake (D36). `reviewAuthority` in `src/domain/external-exchange.ts` (D34). Send back: `POST /api/workspaces/:w/external-rejections/:kind/:id`; the recipient reads `GET /external-exchange/returned`.

Carried over, with the package that takes it:

- **Platform email and connector jobs as the linked owner (D27) → follow-up.** Action automations still run under the assistant principal they were created with (ChatGPT when created on the web), so an organization that blocks that assistant's Data level stops its email-only actions; they now show Needs attention with the cause instead of switching off. Running them as the person needs the connector worker grant (connectors refuse worker principals today).
- **Retiring `start_app_monitor_run` and `finish_app_monitor_run`.** They stay for monitors not yet moved. Remove them once the production migration report (O7) shows no older monitors left.
- **Public link principals.** Link holders are guests (`memberships.kind='public_link'`) and only publish now, but they still have a technical membership row; removing it needs `access()` to resolve a share principal without membership.
- **Direct intake for exchanges.** Exchange responses update the recipient's own record, so they always go to review (D33). Direct intake is for form links.
- **Email alerts.** Alerts are in-app (Automations page, one per run or cause). Emailing them is a later choice within the notification guardrails.
- **Record rules creation (D25).** Unassigned items are listed and can be attached or archived; the old `create_automation` record-rule operation still exists for tests and older flows and should be retired with the guidance in session 7.
- **Owner actions.** Run migrations 091 to 097 at a quiet time after reviewing their reports (O7; 095 builds an index on the event table, 096 reports groups that now verify email and public edit links made read-only). Decide on a malware-scanning service (O6). Publish the plugin versions with the new automation and sharing wording (O3). Update the *Platform Capability Review* app (needs the owner's approval of that workspace change).

### Session 7 notes

Start of session: no decision changed since session 6 (the snapshot was used as is). The nine codebases were rebuilt in parallel, one per build agent, on one shared brief; each was merged and checked on the session branch.

How it is built (so later work does not redo it):

- **Upgrade (7.1).** A catalog entry may list `upgradeFrom` (earlier versions with the same installer schema and helpers). `src/workspace/app-update.ts` offers, for the newest approved version that qualifies, either an update (only the code changes) or an upgrade (a new major version: code and options). The upgrade is owner-only (`app_owner_required` before anything is prepared), keeps the bindings line and `tableMap`, keeps every saved option the new version still has with a value of the right type, gives new options their defaults, drops removed ones (listed in the dialog) and always starts the layout profile again. It is the ordinary reviewed app save. Every rebuilt version keeps its predecessor's installer schema, helpers, recommended automations, output contracts and command names, so installed copies can move by upgrade without losing records or connections.
- **Speed-only updates (7.2).** `speedOnly: true` on an entry, approved with the version (D15). `speedOnlyCompatible` (same engine, schema, options, defaults, helpers) is the machine check; `applySpeedUpdates` runs hourly in the worker and moves only copies whose code is exactly an earlier approved version (D14), with a revision (`catalogOrigin`) and an audit entry `component.speed_updated` (origin `platform`, under an owner of the app). `readAppUpdate` returns `recent` for seven days and the header shows "Updated to faster version X".
- **Rebuilt versions (7.3).** Bio Radars 2.0.0 (Literature 3.0.0) on radar kit 2.0.0, Runway 3.0.0, Contracts 2.0.0, Fundraise 3.0.0, Partnerships 3.0.0, Data Room 2.0.0, Investor Updates 2.0.0, Programs 3.0.0 and CRO Selection 3.0.0. All declare `'use trialagents v2'`, use the kit, save with `records.save` and the version captured when editing started, return `notice` and `context`, show Settings to owners only with business choices only, move data lists to their own screens, read per screen in one batched call and show pending reads as loading. Each predecessor is archived byte-identical under `archive/<version>/`, its installer entry points there and its builder still verifies it. None is in the seed: the owner approves each (O4), and the earlier versions stay approved until installed copies have moved (D41).
- **Platform fixes found by the rebuild.** The frame sanitizer dropped `platform:` links before the link check; a direct save's notice was lost when the app re-rendered from saved data; the kit's side layout let its content column overflow narrow screens (`.k-layout>div{min-width:0}`); `kit.undo` now takes the `undo.list` result as it is (`{actions}`).
- **Checks (7.4, 7.5).** Rebuilt (v2) catalog code is held to the current design rules (G1 bars, three widths, every screen); only unchanged v1 catalog code keeps the rules it was published under. Each rebuilt version has unit tests (marker, no `records.propose`, no own header, direct saves with versions, owner-only settings, empty states, pending reads, notices) and an install-and-run integration test; most also run the design check at 1440, 400 and 390 in their tests. The browser speed gate covers every rebuilt version at three widths (`REBUILT_APPS` in `scripts/lib/catalog-demo.ts`): no server run on a screen change, at most one batched read, the screen the server renders, and no horizontal overflow (hard).

Carried over, with the package or person that takes it:

- **Owner actions.** Approve each rebuilt version (O4): name it in `templates/catalog-seed.json`, approve the already imported draft row (a one-time migration or `scripts/template-catalog.ts approved`; see [TEMPLATE_CATALOG.md](../TEMPLATE_CATALOG.md#session-7-rebuild-21-november-2026-drafts)), regenerate gallery media (`scripts/build-template-screenshots.mjs`) and add its gallery card. Old versions stay approved until copies have moved. Publish plugin versions (O3). Update the *Platform Capability Review* app.
- **Source size.** Partnerships (186k characters), Runway (205k), Investor Updates (206k), Data Room (168k) are under the 240k cap but not much smaller than before: most of what remains is command declarations and business logic, not styles. Cutting further means cutting features.
- **Browser scripts.** The per-app `scripts/test-*-browser.ts` scripts still exercise the earlier versions; the rebuilt versions are covered by their unit, integration and design tests and the speed gate.
- **Members in apps.** There is no capability to list workspace members, so linking a team member for notifications (Programs, Partnerships) is done by an assistant through the app's commands.
- **Layout screens.** The layout schema allows at most eight screens, so a few new list screens (Runway's exchange rates, programs and organizations; Programs' cash forecast) cannot be reordered through `layout.save`.
- **Contrast.** The kit's muted text and tab colours give contrast warnings (about 3.7–3.9:1); some apps darken them locally. Darkening the kit tokens is a style decision for the owner.
- **Measurements.** Real speed numbers for the rebuilt apps exist only after approval and use (P1, P10).

### Review after session 7 (22 November 2026)

A review of the merged sessions found and fixed four things before any rebuilt version is approved:

- **Charts lost their styling in the frame.** The frame removed `stroke-dasharray`, `text-anchor`, `font-size` and similar drawing attributes, so Runway 3.0.0's forecast lines and chart labels were not shown as drawn. They are kept now, and the speed gate checks it for every rebuilt app.
- **Inputs on the first screen were switched off** in rebuilt apps that carry helper functions (12 of 16): the rule for v1 bound controls applied to them. It no longer applies to v2 apps.
- **Approval was blocked by a test.** `tests/frame-engine.test.ts` required the browser switch to name the seed's version, so naming a rebuilt version in the seed failed it. The test now covers the versions the switch names and checks that every approved switched-on version runs in the browser.
- **A withdrawn version stranded its copies.** They counted as customized: no upgrade and no browser mode. Unchanged copies of a withdrawn version can now upgrade and keep running in the browser. A test installs the real Contracts 1.1.1, withdraws it and upgrades the copy to 2.0.0.

Still open from the same review: the earlier approved versions keep their own header, banners and "prepared for review" wording until copies move; copies older than the versions named in `upgradeFrom` have no upgrade; 11 rebuilt apps dropped the layout option, so a layout change there is a code change; the server still starts a new process that parses the whole app for every run (the repeated permission lookups and the second run per edit were removed on 22 November, see [PERFORMANCE_MEASUREMENT.md](../PERFORMANCE_MEASUREMENT.md#fewer-lookups-per-app-request-22-november-2026)); and, in the guidance, the design section and the platform limits that restrict what an app can do wait for the owner's decisions (the facts were added on 22 November: call shapes, events, kept markup, kit reference and a served, tested example; guide version 2.1.0).
