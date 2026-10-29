# App platform implementation roadmap

Date: 29 October 2026. Status: planning only. All steps below are pending; existing capabilities are identified as reuse targets, not new completions.

[Product scope](APP_PLATFORM_SCOPE.md) · [Connector and cost design](CONNECTORS_AND_USAGE.md) · [Current development baseline](../../DEVELOPMENT.md)

Implement in the numbered order unless a step explicitly names an independent prerequisite. Each step should become a reviewable change with its stated acceptance evidence. Keep backend, app, embedded host and MCP contracts consistent. New proposed modules/API names below do not exist yet unless linked as current files.

## Release sequence

| Step | Deliverable | Depends on | Relative scope |
| --- | --- | --- | --- |
| AP-00 | Compatibility inventory and app contract | Current source | Small/moderate |
| AP-01 | Unified app Home and creation | AP-00 | Small/moderate |
| AP-02 | Packages, revisions, previews and releases | AP-00 | Moderate |
| AP-03 | Identity/data/action SDK | AP-02 | Large |
| AP-04 | Internal routes and links | AP-01–03 | Moderate |
| AP-05 | Usage ledger, limits and reservations | AP-02–03 | Moderate/large |
| AP-06 | Isolated browser build and runtime | AP-02–05 | Large |
| AP-07 | Isolated server tasks and endpoints | AP-03, AP-05–06 execution-provider decision | Large |
| AP-08 | Durable jobs, cron and events | AP-07 | Large; reuse existing engine |
| AP-09 | Generic connectors and credential flow | AP-03, AP-05, AP-07–08 | Large |
| AP-10 | Collaboration and external app audiences | AP-03–04; AP-08 for subscriptions | Moderate/large |
| AP-11 | Migration, operations and host acceptance | AP-01–10 | Large; release gate |
| AP-12 | Long-lived services and additional runtimes | AP-07–11 | Large; separate release |
| AP-13 | Managed email, document and AI connectors | AP-09, AP-11 and priced provider | Per-adapter scope |

These sizes are planning comparisons, not day/week commitments. Measure the execution-provider prototype, embedding behavior and migration inventory before estimating dates or purchasing infrastructure. No production provision, integration activation or billing is authorized merely by merging this planning document.

Milestone A can ship after AP-01–04 pass their compatibility checks using the legacy runtime. Milestone B needs AP-05–11 and must demonstrate browser packages, both initial server runtimes, jobs and generic connectivity. AP-12 and AP-13 expand capability without bringing back app categories. Public external signup can follow the invite-only audience in AP-10.

## AP-00 — Establish compatibility and capability contracts

1. Inventory current components, functions, collection links, legacy automations, previews, routes, grants and schedules. Record counts and schema versions without exporting customer contents.
2. Define one app identity that can reference existing component/function/collection implementations. Do not move every legacy object into a new physical table as a prerequisite. Preserve stable IDs or explicit ID aliases.
3. Separate presentation metadata (`name`, tags, template origin) from executable capabilities (data, files, functions, jobs, connectors, routes). Decide how standalone jobs appear on Home and avoid duplicate cards for jobs already owned by an app; their runs remain visible in app activity.
4. Version the app manifest and runtime contract. Include environments, entry points, runtime/toolchain, dependency locks, routes, capability bindings and resource ceilings.
5. Replace category-dependent validation with explicit data/action validation. Inventory every `resourceKind`/kind branch, including API enums, SQL constraints, settings, thumbnails, revisions and tests. Preserve any existing read/write restriction as a capability during migration.
6. Define capability discovery for builders: supported runtime versions, packages/protocol constraints, limits and actionable validation errors. A request failing a runtime constraint should say why; it must not be relabeled as an unsupported business category.

Current touchpoints: [resource contract](../../src/workspace/resource-contract.ts), [workspace schema](../../src/workspace/schema.ts), [execution schema](../../src/foundation/schema.ts), [connected resources](../CONNECTED_RESOURCES.md), [migration 033](../../migrations/033_connected_resources.sql).

Acceptance: a pure calculator with no database, a data-editing multi-screen app and a job-only app all validate without choosing one of four types. Existing connected apps retain identical effective permissions and record IDs. New generic data bindings cannot bypass manifest validation. Capture a migration/reversal plan before changing persisted schema.

## AP-01 — Present one Home and one creation flow

1. Remove the four mandatory type filters and type selection from creation. Use Home, optional projects, search, recent updates and optional user tags. Show generic app names and previews.
2. Remove type-based card border/icon requirements. Let apps have their own icon/appearance, with a neutral default. Templates may retain their visual defaults.
3. Change creation prompts to the user's intended result. Offer optional examples/templates; let the builder combine capabilities and create custom layouts.
4. Introduce neutral create/read/revise/open app operations as the public builder contract. Keep old tracker-specific operations as compatibility adapters. Keep drafting, saving, publishing and running separate.
5. Update both plugin skill instructions, references, discovery text and embedded/standalone paths. Do not update only the hosted design documentation while leaving bundled instructions contradictory.

Current touchpoints: [HomeView](../../src/shared/ui/HomeView.tsx), [HomePanel](../../src/shared/HomePanel.tsx), [Home query](../../src/workspace/home.ts), [CreationCenter](../../src/shared/CreationCenter.tsx), [creation prompts](../../src/shared/creation.ts), [MCP](../../src/server/mcp.ts), [workspace MCP](../../src/server/workspace-foundation.ts), [workspace skill](../../plugin/trialy/skills/trialy-workspace/SKILL.md), [design skill](../../plugin/trialy/skills/trialy-tracker-design/SKILL.md).

Acceptance: “Build a co-lab with a calculator and member pages” produces one named app entry without a category question. Existing trackers/forms/automations remain accessible. A template app can become custom without record duplication. App-only labels do not accidentally hide old functions or external forms.

## AP-02 — Add packages, previews and release lifecycle

1. Store immutable multi-file source revisions and manifests. Support small structured MCP submissions and bounded upload/chunk references for larger packages. Do not require the user to manage a repository or paste code.
2. Validate file paths, archives, package sizes, asset types and content hashes. Reject path traversal and unsafe archive extraction. Keep authorized source access separate from app runtime audience.
3. Add build states (`queued`, `building`, `ready`, `failed`, `cancelled`) and immutable artifacts; separate build readiness from published status.
4. Add private previews, saved drafts and published release pointers. New revisions must leave the active release available until activation succeeds. Pin execution to exact release/revision.
5. Define activation/recovery behavior for schema changes: preview the schema diff separately, use compatible expansion, and keep old releases working during the transition. A code rollback never rolls back data or external effects implicitly.
6. Add recovery/export coverage for packages, artifacts, release pointers, bindings and historical authorization. Set preview/build-log retention without removing immutable committed history.

Current touchpoints: [workspace service](../../src/workspace/service.ts), [workspace schema](../../src/workspace/schema.ts), [guest drafts](../../src/workspace/guest-drafts.ts), [FrontendCodeRuntime](../../src/shared/FrontendCodeRuntime.tsx), `migrations/`. Proposed additions: app package/build/release services and artifact storage.

Acceptance: a multi-file app survives process restart, failed build, failed publish and reopen. The previous release remains usable. Source/history permissions survive copy, move, archive and restore. A rollback requiring incompatible data changes is blocked with a concrete recovery path.

## AP-03 — Build the shared app SDK and authorization gateway

1. Expose stable SDK methods for current identity, membership, records/queries, files, exact write proposals, job invocation/status, routes and connector operations. Generate SDK/type definitions from one versioned contract.
2. Support browser and server clients; provide a mock/local test client for generated code. Keep the wire contract independent of ChatGPT so another builder can submit packages without sharing ChatGPT sessions.
3. Bind sessions/capabilities to tenant, app, revision, identity, execution origin and allowed operations. Use short lifetimes and revocation checks. Human and AI permissions remain distinct; a worker cannot claim a human origin.
4. Route persistent mutations through existing version checks, previews/approved grants and audit receipts. Generalize schema assumptions only where needed. Pure UI state changes need no database approval.
5. Keep trusted authentication, spending, sharing and mutation review controls outside generated content. An app can initiate the flow, never silently approve it. Exact previews can be reused when existing authorization covers them.
6. Make reads, search, aggregation, export, files, subscriptions and background work observe the same effective access. Source literals and stored snapshots must not leak protected data to a broader app audience.

Current touchpoints: [data service](../../src/domain/data-service.ts), [effective access](../../src/domain/effective-access.ts), [write authorization](../../src/domain/write-authorization.ts), [workspace service](../../src/workspace/service.ts), [identity](../../src/server/identity.ts), [authentication](../../src/server/auth.ts), [frontend frame](../../src/shared/frontend-frame.ts).

Acceptance: the same forbidden field/record is denied through app UI, raw SDK call, direct URL, server function, job and export. Grant revocation during a run blocks its next effect. A fake generated approval or role selector cannot widen authority. A calculator runs without creating records or exposing account credentials.

## AP-04 — Make navigation and internal linking ordinary behavior

1. Implement canonical app routes, nested page paths, route parameters, relative links and explicit missing-page states. Preserve route state across refresh/reopen when available.
2. Add standalone back/forward handling and app-local history for embedded hosts. Implement a host adapter instead of assuming the top-level URL is writable.
3. Add cross-app and record-detail link helpers that perform destination authorization. Include an open-in-app fallback for host limitations. Keep external navigation separate.
4. Preserve relevant filters and unfinished draft state when navigating; prompt only when navigation would lose unsaved work. No sensitive records or bearer tokens in URLs/history.
5. Extend the legacy render/event runtime with a trusted navigation action so existing custom apps gain linking before the browser package migration.

Current touchpoints: [frontend runtime](../../src/shared/FrontendCodeRuntime.tsx), [frame](../../src/shared/frontend-frame.ts), [embed host](../../src/embed/main.tsx), [HomePanel](../../src/shared/HomePanel.tsx), [server app](../../src/server/app.ts). Proposed additions: shared app router and host navigation adapter.

Acceptance: open an app, navigate list → record → calculator → related app; use back/forward; refresh a detail link; reopen it in ChatGPT. Verify inaccessible destinations fail without revealing records, and stale/deleted records show a useful state. This is part of Milestone A, not a distant feature.

## AP-05 — Meter usage and enforce spending before paid execution

1. Define trusted usage events for builds, compute duration/size, storage, transfer and connector provider units. Keep estimates, incurred provider cost and customer charges distinct.
2. Implement an append-only idempotent usage ledger, versioned rates and a reservation lifecycle. Reserve maximum bounded exposure atomically before admitting concurrent work.
3. Apply app/account/run/build/month limits, queue fairness, concurrency and timeout limits, plus platform-wide provider caps. Add an owner-set warning threshold and hard stop; overage is opt-in.
4. Settle actual usage, release unused reservations, retain reservations for ambiguous provider outcomes and reconcile invoices. Prevent double charges on retry and double admission at the remaining-budget boundary.
5. Add a Usage settings view and app-level cost attribution. Log platform-caused failure adjustments separately; do not silently pass retry bugs to customers.
6. Run shadow metering with synthetic load before setting customer tariffs. Specify the baseline subscription allocation for idle services; do not conceal fixed infrastructure cost in arbitrary per-request counts.

Proposed additions: `src/usage/`, usage/budget migrations, SDK admission hooks and trusted settings UI. Reuse [run service](../../src/foundation/service.ts), [worker](../../src/foundation/worker.ts) and [evidence](../../src/domain/evidence.ts).

Acceptance: two concurrent runs cannot both spend the same remaining balance. A loop, abandoned build, runaway retries and unknown provider completion stay within a measured bounded exposure. Owner sees per-app usage and can stop future work. Customer-supplied provider charges are labeled external, not double-billed.

## AP-06 — Run real browser applications

1. Prototype the isolated build/execution provider behind an adapter. Measure startup, build time, package install behavior, regional availability, egress enforcement, cancellation and billable units. Select it through an architecture decision, not because the existing app already uses Render.
2. Build multi-file JS/TS/React applications with pinned toolchains/lockfiles in isolated environments. Include normal DOM, SVG/canvas, CSS/fonts and bundled assets. Support dependencies unless a concrete runtime incompatibility applies.
3. Serve immutable artifacts from an origin isolated from account/control-plane cookies and other apps. Verify sandbox flags, CSP, frame channels, token audience, service worker behavior, storage cleanup and navigation rules. Do not copy the current “only trusted scripts execute” CSP to the new runtime and claim arbitrary browser code works.
4. Provide the AP-03 SDK through a narrow authenticated bridge. Block alternate network/exfiltration paths; permit authorized service calls via the connector broker. External asset downloads enter the build/asset pipeline under resource and destination controls.
5. Run UI-only interactions locally and support data caching with permission-aware expiry/invalidation. Ensure cancellation or revocation cannot leave a privileged reusable token in the app.
6. Keep the legacy renderer operational. Add explicit opt-in conversion with preserved bindings; never automatically rewrite all existing code.

Current touchpoints: [frame](../../src/shared/frontend-frame.ts), [FrontendCodeRuntime](../../src/shared/FrontendCodeRuntime.tsx), [ComponentRuntime](../../src/shared/ComponentRuntime.tsx), [embed](../../src/embed/main.tsx), [frontend contract](../FRONTEND_CODE.md). Proposed additions: build worker, browser artifact host, SDK and sandbox adapter.

Acceptance: a normal React app with a compatible third-party package, routes and canvas builds and runs in standalone and the tested embedded host. Typing, sorting and page changes do not invoke the server interpreter. Host cookies, sibling-app data and parent DOM remain inaccessible. Build install scripts cannot reach platform secrets or internal services.

## AP-07 — Add server runtimes and HTTP handlers

1. Add isolated Node/TypeScript and Python adapters with dependency locks, scratch files and asynchronous execution. Do not run generated code using `eval`, Node `vm`, shell subprocesses or package installs in the trusted web/worker process without the separate execution boundary.
2. Pass only scoped SDK credentials to the run. Enforce outbound networking at the runtime boundary; shared data and external effects pass through their brokers. Restrict cloud metadata and control-plane access.
3. Map durable queue run IDs to execution-provider IDs. Record resource measurements and handle timeout, cancellation, lost workers and stale leases.
4. Add declared server endpoints behind Trialy's gateway: identity verification, route/input/output contracts, resource budgets, rate limits and streaming/size bounds. Long requests return a job handle rather than holding the web process indefinitely.
5. Capture structured, bounded diagnostics and artifacts with access checks/redaction. Support inspect/revise/retry through MCP without dumping private inputs or credentials into chat.

Current touchpoints: [runtime](../../src/foundation/runtime.ts), [runtime child](../../src/foundation/runtime-child.mjs), [worker](../../src/foundation/worker.ts), [foundation service](../../src/foundation/service.ts), [foundation MCP](../../src/server/foundation-mcp.ts), [render infrastructure](../../render.yaml).

Acceptance: a Python calculation using a package and a Node async task both run and save results through reviewed data writes. A malformed app cannot crash the control service or reach another tenant. A stopped run cannot later commit. An authenticated custom endpoint works without receiving owner credentials. Measure cold start and execution ceilings before advertising them.

## AP-08 — Extend the existing automation engine

1. Reuse functions, run IDs, leases, grants and schedule records. Version the trigger contract to support interval, one-off/delayed, cron with IANA time zones and existing record/document events without awkward mandatory interval fields.
2. Define DST behavior, misfire/catch-up policy, overlaps, maximum concurrent runs, expiry and pause/resume. Preview the next scheduled runs in the user's time zone.
3. Add durable workflow steps, checkpoints and waits. Waiting work consumes durable queue state instead of occupying a paid worker process. Retry transient failures with bounded backoff/jitter; terminal/permission failures need a visible reason and controlled resumption.
4. Add a transactional event outbox, filters evaluated under current permissions, deduplication and causal loop protection. Existing blanket suppression of code-origin events must evolve carefully so legitimate chained apps work.
5. Introduce effect receipts and reconciliation for external calls. Queue redelivery must not duplicate emails/payments/record writes. Never infer that a timeout means no external effect happened.
6. Make jobs visible under their app with latest result, next run, failures, costs, cancellation and pause. One shared scheduler dispatches isolated executions; no infrastructure cron service per customer schedule by default.

Current touchpoints: [schema](../../src/foundation/schema.ts), [worker](../../src/foundation/worker.ts), [service](../../src/foundation/service.ts), [schedule helpers](../../src/shared/schedules.ts), [component execution migration](../../migrations/023_component_execution.sql).

Acceptance: jobs run while ChatGPT is closed; daily Berlin schedules handle DST as documented; missed runs recover without a burst beyond the budget; worker crash resumes from a checkpoint; duplicate events do not duplicate effects; code-triggered workflows work without infinite recursion. Revoking an app or grant stops future dispatch/effects and preserves the history.

## AP-09 — Ship the generic connector foundation

1. Implement the registry, operation contracts, tenant connections, app bindings, credential vault, broker and usage hooks specified in [Connectors and usage](CONNECTORS_AND_USAGE.md).
2. Support generic HTTPS JSON/text/file requests and no-auth/API-token/header credentials first. Use the same schema for later OAuth2 adapters; implement a usable OAuth2 connection flow before announcing OAuth services as supported.
3. Let the builder define or import operation metadata and transformations in a preview. Unknown schemas/specifications are untrusted input. User choices concern service, account, access and spending, not writing HTTP code.
4. Open a trusted credential/consent screen and return connection status/handles to MCP. Do not ask users to paste secrets in chat. Provide contextual connection prompts and a small Connectors management page.
5. Implement operation-scoped outbound requests with destination controls, credential binding, limits, normalized errors, response provenance and effect reconciliation. Support general HTTPS endpoints without a curated-provider requirement.
6. Add authenticated inbound webhook endpoints after signature verification, replay protection and durable queue ingestion. Tie event handling to the app's current release and authorization.

Current touchpoints: [tools gateway](../../src/foundation/tools.ts), [capability schema](../../src/foundation/schema.ts), [Connections UI](../../src/web/Connections.tsx), [auth](../../src/server/auth.ts), [foundation MCP](../../src/server/foundation-mcp.ts). Proposed additions: outbound connector service, encrypted connection store, broker and webhook gateway. Preserve inbound “applications connected to Trialy” as a distinct settings function.

Acceptance: the builder connects a mock HTTPS service through secure UI, reads data, previews an external write, invokes it once and reopens its receipt. Secrets never appear in source, MCP responses, logs or previews. Redirects/DNS changes cannot target private infrastructure or forward credentials to a different origin. Revocation stops scheduled use. A generic connector works before branded email/AI adapters exist.

## AP-10 — Make collaboration and app authentication reusable

1. Expose current-account identity and app membership through the SDK; the generated app designs its member-facing screens. Access changes still use reviewed backend policy operations.
2. Add invite-only external audiences, verification, expiry and revocation, building on existing auth/invitations. Complete recovery/verification requirements before external-user launch. Guest membership does not grant tenant administration or AI access.
3. Extend record-scope enforcement if needed for per-user/private collaboration data. Use declarative, reviewed policies consistently in records, queries, files, jobs and subscriptions.
4. Add conflict handling and permission-filtered update subscriptions or polling. Clear sensitive cached state on account switch/revocation. Separate informational presence from authoritative records.
5. Keep public signup, federated identity providers and simultaneous rich-document editing as separately testable additions. A normal shared app must not wait for these advanced features.

Current touchpoints: [authentication](../../src/server/auth.ts), [invitations](../../src/server/invitations.ts), [effective access](../../src/domain/effective-access.ts), [data service](../../src/domain/data-service.ts), [shared-data contract](../SHARED_DATA.md).

Acceptance: two users collaborate with distinct permissions; conflicting edits are recoverable; an invited guest sees only assigned app/data; removing access stops direct-link/API/job/subscription access. A generated login screen delegates to the trusted identity flow and cannot collect passwords into app records.

## AP-11 — Migrate, operate and prove the complete release

1. Migrate metadata in additive batches behind flags, with dry-run counts and reversible mapping. Keep old IDs, revisions, records, histories and authorization intact. Retain compatibility endpoints for a published deprecation period.
2. Exercise three synthetic apps: a no-database calculator with internal links; a multi-user co-lab with shared records and restricted member data; a scheduled data-processing app with a generic connector and a reviewed external effect.
3. Verify create → preview → save → build → publish → navigate → job → connector → revision → rollback → revoke in standalone and actual ChatGPT. Add a host conformance suite; another builder/host is supported only after its own adapter checks pass.
4. Rehearse restore of database, artifacts, release pointers, permissions, grants, schedules, connector metadata and encrypted secrets with the required key custody. Restored apps must not reactivate revoked jobs or duplicate old effects. Establish backup retention and recovery targets.
5. Apply least-privilege production roles, key management, monitoring, quotas, alerts, per-app kill switches and tenant deletion/export. Monitor isolation failures, queue age, delivery uncertainty and budget exhaustion separately.
6. Publish capability/limit documentation and update bundled plugin metadata/skills with the relevant release process. Keep hosted compatible runtime updates separate from package changes. Do not equate local synthetic tests with actual host acceptance.
7. Set tariffs only after measured unit costs and invoice reconciliation. Turn on customer billing/managed paid operations only through the explicit commercial release configuration.

Current touchpoints: [operations](../OPERATIONS.md), [acceptance](../ACCEPTANCE.md), [database role rollout](../DATABASE_ROLE_ROLLOUT.md), [ChatGPT setup](../CHATGPT_SETUP.md), `tests/`, `plugin/trialy/` and deployment configuration.

Acceptance: retained data/histories compare before/after migration; all three apps work end to end; failure/recovery and revocation scenarios pass; production restore is demonstrated; usage cannot exceed the configured admission bounds. Publish an evidence checklist and remaining limitations. Do not advertise unsupported runtime features as available.

## AP-12 — Add long-lived processes and broader runtimes

1. Extend the runtime provider interface to supervised services/queue consumers and container images. Preserve the same app identity, gateway, connector scope, usage and logs.
2. Require image digests, isolated builds, non-privileged execution, resource ceilings, health probes, restart budgets and graceful shutdown. Map transient disk versus governed durable storage explicitly.
3. Add wake/suspend/stop policy and cost preview. Always-on use requires a visible reserved-compute budget; it must not consume an unlimited background allowance.
4. Add required protocols such as WebSockets only after testing their authentication, revocation, idle timeout and cost behavior. GPU, custom OS/kernel behavior and unrestricted ports remain separately evaluated capabilities.

Acceptance: a queue consumer survives a restart without duplicate effects, stops on revocation and has predictable idle/active charges. A compatible additional-language container runs through the same data/connector controls. No tenant process shares privileged control-plane infrastructure.

## AP-13 — Add selected managed connectors

1. Prioritize adapters based on actual apps: email sending, document storage/access and AI execution are candidates, not already enabled services.
2. Reuse generic connection/binding/usage contracts. Add only provider-specific authentication, operations, event normalization, idempotency and pricing reconciliation.
3. Distinguish using a customer's account from Trialy-funded usage. A one-click provider connection still needs that user's provider consent; MCP does not inherit accounts connected elsewhere in ChatGPT.
4. For email, implement verified sender setup, delivery/bounce handling and scoped send authority. For Microsoft 365/Google document access, use tenant/user OAuth and selected file scopes. Creating a `.docx` file locally is a worker/file capability and does not require a cloud document connector.
5. For AI, support model/provider selection, explicit data scope, input/output limits, token/tool-call metering, cancellation and provenance. Model-generated actions must pass the same authorization gateway. AI is optional and does not define an app type.

Acceptance: provider billing reconciles to the usage ledger; consent/revocation and failure cases work; no real-recipient email test occurs without explicit instruction. New adapters require no change to the core app model.

## Builder contract to add during implementation

Proposed neutral operations: discover capabilities; inspect app; prepare app revision; submit/upload package; validate/build; open preview; review/save/publish; inspect run/build; prepare/revoke connection; request job/trigger; inspect usage. Exact MCP names can be selected in AP-01/02.

Discovery should return runtime versions and operation schemas, not “choose one of four tools.” Builders must be able to repair compilation/runtime errors using structured diagnostics. Connection operations return a trusted setup action and status, not secrets. A source edit does not automatically widen data, connector, spending or execution grants.

## Definition of done for this planning change

This change is complete when the scope, ordered roadmap and connector/cost decisions are committed and linked from README/DEVELOPMENT. It does not implement the roadmap, activate providers, create paid infrastructure, change customer data or claim a deployment.
