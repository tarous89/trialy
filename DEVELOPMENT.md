# Trialy — Current Development Roadmap

Updated 11 October 2026 following the shared-database and saved-component clarification. This is an ordered building plan for one complete product, not a release plan. [Product context](README.md) · [Architecture](docs/FOUNDATION_ARCHITECTURE.md) · [History](HISTORY.md).

## Current position

Existing foundation: PostgreSQL data/originals, authentication, human/AI permissions, transactional changes and audit, previews, bounded JavaScript execution, saved function revisions, grants and background runs. Runtime `cb220b8` is deployed on the existing Render web and worker, including project/maintenance, saved components, inherited access restrictions and initial live interfaces. Private plugin instructions are version 0.2.3. [EXECUTION.md](docs/EXECUTION.md) describes actual capabilities and limits. The earlier execution checklist is preserved in [the archive](docs/archive/development-execution-foundation-2026-10-11.md); its completed checkboxes do not mean the expanded product is complete.

Not yet complete: the full shared cross-import entity layer, unrestricted generated-interface hosting, advanced component organization and live external adapters. Basic folders/project/component moves, restricted sharing and a text/table interface renderer are implemented. Existing views, forms and sharing are reusable foundations, not evidence that all these targets work already. User-driven ChatGPT testing has started; full host acceptance remains open.

Database layering and the common vocabulary are agreed in [README](README.md). [Interface rules](docs/INTERFACE_RULES.md) separates agreed usability direction from the proposed edit-routing policy.

## Implementation checkpoint — 11 October 2026

Added migration 017, project/folder CRUD/moves and shared web/embed Projects UI; durable reviewed maintenance scopes, atomic scoped record writes with receipts and immutable observations; same-table reversible identity links and evidence reads; REST/MCP tools and export coverage. These are partial implementations of steps 1–4 and 6, not completion of the full roadmap. Existing schema tools handle initial table setup separately from scope approval.

Added migration 018: reviewed component source/configuration saves, stable IDs, move/archive/recovery, immutable revisions, shared source editor, MCP/REST reads and export/restore coverage. Source remains inert; generated interfaces and project-level sharing are not yet enabled.

Added migration 019: inherited human/AI project and component restrictions, owner-reviewed sharing, access-preserving moves, export/observation protections, and the first trusted `trialy-ui-v1` renderer (text/layout/live editable tables). Arbitrary frontend code, richer blocks and partial-data component access remain pending.

Scope correction: do not extend a Trialy UI block catalogue. ChatGPT authors frontend code; Trialy provides persistence, isolation and a controlled data/tool bridge. Added the initial `frontend-js` HTML/CSS/JavaScript render/event runtime, read-only pre-save code execution and reviewed bound record writes. Historical `trialy-ui` remains readable but cannot be newly authored. See [FRONTEND_CODE.md](docs/FRONTEND_CODE.md).

Next: verify browser/ChatGPT code hosting and extend code-runtime/tool integration; shared identity-aware queries/project relationships; granular project sharing; scheduled maintenance integration. Project organization currently requires unrestricted workspace access. Semantic inclusion/source-policy judgment remains ChatGPT's responsibility, with structural/grant/permission enforcement in the backend. See [WORKSPACE_FOUNDATION.md](docs/WORKSPACE_FOUNDATION.md).

## Ordered implementation steps

### 1. Define and separate the shared data and component contracts

- [ ] Implement the three-layer contract: fixed platform, extensible person/organization/project/location concepts, and customer-designed schema. Use the platform project identity for project relationships; studies are optional extensions.
- [ ] Define a versioned maintenance scope: task purpose, inclusion criteria, approved schema/relationships, authorized sources, actor and revocable permission. Keep schema/setup approval distinct from routine data maintenance.
- [ ] Inventory actual entity, relationship, project, view, file, permission and execution primitives and their legacy callers.
- [ ] Define stable IDs and contracts for shared entities/observations, project-specific relationships, folders/projects, saved components/revisions, data bindings and execution references.
- [ ] Separate data identity from display location; moving a component must not move or duplicate its underlying shared entities.
- [ ] Finish extracting reusable commit/permission services where needed. Use additive migrations and compatible adapters; preserve existing records and histories.

### 2. Build shared entity identity and source provenance

- [ ] Support canonical entity references across imports/projects, aliases and original source observations with timestamps and attribution.
- [ ] Represent project-specific facts independently of shared person/organization facts; allow historical affiliations and conflicting observations without forced overwrite.
- [ ] Inspect existing authorized schema before creating types/fields; support schema-semantic reconciliation, stable field renames and loss-preserving type migrations. Model roles and contextual facts as relationships rather than duplicated people.
- [ ] Expose permission-filtered candidate search, entity/relationship reads and proposals to ChatGPT, using flexible user-defined types rather than a clinical ontology.

### 3. Implement reversible AI-led reconciliation

- [ ] Implement task-driven setup: repeated/multiple-entry tracking or expected reuse qualifies, including one starting record; inspect/reuse first, preview the structure and initial import, then require setup approval.
- [ ] Implement automatic extraction, qualifying additions and updates under the approved maintenance scope. Do not persist unrelated mentions, new columns or entire communications by default; preserve relevant provenance and explicitly saved originals.
- [x] Implement reviewed schema/inclusion-scope expansion and permitted backfill (for example addresses), then ongoing maintenance of newly approved fields. Do not silently broaden sources or fabricate missing values.
- [ ] Let ChatGPT propose match/link/merge, preferred-value and conflict decisions, including rationale and source references.
- [ ] Preserve original entries and alternatives, record accepted decisions, and implement undo/split/correction without losing relationships or audit evidence.
- [x] Apply initial confirmed imports or scoped future-maintenance grants atomically with permission/concurrency checks and idempotent receipts.
- [ ] Keep uncertain alternatives local to facts/entities; do not create whole-database branches. Do not require a rigid matching rulebook or prompt for every minor normalization.
- [ ] Ensure a merge cannot expose hidden data, infer permissions, or silently retarget an external action.

### 4. Add projects, folders and durable saved components

- [ ] Implement project/folder/component create, rename, organize, archive and move APIs with stable IDs and revision history.
- [ ] Save component source/configuration, entrypoint, data bindings, assets, runtime and capability requirements after preview confirmation.
- [ ] Allow many components to reference the same shared entities. Distinguish an organizational move from an explicit duplicate/fork.
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

- [ ] Attach saved components to exact function revisions, triggers and scoped grants using the existing worker infrastructure.
- [ ] Expose generic run/status/cancel/schedule controls; do not add a hardcoded business automation catalogue.
- [ ] Implement tenant/user provider connections and trusted adapter registration. Start with the first selected external service, then add email/calendar or other requested capabilities as accounts allow.
- [ ] Add external-effect previews where possible, receipts, idempotency and unknown-outcome reconciliation. Database rollback cannot undo a sent email or calendar invitation.
- [ ] Keep electronic signatures conditional on provider cost/requirements; do not label internal confirmations as regulated signatures. Backend workers do not inherit ChatGPT's other connections automatically.

### 8. Complete integrity, access and recovery across the whole product

- [ ] Extend audit/export/restore to entity observations and reconciliation, projects/components/assets, access changes, grants and execution evidence.
- [ ] Move remaining in-memory data/file previews to shared temporary storage; retain clear draft expiry and never claim an unsaved preview is durable saved work.
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
