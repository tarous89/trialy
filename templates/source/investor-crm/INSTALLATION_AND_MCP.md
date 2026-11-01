# Investor CRM — TrialAgents MCP / installation contract

**App 13, `life.investor-crm@1.0.1`**. Target: internal small biotech fundraising team. Never create local authentication, invite controls, billing or a substitute TrialAgents watermark. The platform's official mark and entire wordmark must link to https://platform.trialagents.com.

## 1. Publish catalog, not preview mocks

- Use `templates/source/investor-crm/` for this package's editable source, CSS, metadata, schema, tests, documentation and fictional preview.
- Generate `templates/apps/life.investor-crm-1.0.1.json` from `node scripts/build-investor-template.mjs` from the repository root; verify `node scripts/build-investor-template.mjs --check` does not alter source or outputs. Use a **new** version on future changes; never overwrite one already released.
- Verify the full catalog with current `src/workspace/app-templates.ts`: each JSON must parse with the actual schema, be at most 300,000 bytes, have source at most 180,000 characters, `instructions` at most 20,000, prose at most 6,000, up to five documentation examples, and all `documentation.tasks` fields including `promptExample`.
- The generated catalog source begins with `const templateLayoutSchema={...};` and **does not declare** `templateConfiguration` or `templateBindings`. The TrialAgents preparation host injects those itself exactly once. The standalone preview passes them as function arguments; it is not publisher evidence.
- Publish the catalog with the normal repository build/deploy. Confirm discovery, exact version, SHA-256 digest, preparation, initial render and reopened same app. A ZIP is not itself a registered MCP catalog entry.

## 2. Data schema and binding order

Only create/extend data types after the owner reviews the actual existing workspace. Prefer existing authorized Organization and Person identities if they are semantically compatible. If needed, use the eight role definitions in `schema.example.json` and the full MCP `documentation.dataContract`:

1. **rounds**: round name, positive optional target (money), currency (select), status (select), close date, owner, notes, archived.
2. **investors**: fund name/type, geography, focus, stage focus, ticket min/max (money) + ticket currency, professional website/source/verification, owner, notes, archived.
3. **contacts**: contact name, `investor_id` scalar text holding one saved investor record UUID, title, channel, professional email/profile, notes, archived.
4. **opportunities**: one investor ID + round ID, stage, indicative/committed amounts (money), Signed/Verbal/None evidence, currency, signed date/reference, owner, next step/date, priority, archived.
5. **interactions**: opportunity ID and optional contact ID, date, channel, outcome, summary, source, owner, archived.
6. **tasks**: opportunity ID, name, owner, due date, Open/Done/Cancelled, outcome, archived.
7. **briefs**: saved sector/geography/stage/ticket/exclusion research definition, owner, notes, archived.
8. **findings**: brief ID and optional investor ID, topic, observed date, source URL (text; must be HTTPS), relevance, Candidate/Approved/Excluded, archived.

**Field contract:** `multiple:false` for every field; real physical keys match `^[a-z][a-z0-9_]{0,63}$`. `source_url`, `linkedin`, `website` and longer notes are **text**, not a new `url`/`longtext` DB kind. Relationship fields are scalar text with real saved UUIDs; no arrays or serialized objects. Scalar display names do **not** substitute for record IDs. Value enums exactly match the full schema. `archived:boolean` defaults false.

**Save order:** rounds and investor funds → save/verify IDs → contacts and opportunities → interactions/tasks and research briefs → findings referencing saved briefs/funds. Don't create an app-specific user, account, access or login table. No fictional records go into customer workspace.

Configure `defaults.tableMap` using authorized actual IDs/fields (pseudocode only, never copy placeholder IDs):

```json
{
  "rounds": {"typeId": "<approved UUID>", "fields": {"name":"name", "target_amount":"target_amount", "currency":"currency", "status":"status", "expected_close":"expected_close", "archived":"archived"}, "writableFields":["name","target_amount","currency","status","expected_close","archived"]},
  "investors": {"typeId": "<approved UUID>", "fields": {"name":"name", "kind":"kind", "geography":"geography", "focus":"focus", "currency":"currency", "archived":"archived"}, "writableFields":["name","kind","geography","focus","currency","archived"]}
}
```

**Important:** The sample above is partial: the real configuration requires all eight roles and *every* consumed field declared in `schema.example.json`, with actual verified read/write manifest entries and schema versions. The `writableFields` list uses logical role keys, not a general grant. Missing mappings prevent complete source reads and some actions. Do not widen app or table access to make a preview pass.

## 3. Prepare, preview, save, revise

1. Read `read_app_template_guidance` authoring and usage fully (follow `nextOffset`) and `read_app_design`. Read exact `read_app_template` version/digest. Inspect the workspace schema and current account/app policy first.
2. Prepare with `prepare_app_from_template` using exact template ID/version/digest, real tableMap, authorized bindings/manifest, owner-reviewed project/name and one idempotent requestKey. Host preparation must prepend its injected `templateConfiguration`/`templateBindings` exactly once; do not insert them into catalog source.
3. Run representative empty/small/paged/inaccessible frames in **production QuickJS** and sanitizer with the verified manifest attached. Check `data-ui-state` on transient input, select, textarea; `input.event.kind/action/value/form` submit; keep drafts when the host rejects a proposal.
4. Verify genuine reviewed proposal/confirmation receipts. Editing and archive use the record **version captured on opening**, not a fresh version from submit. Duplicate an opportunity must reset Signed stage/amount/date/reference and requires a unique investor/round pairing.
5. After approval, save and reopen the **same app ID**, reconcile save receipts and updates with expectedVersion. Never create a replacement because the first save reply was ambiguous.
6. Test Settings gear (`data-action="tracker:layout"`). Confirm native `prepare_tool_layout` with `customLayout` writes the host's `layoutProfile`, not records/manifests. Reorder screen and columns with pointer/keyboard, check visibility, Ignore and reload. Hidden columns remain in the full record drawer.
7. Inspect desktop/tablet/mobile with the design inspector and real host frame (320, 390, 768, 1100, 1440px). The official linked TrialAgents watermark is **host-supplied** and absent from self-contained demo HTML.

## 4. Optional automation handoff (never required)

Call the current `read_automation_setup` and `read_app_automation_guide` before suggesting any task. After app save, the user can separately approve `prepare_app_monitoring` for weekly ChatGPT public investor-signal research and `prepare_app_action` for a dependent *internal-only* email notification. Reuse stable `authoringKey` and existing definition IDs on edits; preserve Disabled state. Do not create standalone ChatGPT Tasks, email using ChatGPT, invent model/runner activation, or send anything to professional contact addresses stored in the app. All scheduling, timezone, scopes, dedupe, expiry, limits, review and receipts are backend-owned. No automation path must work fully.

## 5. Safety and acceptance

No cross-currency aggregation or probabilistic "weighted pipeline" disguised as raised cash. Only verified Signed evidence + stage + amount + date counts; cutoff and target missing suppress percent. Confirm complete authorized source coverage before claiming funding totals or parent archive safety. Source errors and permission changes cannot become zero or healthy. Investor/contact/prospect sources have freshness and provenance, not synthetic credibility scores. Every mutation is governed by TrialAgents server. This app does not implement regulated securities solicitation, bank accounting or signed legal documents.

Publication, deployed catalog availability, saved app receipt, host runtime readiness and automation/email delivery are separate outcomes. Do not assert any without actual evidence.
