# Data Room 2.0.0 (`life.data-room`)

Prepare, share and track data rooms for financing, licensing, partnering and M&A, with diligence Q&A built in. Scope: [DATA_ROOM.md](../../../docs/product/app-template-blueprints/apps/DATA_ROOM.md). Platform: [external exchange rooms](../../../docs/product/EXTERNAL_EXCHANGE.md) (§5). Rebuild: package 7.3 of the [platform decisions](../../../docs/scopes/PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md) (G2–G8, G11, G14, P3–P5, P9).

2.0.0 is a draft (not in `templates/catalog-seed.json`); the owner approves it (O4). It declares `upgradeFrom: ["1.1.0","1.1.1"]`: the installer schema, the helper, the recommended automation, the output contracts and the 32 app commands are unchanged, so installed copies can move with their data (package 7.1).

## Files

| File | Purpose |
|---|---|
| `data-room.source.js` | Readable app source (`frontend-js`, v2 contract). Line 1 is `'use trialagents v2';`, line 2 `templateLayoutSchema` (eight screens, column and form groups), line 3 `appCommands` (32 commands, identical to 1.1.1). |
| `data-room.css` | The few app-specific styles, written against the kit's `--k-*` tokens. The runtime adds the kit. |
| `functions/room_summary.js` | Read-only app helper (E7) for the weekly room summary email (unchanged). |
| `catalog.metadata.json` | Catalog entry: description, options, instructions and documentation for assistants. |
| `schema.example.json` | Installer schema (byte-identical to 1.1.0 and 1.1.1); `templates/catalog-installers.json` points here for 2.0.0 and to `archive/1.1.1/` for 1.1.1. |
| `demo_data.json` | Fictional companies, people, documents, room groups and questions (`.invalid` emails), used only by the gallery preview and tests (D40). |
| `data-room.preview.html` | Offline fictional preview, labelled as demo data (generated). |
| `archive/1.0.0/`, `archive/1.1.0/`, `archive/1.1.1/` | Earlier source packages, unchanged. |
| `QA.md` | Checks run for 2.0.0. |

Build: `node scripts/build-data-room-template.mjs` writes `templates/apps/life.data-room-2.0.0.json` and the preview from this folder, and rebuilds `life.data-room-1.1.1.json` byte-identical from `archive/1.1.1/`. `--check` (part of `npm run build`) fails when any of them is stale.

## What changed from 1.1.1

- **No own header, banners or footer.** The platform header shows the app name; messages are the platform notice (`output.notice`); partial or loading data is labelled in place. Side navigation (kit) with Overview, Rooms, Index, Parties, Activity, Q&A, Index templates and Email texts; Custom fields appears when the team registered one; Settings only for the app's owners.
- **Direct saves.** Every record edit saves with `records.save` from the person's own click, change or submit, with the version shown when editing started. Values are edited where they are shown (room details, level names and entry steps, section numbers and names, item title, required, status, owner, due date and level, question category, assignee and due, template name and purpose, custom fields). Side panels only create records or change many fields. Delete is `archive_record`; the person's last change can be undone from the screen (`undo.list`, `undo.run`).
- **One confirmation when something goes out.** Invitations and notifications (send review shown exactly as the platform returns it), level changes, answers, publication, CDA acceptance, reminder switches, revocation, extension and archiving a live room keep their one confirmation in TrialAgents; record changes of the same click travel with it. Preparing what nobody outside has seen (the room page, links, documents) applies on the click.
- **Settings reduced to business choices** (default access length, quiet days, sender name, view-only default, Q&A approval, click-through text), owners only. Index templates and email texts are their own screens; custom fields have their own screen; the access, notification and automation notes are gone.
- **Each screen reads only its own tables** in one `records.readMany`; pending reads show as loading and an action that touched them goes to the server. The working room is the person's context (`output.context`).
- Options `heading` and `demoLabel` are dropped (the platform header and the gallery label replace them).

## Roles

Unchanged from 1.1.1:

| Role | Contract | Use |
|---|---|---|
| `organizations` | core.v1 | Parties |
| `people` (optional) | core.v1 | Party contacts |
| `programs` (optional) | core.v1 | Assets a room covers |
| `agreements` (optional; core fields only) | core.v1 | CDAs filed for Contracts (`cda_nda`) |
| `dataroom.settings`, `.templates`, `.rooms`, `.levels`, `.sections`, `.items`, `.questions` | dataroom.v1 | App tables |
| `dataroom.access_grants`, `dataroom.engagement` | dataroom.v1, published outputs | Read by Fundraise, BD Pipeline and custom apps |

TrialAgents keeps the grant's `status` and `last_seen_on` and every engagement row current from the room (source `tracked`); people, assistants and this app cannot edit them.
