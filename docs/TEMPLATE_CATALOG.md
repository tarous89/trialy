# Platform app catalog

The website and MCP read approved versions from `app_template_catalog`. The catalog stores the immutable template payload, digest, installation schemas, and `status` (`draft` or `approved`). Runtime database roles have SELECT only, with an approved-only RLS policy. Publishing is an operator action, not a tenant permission.

Migration 056 and `db:migrate` import repository versions once. `templates/catalog-seed.json` approves the existing 23 life-science versions requested for launch. Do not extend this bootstrap approval list for future releases. Owner-approved exceptions: on 11 November 2026, `life.cash-runway` was moved from 1.2.2 to Runway 2.0.0, then to Runway 2.1.0, and `life.project-oversight` was moved from Project Oversight 1.0.1 to Programs 2.0.0. On 12 November 2026 the owner approved Programs 2.1.0: the seed names it for new databases, and one-time migration 062 approves the draft row an earlier deployment had imported (a later withdrawal is not undone). Existing statuses and payloads are never overwritten by deployment. New versions default to draft; older approved versions remain available until replaced or withdrawn.

Use the migration/operator database connection in `MIGRATION_DATABASE_URL`:

```
node --import tsx scripts/template-catalog.ts sync
node --import tsx scripts/template-catalog.ts list
node --import tsx scripts/template-catalog.ts approved life.example 1.0.0
node --import tsx scripts/template-catalog.ts draft life.example 1.0.0
```

Before approval, review the source, documentation and installation schema stored in the row. For each new template version, add a `templateId@version` entry to `templates/catalog-installers.json` pointing to its role-keyed installation schema (name, fields, logicalFields). Sync imports both source and schemas into a draft database row. Run the installer integration tests for that version before approval. Never include sample records, customer data or credentials. Schema changes require a new version; never mutate a released JSON file.

Use app is an explicit user action on the website or inside the ChatGPT/Claude plugin. The app-only `install_app_template` MCP action requires `confirmed:true`, preserves the connected assistant’s access principal, finalizes the approved template preview and reuses the normal confirmation path. It returns the saved app ID, which the plugin opens in place. Do not send plugin users to the web installer. It creates empty tables and a saved app in one transaction using existing permission, schema, audit and confirmation paths. Retries reuse an actor/workspace-scoped receipt. Failed installations roll back entirely. No connectors, automations or outgoing messages are enabled. Installed copies remain usable when a catalog version is withdrawn. When existing tables can serve the template's roles, Use first shows the [Use existing data? dialog](product/MODULAR_APPS_AND_SHARED_DATA.md#data-access-step-at-install-only): Connect or Create new per table. Its Add app (`confirm_data_access`, app-only inside the plugins) runs the same installer with those choices; everything not connected gets a new table. The installer records each installer role with a contract on the app manifest (`manifest.roles`).

Apps open in the same platform tab, under the TrialAgents header. Platform navigation is expanded by default; app navigation is collapsed until opened. Assistant customization actions offer separate ChatGPT and Claude links. ChatGPT and Claude research use their own separately authorized shared runners.

Templates is not in the sidebar. Reach the dedicated page through New → App or Browse app templates on Apps. The web header always has Open ChatGPT and Open Claude CTA buttons; the plugin uses Open TrialAgents instead. Cards have only Preview and Use actions and an always-visible customization/usability note for both assistants. Full descriptions open with the preview.

The Templates page has Team/Workflow filters, screenshots and sandboxed interactive sample previews. Apps only links to this dedicated destination. Card metadata lives in `src/shared/template-gallery.ts`. Generate versioned screenshots and the digest manifest with `node scripts/build-template-screenshots.mjs` after installing Playwright Chromium. The script only renders repository sample HTML and blocks external requests. For new catalog versions, add their reviewed metadata and installer mapping (without expanding bootstrap approval), generate media, and approve through the operator flow. Media endpoints check approval and exact catalog digest; preview HTML is also hash checked and sandboxed without account, network, forms, popups or top navigation access. Preview does not install anything.
