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
| Cash runway software shortlist (B1) | https://trialagents.com/apps/best-cash-runway-software-biotech | Published in public-site PR #178; live verified 12 November 2026; closing footnote removed in PR #179 |
| Runway in ChatGPT (C1) | https://trialagents.com/apps/manage-biotech-cash-runway-chatgpt | Published in public-site PR #180; live verified 12 November 2026 |
| CRO payment timing (D1) | https://trialagents.com/apps/cro-payment-timing-biotech-cash-runway | Published; production URL checked 12 November 2026 |
| Excel-to-Runway migration (E2) | https://trialagents.com/apps/excel-to-trialagents-runway | First Series E post; Published in [public-site PR #182](https://github.com/tarous89/trialagents-public/pull/182), merge `6ce6d6f2382c5926fc0f5972eab9e4f952064daa`. Exact-head tests and desktop/mobile checks passed. Cloudflare build and live C/D/E content, images, canonical/schema, final CTA, app index/hub, sitemap.xml, llms.txt and llm.xml verified on 12 November 2026. |
| App pages index | https://trialagents.com/apps | Published; production URL checked 12 November 2026 |

These are intended canonical URLs. Do not assert that a URL is live until checked on the production CDN.

## Series A — Product comparisons

### A1. TrialAgents Runway vs Excel: Biotech Cash Planning Compared

- **Live canonical:** https://trialagents.com/apps/runway-vs-excel
- **Intent:** help biotech founders, operators and finance leads choose between an Excel model and a connected, customizable platform.
- **Approved order:** native ChatGPT/Claude → unlimited customization possibilities → add/connect more apps → automations, access control, logs/history and Runway functions → concise comparison table → closing CTA.
- **Assistant modes:** use the actual app in supported chat surfaces, manage supported functions conversationally, customize the whole app/build bespoke apps, and continue on the web. Browser screenshots are explicitly browser views; no claim of fresh end-to-end host acceptance testing.
- **Runway evidence:** monthly actuals, locked budgets, snapshots and scenario previews; configured follow-up/FX workflows; authorized data access. Show how adjacent operational apps can connect; do not promise automatic sync.
- **Editorial format:** roughly 800 words, byline/date/first-party disclosure, opening answer, jump links, six consistently numbered headings, three genuine Runway 2.1.0 demo screenshots, compact table, one closing “Open TrialAgents” CTA.
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
| Trust and evidence | Byline, meaningful review date, first-party disclosure, fictional demo labels, scope limits and first-party disclosure; closing source block removed at owner request in PR #179 |
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
- **Status:** Published at https://trialagents.com/apps/best-cash-runway-software-biotech; public-site PR #178, merge `8ebb2906ef61860ff8eae892f90cd9ce5a56c94b`; live checked 12 November 2026.
- **Accepted implementation:** five options (TrialAgents, Float, Fathom, Jirav, Excel), workflow-fit table, concise vendor profiles, official Float/Fathom/Jirav marks, two Runway browser screenshots, no pricing.
- **Final ending:** public-site PR #179 removes both A1 and B1 closing footnote sections. The Runway CTA is the final article block before the global footer; retain inline source links and near-claim limits.
- **Evidence:** Float's official Xero/QuickBooks and prerequisites pages; Fathom official homepage/scenario docs; Jirav planning and account-capability docs; Microsoft Copilot-in-Excel documentation. All reviewed 12 November 2026; not a comparative hands-on benchmark.
- **Assets:** Float inline logo from floatapp.com, Fathom official website SVG lockup, Jirav official website header logo. Logos identify vendors, not endorsements. Fathom's pale logo uses a dark background for contrast.

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
- Provide a step-by-step documented ChatGPT Runway example; describe hands-on testing only when actually completed.
- Show authorized inputs, proposal and human-reviewed writes.
- Explain deterministic calculations, access limitations and what remains in the browser.
- Compare verified competing AI approaches without claiming exclusivity.
- **Status:** Published at https://trialagents.com/apps/manage-biotech-cash-runway-chatgpt; [public-site PR #180](https://github.com/tarous89/trialagents-public/pull/180), merge `31aa26d461b799eceb221498cf0e94ad48ccda8b`; live CDN verified 12 November 2026.
- **Publication QA:** exact-head automated checks passed, including desktop/mobile coverage, image loading and the final-CTA assertion for A1/B1/C1. Production Cloudflare build, served HTML, app-index/hub links and llms.txt entry verified. The generated sitemap passed build validation; a direct live sitemap fetch returned HTTP 403 in this session, so live sitemap retrieval was not independently confirmed. This verifies the article, not an end-to-end host workflow.
- **Evidence:** live catalog `life.cash-runway 2.1.0`, digest `dcf578b91b2c1ac05afe42ea2f1e2172c280783c9a1602e90d054fdec1cc651a`; current apps guide, template interaction contract and examples read through the connected tools. Reviewed Runway calculation/integration test source; reading tests is not evidence they were executed in this session.
- **Verification boundary:** publish as a documented guided workflow with example prompts, not a measured or completed end-to-end ChatGPT/Claude session. Do not fabricate host screenshots. Existing Runway template screenshots are browser views.
- **Important operational details:** opening balance uses a month-end date; contingent financing is separate from base runway; assistant proposes inputs, app calculates outputs; user builds transient previews in Scenarios; scenario save and adoption are distinct reviewed steps; app writes frozen close snapshots.
- **Connected platform:** explicitly bind authorized existing Programs/shared tables; default template installation does not imply automatic connections. Whole-app customization preserves saved IDs, data bindings and access. Optional automations require separate setup; no background-runner promise.
- **Final layout:** concise numbered tutorial, prompts and expected outcomes, workflow illustration and three genuine browser screenshots (Overview, Scenarios, Actuals), one Start with Runway card last; no closing footnote. Media enrichment released with public-site PR #182.

### C2. How to Model Biotech Runway with Claude
- Show verified Claude connection and authorized app actions.
- Demonstrate an illustrative milestone-delay scenario and expected outputs.
- Explain the difference between chat interaction, app edits and automation.
- Document host and privacy constraints, missing functionality and review steps.
- **Status:** requires separate Claude acceptance testing.

## Series D — Biotech-specific operational workflows

### D1. Model CRO Payment Timing in TrialAgents Runway
- **Canonical:** https://trialagents.com/apps/cro-payment-timing-biotech-cash-runway (unchanged).
- **Owner correction:** the original generic cash-planning article is superseded. D is a recurring category of concrete app use cases; demonstrate Runway throughout, rather than append a product section.
- **Workflow:** Settings/Plan input mapping → Shift a program +3 months → second case adds Scale program spend +50% → Cash flow inspection → milestone review → save/adopt separately.
- **Fictional baseline:** EUR 2.4m at 31 December 2026; zero reserve; EUR 0.2m monthly unassigned company operating spend from January 2027; one EUR 0.6m committed Clinical one-off CRO spend in March, assigned to Program B; one Runway-owned Program B milestone in June. No financing, positions or FX movements.
- **Scenario semantics:** shift_program moves all program-linked lines, positions and Runway-owned milestones. The example isolates one spend line and one milestone, moving them to June and September respectively. scale_program +50% changes the sole spend to EUR 0.9m. This is a cost-overrun stress assumption, not an estimate that delays generally cost 50% more. Programs-owned milestones are read-only and are not changed by Runway.
- **Independently checked EUR m results (baseline / delay / delay+cost):** March 1.20/1.80/1.80; June 0.60/0.60/0.30; August 0.20/0.20/-0.10; September 0.00/0.00/-0.30. Milestone cash: June 0.60 / September 0.00 / September -0.30. First negative months: October / October / August. Zero is not a positive reserve.
- **Media:** three genuine browser demo screenshots (03-plan, 05-scenarios, 02-cash-flow); calculated accessible SVG chart with text/table equivalent. Demo screenshots are not a run of the worked example.
- **Evidence:** current life.cash-runway 2.1.0 documentation and source read 12 November 2026 (shift_program and scale_program behavior checked). [Clene clinical accrual policy](https://www.sec.gov/Archives/edgar/data/1822791/000143774925008956/R26.htm) supports the brief cash/expense distinction. No fresh host end-to-end test or customer migration claimed.
- **Release:** Published in [public-site PR #182](https://github.com/tarous89/trialagents-public/pull/182), merge `6ce6d6f2382c5926fc0f5972eab9e4f952064daa`. Exact-head tests and desktop/mobile checks passed. Cloudflare build and live C/D/E content, images, canonical/schema, final CTA, app index/hub, sitemap.xml, llms.txt and llm.xml verified on 12 November 2026.

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

### E2. Move Your Biotech Cash Forecast from Excel to TrialAgents Runway
- **Canonical:** https://trialagents.com/apps/excel-to-trialagents-runway
- **Category:** first published Series E post; practical setup/migration, separate from E1's unbuilt spreadsheet download.
- **Method:** retain the dated source workbook; map source inputs to Settings, Plan, People and Actuals; prepare reviewed records; reconcile monthly cash; configure access and ownership before cutover.
- **Usable resource:** in-article mapping checklist, prompt, reconciliation example and cutover checklist. No downloadable workbook or native import feature is promised.
- **Boundaries:** Runway has no built-in Excel parser, formula/macro conversion or live spreadsheet synchronization. Use supported assistant proposals/manual inputs. Reuse shared tables via explicit bindings. Never import forecast outputs or frozen snapshots as editable inputs.
- **Example:** fictional EUR 1,000,000 opening balance minus EUR 100,000 operating spend minus EUR 200,000 CRO payment = EUR 700,000 closing cash. Independently recalculated; not a completed customer migration.
- **Media:** Keep/Map/Reconcile workflow illustration, two genuine browser demo screenshots (03-plan and 02-cash-flow), mapping and reconciliation tables.
- **Product evidence:** current life.cash-runway 2.1.0 data contract, interaction contract and limits reread 12 November 2026.
- **Release:** Published in [public-site PR #182](https://github.com/tarous89/trialagents-public/pull/182), merge `6ce6d6f2382c5926fc0f5972eab9e4f952064daa`. Exact-head tests and desktop/mobile checks passed. Cloudflare build and live C/D/E content, images, canonical/schema, final CTA, app index/hub, sitemap.xml, llms.txt and llm.xml verified on 12 November 2026.

## Production method and next steps

The approved A1 comparison is live. Preserve its concise, platform-first editorial structure; do not revert to PR #174's seven-screenshot layout, compulsory pricing section or long mandatory FAQ. Use the shared [playbook](../TRIALAGENTS_APPS_SEO_AND_LLM_CONTENT_PLAYBOOK.md) as the governing standard for future articles.

The public implementation lives in `tarous89/trialagents-public`: `static/apps/runway-vs-excel.html`, `static/apps/runway.css` and `scripts/render-app-pages.mjs`. Follow that repository's publishing checks and verify served production content after every release. These Markdown files are planning/editorial records, not the deployed source.

All five categories now have a published example: A1, B1, C1, revised D1 and E2. E1 remains a separate candidate requiring a real validated spreadsheet before publication; C2 needs separate Claude evidence. Before publishing, verify competitor facts, separately test host-specific behavior and create any promised assets. Link each article to the official Runway hub; add cross-series links only to real, relevant published pages. Monitor indexing, engagement, CTA conversion and observed AI referrals separately from implementation QA.
