# Contracts 2.0.0 validation

Validated on 21 November 2026 in the repository with stub tools in the production QuickJS runtime, disposable PGlite databases, the real catalog sync, installer and Add app step, and the production design inspector (Chromium at `/opt/pw-browsers/chromium`). Fictional data only; not a deployed account. Earlier records: `archive/1.1.1/QA.md` (1.1.0 and 1.0.0, with the hand calculations, which 2.0.0 keeps unchanged).

**Catalog status:** draft. Not in `templates/catalog-seed.json`; the owner approves it (O4). 1.1.1 stays published and byte-identical (`archive/1.1.1/`, installer entry updated). `upgradeFrom: ["1.1.0", "1.1.1"]`: both have the byte-identical installer schema. No helper functions, automations, output contracts or app commands changed (Contracts has none of the last three besides the `contracts.obligations` output, untouched).

## Commands and outcomes

| Command | Outcome |
| --- | --- |
| `node scripts/build-contracts-template.mjs --check` | Passes for 1.1.1 (rebuilt from `archive/1.1.1/`, JSON and preview byte-identical) and 2.0.0. |
| `node --import tsx scripts/check-app-functions.ts` | Passes. |
| `npx tsc --noEmit` | Passes. |
| `tests/contracts-v2.test.ts` | 13/13: v2 marker, installer schema and options against 1.1.1, upgrade path, no review texts; every screen at wide, panel and phone width without own header, banner or footer; reads per screen; Settings for owners only; every empty screen's first action; pending reads as loading; inline edits with the shown version and recalculated key-term dates; side panels, key terms after a new agreement, Undo, archive; pipeline drag, menu and Mark signed; verification at the panel width; the 1.1.1 hand-checked calculations; notices instead of banners; the design inspector (current rules) on 9 screens, 3 screen states and 8 panels at 1440, 400 and 390 px with no issues and no warnings. |
| `tests/contracts-v2-integration.test.ts` | 1/1: 2.0.0 approved inside a PGlite database, installed through the Add app step (same nine tables and fields as a 1.1.1 install), opened, a counterparty and an agreement created from side panels, key terms saved next, one inline status edit saved directly (and the same stale cell refused), archive, no review rows. |
| `tests/contracts.test.ts`, `tests/contracts-integration.test.ts` | Unchanged; pass on 1.1.1. |
| `tests/template-catalog.test.ts`, `tests/frame-engine.test.ts`, `tests/app-update.test.ts`, `tests/app-templates.test.ts` | Pass. The batched-read release test asserted that 1.1.1's installer is not archived; it now expects the archive once a newer major version is registered (7.3). |

`tests/contracts-integration.test.ts` acceptance 3 (MCP) needs `dist/embed.html` (a `vite build` output); it passes with the build present.

## Size

Source 126,595 characters including the 4.3 KB of app styles (1.1.1: 154,800 with 20.7 KB of CSS). The calculations, the logical schema `S` and the field validation are kept from 1.1.1; the kit replaces the shell, tables, panels, board and all generic styles.

## Not verified here

- The real frame host in a browser (`tests/visual/frame-runtime.spec.cjs` style) and real Claude or ChatGPT hosts. `scripts/test-contracts-browser.ts` still exercises 1.1.1; a 2.0.0 browser script was not added.
- The owner-approved upgrade of an installed 1.1.x copy (package 7.1) end to end.
- Gallery media for 2.0.0 (screenshot and manifest entry) are not generated; the gallery is the lead's.

## Platform gaps found

- After a direct save the server renders the app again with an `open` event and returns that render's output only, so the `notice` the saving event returned is dropped on the server path (`src/workspace/service.ts`, `rerender`). Contracts carries the message in its state and repeats it on that render.
- `undo.list` is server-only, so the app lists Undo only on the platform's re-render after a save (reads in the frame would otherwise go to the server on every screen change).
