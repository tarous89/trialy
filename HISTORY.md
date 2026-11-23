## 23 November 2026 — Loading speed, session L3: templates and the plugin path

Third of four build sessions of the [loading speed scope](docs/scopes/LOADING_SPEED_2026-11-22.md). Package numbers refer to that scope.

- **Template list by fingerprint (L3.1).** The template list is one database query and carries a fingerprint of the catalog. Coming back to the templates shows the list already held at once and checks the fingerprint quietly; while the catalog is unchanged the answer is 63 bytes instead of 22 KB and no template is read again.
- **Card images at card size (L3.2).** Cards use 720×480 images (about 40 KB instead of 115 KB), kept by the browser for good under the template's fingerprint.
- **Plugin card images (L3.3).** The ChatGPT and Claude widget loads card images directly from the platform where the host allows it; otherwise the cards on screen come in one batched request, and if that fails each card is read on its own as before. Before, every card was its own request through the assistant.
- **Previews ready on hover (L3.4).** Hovering or focusing a card prepares its interactive preview quietly; previews are kept by fingerprint.
- **Lighter plugin requests (L3.5).** A tool list is answered from a prepared list; a tool call builds only its own tool group instead of about 200 tools. Who may do what is still worked out on every request.
- **Smaller widget (L3.6).** The plugin widget went from 2.57 MB to 1.84 MB: validation translations it never shows and full-size logos are gone.

Not built: keeping the template list across page loads (L4.1) and splitting the largest tool group. Owner decisions for the widget: the font stays inside it; pages the first screen does not show load together right after it (L4.5); Claude's inline app frame stays without its second font copy (L4.6). Tests: `loading-speed-templates`, browser tests in `template-loading`, updated `embedded-shell` and `platform-catalog`.

## 22 November 2026 — Loading speed, session L2: individual apps

Second of four build sessions of the [loading speed scope](docs/scopes/LOADING_SPEED_2026-11-22.md). Package numbers refer to that scope.

- **One pass per open (L2.1).** Opening an app works out the person's access once for the whole request and reuses it for every check and read; every reused result is still checked again before the screen is sent, and nothing is kept between requests. An app's tables are looked up together. Opening Runway went from 596 database queries to 58; a member's from 679 to 63.
- **App code once (L2.2).** The app frame no longer receives an app's code again with its first click. Opens carry what the frame needs to run the app itself, so the first click runs in the browser; the code is taken from the app already loaded, or fetched once by its fingerprint (cached by the browser on the website, cleared on sign-out).
- **Other tabs ready (L2.4).** After Overview, every other tab of a tracker (and every linked screen of a browser-run app) is prepared quietly, nearest first, paused while the page is hidden or a save runs.
- **Opening from a card (L2.5).** The app's name and frame appear at once; the website fetches the app frame ahead while Apps is idle.
- **Plugins (L2.6).** `open_app` carries the first screen for the widget only, so ChatGPT and Claude show the app without asking again, and no longer wait for the account or table list.
- **Server-mode report (L2.7).** `npm run apps:runtime-report` lists which installed apps run in the browser and why the others do not.

Not built: sending app data without the app's code in its metadata, making the first screen in the browser (L2.3), preparing the engine ahead. Tests: `loading-speed-apps`.

## 22 November 2026 — Loading speed, session L1: Apps home and archived apps

First of four build sessions of the [loading speed scope](docs/scopes/LOADING_SPEED_2026-11-22.md). Package numbers refer to that scope.

- **One lean app index (L1.1, L1.2).** Apps home works out which apps a person may see once for the whole workspace, in a fixed number of queries, and no longer reads app code. The permission rules did not change: the per-app check and the index share the same rule functions, and a test compares the two on generated accounts in both directions. On a 40-app account Home went from 165 queries and 20 MB read to 12 queries and 32 KB.
- **Card miniatures after the cards (L1.3).** Cards appear first; miniatures follow in a quiet request for the cards on screen (`read_home_snapshots`), never with the loading bar. A card without one keeps its cover.
- **Archived apps (L1.4).** The "Show archived apps" count arrives with Home, with no request of its own; the expanded list takes a fixed six queries for any number of apps.
- **Website start (L1.5).** The page frame is drawn before any script. A small start script begins the account check and the Apps home read before the main script has downloaded.
- **Plugins (L1.6).** The `open_workspace` result carries the first Apps home page, so the ChatGPT and Claude widget paints Home without asking again; saved views no longer hold the first paint.
- **Timings (L1.0).** Apps home, the archived list and the template list are timed next to app open, interaction and save (migration 098).

Not yet built: the production baseline (owner action), splitting the main script, and set queries for a person's own standalone automations and links. Tests: `app-index`, `loading-speed`, `early-start`, updated `page-performance`, `archive-first`, `ux-timing`, and browser tests in `background-progress`, `deferred-startup` and `coordinated-refresh`.

## 21 November 2026 — Platform decisions, session 7: catalog rebuild

Last of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **Upgrade to a new major version (A3, D41).** A rebuilt catalog version lists the versions it upgrades (`upgradeFrom`). The app's owners see **Upgrade to version X** on the website: records, table connections and settings carry across, settings the new version no longer has are listed, the old layout starts again. Editors are refused.
- **Automatic speed updates (P11, D14, D15).** A version its publisher declares speed-only, and that changes nothing but the code, reaches unchanged installed copies by itself (hourly), with a revision and an audit entry; customized copies are skipped; the header says "Updated to faster version X".
- **Every switched-on catalog app rebuilt (G14, G2–G8, G11, P3–P5, P9).** New drafts, waiting for the owner's approval: the eight Bio Radars 2.0.0 (Literature 3.0.0), Runway 3.0.0, Contracts 2.0.0, Fundraise 3.0.0, Partnerships 3.0.0, Data Room 2.0.0, Investor Updates 2.0.0, Programs 3.0.0 and CRO Selection 3.0.0. No own header, banners, footer or layout gear; values edited where they are shown and saved at once; boards with drag and drop for stages; side panels only to create or edit many fields; Settings for owners with business choices only; data lists on their own screens; each screen reads only its data; every empty screen offers its first action; Undo after a save; the working context is remembered. The single confirmation before something goes to people outside stays. Tables, helpers, automations and commands are unchanged, so copies upgrade without losing data.
- **Platform fixes.** Links to Access, Logs and Automations work inside the app frame; a save's message is no longer lost when the app shows the saved data; the kit's side layout fits narrow screens; `kit.undo` takes the `undo.list` result.
- **Checks.** Rebuilt catalog code is held to the current design rules; the browser speed gate covers every rebuilt version at three widths with no horizontal overflow allowed.

Tests: `app-update` (upgrade), `speed-updates`, per-app `*-v2` and `*-v2-integration` tests for all nine codebases, and the rebuilt-app gate in `tests/visual/frame-runtime.spec.cjs`.

## 21 November 2026 — Platform decisions, session 6: automations and external sharing

Sixth of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **Automations belong to their app (T1, A7, D23–D25).** Every owner of an app sees and manages its automations, whoever set them up (migration 091: the row rule on the automation tables is "linked owner or an owner of the app", `trialy_security.manages_app`). Each automation shows who it is linked to; a co-owner can read its history, switch it off, archive it and **Move to my account**, which links it to them and runs it on their own connection and rights (grants are never carried over; it stays on only when their checks pass). Changing or switching on someone else's automation asks for the move first. Functions, code schedules and record rules tied to no app are listed as **Unassigned** for organization owners to attach or archive.
- **Removal, restore and resume (A11, A9, T4).** After a member leaves, the new owner sees their switched-off automations with the reason and moves them. An automation can be archived and restored on its own (migration 092); it comes back switched off. Fixed: a restored or long-paused automation switched on again is scheduled from now, and nothing missed while it was off runs.
- **Retries, Needs attention, one alert (T3, T2, U2, D30).** One classifier: temporary failures retry the same run at 5, 15 and 60 minutes and never switch an automation off; permission and connection failures stop runs with a visible cause until a check passes; "set up again" failures stay off with the cause. One alert per failed run or cause, for the owners of the app (migration 093). The minimum research interval is an organization setting (default 60 minutes).
- **What can write and run history (T5, D28, D31).** Research checks the running assistant's Data level (Blocked: it cannot run; View only: it cannot save results) on top of the declared tables and the linked owner's rights. A permission saved as "review each change" needs setting up again; code schedules no longer leave unsaved proposals. End dates are optional. Each run shows what it Applied and Delivered.
- **Copies and duplicates (T6, T4).** Copying an app copies all its automations, linked to the person copying, without grants, and each copy stays off until someone opens and saves it (migration 094). A due notice is sent once per recipient and occurrence, whatever version of the automation is current (`automation_deliveries`).
- **Older monitors move (T7).** `read_legacy_monitors` and `migrate_legacy_monitor` (and Move on the Automations page) put each monitor still run by a per-app assistant task onto the TrialAgents schedule after a verification report; paused ones stay paused; the old task can no longer start runs. `link_app_monitoring_task` refuses.
- **Background work never slows people (P7).** The scheduler takes the workspace lock shared; database-triggered automations with nothing new since their cursor wait without scanning or checking access (migration 095 index).
- **Publish, Collect, Disclose (X1, D7, D32).** Every link, exchange and app share has one mode (migration 096), derived and checked: the database refuses an exchange that mixes a response form with a disclosure. Confidential documents always ask recipients to verify their email. Editing through a public link is removed and existing public edit links are read-only; a published app says it is a live, read-only view.
- **Direct intake and file screening (X2, D33–D36).** Form links can take valid routine responses straight in as new records (never starting an assistant run); duplicates, files and changes to existing records go to a reviewer (an app owner or editor with write access). Every incoming file is screened for type, content, size, programs, macros and encryption; a refused file is not stored and the sender is told to try again. Reviewers can send a response or file back with a reason the recipient sees (migration 097).

Tests: `app-owned-automations`, `automation-lifecycle`, `automation-attention`, `automation-writes-history`, `legacy-monitor-migration`, `sharing-modes`, `intake-and-screening`, and updated `logs-by-role`, `app-configuration`, `app-monitoring`, `postgres-context`, `app-services`, `app-publication` and `external-exchange` tests.

## 21 November 2026 — Platform decisions, session 5: browser runtime, responsive shell, style and guide

Fifth of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **Apps run in the browser too (P4, P2).** The app frame carries the server's engine (QuickJS, the build without asyncify) and a memory-only store. The server sends each screen's reads with it; the frame then makes screen changes, menus and filters itself, fills a missing read with one `read_app_data` request, prepares linked screens in the background, and sends anything with an outside effect to the server. The frame policy adds only `'wasm-unsafe-eval'`. A host that refuses WebAssembly stays on server mode (D21).
- **Browser-compat for the catalog (P4, P8).** `templates/browser-runtime.json` switches on unchanged code of a catalog version once its browser test passes: all 16 switched-on apps are on. Installed copies are not changed; customized copies stay on server mode. `APP_BROWSER_RUNTIME=off` switches it all off.
- **The v2 app contract (P3, P5, G4, G6, G8, U2).** Code that declares `'use trialagents v2'` saves with `records.save` (the value shows at once; a refusal brings it back), sees reads still on their way as `pending`, returns `notice` for the platform message and `context` for the working context each person keeps (migration 090, `set_app_context`), and receives its caller's `appRole` and the frame's `viewport`.
- **One app on every screen (P9).** v2 apps fill the space below the header and scroll inside their frame; the header folds to toggle, app name and status on phones; the message spans the width above the safe area and the approval footer; embedded views follow the host's inline or fullscreen size.
- **The general style and kit (G10, G5, D38).** One token set, from the Vivid values, and one set of component styles added by the runtime to every v2 app; helpers for navigation, a table that becomes cards, inline cells, a side panel, a drag-and-drop board with a move menu, empty states, paging, a context picker, owner-only settings, Undo and the notice. The standard tracker's colours come from the same tokens; the Vivid byte lock is removed.
- **One guide (G1–G13, D37).** `templates/APP_GUIDE.md` (design principles, no fixed counts or pixel sizes) and `templates/APP_REFERENCE.md` (technical reference, no design rules), one version (2.0.0) and one checksum. The old resource names are aliases; the superseded files are in `docs/archive/guidance-2026-11/`. Server instructions, the workspace guide, `read_app_design` and both plugin skills point to them. Trackers no longer start with example rows.
- **Checks that match (G1, G13, D22).** The design check looks at every screen at the browser, assistant-panel and phone widths; an own fixed header, footer or message bar and sign-in fields block; small text and contrast are warnings.
- **Speed gates (P1, P10).** In Chromium, every switched-on catalog app at three widths changes screens without a request and shows what the server renders; the v2 example filters without a request and saves with exactly one. Screen changes made in the frame are timed as `browser` samples.

Tests: `tests/frame-engine.test.ts`, `tests/browser-runtime.test.ts`, `tests/design-rules.test.ts`, `tests/visual/frame-runtime.spec.cjs`, and updated `app-shells`, `vivid-template`, `plugin-release`, `app-templates`, `frontend` and tracker tests.

## 20 November 2026 — Platform decisions, session 4: data path and server speed

Fourth of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **Validation on every write (X3, P6).** One parser and value check (`src/shared/validation.ts`) for forms, imports, app saves, external submissions, automations and tracked exchange writes. Every problem is reported by field (and row) in `details.issues`. Tables can declare ranges, formats (email, web address, phone, code), formatting rules applied on save (X4) and combined unique keys. Ambiguous numbers and dates (1,5 or 11/12/2026) are refused, not guessed.
- **Import report (X4).** `check_import` and the import dialog check every row on the server first: ready, needs fixing, already there, or conflicting values. Nothing is written or merged; only ready rows are offered.
- **App data without the sandbox (P3, P8).** `AppCapabilities` is the single authority for what an app reads; `read_app_data` serves reads with one check and no queue; `records.summarize` gives totals over all matching records.
- **Instant edits (P5, B3, A6, D16, D17).** Record edits in apps save directly in one request, with no review dialog, for people and for assistants with Data = Edit (also through app commands). A retry never saves twice. Edits to different fields both save; an edit to a value someone else changed first is refused with the newer value. Changes made while an app opens and records sent out with an exchange keep their review.
- **Standard tracker.** Cell edits no longer lock the app; a failed edit brings the earlier value back with a message. Add, duplicate and delete save directly.
- **Undo and delete in apps (G8, A10, D18, D19).** Delete is an archive for anyone who can edit the whole record. Undo (migration 089) covers your own actions in the open app for 60 minutes and the last 20 actions, in reverse order, and is refused when a record changed since. Apps place it with `undo.list` / `undo.run`; the standard tracker shows it after add, duplicate and delete.
- **Show first, no waiting (P2, P7, P8).** The app frame is a cached file at a fingerprinted address and appears at once; an app's last screen is remembered in memory for two minutes; record saves no longer take the workspace lock exclusively.
- **Guidance 1.3.37**, the workspace guide and the tool descriptions describe direct saves, the checks, Undo and summaries.

Tests: `tests/validation.test.ts`, `tests/app-data-path.test.ts` (including the restricted database role), the frame cache test, and catalog tests moved from "propose then confirm" to direct saves (`tests/settle.ts`).

## 20 November 2026 — Platform decisions, session 3: app lifecycle and installation

Third of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **Pending app changes last until resolved (A6, B1, D9, D10).** Migration 087 records on each pending app change who prepared it (person or assistant), the app, the kind (new app, revision, assistant change) and the version it was prepared against. App changes no longer expire. One pending change per app and person: a second preparation is refused with the existing change's ID and digest, and `begin_app_update` keeps the change under review. A change whose app or access moved is shown as "needs preparing again" and can only be discarded. Opening an app returns its pending change; `list_pending_app_changes` lists them.
- **One approval footer (A6, D11).** `PendingChangesFooter` in the shared shell, on the website, in a standalone app and inside ChatGPT and Claude: Save / Discard for a new app, Publish / Discard for a revision, Approve / Decline for an assistant's change. Other pending changes stay listed with Open and Discard. The inline revision block, the first-save footer and the standalone review dialog are gone. An assistant can no longer confirm its own app change; the person approves in the footer (the view-only `approve_workspace_change` tool).
- **One installation popup (I2, I3, A1, G9).** App name and purpose, then Project and team access (Editor by default), Table connections and Optional automations; one Install, one Cancel. Every new app goes through it: a new app without the reviewed choices is refused (`installation_required`), and `install_app_template` without the popup is refused.
- **Popup again on impact (A4, I2).** Approving a change that adds a table connection, changes who can read the app's code, or adds an automation opens the popup with only those sections. Removals need no decision and are checked by the dependency rules.
- **Table connections (I4, I5).** Each table shows its source and Read or Read/write use. A table another app uses is read-only unless the installer allows writing. Archived or unavailable sources show as unavailable. Any suggested table can be replaced by a new empty one; tables the installer created for the app become the app's own.
- **Dependency warnings (A13).** Migration 088: preparing an app or table change that removes something an automation, app, view or outside link relies on returns `dependencies` with the effect. An app change that would break an automation is refused at save; a table change is refused if its dependencies changed since preparation. This replaces the silent retirement of automations on app save; the trigger remains as a safety net.
- **Owner-only settings and platform links (U4, U5, A3).** Layout and feature-setting proposals from inside an app are for its owners. Apps link to `platform:access`, `platform:logs` and `platform:automations`; Logs has an app deep link.
- **Guidance 1.3.36** and the workspace guide describe the footer, the popup, one pending change per app, dependency reports and platform links.

Tests: `tests/pending-app-changes.test.ts`, `tests/installation-popup.test.ts`, `tests/platform-links.test.ts`, and updated catalog, data-access, dependency-cleanup, automation and browser tests.

## 20 November 2026 — Platform decisions, session 2: roles and access

Second of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **App Owner, Editor, Viewer (R2–R5, A1, A3).** Migration 081 records who owns each app and who granted which role (`app_members`), adds a team default role per app, and makes whoever creates an app its first owner (existing apps: the creator). Organization owners own every app. Changing an app's code, layout, settings, audience or sharing, archiving it and applying a catalog update are for the app's owners; editors change records, viewers read. The grant rules (owner: any role; editor: Editor or Viewer; viewer: Viewer; lowering and removing: owners) are checked in `src/domain/app-sharing.ts` and again in the database (`trialy_security.set_app_role`, a guard on app rows). The app's Access view has a "People and roles" panel.
- **Several organization owners (R1).** Owners promote a team member and demote an owner (or themselves); an organization never has fewer than one owner. `src/domain/organization.ts`, Settings → Team.
- **Billing for organization owners (A8).** The subscription endpoints and tab are refused or hidden for people who own no organization. Billing records stay on the paying person; moving them to the organization is an open owner decision.
- **Access requests and access messages (A5, U3).** A team member can ask for View or Edit on an app (migration 083). Everyone who may grant that role gets an email; the first answer counts. The web shows one "You don't have access to this app." page with the request control, and a quiet "View only" status in the header.
- **Removing a team member (A11).** One database function (migration 082) ends membership, access and personal rules across the organization, moves the person's app Owner roles to the owner who removes them, and switches their automations off with a reason.
- **Assistant permissions (A4).** Each assistant has a Data level and an Apps level (Edit, View only, Blocked): an organization maximum and a personal limit each person sets under Settings → Account → Connections (migration 085). The lowest applies. Record reads and writes are also enforced in the database.
- **Logs by role (A7).** The organization log is for organization owners (inspectors no longer read it). Each app has its own log for its owners (`read_app_log`), with record values shown only as the reader's current table access allows. Earlier app versions are for owners.
- **An app's own tables (A2).** Tables created by a catalog install or together with a new app are marked as the app's (migration 086): no role on the app blocks the table, Viewer reads only. The rule only narrows. Any team member may add a new table; changing existing tables stays with organization owners.
- **Fix from session 1.** The restricted database login could not write the speed table, so no speed numbers were stored after the session 1 release. Permission and test added.
- **Guidance 1.3.35** describes app roles and assistant permission levels.

## 20 November 2026 — Platform decisions, session 1: foundations and quick fixes

First of seven build sessions for the [platform decisions of 19 November](docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Decision codes refer to the [snapshot](docs/scopes/PLATFORM_DECISIONS_SNAPSHOT_2026-11-19.md).

- **Helpers are part of their app (B2, T1).** Migration 078 records the owning app on each helper installed with an app, backfills it, and retires helpers an app no longer uses. Apps (Home) no longer lists them; Automations lists them under their app. The install retry key survives a reload.
- **No rollback of app versions (A12).** `restore_component` and the "Review recovery" button are removed. Earlier versions stay readable.
- **No restore from logs or history (A10).** `restore_record`, `reverse_field_change(s)`, `archive_created_record` and `restore_archived_creation` are no longer public operations; their buttons, the `list_creation_archives` tool and its route are gone. History stays append-only and readable. The reversal engines remain behind an internal entry for the app session Undo of package 4.6.
- **No restore offer during install (A9).** The template gallery and the installer no longer offer or require restoring an archived app. A reviewed app save that binds archived fields again still restores them as part of that review (owner only).
- **Projects without folders (I1).** Migration 079 moves every project to the top level and copies down the people, assistant access, archive state and per-subject rules it inherited. Folder rows stay as archived history. Folders, nesting and project moves are no longer operations.
- **One platform message (U1, U2, G2).** `SystemNotice` shows one message at a time, bottom right: info and success close after five seconds, an error stays until dismissed and yields only to a newer error. `PlatformChrome` is the shared service for the message, the app name in the platform header and the approval-footer space.
- **Minimal assistant context and display rule (A14, A15).** The automatic hint to the assistant carries only the view, workspace ID and app ID. Server instructions, the workspace guide, tool descriptions and both plugin skills say: open TrialAgents once per conversation after the first response, then choose between opening, a short snippet or a link.
- **Speed measurement (P1, P10, B1).** The app runtime times opening, interactions and saves and sends anonymous samples to daily histograms (migration 080); `npm run ux:report` compares them with the targets. The slow-load timer counts only time the tab is visible.
- **Spike (P4).** See [the frame-engine spike](docs/scopes/platform-decisions-2026-11-19/7-frame-engine-spike.md).

Template guidance 1.3.34 (install never offers a restore). Tests: `tests/home-archived-helpers.test.ts`, `tests/projects-without-folders.test.ts`, `tests/notice-slot.test.ts`, `tests/ux-timing.test.ts`, and updated `core`, `workspace`, `write-authorization`, `archive-first`, `plugin-release`, `embedded-view-context` and the catalog integration tests.

Not verified here: behaviour inside the real ChatGPT and Claude hosts, and production speed numbers (none exist until this is released and used). Installed plugins keep the earlier wording until new plugin versions are published.

## 18 November 2026 — Update an installed catalog app to its newer version

An installed catalog app keeps the code it was installed with, so the batched-read releases reached only new installs. The app's Settings menu on the website now offers **Update to version X** to the owner and editors when a newer approved version of the same app exists and nothing but the template code would change (same tables and fields, options, defaults and helpers; unchanged saved code). The update is the ordinary reviewed app save: configuration and bindings lines are kept, the code behind them is replaced, and the catalog origin is recorded. Changed code is never replaced. Details and limits: [APP_PUBLICATION.md](docs/APP_PUBLICATION.md#updating-an-installed-catalog-app).

Tests: `tests/app-update.test.ts` installs the earlier version of all sixteen switched-on apps, updates each and checks that only the template code changed; `tests/visual/zzzz-app-update.spec.cjs` covers the offer and confirmation on the website.

## 18 November 2026 — Batched reads in all 16 switched-on apps

Every switched-on catalog app is republished as a patch release that reads through `records.readMany` and changes nothing else (owner approval, 18 November 2026): Runway 2.2.1, Contracts 1.1.1, CRO Selection 2.1.1, Data Room 1.1.1, Fundraise 2.0.1, Investor Updates 1.0.1, Partnerships 2.2.1, Programs 2.2.1, Literature Radar 2.0.1 and Deal, Funding, Market, Patent, Pipeline, Regulatory and Trial Radar 1.0.1. The seed names the new versions, so the gallery and new installs use them. The sixteen earlier versions are not withdrawn: an installed copy counts as unchanged catalog code only while its version is approved, and withdrawing them would stop members with hidden fields or documents from opening installed copies. There is no catalog migration. Released versions are archived unchanged under each app's `archive/` folder; installed apps keep their saved source.

- **Individually built apps.** Each has one read helper. Once a render needs a second table, the first page of every other connected table is read in one call, and the remaining pages of a long table in another. A screen that made 9 to 18 calls now makes 2 or 3.
- **Radars.** Kit 1.2.0 (and kit 1.0.1 for Trial Radar, which stays on its own kit line) batches the shared reads and the Overview's reads.
- **Unchanged.** Results, incomplete-data handling, restricted-table messages, limits and each app's call budget. Where the capability is missing or a batch fails, every read is one call as before, which is also how the offline previews run.
- **Gallery.** The screens do not change, so each new version uses its predecessor's gallery image.

Tests: `tests/batched-read-apps.test.ts` runs the published source of all sixteen in the production runtime both ways (one call per read, and batched) on the demo data, a long table and a restricted table, and requires identical screens and state; `tests/template-catalog.test.ts` covers the release (new versions listed, earlier versions still approved). Each app's own tests now run against its new version.

## 18 November 2026 — Repair apps with stale field contracts

Deleting an unused column could leave an app with an outdated schema contract, then prevent its repair because beginning or preparing an update tried to render the broken published app. Update preparation now reads authorized metadata and omits the old render only for `manifest_stale` or `manifest_binding`; the replacement still validates current bindings, renders its preview and requires exact finalization/confirmation. Other errors and access denials still propagate. No migrations or changes to saved records. Regression: `tests/tracker-query-readiness.test.ts` exercises the stale app, update preparation, reviewed repair and reopening with records retained.

## 17 November 2026 — Catalog channel switches; older apps switched off

Every catalog app now has three switches in `templates/catalog-availability.json`: `platform`, `chatgpt` and `claude`. A switched-off app is not listed, readable, previewable or installable through that channel; saved apps keep working, and the public landing page is unchanged. At the owner's request the 16 current apps (Runway, Programs, Fundraise, Contracts, Partnerships, Data Room, Investor Updates, CRO Selection and the eight Bio Radars) are on everywhere and the 16 older apps are off everywhere. No migration: approval status in `app_template_catalog` is untouched, so switching an app back on is a one-line change. Details: [TEMPLATE_CATALOG.md](docs/TEMPLATE_CATALOG.md#channel-switches-platform-chatgpt-claude). Tests: `tests/template-availability.test.ts`, `tests/template-catalog.test.ts`.

## 17 November 2026 — Investor Updates 1.0.0 published

Investor Updates 1.0.0 (`life.investor-updates`, BT2-06) is built from the revised scope ([INVESTOR_UPDATES.md](docs/product/app-template-blueprints/apps/INVESTOR_UPDATES.md)) and published at the owner's request (17 November 2026): the seed names 1.0.0, so the catalog sync after migrations imports it approved. It had never been imported, so no migration; nothing is retired. No platform change. The `core` CI job's timeout is raised from 40 to 60 minutes, because main's own run already took about 40 minutes.

- **Model.** Investors are people (shared `people`, optionally linked to `organizations`) in categories (Board, Investors, Shareholders and custom ones, optionally by share class). Updates are email updates or meetings with a before part (agenda and pre-read) and an after part (recap). Blocks carry a level (board, investors, everyone); each category gets its version from the same draft and a person in several categories gets the highest version once.
- **Screens.** Overview, Updates (review per version with fact panel, promise tracker, approval, send, engagement), Investors (people, categories, share classes), Plans & templates, Settings.
- **Sending** uses the external exchange update rooms (§5, §6 U1–U4): delivery records, links on a person's click, one confirmed send per version shown exactly as `exchange.prepareEmail` returns it; the first send locks the update. Reads and responses arrive as tracked records; questions use a reserved ask; answers go privately or to everyone invited.
- **Automations.** Four install recommendations (agenda and pre-read draft, ready for review, new response, weekly digest) and a `scheduled_draft` app feature per email plan; three read-only helpers (`plan_brief`, `meeting_brief`, `updates_digest`). The app stores no schedules.
- **App commands.** 39 (16 read, 22 propose, `layout.save`); none approves, sends, answers, unsubscribes or shows links.
- **Deviations** where the platform contracts differ from the scope are listed in `templates/source/investor-updates/QA.md` (standard records on first use, questions as an ask, one confirmation per version, reminders confirmed when needed, PDF attached by a person, fact re-check limited to bound tables, scheduled draft on `plans.next_period_end`).

Tests: `tests/investor-updates.test.ts`, `tests/investor-updates-commands.test.ts`, `tests/investor-updates-integration.test.ts` and `scripts/test-investor-updates-browser.ts`. Gallery card, screenshot and manifest entry for `life.investor-updates@1.0.0`.
## 15 November 2026 — Data Room 1.1.0 published; app code access rule

Data Room 1.1.0 (`life.data-room`) is published at the owner's request (seed entry; 1.0.0 was never approved and stays byte-identical, source in `templates/source/data-room/archive/1.0.0/`). Scope and decisions D1–D6: [DATA_ROOM.md §14](docs/product/app-template-blueprints/apps/DATA_ROOM.md#14-data-room-110-platform-standards-assistant-control-and-notifications).

What changes in the app:
- **App commands.** 32 commands (12 read, 19 propose, 1 layout) through the same handler as clicks. Commands never share, send or change a live room.
- **Customization without code.** Custom fields on rooms, index items, parties and questions (`settings.custom_fields`); form layouts for rooms, items and questions. Hidden columns from the layout gear now apply (1.0.0 read the wrong key separator).
- **Notifications.** Notify parties (chosen documents to all or chosen parties, one confirmed send) replaces the automatic daily digest. Access-ending reminder is a switch per room. Instant emails for party questions and notes are the platform's existing workspace notifications, now documented.
- **One automation.** Weekly room summary to the owner (Mondays 08:00), written by the read-only helper `room_summary`; on by default at install, optional.

Platform:
- **App code access (owner decision):** reads made by running an app are always checked against the caller's own permissions. The workspace owner and the owner's assistant can run and change any app; unchanged approved catalog code can be run by anyone allowed to use the app (and their assistant); changing code needs full access (`code_change_restricted` otherwise). `src/workspace/service.ts` `componentSourcePolicy`, new `src/workspace/catalog-source.ts`; template guidance 1.3.32.
- **Rooms:** `set_exchange_room_notices` / `exchange.setRoomNotices` and `notifyAccessEnding` (migration 076); `prepare_exchange_email` accepts `versionIds` for `documents_updated`, and "since" counts the person's last documents email.

Tests: `tests/data-room-commands.test.ts`, `tests/app-source-access.test.ts` (new); Data Room unit, integration and browser tests updated; `tests/workspace.test.ts` now expects the owner's assistant to read app source.
## 15 November 2026 — Programs 2.2.0 published

New immutable version `life.project-oversight` 2.2.0. It aligns Programs with the app commands, Edit in App and app automation standards, following owner decisions P1–P5 in [PROGRAMS.md §14](docs/product/app-template-blueprints/apps/PROGRAMS.md#14-programs-220-assistant-control-team-notifications-and-the-weekly-digest).

What changes in the app:
- **App commands.** 27 commands share one handler with the buttons: 13 read, 13 propose, 1 layout. They come with form groups and layout labels/defaults, extra fields, and Edit in Runway for the linked cash forecast.
- **Program team.** New `programs.team` table. The app keeps `owner_member_id`, `assigned_on` and `remind_on` on items and RAID entries, with a reminder lead time in Settings.
- **Automations.** Six install recommendations: an AI weekly digest (saves to the new `programs.digests` table, then emails the owner, only when something needs attention) and five member notices. The digest without AI is an app feature. Both digest helpers and the app share one digest core. The 2.1.0 monthly reminder, slip notice and status draft are removed.

Packaging:
- The build minifies the catalog source, including local names, to stay under 180,000 characters.
- 2.1.0 is archived unchanged under `templates/source/project-oversight/archive/2.1.0/`, and its installer entry points there.
- Published at the owner's request: `catalog-seed.json` names 2.2.0, so the sync after migrations imports it approved; migration 075 withdraws 2.1.0 once (`catalog-retirements.json`); the gallery adds `life.project-oversight@2.2.0`. Installed 2.1.0 apps keep their source and data.

Tests: `tests/programs-commands.test.ts` and `tests/programs-automations.test.ts`. `tests/programs.test.ts` now reads the archived 2.1.0 schema and demo data.

## 15 November 2026 — Partnerships 2.2.0 published

Partnerships 2.2.0 (`life.partnership-tracker`) is published at the owner's request. It aligns the app with the platform standards that shipped after 2.1.0 ([PARTNERSHIPS.md §12b](docs/product/app-template-blueprints/apps/PARTNERSHIPS.md)), with no platform change.

What changes in the app:
- **App commands.** 50 commands (18 read, 31 propose, `layout.save`) cover every screen and control. Propose commands replay the screens' own handler, now one `handle` function, so the review is identical to the click path; proposals are buffered into one review. Custom stages, new activity kinds and custom fields return `schema_change` naming the table change still needed.
- **Integration standard.** Agreements (via `roles.list`) and linked Data Room access (via `integrations.list`) are labelled "From *App*" with Edit in *App* (`data-trialy-open`). Hand-entered access is refused in the form and the command while Data Room is linked. Bound fields this version does not know show as read-only "Additional fields".
- **Automations.** The digest is now the email step of `partner_research`, one automation (E5); 2.1.0's separate `partner_digest` is gone. Every read binding is `fields:"all"` with confidential `exceptFields` (E6), so custom fields no longer stop research or briefs.
- **Layout fix.** The native gear stores column visibility as `group:column`, but 2.1.0 read only `group.column`, so hiding a column with the gear had no effect. 2.2.0 reads both, and `layout.save` writes `group:column`.
- **Settings.** JSON settings are compared by content, so re-saving an unchanged form proposes nothing.

Publication:
- `templates/catalog-seed.json` names 2.2.0, so the sync after migrations imports it approved. As with Runway 2.2.0, there is no migration: 2.1.0 stays approved in existing catalogs, the gallery and `list_app_templates` show the latest approved version, and installed 2.1.0 apps are unchanged.
- The 2.1.0 package is archived byte-identical under `templates/source/partnership-tracker/archive/2.1.0/`. Its installer entry points there, so its preview hash still matches.
- The build keeps line 2 (`appCommands`) verbatim, and its limits follow the catalog (240,000 source characters, 380,000 bytes).
- The gallery has the `life.partnership-tracker@2.2.0` screenshot and manifest entry.

Tests: `tests/partnerships-commands.test.ts` (new) covers the declaration, read results, click-path parity, buffering, customization, integrations and Additional fields. `tests/partnerships.test.ts` and `tests/partnerships-integration.test.ts` are updated, including E5/E6 on the real recipe path and commands through `run_app_command`. The browser test still passes.

## 15 November 2026 — Bio Radars waves 2 and 3: Pipeline, Literature 2.0.0, Deal, Funding, Patent, Market and Regulatory Radar (published)

The other seven Bio Radars are built as definitions on the radar kit, now 1.1.0: Pipeline Radar 1.0.0 (`life.pipeline-radar`), Literature Radar 2.0.0 (`life.literature-radar`), Deal Radar 1.0.0 (`life.deal-radar`) and Funding Radar 1.0.0 (`life.funding-radar`), weekly; Patent Radar 1.0.0 (`life.patent-radar`, "Not legal advice", expiries 24 months ahead), Market Radar 1.0.0 (`life.market-radar`) and Regulatory Radar 1.0.0 (`life.regulatory-radar`), monthly. The owner approved all seven the same day, each an independent app: the catalog seed names them, migration 074 withdraws Literature Radar 1.2.2 (existing installs unchanged), and each has a gallery card and screenshot. All eight radars are filed under the Research workflow in the gallery.

- **Kit 1.1.0.** Released radars pin their kit version; kit 1.0.0 is frozen in `radar-kit/archive/1.0.0/`, so Trial Radar 1.0.0 is byte-identical. New optional definition keys: team-owned tracker fields, tracker outputs, item name field, disclaimer, multiline scope fields, past-only dates, item-based digest sections with per-currency totals and a Coming up window per radar.
- **Outputs.** Deal and Funding Radar publish their trackers (`dealradar.deals`, `fundingradar.financings`, `radar.v1`, one writer) next to their events.
- **Tests.** `tests/radars.test.ts` and `tests/radars-integration.test.ts`: install from the catalog, demo data, every screen and drawer, design gate at 1440 and 390 px, brief, digest and alert text, Needs setup without a runner, one writer.

## 15 November 2026 — CRO Selection 2.1.0 published

Published at the owner's request in place of CRO Selection 1.0.1 and Sponsor RFP Management 1.0.1. `templates/catalog-seed.json` names 2.1.0 (imported approved by the catalog sync after migrations) and no longer lists Sponsor RFP Management; one-time migration 077 withdraws both 1.0.1 versions (and approves 2.1.0 if an earlier deployment had imported it as a draft). The 2.0.0 draft stays a draft. The gallery has the 2.1.0 screenshot and manifest entry, a new card summary, and no Sponsor RFP Management card. Installed 1.0.1 apps keep their saved source and data. `tests/template-catalog.test.ts` rehearses the deployment from the live catalog state.

## 15 November 2026 — CRO Selection 2.1.0: platform changes and AI-native control

Aligns the unreleased CRO Selection draft with the platform changes of 14 November and makes it AI-native, following the owner's decisions S1–S5 ([CRO_SELECTION.md §14](docs/product/app-template-blueprints/apps/CRO_SELECTION.md#14-cro-selection-210--platform-changes-and-ai-native-control)). 2.0.0 had been imported as a draft and imported rows are immutable, so the revision is **2.1.0**; the 2.0.0 package is archived unchanged under `templates/source/cro-selection/archive/2.0.0/` and `templates/apps/life.cro-selection-2.0.0.json` is unchanged. Published the same day (entry above).

- **App commands:** 27 (6 read, 20 propose, 1 layout). Every record action a person can click replays through one handler, so a command and a click give the same proposal (tested per command). Read commands return the app's own grid, scores, blind state, qualification and overview. Supplier communication is never a command.
- **Award:** initiated by the user in the app or through their assistant (`decision.record`); a person approves the review; notices stay a person's Notify all.
- **Customization:** additional fields (`extraFields`, `writableExtra` in the table map) in forms and details; form layout for eight forms; vendor columns; stage names and opening screen (`croselection.settings.preferences`, new field).
- **Platform changes:** no automations (the reminders are the exchange's pre-approved reminders; the digest and proposal-mapping automations are dropped); the handoff no longer prepares Runway lines, because Runway 2.2.0 reads `croselection.awards` with source tracking; the award agreement's status is labelled as kept in Contracts; guidance 1.3.31.
- **Fixes:** column hiding through the layout gear now works (the gear stores `group:field`, 2.0.0 read `group.field`); editing a request no longer rewrites its unchanged assumptions. The same `group.field` reading exists in Partnerships 2.1.0 (`partnerships.source.js`) and is not changed here.

Tests: `tests/cro-selection-commands.test.ts` (new, including a real-platform run where the assistant's commands are confirmed by a person and Runway 2.2.0 offers the award), `tests/cro-selection.test.ts`, `tests/cro-selection-integration.test.ts`, the browser test at 1440 and 390 px and the production design inspector. In this container the browser checks need `PLAYWRIGHT_BROWSERS_PATH` pointed at a Chromium matching the repository's Playwright; see `templates/source/cro-selection/QA.md`.

## 14 November 2026 — Contracts 1.1.0 published

Contracts 1.1.0 (`life.contracts`) is published at the owner's request in place of 1.0.0. It implements decisions C1–C8 in [CONTRACTS.md §12](docs/product/app-template-blueprints/apps/CONTRACTS.md), with no platform change.

What changes in the app:
- **Getting contracts in.** A contract is filled in when the user asks Claude or ChatGPT, or typed in by hand (blank is fine).
- **No automations.** Contracts declares none: the 1.0.0 optional digest and extraction automations and the `digest_day` setting are removed.
- **Counterparty on obligations.** `counterparty_id` defaults to the agreement's counterparty. `contracts.obligations` is now published as `contracts.v2`, a superset of v1, in `templates/contracts/outputs.json`.
- **Assistant control.** Every button is documented as an exact record change, and assistants may check proposals on the user's request through the review.
- **App behaviour.** The app calculates the dates it shows from the fields, whoever saved them. Values from connected apps are labelled "From *App*", and bound fields this version doesn't know show as "Additional fields".

Publication:
- The 1.0.0 package is archived unchanged under `templates/source/contracts/archive/1.0.0/`, and its installer entry points there.
- `templates/catalog-seed.json` names 1.1.0, so the sync after migrations imports it approved. Migration 073 withdraws 1.0.0 once, as listed in `templates/catalog-retirements.json`.
- Installed 1.0.0 apps keep their source and data.
- The gallery media adds `life.contracts@1.1.0`.

Tests:
- `tests/contracts.test.ts` covers the new behaviour.
- `tests/template-catalog.test.ts` rehearses the deployment from the live catalog state.

## 14 November 2026 — Fundraise 2.0.0 published

**Published** at the owner's request: the seed names 2.0.0 (imported approved by the catalog sync after migrations), migration 072 withdraws Investor CRM 1.0.1 once, and the gallery has the 2.0.0 screenshot, manifest entry and a new card summary. Installed 1.0.1 apps keep working.

PR #137 (Fundraise 2.0.0, 12 November) was rebased onto `main` and revised; 2.0.0 was never imported into the catalog, so the version stays 2.0.0. **Compatibility:** Fundraise's own `dataroom.access_grants` now matches `dataroom.v1` including the additive `room_purpose` option `partnering` (install and connect had failed the contract check). **Automations (#168, #169, E6, E7; owner decisions of 14 November):** two install recommendations, on by default: weekly investor research on the user's runner (Mondays 07:00), which saves proposed investors and one research report per run in the app with create-only grants and a brief from the helper `research_brief` (read bindings `fields:"all"`, so the brief scope check passes); and one weekly digest email (Mondays 09:00) whose text is written by the installed read-only helper `round_digest`: round progress plus this week's research. No signed-commitment notice (interest is set by the user). Fundraise is the first catalog template to ship E7 helpers. A single research-then-email automation (E5) was tried and does not deliver on the current platform when an app helper writes the email (background check without the owner's database identity, then about 3 s of re-validation per helper read); see the package AUTOMATION_RECIPES.md. **Customization:** `settings.custom_fields`, `stage_labels` and `preferences`, changed by Claude or ChatGPT through reviewed changes without a change to the app body. Tests: `tests/fundraise-automations.test.ts` (new) and customization cases in the unit and integration tests. See [FUNDRAISE.md](docs/product/app-template-blueprints/apps/FUNDRAISE.md) §8, §8a and the package [QA](templates/source/investor-crm/QA.md).

## 14 November 2026 — App commands on by default

Owner decision: app commands and Edit in App are on without configuration, as app automation recipes are since #176. `appCommandsEnabled()` returns true unless `APP_COMMANDS_ENABLED=false`, which stays as an emergency off switch. Safety is unchanged: commands only prepare changes the user confirms, run with the caller's permissions and column restrictions, cannot send, call connectors or queue functions, and every run is audited. Real-host checks in web, Claude and ChatGPT follow the deploy.

## 14 November 2026 — App automation recipes on by default

Owner decision: install recommendations and app-feature setup are on without configuration. `recipesEnabled()` now returns true unless `APP_AUTOMATION_RECIPES_ENABLED=false`, which stays as an emergency off switch that stops new offers and setup reconciliation without a redeploy. Existing automations, installed apps and the exact review, ownership and write-grant checks are unchanged. Add app now offers the declared recommendations (for example, Partnerships research, digest and briefs) selected by default to the owner, and missing runners leave visible pending setup. No migration.

## 14 November 2026 — Bio Radars kit 1.0.0 and Trial Radar 1.0.0 (draft)

The radar kit (`templates/source/radar-kit/`) and its generator (`scripts/build-radar-templates.mjs`, `--check` in the build) build each Bio Radar from a definition: four screens on the Vivid kit (theme graphite) with server-side pages, five common tables, the brief builder shared by the app and its `brief` function, the research-template editor with versions, restore default and eight locked rules, tracker field labels and hiding, custom fields that flow into the brief's return format, the source report with the 3-run hint, the digest and alert written by read-only app functions (E7), and the recommended automations (scan + digest as one automation, E5; alert after the scan), with research write grants that resolve fields at run time (E6) and exclude user-owned fields. Trial Radar 1.0.0 (`life.trial-radar`, published 15 Nov on owner approval through the catalog seed) is the first radar: TrialAgents Intel (EU CTIS) first, then ClinicalTrials.gov, WHO ICTRP and company releases; weekly on Monday at 07:00; `trialradar.events` is a `radar.v1` output with one writer. Platform fix: run-triggered summary emails now re-check their research run as the batch owner (`authorizeSummaryRun`); before, every such email failed. Tests: 14 unit, 5 integration and a production-frame browser script at 1440 and 390 px, including 5,000 events and 2,000 trials. Trial and event drawers keep their actions at the top in normal flow, so scrolled content never sits under a fixed footer.

## 14 November 2026 — Partnerships 2.1.0 published

Aligns Partnerships with the app automation platform changes (#168, #169) and makes it customizable by Claude and ChatGPT within its scope, then publishes it at the owner's request. The catalog entry declares `recommendedAutomations` for partner research (weekly, Monday 07:00; create-only writes to signals and the new `partnerships.research_reports`), the digest (after each completed research run) and meeting briefs (create-only draft briefs). Settings no longer store a schedule, recipients or on/off. Follow-up reminders remain a chat-set-up action because recipes cannot express `status = open`. Customization covers column groups for every list, saved views with their own columns and sort, custom fields, stage labels with hidden and custom stages, activity kinds and deal types, and preferences.

Versioning: #164 had imported 2.0.0 as a draft, and published rows are immutable (a changed 2.0.0 would stop the pre-deploy catalog sync), so the revision is 2.1.0 and 2.0.0 is archived byte-identical. The seed names 2.1.0, and migration 071 withdraws 1.1.1. The gallery card and media were added. Validation: Partnerships unit and integration tests, including real recipe reconciliation and write-grant checks; the browser test at 1440 and 390 px; catalog-sensitive suites; typecheck and build; a PGlite rehearsal of the deploy from `main`'s catalog state (1.1.1 draft, 2.0.0 draft, 2.1.0 approved, and a second run changes nothing). The full suite gave 620 of 621; the single failure is the existing CO06 monitoring-pv design gate in this container's Chromium. The recipe feature flag is unchanged.

## 14 November 2026 — Research + email in one automation (E5) and run-time fields (E6)

Platform additions required by the Bio Radars scope. **E5:** a recipe may declare research followed by email; it installs and is managed as one automation (one popup row, one Automations card with both connectors, one switch). The email step is an action row linked by `follow_up_of`, released once per completed run of its research version; research edits keep it attached, and copies keep it grouped and disabled. **E6:** `fields:"all"` with `exceptFields` approves every field the app binds on a table, re-resolved at each run within the app's current binding and the assistant's current access. Field additions, renames and hiding no longer require re-approval or retire the automation; removing the table or access still does. Run-reporting email approvals no longer depend on field lists; existing approvals keep their legacy stamps. Migration 070 adds `app_actions.follow_up_of` and setup follow-up columns, and narrows binding-removal retirement for dynamic bindings. Template guidance 1.3.28, automation guide 1.4.6, plugin versions bumped. The recipe rollout flag is unchanged.

## 14 November 2026 — App commands, Edit in App and Runway 2.2.0

**Catalog approval:** the owner approved Runway 2.2.0 for production on 14 November 2026. As for earlier Runway versions, `templates/catalog-seed.json` now names 2.2.0, so the pre-deploy catalog sync inserts it as approved. The gallery and `list_app_templates` show only the latest approved version, so new installs get 2.2.0; 2.1.0 stays approved in existing catalogs, and installed 2.1.0 apps are unchanged (no migration). The gallery screenshot and manifest entry are added. App commands and Edit in App are on by default (see the next entry). The four recommended automations are offered at install, because app automation recipes are on by default since #176.


Built the [Runway 2.2.0 scope](docs/product/app-template-blueprints/apps/RUNWAY.md#14-runway-220--assistant-control-integrations-and-automations) (§14.12 records the details). **Platform, behind `APP_COMMANDS_ENABLED` (default off):** apps declare `appCommands` as a single-line JSON array (strict on save, never executed by the host). The new tools `list_app_commands` and `run_app_command` run the saved app with `{kind:"command"}` as the caller, with unchanged permissions and column restrictions. Read commands return the app's results; propose and layout commands return the click path's exact review for `confirm_workspace_change`. A request key replays the same review, and every run is audited. Commands cannot queue functions, call connectors or touch exchanges. `roles.list` and `integrations.list` name the writer of a read-only role (`writer:{appName,canOpen}`). `data-trialy-open` with `resolve_app_open` opens the writing app at the record, or Database, and writes to such roles are refused with `role_read_only` and structured details. Custom layouts accept `labels` and `defaults`, and `layout.propose` accepts a custom profile. Size limits were raised: template source 240,000 characters, catalog file 380,000 bytes, component source 260,000 characters. Template guidance is now 1.3.31 (1.3.28–1.3.30 were taken by PRs #171, #174 and #175).

**Runway 2.2.0** (new immutable version; 2.1.0 archived byte-for-byte and still installable): 37 commands share one event handler with the screens. Scenarios are one record with `changes_json`, saved in one review and stamped, and assistants can leave drafts. There are seven new change kinds. Categories come from settings, and form groups, labels and defaults are set through layout. Extra fields are shown in forms. Programs milestones, CRO Selection awards, Contracts payment obligations and Fundraise tranches are integrations with Runway's own tables, read-only links, Add to plan with source tracking and Edit in *App*. There are four recommended automations, including create-only rates storage under PR #169 and a built-in digest from the frozen snapshot. New installs create no `runway.milestones` or `runway.scenario_changes` tables.

Tests: `tests/app-commands.test.ts`, `tests/cash-runway-commands.test.ts` and `tests/cash-runway-commands-integration.test.ts`. Real-host acceptance, catalog approval and enabling the switch remain release gates.

## 14 November 2026 — Required app storage for research and drafts

Corrects the unintended proposal-only recipe default in PR #168 following the owner’s explicit direction. New research/drafting automation setup includes bounded app write grants in the same approval, across installation, the Automations page and ChatGPT/Claude. Preparation writes no grant; confirmation creates grants and the definition atomically. Writes stay within current app/assistant access, carry verified receipts and require the owning active run. Missing storage leaves setup blocked without breaking app installation. Completed production runs require saved results; quiet no-update runs and explicit read-only tests remain distinct. Existing saved approvals are not silently expanded. Copies remain disabled and do not copy storage grants.

Portable recipes may declare precise output roles/fields and create/update operations. Hosted automation guidance is 1.4.5; both plugin routing guides and versions are updated. No migration or catalog approval is needed; the recipe rollout flag is unchanged. Local validation: production build/type checks, 63 focused backend tests, and 24 browser checks passed; the final project-scope and copy checks also passed. GitHub CI and deployment evidence follow in the correction PR.

## 14 November 2026 — PR #168 automation review corrections

Follow-up to `eb26c1c` in [PR #168](https://github.com/tarous89/trialy/pull/168): installation stores only reviewed recipe inputs; optional resolution runs after commit and pins the approved connection, recipient, template and expiry. Deleted definitions permit fresh approved setup, including research keys; pending edits create a new immutable approval revision. Copies preserve assistant ownership and remain disabled. Bundled gallery reads tolerate invalid optional recipes while publication stays strict. Omitted install selections are recorded as not reviewed; reviewed defaults remain selected. Catch-up is disclosed in the shared UI. The browser regression waits for the actual approval response.

Validation: build/type checks, 43 focused backend checks and 24 browser checks passed locally on Node 24.22.1. CI on the pinned Node version is required before merge. No additional migration beyond this PR's additive migration 069. The feature gate remains off pending live-host and unattended-cycle acceptance; this release does not approve catalog versions or activate existing automations.

## 14 November 2026 — External exchange updates (platform, for Investor Updates)

Built the update extension of the [external exchange](docs/product/EXTERNAL_EXCHANGE.md#6-update-extension-for-investor-updates) (§6, U1–U4) on the room extension, before the Investor Updates app (migration 068). A room can carry content as its main page: HTML from the app's block renderer is rebuilt by TrialAgents from an allowlist (`src/domain/exchange-update-content.ts`), with images from PNG, JPEG or GIF platform documents served from a per-update address that names no recipient, and asks placed by marker. Email type `update` sends that content as email-safe HTML with a plain-text part, the personal link, the confidentiality text and the footer, checked for Gmail, Outlook and Apple Mail on every prepared email and shown exactly as sent; human confirmation, Reply-To, bounces and rate limits are unchanged. Groups sharing a series key get a one-click unsubscribe (List-Unsubscribe headers and a footer link with a confirmation page) recorded per address and honoured when preparing, queueing and delivering; each person's page lists the earlier updates of the series sent to their address. "I can help" responses (one per confirmed click, optional note) are stored per person and written to a bound responses table; a bound delivery table keeps status (queued, sent, bounced, read, revoked) and read facts, both as source "tracked". New reviewed operation `update_exchange_content`; app runtime `exchange.updateContent`, `exchange.previewContent`, `exchange.listResponses`, `exchange.series` and `exchange.list({series})`; MCP `preview_exchange_content`, `list_exchange_responses`, `list_exchange_series`. Recipient links, ask links, unsubscribe links and image addresses are now replaced with placeholders in every workspace MCP result and in app reads made by an assistant. Template guidance 1.3.26. Tests: `tests/exchange-updates.test.ts` (§6 acceptance 1–6 under the runtime role) and `tests/visual/exchange-update.spec.cjs` (page at 390 and 1440 px; email in Gmail, Outlook and Apple Mail profiles).

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
## 12 November 2026 — Fundraise 2.0.0 template (draft)

Built `life.investor-crm` 2.0.0, display name Fundraise, from the final scope in [FUNDRAISE.md](docs/product/app-template-blueprints/apps/FUNDRAISE.md) against template guidance 1.3.20 and the contract registry: seven screens (Overview, Pipeline, Investors, Round, Activity, Engagement, Settings), investors and contacts on the shared `organizations` and `people` tables (core v1), five `fundraise.*` app tables and the published output `fundraise.tranches` (fundraise.v1, exactly the registry entry). `dataroom.access_grants`, `dataroom.engagement` (dataroom.v1) and `programs.plan_items` (programs.v2, six fields) are `optional` + `integration` roles: Fundraise's own tables for manual entry, read-only provider data once the user chooses it with the in-app `data-trialy-integration` line. Only signed commitments count as raised; other-currency amounts are flagged and excluded. The 1.0.1 catalog JSON is unchanged; its source package moved byte-for-byte to `templates/source/investor-crm/archive/1.0.1/`, and its installer, seed schema and test paths follow. 2.0.0 is a draft catalog version until the owner approves it. Evidence: [Fundraise QA](templates/source/investor-crm/QA.md).

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
