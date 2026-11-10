# Claude connection and plugin

Added 10 November 2026 (Europe/Berlin). Claude connects to TrialAgents through its own MCP endpoint and plugin. The ChatGPT endpoint (`/mcp`), plugin package (`plugin/trialy/`) and their behaviour are unchanged.

| | ChatGPT | Claude |
| - | - | - |
| MCP endpoint | `https://platform.trialagents.com/mcp` | `https://platform.trialagents.com/claude/mcp` |
| Sign-in | Optional (guest tools without an account) | Required: unauthenticated requests get HTTP 401 |
| Protected-resource metadata | `/.well-known/oauth-protected-resource/mcp` | `/.well-known/oauth-protected-resource/claude/mcp` |
| Plugin package | `plugin/trialy/` | `plugin/claude/trialagents-platform/` |
| Access principal | `chatgpt` | `claude` |
| Scheduled research | ChatGPT runner | Read-only (no Claude runner yet) |

## How it works

- **Endpoint-bound tokens.** The OAuth `resource` decides the assistant. Tokens issued for `/claude/mcp` are stored with `assistant='claude'` and are rejected on `/mcp`, and ChatGPT tokens are rejected on `/claude/mcp`. Requests without a resource keep the original ChatGPT behaviour.
- **Callbacks.** Claude web, desktop, mobile and Cowork use `https://claude.ai/api/mcp/auth_callback` through dynamic client registration. Claude Code uses a loopback callback (`http://localhost:<port>` or `http://127.0.0.1:<port>`), which registration now accepts. All other callbacks must still be exact HTTPS URLs.
- **Refresh.** Claude refreshes tokens proactively, sometimes twice in parallel. For Claude tokens only, a repeated refresh within 30 seconds returns a new pair instead of revoking the connection. ChatGPT keeps immediate replay revocation.
- **Rate limits.** Claude's traffic arrives from Anthropic's shared egress range (`160.79.104.0/21`), so signed-in requests to `/claude/mcp` are limited per user (240 calls and 10 app creations per minute) with a 3,000-per-minute IP backstop; unauthenticated requests keep the normal IP limit. ChatGPT limits are unchanged.
- **Kill switch.** `CLAUDE_MCP_ENABLED=false` removes the Claude endpoint without touching ChatGPT.

No Cloudflare or Render configuration change is needed: the endpoint is served by the existing `trialy-web` service, as the Intel Claude connector already is.

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

Email and other app actions run in TrialAgents and work from Claude. Scheduled research runs on the shared ChatGPT runner. On `/claude/mcp`, research setup, runner control, run claiming and research creation or changes return `claude_runner_unavailable`; reading automations and history works. A Claude runner (Claude cloud scheduled tasks triggered through their API `/fire` endpoint) is the planned next phase.

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
6. Asking Claude to schedule research reports that it runs on ChatGPT; asking for an email action works.
7. Claude Code: connect through the loopback callback and read records in text.
8. Reconnect after token expiry; cancel and retry sign-in.

## Directory submission

Submit two listings from the developer portal (claude.ai/directory/manage): the MCP connector (`/claude/mcp`), and the plugin bundle with plugin path `plugin/claude/trialagents-platform`. `claude plugin validate` passes. Before submitting:

- **License** (blocking): add a `LICENSE` file to the plugin folder or a `license` value in `plugin.json`.
- **Privacy policy** (warning): set `privacyPolicyUrl` in `plugin.json`.
- The repository must be public before the listing goes live (it is). Raise `version` in `plugin.json` with every release.

References: [Claude connector authentication](https://claude.com/docs/connectors/building/authentication), [plugin structure](https://claude.com/docs/plugins/build), [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist), [submit a plugin](https://claude.com/docs/plugins/submit).
