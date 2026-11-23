# Loading speed, session L4: owner actions

**Date:** 23 November 2026
**Belongs to:** [loading speed scope](LOADING_SPEED_2026-11-22.md), packages L4.3 (capacity) and L4.4 (real-host acceptance).
**Status:** recommendation and checklist only. Nothing here was changed in the hosting plan, and nothing was tested in real ChatGPT or Claude (I have no access to either, or to production).

---

## 1. Capacity recommendation (L4.3)

### What was measured

All numbers are local (in-process database, no network). Production adds one network round trip per database query.

| Measure | Value | Source |
| --- | --- | --- |
| Apps home, one request | 12 to 14 queries, any number of apps | L1, `tests/loading-speed.test.ts` |
| Opening an app (Runway, 13 tables) | 58 queries (owner), 63 (member) | L2, `tests/loading-speed-apps.test.ts` |
| Template list | 1 query | L3, `tests/loading-speed-templates.test.ts` |
| Web process memory after start, with both widget resources and the app frame loaded | 161 MB resident, 55 MB heap (`origin/main`: 173 MB and 58 MB) | `process.memoryUsage()` after `baseApp()`, `workspaceResource()` for both hosts, `frontendFrameDocument()` |
| Compression cost (new in L4.2), per response, one core of this container | widget resource 1.67 MB: 29 ms (Brotli level 4); website script 1.0 MB: 21 ms | `zlib` timings, median of 5 |
| Database connections the code opens at most | web 10, worker 10 + 2 (automation runner) = 22 | `src/db/database.ts` (`max=10`), `src/server/index.ts`, `src/worker/index.ts` |

Not measured: production request rates, production query times, the database's CPU, memory and connection use, and Render's own limits. I could not read Render's pricing or plan pages from this container (the host does not resolve here), so the plan figures below are for you to confirm in the Render dashboard.

### What the numbers mean

- **The database is the first limit.** Every query is a network round trip to the database. An app open is about 60 queries, so at 1 to 2 ms per round trip in the same region it spends 60 to 120 ms waiting on the database before any work. `render.yaml` puts the database on `basic-256mb`, the smallest plan. With 256 MB of memory, PostgreSQL's cache holds little more than the indexes. Once the catalog, app code and records stop fitting, reads go to disk and every query gets slower.
- **The web instance has room for memory, little for CPU.** 161 MB resident leaves headroom on a 512 MB instance. Check Starter's exact figure in the dashboard. CPU is the tighter limit: each app opened in server mode runs app code in the sandbox, and compression now adds about 20 to 30 ms for each large response. Large responses are rare, because browsers keep them for good, but a starter instance has a fraction of a core, so two people opening apps at once queue behind each other.
- **Connections are not a limit yet.** At most 22 connections are open, within what even the smallest PostgreSQL plans allow. Confirm your plan's limit in the dashboard.

### Recommendation

1. **Database: move from `basic-256mb` to the 1 GB plan (`basic-1gb`) now.** It is the cheapest change with the largest effect on every surface, because every surface is query-bound. Keep the region (Frankfurt) the same as the web service. Disk can stay at 1 GB until the dashboard shows it filling.
2. **Web instance: keep Starter until production timings exist, then decide.** After the database change, run `npm run ux:report` for a week. Move the web service to the next size up (Standard) if either of these holds:
   - the 75th percentile of `home` or `app` timings stays above the section 3 targets (cards 0.3 s, Overview 1 s); or
   - Render's metrics show the web instance's CPU above about 70% at busy hours.
3. **Worker: keep Starter.** Its work is not on any screen's path.
4. **Do not raise the pool size (`max=10`)** before the database plan is larger. More connections on a small database make each query slower.

**What would change this:** production numbers. If `ux:report` shows database time is small next to network or sandbox time, the database step matters less and the web instance step matters more.

---

## 2. Real-host checklist (L4.4)

Test against the deployed build of this branch. Use a fresh conversation each time, so the host fetches the current widget. If a tool result looks unchanged, refresh the TrialAgents connector's tool list in the assistant first.

Record each line as **pass**, **fail** (with a screenshot) or **not possible**. Lines marked **(timing)** need a number, measured with a stopwatch or the browser's network panel where you can open one, from the moment the assistant's answer appears.

### A. Does each host load from the platform origin? (L3.3, L4.5)

The answers decide whether the fallbacks are used. Do this first on each host.

| # | Check | ChatGPT desktop | ChatGPT phone | Claude desktop | Claude phone |
| --- | --- | --- | --- | --- | --- |
| A1 | Ask "Open TrialAgents", then open **Browse app templates**. Do the card pictures appear? | | | | |
| A2 | Same screen, where the host shows network activity (desktop browser developer tools on chatgpt.com or claude.ai): do card pictures load from `platform.trialagents.com/template-cards/…` (**direct**), or do `read_app_template_cards` calls appear (**fallback**)? | | | | |
| A3 | With the developer tools open on Apps home, wait 2 seconds. Is there a request to `platform.trialagents.com/widget-parts/<file>.js` with status 200 (**direct**)? If not, is there a `read_widget_part` tool call (**fallback**)? | | | | |
| A4 | In the widget's console, `window.__trialyLatePart` shows `ready:origin`, `ready:assistant` or `failed`. Note it. | | | | |
| A5 | Open **Automations**, **Logs**, **Database** and **Connectors** from the side menu. Each page shows its heading at once and fills in. No page shows "This page could not be loaded". | | | | |

### B. First screens and the loading bar

| # | Check | ChatGPT desktop | ChatGPT phone | Claude desktop | Claude phone |
| --- | --- | --- | --- | --- | --- |
| B1 | "Open TrialAgents": Apps home cards are visible **(timing)**. | | | | |
| B2 | The thin loading bar at the top disappears when the cards appear. It does not come back while card miniatures, the archived count or the second part load. | | | | |
| B3 | "Open my <app name> app": the app's Overview is visible **(timing)**. | | | | |
| B4 | After Overview shows, the loading bar does not reappear while other tabs are prepared. Opening another tab is immediate. | | | | |
| B5 | Templates appear **(timing)**. Leaving and returning to Templates shows them at once with no bar. | | | | |
| B6 | Claude only: an app's text uses the same font (Inter) as the TrialAgents screens around it, not a system font (L4.6). | not applicable | not applicable | | |

### C. Return visits (L4.1)

Plugins keep last known basics only where the host allows storage, so a "not possible" result here is expected on some hosts.

| # | Check | ChatGPT desktop | ChatGPT phone | Claude desktop | Claude phone |
| --- | --- | --- | --- | --- | --- |
| C1 | In a **new** conversation, open TrialAgents and then Templates. Are the templates shown at once, before any request finishes? | | | | |
| C2 | In the widget console, `localStorage.getItem('trialy-last-known:v1')` returns a value (storage allowed) or throws (storage refused). Note which. | | | | |

### D. Website (desktop and phone width)

| # | Check | Desktop | Phone (or browser at 390 px width) |
| --- | --- | --- | --- |
| D1 | First visit to platform.trialagents.com: page frame at once; cards **(timing)**. | | |
| D2 | Reload: the cards appear at once with "Checking for changes…" at the top right, which then disappears. No loading bar while it shows. | | |
| D3 | Rename an app in a second tab, then reload the first: the old name may show for a moment, then the new name replaces it. | | |
| D4 | Open an app, then reload its page: its name (and, for standard trackers, its tab names) shows at once, then the app. | | |
| D5 | Sign out, sign in as a different person on the same browser: none of the first person's app names appear at any point. | | |
| D6 | In the browser's network panel, `assets/index-*.js` shows `content-encoding: br` (or `gzip`) and the transferred size is about 280 KB, not 1 MB. | | |
| D7 | `/fonts/inter-variable.woff2` on a second page load answers `304 Not Modified` (revalidated, not downloaded again). | | |

### E. Before and after numbers

Record B1, B3, B5 and D1 on this build. The scope has no production "before" numbers (owner action 7.1), so also run `npm run ux:report` for the week before and the week after deployment and keep both outputs.

---

## 3. Decisions for the owner

1. **Database plan** (section 1): approve moving `trialy-db` to `basic-1gb`.
2. **Web plan**: decide after a week of `ux:report` numbers, using the rule in section 1.
3. **Hosts that refuse the platform origin**: if A3 shows the fallback on a host, the second part costs one extra assistant round trip (about 200 KB, once per widget). Keep it, or ship that host the single-file build (`TRIALY_WIDGET_SINGLE_FILE=1`). The single-file build is one switch for every host today; a per-host choice would need a small change.
4. **Remembered basics on shared computers**: they are cleared on sign-out and on another person's sign-in, but a person who closes the browser without signing out leaves their app names (no records) on that device for up to 14 days. Keep 14 days, or shorten it.
