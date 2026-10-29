# Generic connector: first-release contract

Updated 29 October 2026. Status: backend and approved management UI implemented behind the reversible simple-app flag. No customer-provider billing or live connection is created by rollout. See [implementation and release evidence](APP_PLATFORM_IMPLEMENTATION.md) for implemented contracts, limits and release prerequisites.

[Simple-app scope](APP_PLATFORM_SCOPE.md) · [Steps S4/S5](APP_PLATFORM_ROADMAP.md) · [Later backlog](APP_PLATFORM_BACKLOG.md)

## 1. Small release boundary

Ship one generic HTTPS connector type, with multiple named service connections. Support no authentication or API token/header credentials and bounded JSON/text requests/responses. Use customer-owned credentials. Branded services, OAuth flows, file streaming, webhooks and TrialAgents-funded provider usage are later work.

The builder prepares operations and mappings; users select the service/account, permissions and credentials through standard UI. Normal users should not have to write request code. A connection cannot eliminate a provider's account/credential requirements. Label the feature **Connectors**, not APIs.

## 2. One management destination

Use the same sidebar, typography, spacing, tables, secondary buttons, menus, dialogs, form controls, access grid and save states as current Database/Access/Logs. Add only one top-level Connectors destination. List connections and open a detail page/panel with these groups:

| Group | Contents |
| --- | --- |
| Details | Name, optional description, base HTTPS address, authentication mode, masked credential status, enabled/disabled status, declared operations and safe test configuration |
| Data | Input/output field definitions; allowed source tables/fields/record scope; allowed response fields; optional destination table/field mapping; bounded test result |
| Access | Who manages this connection; which apps/users may use each operation; allowed data/disclosure and destination-write scope; expiry and request limits |
| Activity | Last use, app/actor, operation, status, duration, call/byte/error counts and links to review/effect receipts |

Provide Add, Edit, Test, Disable and Remove through existing UI patterns. Removal disables future calls and preserves history. Show errors such as missing credential, denied access, rate limit, unavailable service and outcome unknown. Connection tests do not silently issue remote writes or copy data into the database.

“Data” is configuration and a bounded preview, not another database. Saving a response is a separate reviewed change to shared records. Never dump an entire provider response or unrestricted headers into the interface or logs.

## 3. Minimal model and operations

Add tenant-scoped connection records (name, base address, auth mode, secret reference, enabled/version), versioned operation definitions (method, relative path/template, parameter/request/response schemas and effect classification), app/user bindings, data policies and invocation receipts.

Expose neutral builder operations for discovering safe metadata, preparing configuration, requesting secure credential setup, binding an app and reading status. Names are selected during S4/S5. Generated code invokes a connection/operation handle with validated parameters; it cannot choose an arbitrary destination or fetch credential values.

Keep existing inbound “Connected applications” settings intact. Those authorize ChatGPT/other clients to use TrialAgents. This connector authorizes TrialAgents to use an external service; workers cannot inherit connections from ChatGPT.

## 4. What the connector is allowed to see

Enforce separate scopes for management, invocation, outbound disclosure, inbound result visibility and saving returned data. Connection-management access is not permission to read every table or act for every user.

Effective scope is the intersection of the current actor's rights, the app's declared rights and the connection's policy. AI and human origins remain distinct. Organizational project placement and card color never grant authority. Recheck policy on every call; disabling/revoking blocks future use, including existing scheduled callers.

For mapped requests, the broker reads the selected record IDs and constructs the request from allowed source fields. Query/body templates use constrained declared parameters. Apply field/record permissions before data leaves; apply the response-field policy before returning provider data. Derived values must have permitted dependencies. Destination mappings cannot save to fields the actor/app may not write, and saving uses existing previews/grants/audit history.

Do not accept arbitrary outgoing JSON and trust labels claiming it contains only approved fields. A caller can disguise a restricted value as a string. P0 therefore uses server-built mapped payloads for reusable automatic calls. Unmapped free text or computed payloads require a trusted exact-payload disclosure review, with current actor/app data permissions still enforced. A reviewed transformation may run only on the connector's permitted inputs. General automatic provenance tracking is not part of this release.

A read request can still disclose data in its parameters, so GET is not automatically safe. Unknown operation effects require review. External writes need an exact action authorization or an applicable scoped standing grant; a database-write grant does not authorize a remote operation. Do not add general account-wide send authority.

## 5. Secrets and request execution

Use trusted authenticated UI for credential entry/replacement, with the current session/CSRF protections. Never ask for keys in chat or generated app forms. Store encrypted credentials under separate key custody, with rotation/revocation metadata. Return only configured/missing/expired status and connection handles. Keep secrets out of source, models, previews, logs, exports and test output.

The broker injects credentials only for the configured destination/operation. Validate URL resolution and each redirect, including IPv4/IPv6/private/link-local/metadata ranges and DNS rebinding. Do not forward credentials to another origin. Limit request/response sizes, duration, rate, concurrency and redirects; prevent generated code bypassing the broker through direct networking. Credential-free external page links are a separate navigation feature.

Provider responses/configuration are untrusted data. Normalize errors and redact headers. Retain operation IDs, hashes, effect authorization and provider receipts. Reuse idempotency keys where supported. On uncertain completion after dispatch, show an unknown outcome and reconcile before retrying; do not assume a timeout means no remote effect occurred. Revocation cannot undo a completed remote action.

## 6. Cost controls now, billing later

P0 includes technical usage counters, configured per-connection/app request limits, timeout/body/concurrency bounds, cancellation and disable controls. These protect TrialAgents's execution and help users see use. The external provider charges the customer's account; TrialAgents cannot enforce that account's total provider bill. Make this visible at setup, without inventing a provider cost estimate.

Do not build monetary reservations, subscriptions/overages, an AI token ledger or managed provider accounts for this release. Keep these in P2, with branded managed services last. Before TrialAgents pays for any external service, implement bounded spending admission, trustworthy metering and reconciliation. Future pricing should distinguish TrialAgents's compute/storage/transfer from provider units; flat per-call pricing is not assumed.

## 7. Acceptance examples

- An app sends only selected company fields to a test service and receives only permitted response fields. A hidden financial field is rejected even if inserted into a differently named parameter.
- Another user/app cannot reuse the connection without permission or use the owner's broader table access. Disabling it blocks subsequent reads and queued effects.
- The user previews a returned value and saves it to an authorized column; the existing diff, approval and audit trail remain intact.
- Credential replacement never reveals the old value. Secret-bearing headers are absent from previews, tool responses and errors.
- A safe read test makes no persistent data change; a write test requires an explicit reviewed action. A repeated known-completed write does not duplicate the effect.

Use controlled services and synthetic data for tests; do not send real messages or other external effects without explicit authorization. Reuse the technical references from the earlier planning commit as needed: [OWASP secrets](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) and [SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). They inform implementation, not a claim of completed security validation.
