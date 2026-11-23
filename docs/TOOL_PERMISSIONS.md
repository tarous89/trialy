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

## Step 2, done (runner part of the original step 6): one runner write

Prompts appear for tools that are called, not for tools that are listed. After step 1 the everyday flows (opening the
workspace or an app, building and editing apps, every preview) call no write tool. What remains is saves: data saves
(`commit_change`), automation confirmation (`confirm_app_service_review`, `connect_claude_runner`) and the background
runner. The runner called three write tools per job; it now calls one, `automation_work` with `action` claim, checkpoint
or finish. Each action is validated against the exact input of its single-purpose tool, and a field from another action
is refused. The Claude and ChatGPT runner instructions and `SHARED_AUTOMATIONS.md` (guide 1.6.0) use it.
`claim_automation_work`, `checkpoint_automation_work` and `finish_automation_work` stay, unchanged, for scheduled tasks
created before this change: their saved instructions name those tools.

Not done, on purpose: hiding the code lab from Claude and removing legacy tools. They are rarely or never called, so
they cause almost no prompts, and hiding the code lab would remove a capability.

## Next steps

1. **Saves through the approval footer.** Make `confirm_workspace_change`, `confirm_execution_control`,
   `confirm_code_changes`, `confirm_function`, `confirm_execution_grant`, `confirm_code_schedule`,
   `confirm_app_service_review` and `migrate_legacy_monitor` app-only, as `approve_workspace_change` already is. This needs
   a new screen first: the footer only shows app changes today, so workspace setup changes, code-lab reviews and
   automation reviews that the assistant prepared have no place where the person sees and approves them, in the
   extension or on the website. Build a general "waiting for your approval" card (exact details, Approve/Decline) in the
   footer and on the website, then hide the tools and update the guides, skills and tests.
2. **Data saves stay with the assistant.** Access decides what the assistant may change, so `commit_change` stays callable
   by the model; optionally merge it with `maintain_workspace_records` and writing `invoke_function` into one
   `apply_change`, so a host approves one data tool.
3. **App-only writes.** Check in both hosts whether calls from the app frame prompt; `set_app_context` and
   `run_component_frontend` only change what is on screen and can be read-only.

Floor: no prompts for reads, previews, opening views and app changes; one approved tool for data changes the person
allowed under Access; one for the background runner.
