# Code review notes: Runtime, shared interface and performance (P1–P10, B3, U1, U2, G2, G8)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md). Produced by reading the code at commit `376f29d` on 19 November 2026; nothing was run. Line numbers refer to that commit. Where these notes list open questions, the scope's **Defaults adopted** section gives the answer to build to.

# App runtime, shared interface, performance: gap analysis and recommendation

Read-only analysis; nothing was run or measured. Timings, payload sizes and S/M/L/XL sizes are estimates from reading the code. All paths are under `/home/user/trialy`.

## 1. Runtime today

1. **Execution:** app source is a synchronous function body `(input, tools) → {html, css, state}`, run in QuickJS/WASM in a forked single-use child (`src/foundation/runtime.ts:16,30`; `src/foundation/runtime-child.mjs:9-14,34-39`). Limits are 15 s, 100 calls and a 4 MB read budget (`runtime.ts:7,59`).
2. **Admission:** 2 published and 1 draft slot per process, queue of 16, 2 per user, 1.5 s wait (`src/workspace/service.ts:58`; `src/workspace/frontend-queue.ts:16`).
3. **Data access:** `tools.call` is one closure inside `runFrontend` (`service.ts:259-390`): `records.read` (page plus `count(*)`, `:348-372`), `readMany`, `get`, `project.*`, `roles.list`, `integrations.list`, `documents.*`, `files.*`, `exchange.*`, `actions.*`, `connectors.call`, `functions.*`, `layout.propose`, `records.propose`. Calls are strictly sequential (`runtime.ts:57`).
4. **Checks:** `runtimeComponent` runs before execution, on each read, and twice after (`service.ts:207,351,396,420`).
5. **Render:** the host posts `trialy.render` to a sandboxed iframe (`src/shared/FrontendCodeRuntime.tsx:92,231`). The frame sanitises the HTML and replaces the root (`src/shared/frontend-frame.ts:65-84`). Its CSP is hash-only script with `connect-src 'none'` (`frontend-frame.ts:237`; `src/server/app.ts:37`).
6. **Events:** every `data-action` posts `trialy.event`, which calls `run_component_frontend` and repaints (`FrontendCodeRuntime.tsx:209,94-150`). Events queue while busy (`:96`).
7. **Save, custom apps:** `records.propose` only collects changes (`service.ts:383-386`). A preview transaction follows (`:423-435`), then a "Review changes" modal (`FrontendCodeRuntime.tsx:142,229`), `confirm_workspace_change` (`:158`) and a full re-run (`:167-176`). The iframe is `inert` throughout (`:231`; `frontend-frame.ts:172`).
8. **Save, validation count:** validation runs in prepare, again inside the prepare transaction, again at commit and again per change (`src/domain/service.ts:306,331,359,440`). Commit takes a workspace-wide `FOR UPDATE` (`:356`).
9. **Standard-tracker fast path:** the shipped renderer runs natively on the server and again inside the frame from cached pages, falling back to the server on "Page needed" or "Server action" (`frontend-frame.ts:5-8,136-155`; `src/shared/tracker-cache.ts`). None of the catalog apps use it.
10. **Hosts:** web uses REST (`src/web/foundation-client.ts`). ChatGPT uses one inlined bundle whose frame loads from our origin (`scripts/build-embed.ts`; `src/server/ui-resource.ts:34`). Claude inlines the frame as `srcdoc` (`src/server/claude-frame.ts:1-6`). Public links go through `/public-app/call` (`src/server/app-services.ts:31`).
11. **Assistants:** `run_app_command` runs the same source server-side with `event.kind='command'` (`src/workspace/app-commands.ts:138`).
12. **Chrome:** `SystemNotice` is a stacking bottom-right host with a 3 s auto-dismiss, errors included (`src/shared/SystemNotice.tsx:10,14`). The header has no app name or status (`src/shared/ui/WorkspaceShell.tsx:29`). The 8 s ready timer is at `FrontendCodeRuntime.tsx:215`.

## 2. Architecture

| Option | For | Against |
| --- | --- | --- |
| (a) Browser-only execution | Meets P4 literally; no sandbox queue | Breaks app commands and command parity; public links would receive source; no first paint without the engine |
| (b) Server execution plus declared local actions (P09) | Smallest security change | Needs a second declarative dialect; app-specific filter/sort still needs app code, so P4 and P8 stay unmet; every app is rewritten anyway |
| (c) Hybrid: one source, two hosts | Same pure function runs in the frame for interaction and on the server for first render, commands, fallback and public links; extends the tracker precedent | Largest build; changes the frame's security posture |

**Recommend (c).**

- **Engine:** QuickJS-WASM inside the frame, the same build as the server (`runtime.ts:6`). Results match app commands, and the guest still has no DOM, network or ambient API. The context stays alive, so source is parsed once per open.
  - The CSP gains `'wasm-unsafe-eval'`, and the WASM is inlined in the frame document.
  - A native blob Worker is the fallback only if a phone spike shows QuickJS misses 0.1 s. It is faster but diverges from server semantics and relies on host CSP for containment.
- **Data:** a frame-local store answers `tools.call` reads synchronously. A miss returns `{pending:true}`; the host batches missing reads into one `read_app_data` call and re-runs. This gives P2 "show first, fill in after" directly.
- **Server authority:** move the capability closure (`service.ts:259-390`) into a reusable `AppCapabilities` class used by both the sandbox and `read_app_data`. That endpoint has no sandbox and no queue, and does one view check plus one final `access_version` recheck.
- **Side effects:** `actions.run`, `connectors.call`, exchange writes, `functions.invoke` and `layout.propose` forward the event to the server, as the tracker's "Server action" does.
- **Transport:** each new operation is a REST route plus an app-only MCP tool, because `connectDomains` is empty.
- **Full-data calculations:** add `records.summarize`, wrapping the existing `Service.aggregate` (`src/server/mcp.ts:80`). App-specific calculations such as forecasts stay as a server run of the app (a `compute` event).
- **Public links:** stay on server mode unless the source is unchanged catalog code or `sourceAccess:'bindings'`.

**Migration path**

1. **v1, server mode (default):** unchanged for every installed app.
2. **v1, browser-compat:** the same source runs in the frame. Reads are cached, and `records.propose` from a person maps to direct save. It is a platform flag per unchanged catalog digest (`src/workspace/catalog-source.ts`), switched on after that app's browser script passes. No installed copy is touched.
3. **v2 contract:** adds `records.save`, pending reads, per-screen data, `notice` and `undo`, and drops server-resolved `controls`. A marker in the source selects it. Catalog rebuild to v2 is G14, last.

Customised copies stay on v1 server mode indefinitely.

## 3. Per decision

| Code | Today → gap | Required change | Size |
| --- | --- | --- | --- |
| P4 | Every click is a server run | Frame engine and store, local event loop, server-action forwarding, first-render seed (`reads` returned like tracker `pages`, `service.ts:391`), CSP change, compat flag, tests asserting zero requests for navigation, menus and filters | XL |
| P5, B3 | Three steps, frame inert | `save_app_records` (section 4), optimistic store patch, rollback, conflict notice; remove `inert`, the review modal and the reload for record edits. Do standard trackers first (`frontend-frame.ts:35-38`; `FrontendCodeRuntime.tsx:136-139`). Interim for v1: a person's record-only proposal commits inside `runFrontend` | L |
| P3 | Apps read whole tables per event (88-call budgets) | `records.summarize`; per-screen read keys in the store; paging already exists (limit ≤ 100); authoring budget lint | M, plus per-app work at G14 |
| P2 | Blank loader; iframe created only after the first result (`:65,231`); 8 s timer | Create the iframe at mount; serve the frame at a fingerprinted immutable URL (today `max-age=0` with an inlined 352 KB font, `app.ts:38`); pending reads; keep the previous screen; in-memory remembered output per user, app, version and access stamp; replace the timer with header status | M |
| P6 | Four or more checks per read run; four validations per save | One check per `read_app_data` or save request; tests on check counts | S–M |
| P7 | Saves are foreground | Saves and revalidation use `background:true`; failures surface as notices | S |
| P8 | 2 slots per process; workspace `FOR UPDATE` on every commit | Interaction and data reads leave the queue; record-only commits take a shared workspace lock plus row locks; queue metrics already exist | M |
| P9 | Custom frames auto-grow (`:208`), so no full-height sidebar or full-screen panel | Section 6 | L |
| P1, P10 | Server counters only; no client timing | Section 7 | M–L |
| U2 | Stack, 3 s, 11 `SystemNotice` sites plus 85 inline `role="alert"` | Single-slot notice store (section 5) | M |
| U1, G2 | No app name or status in header; banners inside the runtime (`:220-230`) | Header status slot; design-check rule rejecting app headers and banners | M |
| G8, A10 | No app delete (`src/shared/schema.ts:29-32`); delete is owner-only (`domain/service.ts:114`) | Section 4 | M–L |
| A6 (runtime) | Footer is "first publication only" (`src/shared/PreviewApprovalFooter.tsx:5`) | Shell-level footer slot; bottom inset passed to frame and notices; runtime swaps version through `loadPublished` | S–M |

## 4. Direct save and Undo

**`save_app_records`** takes `{componentId, viewId, expectedVersion, requestKey, changes[≤50]}`. Changes are create, update or archive.

- **One transaction:** idempotency lock on `requestKey`, the existing `apply_component_records` validation run once (`service.ts:844-861`: manifest, bindings, role writer, project scope, field policy), then `Service.apply` directly with no `data_previews` row.
- **Authorisation and audit:** `{kind:'approval', context:'app_direct_edit'}`, the existing `component.records_applied` audit entry and a `commit_receipts` row keyed by `requestKey`, so a retry never resubmits.
- **Conflict:** field-level. If the record version differs, compare the edited fields against the revision at the client's base version. Unchanged fields merge. Changed fields return `409 stale_value` with the current row; the store shows it, a notice says the edit was not saved, and nothing is written.
- **Response:** authoritative rows for the changed records (versions and derived fields via `DerivedReader`), an `invalidated` list of table and summary keys, and an optional `undoId`. The client patches only those rows.
- **Failure:** the store rolls back, sets `saveErrors[recordId][field]` for the app to show beside the value, and raises an error notice.

**Undo.** A new `app_undo_entries` table holds user, app, viewId, change set, a server-computed inverse, resulting versions, expiry and used-at. `undo_app_change({undoId})` requires the same user and a live runtime view (`src/workspace/runtime-view.ts:10-14`), and that each record is still at the version the original change produced. It reruns normal validation with current access and applies the inverse as a new audited change with `reverses` (`src/domain/write-authorization.ts:4`). The client never supplies old values and history stays append-only. Delete is archive (`domain/service.ts:399-404`), and its undo restores state. Change sets containing sends or connector calls get no `undoId`. Apps call `tools.call('undo.list')` and `tools.call('undo.run')` and place the control themselves.

## 5. Shared chrome API

Add a `PlatformChrome` context in `src/shared`, implemented by the web shell, the embedded top bar and the public shell.

- **`notify({kind,message})`:** one slot. Info and success close after 5 s; an error stays until dismissed and is replaced only by a newer error.
- **`setAppStatus`:** app name, read-only, revoked, newer version with Refresh, saved-but-not-refreshed. Replaces the in-runtime banners and buttons at `FrontendCodeRuntime.tsx:220-230`.
- **`footerInset`:** bottom space reserved for the approval footer.

Apps return `notice:{kind,message}` in their output (v2), or use the existing `trialy.notice` message (`frontend-frame.ts:157`). The platform raises save, conflict and load notices itself. Field errors arrive in `input.saveErrors`.

## 6. Phone and assistant panel

- **Viewport mode:** v2 and compat apps get the frame at viewport height below the header, with internal scroll. The tracker sizing code already does this (`FrontendCodeRuntime.tsx:213-214`).
- **Frame:** `#surface` becomes a size container; pass `input.viewport` (width class, coarse pointer) and safe-area insets.
- **Shell:** header collapses to toggle, app name and status icon at 420 px or less; notices and footer go full width above the safe area.
- **Embed:** honour the host's inline or fullscreen width.
- **Design check:** add a panel width to `[1440,390]` (`src/workspace/design-quality.ts:68`), plus tap-size and hover-only rules.

## 7. Measurement

- **Client:** time pointerdown to next paint (in the frame), screen-change and filter completion, optimistic paint and save acknowledgement, and open to first content and to complete content (in `FrontendCodeRuntime`).
- **Dimensions:** host, width class, connection type, template id and version, runtime mode. No record data or ids.
- **Transport:** batched `POST /api/telemetry/ux` on web; in embeds, attached to the next `check_component_access` call.
- **Storage:** daily histograms; add the new tools to the request-log allowlist (`app.ts:47`).
- **CI hard gate (deterministic):** per switched-on app, navigation and filter make 0 requests, an edit makes exactly 1 request and 0 sandbox runs, plus round-trip budgets per open and save and bundle and frame size budgets.
- **CI soft gate:** Playwright with 4× CPU and a 4G profile against a committed baseline: 2.5 s, 1 s and 0.1 s.

## 8. Order, dependencies, risks, questions

**Build order**

1. Spike: WASM under the real Claude `srcdoc` and ChatGPT CSP; QuickJS render time for the three largest sources on a mid-range phone.
2. Measurement baseline.
3. `PlatformChrome`, eager frame, timer removal.
4. `AppCapabilities` extraction, `read_app_data`, `save_app_records`, v1 auto-commit.
5. Tracker optimistic save.
6. Frame engine, store and compat mode.
7. v2 contract, `records.summarize`, undo.
8. Viewport mode and design checks.
9. Enforce CI gates.
10. G14 catalog rebuild.

**Cross-area dependencies**

- A4: assistant Data Edit should reuse `save_app_records`.
- R4: delete rights.
- B1 and A6: server-side pending-change store.
- X3: the same validators on direct saves.
- A7: audit names for direct edits and undo.
- G12 and G13: the authoring guide for v2.
- P11: the compat flag needs no source update.

**Risks**

- Claude's `srcdoc` frame inherits host CSP and may block WASM. That host would then stay on server mode.
- Inlined WASM (roughly 0.5–1 MB) adds weight to the frame document.
- Workspace-lock contention on saves.
- Optimistic totals must show as stale until refreshed, to keep data honest.
- Restricted source must never reach public links.
- The `runFrontend` refactor has a wide blast radius.

**Questions for the product owner**

1. May App editors delete records in an app? Default: yes, as archive, where they can write the whole record.
2. What is the Undo "session"? Default: while the app stays open, up to 60 minutes and the last 20 actions.
3. Where is remembered content kept? Default: in memory only, nothing on the device.
4. Do edits to different fields of one record both save? Default: yes.
5. Do record edits in existing apps become direct, with no review dialog, at platform release rather than at rebuild? Default: yes.
6. Is server mode acceptable in a host that blocks in-browser execution? Default: yes.

### Critical Files for Implementation
- /home/user/trialy/src/workspace/service.ts
- /home/user/trialy/src/shared/FrontendCodeRuntime.tsx
- /home/user/trialy/src/shared/frontend-frame.ts
- /home/user/trialy/src/domain/service.ts
- /home/user/trialy/src/shared/ui/WorkspaceShell.tsx
