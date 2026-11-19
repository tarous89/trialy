# Platform decisions snapshot — 19 November 2026

Source of truth: the **Platform Access Decisions** table of the *Platform Capability Review* app (workspace `147ab042-8864-40bc-8ad9-c2207bbdde4a`, table `68b7c155-7ef6-40e7-ac40-766cccf880ab`). This file is a dated copy so the [implementation scope](PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md) can cite each decision by a stable code. If the table and this file differ, the table wins: refresh this file before building.

72 records: 71 decided, 1 draft. Codes are assigned here and are not stored in the table; the record ID identifies the row.


## R · Roles

### R1 · Organization owner

- **Status:** Decided · **Category:** Access roles · **Record:** `ed36c339-81b6-4481-a877-5da0d1c5af57` (v2)
- **Decision:** Manage organization membership, co-owners, billing, subscription and organization-wide assistant policy. Administer tables and records. Restore archived tables and apps and reassign app ownership.
- **Limits:** Multiple organization owners are supported. Retain at least one during handover.

### R2 · Organization member

- **Status:** Decided · **Category:** Access roles · **Record:** `314431be-2f40-4c9c-9d98-45b645b92194` (v2)
- **Decision:** Create or install apps. A new app starts as a private draft its creator can review. On Save, the installation popup shows the defaults to approve or change. The creator becomes the app’s first owner. Use other apps at the team default or individually assigned role.
- **Limits:** Membership alone gives no organization administration, billing or shared database administration.

### R3 · App owner

- **Status:** Decided · **Category:** Access roles · **Record:** `7c8d1a9c-e74f-4791-98f9-c39451571d1c` (v4)
- **Decision:** Approve app code and UI changes made through an assistant, publish revisions, apply catalog updates, own and manage the app’s automations, change feature settings, add new tables for the app, edit authorized content, and restore the archived app from the archived apps list. Grant Owner, Editor or Viewer to existing teammates, and lower or remove anyone’s app role.
- **Limits:** App ownership grants no database administration. Archiving, changing or linking existing tables follows database access.

### R4 · App editor

- **Status:** Decided · **Category:** Access roles · **Record:** `06bf84a8-b387-4f15-8c5d-be33940b7bc5` (v3)
- **Decision:** Create and edit authorized app records. Grant Editor or Viewer to existing team members and approve those requests.
- **Limits:** Code, UI, automations, feature settings, lowering or removing roles, and restoring an archived app require App owner or organization owner. Record writes remain subject to table restrictions.

### R5 · App viewer

- **Status:** Decided · **Category:** Access roles · **Record:** `1889489b-c4ed-4e4d-951e-5619a4edb1ec` (v2)
- **Decision:** Read authorized app content. Grant Viewer to existing team members and approve Viewer requests. Request Editor when needed.
- **Limits:** Cannot change content, code, UI, automations or feature settings, grant Editor or Owner, or lower or remove roles.


## A · Access layers

### A1 · App and team defaults

- **Status:** Decided · **Category:** Access layers · **Record:** `55a31b4b-3e59-436d-b2ac-e47c022b256e` (v2)
- **Decision:** The organization owns the app. The installer is its first app owner. Existing and future team members get Editor by default. The installation popup shows this default and the installer can change it.
- **Limits:** A team member can hold different roles in different apps. Membership and app roles apply only within the organization.

### A2 · Database and records

- **Status:** Decided · **Category:** Access layers · **Record:** `9a294b7f-244a-4760-8497-0d30d114c23e` (v4)
- **Decision:** The organization owns its database. Organization owners set access per table. The platform enforces table access for records, linked apps, assistants, automations and history. App owners and editors can write permitted tables through an authorized app. Viewers can read permitted tables. App owners can add new tables for their app. These app tables follow each user’s app access: editors can edit, viewers can view, and users blocked from the app are blocked from them. Archiving, changing or linking existing tables requires the matching database access.
- **Limits:** Ownership of all tables, including tables added for an app, stays with organization owners. There are no per-column permission settings in the target model. Hiding a column only changes presentation. Put information requiring a different audience in a separately permissioned table. Existing restricted data must remain protected when migrating.

### A3 · Code, UI and versions

- **Status:** Decided · **Category:** Access layers · **Record:** `b3e6a997-0017-43bf-9b47-aa15884a2807` (v5)
- **Decision:** Only an App owner can authorize changes to installed app code, including applying a catalog update. Custom code and design changes go through an authorized assistant. Teammates keep using the published version until the owner publishes the revision.
- **Limits:** Users may edit authorized business records. Only App owners change feature settings. Published versions are read-only history. A catalog update is a platform action available only to an App owner, except speed-only updates that change no features, screens or data, which apply automatically to apps that have not been customized.

### A4 · Assistants

- **Status:** Decided · **Category:** Access layers · **Record:** `b5626165-525d-4292-9d09-6986cbe4c9e1` (v3)
- **Decision:** Set two independent assistant permissions. Data covers reading and changing records. Apps covers app code, UI, table connections, automation definitions and new app tables. Each has three levels: Edit, View only, Blocked. Data edits by an assistant with Edit save directly. App edits by an assistant with Edit always need the user to approve them before they apply.
- **Limits:** Apply the organization maximum, the user’s actual rights, then any tighter personal limit. Apps is Blocked unless the user owns the target app or is creating a new app. If an approved app change affects access, table connections or automations, show the installation popup again before it applies. Archiving, changing or linking existing tables still follows database access. View only permits reads in that area. Blocked denies access to that area.

### A5 · Requests and sharing

- **Status:** Decided · **Category:** Access layers · **Record:** `8ef67cb4-fa61-4d81-808d-82bb6a847542` (v3)
- **Decision:** When sharing an app with an existing teammate, show only roles the sender can grant. App owners can grant Owner, Editor or Viewer. Editors can grant Editor or Viewer. Viewers can grant Viewer. Sharing grants the selected app role immediately, including when the colleague previously had less access.
- **Limits:** Database permissions still apply to the underlying records. If the recipient is blocked from tables the app uses, warn the sender before sharing. Only app owners and organization owners can lower or remove an app role. A teammate can separately request Editor from the app UI or Access tab, or App owner from Settings. Email all eligible grantors for a request. One approval is sufficient. Later visitors see who granted it and the date, time and time zone.

### A6 · Approval footer

- **Status:** Decided · **Category:** Access layers · **Record:** `96924685-424a-41b6-a22d-770933dc3c15` (v3)
- **Decision:** Keep one branded footer for pending app changes across tabs, apps, sessions and devices until resolved. Use Save / Discard for a new app before installation, Publish / Discard for app revisions and Approve / Decline for assistant app changes. Teammates keep seeing the latest approved version until then.
- **Limits:** Group all assistant app changes from one response into one review. If the changes affect access, table connections or automations, show the installation popup again before applying. Record edits by people, or by assistants with Data Edit, save directly unless the app’s own design asks for a Save step. Platform content, such as database structure and access settings, needs Save by default.

### A7 · Logs and history

- **Status:** Decided · **Category:** Access layers · **Record:** `21137060-e1c8-48ce-8088-a7a7cc31574c` (v6)
- **Decision:** Organization owners see organization-wide audit logs. App owners see their app’s operational and automation logs. Editors and viewers see the history of records they can already read.
- **Limits:** Apply current table permissions to historical data and run details. Logs are read-only. Restore archived apps, automations and tables from their respective platform sections.

### A8 · Billing and subscription

- **Status:** Decided · **Category:** Access layers · **Record:** `e94fd100-7cf3-4b63-8816-be1010a1a4cb` (v1)
- **Decision:** Organization owners see and manage billing, checkout and subscription settings.
- **Limits:** App ownership or membership alone gives no billing access.

### A9 · Restore archived apps, automations and tables

- **Status:** Decided · **Category:** Access layers · **Record:** `1012a5f4-e073-4ffd-9a97-b5f05b55b699` (v2)
- **Decision:** Only archived apps, automations and database tables can be restored, from the archived lists in Apps, Automations or Database. Restore requires the applicable management rights. The installation popup does not offer restore.
- **Limits:** Keep dependent apps and current data intact. Check dependencies before restoring. Restored automations stay disabled until their approved bindings and authorizations are valid and a user enables them.

### A10 · Deleted records and record history

- **Status:** Decided · **Category:** Access layers · **Record:** `22de1bc1-8670-4ba8-899a-f3205abe8ae1` (v2)
- **Decision:** Records and earlier record values cannot be restored from logs or history, because history can reach far into the past. Keep a read-only audit history. Apply corrections through normal authorized edits. Undoing a recent action from inside the app during the same session is allowed, including a delete.
- **Limits:** Undo is offered by the app, not by logs or history. Once the session ends, an action can no longer be undone.

### A11 · Remove a member and inherit their apps

- **Status:** Decided · **Category:** Access layers · **Record:** `4bb12db9-45cb-4976-a3ad-4be01d7ef0c2` (v3)
- **Decision:** An organization owner removes a member from Settings → Team. Revoke the removed member’s organization and assistant access and transfer their App owner roles to organization ownership under the organization owner. Retain any existing app co-owners.
- **Limits:** Keep organization data, app history and settings intact. Automations linked to them are switched off until an app owner sets them up again or moves them to their own account. Personal credentials do not transfer. The last organization owner must hand over before leaving.

### A12 · Published app versions

- **Status:** Decided · **Category:** App design · **Record:** `1e8b7122-314a-431b-b59e-7ccf90f2391b` (v1)
- **Decision:** Earlier app versions are available as read-only history. A correction to a published app goes through a new reviewed revision.
- **Limits:** No rollback or restore action for previous versions. An archived app can be restored at its archived state.

### A13 · Dependency warnings for assistant edits

- **Status:** Decided · **Category:** App design · **Record:** `90b8e2a9-167b-49ff-81ba-6813e7aa80e8` (v0)
- **Decision:** When an assistant prepares an app or schema change, the platform checks for affected dependencies. If another app, view, link or automation relies on what would change, return a concise impact report to the assistant with the affected resource and expected effect. Otherwise continue the ordinary edit flow silently.
- **Limits:** The assistant may choose a compatible edit or ask the user when an affected workflow needs a decision. Keep dependency details within the caller’s access. Revalidate at save and prevent unresolved breaking changes from being published. The normal approval policy still applies.

### A14 · Minimal automatic assistant context

- **Status:** Decided · **Category:** Assistant context · **Record:** `934bb79d-aa64-466e-92f4-8dbec2e7a6b0` (v0)
- **Decision:** Automatically send only the current app or tab identifier as a background hint. The assistant can request further details when the user’s task calls for them.
- **Limits:** Record values, unsaved input and context files stay out of the automatic handoff. Fetches follow current permissions.

### A15 · Workspace display in ChatGPT and Claude

- **Status:** Decided · **Category:** Assistant context · **Record:** `5aa41d22-1370-44a1-b136-99e1e4423017` (v0)
- **Decision:** In each conversation, open the TrialAgents extension automatically once, after the first assistant response to a TrialAgents request. On subsequent TrialAgents requests, let the assistant choose one display based on the ask: open the relevant workspace or app for interaction, show a concise inline snippet, or provide a direct link to open it.
- **Limits:** A later data lookup or background context hint does not automatically open or replace the extension. Honor explicit requests to open a view. Snippets and links respect current access. The existing minimal automatic context rule still applies.


## I · Installation, projects and connections

### I1 · Projects as the organizing unit

- **Status:** Decided · **Category:** App design · **Record:** `3beb43c2-4042-41de-b5e1-96a9b9a72463` (v0)
- **Decision:** Organize apps under Projects. Expose Projects and Apps in the workspace navigation.
- **Limits:** Folders are outside the requested product hierarchy. Moving an app between projects does not by itself grant access or copy its records.

### I2 · Installation and project records

- **Status:** Decided · **Category:** App design · **Record:** `2cb90b53-a232-4132-a4cf-b64a1b8ef2fc` (v2)
- **Decision:** Use one installation popup showing the target project, team access, table connections and optional automations. Show it when a new app is first saved, and again when an approved app change affects access, table connections or automations. List only existing active apps and tables where relevant.
- **Limits:** Project record links reuse existing records and preserve permissions. Bundled automations attach to the installed app. Archived apps are restored only from the archived apps list, not from this popup.

### I3 · Installation popup layout

- **Status:** Decided · **Category:** App design · **Record:** `9041d90b-29f4-4a71-b10e-cf0f35ff075e` (v0)
- **Decision:** Use one short popup. Show the app name and purpose, then three sections in order: Project and team access, Table connections, and Optional automations. Lead with useful defaults. Keep technical detail expandable. Use one primary install action and a cancel action.
- **Limits:** Show each suggested source and Read or Read/write beside its table. Offer Use existing or Create new on that row. Keep automation descriptions to purpose and schedule. Surface any permission or destination that changes the effect of installing before confirmation.

### I4 · Install-time table connections

- **Status:** Decided · **Category:** App design · **Record:** `fcbb5d53-2c3b-4fde-9aa3-f2d97563ba10` (v1)
- **Decision:** For each required table, show the suggested existing table, its source and intended read or write use. Let the installer approve the suggestion or choose Create new table. With no usable match, offer a new table.
- **Limits:** Default cross-app links to read-only. Write-back requires express authorization. Recheck access and schema when saving. An archived or incompatible source must be shown as unavailable.

### I5 · Assistant-built app connections

- **Status:** Decided · **Category:** App design · **Record:** `439541e7-8021-407a-abe7-6bd71dca6bf4` (v1)
- **Decision:** Assistants building an app suggest connections to existing tables. The installation popup presents each suggestion for the installer to accept or replace with a new table. Templates support standalone use.
- **Limits:** The platform shows only accessible candidate tables and validates the final choice. Existing-table reuse creates a reference without copying or merging records.


## U · Shared platform interface

### U1 · Shared platform UI

- **Status:** Decided · **Category:** App design · **Record:** `7e6f0d41-5070-42d3-971a-6a87c44899e6` (v2)
- **Decision:** Standardize the platform sidebar, the header with its access and refresh status, bottom-right system notices, the persistent approval footer, linked-value tooltips and the request-edit-access control. The platform sidebar is hidden by default; users open it to go back to the platform or to other apps. Use the same behavior and labels across apps. Assistants building or changing apps must use these shared elements and never recreate them inside the app.
- **Limits:** The app’s own navigation, screens, workflows and visual design stay under app control.

### U2 · Platform system messages

- **Status:** Decided · **Category:** App design · **Record:** `e781432f-0c02-4d36-ad99-496736823fdf` (v2)
- **Decision:** Every system message in apps and on platform pages uses the platform’s shared notice. Assistants building or changing an app must use it for all of the app’s messages and features, and never build their own. There are three kinds. 1) Info and success notices float at the bottom right of the page and close on their own after 5 seconds. 2) Error notices float at the bottom right and stay until the user dismisses them. 3) Access and refresh status, such as read-only, revoked access or a newer version, stays in the page header.
- **Limits:** Only one notice shows at a time: a newer message replaces the one on screen, so messages never pile up. An error that has not been dismissed is replaced only by a newer error, not by an info notice. Apps never draw their own banners, toasts or pop-ups for system messages. Errors about a single value, such as a failed save or a validation problem, also show next to that value. The approval footer and the installation popup are not system messages and stay until resolved. App content, such as empty states, form hints and an app’s own Undo control, stays in the app’s own design.

### U3 · Access messages within the standard UI

- **Status:** Decided · **Category:** App design · **Record:** `39d71b93-fb9e-4737-b683-472dd1d29f57` (v1)
- **Decision:** Use the standard header message for read-only or revoked access. Use the existing request-access control where the user can request access.
- **Limits:** A request starts only when the user chooses it. Reuse the existing UI elements.

### U4 · Platform-managed app administration

- **Status:** Decided · **Category:** App design · **Record:** `5d3349fa-e90d-48d0-9012-627e70a2b079` (v0)
- **Decision:** Manage app permissions in the platform Access tab. Use the platform’s Logs and Automations pages with the relevant app selected. Assistants building apps connect them to these pages so they can focus on the business workflow.
- **Limits:** The app can expose a contextual link or request-edit action. The platform supplies and maintains the administration screens.

### U5 · Feature settings

- **Status:** Decided · **Category:** App design · **Record:** `e49eed1c-2196-418e-ae42-82c3e936c51f` (v2)
- **Decision:** Limit app settings to choices that affect how the business feature works. Keep granular typography, color, spacing and layout controls out of the standard configuration page.
- **Limits:** Only App owners and organization owners change feature settings. Users with access edit permitted records directly. App owners request code and UI customization through their authorized assistant.


## T · Automations

### T1 · Automations

- **Status:** Decided · **Category:** Access layers · **Record:** `02346e90-ce82-4b30-b084-938444a90e99` (v4)
- **Decision:** Every automation belongs to an app. Adding an automation means choosing an existing app; it never creates a new app. Only the app’s owners configure, run, pause, restore and see the runs of its automations. Editors and viewers cannot. By default an automation is linked to the owner who sets it up and runs with their rights. Any app owner can move it to their own account.
- **Limits:** What an automation can write follows the access of the connector that runs it, such as the assistant’s Data permission: Edit writes directly, View only cannot write, Blocked cannot run. Restoring an archived automation does not replay historical runs or reinstate revoked grants. If the linked owner is removed, the automation is switched off until an app owner sets it up again or moves it to their account.

### T2 · Automation 1 · Scheduling and intervals

- **Status:** Decided · **Category:** App design · **Record:** `6a8ff108-98cf-4187-9e89-54f41d33a095` (v1)
- **Decision:** Use calendar triggers when timing must survive a failed run. Use completion-based triggers only for genuine dependencies. Keep a configurable minimum for recurring research based on workload, with 60 minutes as the launch default.
- **Limits:** Urgent database events can trigger an eligible action separately. Email has its own frequency limits.

### T3 · Automation 2 · Retries and failed dependencies

- **Status:** Decided · **Category:** App design · **Record:** `4eca0076-d70f-461b-955b-47bca9417e13` (v1)
- **Decision:** For transient failures, retry after 5, 15 and 60 minutes using the same logical run. For missing permission or a broken connection, stop retrying and show Needs attention with the cause.
- **Limits:** A failed prerequisite blocks only its dependent step. Future calendar runs still occur. Alert the owner once after retries are exhausted.

### T4 · Automation 3 · Outages and duplicate delivery

- **Status:** Decided · **Category:** App design · **Record:** `fac3142c-e8e1-4d34-928a-5734834b41ff` (v1)
- **Decision:** After an outage, send one consolidated reminder for still-relevant missed items. Deduplicate by automation, recipient, business event and due occurrence.
- **Limits:** Skip obsolete reminders. If the provider may already have accepted a send, reconcile it before retrying. A failed email can retry without repeating successful research.

### T5 · Automation 4 · What can write

- **Status:** Decided · **Category:** Access layers · **Record:** `6bd8ee2b-89db-4a7a-ad8e-575123a093ce` (v3)
- **Decision:** At setup, specify which app tables the job may read and write. What it can actually write follows the access of the connector that runs it, such as the assistant: Edit writes directly, View only cannot write, Blocked cannot run. Research and drafting must have durable app storage. Notification-only jobs need read and send rights.
- **Limits:** There is no separate proposal mode for automations. Recheck the connector’s current access on every run. Distinguish applied and delivered in run history.

### T6 · Automation 5 · Copy and activation

- **Status:** Decided · **Category:** Access layers · **Record:** `9c87e60e-995c-4fa2-9285-6a1383d11b74` (v1)
- **Decision:** Copy portable rules, prompts, schedules and permitted read or write helper definitions. Keep copied automations disabled until an owner reviews the destination tables, connections and recipients and activates them.
- **Limits:** Credentials, unattended grants, delivery history and pending runs stay with the original. Reuse a connection only with current authorization.

### T7 · Automation 6 · Retire legacy monitoring

- **Status:** Decided · **Category:** App design · **Record:** `99074529-a5a9-4487-8508-7d1a3261312c` (v1)
- **Decision:** Migrate each enabled legacy monitor to its app automation after verifying schedule, recipient, write scope and the last completed occurrence. Switch off the old trigger as the replacement takes over.
- **Limits:** Paused monitors stay paused. Preserve history and prevent both runners from handling the same occurrence.


## X · External sharing and data quality

### X1 · External sharing by purpose

- **Status:** Decided · **Category:** Access layers · **Record:** `1f700ef8-9c42-4c4c-9ef3-28d6c18b89a1` (v1)
- **Decision:** Support Publish, Collect and Disclose as independent platform modes. Each app selects the appropriate mode for each workflow. Publish releases prepared content to anyone with the link. Collect gives each respondent a private submission page. Disclose grants named recipients access to selected documents or updates.
- **Limits:** Using one mode does not enable the others. Preserve recipient isolation, expiry or revocation as applicable, and identity verification for confidential disclosures. External access does not grant organization membership.

### X2 · External submissions and files

- **Status:** Decided · **Category:** Access layers · **Record:** `c623e342-ae65-4633-b4c0-64acfaa7b754` (v1)
- **Decision:** Valid routine responses can create intake records directly. Replacing existing business data or accepting external evidence goes to a reviewer with the required rights. The platform validates incoming data even when no assistant is involved.
- **Limits:** Screen uploaded files before release. Keep unaccepted or failed files out of assistant access, show the submitter whether retry is needed and preserve the original version. A private exchange never confers workspace membership.

### X3 · Platform validation on every write

- **Status:** Decided · **Category:** App design · **Record:** `ae798f60-900c-4cb5-bbae-7b0c0f788dec` (v1)
- **Decision:** The platform runs deterministic checks whenever a form, import, API, external recipient or automation submits data. Use the same checks for a CRO completing an RFP with no assistant present.
- **Limits:** Validate required values, data types, date/number parsing, configured ranges, allowed options, unique keys, referenced records, table access and the permitted submission scope. Report errors against the relevant field or import row. Keep invalid input out of the target business table.

### X4 · Normalization and duplicate handling

- **Status:** Decided · **Category:** App design · **Record:** `18a07638-77da-4b22-9e51-7ca0dc97b5b8` (v2)
- **Decision:** Apply explicit, unambiguous formatting rules and detect declared duplicate keys. Preserve meaningful text, identifiers and source submissions. Report conflicting values without guessing a correction or merging records.
- **Limits:** An assistant may simplify or normalize existing data only when a user asks and its Data permission is Edit. Routine submissions never invoke an assistant for quality review.


## G · App authoring

### G1 · Authoring · Non-negotiable rules

- **Status:** Decided · **Category:** App design · **Record:** `3cb986eb-14ce-420b-be5e-3066c12e57db` (v0)
- **Decision:** Apps never break these rules, even when a user asks. 1) Universal platform elements: the platform header, platform sidebar, system notices, approval footer, tooltips and request-access control stay as the platform provides them and are never recreated or hidden. 2) Platform features: access, sharing, automations, logs and history stay on platform pages. 3) Access and safety: apps respect database and app permissions, use platform sign-in only, and follow the saving, approval and validation rules. 4) Honest data: missing or partial data is never shown as complete or as zero.
- **Limits:** Every other authoring decision is a default the user can override. When a request would break a rule here, the assistant explains why and offers the closest allowed option.

### G2 · Authoring · Frame and navigation

- **Status:** Decided · **Category:** App design · **Record:** `ebe65541-a507-456b-9397-721b89815958` (v1)
- **Decision:** The platform provides its own sidebar (hidden by default), the header, system notices, the approval footer, tooltips and the request-access control. Everything below the platform header is part of the app, including its own navigation. Apps have no header or title bar of their own; the app name lives in the platform header. The assistant decides whether an app needs its own sidebar, tabs or no navigation at all, and how it behaves.
- **Limits:** An app’s own sidebar may carry the app’s branding, as long as it sits below the platform header. Apps never recreate the platform elements listed here and add no disclaimer footers.

### G3 · Authoring · Platform features stay on the platform

- **Status:** Decided · **Category:** App design · **Record:** `e7505e0d-8d8a-4fea-aa2e-b34faeba1762` (v0)
- **Decision:** Access, sharing, automations, logs and history are managed on platform pages. Apps link to them where useful.
- **Limits:** Apps never rebuild these features or fill screens with explanations of them.

### G4 · Authoring · Built around the job

- **Status:** Decided · **Category:** App design · **Record:** `9af63631-1a8c-4f7c-bb03-66fb05c9ce32` (v1)
- **Decision:** Design each app around the main jobs people come to do. Every screen must help with one of them, and the app uses only as many screens as the job needs. The first screen shows what needs attention now and the obvious next step, with only the few numbers that matter. When the user picks a working context, such as a request, room or round, keep it across screens and the next visit until they change it. Remember it per person.
- **Limits:** No fixed screen counts, section lists or required screens. The assistant decides based on the app’s main function.

### G5 · Authoring · Fewest clicks

- **Status:** Decided · **Category:** App design · **Record:** `2c482abc-cc80-4654-81e3-6a4e4fafd9d8` (v1)
- **Decision:** Let people edit a value where it is shown, and save it instantly. Use a side panel only to create a record or edit many fields at once. Use drag and drop for stages and ordering where it fits. Every empty screen offers the first action, such as adding the first item or importing existing data, so a newly installed app is useful straight away.
- **Limits:** Saving follows the platform rules: record edits save directly, platform content needs Save, and assistant app changes need approval.

### G6 · Authoring · Only what helps

- **Status:** Decided · **Category:** App design · **Record:** `c57fe945-f768-4ca6-a536-1d57f83895fb` (v1)
- **Decision:** Show only what helps people decide or act. Keep technical details, such as raw data, codes, IDs and source reports, hidden or one click away. Settings hold only business choices that change how the app works, and only owners can change them. An app with no such choices has no Settings screen.
- **Limits:** Settings never hold layout, styling, access, automation notes or data lists. Data lists belong on their own screen or in the Database. Settings and other app-wide actions live inside the app, never in the platform header or platform sidebar. The assistant decides where in the app they go.

### G7 · Authoring · Customization

- **Status:** Decided · **Category:** App design · **Record:** `396814d4-1c3c-495c-a06e-d51649e37ab1` (v0)
- **Decision:** The assistant decides, based on the app’s main function, whether to offer quick view choices inside the app, such as hiding or reordering columns, filters and sorting. Changes to screens, layout and design are made through an assistant.
- **Limits:** Assistant app changes follow the Assistants and Approval footer decisions.

### G8 · Authoring · Undo

- **Status:** Decided · **Category:** App design · **Record:** `860c38dc-77ca-440a-bf2e-37a1a6345422` (v0)
- **Decision:** Apps may offer Undo for recent actions during the same session, such as an edit, a delete or a stage move. Undo is part of the app, not the platform message. The assistant decides whether an app needs it and where to place it.
- **Limits:** Undo follows the person’s current access and the normal saving rules. Actions that cannot be taken back, such as a sent email, offer no Undo.

### G9 · Authoring · App catalog

- **Status:** Decided · **Category:** App design · **Record:** `0f21ec58-c17c-432f-84f2-8fb642dd247f` (v0)
- **Decision:** Keep a catalog of ready-to-install apps for common jobs. Each one is complete and professional, installs quickly through the installation popup, and can be customized through an assistant. When a request matches a catalog app, the assistant offers it and installs or customizes it if the user wants.
- **Limits:** Catalog apps follow the same authoring decisions as custom apps.

### G10 · Authoring · General style

- **Status:** Decided · **Category:** App design · **Record:** `a62b0600-4efc-4bda-a433-fa5d68bf2fb3` (v1)
- **Decision:** Keep one general visual style (fonts, colors, spacing, icons and components). It is the default for all future catalog apps and for apps assistants build from scratch. Use plain screen names, clear hierarchy, tidy alignment and layouts that work on small screens.
- **Limits:** The user’s instructions take priority over the general style and any other authoring decision, except the Non-negotiable rules.

### G11 · Authoring · Every feature works

- **Status:** Decided · **Category:** App design · **Record:** `573fbe50-89cf-4894-8cdb-c69adcbfa17d` (v0)
- **Decision:** Every requested feature works for real with the user’s data.
- **Limits:** No placeholder buttons, fake data or invented example records.

### G12 · Authoring · Principles over constraints

- **Status:** Decided · **Category:** App design · **Record:** `a08bb560-808d-4c28-b72d-f23fc0cd6d74` (v0)
- **Decision:** Authoring guidance gives assistants principles and leaves design choices to them. Keep it in one short guide with no repeated text.
- **Limits:** Remove fixed numbers, pixel sizes, required sections and other rules that do not make apps more useful or more professional.

### G13 · Authoring · Self-check before preview

- **Status:** Decided · **Category:** App design · **Record:** `198e418f-6aac-4d7d-b912-225a7b06d7e1` (v1)
- **Decision:** Before showing an app for approval, the assistant checks: Does every screen serve a main job? Is any platform feature or element recreated? Is anything shown that does not help people decide or act? Can the main job be done in the fewest clicks? Does every empty screen offer a first action? Does every requested feature work? Does it open fast and respond instantly? Does it work on a phone and in the assistant panel?
- **Limits:** These are questions, not fixed limits. Fix what fails before showing the preview.

### G14 · Authoring · Bring catalog apps in line (last step)

- **Status:** Decided · **Category:** App design · **Record:** `fcfc4b7d-f9b2-447b-95ca-b0a180a64032` (v1)
- **Decision:** As the very last implementation step, update existing catalog apps to the authoring and performance decisions in one pass. Remove their own headers, stacked banners, disclaimer footers, data lists and access or automation notes inside Settings, raw technical data on screen, rebuilt platform features, and Save-then-review editing. Move them to the general style. Make them meet the speed targets: instant screen changes and edits, loading only what each screen needs, and working on a phone and in the assistant panel.
- **Limits:** Branded app sidebars may stay as long as they sit below the platform header.


## P · Performance

### P1 · Performance · Speed targets

- **Status:** Decided · **Category:** App design · **Record:** `679210d9-0769-43d6-a88b-a787cdf20014` (v0)
- **Decision:** Use the standard targets of comparable tools. A click or tap gets a visible response within a tenth of a second. Changing screens, filtering and sorting finish within one second. An app's main content is visible within about 2.5 seconds on a normal phone connection, and faster in a browser. An edit shows at once and is saved within one second.
- **Limits:** Targets apply in the browser, inside the assistants and on phones. Review them when real measurements are available.

### P2 · Performance · Show first, fill in after

- **Status:** Decided · **Category:** App design · **Record:** `a9d0ed5d-1a31-4c66-be74-93c12a5f0f3b` (v0)
- **Decision:** The screen and its most important content appear first and details follow. What was on screen stays visible while new content loads. Remembered content may be shown first and refreshed right after.
- **Limits:** No blank pages or full-page spinners. Content shown before a refresh may be a few seconds old.

### P3 · Performance · Load only what the screen needs

- **Status:** Decided · **Category:** App design · **Record:** `4658076e-0751-4084-8f8e-c0e7b93d8521` (v0)
- **Decision:** Each screen loads only its own data. Long lists load page by page.
- **Limits:** Totals and calculations still use the full data, never just the loaded page.

### P4 · Performance · Instant interaction

- **Status:** Decided · **Category:** App design · **Record:** `0545e236-94f8-414b-9443-3b6185833cd3` (v0)
- **Decision:** Moving between screens, opening menus and panels, and sorting or filtering what is already loaded happen in the browser and never wait for the server. Apps do this work in the browser instead of on the server.
- **Limits:** The server still checks every save and only sends data the person may see. Assistant commands that reuse an app's logic keep working.

### P5 · Performance · Instant edits

- **Status:** Decided · **Category:** App design · **Record:** `d9500720-d220-4dba-b36a-9e3e323adea5` (v0)
- **Decision:** A new value shows at once and saves in the background. If the save fails, the old value comes back with an error message. If someone else changed the same value first, the second person sees the newer value and a message, and their edit is not saved.
- **Limits:** The whole app is never locked while saving. Only what changed is refreshed.

### P6 · Performance · Check once, never skip

- **Status:** Decided · **Category:** App design · **Record:** `b63321c4-153f-48cd-8aa5-1ec7d10f87cc` (v0)
- **Decision:** Access and validity are checked once per action, not several times.
- **Limits:** No check is ever dropped for speed.

### P7 · Performance · Background work stays in the background

- **Status:** Decided · **Category:** App design · **Record:** `76f94231-41e5-4669-8e9b-b49906499ac9` (v0)
- **Decision:** Automations, refresh checks and logs never slow down or interrupt the person working.
- **Limits:** Background work shows no loading indicator. Errors that need action still appear as system messages.

### P8 · Performance · No waiting on other users

- **Status:** Decided · **Category:** App design · **Record:** `8e4caee7-bc08-42b8-bd7a-8e37665dd127` (v0)
- **Decision:** People using apps at the same time do not queue behind each other or see busy errors. Add server capacity when real measurements show it is needed.
- **Limits:** Capacity is added on measured need, not on estimates.

### P9 · Performance · One app, every screen

- **Status:** Decided · **Category:** App design · **Record:** `f45725f9-3def-4ad0-ad89-b24911e0ef33` (v0)
- **Decision:** Each app adapts to a browser, the assistant panel and a phone, with the same features on each, including editing. As rules of thumb on a phone: navigation folds into a menu, tables scroll inside their own area or become cards, side panels open full-screen, buttons are big enough to tap and nothing depends on hovering.
- **Limits:** Apps need a connection; there is no offline use.

### P10 · Performance · Measure real speed

- **Status:** Decided · **Category:** App design · **Record:** `67cf4c03-478d-4c1d-a025-45773d32c6c3` (v0)
- **Decision:** Track the speed targets on real usage in the browser, the assistants and on phones.
- **Limits:** A change that makes things slower is not released. Measurements never record business data.

### P11 · Performance · Automatic speed updates

- **Status:** Decided · **Category:** App design · **Record:** `09edfa4c-045d-4824-b9a7-9976a6a85510` (v0)
- **Decision:** Catalog updates that change no features, screens or data apply to installed apps automatically, so speed fixes reach everyone.
- **Limits:** Any other catalog update still needs the App owner. Apps the owner has customized are not updated automatically.


## B · Bugs

### B1 · Bug · Save footer and refresh retries

- **Status:** Decided · **Category:** App design · **Record:** `853bbe9e-5c17-4ab1-9ce4-de164e143bb4` (v1)
- **Decision:** Open for investigation and fix. Reported when opening the menu, going to a different app and coming back: the Save footer for pending work is gone. Retry loading also appears often. Code check: pending changes live only in the open page’s memory, so leaving the app loses them. Retry loading most likely comes from an 8-second load timeout.
- **Limits:** Pending app changes and their footer carry over across apps, tabs, sessions and devices until resolved. Teammates see the latest approved version meanwhile. Record edits save directly and need no approval. A confirmed save must survive a refresh failure, and retrying never resubmits it.

### B2 · Bug · Bundled automations appear as standalone apps

- **Status:** Decided · **Category:** App design · **Record:** `b3853b0b-0385-4e39-91aa-5ff6bf25ab90` (v1)
- **Decision:** Open for investigation and fix. Seen with Deal Radar and Data Room. Confirmed in this workspace: Deal Radar’s three helper functions (brief, digest_summary, alert_summary) appear as separate entries on Home. Cause: helper functions are saved with no link to their app, and Home lists every function.
- **Limits:** Every automation and helper belongs to an app. Show them under their app in Automations, never as separate entries in the Apps list. Adding an automation selects an existing app and never creates one. Retrying an install creates no duplicates.

### B3 · Bug · Slow, freezing edits inside apps

- **Status:** Decided · **Category:** App design · **Record:** `83d36133-5d49-4d47-aa1f-31979f155d02` (v0)
- **Decision:** Open for fix. Editing a value in an app freezes the whole app until three steps finish one after another: a check, a save, then a full reload of the app. Access is checked twice and records are read one at a time. Recent speed work only improved opening and reading apps, not saving.
- **Limits:** Editing app content must feel instant: show the new value straight away, save it in one step in the background, and refresh only what changed. Never lock the whole app while saving. If a save fails, show it on the affected value and through the standard system message.


## K · Backlog and drafts (not in this scope)

### K1 · Backlog · Subscription packages

- **Status:** Decided · **Category:** Access layers · **Record:** `17387b00-34e7-4792-b20a-1c474bfc18b6` (v1)
- **Decision:** Keep plan redesign, seats, quotas and upgrade triggers open for future review during founder-led onboarding. Defer the proposed Starter and Business changes.
- **Limits:** Use actual onboarding and recurring usage to revisit the earlier hypothesis of more free team seats and a scheduled automation. No new entitlement or price is approved by this decision.

### K2 · Backlog · Self-service onboarding

- **Status:** Decided · **Category:** App design · **Record:** `c246e001-3033-410b-8425-d7867ee86cba` (v1)
- **Decision:** Onboarding remains open and founder-led for now. Review self-service onboarding and upgrade experiments in the backlog when there is usage evidence.
- **Limits:** Possible later tests include a second teammate, the next monthly close, and reusing its result in another app. They are experiments rather than required onboarding steps.

### K3 · Accounts · Sign-in and recovery transition

- **Status:** Draft · **Category:** Access layers · **Record:** `6c056ff4-4832-4699-916c-85eb30652b5c` (v0)
- **Decision:** Keep email/password onboarding simple. Review existing MFA enrollment and account recovery before changing the sign-in flow.
- **Limits:** Define the transition for previously enrolled users. Membership removal is governed separately in Settings → Team.

