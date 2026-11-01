# TrialAgents OS — current project context

Updated 1 November 2026 (Europe/Berlin). Start here before changing the platform or writing templates. Repository: `tarous89/trialy`. Public platform: https://platform.trialagents.com. MCP: https://platform.trialagents.com/mcp. This project is separate from TrialAgents Intel and CTIS.

## Release 0.2.40 changes

Automations is now definition-only, full width, with direct edit/enable controls. Shared runner setup and history have moved out of this list. Logs includes research/action runs and app attribution; filter fields wrap in normal flow. Dynamic template guidance is 1.3.2. Shared-runner preferences remain available in Settings → Account and private MCP setup tools; they are not displayed under the app automation list.

## Previously verified baseline

Release **0.2.39**, commit `345eb6bb55ccd23110ac73d5690dd75bdea5ac27`, shipped through [PR #86](https://github.com/tarous89/trialy/pull/86). Web and worker were verified live, migrations applied, health healthy, and the public MCP exposed the new management tools. CI passed 177 backend tests, 75 browser tests, build/type checks and production browser verification. These are release checks, not proof of unattended ChatGPT execution.

- **App configuration:** interface, optional database bindings, mandatory backend app access boundary, optional connectors and zero or more optional automations. Existing apps are not retrofitted. No generated app-specific authentication or new seat model.
- **Access:** retain the existing Projects section. Projects show apps by default; apps expand into registered tabs/parts, following Database → tables → columns. Standard tracker `tabs[].accessId` is optional, stable and unique. Tabs inherit and can only restrict app access. Missing metadata preserves app-level access; configured denials must be enforced. Arbitrary custom source retains app-level protection until a supported source/data boundary exists. Independent Database permissions remain independent.
- **Automations:** one platform destination lists app-linked research and deterministic/email definitions. Rows show linked app, Scheduled/Trigger with frequency, and prompt/action instructions, plus Disable/Enable and Edit. Full configuration loads only on Edit. The page is full width; an empty list has no filters, pagination or setup controls. Shared daily ChatGPT setup is independent backend infrastructure, not a list entry or panel. Previous research/action runs belong in Logs, which filters by app as well as project/outcome/category. Definitions stay editable when disabled; editing does not enable them. Archive suspends attached work; restore does not restart it. No independent Delete control or app/record deletion from disabling automation.
- **Execution:** TrialAgents stores schedules, prompts, scopes, coverage, due occurrences and receipts. Research uses one shared ChatGPT event subscription per authorizing owner/workspace; no task per app. Email and deterministic effects use TrialAgents services. Support recurring/calendar, one-time, record-date and database-change triggers through their existing typed schemas; research also supports after-success timing.
- **Setup:** check at first supported use, every app creation, automation addition and reconnect/repair. Reuse existing consent/subscriptions; respect deliberate pauses and declined setup. Requested execution is Work chat, latest highest-capability subscription model, high reasoning. Host tools do not currently expose model/reasoning controls; requested preferences are not verified execution settings.

## Non-negotiable continuity and UX

Save the app before optional automation setup. App resolution, loading, navigation, ordinary reads/writes, publication and health must not depend on scheduling, callbacks or research. Failures retain the latest authorized usable published app and local input; run outcomes belong in Logs and private setup/history tools. Permission revocation still applies. Retries reconcile immutable receipts and expected record versions; never replace tables or overwrite newer user work to repair a task.

First-save prompts apply only to never-saved apps. Published apps stay usable during ChatGPT edits and later publication; updates may offer a subtle optional refresh notice. Keep Search and Add record inline, disclose secondary filters when space is tight, use bounded active-page reads and avoid redundant rendering after layout saves. Extra log filters stay inline and wrap naturally into another row; they never float over events. Sidebar order: Home, Database, Access, Automations, Connectors, Logs. Templates are optional accelerators, not mandatory app types.

## Activation is separate from deployment

Last verified at the 0.2.39 rollout: worker signing storage was unconfigured; this ChatGPT session exposed GitHub only as an event source and still had an older TrialAgents tool catalog. Recheck these facts after any operator action; do not treat this dated observation as permanent host incompatibility.

1. Copy the **existing** web `CONNECTOR_ENCRYPTION_KEY` to the worker, then deploy the worker. Never replace the web key or put it in source/chat.
2. Refresh the custom MCP connection's metadata and start a new Work chat with TrialAgents enabled. Refresh is not proof that event subscriptions are available.
3. Discover supported events, reuse/complete approved runner setup, establish the actual host subscription, and verify a real unattended no-write cycle before claiming activation. Never invent callback/task identifiers or silently substitute polling/API execution.

See [operator steps](docs/OPERATIONS.md#shared-automation-activation) and [ChatGPT setup](docs/CHATGPT_SETUP.md#current-connection-and-automation-setup).

## Documentation map and maintenance

| Need | Authoritative document |
| --- | --- |
| App/access/automation behavior and limits | [App configuration](docs/product/APP_CONFIGURATION_AND_AUTOMATIONS.md) |
| Scheduling, claims, receipts and isolation | [Automation engine](docs/scopes/APP_AUTOMATION_ENGINE_2026-10-31.md) |
| Creating reusable templates | [Living authoring standard](templates/TEMPLATE_AUTHORING.md) |
| ChatGPT using those templates | [Living usage guidance](templates/TEMPLATE_USAGE.md) |
| Shared blueprint rules | [Design and build contract](docs/product/app-template-blueprints/DESIGN_AND_BUILD_CONTRACT.md) |
| Server catalog and release behavior | [Dynamic templates](docs/product/DYNAMIC_APP_TEMPLATES.md) |
| Remaining work and dated decisions | [Development](DEVELOPMENT.md), [history](HISTORY.md) |

Read current guidance through `read_app_template_guidance` and follow every `nextOffset`. Update its declared version with both Markdown guides when changing the shared contract. Keep released template JSON immutable. Server-served guidance ships through repository deployment; imported skill/package publication is a separate step. Older roadmap/history dates are historical and do not override the current contracts above.

Manual automation creation: the platform Automations heading includes Add automation, following Connectors. Select an existing app and ChatGPT research or TrialAgents email/action, then configure the same typed schedule, instructions, sources, notification policy, scopes, limits and expiry used by MCP. Existing shared-runner setup is reused; no new subscription is silently activated. Data-scope IDs and advanced typed steps remain subject to backend validation and exact review. Failed preparation/saving retains the form and never changes the linked app.
