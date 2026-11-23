# TrialAgents technical reference

Version: 2.0.0

The technical reference for apps on TrialAgents: runtime, data, saving, exchange, automations and installation. It holds no design rules; design is in the app guide (`read_app_template_guidance` resource `guide`).

## App runtime

An app's code is the body of a synchronous JavaScript function `(input, tools) => output`. It runs in an isolated engine (QuickJS) with no DOM, network or browser API. Only JSON crosses its boundary: `tools.call(name, input)` returns plain data or throws.

The same code runs in two places:

- **On the server** for the first screen, app commands, automations, public links and anything with an outside effect.
- **In the app frame, in the browser**, for screen changes, menus and filters, so they need no request. The frame runs the same engine release, keeps the app loaded while it stays open and answers reads from the data the server sent with the screen (kept in memory only). A read it lacks is fetched in one batched request (`read_app_data`); anything with an outside effect goes to the server. A host that does not allow WebAssembly keeps every event on the server; everything still works.

Which code runs in the browser:

| Code | Where events run |
| --- | --- |
| A v2 app (declares `'use trialagents v2'`) | In the browser, with the server for outside effects |
| Unchanged code of a catalog version switched on in `templates/browser-runtime.json` | In the browser (browser-compat), with the server for outside effects |
| Any other v1 code, including customized catalog copies | On the server |

`APP_BROWSER_RUNTIME=off` switches the browser runtime off everywhere.

### Input

| Field | Meaning |
| --- | --- |
| `input.event` | `{kind, action, value, form}`. `kind` is `open`, `click`, `change`, `submit`, `command` (an app command run by an assistant) or, for v2, `refresh` (the same screen again with fresh data). `action` is the `data-action` of the control. |
| `input.state` | The state the app returned last time (at most 100 KB as JSON). |
| `input.saved`, `input.writable` | Whether this is a saved app and whether the person may change its records. |
| `input.route` | The app's route inside the platform, when it has one. |
| `input.appRole` (v2) | The caller's role on the app: `owner`, `editor` or `viewer`. Show owner-only choices to owners only. |
| `input.context` (v2) | The working context this person chose last time in this app, or `null`. |
| `input.viewport` (v2) | `{width: 'phone' | 'panel' | 'wide', coarse}` from the frame, when known. |

### Output

`{html, css, state}`; v1 also `controls` (server-resolved bound fields); v2 also:

- `notice: {kind: 'info' | 'success' | 'error', message}` — shown as the platform's one message.
- `context` — any small JSON value (at most 4 KB). Remembered for this person and app and returned as `input.context`.

`html` is at most 200,000 characters and is sanitized by the frame (no scripts, no event attributes, no remote resources). `css` is at most 50,000 characters. The runtime adds the platform styles in front of the app's own.

### The v2 contract

Put `'use trialagents v2';` on the first line of the code. A v2 app:

- saves with `tools.call('records.save', {changes})` — create, update or archive changes, at most 50 per action — from a person's own click, change or submit (or an app command with a request key). The value shows at once; the server saves it in one request with the platform's checks and the screen refreshes from the saved data. A refused save (validation, permission, someone changed the same value first) brings the earlier value back with a message. Saving while opening is refused.
- treats a read that is still on its way as **pending**: in the browser, a missing read returns `{pending: true, rows: [], total: null}` (or `{pending: true}`) at once and the screen is made again when the data arrives. Show such data as loading, never as empty or zero.
- reads only what the screen shows. Reads are kept per request, so a screen that reads the same thing as the last one needs nothing new; filter and sort data already loaded in code where possible.
- gets the kit (below) and the platform styles; it does not carry its own copy of them.
- uses `undo.list` and `undo.run` for Undo, and `notice` for messages.

v1 code keeps working unchanged: `records.propose` from a person's own action saves directly; changes proposed while opening are reviewed.

### Capabilities (`tools.call`)

Reads (answered in the browser when the frame has them): `records.read`, `records.readMany` (up to 12 reads), `records.get`, `records.summarize` (totals on the full data), `project.records`, `project.relationships`, `roles.list`, `integrations.list`, `documents.list`, `documents.search`, `documents.text`, `documents.quote`, `files.list` and the exchange reads (`exchange.list`, `exchange.status`, `exchange.listSubmissions`, `exchange.listMessages`, `exchange.listEmails`, `exchange.defaultEmail`, `exchange.prepareEmail`, `exchange.notifications`, `exchange.listQuestions`, `exchange.previewContent`, `exchange.listResponses`, `exchange.series`).

Server only: `records.propose` (v1), `records.save` (v2), `undo.list`, `undo.run`, `layout.propose`, `functions.invoke`, `functions.status`, `actions.*`, `connectors.*`, the exchange writes, `files.text`, `files.image`.

Limits per event: 100 capability calls, a 4 MB read budget, 15 seconds.

### The kit (v2)

`kit` is available to v2 code. Its helpers return HTML strings that use the platform styles; they read no data themselves.

| Helper | Use |
| --- | --- |
| `kit.page(body)` | The app's frame below the platform header. |
| `kit.nav(items, current, {side?, label?, prefix?})`, `kit.layout(nav, body, {side})` | Screens as tabs or side navigation; both fold into a scrolling row on narrow screens. Items send `nav:<id>`. |
| `kit.table({columns, rows, empty})` | A table that becomes cards on narrow screens. A column with `edit: {kind, options}` is an inline cell. |
| `kit.cell({recordId, version, field, value, kind, options, label, readOnly})`, `kit.edit(event, kinds)` | One editable value; its change event is `edit:<recordId>:<field>:<version>`. `kit.edit` reads it back as `{recordId, field, version, value}`. |
| `kit.panel({title, body, close})` | A side panel for creating a record or editing many fields; full screen on phones. |
| `kit.board({columns, action})`, `kit.move(event, action)` | A drag-and-drop board. A drop, or the move menu on each card, sends `action` with `cardId>columnId`; `kit.move` reads it back. |
| `kit.empty({title, text, action})` | An empty screen with its first action. |
| `kit.pager({offset, limit, total, action})` | Paging. |
| `kit.picker({label, options, value, action})` | The working-context picker. |
| `kit.settings({fields, action}, input)` | A Settings form, shown to owners only. |
| `kit.undo(list)` | An Undo button for the person's last action: pass the result of `undo.list` (`{actions}`) or its `actions`. |
| `kit.notice(kind, message)` | The value for `output.notice`. |
| `kit.stat(label, value)`, `kit.button(label, action, {primary})`, `kit.esc(text)` | Small parts. |

The styles use `k-` class names and `--k-` tokens (`read_app_design` lists them). Example: the v2 example app in `scripts/lib/v2-example.ts`.

### Speed gates

Each switched-on catalog app is checked in the browser at the browser, assistant-panel and phone widths: changing screens makes no request and gives the screen the server renders (`tests/visual/frame-runtime.spec.cjs`); a version is switched on only while its browser test passes (`tests/frame-engine.test.ts`). For v2 apps an edit makes exactly one request.


## Saving records and validation

- Record changes from a person's own click, change or submit, and from a write app command, save directly in one step after the run (save_app_records semantics), with no review dialog. `records.propose` remains the v1 capability name. The screen is rendered again from the saved data in the same request.
- Two kinds of record change keep a review: changes an app makes while opening, and record changes that travel with an exchange operation that sends something out.
- An assistant with Data level Edit saves records directly through app commands (`run_app_command` returns `saved.rows`); with View only the write is refused. App changes (code, layout, connections) still need the person's approval in the approval footer.
- Every write is checked: required values, types, unambiguous numbers and dates (`1,234.5` and `2026-11-20` pass; `1,5` and `11/12/2026` are refused), options, declared ranges (`range`), formats (`format`: `email`, `url`, `phone`, `code`), formatting rules (`normalize`: `trim`, `collapse_spaces`, `lowercase`, `uppercase`) and unique keys, alone or combined (`unique` with `uniqueWith`). Problems come back by field, and by row for imports, in `details.issues`.
- Edits to different fields of one record both save. An edit to a field someone else changed first is not saved: `stale_value`, with the newer value in `details.row`.
- Send the record version captured when editing or archiving started as `expectedVersion`, never one read at submit time. A missing edited record is a conflict, not permission to create a replacement. A failed write keeps the input and is never reported as saved.
- Delete is `{kind:"archive_record",recordId,expectedVersion}`, for a person who can edit the whole record. Nothing is removed.
- Undo: `tools.call('undo.list')` lists the person's own recent actions in the open app (last 60 minutes, at most 20); `tools.call('undo.run',{undoId})`, from their click, reverses one as a new checked change and is refused when the record changed since. Sends and connector calls have no Undo.
- `tools.call('records.summarize',{typeId,metric,groupBy})` totals all matching records, never only the loaded page.
- `check_import` reports each import row as `ready`, `problem`, `duplicate` or `conflict` and writes nothing.
- `commit_change` must include the exact `review` string returned by `prepare_change` (digest-checked).
- After an ambiguous save response, reconcile the receipt with the same request key; never retry with a fresh key.

## App changes, the approval footer and installation

- Every pending app change is shown in one platform approval footer: Save / Discard for a new app, Publish / Discard for a revision, Approve / Decline for an assistant's change. Apps do not draw their own save prompt or approval bar.
- Assistants prepare app changes but never approve them, or Add app; `confirm_workspace_change` refuses them.
- Saving a new app opens the installation popup: project, team access (Editor by default), table connections and optional automations. Each existing table shows its source and Read or Read/write use; a table another app uses is read-only unless the installer allows writing; any suggested table can be replaced with a new empty one. Approving a later change that affects access, table connections or automations shows the popup again with only those sections.
- One pending change per app, revised with `replacesPreviewId` and `expectedDigest`. A change whose app has moved on needs preparation again and cannot be approved. `list_pending_app_changes` shows what is waiting.
- Preparation returns `dependencies` when another app, view, link or automation relies on what the change removes. A change that would break an automation cannot be saved.
- A pending revision never replaces the published app, which stays usable during edits and failed loads.
- Apps link to platform pages with `platform:access`, `platform:logs` and `platform:automations`.
- Project moves use `move_tool` with the latest placement version and do not change bindings, data scope or permissions.

## App roles and assistant permission levels

The platform checks every read an app makes against the caller's own permissions (documents, folders, tables, fields, Claude and ChatGPT settings). Generated code and declarations never grant access.

- **App roles.** Owners, Editors and Viewers. Whoever creates or installs an app is its first Owner; organization owners own every app. Editors add and change records; Viewers read. Only an Owner, or that Owner's own Claude or ChatGPT, changes code, layout, feature settings, audience or sharing, archives the app or applies a catalog update. Others get `app_owner_required`.
- **Assistant levels.** Each assistant has a Data level and an Apps level, each Edit, View only or Blocked, set by organization owners and tightened by each person for themself. Refusals: `assistant_data_view_only`, `assistant_data_blocked`, `assistant_apps_view_only`, `assistant_apps_blocked`. The levels are changed under Access, or Connections under Settings.
- **Organization owners** and their own assistants may open, run and change any app's code.
- **Unchanged catalog code** (the approved code behind the generated `templateConfiguration` and `templateBindings` lines) may be opened and run by anyone allowed to use the app, including their assistant, even with some documents or fields hidden. Saving it unchanged (install, layout, configuration) is not a code change.
- **Changing code** needs an Owner with full access: an organization owner, or an app Owner with nothing hidden from them (or, for their assistant, from it). Others get `code_change_restricted` or `app_owner_required`; record changes stay available to Editors. Changed code is custom, and only people and assistants with full access can open it.

## Accounts and section access

- Apps use the TrialAgents account. They contain no sign-in, signup, logout, password reset, profile management, credential storage, OAuth, identity providers or separate user system. Contacts and assignees are data, not accounts. Sharing uses the platform's reviewed sharing controls.
- App-level access is the outer boundary. Optional section metadata never stops a saved app from opening or records from loading.
- Standard tracker tabs may carry a stable unique `accessId`, e.g. `tabs:[{accessId:"companies",name:"Companies",typeId:<saved or temporary UUID>,columns:[{field:"name"}]}]`. Renaming or reordering keeps it. Tabs inherit the app policy and can only narrow it; without `accessId` the tab has app-level access.
- Custom source has app-level access only; hiding HTML is not a boundary. Protected standard tabs cannot attach functions or assets or copy restricted bindings to an unrestricted tab.

## Runtime and data contract

- `frontend-js` apps use the isolated render/event contract and declared bindings, and return validated HTML, CSS and serializable state with escaped text and attributes. No network, DOM execution in generated source, host cookies, filesystem, embedded secrets or private APIs; outbound requests go through approved connectors and background services.
- The host prepends `templateConfiguration` and `templateBindings` to catalog source (`AppTemplates.operation`); catalog `source` must not declare them. Configuration lives in `options`/`defaults`.
- Put `data-ui-state` on each transient `input`, `select` and `textarea` (not only the form), stable `data-action` values on change controls and `name` on form controls. Events arrive as `input.event.kind/action/value/form`; named values are `event.form[fieldName]`. The marker permits input only; it never grants writes or changes manifest or access checks.
- Keep drafts in returned state, including values of hidden fields. Apply scope, project or period changes before calculating dependent rows in the same render. Read saved layout configuration on each render.
- Field keys match `^[a-z][a-z0-9_]{0,63}$`; camelCase is only a logical key mapped to a real one. Set `multiple:false` for every scalar. Relationships are scalar record UUIDs, with explicit display fields for labels; arrays and relationship objects are not scalar IDs. URLs and multiline evidence are `text`. Scalar IDs do not create foreign-key constraints.
- Reads are bounded and one page is never the whole dataset. `unavailable`, missing bindings or fields, unknown totals, short pages and exhausted read budgets mean incomplete data; only a confirmed complete empty result means zero.
- Writes go through `records.propose` (saved directly from a person's own action), the exact prepare/commit review, or a still-valid scoped grant, within table, column and record restrictions, bindings, schema compatibility and record versions.
- The sandbox accepts embedded raster data images, not remote image URLs.
- Links to apps use the host navigation adapter in the same surface. Data calls never replace the visible workspace.

## Reading data and full-table queries

- `tools.call('records.readMany', {reads: [...]})` takes 1 to 12 `records.read` requests and returns `{results: [...]}` in order, each exactly what `records.read` returns (including `unavailable`). Each read is checked like a single read; a run may make at most 100 batched reads. Permissions are checked once per batch.
- Sort, search and filters apply to the whole authorized table before pagination: `records.read` with `sort: {field, direction: 'asc'|'desc'}`, `q`, filters, `limit` and `offset`. Reset `offset` after changing them.
- Select fields sort in option order; numbers sort numerically, missing values last. Sorting by a calculated field is rejected.
- Cache identity includes sort, query and filters; cached results rebind by record and field ID and respect freshness and pending edits.

## Revising an existing app

- Call `begin_app_update` with the current component version. It invalidates older candidates and keeps the saved app usable.
- Prepare quietly with the same `requestKey`, `replacesPreviewId` and current `expectedDigest`.
- Finish all schema, data and layout work and validation, then call `finalize_app_preview` once as the last mutation. It returns the review digest and shows the completed preview for approval. More work needs a new `begin_app_update`; never finalize intermediate work. On failure, reopen the saved app and report what is unfinished.
- Keep records, access, IDs and unrelated configuration. Revise the existing app; never create a replacement to repair a draft.
- When automation setup needs an app revision (for example missing field bindings), name the fields and reason before the finalized review; approving updates the app, not the project or automation. Then continue setup and report it separately.
- Initial reads and reads after a layout save use `read_project_component(includeOutput:true)` and use that output without another render.

## Layout profiles

- Catalog `frontend-js` apps may declare single-line JSON `const templateLayoutSchema={screens:[{id,label}],groups:{group:[{id,label}]}};` with stable keys. Groups may be form groups (e.g. `line_form`) whose optional fields can be ordered and hidden.
- The injected `templateConfiguration` carries `heading` and a stringified `layoutProfile` (`heading`, `tabs`, `cols`, `visible`, optional `labels` and `defaults` keyed `group:field`). The host reads it without executing source; layout changes arrive as `tracker:layout`.
- `prepare_tool_layout` accepts `customLayout` with the component ID and expected version and no data-mapping changes; `layout.propose` accepts a custom profile from a saved custom app. Only presentation configuration changes.
- Unknown or duplicate identities and all-hidden screens are rejected; required fields stay reachable and defaults are validated.

## App commands

On by default; `APP_COMMANDS_ENABLED=false` turns them off.

- **Declaration.** One single-line top-level JSON array, e.g. `const appCommands=[{"id":"summary.read","label":"Read the summary","mode":"read","input":{"type":"object","properties":{},"additionalProperties":false}}];`. Lowercase dotted ids, at most 60. `mode`: `read` (result, no writes), `propose` (the same record changes as the matching control) or `layout` (presentation-only `layout.propose`). `input` supports `type`, `properties`, `required`, `additionalProperties`, `items`, `enum`, `minLength`/`maxLength`, `minimum`/`maximum`, `minItems`/`maxItems`, `pattern` and `format` `date`, `month` or `uuid`. Invalid declarations fail the save (`app_commands`); the host never executes them.
- **Event.** The app runs with `input.event={kind:"command",action:<id>,value:<JSON input text>}` and returns `state.command={ok,result?,error?}`; `html` may be empty. Results are at most 64,000 serialized characters and respect column restrictions.
- **Parity.** A write command replays the same events or function as its control, buffers changes and submits once at the end. Commands cannot queue functions, call connectors, send or change exchanges, upload documents, choose integration sources or confirm data access.
- **Assistant use.** `list_app_commands`, then `run_app_command` with the current version, command id, input and a stable `requestKey`. Read results are the app's own calculations. Record changes save directly with Data level Edit (`saved.rows`); changes that send something out return the click's exact review, confirmed with `confirm_workspace_change` only after the user agrees. Layout commands are app changes approved in the footer. A retry with the same `requestKey` returns the first result. Viewers' assistants see read commands only.

## Role-based connections and existing data

Apps depend on role keys with versioned contracts, never on which apps are installed. `read_app_template_guidance(resource:"contracts")` (follow `nextOffset`) lists core v1 roles (`organizations`, `people`, `programs`, `studies`, `agreements`) and app output contracts (e.g. `runway.month_closes` runway.v2, `programs.reports` programs.v2, `fundraise.tranches` fundraise.v1, `contracts.obligations` contracts.v1, `dataroom.access_grants`/`dataroom.engagement` dataroom.v1).

- **Templates.** Every installer-schema role has a `contract`: `core.v1` for core roles, a namespaced role and own contract for app tables (`myapp.items`, `myapp.v1`). Optional roles have `"optional": true`, plus `"readOnly": true` for another app's output. An optional role the app writes gets a new table when unconnected; another app's output is only connected, never created. Roles are written as labels on the manifest.
- **Custom apps.** Manifest `roles:[{role, contract, reads?, optional?, readOnly?, typeId?, fields?}]`, e.g. `{"role":"runway.month_closes","contract":"runway.v2","readOnly":true,"typeId":"<bound table>"}`. An unused optional role has no `typeId`; `reads` accepts several versions. Keys, kinds, cardinality, options and required fields are checked (`role_incompatible`, `unknown_contract`, `unknown_core_role`). `roles.list` shows connected tables at run time.
- **One writer per output role.** The first app to bind it writable writes it; others bind read-only (`role_writer_exists`). A replacement takes over only after the writer is archived or deleted, by explicit owner choice (`roleWriterTakeover:["<role>"]`). Core roles are multi-writer.
- **Versions.** Additive changes keep the version; breaking changes need a new one, and v1 readers work with a v2 writer only if v2 is a superset. Published fields are never renamed, retyped or removed.
- **At install.** Connections are decided once, in any install order. Per table the user picks Connect (default) or Create new (Don't use for another app's output), or Connect all, and the owner chooses who can use the app. Reuse needs a compatible table a live app binds under the same role key; missing optional contract fields are added; optional roles are never created. `sharedTables` picks a table per role or `new`. Everything unconnected gets new tables, and apps are never reconnected later.
- Assistants may propose a table ID or `new` per role with `prepare_data_access`; `confirm_data_access` is not available to them. `read_template_installation` is read-only.
- **Integrations.** Optional data from another app: `"optional": true, "integration": true` with the provider's contract, binding only needed fields; the app keeps its own table for manual entry. `tools.call('integrations.list',{})` (saved apps) returns source `own`/`linked` and `offer` `install`/`connect`/null; an offer renders as `<button data-trialy-integration="install runway.month_closes">` and the platform opens the dialog. Apps read both their own entries and the provider's records; linked roles are read-only (`writableFields` empty). `read_app_integration` shows both sources; `choose_integration_source` is the user's action.
- **Connected values.** `roles.list` and `integrations.list` add `writer:{appName,canOpen}` (never the writer's ID). With `canOpen`, `<button type="button" data-trialy-open="<role> <recordId>">Edit in App</button>` opens the writing app at that record, or Database. Writes return `role_read_only` with `details:{role,recordId,writerAppName}`.
- Every app works alone; a feature whose source output is unavailable is hidden.

## Archive rules

Nothing a user created is removed as a side effect.

- **Deleting an app archives it.** Tables, records, fields and history stay. Automations pause and return switched off on restore (`prepare_workspace_change` with `archive_component` and `archived:false`); an owner re-enables them after review.
- **Removing a tab or binding unbinds it.** Fields and tables nothing else uses (including archived apps) and holding no values are archived. Re-adding the tab with the same table IDs and field keys reconnects them in the app save (workspace owner only).
- **Archived items are hidden** from search, totals, charts, exports, pickers and lists, and are not recreated under new names. Owners list them with `list_archived_items` (apps, automations, tables or a table's fields) and restore schema with `prepare_change` `restore_archived_schema`.
- **Templates** always install a new app. Archived apps are restored only from the archived apps list (`list_archived_items` with `kind:"apps"`).
- **Permanent deletion** is done by the workspace owner on the website, only for empty, unused archived items; an optional purge may remove such fields and tables after 90 days. Assistants never delete permanently.

## Documents

- Saved `frontend-js` apps use documents with the caller's own document permissions; unsaved previews get `{unavailable:true}`.
- `documents.list({limit})`: newest 200 visible versions (`documentId`, `versionId`, `version`, `latest`, `filename`, `aiReadable`, `extraction`, `uploadedOn`, `complete`).
- `documents.search({query})`: hits with passages, pages and coverage; pending, unavailable or partial extraction is not evidence of absence.
- `documents.text({versionId,offset})`: 12,000-character chunks. `documents.quote({versionId,quote,page})`: checks an exact sentence occurs, and on which pages, without returning text.
- Store references as scalar `document_id` and `document_version_id` text.
- Apps never upload. `<button data-trialy-document="upload <context>">` opens the platform upload review (file, AI-readable choice, Save original); the app then receives change event `document:uploaded:<context>` with the version ID as `value` and attaches it with a record change.
- Assistants read only AI-readable originals listed by `list_documents`, follow `read_document_text` `hasMore`, use `search_documents`, and propose records with the exact quote and page. They never set verification fields (for Contracts: `verified`, `extraction_status:"verified"`, `verified_by`, `verified_on`); a person verifies. Database column rules can deny assistant writes to those fields.

## External exchange: requests

Apps that send briefs, documents or questionnaires outside the workspace use the platform exchange, not their own portals, email or storage.

- **Reads** (groups the app created): `tools.call('exchange.list',{groupId?,appRef?})`, `exchange.status({exchangeId})` (opened, verified, acknowledged, downloads, draft, submitted version and time, documents-back status, unread messages), `exchange.listSubmissions({groupId|exchangeId})`, `exchange.listMessages({groupId|exchangeId})`, `exchange.defaultEmail({groupId,emailType})`, `exchange.prepareEmail({groupId,emailType,exchangeIds?,subject?,body?,overrides?,nameKind?,customName?,scheduleAt?})`, `exchange.listEmails(...)`, `exchange.notifications()`.
- **Identity.** Each group has an `appRef` (e.g. `request:<record id>:rfp`), found again with `exchange.list({appRef})`; each exchange is bound to the app's record (`recordId`). Status and links are read from the exchange, not copied into records.
- **Saved on click.** One write per click or submit. Until the first email, reminder approval or recipient visit, `exchange.createGroup`, `invite`, and `updateBrief`, `shareDocuments`, `requestDocument` or `extend` without notice are applied, logged and return `{status:"saved"}`.
- **One review when something goes out.** `sendEmail({batchId,digest})`, `reply`, `replyAll({replies:[{exchangeId,body}],notify})`, `publishClarification`, `extend` or `revoke` with notice, `revoke`, `acceptSubmission`, `acceptFile`, and every change once recipients have seen the group return `{status:"review_required"}`; a person confirms one review. `records.propose` changes from the same action join it and commit in the same transaction. `saveDefaultEmail` is always reviewed. Assistants, in apps or via `prepare_workspace_change`, always get a review and never confirm.
- The send review shows every email exactly as sent, from `prepareEmail` as returned.
- `acceptSubmission` `target:"bound"` updates the bound record; `target:"new"` creates one in the group's table. Unaccepted uploads are not data; accepted files become documents.
- `emailDefaults` per email type use `{recipient_name} {recipient_company} {sender_name} {sender_company} {title} {deadline} {link} {message}` (double quotes are removed from subjects); a workspace default replaces the app's.

## External exchange: rooms

Standing rooms use `kind:"room"`: no response form, submissions or deadline.

- `exchange.invite` without `days` gives access until revoked; `days` (1–730) sets an end date; `levels` lists the person's level keys (default: the first).
- Ordered `levels`: `{key,name,entry:"none"|"click_through"|"signed_document",text?,slot?}`. A signed-document level names a requested-document slot, so a signed CDA unlocks only its level. People never see, search or get changes, answers or digest lines for levels they do not hold; documents of a held level with an incomplete entry step are counted, not named.
- Document items: `{versionId,title?,section:{number,title},order?,level,viewOnly?,toSign?}`, moved with `exchange.shareDocuments({add,update,remove})`. `exchange.replaceDocument({groupId,expectedVersion,versionId,newVersionId})` keeps place and level and shows as Updated.
- **Reviewed writes** (one per action, `review_required`, a person confirms): `exchange.defineLevels`, `exchange.setLevels({exchangeId,levels,notify,email?,entered?,enteredNote?})`, `exchange.replaceDocument`, `exchange.answer({questionId,body,supersedes?})` (private), `exchange.publishAnswer({groupId,questionId?,question?,body,scope:"room"|"level",level?})` (shown as "A participant asked"; a question about a document reaches only its level), `exchange.approveDigest({groupId,expectedVersion,text|null})`, `exchange.archiveGroup`. They can carry same-action `records.propose` changes into the review and transaction.
- `setLevels` with `entered` and a required `enteredNote` records an entry step as met (e.g. a CDA signed elsewhere); the level opens as if completed.
- `exchange.acceptFile({fileId,notify:true})` on a signed-document slot emails the access-changed notice, shown in the review as sent.
- Reads: `exchange.listQuestions({groupId|exchangeId})`; room `exchange.status` adds levels, `openLevels`, per-document views, downloads, last seen and `history`.
- `tracking:{accessTypeId,engagementTypeId}`: access needs `status` and `last_seen_on`, engagement needs `document_ref` and `view_count`; other `dataroom.v1` fields are filled when present. The platform keeps them current (source `tracked`, no review) and nobody can edit those fields.
- Email types: `access_granted`, `access_changed`, `documents_updated` (the digest; automatic only after `approveDigest`), `question_answered`, `answer_published`, `access_ending`, `access_revoked`, `extended`; extra placeholders `{levels}` and `{documents}`. Operation emails appear in the review as sent; `email:{subject?,body?,overrides?,nameKind?,customName?}` edits them.

## External exchange: updates

Recurring updates use an update room: `exchange.createGroup({kind:"room",content,series?,seriesName?,tracking?:{deliveryTypeId?,responsesTypeId?}})`.

- **Content.** `content:{html,text?,asks?:[{key,text}],confidentiality?,preheader?}`. `html` may hold headings, paragraphs, lists, tables, quotes, figures, https or mailto links and safe inline styles (colours, fonts, spacing, borders, widths; no position, flex, grid, float, background images or rgba). Everything else (scripts, styles, frames, forms, SVG, event handlers, outside images) is removed. Images are PNG, JPEG or GIF documents as `<img src="doc:<versionId>" alt="…" width="…">`. Asks are placed with top-level `<div data-ask="key"></div>`, otherwise after the content. Sanitised HTML is at most 80 KB.
- `exchange.previewContent({content})` returns the sanitised result; `exchange.updateContent({groupId,expectedVersion,content})` replaces it (reviewed once the room has been seen).
- **Email type `update`.** Editable intro (`emailDefaults.update`), the content as email-safe HTML with an Outlook fallback and a plain-text part, the "View online" link, confidentiality text (`{recipient_name}` allowed) and sender footer. `exchange.prepareEmail({groupId,emailType:"update"})` returns `subject`, `text`, `html`, `headers` and `clientChecks` (Gmail, Outlook, Apple Mail, text part; empty when passing).
- **Series.** Updates of one schedule share a `series` key (e.g. `schedule:<record id>`) and `seriesName`. Each email carries one-click unsubscribe (List-Unsubscribe headers and footer link), recorded per address; later emails exclude it (`excluded` in `prepareEmail`, `unsubscribed` in the invite review). Nobody in the workspace can unsubscribe someone. Revoking one exchange hides only that update. `exchange.series({series})` lists updates and unsubscribes; `exchange.list({series})` filters groups.
- **Asks.** "I can help" with an optional note; nothing is recorded until the person confirms on the page. Each confirmation is one response, visible to the workspace only: `exchange.listResponses({groupId|exchangeId})`.
- **Delivery table** (`tracking.deliveryTypeId`, each exchange bound to its delivery `recordId`): needs `status` (`queued`, `sent`, `bounced`, `read`, `revoked`) and `read_count`; fills `sent_on`, `first_read_on`, `last_read_on`, `exchange_id` when present; these fields cannot be required.
- **Responses table** (`tracking.responsesTypeId`): needs `ask_key` and `responded_on`; fills `ask_text`, `message`, `delivery_id`, `exchange_id`, `response_id`, `source`, and copies `update_id`, `contact_id`, `investor_id`, `organization_id`, `person_id`, `version` from the delivery record; `status` starts at `new` when that option exists.
- Both are kept current without review (source `tracked`); other fields stay editable. `exchange.status` adds `delivery`, `responses`, `unsubscribed`.
- Assistants prepare content, intros and sends but never confirm. Recipient links (pages, asks, unsubscribe, images) reach them only as placeholders.

## App functions

Catalog entries and custom manifests may declare up to 10 read-only `functions`.

- Each has `name` (`^[a-z][a-z0-9_]{0,63}$`, unique), `purpose` (1–200 characters), `source` (function body, at most 90,000 characters, within the catalog file's 300,000-byte budget), `inputContract`, `outputContract` and `scope`.
- Contracts use `{type, required}`: `type` is `object`, `array`, `string`, `number`, `boolean`, `null` or `any`; `required` lists object keys. No other JSON Schema keywords.
- `scope` has `capabilities`, `roles` and `documents:false`. Capabilities: `tables.list`, `entities.read`, `entities.search`, `entities.facts`, `records.read`, `records.aggregate`, `views.list`. Roles resolve against installer roles or the manifest's `automationRoles`/bound `roles`, via an injected frozen `appRoles` map:

  ```js
  const rows = tools.call('records.read', {typeId: appRoles['radar.events'], limit: 100});
  return {context: JSON.stringify(rows)};
  ```

- Synchronous `tools.call`; no imports, network, documents or record changes. Table scope must fit the recipe's read bindings; `fields:"all"` follows current fields and access; excluded fields stay unreadable.
- A brief returns `{context}` (at most 64,000 serialized characters); an email summary returns `{nonEmpty, text, subject?}` (`text` at most 20,000 characters; `nonEmpty:false` sends nothing).
- Catalog `briefBinding`/`summaryBinding` must name a declared function; custom apps may name an existing reviewed execution binding. Approval pins the immutable revision and rejects write capabilities, document reads or grants. They run in the isolated function queue with its limits. Code is never stored in record fields.
- Unsafe declarations, duplicates, unknown roles and missing bindings fail approval. A missing optional helper leaves the app usable and the automation at Needs setup.
- Add app approval includes helper purposes and creates immutable pinned revisions without grants; a persistence failure rolls back the installation. `read_app_template` shows purposes, scopes and contracts; `includeFunctionSource:true` adds code.
- Revisions keep helpers and bindings; omitting `execution` keeps them, and removing one needs an explicit execution list (dependent automations retire). Copies get fresh revisions with remapped references and disabled automations without write grants. Reinstalls create fresh revisions; later catalog versions never replace installed code. Generic write functions and connectors keep their reviewed paths.

## Permissions for helpers, connectors and results

- App-level access, set by the owner in Access, is the outer boundary. Bindings, database and field restrictions, assistant rights, connector permissions and the exact approved action or grant only narrow it.
- Function and connector writes use reviewed action paths with authorization, expiry, revocation and receipts; app edit access does not approve external writes or unattended runs.
- `research.briefBinding` and `email.summaryBinding` are read-only; record-changing helpers belong in approved write actions.
- Research and drafting store results in the app database. The install or setup approval includes the scoped, bounded, expiring create/update grants within writable bindings and the assistant's current access; no separate opt-in. Preparation alone grants nothing. Missing writable storage means Needs setup. Legacy monitors and read-only tests keep their behaviour.

## Automation declarations

Contract: `src/automations/recipes-schema.ts`. Requires `APP_AUTOMATION_RECIPES_ENABLED=true`. Declarations ship in a new draft version and never change approved versions or installations.

- `recommendedAutomations` (at most ten install offers) and `automationFeatures` (at most thirty later features).
- Each recipe: unique `key` across both lists, `name`, `description`, `trigger`, and `research`, `email` or both in that order; `lifetimeDays` 1–365 (default 365).
- Triggers: calendar, once, `record_date` with `role`, `database` with `role`, or `{kind:"after",recipe:"research_key",when:"meaningful"}`. Monthly: `monthRule:{kind:"weekday",nth:1..5,weekday:0..6}` or `{kind:"business_day",nth:1..5}` (Monday–Friday, no holidays; missing fifth weekdays are skipped). Date recipes catch up over seven local days using the occurrence ledger.
- Research: `objective`, `instructions`, `sourcePolicy`, `readBindings:[{role,fields}]`, optional `writeBindings` (otherwise currently writable fields).
- Email: `subject`, `text`, and per-record `fields` only for standalone record emails.
- No other installation's table or automation IDs. Install resolves roles; custom manifests may give `automationRoles:{role:tableId}`. Record-specific features declare `contextRole` matching the trigger role and go in `automationFeatures` only.
- `email.memberField` names a field holding a registered member UUID; blank uses selected recipients (owner by default). Record email addresses never permit sending. Access is rechecked at delivery.
- Missing bindings leave setup pending or blocked without failing the app.

## Research then email, and run-time fields

- Research plus email in one recipe is one automation: one popup row ("Research, then email"), one Automations card with both connectors, one switch.
- The email runs after each completed run: `email.when` `"meaningful"` (default: verified writes or typed relevant findings) or `"completed"` (every completed run, including a report with no new findings). It cannot use `memberField` or record `fields`; content comes from `summaryBinding` or `{{run.*}}`.
- No-update, partial, failed and test runs send nothing; a failed email never reruns research. Editing research keeps the step attached. A separate `{kind:"after"}` recipe is its own automation, reviewed again after research changes.
- `fields:"all"` in `readBindings` and `writeBindings` covers every field the app binds on that table now or later, minus `exceptFields`, resolved at every run against current bindings and access. Field additions, renames and hiding need no re-approval and do not pause the automation. Calculated, read-only and excepted fields are never written. Put user-owned fields (notes, watches, dismissals, review status) in `exceptFields`. Removing the table or changing access still blocks or retires the work. Explicit field lists keep exact-schema behaviour.

## Installing and setting up automations

- **Install.** Pre-built automations are popup rows, selected by default; the owner can opt out or edit timing. Add app saves app, data, access and the exact selections with no further approval; a worker sets them up afterwards, and the app opens while setup is pending. A data save is not automation consent.
- **Failures** (connections, access, recipients, bindings, limits) never corrupt the app or roll back data; the automation shows Needs setup. Reconnection, restore or replay never revives a paused definition. Reuse each copy's or feature record's existing definition.
- **Later setup.** Automations → From app features, or `read_app_automation_features`, `read_app_automation_feature_contexts`, `prepare_app_automation_feature`, then `show_review` so the person approves the exact review. `list_app_automation_setups` lists incomplete setup; `cancel_app_automation_setup` cancels it on request.
- **Custom automations.** Save the app first; research via `prepare_app_monitoring`, deterministic or email work via `prepare_app_action`. Reuse IDs and a stable `authoringKey`. Inspect with `list_app_automations`, `read_app_automation`, `read_app_automation_history`, `read_app_automation_guide`. New research uses `inheritAppAccess:true`; confirmation creates result-write grants atomically or reuses approved scopes.
- **Activation** of a disabled definition: `prepare_app_automation_control` and `show_review` for its exact review, when the user asked; the person approves it.
- **Self-email:** email step `to:"account"`, resolved from the authenticated account.
- **Setup checks.** `read_automation_setup` at first use, app creation, new automations, reconnection and repair. Complete authorized setup or offer the resumable handoff; respect declines and pauses; never fabricate host IDs, callbacks or tool names. Task tools take no model parameters.
- **Checklist:** define the workflow → connect or reuse the runner (research only) → save and enable the automation and each follow-up → verify with `read_app_automation_readiness` → report.
- **Runner.** Research runs on the selected ChatGPT or Claude runner, which fetches the stored instructions when TrialAgents schedules work; no host task per app. Email always runs through TrialAgents. Without subscription support, setup stays pending; there is no polling fallback.
- Legacy per-app host tasks: `read_app_monitoring_guide(mode:"legacy")`; pause and detach before migration. Copies inherit no monitoring or permissions.

## Running research

- Read a required brief with `read_app_monitor_brief` until ready; it never widens objective, sources or write scope.
- Save findings through the run's approved scopes and verify receipts before `completed`, with typed `findings`. Chat replies do not replace records.
- `no_update` when there is nothing new and silence is allowed (complete coverage only); `blocked` or `partial` when saving fails. A required report with no findings is `completed`.
- Partial work never advances coverage or drops earlier receipts. Read-only tests never write or email.

## Email notifications

- One delivery step, separate from assistants, functions and connectors. Triggers: calendar every N days, weeks or months; entry creation; an explicit field transition. No sub-daily intervals or "any update" rules.
- The backend waits two minutes after changes, combines work, rechecks state and access, and cancels obsolete notifications.
- Limits: one app email per normalized recipient per rolling hour, 15 recipient deliveries per account per rolling 24 hours, one calendar slot per rule, recipient and local date. Extra work waits; only abnormal queue growth suspends a rule.
- Recipients are selected registered members with current app and data access (owner by default). Address columns never authorize mail.
- Database rules fire on transition into the condition; resolved or deleted entries send nothing; automated writes do not trigger research.
- Digests use summary bindings or research email steps; no app scheduler, and assistant email tools never bypass these rules.
- Timezone, start date, weekdays, month-end handling and interval are trigger settings; scopes, expiry, source policies, catch-up and limits stay in backend configuration and survive edits with the enabled state.
- Test runs send to the signed-in account, are marked as tests, and keep production settings; research tests write nothing and trigger no follow-ups. A queued test is not a delivery.

## Automation continuity, management and Logs

- Disabled definitions stay listed and editable; editing never re-enables them. No standalone Delete. Archiving suspends work; restore and copy do not activate it.
- Apps make no automation reads on load, navigation or saves and never depend on scheduler or email availability.
- Schedule and prompt changes update the stored definition, not the host subscription; completed receipts are kept.
- Enabled describes the definition, not runner readiness, execution or delivery.
- Outcomes go to Logs; diagnostics stay in the private setup flow. Logs filter by app, project, outcome and category, and CSV uses the same filters. Unattributed older events are not guessed. Metadata never exposes prompts, payloads or diagnostics.
- Report separately: app saved; access; definition saved and enabled or disabled; connection readiness; next eligible run; actual completion and write receipts.

## Choosing an automation pattern

- **None.** Valid; every app works without automation.
- **Research.** One app-linked monitor with an explicit trigger; instructions define sources, inclusion and exclusion, evidence dates and links, deduplication, destination and completion.
- **Standalone email.** One approved email action, daily or slower, on entry creation or a field transition, dispatched without an assistant decision. Email templates do not scan tables or research.
- **Research plus email.** One recipe. The platform creates a follow-up with `trigger.kind:"database"`, `source:"automation_runs"`, the saved producer ID and version, and status becoming `completed`. No second schedule; no research rerun on delivery failure. A separate alert is a distinct `after` recipe on the same completion.
- **Processing then review.** Save the result plus a status transition (e.g. `review_status: pending → ready`) and fire a database email rule on it, without a completion email as well.
- One delivery path per handoff. Reuse a meaningful status, assignee or revision field instead of a send-email flag.
- Long LLM or API calls use durable connector jobs. Templates never embed provider keys or send email.

## Template package requirements

- Catalog JSON lives at `templates/apps/<id>-<version>.json` with stable IDs and semantic versions; changes ship as new versions. The raw-file digest protects preparation. Installed apps keep their source and configuration and are never migrated without their owners, with one exception: a version its publisher declares `speedOnly` and that changes nothing but the code (same tables, options, defaults and helpers) reaches unchanged copies automatically, with a revision and an audit entry. A new major version lists the versions it upgrades in `upgradeFrom` (same tables and helpers); an owner of an installed copy upgrades it on the website, and its records, table connections and settings carry across.
- Required: `id`, `version`, `name`, `description`, `tags`, `whenToUse`, `whenNotToUse`, `engine`, validated `options`/`defaults` or tracker configuration schema, and `source` when the engine needs it.
- `instructions`: discovery, setup, configuration, preview, approval, update and recovery, referring to the usage and automation guides. Everything an assistant needs is in `instructions` and `documentation`; repo-only files are not available over MCP.
- `documentation.quickStart` (ordered steps, inputs, defaults); `dataContract` (fields, relationships, scalar or multiple, required fields, display names versus IDs, persistence, bindings, section IDs and inheritance, or that there is no database); `interactionContract` (supported controls, confirmation, cancellation; automations managed on the platform); `lifecycle` (preview versus saved app, revisions, stable identities, retries and receipts, disabled state, archive suspension, no automatic resume); `limitations` (unsupported features, pending activation, model settings, delivery dependencies, fallbacks); `examples` (at most five, with expected behaviour); `tasks` (`mode` `optional` or `none`, scenarios, reads, outputs, trigger, sources, deduplication, scope, limits, completion, and `promptExample`, required even for `mode:"none"`). Task metadata is never an active definition or authorization.
- No customer data, credentials, bearer links or account IDs.
- Limits include a 300,000-byte catalog file, 180,000-character source, 20,000-character `instructions` and 6,000-character documentation prose fields; the schema in `src/workspace/app-templates.ts` is authoritative. One malformed entry can break discovery of the whole catalog.

## Publication sequence

1. **Validate the whole catalog** against the current schema before UI work.
2. **Prove the host boundary**: read the exact version and digest, prepare through `AppTemplates.operation`, run the prepared source in real QuickJS against reviewed database fixtures and the production frame with bindings and manifest. Never strip declarations, remove the manifest, weaken the sanitizer or rewrite source in tests. Mocks include denied and partial reads and stale versions; offline previews are not acceptance.
3. **Package reproducibly** under `templates/source/<slug>/` (source, CSS, metadata, schema and mappings, setup instructions, QA). Generate the catalog JSON deterministically, wire the builder's `--check` into the build, and discover the version through the real loader.
4. **Record what passed**: commands, outcomes, fixture scope and unverified boundaries. Failed, cancelled or timed-out tests are not passes.
5. **Preserve existing users**: new semantic versions only. Only approved catalog versions are visible; new ones start as drafts needing publisher approval. Server-served catalog and guidance ship with the deployment; plugin packages need their own release.

## Performance and caching

- Record workflows configure the standard tracker and its shared renderer; copied renderer source misses shared fixes.
- Runtime caches are instance-local and authorized, keyed by app, version, route, filters, page and state, and invalidated on access or version change. Nothing is shared across users or apps, mutations are never cached and freshness checks are never skipped. Server permission and schema reuse lasts one request; records and counts are not cached server-side. Access is never widened for speed.

## Selecting and preparing a template

1. Inspect existing apps with `read_account_home` and the catalog with `list_app_templates`; an explicit request to reuse an app wins. Broaden a narrow search before concluding nothing fits.
2. Read the template with `read_app_template` (`whenToUse`, `whenNotToUse`, `instructions`, `documentation`, configuration schema, examples). These never grant access or approve writes. Use custom source when nothing fits.
3. Inspect only the schema and data needed; reuse suitable tables. Verify field kinds, scalar settings, snake_case keys, select values and UUID mappings; resolve gaps in the documentation before preparing.
4. Call `prepare_app_from_template` with the exact ID, version and digest, name, configuration and bindings, and one `requestKey`. Correct it with `replacesPreviewId` and `expectedDigest`, never a second app.
5. Check the preview and its design-quality result. The person saves it in the approval footer, which opens the installation popup. Confirm the saved receipt and app ID before reporting it saved; reconcile after ambiguous responses.
6. For later edits, see Revising an existing app.

Current guidance: `read_app_template_guidance` (e.g. `authoring`, `usage`, `contracts`), following every `nextOffset`.
