# Platform browser domain

Target: `https://platform.trialagents.com`, served by the existing Render web service `trialy-web` (`srv-db58ppo473hc73a9ds10`). This is an additional hostname for the same application and database, not a new deployment or data migration.

## DNS setup

The authoritative nameservers checked on 2026-10-29 are `pranab.ns.cloudflare.com` and `brianna.ns.cloudflare.com`. Manage this record in **Cloudflare → trialagents.com → DNS → Records**, even if IONOS is the registrar. IONOS DNS record edits have no effect while Cloudflare is authoritative. Do not change nameservers or other products' records.

| Field | Value |
| --- | --- |
| Type | CNAME |
| Name | platform |
| Target | trialy-web.onrender.com |
| Proxy | DNS only (gray cloud) |
| TTL | Auto |

Only replace conflicting A/AAAA/CNAME records for this exact subdomain if any appear. No scheme or path belongs in the CNAME target.

## Deployment and activation

1. Merge the connector/domain change. The existing Blueprint adds `platform.trialagents.com` to `trialy-web`; it keeps the Render subdomain enabled. Confirm the Blueprint sync and Custom Domains entry in the existing service. If sync needs manual action, sync the existing Blueprint; do not create a second service or Blueprint.
2. Add the DNS record above. In Render's service Settings → Custom Domains, verify DNS and wait for the TLS certificate to become valid. Confirm `https://platform.trialagents.com/health`, `/ready`, `/auth/login` and the favicon over normal, verified HTTPS.
3. Only after DNS/TLS succeeds, set **`APP_PUBLIC_URL=https://platform.trialagents.com`** on the web service and deploy. Add the same non-secret value to the web service's `envVars` in `render.yaml` so subsequent Blueprint syncs keep the intended configuration. This release deliberately leaves it unset while DNS is absent.
4. Keep **`PUBLIC_URL`**, the plugin MCP endpoint `https://trialy-web.onrender.com/mcp`, OAuth issuer/resource, cookie names, session secret and database unchanged. `APP_PUBLIC_URL` moves app launches, browser review/collection/save links, frontend frames and connected embedded navigation independently of OAuth. The embedded widget receives its browser origin at runtime; Docker does not need a new build argument.
5. Verify sign-in, Home, a permitted standalone app with navigation and corner watermark, and connector editor Save/Ignore. Confirm the ChatGPT connection still works and `open_app` returns the platform domain. Check embedded navigation and frame loading. Use synthetic fixtures for write tests; do not modify customer data or invoke real providers as a smoke test.

Browser sessions are host-only: users sign in once on the new domain. Do not copy or broaden cookies across TrialAgents products. Old links and the existing MCP connection remain available; there is no blanket redirect that could break OAuth or the plugin. Guest save origin checks allow only the configured browser and established service origins.

## Rollback

Unset `APP_PUBLIC_URL` (or set it to the previous browser origin) and deploy; remove its Blueprint value too if activation was committed. Generated links fall back to `PUBLIC_URL`/`RENDER_EXTERNAL_URL`. Keep the old Render hostname enabled. No schema or data rollback is needed.

References: [Render custom domains](https://render.com/docs/custom-domains), [Cloudflare DNS setup](https://render.com/docs/configure-cloudflare-dns), [Blueprint domain configuration](https://render.com/docs/blueprint-spec#domains).
