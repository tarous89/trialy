# Investor Updates 2.0.0 (`life.investor-updates`) — draft

**2.0.0** (21 November 2026, package 7.3/7.4, decisions G2–G8, G11, G14, P3–P5) is a new major version rebuilt on the v2 app contract and the TrialAgents kit. It is a **draft**: it is not in `templates/catalog-seed.json` and waits for the owner's approval (O4). The published 1.0.1 is archived byte-identical under `archive/1.0.1/` (its installer entry points there; the builder builds and checks both).

What stays the same as 1.0.0/1.0.1 (`upgradeFrom: ["1.0.0","1.0.1"]`): the installer schema (`schema.example.json`, byte-identical), the three helpers in `functions/`, `recommendedAutomations` and `automationFeatures`, all 39 app commands (names and inputs; line 3 of the source is the same JSON), the layout declaration (five screens, column groups `investors` and `updates`) and every installer option. Dropped option: `demoLabel` (the gallery preview labels its demo data itself).

What changed:
- Line 1 is `'use trialagents v2';`; the kit (helpers and CSS) comes from the runtime. `investor-updates.css` holds only about 3 KB of app styles on `--k-*` tokens (email preview, fact list, send steps).
- No own header, eyebrow, "as of" pill, layout gear, footer or banners. Messages are `output.notice`; partial reads are an error notice; the unsaved preview is an info notice.
- Record changes save directly with `records.save` (at most 50 per action) and the version shown when editing started; no "prepared for review" text. Inline cells: recipient status, category name/level/questions/"I can help", share class name/kind/notes/order, template name, plan status and send-by days, meeting date and status, response status/owner/follow-up, update title (drafts), block levels. Questions and offers of help are a drag-and-drop board by status. Delete is `archive_record`; a draft update is cancelled. Undo offers the person's last change after a save.
- Sub-screens: Overview (Today; Questions and offers of help), Updates (Updates; Meetings), Investors (People; Categories; Share classes), Plans & templates (Plans; Templates; Email texts, moved out of Settings). Settings is the owners' screen only (`kit.settings`): sender, approval steps, agenda lead time, questions, "I can help", confidentiality footer. Labels, preferences and custom fields remain as app commands only. Automation and access notes are replaced by `platform:automations` / `platform:access` links.
- An open update replaces the list (review, send, engagement); other records open in `kit.panel`. Template sections are edited as rows, not as `Name | level | purpose` text; block items as data are one click away in a disclosure.
- Each screen reads only its tables, batched in one `records.readMany`; pending reads render as loading. The open update is the working context (`output.context`).
- Sending keeps its single confirmation: recipients (delivery records) are saved on a click, links are created on the next click, each email is shown exactly as prepared, and `exchange.sendEmail` is the one confirmation in TrialAgents; the update lock (`records.save`) joins that same confirmation.
- Known gap: a save returns no new record IDs, so adding a new person with a new firm takes two or three clicks (firm, person, recipient), each saved at once.

Build: `node scripts/build-investor-updates-template.mjs [--check]` writes/verifies `templates/apps/life.investor-updates-1.0.1.json` (from `archive/1.0.1/`) and `-2.0.0.json`, and both previews. Tests: `tests/investor-updates-v2.test.ts` and `tests/investor-updates-v2-integration.test.ts`; the 1.0.1 tests run against `archive/1.0.1/`.

---

# Investor Updates 1.0.0 (`life.investor-updates`)

Scope: [INVESTOR_UPDATES.md](../../../docs/product/app-template-blueprints/apps/INVESTOR_UPDATES.md) (BT2-06, revised 15 November 2026). **Published** on 17 November 2026 (owner approval): `templates/catalog-seed.json` names 1.0.0.

Keep the board, investors and shareholders informed by email or in meetings. Investors are people (shared `people`), optionally linked to firms (shared `organizations`), in categories. Claude or ChatGPT writes each update, agenda and recap as **blocks with levels**; the app builds one version per category level, checks every fact, flags moved promises, gets one- or two-step approval and sends through the TrialAgents external exchange (update rooms, §5 and §6 U1–U4).

## Files

| File | What |
|---|---|
| `investor-updates.source.js` | Canonical app source. Line 1 `templateLayoutSchema` (5 screens; column groups `investors`, `updates`), line 2 `appCommands` (39 commands), then one `handle` function for every control and the command runner. |
| `investor-updates.css` | Vivid kit, forest theme. |
| `catalog.metadata.json` | Catalog entry without source: options, instructions, documentation, the three E7 helpers, four install recommendations and the `scheduled_draft` app feature. |
| `schema.example.json` | Installer schema (registered in `templates/catalog-installers.json`). |
| `functions/` | Read-only helpers: `plan_brief.js`, `meeting_brief.js`, `updates_digest.js`. |
| `demo_data.json` | Fictional demo set (as of 15 Nov 2026). |
| `investor-updates.preview.html` | Generated offline preview (fictional, sends nothing). |
| `AUTOMATION_RECIPES.md`, `QA.md` | Automations and the verification record. |

Build: `node scripts/build-investor-updates-template.mjs` writes `templates/apps/life.investor-updates-1.0.0.json` and the preview; `--check` runs in `npm run build`. Lines 1 and 2 stay verbatim; the rest is minified (identifiers unchanged).

## Screens

1. **Overview**: what is due (email update per plan with its send-by date, meetings with the state of their before part), drafts waiting, engagement of the last update per category, open questions and offers of help.
2. **Updates**: email updates and meeting parts with filters; the side panel has **Review** (each category version exactly as rendered, fact panel, promise tracker, compare with previous, blocks and levels, documents, approve) and **Engagement** (reads per category and person, responses, not-read reminder, correction notice, PDF). Meetings list with their before and after parts.
3. **Investors**: People, Categories (level, description, share-class rule, toggles), Share classes.
4. **Plans & templates**: plans (due period, Draft now, pause/resume, Set up automation instructions) and templates (sections with default levels, brief, design).
5. **Settings**: sender, approval steps, meeting lead time, confidentiality footer, questions and "I can help", email default texts, labels, preferences, custom fields, automations and access.

## How the main flows work

- **Standard setup.** The installer creates empty tables; **Add the standard setup** (or the first settings save) creates the Board, Investors and Shareholders categories and the five standard templates as normal records, in one review.
- **Versions.** Level order everyone < investors < board. A version holds the blocks at or below its level. A person in several categories of one send gets one email, the highest version they may see (`deliveries.level`).
- **Send.** Approve → **Prepare recipients** (delivery records, reviewed) → **Create links** (update rooms and personal links, applied on the click; nobody outside sees anything) → **Prepare email** (`exchange.prepareEmail`, shown exactly as returned, with the Gmail/Outlook/Apple Mail checks) → **Send** (one confirmation per version; the first locks the update and advances the plan's next period end in the same transaction).
- **Engagement.** TrialAgents records reads and responses into `deliveries` and `responses` (source tracked; not editable). Questions use the reserved ask `question`; answers go privately (`exchange.reply`) or to everyone invited (`exchange.replyAll`, asker not named). Not-read reminders resend the update to non-readers after a confirmation.
- **Correction.** A sent update is locked. **Create correction notice** starts a new update with `correction_of`.

## Deviations from the scope (contracts win)

See QA.md §Deviations for the full list with reasons: the standard records are created on first use (the installer cannot seed records); questions use an ask because update pages have no question box; one confirmation per version; the not-read reminder is confirmed when needed rather than pre-approved at send; charts render as bar tables and the PDF is attached by a person; the fact panel re-reads only bound tables; the scheduled draft runs from `plans.next_period_end`; `settings.email_texts`, `deliveries.person_id/organization_id` and response tracking fields were added for the platform contracts; `deliveries.status` and three `responses` fields are not required.
