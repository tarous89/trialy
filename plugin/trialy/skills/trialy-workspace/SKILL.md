---
name: trialy-workspace
description: Use when the user opens Trialy or works with its workspaces, data, generated code, saved functions, tools or document sources.
---

# Trialy workspace

Call `open_workspace` when the user opens Trialy and after a successful connection, resuming their original workspace request. Render its interactive view. If authentication is needed, use the host connection flow; never request passwords or tokens in chat. Trialy signup and consent return to the registered host callback.

For a new account, use the view's onboarding to obtain the workspace name and explicit AI-access confirmation. Do not create extra workspaces or silently enable AI access for existing workspaces.

Read and write only through the authenticated tools. Backend permissions apply to every operation. Never route restricted fields through chat, hidden model context or another tool. The current embedded view uses only AI-accessible data; human-only fields are not supported here yet.

For initial setup and changes not covered by an active maintenance scope, create and edit through `prepare_change`. Show the preview and obtain explicit confirmation of that particular change before `commit_change`. A permission to connect or read does not authorize saving an experimental preview. Use `discard_preview` when requested. Report a change as saved only after a committed result. If a save response is interrupted, use `save_status` and the same receipt/idempotency identifiers instead of blindly repeating a write.

Original document storage and extraction are separate. An unavailable or partial extraction is a quiet source-coverage flag, not proof the original is lost. When answering questions, disclose material missing coverage; do not invent content from unextracted documents.

Trialy is not fit for patient-level data. Do not claim regulatory certification, validated electronic signatures, zero-loss production recovery, or complete feature parity. Do not add patient-content screening or quarantine. Keep the user-facing intended-use notice and report actual supported behavior.

The workspace declares host entrypoints and a fullscreen preference. Automatic opening after OAuth depends on the host; never claim this was verified merely because the tool was registered.

Trialy is a foundation, not a catalogue of templates or prescribed workflows. Use `execution_capabilities` before writing code. The pinned JavaScript runtime accepts a function body with `input` and synchronous `tools.call(name, input)`; there are no host files, packages, fetch, credentials or Node globals. Declare only the needed capabilities and table IDs. Use `run_code`, then `inspect_code_run`; queued or computed is not saved. Reuse a requestKey to reconcile a submission, never for changed source/input.

`changes.propose` collects exact record writes. `schema.propose` proposes user-defined schemas/views for explicit confirmation, not standing record-write permission. Review the exact returned proposal in Code & tools. App-only confirmation tools are exposed for user button actions; do not try to invoke them as model tools. Saving a function through `preview_function` and its confirmation creates an immutable source revision, separately from a grant. Invoke an exact revision; use a grantId only when the user has explicitly chosen that already approved scope. Once/future grants bind revision, table destinations and maximum change count. Revoke stops future effects. Scheduling is generic code execution, not a preset business workflow.

Experiments, results and proposals expire after 24 hours and are not authoritative saves. To retain a result, preview saving it as an original file and confirm the file save. Programs can return artifacts as `{artifacts:[{filename,mime,base64}]}` within the output limit. The gateway currently supports Trialy data/schema proposals and a synthetic echo adapter. Do not claim access to other ChatGPT-connected apps, arbitrary external URLs or external side effects. A new provider needs its own server adapter and authorization.

## Projects and approved ongoing maintenance

Use `list_workspace_projects` and `prepare_workspace_change` for folders/projects, moves and renames. Review/save in Projects; do not call app-only confirmation tools from the model. Projects currently require full workspace access and do not yet host arbitrary generated UI components. Do not claim project-specific sharing or a canonical merged database view is complete.

Create a new table only when the requested task involves multiple entries, repeated actions, tracking or expected reuse, including a tracker that starts with one person. Inspect existing schemas and candidates first. Use person/organization identities across tasks and keep project-specific facts separate. Initial table setup uses the existing schema preview and save; then prepare `save_scope` with a project, purpose, inclusion criteria, source policy, exact table/field bindings, allowed additions/updates/identity links and a batch limit. The user reviews and approves this ongoing permission in Projects. Schema expansion requires its own review and renewed scope approval.

When relevant new information arrives, call `list_maintenance_scopes`, inspect candidate records, and apply `maintain_workspace_records` only if the information fits an active scope. Respect purpose and sourcePolicy, not merely matching columns. Include a concise sourceLabel and interpretation explaining eligibility and uncertainty. Do not archive full conversations or fabricate missing facts. No per-record confirmation is needed inside the already approved permission. Never create a scope or broaden fields/sources on the user's behalf without review. Reuse the identical requestKey for a retry; changed content requires a new UUID. A schemaChanged/revoked scope cannot authorize maintenance. Report saved counts only after the returned receipt.

Use `read_record_evidence` to inspect observations and identity links. A reversible identity link marks an alias/preferred record but preserves both source records and all original relationships. Current links are same-table only, explicit stars rather than chains, and do not rewrite existing references or automatically collapse query results. Do not silently replace conflicting facts or infer external-action authority from a match. Unlink through a reviewed proposal to correct a mistaken match.

Only information supplied through authorized tools/work can be maintained; Trialy does not monitor every ChatGPT conversation. Existing workers execute saved functions, but maintenance scopes are not yet wired as scheduled worker programs. Email/calendar adapters remain unavailable.
