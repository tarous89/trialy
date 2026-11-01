# Installation and MCP handoff — Inventory Management 1.0.2

## Recommended repository arrangement

- **Catalog:** `templates/apps/life.inventory-management-1.0.2.json` (from root of ZIP).
- **Editable source:** `templates/source/inventory-management/inventory.source.js`, `inventory.css`, `catalog.metadata.json`, `schema.example.json`, `layout.schema.json`, `AUTOMATION_RECIPES.md`, `README.md`, and test files.
- **Builder:** `scripts/build-inventory-template.mjs` generates the catalog and review HTML; run `node scripts/build-inventory-template.mjs --check` from the repository root to verify reproducible outputs before repository publication. Do not edit old immutable catalog versions; publish a new semantic version when changed.

The MCP server serves the catalog under its existing `list_app_templates` and `read_app_template` workflow. This package is **not** a connector or running service. Adding files to a local ZIP does not register or deploy an MCP catalog entry. Commit, run the repository's catalog validation/build and deploy the existing TrialAgents service by the usual pipeline after owner approval. Keep app records and existing platform permissions unchanged.

## Prepare an actual app via ChatGPT

1. Read current `read_app_template_guidance(resource:"authoring")` and `read_app_template_guidance(resource:"usage")`, following all pages, plus `read_app_design` and the exact current template version/digest. Check the saved TrialAgents workspace and app restrictions. The app uses existing TrialAgents authentication and official **linked platform watermark**; never inject a duplicate logo or new app account.
2. Inspect the complete `documentation.dataContract` in the MCP catalog and the owner's authorized tables. `schema.example.json` is additional maintainer evidence, not a requirement for MCP consumers. Reuse permitted types where exact schemas and meaning fit; otherwise prepare **reviewed** new scalar types for `items`, `lots`, `movements`, `locations`, `requests`. No patient-level table or external identity store. Use physical lowercase field keys: item identifier `sku`, `item_id`, `lot_id`, `location_id`, `from_location_id`, `to_location_id`, `request_id`, `reversal_of`, etc.; use `text` for all these ID references. `status` and `kind` are scalar `select`. Numeric quantity may be fractional, and must be nonnegative.
3. For each role create a tableMap entry with exact authorized type UUID, a `fields` object from logical keys to physical keys, and `writableFields` listing authorized **logical** keys only (not source IDs). Example skeleton (NOT valid without real owner-approved IDs):

```json
{
  "items": {"typeId": "REPLACE_WITH_AUTHORIZED_UUID", "fields": {"name": "name", "sku": "sku", "category": "category", "unit": "unit", "reorder_point": "reorder_point", "target_level": "target_level", "supplier": "supplier", "lead_days": "lead_days", "owner": "owner", "notes": "notes", "archived": "archived"}, "writableFields": ["name", "sku", "category", "unit", "reorder_point", "target_level", "supplier", "lead_days", "owner", "notes", "archived"]}
}
```

**Do not save the placeholder.** Include all five actual roles. Map every displayed field to an authorized manifest read grant with real schema version/kind, and authorized write fields where appropriate. Custom `frontend-js` screens have one enforced **app-level** access boundary; hidden tabs/fields never grant or narrow privileges. Use the existing database Access page for sensitive stores.
4. Decide the item unit, minima and targets; create storage locations and nonhuman lots. **Seed stock only by reviewed Receipt movements**, not by editing item/lot quantities. The template never seeds its `demo_data.json` into actual data.
5. Prepare and preview one app using a stable exact requestKey. Check all six views, 25-row pagination, empty and long values, unit mismatch, negative stock attempt, request approval, default restrictions and expired lot handling. Save only after human review, verify actual component ID/version/authorizations and reopen.
6. The Settings gear is `tracker:layout`, parsed from the **leading one-line literal** `templateLayoutSchema`. The trusted host handles native drag/drop plus keyboard/touch source/target. Its `prepare_tool_layout` `customLayout` proposal must include exact component ID/version and only `heading,tabs,cols,visible`. Confirm separately via normal platform review. Check a refresh/reopen preserves the new layout, and an Ignore leaves published layout unchanged. This is **not** an independent app-local settings engine.
7. Optional automations: after saved app confirmation, read `read_automation_setup`, `read_app_automation_guide`, `list_app_automations` (and definition details if present), then prepare **one** owner-approved weekly `prepare_app_monitoring` research definition using the shared runner. Separately and only if opted into, prepare `prepare_app_action` for a dependent after-success TrialAgents email; no standalone email schedule, no ChatGPT email, no per-app ChatGPT Task. Owner is default recipient; extra recipients must be existing authorized TrialAgents team members. Never invent a report table if none exists; draft manually for review and do not claim saved completion. On no_update/partial/blocked, do not mail unless another specific reviewed rule explicitly states otherwise.
8. Verify separately: app saved, access inherited/configured, automation definition saved/Enabled or Disabled, runner readiness, first real successful run, server-authored completed-at timestamp, saved change receipts, email delivery. Logs contain outcomes; a failed scheduler never blocks app records.

## Stock controls that must remain atomic in concept

- One posted movement is a distinct immutable, versioned database record. Transfer has two ledger effects **within that one movement record**, not two unrelated edits. Use a fully authorized and stable event ID to avoid duplicate posting on retries.
- Archive stock item, active lot and location only if complete ledger and safety checks permit it; never erase posted movements. Reversal is a new `Correction In/Out` or reverse Transfer linked through `reversal_of`; original remains. A true permanent Delete requires a separate trusted platform feature and should not be simulated.
- Recipients in purchasing records are business assignees, not new login identities or automatically authorized email addresses.
- Physical units are fixed per item once movement history exists. If unit conversions or fractional packaging are required, introduce reviewed explicit conversion source and version separately; do not silently convert.

## Explicit unsupported work

No account/login screen, supplier purchasing, bank/payment integration, barcode scanning, SDS compliance, human biospecimen/LIMS/GMP handling or unlimited client-side movement computation is included. **Never infer a production approval from the local preview.** The full host tests and publication must be performed separately.

## Host acceptance requirements (guidance 1.3.9)

Do not treat an offline simulation as a real frame test. The production team must (a) validate the full catalog including all other entries, (b) discover/read this exact version and digest via live MCP, (c) prepare it through AppTemplates.operation with host-injected config/bindings, (d) run prepared source in real QuickJS and the sanitizer with a permission manifest and mocked denied/partial sources, (e) test text/select/date/number/textarea events and exact reviewed DB writes with concurrent versions, (f) test native Layout gear + customLayout save/Ignore/reopen using actual component version, (g) run the design inspector at 320,390,768,1100,1440 px, (h) test real disabled and optional automation flows. A valid ZIP alone does not register a catalog version or satisfy those gates. See `QA.md` for actual verification scope.

## Atomic stock posting and date semantics
 Posting requires scalar lots.stock_revision (number, multiple:false, required, initial 0) mapped and writable in the manifest. The counter is managed by the app. Each movement atomically batches a version-checked lot counter increment and one immutable create. A stale confirmation must be discarded and re-prepared after rereading; never remove the counter update or retry only the create. Reconfirm the same preview ID/digest after an ambiguous response; reconcile receipts before re-preparing. Direct Database edits are independent and do not enforce inventory invariants; reserve movement writes to this app workflow. Date-only stock is an end-of-day balance: sum all same-day effects before checking nonnegative daily closing balances; intraday sequence is not represented.
