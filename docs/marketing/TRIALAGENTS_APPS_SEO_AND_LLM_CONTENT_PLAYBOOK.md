# TrialAgents Apps: SEO and LLM Content Playbook (Series A–E)

**Status:** Editorial guidance for planning and publishing; not a claim of implemented website behavior.  
**Scope:** TrialAgents built-in apps (current and future). This is the shared A–E methodology; keep app-specific content plans in linked, separate Markdown files.  
**Owner:** Marketing/content. **Review trigger:** material changes to product capabilities, competitors, assistant integrations, or search guidance.

## Final article-ending and Series B/C rules — 12 November 2026

These rules supersede earlier closing-source-section instructions throughout this document.

- End every app blog article with one **Start with [App]** CTA card. It is the final article block immediately before the shared site footer. No sources, methodology, caveats, related-reading sections or footnotes after it.
- Remove closing footnote sections rather than moving them below the CTA. Keep essential factual qualifications next to the claim, product-source links inline, byline/date and a short first-party disclosure near the top. Keep detailed evidence, asset provenance and test limitations in the app's Markdown plan.
- Keep pricing out of these app comparisons and shortlists unless the owner explicitly commissions pricing content.
- **Series B:** lead with a useful shortlist table and differentiate options by workflow fit; no invented overall scores. TrialAgents' profile keeps native ChatGPT/Claude → whole-app customization → connected apps → relevant controls order. Use official identifying logos where available and genuine, clearly captioned screenshots. Avoid repeated CTAs.
- **Series C:** lead with what the connected app lets the reader do inside the named assistant. Provide specific prompts, prerequisites, expected results and review points. Distinguish app UI, conversational record proposals, source customization, shared data and optional automations. Explain which steps happen in the app. Do not label a documented recipe as a completed end-to-end host test.
- The standard Runway app computes financial outputs deterministically. Assistants prepare inputs and commentary; do not tell them to invent or overwrite derived forecasts or frozen snapshots. Scenario previews are distinct from saved scenarios and adopted forecasts.
- Use the approved wider, high-contrast editorial design and consistent numbered green headings. Keep text concise. No simulated chat screenshots, fictional product interfaces, unsourced vendor marks or statements of host parity.
- Browser screenshots must be labeled as browser screenshots; they are not evidence of embedded ChatGPT/Claude rendering. Store the reviewed template version/digest and the verification scope in the app plan.
- Keep app plans current with published URLs and verified release status. Source merge, passed checks and live CDN availability are separate stages.

## How the per-app plans are organized

This document is the **single shared methodology** for all TrialAgents app SEO/LLM pages. Do not copy or modify these rules for each new app. Instead, create one linked page per app.

- [App-specific content plans index](apps/README.md): the inventory of apps with plans, linked in the order they are added.
- [Per-app Markdown template](apps/_APP_CONTENT_PLAN_TEMPLATE.md): copy this when preparing a new app's detailed plan.
- Store each plan at `docs/marketing/apps/<app-slug>.md`, using the approved public app name and a stable slug.
- Each plan must link back to this playbook and to the [app plan index](apps/README.md). When publishing a plan, add its link, status, and app name to that index.
- The app plan defines **specific page ideas, competitor candidates, evidence, priority, titles, slugs, and series A–E article outlines**; the shared playbook defines **how all five series are researched, written, laid out, and checked**.
- Add app plans **one at a time** after the app's public name, scope, and capabilities are verified. Do not create placeholder app campaign pages or claim any proposed content is already published.

## Approved editorial decisions — 12 November 2026

These decisions govern future blog posts, especially Series A, and supersede earlier drafts requiring pricing sections, seven screenshots, or landing-page layouts. The accepted reference is [Runway vs Excel](https://trialagents.com/apps/runway-vs-excel); its implementation and audit are recorded in [Runway's plan](apps/runway.md).

- **Promote the platform confidently.** The named app is the entry point to TrialAgents, a customizable, connected platform for biotech teams. Explain the platform value alongside app-specific benefits. Avoid timid generic “AI integration” language; also avoid unsupported absolute superiority claims.
- **Mandatory advantage order:** (1) native ChatGPT and Claude connection, (2) unlimited customization possibilities, (3) adding and connecting more TrialAgents apps, (4) relevant automations, access control, logs/history and app-specific functions. Use this order in the introduction, detailed sections and comparison matrix.
- **Explain distinct assistant modes:** use the actual app interface inside supported ChatGPT/Claude surfaces; manage supported app functions conversationally; ask the assistant to customize the whole app or build a bespoke one; continue using the app on the web. Do not reduce this to data export or a conventional connector. Verify each host independently and state material setup/permission limits once, concisely.
- **Customization is broader than settings:** cover fields, views, layouts, charts, logic and workflows, plus bespoke apps. “Unlimited customization possibilities” describes breadth, not unlimited compute, unrestricted access, guaranteed implementation of any request, or absence of platform constraints.
- **Platform expansion is concrete:** explain how adding apps connects operational workflows through explicitly configured, permission-controlled data. Use relevant examples; do not imply every app is automatically synchronized.
- **No pricing in comparisons:** omit prices, plan tables, cost comparisons, affordability claims and pricing FAQs from Series A article copy, matrices and metadata. This supersedes the earlier request to promote multi-app flat-rate pricing. Standard shared navigation may retain its Pricing link. If a separately commissioned pricing article is later requested, verify the current multi-app flat-rate model then.
- **Write a blog article:** one clear H1, short deck, author/date/disclosure, concise opening answer, jump links, useful sections, compact table, sources and one closing CTA. Avoid repeated hero banners, sales cards, repeated CTAs and long marketing paragraphs.
- **Be concise:** use short paragraphs and concrete benefits. Runway's accepted article is about 800 words; this is a reference, not a quota. Add only evidence that helps a decision. FAQs and worked examples are optional when they add distinct value.
- **Use genuine visual evidence selectively:** the accepted Runway article has three relevant screenshots, not one mandatory screenshot per section. Caption fictional demo data and the actual surface shown. A browser screenshot does not prove an embedded assistant interface.
- **Increase reading width and font size:** Runway reference is approximately 1040 px outer article width, 18 px desktop body and 17 px mobile body. Keep paragraphs readable and tables/screenshots wide enough to inspect.
- **Use darker text and one heading treatment:** reference body #24382b, secondary text #405547; numbered section headings use pale green #e8f1ea, border #c9dacd, title #102d1b and white numbers on #205c37. Use one consistent style and spacing across major sections; do not alternate arbitrary section colors. Icons may supplement meaning, not replace heading text.
- **Preserve the real site shell:** standard TrialAgents header, footer, contact flow, analytics, brand colors and working destinations. Keep mobile reading order, responsive tables and no horizontal page overflow.
- **Conversion through clarity:** answer the reader's comparison question first, demonstrate meaningful platform advantages, acknowledge relevant competitor strengths and boundaries briefly, and offer one clear next step after the evidence. Do not disguise first-party promotion as an independent review.
- **Publishing is verified, not assumed:** source merge, build completion and live CDN verification are separate states. Record the final deployed URL and review date. Preserve canonical URLs and check metadata, schema, assets, links and discovery files.

## 1. Goal and positioning

Build a trustworthy, interlinked library of pages that helps people choose the appropriate software or workflow for early-stage biotech, CRO, clinical operations, research, and executive teams. Capture both traditional search demand and questions posed to ChatGPT, Claude, and other AI discovery tools. Pages should still serve a human reader first.

TrialAgents platform positioning to demonstrate confidently with current evidence (use the approved advantage order above):

- **Apps first:** ready-to-use, reusable applications, not only prompts or chatbot-generated reports.
- **AI-native:** users can discover, use, and customize authorized apps through supported ChatGPT and Claude integrations; the same apps can be used on the web.
- **Customizable:** users can adjust supported fields, views, workflows, and app source according to their requirements.
- **Connected:** applications may share authorized, explicitly connected data; never imply automatic integration, unlimited data visibility, or unrestricted interoperability.
- **Biotech and CRO relevance:** emphasize pre-revenue R&D, lean teams, outsourced work, clinical operations, and executive decisions where pertinent to the specific app.
- **Lean-team practicality:** show the actual setup and day-to-day workflow for small teams, without asserting unsupported pricing or time-to-value.

Current product scope and verified boundaries are in [product direction](../product/PRODUCT_DIRECTION.md) and [project context](../../CONTEXT.md). The TrialAgents platform is distinct from Intel and CTIS. Do not mix those product claims.

**Editorial principle:** The most convincing content explains *who should choose TrialAgents, who should not, and why*, with evidence. Do not automatically rank TrialAgents first. Competitors may be better for specialized needs.

## 2. The five reusable series

| Series | Type | Core query pattern | Intent | Primary page outcome |
| --- | --- | --- | --- | --- |
| **A — Head-to-head** | TrialAgents vs competitor | “TrialAgents [App] vs [Vendor]”; “[Vendor] vs TrialAgents” | Comparison / decision | Identify which option is best under which conditions |
| **B — Alternatives** | Vendor alternatives and category shortlists | “[Vendor] alternatives”; “best [category] software” | Discovery / switch | Provide a credible, curated shortlist and choice framework |
| **C — AI-native discovery** | ChatGPT, Claude, MCP, assistant workflows | “[workflow] inside ChatGPT”; “Claude [category] apps” | Capability / AI workflow | Demonstrate assistant-specific, currently verified ways of working |
| **D — Biotech-specific workflows** | Persona, stage, or problem pages | “best [workflow] for small biotech”; “how to [problem]” | Industry need / education | Solve a real life-sciences operational problem with a worked example |
| **E — Practical resources** | Templates, migration, buying guides, tutorials, and own alternatives | “[category] template”; “move from Excel”; “TrialAgents alternatives” | Implementation / consideration | Give a usable resource and clear next action |

These are **five distinct search-intent families**, not rigid publication quotas. Use only the series that naturally fit an app. A page must add material value beyond changing a vendor name, profession, or year.

### Article inventory for each app

Before proposing topics, record:

1. Exact public app name, canonical app URL, approved template ID/version and availability.
2. Verified app capabilities, roles/data contracts, supported host surfaces, permissions, and limitations; distinguish live, optional, configurable, planned, and unverified.
3. Target users, organization size, industry-specific jobs-to-be-done, and essential search vocabulary.
4. Genuine alternative products and tools that those users consider (including spreadsheets where relevant); capture current names and lifecycle status.
5. Search intent clusters: direct comparison, switching, category selection, assistant integration, industry problem, downloadable resource.
6. Existing site pages to avoid overlapping keywords or creating near-duplicate pages.
7. Evidence available: hands-on tests, primary documentation, public pricing, product screenshots, reusable fictional dataset, and editorial reviewer.

**Selection rule:** no page gets approved until its specific question, audience, differentiating evidence, and unique value versus existing pages can be stated in one sentence.

## 3. Shared research and publishing method

### 3.1 Research each claim

- Prefer first-party product documentation, changelogs, public product pages, integration directories, and tested product behavior; verify dates.
- Use independent sources for qualitative claims when relevant. Record the exact source URL, accessed date, and claims it supports.
- Distinguish “natively supported,” “supported via connector/MCP,” “possible with custom configuration,” “read-only,” “requires an account or subscription,” and “not verified.”
- Do not equate an MCP endpoint or account connection with a working in-chat interactive UI. Test ChatGPT, Claude, and web experiences **separately**.
- Do not claim universal AI advantage: other tools can be AI-native or support MCP. Differentiate using the documented combination of app reuse, authorized shared data, customization, team workflows, and life-sciences focus.
- Test numerical models and data transformations independently. Mark illustrative examples fictional and list assumptions.
- Never invent a competitor price, discount, customer count, integration, compliance certification, or feature. Mark unavailable evidence “not publicly verified.”
- Track rebrands, acquisitions and shutdowns. A discontinued product is a *replacement* search topic, not an active product recommendation.
- Credit sources next to material assertions. Use short paraphrases; no copied marketing blocks, proprietary screenshots without rights, or unlicensed logos.

### 3.2 Prioritize by intent and value

Score candidate topics on a simple 1–5 scale for: (a) fit to the app and target buyer; (b) observed query demand from Search Console/keyword research or credible user questions; (c) realistic decision or adoption intent; (d) strength of original evidence; (e) novelty versus existing content; and (f) maintenance cost (reverse-scored).

Prioritize high-intent comparisons, credible vendor-alternative topics, authentic AI-assistant discovery, and distinctive biotech problems. Keyword volume and difficulty are **measurements to research**, not numbers to invent. Test the first wave before expanding.

### 3.3 Differentiate intent; avoid cannibalization

Each cluster has one primary canonical URL and a single main query intent:

- **A:** decision between **two named products**.
- **B:** selection among **several alternatives** or replacements.
- **C:** **assistant/environment** capability and workflow.
- **D:** **life-sciences problem or persona**, whether or not software is selected.
- **E:** **completion of a task**, template, migration, checklist, or implementation.

Do not publish both “7 best X tools” and “10 best X tools” for the same audience without a substantive distinction. Do not create one near-identical page per tiny app/vendor keyword permutation. Use internal anchors or FAQs where a separate page would add little.

### 3.4 Search + AI-discovery fundamentals

- Write the **direct answer in the first 80–120 words**, with trade-offs and scope. Make it independently understandable.
- Use descriptive human-language H1/H2s that mirror genuine user questions and vendor/category entities.
- Put the primary answer, matrix, or steps in crawlable HTML text; do not hide critical information in images, client-only widgets, or login-required pages.
- Supply verifiable details: dates, app/version labels, tested environment, data assumptions, how the conclusion was reached, and source links.
- Keep comparisons structured and easy to quote accurately: concise verdict, explicit comparison criteria, grouped use cases, and limits.
- Include an editor/reviewer identity or function, publication and substantive update dates, and a plain-language disclosure that TrialAgents produces the pages.
- Add descriptive title tags, unique meta descriptions, canonical tags, breadcrumb navigation, consistent internal links, sitemap entries, and accurate preview metadata.
- Use applicable schema.org structured data only when it truthfully describes visible content (e.g., Article, BreadcrumbList, and valid software/product markup on appropriate pages). Structured data is **not** a guarantee of search enhancements or LLM citations. Do not invent ratings, review counts, FAQ rich-result eligibility, or third-party endorsements.
- Make pages mobile-readable, fast, accessible, and useful without JS. Comparison tables need responsive treatment with discernible headers and no unreadable clipped cells.
- Keep AI-generated drafts subject to evidence review. No special “LLM keyword stuffing,” invisible prompt instructions, or guarantees of inclusion in AI answers.

## 4. Shared page design system

Keep a recognizable editorial shell while allowing each series a different dominant component.

**Top-of-page anatomy:**

1. Breadcrumbs: Apps → [app] → [series/page].
2. Small editorial label (e.g., Comparison, Alternatives, AI workflow, Biotech guide, Resource).
3. One unambiguous H1, one-sentence deck, verified **Updated** date, editor/reviewer, disclosure.
4. Answer-first **Quick answer / Recommendation / What you will learn** block (ordinary neutral styling, not a sensational winner banner).
5. Compact table of contents linking to deep-dive H2 sections.
6. The series-specific evidence sections; Series A uses the mandatory platform advantage order.
7. Body: evidence, real-life scenarios, limitations, sources, and related reading.
8. Contextual app CTA **after** demonstrating value; never obscure comparison content.
9. Related pages: same-app hub and the most relevant two or three pages from other series.

**Design rules:** restrained typography and spacious cards; consistent text sizes and contrast; semantic tables; clear mobile reading order; no decorative carousels replacing evidence; no intrusive sticky CTAs; accessible link labels; plain source URLs or source references; meaningful screenshots only when verified and legally usable.

**Common CTA copy:** “Explore [TrialAgents App],” “Preview the app,” “Try the workflow,” or “Use the template” only if the destination actually supports that action. Do not imply a published app or feature that is still draft.

## 5. Series A — TrialAgents vs [Competitor]

**Purpose:** Help a user choose between one TrialAgents app and one real alternative. High commercial-intent, fairness-critical.

### Method

- Select vendors with overlapping real buying consideration or competing workflows; do not force false direct equivalence.
- Verify both products on the **same evaluation rubric** before writing.
- Use criteria appropriate to the app: primary job, target company, strengths, depth, customization, AI/ChatGPT/Claude experience, inputs/integrations, data controls, collaboration, implementation and app-specific controls. Exclude pricing from Series A.
- Add a tested or clearly labeled illustrative biotech/CRO use case when it materially helps the decision; use the same assumptions for both if comparing outputs.
- Describe an honest “choose TrialAgents if…” and “choose [Competitor] if…” and a “use together” case where relevant.
- If a competitor is a specialist and TrialAgents is a broader operating app, state that difference explicitly.
- Link to the competitor’s official documentation as evidence. Do not use invented scores or unsupported star ratings.

### Layout / H2 blueprint

1. **H1:** “TrialAgents [App] vs [Competitor]: Which Fits [Job/Persona]?”
2. **Editorial opening:** short deck, byline, real review date, first-party disclosure and concise answer explaining the platform difference; compact jump links.
3. **01 — Connect natively to ChatGPT and Claude:** interactive app use, conversational management and web continuity; be specific about current supported surfaces.
4. **02 — Unlock unlimited customization possibilities:** whole-app changes through the assistant and bespoke app creation.
5. **03 — Add more apps. Connect your operations:** concrete adjacent workflows and permission-controlled data connections.
6. **04 — Automate follow-up. Keep control:** relevant automations, access control, logs/history and capabilities specific to this comparison.
7. **05 — At a glance:** compact semantic table, with rows following the same advantage order; acknowledge the competitor's real strengths.
8. **06 — Start with [App]. Make it yours:** short next step and one clear platform/app CTA, with compact practical boundaries.
9. **Sources and scope:** official evidence, actual test scope and meaningful limitations. Add related published content where useful.

### Evidence and conversion modules

Use a few genuine, well-captioned screenshots to support claims rather than a screenshot or promotional card in every section. Runway uses three. Include a short worked example or FAQ only if it adds evidence or resolves a real unanswered question; neither is required padding. Keep first-party promotional confidence and factual fairness together. Do not fabricate benchmarks, scores, testimonials or competitor weaknesses.

**Canonical route:** preserve the app's existing public route. Current reference: `/apps/runway-vs-excel`; use `/apps/[app]-vs-[competitor]` for this app-page family unless routing is deliberately changed with redirects.  
**Primary CTA:** open TrialAgents or the real app destination after the comparison.  
**Exclude:** pricing, plan comparisons, repeated hero sections, redundant CTAs and universal “best for everyone” claims.

## 6. Series B — [Competitor] alternatives and best-of shortlists

**Purpose:** Meet switching and category-discovery intent with a *curated, credible list*, not an advertisement disguised as independent comparison.

### Method

- Identify the actual trigger: discontinued software, high price, missing capabilities, integration constraints, or a biotech-specific need.
- Clearly separate **“[Vendor] alternatives”**, **“[Vendor] replacements”** (for discontinued services), and **“best [Category] software”** (broader shortlist). These may deserve separate pages only when intent and evidence differ.
- Define inclusion criteria and evaluation dimensions before selecting the list; usually 5–8 relevant tools, never an arbitrary list length.
- Include genuine competing options even if TrialAgents is not the best on some criteria. Explicitly state product limitations.
- Verify each vendor's current name, availability, supported integrations, pricing disclosure, and relevant use case.
- Recommend by persona/scenario (e.g., founder, finance lead, CRO operations, clinical team), not a fabricated overall numeric score.
- For migration-oriented alternatives, explain data export, retraining, setup, and what cannot be moved.

### Layout / H2 blueprint

1. **H1:** “[N] Best [Vendor] Alternatives for [Audience]” or “Best [Category] Software for [Audience].”
2. **Quick answer:** who should consider switching and a short, genuinely differentiated shortlist.
3. **Why people seek alternatives:** specific limitations or product changes, sourced and dated.
4. **Comparison-at-a-glance matrix:** tools, best for, key capability, limitations, AI/host support if relevant, setup considerations.
5. **Individual option blocks (repeat for each):** what it does; best for; strengths; limitations; source; what makes it different from the named vendor. Include TrialAgents on equal editorial terms.
6. **How we selected the products:** inclusion/exclusion criteria and testing disclosures.
7. **Recommendations by use case:** a choice map, including reasons not to choose TrialAgents.
8. **Switching or implementation considerations:** how to avoid losing workflows or data.
9. **FAQ, sources, update date, related A/D/E guides and contextual CTA.**

### Specific layout modules

- **Primary:** succinct sortable-feeling static comparison table (actual sorting optional) and consistent vendor option cards.
- **Supporting:** “Best for…” labels grounded in criteria, chooser matrix, documented replacement/migration checklist.

**Suggested URLs:** /alternatives/[competitor]-alternatives-[audience]/ and /alternatives/best-[category]-[audience]/.  
**Primary CTA:** “Compare TrialAgents [App] with [Vendor]” leading to Series A, with an optional app CTA.  
**Do not:** use near-duplicate “top tools” lists for every keyword variation; never call a discontinued brand an active standalone offer.

## 7. Series C — AI-native apps in ChatGPT, Claude, and MCP

**Purpose:** Differentiate by demonstrated assistant-native use, explain real constraints, and answer searches about specific AI surfaces.

### Method

- Begin with a **capability matrix by host**, not a blanket “works with AI” assertion: ChatGPT | Claude | web, with rows for discovery, installation, opening interactive UI, reading, modifying, customizing, shared data, scheduled execution, and permissions.
- Mark statuses per host: **Verified**, **Supported by documentation but not tested**, **Requires setup**, **Unsupported**, or **Unknown**. Date each check.
- Distinguish **AI-chat advice**, **file upload/spreadsheet analysis**, **connector/MCP reads**, **app-level writes**, **interactive UI**, and **scheduled workflows**. They are different classes of functionality.
- Compare the actual supported pathways of other products; do not suggest all competing software lacks AI or MCP.
- Demonstrate a **reproducible 5–8 step workflow** with fictional data, prerequisites, user approval points, and final output.
- Explain permissions, data scope, numerical validation, integration limitations and what happens when the assistant is unavailable.
- Distinguish provider-specific features from cross-platform behavior. Never present an unverified Claude background runner as equivalent to current ChatGPT scheduled workflows.

### Layout / H2 blueprint

1. **H1:** “Best [Category] Apps That Work in ChatGPT” / “How to [Workflow] with Claude” / “MCP-Connected [Category] Software.”
2. **Immediate answer:** what “inside ChatGPT/Claude” means for the page and which operations are verified.
3. **Glossary of interaction modes:** prompts, files, MCP, connected apps, embedded UI, and autonomous tasks.
4. **Compatibility and capability matrix:** products × verified surfaces × action types.
5. **Prerequisites / setup:** accounts, access, connector and permission steps.
6. **Step-by-step example:** user request, data provided, app actions, confirmation, visible result, and validation; include screenshots only from actual tests.
7. **What can be customized?** and **What remains outside the assistant?**
8. **Security, data access, reliability and limitations:** the human approvals and audit record where supported.
9. **When to use TrialAgents vs a specialized AI product:** conditional recommendation.
10. **FAQ, sources, last tested date, relevant app CTA and links to A/D/E.**

### Specific layout modules

- **Primary:** host capability matrix plus numbered end-to-end walkthrough.
- **Supporting:** screenshot of each meaningful tested step, compact “supported/needs setup/unknown” legend, example prompt users can copy.

**Suggested URLs:** /ai-apps/chatgpt-[workflow]-apps/, /ai-apps/claude-[workflow]-apps/, /ai-apps/mcp-[category]-software/.  
**Primary CTA:** open the documented ChatGPT, Claude or web route supported for that app.  
**Do not:** conflate connecting an MCP server with in-chat UI rendering or successful background automation.

## 8. Series D — Biotech- and CRO-specific problems

**Purpose:** Own the specialized operational questions that general business software content does not answer well. This series can be educational without insisting on TrialAgents as the solution.

### Method

- Choose a *specific job* and buyer: early-stage CEO, COO, clinical operations, project lead, BD, CRO team, finance, regulatory, or research.
- Define the stage and boundary: discovery/preclinical/clinical, sponsor vs CRO, headcount/outsourcing model, jurisdiction only when relevant.
- Interview or use reliable sources to establish the real constraints; do not generalize from generic SaaS workflows.
- Use a transparent **fictional worked example** (inputs, assumptions, methods, outcomes), reusable across D/E and selected A/B pages.
- Separate facts, assumptions, opinions, and product capabilities. Any regulated, medical, financial, privacy or legal claim needs appropriate expert review.
- Answer the operational question on its own merits before featuring software.
- Compare the spreadsheet/manual path, specialist tools, and customizable app approach where they genuinely fit.
- Explain how the relevant TrialAgents app could help *with verified functionality*, and what still requires human judgment.

### Layout / H2 blueprint

1. **H1:** “How to [Specific Biotech/CRO Job]” or “Best [Category] Software for [Specific Team/Stage].”
2. **Short answer:** what to do and common failure modes.
3. **Who this applies to:** team size, development phase, operational context, exclusions.
4. **Inputs and definitions:** required records, terminology, stakeholders and constraints.
5. **Practical method:** numbered process, decision points, roles, audit/quality checks where needed.
6. **Worked example:** transparent assumptions, illustrated outcome, sensitivity or alternative scenario.
7. **How to manage this with software:** compare manual, specialist, and configurable app options fairly.
8. **Pitfalls, governance and validation:** what software or AI does not replace.
9. **Reusable checklist**, context-specific FAQ, expert/source references.
10. **Optional TrialAgents app demonstration**, related E template and relevant A/B pages.

### Specific layout modules

- **Primary:** workflow diagram/checklist and one reproducible worked example.
- **Supporting:** role-by-role decision table, stage-specific decision tree, assumptions callout, template download.

**Suggested URLs:** /biotech/[stage-or-persona]-[workflow]/ or /cro/[workflow]/ when CRO intent is genuinely distinct.  
**Primary CTA:** use the related practical guide/template (E), followed by an optional app demonstration.  
**Do not:** publish thin “for biotech” variants of generic posts; the industry detail must materially change the method.

## 9. Series E — Templates, migration, implementation, and practical resources

**Purpose:** Provide immediate utility, demonstrate the app, and convert users after they have completed or started a real task.

### Method

- Select an artifact or action that the audience can **actually use**: spreadsheet, checklist, sample dataset, vendor evaluation scorecard, tutorial, setup guide, migration, or buying guide.
- Deliver the resource in an accessible format with accurate formulas or steps; link the resource prominently before requesting signup if publicly promised.
- For a migration guide, specify source data types, export options, mapping, ownership, validation, rollback, and known losses; never promise one-click migration without proof.
- For “TrialAgents alternatives,” make an objective comparison listing when another tool is better, including unsupported or missing TrialAgents capabilities.
- Verify example calculations, document app versions and configuration prerequisites, and use fictional data (never real customer, patient or confidential records).
- Show both the **manual approach** and the **app-based approach**, including concrete costs in time/steps only if measured.
- Explain exactly which part of the resource is reusable, downloadable, editable, or currently implemented.

### Layout / H2 blueprint

1. **H1:** “Free [Category] Template,” “How to Move from [Tool] to [Workflow],” or “[Category] Implementation Guide.”
2. **Immediate utility:** prominent resource link or answer with file type, contents, prerequisites, and limitations.
3. **Who should use it / when not to.**
4. **What is included:** fields, example data, formulas, checklist items, or migration phases.
5. **Step-by-step instructions:** small verifiable steps with expected outputs and screenshots where helpful.
6. **Worked example with transparent inputs and validation checks.**
7. **Common errors / troubleshooting / data handling.**
8. **Manual resource vs TrialAgents [App]:** fair comparison; show verified capabilities and customizability.
9. **Alternatives / buying considerations** if that is the page intent.
10. **FAQ, resource version/update date, related guides, app CTA.**

### Specific layout modules

- **Primary:** actual downloadable asset or clearly navigable instructions, with preview and numbered steps.
- **Supporting:** field dictionary, migration mapping table, checklist, before/after example and verification steps.

**Suggested URLs:** /templates/[category]-template/ and /guides/[workflow]-[action]/; for own alternatives, /alternatives/trialagents-[app]-alternatives/.  
**Primary CTA:** get/use the resource; secondary CTA: try or preview the related TrialAgents app.  
**Do not:** disguise a locked lead form as a “free download,” or claim a template/feature exists before it is published.

## 10. Cross-series linking and app hubs

One indexable **app hub page** describes the real app, its supported functions, target audience, screenshots/demo, and current primary CTA. The five series should link to that app hub. Avoid multiple competing “official” app descriptions.

| From | Link to | Purpose |
| --- | --- | --- |
| A → B | Alternatives page for the compared vendor/category | Continue broad software discovery |
| A → C | Tested assistant workflow | Prove the AI-native differentiation |
| B → A | Direct comparisons of shortlisted competitors | Support purchase decisions |
| B → D | Specific industry selection problem | Explain audience fit |
| C → E | Setup guide, template, or tutorial | Help readers implement |
| C → A | Head-to-head when both tools support the host | Compare alternatives honestly |
| D → E | Working template or checklist | Turn problem understanding into action |
| D → B | Category comparison if software selection is needed | Enable product discovery |
| E → C | Tested ChatGPT/Claude walkthrough | Progress from artifact to app |
| Every series → app hub | Official source of app capabilities | Reduce ambiguity for search and assistants |

Link only when useful in context; do not insert an identical 10-link footer into every page. Maintain descriptive anchor text and avoid internal-link loops that exist solely for crawlers.

## 11. Page specification for the editorial/CMS workflow

Create one record per candidate page with:

| Field | Requirement |
| --- | --- |
| app_id / app_display_name | Real approved app and current public name |
| series | A, B, C, D, or E |
| primary_intent | One sentence describing the question the page answers |
| primary_query / secondary_queries | Research-based; never automatically assume volume |
| target_reader / workflow | Role, company stage or buyer situation |
| unique_angle | Why this page is not duplicative |
| candidate_h1 / title / meta_description | Human-language, accurate and distinct |
| canonical_path | One stable URL; redirects for renames |
| compared_entities | Exact vendor names, official sites, lifecycle status where applicable |
| evidence_table | Claim → source URL → source date → tested/not tested → owner |
| app_capabilities_verified | Host and feature evidence with date, including limitations |
| illustrative_dataset | Public fictional assumptions and reproducible calculations if needed |
| page_sections / key_module | Series blueprint and required page-specific components |
| links_out / links_in | Editorial links and related app hub |
| CTA / landing_target | Only presently working verified action |
| author / reviewer / disclosure | Clear ownership and conflict disclosure |
| published_at / reviewed_at / next_review | Current editorial lifecycle |
| quality_status | Draft → researched → reviewed → QA → published → monitored |

### Production sequence

1. **Discover:** verify current app state, relevant products and search intent.
2. **Map:** pick series, canonical URL, differentiated angle, and internal-link cluster.
3. **Research:** assemble claim/source table; do live feature tests where possible.
4. **Outline:** apply the relevant A–E layout and make the core answer independent of CTAs.
5. **Draft:** write clear first-party analysis; show assumptions, downsides and alternatives.
6. **Review:** check domain accuracy, competitor fairness, host support, calculations, claims and disclosures.
7. **Publish:** ensure crawlable rendered text, metadata, links, accessibility and working demo/asset.
8. **Observe:** use Search Console, analytics and legitimate referral data for impressions, clicks, engaged visits, conversions and citation/referral observations.
9. **Refresh or consolidate:** update changed claims and integrate overlapping pages; do not keep obsolete thin content.

**Review cadence:** check fast-changing AI product, price, availability and integration claims at least quarterly, and sooner after a known product change; verify actual test dates separately. Monitor the best pages more frequently. A dynamic “updated today” label is prohibited unless reviewed that day.

## 12. Publication acceptance checklist

A page is ready only when all conditions below are met:

- [ ] It serves a distinct intent for a real user and an actually available/relevant app.
- [ ] Title, H1, short answer, headings and URL identify the exact entities and task.
- [ ] It follows the assigned series methodology and layout, with substantive original detail.
- [ ] Competitive claims, pricing, integrations, availability and rebrands are sourced and dated.
- [ ] TrialAgents claims match the current approved app and verified ChatGPT/Claude/web capabilities.
- [ ] “Supported,” “configurable,” “planned,” “unsupported,” and “not verified” are clearly distinguished.
- [ ] Both TrialAgents strengths and limitations are disclosed; no automatic first-place recommendation.
- [ ] Industry-specific examples contain meaningful biotech/CRO detail and transparent fictional assumptions.
- [ ] Any resource or screenshot really exists and works; numerical outputs are independently validated.
- [ ] One canonical URL, valid metadata, indexable page body, accessible responsive tables and sensible schema markup.
- [ ] Relevant internal links lead to the app hub and 2–3 complementary pages without duplication.
- [ ] Editorial disclosure, sources, author/reviewer and meaningful review date are visible.
- [ ] No unverifiable AI-search rankings, fake testimonials, invented benchmarks, or manipulative LLM instructions.
- [ ] Page is scheduled for refresh and measurable against its original search intent.

## 13. Launch strategy

For each approved app, begin with a **small editorial pilot**, not all five series at full volume:

1. One genuine high-intent competitor comparison (**A**).
2. One relevant alternatives/category selection page (**B**).
3. One **tested**, host-specific AI workflow (**C**).
4. One high-value life-sciences operational problem (**D**).
5. One immediately useful template, guide, or migration resource (**E**), where a real asset can be supplied.

If one series has no valid topic, skip it rather than publishing filler. Choose further pages from real queries and observed user questions. Expand the strongest clusters; consolidate redundant ones. This guide defines **how** to make pages, not a standing commitment to any page count.

---

**App plan directory:** [All app-specific SEO/LLM plans](apps/README.md) · [Create a new app plan](apps/_APP_CONTENT_PLAN_TEMPLATE.md).  

**Related product context:** [TrialAgents product direction](../product/PRODUCT_DIRECTION.md) · [Current platform scope](../product/APP_PLATFORM_SCOPE.md) · [Template publishing contract](../TEMPLATE_CATALOG.md). This editorial document cannot override current runtime, access, or product acceptance evidence.

## 14. SEO and AI-discovery verification standard

Audit the served production HTML, not just the authored fragment. Check HTTP status and robots directives, one descriptive H1, title/description, self-canonical, structured headings, visible factual text, semantic comparison table, internal links, sources, author/date/disclosure, image alt text/dimensions and valid JSON-LD matching visible content. Confirm sitemap inclusion and current site discovery files. Check desktop/mobile readability and asset delivery after deployment.

Google's guidance says the same SEO fundamentals apply to AI features; no special AI markup or machine-readable file is required. Treat `llms.txt` and `llm.xml` as supplemental discovery aids, never prerequisites or citation guarantees. Verify crawler access separately from training preferences where applicable; a successful ordinary HTTP fetch does not prove access by every crawler or CDN policy.

Report three separate statuses: **implemented and inspected**, **optional improvements**, and **not verified**. Search Console index status, real-user Core Web Vitals, external backlinks and actual AI retrieval/citations require separate observations. An indexable page is not proof that it is indexed. Structured data is not proof of rich-result eligibility or display. A social/Article image can improve previews but is not a prerequisite for text crawling.

### References behind the standard

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) — core SEO, accessible text, internal links and matching structured data; no special AI optimization guarantees.
- [Google: Write high-quality reviews](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews) — decision criteria, original evidence, strengths/limitations and useful sources; quality over word count.
- [Nielsen Norman Group: concise, scannable and objective writing](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/) — readable web content.
- [Ahrefs: product-led content](https://ahrefs.com/blog/product-led-content/) — show the product in the context of the reader's problem.

Reviewed 12 November 2026. These are editorial and technical practices, not evidence of measured conversion uplift for TrialAgents.
