# CRO Site Feasibility 1.2.1

Internal feasibility workflow for small CRO teams: portfolio, requirements, institution profiles, questionnaires, evidence-weighted matrix and selection/handoff. One host-authorized sponsor boundary per app. No app-specific authentication, site portal, external outreach, patient data or enrollment predictions. The host supplies the official linked TrialAgents watermark.

Catalog: `templates/apps/life.cro-site-feasibility-1.2.1.json`. This directory contains canonical source/CSS, catalog metadata, exact scalar schemas/mappings, fictional demo and standalone preview, MCP instructions and optional automation recipes. Build with `node scripts/build-feasibility-template.mjs`; use `--check` to verify reproducibility. The main production build checks drift. Demo records must never be seeded into customer workspaces.

All six roles have record management controls; the comparison pages through five candidates at a time. Native layout uses tracker:layout and reviewed prepare_tool_layout. Layout never changes permissions. Record changes require trusted proposals and current authorization; edits/archive retain original versions. Parent dependencies block archive. Changed approved responses must return to Draft; reset linked approvals before changing criteria.

Validation: `node --import tsx --test tests/feasibility-template.test.ts tests/feasibility-integration.test.ts`; `node --import tsx scripts/test-feasibility-browser.ts`; `npm run build`. See QA.md for release evidence and deployment boundaries.
