# TrialAgents OS naming

Approved 29 October 2026.

- **TrialAgents** is the public product name in the web app, ChatGPT plugin, account/consent screens, generated-app footer, help text and builder instructions.
- **TrialAgents OS** is the internal product name for this app foundation, distinguishing it from TrialAgents Intel, CTIS and Custom.
- The plugin listing remains the same plugin, with its existing audience and connection. Its display name and opening prompt use TrialAgents; the package slug stays `trialy`.
- This is a wording change. Fonts, colors, spacing, icons and layouts keep their existing definitions. The standard template stylesheet is unchanged.

## Compatibility

Keep `tarous89/trialy`, existing Render service/database names and URLs, OAuth scope/resource URLs, cookies, HTTP headers, MCP tool/resource identifiers, skill paths, runtime formats, browser storage/event keys and database roles. These are compatibility identifiers, not public product copy. No migration, reconnection or replacement plugin is required by this rename.

Do not rewrite customer-authored app/project names, saved source, records, audit history or historical source documents. Other TrialAgents products and domains are outside this rename. A later domain or service-name change needs its own routing/authentication migration.

## Verification

Build and the existing unit/integration/browser suites verify the renamed surfaces. Review changed screenshots for branding text only; preserve the existing CSS values and template stylesheet. Release evidence belongs in the branding PR, including the plugin version and actual live checks. A successful authenticated MCP read does not by itself prove a signed-in browser launch.

## App and plugin icons

Approved 29 October 2026: replace the sidebar's generic molecule with the existing TrialAgents favicon mark, and use a plug glyph for Connectors. Keep the same icon dimensions, stroke, typography and layout. The dark sidebar uses the established white mark; browser tabs and light plugin surfaces use the black mark. Both files are unchanged copies from the current TrialAgents assets at `https://intel.trialagents.com/trialagents-mark-{black,white}.png`. The plugin uses the corresponding light/dark assets for its logo and composer icon.

The older blue-tile `favicon.svg` is not the current favicon. Keep these owned PNGs local to this app and plugin so rendering does not depend on another product's server.

## App branding and account guardrails — 1 November 2026

Apps are internal tools accessed through the existing TrialAgents account. Do not add app-specific sign-in, signup, logout, password reset, account/profile management, credential storage, OAuth, identity providers or a second user/seat system. Use the platform's account connection and existing app, table, field and record permissions. Business contacts and assignees are data, not new login accounts. “No app authentication” does not remove TrialAgents authentication or make an app public. Public/team sharing, when explicitly requested, uses the platform's existing reviewed sharing controls.

TrialAgents branding inside app content is optional; the platform already supplies its watermark. Whenever a TrialAgents logo or branded wordmark is used, include the real TrialAgents icon and make the entire logo a link to **https://platform.trialagents.com**. Use the supplied black icon on light backgrounds and white icon on dark backgrounds, preserving its shape, colors and aspect ratio. Do not substitute text alone, initials, a generic symbol, a drawn/CSS/SVG approximation or another product's logo. The link must not point to an app route, an Intel site or an authentication page. Give the link an accessible name, such as “TrialAgents”.

Official assets: `https://platform.trialagents.com/trialagents-mark-black.png` and `https://platform.trialagents.com/trialagents-mark-white.png`; the same files are packaged under `plugin/trialy/assets/` and `public/` in the source repository. The current generated-HTML sandbox accepts embedded raster data images, not remote image URLs. Use the exact official PNG bytes as a data image when adding an in-app logo; never loosen the sandbox or invent replacement artwork. If an asset cannot be embedded within runtime limits, omit optional in-app branding and retain the platform watermark. Do not duplicate, cover or replace that watermark.

Before preview/save, verify that there are no generated account/authentication controls or credential fields, that any TrialAgents logo includes the official visible icon, and that its actual clickable destination is exactly `https://platform.trialagents.com`. Check both light/dark contrast and narrow/desktop layouts. Preserve all backend permission checks.

The two supplied PNG attachments match the existing public/plugin assets byte-for-byte. Standalone and explicitly shared app watermarks use the official white icon and the canonical platform link. This change updates authoring instructions and trusted watermark rendering; it does not automatically rewrite saved customer source or claim to detect every custom logo/login screen.
