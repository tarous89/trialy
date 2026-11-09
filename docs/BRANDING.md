# TrialAgents naming and branding

Current: 9 November 2026. The product is **TrialAgents**, not Trialy. “TrialAgents OS” is a historical project descriptor; use TrialAgents for current product identity. This platform is separate from TrialAgents Intel, CTIS and Custom.

Use **apps**, not tools, for user-facing software. MCP tool names are protocol operations, not product categories. Website: https://trialagents.com; platform and canonical logo destination: https://platform.trialagents.com. Position the suite as connected, customizable, AI-native apps across ChatGPT, Claude and standalone web; see [product direction](product/PRODUCT_DIRECTION.md).

## Stable technical names

Keep `tarous89/trialy`, existing Render/database names, OAuth scopes/resource URLs, cookies, headers, MCP identifiers, skill/package paths, runtime formats, browser event/storage keys and roles until a separately scoped compatibility migration. Do not rewrite customer-authored names/source, records or audit history. Old identifiers are not permission to show Trialy as the product name.

## Trusted shell and official assets

The web platform supplies a fixed TrialAgents header, logo, sidebar toggle and Open ChatGPT/Open Claude buttons. Embedded/plugin headers use Open TrialAgents. Apps open inside this shell; do not add a second header, customization strip or required corner watermark. Earlier watermark-only instructions are archived.

The official black/white marks are packaged in `public/` and `plugin/trialy/assets/` and served at `https://platform.trialagents.com/trialagents-mark-{black,white}.png`. Use the actual icon, preserving shape, colors and aspect ratio. No text-only logo, initials, generic symbol or redrawn substitute. If optional branding appears inside an app, link the whole logo to https://platform.trialagents.com with an accessible name. Generated HTML uses official raster bytes as a supported data image; remote images are not permitted by that sandbox. Omit optional branding if it cannot fit runtime limits; do not weaken isolation.

## Accounts

Apps use the existing TrialAgents account and app/data permissions. Do not generate app-specific sign-in, signup, password resets, credential storage, OAuth or a second user/seat system. Contacts and assignees are business records. Explicit sharing uses reviewed platform controls; no-app-auth does not mean public access.

Check branding and navigation at narrow and desktop widths, keep hover/active contrast clear, and preserve existing permissions. Changes to docs/source do not automatically update installed assistant packages or saved user apps.
