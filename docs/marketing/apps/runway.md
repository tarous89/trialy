# Runway — SEO and LLM content plan

[All app plans](README.md) · [Shared TrialAgents Apps SEO & LLM Content Playbook](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md)

**App:** Runway by TrialAgents · **Approved catalog:** life.cash-runway 2.1.0 · **Reviewed:** 12 November 2026.  
**Audience:** early-stage biotechnology founders, CEOs, COOs and fractional CFOs.  
**Positioning:** a customizable, persistent monthly cash and scenario planning app connected to authorized TrialAgents workspace data, with supported ChatGPT and Claude workflows.  
**Source:** [Runway blueprint](../../product/app-template-blueprints/apps/RUNWAY.md) and approved app catalog in the TrialAgents platform repository.

**Important limits:** no native bank/accounting sync, general ledger, payroll, 13-week cash model, three-statement planning, cap table, or automatic Excel synchronization. AI-assisted edits are subject to permission and review; the app's forecasts use deterministic calculations. Always verify current host support separately.

## Canonical page inventory

| Page | URL | State |
| --- | --- | --- |
| Runway official app page | https://trialagents.com/apps/runway | Source merged to public-site main ([PR #173](https://github.com/tarous89/trialagents-public/pull/173)); CDN deployment not verified |
| Runway vs Excel | https://trialagents.com/apps/runway-vs-excel | Source merged to public-site main; CDN deployment not verified |
| App pages index | https://trialagents.com/apps | HTML authored in the same PR; CDN deployment not verified |

These are intended canonical URLs. Do not assert that a URL is live until checked on the production CDN.

## Series A — Product comparisons

### A1. TrialAgents Runway vs Excel: Biotech Cash Planning Compared
- **Intent:** choosing between spreadsheets and a reusable financial app.
- Direct conditional answer with genuine strengths on both sides.
- Feature matrix: cash flow, scenarios, budgets, program milestones, model flexibility, access and AI workflows.
- Fictional CRO payment-delay case using the same assumptions in both approaches.
- Reasons to choose Runway, reasons to keep Excel and when to use both.
- FAQ, dates, source links and product CTA.
- **Status:** Source merged in PR #173; production CDN verification pending.

### A2. TrialAgents Runway vs Float
- **Intent:** alternative to small-business cash forecasting software.
- Define verified product scope and current pricing models.
- Compare accounting connections, forecast depth, biotech spending, milestones and supported AI workflows.
- Model vendor-payment timing across R&D programs in a fictional example.
- Explain circumstances favoring each product and any complementary use.
- **Status:** research candidate; do not publish before verification.

## Series B — Alternatives and category discovery

### B1. Best Cash Runway Software for Early-Stage Biotech
- Define the unique needs of pre-revenue R&D, clinical-stage spend and funding milestones.
- Research and fairly shortlist actual competing software, including spreadsheets.
- Comparison matrix: budgeting, cash flows, CRO commitments, headcount, scenarios, access and integrations.
- Recommendations by company stage and finance maturity.
- Limitations of TrialAgents and independent buying criteria.
- **Status:** research candidate.

### B2. Best Float Alternatives for Biotech Startups
- Identify documented reasons a biotech team might seek a different tool.
- Compare accurate, current alternatives and avoid invented rankings.
- Highlight verified accounting integrations versus configurable R&D planning.
- Explain migration requirements and team-specific decisions.
- Link the Runway vs Float comparison when it exists.
- **Status:** research candidate.

## Series C — AI-native use in ChatGPT, Claude and MCP

### C1. How to Manage Biotech Cash Runway in ChatGPT
- Define prompt-only advice, spreadsheets, MCP and persistent app workflows.
- Provide a step-by-step, tested ChatGPT Runway example.
- Show authorized inputs, proposal and human-reviewed writes.
- Explain deterministic calculations, access limitations and what remains in the browser.
- Compare verified competing AI approaches without claiming exclusivity.
- **Status:** requires actual host testing and screenshots.

### C2. How to Model Biotech Runway with Claude
- Show verified Claude connection and authorized app actions.
- Demonstrate an illustrative milestone-delay scenario and expected outputs.
- Explain the difference between chat interaction, app edits and automation.
- Document host and privacy constraints, missing functionality and review steps.
- **Status:** requires separate Claude acceptance testing.

## Series D — Biotech-specific operational workflows

### D1. How CRO Payment Timing Changes Biotech Cash Runway
- Separate payment-date shifts from additional expenditure.
- Define milestones, contracts, planned hires and financing assumptions.
- Show a reproducible fictional timeline with baseline and delayed scenarios.
- Compare spreadsheet/manual and structured app implementation.
- Explain decision controls, limitations and source assumptions.
- **Status:** content candidate.

### D2. How to Forecast Cash to the Next Phase I Milestone
- Define milestone and working-capital needs at the relevant biotech stage.
- Build a monthly cash forecast with CRO, people and funding components.
- Compare baseline, downside and financing-delay cases.
- Show how to document month-end actuals and board-ready snapshots.
- Include a checklist and explain specialist software boundaries.
- **Status:** content candidate.

## Series E — Practical guides, templates and migration

### E1. Free Biotech Cash Runway Spreadsheet Template
- Release a working spreadsheet with tested formulas before marketing a download.
- Explain opening cash, recurring costs, cash-in types and sensitivity cases.
- Add fictional data and model validation instructions.
- Explain use cases where Excel is best and Runway is a helpful complement.
- Link to a working template file and the Runway product page.
- **Status:** asset must be created before publication.

### E2. Move from Excel to a Biotech Runway App
- Inventory input data, formulas, dependencies and important business rules.
- Explain field mappings to the current Runway catalog.
- Document a supported manual/import process; do not promise direct synchronization.
- Reconcile totals and verify access control before switching workflows.
- Include rollback, limitations and a finance reviewer checklist.
- **Status:** research and workflow verification needed.

## Production method and next steps

The product hub and A1 comparison were merged via PR #173; verify CDN delivery before calling either page live. Validate production HTML, canonical metadata, static assets, real header/footer, sitemap and LLM discovery files after CDN release. Then prioritize D1 and C1 for original industry-specific and assistant-specific evidence. Only publish additional pages when competitor facts, live host tests or promised downloadable assets are available.

Use the shared [five-series standard](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md) for each article's layout, disclosure, source evidence, structured data, review workflow and internal linking. Every new Runway article links to the official Runway hub, and the index links back to this plan.
