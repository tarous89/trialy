# Trialy — Foundation Development Plan

Updated 11 October 2026. This replaces the old 18-step business-feature checklist. [Scope](README.md) · [Architecture](docs/FOUNDATION_ARCHITECTURE.md) · [History](HISTORY.md).

## Current position

- Branch: `foundation-reset`, based on `87adf5d` on main.
- Existing runtime remains deployed at `b2dce02`; no records, migrations, screens or jobs have been removed by this correction.
- Scope/architecture reset and dependency map are complete. General code execution is not yet built.
- Next implementation is Step 1 below. Do not resume the old template, multi-stage review, specialized reminder or RFP feature backlog.

## Ordered implementation steps

### 1. Separate the foundation from legacy business features

- [ ] Extract reusable record, document, query, permission and commit services from `src/domain/service.ts`, preserving existing callers and behavior.
- [ ] Separate foundation operation schemas from legacy template/review/automation schemas. Keep the old adapter for existing endpoints until replacement is ready.
- [ ] Introduce a capability registry for operations available to code. Inputs, outputs, effect class and permission checks must be explicit; no raw database handle or arbitrary service-method dispatch.
- [ ] Separate the legacy automation poller from the future general job dispatcher in both production and demo entrypoints. Existing rules must not silently disappear or be translated to code.
- [ ] Add a minimal foundation navigation path. Retire template/business builders from the default experience only with working access to retained records and historical evidence.

Done when existing data can be read/previewed/committed through the shared foundation API, and legacy entrypoints are thin adapters rather than dependencies of the foundation.

### 2. Implement isolated, read-only execution first

- [ ] Define a runtime adapter and implement one actual isolation boundary for generated code. Do not use the Express process, Node `vm`, or the existing extraction subprocess as an untrusted-code sandbox.
- [ ] Run a first supported language against a short-lived, run-scoped capability broker. Make language/runtime/dependency versions explicit and pinned; no arbitrary package installation during a run.
- [ ] Enforce CPU/wall-time, memory, process, output and temporary-file limits; cancellation must terminate the isolated job.
- [ ] Deny direct database access, host files, credentials and unrestricted outbound networking. Broker reads under the initiating identity and current permissions.
- [ ] Return bounded results, artifacts and diagnostics without saving experimental source/data as authoritative records. Record only minimal operational metadata under a documented retention policy.

Done when a synthetic program can query permitted records and compute a result, cannot read another tenant or contact an undeclared destination, and can be stopped. Confirm runtime hosting feasibility before enabling generated-code execution on Render; no paid sandbox/provider provisioning without the required account/budget decision.

### 3. Add generic change proposals and confirmed commits

- [ ] Let execution collect data mutations and file artifacts in a temporary proposal without applying them.
- [ ] Bind the proposal to identity, input/function digest, exact write set, data/configuration versions and expiration.
- [ ] Reuse the existing commit transaction, permission rechecks, revision/audit records and idempotent receipt. Commit the reviewed write set, not a fresh execution of possibly changed code.
- [ ] Explicitly distinguish database changes from external actions. An external action cannot be rolled back by a database transaction; reconcile uncertain outcomes and do not blindly retry non-idempotent actions.
- [ ] Add a confirmation interface usable from the permitted ChatGPT surface, with standalone fallback. Host verification remains deferred.

Done when code proposes multiple changes, confirmation atomically commits them, stale/unauthorized proposals fail without partial writes, and a retry returns the original receipt.

### 4. Save and version reusable functions

- [ ] Add immutable function revisions containing source, runtime, declared dependencies, input/output contracts and requested capabilities.
- [ ] Preview and confirm function persistence separately from granting execution rights. Save no draft simply because ChatGPT generated it.
- [ ] Invoke an exact revision with validated inputs and results linked to provenance.
- [ ] Bind side-effect grants to a reviewed revision and destination/resource scope; revisions requiring changed authority need new consent.

Done when ChatGPT can save a function after confirmation and invoke that same revision in another session without recreating it.

### 5. Generalize background execution

- [ ] Add general run records, leased jobs, attempts, cancellation, bounded retries, results and recovery after worker interruption.
- [ ] Reuse scheduling/time-zone and event cursor mechanics, but dispatch saved function revisions instead of hardcoded business action enums.
- [ ] Permit preview-only scheduled computation or writes covered by an explicit active standing grant. Approval must constrain operations and destinations; it is not blanket permission for generated code.
- [ ] Recheck permissions/grants at execution and each brokered side effect. Use idempotency/reconciliation appropriate to the effect.
- [ ] Expose generic schedule/run controls rather than reminder/review-specific builders.

Done when an authorized saved function runs with ChatGPT closed, produces a durable run result, survives a worker retry without duplicate effects, and stops acting after revocation.

### 6. Add the extensible tool gateway

- [ ] Define tool registration/discovery, typed invocation, read/write effect classification and credential requirements. Start with existing Trialy capabilities and synthetic external adapters.
- [ ] Bind tools to tenant/user connections; keep credentials outside generated-code processes. Register outbound destinations through trusted configuration, not arbitrary URLs from source content.
- [ ] Support once/future invocation scopes, previews where supported, operation receipts and unknown-outcome reconciliation.
- [ ] Persist approved tool definitions/versions with an explicit review path. Treat returned text/files as data, not permission to call another tool.
- [ ] Add actual external providers only when selected credentials/accounts are available. Do not assume ChatGPT-connected tools can be invoked by Trialy's worker.

Done when code discovers and invokes an allowed tool through the broker, cannot access another connection, and a tool side effect requires the appropriate permission.

### 7. Complete the minimal ChatGPT execution experience

- [ ] Expose create/run/inspect/cancel/propose/commit/save-function/invoke/schedule capabilities through MCP.
- [ ] Provide data, function, run, result/artifact and permission views in the embedded interface. Reuse generic components; no new business modules or template catalogue.
- [ ] Support granular data queries/joins and source references needed by actual programs, using authorized operations rather than unrestricted SQL.
- [ ] Separate trusted user confirmation from model-invoked requests. Do not label an action standalone-only merely because its first endpoint was implemented there.
- [ ] Retire obsolete business UI and code after dependency checks, while retaining access to records, histories and any active legacy job-management path.

Done when the complete synthetic code → experiment → proposed changes → confirmation → save function → repeat invocation path works through the shared backend. Real host return/opening/files and cross-conversation behavior require the deferred ChatGPT acceptance session.

### 8. Production readiness and final acceptance

- [ ] Apply separate runtime credentials, configure monitoring and choose operational retention for code/run artifacts and diagnostics.
- [ ] Agree recovery expectations, budget/geography and customer policies; perform an actual managed backup restore including new foundation objects.
- [ ] Complete real ChatGPT/account/browser acceptance, fix observed issues and verify enabled provider connections when available.
- [ ] Prepare rollout/rollback and only then perform any separately authorized Trialegions name/domain cutover.

## What is not in this plan

No industry templates, prescribed review states/chains, specialized reminder products, RFP-specific processing or mandatory intake/acceptance processes. No vector service, arbitrary generated UI framework, individual-row permissions or scale infrastructure without a demonstrated foundation requirement. These are not prerequisites disguised as “remaining full scope.”

## Lean verification

Keep the existing essential data/auth tests during extraction. Add focused checks for the new boundaries: tenant/capability isolation; resource limits/cancellation; proposal/commit/staleness/retry; function version/grant binding; job recovery; tool credentials and duplicate effects. One synthetic end-to-end foundation example is enough initially. Do not run every old business-flow test as a permanent product gate after its feature is retired, but preserve relevant data-integrity regression coverage.

## Decisions that may require the user later

- Hosting an actual untrusted-code sandbox if the existing environment cannot provide the required isolation; any new account or cost.
- External provider credentials and permitted destinations.
- Production recovery/retention/location/budget and publication cutover.

No decision is needed to start separating the foundation interfaces. Record feasibility findings before asking for any runtime/provider decision; do not provision speculative infrastructure.
