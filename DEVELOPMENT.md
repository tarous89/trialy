# Trialy — Current Development Roadmap

Updated 11 October 2026 following the shared-database and saved-component clarification. This is an ordered building plan for one complete product, not a release plan. [Product context](README.md) · [Architecture](docs/FOUNDATION_ARCHITECTURE.md) · [History](HISTORY.md).

## Current position

Existing foundation: PostgreSQL data/originals, authentication, human/AI permissions, transactional changes and audit, previews, bounded JavaScript execution, saved function revisions, grants and background runs. Runtime `ee74524` is deployed on the existing Render web and worker, including project/maintenance, saved components, inherited access restrictions and initial ChatGPT-written frontend code hosting and durable data/file staging. Private plugin 0.2.5 is published with the new approval and execution contract; deployment results are recorded in HISTORY. The custom block renderer is compatibility-only. [EXECUTION.md](docs/EXECUTION.md) describes actual capabilities and limits. The earlier execution checklist is preserved in [the archive](docs/archive/development-execution-foundation-2026-10-11.md); its completed checkboxes do not mean the expanded product is complete.

Not yet complete: the full shared cross-import entity layer, unrestricted generated-interface hosting, advanced component organization and live external adapters. Basic folders/project/component moves, restricted sharing and initial isolated frontend code hosting are implemented. Existing views, forms and sharing are reusable foundations, not evidence that all these targets work already. User-driven ChatGPT testing has started; full host acceptance remains open.

Database layering and the common vocabulary are agreed in [README](README.md). [Interface rules](docs/INTERFACE_RULES.md) separates agreed usability direction from the proposed edit-routing policy.

## Implementation checkpoint — 11 October 2026

Added migration 017, project/folder CRUD/moves and shared web/embed Projects UI; durable reviewed maintenance scopes, atomic scoped record writes with receipts and immutable observations; same-table reversible identity links and evidence reads; REST/MCP tools and export coverage. These are partial implementations of steps 1–4 and 6, not completion of the full roadmap. Existing schema tools handle initial table setup separately from scope approval.

Added migration 018: reviewed component source/configuration saves, stable IDs, move/archive/recovery, immutable revisions, shared source editor, MCP/REST reads and export/restore coverage. Source remains inert; generated interfaces and project-level sharing are not yet enabled.

Added migration 019: inherited human/AI project and component restrictions, owner-reviewed sharing, access-preserving moves, export/observation protections, and the first trusted `trialy-ui-v1` renderer (text/layout/live editable tables). Arbitrary frontend code, richer blocks and partial-data component access remain pending.

Scope correction: do not extend a Trialy UI block catalogue. ChatGPT authors frontend code; Trialy provides persistence, isolation and a controlled data/tool bridge. Added the initial `frontend-js` HTML/CSS/JavaScript render/event runtime, read-only pre-save code execution and reviewed bound record writes. Historical `trialy-ui` remains readable but cannot be newly authored. See [FRONTEND_CODE.md](docs/FRONTEND_CODE.md).

Added migration 021: ordinary data/file previews now use shared PostgreSQL staging, including exact binary uploads, expiry, per-workspace capacity limits and atomic draft deletion with save receipts. Confirmation still rechecks permissions and current versions. Previews remain temporary and do not enter official history before confirmation.

Implemented the core [write authorization and field-change history contract](docs/WRITE_AUTHORIZATION.md), identity-aware reads and component worker bindings. Next: verify browser/ChatGPT code hosting and extend code-runtime/tool integration; shared identity-aware queries/project relationships; granular project sharing; scheduled maintenance integration. Project organization currently requires unrestricted workspace access. Semantic inclusion/source-policy judgment remains ChatGPT's responsibility, with structural/grant/permission enforcement in the backend. See [WORKSPACE_FOUNDATION.md](docs/WORKSPACE_FOUNDATION.md).

## Remaining work at this checkpoint

1. Finish broader shared-data semantics: reusable table-level mapping definitions, contextual relationship queries and per-alias value propagation. Reviewed direct cross-table identity claims with explicit field correspondence and withdrawal are implemented. Stable project-record links, dated/project-scoped candidate facts, reviewed main-value selection and immutable withdrawal are implemented; see docs/SHARED_DATA.md.
2. Finish richer setup/capture orchestration. ChatGPT-directed reviewed backfill now fills missing approved fields on existing records under current task scopes, always requiring review. It does not independently crawl sources. Default writes require approval; type-specific standing permission remains explicit and expiring.
3. Finish component assets, partial-data component access and external collection/sharing. Name search, reviewed copies and project/folder archive/restore are implemented. Exact function attachment, generic run/status/cancel and component-aware worker/schedule enforcement are implemented.
4. Extend the generated-code bridge for files/providers and richer application hosting as needed. Validate current HTML/CSS/event hosting in the real ChatGPT/browser environment; unmodified React/npm apps remain unsupported.
5. Verify the approval and recovery journey in the real host. Reviewed new-entry archive/restore, selected field-batch reversal and history filters are implemented. Later edits or linked work require explicit correction; embedded approval uses a secure standalone handoff.
6. Add the first external provider after provider/account selection, with scoped credentials, effect previews and duplicate-effect handling. Electronic signatures remain conditional on provider requirements/cost.
7. Finish restricted production credentials, monitoring and actual managed-backup recovery after retention/recovery decisions. Complete the real-host end-to-end journey before customer reliance/public publication.

These are remaining capabilities, not releases. Broad unchecked items below can include working subparts. No new provider account or paid resource has been created.

## Immediate implementation sequence: write approval and history

- [x] Inventory every record-data write path and current standing grant, including MCP, manual edits, generated interfaces, imports, reconciliation and workers. Update plugin guidance alongside backend enforcement. Keep existing records/history intact; do not treat old task/setup approval as future write authority.
- [x] Implement record field-diff previews and a trusted authenticated human confirmation path (embedded buttons open the standalone review). Show every before/after value and additions/removals, with visible Approve changes / Discard controls in both surfaces. A clearly reviewed batch can use one approval. Recheck permissions and versions at commit.
- [x] Implement explicit versioned longer-term grants for individual data types, with visible field/action/source/actor bounds, validity and revocation. Separate schema approval from future-write permission; reject blanket and silently expanded grants. Assess existing grants and require renewed approval where incompatible.
- [x] Persist every committed record-data field delta and its approval/grant reference atomically with the write/receipt, including derived changes and AI/code/worker attribution. Expose completed changes under grants as well as individually approved changes; enforce current permissions on historical values.
- [x] Add a fixed Changes and permissions area for pending reviews, saved field changes and grant management, shared by web and embedded workspace. Include filtering and source/authorization detail without exposing human-only data to ChatGPT.
- [x] Implement reviewed individual current-field reversal as a new audited transaction.
- [x] Extend reversal to selected fields across records with atomic reviewed correction, per-record version checks and saved-batch/actor/date/record/authorization history filters.
- [x] Add reviewed archival/restoration for unchanged new drafts. Preserve original history, detect later edits/dependencies and reject unsafe overwrites. Do not imply reversal of external actions.
- [x] Run focused backend checks for approval enforcement, type/field scope, expiry/revocation, atomic evidence, hidden-value protection, idempotency and safe reversal.
- [ ] Verify actual approval UI and code hosting in ChatGPT when host testing is available.

Migrations 022–024 implement the checked items. Human-only confirmation uses the standalone authenticated session; no in-chat-only consent or regulated signature is claimed. Older history remains available but is not backfilled with invented authorizations.

## Ordered implementation steps

### 1. Define and separate the shared data and component contracts

- [ ] Implement the three-layer contract: fixed platform, extensible person/organization/project/location concepts, and customer-designed schema. Use the platform project identity for project relationships; studies are optional extensions.
- [x] Define a versioned maintenance scope: task purpose, inclusion criteria, approved schema/relationships, authorized sources, actor and revocable permission. Keep schema/setup approval distinct from routine data maintenance.
- [ ] Inventory actual entity, relationship, project, view, file, permission and execution primitives and their legacy callers.
- [ ] Define stable IDs and contracts for shared entities/observations, project-specific relationships, folders/projects, saved components/revisions, data bindings and execution references.
- [x] Separate data identity from display location; moving a component must not move or duplicate its underlying shared entities.
- [ ] Finish extracting reusable commit/permission services where needed. Use additive migrations and compatible adapters; preserve existing records and histories.

### 2. Build shared entity identity and source provenance

- [ ] Support canonical entity references across imports/projects, aliases and original source observations with timestamps and attribution.
- [ ] Represent project-specific facts independently of shared person/organization facts; allow historical affiliations and conflicting observations without forced overwrite.
- [ ] Inspect existing authorized schema before creating types/fields; support schema-semantic reconciliation, stable field renames and loss-preserving type migrations. Model roles and contextual facts as relationships rather than duplicated people.
- [ ] Expose permission-filtered candidate search, entity/relationship reads and proposals to ChatGPT, using flexible user-defined types rather than a clinical ontology.

### 3. Implement reversible AI-led reconciliation

- [ ] Implement task-driven setup: repeated/multiple-entry tracking or expected reuse qualifies, including one starting record; inspect/reuse first, preview the structure and initial import, then require setup approval.
- [ ] Implement automatic proposal preparation for qualifying additions/updates; require visible approval for each change set unless an explicit longer-term data-type permission covers it. Do not persist unrelated mentions, new columns or entire communications by default; preserve relevant provenance and explicitly saved originals.
- [x] Implement reviewed schema/inclusion-scope expansion and permitted backfill (for example addresses), then ongoing maintenance of newly approved fields. Do not silently broaden sources or fabricate missing values.
- [ ] Let ChatGPT propose match/link/merge, preferred-value and conflict decisions, including rationale and source references.
- [ ] Preserve original entries and alternatives, record accepted decisions, and implement undo/split/correction without losing relationships or audit evidence.
- [x] Adapt existing atomic imports/maintenance writes and idempotent receipts to approval-by-default and explicit data-type-specific longer-term grants. Human approval is enforced; standing permissions are explicit and expiring.
- [ ] Keep uncertain alternatives local to facts/entities; do not create whole-database branches. Do not require a rigid matching rulebook or prompt for every minor normalization.
- [ ] Ensure a merge cannot expose hidden data, infer permissions, or silently retarget an external action.

### 4. Add projects, folders and durable saved components

- [x] Implement project/folder/component create, rename, organize, archive and move APIs with stable IDs and revision history. Project/folder archival is owner-reviewed, inherited by descendants and clears attached execution; restore does not revive old authority.
- [ ] Save component source/configuration, entrypoint, data bindings, assets, runtime and capability requirements after preview confirmation.
- [x] Allow many components to reference the same shared entities. Distinguish an organizational move from an explicit reviewed copy; copies retain data bindings without duplicating records.
- [ ] Make moves permission-aware; preserve references, version history and jobs, while pausing affected execution if its authority is no longer valid.

### 5. Host ChatGPT-generated interfaces

- [x] Implement the first code-hosting contract: `trialy-frontend-js-v1` runs ChatGPT-written JavaScript that renders HTML/CSS and handles events. No fixed UI block schema. Browser/ChatGPT acceptance remains open; standard React/npm applications remain pending.
- [ ] Define component binding metadata for sources, live versus snapshot values, edit targets and calculations. Resolve the proposed editing semantics in INTERFACE_RULES.md before implementing them.
- [ ] Provide a permission-checked bridge for queries, previews/commits, files, authorized tools and run status. Keep tokens and raw database connections out of generated code.
- [ ] Support provisional rendering, explicit save, reopen by exact revision, updates and recovery of an earlier component version.
- [ ] Verify freely coded forms, tables, SVG graphics and mixed interfaces through the general HTML/CSS/event bridge. Do not add proprietary block types or a template catalogue. Validate host capabilities before promising unrestricted rendering.

### 6. Build the project workspace and collection/sharing experience

- [ ] Make interfaces editable by default within permissions, with authorized source inspection; implement details as pages or short modals instead of appended sections. Preserve view state on return.
- [ ] Show folders, projects and their components; support drag and drop plus explicit move controls, search and reopening across chats.
- [ ] Apply granular human and AI access to saved components and underlying data; displaying data to a person must not implicitly disclose it to the model.
- [ ] Reuse existing sharing primitives for team/external access and scoped information collection. Implement revocation and explicit submit/save semantics without mandatory business approval stages.
- [ ] Verify moving, sharing or embedding a component cannot expand its data access. Keep standalone and ChatGPT backed by the same saved state.

### 7. Bind components to tools and background execution

- [x] Attach saved components to exact function revisions and optional type-specific grants; support componentContext on generic schedules and recheck it in workers/commits.
- [x] Expose generic run/status/cancel/schedule controls; do not add a hardcoded business automation catalogue.
- [ ] Implement tenant/user provider connections and trusted adapter registration. Start with the first selected external service, then add email/calendar or other requested capabilities as accounts allow.
- [ ] Add external-effect previews where possible, receipts, idempotency and unknown-outcome reconciliation. Database rollback cannot undo a sent email or calendar invitation.
- [ ] Keep electronic signatures conditional on provider cost/requirements; do not label internal confirmations as regulated signatures. Backend workers do not inherit ChatGPT's other connections automatically.

### 8. Complete integrity, access and recovery across the whole product

- [ ] Complete field-level before/after history linked to exact authorization, the fixed Changes and permissions area, and reviewed reversal described above.

- [ ] Extend audit/export/restore to entity observations and reconciliation, projects/components/assets, access changes, grants and execution evidence.
- [x] Move remaining in-memory data/file previews to shared temporary storage; retain clear draft expiry and never claim an unsaved preview is durable saved work.
- [ ] Provision restricted runtime credentials and essential monitoring; resolve production retention/recovery/location/budget and demonstrate an actual managed backup restore.
- [ ] Preserve original files on extraction failure with quiet availability flags. Failed authoritative saves must remain visibly unsaved and retryable.
- [ ] Retire obsolete fixed business UI/code only after dependency checks, retaining historical evidence and management of any active legacy jobs.

### 9. Verify the complete user journey and improve

- [ ] Add focused capture-boundary checks to the synthetic scenario: one-off mention creates no structure; approved tracking adds/reconciles qualifying data; unrelated facts and out-of-scope entities are not captured; new fields need approval; revoked grants stop maintenance.
- [ ] Use one synthetic investigator/study/conference/organization scenario: confirmed import, reuse shared identities, preserve a conflicting fact, reverse an incorrect match, create/reopen two different components, move one, share restricted access and run an authorized background action.
- [ ] Verify the real ChatGPT sign-in return, workspace opening, component rendering, confirmations, cross-chat persistence and revocation. Do not infer success from backend tests alone.
- [ ] Verify one enabled provider with safe test destinations; no real-recipient test messages.
- [ ] Fix observed defects, record limitations and verify recovery before customer reliance. Public publication and Trialegions rename remain separate decisions.

## Removed from the active plan

No fixed clinical templates, review chains, prescribed business workflows or hardcoded action catalogue. The minimal execution panel is no longer the final product target, and generated UI hosting is no longer excluded. No whole-database branching for every ambiguous match, automatic destructive deduplication, or unrestricted maintenance authority. No speculative vector service or scaling infrastructure.

## Lean verification and user dependencies

Use focused checks for reconciliation undo/source preservation, tenant/AI access, move/sharing boundaries, generated UI isolation, atomic saves/retries and external duplicate effects, plus the single end-to-end example above. Reuse existing meaningful checks; avoid exhaustive cosmetic or template tests.

Proceed without further product decisions on the shared data/component foundation. Ask only when a concrete external provider/account, new paid infrastructure, production recovery policy or publication decision is required. No new account or cost has been approved by this documentation update.

## Next checkpoint — direct cross-table reconciliation

Implemented reviewed cross-table identity claims, per-pair compatible field mappings, schema-change detection, permission-filtered comparisons, withdrawal and preserved originals. The shared project record page opens comparisons as a separate screen. Both new operations always require human approval; same-table grants and code reads do not gain cross-table authority. Migration 026, export/runtime-role coverage and synthetic restore coverage are included. Reusable table-level mapping, contextual relationship queries and per-alias correction remain next; this checkpoint does not complete the entire shared entity layer.
