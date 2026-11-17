# Data Room 1.1.0 (`life.data-room`)

Prepare, share and track data rooms for financing, licensing, partnering and M&A, with diligence Q&A built in. Scope: [DATA_ROOM.md](../../../docs/product/app-template-blueprints/apps/DATA_ROOM.md). Platform: [external exchange rooms](../../../docs/product/EXTERNAL_EXCHANGE.md) (§5, #152; guidance 1.3.25).

## Files

| File | Purpose |
|---|---|
| `data-room.source.js` | Readable app source (`frontend-js`). Line 1 is `templateLayoutSchema` (seven screens, column groups and form groups); line 2 is `appCommands` (32 commands). |
| `functions/room_summary.js` | Read-only app helper (E7) that writes the weekly room summary email. |
| `archive/1.0.0/` | The 1.0.0 source package, unchanged. |
| `data-room.css` | Vivid kit styles, theme forest (`#087B58`). |
| `catalog.metadata.json` | Catalog entry: description, options, instructions and documentation. |
| `schema.example.json` | Installer schema with the roles below; `templates/catalog-installers.json` points here. |
| `demo_data.json` | Fictional companies, people, documents, room groups and questions (`.invalid` emails). |
| `data-room.preview.html` | Offline fictional preview (generated). |
| `QA.md` | DATA_ROOM.md §13 results. |

Build: `node scripts/build-data-room-template.mjs` writes `templates/apps/life.data-room-1.1.0.json` and the preview (1.0.0's catalog JSON is not rebuilt). `--check` (part of `npm run build`) fails when either is stale.

## Roles

| Role | Contract | Use |
|---|---|---|
| `organizations` | core.v1 | Parties |
| `people` (optional) | core.v1 | Party contacts |
| `programs` (optional) | core.v1 | Assets a room covers |
| `agreements` (optional; core fields only) | core.v1 | CDAs filed for Contracts (`cda_nda`) |
| `dataroom.settings`, `.templates`, `.rooms`, `.levels`, `.sections`, `.items`, `.questions` | dataroom.v1 | App tables |
| `dataroom.access_grants`, `dataroom.engagement` | dataroom.v1, published outputs | Read by Fundraise, BD Pipeline and custom apps |

TrialAgents keeps these fields current from the room, as tracked system writes; people, assistants and this app cannot edit them:
- the grant's `status` and `last_seen_on`;
- every engagement row.

The source is always `tracked`.

Additions beyond §7:
- `dataroom.settings.email_texts`: email texts per type and purpose, stored as JSON.
- `dataroom.questions.message_id`: the platform question a log record came from.

## How the app uses the platform

| Step | Calls |
|---|---|
| Set up | Reviewed record writes in three steps: the room; then levels and sections; then checklist items (a review holds 50 changes). |
| Live | `exchange.createGroup({kind:"room",appRef:"room:<id>",levels,slots,documents,tracking,notifyEngagement,quietDays,emailDefaults})`. It applies on the person's click; the room status is one review. |
| Parties | Grant records first, then `exchange.invite` with `recordId` and levels, then `exchange.prepareEmail` (`access_granted`) shown exactly as returned, then `exchange.sendEmail` (reviewed). |
| Documents | `exchange.shareDocuments` publishes index changes. `exchange.replaceDocument` shows a newer version in place, in one review with the item update. |
| Levels | `exchange.setLevels`, with `entered` for a CDA in place elsewhere or on file in Contracts. `exchange.defineLevels` adds custom levels. `exchange.acceptFile` on a signed CDA opens only its level. |
| Q&A | `exchange.listQuestions` provides questions. `exchange.answer` answers privately; `exchange.publishAnswer` publishes to the room or one level, asker anonymised. |
| Notify parties | The person picks documents and all or chosen parties; `exchange.prepareEmail` (`documents_updated`, `exchangeIds`, `versionIds`), shown exactly as returned, then `exchange.sendEmail`. No automatic digest. |
| Access-ending reminder | `rooms.access_ending_reminder`; `notifyAccessEnding` at go-live and `exchange.setRoomNotices` on a live room. |
| Close | `exchange.revoke` and `exchange.extend`. Archiving the app stops links and tracking. |

Assistants draft records and email batches; they never send, grant, change levels, publish, accept or revoke.

## 1.1.0 changes ([DATA_ROOM.md §14](../../../docs/product/app-template-blueprints/apps/DATA_ROOM.md#14-data-room-110-platform-standards-assistant-control-and-notifications))

- App commands for every action, through the same handler as clicks (`handle(event)`); commands never share, send or change a live room.
- Custom fields (`settings.custom_fields`) and form layouts (`room_form`, `item_form`, `question_form`); hidden columns now honour the platform's `group:field` keys.
- Notify parties replaces the daily digest; access-ending reminder per room; instant question emails documented.
- One install recommendation: the weekly room summary (helper `room_summary`).
- Settings `notify_updates_default` and rooms `notify_updates` removed; `custom_fields` and `access_ending_reminder` added.
