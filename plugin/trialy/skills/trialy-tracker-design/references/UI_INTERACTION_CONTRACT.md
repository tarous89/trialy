# Immutable universal tracker interface and interaction contract

Read before generating or revising *any* tracker. This captures approved decisions from repeated design iterations and is not CRO-specific. **These are standard interactions, not optional inspiration.** A user may explicitly supersede a standard; otherwise preserve it exactly across trackers.

## Table of contents
1. Tracker page anatomy
2. Main table, sizing and scrolling
3. Inline edits and save behavior
4. Fixed Details column and drawer
5. Add record and linked record creation
6. Full-page tracker Settings > Layout
7. Full-page tracker Settings > Access control
8. Row and tab display/derived overview
9. Responsive and accessibility behavior
10. Implementation integrity

## 1. Tracker page anatomy

Default composition:

```text
[Title]
[One-line subtitle about the particular objective]
[Tab 1] [Tab 2] [Tab 3] [Tab 4] ...                      [settings icon only]

[Optional overview metrics and urgent next-actions; Overview only]

[Search] [relevant filter(s)] [sort/rank if appropriate]   [+ Add record]
[Table: immediately meaningful visible columns ...] [Details (fixed right)]
[complete rows; full page scrolls vertically]
```

- Do **not** include a second tracker-owned global header, Trialy logo, app sidebar or special navigation buttons; the host can supply them later.
- Do not show “interactive prototype” taglines or extraneous labels. A short fictionality/local-demo footnote may be used where materially necessary.
- The tracker title and short subtitle are left-aligned. Business context (service, asset, work package) belongs in title/subtitle or specific data fields, not redundant always-visible summary cards.
- Show exactly user-required tabs; for the vendor example, Overview / Vendors / RFP / Qualification / Contracting. For other domains derive tabs from actual need.
- Put **an unboxed icon-only Settings control at the same level as the tabs** on the far right; slight hover/focus state only. Never put it beside Add record. Use the approved sliders/controls style, not an ambiguous faint settings outline or prominent colored tile.
- Any additions to the standard header, persistent sidebar, decorative action controls, unexplained exports/history buttons or styles panel require a new user decision.

## 2. Main table behavior

- One clean, full-width table is the default per tab. Visible columns should focus on 4–6 most important fields, while preserving other underlying fields as hidden and in details/settings.
- The first visible data column (name/title) is an ordinary editable field, NOT a detail-navigation hotspot.
- **Keep the table's rightmost Details column pinned/sticky horizontally**. Header label **“Details”** uses exactly the same typography, weight and color as other header labels. Expand control is larger (~24 px glyph), single outward-corner arrow, centered inside its cell with no persistent button background/border. Every row gets the expand control.
- The rightmost pinned column must remain visible during horizontal scrolling and must not cover the last data column. Recheck sticky offset, cell background and z-index in scrolled states.
- **No inner vertical table scrollbars.** Render all applicable rows (or page/chunk them explicitly if the dataset is large); the **document/page is the vertical scroll container**. Horizontal overflow belongs to the table itself. Never apply a table container `max-height` with `overflow-y:auto` as the default.
- Preserve interactive horizontal **column-width drag resize** and **row-height resize**. Do not add decorative handles around each cell. Width/height presentation changes must not mutate underlying record data.
- Search works on relevant displayed/authorized values. Filters by meaningful domain states, regions/categories/owners etc. where applicable. Sort by named supported fields, dates or manual ranks. A manual rank is separate from an algorithmic score.
- Retain accessible empty states, stable sorting and no fabricated items. Re-render after edits without losing deliberate search/filter context. Do not reset all filters on a tab switch unless user requested it.
- Status pills use consistent semantic color families and accessible text; color is not the only indicator.
- **Source** is a standard **visible column in every tracker table**, with the same Source field available in Details and Layout > Columns. Use `—` or an explicitly missing value when not yet sourced. Default to URL/text linked documents, not upload controls. Do not hide Source by default; only user-requested customization may hide it.

## 3. Inline editing and pending-state discipline

- Every *permitted* table field and permitted detail field is directly editable by clicking it, including the **first column**. Non-editable derived values, identity keys, audit evidence and permission-blocked fields are visibly read-only.
- Editing a cell must NOT implicitly open its Details drawer. Editing the drawer must NOT cause a second independent copy to diverge.
- Mark pending changes with the approved **light green fill** (`#e5f6e9` in original base, or closest existing theme green for pending state) and subtle inset border. Pending changes remain obvious in both table and drawer.
- Show save/update/merge actions in a **dark floating footer**, fixed below the content: one concise sentence, one primary CTA, and a quiet accessible dismiss control whenever edits are pending. No Advanced/reload panel or extra instructions above the title. Use `+ Add record` consistently rather than “Add vendor,” “Add RFP,” etc. Tab context supplies the record type. Do not add Save buttons to every cell.
- `Ignore edits` must restore the exact pre-edit values and clear the pending highlight and controls; `Save edits` must commit only the reviewed, permitted changed fields and update all bound views. Retain errors/pending drafts on failed authorization or stale values—never claim success early.
- In the standalone HTML demo, memory-local persistence is an illustration only; explicit messages must not imply a database commit. In Trialy-connected usage, every change requires the platform's exact approval path or an applicable revocable, narrowly scoped data-type grant. Manual typing is not a backend commit.
- Use appropriate editors for data type: text, numeric, date, boolean, select, relationship reference, URL/source and computed code where allowed. Do not sprinkle unrelated date/calendar icons or superfluous dropdown chevrons just for aesthetics.
- Changes that affect derived Overview stats or other tabs should recompute from committed/staged records in a clear, predictable way. A preview may show proposed consequences but must not masquerade as committed state.
- Data changes and *presentation* changes are different destinations. Renaming a visible column must never silently rename an existing database key, and editing a computed cell must edit inputs or calculation definition through proper review, not overwrite a calculated output.

## 4. Record Details drawer

- Open **only** from the far-right `Details` expand control (or an explicit details action). Expand icon: a clear **single outward-corner arrow** (not two opposed arrows). It should remain visually subtle with transparent button background and larger click target.
- Drawer slides from the right, with normal **thin vertical divider line** instead of box shadow. No shadow along the left side. Dim backdrop lightly as in approved reference.
- Drawer starts at readable width but can **be dragged wider by its left edge**. Keep reasonable min/max bounds; at narrow viewports use the full available width. Provide keyboard-adjustable alternative/focus for resizer if supported.
- Show record title and all authorized relevant fields in a simple vertical editable form. Do not inject permanent “engagement details / financial snapshot / sourcing history” side-panels or duplicative tables.
- Ensure field values in the drawer are bound to the same record identity and schema as their table counterparts. Hidden table columns remain available here unless restricted by permissions.
- Support **Duplicate** and **Delete** actions inside record details. Duplication produces a *new identity* and copies only permitted appropriate values; do not clone audit identity, approval history, timestamps or unique keys. Relationship references need clear policy (retain, clear or review) and may require user confirmation. Delete requires confirmation, performs linked-record checks, and uses soft archive/review where permanent deletion is unsafe. Never silently remove source originals, dependent contracts or audit evidence.
- Close/discard behavior: do not drop unsaved edits without warning or clear choice; reflect updates back into the main table.

## 5. Adding records and linked records

- Universal button label: **Add record**. The form opens the same familiar right-side editor and supports only the minimum practical fields at creation.
- Relationship picker searches existing permitted records. Always offer **Create new [type]** for a suitable editable relationship. Opening it must preserve the parent unsaved form, open the related type's editor, save/approve the related record as required, return to the parent, and select the newly created authorized record. Handle cancellation without losing the parent draft.
- Do not show the same relationship twice in columns or detail records (e.g., linked vendor ID and copied vendor name as two “Vendor” fields). Resolve the display name through a stable relation.
- Creation/duplication should respect natural inclusion criteria: a new contact has a relationship context; a new qualified supplier may require a separate review.

## 6. Settings is a *full-page* view with two tabs

- The Settings control opens a **dedicated full-page layout**, not a small drawer/modal, showing clear back navigation and a Save settings / Discard changes pair.
- **Only** `Layout` and `Access control` appear. The user explicitly removed `Style` until requirements are clearer. Do not resurrect an extra Theme/Style section to adjust the approved baseline by default.
- Keep ample breathing room around inputs: a dropdown never touches its neighboring dropdown; labels have space above fields; add-new sections have distinct top margin and separation. Ensure desktop and mobile stacking with no collisions.

### Layout: metadata
- Name input first, **description below it** (never side-by-side). Both editable.
- Editing this name affects tracker-facing metadata, not an unrelated shared entity name.

### Layout: tabs
- Display each tab once as an **inline editable name**; not one static name plus a second input.
- Use a compact show/hide selector for each tab. Color **Hidden** with a slightly gray background to make it apparent, not a warning color.
- **Drag tab rows up or down** using a visible subdued drag handle; no numeric position/order input. Provide keyboard up/down behavior where possible. Reorder only configuration, not records.
- `Add new tab`: input and action with sufficient spacing. Pressing Enter should create the tab immediately in the current Settings draft and keep the edit flow clear; do not silently commit it to authoritative storage.
- Newly created tab begins with no invented business data; prompt for appropriate linked record/view definition or let user build it.

### Layout: columns
- Select the target tab with a control separated clearly from the column row list below.
- **Show ALL fields associated with this tab's underlying record/view**, not only those currently visible in its table. Include fields found in record details as hidden rows. Respect access: hidden from layout because of permissions is different from hidden from *presentation*.
- For each column show exactly one directly editable **Display label**, a **Value type**, a **Show/Hide** control, and drag-to-order handle. No duplicated static name plus edit box. No numeric ordering inputs. No separate default width text input (width is controlled on the table itself).
- Value types may include text, long text, number, money, date, boolean, select, relation/person/organization, URL/source/document reference, and `computed/code` where the platform supports isolated safe evaluation.
- Existing database-backed fields retain a stable **backend type/field ID**; user-visible labels may be changed in UI configuration without migrating underlying source. If a type conversion is requested, route it through schema change validation and review, not a risky cosmetic dropdown edit.
- Show data-derived/calculated fields read-only when appropriate. Do not silently overwrite a formula or invent a code execution capability.
- **Add column** must be available, proposing an appropriate field/view calculation or new schema field through reviewed workflow. When linking existing common data, prefer a relation/lookup rather than duplicating fields.
- Hidden column selection must be visually gray and its current visibility immediately reflected in preview after the settings save.
- All columns—even Source, linked names, detail-only data—must have a unique identity, unambiguous label, binding and visibility state.

## 7. Access control — universal, granular and conservative

### Membership

- At top of Access control show **Tracker owner(s)** with an obviously strong **dark teal Owner** color, distinguishable from Viewer blue. Support multiple owners subject to verified permission and transfer/revocation safeguards.
- Show the members or authorized team(s) with their **overall access**. Master roles: `Owner`, `Editor`, `Viewer`, `Custom` (and absence/no membership where required by backend). Use permission-colored controls.
- Owner is not just another Viewer; it has administration/ownership authority. Never allow a self-locked-out owner via an unsupported override.
- A general Editor can view/edit eligible editable tracker records; Viewer can view eligible records but not edit; Owner can manage membership/settings within actual backend authority. A person may have a narrower or broader explicit per-tab/per-column grant only within effective workspace, data-type and human/model permissions.

### Granular tab/column overrides

- For **each person**, choose a tab and optionally a column, then select **Can edit**, **Can view**, or **Restricted**.
- **Populate controls with the concrete effective permission based on the person's role**. Do NOT show “Inherit role” as the human-visible dropdown selection.
- On selecting an individual permission differing from that person's base role, set their visible **overall role to Custom automatically**. **Do not add another Custom tag/badge beside the individual permission**.
- Distinguish explicit overrides from inherited defaults internally; the UI displays resolved `Can edit`, `Can view` or `Restricted`. An override remains visible/auditable when it differs from the base. If all overrides are removed/reset, resolve the displayed master role back to the prior Editor/Viewer base as appropriate; do not lose the underlying base role simply because Custom is shown.
- **Effective access order:** current backend/tenant/field/document/AI restrictions impose the ceiling; within tracker UI, resolve explicit **column override > tab override > tracker membership role**. Hidden column presentation is not a permission policy. Restricted always removes that user's visibility/edit to the specific scope. Explicit tab Viewer override removes edit ability in that tab despite global Editor role. A global Viewer may gain editing for one field only when backend independently authorizes such a grant.
- When a tab is Restricted, the user's effective column access there cannot be elevated by a visual-only column selector unless an independently valid backend model supports that specific scoped exception; default to **deny if any higher enforced layer denies**. Do not present an impossible permission as enforceable.
- Permission config changes require authorized review, version checks, audit history and enforcement by the backend, not CSS hiding or JavaScript alone. A local HTML demo must disclose it is illustrative outside the UI or in the delivered explanation.

### Permission colors (from approved Theme 2)

| Role / status | Background | Foreground | Border / cue |
| --- | --- | --- | --- |
| Owner | `#123941` | `#ffffff` | dark teal; strongest |
| Editor / Can edit | `#b9edcd` | `#075a39` | `#8bcba8` |
| Viewer / Can view | `#c4ddff` | `#1d5186` | `#8cbaeb` |
| Custom (overall role only) | `#e3d3ff` | `#59308f` | `#c3a0ef` |
| Restricted | `#ffcfc8` | `#932b25` | `#e6a69c` |
| Hidden presentation | `#dce5e1` | `#455956` | `#b4c4bc` |

Do not introduce new permission colors. Color remains secondary to explicit words.

## 8. Overview and standard visuals

- Overview stats should be **derived from each relevant underlying tab**, not free-floating figures or prefilled guesses. Counts should agree after Add/Edit/Delete and filter changes where appropriate; explain their scope.
- Dark, elegant summary cards with small existing-theme icons only **when meaningful**. Show open risks, missing information, overdue actions, decisions, follow-up queues. Exclude completed/quiet rows from the "needs attention" overview table by default.
- Graphs only when data and actual decision justify them; the first usable tracker can be all tables.
- Labels use existing neutral/green/amber/red/blue (and purple for the Custom permission role) colors; map semantic statuses consistently. Do not use colored tags merely as ornament.
- Avoid automatic score/rank systems. If evaluation is appropriate, define domain criteria with actual evidence and distinguish eligibility/qualification gates from preferences.

## 9. Responsive behavior and accessibility

- Preserve page-level vertical scroll on desktop and mobile. Tables scroll horizontally with fixed right Details control, touch targets large enough to click/tap.
- On narrow screens, stack filters and settings fields without colliding selectors; drawer becomes width-constrained/full-width but should remain closable.
- Provide visible hover/focus styles for icon-only Settings and Details controls; supply useful `aria-label` even when visual label isn't present. Header row still says `Details` visibly.
- Drag reorder must have keyboard alternative. Modal/drawer focus should be restored on close. Escape cancels/backs out safely when applicable.
- Text/labels must have adequate contrast; never rely only on green pending fill, red restricted, or amber warning colors to convey state.

## 10. Engineering integrity

- Preserve stable record IDs, type IDs, relation IDs and unchanged source fields when changing view labels or order.
- Do not implement tab-specific duplicated data arrays as the authoritative state; connect each tab view to shared store/query.
- Tab-visibility and column-visibility affect layout only. Team permissions are enforced on read, filter, aggregation, export, detail, source link and write endpoints too.
- For local HTML demos, editable in-memory data is permitted as clearly marked sample behavior. For connected Trialy, use backend services that enforce current actor identity, rights, stale-write prevention and exact approvals.
- Recompute permissions after every membership, project move, component edit, schema change and source binding change; revocation is not just UI styling.
- When modifying previously approved HTML, preserve existing UX details **byte-for-byte wherever possible**. A seemingly small style change must not rearrange action controls, resurrect unused tabs or silently change business logic.

### Current host refinement

Keep the host header and dark action footer fixed. The tracker document is the only vertical scroller; tables may scroll horizontally but must not have an independent vertical height/scrollbar. The row-details surface fills at least the full available viewport, even for a one-row table. Its content uses that same document scroller. Local tabs/search/sort/details/layout interactions must not wait for the server. Each empty data tab gets one clearly labeled, display-only fictional example with typed values and meaningful tint pills. User instructions override these defaults.
