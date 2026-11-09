# TrialAgents development

Current: 9 November 2026. Start with [CONTEXT.md](CONTEXT.md) and the [product direction](docs/product/PRODUCT_DIRECTION.md). Older release checklists and proposals are in the [archive](docs/archive/README.md).

## Working model

Build one cross-platform app platform: ready-made apps, customization and assistant-built custom apps across ChatGPT, Claude and standalone web. Keep app/data/access contracts shared while detecting host-specific display, authentication and automation capabilities. Do not restore the old ChatGPT-only positioning, mandatory app categories, separate-tab default or Templates sidebar entry.

Use the current shared UI, auth, database and bounded runtime. Keep saved data/source, identifiers and revisions compatible. User-facing name is TrialAgents; legacy technical `trialy` identifiers do not justify a global rename. Avoid unrelated rewrites or changing installed apps during documentation/template maintenance.

## Workflow

1. Inspect current main, local changes and relevant contracts. Check current implementation instead of treating a dated plan as work remaining.
2. Follow [platform scope](docs/product/APP_PLATFORM_SCOPE.md), [frontend runtime](docs/FRONTEND_CODE.md), [access](docs/ACCESS_CONTROL.md) and [write authorization](docs/WRITE_AUTHORIZATION.md). Preserve permission and atomic save boundaries.
3. Template changes follow [authoring](templates/TEMPLATE_AUTHORING.md), [usage](templates/TEMPLATE_USAGE.md) and [catalog publishing](docs/TEMPLATE_CATALOG.md). Add new immutable versions as drafts; deployment is not approval. Do not modify bootstrap approval to publish future templates.
4. Update current docs and hosted/bundled guidance together where affected; bump both guidance Markdown versions and `templateGuidance.version`. `node scripts/sync-plugin-guidance.mjs --check` checks the generated design baseline. Installed plugin publication is separate from source updates.
5. Run appropriate checks. Node.js 24 recommended, minimum 22.16; `npm ci`, `npm run check`, `npm run build`; backend `npm test`; browser `npm run test:visual`. `npm run demo` provides synthetic loopback data. For documentation-only changes validate links, terminology, guidance parity and any served-guide tests; do not regenerate app assets without a reason.
6. For runtime releases, follow [operations](docs/OPERATIONS.md), record commit/release and observed live evidence, and distinguish deployment, host metadata/package refresh and executor activation.

## Implemented foundation to preserve

Connected customer-defined schemas/records, field capabilities, projects and app versions, isolated render/event execution, exact write proposals and grants, sharing/source restrictions, generic connectors, audit/history, app-linked automations, publication previews and the approved catalog. Current contracts are indexed in [docs](docs/README.md). Historical test totals are evidence for their release only.

## Verification still needs explicit evidence

- Actual ChatGPT and Claude end-to-end display, connection, reopening and custom-app workflows must be checked on each host; synthetic browser tests and assistant links are not host acceptance.
- Unattended ChatGPT research requires current runner readiness and an observed successful cycle. Recheck status; do not execute stale key/setup instructions from older notes. Claude scheduled research is not implemented.
- Connector/provider consent, production recovery and security/operational readiness need their applicable operator checks; deployment alone does not establish them.
- Richer runtimes, OAuth connectors, workflow infrastructure and new providers remain separately scoped enhancements. See [backlog](docs/product/APP_PLATFORM_BACKLOG.md).

These verification boundaries do not block ordinary saved-app use and do not authorize unrelated infrastructure purchases or changes.
