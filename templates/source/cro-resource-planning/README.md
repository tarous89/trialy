# CRO Resource Planning 1.0.2

Five screens for CRO teams below 50 FTE: Delivery pulse, Team schedule, Project demand, People & skills and Capacity outlook. The package uses TrialAgents accounts, authorization, reviewed writes and Logs. No app-level auth or external service is required. The host supplies the official linked watermark; the sidebar has the app name without a fabricated logo.

## Author and build

Edit `cro.source.js`, `cro.css` and `catalog.metadata.json`, then run `node scripts/build-resource-template.mjs`. The build regenerates `templates/apps/life.cro-resource-planning-1.0.2.json` and `cro.preview.html`; `--check` detects drift in the production build. Catalog source must not declare `templateConfiguration` or `templateBindings`: the host adds them. The preview uses fictional `demo_data.json`, local-only confirmation and no real database writes. Layout persistence is verified in the native host, not simulated by preview arrows or an app-local store.

## ChatGPT installation

Read current authoring, usage and design guidance and the exact catalog version/digest. Inspect current authorized schemas. `schema.example.json` specifies real lowercase keys, required fields and all five logical mappings. Every field is explicitly `multiple:false`. All mappings belong in authorized bindings and the versioned manifest with actual table IDs, field keys, schema versions and read/write modes. `writableFields` contains logical names.

References `person_id` and `project_id` are scalar text containing actual saved record UUIDs; they are not relationship arrays or workspace project IDs. Monday fields are `text` with real YYYY-MM-DD Monday dates, choices are `select`, hours are `number` and archived is `boolean`. Adapting an existing multi-value or relationship schema requires an explicit source adapter. Never seed example records. Empty `startWeek` uses the current UTC Monday; choose a fixed Monday for a reproducible plan.

Save once with a stable request key and exact review. Verify saved ID/version/receipt; on ambiguous responses reconcile the receipt instead of creating another app. Revise the same saved app and preserve bindings, access, assets, execution and disabled automation state. The complete required handoff is also included in the MCP-served catalog documentation.

## Data and interaction integrity

Only Active staff supply capacity after available_from; approved unavailable hours reduce it. Confirmed and tentative bookings remain distinct. Only Approved needs on Active projects contribute firm gaps, and matching confirmed booking hours count once across duplicate requirements. Coverage describes booked role hours; overbooking is flagged separately, so fully booked demand is not proof that staff have spare capacity.

Reads stop at 800 rows per role. Denied, missing, unknown-total, short or truncated reads remain incomplete. Missing required values, invalid Mondays and unresolved references withhold summaries, retaining correction registers. A complete empty dataset is distinct from unavailable data.

Schedule lanes paginate 20 specialists independently of booking tables. Client coverage cards paginate 12 projects. Manage projects opens a searchable register for all statuses with Edit, Duplicate and Archive. Each record table has its own page state. All fetched specialists and projects remain reachable.

Forms preserve drafts and original edit/archive versions. Submit prepares records.propose only; trusted outer confirmation commits the exact change. Duplicates reset to tentative/draft/inactive as appropriate. Archive is reversible, never physical deletion. A project or specialist cannot be archived while non-archived child records reference it, or while the necessary child sources/reference/archive fields cannot be read completely. Reassign or archive children first. These scalar reference checks are app checks, not database foreign-key constraints; direct database work must maintain the same integrity.

Native Settings reads templateLayoutSchema and layoutProfile; the gear emits tracker:layout. Screen/field order, visibility and heading use reviewed versioned updates and saved configuration on every render. Ignore leaves saved layout unchanged. Visibility never changes authorization.

## Optional automation

No automation is the default. The normal weekly review returns a draft to the owner without writing records or sending email. If persistence is requested, separately review the optional `automation.schema.example.json` brief table, add its actual bindings/manifest fields to the same app, and approve any reports-only ongoing write scope and expiry. The template still has five screens; briefs can be reviewed through the platform database.

Research writes Draft only. Email is optional and triggered by the owner's explicit Draft-to-Approved brief status transition. It is not an automatic email after drafting. See `AUTOMATION_RECIPES.md` and catalog tasks for stable identities, read coverage, receipt checks, supported message text, no-result handling and disabled-state preservation.

See `QA_AND_ACCEPTANCE.md` for validation. A repository commit does not verify live deployment or activate a connected account, runner or email delivery.
