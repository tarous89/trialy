# Market Radar 1.0.0: QA against BIO_RADAR.md §5

Run on 15 November 2026 with fictional data only (production QuickJS, disposable PGlite databases with every migration, the real catalog sync and installer). The kit behaviour shared by every radar (research run, brief, digest and alert delivery, email limits, custom fields, 3-run hint, 5,000 events and 2,000 rows) is verified once on Trial Radar: see [Trial Radar QA](../trial-radar/QA.md).

| Test | Covers | Result |
|---|---|---|
| `tests/radars.test.ts` | Package and generator `--check`; catalog, recipe and function validation; roles and contracts; monthly trigger (first Monday, 07:00); recipes and grants; four screens with demo data; brief from the definition; digest and alert text from the summary functions; Approvals, HTA, pricing and label changes in the digest; Coming up looks 180 days ahead for the next decisions | pass |
| `tests/radars-integration.test.ts` | Install from the catalog with three functions and two recommended automations; demo data; every screen, the item drawer and the scope drawer render without errors; design gate at 1440 and 390 px; automations wait in Needs setup without a runner | pass |

Not verified here: a live Claude or ChatGPT scheduled run against the named sources, production email delivery and the deployed catalog.
