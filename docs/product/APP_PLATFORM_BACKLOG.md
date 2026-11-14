# TrialAgents remaining work and enhancements

Current: 9 November 2026. This is not an authorization to start every item. [Context](../../CONTEXT.md) and [development](../../DEVELOPMENT.md) distinguish implemented behavior from verification gaps.

## Verification priorities

- Verify real ChatGPT and Claude app display, connection, customization, new custom-app creation and reopening against the shared contracts.
- Verify actual unattended ChatGPT runner activation and a real no-write cycle before claiming background readiness. A Claude runner would be new work.
- Complete applicable production recovery/provider checks using current operational evidence, not dated release blockers.

## External exchange (committed, 12 Nov 2026)

- Build [external exchange](EXTERNAL_EXCHANGE.md): per-recipient links, brief and documents out, response form with drafts and resubmission, documents back (e.g. signed CDA), private messages and anonymised clarifications, confidentiality gate, outbound email from the TrialAgents domain (human-confirmed), notifications, app API. First consumer: CRO Selection; reused later by Data Room secure rooms, Diligence Q&A, Site Finder and Investor Updates.

## App automations (owner-approved scope, 14 Nov 2026)

- Build [pre-built automations and later app-feature setup](RECOMMENDED_AUTOMATIONS.md) through the [RA1–RA5 implementation plan](RECOMMENDED_AUTOMATIONS_IMPLEMENTATION.md): recipe/identity foundation → failure-isolated setup → E1–E4 executor extensions → concise install popup and Automations/ChatGPT/Claude setup → integration and release.
- Install recommendations are selected by default; one Add app approval activates eligible work. Optional automation errors cannot roll back or break the app. Preserve authorized chat activation, per-installed-app deduplication and date-reminder catch-up.
- Existing app features can supply reusable automation recipes in the Automations tab and both assistants. External sends remain in the exchange; deployed-template retrofits and publication are separate work.

## Modular apps and shared data (committed requirement)

- Implement the platform items in [modular apps and shared data §5](MODULAR_APPS_AND_SHARED_DATA.md#5-platform-work-roadmap): table role metadata, install/reinstall detection and reconnect, delete-app dialog listing retained tables, unbound-table label, table deletion guard, template validation of core roles, and authoring-guide rules. Verify current behaviour before building.

## Demand-driven enhancements

- Measured app navigation/render/save performance improvements without data or input loss.
- OAuth2 support, richer response pagination/files and additional operations in generic connectors when a selected service requires them.
- New runtimes such as React/npm bundles, Node or Python only with a separately designed isolation, permission and deployment model.
- More complex durable workflows, inbound webhooks, real-time collaboration and additional audience policies as separately scoped features.
- Additional branded adapters and variable-cost billing controls where justified by a selected use case. Existing TrialAgents email/actions and shared automation services are already implemented, not blocked by an obsolete “providers last” plan.

Do not reintroduce separate-tab app defaults, mandatory categories, a Templates sidebar, app-level accounts, or required automation setup. Preserve current same-tab routing, approved catalog, custom app support and shared access/data contracts. No infrastructure purchase follows from this backlog.
