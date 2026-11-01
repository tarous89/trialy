# Investor CRM 1.0.1 — App 13

Internal TrialAgents fundraising workspace for small biotech teams: round overview, investor directory and contacts, opportunity pipeline, interactions, follow-ups and research. Signed commitments are evidence-backed commitments, not cash received. No app authentication, investor email sender or automatic research service is installed.

## Canonical package

`investor.source.js`, `investor.css`, `catalog.metadata.json`, `schema.example.json`, `layout.schema.json` and fictional `demo_data.json` are canonical. From repository root run `node scripts/build-investor-template.mjs`; this builds `templates/apps/life.investor-crm-1.0.1.json` and `investor.preview.html` deterministically. The normal repository build verifies both with `--check`. Do not run the uploaded candidate's old patch/build/release scripts.

The registered catalog contains the complete MCP setup contract: eight exact scalar schemas, select values, saved parent IDs, logical-to-physical mapping, authorized manifest and schema versions, reviewed creation/editing, receipt reconciliation, native layout and optional automation instructions. Read the current authoring/usage guidance and pin the template version and digest. See INSTALLATION_AND_MCP.md and AUTOMATION_RECIPES.md for maintainer instructions.

## Data and operating limits

The selected round scopes both pipeline and follow-up lists and their corresponding counts. Pipeline filtering occurs before server pagination. Research briefs and findings have independent reachable pages. Edits and archives use the version captured when opened; review and confirmation remain platform-owned. Archive actions are available in every saved-record editor and protect linked live records.

Funding totals require complete authorized data, one opportunity per investor/round, matching currencies and valid signed evidence. Duplicate opportunities, missing sources and malformed values cannot silently become valid totals. Changing a currency cannot relabel existing monetary amounts. Independent direct Database changes remain outside the app's business validation and must be reconciled before use.

The supported analysis ceiling is 800 records per role, including archived rows returned by the host. Totals and operations requiring complete evidence are withheld above that ceiling. Selected-round follow-ups and linked contacts also require complete dependency coverage; the app explicitly marks them unavailable when incomplete. Investor, opportunity, interaction, brief and finding registers remain server-pageable beyond the analysis ceiling, with page-local search/filter. Larger installations need a vetted server aggregate or narrower authorized sources, not an increased claim of completeness.

The standalone preview uses 203 fictional records and local simulated review. Native layout settings, the official linked TrialAgents watermark and actual reviewed saves belong to the host. Never seed fictional data into a customer workspace. Optional research and internal email require separate reviewed setup; manual use needs neither.

See QA.md for release verification and operational boundaries.
