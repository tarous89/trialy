# Platform app catalog

The website and MCP read approved versions from `app_template_catalog`. The catalog stores the immutable template payload, digest, installation schemas, and `status` (`draft` or `approved`). Runtime database roles have SELECT only, with an approved-only RLS policy. Publishing is an operator action, not a tenant permission.

Migration 056 and `db:migrate` import repository versions once. `templates/catalog-seed.json` approves the existing 23 life-science versions requested for launch. Do not extend this bootstrap approval list for future releases. Existing statuses and payloads are never overwritten by deployment. New versions default to draft; older approved versions remain available until replaced or withdrawn.

Use the migration/operator database connection in `MIGRATION_DATABASE_URL`:

```
node --import tsx scripts/template-catalog.ts sync
node --import tsx scripts/template-catalog.ts list
node --import tsx scripts/template-catalog.ts approved life.example 1.0.0
node --import tsx scripts/template-catalog.ts draft life.example 1.0.0
```

Before approval, review the source, documentation and installation schema stored in the row. For each new template version, add a `templateId@version` entry to `templates/catalog-installers.json` pointing to its role-keyed installation schema (name, fields, logicalFields). Sync imports both source and schemas into a draft database row. Run the installer integration tests for that version before approval. Never include sample records, customer data or credentials. Schema changes require a new version; never mutate a released JSON file.

Use app is an explicit human action. It creates empty tables and a saved app in one transaction using existing permission, schema, audit and confirmation paths. Retries reuse an actor/workspace-scoped receipt. Failed installations roll back entirely. No connectors, automations or outgoing messages are enabled. Installed copies remain usable when a catalog version is withdrawn.

Apps open in the same platform tab, under the TrialAgents header. Platform navigation is expanded by default; app navigation is collapsed until opened. Assistant customization actions offer separate ChatGPT and Claude links. Existing scheduled research remains explicitly ChatGPT-specific until a Claude runner exists.
