# Project Oversight 1.0.1 — BT-06

Six-screen internal TrialAgents app for small biotech teams: portfolio overview, projects/workstreams, milestone timeline, deliverables, risks/decisions and management reports. Owner-assessed health is explicitly dated and justified. No app authentication, external sync or automatic email/research is required.

## Canonical package

Edit `project.source.js`, `project.css`, `catalog.metadata.json`, `schema.example.json` and `layout.schema.json`. `demo_data.json` is fictional and must never be imported into customer records. From repository root run `node scripts/build-project-template.mjs`; this deterministically generates `templates/apps/life.project-oversight-1.0.1.json` and `project.preview.html`. The normal build checks both outputs. Do not use the uploaded candidate's old Python builder, mock layout adapter or release manifest.

MCP-returned catalog documentation contains the complete eight-role scalar schema, required fields and select values, logical/physical mappings, saved parent IDs, manifest grants/schema versions, reviewed saves, receipt reconciliation, same-app revisions and optional automation instructions. Follow current authoring/usage guidance and pin the exact template version/digest. INSTALLATION_AND_MCP.md and AUTOMATION_RECIPES.md contain supporting maintainer instructions.

## Data correctness and limits

Project selection filters the backend before pagination for linked registers and timeline; selected-project counts and pages agree. Reports are company-wide; contributing updates respect the selected project. Search/filter is page-local. Stale page offsets clamp before fetching the visible page.

Required-field clears fail with retained drafts. Unwritable fields are disabled and labelled. Currency changes require first clearing the existing budget in a separate reviewed save; there is no conversion or mixed-currency total. Original milestone baselines remain immutable, approved evidence needs a draft revision, and copies reset protected status. Edits/archives retain the original record version. Moving a parent to another project requires resolving its linked descendants first.

Exact analytics and dependency-sensitive writes require complete authorized coverage within 600 rows per role, including archived rows returned by the backend. Larger registers remain pageable, but authoritative totals and operations needing complete evidence are withheld. Larger deployments need a vetted server aggregate or narrower sources. Independent direct Database edits do not enforce this app's business rules or text-UUID relationships; reconcile external changes before use.

Native layout settings and official linked TrialAgents watermark belong to the platform. The standalone preview uses fictional local review and does not simulate persisted native layout. No automation is activated by installation; runner and email outcomes are independently verified. See QA.md for release evidence and boundaries.
