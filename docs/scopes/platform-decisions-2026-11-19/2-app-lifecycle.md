# Code review notes: App lifecycle, installation and versions (A3, A6, A9, A12–A15, I1–I5, U4, U5, G9, P11, B1, B2)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Produced by reading the code at commit `376f29d` on 19 November 2026; nothing was run. Line numbers refer to that commit. Where these notes list open questions, the scope's **Defaults adopted** section gives the answer to build to.

Gap analysis: app lifecycle, installation and versions. All paths are under `/home/user/trialy/`. Read-only; nothing was run or changed. Sizes: S under half a day, M 1–2 days, L 3+ days.

## 1. Current flow

1. Assistant creation: `prepare_app` / `prepare_app_from_template` (`src/server/apps.ts:76-79`) → `prepareRenderedTracker` (`src/workspace/service.ts:451-493`) writes a private row in `workspace_previews` with `reviewState:'draft'`.
2. `finalize_app_preview` (`service.ts:514-531`) marks it `ready` and displays it; `confirm_workspace_change` (`service.ts:914-941`) saves it. The MCP tool sets `actionConfirmed:true`, so the assistant can confirm itself (`src/server/workspace-foundation.ts:141`).
3. Pending state on the server: `workspace_previews` is per user, has a 24-hour expiry and no origin or app columns (`migrations/017_workspace_foundation.sql:13-16`). A row is hidden when any workspace access changes (`service.ts:891`, `911`).
4. Pending state on the client is React state only: `trackerPreview` (`src/embed/main.tsx:86`) and `proposal` (`src/shared/StandaloneApp.tsx:22`).
5. Footer: `PreviewApprovalFooter` is "First publication only" (`src/shared/PreviewApprovalFooter.tsx:5`) and renders only for a new app inside `TrackerDraft.tsx:35`. Revisions get an inline "Save changes / Ignore changes" block; record proposals get a modal (`StandaloneApp.tsx:41`).
6. Catalog install: Use → archived-app restore offer (`src/shared/TemplateCatalog.tsx:21,28`) → `read_data_access` → the "Use existing data?" dialog (`src/shared/DataAccessStep.tsx:10-37`) → `confirmDataAccess` (`src/workspace/data-access.ts:84-124`) → `installCatalogApp` (`src/workspace/template-catalog.ts:39-103`), one transaction, idempotent on `requestKey`.
7. The dialog is skipped when nothing is "needed" (`DataAccessStep.tsx:45`, `data-access.ts:63`). There is no project choice; the app lands in the default project (`service.ts:904`).
8. Versions: every save snapshots into `revisions`. `restore_component` rolls back to an earlier one (`src/workspace/schema.ts:75`, `service.ts:842,1058`; UI "Review recovery" at `src/shared/ComponentEditor.tsx:47`).
9. Catalog update: website only, manual, one app at a time, offered to workspace owner or editor (`src/workspace/app-update.ts:24-50`, `src/shared/AppUpdate.tsx:6-10`).
10. Apps list: `src/workspace/home.ts:21-39` merges components, every function, external links, legacy automations and (assistant callers only) new-app previews.

## 2. Per decision

**A6 · Approval footer — L** (with B1)
- Current: three different controls, no cross-app, cross-session or cross-device presence, 24-hour expiry.
- Data model (S): add `origin`, `assistant`, `component_id`, `change_class` (new / revision / assistant) and `review_group` to `workspace_previews`. App previews get no expiry. The comment at `service.ts:488` says preview bodies are immutable to the runtime role, so new columns need matching grants.
- Server (M):
  - Account-wide read of pending app changes; the Home revision stamp already covers previews (`src/workspace/home-revision.ts:27`).
  - Narrow `accessStamp` to the app and project.
  - On a base-version mismatch, mark the preview "needs re-preparation" instead of hiding it.
  - Stop `beginAppUpdate` and `prepareRenderedTracker` silently deleting ready previews (`service.ts:487,499`).
- Web and embedded UI (L): one `PendingChangesFooter` mounted in `src/shared/ui/WorkspaceShell.tsx`, which web, standalone app and embed all use. Labels by `change_class`: Save/Discard, Publish/Discard, Approve/Decline. Remove the inline block (`TrackerDraft.tsx:35`), the modal (`StandaloneApp.tsx:41`) and the embed `PageActions` for app operations (`embed/main.tsx:183`).
- MCP (S): `finalize_app_preview` description says "Save and Ignore controls" (`workspace-foundation.ts:99`); update it and `resources/workspace/WORKSPACE.md:63-82,116`.
- Tests (M): `tests/preview-lifecycle.test.ts`, `tests/previews.test.ts`, visual `app-continuity`, `native-saving`, `save-refresh`.

**I2, I3 · One installation popup — L**
- Current: the dialog exists only for catalog installs. It has no project selector, no app purpose and no team default; access is per person and only for a human workspace owner (`data-access.ts:36-45`). It is not shown for assistant-built apps (`TrackerDraft.tsx:26-28` confirms directly) and never re-shown for revisions. It is bypassed when not "needed". A separate restore offer precedes it.
- Server (M):
  - Generalize `dataAccessStep` into `installationStep(target = template | previewId)` returning project options, team default, table rows and automations.
  - Compute `installationImpact(before, op)` (binding, access and automation diff; `src/workspace/app-review.ts:3-17` is the starting point) and store it on the preview.
  - `confirm` refuses app operations with non-empty impact unless reviewed installation choices and a step digest are supplied; human only.
- UI (M–L): rebuild `DataAccessDialog` as `InstallationPopup` with name and purpose, then three sections in order, expandable detail, one Install and one Cancel. Always show it on first Save. Remove the fallback path.
- MCP (S): `install_app_template`, `confirm_data_access`, `prepare_data_access` descriptions. `WORKSPACE.md:116` currently says "Do not ask users to select a project", which contradicts I2.
- Tests (M): `tests/data-access.test.ts`, `tests/template-catalog.test.ts`, visual `platform-catalog`, `app-templates`, `automation-recipes`.

**I4 · Table connections — M**
- Current: Connect / Create new per role exists; candidates are filtered for access, archive state and compatibility (`template-catalog.ts:112-140`).
- Gaps: no source app or Read / Read-write label on the row (the server already has `apps` and `readOnly`). Unavailable candidates are dropped instead of shown as unavailable. A save that binds archived tables or fields restores them implicitly (`service.ts:140,156,1060`).
- Changes: return unavailable candidates with a reason; replace the implicit restore with a blocking "unavailable"; default cross-app links to read-only with explicit write opt-in.

**I5 · Assistant-built connections — M**
- Current: `prepare_app` binds whatever tables the assistant names (`src/workspace/apps.ts:8`); there is no accept-or-replace step.
- Changes: the preview carries per-binding `suggested` and `alternative: new` (new-table definitions as in `create_tracker` setup); the popup resolves them; the server rebinds at confirm and re-renders. Update `templates/TEMPLATE_USAGE.md` and the `prepare_app` description.

**I1 · Projects, no folders — M**
- Current: `nodeKind` accepts `folder|project` (`schema.ts:48`); a parent must be a folder (`service.ts:589-591`); the UI offers Folder (`src/shared/ProjectsPanel.tsx:53,64`); the sidebar has no Projects entry (`WorkspaceShell.tsx:14-18`); the guide mentions folders (`WORKSPACE.md:144,210`).
- Migration: flatten. Child projects move to top level and take the intersected restrictions of their parent chain (logic at `service.ts:81-84`); folders are archived; the check constraint is tightened.
- Server: reject `folder`. UI: add a Projects destination, remove the folder controls. MCP: `list_workspace_projects` and `prepare_workspace_change` text.
- Tests: `tests/workspace.test.ts`, `tests/default-project-repair.test.ts`.

**A12 · No rollback — S**
- Remove `restore_component` from the schema, validation and apply, the "Review recovery" button (`ComponentEditor.tsx:47`) and the tool text (`workspace-foundation.ts:168`). Keep `read_component_history` read-only.
- Tests: `workspace.test.ts`, `write-authorization.test.ts`.

**A9 · Restore only from archived lists — S–M**
- Remove the install-time restore offer (`TemplateCatalog.tsx:21,28`) and the `archived_app_available` 409 (`template-catalog.ts:53`).
- Remove the implicit schema restore on app save (see I4).
- Keep `list_archived_items`. Automations today restore only together with their app (`src/workspace/archive.ts:55`); a standalone archived-automations list belongs to the automations area.

**A13 · Dependency warnings — L** (M in this area)
- Current: role-contract validation at save (`service.ts:831`). A database trigger silently retires automations whose bindings or helpers an app save removes (`migrations/071_app_function_dependencies.sql:2-49`). I found no impact report in table-change validation (`src/domain/service.ts:181-187`).
- Server: an `impactReport` built from `trialy_security.archived_item_usage`, role tables, cross-table links, mappings and automation configs, filtered to the caller's access. Return it from the `prepare_*` calls only when non-empty; recompute at `confirm` and block unresolved breaking changes.
- MCP: guide text. Tests: new suite plus `automation-steps-and-fields.test.ts`.

**A3 · Owner-only code and catalog updates — M** (after roles)
- `canUpdate` is workspace owner or editor (`app-update.ts:50`); the Settings menu is shown to everyone with access (`ComponentEditor.tsx:45`); code-save gating is `componentSourcePolicy` (`service.ts:114-124`), not app ownership.
- Switch all three to the app-owner check from the roles area.

**P11 · Automatic speed updates — M–L**
- Current: no automatic or bulk path. "Customized" is detectable today: the code body after the two generated lines is not byte-equal to any approved version (`src/workspace/catalog-source.ts:12`, `src/workspace/app-templates.ts:59`). Layout and option changes live in the config line and are preserved by an update.
- Data model: a publisher-declared `update_kind='speed'` per catalog version (`app_template_catalog` plus `templates/catalog-seed.json`), cross-checked by the existing same-schema, options, helpers and defaults test (`app-update.ts:33-37`).
- Server: a worker job applying updates under a system authorization, with revision and audit. `confirm` requires a current user action today (`service.ts:914`), so this needs a new path.
- UI: a header "updated" status. Tests: extend `tests/app-update.test.ts`.

**U4 · Platform admin pages — M**
- Current: Automations accepts `?appId=` (`src/web/main.tsx:163`); Logs has an `appId` filter but no deep link (`src/shared/LogsPanel.tsx:6`); Access opens through the `tracker:access` action (`src/shared/FrontendCodeRuntime.tsx:95`). App links to platform pages are rejected by `resolveAppLink` (`src/shared/app-links.ts:36-41`).
- Changes: one documented `platform:access|logs|automations` link contract in the frame and both hosts; a Logs deep link; guidance.

**U5 · Feature settings, owners only — S–M** (after roles)
- Gate settings and layout proposals (`service.ts:374`) and the Settings menu on app owner. The Layout item's granular controls should move out of the standard configuration page; that overlaps the authoring area.

**A14 · Minimal context — S**
- `viewContextText` sends app name and version, route, section, table id and name, up to 80 field names, 25 selected record ids, scopes, `editing` and `hasUnsavedChanges` (`src/embed/view-context.ts:6-11`).
- Reduce to view/tab plus app id (and workspace id). The website's assistant link embeds app name and URL (`StandaloneApp.tsx:35`). Tests: `tests/embedded-view-context.test.ts`.

**A15 · Display once, after the first response — S** (plus a plugin release)
- "Before anything else" or "first call" appears in: `src/server/workspace-guidance.ts:17,20`; `WORKSPACE.md:7,61,79,122`; `plugin/claude/trialagents-platform/skills/trialagents/SKILL.md:21`; `plugin/trialy/skills/trialy-workspace/SKILL.md:12`; tool descriptions at `src/server/mcp.ts:65-66` and `src/server/apps.ts:78`.
- Rewrite all of them. Tests: `tests/plugin-release.test.ts`.

**G9 · Catalog — S** on top of I2
- Assistants reach the catalog through `prepare_app_from_template`; `install_app_template` is visible to the UI only (`apps.ts:65`). Route finalize → popup and adjust the guidance.

## 3. Bugs

**B1 — root cause**
- The server row exists, but nothing reloads it. Navigation clears the client state (`embed/main.tsx:106,145,166`; `StandaloneApp.tsx:44-46`).
- Opening an app resolves only the published component (`src/workspace/apps.ts:21-26`).
- Home lists previews only for assistant callers and only for new apps (`home.ts:35-37`).
- Rows expire after 24 hours and vanish on any access change.
- "Retry loading" is the fixed 8-second timer at `FrontendCodeRuntime.tsx:215`.
- Fix: the A6 work, plus opening an app attaches its pending preview. Replace the timer with progress-aware handling (performance area). Keep the existing receipt replay (`service.ts:913`) so a retry never resubmits; `TrackerDraft.tsx:27` already retries only the reload.

**B2 — root cause**
- `foundation_functions` has no app column; the link exists only in the revision body's `scope.appId` (`src/foundation/service.ts:48-54`).
- Home pushes every function as an automation entry (`home.ts:24-27`).
- `materializeAppFunctions` inserts a new function row whenever a helper changes and never retires the old one (`src/workspace/app-functions.ts:28-29`), so orphans accumulate.
- Fix:
  - Migration: add `app_id` and `retired_at`; backfill `app_id` from the revision body; mark rows no longer referenced by their app's `execution` as retired; clear their `home_project_id` placements.
  - `saveAppFunction` sets `app_id` and retires the replaced row.
  - Home excludes app helpers; `read_app_automation` lists them under their app.
  - No deletes, because audit and revisions reference these rows.
- `tests/home-archived-helpers.test.ts` currently asserts helpers are listed and must be inverted.
- Install retries are already idempotent on `requestKey` (`template-catalog.ts:47-48`), but the key lives in page memory (`TemplateCatalog.tsx:13`). Derive it from the pending installation so a reload cannot duplicate.

## 4. Build order and dependencies

1. B2, A12, A9, A14, A15 — independent and small.
2. I1 — the popup needs the project list.
3. Preview data model, then A6 and B1.
4. I2/I3, then I4 and I5, then G9.
5. A13 — shares the impact computation with step 4.
6. A3 and U5, then P11.
7. U4.

Cross-area:
- Roles: app owner, team-default Editor, and a human-only Approve (the assistant can confirm today).
- Automations: recipe section, archived-automation list, standalone functions and legacy automations on Apps (`home.ts:29`), dependency data.
- Performance: load timeout, P11 release classification.
- Authoring: U4 link contract, U5 settings scope, final catalog pass.

## 5. Risks and open questions

Risks:
- Auto-update bumps the app version, so open sessions and pending previews go stale; the footer needs a re-prepare state.
- An installed copy counts as catalog code only while its version stays approved (`catalog-source.ts:17-22`); withdrawing versions early breaks both opening and updating.
- Folder flattening can widen access if the migration does not copy inherited restrictions down.
- The popup becomes a server-enforced gate, so 16 catalog integration tests and the embedded hosts must move together.
- Installed plugin skills lag behind server instructions until a plugin release.

Questions for the product owner:
1. **Speed-only:** who classifies a catalog version? Default: a publisher flag per version, approved with the version and machine-checked for unchanged tables, options and helpers.
2. **Customized:** default is "code differs from every published version"; layout and option changes do not count.
3. **"One response":** not identifiable over MCP. Default: all of a user's pending assistant app changes in a workspace form one review, listed per app.
4. **Pending lifetime:** default is no expiry for app changes, but a change whose base version moved must be re-prepared rather than approved blind.
5. **Existing folders:** default is flatten and archive them, keeping restrictions.
6. **Archived fields:** A9 names only apps, automations and tables. Default: keep field restore inside the Database archived list.

### Critical Files for Implementation
- /home/user/trialy/src/workspace/service.ts
- /home/user/trialy/src/workspace/data-access.ts
- /home/user/trialy/src/shared/DataAccessStep.tsx
- /home/user/trialy/src/shared/ui/WorkspaceShell.tsx
- /home/user/trialy/src/workspace/home.ts
