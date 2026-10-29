# Simple-app implementation roadmap

Updated 29 October 2026. Status: all six P0 implementation steps delivered with local verification. Deployment and actual-host verification are recorded separately in [implementation and release evidence](APP_PLATFORM_IMPLEMENTATION.md). This replaces the earlier 14-step launch plan.

[Scope](APP_PLATFORM_SCOPE.md) · [Connector contract](CONNECTORS_AND_USAGE.md) · [Prioritized backlog](APP_PLATFORM_BACKLOG.md)

## Order

| Step | Priority | Deliverable | Dependency |
| --- | --- | --- | --- |
| S1 | P0 | Neutral app model/Home and project colors | Existing component contracts |
| S2 | P0 | Standalone launcher and standard footer | S1 |
| S3 | P0 | Internal routes, navigation and links | S2 |
| S4 | P0 | Generic connector backend and data/access boundary | Existing data/access services; can follow S1 independently |
| S5 | P0 | Connectors management UI and builder operations | S4; integrate with S2/S3 |
| S6 | P0 | Compatibility, end-to-end checks and rollout | S1–S5 |

No new runtime provider, package build service, customer deployment, branded connector or commercial billing rollout is required. Keep current authentication, workers/schedules and authorization/history behavior. Refer advanced requests to the backlog rather than expanding P0.

## S1 — One app model and project appearance

1. Remove mandatory type selection, type filters/labels and category colors from Home/New. Use one create-app flow, optional projects and optional templates. Preserve existing resources and IDs; keep old API names as adapters.
2. Validate data/read/write contracts independently of presentation kind. A calculator can have no table; a generic data-connected app still needs declared bindings.
3. Extract `projectTheme(projectId)` into one helper. Use the existing base gradient/accent for project and child-app cards, organizational placement as the source, and a neutral unassigned fallback. Remove `.ty-kind-*` as the card color source.
4. Preserve selection styling, search, pagination, menus and unrelated screens. Normalize primary display placement for legacy multi-project references without changing access.
5. Update hosted tool descriptions, creation prompts and both bundled skills consistently. Users describe the job; builders choose the implementation.

Touchpoints: [HomeView](../../src/shared/ui/HomeView.tsx), [HomePanel](../../src/shared/HomePanel.tsx), [Home query](../../src/workspace/home.ts), [placement](../../src/workspace/tool-placement.ts), [WorkspaceShell](../../src/shared/ui/WorkspaceShell.tsx), [creation](../../src/shared/creation.ts), [CreationCenter](../../src/shared/CreationCenter.tsx), [resource contract](../../src/workspace/resource-contract.ts), [workspace skill](../../plugin/trialy/skills/trialy-workspace/SKILL.md), [design skill](../../plugin/trialy/skills/trialy-tracker-design/SKILL.md).

Acceptance: a three-page app needs no category; same-project cards share a stable pattern; moving an app changes its accent and preserves data/access; unassigned apps are neutral. Existing functions/forms/automations remain accessible. No record, history or grant is removed.

## S2 — Standalone launch and trusted footer

1. Add an authenticated `/apps/{appId}` route with a validated optional page path. Reuse saved component readers/renderers and current sessions. Owner-only preview routes retain expiry and no-effect restrictions.
2. Add a minimal standalone wrapper without the management sidebar. Keep the current isolated render frame; do not execute generated source in the trusted parent document.
3. Change Home card/Open actions to real safe new-tab links; load/render inside the opened page. Provide standalone detail/control wrappers for other existing Home resources rather than dropping them.
4. Embedded hosts return a trusted Open app link. Retain old embedded readers/previews for compatibility; do not open unsolicited tabs from tool calls.
5. Add the persistent shared footer, “Built with TrialAgent,” with centralized label/assets and a fixed Home destination. Reserve space for it and existing save/review controls. Reuse current styles.
6. Preserve validated sign-in return paths. Denied/wrong-account/archived/missing states reveal no restricted details. No public access or new identity system is introduced.

Touchpoints: [server app](../../src/server/app.ts), [web host](../../src/web/main.tsx), [auth](../../src/server/auth.ts), [HomePanel](../../src/shared/HomePanel.tsx), [FrontendCodeRuntime](../../src/shared/FrontendCodeRuntime.tsx), [frame](../../src/shared/frontend-frame.ts), [embed](../../src/embed/main.tsx). New modules: small standalone route resolver and shared app-page wrapper/footer.

Acceptance: clicking Open launches separately while Home stays open; no asynchronous popup failure; direct links survive sign-in; access checks hold. Footer remains visible on desktop/mobile, loading/errors and app pages without overlapping actions, and its Home link grants no extra access. Existing resource launchers still work.

## S3 — Internal navigation and links

1. Add a small route descriptor (app ID, relative page path, safe parameters), default/missing pages and record-detail links. Reuse current source/config revisions.
2. Extend the render/event contract with trusted navigation and safe link rendering. Support relative links and ordinary permitted URL schemes without allowing executable URLs or unexpected parent navigation.
3. Let the standalone wrapper own history, back/forward and initial-route restoration on refresh. In-app links stay in the same tab; explicit cross-app links open separately.
4. Preserve unfinished edits or use the current discard warning. Check app/record access on every destination/read. Keep private values and credentials out of URLs.
5. Pass safe routes through builder/open operations. ChatGPT previews need a working Open app link; a new embedded navigation framework is unnecessary.

Touchpoints: [FrontendCodeRuntime](../../src/shared/FrontendCodeRuntime.tsx), [frame](../../src/shared/frontend-frame.ts), [workspace service](../../src/workspace/service.ts), [workspace MCP](../../src/server/workspace-foundation.ts), S2 wrapper.

Acceptance: Overview → Company → Calculator, back/forward, detail refresh/bookmark and an authorized cross-app link all work. Denied/deleted records and unsaved edits behave correctly. In-app navigation creates neither database writes nor extra tabs. Existing custom events may retain server round trips.

## S4 — Generic connector backend and enforced scope

1. Add one `generic_https` connector type and multiple tenant-owned named connections. Separate operation configuration from encrypted secrets. Follow [the connector schema and permissions](CONNECTORS_AND_USAGE.md).
2. Support no-auth/token/header authentication and bounded JSON/text requests/responses. Exclude OAuth catalogues, file streaming, inbound webhooks and network tunnels from P0.
3. Add a trusted broker callable through the current runtime gateway. Generated code invokes declared operations and never receives secrets. Enforce destination/redirect/DNS/private-network checks and time/body/rate/concurrency limits.
4. Implement management, invocation and data-transfer policies separately. Effective scope intersects current actor, app and connection permissions. A connection cannot proxy its owner's broader data access.
5. Build outbound requests from permitted mapped fields on the server. Accept authorized record references and constrained parameters. Unmapped computed/free-text payloads require a trusted exact-payload review; caller labels alone do not prove data provenance.
6. Apply disclosure scope even to read requests carrying platform data. Remote side effects need exact or existing scoped authority separate from database grants. Store idempotency receipts and unknown outcomes; never blindly retry uncertain writes.
7. Record metadata and usage counters without credentials. Enforce technical quotas and revocation; customer provider costs stay external. A full monetary ledger is not a prerequisite.

Touchpoints: [tools gateway](../../src/foundation/tools.ts), [execution schema](../../src/foundation/schema.ts), [workspace service](../../src/workspace/service.ts), [data service](../../src/domain/data-service.ts), [effective access](../../src/domain/effective-access.ts), [evidence](../../src/domain/evidence.ts). New modules/tables: connections, operations/bindings, encrypted credentials, broker and reviewed policy changes.

Acceptance: a read and reviewed write work against a controlled HTTPS service. Denied fields/users/apps, altered destinations, revoked connections and private-network targets fail. Secrets never reach source/chat/logs. Known completed calls are not duplicated; unknown outcomes remain visible. Saving returned data still requires normal destination access and authorization.

## S5 — One Connectors page and conversational setup

1. Add Connectors to the existing navigation in app/plugin management surfaces. Use the current trusted standalone handoff for secrets or permission review where required.
2. Reuse current tables, pagination, search, buttons, menus, field controls, detail panels and save feedback. One list opens Details, Data, Access and Activity sections. No marketplace or new design system.
3. Add/edit/test/disable/remove connections. Removal disables use and preserves audit history. Show configured/not-configured credential status and a replace-secret action; never reveal the saved secret.
4. Data shows schemas/mappings and bounded permission-filtered test output. Save response data through the existing record review. A write test requires explicit action review or a verified dry-run endpoint.
5. Reuse the Access grid's visual patterns with actual backend enforcement for Manage, Use and Allowed data. No active-looking controls for unimplemented policy semantics.
6. Expose builder operations to discover/prepare/revise connections, open secure setup, inspect status and bind apps. Return safe configuration/handles only; instructions never ask for secrets in chat.
7. Keep inbound authorized-application settings and OAuth revocation intact and distinct from outbound connectors.

Touchpoints: [WorkspaceShell](../../src/shared/ui/WorkspaceShell.tsx), [web host](../../src/web/main.tsx), [embed](../../src/embed/main.tsx), [Controls](../../src/shared/ui/Controls.tsx), [AccessPanel](../../src/shared/AccessPanel.tsx), [inbound connections](../../src/web/Connections.tsx), [workspace MCP](../../src/server/workspace-foundation.ts), plugin skills.

Acceptance: add two services through the same connector type, select allowed apps/fields, test safely, edit access and disconnect. Connectors matches Database/Access/Logs styling. Secrets are absent from model responses. Disabling blocks subsequent use immediately.

## S6 — Compatibility and release

1. Use additive changes and stable IDs. Check old trackers, forms, visualizations, saved functions and collections with existing rights; appearance/routing changes do not alter data/history counts.
2. Exercise one synthetic three-page app with a shared record, calculator and generic connector: launch, sign-in return, navigation, reviewed save, reopen, footer and connection revocation.
3. Compare desktop/mobile UI against current shared components for Home/project colors, Connectors, trusted chrome, save/error states, spacing, keyboard/focus and footer overlap.
4. Run focused navigation/access/connector/compatibility tests and required repository checks. Test actual ChatGPT link launch and authenticated handoff separately from synthetic host tests.
5. Update/release bundled plugin instructions when implementation is ready. Verify hosted/bundled contracts agree. No branded provider or new paid service is authorized by this planning document.
6. If needed, use a reversible launch flag. Rollback restores old launch/UI behavior while retaining secure connector configuration/history; it does not reverse records or external calls. Document runtime/protocol limits accurately.

Done: all P0 acceptance checks pass. New-tab launch, project colors, navigation, connector data/access controls and the standard footer must not be postponed to P1. Larger requests go to the [backlog](APP_PLATFORM_BACKLOG.md).
