# Code review notes: Authoring guidance and catalog (G1–G14, U1, U2, A15, P9)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Produced by reading the code at commit `376f29d` on 19 November 2026; nothing was run. Line numbers refer to that commit. Where these notes list open questions, the scope's **Defaults adopted** section gives the answer to build to.

Gap analysis: authoring guidance and app catalog (G1–G14, U1/U2, A15, P9). Read-only; nothing changed. All paths are under `/home/user/trialy/`. Violation counts in D are grep counts on the seeded catalog sources, not a screen-by-screen review.

## A. Guidance sources

| Source | How served / versioned | Action | Conflicts (file:line) |
|---|---|---|---|
| `templates/TEMPLATE_AUTHORING.md` (404 lines, 95 KB, "Version: 1.3.33") | `read_app_template_guidance`, 12,000-char pages (`src/workspace/app-templates.ts:22-29`); `Version:` line must equal `templateGuidance.version` (`tests/app-templates.test.ts:75-76`) | Rewrite as the single guide. Move API contracts (:5-70, :140-192, :274-282, :358-368) to a technical reference; delete the rest | :82 fixed Overview/Analysis/Data/Settings; :104, :298-302, :314, :331 pixel widths, gaps, field counts; :351 layout gear; :383-387 "Save visible before editing"; :88-116 preflight table |
| `templates/TEMPLATE_USAGE.md` (192 lines, 46 KB) | same tool, resource `usage` | Delete; install steps go to the reference | :41-49 repeats AUTHORING :78-86; :45, :158 |
| `resources/workspace/WORKSPACE.md` (255 lines, 67 KB) | `read_workspace_guide`, heading routing `src/server/workspace-guidance.ts:7-14`, version hard-coded `'1.0.0'` (:30) | Keep as workflow guide; replace app-design text with a pointer | :7, :61 open extension first (A15); :69 fixed sections; :104-108; :115 "one fictional example for every empty data tab" (G11) |
| `resources/design-baseline.md` | copied to both plugins by `scripts/sync-plugin-guidance.mjs` (`--check` in `package.json:12`) | Replace with the new guide; sync that instead | :7 "20 by default", one-row toolbar; :8 fictional examples; :18-20 |
| `resources/tracker-design/**` (APP_BUILDER + 9 references, about 120 KB) | `read_tracker_design`, 21 resources, version `'0.8.0'` (`src/server/tracker-design.ts:5-13`) | Delete as guidance; keep resource names as aliases (`tests/plugin-release.test.ts:24-37`); keep assets as kit source | "Immutable" `UI_INTERACTION_CONTRACT.md`; `THEME_2_VIVID.md` pixel measurements; `QA_AND_EXAMPLES.md:144` |
| `src/shared/app-design.ts` (`read_app_design`, `DESIGN_VERSION` v2) | code | Rewrite: tokens, component list, CSS only | :33 type sizes and spacing; :35 `businessAppDefaults.sections`; :36 "four optional app shells"; :37 example with `<h1>` |
| `src/shared/app-shells.ts` | inside `read_app_design` | Delete the four shells; fold CSS into the kit | :14/:25/:36/:47 Settings in every shell; :55 `page-header`; :56, :68 full Settings page "General / Display / About"; :77 watermark reserve; :79 fixed gaps |
| MCP instructions (`src/server/workspace-guidance.ts:17`, Claude addendum :20) | MCP initialize | Rewrite | "provide useful navigation, analysis filters, underlying data and real settings"; "display it before anything else"; "End every reply … link" (A15) |
| Plugin skills | packaged: Claude 0.3.2, ChatGPT 0.2.59 | Rewrite; each needs its own package release | Claude `SKILL.md:19-26`; `references/app-building.md:8`; `trialy-workspace/SKILL.md:12`; `trialy-tracker-design/SKILL.md:14` |
| `docs/INTERFACE_RULES.md`, `docs/product/app-template-blueprints/DESIGN_AND_BUILD_CONTRACT.md`, `docs/product/APP_SHELLS.md`, `APP_DESIGN_QUALITY.md` | repo only | Archive as superseded | Blueprint :13-15 "4–8 screens", "exactly four core capabilities"; :21, :42 px |
| `docs/FRONTEND_CODE.md`, `CONTEXT.md` | repo only | Keep; runtime area updates the first, fix pointers in the second (:115, :119) | — |
| Per-app `instructions` / `documentation` in catalog JSON (`app-templates.ts:17-18`) | immutable per version | Rewrite per app in G14 | — |
| `resources/workspace/references/SHARED_AUTOMATIONS.md`, `APP_SERVICES.md` | served | Keep (automation area) | — |

Independent version strings today: 1.3.33, workspace `1.0.0`, tracker-design `0.8.0`, `trialagents.design.v2`, shell library `1.0.0`, guardrails `1.0.0`. Proposal: one guide version plus its sha256.

## B. Checks enforcing old rules

| Check | Location | Action |
|---|---|---|
| Prepare-time gate, 422 `app_design_quality` | `src/workspace/service.ts:476-481` | Keep the gate, change the rule set |
| `small_text` under 12px ("12px secondary, 15px body") | `src/workspace/design-quality.ts:50` | Relax to a warning; drop the 15px wording |
| Contrast, clipped text, overflow, clipped or overlapping controls | `design-quality.ts:55-62` | Keep (serve G13 and P9) |
| Viewports 1440 and 390 only; custom apps inspected on the first screen only | `design-quality.ts:25`; `service.ts:477-478` | Replace: add assistant-panel width and every screen (depends on new runtime) |
| One check at a time, `design_check_busy` | `design-quality.ts:12` | Conflicts with P8; hand to the performance area |
| Every shell must include Settings; exactly four shells; `settings-page` "full structured"; `.ta-settings` CSS | `tests/app-shells.test.ts:8-9, 13, 23-26, 33-36` | Remove; test the single style instead |
| Vivid byte lock | `scripts/build-vivid-template.ts:8`; `resources/tracker-design/preserved-assets.json`; `tests/plugin-release.test.ts:16-22`; manifest `locked` | Replace with a versioned kit, otherwise the style cannot change |
| Guide routing and text assertions | `tests/plugin-release.test.ts:39-58, 74, 80-81, 93-94, 101`; `tests/app-templates.test.ts:75-76` | Update for the merged guide |
| Fictional example rows on by default | `src/workspace/tracker-template.ts:23` (`showExample` default true) | Remove (G11); empty state offers a first action (G5) |
| "Save or cancel your current changes first" | `src/shared/frontend-frame.ts:157` | Runtime area (direct saves) |
| Per-app tests asserting "(reviewed)" / `records.propose`; 33 test and browser files reference the layout gear | e.g. `tests/partnerships.test.ts`, `tests/fundraise.test.ts`, `tests/trial-radar.test.ts`, `scripts/test-*-browser.ts` | Rewrite with each rebuilt app |
| Build chain of 31 `--check` builders | `package.json:12` | Keep; archived versions must keep building byte-identically (`src/workspace/template-catalog.ts:28`) |

New G1 check (replacement): a small deterministic lint at prepare time for fixed or sticky bars at viewport edges (own header, toast, footer) and auth forms. The sanitizer already omits the password input type (`frontend-frame.ts:67`). Honest data and "platform feature rebuilt" are not statically detectable; they stay in the G13 self-check.

## C. General style (G10)

What exists is five parallel systems, none shared by catalog apps:
1. **Vivid** (`trialy.vivid.v1`): `resources/tracker-design/assets/vivid-template/{theme.css, components.json (37 components), engine.js}`, generated into `src/shared/vivid.generated.ts`. Used only by the standard tracker (`src/workspace/standard-tracker.ts`); byte-locked.
2. **Base CSS**: `appBaseCss` (`app-design.ts:24-30`), injected into every custom app at runtime (`service.ts:398`), plus opt-in `ta-*` shell CSS.
3. **Four palettes** (`app-design.ts:5-10`) and four shell palettes.
4. **Per-app copies**: eight live apps each ship their own 15–22 KB CSS and their own helper functions under different prefixes (`rw-`, `ct-`, `cs-`, `dr-`, `fr-`, `iu-`, `pt-`, `pg-`), embedded in the source.
5. **`templates/source/radar-kit/`** (`kit.mjs`, `radar.css`, `radar.source.js`): the only real shared kit, one source for eight apps.

What is needed:
- One token set and component CSS delivered by the existing runtime injection, so apps stop embedding CSS. This also relieves the 240,000-character source cap: Partnerships is at 225,866.
- One shared component helper library for the new browser runtime: navigation (sidebar or tabs, folding to a menu on phone), table that becomes cards, inline-edit cell, side panel that goes full-screen on phone, drag-and-drop board, empty state with first action, pager, working-context picker, owner-only settings form, session Undo, and adapters to the platform notice and header.
- Container-based responsiveness for browser, assistant panel and phone, with no hover dependence.
- The standard tracker restyled to the same tokens.

## D. Catalog inventory

32 apps are in `templates/catalog-seed.json`: 16 switched on for all channels and 16 off (`templates/catalog-availability.json`). Every app is `frontend-js`, server-rendered.

All nine live codebases share the same pattern:
- **Own header**: `<header>` with an "App / Screen" eyebrow, the app name as `<h1>`, an "As of" pill and a layout gear (e.g. `templates/source/partnership-tracker/partnerships.source.js:754`, `cash-runway.source.js:608`, `radar.source.js:254`).
- **Own banners and notices** instead of the platform notice.
- **Save-then-review**: every edit goes through `records.propose` ("Nothing changes until a person approves it", `partnerships.source.js:340`).
- **Settings bloat**: data lists plus an "Access and automations" notes panel.

| App (seed version) | Builder (`scripts/`) | Source lines / chars | Screens | Specific violations | Effort |
|---|---|---|---|---|---|
| 8 Bio Radars (1.0.1; Literature 2.0.1) | `build-radar-templates.mjs` + kit 1.2.0 | 399 / ~93k each, one source | 4 | Setup holds Automations, Version history, "Build now"; disclaimer footer (`rd-foot`); 7 banners | M once, covers 8 |
| Fundraise `life.investor-crm` 2.0.1 | `build-investor-template.mjs` | 706 / 135k | 7 | 14 banners; 7 Settings panels incl. "Where data comes from", "Access, automations and links" | M |
| Contracts 1.1.1 | `build-contracts-template.mjs` | 726 / 155k | 7 | 15 banners; Milestones and Counterparties lists in Settings | M–L |
| Programs `life.project-oversight` 2.2.1 | `build-project-template.mjs` | 882 / 174k | 7 | 12 banners; Programs and Program team lists in Settings; member IDs on screen | M–L |
| Partnerships 2.2.1 | `build-partnerships-template.mjs` | 986 / 226k | 7 | 20 "(reviewed)" buttons; `key \| Label \| hidden` text areas and member IDs in Settings (`partnerships.source.js:911-929`) | L |
| Runway 2.2.1 | `build-cash-runway-template.mjs` | 1006 / 219k | 7 | 11 banners; FX rates, Programs, Organizations lists in Settings | L |
| Data Room 1.1.1 | `build-data-room-template.mjs` | 796 / 181k | 7 | 13 banners; 11 "(reviewed)"; Index templates, Email texts, Custom fields, Access notes in Settings | L |
| CRO Selection 2.1.1 | `build-cro-selection-template.mjs` | 975 / 214k | 8 | 19 banners; 29 "(reviewed)"; Display and Access panels in Settings | L |
| Investor Updates 1.0.1 | `build-investor-updates-template.mjs` | 977 / 212k | 5 | 32 propose calls; own action header (`investor-updates.source.js:827`) | L |
| 16 switched-off apps (e.g. Inventory, Grant Pipeline, Client Signals) | one builder each | 118–353 / 57–113k | 5–7 | Older individual CSS; footers and disclaimers in several | Out of scope by default; S–M each with the kit |
| `vivid.tracker`, `simple.calculator`, `simple.checklist` | — | — | — | Not in the seed (drafts and fixtures) | — |

**Order:** kit → Radars (smallest, proves the kit on eight apps) → Fundraise (board with drag and drop) → Contracts → Programs → Partnerships → Runway → Data Room → CRO Selection → Investor Updates. The last three depend on external exchange, where the single "something goes out" confirmation stays.

**Biggest savers:** shared frame and navigation, table with inline edit, side panel, settings form, notice adapter. Together they replace roughly the same 150–250 lines of helpers and all CSS in each app.

**Shipping (`docs/TEMPLATE_CATALOG.md`, `docs/APP_PUBLICATION.md:23-35`):**
- Published rows are immutable (`template-catalog.ts:28`). A rebuild ships as new version JSON, an installer entry, the old package archived under `archive/<version>/`, new gallery media, the seed naming the version, and owner approval.
- "Update to version X" for installed copies is offered only when the installer schema, options, defaults and helpers are identical (`src/workspace/app-update.ts:34-40`). It is website-only, one app at a time, and allowed for workspace owner or editor (:50).
- A G14 rebuild changes options and Settings, so today it would return `needs_review` and offer no update. A reviewed upgrade path, owner-only (A3), is required.
- Old versions must stay approved until installed copies are updated (`TEMPLATE_CATALOG.md:75`).

## Proposed single guide (headings)

1. **Rules that never bend** — the four G1 rules and what to offer instead.
2. **What the platform already provides** — header with app name, hidden sidebar, notices, approval footer, tooltips, request access; link to Access, Automations, Logs (G2, G3, U1, U2).
3. **Start from the job** — screens only as needed, first screen shows what needs attention, remembered context per person (G4).
4. **Fewest clicks** — edit in place, instant save, drag and drop, side panel only for create or many fields, first action on every empty screen, optional Undo (G5, G8).
5. **Only what helps** — technical detail one click away; Settings only for business choices, owners only, or none (G6).
6. **Navigation and view choices** — assistant decides; design changes go through the assistant (G2, G7).
7. **Style** — use the general style and kit; the user's instructions win except section 1 (G10).
8. **Real and honest** — every feature works, no placeholders or example records, partial data labelled (G11).
9. **Catalog first** — offer a matching catalog app; install or customize (G9).
10. **Check before preview** — the eight G13 questions.

A technical reference (runtime API, data, exchange, automations) stays separate and carries no design rules.

## Build order

1. Write the guide and reference; add one version constant; alias the old resources.
2. Rewrite `app-design.ts`, MCP instructions and skills (A15); release both plugins.
3. Change the checks in B.
4. Build the general style and kit against the new runtime; restyle the standard tracker.
5. Add the reviewed upgrade path for installed copies.
6. G14 rebuild in the order above, together with the performance rebuild.

## Cross-area dependencies

- **Runtime:** the browser-side interaction contract replaces `render(input, tools)`; the kit and every rebuilt app depend on it.
- **Notice and header API:** replaces app banners and the app's own title.
- **Direct-save edits:** replace `records.propose` for record edits.
- **Not found in the code I read:** a per-person state store (G4), the caller's app role exposed to apps for owner-only Settings (G6), and MCP tools for catalog updates.
- **Performance:** P11 automatic speed-only updates do not exist (`APP_PUBLICATION.md:35`).

## Risks

- Older plugin versions call removed guidance resources; keep aliases.
- Customized or changed installed copies never update; withdrawing a version stops members with hidden fields from opening copies of it.
- The 240k source cap if the kit is not runtime-provided.
- About 60 per-app test files, 30 browser scripts and gallery snapshots need rewriting.
- The preflight lessons (`TEMPLATE_AUTHORING.md:92-105`) disappear from the guide; turn them into validators or tests.
- G1 is only partly machine-checkable.

## Open questions (defaults)

1. Does G14 cover only the 16 switched-on apps? Default: yes; the 16 off stay off and unchanged.
2. Does "one short guide" allow a separate technical reference? Default: yes, with no design rules in it.
3. Is Vivid the basis of the general style? Default: yes, evolved into the kit, byte lock removed.
4. May gallery previews keep labelled fictional demo data? Default: yes in the gallery only, never in installed apps.
5. Do rebuilt apps ship as new major versions with an owner-approved upgrade, old versions kept until copies move? Default: yes.
6. Do business activity and disclosure-log screens (Fundraise, Partnerships, Data Room) stay? Default: yes; they are app records, not platform history.
7. Is minimum text size a blocker or a warning? Default: contrast blocks, size warns.

### Critical Files for Implementation
- /home/user/trialy/templates/TEMPLATE_AUTHORING.md
- /home/user/trialy/src/shared/app-design.ts
- /home/user/trialy/src/workspace/design-quality.ts
- /home/user/trialy/src/server/workspace-guidance.ts
- /home/user/trialy/src/workspace/app-update.ts
