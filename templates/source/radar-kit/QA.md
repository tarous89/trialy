# Bio Radars kit 1.0.0: QA (tested with Trial Radar 1.0.0)

Run on 14 November 2026 with fictional data only: production QuickJS, disposable PGlite databases with every migration and the runtime role, the real catalog sync and installer (Use existing data?), the shared research runner with a synthetic verified subscription, the app's read-only functions in the function worker, the email action pipeline with a stub provider, and the production sanitized frame with a manifest attached. No deployed account, connected assistant, registry or real email was used.

| Test | Covers | Result |
|---|---|---|
| `tests/trial-radar.test.ts` (14) | Package and generator `--check`; catalog, recipe and function validation; roles and `radar.v1` contract; draft status; §2.4 recipes and grants; kit readiness with a second (monthly) definition; four screens, empty and partial data; acceptance 2, 5, 6, 7, 8, 3/4 (app side), 10; events review; acceptance 12 with 5,000 events and 2,000 trials in the harness | pass |
| `tests/trial-radar-integration.test.ts` (5) | Install with functions and design gate; acceptance 1–8, 10, 11 and the Trial extra end to end (ready runner: grants, brief from the function, runs with Intel reachable (EU CT numbers) and unreachable (ClinicalTrials.gov fallback), digest and alert delivered within the hourly email limit, custom field kept by E6, 3-run hint, no-scope run, archive and restore); no runner (Needs setup, alert waits) and opt-out; acceptance 9 (reader app, one writer, dismissed rows left out) and modularity with Programs; acceptance 12/13 with 5,000 events and 2,000 trials in the real runtime and the design gate at 1440 and 390 px | pass |
| `scripts/test-trial-radar-browser.ts` | Production sanitized frame at 1440 and 390 px: four screens without overflow, watch a trial, dismiss an event with a typed reason, the calendar, a template version, the layout gear | pass |
| `node scripts/build-radar-templates.mjs --check` (in `npm run build`) | Generated files are current | verified |

Render times with 5,000 events and 2,000 trials on the in-process test database (first render, ms): overview ~5,200, tracker ~1,350, events ~1,800, feed ~1,850, calendar ~1,750, setup ~950 (CI runners are about 1.4x slower). Every screen reads at most about 12 bounded pages.

Not verified here: a live Claude or ChatGPT scheduled run against the real registries and TrialAgents Intel, delivery through the production email provider, and the deployed catalog. These are separate outcomes.
