# Market Radar 1.0.0: QA against BIO_RADAR.md §5

Run on 15 November 2026 with fictional data only (production QuickJS, disposable PGlite databases with every migration, the real catalog sync and installer). The kit behaviour shared by every radar (research run, brief, digest and alert delivery, email limits, custom fields, 3-run hint, 5,000 events and 2,000 rows) is verified once on Trial Radar: see [Trial Radar QA](../trial-radar/QA.md).

| Test | Covers | Result |
|---|---|---|
| `tests/radars.test.ts` | Package and generator `--check`; catalog, recipe and function validation; roles and contracts; monthly trigger (first Monday, 07:00); recipes and grants; four screens with demo data; brief from the definition; digest and alert text from the summary functions; Approvals, HTA, pricing and label changes in the digest; Coming up looks 180 days ahead for the next decisions | pass |
| `tests/radars-integration.test.ts` | Install from the catalog with three functions and two recommended automations; demo data; every screen, the item drawer and the scope drawer render without errors; design gate at 1440 and 390 px; automations wait in Needs setup without a runner | pass |

Not verified here: a live Claude or ChatGPT scheduled run against the named sources, production email delivery and the deployed catalog.


## Market Radar 2.0.0 (kit 2.0.0): QA

Run on 21 November 2026 with fictional data only.

| Test | Covers | Result |
|---|---|---|
| `tests/radars-v2.test.ts` (Market Radar) | Package: v2 marker on line 1, no `records.propose`, header, banner or footer; same installer schema, recommended automations and helpers as 1.0.0 and 1.0.1; `upgradeFrom`; a draft. Every screen and panel renders with the kit and one batched read; edits save with the version shown (inline select and watched, side-panel edit refused when the record changed meanwhile, mark reviewed, dismiss with a reason, scope status, add and remove a scope, bulk review); Undo; notices; Settings for owners only, no edit controls for viewers; every empty screen offers its first action; pending reads show as loading; the scope is the person's working context. | pass |
| `tests/radars-v2-integration.test.ts` | Install of the approved draft from the catalog with the same functions and automations, demo data, every screen and two panels in the production runtime, the current design rules at 1440, 400 and 390 px | pass |
| `node scripts/build-radar-templates.mjs --check` | The new package and the released ones are current (the released ones byte-identical) | verified |
