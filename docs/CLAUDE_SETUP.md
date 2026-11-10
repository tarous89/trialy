# Claude connection and plugin

Added 10 November 2026 (Europe/Berlin). Claude connects to TrialAgents through its own MCP endpoint and plugin. The ChatGPT endpoint (`/mcp`), plugin package (`plugin/trialy/`) and their behaviour are unchanged.

| | ChatGPT | Claude |
| - | - | - |
| MCP endpoint | `https://platform.trialagents.com/mcp` | `https://platform.trialagents.com/claude/mcp` |
| Sign-in | Optional (guest tools without an account) | Required: unauthenticated requests get HTTP 401 |
| Protected-resource metadata | `/.well-known/oauth-protected-resource/mcp` | `/.well-known/oauth-protected-resource/claude/mcp` |
| Plugin package | `plugin/trialy/` | `plugin/claude/trialagents-platform/` |
| Access principal | `chatgpt` | `claude` |
| Scheduled research | ChatGPT runner (event webhook) | Claude runner (Claude scheduled task, API trigger) |

## How it works

- **Endpoint-bound tokens.** The OAuth `resource` decides the assistant. Tokens issued for `/claude/mcp` are stored with `assistant='claude'` and are rejected on `/mcp`, and ChatGPT tokens are rejected on `/claude/mcp`. Requests without a resource keep the original ChatGPT behaviour.
- **Callbacks.** Claude web, desktop, mobile and Cowork use `https://claude.ai/api/mcp/auth_callback` through dynamic client registration. Claude Code uses a loopback callback (`http://localhost:<port>` or `http://127.0.0.1:<port>`), which registration now accepts. All other callbacks must still be exact HTTPS URLs.
- **Refresh.** Claude refreshes tokens proactively, sometimes twice in parallel. For Claude tokens only, a repeated refresh within 30 seconds returns a new pair instead of revoking the connection. ChatGPT keeps immediate replay revocation.
- **Rate limits.** Claude's traffic arrives from Anthropic's shared egress range (`160.79.104.0/21`), so signed-in requests to `/claude/mcp` are limited per user (240 calls and 10 app creations per minute) with a 3,000-per-minute IP backstop; unauthenticated requests keep the normal IP limit. ChatGPT limits are unchanged.
- **App frame.** Claude does not apply the MCP Apps `frameDomains` policy, so the app frame from `/frontend/frame` is blocked inside Claude ("This content is blocked"). The Claude widget resource (`workspaceResource('claude')`) carries the same frame document as JSON, and the workspace renders it with `srcdoc`. The frame keeps its own CSP (hash-only script, no network) and iframe sandbox. ChatGPT's widget resource is byte-identical to before.
- **Kill switch.** `CLAUDE_MCP_ENABLED=false` removes the Claude endpoint without touching ChatGPT.

No Cloudflare or Render configuration change is needed: the endpoint is served by the existing `trialy-web` service, as the Intel Claude connector already is.

## Plugin behaviour

- One skill, `trialagents` (`/trialagents` in Claude Code), covers using the workspace and building apps; building guidance lives in `references/app-building.md` and loads only when needed.
- On the first TrialAgents request in a conversation, Claude opens the workspace (or the named app) before answering, and every TrialAgents reply ends with an **Open in TrialAgents** link. On the Claude endpoint, `open_workspace` returns `openUrl` for that link; ChatGPT responses are unchanged.

## Access control

Claude is a separate connection next to ChatGPT (migration `057_claude_connection.sql`):

- `workspaces.claude_enabled` and `workspace_access.claude_enabled` switch Claude on or off for an account and per person. Inspectors are always human-only.
- Rules with subject `claude` restrict Claude. A person-level Claude connection rule is a `connection` rule with `field:"claude"`. Like ChatGPT, Claude can only be restricted; it can never be granted more than the signed-in person has.
- The database policy functions (`trialy_security.workspace_permission`, `table_permission`) read `trialy.assistant`, so separation is enforced by row-level security as well as by application code.
- **At migration:** Claude starts with the current AI switch values and a copy of every existing ChatGPT restriction, because the web interface already described those as "ChatGPT or Claude". Owners can then change each assistant separately.
- **New accounts and members:** Claude is enabled whenever ChatGPT access is, including for accounts first created from Claude.
- The web Access page shows both connections. Inside ChatGPT only the ChatGPT connection is shown (as before); inside Claude only the Claude connection.
- The older combined switches (workspace AI access, member "ChatGPT or Claude" column, project, folder and document AI checkboxes) keep governing both assistants, matching their labels.

## Automations

Each assistant has its own runner and owns the automations it created (migration `058_assistant_automations.sql`):

- `automation_runners` is unique per owner, workspace and **assistant**. Web sessions default to the ChatGPT runner, as before.
- `app_monitors.assistant` and `app_actions.assistant` record the owning assistant; all existing rows are ChatGPT's. Research belongs to its runner's assistant. NULL means created on the web without an assistant.
- `app_service_previews.assistant` records who prepared a review. A review prepared in one assistant can be confirmed there or on the web, never in the other assistant (`other_assistant_review`).
- **From an assistant**, the other assistant's automations and runner can be read and **paused**, but not edited, resumed, tested, run or claimed (`other_assistant_automation`, `runner_unavailable`). **On the web**, the owner can manage everything.
- Validation and background execution use the owning assistant's Access rules (`runnerActor`, `asOwner`), so switching Claude off under Access stops Claude's runner and Claude-owned actions without affecting ChatGPT's.

### Claude runner

1. In Claude: "set up automations" → `prepare_automation_setup` → confirm. This creates the Claude runner.
2. `read_automation_setup` returns `nextStep.kind = connect_claude_routine` and a `dispatcherPrompt`. The user creates one scheduled task at [claude.ai/code/routines](https://claude.ai/code/routines): that prompt, only the TrialAgents connector, no schedule needed, plus an **API** trigger. They copy its Fire URL and generate a token.
3. Claude calls `connect_claude_runner` with both. The token is stored encrypted (connector vault) and never returned.
4. TrialAgents fires the task once (`POST …/fire`, `anthropic-beta: experimental-cc-routine-2026-04-01`). The run claims and finishes the verification job; the runner becomes `ready`.
5. Afterwards TrialAgents fires the task whenever Claude-owned work is due. The fire text carries no instructions (Claude treats it as untrusted); the saved prompt fetches work from TrialAgents.

Limits and failure handling: Claude allows 30 API starts per task per hour, so wakes for one runner are spaced at least two minutes apart and coalesced. A rejected token (401/403/404) disconnects the trigger and `read_automation_setup` asks the user to reconnect with a new token. The runner stays live only while the Claude connection (OAuth family) is active, the same rule as ChatGPT. Runs count against the user's Claude plan usage. The `/fire` API is a research preview and may change; its beta header is in `CLAUDE_FIRE_BETA` (`src/automations/events.ts`).

## Personal testing

1. Deploy this branch. Confirm `GET /.well-known/oauth-protected-resource/claude/mcp` returns `resource: https://platform.trialagents.com/claude/mcp`, and an unauthenticated `POST /claude/mcp` returns 401.
2. **Connector only:** in claude.ai, open **Customize > Connectors**, add a custom connector with URL `https://platform.trialagents.com/claude/mcp`, and connect.
3. **Plugin:** zip `plugin/claude/trialagents-platform/` and upload it under **Customize > Plugins > Add > Upload plugin**, then connect its TrialAgents connector from the plugin's Connectors tab. In Claude Code, run `claude --plugin-dir plugin/claude/trialagents-platform`.
4. Run the acceptance list below with a synthetic account, then repeat isolation checks with a second account.

### Acceptance

1. New user: connect from Claude, sign up, approve, return to Claude; `open_workspace` shows the new account.
2. Existing user: same identity and records as in ChatGPT and the web; no duplicate account.
3. Build and save an app from a template; read it back from ChatGPT and the web.
4. Owner switches Claude off under Access: Claude loses access while ChatGPT keeps it, and the reverse.
5. A Claude-only table restriction hides that table in Claude but not in ChatGPT.
6. Set up the Claude runner, connect its scheduled task, and confirm it reaches `ready`; schedule research from Claude and see it run. From ChatGPT, the Claude research shows as Claude's: it can be paused there but not edited or resumed, and the reverse.
7. Claude Code: connect through the loopback callback and read records in text.
8. Reconnect after token expiry; cancel and retry sign-in.

## Directory submission

Submit two listings from the developer portal (claude.ai/directory/manage): the MCP connector (`/claude/mcp`), and the plugin bundle with plugin path `plugin/claude/trialagents-platform`. `claude plugin validate` passes. Before submitting:

- License: `plugin/claude/trialagents-platform/LICENSE` (proprietary, use with TrialAgents only). Privacy policy: `https://trialagents.com/privacy-policy`. `claude plugin validate` reports no findings.
- The repository must be public before the listing goes live (it is). Raise `version` in `plugin.json` with every release.

References: [Claude connector authentication](https://claude.com/docs/connectors/building/authentication), [plugin structure](https://claude.com/docs/plugins/build), [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist), [submit a plugin](https://claude.com/docs/plugins/submit).
