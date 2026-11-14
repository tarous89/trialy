# Runway 2.2.0 validation

Validated against the repository host on 14 November 2026 with disposable PGlite databases and fictional data, not a deployed account. Scope: [RUNWAY.md §14](../../../docs/product/app-template-blueprints/apps/RUNWAY.md#14-runway-220--assistant-control-integrations-and-automations). The 2.1.0 validation is archived in [`archive/2.1.0/QA_AND_ACCEPTANCE.md`](archive/2.1.0/QA_AND_ACCEPTANCE.md); its tests still run against the archived 2.1.0 package.

**Catalog status:** 2.2.0 is a new immutable **draft**. `templates/catalog-seed.json` still names 2.1.0, so new installs keep getting 2.1.0 until the owner approves 2.2.0. App commands and Edit in App also need `APP_COMMANDS_ENABLED=true`; the recommended automations need `APP_AUTOMATION_RECIPES_ENABLED=true`.

## Commands and outcomes

| Command | Result |
| --- | --- |
| `node scripts/build-cash-runway-template.mjs --check` | Passed (catalog entry 2.2.0 and preview current) |
| `npx tsc --noEmit` | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/app-commands.test.ts` | 3/3 passed (platform: declaration, schema subset, runs, review, replay, gate, `role_read_only`, writer labels, Edit in App) |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cash-runway-commands.test.ts` | 9/9 passed, including the production design inspector on the new screens at 390 and 1440 px |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cash-runway-commands-integration.test.ts` | 2/2 passed (real installer, real runtime and review path, Programs linked inside Runway) |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cash-runway.test.ts tests/cash-runway-integration.test.ts` | 2.1.0 suites unchanged against the archived package: passed |

The browser checks used this container's Chromium through a `PLAYWRIGHT_BROWSERS_PATH` that maps the pinned Playwright 1.51.1 browser names to the installed build.

## Acceptance criteria (RUNWAY.md §14.10)

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Every action has an assistant path; command and click propose the same change | `cash-runway-commands`: all 37 commands run; `line.save`, `month.close`, `source.add_to_plan` and the draft save are compared byte for byte with the click path. Real hosts (Claude, ChatGPT) **not yet observed**. |
| 2 | Read results equal the screens | Runway sentence equals Overview; hand check: 1,000,000 at Jun 2026, 36,000/month, tox −50,000 (Dec 2026), seed +300,000 (Jan 2027) → 34 months, cash-out May 2029, start raise Nov 2027, cash at the Mar 2027 milestone 926,000. Cash flow, CSV and drill-down match. |
| 3 | Assistant-saved scenarios are current and adoptable, then Outdated after a forecast change | Passed. |
| 4 | A draft previews and cannot be adopted until saved | Passed (direct draft record, Open draft, stamp on save; the command produces the same update). |
| 5 | New change kinds preview and adopt correctly | Passed for all seven, including the monthly-line split of `scale_category`, new lines and salary updates. |
| 6 | Close and lock by command freeze the same records; months close in order | Passed. |
| 7 | Restricted salaries never appear in command results | Passed (`summary.read` returns the snapshot only; cash flow and salary changes are refused). |
| 8 | Viewers' assistants have read commands only | Platform test: propose commands are hidden and refused for non-writers; in-app `writable:false` refuses with no proposal. |
| 9 | No command commits without confirmation; stale versions rejected; replay creates no duplicate | Platform test. |
| 10 | Category, extra field and form layout through an assistant, no code change | Passed in QuickJS; real-host layout display **not yet observed**. |
| 11 | Integrations: own entries, Add to plan, source change flagged and updated, linked read only, Edit in App | Passed in QuickJS and on the real installer with Programs linked. CRO Selection, Contracts and Fundraise providers were simulated through `integrations.list`; real linked installs of those apps **not yet run**. |
| 12 | Install with all automations selected, some opted out, no runner | Declarations validate strictly and reach the manifest; the create-only rates binding is checked. Setup states on a deployment with the recipes switch on **not yet observed**. |
| 13 | Rule 9 and Programs 2.1.0 reading 2.2.0 snapshots | `runway.month_closes` is unchanged (runway.v2); covered by the existing Programs integration test. |
