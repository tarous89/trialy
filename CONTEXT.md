# TrialAgents OS — current project context

Updated 1 November 2026 (Europe/Berlin). Start here before changing the platform or writing templates. Repository: `tarous89/trialy`. Public platform: https://platform.trialagents.com. MCP: https://platform.trialagents.com/mcp. This project is separate from TrialAgents Intel and CTIS.

## Release 0.2.41 changes

Simple ChatGPT/Email forms and guarded app notifications. Migration 051 adds pending batches, current-state revalidation, global recipient/account allowances and a mixed-version worker fence. Incompatible legacy email rules pause for review; unsent legacy app email jobs are cancelled while source records/research/history remain. Template guidance is 1.3.5; automation guide 1.2.0. The shared daily runner remains independent backend infrastructure.

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

Manual automation creation: Add automation opens one full-width page with horizontal ChatGPT and Email tabs and the form immediately visible. Preserve each tab's draft. Show linked app, name, schedule/trigger, research instructions, or email subject/message and recipients. Use app-bound named table choices; never expose raw record/table IDs, JSON scopes, allowed fields, execution limits or advanced configuration. New email automations include the owner by default and allow adding app-authorized team members. Existing recipients and hidden configuration must survive edits. New research configurations use inheritAppAccess:true, current app-bound read fields and only existing approved ongoing write scopes within the app; revalidate current app access at execution. This never creates write grants. Keep review human-readable (including authorization expiry), keep backend validation and exact confirmation, and preserve input on failure. Email creation remains available if shared ChatGPT setup is unavailable; research reuses the existing shared runner without claiming subscription activation. Apps never depend on this editor or scheduler availability.


## Simple email notifications

Email automations have one delivery step, separate from ChatGPT/functions/connectors. Use daily/weekly/monthly calendar schedules (every N days/weeks/months), or entry creation/an explicit field transition. No subdaily email intervals or broad “any update” notifications. The backend waits two minutes after relevant changes, combines pending work, rechecks current state/access, and cancels obsolete notifications. It enforces one app email per normalized recipient per rolling hour across TrialAgents and 15 recipient deliveries per account per rolling 24 hours. Calendar email also has one slot per rule/recipient/local date. Extra work waits; only abnormal queue growth suspends a rule. Recipients must be explicitly selected registered team members with current app/data access; database address columns never authorize bulk mail. Research may run several times daily independently of email limits. Do not create report/digest modes, expose quota/retry controls, or use ChatGPT email tools/connectors to bypass these rules.

The editor exposes linked app, name, schedule or database condition, instructions/message and recipients. Keep timezone (shown as help text), anchors, scopes, expiry defaults, source policies, catch-up and delivery limits in backend configuration. Preserve hidden values and disabled state on edits. See [notification scope](docs/scopes/NOTIFICATION_GUARDRAILS_2026-11-01.md) for rollout and verification.
