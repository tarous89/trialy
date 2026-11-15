# Investor Updates 1.0.0 — QA record

Scope: [INVESTOR_UPDATES.md](../../../docs/product/app-template-blueprints/apps/INVESTOR_UPDATES.md), revised 15 November 2026 (scope PR #186). Template guidance 1.3.31, rechecked against 1.3.32 (app code access): customization stays in settings, layout and records, and the catalog code holds no workspace data. Status: **draft** (not in `catalog-seed.json`; approval is the owner's).

## Commands and outcomes

| Check | Command | Result |
|---|---|---|
| Unit (production QuickJS, demo data) | `node --no-wasm-code-gc --import tsx --test tests/investor-updates.test.ts` | 19 tests pass |
| App commands | `node --no-wasm-code-gc --import tsx --test tests/investor-updates-commands.test.ts` | 7 tests pass |
| Integration (disposable PGlite, every migration, runtime role) | `node --no-wasm-code-gc --import tsx --test tests/investor-updates-integration.test.ts` | 3 tests pass (≈5.6 min) |
| Browser (production sanitized frame, 1440 and 390 px) | `node --import tsx scripts/test-investor-updates-browser.ts` | passes |
| Build | `node scripts/build-investor-updates-template.mjs --check` (in `npm run build`) | verified (≈211,000 source characters, ≈275 KB file) |
| Full suite and build | `npm run build`, `npm test` | see the PR (run on this branch) |

Local note: the sandbox ships a newer Chromium build than Playwright 1.51.1 expects; the local runs used symlinks to it outside the repository. CI uses its own browsers.

## Acceptance criteria (§14) → evidence

| # | Criterion | Evidence |
|---|---|---|
| 1 | Install: four recommendations shown on; Add app creates the app, three categories, five templates and the selected automations | Integration test 1: `dataAccessStep` lists `meeting_before_draft, ready_for_review, new_response, weekly_digest`, all enabled; automations reconcile. **Deviation:** the installer cannot seed records, so the categories and templates come from "Add the standard setup" in one review (unit test "standard setup", integration test 1). |
| 2 | Category by share class; a person in Board and Investors gets one email, the board version | Unit "membership by category and share class" (Series A holders = 5 holders, +1 added directly; Mara once, board version); integration test 3 (one delivery per person at level board). |
| 3 | Three previews differ only by level blocks; recipients cannot see removed blocks | Unit "versions"; unit "renderer" (the removed board block is absent from the investors/everyone content sent to the exchange). |
| 4 | Set up automation on a monthly plan → one draft per period; a second run none; "Draft now" in chat the same; ready-for-review email | Integration test 2: `prepareAppRecipe`/`confirmAppRecipe` with the plan as context (assistant cannot confirm), active; a repeat setup returns `existing`; run 1 creates one `in_review` update (create only; update and other tables refused); run 2's brief says skip; the app also refuses a duplicate (commands test). `ready_for_review` is a database action to the owner. **Not verified:** the dispatched email for a database trigger end to end (the action and its trigger are asserted). |
| 5 | Meeting before part 7 days ahead with cited documents; "3 of 5 read" | Recipe trigger `meeting_date` −10,080 min asserted (unit package/metadata, integration grants); brief marks meetings to skip; demo shows "3 of 5" for the sent before part (unit screens). **Manual:** a live runner drafting an agenda with attached documents. |
| 6 | Question on the page; private answer reaches only the asker; group answer reaches everyone without naming the asker | Integration test 3 (real recipient API: `question` ask with a note; `exchange.reply` message only on the asker's exchange; `replyAll` one message per live link, asker not named). **Deviation:** see §Deviations 2. |
| 7 | Recap from notes, sent to everyone invited, same series as the before part | Unit "both workflows" (meeting parts, after part refused when one exists); series key `plan:<id>` for meeting parts of a plan (`seriesOf`). **Manual:** a live recap draft from pasted notes. |
| 8 | Fact panel and promise tracker | Unit "fact panel" (Programs record changed: both values; document exists/missing; chat unverified; number without a fact blocks approval; tick required) and "promise tracker" (moved date flagged; explanation resolves it; missing statement flagged). |
| 9 | Two-step approval, one confirmation, email = preview, one link per person, lock, PDF; pre-approved reminder only to non-readers | Unit "two-step approval", "send"; integration test 3 (assistant cannot confirm; one human confirmation sends; emails equal the batch; one link per person; update locks in the same transaction; plan advances). **Deviations:** PDF attached by a person (§Deviations 5); reminder confirmed when needed, reaching only non-readers (unit "not-read reminder"; §Deviations 4). |
| 10 | Reads and responses without review, not editable; unsubscribed excluded next time | Integration test 3 (tracked status/read_count and responses written by `syncExchangeTracking`; edits refused "recorded by TrialAgents"; one-click unsubscribe → excluded from the next send of the series). |
| 11 | One-off update without a template, saved as a template, used by a plan | Unit "both workflows". |
| 12 | Assistants draft and propose only; parity; no approve/send command | Commands test (39 commands, parity per family, buffering, refusals); integration test 3 (`runAppCommand` proposals confirmed only by a person; no link in an assistant's run). |
| 13 | Modularity (rule 9) and archive first | Integration test 1 (Fundraise first: shared people/organizations connected; no Fundraise table bound; works alone; opted-out install works; archive pauses actions; restore returns them paused); integration test 2 (research monitors archived with the app; restored switched off); integration test 3 (archiving stops online links; restoring brings them back). |
| 14 | No automations: the app works fully | Integration test 1 (opted out; all screens). |
| 15 | Layout 1440/390 for app and recipient page; email in Gmail, Outlook, Apple Mail | Browser test (5 screens + review drawer, no page overflow; the platform-sanitised content as the page column and the platform-rendered update email at both widths); `clientChecks` empty for every prepared email (integration test 3) and for the platform-rendered email (browser test). Design gate (`inspectAppDesign`) passes in the unit test; the browser test checks the production frame. **Not verified:** real inboxes. |

## Deviations from the scope (the contract wins)

1. **Standard records at install.** `installCatalogApp` creates empty tables only (CONTEXT: "No seeded records"). The app shows "Add the standard setup", and the first settings save (also `settings.save`) creates the three categories and five templates in one review.
2. **Questions.** Update pages (rooms with content) have no question box and no messages (`/external-exchange/questions` returns "Reply to the update email"; messages are refused for rooms). Questions use a reserved ask `question` (U3) whose note is the question; it is recorded as a tracked `responses` row. The platform labels every ask button "I can help"; the ask text explains it. A per-ask button label would be a small platform follow-up. Answers go by `exchange.reply` (private) or `exchange.replyAll` (everyone with a live link of the part, asker not named; `publishClarification` reaches one group only).
3. **One confirmation per version.** The runtime allows one exchange change per action, and each version is its own update room (content is per group). A send with board, investor and everyone versions takes three confirmations; the first locks the update.
4. **Not-read reminder.** A pre-approved scheduled batch is fixed when prepared and would also reach people who read meanwhile. The reminder is prepared from Engagement for current non-readers (type `update`, the reminder text) and confirmed then.
5. **Charts and PDF.** Apps cannot create images or documents. Charts render as email-safe bar tables unless an attached PNG/JPEG/GIF chart document is cited; the PDF of a sent update is attached through the platform upload review (the only post-send change allowed besides `correction_of`).
6. **Fact check scope.** Apps read only bound tables, so the app re-reads facts from people, organizations, programs and its own tables; facts from other apps (Runway, Fundraise…) show "Not checked" and need the approver's tick.
7. **Scheduled draft trigger.** A contextual feature needs a role-carrying trigger (calendar triggers cannot carry the plan). `scheduled_draft` is a record-date trigger on `plans.next_period_end` (+3 days), which the app sets from the cadence and advances in the send confirmation.
8. **Automation editor.** Apps have no host attribute to open Automations; "Set up automation" names the path and the chat route.
9. **Schema additions/changes for platform contracts:** `settings.email_texts` (the editable default texts); `plans.next_period_end` (7); `deliveries.person_id`, `organization_id` (copied by TrialAgents to responses); `responses.ask_text, delivery_id, exchange_id, person_id, organization_id` (written by TrialAgents). `deliveries.status` is not required (tracked delivery fields cannot be required); `responses.recipient_id`, `kind` and `message` are not required (TrialAgents creates responses without them; the app derives the recipient from `delivery_id` and the kind from `ask_key`). `recipients.unsubscribed_on` is kept but not written: unsubscribes are per address and series in the exchange and read through `exchange.series`.
10. **Read scope of research.** Brief helpers may not read beyond the research's read bindings (`brief_scope`), so the read bindings are `fields:"all"` without `exceptFields`; the helpers choose what reaches the runner.
11. **Screens.** The scope has five screens (the brief said "the 5 screens"; an older scope said six).
12. **Scope PR.** The brief says scope PR #186 is merged; it was open when this was built. This branch is based on its head.

## Not verified here

Live Claude or ChatGPT sessions (commands through the hosts), a deployed install, real automation runs on a runner and their email delivery, real inboxes (Gmail, Outlook, Apple Mail rendering beyond the platform's client checks), and the React recipient page itself (its HTML segments are checked; the page component is covered by the platform's exchange tests).

## CI time budget

The `core` job on main already took about 40 minutes (run 1075: 39m41s; run 1073 was cancelled at its 40-minute limit), and this PR's suites add about 6 minutes, so the first CI run was cancelled at 40 minutes with no failing test. This PR raises the `core` job's `timeout-minutes` to 60 in `.github/workflows/check.yml`. It also seeds the integration fixtures through reviewed writes instead of UI clicks (those click paths are covered by the unit and command tests). No test is skipped.
