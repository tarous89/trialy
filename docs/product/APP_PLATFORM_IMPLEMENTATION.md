# Simple apps: implementation and release

Implementation update, 31 October 2026: [Apps, access and automations](APP_CONFIGURATION_AND_AUTOMATIONS.md) shipped in 0.2.39 ([PR #86](https://github.com/tarous89/trialy/pull/86)); see [current context](../../CONTEXT.md) for release evidence and remaining activation. The shared engine shipped separately in 0.2.38; the current change adds a unified Automations destination and optional standard-tracker section access, and live unattended host activation remains unverified.

29 October 2026. The user approved the bounded UI and behavior changes and required the existing styling, fonts, colors, margins and layout. S1–S5 are implemented. S6 local verification is complete; deployment and real-host verification are tracked separately below. The reversible `SIMPLE_APPS_ENABLED` flag defaults off until rollout.

## Six-step status

| Step | Implementation |
| --- | --- |
| S1 | Neutral `prepare_app`, App/Project creation, optional templates, Home without type filters/labels, stable project colors and neutral unassigned apps. Existing IDs and internal resource kinds remain compatible. |
| S2 | Authorized standalone pages, real new-tab Home/Open anchors, legacy-resource wrappers, owner previews, compact trusted “Built with TrialAgents” bottom-right watermark and validated sign-in return, including connector setup. |
| S3 | Validated `input.route`, bound single-record reads, internal page links, native cross-app links, Back/Forward, deep refresh, state retention and unsaved-edit guards. |
| S4 | Generic HTTPS broker, encrypted credentials, source/destination/user/app/AI policies, exact effect reviews, technical quotas, idempotent receipts, unknown-outcome handling and reviewed response saves. |
| S5 | One Connectors destination with Details/Data/Access/Activity; add/edit/test/disable/remove, password-only credential replacement, trusted request/configuration review and safe builder handoffs. |
| S6 | Additive migration/runtime grants, compatibility adapter paths, desktop/mobile browser coverage, unchanged existing screenshot baselines, updated bundled/hosted builder instructions and documented rollout/rollback. Actual ChatGPT visual handoff remains a separate release check. |

## UI consistency

The implementation uses existing `Controls`, `PagePagination`, `WorkspaceShell`, `ComponentEditor`, template renderer, Access grid, settings tabs, fields, review dialogs, save controls and brand styles. No font or design-token replacement was introduced. Existing geometry and margins remain shared; app-only CSS reserves footer space and bounds review dialogs. Project gradients use the extracted existing helper. The standard template/reference assets are unchanged.

The approved scope is limited to simple apps. Branded connectors, external identities, additional runtimes/packages, new workflow infrastructure and commercial billing remain in the backlog. A UI-app connector is not an unrestricted network capability for scheduled functions.

## Verification

- `npm run build` and TypeScript checks pass.
- Full unit/integration suite: 124 tests pass, including connector authorization, network isolation, encrypted storage, exact reviews, quotas, replay protection, route validation and sign-in returns.
- Full browser/visual suite: 24 tests pass. Existing 18 scenarios and their screenshot baselines remain unchanged. Six added scenarios cover desktop/mobile standalone launch, cross-app links, script-URL rejection, internal navigation/history/refresh, unsaved edits, footer spacing, reviewed shared-data saves, connector reviews/replay, access UI, creating a second connection, credential replacement and removal, and the embedded host open-link bridge.
- Test fixtures use separate data for simple apps and existing trackers, plus a separate simulated client IP per scenario; production request limits are unchanged.
- Three new screenshot baselines cover standalone desktop/mobile and Connectors Access. Synthetic host tests do not establish actual ChatGPT visual parity.

## Backend contract

The application APIs are registered only with `SIMPLE_APPS_ENABLED=true`. Authentication, current-session CSRF enforcement and no-store behavior come from the existing `/api` middleware. The flag is not an authorization mechanism; every operation independently checks its actor, workspace, app and connector rights.

- `POST /api/apps/resolve`: takes the validated app location. Resolves saved apps and owner previews with their existing access rules; legacy resources reuse authorized Home metadata. Returns a **relative** URL, never a bearer link or additional authority.
- `POST /api/workspaces/:workspaceId/apps/prepare`: delegates to the existing `save_component` preview contract using internal kind `generic`; existing IDs, grants, templates and approval APIs remain valid.
- `POST .../organization/frontend/run`: accepts optional `route: {path, recordId?, page?}`. Requests omitting it retain the previous input shape. Paths use plain identifier segments; the route contains no arbitrary form/query values. Page existence is interpreted by app source; safe not-found UI is part of S3.
- Generated saved apps may call `records.get({recordId})` and `connectors.call({connectionId,operation,requestKey,parameters?,records?})` when enabled. The trusted server supplies app ID/version. Drafts cannot call either capability. Connector calls may return a review handle; generated code cannot confirm it.
- Connector APIs under `/api/workspaces/:workspaceId/connectors`: list/read, `prepare`, review read/confirm, `call`, credential replacement, disable/remove, activity and response proposals. All configuration, secret, disable/remove and external-write approvals are authenticated human actions. MCP can prepare safe configuration/requests and read authorized metadata; it cannot enter credentials or confirm requests.
- Builder operations: `open_app`, `read_app`, `prepare_app`, `list_connectors`, `read_connector`, `prepare_connector`, `prepare_connector_call`, `read_connector_activity`. No secret is accepted or returned in these schemas. Configuration and invocation preparation return trusted review/setup links. `open_app` displays a trusted launch link; background reads do not navigate.

## Connector decisions and limits

One `generic_https` type supports multiple named connections. The first release accepts HTTPS origins on port 443, no-auth/Bearer/custom token headers, declared methods and relative path templates, primitive input schemas, server-read field mappings, and explicitly selected JSON response fields or bounded text. It rejects redirects instead of forwarding credentials. Builders must use the final endpoint. OAuth, arbitrary headers/ports, uploads, streaming and branded adapters are later work.

Management does not imply use: every operation lists users, apps and AI eligibility. Mapped source fields intersect current actor rights, app bindings, connector mappings and record/project scope. Derived-field evaluation receives only connector-permitted app fields. Constants are part of the reviewed configuration. Additional free-text/computed parameters require exact disclosure review, including GET queries. Writes and unknown effects always require exact review in this release; no standing external-write grants are introduced. Human approval preserves the originating AI data restrictions.

The broker resolves and validates all returned IP addresses, pins the selected address for the socket, keeps TLS hostname verification, rejects private/reserved/cloud-host addresses, rechecks authorization immediately before dispatch, and checks again before returning results. Request and response budgets are 64 KiB; JSON arrays return at most 100 filtered rows; request duration is bounded to ten seconds. Limits are at most 60 requests per connection/minute, 30 per app/minute and three active requests per connection. Configuration can lower these limits. No external provider cost is estimated or paid by the platform.

Receipts reserve idempotency keys before dispatch. A completed key does not resend. Transport errors, non-success write responses and interrupted writes retain an unknown outcome without automatic retries. A later revoke cannot undo an already-dispatched request. Final receipts and review bodies are protected against mutation. Activity exposes metadata/counters only. Exact reviewed request bodies remain in actor-scoped review storage; credentials are held separately, encrypted with AES-256-GCM and connection-specific associated data. Reflected credential strings are redacted from selected responses; provider output remains untrusted.

Returned data never writes directly to shared records. A response mapping must fit the current connector destination policy and app bindings, then pass the existing component-record preview and confirmation flow. Unmapped destination fields and changed record versions are rejected.

## Rollout and rollback

1. Merge only after build, unit/integration and browser checks pass. Existing `trialy-web` and `trialy-worker` auto-deploy from main. No new service, plan or database is required.
2. Their existing `npm run db:migrate` pre-deploy hook applies `044_connectors.sql` and reapplies `ops/runtime-role.sql`. No resource/data conversion is needed. Preserve database backups and separate encryption-key custody.
3. Inspect the web startup `simple_apps_configuration` log. It reports only feature state and whether the credential key is present, never its value. Provision a random 32-byte base64 `CONNECTOR_ENCRYPTION_KEY` only if missing; preserve any existing key. `CONNECTOR_PREVIOUS_ENCRYPTION_KEYS` supports decrypt-only rotation. Keep these service-managed variables out of Git and retain old keys until credentials are re-encrypted/replaced. The worker does not receive connector credentials because P0 connectors execute in the web app broker.
4. Enable `SIMPLE_APPS_ENABLED=true` on the existing web service and deploy the same verified source. Confirm the specific deploy is live, `/ready` succeeds, `/api/config` enables apps, the frame keeps its isolated CSP, runtime roles are enforced, and authenticated MCP reads use the updated instructions. Publish matching plugin 0.2.23 with its existing identity/audience.
5. Validate the actual ChatGPT Open app link and authenticated browser handoff separately where that host is available. A tool response or synthetic browser host alone does not prove the actual ChatGPT UI opened. No live customer-provider write is required for deployment verification; integration tests use controlled synthetic provider responses.
6. To roll back, set `SIMPLE_APPS_ENABLED=false` and redeploy. This restores the previous Home/category/embedded launch flow, retaining all data, connector configuration, reviews and receipts. Rollback does not reverse database saves or external effects. Unknown outcomes must be reconciled with the provider before any replacement request.

## Release evidence

Local verification is complete. GitHub/Render/plugin release IDs and remaining real-host checks are recorded in PR #62 and the release note after rollout. Do not infer a live deployment or real-host verification from this file alone.

29 October 2026 update: `open_app` returns a direct standalone URL without attaching the management widget. Legacy embedded readers remain available explicitly. Apps use the full viewport with a compact corner watermark; save/review controls keep clear of it. Authentication, permissions and persistence behavior are unchanged.
