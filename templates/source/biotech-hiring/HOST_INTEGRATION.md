# Host integration — 1.4.2

Use the existing isolated frontend-js render contract, authorized bindings and versioned manifest. Temporary inputs explicitly use `data-ui-state` and distinct draft actions; their values are returned as draft state. Neither inputs nor rendering grants writes. `records.propose` is revalidated against manifest, bindings, current access and original record version, then shown for exact trusted confirmation. No sandbox, CSP or permission change is needed.

Native Layout is already supported by the shared host. The catalog-generated source begins with the `templateConfiguration` JSON declaration and contains the `templateLayoutSchema` JSON declaration. The gear uses `tracker:layout`; `prepare_tool_layout` validates declared keys and current version, preserving source logic/bindings/manifest/assets/execution/access. It only changes heading/layoutProfile. Use Review/Confirm, Ignore and saved reread. Screen/field hiding never implements security.

The platform's official watermark supplies the logo linked to https://platform.trialagents.com. No optional in-app logo or authentication screen is generated. The standalone HTML is a fictional local test adapter; native settings, server permissions and actual save receipts require the host.

Publish the versioned JSON under its stable internal ID `life.hiring-resource-management`, not the uploaded file's mismatched name. Deploying the repository makes it discoverable by the existing MCP catalog; a stored commit alone is not proof of a live deployment. Keep existing saved app IDs and use reviewed expected-version revisions when migrating them. Never activate automation during template installation.
