# Partnerships 2.0.0: QA against PARTNERSHIPS.md §13

Run on 14 November 2026 with fictional data only: production QuickJS, disposable PGlite databases with every migration and the runtime role, the real catalog installer and Use existing data? step, the shared research runner and email action pipeline, and the production sanitized frame with a manifest attached. No deployed account, connected assistant or real email was used.

| Test | Result |
|---|---|
| `tests/partnerships.test.ts` (16 tests: package, roles, demo data, screens, funnel, stage history, after-meeting log, history checks, acceptance 1, 3, 4, 5, 7, 8, recipes, partial reads) | pass |
| `tests/partnerships-integration.test.ts` (3 end-to-end tests through the real installer, runtime, reviews, runner, email action and archive) | pass |
| `tests/partnership-template.test.ts`, `tests/partnership-integration.test.ts` (released 1.1.1, archived source) | pass |
| `scripts/test-partnerships-browser.ts` (production frame, 1440 and 390 px) | pass |
| `node scripts/build-partnerships-template.mjs --check` and `node scripts/build-partnership-template.mjs --check` (both in `npm run build`) | verified |
| `npm run check`, `npm run build` | pass |
| `npm test` (597 tests) | 595 pass. `cro-selection.test.ts` asserted the whole retirements list; it is now scoped to its own entries and passes. `monitoring-pv-integration.test.ts` (CO06 design gate at 390 px) fails identically on unmodified `main` in this container, whose Chromium build differs from CI's; not affected by this change. |

## Package checklist

| Item | Evidence |
|---|---|
| Source under `templates/source/partnership-tracker/` at 2.0.0; immutable `templates/apps/life.partnership-tracker-2.0.0.json`, a draft (seed keeps 1.1.1); display name Partnerships; 1.1.1 archived unchanged and listed in `catalog-retirements.json` | unit "package" |
| Roles as in §7: organizations, people, programs core.v1 read/write; agreements core.v1 optional read-only (core fields); dataroom.v1 integrations; eleven `partnerships.*` tables with the §7 fields, kinds, required flags and options | unit "roles"; integration "Acceptance 9" (16 tables at install, agreements not created) |
| Standard tag categories, standard stages and lost reasons, digest default text | unit "acceptance 5", "stage moves", "acceptance 4 (app side)" |
| `catalog.metadata.json` validates against the catalog schema (limits, documentation, tasks optional) | unit "package" |
| Fictional `demo_data.json`: 3 assets, 12 partners, 20 contacts, 18 opportunities in all seven directions, 1 upcoming conference with 6 briefs, signals and 3 target suggestions; `.invalid` emails | unit "fictional demo data" |
| `templateLayoutSchema` with seven screen IDs (overview, pipeline, partners, conferences, activity, research, settings); layout profile reorders and hides screens and columns | unit "package", "seven screens" |
| Design gate (contrast, overlap, overflow) at 1440 and 390 | integration "Acceptance 9": `inspectAppDesign` returns no issues |

## Acceptance

| # | Criterion | Result and evidence |
|---|---|---|
| 1 | Conference through chat: requests become contacts, opportunities and meetings tagged "BIO-Europe 2026"; a warning about a partner that declined last year; the saved view shows prep before and next steps after. | **Pass (app side).** The assistant's part is a set of reviewed `prepare_change` proposals described in the catalog instructions; the app shows them as soon as they are approved. Unit "history checks": Glenmoor's 2025 decline is shown on a new opportunity, contact, target acceptance and its conference request. Unit "acceptance 1" and the browser test: "Open its pipeline view" filters by the Conference tag (only BIO-Europe 2026 deals), it is saved as a shared view, and Log outcome writes outcome, next step and a follow-up in one review; After the event lists them. A live assistant session pasting real partneringONE requests was not run. |
| 2 | After-meeting log: one message creates an activity with materials and versions, a stage change (stage history) and two follow-ups, all reviewed. | **Pass.** Unit and integration "Acceptance 2": one proposal with 5 changes; nothing is written before a person approves; an assistant cannot confirm it. Browser: the log form in the sanitized frame (document version, contact, stage, two follow-ups), approved; the stage history row exists. |
| 3 | Gates: a Contracts CDA and a Data Room room show status and engagement; without either, fields stay manual and nothing breaks. | **Pass.** Integration "Acceptance 9": installed after Contracts and Data Room, agreements and dataroom.v1 connect read-only at install and the panel shows "Signed, active", access and engagement. Installed alone: no agreements table, manual references, all seven screens clean. Unit "acceptance 3": manual entries, the own Data Room table and the "Use Data Room's data" offer. |
| 4 | Research: weekly worker runs; signals and two targets appear; one accepted; the digest arrives in the §6 format within the word limit; daily or monthly changes the schedule. | **Pass (synthetic runner).** Integration "Acceptance 4": a verified runner, the research monitor with the Settings trigger (next run Monday 07:00 Europe/Berlin), a create-only signals scope (an attempt to create an opportunity is refused), three signals and two targets saved by the run, the run finished with the app's digest text, the run-completed email action delivers once to the member (a partner address is refused at setup), one target accepted in the app (Identified, source research), daily and monthly triggers saved and dispatch times checked. Unit: subject, section order, ≤ 3 items, ≤ 150 words, empty sections left out, no deal terms. A real Claude or ChatGPT scheduled run and real email delivery were not exercised. |
| 5 | Saved views: custom category Region; a shared Region + stage view visible to the team, a private one not. | **Pass.** Unit and browser: Region added in Settings, shared view visible to Marc, Anna's private view hidden from him; only the owner can change or remove a view. Private views are a picker preference, not a permission boundary (documented). |
| 6 | Funnel and win/loss match the stage history. | **Pass.** Unit: an independent fixture with skipped stages, lost and on hold; overview funnels equal a count computed in the test from the demo history. Integration and browser: funnel numbers after real reviewed stage moves. |
| 7 | No screen or automation sends email to partners. | **Pass.** Unit: across screens, panels and actions the app calls only `records.read`, `records.propose`, `documents.list` and `integrations.list`; no mail links. Browser: no requests leave the host. Recipes: email only to registered members; integration: a partner address is refused. |
| 8 | Assistants propose only; digest recipients are members only; no deal terms in email. | **Pass.** Integration: assistant confirmations refused for app proposals; research cannot write outside its create-only scope; recipients validated as members. Unit: digest excludes rationales, briefs, notes and agreement names. |
| 9 | Modularity (rule 9) and archive first; archiving the app pauses research and digest. | **Pass.** Integration "Acceptance 9": alone, with partner apps later, Contracts archived, a tab hidden, app archived (reinstall offers the restore), restored with records intact. Integration "Acceptance 4": archiving marks the research and email automations archived with the app and readiness becomes false. |
| 10 | Layout: desktop 1440 and mobile 390. | **Pass.** Browser test: seven screens at both widths with no page overflow and no error banner; opportunity drawer and follow-up form on mobile; design gate clean. |

## Decisions and limits

- The sanitized frame strips `open` from `<details>` and custom `data-*` attributes, so filters and panel forms are inline sections and the digest and schedule carry ids.
- Records in one review cannot reference each other's new IDs: a new opportunity's first stage is its current stage (stage history records changes), and new partners are saved before the opportunities that use them.
- Document versions are shown as the platform numbers them (a first upload is v0), as in Data Room.
- Local browser runs used the container's Chromium build linked to the path the pinned Playwright 1.51.1 expects; CI installs its own browsers.
