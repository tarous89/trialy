# Biotech Hiring & Resource Management 1.4.2

Six compact screens for biotech and CRO teams below 50 FTE: Team Pulse, Our People, Work Planner, Capacity Outlook, Hiring Needs and What-if Plans. Company activities span discovery, preclinical, CMC, clinical, regulatory, quality, business and operations. One primary title per screen; no welcome banners or duplicate introductions.

The stable catalog ID is `life.hiring-resource-management`; its generated MCP entry is `templates/apps/life.hiring-resource-management-1.4.2.json`. This deliberately preserves the ID inside the supplied 1.4.1 package despite that ZIP's differently named JSON file. The current loader discovers the version automatically after deployment.

## Author and build

Edit `hiring.source.js`, `hiring.css`, `catalog.metadata.json` and the scalar schema example. Run `node scripts/build-hiring-template.mjs` to regenerate the catalog and `hiring.preview.html`; `--check` is included in the production build. Publish later contract changes as a new version; existing saved apps do not silently migrate. The HTML uses fictional `demo_data.json` and local confirmation simulation only, never a production write. Native layout and actual authorization must be tested in the host.

## ChatGPT handoff

Read current template authoring/usage and app-design guidance, then the exact catalog version and digest. Inspect existing authorized schemas. `schema.example.json` defines the five roles, real lowercase field keys/types, required/scalar fields and logical mappings; replace table placeholders with actual saved IDs and schema versions. Every mapped field belongs in bindings and the manifest with approved read/write mode. `tableMap.writableFields` uses logical names, not database keys. Do not seed demo records.

Months (`available_from`, `month`, `target_start`) are scalar `text` in YYYY-MM with valid month 01–12. Narrative fields use `text`. `person_id` and `project_id` are scalar text containing real record UUIDs; they are not relationship arrays. Source resolves names through authorized tables and validates allocation references. Adapting existing relationship/date representations requires an explicit source/schema adapter. All fields are `multiple:false`.

Choose a fixed planning anchor or leave it empty to use the current UTC month. Save once with the same request key and exact review, verify the receipt and saved app ID/version. All account/access controls and the official linked TrialAgents watermark remain host-owned. No independent auth, account tables, ATS, payroll, candidates or patient information.

## Capacity and editing rules

Only Active staff count as baseline supply after their available-from month. Upcoming and Inactive staff contribute zero; hiring scenarios add explicitly hypothetical capacity relative to the configured planning anchor. Allocations contribute committed/tentative demand; placeholders never add supply. For specialty rollups, placeholder labels use `Function — role` with the exact function label.

Read at most 500 rows per role. Restricted/unbound/truncated sources, invalid required values or unresolved allocation identities withhold capacity totals and forecasts. Missing data is never a complete zero dataset. Record tables remain available for authorized correction. The timeline paginates all people and unique placeholders in pages of 25; the assignment register has independent pagination. Manage activities opens an activity register in the same Work Planner screen.

Forms preserve local drafts and the record version seen when the edit started. Submit calls `records.propose`; only the trusted outer confirmation commits. Concurrent edits/archive fail on stale versions. Duplicate creates a new reviewed draft; copied hiring needs reset to Draft. Delete is reviewed `archived:true`, not permanent deletion. Restore through authorized database/history operations.

## Native settings and automation

The gear sends `tracker:layout`. `templateLayoutSchema` declares stable screens/field groups; `layoutProfile` stores reviewed heading/order/visibility. Native Settings supports mouse drag and keyboard/touch pick-and-place, Review/Confirm, Ignore and version checks. Reopening reads saved configuration rather than stale UI state. Layout never changes bindings, access, assets or execution. This uses the shared host support introduced with Cash Runway; no additional host upgrade is required beyond that version.

See `AUTOMATION_RECIPES.md` and catalog `documentation.tasks`. No automation is the default. Save the app first, use the shared research runner and separately approved internal TrialAgents email, preserve stable authoring keys and disabled state, and report definition/readiness/completion separately. Background failure cannot block the app.
