# CRO Selection 2.0.0 validation

This package was validated against the repository host on 13 November 2026, using fictional data only. The checks used disposable PGlite databases, the real catalog sync, the installer and Add app step, `runFrontend` (production QuickJS), the workspace review, the platform exchange domain, the supplier page API (`/external-exchange`, under the runtime role and row security), exchange email rendering and delivery (a capturing transport, not a real provider), and the production design inspector and sanitized frame. None of this ran on a deployed account.

**Catalog status:** draft. `templates/catalog-seed.json` still names 1.0.1, and 2.0.0 is approved only inside the test databases. `life.cro-selection` 1.0.1 and `life.sponsor-rfp-management` 1.0.1 are marked for archival in `templates/catalog-retirements.json`. The withdrawal happens in the owner's publication change; see `docs/TEMPLATE_CATALOG.md`.

**Guidance:** read 1.3.22 in full, in particular "External exchange from apps" and "Platform documents inside apps", plus the contract registry. Built on **1.3.24**, which this branch introduces after the owner's decision (one confirmation when something goes out). Contract registry version 2026-11-13 adds `croselection.awards`.

## Owner decisions applied (13 November 2026)

| Decision | How it shows in the app |
| --- | --- |
| One confirmation, when something goes out (platform) | Creating a round, creating links and sharing documents before anyone has seen the round are applied on click and logged. One review sends the invitation. |
| Update the supplier's status with the send | The send review carries "invited", `cda_status: sent` and the request stage, committed in the same transaction. Acceptance carries "submitted"; the signed CDA carries "signed"; the decision carries the award, the statuses and the notices. |
| Simpler revisions | Only the latest submission per supplier is shown and accepted; the platform keeps every version. |
| Simpler supplier feedback | "Notify all": one review, one private message and email per supplier. The winner gets the winner text; the others get one text that includes the debrief offer. Messages stay open after the deadline. |
| Simpler emails | One editable invitation text per request kind (RFI, RFP, quick quote). Other email types use the platform defaults. |
| Default templates | Built-in defaults per service type. Questions and cost categories are copied onto each request and edited there. There is no template table or library. |
| Not approved, so unchanged | Blind scoring is a setting, **off by default**. Qualification is available for any supplier at any stage. The CDA keeps all three options: send PDF, use Contracts, skip. The RFI round, bid defence, handoff and scheduled reminders stay as scoped. |

**Confirmations measured in the integration tests:**

| Flow | Confirmations |
| --- | --- |
| Quick quote, from the round to the notices (3 suppliers, 2 bids with files) | 6 |
| Full selection, from the new request to closing (4 on the longlist, RFI, 3 in the RFP, CDA gate, scoring, qualification, onboarding, handoff) | 49 |

Of the 49 confirmations in the full selection, 13 involve suppliers: two sends, seven acceptances (RFI and RFP answers), three signed CDAs and one file, one reply, one clarification, and the decision with notices. The rest are ordinary reviewed record edits, of which 11 are single checklist ticks.

## What changed outside the package

| Change | Where |
| --- | --- |
| One confirmation when something goes out. Preparation is applied on a person's click while nobody outside has seen the group. Reviewed exchange operations carry the app's `records.propose` changes in the same transaction. `reply_exchanges` adds a batch of private messages. `app_ref` on groups (migration 065). The send review shows the plan. A human-only check runs before anything else. | `src/domain/external-exchange.ts`, `src/workspace/service.ts`, `src/server/workspace-foundation.ts`, `migrations/065_exchange_app_ref.sql`, `tests/external-exchange-confirmation.test.ts` |
| Guidance 1.3.23 and the exchange scope §2.8 | `templates/TEMPLATE_AUTHORING.md`, `templates/TEMPLATE_USAGE.md`, `src/workspace/app-templates.ts`, `docs/product/EXTERNAL_EXCHANGE.md`, `CONTEXT.md` |
| Output role `croselection.awards`, contract `croselection.v1`, writer `life.cro-selection` (16 fields, exactly scope §7) | `templates/contracts/outputs.json`; `MODULAR_APPS_AND_SHARED_DATA.md` §7.3 |
| Scope update with the owner's decisions; data model without the template table and without copied exchange IDs | `docs/product/app-template-blueprints/apps/CRO_SELECTION.md` |
| 1.0.1 package moved unchanged to `archive/1.0.1/`; its build script, installer path, seed path and tests point there | `scripts/build-selection-template.mjs`, `templates/catalog-installers.json`, `templates/catalog-seed.json`, `tests/selection-template.test.ts`, `tests/fixtures/selection.ts` |
| 2.0.0 installer registration, build script and `--check` in `npm run build`; archival marker | `templates/catalog-installers.json`, `scripts/build-cro-selection-template.mjs`, `package.json`, `templates/catalog-retirements.json`, `docs/TEMPLATE_CATALOG.md`, `HISTORY.md` |

## Decisions and deviations, with reasons

- **Response table and required fields.** `croselection.proposals` is the response table of every exchange group. The platform requires each database-required field of a response table to be a supplier question. So `invitation_id`, `round`, `version`, `submitted_on`, `source` and `currency` are optional in the database, and the app sets and validates them at acceptance.
- **Questions.** The platform form asks only the response table's fields. So the request's questions go into the brief as a numbered list, answered in one Answers field, plus price, pass-through, currency, start, duration, deviations and notes. Line items per cost category come from mapping the bid file, done by the person or proposed by an assistant.
- **Handoff.** CRO Selection never writes another app's own tables. One reviewed save writes the draft award agreement into the shared agreements table, which Contracts shows in its pipeline. It also stores the prepared Runway spend line and Programs milestones on the award, with every field those tables require. The user's assistant proposes them in Runway and Programs through those apps' reviewed path.
- **Assistants never decide.** Exchange sends, replies and acceptances are human-only in the platform. Owners enforce "assistants never decide" with the documented Database rule: `croselection.awards` gets Claude and ChatGPT read, no write. The test proves both are then refused ("This table is read-only") and can still read the award.
- **Labs.** The core contract has no `lab` organization type, so the directory lists `cro`, `cdmo` and `other`, with `other` shown as "Lab / other".
- **Blind scoring.** When switched on, "every reviewer" means every reviewer who has scored this request; there is no reviewer list.
- **Catalog size.** The catalog copy of the source is whitespace- and syntax-minified at build time (identifiers unchanged), at 169,000 characters against the 180,000 limit. The canonical source stays readable.
- **Email subjects** carry no double quotes, because the platform strips them.

## Commands and outcomes

| Command | Result |
| --- | --- |
| `node scripts/build-cro-selection-template.mjs --check` | Passed |
| `node scripts/build-selection-template.mjs --check` (1.0.1, archived) | Passed |
| `npm run build` (all template drift checks, `tsc --noEmit`, `vite build`, embed build) | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cro-selection.test.ts` | 9/9 passed, including the production design inspector (8 screens and 6 panels, 1440 and 390 px) |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cro-selection-integration.test.ts` | 3/3 passed: acceptance 1 (quick quote), 2 (full selection), and 3, 7 and 8 together |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/external-exchange-confirmation.test.ts tests/external-exchange.test.ts` | 2/2 passed (the new one-confirmation rule, and the platform exchange acceptance) |
| `APP_DESIGN_CHECKS=off node --import tsx scripts/test-cro-selection-browser.ts` | Passed |
| `npm test` (full suite, 522 tests) | 521 passed. The one failure is `tests/monitoring-pv-integration.test.ts` (CO06), which fails identically on unmodified `main` in this container. |

The first full run found a regression in this branch, now fixed. Five unrelated workspace tests failed because operations that have their own `records` field were read as exchange record changes. Record changes are now taken only from exchange operations, and those five tests pass. `tests/monitoring-pv-integration.test.ts` (CO06) fails identically on unmodified `main` in this container, as recorded for Programs and Contracts.

A `PLAYWRIGHT_BROWSERS_PATH` maps the repository's pinned Playwright 1.51.1 browser names to the installed Chromium, as for Programs and Contracts. The browser test serialises app runs per person, as the host does. Two concurrent runs for the same person and app are refused by the platform ("busy"), which made earlier attempts fail when they ran alongside the integration tests.

## Hand calculations (fictional set `demo_data.json`, as of 13 Nov 2026)

| Case | Inputs | Expected | App |
| --- | --- | --- | --- |
| Sponsor baseline, PX-101 Phase 2 | 180,000 + 240,000 + 520,000 + 160,000 + 90,000 + 60,000 + 70,000 + 80,000 + 200,000 | EUR 1,600,000 | same |
| Helix v2 total | 170,000 + 250,000 + 560,000 + 150,000 + 95,000 + 60,000 + 75,000 + 80,000 + 210,000 | EUR 1,650,000; +50,000 (+3.1 %) | same |
| Helix monitoring | 560,000 − 520,000 | +40,000 (+7.7 %), flagged "Assumes 10% more on-site visits" | same |
| Northlake EUR total | 150,000 + 200,000 + 310,000 + 140,000 + 80,000 + 50,000 + 60,000 + 70,000 + 180,000 | EUR 1,240,000; −360,000 (−22.5 %) | same |
| Northlake USD line | central laboratory USD 40,000 | listed under other currencies, never added to EUR | same |
| Meridian, no lines | stated total 1,580,000 | −20,000 (−1.2 %), "Stated total, no lines yet" | same |
| Pass-through share | Helix 210,000 / 1,650,000 | 12.7 % | same |
| Weighted score Helix | means 4.5, 4, 3.5, 4, 3, 4.5 × weights 25, 20, 20, 15, 15, 5 | 390 / 100 = 3.90 | same |
| Weighted score Northlake | means 3.5, 3, 2.5, 2.5, 5, 3.5 | 327.5 / 100 = 3.28 (rounded on the ×100 scale); Quality system 2.5 < 3 fails mandatory | same |
| Quick quote (acceptance 1) | baseline 120,000 + 40,000 + 30,000 + 20,000; Quartz 198,000; Ember v2 214,500 | 210,000; −12,000 (−5.7 %); +4,500 (+2.1 %) | same |
| Full selection, Northlake mapped (acceptance 2) | lines 150,000 + 310,000 + 140,000 + 180,000 vs baseline 1,060,000 | 780,000; −280,000 (−26.4 %); monitoring −210,000 (−40.4 %) | same |
| Handoff (acceptance 2) | 1,650,000 over 20 months from 1 Feb 2027 | 82,500 per month, Feb 2027 – Sep 2028; milestones 18 Jan, 1 Feb, 2 May 2027 | same |
| Handoff (acceptance 7) | 1,200,000 over 12 months from 4 Jan 2027 | 100,000 per month, Jan – Dec 2027 | same |
| Question deadline default | response 10 Jan 2027 − 7 days | 3 Jan 2027 | same |

## Acceptance criteria (CRO_SELECTION.md §13)

1. **Quick quote end to end: passed** (integration test 1).
   - Three supplier links come from one click. One confirmed send delivers three emails: the default text for two, and the text the assistant personalised for Ember.
   - Each delivered text and subject equals the preview, from `Example Therapeutics at TrialAgents <no-reply@trialagents.com>`. The same confirmation marks all three suppliers invited.
   - The assistant prepared a batch, but its confirmation was refused, and it never received links.
   - Two suppliers submitted with files, and Ember revised its quote; only version 2 is offered. Each acceptance also marked the supplier submitted.
   - The comparison matches the hand calculation. The decision and the notices to all three went out in one confirmation, and every supplier page shows its notice.
2. **Full selection end to end: passed** (integration test 2).
   - The RFI group goes to the longlist with one send. Three answer, their answers are accepted, three are shortlisted and one is declined.
   - The RFP group has the pack and the CDA with the gate on: the pack stays locked until the accepted signed CDA, which also marks the CDA signed.
   - A private reply reached only Helix. A published clarification went to all three, anonymised and emailed.
   - Helix saved a draft and resubmitted. After the deadline a submission was refused, and only the latest version was offered.
   - Accept-and-map: the assistant proposed Northlake's lines, and a person approved them. The grid matches the hand set.
   - Blind scoring, switched on for this selection, hid prices until complete. Scores were 3.90 and 3.28, and Northlake fails the mandatory criterion.
   - Qualification was offered for a non-finalist too. Then the bid defence, the decision with notices in one review, onboarding with the award marked complete, the handoff, the linked agreement and the closed request.
3. **CDA via Contracts and CDA skip: passed** (integration test 3 and unit test).
   - The signed CDA is filed as a `cda_nda` agreement in the shared register, Contracts' CDA screen shows it, and the invitation links to it with status signed.
   - "Skip" records "in place elsewhere" with its date.
4. **Grid totals and deviations: passed** (unit test, hand table above). Other currencies are listed, never converted; a bid in another currency is not compared.
5. **Blind scoring and qualification: passed** (unit test).
   - Blind scoring is off by default. When on, prices stay hidden until complete or revealed for the session, and the reveal is for editors only.
   - A qualification issue blocks the decision without an override reason; the reason is stored in the rationale.
6. **Assistants draft but cannot send, publish, accept or decide; unaccepted uploads unreadable; links never shown: passed.**
   - Platform test, integration tests 1 and 3, and unit test. Assistant confirmations of a send, a batch reply and an acceptance are refused ("cannot approve").
   - An assistant running the app always gets a review. Awards are refused for both principals under the Database rule.
   - Unaccepted values are `null` for assistants, and no app screen outside the send review contains a link.
7. **Handoff with Contracts, Runway and Programs present: passed** (integration test 3).
   - The draft MSA is in Contracts' pipeline and linked to the award. The prepared spend line and three milestones were proposed by the assistant in Runway's and Programs' tables, approved by a person, and those apps open without errors.
   - With none present (integration test 2), the award stays, the handoff prepares a draft agreement in its own agreements table, and nothing errors.
8. **Modularity (rule 9) and archive first: passed** (integration test 3).
   - Installed after Contracts, Runway and Programs, it connects their tables (one agreements register).
   - The partner deleted (archived) leaves CRO Selection working. One tab (people) was removed and re-added: nothing was deleted and the same table reconnected.
   - Archiving the app stops both supplier links. Restoring re-enables the unexpired one, while the expired one stays closed. A reinstall offers "Restore your archived CRO Selection app".
9. **Desktop 1440 / mobile 390: passed.** The browser test ran all eight screens at both widths in the sanitized frame with a manifest: no error banner and no page overflow. It also covered the typed reviewed edit, the drawer on mobile and the layout gear. The design inspector passed on eight screens and six panels, and the screenshots were inspected.

Also covered:
- Every input has `data-ui-state`, a stable `data-action` and a `name`.
- Record versions are captured when forms open. A record changed between review and confirmation stops the whole send: nothing sent, nothing saved (platform test).
- A failed proposal keeps the draft.
- Partial, unbound and failing reads disable totals and "nothing waiting" answers.
- A change event cannot trigger an exchange write, and previews never call the exchange.
- Quick quotes have no RFI or bid defence.
- New requests get the built-in questions and cost categories for their service type.

## Defects found and fixed during validation

- The Overview said "Nothing is waiting" when exchange reads failed.
- Weighted scores of x.xx5 rounded down through floating point.
- Email subjects contained double quotes, which the platform strips.
- Drawers had an inner scroll that let the footer overlap fields.
- The screen-reader-only Actions header was clipped.
- Small buttons overflowed at 390 px.
- A stale "prepared for review" notice stayed visible after approval.
- In the platform, an assistant refused on a send with record changes saw "needs a refresh" instead of "only a person can approve"; the human check now runs first.

## Not verified here

- Live Claude and ChatGPT sessions on a deployed account, a real install from the website or the plugins, and real email delivery (provider, SPF, DKIM, DMARC). Emails were captured, not sent.
- How the host review dialog in the website, ChatGPT and Claude displays the new combined send-plus-records review. The review payload is tested; the generic review dialog renders it, but it was not inspected in those hosts.
- Automation setup or delivery: no reminder, digest or mapping automation was configured.
- The native layout save inside the host for this app. The declaration was checked with `readCustomLayout`, and the gear emits `tracker:layout`.
- `npm run test:visual` (the platform visual suite); see the PR for its CI result.
