# Foundation architecture correction

Decision date: 11 October 2026. Status: accepted direction, with the first execution implementation now complete; see [EXECUTION.md](EXECUTION.md) for actual supported contracts and limits. Active scope: [README](../README.md). Build order: [DEVELOPMENT](../DEVELOPMENT.md).

## Product expansion: shared entities and saved applications

Accepted clarification, 11 October 2026: the execution foundation is a subsystem of a larger persistent workspace, not the complete product. ChatGPT authors interfaces, logic and reconciliation decisions; Trialy hosts and organizes saved components, maintains connected authorized data and runs approved actions.

Target additions (not yet implemented):

- Shared stable entity identities with original observations, aliases, project-specific relationships and preferred interpretations. Preserve conflicting values and reversible link/merge/split history; avoid whole-database branching.
- A projects/folders/component layer that organizes presentation without duplicating data. Component revisions bind source, assets, data references and execution capabilities. Moves preserve identity and check destination access and active grants.
- A generated-interface host with its own isolation boundary and brokered access. Existing QuickJS server execution does not establish browser UI isolation. Generated clients cannot hold provider secrets or directly access database connections.
- Team/external sharing and collection bounded by both component and underlying data permissions. Reconciliation must not become a route to hidden facts or new action authority.

Initial persistence still requires confirmation. Subsequent AI maintenance may operate under a scoped standing grant, with preserved sources and audited reversible changes. See the active roadmap for dependency order; the execution architecture below remains applicable as a subsystem.

## Approved schema boundary

Use the three-layer model in README: platform invariants, extensible common person/organization/project/location concepts, and customer-specific schema. Project is general-purpose; a study is an optional specialization. Reuse the stable platform project ID for both organization and project relationships. Do not hardcode clinical roles into separate person tables. Schema and record reconciliation must preserve meanings and originals, operate only on authorized data, and maintain logical customer isolation within shared PostgreSQL.

Generated component contracts must capture field bindings and provenance so editing can target the correct shared record, project-specific relationship or presentation configuration. See INTERFACE_RULES.md for approved navigation/editability preferences and the still-proposed detailed editing policy. Session age must not be mistaken for record identity or revision state.

## Approved capture and maintenance boundary

Task-driven setup requires reviewed purpose, inclusion criteria, schema and maintenance permission. A multi-entry/repeated tracking task can start with one record; reuse existing structures before proposing new ones. Record the scope and schema revision so the broker can constrain routine writes to approved types/fields/actions and authorized sources. ChatGPT evaluates semantic fit and reconciliation; uncertain fit must not silently expand the scope. Do not replace semantic judgment with a hardcoded clinical workflow catalogue.

After setup approval, routine qualifying additions and updates use the scoped standing permission. Schema and inclusion-scope expansion require a new reviewed proposal. Approved new fields can be backfilled from permitted sources. Maintain previous observations, provenance and correction history; do not archive whole conversations or add fields from passing mentions. Explicitly saved original files remain preserved. An accepted maintenance scope is not automatically a scheduled job or access to every chat; available sources and triggers must be explicit.

This capture contract is a target layered onto existing proposals, grants and receipts, not already-complete behavior. Current execution-grant limitations remain documented in EXECUTION.md until the implementation changes.

## Responsibility boundary

ChatGPT creates code and application logic. Trialy supplies persistent data, isolated execution and authorized tools. A generic table view is a useful client; it does not constrain the logic that may run. A user may create a review process in their own data/code, but that process is not a platform-wide requirement.

Platform invariants are authentication, tenant/resource isolation, explicit authorization, exact save receipts, source preservation, audit/provenance and controlled resource use. Business choices—review stages, reminder recipients, intake decisions, calculations and presentation—belong to user-authored applications. This correction must not weaken existing authorizations while extracting those choices.

## Proposed execution architecture

1. **Client:** ChatGPT/MCP or the minimal embedded/standalone UI submits source, inputs and requested capabilities, or identifies a saved function revision.
2. **Control plane:** authenticates the caller, resolves workspace permissions and validates the requested execution mode. It creates an opaque run identity; code cannot choose its own tenant, actor or permission claims.
3. **Job dispatcher:** launches a bounded isolated environment through a runtime adapter. It has no business-workflow dispatch table.
4. **Capability broker:** mediates every data/tool operation under the effective run scope. The isolated process receives only a short-lived run credential; it never receives DATABASE_URL, SESSION_SECRET, provider tokens or arbitrary host access.
5. **Data/tool adapters:** perform authorized reads, collect temporary proposals, or carry out effects already covered by an active grant. Database writes use the shared mutation/receipt path. External effects use provider-aware receipts and reconciliation.
6. **Results:** return bounded output/artifacts to the requesting identity, with explicit temporary versus saved status. Successful computation does not mean a proposal was committed.

The effective scope is the intersection of current caller permissions, workspace/model exclusions for model-visible executions, declared function/run capabilities, and active grants. Granting a tool cannot expand data visibility. Background runs cannot inherit stale privileges indefinitely. Operational cancellation/revocation blocks subsequent broker operations; it cannot undo an external effect already completed.

## Contract sketches

Names are illustrative; define concrete schemas during implementation.

| Boundary | Inputs | Result and constraints |
| --- | --- | --- |
| Data read | Resource ID, selected fields, predicates, joins, bounded page | Permission-filtered results and source versions; hidden fields cannot influence counts/filtering/joins |
| Experimental run | Source or revision, runtime, input, capabilities, limits | Temporary result/artifacts and optional write proposal; no implicit persistence or external writes |
| Prepare changes | Typed mutations, files, read/write version references | Immutable-to-the-caller proposal digest, exact effect summary, expiry |
| Commit proposal | Proposal ID/digest and trusted confirmation or matching standing grant | Atomic database write set, versions/audit, idempotent receipt; never rerun code to reconstruct the accepted proposal |
| Save function | Reviewed source/runtime/dependencies, contracts, capability manifest | Immutable function revision; no implied side-effect permission |
| Invoke function | Exact revision, inputs, execution authorization | Run ID, state, result/provenance and receipts |
| Schedule | Exact function revision, trigger, scope/grant | Versioned generic schedule; material revision/scope changes do not silently reuse consent |
| Invoke tool | Registered tool/version, connection ID, input, effect authorization | Validated result/receipt; credentials stay with adapter and outcome uncertainty is explicit |

Prefer one broker path for interactive and background execution. Raw SQL, direct table writes and arbitrary server-side method names are not an escape hatch around permissions. Richer queries are desirable, but their semantics must still enforce field/resource isolation.

## Execution modes and persistence

- **Experiment:** source, intermediate files and proposals are temporary. Set explicit expiry/quotas; never describe them as saved work. Keep minimal operational metadata needed for reliability/abuse accounting, without turning every prompt, source draft or tool response into immutable product history.
- **Save function:** user confirms an exact revision, inputs/outputs and declared access. This begins function version history. Authorization to execute side effects is a separate decision.
- **Confirmed execution:** code prepares a write set; a person confirms that exact proposal. Grant scope must distinguish code editing from data mutation.
- **Standing execution:** a reviewed revision may execute within explicit revocable future permission. New code or expanded destinations/capabilities requires fresh authorization. Pure repeated computation need not prompt for every internal step.
- **External effects:** reads can be used experimentally within scope. A dry run cannot send mail or perform an external write. Provider support determines preview/idempotency behavior; never represent external effects and a local database commit as one atomic transaction.

Committed function/run/receipt evidence records who authorized what, the relevant revision, inputs or governed input references, actual effect identities and result status. Sensitive logs must not become a second uncontrolled data store. Restore/export must include saved functions and execution evidence once introduced.

## Existing dependency map

| Existing code | Disposition | Separation required |
| --- | --- | --- |
| `src/db/database.ts`, `src/db/originals.ts`, immutable SQL history/payload tables | Keep | Use behind broker/services; never hand connections to generated code |
| `src/server/auth.ts`, `local-oauth.ts`, `mfa.ts` | Keep | Reuse identity and consent; add run-scoped credentials without exporting account secrets |
| `src/domain/permissions.ts` | Keep/generalize | Preserve restrictions during refactor; replace broad full-workspace prerequisites with resource/action checks where justified |
| `src/domain/service.ts` | Split | Extract data, document, query and proposal/commit services; move template installs, fixed review lifecycle and business-action dispatch into legacy adapters |
| `src/shared/schema.ts` | Split | Separate foundation data/capability contracts from legacy `install_template`, `request_review`, and predefined `create_automation` action union |
| `src/domain/templates.ts`, `template-upgrades.ts` | Freeze then retire | Remove default catalogue after clients no longer depend on it; preserve installed entity types/records and installation history |
| `src/server/reviews.ts`, fixed lifecycle transition methods | Legacy | Keep historical evidence and existing review management accessible until retirement; do not make this flow mandatory for new foundation writes |
| `src/server/external.ts`, `invitations.ts` | Reuse selected primitives | Invitations/sharing and original intake are reusable; owner-only acceptance and fixed questionnaire logic must not constrain general code/tool operations |
| `src/worker/processor.ts`, PDF/OCR/Office extractors | Keep | Preserve originals and quiet availability behavior; expose extraction through governed data/tool capabilities |
| `src/worker/isolated.ts`, `extract-child.ts` | Keep for extraction only | Existing subprocess/timeouts are not the isolation boundary for arbitrary generated code |
| `src/worker/automations.ts`, `src/shared/schedules.ts` | Replace dispatch / reuse timing | Generalize leases, grants, schedules/events and receipts; maintain separate legacy poller until active rules have an explicit disposition |
| `src/worker/index.ts`, `scripts/demo.ts` | Refactor entrypoints | Both call the legacy automation runner; splitting production only leaves demo coupled |
| `src/server/mcp.ts` | Extend/reduce assumptions | Remove template bootstrap dependence, expose generic data/code/function/run/tool operations; do not claim automatic host behavior without acceptance |
| `src/web/main.tsx`, `src/embed/main.tsx` | Simplify | Keep useful generic data/files views; add execution/results/functions controls; stop expanding fixed business navigation |
| `src/web/ReviewInbox.tsx`, `AutomationRecord.tsx`, `TemplateUpgrades.tsx` | Legacy UI | Retire from default navigation with a compatibility route for history/active jobs as needed |
| `src/shared/WorkspaceViews.tsx`, field editors, import and history components | Keep as clients | Reusable layouts are optional conveniences, not the limit of permissible application behavior |
| `src/domain/inspection.ts`, recovery scripts, runtime-role SQL | Keep/extend | Export and recover new function/run evidence; preserve existing histories, including legacy feature tables |
| `plugin/trialy/` | Keep existing package | Update instructions/connection metadata only when needed; no duplicate plugin |

## Retirement and rollback

Do not delete database rows, original bytes, revisions, approvals or audit events to simplify code. Retiring a UI does not retire its evidence. Do not rewrite already-applied migrations; add forward migrations only when needed. Function/data API extraction should initially preserve old endpoints through adapters so it can be reviewed and reverted independently.

Before removing a legacy runner or endpoint, inventory its active schedules and callers. Choose explicit freeze, continued compatibility or reviewed replacement; do not silently convert a business rule into generated code with inherited privileges. Preserve existing role/grant behavior until a replacement is proven at the resource boundary.

The first branch checkpoint is documentation only. Runtime refactoring comes next on the same branch. Merge/deploy after basic regression checks and an explicit implementation record; the existing production branch remains an operational fallback. No new application/repository or infrastructure duplication is necessary for the architectural separation itself.

## Runtime feasibility decision

The isolated runtime was the principal missing capability in the earlier execution phase and remains a critical security boundary. Its adapter must support bounded process execution, constrained networking, no host/tenant cross-access, cancellation and deterministic identification of the runtime image/dependencies.

The implementation selects pinned QuickJS/WASM JavaScript in the existing Render worker, with a fixed WASM memory maximum, bounded guest heap, JSON-only broker and disposable process. No additional provider account is needed. The original feasibility requirements below remain applicable. Investigate a concrete supported option before implementing or provisioning it. Existing Render web/worker deployment is retained; whether generated code runs there or through an external execution service is a feasibility/cost decision, not permission to weaken isolation. If a new account/budget is necessary, present the concrete option and tradeoffs to the user then.

## First acceptance example (synthetic, no clinical workflow)

Create a user-defined table with numeric values. ChatGPT writes a function that reads permitted rows, calculates a derived value and proposes an update plus a small result artifact. A run with no write authorization must produce only a temporary preview. Confirmation writes the accepted values through the normal audit/receipt path. Save the function after a separate preview, invoke its exact revision again, then schedule it with a scoped standing grant. Revoke the grant and verify no further effects occur.

This exercises the foundation without shipping another prescribed workflow. No real emails, provider accounts or business templates are needed for the first local end-to-end implementation; true runtime-host feasibility must still be established.
