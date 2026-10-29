# Connectors, credentials and usage economics

Date: 29 October 2026. Status: proposed implementation design. No connector, provider account, price or billable feature is activated by this document.

[Platform scope](APP_PLATFORM_SCOPE.md) · [Implementation steps AP-05, AP-09 and AP-13](APP_PLATFORM_ROADMAP.md)

## 1. Recommendation and release boundary

Build one generic connector system now. Add provider-specific email, document and AI adapters later. The common system owns connection setup, secrets, permissions, request execution, errors, usage and revocation. Provider adapters should fill in operations and authentication details rather than create independent integration systems.

Initial implementation supports public HTTPS services with no authentication or a supplied API token/header credential, bounded JSON/text/file requests and explicit operations. The builder can prepare a connection and operation definitions from service documentation or an OpenAPI definition. An administrator need not manually write HTTP requests. OAuth2 is designed into the connection contract from the start; it is only advertised after its secure authorization/refresh flow is implemented and tested.

Do not build a large catalogue before validating real demand. Include the platform's own data/files/identity/jobs as built-in capabilities requiring no external account. Prove the generic connector with a controlled test service and at least one authorized read-only service before enabling external writes. Later add the first managed provider when its cost, authorization and operational behavior are understood.

No branded connector is required for a new ordinary HTTPS service to be usable. Unsupported protocols, customer private networks, raw sockets and provider-specific signing/streaming are explicit technical extensions, not prohibited use cases.

## 2. What users see

The primary flow is contextual:

1. The user describes an app or asks for new behavior.
2. The builder discovers available capabilities and existing authorized connections.
3. If a connection is missing, Trialy displays a trusted “Connect [service]” action showing account, requested access, apps using it and who pays.
4. The user signs in with the provider or enters a key in Trialy's protected settings UI. No secret is pasted into chat, source or a generated app form.
5. The builder receives a connection handle and status, completes the app and previews its behavior. A connected account is not blanket permission for all external actions.

Add a compact **Connectors** settings page for Connected / Available / Needs attention, with account/service label, last successful use, authorized apps, spending limit and Disconnect. Keep it out of every app's main navigation unless relevant. An app settings panel can show only its own connections.

Keep the current inbound “Connected applications” page distinct: it controls clients such as ChatGPT accessing Trialy. Outbound connectors let Trialy call another service. Neither direction silently authorizes the other. Trialy workers cannot inherit Gmail, Microsoft or other connections from the user's ChatGPT account.

Users should not need to understand APIs, runtimes or code to connect a supported service. They still must choose/authorize the correct external account or supply credentials where the provider requires them. A generic connector cannot eliminate that consent or automatically create arbitrary paid provider accounts.

## 3. Internal model

| Object | Fields and responsibilities |
| --- | --- |
| Connector definition | Stable ID/version, service description, operation schemas, auth type, permitted destinations/protocols, pagination, timeouts, effect metadata and pricing adapter |
| Connection | Tenant/owner, provider account identity where verified, secret references, status, scopes, expiry/refresh, billing mode and revocation version |
| App binding | Connection, allowed operation versions, relevant data/recipient/destination scope, app revision or reviewed compatible scope, expiry and limits |
| Invocation | Actor/app/run, canonical parameters digest, effect approval/grant, idempotency key, status, provider receipt, result reference and usage event |
| Credential record | Encrypted secret or provider token, key version, creation/rotation/revocation metadata; never available through normal reads |

Version definitions and re-review materially broader scopes. Label display metadata separately from operation effect/authority. HTTP method alone does not prove an operation is read-only: a GET can have side effects. Unknown external operations default to requiring the appropriate effect review until the connection definition establishes their behavior.

Expose a stable SDK operation such as `connectors.invoke(binding, operation, input)`; the exact name is selected during implementation. HTTP SDK compatibility can use a broker-backed transport. Do not promise every third-party SDK is a drop-in replacement where it assumes direct credentials or unrestricted networking.

Auth modes should be extensible: none, API key/header, OAuth2 and later signed-request mechanisms. Signing and credential injection occur in the broker, never in generated frontend code. Store arbitrary connection configuration separately from secrets.

## 4. Credential and network boundary

- Use encryption at rest with managed key custody/rotation and least-privilege service access. Store ciphertext and secret metadata separately from app source, snapshots and ordinary customer records. Backups must preserve decryptability only for authorized recovery.
- Credential entry occurs in the authenticated trusted UI with CSRF/session protection and step-up authentication when appropriate. One-time setup handles are user/tenant-bound, short-lived and cannot reveal an existing secret.
- MCP and the app SDK expose configured/missing/expired status and handles, never token values. Secrets are also excluded from logs, error messages, test responses, exports, source revisions and support diagnostics.
- Inject credentials only for the reviewed destination/account/operation. Never forward them across an unapproved redirect or allow a user-supplied header to override authorization.
- OAuth uses verified redirect URIs, state/PKCE as applicable, encrypted refresh tokens, bounded refresh retries and explicit scope/re-consent handling. Provider consent and Trialy app authorization are separate.
- Resolve and validate destinations at request time, including every redirect and DNS change. Block loopback, private/link-local/metadata endpoints and control-plane networks; validate IPv4/IPv6 and prevent DNS rebinding. Private connectivity requires a separate deliberate design.
- Enforce these rules outside the generated process. A library cannot bypass limits using raw sockets, DNS, redirects, images or a separate `fetch`. Browser applications use the SDK; server network access is restricted to the broker/build paths required by the manifest.
- Limit headers, request/response sizes, file decompression, duration, pagination and calls per run. Record normalized errors such as expired connection, denied scope, rate limit, budget exhausted, provider unavailable and outcome unknown.

Provider responses, documentation and imported specifications are untrusted content. They do not grant new authority or instructions to expose secrets. If an AI adapter later consumes them, its tool actions still pass the same gateway.

## 5. Effects, triggers and reliability

External effects need their own authorization contract. A database write grant does not authorize sending email or creating a remote document. Permit one exact action or a scoped, expiring, revocable standing authorization naming connector, operations, recipients/destinations or field constraints, rate and cost limits.

Store exact request/effect hashes and provider receipts. Show human-readable before/action/after evidence where the provider supports it, without logging credentials or unnecessary private payloads. Record both the initiating identity and executing app/run.

All retries share one logical operation ID. Use the provider's idempotency mechanism when available. On a timeout after dispatch, the result can be unknown: retain an effect-pending state, query provider status where possible, and avoid blind retry. A local database transaction cannot atomically roll back an external email. For multi-step workflows, checkpoint each effect and specify compensation/review behavior.

Webhook ingress verifies signatures or scoped authentication, timestamp/replay windows and body limits before queue admission. Persist a deduplicated event before acknowledging it. Workers recheck current connection and app authorization when processing; event arrival does not freeze permission forever. Separate received event data from accepted authoritative records and chargeable effects.

Revoking a connection blocks future calls and queued effects. It cannot undo a completed remote operation or erase costs already incurred. The interface should state that accurately.

## 6. Two billing modes

| Mode | Provider bill | Trialy bill | Recommended timing |
| --- | --- | --- | --- |
| User-connected service | Customer pays provider under their account/contract | Platform subscription and Trialy compute/storage/transfer | First generic connector release |
| Trialy-provided service | Trialy pays provider | Subscription plus explicit metered service usage | After adapter pricing/reconciliation is verified |

A user-connected service can offer a one-click OAuth experience later; it need not mean manual integration. Trialy-provided services remove account setup for the supported operation, but still need applicable sender/domain or account consent and clear spending terms.

Do not proxy unknown paid services using a shared Trialy key. If unit cost cannot be bounded or measured, use the customer's account or keep the managed operation disabled until a pricing adapter exists. For user-connected services, show that provider charges are external/possibly unknown; Trialy call limits do not guarantee a cap on that provider's total bill.

## 7. Cost model

Separate the cost to run Trialy, the cost of a specific operation, and the price charged to the customer. Track the actual provider's billing dimensions, not an invented flat “API call” count.

For an app over a billing period:

```text
direct_cost = build_compute + execution_compute + durable_storage
            + transfer_and_requests + external_provider_usage

fully_allocated_cost = direct_cost + allocated_shared_infrastructure
                    + attributable_operational_overhead
```

Compute may be billed as instance-seconds or as vCPU-seconds plus GiB-seconds. Use the provider's actual tariff, never both for the same resource. Include provisioned/wall-time billing and idle time where applicable, not just CPU utilization. Storage uses time-weighted GB-months; transfer uses billable bytes. Distinguish internal transfers, cache hits and customer egress according to the chosen service's tariff.

| Work | Measure |
| --- | --- |
| Package builds | Billable build duration/size, artifact retention and package traffic |
| Functions/jobs | Runtime, billable duration and provisioned memory/CPU/instance; retries and cancelled runs |
| Long-lived services | Provisioned active/idle time, restart overhead and reserved capacity |
| Data/files | Stored bytes over time, requests, retrieval and egress where charged |
| Email later | Provider-billable messages/recipients and any account/domain/fixed allocation |
| AI later | Provider/model, input/cached/output units, additional tools/media and fixed charges |
| Generic customer service | Trialy broker/compute/transfer; third-party cost only if reliably observable, labeled external |

Record rate-catalog version, currency, app/revision/run, measured quantity, estimation status, provider request/receipt ID and payer. Meter in trusted services. Generated code cannot report its own authoritative usage or price. Reconcile against provider invoices; retain adjustments and refunds as ledger entries.

Recommended commercial structure: a subscription covering shared infrastructure and an included usage allowance, then transparent metered usage with an owner-set monthly maximum. Customers should see currency amounts and understandable units. There is no need to invent an opaque credit system at this stage. Do not promise unlimited workers, email or AI.

If a usage charge targets contribution margin `m`, then:

```text
usage_price = attributable_usage_cost / (1 - m)
```

Illustration only, not proposed pricing: if a customer's attributable usage costs EUR 12 and the target contribution margin is 60%, the usage revenue is EUR 30, leaving EUR 18 before costs excluded from that calculation. A 60% markup on EUR 12 would be EUR 19.20 and is not a 60% margin. Subscription revenue must also cover shared baseline infrastructure, support and other overhead. Choose actual tariffs after observing representative workloads and demand, not from this illustration.

Provider rate cards, exchange rates and plan allowances can change. Keep them in versioned configuration with effective dates. Avoid assuming free tiers or unused allowances permanently reduce every customer's marginal cost. Any tax/invoicing design is a separate commercial implementation decision.

## 8. Spending controls and exposure

1. Estimate a maximum charge from bounded runtime, iterations, payload sizes, output tokens or operation quantity before admission.
2. Atomically reserve that amount against account, app and execution budgets. Reserve in the customer-price currency using the relevant tariff; separately check platform/provider exposure limits.
3. Run only while the reservation, authorization and connection remain valid. Apply worker concurrency, rate, timeout, workflow-depth and retry ceilings.
4. Settle measured usage and release unused amounts. Keep an unresolved reservation when provider outcome/cost is uncertain; reconcile it instead of treating it as free.
5. Warn at configurable thresholds and stop new chargeable work at the hard cap. Offer an explicit limit increase; no automatic paid overage or automatic key switch.
6. Define treatment of costs already in flight, provider reporting delays and platform-caused failures. Admission bounds reduce overspend; a stop request cannot reverse an already dispatched paid request. State any bounded possible exposure honestly.

The platform also needs a global emergency stop and provider-level caps. Otherwise many individually cheap apps can exhaust the owner's shared provider account. Long-lived services need periodic reservation renewal and a safe stop policy. A runaway loop must not bypass metering by nesting functions or connector calls.

## 9. Order of investment

1. Identity/data/jobs remain built-in capabilities.
2. Build usage metering and hard limits before new paid runtime/provider exposure.
3. Ship the generic connector, secret UI and management surface with user-connected credentials.
4. Validate a real app plus safe test-service read/write/webhook flows and recovery semantics.
5. Add the most requested provider adapter using the same broker.
6. Add Trialy-funded operations only once measured economics, quotas, operational duties and explicit customer pricing are ready.

Email sending, cloud document access and AI can be postponed without blocking apps, internal linking, calculators, shared records or background processing. A worker generating a `.docx` file does not require Microsoft 365; opening a user's cloud Word document does require an authorized document connector. Conversational building through ChatGPT does not imply the deployed app has ongoing access to ChatGPT inference; in-app AI is a separately configured, metered capability.

## 10. Sources and implementation checks

Checked 29 October 2026. These sources inform design; no vendor quote or production provider choice is implied.

- [OWASP secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): credential lifecycle, custody, auditing and recovery.
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html): destination/network validation for generic requests.
- [Render pricing](https://render.com/pricing) and [cron billing](https://render.com/docs/cronjobs): shared baseline and compute/metered cost dimensions. Recheck selected plans at provisioning.
- [Resend pricing](https://resend.com/pricing): example of provider-specific message units, allowances and fixed charges. No email adapter or exact tariff is selected here.

Release acceptance must cover secret leakage, revocation mid-run, cross-tenant access, redirect/DNS bypass, duplicate webhooks, unknown external outcomes, concurrent budget admission, delayed metering and invoice reconciliation. Use synthetic recipients/services until real external actions are explicitly authorized.
