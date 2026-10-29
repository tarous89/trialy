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
