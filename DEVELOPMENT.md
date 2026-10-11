# Trialy — Foundation Development Plan

Updated 11 October 2026. This replaces the old 18-step business-feature checklist. [Scope](README.md) · [Architecture](docs/FOUNDATION_ARCHITECTURE.md) · [History](HISTORY.md).

## Current position

The foundation execution path is implemented on `foundation-reset`; no legacy rows or histories were deleted. See [EXECUTION.md](docs/EXECUTION.md) for the implemented limits and remaining boundaries. The original new-scope checklist below remains a detailed contract; checked items are implemented, not a claim of production validation.

## Ordered implementation steps

### 1. Separate the foundation from legacy business features

Shared data/query/document implementations and the capability facade are extracted. The legacy commit/validation engine remains shared to preserve evidence and permission behavior; it is not fully physically split yet.

- [ ] Extract reusable record, document, query, permission and commit services from `src/domain/service.ts`, preserving existing callers and behavior.
- [x] Separate foundation operation schemas from legacy template/review/automation schemas. Keep the old adapter for existing endpoints until replacement is ready.
- [x] Introduce a capability registry for operations available to code. Inputs, outputs, effect class and permission checks must be explicit; no raw database handle or arbitrary service-method dispatch.
- [x] Separate the legacy automation poller from the future general job dispatcher in both production and demo entrypoints. Existing rules must not silently disappear or be translated to code.
- [x] Add a minimal foundation navigation path. Retire template/business builders from the default experience only with working access to retained records and historical evidence.

Done when existing data can be read/previewed/committed through the shared foundation API, and legacy entrypoints are thin adapters rather than dependencies of the foundation.

### 2. Implement isolated, read-only execution first

- [x] Define a runtime adapter and implement one actual isolation boundary for generated code. Do not use the Express process, Node `vm`, or the existing extraction subprocess as an untrusted-code sandbox.
- [x] Run a first supported language against a short-lived, run-scoped capability broker. Make language/runtime/dependency versions explicit and pinned; no arbitrary package installation during a run.
- [x] Enforce CPU/wall-time, memory, process, output and temporary-file limits; cancellation must terminate the isolated job.
- [x] Deny direct database access, host files, credentials and unrestricted outbound networking. Broker reads under the initiating identity and current permissions.
- [x] Return bounded results, artifacts and diagnostics without saving experimental source/data as authoritative records. Record only minimal operational metadata under a documented retention policy.

Done when a synthetic program can query permitted records and compute a result, cannot read another tenant or contact an undeclared destination, and can be stopped. Confirm runtime hosting feasibility before enabling generated-code execution on Render; no paid sandbox/provider provisioning without the required account/budget decision.

### 3. Add generic change proposals and confirmed commits

- [x] Let execution collect data mutations and file artifacts in a temporary proposal without applying them.
- [x] Bind the proposal to identity, input/function digest, exact write set, data/configuration versions and expiration.
- [x] Reuse the existing commit transaction, permission rechecks, revision/audit records and idempotent receipt. Commit the reviewed write set, not a fresh execution of possibly changed code.
- [ ] Explicitly distinguish database changes from external actions. An external action cannot be rolled back by a database transaction; reconcile uncertain outcomes and do not blindly retry non-idempotent actions.
- [x] Add a confirmation interface usable from the permitted ChatGPT surface, with standalone fallback. Host verification remains deferred.

Done when code proposes multiple changes, confirmation atomically commits them, stale/unauthorized proposals fail without partial writes, and a retry returns the original receipt.

### 4. Save and version reusable functions

- [x] Add immutable function revisions containing source, runtime, declared dependencies, input/output contracts and requested capabilities.
- [x] Preview and confirm function persistence separately from granting execution rights. Save no draft simply because ChatGPT generated it.
- [x] Invoke an exact revision with validated inputs and results linked to provenance.
- [x] Bind side-effect grants to a reviewed revision and destination/resource scope; revisions requiring changed authority need new consent.

Done when ChatGPT can save a function after confirmation and invoke that same revision in another session without recreating it.

### 5. Generalize background execution

- [x] Add general run records, leased jobs, attempts, cancellation, bounded retries, results and recovery after worker interruption.
- [x] Reuse scheduling/time-zone and event cursor mechanics, but dispatch saved function revisions instead of hardcoded business action enums.
- [x] Permit preview-only scheduled computation or writes covered by an explicit active standing grant. Approval must constrain operations and destinations; it is not blanket permission for generated code.
- [x] Recheck permissions/grants at execution and each brokered side effect. Use idempotency/reconciliation appropriate to the effect.
- [x] Expose generic schedule/run controls rather than reminder/review-specific builders.

Done when an authorized saved function runs with ChatGPT closed, produces a durable run result, survives a worker retry without duplicate effects, and stops acting after revocation.

### 6. Add the extensible tool gateway

Internal typed discovery/invocation and synthetic echo are implemented. Remote connections, write adapters and provider reconciliation are intentionally not advertised as available; they need a selected provider and credentials.

- [x] Define typed tool discovery/invocation and read/proposal effect classification for Trialy data and synthetic echo. These adapters require no external credentials.
- [ ] Bind tools to tenant/user connections; keep credentials outside generated-code processes. Register outbound destinations through trusted configuration, not arbitrary URLs from source content.
- [ ] Support once/future invocation scopes, previews where supported, operation receipts and unknown-outcome reconciliation.
- [ ] Persist approved tool definitions/versions with an explicit review path. Treat returned text/files as data, not permission to call another tool.
- [ ] Add actual external providers only when selected credentials/accounts are available. Do not assume ChatGPT-connected tools can be invoked by Trialy's worker.

Done when code discovers and invokes an allowed tool through the broker, cannot access another connection, and a tool side effect requires the appropriate permission.

### 7. Complete the minimal ChatGPT execution experience

- [x] Expose create/run/inspect/cancel/propose/commit/save-function/invoke/schedule capabilities through MCP.
- [x] Provide data, function, run, result/artifact and permission views in the embedded interface. Reuse generic components; no new business modules or template catalogue.
- [x] Support granular data queries/joins and source references needed by actual programs, using authorized operations rather than unrestricted SQL.
- [x] Provide app-only confirmation controls, with standalone fallback. Actual host enforcement and human-origin assurance still require the deferred host acceptance; visibility metadata alone is not proof.
- [ ] Retire obsolete business UI and code after dependency checks, while retaining access to records, histories and any active legacy job-management path.

Done when the complete synthetic code → experiment → proposed changes → confirmation → save function → repeat invocation path works through the shared backend. Real host return/opening/files and cross-conversation behavior require the deferred ChatGPT acceptance session.

### 8. Production readiness and final acceptance

Updated runtime-role grants, export coverage, rollout/rollback instructions and synthetic restore evidence exist. Actual production role provisioning, managed restore and real-host acceptance remain open. No new account or paid resource was required for the JavaScript runtime.

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
