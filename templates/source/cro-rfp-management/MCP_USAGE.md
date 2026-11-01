# MCP installation and ChatGPT instructions

## 1. Select exact version / guidance

Discover the server catalog with `list_app_templates`, read `read_app_template(life.cro-rfp-management, version 1.2.1)`, check the returned digest and read `read_app_template_guidance` for **authoring and usage** at the time of creation, following every `nextOffset`. Check `read_app_design`. The GitHub authoring guide was 1.3.8 when this package was prepared. Do not trust plugin-bundled stale copies over current server guidance.

## 2. Inspect workspace identity and data access

Existing TrialAgents session and owner/project/app/database access only. No app-local authentication. Inspect saved tables, current access and actual field types. Prefer existing authorized Sponsor Organization/Person records, not separate auth/user tables. Create or map five business tables (`bids`, `questions`, `library`, `reviews`, `proposals`), with scalar text UUID references, every field explicitly multiple:false, and lower_snake database keys as specified by schema.example.json. Native relationship arrays require an adapter. **Do not use** fake schema mapping IDs or seed demo data.

## 3. Prepare preview

Pin catalog digest/version and stable requestKey. Attach only authorized `templateBindings` and `tableMap` (real type IDs, logical→real field mappings, writable logical keys) and manifest. The catalog `source` starts with inlined CSS followed by `const templateLayoutSchema={...};` declaration (one JSON line), recognized by the native host. `heading` and JSON-stringified `layoutProfile` remain `templateConfiguration`; all other business data use records bindings. Current saved layout is authoritative on each render. For host settings use gear `tracker:layout`, `prepare_tool_layout(customLayout)` with expected component version and trusted confirmation. No in-frame arrows, no source mutation for layout-only edits.

## 4. Review controls and save

Preview all six screens at 390px, 768px, 1440px, empty/small/long datasets. Test bid dropdown, search/filter, footer pagination, add/edit/duplicate, confirmation then archive, content-library copy, review gates and proposal final approval checks. Ensure no unreviewed outbound sending. After owner approval save **one** app with the same requestKey and verify exact server receipt, app ID, component version and bindings; on ambiguous result reconcile, do not create a duplicate. Reopen in the host and verify native layout persist. Security is at app/database host level.

## 5. Optional automations only after save

Check `read_automation_setup` and `list_app_automations`; use `read_app_automation_guide`. Offer A weekly ChatGPT research, B dependent internal email or C supported scheduled internal reminder, always with explicit owner approval and same stable authoringKey. For ChatGPT use shared runner; for email use TrialAgents service. No ChatGPT email, sponsor sending, external form portal or standalone app accounts. No task setup is required for app function. Do not claim success until the platform confirms enabled/ready separately and a real run is verified.

## 6. Recoverability

If preview fails, use newest authorized saved version or show a clear empty state; no destructive schema recreation. If a record has concurrent edits, deny stale expectedVersion and preserve draft. If a monitor fails, preserve the app and current user input. Report uncertain or incomplete live-host tests rather than claiming deployment.

**Repository paths:** `templates/apps/life.cro-rfp-management-1.2.1.json`; save source/docs under `templates/source/cro-rfp-management/` and use current host catalog loader/build guardrails. Repository publication does not imply a live deployment.
