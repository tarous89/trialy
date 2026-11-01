# Installation and MCP release instructions — CO-03 sponsor site feasibility

## Source of truth

GitHub: `tarous89/trialy` (default branch `main`). Verified blueprint: `docs/product/app-template-blueprints/CLINICAL_OPERATIONS.md` `CO-03`; authoring/usage `templates/TEMPLATE_AUTHORING.md` and `templates/TEMPLATE_USAGE.md` **v1.3.9**. Current catalog schema: `src/workspace/app-templates.ts`. Existing CRO template `life.cro-site-feasibility` is **different**; do not overwrite or reuse its ID.

Published catalog identity: `life.co-site-feasibility@1.1.1`, at `templates/apps/life.co-site-feasibility-1.1.1.json`. Canonical inputs, fictional fixtures and docs live in `templates/source/co-site-feasibility/`. This release supersedes the uploaded, unregistered 1.1.0 candidate. Changes to an already released version require a new semantic version. Existing saved apps are never silently migrated.

## Rebuild and validation

Run from the repository root:

```bash
node scripts/build-co-site-template.mjs
node scripts/build-co-site-template.mjs --check
node templates/source/co-site-feasibility/test_runtime.cjs
node templates/source/co-site-feasibility/test_design_v110.cjs
APP_DESIGN_CHECKS=off node --import tsx --test --test-concurrency=1 tests/co-site-template.test.ts tests/co-site-integration.test.ts tests/app-templates.test.ts tests/frontend.test.ts tests/frontend-reads.test.ts
APP_DESIGN_CHECKS=off node --import tsx scripts/test-co-site-browser.ts
npm run build
```

The builder reads `catalog.metadata.json`, `site.source.js`, `site.css`, `role_definitions.json`, `layout.schema.json`, `schema.example.json` and `demo_data.json`. It embeds role definitions, native layout schema and CSS into the catalog source, then generates the catalog JSON and `site.preview.html`. Edit canonical inputs and rebuild both outputs. The preview is a fictional local demo; it never connects to production and does not implement native layout settings. Tests/fixtures never seed customer workspaces.

See `QA.md` for executed acceptance and `DESIGN_RATIONALE_V110.md` for the original workflow rationale and 1.1.1 accessibility fixes. Runtime/schema/DB/frame checks are reproducible local production-code acceptance, separate from live discovery.

## Workspace installation and operational handoff

1. Read full current `read_app_template_guidance` authoring/usage, `read_app_design`, catalog exact version/digest and any newer platform interface additions. Check the selected draft is not the CRO-facing template.
2. Verify `AppTemplates.operation` can load the **entire existing catalog plus this new JSON**. Enforce file limit <300 KB, source length <180k, documentation prose <=6k, instruction <=20k, <=5 examples, no duplicated `templateConfiguration`/`templateBindings` declaration. Run existing repo template tests/build/typecheck.
3. For workspace-specific setup, **read current authorized schema** before proposing new tables/fields. Reuse existing accessible study, institution and professional investigator entities; ask user to review table creation or mapping changes. Copy `schema.example.json` types, enums and `multiple:false`, mapping role logical keys to actual lowercase physical keys. Text fields for source URLs, summaries and UUID relationships; do not create unsupported nested relations or longtext schema types. Store scalar `archived:boolean` for soft archive.
4. Save parent records (study, institution) and capture actual receipt IDs; only then save PI affiliations, study-site candidates and questionnaire criteria; then responses, evaluations and startup tasks. Ensure all eight roles have correct versioned manifest entries and permission-complete `tableMap`. Never fabricate host UUIDs or import demo records.
5. Call `prepare_app_from_template` with **exact version/digest and one stable requestKey**, host-injected configuration once, complete authorized bindings, and manifest. Execute **prepared source in actual QuickJS** and the real sanitized production frame, with form text/select/number/date/textarea controls and callbacks. Deny/missing/short-page/over-budget fixtures must suppress exact site totals and approval.
6. Inspect host design QA (font/contrast/overlap/width), real navigation, Add/Edit/Duplicate/Archive proposals, conflict during edit, select-then-preview, and native layout gear. Confirm actual reviewed app save and record proposals, then reopen exact saved app ID/version. Do not create replacement apps after an interrupted save—reconcile the receipt first.
7. In platform Settings → Layout, reorder screens and columns and hide a field. Confirm real `prepare_tool_layout` review/confirm persists `layoutProfile`; required edit fields must remain accessible. Verify denied/stale permissions clear restricted data without a fake UI-only access boundary.
8. Only after separate approval: optionally configure a shared ChatGPT monitoring definition and/or an email action with verified registered recipients, scopes, timing/timezone and meaningful audit. The app must function without either. Verify actual runner readiness and delivery separately, not from a mere Enabled flag.
9. After deployment of this repository version, confirm deployed `list_app_templates` and `read_app_template` discover the exact new digest. A ZIP alone never registers or deploys an MCP template.

## Example role mapping (illustrative shape, never use synthetic IDs in production)

```json
{
  "studies": {
    "typeId": "<real authorized study table UUID>",
    "fields": {"name":"name", "protocol_code":"protocol_code", "indication":"indication", "phase":"phase", "owner":"owner", "status":"status", "archived":"archived"},
    "writableFields": ["name", "protocol_code", "indication", "phase", "owner", "status", "archived"]
  }
}
```

Provide **all** fields displayed or edited across the eight roles in full tableMap and manifest. The abbreviated example above is only to explain structure. Full schema and enums are in catalog `documentation.dataContract` and `schema.example.json`. Fields that the user cannot read/write must not be added to permissions simply to make the UI work.

## Status nomenclature

Local archive and browser pass ≠ QuickJS host pass ≠ app saved ≠ app automation enabled ≠ actual task run ≠ emailed recipient. Report these separately.

## Scope and concurrent changes

Analytics and validation require complete authorized reads within 600 records per involved role. Direct study filters for candidates/criteria and country filters for institutions are sent to the database before paging. Selected-study response/evaluation/startup registers and cross-table country filters require complete bounded joins; when unavailable, clear study/country scope to browse backend pages. Page search/status filters are labelled as page-local. Missing/unknown source totals are never displayed as zero.

This is reviewed internal planning, not a transactional clinical qualification system. The host enforces record versions and access; independent Database changes can invalidate relationships or an evidence fingerprint. Reopen and review the current evidence before a selection decision. Template UI guards are not database foreign keys or clinical approval authority. Exact large joins or transactional cross-record guarantees require a separately vetted host feature.
