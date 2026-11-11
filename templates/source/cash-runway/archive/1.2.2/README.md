# Cash Runway 1.2.2

This directory contains the editable finance template, fictional demo, valid schema examples and ChatGPT automation instructions. The MCP entry is `templates/apps/life.cash-runway-1.2.2.json`. The existing catalog loader discovers it automatically; no plugin-bundled renderer or manual registry entry is needed. Deploy the host and catalog together: native custom-layout support is part of this version.

## Build and use

Run `node scripts/build-cash-runway-template.mjs` from the repository to regenerate the catalog JSON and standalone HTML; `--check` detects drift and is included in the production build. Edit `cash-runway.source.js`, `cash-runway.css` and `catalog.metadata.json`, not the generated files. Publish a new semantic version for later released changes. Existing saved apps are not migrated automatically.

ChatGPT reads `list_app_templates` / `read_app_template`, pins the digest/version, reads current template guidance and design, and prepares the app with authorized bindings/manifest and one request key. `schema.example.json` gives valid platform field types, scalar settings, and explicit logical-to-database mappings. Use actual saved table IDs/schema versions, not demo IDs. Source reference URLs and multiline text use database `text`; scenario keys map to lowercase snake_case. Never seed `demo_data.json` into a real workspace.

Use the existing TrialAgents identity/access model and official linked host watermark. No per-app auth, account tables, custom logo or credential UI. The six finance screens remain distinct. The standalone HTML is a fictional local review simulation; native layout settings and exact server permissions require the real host.

## Calculation contract

Opening cash is a start-of-day balance. Select the latest opening dated on or before the inclusive cutoff, and add/subtract only actuals from that opening date through the cutoff date. Later openings and actuals are excluded. A partial-month cutoff gives exact current cash but withholds monthly forecast/runway until the owner supplies a reviewed month-end close; no remaining-month spend is assumed. Invalid dates, missing opening and truncated reads prevent exact cash claims. Forecasts require monthly plan entries and exclude contingent funding. One reporting currency; no conversion. Reads are bounded to 800 rows per role.

## Host interactions

Record forms contain transient draft inputs (`data-ui-state` with distinct draft actions), retained across renders. Submit creates `records.propose`; only the trusted outer review commits. The server rechecks manifest, bindings, current access and record version. Duplicate is a new reviewed draft; Delete is reviewed `archived:true`. No custom commit endpoint or sandbox relaxation.

The gear sends `tracker:layout` to the existing host settings route. `templateLayoutSchema` is a JSON declaration read without executing source. The native editor supports mouse drag and keyboard/touch source/destination selection, visibility and heading. Review/Confirm uses `prepare_tool_layout` with expectedVersion; only `templateConfiguration.heading/layoutProfile` change. Source logic, bindings, manifest, assets, execution, identity and access are preserved. Invalid keys, all-hidden screens, stale versions and unauthorized saves fail. Ignore leaves saved configuration unchanged.

Optional automation recipes are recommendations, not active definitions. Use current automation tools after saving, with separate authorization and verified receipts. No automation is the default; background failures never block app loading.
