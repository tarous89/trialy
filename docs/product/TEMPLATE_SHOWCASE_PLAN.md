# Trialy — 11-function demo template showcase

**Status:** Agreed product-discovery direction, recorded 20 October 2026. **Planning only**; no template gallery or eleven demos are claimed to be built, published or customer-validated.

**Purpose:** Show small biotech teams what they can create with Trialy through relatable examples. One initial demo per function. Demos are editable starting points, not hardcoded app modules, mandatory schemas, fixed workflows, defaults installed for all users, or prescribed industry processes. The active [platform scope](../../README.md), [development roadmap](../../DEVELOPMENT.md), and [write authorization](../WRITE_AUTHORIZATION.md) still control implementation.

## Initial showcase — eleven short names

| # | Template name | Illustrative demo theme (not prescribed steps or data model) |
| --- | --- | --- |
| 1 | Translational Research | Assays, translational experiments and academic collaborations |
| 2 | CMC | Manufacturing, analytical and supply-readiness deliverables |
| 3 | Nonclinical | Nonclinical/IND-enabling studies and progress |
| 4 | Regulatory | IND/CTA preparation and cross-functional readiness |
| 5 | Clinical | Clinical study planning, startup and sponsor oversight |
| 6 | Medical Affairs | Scientific experts, advisory work and medical engagement |
| 7 | Vendors & CROs | Vendor sourcing, RFP evaluation and outsourced commitments |
| 8 | Quality & Compliance | SOPs, training and quality activities |
| 9 | Finance | Development budgets, vendor commitments and spending |
| 10 | Business Development | Partnerships, licensing and due-diligence follow-ups |
| 11 | Board & Funding | Board preparation, fundraising and corporate decisions |

The name is the entry door; the example inside can show several related deliverables and their milestones in **one workstream overview**, with the ability to inspect one deliverable's tracker. Do not force one tracker for each listed subactivity. Demonstrate realistic synthetic data, editable behavior and the option to extend via conversation. Specific fields, milestones, data sources, integrations, content and visual layout are later design choices, not approved specifications.

## Internal organizing model, never a forced hierarchy

A useful mental model is **company/executive view > assets > workstreams > deliverable trackers > milestones/steps/next actions**. One tracker is an independently manageable deliverable or work package, which may contain multiple milestones; its completion can contribute to a larger program milestone. Workstreams and assets can each show rollups across connected trackers. Several assets can contribute to a portfolio overview. Company initiatives such as fundraising, board work, BD or compliance may sit beside assets.

This hierarchy is **not** a mandatory table structure, fixed navigation or ontology. Users may start with just one tracker, group work in a different way, or link the same vendor, document, decision, risk or commitment into several authorized contexts. A vendor sourcing project may serve CMC and Clinical; regulatory readiness may depend on nonclinical, CMC and clinical deliverables. Do not duplicate records just because two views use them, nor infer a dependency without a source or explicit user confirmation.

## Four user-facing capabilities over one shared database

| Capability | Customer-facing meaning | Relationship to authoritative data |
| --- | --- | --- |
| Tracker | View **and manage** a deliverable, workstream or operational register | Reads shared records; additions/edits are saved only through an authorized reviewed write or specific valid grant |
| Form | Collect new or updated information from an internal/external contributor | Captures a staged submission; acceptance or an applicable authorized write updates the shared database |
| Visualization | Read-only dashboard, timeline, chart, status summary or comparison | Reads the same committed records and any permission-safe calculated values; does not become another source of truth |
| Automation | Scheduled/event-triggered evaluation, reminder, proposal or permitted action | Reads authorized data; changes and external effects require their own grants/reviews; execution results and failures are traceable |

**The PostgreSQL database is the source of truth for committed records**, not any tracker, form or temporary interface state. Components are saved, versioned configurations/code with bindings to that data. A form acceptance must become a committed change before a live tracker or dashboard shows it as confirmed. Uncommitted previews may be shown for experimentation but are never silently treated as saved. Do not implement tracker-to-tracker copying as a substitute for shared records, permission-filtered relationships and queries.

A tracker might contain a form and visualizations; these are still independently useful component types. Automations can be triggered by a schedule or authorized record event, including a form submission **after its accepted change**. Neither a form nor a visualization needs its own separate database.

## Reality check against implemented Trialy foundation (20 October 2026)

| Area | Documented current state | Showcase/production work remaining |
| --- | --- | --- |
| Database | **Implemented:** PostgreSQL tenant/workspace-scoped committed records, user-defined tables/fields, record and project links, typed references, version history, source evidence and reviewed writes. 20 Oct adds multi-reference fields and computed/lookup reads with bounded queries. | Reuse existing foundation, configure demo-specific schemas only as users choose. Test actual end-to-end cross-tracker links and rollups; no new database architecture required. Production backup/restore and runtime credential work remain open. |
| Trackers | **Foundation implemented:** saved frontend-js components, bounded custom HTML/CSS/JS rendering, read bindings, exact write proposals, revisions and account save. | Author 11 relatable synthetic demos and the browse/preview/experiment entry experience. Verify actual connected ChatGPT host behavior; do not claim eleven ready-made templates exist. |
| Forms | **Foundation implemented:** generated form event handling, reviewed record proposals and external shareable response collection with human acceptance. | Design demo form-to-record-to-tracker journeys; test authentic host and external submission UX. File inputs in generated frontend are unsupported; external collections have separate documented limits. |
| Visualizations | **Foundation implemented:** flexible generated frontend displays, custom safe HTML/SVG/CSS, saved views, status renderers and timeline views. | Author useful dashboard demos and confirm correct rollups/permissions. Not a full DOM/React/npm/canvas application host; no need for a separate hardcoded chart catalogue. |
| Automations | **Core implemented:** saved JavaScript functions, worker, interval/daily/record-event scheduling, grants, reviewable record-change proposals, retries/cancel/status. | Configure relevant demo behavior and validate triggers. Live email/calendar/Drive/SharePoint provider adapters and outward notification effects are **not connected**; production alerting and real-host acceptance remain open. |

**Limits:** Derived lookup/computation is scoped, permission-checked and read-time, not an unbounded automatic aggregation engine; see [field capability limits](../FIELD_CAPABILITIES.md). Cross-tracker rollups must use clear shared references and vetted query logic, not magical global synchronization. The 24-hour anonymous tracker preview is temporary; only explicit account save commits it to the permanent database. Trialy is not intended for patient-level information. Do not imply a CTMS/eTMF/eQMS, regulated e-signature or official submission replacement from these demos.

## Lightweight sequence for productization

1. Present the eleven functions as a **browseable gallery of one example each**. Keep their names short and invite ChatGPT customization.
2. For each, author one believable synthetic example showing a few related deliverables, milestones and next actions. Reuse existing data and runtime; don't add hardcoded product modules.
3. Demonstrate **form input -> reviewed database acceptance -> tracker update -> visualization refresh** and, when appropriate, a safe internal automation.
4. Validate in the real ChatGPT/standalone experience, including anonymous preview, connection, saving, editing, permission enforcement and re-opening before promoting demos as ready.
5. Add outbound integrations only after a specific user journey justifies the provider, consent and reliable effect/retry work.

The previous [18-use-case catalog](README.md) and its four supporting section files remain **research reference material**, not eighteen modules or an alternate navigation hierarchy. Their examples can inform each of the eleven demo themes and later expansion. This plan deliberately does not authorize implementing the demos, modifying live navigation, creating fixed templates in the core engine or deploying code.
