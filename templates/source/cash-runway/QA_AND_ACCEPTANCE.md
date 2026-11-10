# Runway 2.0.0 validation

Validated against the repository host on 10 November 2026 with disposable PGlite databases and fictional data, not a deployed account. The catalog version is new and defaults to **draft**. It needs publisher approval through the operator flow; `templates/catalog-seed.json` approval was not extended.

## Commands and outcomes

| Command | Result |
| --- | --- |
| `npm run build` (includes `node scripts/build-cash-runway-template.mjs --check`, every template drift check, `tsc --noEmit`, `vite build`, embed build) | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cash-runway.test.ts` | 11/11 passed, including the production design inspector on all seven screens and the scenario builder at 390 and 1440 px |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cash-runway-integration.test.ts` | 2/2 passed |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-cash-runway-browser.ts` | Passed |
| `npm test` (full suite, 453 tests, with the browsers path below) | 452 passed. One failure is unrelated and pre-existing: `tests/monitoring-pv-integration.test.ts` (CO06) reports overlapping controls at 390 px on unmodified `main` too. Without a usable Chromium, every design-gate test fails with "The design check could not finish" (20 failures); that is environmental. |

**What the unit tests cover:** the catalog entry runs in production QuickJS with the host-prepended configuration. Covered: the hand reconciliation below; month-rate conversion and the missing-rate exclusion; the contingent toggle; preview-only what-ifs; the program shift; the two-step scenario save; Outdated flags; adoption with versions captured at open (a stale record is rejected); frozen budgets and snapshots; in-order closing; restricted salaries (no salary value in any screen) and read-only users; short-page, unknown-total, unavailable, unbound and over-800-row reads; draft retention across re-renders and failed proposals; `data-ui-state` on every input; the native layout configuration rules.

**What the integration tests cover:** the documented 13-table schema is created through reviewed database writes, and the app is prepared through `AppTemplates.operation` with a manifest. Covered: reviewed create and archive committed via `confirm`; native layout save, reload, stale-version and unauthorized rejection, and Ignore; a stale edit rejected by the server. The real `syncTemplateCatalog` and `installCatalogApp` flow (2.0.0 approved only inside the test database) creates 13 empty tables and an app that opens with no automation and accepts a reviewed settings row.

**What the browser test covers:** the production sanitized frame (CSP, manifest attached) across all seven screens with no data-check failure. A form-bound line draft with all inputs enabled and the runway effect shown, an exact database review, and an updated runway sentence. Native layout via mouse drag, field reordering, review/confirm and reload persistence. At 390 px: no horizontal overflow and keyboard pick-and-place with Ignore. Screenshots of the desktop at 1440 px and mobile at 390 px were inspected. The design inspector found contrast and clipping problems, which were fixed: the soft text colour is now `#55667A` and screen-reader text moved to `aria-label`s. Drawers and dialogs make the page behind them `inert`. They are not run through the inspector, because it counts fields scrolled inside the drawer body as overlapping the footer. They were checked by screenshot and by the browser test's form interaction instead. The offline preview was also inspected on every screen at 1440 and 390 px, with no horizontal page overflow.

The browser checks ran against this container's Chromium through a `PLAYWRIGHT_BROWSERS_PATH` that maps the repository's pinned Playwright 1.51.1 browser names to the installed build. Test code was not changed for this.

## Hand reconciliation (RUNWAY.md §12.11)

Fictional dataset in `tests/cash-runway.test.ts`:

- **Settings:** reporting currency EUR; opening balance 1,000,000 at 30 Jun 2026; loaded cost 20%; target 18 months; no reserve.
- **Rates:** USD 1.10 (Jul 2026), 1.25 (Aug 2026).
- **Lines:** rent 10,000/month from Jul 2026; US CRO 12,500 USD/month Jul 2026–Jun 2027 (program TX-1); tox schedule of three one-off lines, 30,000 (Sep 26), 30,000 (Dec 26), 40,000 (Mar 27); equity 200,000 committed (Jan 27); grant 250,000 USD contingent (Feb 27).
- **Hires:** CEO 120,000 EUR current; scientist 60,000 EUR from Jul 26; clinical lead 96,000 USD planned from Oct 26.
- **Milestone:** Phase 1 start, Jan 2027.
- **Closes:** Jul 2026 at 962,000 (actuals: rent 10,000, people 18,000, CRO 11,000 USD = 10,000); Aug 2026 at 924,000 (rent 9,000, people 19,000, CRO 12,500 USD = 10,000). The budget for 2026 was locked between the two closes.

| Check | By hand | App |
| --- | --- | --- |
| Monthly people cost | CEO 10,000 × 1.2 = 12,000; scientist 6,000; clinical lead 8,000 USD × 1.2 ÷ 1.25 = 7,680 EUR | 18,000 (Sep), 25,680 (Oct on) |
| Sep 2026 | 924,000 − (10,000 + 10,000 + 30,000 + 18,000) = 856,000 | 856,000 |
| Oct 2026 | 856,000 − 45,680 = 810,320 | 810,320 |
| Dec 2026 | 764,640 − 75,680 = 688,960 | 688,960 |
| Jan 2027 | 688,960 − 45,680 + 200,000 = 843,280 (cash at milestone) | 843,280 |
| Mar 2027 | 797,600 − 85,680 = 711,920 | 711,920 |
| Jun 2027 | 574,880; from Jul 2027, 35,680/month (CRO ended) | 574,880 |
| Oct 2028 | 574,880 − 16 × 35,680 = 4,000 (last month ≥ 0) | 4,000 |
| Nov 2028 | −31,680 → cash-out month | −31,680, cash-out Nov 2028 |
| Runway | Sep 2026 to Oct 2028 = 26 months | 26 months (snapshot `runway_months` 26) |
| Start raise | Aug 2026 + (26 − 18 + 1) = May 2027 | May 2027 |
| With contingent grant | +250,000 USD ÷ 1.25 = +200,000 from Feb 2027 → 25,600 in Mar 2029, negative in Apr 2029 → 31 months | 31 months |
| Cushion | Jan 2027 to Oct 2028 = 21 months | 21 months, green |
| July close | as of Jul at 962,000: Aug closes at 924,000, same path one month longer → 27 months | 27 |
| August burn | 9,000 + 10,000 + 19,000 = 38,000 | 38,000 |
| Budget, Jul 2026 clinical | 12,500 ÷ 1.10 = 11,363.64 | 11,363.64 |
| Variance, Aug 2026 | rent 9,000 vs 10,000; CRO 10,000 vs 10,000; people 19,000 vs 18,000 | identical |
| Shift TX-1 by +3 months | CRO moves to Oct 26–Sep 27 (the two pre-as-of months move into the forecast: +20,000) → Sep 2027 447,840, then 12 more months → 25 months, cash-out Oct 2028; milestone Apr 2027 at 676,240 | 25 months, Oct 2028, 676,240 |
| Bridge, new 5,000/month line from Sep 2026 | Jun 2028: 146,720 − 22 × 5,000 = 36,720 ≥ 0; Jul 2028 negative → 22 months; parts: spend lines −4, others 0 | −4, total −4 |

## Acceptance criteria (RUNWAY.md §12)

1. **First runway in one session:** the installer and integration test go from empty tables to a runway sentence after one reviewed settings row. The browser fixture shows the sentence with one line.
2. **Currency:** a USD line converts with that month's rate (the drill-down shows rate 0.8000); a missing GBP rate flags and excludes the line.
3. **Budgets:** locking creates one frozen budget record; a later line edit leaves it unchanged; locking the same year again is refused; variance appears after the next close.
4. **What-ifs:** a preview writes nothing. Save takes two reviews. Saved scenarios show Outdated after a forecast change. Adopt writes only the affected records, with captured versions.
5. **Program shift:** shifting a program by 3 months moves only that program's line and milestone; compare shows the cash-out month and cash at the milestone.
6. **Contingent cash:** it never changes the base runway; the toggle changes only the second value.
7. **Close:** closing writes one `month_closes` record with frozen metrics; the bridge parts sum to the change.
8. **Restricted salary:** viewers see snapshots and "restricted"; no salary value appears in any screen.
9. **Read-only and AI access:** with write restriction, every write control is disabled and the server rejects writes outside the manifest. An AI connection with edit off can only read; this is enforced by the platform principal, not the app.
10. **No automation:** the app opens and works with no automation; it never reads automation state.
11. **Totals:** they reconcile by hand (table above).

## Not verified here

- Deployed catalog availability and publisher approval of 2.0.0.
- A live ChatGPT or Claude host session, real workspace installs and real column restrictions on a deployed account.
- Automation setup or delivery: the alert email and rates research were not configured and no email was sent.
- Program-level shared-table reuse, which needs an assistant-prepared app.
- File download for Export: not available to custom apps; the CSV is shown as copyable text.
