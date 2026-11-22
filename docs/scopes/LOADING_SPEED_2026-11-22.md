# Loading speed scope: Apps home, archived apps, templates and individual apps

**Date:** 22 November 2026
**Status:** plan. Nothing in it is built until the progress table (section 9) says so.
**Covers:** four surfaces (Apps home, archived apps, templates, an individual app) on three hosts (website, ChatGPT plugin, Claude plugin).
**Goal:** every surface opens as fast as technically possible. What is already known is shown at once; anything that needs processing arrives afterwards and never holds the page back.
**Read at commit:** `1c19eef`. File and line references are in section 2.
**How to cite:** work packages by number (`L2.3` = session 2, package 3).

---

## 1. Summary in plain language

Every surface today waits for the slowest thing it will ever show before it shows anything. The Apps page reads every app's full code to draw cards that need a name and a kind. An app runs its code on the server before the first pixel. The plugins make several round trips through the assistant before the first screen.

The scope changes the order of work, everywhere, to the same three steps:

1. **Frame at once.** The page frame, navigation and headings appear without waiting for any request.
2. **Basics next.** One small request returns basic details only (names, kinds, dates, counts). On a return visit the last known basics are shown immediately and then checked.
3. **Details last.** Anything that needs processing (card miniatures, record counts, other tabs' data, checks for newer versions) loads after the screen is usable, in the background.

The work is four build sessions, each one pull request.

| Session | Theme | Main outcome |
| --- | --- | --- |
| L1 | Apps home and archived apps | Cards appear from one small query; miniatures and archive details load afterwards; the website shows its frame at once |
| L2 | Individual apps | An app opens to Overview from one lean request; other tabs load on demand; app code is downloaded once and reused |
| L3 | Templates and the plugin path | Templates appear at once and are remembered; plugin screens need no extra round trip before first paint |
| L4 | Instant return visits and capacity | Last known basics shown immediately on every host that allows it; warm-up; server capacity; acceptance in real ChatGPT and Claude |

---

## 2. What is slow today (evidence)

### Measured locally

In-process test database, no network between server and database. Production adds one network round trip per query on a Render starter instance (`render.yaml`), so these are lower bounds.

**Apps home list**

| Account | Queries | Read from database | Sent to browser | Local time |
| --- | --- | --- | --- | --- |
| 3 small apps | 33 | ~0 MB | 1.7 KB | 30 ms |
| 20 active apps, 200 KB code each | 101 | 10.4 MB | 8.3 KB | 118 ms |
| 20 active + 20 archived apps | 154 | 18.7 MB | 8 KB | 363 ms |

Catalog app code is about 200 KB per app (`templates/source/*/*.source.js`), so the 200 KB rows are realistic.

**Individual app open** (tiny fixture apps): details only 10 queries; with first screen 34 to 64 queries. `docs/PERFORMANCE_MEASUREMENT.md` records 124 to 185 queries for a real catalog app making six reads.

**Files the browser downloads:** website script 1.0 MB in one file and styles 216 KB (`dist/web/assets`); plugin widget 2.57 MB in one file (`dist/embed.html`).

### Not measured

Production timings. I had no access to production logs or to the experienced-speed table (`ux_timing_daily`, `npm run ux:report`). Package L1.0 collects them before anything is changed, so every later claim has a before and an after.

### Causes, by surface

| # | Surface | Cause | Where |
| --- | --- | --- | --- |
| C1 | Apps home | The list reads whole app rows, code included, for every app in the organization, archived ones too | `src/workspace/service.ts:174` |
| C2 | Apps home | Each app is then re-read (code again) and permission-checked one at a time, in sequence | `service.ts:176`, `service.ts:97-106` |
| C3 | Apps home | Each card on the page is read a third time to build a live data miniature, plus its table and three sample rows | `src/workspace/home.ts:45-61` |
| C4 | Apps home | Each standalone automation costs one extra query; external links and older automations are looped the same way | `home.ts:24-29` |
| C5 | Apps home | The whole list is built and sorted, then cut to one page; across several organizations this repeats per organization | `home.ts:41-42`, `home.ts:75-84` |
| C6 | Website | Nothing is shown until the account check returns ("Opening TrialAgents…"); account, settings and Apps list are three requests; one 1.0 MB script | `src/web/main.tsx:109-116`, `main.tsx:139` |
| C7 | Archived apps | Even the collapsed count re-reads and permission-checks every archived app (code included); the expanded list adds two queries per app | `src/workspace/archive.ts:38-45` |
| C8 | Templates | The website asks for the list on every visit; the interactive preview is never cached | `src/shared/TemplateCatalog.tsx:15`, `src/server/apps.ts:30` |
| C9 | Templates in plugins | Every card image is its own request through the assistant, returned as inline image text | `src/embed/main.tsx:87`, `src/server/apps.ts:80-81` |
| C10 | Individual app | The app's code runs on the server to produce the first screen, and the browser then builds the same screen again | `service.ts:753-760`, `docs/FRONTEND_CODE.md` (browser runtime) |
| C11 | Individual app | Permission lookups repeat for every bound table and every read | `service.ts:201-211` |
| C12 | Individual app | Customised copies and older versions stay in server mode: every click is a server round trip | `src/workspace/browser-runtime.ts`, `templates/browser-runtime.json` |
| C13 | Individual app in plugins | The assistant's "open app" result carries no first screen, so the widget asks again; it also waits for the account and the table list before showing the app | `src/workspace/apps.ts:45-49`, `src/embed/tracker-loading.ts:3-21` |
| C14 | Plugins | Every plugin request builds the whole tool list again (about 200 tools) before doing any work | `src/server/mcp.ts:42-47` |
| C15 | All hosts | No surface keeps anything between visits, so a return visit costs the same as a first visit | `src/shared/useHomeData.ts`, `src/shared/early-reads.ts` |

Already fixed on this branch (commit `1c19eef`): returning to the browser tab showed the loading bar on every switch.

---

## 3. Targets

Proposed, to be confirmed against the L1.0 baseline. "Shown" means visible and usable, at the 75th percentile, as in `docs/PERFORMANCE_MEASUREMENT.md`.

| Surface | First visit | Return visit | Server budget (enforced by tests) |
| --- | --- | --- | --- |
| Website frame | at once, before any request returns | same | none |
| Apps home cards | within 0.3 s of the request starting | at once from last known basics, checked in the background | at most 6 queries for any number of apps; no app code read |
| Archived apps count | with the cards (same request) | at once | 0 extra queries |
| Archived apps list | within 0.3 s of expanding | at once | at most 3 queries for any number of apps |
| Templates | within 0.3 s | at once | 1 query; nothing re-read while the catalog is unchanged |
| Individual app, Overview | within 1 s | frame and name at once, content within 0.5 s | at most 25 queries; app code not sent when the browser already holds it |
| Individual app, other tabs | at once when prepared; otherwise within 0.5 s | same | one batched read per tab |
| Plugins, any surface | no round trip between the assistant's result and first paint | same | as above |

One limit that cannot be removed: in ChatGPT and Claude the assistant itself takes time to decide to open TrialAgents and to deliver the result. That time is outside the platform. Everything after the result arrives is in scope.

---

## 4. Architecture choices

**A. A lean app index.** One query returns the basics of the apps a person may see: id, name, kind, project, updated date, the person's role, archived or not. No app code. Permission is decided in the same query for the whole set, with the same rules as today's per-app check (organization role, app members, allowed users, project access, assistant permissions). The index feeds Apps home, the archived count and the archived list.

**B. Details are separate, later requests.** Card miniatures, table record counts, automation counts and update notices are asked for after the screen is shown, for the items on screen only, in one batched request per kind. A slow or failed detail leaves the card as it is.

**C. One start request for the website.** A small inline script in the page starts one request (account, settings, first page of the app index) before the main script has even downloaded. The frame is drawn at once. The main script is split so the Apps page does not download the database viewer, settings and editors.

**D. Last known basics, checked.** Each host keeps the last basics it showed (card names and kinds, template list, an app's name and tab names: never records) per signed-in person. They are shown immediately, marked as being checked, and replaced when the server answers. A cheap revision check (`homeRevision`, 4 queries today) decides whether anything must be re-read. Signing out, a different account or a removed permission clears them.

**E. Result-first in plugins.** The assistant's tool result already carries everything the first screen needs (the app index page for "open workspace", the first screen for "open app"). The widget paints from the result and asks for nothing first.

**F. App code is downloaded once.** App code is addressed by its fingerprint and cached by the browser permanently, like the app frame already is (`src/server/app.ts:44`). Opening an app sends data, not 200 KB of code.

**G. Overview first.** Opening an app loads what Overview needs. Other tabs' data is fetched when the tab is opened or prepared in the background after Overview is shown. The v2 contract already allows a read to return "pending" (`docs/FRONTEND_CODE.md`).

**H. Permission results are reused inside one request, never between requests.** A request works out the person's access once and reuses it for every table and read in that request. Nothing about access is remembered across requests, so removing access still takes effect on the next request.

---

## 5. Sessions and work packages

Each surface lists what changes on each host. "Both plugins" means ChatGPT and Claude, which share the widget (`src/embed/`).

### Session L1 · Apps home and archived apps

| Package | Work | Website | Both plugins |
| --- | --- | --- | --- |
| L1.0 | Baseline: read production logs and `ux:report`; add timings for Apps home, archive and templates next to the existing app timings; add query-count tests that hold the section 3 budgets | yes | yes |
| L1.1 | Lean app index (A) with a test that compares it with today's per-app check on generated accounts, both directions | yes | yes |
| L1.2 | Apps home reads the index; database-side paging and sorting; standalone automations, links and older automations in set queries (C4, C5) | yes | yes |
| L1.3 | Card miniatures as a later batched request for visible cards only (B); cards never wait for them | yes | yes |
| L1.4 | Archived count comes with the index; expanded list in at most 3 queries, record and automation counts as later details (C7) | yes | yes |
| L1.5 | Frame at once, one start request, split script (C) | yes | not applicable |
| L1.6 | "Open workspace" result carries the first index page; the widget paints from it (E) | not applicable | yes |

### Session L2 · Individual apps

| Package | Work | Website | Both plugins |
| --- | --- | --- | --- |
| L2.1 | One-pass open: the app is read once, access worked out once per request (H), reads batched; budget 25 queries (C11) | yes | yes |
| L2.2 | App code by fingerprint, cached permanently (F) | yes | yes |
| L2.3 | Browser-mode apps: the browser builds the first screen from data; the server stops building a copy that is thrown away (C10). Server mode stays as the fallback | yes | yes |
| L2.4 | Overview first, other tabs on demand or prepared after Overview (G) | yes | yes |
| L2.5 | App frame and name shown at once when opened from a card; the app frame document and engine are prepared while the Apps page is idle | yes | yes |
| L2.6 | "Open app" result carries the first screen; account and table list no longer hold the app back (C13) | not applicable | yes |
| L2.7 | Report which installed apps are in server mode and why; move compatible ones to browser mode; list the rest for the owner (C12) | yes | yes |

### Session L3 · Templates and the plugin path

| Package | Work | Website | Both plugins |
| --- | --- | --- | --- |
| L3.1 | Template list keyed by catalog fingerprint: unchanged catalog means nothing is re-read or re-sent (C8) | yes | yes |
| L3.2 | Card images at the size shown, cached permanently by fingerprint | yes | yes |
| L3.3 | Card images loaded directly as images where the host allows it, otherwise one batched request for the visible cards (C9) | not applicable | yes |
| L3.4 | Interactive preview cached by fingerprint and prepared when a card is hovered or focused | yes | yes |
| L3.5 | Plugin requests reuse a prepared tool list instead of building 200 tools per request (C14) | not applicable | yes |
| L3.6 | Widget file: measure what the 2.57 MB contains and remove what the first screen does not need | not applicable | yes |

### Session L4 · Instant return visits and capacity

| Package | Work | Website | Both plugins |
| --- | --- | --- | --- |
| L4.1 | Last known basics (D) for Apps home, archived count, templates and each app's frame | yes | where the host permits storage; otherwise unchanged |
| L4.2 | Response compression and caching headers checked on every static and list response | yes | yes |
| L4.3 | Capacity: database connection settings and instance size against the measured load (owner action for the plan, section 7) | yes | yes |
| L4.4 | Acceptance in real ChatGPT and Claude on desktop and phone, and on the website at phone width; before and after numbers recorded | yes | yes |

---

## 6. Defaults adopted

Open points are resolved this way unless the owner says otherwise.

1. **Card miniatures stay**, but load after the cards. A card without a miniature shows its cover.
2. **Permission rules do not change.** The index must return exactly what today's per-app check returns; a difference in either direction fails the build.
3. **Nothing about access is cached between requests.** Removal of access takes effect on the next request, as today.
4. **Last known basics hold no records**, only names, kinds, dates, counts and tab names. They are kept per person, cleared on sign-out and on account change.
5. **Server mode stays** as the fallback for apps and hosts that cannot run in the browser.
6. **No app template changes** in sessions L1 to L3. If Overview-first (L2.4) needs a template change for a catalog app, it is listed for approval rather than made.
7. **Saved data, receipts and approvals are untouched.** This scope changes reads and the order of loading only.

---

## 7. What only the owner can do

1. **Share production numbers** or grant read access to the logs and `npm run ux:report`, for the L1.0 baseline.
2. **Decide on last known basics (default 4).** They make return visits instant; the cost is that a card name can be shown for a moment after the app was renamed or removed elsewhere.
3. **Approve the hosting plan** if L4.3 shows the starter instance is the limit.
4. **Test in real ChatGPT and Claude** at the end of L3 and L4. If tool results change shape, the plugins may need their tool list refreshed in each assistant.

---

## 8. Risks

| Risk | Handling |
| --- | --- |
| The set-based index shows an app the per-app check would hide, or hides one it would show | L1.1 comparison test on generated accounts covering every role, project, allowed-user and assistant-permission combination; database row security stays in force underneath |
| A late detail shows data the person lost access to between two requests | Every detail request checks access itself; details are never served from a previous request |
| Last known basics show something stale | Marked as being checked; replaced on the server's answer; cleared on sign-out and account change; no records stored |
| Plugins refuse storage or direct images | Each of L3.3 and L4.1 has a fallback that keeps today's behavior |
| Browser-only first screen differs from the server's | Server mode fallback; the existing "must be identical" check runs in tests for every switched-on catalog version instead of on every open |
| Budgets drift back | Query-count tests from L1.0 fail the build when a budget is exceeded |

---

## 9. Progress

| Session | Status | Pull request | Notes |
| --- | --- | --- | --- |
| Before L1 | built | none yet (branch `claude/zealous-cori-10snwn`) | Tab-return loading bar fixed, commit `1c19eef` |
| L1 | not started | | |
| L2 | not started | | |
| L3 | not started | | |
| L4 | not started | | |
