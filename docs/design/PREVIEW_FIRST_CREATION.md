# Preview-first creation

Tracker creation now resolves connected account storage without opening Home. `prepare_tracker` displays the actual temporary tracker directly. When tables are missing, `newTables` and `extendTables` hold proposed definitions inside the expiring preview; no schema, sample records, project or tracker is saved before approval.

The extension shows a Save to selector with Home (outside projects) and authorized active projects. The save click approves the displayed tracker plus its required new tables. Those changes commit in one transaction, using existing authorization, audit, receipt replay and access checks. Failure rolls back the whole creation. A retry after a successful save resumes opening the receipt instead of creating a duplicate. The Save button waits for the isolated frame's rendered acknowledgement.

Home removes the synthetic No project tile. Unassigned work appears under All. Dropping on All or choosing Home in Move to clears placement without changing data scope or sharing. No existing project is deleted or renamed by this release.

One New menu lists Project, Tracker, Form, Visualization and Automation. Tracker/visualization requests can be composed from that entry and sent to the ChatGPT conversation; the standalone app continues in ChatGPT. Existing project, form and automation editors remain available from the same menu. User-facing Home labels no longer call these tools.

The server exposes the current creation workflow through `read_tracker_design(resource:"workflow")`, alongside the updated repository skill package. This does not assert that a previously installed package has automatically refreshed.

## Validation

- Empty account preview renders with one fictional example while tables/components/projects remain empty.
- Discard leaves no persisted schema or tracker; injected component-save failure rolls back table creation.
- Saved tracker has real database bindings, no saved example, an optional project and idempotent receipt.
- Tampered source is rejected; generated content and current schema are revalidated.
- Embedded browser: New menu, direct draft in a fresh extension, destination choice, saved tracker, editing/layout regression, mobile.
- Home browser: drag out to All, drag into project, accessible Move menu, filters, Database, Logs and mobile.

## Boundaries

The creation bundle accepts existing tables and missing-table definitions. References between new draft tables still need their supported schema workflow; the bundle does not silently emulate identity links with text. No automatic migration of existing custom tracker source is performed. Actual ChatGPT-host acceptance still needs a fresh-chat test after refreshing the connector's tool definitions.
