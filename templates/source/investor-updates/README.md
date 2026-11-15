# Investor Updates 1.0.0 (`life.investor-updates`)

Scope: [INVESTOR_UPDATES.md](../../../docs/product/app-template-blueprints/apps/INVESTOR_UPDATES.md) (BT2-06, revised 15 November 2026). **Draft until the owner approves it**: it is not in `templates/catalog-seed.json`.

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
