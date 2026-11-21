# Data Room 2.0.0: QA (package 7.3 and 7.4)

Run on 21 November 2026 with fictional data in disposable databases. The 1.1.0 and 1.1.1 QA notes are kept in `archive/1.1.0/QA.md` and `archive/1.1.1/QA.md`.

| Check | Result |
|---|---|
| `node scripts/build-data-room-template.mjs --check` (2.0.0, and 1.1.1 byte-identical from `archive/1.1.1/`) | verified |
| `node --import tsx scripts/check-app-functions.ts` | pass |
| `npx tsc --noEmit` | pass |
| `tests/data-room-v2.test.ts`: package (same schema, helper, automation, commands; draft; marker first; no `records.propose`, header, banner or "(reviewed)"), screens at three widths, owner-only Settings and data-list screens, inline edits with the shown version, delete as archive and Undo, side panels and set-up in steps of at most 50, one confirmation before anything goes out, pending reads as loading, empty screens with their first action, notices, context, commands | pass |
| Same file, design check under the current rules (`inspectAppDesign(frames,'current')`, nine screens and three side panels at 1440, 400 and 390 px, `APP_DESIGN_CHROMIUM=/opt/pw-browsers/chromium`) | passed; warnings only for muted-text contrast (kit colours) |
| `tests/data-room-v2-integration.test.ts`: real catalog, installer and runtime (PGlite): install, open, direct save from a click, a set-up step, an inline edit (a stale version refused), going live on the click, a read and a write command saving directly | pass |
| `tests/data-room.test.ts`, `tests/data-room-commands.test.ts`, `tests/data-room-integration.test.ts` (1.1.1, unchanged assertions; two file paths moved to `archive/1.1.1/`) | pass |
| Gallery preview `data-room.preview.html` in Chromium: every screen, an inline edit, phone width without horizontal overflow, no script errors | pass |

## Not done here

- No new browser script; `scripts/test-data-room-browser.ts` still tests 1.1.1 in the production frame.
- Gallery screenshots are not regenerated (owner step with the approval).
- An installed copy with a saved `layoutProfile` from 1.x lists seven screens; 2.0.0 declares eight, so the platform's layout check refuses that stored profile until the upgrade (7.1) resets it. The app itself reads such a profile tolerantly.
