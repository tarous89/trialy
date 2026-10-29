# Simple apps: implementation checkpoint and UI approval

29 October 2026. This is an implementation checkpoint, not a release announcement. The user's latest instruction requires permission **before changing any UI/UX element or existing functionality**. Backend additions are staged behind `SIMPLE_APPS_ENABLED=true`; the default remains off. No production migration, deployment, plugin release, live credential or external provider action has been performed.

## Six-step status

| Step | Implemented in this branch | Still required |
| --- | --- | --- |
| S1 | Neutral `prepare_app` adapter using existing components/reviews; no category in its input; calculators may omit tables; reusable project color helper | Approved Home/New wording, type-filter removal and card color changes; creation prompts and plugin instructions |
| S2 | Authorized app/resource resolver, canonical standalone URLs, strict return-path parser, support for existing resource identifiers | Standalone page/legacy wrappers, actual new-tab anchors, footer and sign-in return integration |
| S3 | Validated route descriptor passed to the existing runtime; bound single-record reader with current record/app permissions | Trusted frame link bridge, browser history, refresh and unsaved-edit handling |
| S4 | Generic HTTPS connector configuration/reviews, encrypted credentials, app/user/data policies, broker, exact effect reviews, usage limits, receipts, response-to-record proposals and isolation tests | Finish UI-driven integration tests; provision encryption key and migration only at release |
| S5 | List/read/prepare/review/credential/disable/remove/activity/response endpoints and safe builder operations; secrets have no MCP operation | Connectors page, secret-entry handoff and trusted review controls |
| S6 | Additive migration; compatibility, security, build and test checks | Approved UI implementation, visual/E2E tests of the new flows, actual ChatGPT handoff, plugin release and deployment |

The six steps are **not complete**. Existing Home, navigation, frame sanitizer, sign-in screens, plugin instructions and live functionality have not been changed.

## Concrete changes awaiting permission

| Surface | Proposed change | Existing components/styles to reuse |
| --- | --- | --- |
| Home / New | Rename the Home destination from Tools to Home. Offer App and Project in New. Remove required category choices, type chips/labels and category card colors. Use each project's existing stable gradient for its apps; neutral for unassigned apps. Retain search, sorting, pagination, project filters, menus and move/duplicate/delete behavior. | `HomeView`, `WorkspaceShell`, `Controls`, the extracted `projectTheme` |
| App opening | Open each saved resource from a real new-tab link. Show the app without the platform management sidebar. Keep a trusted, persistent “Built with TrialAgent” footer linking to fixed Home. Reserve footer space on desktop/mobile and alongside Save/Review controls. Keep saved functions, collections, legacy automations and owner previews reachable. Preserve a validated app URL through sign-in. | Existing `ComponentEditor`, `FoundationPanel`, collection/automation controls, brand assets, buttons and error states |
| App navigation | Enable same-tab internal pages, record detail links, browser Back/Forward and bookmarked/refreshable pages. Cross-app links open separately. Preserve drafts or show the existing discard warning. Keep generated source isolated and validate links in the trusted host. | `FrontendCodeRuntime`, trusted frame bridge, existing warnings/dialogs; no replacement renderer |
| Connectors | Add one navigation destination. Use a searchable/paginated list and Details, Data, Access and Activity sections. Add/edit/test/disable/remove through existing controls. Enter/replace secrets only in a trusted password field; display credential status only. Review the exact destination/request before writes or free-text disclosure. Saving returned values uses the existing record preview. Explain that the provider bills the customer's account. | `Controls`, existing settings/detail layouts, Access grid patterns, record-review dialog and save/error feedback |

Approval applies to these bounded changes, including corresponding hosted/bundled instructions. Further UI or existing-behavior changes still require permission. Branded connectors, external identities, additional runtimes, package builds, new workflow infrastructure and commercial billing remain out of scope.

## Backend contract

The application APIs are registered only with `SIMPLE_APPS_ENABLED=true`. Authentication, current-session CSRF enforcement and no-store behavior come from the existing `/api` middleware. The flag is not an authorization mechanism; every operation independently checks its actor, workspace, app and connector rights.

- `POST /api/apps/resolve`: takes the validated app location. Resolves saved apps and owner previews with their existing access rules; legacy resources reuse authorized Home metadata. Returns a **relative** URL, never a bearer link or additional authority.
- `POST /api/workspaces/:workspaceId/apps/prepare`: delegates to the existing `save_component` preview contract using internal kind `generic`; existing IDs, grants, templates and approval APIs remain valid.
- `POST .../organization/frontend/run`: accepts optional `route: {path, recordId?, page?}`. Requests omitting it retain the previous input shape. Paths use plain identifier segments; the route contains no arbitrary form/query values. Page existence is interpreted by app source; safe not-found UI is part of S3.
- Generated saved apps may call `records.get({recordId})` and `connectors.call({connectionId,operation,requestKey,parameters?,records?})` when enabled. The trusted server supplies app ID/version. Drafts cannot call either capability. Connector calls may return a review handle; generated code cannot confirm it.
- Connector APIs under `/api/workspaces/:workspaceId/connectors`: list/read, `prepare`, review read/confirm, `call`, credential replacement, disable/remove, activity and response proposals. All configuration, secret, disable/remove and external-write approvals are authenticated human actions. MCP can prepare safe configuration/requests and read authorized metadata; it cannot enter credentials or confirm requests.
- Builder operations: `read_app`, `prepare_app`, `list_connectors`, `read_connector`, `prepare_connector`, `prepare_connector_call`, `read_connector_activity`. No secret is accepted or returned in these schemas. Secure setup links will be added when their UI destination exists.

## Connector decisions and limits

One `generic_https` type supports multiple named connections. The first release accepts HTTPS origins on port 443, no-auth/Bearer/custom token headers, declared methods and relative path templates, primitive input schemas, server-read field mappings, and explicitly selected JSON response fields or bounded text. It rejects redirects instead of forwarding credentials. Builders must use the final endpoint. OAuth, arbitrary headers/ports, uploads, streaming and branded adapters are later work.

Management does not imply use: every operation lists users, apps and AI eligibility. Mapped source fields intersect current actor rights, app bindings, connector mappings and record/project scope. Derived-field evaluation receives only connector-permitted app fields. Constants are part of the reviewed configuration. Additional free-text/computed parameters require exact disclosure review, including GET queries. Writes and unknown effects always require exact review in this release; no standing external-write grants are introduced. Human approval preserves the originating AI data restrictions.

The broker resolves and validates all returned IP addresses, pins the selected address for the socket, keeps TLS hostname verification, rejects private/reserved/cloud-host addresses, rechecks authorization immediately before dispatch, and checks again before returning results. Request and response budgets are 64 KiB; JSON arrays return at most 100 filtered rows; request duration is bounded to ten seconds. Limits are at most 60 requests per connection/minute, 30 per app/minute and three active requests per connection. Configuration can lower these limits. No external provider cost is estimated or paid by the platform.

Receipts reserve idempotency keys before dispatch. A completed key does not resend. Transport errors, non-success write responses and interrupted writes retain an unknown outcome without automatic retries. A later revoke cannot undo an already-dispatched request. Final receipts and review bodies are protected against mutation. Activity exposes metadata/counters only. Exact reviewed request bodies remain in actor-scoped review storage; credentials are held separately, encrypted with AES-256-GCM and connection-specific associated data. Reflected credential strings are redacted from selected responses; provider output remains untrusted.

Returned data never writes directly to shared records. A response mapping must fit the current connector destination policy and app bindings, then pass the existing component-record preview and confirmation flow. Unmapped destination fields and changed record versions are rejected.

## Release checklist after UI approval

1. Implement the four approved UI groups above; keep new capabilities off in production until complete. Finish secure setup links and instruction updates without changing plugin identity or inbound Connected Applications settings.
2. Run the full unit/integration suite, build and visual suite. Add a synthetic three-page app scenario covering new-tab launch, sign-in return, history, record denial, review/save, footer layout and connector revocation. Test an actual authenticated ChatGPT launch separately; synthetic tests do not establish host parity.
3. Apply migration `044_connectors.sql` through the existing deployment process and reapply `ops/runtime-role.sql`. Back up the connector tables with the database; encryption keys need separate custody. There is no data conversion or resource-ID migration.
4. Provision a random 32-byte base64 `CONNECTOR_ENCRYPTION_KEY` outside source/chat. `CONNECTOR_PREVIOUS_ENCRYPTION_KEYS` is a comma-separated decrypt-only rotation keyring; retain old keys until credentials have been replaced/re-encrypted. No-auth connections do not require a key. Replacing a connection's origin/auth mode clears its credential; replacing a secret increments the connection version and invalidates pending requests.
5. Validate against a controlled HTTPS service using synthetic data, with no real email or other user effect. Then enable `SIMPLE_APPS_ENABLED=true` and publish the matching plugin instructions using the existing release process.
6. To roll back, disable the flag and restore the previous UI launch flow. Retain all connector tables, reviews and receipts. Rollback does not reverse database saves or external effects. Review unknown outcomes with the provider before creating any replacement request.

Validation results are recorded in the pull request. No production readiness or completed UI/host verification is implied by this checkpoint.
