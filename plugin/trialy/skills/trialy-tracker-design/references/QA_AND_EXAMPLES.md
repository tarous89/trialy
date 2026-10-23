# Quality gates, regression protocol and cross-domain examples

Read before declaring a tracker done. This is a *testing contract* and reusable user-journey harness, not a set of domain-specific prescribed screens.

## 1. Completion gates (all relevant items required)

### A. Concept and business meaning

- [ ] Can a user describe the tracked objective in one sentence?
- [ ] Does each tab answer a different useful question and lead to an action, update, decision, or evidence?
- [ ] Is the unit of work coherent: a deliverable tracker, an operational register or an overview/rollup?
- [ ] Are essential fields included, while specialized items depend on actual domain needs and nice-to-haves are deferred?
- [ ] Does sample data tell **one internally consistent fictional story** (same scope, IDs, dates, relationships)?
- [ ] Are there no duplicated visible references disguised as separate fields (e.g., CRO name twice)?
- [ ] Are all summary counts, budgets and dates derived from actual sample/current data rather than separately hardcoded?
- [ ] Does Overview show only open actions, missing updates or decisions rather than completed/no-action noise?

### B. Shared data and cross-tracker mechanics

- [ ] Every record has a stable identity; shared entities aren't cloned for each tab or context.
- [ ] Relation-specific facts (proposal/rank/suitability/role) are not written into global name/profile fields.
- [ ] Every editable column has a binding to a stable data field or a defined view-level presentation config.
- [ ] Every field in record details, including hidden fields, appears in Layout > Columns with correct identity, type, and visibility; no silently inaccessible mystery fields.
- [ ] Changing a display label doesn't rename the backend field; reordering tabs/columns doesn't move underlying records.
- [ ] Source is a visible column on **every** tracker table and present in details/layout: link/reference/text or `—` if missing; version/observed date when relevant and access checked.
- [ ] Unknown fields remain unknown; planned, observed, derived, committed and historical facts are distinguished.
- [ ] Cross-tracker lookups and permissions are explicit and source-aware; no fictional sync between component arrays.

### C. Standard page and table design

- [ ] No tracker-owned logo/header/sidebar/extra export/history controls or unexplained generic stats panels.
- [ ] Title, subtitle, tabs and **unboxed Settings icon at tab level**.
- [ ] Search, justified filters, sort/manual ranking when needed, **Add record**.
- [ ] Full-page vertical scroll and table-only horizontal overflow; **no vertical table scroll**.
- [ ] Every row's first editable cell, including name/title, actually edits when clicked.
- [ ] A fixed rightmost **Details** column remains visible during horizontal scroll; label same size/color/weight as all headers.
- [ ] Icon is large single outward-corner expand arrow (~24px) on transparent/unboxed control.
- [ ] Columns and rows can be resized; layout stays legible after resizing; new widths don't change record content.
- [ ] Theme 2 exact color family, readable 15–16px data/controls, dark ink and vivid status labels; hidden selectors gray.
- [ ] No gratuitous icons attached to dates/dropdowns; keyboard focus on icon-only actions.

### D. Editing / record details

- [ ] Clicking a data cell edits; it does not open details. Clicking the right Details expand control opens drawer.
- [ ] Drawer can be dragged wider and does **not** cast side shadow; it has a thin separator line.
- [ ] Details supports editing of allowed fields; fields agree with table values and layout bindings.
- [ ] Edited fields turn green immediately; Save edits and Ignore edits appear **beside Add record**.
- [ ] Ignore restores *exact* last saved values. Save persists only authorized exact changes; success status appears only after receipt.
- [ ] Failed saves (missing access, stale version, invalid data) do not discard pending edits or claim success.
- [ ] Drawer supports Duplicate and Delete; new duplicate ID; unique keys/audit never cloned; confirmation and linked-record protection for Delete.
- [ ] Add record is consistent across tabs; linked record picker offers Create new [type], returns to original form with selection and preserves input on cancel.

### E. Full-page Settings / Layout

- [ ] Settings is its own full-page view with Back, Save settings, Discard changes.
- [ ] It has **only Layout and Access control**, no Style tab.
- [ ] Name above Description; sufficient whitespace around all fields/sections.
- [ ] Tabs have a *single* editable name each; drag handle reorders; visibility show/hide; keyboard reorder alternative.
- [ ] New tab can be entered/added by pressing Enter; draft immediately appears in list.
- [ ] Columns include **all** visible and hidden/detail fields; one editable display label each, correct type, show/hide, drag ordering; no numbered position or width fields.
- [ ] New column creation exists with appropriate type choices; type changes to linked DB fields are controlled schema operations.
- [ ] Hiding a tab or column is purely a view change, not a permission grant or deletion.

### F. Settings / Access control

- [ ] Owner visible and **distinct strong dark teal**, with ability to add other owners through actual authorized process.
- [ ] Membership roles Owner, Editor, Viewer, Custom; defaults are expressed as **Can edit/Can view/Restricted** at individual scopes, not “Inherit role.”
- [ ] Override a tab or column permission for a user: master automatically becomes **Custom**; no extra Custom badge beside granular controls.
- [ ] Exact role colors: Owner dark teal, Editor green, Viewer blue, Custom purple, Restricted red, Hidden gray.
- [ ] Test Editor -> one field Can view; Viewer -> one field Can edit; any user -> one tab Restricted, subject to *actual backend permission ceilings*.
- [ ] Test effective precedence: backend denies take priority; otherwise applicable column override > tab override > base membership. Reverting overrides restores prior master base role when appropriate.
- [ ] Restricted content is inaccessible through details, filters, calculations, hidden fields, source links, direct endpoints and code bindings.
- [ ] No false statement that a local standalone HTML setting grants backend access.

### G. Forms, visualization, automation and production boundary

- [ ] External form submissions remain staged until accepted/approved; an accepted update changes the same database record used by tracker/visualization.
- [ ] Metrics reflect current accessible data; snapshot mode and filters obvious; no invented spend breakdown.
- [ ] Scheduled/event actions have current grants, idempotency, visible failure/stop states and exact effect authorization.
- [ ] Email/calendar or provider actions are implemented **only if a verified connector exists**; no fake “sent” status.
- [ ] Actor, data, source and permission changes are versioned/auditable where platform supports it.
- [ ] Avoid regulated-system equivalence claims (eTMF, eQMS, Part 11, official submissions, pharmacovigilance) without validated tooling and authoritative integrations.

### H. Technical and visual checks

- [ ] File opens without broken script/CSS; no runtime console errors.
- [ ] Desktop, narrow desktop and mobile layouts are readable; Settings dropdowns do not touch; no horizontal page overflow outside intended table viewport.
- [ ] Every tab tested with nonempty and empty data; filter/sort/search and manual rank tested; changing a row updates Overview correctly.
- [ ] Perform checks of row/column resize and full-page scrolling even after many records.
- [ ] Tab and column drag-drop tested; settings name/description/edit/show/hide/new tab/new column tested.
- [ ] Duplicate/delete, relation creation from parent form, focus restoration and pending-change discard tested.
- [ ] Color contrast and keyboard focus are usable; status meaning doesn't rely on color alone.
- [ ] User asked for a narrow edit? Diff against the exact previous version, reject any unrelated DOM/JS/layout/theme change.
- [ ] Record what was actually verified, what remains untested, and whether output is HTML demo vs connected production.

## 2. Test cases that prove generalization

Do not hardcode these specifics; feed them as sample prompts when testing the skill's behavior in a new domain.

| Test prompt | Expected business adaptation | Immutable UI test |
| --- | --- | --- |
| “Track our CRO sourcing for one Phase I PK/PD study.” | Candidate vendors, project-specific RFP receipt/sending/follow-ups, PK/PD proposal comparison, manual rank and scoped contracting | Same 5-tab UX if requested; first CRO cell editable, pinned Details, source field |
| “Manage GLP toxicology study execution.” | Study protocols, materials readiness, in-life milestone and audited reports, owner and dependencies; GLP-specific only where relevant | Same UI/edit and Access; no vendor qualification/PK table copied |
| “Track CMC GMP batch readiness.” | Manufacturing slots, analytical release, stability/material dependencies; linked CDMO | Same UI; no fabricated budget chart; actions in Overview |
| “Manage departmental budget commitments and invoices.” | Cost center, committed vs approved vs invoiced vs paid, currency and approvals, finance-specific restrictions | Same theme/settings; no false payment actions |
| “Track our fundraising round.” | Investor pipeline, next outreach, diligence checklist, legally meaningful closing; sensitive permissions | Same details and inline edit; access fields appropriately narrowed |
| “Build an onboarding tracker for staff.” | Employee start, access provisioning, training/document checklists, HR-confidential fields | Same protected Access resolution; no patient data assumptions |
| “Prepare quarterly board action tracking.” | Board agenda, decision authority, meeting materials and action follow-ups; dates with meeting history | Same responsive tabs, source links, per-column visible/hidden controls |
| “Create a read-only executive dashboard across trackers.” | Derived authorized workstream statuses and urgent next steps; no new authoritative data | Reuse Theme 2 visualization style; disable edits legitimately while still respecting access |

**Failing generalization signals:** every generated tracker has Vendors/RFP/Qualification columns, every domain gets a budget/scorecard, all tasks receive exactly five tabs, every metric is an invented chart, Settings loses owner overrides, or a label rename changes shared data schema.

## 3. Decision/report template for future work

For planning, use compact output:

1. **Story:** one representative user's task and outcome (plain language).
2. **Scope:** one deliverable tracker, register or overview; include exact parent context only when relevant.
3. **Tabs:** tab name -> question it answers -> primary table/action -> visible essential fields. Mark specialized alternatives, defer nice-to-have items.
4. **Shared records:** canonical entities, context-specific relations, sources, calculated values and cross-tracker links.
5. **Exceptions:** domain-specific regulatory/quality/commercial permissions or compliance boundaries.
6. **Example:** one consistent set of fictional records covering start, decision, next action and completion (only if requested).
7. **Build/QA:** actual artifact/integration and what tests passed, plus honest boundaries.

For requested HTML builds, **deliver the working HTML**, not just the plan. Preserve the approved tracker shell, details drawer, settings, and Theme 2 style; choose functional tabs/content based on the story. For edit requests, explicitly state that only requested changes were made and verify this claim via diff/test, rather than asserting without verification.

## 4. Regression approach for later style or content changes

- Treat `assets/approved-theme2-reference.html` as a **golden behavioral/UI artifact**, not a domain data source.
- Capture screenshots of canonical desktop and mobile states, Settings Layout, Settings Access, right-edge Details and resized drawer.
- For style-only changes compare DOM text, HTML element/control positions, full JavaScript payload and sample data to previous version; only CSS theme declarations should differ. Retest permissions and click targets after CSS changes.
- For content-only changes, the shell's HTML/CSS/widgets/settings/access model should remain equivalent; domain data, tabs, labels, filters, validations and business decision logic are allowed to differ.
- For a narrow behavior change, check all core flows plus target regression; avoid unrelated refactoring or unsolicited UX improvements.
- Never say browser QA passed if browser tool was unavailable or navigation was blocked; run static sanity tests and call the limitation out accurately.
