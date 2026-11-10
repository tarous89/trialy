# TrialAgents documentation

Current product: **TrialAgents** — connected, customizable apps for ChatGPT, Claude and standalone web, including AI-assistant-built custom apps.

## Read first

- [Current context](../CONTEXT.md) and [product direction](product/PRODUCT_DIRECTION.md).
- [Platform contract](product/APP_PLATFORM_SCOPE.md), [implementation status](product/APP_PLATFORM_IMPLEMENTATION.md) and [development](../DEVELOPMENT.md).
- [Branding and compatibility identifiers](BRANDING.md).

## Current engineering references

| Area | References |
| --- | --- |
| Templates and custom apps | [Catalog publishing](TEMPLATE_CATALOG.md), [dynamic templates/reuse](product/DYNAMIC_APP_TEMPLATES.md), [authoring](../templates/TEMPLATE_AUTHORING.md), [assistant usage](../templates/TEMPLATE_USAGE.md), [shells](product/APP_SHELLS.md) |
| Data and authorization | [Shared data](SHARED_DATA.md), [field capabilities](FIELD_CAPABILITIES.md), [access](ACCESS_CONTROL.md), [write authorization](WRITE_AUTHORIZATION.md) |
| Runtime and lifecycle | [Frontend code](FRONTEND_CODE.md), [execution](EXECUTION.md), [publication](APP_PUBLICATION.md), [workspace foundation](WORKSPACE_FOUNDATION.md) |
| Platform services | [App configuration/automations](product/APP_CONFIGURATION_AND_AUTOMATIONS.md), [connectors](product/CONNECTORS_AND_USAGE.md), [app services](APP_SERVICES.md), [notification policy](scopes/NOTIFICATION_GUARDRAILS_2026-11-01.md) |
| Assistant integration | [Hosted workspace guide](../resources/workspace/WORKSPACE.md), [app builder](../resources/tracker-design/APP_BUILDER.md), [ChatGPT-specific setup](CHATGPT_SETUP.md), [Claude connection and plugin](CLAUDE_SETUP.md) |
| Operations | [Deployment/recovery](OPERATIONS.md), [domain](platform-domain.md), [remaining work](product/APP_PLATFORM_BACKLOG.md) |

Named provider setup/automation documents remain provider-specific. They do not restrict the overall product to that provider. Blueprint/source-package QA describes its dated package; current catalog status and living guidance govern publication.

## History

[HISTORY.md](../HISTORY.md) records decisions/releases. [Archive](archive/README.md) holds superseded plans and prior context. Old paths remain short pointers so references do not silently break. Archive contents are evidence, never current instructions; do not revive old Home/type selection/new-tab/watermark-only behavior from them.
