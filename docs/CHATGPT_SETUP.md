# ChatGPT connection and workspace onboarding

Updated: 2026-10-10. Implemented locally; live connection and automatic opening are not yet verified.

## Intended experience

1. User opens Trialy in ChatGPT and selects Connect.
2. ChatGPT starts Trialy's OAuth authorization-code flow with PKCE. Trialy's own login page includes sign-up for new users.
3. After consent, Trialy redirects to the exact registered **ChatGPT OAuth callback**, completing the connection. Standalone login returns to `/` when no connection is pending.
4. The opaque access token identifies the Trialy user who signed in and approved consent. It is stored only as a hash, with client, scope/resource policy and expiry enforced by the local provider. No prior standalone visit is required.
5. `open_workspace` displays accessible workspaces inside ChatGPT. A new account gets in-app onboarding and explicitly confirms its first workspace name and AI access. Existing workspaces never become AI-accessible simply because the account connects.
6. Tables, record forms, template previews and confirmed saves operate through the same service and database. More of the complete app remains to port into the embedded surface.

The workspace tool advertises both global and thread entrypoints and prefers fullscreen. On opening, the view loads its workspace through the host SDK. These declarations do not guarantee that every host/account opens a view immediately after OAuth. The live acceptance check must verify that the original open request resumes; if it does not, use the host's workspace entrypoint as the fallback. Do not claim automatic opening has been proven or redirect to invented ChatGPT URLs.

## Authentication decision — reuse the existing self-hosted approach

The user confirmed the Render workspace and asked us to inspect existing apps before introducing Auth0. Auth0 is not required and is no longer the proposed prerequisite.

Read-only source inspection found:

- **Atablez:** `server/index.ts` implements email/password registration and login using Node scrypt and database-backed credentials. `server/oauth.ts` implements the MCP SDK `OAuthServerProvider`; `mcpAuthRouter` supplies the OAuth endpoints. Authorization preserves a pending connection ticket across login/signup and returns a one-use code plus the original state to the registered callback. Token exchange, refresh rotation and revocation are implemented locally.
- **Intel:** `app/lib/auth.ts` uses salted scrypt password hashes, database-backed session token hashes and HTTP-only cookies. `app/oauth/authorize/route.ts` preserves a validated local return path through sign-up/login, displays account-bound consent and redirects to the registered ChatGPT callback with code/state. The MCP service validates access through its existing authorization backend.
- These are observed code paths, not a new live acceptance test. Existing apps were not modified. Their user databases, cookies, token audiences and payment entitlements must not be shared with Trialy by default.

### Implemented self-hosted authentication

- PostgreSQL local accounts with salted scrypt hashes; minimum 12-character signup passwords; HTTP-only sessions, session rotation, CSRF and per-IP login/signup throttling.
- MCP SDK discovery, dynamic registration, authorization, PKCE checking, token exchange and revocation. Registered callbacks must be exact HTTPS URLs. Public clients use `token_endpoint_auth_method: none` and `trialy` scope.
- Pending connection is retained across sign-up/login. Consent is bound to the signed-in user. A one-use code and original state return to the registered callback; there is no arbitrary return URL.
- Hashed one-hour access tokens and 30-day refresh tokens. Refresh rotation detects reuse and revokes the token family. Access remains subject to current workspace permissions.
- Removed external OIDC/JWT settings and runtime dependencies. No Auth0 account or subscription was created.
- Focused HTTP integration test passes: registration → authorize → signup → consent → callback → PKCE exchange → authenticated workspace opening. Wrong CSRF, wrong verifier, reused code, refresh replay and changed consent account are rejected.
- Remaining before customer use: password recovery, email verification, MFA as required, user-facing connected-app/session administration, operational cleanup and broader security review. No real ChatGPT callback or browser automatic-opening acceptance has run yet.

## Hosting and registration

- Render inventory showed one workspace, **Tarek Roustom's Workspace** (`tea-cspqipl6l47c739nslfg`). The user explicitly confirmed this workspace on 2026-10-10. No further workspace permission request is needed for the authorised Trialy development setup.
- Deploy the repo's staging blueprint to the confirmed workspace using the updated self-hosted authentication settings. Run migrations before serving requests/starting the worker. Keep one web instance because previews are temporarily in memory.
- Build includes the self-contained MCP Apps HTML bundle at `dist/embed.html`; serve it as an MCP UI resource, not as a public authenticated standalone session.
- Register the deployed `/mcp` endpoint using plugin creator / ChatGPT connection setup. Preserve this repository and Render hosting; no second implementation in Sites is needed.
- Add plugin instructions to invoke `open_workspace` when the user opens Trialy and after successful connection, and to require explicit preview confirmation before `commit_change`.
- Do not create a plugin pointing to a guessed or unverified deployment endpoint.

### Deployment checkpoint

- Created `trialy-db`: `dpg-db58k25ckfvc739bb5f0-a`, PostgreSQL 17, paid basic 256 MB, 1 GB storage, Frankfurt, private networking only. This resource is provisioned even while web/worker deployment is pending.
- `render.yaml` uses the same existing database name, databaseName `trialy_db`, user `trialy_db_user` and version 17. Review the Blueprint plan to ensure adoption rather than duplicate creation.
- The current Render connector cannot apply a Blueprint, create a background worker, or expose the database connection credentials for direct wiring. The next operation is to apply the ready Blueprint in the Render Dashboard. Browser fallback requires user approval under the tool's instructions.
- Dashboard link: https://dashboard.render.com/blueprint/new?repo=https://github.com/tarous89/trialy
- Web/worker services and the ChatGPT plugin have not been created. Do not register an invented MCP URL; verify the deployed endpoint first.

## Minimal live acceptance

1. New user: Connect → hosted sign-up → return to ChatGPT → workspace onboarding appears without requiring a standalone visit.
2. Confirm first workspace; install a template via preview; create a record via preview and save; reopen in another conversation and read it back.
3. Existing user: same identity and saved records; no duplicate account/workspace and no implicit AI access to restricted workspaces.
4. Cancel login and retry; reconnect after expiry; verify readable failure and no acknowledgement of an uncommitted save.
5. Check global/thread opening and actual post-OAuth automatic resumption. Record the tested ChatGPT client/plan and any required fallback.

The embedded surface currently uses AI-scoped tools only. It does not yet display human-only fields hidden from the model. Keep those out until the separate access path is verified.

## References checked

- https://developers.openai.com/plugins/build/auth
- https://github.com/openai/mcp-extensions/blob/main/docs/spec.md
