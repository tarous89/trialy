# Lab Inventory 2.0.0: QA and acceptance

**Scope:** [LAB_INVENTORY.md](../../../docs/product/app-template-blueprints/apps/LAB_INVENTORY.md) §12. **Catalog status:** draft (`templates/catalog-seed.json` still names 1.0.2; 1.0.2 is listed in `templates/catalog-retirements.json`). Guidance read: template authoring and usage 1.3.25 (all sections), shared automations guide 1.4.3, MODULAR_APPS_AND_SHARED_DATA.md, BIOTECH_v2.md, the design and build contract and the contract registry.

## Commands run (14 Nov 2026)

| Command | Result |
|---|---|
| `node scripts/build-lab-inventory-template.mjs --check` (in `npm run build`) | Passed: catalog JSON and preview current; 132,072 source characters (limit 180,000). |
| `npm run build` | Passed (all builders' `--check`, `tsc --noEmit`, vite build, embed). |
| `node --test tests/lab-inventory.test.ts` | 15/15 passed (production QuickJS, catalog entry as prepared by the host). |
| `node --test tests/lab-inventory-integration.test.ts` | 3/3 passed (PGlite with all migrations, real installer and Add app step, `runFrontend`, workspace review, MCP `/claude` and `/mcp`). |
| `node --import tsx scripts/test-lab-inventory-browser.ts` | Passed: production sanitized frame with a manifest; six screens at 1440 and 390 px and the mobile item page at 390 px; no page overflow; no error banner. The fixture save passed the production design inspector. |
| 1.0.2 regressions: `tests/inventory-template.test.ts`, `tests/inventory-integration.test.ts`; `tests/app-templates.test.ts`, `tests/template-catalog.test.ts` | Passed. |
| QR encoder | 47 strings (QR versions 1–15, Unicode) decoded exactly by an independent decoder (jsQR, scratch install only); the rendered SVG decoded from a Chromium screenshot. |

Local note: this container's Chromium is newer than the revision Playwright 1.51.1 pins; the design inspector and browser test ran with `PLAYWRIGHT_BROWSERS_PATH` pointing at the installed build. CI installs the pinned browser.

## Acceptance (§12)

| # | Criterion | Evidence |
|---|---|---|
| 1 | Request with stock check; one approval below the threshold, two above; never the requester | Unit "acceptance 1" (lots and open requests shown before submit; EUR 820 one step; EUR 2,460 waits for Sam Rivera; requester and wrong approver refused; approver's own request goes to the next approver; program approver; reject reason; question). Integration test 2 through the real review. |
| 2 | Two requests in one order; partial receipt creates one lot; the rest stays open | Unit "acceptance 2"; integration test 2 (order `partially_received`, one lot, then completed; received movements recorded). |
| 3 | A pasted confirmation becomes proposed lots and a new catalog item, all reviewed | Integration test 3: Claude reads the catalog, proposes the new item (cannot commit it), then lots + order and request updates, then received movements; a person confirms each. |
| 4 | "Used one" from the QR page on mobile reduces the earliest-expiring lot; chat creates the same movement as a proposal; quick count logs the difference | Unit "acceptance 4"; integration tests 2 (route `/item`, `via qr`) and 3 (ChatGPT "we used 3 boxes" bulk proposal; the app's own proposal has the same shape); browser test (390 px item page, nothing written before approval). Every lot's quantity equals the sum of its movements. |
| 5 | Low stock, expiring and expired appear; §7 suggested quantity; one click creates a request | Unit "§7 calculations" (independent fixtures: 90-day window, lead time + 14, rounding, window boundaries, used-up lots) and "acceptance 5"; integration test 2. |
| 6 | Digest on schedule, concise, empty sections omitted | Unit "acceptance 6" (≤ 3 lines per section, omission, one-line empty digest, weekly Monday 08:00 Europe/Berlin = 16 Nov 2026 07:00 UTC from the platform calendar, the completion email validates and expands `{{run.summary}}`); integration test 3 (the runner path: `run_component_frontend` as Claude returns the exact digest). Approval and status emails validate as platform actions. |
| 7 | Custom category "Primers" in items and filters | Unit "acceptance 7"; integration test 2. |
| 8 | Assistants propose only; never approve | Integration test 3: assistants cannot commit their proposals; with the documented column rules Claude and ChatGPT cannot prepare approval fields, and running the app as the assistant is refused by the platform. |
| 9 | Modularity (rule 9) and archive first; archiving pauses automations | Integration test 1: alone (9 tables, optional roles unbound), after Programs and Contracts (Use existing data? lists organizations, programs, agreements; shared, programs/agreements read only), partner archived, tab removed and re-added, app archived (fields and records kept, automation paused, restore before reinstall, restored switched off), new copy reconnects suppliers. |
| 10 | Layout at 1440, 390 and the mobile item page | Browser test; screenshots reviewed (overview, inventory, requests, orders, locations, settings, item panel, label sheet, item page before and after "Used one"). |

## Not verified

- Live catalog deployment, owner approval, a saved app in the platform and the gallery card.
- Automations: no digest, approval or status automation was created or run; no email was sent. The recipes are validated against the action schema only. The digest relies on the runner calling `run_component_frontend`; a real Claude or ChatGPT run was not performed.
- Printing on physical A4 (L7160) or Letter (5163) label sheets. Custom apps cannot open the print dialog; the sheet is laid out in mm/in for the browser's Print at 100%.
- Real phone cameras scanning printed labels (the QR content was decoded from screen renders only).
