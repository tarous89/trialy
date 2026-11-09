# TrialAgents product direction

Current as of 9 November 2026 (Europe/Berlin). This is the canonical product brief; [CONTEXT.md](../../CONTEXT.md) records implementation boundaries.

## Product and audience

The product name is **TrialAgents**, not Trialy. “TrialAgents OS” is an older project descriptor, not a separate product or the preferred name. TrialAgents is **the operating system for AI-native biotechs**: connected, customizable, AI-native business apps for small biotech teams, with relevant clinical operations, CRO and research workflows. This repository is the platform, distinct from TrialAgents Intel and CTIS.

## Apps first

Users can immediately choose and use an app from the suite. They do not need to describe or build software before receiving value. Three equally valid paths are:

1. **Use an app:** choose an approved template, preview it and install it with empty data tables.
2. **Customize an app:** ask ChatGPT or Claude to adapt an existing app's layout, fields, views or workflow using authorized data and supported runtime features.
3. **Build a custom app:** ask an AI assistant to create an app when no template fits. Use optional shells/components and existing authorized schema where useful; do not force a template or fixed app type.

An app combines an interface and an enforced access boundary with optional data bindings, connectors and automations. These are reusable applications, not only chat outputs or temporary visualizations. Save, reopen, revise and share through the platform's existing controls.

## Cross-platform contract

TrialAgents is one software platform intended to work **inside ChatGPT**, **inside Claude**, and **standalone in the browser** at platform.trialagents.com. Standalone means usable without an assistant session; it does not mean apps must leave the platform shell or open a new tab.

Apps, schemas, permissions and versions remain platform-owned across surfaces. Assistants use the authorized MCP operations to discover, use, customize and build apps. Generated code cannot bypass data access or gain the host's credentials. Detect actual host display/authentication capabilities and verify each surface; do not equate a link, OAuth connection or a successful API call with visual host acceptance.

Current scheduled research is explicitly **ChatGPT-specific**. Claude customization and interactive app use do not imply a Claude background runner. Email and deterministic actions use TrialAgents services. Optional automation setup or failure must never block app use or destroy user input.

## Platform experience

- The fixed web header retains the official TrialAgents logo and a simple sidebar toggle with visible hover/active states. It always shows labeled **Open ChatGPT** and **Open Claude** buttons. Embedded/plugin headers use **Open TrialAgents** instead.
- Platform pages start with navigation expanded; individual apps start collapsed, expandable on demand. Apps open in the same TrialAgents tab by default, including internal app navigation and authorized cross-app routes.
- Sidebar order: **Apps, Database, Access, Automations, Connectors, Logs**, with Settings separately placed. “Home” is a legacy route/API term; the visible destination is Apps.
- Templates is a dedicated page reached only through **New → App** or **Browse app templates** on Apps. No Templates sidebar destination and no inline full gallery on Apps. Users without apps receive an obvious route to the gallery; this supersedes the earlier inline empty-state gallery request.
- Gallery has search and Team/Workflow filters, screenshot cards and short always-visible descriptions including **“Customizable and usable in ChatGPT and Claude.”** Full descriptions appear after opening a preview. Provide fullscreen interactive preview and only **Preview** and **Use** card actions; assistant buttons belong in the fixed header.
- Browse app templates is a styled text action with an icon, clear typography and hover feedback.
- First publication has trusted Save app / Discard app preview controls. Ordinary platform pages use native top actions; apps own their record/layout save behavior. No forced save footer for routine edits.

## Landing-page hierarchy and copy

Website: **trialagents.com**. App platform: **platform.trialagents.com**. This repository's context records the agreed landing direction; it is not evidence that a separate marketing deployment was changed.

Hero headline: **The operating system for AI-native biotechs**.

Hero supporting text: **Turbocharge your biotech operations with connected apps that run [in ChatGPT / in Claude / in browser]**. The rotating phrase stays inline with the preceding text; the supporting line is large and bold. Give the headline sufficient vertical spacing. **Connected · Customizable · AI native** use clear icons and related gradient colors close to the animated gradient line beneath the heading, not three unrelated solid colors.

Hero actions: **Start free** and **See the apps**. Header and team-pricing CTA: **Try for free**.

Explain the suite first, emphasizing that the apps work in ChatGPT, Claude and the web and are connected and customizable. Remove redundant app marketing text. Follow with four linked platform cards and their matching sections, each using consistent descriptive icons:

1. Apps inside ChatGPT and Claude.
2. Shared database.
3. Access controls.
4. Logs.

Place the custom-app building section **after the suite and platform sections**. Explain that ChatGPT and Claude can customize these apps or build new ones. Do not lead the page with “build software in ChatGPT” or portray Claude as an afterthought. Where generic assistant actions are offered, provide both; genuinely provider-specific features retain accurate labels.

## Naming and compatibility

Use TrialAgents and app/apps in product prose, UI and current documentation. Keep repository names, historical source, database roles, OAuth scopes, package paths and runtime identifiers stable until a separately scoped migration. Never perform a global `trialy` replacement in code or saved customer content. See [branding](../BRANDING.md).
