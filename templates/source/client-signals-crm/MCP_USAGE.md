# MCP catalog and setup handoff

**Catalog ID:** `life.client-signals-crm` · **Version:** `1.0.1` · **Engine:** `frontend-js`. The JSON metadata follows the strict `src/workspace/app-templates.ts` entry schema and authoring guidance 1.3.9. The `source` field deliberately excludes `templateConfiguration` and `templateBindings`; the host prepends these on preparation.

## ChatGPT creation steps

1. Read the live `read_app_template_guidance` usage/authoring resources, follow pagination to the end, then discover/read this exact catalog version and SHA digest.
2. Inspect workspace tables and permissions. Prefer reuse of valid scalar company, professional contact and opportunity tables, but do not attach unrelated business data or invent permissions. Consult `DATA_CONTRACT.md` or preferably the **full catalog `documentation.dataContract` and `instructions`**, which are available without accessing these ZIP documents.
3. Create each missing role through the real reviewed table/field path. Every field is scalar with `multiple:false` and required options. Save parent companies first. Copy actual returned `id` receipts into children. If rights are unavailable, stop with an honest setup limitation.
4. Build `configuration.tableMap` JSON from **real authorized UUID typeIds** and actual field keys, for every role, following the shape:

   ```json
   {"companies":{"typeId":"<host UUID>","fields":{"name":"name","website":"website","focus":"focus","verifiedAt":"verified_at"},"writableFields":["name","website","focus","verifiedAt"]}}
   ```

   The shown object is partial notation; populate all required mappings for the role and only legitimate grants. For actual UI, `templateBindings` lists each permitted table UUID and accessible physical field keys. Do not use demo role names as production IDs.
5. Set `heading`, `layoutProfile`, `pageSize`, `readOnly`, and a verified `asOf` cutoff if recent or overdue measures are required. `asOf` may be blank; then the app withholds those measures.
6. Prepare the template **with `prepare_app_from_template` (server `AppTemplates.operation`)**, respecting the exact digest/version and host manifest. Review/save the app under existing TrialAgents permissions. Use native Layout for supported screen/column ordering.
7. Optionally offer a ChatGPT research automation only when expressly requested and after save. Read the live automation guide, prepare via host automation tools, verify status/run receipts. Manual app operation must remain unaffected by any automation refusal or failure.

## Only host-supported capabilities

`records.read` is used for bounded authorized tables; `records.propose` submits reviewed changes. `tracker:layout` invokes native layout. No direct database writes, platform user management, portal submission, email provider API or task scheduler are embedded in the source. All seven screen content areas are one component governed by inherited app access. Optional section-level restrictions must be implemented/enforced by the **platform**, never CSS hiding.

## Release and operational boundaries

Canonical inputs are in `templates/source/client-signals-crm/`. Build with `node scripts/build-client-signals-template.mjs`; the generated entry is `templates/apps/life.client-signals-crm-1.0.1.json`. `--check` verifies exact generated catalog/preview output and is part of the root build. See `QA.md` for real schema, QuickJS, reviewed database, production frame and native layout acceptance.

Analytics read at most 400 records per role. Each screen offers Browse full registers with independent unfiltered backend pages; relevant registers also open automatically when coverage is incomplete. Protected changes need complete validation sources and explain when they are blocked. Unknown source totals are never zero. No backend aggregate or transactional cross-record guarantee is implied.

For installation, use one stable requestKey and exact catalog version/digest, reconcile receipts after interruption, and revise the same saved app identity. Updates/archive use `recordId` and original `expectedVersion`. Review preserves draft and archive state; only a confirmed receipt is a save. Required and hidden editor fields remain reachable; unwritable controls are disabled.

After repository deployment, verify live `list_app_templates`/`read_app_template` discovery independently. Customer workspace setup, access, saved app receipts, runner readiness, actual run and delivery are distinct outcomes. No automation is activated by publication. Existing saved apps are not automatically migrated.

 Host schema translation: logical long and ref are both kind:text (refs hold one saved UUID); use kind:text for URLs/email/narrative, kind:number/date/boolean/select as listed, multiple:false for every field, required:true only where marked, and options:[exact listed strings] for select. Physical keys convert camelCase to snake_case (companyId -> company_id); tableMap maps every logical field to its actual authorized physical key. Example field: {"key":"company_id","name":"Company","kind":"text","multiple":false,"required":true,"ai":true}. Required values cannot be null/blank. Optional blank text/date/reference/select/number values save as null; numbers stay numeric and boolean controls save true/false. A null optOut is unknown, never consent; outreach is not supported. Preserve original host versions, including zero.
 Before any edit to a signal referenced by a reviewed briefing, return the linked briefing to Draft. Signals referenced by any active briefing cannot be archived. After independent database changes or incomplete access, current evidence/version checks label stale reviewed briefs Needs evidence review; reconcile source IDs/versions and obtain fresh review. These are app safeguards, not database-wide foreign-key or transactional dependency constraints.
