# TrialAgents platform contract

Current: 9 November 2026. [Product direction](PRODUCT_DIRECTION.md) · [Context](../../CONTEXT.md). The earlier new-tab/watermark-only scope is archived.

## App model and surfaces

TrialAgents contains ready-made connected apps, supports their customization, and lets ChatGPT and Claude build custom apps within the existing runtime. Apps should work inside both assistants and standalone on the web. No fixed tracker/form/dashboard category is required. Use optional templates, shells and components when appropriate. App configuration comprises interface, mandatory access boundary and optional data, connectors and automations.

## Navigation and headers

Web apps use authenticated `/apps/...` routes inside TrialAgents in the same tab by default. Keep working internal links, back/forward, bookmarks, refresh, validated sign-in return and unsaved-draft protection. The fixed header includes the real logo, visible sidebar toggle and Open ChatGPT/Open Claude CTA buttons on all platform/app pages. The sidebar starts expanded for platform pages and collapsed for apps. Embedded/plugin headers use Open TrialAgents instead. Preserve host navigation adapters; do not navigate the isolated frame's parent arbitrarily.

Apps replaces the visible Home label. Sidebar order is Apps, Database, Access, Automations, Connectors, Logs with Settings separately. Templates is not a sidebar item; New → App and Browse app templates open its dedicated page. Keep legacy route/API identifiers compatible.

## Template use and customization

Gallery search, Team/Workflow filters, screenshots, short descriptions and fullscreen sandboxed previews help users choose apps. Cards offer only Preview and Use and explain ChatGPT/Claude usability and customization. Show full descriptions in preview. Only approved database catalog versions are visible. Use installs empty tables and a saved app atomically; no automatic research, email or connector grants. Details: [catalog operations](../TEMPLATE_CATALOG.md), [dynamic templates](DYNAMIC_APP_TEMPLATES.md).

Assistants can customize installed apps, reuse authorized source with an explicit data-sharing choice, or build custom source. Preserve the user's chosen design and existing records. Prepare and finalize the complete preview, then save through exact authorization. No intermediate saves, duplicate apps on retry or automatic catalog upgrades to saved apps.

## Platform services and boundaries

Connected data, access, connectors, automations and logs are shared platform capabilities. Continue using the existing database, auth, runtime isolation, trusted connector broker and audit history. App visibility does not imply data/source access. Apps never implement their own login. No unrestricted browser/npm runtime is promised by “custom app.”

Platform saves are native top actions; apps choose appropriate record/layout save controls. Only first publication uses the trusted Save app / Discard app footer. Optional automation setup and failure cannot block app use. Research remains ChatGPT-specific until another executor is implemented and verified; email/deterministic actions use TrialAgents.

## Acceptance

Verify app discovery/use, assistant customization/custom creation, web same-tab routing, correct sidebar defaults, both web header CTAs, plugin Open TrialAgents, gallery entry points/filters/preview, approved-only catalog, preserved data/access/history and narrow/desktop layouts. Verify actual host rendering separately in ChatGPT and Claude before claiming parity. Authorization, source isolation and current-version checks apply on every surface.
