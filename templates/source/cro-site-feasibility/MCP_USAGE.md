# ChatGPT handoff — TrialAgents MCP catalog

**Catalog ID:** `life.cro-site-feasibility` **Version:** `1.2.1` **Engine:** `frontend-js`.

1. `read_app_template_guidance(resource:"authoring")` and `resource:"usage"` to completion; inspect `read_app_design`, then `list_app_templates`, `read_app_template` to pin digest/version. Do not treat this ZIP as an installed catalog artifact.
2. Inspect authorized workspace, app access, record schema and existing institution master. Select one sponsor/data permission boundary. Never reuse another sponsor's private study response just because an institution ID matches.
3. Create/reuse six scalar tables with reviewed schema `text`, `select`, `date`, `number`, `boolean`. Set every field multiple:false and use scalar text UUID references. Use `schema.example.json` and `schema_mapping.example.json` as exact schema/mapping checklists, **not production IDs**. Map source logical camelCase keys (`projectId`, `siteId`, `evidenceDate`, etc.) to real lowercase snake_case fields. Use only approved data source manifests and `templateBindings` with exact field types/schemaVersion and restricted write list.
4. Configuration: `heading:"Site Feasibility"`, `sponsorScope:<approved sponsor name>`, `pageSize:25`, `layoutProfile:"{}"`, `tableMap` JSON as above, `readOnly:false`; `asOf` blank in live mode, `demoLabel:false` always. No patient data. No app login, accounts, email source or extra logo.
5. Preview in live QuickJS sanitized host with empty, read-only, revoked, >800, complete and partial research records; confirm all six screens. Approve/snapshot schema and source once; save with one idempotent requestKey and verify actual app ID and component version. Never seed `demo_data.json` into production.
6. The gear emits `tracker:layout`. Native `prepare_tool_layout` `customLayout` uses the existing app component ID, expected version, stable `templateLayoutSchema` screen/field IDs and reviewed confirmation. It changes presentation (`layoutProfile`) only, not database permissions or source. Retest after refresh/reopen.
7. Optional ongoing processing only **after the app is saved and the owner approves**: check `read_automation_setup`, `list_app_automations`, `read_app_automation_guide`, and the existing app-bound grants. `prepare_app_monitoring` configures shared ChatGPT research, `prepare_app_action` configures internal TrialAgents email. Do not create a separate ChatGPT Task per app, do not send email from HTML/ChatGPT, do not make external site invitations, and do not auto-enable copied definitions. Leave both absent for the no-automation path.
8. Revisions use the original saved ID and expectedVersion. Reconcile uncertain receipt before retry. Disable/enable state remains unchanged on edit; archive suspends automation and restore never resumes automatically.

## Host layout declaration

The source contains a **single line** `const templateLayoutSchema={screens:[{id,label}],groups:{role:[{id,label}]}};`. Navigation and field visibility derive from `templateConfiguration.layoutProfile` on **every** render, not from outdated local state. No up/down reorder controls exist in the app. Drag is managed by trusted TrialAgents Settings, not custom iframe DOM/JS.

## Difference between supported previews

`preview.html` is a self-contained fictional browser harness. Its local confirmation simulates review only. `life.cro-site-feasibility-1.2.1.json` contains production source meant to be served via MCP **after** owner-reviewed repository publication. Neither file creates a real TrialAgents app or automation automatically.
