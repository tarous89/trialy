# Loading speed scope: Apps home, archived apps, templates and individual apps

**Date:** 22 November 2026
**Status:** sessions L1, L2 and L3 built (with the open items listed in section 9); L4 is a plan. Nothing else in it is built until the progress table (section 9) says so.
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
3. **Details last.** Anything that needs processing (card miniatures, record counts, other tabs' data, checks for newer versions) loads after the screen is usable, in the background and without the loading bar. In an app, every other tab is prepared this way right after Overview, not when it is clicked.

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
| Individual app, other tabs | prepared in the background right after Overview, so at once; if opened before that finishes, layout at once and data within 0.5 s | same | one batched read for all other tabs, or one per tab when a tab is too large |
| Loading bar | stops when the main content is shown, on every surface | same | none |
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

**G. Overview first, every other tab straight after.** Opening an app loads what Overview needs and shows it. As soon as Overview is visible, every other tab is prepared in the background, automatically and without the loading bar, so that opening a tab needs no request. A tab opened before its preparation has finished shows its layout at once and fills in when its data arrives; that wait joins the request already running rather than starting a second one. The v2 contract already allows a read to return "pending" (`docs/FRONTEND_CODE.md`).

**I. The loading bar follows the main content only.** On every surface and host the global loading bar stops when the main content is shown: the cards, the template list, an app's Overview. Details that are still loading (miniatures, counts, other tabs, version checks) never start the bar and never keep it visible. A detail that is still loading shows a quiet placeholder in its own place. The bar remains for what a person starts on purpose: a search, a save, an explicit Refresh.

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
| L1.3 | Card miniatures as a later batched request for visible cards only (B); cards never wait for them. Loading bar rule (I) applied to every surface, with browser tests that hold a detail request open and check the bar is gone | yes | yes |
| L1.4 | Archived count comes with the index; expanded list in at most 3 queries, record and automation counts as later details (C7) | yes | yes |
| L1.5 | Frame at once, one start request, split script (C) | yes | not applicable |
| L1.6 | "Open workspace" result carries the first index page; the widget paints from it (E) | not applicable | yes |

### Session L2 · Individual apps

| Package | Work | Website | Both plugins |
| --- | --- | --- | --- |
| L2.1 | One-pass open: the app is read once, access worked out once per request (H), reads batched; budget 25 queries (C11) | yes | yes |
| L2.2 | App code by fingerprint, cached permanently (F) | yes | yes |
| L2.3 | Browser-mode apps: the browser builds the first screen from data; the server stops building a copy that is thrown away (C10). Server mode stays as the fallback | yes | yes |
| L2.4 | Overview first; every other tab prepared in the background right after it, quietly (G). Preparation is paused while the person is saving or the page is hidden, and bounded for very large tabs | yes | yes |
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
| L4.4 | Acceptance in real ChatGPT and Claude on desktop and phone, and on the website at phone width; before and after numbers recorded. Includes whether each host loads card images and widget code from the platform origin (L3.3, L4.5) | yes | yes |
| L4.5 | Widget in two parts (owner decision 23 November, section 6 item 9): the first part holds only what the first screen needs and stays inside the widget; everything else is one download started right after the first screen is shown, quietly. It loads from the platform origin; where the host refuses, through the assistant; if both fail, those screens show a retry. A build switch puts everything back in one file | not applicable | yes |
| L4.6 | Claude's inline app frame uses the widget's font instead of a second copy (owner decision 23 November, section 6 item 10) | not applicable | yes |

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
8. **Background preparation yields.** It never delays a click, a save or the tab the person actually opened, and it stops when the page is hidden. Tabs prepared in the background are refreshed after a save, as today's prepared screens are.
9. **Widget split (decided 23 November 2026).** The Inter font stays inside the widget (no font change on first paint). The platform origin stays in the widget's resource domains (card images, L4.5). Pages the first screen does not show leave the widget file and load together right after first paint (L4.5); a screen opened before they arrive shows its frame at once and fills in, without a second download.
10. **Claude's inline app frame stays** (app opens stay immediate in Claude); only its duplicate font copy is removed (L4.6).

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
| Preparing every tab adds server work for tabs nobody opens | One batched read after Overview instead of one per tab; paused when hidden or saving; L1.0 timings show whether a size limit per tab is needed |
| Budgets drift back | Query-count tests from L1.0 fail the build when a budget is exceeded |

---

## 9. Progress

| Session | Status | Pull request | Notes |
| --- | --- | --- | --- |
| Before L1 | built | none yet (branch `claude/zealous-cori-10snwn`) | Tab-return loading bar fixed, commit `1c19eef` |
| L1 | built, except the items below | branch `claude/upbeat-allen-lcc5wd` | See below |
| L2 | built, except the items below | branch `claude/clever-einstein-ei8d6h` | See below |
| L3 | built, except the items below | branch `ccr-e560ba20-0arkla` | See below |
| L4 | not started | | |

### Session L1 in detail

Measured before and after in [performance measurement](../PERFORMANCE_MEASUREMENT.md#loading-speed-session-l1-apps-home-and-archived-apps-22-november-2026). On a 40-app account, Apps home went from 165 queries and 20 MB read to 12 queries and 32 KB; the archived list from 82 queries to 6.

| Package | Status | Notes |
| --- | --- | --- |
| L1.0 | partly built | Query budgets in `tests/loading-speed.test.ts`. `home`, `archive` and `templates` timings (migration 098). Production baseline not taken: owner action 7.1. Home's budget is 14 queries, not 6 (see the measurement page for what remains); none of them grows with the number of apps |
| L1.1 | built | `src/workspace/app-index.ts`; `tests/app-index.test.ts` compares it with the per-app check on generated accounts, both directions |
| L1.2 | partly built | Home reads the index; projects and placements from one project read. Not built: database-side paging and set queries for a person's own standalone automations, links and older automations (they grow with that person's automations, not with apps) |
| L1.3 | built for Home | Miniatures are `read_home_snapshots`, a quiet later read for the cards on screen, with a browser test that holds it open and checks the bar. Rule I for other surfaces' details comes with those details (L2, L3) |
| L1.4 | built | Count with the Home read, no request; list in 3 queries beyond the count. Record and automation counts are batched into the list request rather than a later one |
| L1.5 | partly built | Frame drawn by `index.html` before any script; `public/start.js` starts the account check and Home read before the main script downloads. Not built: splitting the main script |
| L1.6 | built | `open_workspace` carries the first Home page; saved views no longer hold the widget's first paint |

### Session L2 in detail

Measured before and after in [performance measurement](../PERFORMANCE_MEASUREMENT.md#loading-speed-session-l2-individual-apps-22-november-2026). Opening Runway (13 tables) went from 596 queries to 58 for the owner (679 to 63 for a member); a frame open from 527 to 56; the plugin open from two requests (70 + 527 queries) to one (58).

| Package | Status | Notes |
| --- | --- | --- |
| L2.1 | built, budget above target | One request-wide scope per open (`readComponent` with its first screen, `runFrontendRequest` for frame opens) in the app's own database context; tables read in one query; reused rows verified per table; short pages need no count. Budget in `tests/loading-speed-apps.test.ts`: 52 platform queries plus the app's own data reads, not the scope's 25 (measured 43 to 48; the measurement page lists what remains, mostly the runtime view read before each of the app's reads). Events that may save keep their per-unit checks |
| L2.2 | partly built | Frame payloads never carry code the host holds (`browser.have`); every open carries the frame's reads; code by fingerprint (website URL cached by the browser, cleared on sign-out; plugins `read_app_code`), or taken from the app's metadata when the fingerprint matches. Not built: the open still carries `component.source` for the settings, layout and code editors, so the code still travels once per open |
| L2.3 | not built | The server still makes the first screen of browser-mode apps. Making it in the browser needs the reads first (a second round trip on a first visit) and would lose the identical-screen check; to be weighed with last known basics (L4.1) |
| L2.4 | built | Standard trackers prepare every other visible tab (at most 8), browser-mode apps their linked screens, right after Overview; quiet, paused while hidden or saving, stopped when the person acts; bounded by 8 screens, 12 reads per request and the 2 MB seed limit |
| L2.5 | partly built | Name and loading frame at once from a card; the website prefetches the frame document while idle. Not built: preparing the engine ahead |
| L2.6 | built | `open_app` carries the first screen as widget-only result metadata; account and table list load alongside |
| L2.7 | partly built | `npm run apps:runtime-report` (owner, read-only). All 16 catalog apps offered on every channel are switched on; the 16 hidden from a channel have no browser test and stay on server mode; customized copies stay on server mode and are listed per workspace |

### Session L3 in detail

Measured before and after in [performance measurement](../PERFORMANCE_MEASUREMENT.md#loading-speed-session-l3-templates-and-the-plugin-path-23-november-2026). The template list is one query and, with a held fingerprint, a 63-byte answer instead of 22 KB; the 16 card images went from 1.85 MB (website) and 16 tool calls carrying 2.46 MB (plugins) to 640 KB loaded as images; a plugin tool call went from about 6.2 ms to 2.7 to 5.6 ms depending on its tool group and a tool list from about 42 ms to 10 ms (in-process); the widget file from 2.57 MB to 1.84 MB.

| Package | Status | Notes |
| --- | --- | --- |
| L3.1 | built | The list carries a catalog fingerprint (channel, approved versions and digests); `list_app_templates` with `catalog` answers only `{catalog, unchanged:true}`. The catalog read is one query and returns no template payload the server already holds. The website and the widget show the list they already hold at once and check the fingerprint quietly (rule I). Budget in `tests/loading-speed-templates.test.ts`. Not built: keeping the list across page loads (L4.1); today it is held for the life of the page or widget |
| L3.2 | built | 720×480 card images (`resources/template-gallery/cards/`, `scripts/build-template-cards.mjs`, checked in `npm run build`), about 40 KB instead of 115 KB. Website card and screenshot addresses with the exact digest are `private, max-age=31536000, immutable`; the server keeps served media in memory by digest (approval and channel still checked per request, one query) |
| L3.3 | built, unverified in the real hosts | The widget declares the platform origin in its resource domains and loads cards from a public, digest-exact address (`/template-cards/:channel/:id/:version/:digest.jpg`, catalog pictures only, `public, immutable`). Where the host refuses, the cards on screen are read in one `read_app_template_cards` request (up to 12 per request); if that fails, each card is read with `read_app_template_media` as before. Whether ChatGPT and Claude honour the resource domain is owner action 7.4 |
| L3.4 | built | Previews are addressed by digest and kept for good (website), or kept by the widget for its life (plugins). Hovering or focusing a card prepares its preview quietly: the website in a hidden frame that runs no scripts (a `fetch` would not fill the frame's cache entry), the widget with `read_app_template_media` |
| L3.5 | partly built | A tool list is answered from a prepared list per endpoint variant (sign-in, assistant, widget build, configuration; never account data). A tool call registers only its tool and runs only the tool group that holds it (`src/server/mcp-sections.ts`), learned from a full build; an unknown tool falls back to the full build. Handlers and authorization are built per request with that request's actor. Not built: tools in the large workspace group (`workspace/core`, about 90 tools) still build that group's descriptors per call; splitting it further means restructuring `addWorkspaceMcp` |
| L3.6 | partly built, rest decided | Measured: 2.57 MB = script 1.90 MB (zod 454 KB of which 261 KB translations, the two 810 px brand marks inlined as 495 KB, react-dom 210 KB, MCP client 150 KB, app pages) + styles 669 KB (of which the Inter font 470 KB). Removed: zod's translations and the full-size brand marks (96 px copies). Now 1.84 MB (budget 1.9 MB in the test). Decided by the owner on 23 November (section 6, items 9 and 10): the font stays inside the widget; pages the first screen does not show move to L4.5; Claude's inline app frame stays and loses its second font copy in L4.6 |

