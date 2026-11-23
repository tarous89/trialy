# Tool permissions (23 November 2026)

Goal: Claude and ChatGPT ask the person to approve a TrialAgents call only where that call itself saves, sends or
deletes something the person keeps. TrialAgents already enforces its own approvals (the approval footer for app
changes, Access for data), so a host prompt anywhere else is redundant.

## Host rules

- **Claude**: tools are grouped by `readOnlyHint` into read-only and write/delete; each tool is Always allow, Needs
  approval or Blocked, and admins on Team/Enterprise can fix the setting for everyone. Every distinct write tool is its
  own prompt until it is always allowed. Open Claude bug: read-only tools on custom connectors offer only "Allow once"
  since about 30 October 2026 (anthropics/claude-ai-mcp#1223); nothing on our side fixes that.
- **ChatGPT**: tools without `readOnlyHint:true` ask for confirmation; `destructiveHint:true` asks more firmly;
  `openWorldHint:true` marks a call as reaching outside the account. Previews and computation that change nothing
  should be read-only (Apps SDK submission guidelines).
- **MCP Apps**: `visibility:["app"]` hides a tool from the model; the app calls it on the person's click. The spec does
  not require a host prompt for those calls.

## Step 1, done: annotation policy

`src/server/tool-annotations.ts` corrects the hints in one place for every tool registered on the MCP server
(`tests/tool-annotations.test.ts` keeps it in step with the tool list):

- Opening a view, setting up the caller's own account and creating, marking or discarding the assistant's own unsaved
  preview are read-only (`open_workspace`, `initialize_account`, every `prepare_*`/`preview_*`/`discard_*` preview,
  `begin_app_update`, `finalize_app_preview`).
- `cancel_code_run`, `pause_code_schedule` and `move_tool` are not destructive.
- `confirm_app_service_review` and `connect_claude_runner` stay inside the account (`openWorldHint:false`).

Result: write tools the model can call went from 44 to 24 (Claude) and 43 to 23 (ChatGPT); open-world tools from 2 to 0.

## Next steps

1. **Saves through the approval footer.** Make `commit_change`, `confirm_workspace_change`, `confirm_execution_control`,
   `confirm_code_changes`, `confirm_function`, `confirm_execution_grant`, `confirm_code_schedule`,
   `confirm_app_service_review` and `migrate_legacy_monitor` app-only, as `approve_workspace_change` already is: the
   assistant prepares, the person approves in the footer (or on the website where the host shows no extension).
2. **One write for changes Access already allows.** Merge `commit_change`, `maintain_workspace_records` and writing
   `invoke_function` into one `apply_change` that only succeeds when Access permits it without review: one
   "Always allow" in Claude, one remembered confirmation in ChatGPT.
3. **Fewer distinct writes.** One tool for the Claude runner (`claim_`/`checkpoint_`/`finish_automation_work`,
   `connect_claude_runner`); the code lab (`run_code`, `cancel_code_run`, `invoke_function`, `pause_code_schedule`)
   off the Claude endpoint by default; legacy `create_initial_workspace`, `prepare_tool_layout`,
   `prepare_tool_template` and `migrate_legacy_monitor` removed from Claude.
4. **App-only writes.** Check in both hosts whether calls from the app frame prompt; `set_app_context` and
   `run_component_frontend` only change what is on screen and can be read-only (after Loading speed L2 merges, which
   edits their registrations).

Floor: no prompts for reads, previews, opening views and app changes; one approved write tool for data changes the
person allowed under Access.
