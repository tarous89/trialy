# Trialy — Current Development Roadmap

Updated 11 October 2026 following the shared-database and saved-component clarification. This is an ordered building plan for one complete product, not a release plan. [Product context](README.md) · [Architecture](docs/FOUNDATION_ARCHITECTURE.md) · [History](HISTORY.md).

## Current position

Existing foundation: PostgreSQL data/originals, authentication, human/AI permissions, transactional changes and audit, previews, bounded JavaScript execution, saved function revisions, grants and background runs. Runtime `3234b5b` is deployed. [EXECUTION.md](docs/EXECUTION.md) describes actual capabilities and limits. The earlier execution checklist is preserved in [the archive](docs/archive/development-execution-foundation-2026-10-11.md); its completed checkboxes do not mean the expanded product is complete.

Not yet complete: a shared cross-import entity layer with reversible reconciliation; general generated-interface hosting; movable folders/projects/components; live external adapters. Existing views, forms and sharing are reusable foundations, not evidence that all these targets work already. User-driven ChatGPT testing has started; full host acceptance remains open.

Database layering and the common vocabulary are agreed in [README](README.md). [Interface rules](docs/INTERFACE_RULES.md) separates agreed usability direction from the proposed edit-routing policy.

## Ordered implementation steps

### 1. Define and separate the shared data and component contracts

- [ ] Implement the three-layer contract: fixed platform, extensible person/organization/project/location concepts, and customer-designed schema. Use the platform project identity for project relationships; studies are optional extensions.
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

- [ ] Let ChatGPT propose match/link/merge, preferred-value and conflict decisions, including rationale and source references.
- [ ] Preserve original entries and alternatives, record accepted decisions, and implement undo/split/correction without losing relationships or audit evidence.
- [ ] Apply initial confirmed imports or scoped future-maintenance grants atomically with permission/concurrency checks and idempotent receipts.
- [ ] Keep uncertain alternatives local to facts/entities; do not create whole-database branches. Do not require a rigid matching rulebook or prompt for every minor normalization.
- [ ] Ensure a merge cannot expose hidden data, infer permissions, or silently retarget an external action.

### 4. Add projects, folders and durable saved components

- [ ] Implement project/folder/component create, rename, organize, archive and move APIs with stable IDs and revision history.
- [ ] Save component source/configuration, entrypoint, data bindings, assets, runtime and capability requirements after preview confirmation.
- [ ] Allow many components to reference the same shared entities. Distinguish an organizational move from an explicit duplicate/fork.
- [ ] Make moves permission-aware; preserve references, version history and jobs, while pausing affected execution if its authority is no longer valid.

### 5. Host ChatGPT-generated interfaces

- [ ] Choose and document one supported UI package/runtime contract, then implement isolated rendering for generated interfaces in the workspace and compatible ChatGPT surface.
- [ ] Define component binding metadata for sources, live versus snapshot values, edit targets and calculations. Resolve the proposed editing semantics in INTERFACE_RULES.md before implementing them.
- [ ] Provide a permission-checked bridge for queries, previews/commits, files, authorized tools and run status. Keep tokens and raw database connections out of generated code.
- [ ] Support provisional rendering, explicit save, reopen by exact revision, updates and recovery of an earlier component version.
- [ ] Support user-created forms, tables, charts and mixed interfaces without shipping a fixed template catalogue. Validate host capabilities before promising unrestricted rendering.

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

- [ ] Use one synthetic investigator/study/conference/organization scenario: confirmed import, reuse shared identities, preserve a conflicting fact, reverse an incorrect match, create/reopen two different components, move one, share restricted access and run an authorized background action.
- [ ] Verify the real ChatGPT sign-in return, workspace opening, component rendering, confirmations, cross-chat persistence and revocation. Do not infer success from backend tests alone.
- [ ] Verify one enabled provider with safe test destinations; no real-recipient test messages.
- [ ] Fix observed defects, record limitations and verify recovery before customer reliance. Public publication and Trialegions rename remain separate decisions.

## Removed from the active plan

No fixed clinical templates, review chains, prescribed business workflows or hardcoded action catalogue. The minimal execution panel is no longer the final product target, and generated UI hosting is no longer excluded. No whole-database branching for every ambiguous match, automatic destructive deduplication, or unrestricted maintenance authority. No speculative vector service or scaling infrastructure.

## Lean verification and user dependencies

Use focused checks for reconciliation undo/source preservation, tenant/AI access, move/sharing boundaries, generated UI isolation, atomic saves/retries and external duplicate effects, plus the single end-to-end example above. Reuse existing meaningful checks; avoid exhaustive cosmetic or template tests.

Proceed without further product decisions on the shared data/component foundation. Ask only when a concrete external provider/account, new paid infrastructure, production recovery policy or publication decision is required. No new account or cost has been approved by this documentation update.
