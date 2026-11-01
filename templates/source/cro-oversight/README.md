# CRO Oversight 1.2.1

Six sponsor oversight screens for small biotech/CRO teams: Overview, Work packages, Scorecard, Issue management, Meetings & actions and Reports. Internal TrialAgents account, database access and Logs remain authoritative. No app-level login, accounts or external CTMS connection; the host supplies the official watermark linked to https://platform.trialagents.com.

## Source and deterministic build

Edit `source.js`, `style.css`, `catalog.metadata.json` and the schema contract. Run `node scripts/build-cro-template.mjs` to regenerate `templates/apps/life.cro-oversight-1.2.1.json` and `preview.html`; `--check` detects drift. The catalog loader discovers this stable ID/version after deployment. New published changes need a new version; existing saved apps do not silently migrate.

`demo_data.json` and the standalone preview use fictional data only. The preview simulates reviewed changes in memory; it does not authorize database writes or save native layouts. Never seed these records during installation.

## ChatGPT handoff

Read current template usage/authoring and app-design guidance, then the exact catalog version/digest. Inspect actual workspace schemas before proposing tables. `schema.example.json` supplies platform-valid fields, required values and logical mappings for six roles. `schema_mapping.example.json` demonstrates the tableMap shape; replace all table placeholders with actual saved IDs. Bind every mapped field with its actual schema version and permitted manifest mode. `writableFields` contains logical names.

Every mapped field is explicitly `multiple:false`. `project_id` is scalar `text` containing a saved engagement record UUID, never a label or relationship array. Use `select` for choices, `date` for dates, `number` for observations and `text` for references/narratives. Existing relationship/multiple-value fields require an explicit adapter. `projects` means engagement records, not workspace project IDs. No patient or safety-case records belong in this operational app.

Configure `asOf` only for a fixed reporting cutoff; empty uses the current UTC day. Save once using the same request key and exact review, verify receipt and saved ID/version, and revise the same app. Lost responses require receipt reconciliation. All mandatory setup, lifecycle and optional automation instructions are embedded in the MCP-served catalog; companion files expand them.

## Integrity and interaction

Form controls preserve drafts using named form values and unique draft actions. Submit produces `records.propose`; the trusted outer review commits it. Edit and archive retain the original record version. Duplicate creates a reviewed new record and clears acceptance/closure as appropriate. Archive is reversible `archived:true`; no physical deletion. Engagement archive requires all child sources and reference/archive fields to be readable and complete, with no visible live children. Scalar reference checks are application checks, not database foreign-key constraints; shared-table changes must follow the same reviewed workflow.

Reads are bounded at 800 records per role. Missing, denied, unknown-total, short and truncated sources stay incomplete. Review coverage before interpreting source summaries. Dates must be real calendar dates; acceptance and sponsor closure cannot be future-dated. KPI direction and missing observations remain explicit. Engagement selection updates summaries in the same render.

The settings gear emits `tracker:layout`. The leading `templateLayoutSchema` and saved `layoutProfile` use the existing native host drag and keyboard/touch controls. Review/Confirm saves presentation only; Ignore changes nothing. Saved configuration is reread on every render. Hiding fields/screens never grants or restricts database access.

## Optional automation and validation

No automation is the default. See `AUTOMATION_RECIPES.md` and catalog `documentation.tasks` for shared-runner research, a separately approved completion email, explicit write scope/expiry, stable authoring keys and no-result/partial handling. Inspect current schemas instead of assuming conceptual email placeholders or compound triggers work. Preserve disabled state and report definition state, runner readiness and verified completion separately.

See `QA_AND_ACCEPTANCE.md` for release checks. Repository publication does not verify live deployment, a connected ChatGPT account, runner activation or email delivery.
