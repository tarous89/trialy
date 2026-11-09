# TrialAgents implementation status

Current: 9 November 2026. [Context](../../CONTEXT.md) and [platform contract](APP_PLATFORM_SCOPE.md) are the current behavioral references. Historical implementation details are [archived](../archive/2026-11-09-product-reset/docs/product/APP_PLATFORM_IMPLEMENTATION.md).

| Area | Current implementation/reference |
| --- | --- |
| Web navigation | Same-tab `/apps/...` routes in the TrialAgents shell; sidebar expanded for platform pages and collapsed for apps; Apps replaces visible Home. |
| Header | Open ChatGPT and Open Claude CTA buttons on platform and app pages; embedded/plugin Open TrialAgents action. |
| Templates | Dedicated search/filter gallery, screenshots, full-detail and fullscreen previews, Preview/Use actions; entry via New → App or Apps, not sidebar. |
| Catalog | Migration 056, publisher-owned database records, draft/approved versions, approved-only runtime access. See [operations](../TEMPLATE_CATALOG.md). |
| Installation | Atomic app/empty-table creation, permission/schema/audit checks and retry receipts; no automated connector or scheduler setup. |
| Customization and creation | Authorized app/template discovery, source reuse, custom `frontend-js`, optional shell/component recipes and exact finalized previews. |
| Shared services | Existing database/access/connector/automation/log contracts retained. Optional automations do not block apps. |

The November 9 changes shipped through the catalog implementation and PRs [#106](https://github.com/tarous89/trialy/pull/106) and [#107](https://github.com/tarous89/trialy/pull/107). Commit `6f6e7ad44517e661d074a05d6576c79a50901da6` was verified live against local JS/CSS/icon hashes and `/health`. Its production build and 145 browser checks passed. The earlier simple-app/new-tab and watermark-only rollout is historical, not current acceptance criteria.

Cross-platform operation is the product contract; real ChatGPT/Claude host display and unattended executor activation require separate evidence. Current research scheduling is ChatGPT-specific. No documentation update changes accounts, grants, saved app source or released template JSON.
