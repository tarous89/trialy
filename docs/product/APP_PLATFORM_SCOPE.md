# Simple apps: implementation scope

Updated 29 October 2026. Status: ready to implement; documentation only.

[Prioritized roadmap](APP_PLATFORM_ROADMAP.md) · [Generic connector](CONNECTORS_AND_USAGE.md) · [Later backlog](APP_PLATFORM_BACKLOG.md)

This supersedes the broader first-release requirements in the earlier PR #62 revision. Build simple apps with navigation, links and one generic connector type. Reuse the current runtime, authentication, shared database, access controls, reviewed writes and audit history.

## 1. Priorities

| Priority | Scope |
| --- | --- |
| P0 — required now | One app concept; project colors; standalone pages opening in a new tab; navigation and links; standard footer; generic HTTPS connector with management, data scope and access controls |
| P1 — follow-up | Improvements justified by initial usage; connector OAuth/file/pagination support; optional project appearance editing |
| P2 — advanced backlog | Browser packages/React/npm, Node/Python/container runtimes, new endpoints, advanced workflows/webhooks, continuous workers, external audiences and commercial usage billing |
| P3 — branded connectors last | Email, Microsoft 365/Google, AI and other provider-specific or Trialy-funded services |

P0 is not a new general-purpose hosting infrastructure. Reuse `frontend-js`, the standard renderer, component revisions and current limits. New tabs do not require a deployment per app. Existing workers/schedules remain available; extending them is not a P0 dependency. Do not claim unrestricted browser/server code compatibility.

## 2. One app concept

Home lists named apps, optionally grouped by project. Users describe what they need; the builder chooses screens and behavior. Remove mandatory tracker/form/dashboard/automation choices, type filters, type labels and type-based card colors. Templates remain optional starting points.

Tables, forms and dashboards can still appear inside apps. This removes categories, not their functionality or saved data. Preserve existing IDs, records, history, permissions and function bindings. Older creation/open APIs remain compatibility adapters. Source is normally exchanged with the builder, not shown in the running app.

## 3. Project colors

Extract the existing deterministic `projectTheme(projectId)` from [HomeView](../../src/shared/ui/HomeView.tsx) into one shared helper. Reuse its current color/gradient for each project's app cards; do not redesign the palette or randomize colors on refresh.

- Organizational Home placement determines the color. Moving an app changes its accent, not data scope or access.
- Unassigned apps use one neutral existing theme. Historical multiple-project references need an explicit primary placement, not whichever project sorts first.
- Keep project names visible. The selected-project state remains the existing style; children inherit the stable base pattern.
- Use project accents on cards and optional small app-page accents. Keep the platform footer standard. Explicitly customized app interiors remain customizable.

## 4. Standalone pages and links

Saved apps run at an authenticated route such as `/apps/{appId}/{pagePath}`. Home cards and Open actions use real links with `target="_blank"` and `rel="noopener noreferrer"`. This requests a new tab; browser settings may choose a window. Do not wait for asynchronous rendering before opening and trigger popup blocking.

The app gets the main page and its own navigation, without the platform's management sidebar. It still uses the same session, backend, runtime and permissions. A URL does not make an app public. Reuse existing sign-in and return to a validated relative route; never place credentials, tokens or copied records in URLs.

From ChatGPT, provide a trusted Open app link. Hosts may require a user click; background reads/saves do not open tabs automatically. Existing embedded previews/readers remain compatible, but full app operation no longer depends on embedded feature parity.

Internal app navigation stays in the same tab. Support nested pages, list/detail links, relative paths, safe query state, refresh, bookmarks and back/forward. Explicit links to another authorized app may open a new tab. Normal external website links are supported separately from connector calls.

The trusted standalone wrapper owns browser history. Extend the current render/event contract with a navigation action and safe link rendering instead of removing URL sanitization. Recheck destination/record access; preserve unsaved edits or use the current discard warning. Existing custom events may still require server round trips.

Provide styled denied, wrong-account, missing, archived and expired-preview states. Existing saved functions, collections and legacy automations on Home get compatible standalone detail/control wrappers; do not drop them or broaden their rights. Draft previews remain owner-only, expiring and without persistent/external effects.

## 5. Standard footer and existing UI

Every standalone app has a small persistent trusted footer outside generated content. Requested copy: **Built with TrialAgent**. Centralize the label and reuse existing brand assets/styles. This does not rename the repository, domains or unrelated products.

The footer links to the platform Home through normal authentication and authorization. App access does not grant account/Home access. Use a fixed platform-owned destination; denied visitors see the normal sign-in/access state without account details.

Keep it visible through navigation, loading and errors. Reserve its height so it never covers content or save/review controls, including on mobile. Generated source cannot hide or replace the footer.

Use the actual shared UI: [Controls](../../src/shared/ui/Controls.tsx), [WorkspaceShell](../../src/shared/ui/WorkspaceShell.tsx), [design.css](../../src/shared/ui/design.css), [brand.css](../../src/shared/ui/brand.css), [scroll.css](../../src/shared/ui/scroll.css), existing tables/pagination/dialogs/save states and [Access](../../src/shared/AccessPanel.tsx). Fonts, sizes, margins, buttons, icons and interactions must match the current app. No new visual framework or unrelated redesign. This applies to platform chrome and Connectors, not mandatory layouts for generated content.

## 6. One Connectors destination

Add one top-level **Connectors** destination using the existing navigation and UI. Offer one generic HTTPS/API connector type, with multiple named connections allowed. Product copy says Connectors, not APIs.

List name, service/base address, status, allowed apps and last activity. Standard Add/Edit/Test/Disable/Remove controls open one detail page/panel with Details, Data, Access and Activity sections. Do not build a marketplace or separate top-level tabs for these sections.

Data means operation input/output definitions, permitted source/destination mappings and a bounded test result. It is not a separate database. Saving a response uses the existing reviewed shared-record path.

Access distinguishes who manages a connection, who/which apps can invoke operations, what platform data may leave and where returned data may be saved. A connection can only narrow existing actor/app permissions. The [connector contract](CONNECTORS_AND_USAGE.md) specifies enforceable behavior.

ChatGPT can prepare configuration and inspect safe metadata. Credentials are entered only through trusted platform UI and never returned to chat or generated code. Keep existing inbound “Connected applications” settings separate: those control access to Trialy, not outbound service calls.

## 7. Costs and launch boundary

Use customer-owned service credentials first. Add request/time/body/rate/concurrency limits, per-connection counters, disable controls and audit entries. Provider charges are external; Trialy cannot cap the customer's entire provider bill. Do not require currency reservations, a billing engine or Trialy-funded email/AI for P0.

The release is complete when one simple app is created without choosing a type, inherits its project colors, opens separately, navigates between pages, calls a permitted connector, saves a reviewed result and reopens. Its footer works and remains visible. Unauthorized users/fields/operations fail; old tools/data/history survive; Connectors matches the existing UI.
