# CRO Selection 2.0.0 validation

This package was validated against the repository host on 13 November 2026, using fictional data only. The checks used disposable PGlite databases, the real catalog sync, the installer and Add app step, `runFrontend` (production QuickJS), the workspace review, the platform exchange domain, the supplier page API (`/external-exchange`), exchange email rendering and delivery (a capturing transport, not a real provider), and the production design inspector and sanitized frame. None of this ran on a deployed account.

**Catalog status:** draft. `templates/catalog-seed.json` still names 1.0.1, and 2.0.0 is approved only inside the test databases. `life.cro-selection` 1.0.1 and `life.sponsor-rfp-management` 1.0.1 are marked for archival in `templates/catalog-retirements.json`. The withdrawal happens in the owner's publication change; see `docs/TEMPLATE_CATALOG.md`.

**Guidance:** template guidance 1.3.22 (`templateGuidance.version`), every section read, in particular "External exchange from apps" and "Platform documents inside apps". The guidance was not changed. Contract registry version 2026-11-13 adds `croselection.awards`.

## What changed outside the package

| Change | Where |
| --- | --- |
| Output role `croselection.awards`, contract `croselection.v1`, writer `life.cro-selection` (16 fields, exactly scope §7) | `templates/contracts/outputs.json`; `MODULAR_APPS_AND_SHARED_DATA.md` §7.3 |
| 1.0.1 package moved unchanged to `archive/1.0.1/`; its build script, installer path, seed path and tests point there | `scripts/build-selection-template.mjs`, `templates/catalog-installers.json`, `templates/catalog-seed.json`, `tests/selection-template.test.ts`, `tests/fixtures/selection.ts` |
| 2.0.0 installer registration, build script and `--check` in `npm run build` | `templates/catalog-installers.json`, `scripts/build-cro-selection-template.mjs`, `package.json` |
| Archival marker for the two replaced versions | `templates/catalog-retirements.json`, `docs/TEMPLATE_CATALOG.md` |
| History and context | `HISTORY.md`, `CONTEXT.md` |

The platform code was not changed.

## Decisions and deviations, with reasons

- **Response table and required fields.** `croselection.proposals` is the response table of every exchange group. The platform requires each database-required field of a response table to be a supplier question, so the five metadata fields marked `*` in scope §7 (`invitation_id`, `round`, `version`, `submitted_on`, `source`) and `currency` are optional in the database. The app sets and validates them at acceptance (`acceptData`). Without this, a supplier would have to type their own invitation ID. All other `*` fields are database-required.
- **Questions.** The platform form asks only the fields of the response table. The app therefore puts the question set into the brief as a numbered list, answered in one Answers field, plus price, pass-through, currency, start, duration, deviations and notes. Line items per cost category come from mapping the bid file, done by the person or as an assistant proposal.
- **One exchange change per click.** The platform allows one exchange write per action, and a record write cannot be in the same review. So creating a round, linking it to the request, creating links, recording links on invitations, preparing an email and sending it are separate reviewed steps. The app offers each follow-up right after the approval ("Link … as the RFP round", "Record links and status", "Record them").
- **Decision notices.** Each notice is one private message (`exchange.reply`, email type *message*) with its own review, so a batch of three suppliers takes three confirmations. The platform has no multi-recipient private message.
- **Handoff.** CRO Selection never writes another app's own tables (scope §11). The handoff makes one reviewed save. It writes the draft award agreement into the shared agreements table, a core role that Contracts shows in its pipeline. It stores the prepared Runway spend line and Programs milestones on the award (`handoff_status`), with every field their tables require. The user's assistant proposes them in Runway and Programs through those apps' reviewed path, which acceptance 7 exercises.
- **Assistants never decide.** Sends, publications, replies and acceptances are human-only in the platform. Record writes by an assistant are possible after the user confirms them, as for every app. Owners enforce "assistants never decide" with the documented Database rule: `croselection.awards` gets Claude and ChatGPT *read*, no *write*. The integration test proves that both principals are then refused ("This table is read-only") and can still read the award.
- **Labs.** The core contract has no `lab` organization type, so the directory lists `cro`, `cdmo` and `other`, with `other` shown as "Lab / other".
- **Blind scoring.** "Every reviewer" means every reviewer who has scored this request; the app has no reviewer list. Prices show when each of them has scored every scored supplier on every criterion, or when a person reveals them for the session. Scored suppliers are the finalists when any are marked, otherwise every non-declined supplier with an accepted proposal.
- **Catalog size.** The catalog copy of the source is whitespace- and syntax-minified at build time (identifiers unchanged), at 176,000 characters against the 180,000 limit. The canonical source in the package stays readable.
- **No seed data.** The default templates are fictional starting points, added by the user with one reviewed save in Settings.
- **Email subjects** carry no double quotes, because the platform strips them from subjects.

## Commands and outcomes

**In progress, not final.** Results as of this commit:

| Command | Result |
| --- | --- |
| `node scripts/build-cro-selection-template.mjs --check` | Passed |
| `node scripts/build-selection-template.mjs --check` (1.0.1, archived) | Passed |
| `APP_DESIGN_CHECKS=off node --import tsx --test tests/cro-selection.test.ts` | 9/9 passed, including the production design inspector (8 screens and 6 panels, 1440 and 390 px) |
| `tests/cro-selection-integration.test.ts`, acceptance 1 (quick quote end to end) | Passed |
| `tests/cro-selection-integration.test.ts`, acceptance 2 (full selection end to end) | Not yet passing. The last run failed on a test expectation (an assistant's confirmed record change was expected to be refused), now corrected and not yet rerun. |
| `tests/cro-selection-integration.test.ts`, acceptance 3, 7 and 8 | Not yet passing. Earlier runs failed on test wording, now corrected and not yet rerun. |
| `scripts/test-cro-selection-browser.ts` (1440 and 390 px) | Not yet passing. Runs collided with the concurrent integration tests, and a clean solo run is pending. |
| `npm run build`, `npm test` | Not run yet |

Browser-based checks (design inspector, browser test) ran against this container's Chromium. A `PLAYWRIGHT_BROWSERS_PATH` maps the repository's pinned Playwright 1.51.1 browser names to the installed build, as for Programs and Contracts. Test code was not changed for this.

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
| Weighted score Northlake | means 3.5, 3, 2.5, 2.5, 5, 3.5 | 327.5 / 100 = 3.28 (rounded on the ×100 scale; the first build showed 3.27 through floating point, now fixed); Quality system 2.5 < 3 fails mandatory | same |
| Quick quote (acceptance 1) | baseline 120,000 + 40,000 + 30,000 + 20,000; Quartz 198,000; Ember 214,500 | 210,000; −12,000 (−5.7 %); +4,500 (+2.1 %) | same |
| Full selection, Northlake mapped (acceptance 2) | lines 150,000 + 310,000 + 140,000 + 180,000 vs baseline 1,060,000 | 780,000; −280,000 (−26.4 %); monitoring −210,000 (−40.4 %) | same |
| Handoff (acceptance 2) | 1,650,000 over 20 months from 1 Feb 2027 | 82,500 per month, Feb 2027 – Sep 2028; milestones 18 Jan, 1 Feb, 2 May 2027 | same |
| Question deadline default | response 10 Jan 2027 − 7 days | 3 Jan 2027 | same |

## Acceptance criteria (CRO_SELECTION.md §13)

To be filled in once the runs above pass. Unit-level coverage of criteria 3, 4, 5 and 6 passes today.

Also covered:
- Every input carries `data-ui-state`, a stable `data-action` and a `name` on every screen.
- Record versions are captured when a form opens, and the version from that moment is sent.
- A failed proposal keeps the draft.
- Partial, unbound and failing reads (records and exchange) disable totals and "nothing waiting" answers and say so.
- Previews never call the exchange.
- A change event cannot trigger an exchange write.
- Quick quotes have no RFI or bid defence.
- The CDA gate requires the "send PDF" option.
- Criteria-set weights must add up to 100.
- The design inspector runs on eight screens and six panels.

## Defects found and fixed during validation

- The Overview said "Nothing is waiting" with zero counts when exchange reads failed. It now says the supplier status could not be read, and the counts show "—".
- Weighted scores of exactly x.xx5 rounded down through floating point.
- Default email subjects contained double quotes, which the platform strips.
- Drawers had an inner scroll that let the footer overlap fields. They now scroll with the page.
- The "Actions" column header was screen-reader-only and clipped.
- Long small buttons overflowed at 390 px.
- A stale "prepared for review" notice stayed visible after approval.

## Not verified here

- Live Claude and ChatGPT sessions on a deployed account, a real install from the website or the plugins, and real email delivery. The provider, SPF, DKIM and DMARC are configured outside the code; a capturing transport was used.
- Automation setup or delivery: no reminder, digest or mapping automation was configured.
- The native layout save inside the host for this app. The layout declaration was checked with `readCustomLayout`, and the gear emits `tracker:layout` in the sanitized frame.
- `npm run test:visual` (the platform visual suite); see the PR for its CI result.
