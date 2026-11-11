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
| 2 | **Install detection** of compatible core tables and retained app tables, with "connect existing" as default | Builds on the existing explicit new-table / existing-table choice. |
| 3 | **Delete-app dialog** listing retained tables and their other users | Data preservation already holds; this makes it visible. |
| 4 | **"Not used by any app" label** for unbound tables in Database, with archive as the first cleanup step | |
| 5 | **Table deletion guard:** owner-only; blocked while any active app binds the table (list them); warns about inbound references from other tables; archive preferred | Confirm current table-deletion behaviour before implementing. |
| 6 | **Reinstall reconnect** flow with additive, reviewed schema upgrade | |
| 7 | **Template validation:** core roles use contract keys and kinds; cross-app references only to core tables or outputs | Add to the authoring preflight. |
| 8 | **Authoring guidance:** add rules 1–9 and the extension-table pattern to `templates/TEMPLATE_AUTHORING.md` (keep both guidance copies and `templateGuidance.version` in sync) | |

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

