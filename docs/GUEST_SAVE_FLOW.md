> Legacy recovery only as of 23 October 2026. New projects and tools require a connected account. No new anonymous drafts are created. The flow below is retained for previously issued previews until their existing expiry. See [account and tool organization](design/ACCOUNT_PROJECT_TOOLS.md).

# Temporary trackers and account saving

Trialy now supports an anonymous start on the existing MCP endpoint. `open_workspace` opens onboarding without an account; `preview_tracker` creates an immutable temporary package containing authored pages, scalar-field tables and up to 200 initial records. It lives for 24 hours from creation, independent of sign-in. Each revision is a separate preview; approving a design in conversation does not persist account data.

The embedded workspace retains its current page and render state while the user selects **Save to your account**. A stable footer shows remaining availability, connection progress, save status and a retry path. The same preview reference opens the existing Trialy website. Login/signup returns to the review. The user sees the destination account, table contents and authored source, explicitly enables ChatGPT access for this new workspace and selects **Save to this account**.

Saving atomically creates a new account-owned workspace/project, tables, records and versioned components through existing validation and audit paths. Draft UUID references in source/bindings are rewritten to their saved IDs. A receipt makes concurrent and repeated saves idempotent. Login alone is not database approval. No automatic write grant, execution grant or access to existing workspaces is created. Saved work does not expire with the preview. The user can reopen it on the website or connect the ChatGPT OAuth account and reopen the saved workspace.

## Intel behaviors retained

Compared with `tarous89/intel_mcp` main `6d6839f` (`connect-project.ts`, `save-recovery.ts`) and `tarous89/intel_agent_app` main `b8aeca3` (website import/connection): capability in a URL fragment, destination-account check, work preserved during connection, atomic save receipt, up to two immediate retries of the same save, one visible manual recovery path, no delayed save that can overwrite newer work, and status-only reconciliation of the same preview identity. Intel's confirmed previews currently retain seven days; Trialy intentionally uses the requested 24 hours.

## Boundaries

Anonymous code uses the existing isolated QuickJS render/event runtime and sandbox frame. It can read only bound draft tables. Account files, references to existing account data, execution grants and automatic writes are unavailable before saving. Code can calculate display values itself; live derived field evaluation follows saved-workspace semantics after import. Temporary UI state is not an account record and is not silently included in the import: the immutable bundle is the review source. Ask ChatGPT for a revised preview to change initial content.

Initial limits: 10 tables, 200 rows total, 10 components, 500 KB per preview; 100 MB/1,000 pending previews globally, ten creations per minute per source IP, existing isolated execution limits and two concurrent preview runtimes. Reference fields and file/function bindings are added using existing reviewed account operations after save. These are explicit first-release anonymous-preview limits, not restrictions on saved workspaces.

Capabilities are random 256-bit tokens stored hashed, passed in fragments rather than URL queries/referrers, and checked for all reads/runs/claims. Public receipt reads reveal no account contents. Save requires a human session, same-origin request, CSRF, exact digest and the reviewed account ID. A capability cannot transfer a previously claimed tracker to another account. Expired unsaved bodies are cleaned; receipts remain for reconciliation. Invalid bearer credentials never downgrade to anonymous access.

## Verification

Integration test covers anonymous MCP onboarding, protected-tool denial, rendering, signup return, no write on login, CSRF/origin/account/digest checks, durable render after import, idempotent retry, account isolation, AI-save denial, expiry and transaction rollback. Existing backend/build tests continue to apply. Real ChatGPT connection UI and visual browser acceptance must still be exercised after refreshing the connector's tool catalogue; this environment has no installed browser binary.
