# Trialy — Shared Data and a Home for What ChatGPT Builds

## App platform direction — 29 October 2026

The active product direction is a foundation for apps built through conversation. Users describe their work; ChatGPT or another supported builder chooses the interface and code. Tracker, form, dashboard and automation are optional examples/templates, not mandatory app types. Apps can combine navigation, calculations, shared records, authentication, server functions and background work.

- [App platform scope and architecture](docs/product/APP_PLATFORM_SCOPE.md)
- [Ordered implementation roadmap and acceptance criteria](docs/product/APP_PLATFORM_ROADMAP.md)
- [Connectors, credential handling and usage economics](docs/product/CONNECTORS_AND_USAGE.md)

These documents specify planned changes, not shipped capabilities. They supersede conflicting product restrictions in older scope/design documents; existing data, authorization, audit and migration guarantees remain in force. Current code still uses the bounded runtimes described below. Broad browser/server execution, app routing, outbound connectors and usage billing must pass the roadmap gates before being advertised as available. Trialy remains the repository/development name; a public brand/domain cutover is separate.

Foundation baseline updated 11 October 2026, with later implementation notes below. Read the 29 October app platform documents above for the superseding direction and remaining work. The uploaded initial brief remains a historical source, subject to the user's subsequent decisions.

Repository: `tarous89/trialy`. Development name: **Trialy**. A future public rename to **Trialegions** is a separate cutover. Do not change the existing Trialegions, TrialAgents or Intel applications.

- [Current development steps](DEVELOPMENT.md)
- [Proposed 11-function demo template showcase](docs/product/TEMPLATE_SHOWCASE_PLAN.md)
- [Interface behavior decisions and proposals](docs/INTERFACE_RULES.md)
- [Foundation architecture and dependency map](docs/FOUNDATION_ARCHITECTURE.md)
- [Decision and implementation history](HISTORY.md)
- [Historical scope](docs/archive/scope-before-foundation-reset.md)
- [Historical development checklist](docs/archive/development-before-foundation-reset.md)

## Product boundary

Trialy is the persistent workspace behind the things ChatGPT builds. ChatGPT designs interfaces, application logic and data reconciliation. Trialy supplies a connected database, an organized home for saved components, authorized tools and background execution, with access control and traceable changes throughout.

Users build their database while doing their work; database maintenance is not a separate routine they must perform. A study tracker and a conference tracker can reference the same investigator and organization, while retaining separate study participation and conference follow-up records. Shared means connected within the authorized workspace, never globally merged across customers or permissions.

Projects and folders organize saved components: forms, trackers, visualizations, presentations/files, mixed interfaces and workflows with actions. These are examples of user-created content, not platform templates or a fixed component catalogue. Users can move projects between folders and components between projects without copying shared entities or breaking stable references. Moves must recheck access and must not silently expose data or expand execution grants.

The full permitted experience belongs in ChatGPT, with the standalone app on the same backend as backup/admin and for data deliberately excluded from AI. A durable generated interface host is part of the product scope; a minimal data/function/run panel alone does not complete it.

## Foundation responsibilities

1. Connected, user-defined data with stable entity identities, relationships, originals and provenance across projects.
2. AI-proposed normalization and reconciliation: preferred values, aliases, source observations, conflicts and reversible match/merge decisions.
3. Projects, folders and saved components with stable IDs, versioned source/configuration, shared-data bindings and organization controls including drag and drop.
4. Isolated hosting of ChatGPT-generated interfaces, plus bounded server-side code execution. Saved UI must not receive host credentials or bypass human/AI permissions.
5. A trusted tool gateway for authorized services, including future email, calendar and conditional signature adapters.
6. Saved functions, general jobs, schedules/events, cancellation and recovery so authorized components can run while ChatGPT is closed.
7. Granular human and AI permissions, team/external sharing, once/future authorization and scoped access for collecting information from others.
8. Preview before official saving, exact commits, audit/version history and recoverability of saved data, code, components and relationship decisions.

## Database design decisions — agreed 11 October 2026

Three layers define the flexibility boundary:

| Layer | Content | Control |
| --- | --- | --- |
| Platform foundation | Customer/workspace, users/memberships, access, projects/folders, component code/revisions, sources, audit and jobs | Trialy enforces stable contracts |
| Common concepts | Person, organization, project and location, with extensible relationships | Small starting vocabulary, not mandatory business fields or fixed templates |
| Customer-specific model | Fields, additional types, classifications, activities, forms, calculations and workflows | ChatGPT designs against the existing authorized schema |

Use **project**, not study, as the general work concept: investor outreach, regulator engagement, conferences and clinical studies can all be projects. Study-specific attributes/types are optional customer extensions. A project is the same stable platform project when it is both a work container and the subject of relationships; do not create a duplicate generic Project entity for the same thing. Its operational fields are extensible while its identity/access/organization contracts remain platform-controlled. Location remains optional; education is not a required common concept.

A person is not duplicated for each role: investigator, consultant, speaker and expert are contextual roles/relationships. Organization locations and trial participation can be separate linked records. Keep shared facts, dated affiliations and project-specific facts distinct. Few business fields are mandatory; incomplete records are valid.

Require stable IDs, workspace ownership, typed fields, revision/actor attribution, permission enforcement and stable relationship references. Preserve source provenance where available. ChatGPT must inspect permitted schema and candidates before adding types or importing entities; reconcile both records and schema meaning, never merge fields solely because their labels sound similar. Renames preserve field identity; type conversions preserve non-convertible originals and need a safe change proposal.

Start with logical customer isolation in shared PostgreSQL, not a physical database/table set for every client. Shared information is within authorized customer boundaries. No implicit cross-customer reconciliation or data access.

Interface preferences and the proposed edit-routing policy are tracked separately in [INTERFACE_RULES.md](docs/INTERFACE_RULES.md). These are development targets, not claims that generated interfaces already implement them.

## Task-driven capture and approved maintenance — updated 11 October 2026

**The task determines the structure; the approved structure and inclusion criteria determine what Trialy maintains.** Capture, structuring and reconciliation are distinct decisions, not permission to record everything mentioned.

- Establish or extend a table when the requested work involves multiple entries, repeated actions, tracking, a workflow or expected future additions. A task can qualify with only one initial person/site if it will track repeated interactions or develop over time. A one-off draft or passing mention alone does not justify creating a structure.
- Inspect and reuse existing authorized structures and entities first. Propose only the fields, relationships and additional types needed for the task. Show the purpose, inclusion criteria, initial records and ongoing maintenance scope in the setup preview; save the setup after review and approval.
- Every database change requires a visible exact preview and approval by default, including additions and updates to existing tables. Task/schema approval does not itself authorize future writes. Only an explicitly granted, revocable longer-term permission for a named data type can waive repeated approval within its stated boundaries; no general database-write permission.
- Extract relevant facts from information made available to Trialy through authorized work. Propose updates to existing entities and qualifying new entities, preserving shared identity across projects; save only after approval or under an applicable longer-term data-type permission. Do not imply access to all ChatGPT conversations or continuous background discovery without an enabled trigger/source.
- Fit is both structural and semantic: a company having a name/email does not make it eligible for a project-specific CRO tracker. Maintain fields and relationships only where the information concerns an eligible entity and the approved purpose.
- Do not create columns, tables or source archives simply because additional facts were mentioned. Do not save entire messages or communication histories by default; extract only relevant facts and retain proportionate provenance. Communication records are appropriate only when explicitly included in the reviewed tracking structure. Original files explicitly accepted for storage remain preserved under the existing original-file policy.
- A request such as “add addresses to this tracker” initiates a reviewed schema expansion. After approval, populate from available permitted sources and maintain the new field like the existing fields. Missing values remain missing and uncertainty remains explicit; broader research requires an authorized source/task scope.
- Distinguish a plan, an inference and an observed action. Drafting is not sending; a prospective invitee is not a confirmed attendee. Retain prior observations and reversible decisions when information conflicts or changes over time.
- Always expose the proposed or completed changes, including writes under longer-term permission. Log every changed field value with before/after values and its exact approval or grant. Provide a fixed Changes and permissions area with review, revocation and safely previewed reversal. Permission revocation, schema revision and stale-data checks apply to every write. Uncertain inclusion remains provisional.

See [Database write approval and change history](docs/WRITE_AUTHORIZATION.md) for the superseding authorization contract. Default human approval enforcement, per-field authorization history and the Changes & permissions area are now implemented. Existing task scopes default to preview-only, and old execution grants cannot write until renewed. Approval from the embedded view currently opens the authenticated standalone review, rather than trusting an AI-callable confirmation. Task-driven maintenance is currently exposed through scoped MCP writes, reviewed table/field permissions and preserved observations. ChatGPT evaluates semantic inclusion; the backend enforces tenant, field, schema-version and grant boundaries. General merged-entity views and scheduled maintenance integration remain to be built.

## Reconciliation and saving decisions

- ChatGPT may judge that two differently named entries represent the same entity; do not require hardcoded business matching rules or a confirmation for every spelling variation.
- Preserve each original observation, source and competing value. Store a preferred interpretation plus reversible links/merge decisions and their rationale. Correction must be able to separate an incorrect match without losing source facts or project-specific context.
- Do not branch the entire database for every possible interpretation. Keep uncertainty and alternatives at the relevant entity, fact or relationship. This is an implementation direction, not an already implemented capability.
- Experiments remain provisional. Initial setup/imports/components require confirmation before becoming saved work. Subsequent additions and updates also require visible review and approval, unless covered by explicit longer-term permission for their data type; structure or inclusion-scope expansion always requires review. This is not unrestricted permission to rewrite data.
- A likely identity match does not itself authorize contacting someone, changing recipients, sharing restricted information or granting access. Reconciliation operates only on data the acting identity and AI may access.

User-created workflows are in scope as code and components on the shared foundation. Optional industry examples and templates can accelerate creation without prescribing review chains, database schemas, screens or app types. Biotech teams remain the intended audience.

## Decisions retained

- Keep the existing repo and Render services; make the correction on `foundation-reset` before merging runtime changes.
- Use PostgreSQL for committed data and original file bytes. No vector database or separate file service is required now.
- No Auth0 requirement. Existing self-hosted authentication, MFA and OAuth remain.
- Trialy is not fit for patient-level data. Retain the intended-use notice; do not introduce patient-content screening or quarantine. Professional personal information is allowed.
- Human and model permissions remain distinct. Generated code cannot expand either permission set. Human consent need not inherently mean leaving ChatGPT; a trusted confirmation path must be implemented and verified before claiming it works there.
- Experiments and code drafts are not official records. Explicit saving starts persistent version history; a saved function is not automatically granted permission to execute side effects.
- Preserve originals even when extraction/OCR fails. Derived-data failures remain quiet availability flags. Never claim a source or data change is saved before durable commit.
- Allow one execution or future executions within a defined scope. A material code, tool or permission change must not inherit broader approval silently.
- Preserve existing records, revisions and audit evidence during refactoring. No automatic migration of old business rules into new executable code.
- Defer integrations requiring new developer accounts until provider/account selection is needed. ChatGPT testing has begun with user-driven connection/use; full host acceptance is still pending. Backend access to tools connected in ChatGPT is not automatic.
- No real-recipient test messages. Electronic signatures remain conditional on provider requirements and cost; they are not implemented. Brand cutover remains separate.

## Current implementation versus target

The existing app has transactional records, originals, extraction, permissions, auth, audit/version history, MCP and deployed web/worker services. It also has legacy business-specific screens, templates and rules. Those are frozen pending separation, not newly endorsed product requirements.

The code execution foundation is implemented: bounded QuickJS/WASM JavaScript, permission-filtered tools, exact proposals and atomic commit receipts, immutable saved functions, leased jobs, once/future grants, schedules, result-file saves and shared standalone/embedded controls. Template/business builders are absent from the default experience; existing management remains at `/?legacy=1`. No historical data is removed.

See [the implemented execution contract](docs/EXECUTION.md) for APIs, limits, temporary retention and remaining boundaries. Projects/folders can now be created, renamed and moved, including drag and drop. Reviewed maintenance scopes support qualifying record additions/updates with provenance, and reversible same-table identity links preserve both records. Identity-group reads now expose preferred records, original alternatives, conflicts and incoming relationships. Frontend code hosting, component moves and exact function bindings are implemented; unrestricted browser/npm hosting and broader schema-semantic reconciliation remain open. See [workspace implementation boundaries](docs/WORKSPACE_FOUNDATION.md). External service adapters are not connected; complete real ChatGPT host acceptance is still pending. The existing Render services are reused, without a new sandbox account or infrastructure service.

## Development and operation

Node.js 24 and npm are required. `npm ci`, `npm run build`, and `npm run demo` start a loopback-only synthetic PGlite demo at http://127.0.0.1:4317. Do not use customer data in it. Docker includes Poppler, Tesseract and Python for extraction.

For PostgreSQL, configure `.env` from `.env.example`, including DATABASE_URL, SESSION_SECRET and PUBLIC_URL; then run `npm run db:migrate`, `npm run build`, `npm start`, and `npm run worker` in a second terminal. `npm run check` and `npm test` are verification commands.

Existing `/auth/login` provides sign-in/signup. OAuth uses PKCE; MFA/recovery codes exist, but email verification/password recovery are still absent. [ChatGPT setup](docs/CHATGPT_SETUP.md) and [operations](docs/OPERATIONS.md) describe existing behavior; their legacy feature instructions are operational history, not the future product backlog.

Data/file previews and experiment/proposal/function-preview staging live in PostgreSQL with a 24-hour expiry, surviving web process replacement. Original upload bytes stay in temporary staging until confirmation atomically saves the original and receipt. Staging is not authoritative saved work or immutable history; database backups may retain staging until backup expiry. Data/file staging is limited to 1,000 previews and 100 MiB per workspace. This removes the in-memory preview barrier, but does not establish multi-instance readiness for all other services. Confirmed data is in PostgreSQL. Production recovery targets, actual managed backup restoration, restricted runtime credentials and production alerting remain unfinished; no zero-loss or blanket clinical-compliance claim is made.

## Frontend scope correction — 11 October 2026

ChatGPT writes frontend code; Trialy saves, versions, organizes and hosts that code with authorized data/tool access. Trialy is not a UI block catalogue or a template/workflow builder. The initial executable contract is `frontend-js` / `trialy-frontend-js-v1`: JavaScript renders arbitrary supported HTML/CSS and handles events inside a bounded runtime. The earlier `trialy-ui` schema is legacy compatibility only. See [FRONTEND_CODE.md](docs/FRONTEND_CODE.md) for the exact contract and remaining browser/host verification. Unmodified React/npm applications are not supported yet.

### Archival behavior

Unchanged new database entries can be archived after review while retaining every value and historical change. Referenced or later-edited entries require an explicit correction. A reviewed restore is available for these retained creations. Archived entries are excluded from active lists and summaries; their history remains accessible.

Projects and folders can also be archived by their owner, with an exact preview of affected contents. This preserves source, shared data and history, revokes task scopes, clears attached function bindings and pauses attached schedules. Restoring organization does not silently reactivate execution or long-term write authority.

### Shared data across projects

Projects can reference the same records without copying them. Candidate field values retain their source labels, optional project/date context and exact approval; selecting a main value is a separate reviewed edit. Withdrawing a candidate preserves its evidence. ChatGPT can prepare missing-value backfill from permitted sources under an approved task scope; backfill always requires review and cannot replace existing non-empty values. See [shared-data behavior](docs/SHARED_DATA.md) for capabilities and limits.

Cross-table reconciliation now supports reviewed direct identity claims with explicit field mappings between two differently structured records. Both originals remain intact; comparisons and withdrawal are available from project record details. Mapping approval does not authorize future writes or apply to every row in a table. See [shared data](docs/SHARED_DATA.md) for boundaries and remaining work.

Reusable table mappings now let ChatGPT reuse approved column correspondence when proposing cross-table record links. Each record link still needs its own approval. Mapping history is preserved; revoked or schema-outdated mappings cannot be reused. Projects includes a mapping list and detail/revocation review.

## Foundation completion checkpoint — 11 October 2026

Optional common-concept tags now support person, organization, project and location without fixed domain tables. Task setup can atomically create/reuse a schema, save its reviewed scope and initial rows, and link those records to the project. This does not grant future write permission. Direct linked-value corrections, project relationship reads, named saved file assets and owner-reviewed source release for restricted audiences are implemented. External collection links and acceptance are integrated with the same review/history boundary. Owner operational status shows worker/job health. See DEVELOPMENT.md for precise remaining host, provider and production gates.


## Field capabilities — 20 October 2026

Typed JavaScript computations, cross-table lookups, multiple references, searchable linked selectors, reviewed bulk edits, field/view renderers and graphical timelines extend the shared data foundation. See [field capabilities and limits](docs/FIELD_CAPABILITIES.md). New derived values are read-time results, not silent database writes; all stored changes retain the approval and audit contract.

## Account, projects and tools

Connect an account before creating a project or tool (tracker, form, visualization or automation). Account storage initializes automatically; there is no workspace-creation step. Tools can be independent or organized into projects with drag-and-drop or Move to. Organization preserves data scope and permissions. Public forms remain usable without login; previously issued temporary previews remain recoverable until expiry. See [implementation and verification](docs/design/ACCOUNT_PROJECT_TOOLS.md).

