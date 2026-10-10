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

## Provider setup

Auth0 is the proposed initial hosted provider because the official OpenAI authentication guide lists its MCP support. No Auth0 account has been created or selected. Confirm its current development terms and tenant capabilities before provisioning; do not assume optional enterprise controls are included.

- Use a development tenant with hosted sign-up/login enabled and an approved connection for end users.
- Configure a regular web application for standalone sign-in. Its exact allowed callback is `PUBLIC_URL/auth/callback`.
- Configure the MCP API/resource audience and `trialy` scope. The resource audience must match what ChatGPT requests and what the access token contains.
- Configure the provider's supported MCP client registration method (prefer supported CIMD; DCR or predefined client registration where appropriate). Use the exact callback URI shown by the real ChatGPT connection setup. Never wildcard all callback URLs.
- Ensure issuer discovery, S256 PKCE, resource/audience handling, user consent and scoped user access tokens work. Do not allow machine-client credentials to be used as end-user access.
- Set OIDC_ISSUER and MCP_ISSUER to the same exact canonical issuer, including trailing slash. Configure OIDC_CLIENT_ID/OIDC_CLIENT_SECRET, MCP_JWKS_URL, MCP_AUDIENCE and MCP_SCOPE in Render secrets/settings, not git or chat.
- The server currently accepts RS256 or ES256 access tokens and requires subject, expiry and issued-at claims. Token failures return a reauthentication challenge. Token scope and tenant/workspace permissions are independently checked.

## Hosting and registration

- Render inventory showed one workspace, **Tarek Roustom's Workspace** (`tea-cspqipl6l47c739nslfg`). No workspace was selected. The Render connector explicitly requires user confirmation before acting on that workspace.
- Deploy the repo's staging blueprint only after confirming the workspace. Run migrations before serving requests/starting the worker. Keep one web instance because previews are temporarily in memory.
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
- https://auth0.com/docs/authenticate/login/auth0-universal-login
- https://auth0.com/blog/auth0-auth-for-mcp-servers-generally-available/
