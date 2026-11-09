# TrialAgents

**The operating system for AI-native biotechs.**

TrialAgents is cross-platform software with connected, customizable apps that users can run inside **ChatGPT**, inside **Claude**, and as a **standalone web platform**. Start with a ready-made app, use it as it is, customize it with an AI assistant, or ask an assistant to build a custom app. The suite comes first; custom app creation extends it.

- Website: https://trialagents.com
- Platform: https://platform.trialagents.com
- MCP: https://platform.trialagents.com/mcp
- Product name: **TrialAgents**. `tarous89/trialy` and existing `trialy` protocol/package identifiers are compatibility names, not product branding.

## Start here

1. [Current context](CONTEXT.md): shipped behavior, constraints and documentation precedence.
2. [Product direction](docs/product/PRODUCT_DIRECTION.md): audience, three surfaces, suite, customization and landing-page hierarchy.
3. [Platform contract](docs/product/APP_PLATFORM_SCOPE.md): navigation, headers, gallery and app lifecycle.
4. [Development](DEVELOPMENT.md): engineering workflow, validation and remaining verification.
5. [Documentation index](docs/README.md): current technical contracts and historical material.

## One platform, three surfaces

The product should work inside ChatGPT, inside Claude and in a browser without requiring users to build an app first. These surfaces use the same saved apps, authorized data, access controls and history. Assistant-specific connection, display and scheduling capabilities must be detected and tested; product direction is not evidence that every host capability is identical or verified. Current scheduled research uses the ChatGPT runner; a Claude runner is not implemented.

On the website, apps open in the same TrialAgents tab beneath the fixed logo/header. The platform sidebar starts expanded on platform pages and collapsed on app pages. The header offers **Open ChatGPT** and **Open Claude**; the embedded plugin uses **Open TrialAgents**.

The **Apps** page is the user's app home. **New → App** and **Browse app templates** open the dedicated searchable/filterable gallery; Templates is not a sidebar item. Approved templates have screenshots, short descriptions, fullscreen previews and **Preview / Use** actions. Installing a template creates an app and empty tables; optional automations and connectors are separately configured.

## Customize or build

AI assistants can inspect authorized apps, discover approved templates, customize configuration and source, reuse an app with the intended shared/separate-data choice, or build custom apps with the supported runtime. Templates, shells and components are starting points, not mandatory app categories. Preserve user work, existing IDs, permissions and exact reviewed writes.

Read the [template authoring standard](templates/TEMPLATE_AUTHORING.md), [assistant usage guide](templates/TEMPLATE_USAGE.md), [catalog publishing contract](docs/TEMPLATE_CATALOG.md) and [app configuration contract](docs/product/APP_CONFIGURATION_AND_AUTOMATIONS.md). Apps use TrialAgents accounts; they do not add a second login/account system. Shared data means connected within authorized boundaries, never unrestricted access across customers.

## Local development

Use Node.js 24 (package minimum: 22.16) and npm. Run `npm ci`, then `npm run build`. `npm run demo` starts a loopback-only synthetic PGlite demo at http://127.0.0.1:4317; never use customer data in fixtures. `npm run check`, `npm test` and `npm run test:visual` provide type, backend and browser checks. See [operations](docs/OPERATIONS.md) for deployment, runtime roles and recovery.

Historical decisions, old release counts and superseded ChatGPT-first/new-tab-only plans live in [history](HISTORY.md) and the [archive](docs/archive/README.md). They do not override current context.
