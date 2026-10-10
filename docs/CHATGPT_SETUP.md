# ChatGPT connection and workspace onboarding

Updated: 2026-10-10. Implemented locally; live connection and automatic opening are not yet verified.

## Intended experience

1. User opens Trialy in ChatGPT and selects Connect.
2. ChatGPT starts the identity provider's OAuth authorization-code flow with PKCE. Hosted login includes sign-up for new users.
3. The provider returns to the exact **ChatGPT OAuth callback**, completing the connection. This is separate from Trialy's `/auth/callback`, which serves standalone sign-in only.
4. A verified user access token creates/resolves the local Trialy identity by exact issuer + subject. No prior visit to the standalone app is required; identities are never linked by matching email addresses.
5. `open_workspace` displays accessible workspaces inside ChatGPT. A new account gets in-app onboarding and explicitly confirms its first workspace name and AI access. Existing workspaces never become AI-accessible simply because the account connects.
6. Tables, record forms, template previews and confirmed saves operate through the same service and database. More of the complete app remains to port into the embedded surface.

The workspace tool advertises both global and thread entrypoints and prefers fullscreen. On opening, the view loads its workspace through the host SDK. These declarations do not guarantee that every host/account opens a view immediately after OAuth. The live acceptance check must verify that the original open request resumes; if it does not, use the host's workspace entrypoint as the fallback. Do not claim automatic opening has been proven or redirect to invented ChatGPT URLs.

## Authentication decision — reuse the existing self-hosted approach

The user confirmed the Render workspace and asked us to inspect existing apps before introducing Auth0. Auth0 is not required and is no longer the proposed prerequisite.

Read-only source inspection found:

- **Atablez:** `server/index.ts` implements email/password registration and login using Node scrypt and database-backed credentials. `server/oauth.ts` implements the MCP SDK `OAuthServerProvider`; `mcpAuthRouter` supplies the OAuth endpoints. Authorization preserves a pending connection ticket across login/signup and returns a one-use code plus the original state to the registered callback. Token exchange, refresh rotation and revocation are implemented locally.
- **Intel:** `app/lib/auth.ts` uses salted scrypt password hashes, database-backed session token hashes and HTTP-only cookies. `app/oauth/authorize/route.ts` preserves a validated local return path through sign-up/login, displays account-bound consent and redirects to the registered ChatGPT callback with code/state. The MCP service validates access through its existing authorization backend.
- These are observed code paths, not a new live acceptance test. Existing apps were not modified. Their user databases, cookies, token audiences and payment entitlements must not be shared with Trialy by default.

### Next implementation

1. Adapt the self-hosted approach to Trialy's existing PostgreSQL users/session infrastructure. Keep registration and sign-in within Trialy, using maintained cryptographic primitives rather than inventing password cryptography.
2. Implement a Trialy-specific MCP SDK OAuth provider with persistent client registration, expiring authorization requests, one-use codes, S256 PKCE, exact registered redirects, scoped/resource-bound tokens, refresh rotation and revocation.
3. Preserve the validated pending connection across signup/login. Bind consent to the current user and reject account switches or replay. Return directly to the registered ChatGPT callback; standalone visits still open the standalone workspace normally.
4. Add login throttling, CSRF protection, recovery/verification and session revocation as needed for customer use. Do not blindly copy the small-app password policies or assume existing implementations satisfy every Trialy requirement.
5. Replace the current externally issued JWT requirement with the local provider's access-token verification. Keep identity resolution and workspace permissions server-side. Retain the external OIDC adapter only if deliberately useful; do not leave external provider settings mandatory.
6. Run one signup → consent → token → workspace flow, plus bad PKCE/replay/account-switch checks. Then perform the real ChatGPT return-and-open acceptance.

**Current code status:** Trialy still uses the external OIDC/JWT adapter from the initial foundation. Its replacement has not yet been implemented. No Auth0 account, subscription or tenant has been created. The interactive workspace and first-workspace confirmation built earlier remain reusable.

## Hosting and registration

- Render inventory showed one workspace, **Tarek Roustom's Workspace** (`tea-cspqipl6l47c739nslfg`). The user explicitly confirmed this workspace on 2026-10-10. No further workspace permission request is needed for the authorised Trialy development setup.
- Deploy the repo's staging blueprint to the confirmed workspace after adapting the authentication settings. Run migrations before serving requests/starting the worker. Keep one web instance because previews are temporarily in memory.
- Build includes the self-contained MCP Apps HTML bundle at `dist/embed.html`; serve it as an MCP UI resource, not as a public authenticated standalone session.
- Register the deployed `/mcp` endpoint using plugin creator / ChatGPT connection setup. Preserve this repository and Render hosting; no second implementation in Sites is needed.
- Add plugin instructions to invoke `open_workspace` when the user opens Trialy and after successful connection, and to require explicit preview confirmation before `commit_change`.
- Do not create a plugin pointing to a guessed or unverified deployment endpoint.

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
