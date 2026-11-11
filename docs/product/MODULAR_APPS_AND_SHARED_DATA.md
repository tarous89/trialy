# Modular apps and shared data

**Status:** Roadmap requirement and design rule, 11 November 2026. Applies to every catalog template (starting with the [biotech v2 apps](app-template-blueprints/BIOTECH_v2.md): [Runway](app-template-blueprints/apps/RUNWAY.md), [Programs](app-template-blueprints/apps/PROGRAMS.md)) and to custom apps built by Claude or ChatGPT. Existing platform contracts still apply: [app lifecycle and data preservation](APP_CONFIGURATION_AND_AUTOMATIONS.md#lifecycle-and-data-preservation), [app deletion and part removal](../APP_SERVICES.md#app-deletion-and-part-removal), [shared data](../SHARED_DATA.md), [access control](../ACCESS_CONTROL.md).

## 1. Requirement

Users must be able to use **one or all** of the apps, in any order; **delete** some later; **reinstall** them; and **customize** them (rename, hide or remove tabs, add fields). Apps that share data must stay connected while installed, and **no app may break or lose data when another app, tab or table is removed**.

## 2. Decision: data belongs to the workspace, apps are views over it

Two simple options were considered and rejected:

| Option | Problem |
|---|---|
| **Every app keeps its own tables and links/syncs copies** | Duplicate records (the same CRO in four apps), sync conflicts, no single truth, extra writes and reviews. |
| **Reuse tables and forbid deleting any table that an app ever used** | Users can never clean up; deleted apps leave locked data behind; it hides rather than solves ownership. |

**Chosen model:** tables are workspace data, not app property. Apps bind to them. Three classes of table, each with clear rules:

| Class | Examples | Created by | Who may write | On app deletion |
|---|---|---|---|---|
| **Core shared tables** — one per workspace, standard keys | organizations, people, programs, studies, agreements | The first app that needs them (or the user in Database) | Any authorized app, through its own reviewed writes | Always kept |
| **App tables** — one app's private working data | Runway `plan_lines`, Programs `raid` | The app at install | Only that app (and the user in Database) | Kept, marked "not used by any app" |
| **App outputs** — read-only results meant for other apps | Runway `month_closes` snapshots, Programs `reports`, Programs key milestones (`plan_items.is_key`) | The owning app | Only the owning app | Kept; consumers degrade gracefully |

This matches what the platform already guarantees: app deletion does not cascade into shared database data; removing a tab retires its app-owned automations but deletes no records; unused **empty** fields may be cleaned up, while fields protected by other bindings stay.

## 3. Rules for every template

1. **Reuse, never copy.** At install, look for existing core tables and connect to them by default. Never create a second organizations or programs table when a compatible one exists. The user can still choose "separate data" explicitly (e.g. a confidential program).
2. **Cross-app references only point to core tables or app outputs**, never into another app's private tables. Store references as stable record IDs.
3. **Every app works alone.** Any feature that uses another app's data (e.g. cash at milestone in Programs) must: check the table exists and is readable; hide itself with a short explanation when not; show "unavailable" for referenced records that were archived, deleted or are not permitted; never error, block loading or show partial data as complete.
4. **Shared schemas only grow.** Apps may add optional fields to core tables only if the [core data contract](#4-core-data-contract-v1) lists them. Never rename, retype or remove a core field. App-specific data about a shared record goes into the app's own table keyed by that record's ID (extension-table pattern).
5. **Stable role keys.** Each table a template binds has a stable role key (e.g. `programs`, `runway.plan_lines`) and a contract version. The same keys are used on install, reinstall and when a removed tab is added back.
6. **Removing a tab unbinds; it never deletes.** Data stays; dependent features in other apps degrade per rule 3. Re-adding the tab reconnects the same tables.
7. **Removing an app archives it and keeps its data.** The dialog lists the tables that stay in Database and which other apps still use them. Fields and tables nobody uses any more are archived, not removed (see §6); permanent deletion is a separate owner action; core tables with data are never deleted from an app dialog.
8. **Reinstall reconnects by default.** If retained tables for the same template and role keys exist, offer "Reconnect your previous data (N records)" (default) or "Start fresh". Schema differences are applied as additive, reviewed changes.
9. **Acceptance test in every template:** install alone; install with its partner apps; delete a partner app; remove one tab; reinstall. The app must keep working with correct, explicitly labelled data in each step.

## 4. Core data contract v1

Standard role keys and fields that all templates share (scalar, lowercase snake_case, `archived` boolean on each). Fields marked *(app: X)* are optional fields owned by that app; other apps may read but not write them.

| Role key | Fields |
|---|---|
| `organizations` | name*, org_type (company / investor / cro / cdmo / site / funder / partner / agency / other), country, website, archived |
| `people` | name*, organization_id, title, email, archived (professional contacts only) |
| `programs` | name*, code, indication, modality, stage*, lead, status (active / paused / stopped / partnered), archived; health, health_rationale, health_date *(app: Programs)* |
| `studies` | name*, program_id, phase, registry_id (EU CT or NCT number), status, archived |
| `agreements` | name*, counterparty_id, agreement_type, status, effective_date, expiry_date, archived *(primary owner: Contracts)* |

Documents use the platform document records. New core roles are added only when at least two apps need the same record type; changes to this contract are versioned (v1, v2…) and additive.

## 5. Platform work (roadmap)

Verify current behaviour first; build only what is missing.

| # | Item | Notes |
|---|---|---|
| 1 | **Table role metadata** (role key, template id, contract version) stored on tables bound by templates | Enables detection at install/reinstall; may reuse existing table mappings. |
| 2 | **Install detection** of compatible core tables and retained app tables, with "connect existing" as default | Builds on the existing explicit new-table / existing-table choice. **Core and optional roles implemented with Programs 2.0.0** (`sharedTableCandidates` in `src/workspace/template-catalog.ts`): detection reads role keys from live apps' `tableMap`; retained app tables of archived apps are still reached through restore. |
| 3 | **Delete-app dialog** listing retained tables and their other users | Data preservation already holds; this makes it visible. |
| 4 | **"Not used by any app" label** for unbound tables in Database, with archive as the first cleanup step | |
| 5 | **Table deletion guard:** owner-only; blocked while any active app binds the table (list them); warns about inbound references from other tables; archive preferred | Confirm current table-deletion behaviour before implementing. |
| 6 | **Reinstall reconnect** flow with additive, reviewed schema upgrade | |
| 7 | **Template validation:** core roles use contract keys and kinds; cross-app references only to core tables or outputs | Add to the authoring preflight. |
| 8 | **Authoring guidance:** add rules 1–9 and the extension-table pattern to `templates/TEMPLATE_AUTHORING.md` (keep both guidance copies and `templateGuidance.version` in sync) | |
| 10 | **Role-based connections** (late connection, custom-app roles, contract registry, single writer, versions) | See §7. **Implemented** (migration 061, `src/workspace/role-contracts.ts`, `src/workspace/data-access.ts`): the data access step and gaps 7.1–7.5. |
| 9 | **Archive-first lifecycle and PR #117 amendment** | See §6. Highest priority: archiving an app must not remove fields. Implemented in migration 060; see [Archive first](../APP_SERVICES.md#archive-first-migration-060). |

Until items 1–6 ship, templates follow the rules manually: reuse via the install-time existing-table choice, graceful degradation in code, and no deletion of data by any app action.

## 6. Archive first: apps, automations and database

**Principle:** nothing a user created is permanently removed by a side effect. Removing an app, tab, automation, table or field **archives** it: hidden from normal lists, data and history intact, restorable. Permanent deletion is a separate, explicit owner action on archived items, or an automatic purge only of items that are both **empty and unused** after a retention period.

| Object | "Remove" does | Restore | Permanent deletion |
|---|---|---|---|
| App | Archive (already `archive_component`) | `restore_component`, with its tabs, bindings and automations (disabled) | Owner, from the archived list, after confirming what stays |
| Tab | Unbind; data stays | Re-add the tab: same role keys reconnect | Not applicable |
| Automation | Disable / archive with the app (no standalone delete, as today) | Restored **disabled**; owner re-enables after review | Not offered |
| Field | **Archive** when no live or archived app, view, link, scope, function, connector, automation or cross-table link uses it | Automatic when an app binds it again (inside that app's reviewed save) | Empty + unused + archived ≥ 90 days → automatic purge allowed; otherwise owner action |
| Table | **Archive** when all its fields are archived or no binding uses it | Automatic when an app binds it again | Same rule as fields; never for core tables with data |
| Record | Archive (`archived` flag, as today) | Unarchive | Owner-only, as today |

### Archived items in the interface

Same pattern on **Apps**, **Automations** and **Database** (tables, and fields on a table's page):

- **Entry point:** one subtle, light-text link at the bottom of the page's list: "Show archived apps (3)" / "Show archived automations (2)" / "Show archived tables (1)" / "Show archived fields (4)". Shown **only when the count is above zero** and **only to people who can restore those items** (workspace owners; for apps also the app's owner). Others never see archived items, counts or names.
- **Expanded view:** the archived items appear **below** the normal list, in the same layout, columns and styling, visually muted. Actions per item: **Restore** and **Delete**. The link changes to "Hide archived". The expanded state is remembered for the session.
- **Accessibility:** "pale" is done with a muted surface, lighter borders and icons, and an "Archived" label on each item. Text stays at least at the muted-ink contrast of the design system (≥ 4.5:1); state is never shown by colour alone. Keyboard and screen-reader accessible; same on mobile.
- **Exclusions:** archived items are left out of search, totals, charts, exports, pickers and assistant listings by default. MCP list tools return them only on an explicit include-archived request by an authorized owner.
- **Restore:** brings back the item with its links; automations come back **disabled**. Restoring an automation archived together with its app happens by restoring the app. A name clash adds "(restored)". If something the item depends on was permanently deleted, restore says exactly what is unavailable and proceeds only after the user confirms.
- **Delete:** a confirmation lists what will be removed and what stays (e.g. "Deleting this app keeps its 3 tables and 412 records in Database"). For fields and tables, Delete is **enabled only when the item is empty and unused**; otherwise it is disabled with a one-line reason (e.g. "Contains 58 values" or "Used by archived app Runway"). Items scheduled for automatic purge show "Deletes automatically on 12 Feb 2027" in the same light text.
- **Assistants:** Claude and ChatGPT may list archived items for an authorized owner and prepare a restore for review. Permanent deletion is always a human action in the platform, never an assistant action.
- **Templates:** installing a template whose app is archived first offers "Restore your archived Runway app" before creating a new one.
- **Logs:** archive, restore, permanent delete and automatic purge are recorded in Logs and the audit trail.

### Review of PR #117 (migration 059, `src/workspace/app-cleanup.ts`)

PR #117 retires automations whose data bindings were removed and, in the same app save, **removes unused empty fields** from schemas (an all-empty schema becomes an invisible table identity). Its dependency check (`trialy_security.unused_app_fields`) is thorough — it looks at every owner's records including archived rows, other apps, derived fields, views, links, scopes, functions, connectors and automations — and should be kept. Three behaviours conflict with this design and should be amended:

1. **Cleanup also runs on `archive_component`.** Archiving ("deleting") an app immediately removes the empty fields only it used, so a later `restore_component` points at fields that no longer exist. Archive must stay fully reversible.
2. **Archived apps do not protect fields** (the check only counts `NOT c.archived` components). Bindings of archived apps must count as in use until the app is permanently deleted.
3. **Automations of archived apps are soft-deleted** (`deleted_at` set on monitors/actions) rather than suspended, so they cannot be restored with the app. They should be disabled and marked suspended-by-archive, then restored disabled.

**Amendment (to build in Claude Code, with tests):**
- Do not call `cleanupRemovedAppFields` on `archive_component`.
- Treat archived apps' bindings as users in `unused_app_fields`.
- Replace field removal with **field archiving** (new archived state on fields and tables, hidden by default in Database and pickers, values retained); un-archive automatically when a reviewed app save binds them again.
- Add an owner-only "Delete permanently" for archived, empty, unused fields/tables, and an optional scheduled purge of items that stayed empty, unused and archived for 90 days.
- On app archive, suspend (not delete) its automations; on restore, bring them back disabled.
- Keep everything else from #117: retiring workflows whose bindings were removed, cancelling queued work, no record or audit deletion, owner/schema rights required.
- Tests: archive → restore app keeps all fields and automations (disabled); remove tab → re-add tab reconnects; field used by an archived app is not archived; purge never touches populated or bound items; cross-owner and RLS cases from #117 still pass.

## 7. Role-based connections (standard for all apps)

**Rule:** apps never depend on which other app is installed, or on installing apps together. They depend only on **role keys with a versioned contract** (e.g. `organizations` core.v1, `runway.month_closes` runway.v2, `dataroom.engagement` dataroom.v1). Any app — catalog template or custom version built by Claude or ChatGPT — that binds a table under the same role key with a compatible contract connects automatically, in any install order.

**Built before §7 (Runway 2.1.0, Programs 2.0.0, template installer):** installer schemas mark roles with `contract`, `optional` and `readOnly`; Use connects each role to an existing compatible table that a live app binds under the same role key; reuse is the default; optional roles are never created; missing optional contract fields are added for writable roles.

**Gaps (platform work).** Implemented; see the implementation status below the table.

| # | Gap | Design |
|---|---|---|
| 7.1 | **Late connection.** If app A declares an optional role (e.g. Programs → `runway.month_closes`) and the providing app B is installed *later*, A is not connected. | Handled by the **Data access step** below, shown whenever any app is added or saved. Nothing connects silently. Apps left unconnected show a reviewed "Connect" action in their empty state, which opens the same step. |
| 7.2 | **Custom apps declaring roles.** Role keys and contracts exist for templates; custom apps need the same. | Allow `role`, `contract`, `optional`, `readOnly` on any app binding manifest (`prepare_app`, revisions). The server validates contract compatibility (field keys, kinds, cardinality, options, required fields) exactly as template reuse does. |
| 7.3 | **Contract registry.** Custom apps must know the exact fields of each role. | Publish core contracts and every app output contract in one place (this document §4 for core; each app scope for its outputs), exposed read-only through the template guidance so assistants can build compatible custom apps. |
| 7.4 | **One writer per output role.** Two apps must not both write `dataroom.engagement`. | The first live app binding an output role writable is its writer; another app may bind it read-only. A custom replacement can take over writing only when the current writer is archived or permanently deleted, with an explicit owner choice. Core roles stay multi-writer. |
| 7.5 | **Contract versions.** | Additive changes keep the version compatible; a breaking change is a new version (v2) and apps declare which versions they read. Readers of v1 keep working when the writer moves to v2 only if v2 is a superset. |

**Implementation status (11 November 2026).**

- **7.1 Late connection:** the installer now records every installer role with a contract as a role label on the app manifest (`manifest.roles`), including optional roles that stay unconnected. Section 2 of the data access step offers each live app that declares an unconnected optional role this app provides; Connect binds it in a reviewed app save of that app (bindings, manifest fields, role label and, for catalog apps, `templateConfiguration.tableMap` and `templateBindings`). The step can be opened for a saved app (`componentId`), which is the reviewed "Connect" action: the platform's Access tab lists remembered "Do not connect" choices with **Connect**. An in-app empty-state button for sandboxed apps is not yet wired; apps keep their rule 3 note.
- **7.2 Custom apps declaring roles:** any app manifest accepts `roles: [{role, contract, reads?, optional?, readOnly?, typeId?, fields?}]` (`prepare_app`, revisions, every save). The server validates role keys (core roles must exist in the core contract; app roles are namespaced, e.g. `myapp.items`), the contract version against the registry, `readOnly` (no write fields), and field compatibility exactly as template reuse does: kinds, cardinality, options and required fields (`role_incompatible` names the mismatch). A role whose table is unbound (a removed tab) is simply not connected. Running apps can read their connected roles with `roles.list`.
- **7.3 Contract registry:** `templates/core-contract/v1.json` (core) and `templates/contracts/outputs.json` (outputs: `runway.month_closes` runway.v2, `programs.reports` programs.v2, `fundraise.tranches` fundraise.v1, `dataroom.access_grants` and `dataroom.engagement` dataroom.v1; and `programs.plan_items` programs.v2 published for readers of key milestones). Read-only through the template guidance: `read_app_template_guidance(resource:"contracts")`, following `nextOffset`.
- **7.4 One writer per output role:** migration 061 adds `role_writers`. The first app that binds an output table writable becomes its writer; another live app is refused (`role_writer_exists`) and may bind it read-only. When the writer is archived or permanently deleted, a replacement takes over only with `roleWriterTakeover:[role]` on its save, by a workspace owner (`role_writer_takeover`). App writes to an output table from any other app are refused (`role_writer`), so a restored former writer reads but does not write. People editing in Database are unaffected. Core roles and `kind:"app"` roles stay multi-writer.
- **7.5 Contract versions:** apps declare `contract` (and optionally `reads`, the versions they read). A reader connects to a table whose writer uses a version it reads, or a newer version that is a superset (every field of the read version, same kind, cardinality and options). A writer moving to a version that is not a superset of what its readers read is refused (`contract_breaks_readers`).

### Data access step (routine for every app add or save)

One standard popup, shown whenever an app is **added (installed, created, copied, restored) or saved** with data bindings that are new or changed. Same layout and styling as the platform **Access** tab (Projects → app → parts, Database → tables → columns pattern, same rows, toggles and badges). No extra wizard.

1. **Existing data this app can use.** One row per role the app declares that matches an existing table: table name, role, which apps already use it, what the app would do (Read or Read & write), record count if the user may see it. Per row: **Connect** (default for core roles and compatible optional roles) or **Do not connect** (for core roles this means "use separate data", which creates a new table).
2. **Other apps that can use this app's data.** One row per live app that declares an optional role this app now provides (late connection, gap 7.1), with the read access it would get. Per row: **Connect** or **Do not connect**.
3. **Who can use this app.** The same controls as the Access tab: team members and roles (view / edit), and **workers** — each user's Claude and ChatGPT connections and automation runners — with read / propose / no access. Defaults: inherit the project's current access; assistants read and propose.
4. **Footer:** a one-line summary ("Connects 3 tables, gives Programs read access to 1, team access unchanged"), then **Save** / **Cancel**. Save commits app, connections and access in one reviewed transaction; Cancel changes nothing.

Rules: the step lists only what the current user is allowed to grant; restricted tables appear as "restricted" without counts. "Do not connect" is remembered for that app and role (not asked again on every save) until the user chooses "Connect" from the app or the Access tab. When nothing is new, the step is skipped. Inside ChatGPT or Claude the same step is shown in the platform's review view; assistants can prepare it but never confirm it. Every choice is logged.

Every app keeps rule 3: when a role is not connected or not readable, the feature that uses it hides itself with a short note and a reviewed "Connect" action where possible.

**Implementation (11 November 2026).** `read_data_access` / `prepare_data_access` build the step for a target: an app preview (`previewId` + `digest`: new app, revision, copy, restore), a template installation (`install`), or a saved app (`componentId`, the explicit Connect). It is needed for every add, for saves whose bindings or role labels changed, and whenever section 1 or 2 has rows; otherwise Save stays the plain save. The step's digest covers its rows and current access; Save (`confirm_data_access`) recomputes it inside one transaction and refuses a stale review, then commits the app (installer, preview confirm or nothing), each connection as a reviewed app save, remembered choices (migration 061 `app_role_choices`) and access changes through the Access tab's own rules (`AccessGrid.save`), and logs every choice (`workspace.data_access_step`). For a core role at install, "Do not connect" reads **Use separate data** and creates a new table. Section 3 lists non-owner members (No access / Can view / Can edit) and the ChatGPT and Claude connections with their automation runners (No access / Read / Read and propose); new apps inherit the project's access. Inside ChatGPT or Claude the step is shown in the same review view: assistants call `prepare_data_access` (stores proposed choices that prefill the review) and cannot confirm; `confirm_data_access` is an app-only action of the Save button, and access changes there stay a signed-in owner action on the website. Web Use, the first-save and revision footers, Duplicate, and restoring an archived app all open the step. Tests: `tests/data-access.test.ts` (both install orders, a custom app providing a role, a remembered "Do not connect", archiving the writer, assistant boundary, contract versions).
