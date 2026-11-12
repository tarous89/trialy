# Runway — SEO and LLM content plan

[All app plans](README.md) · [Shared TrialAgents Apps SEO & LLM Content Playbook](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md)

**App:** Runway by TrialAgents · **Approved catalog:** life.cash-runway 2.1.0 · **Reviewed:** 12 November 2026.  
**Audience:** early-stage biotechnology founders, CEOs, COOs and fractional CFOs.  
**Positioning:** TrialAgents is a native ChatGPT/Claude platform for using and managing apps, customizing whole apps or creating bespoke ones, and connecting operational apps. Runway is the biotech cash-planning entry point to that platform.  
**Source:** [Runway blueprint](../../product/app-template-blueprints/apps/RUNWAY.md) and approved app catalog in the TrialAgents platform repository.

**Important limits:** no native bank/accounting sync, general ledger, payroll, 13-week cash model, three-statement planning, cap table, or automatic Excel synchronization. AI-assisted edits are subject to permission and review; the app's forecasts use deterministic calculations. Always verify current host support separately.

## Canonical page inventory

| Page | URL | State |
| --- | --- | --- |
| Runway official app page | https://trialagents.com/apps/runway | Published; production URL checked 12 November 2026 |
| Runway vs Excel | https://trialagents.com/apps/runway-vs-excel | Published editorial comparison; final revision [PR #177](https://github.com/tarous89/trialagents-public/pull/177), live verified 12 November 2026 |
| App pages index | https://trialagents.com/apps | Published; production URL checked 12 November 2026 |

These are intended canonical URLs. Do not assert that a URL is live until checked on the production CDN.

## Series A — Product comparisons

### A1. TrialAgents Runway vs Excel: Biotech Cash Planning Compared

- **Live canonical:** https://trialagents.com/apps/runway-vs-excel
- **Intent:** help biotech founders, operators and finance leads choose between an Excel model and a connected, customizable platform.
- **Approved order:** native ChatGPT/Claude → unlimited customization possibilities → add/connect more apps → automations, access control, logs/history and Runway functions → concise comparison table → closing CTA.
- **Assistant modes:** use the actual app in supported chat surfaces, manage supported functions conversationally, customize the whole app/build bespoke apps, and continue on the web. Browser screenshots are explicitly browser views; no claim of fresh end-to-end host acceptance testing.
- **Runway evidence:** monthly actuals, locked budgets, snapshots and scenario previews; configured follow-up/FX workflows; authorized data access. Show how adjacent operational apps can connect; do not promise automatic sync.
- **Editorial format:** roughly 800 words, byline/date/first-party disclosure, opening answer, jump links, six consistently numbered headings, three genuine Runway 2.1.0 demo screenshots, compact table and sources, one closing “Open TrialAgents” CTA.
- **Visual reference:** 1040 px outer width; 18 px desktop / 17 px mobile body; dark text; consistent pale-green headings and dark-green number badges. Shared real site header/footer/contact/analytics retained.
- **Pricing:** removed from article, matrix and metadata. The earlier flat-rate pricing request is superseded. The global navigation Pricing link may remain.
- **Fairness:** acknowledge Excel's modeling flexibility and Copilot. State meaningful Runway boundaries briefly; no fictional performance benchmark.
- **Release:** PRs #175–177 supersede the seven-screenshot PR #174 design. Final merge: `6d676187ff01e0bc805f0a99c01ab74ea07f8ae2`. Exact-head public-site checks passed, including desktop/mobile browser coverage; Cloudflare build and live revision were verified.

### SEO and AI-discovery audit — 12 November 2026

| Check | Finding |
| --- | --- |
| Served content | Production HTML contains the complete article and comparison text without requiring JavaScript |
| Search metadata | Descriptive unique title/description, self-canonical, `index,follow`, one article H1 |
| Structure | Ordered H2 sections, jump links and semantic comparison table; concise answer-first content |
| Structured data | Parseable Article and BreadcrumbList; headline, organization author/publisher and publication/update dates match the article |
| Trust and evidence | Byline, meaningful review date, first-party disclosure, fictional demo labels, official Microsoft/product source links and scope limits |
| Images/readability | Three real screenshots with alt text and dimensions; later images lazy-loaded; desktop/mobile checks passed for final release |
| Discovery | Sitemap and supplemental LLM discovery files checked; robots.txt explicitly permits major search/AI discovery agents |
| Preview enhancement | Title/description social metadata present; dedicated social image and Article image remain optional improvements |
| Not established | Search Console indexing, real-user Core Web Vitals, actual search rankings, AI citations/referrals or measured conversion uplift |

**Conclusion:** the page follows core technical SEO and machine-readable editorial practices. This is not a guarantee of indexing, rankings, rich results or recommendations by ChatGPT/Claude. Ordinary HTTP access and robots permissions do not independently prove each crawler's CDN access.

### A2. TrialAgents Runway vs Float
- **Intent:** alternative to small-business cash forecasting software.
- Define verified product scope; omit pricing from the Series A comparison.
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

The approved A1 comparison is live. Preserve its concise, platform-first editorial structure; do not revert to PR #174's seven-screenshot layout, compulsory pricing section or long mandatory FAQ. Use the shared [playbook](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md) as the governing standard for future articles.

The public implementation lives in `tarous89/trialagents-public`: `static/apps/runway-vs-excel.html`, `static/apps/runway.css` and `scripts/render-app-pages.mjs`. Follow that repository's publishing checks and verify served production content after every release. These Markdown files are planning/editorial records, not the deployed source.

Prioritize D1 and C1 for additional industry-specific and assistant-specific evidence. Before publishing, verify competitor facts, separately test host-specific behavior and create any promised assets. Link each article to the official Runway hub; add cross-series links only to real, relevant published pages. Monitor indexing, engagement, CTA conversion and observed AI referrals separately from implementation QA.
