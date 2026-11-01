# Resource Planning host contract — 1.0.2

`AppTemplates.operation` prepends exactly one `templateConfiguration` and `templateBindings` declaration. Catalog source contains only its layout schema, CSS and render body. The deterministic builder never adds a second configuration declaration. The supplied tests use the actual catalog operation and QuickJS runtime, not a preview-only wrapper that replaces source declarations.

`schema.example.json` is the executable scalar database contract. Each logical field maps to a real snake_case key and each mapped field belongs in bindings and the manifest with current schemaVersion/kind/mode. Table IDs and referenced record IDs must be actual authorized saved UUIDs. `person_id`/`project_id` are scalar text, not relationship arrays. Field hiding cannot restrict access.

Draft inputs use data-ui-state and distinct data-action identities. Named form fields update the returned draft; opening or typing makes no proposal. Submit prepares an exact records.propose operation and the trusted outer review commits it. Editing and archiving retain the original record version. Parent archive is blocked unless dependent sources/reference/archive fields are fully readable and contain no non-archived references. The backend still rechecks versions, manifest, bindings and current write permission.

The native layout editor reads templateLayoutSchema plus the leading host configuration and persists reviewed heading/layoutProfile only. The gear emits tracker:layout; it is disabled before save. Configuration wins over stale UI state on reopening. The host supports drag and keyboard/touch pick-and-place; Ignore leaves saved state intact. No app-local persistence or standalone layout simulation is used.

The host supplies the official TrialAgents watermark linked to https://platform.trialagents.com. No separate authentication, identity tables or app-level credentials are needed. Optional automations are post-save definitions; none run on app load or navigation. No sandbox/CSP/authorization changes are needed for this package.
