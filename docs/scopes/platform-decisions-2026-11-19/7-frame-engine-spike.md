# Spike result: the QuickJS engine inside the app frame (package 1.9; P4, D21)

Evidence for the [implementation scope](../PLATFORM_DECISIONS_IMPLEMENTATION_2026-11-19.md), architecture choice E and package 5.1. Unlike files 1 to 6, this file reports measurements. They were taken on 20 November 2026 on top of commit `2d70ccb` with the runnable spike in [`scripts/spikes/frame-engine/`](../../../scripts/spikes/frame-engine/README.md) (`node scripts/spikes/frame-engine/run.mjs`). Every number below is in `scripts/spikes/frame-engine/results/latest.json`; the tables are copied from `results/latest.md`. No product code under `src/` was changed.

**Not done: the real hosts.** Package 1.9 asks for proof under the real Claude and ChatGPT hosts. Those hosts cannot be loaded from the build environment. Everything about "the host" below is a local page with a policy written for the spike. What Claude and ChatGPT actually allow remains to be confirmed on the real hosts (section 9 says exactly what to check).

## 1. Result in brief

1. **The engine runs in the sandboxed frame once the frame's policy allows WebAssembly.** With `'wasm-unsafe-eval'` added to `script-src`, the WASM bytes inlined as base64 and `connect-src 'none'` unchanged, QuickJS started and rendered all three apps inside `sandbox="allow-scripts"`, both when the frame was served from its own origin and as `srcdoc`. With today's policy (hash only) WebAssembly is refused in both shapes.
2. **A `srcdoc` frame also needs the parent's permission.** It inherits the parent document's policy. Under a restrictive parent policy without `'wasm-unsafe-eval'` (or `'unsafe-eval'`) the engine did not start, whatever the frame's own policy said. A frame served from our origin did not inherit anything: it started under the same restrictive parent, provided the parent's `frame-src` let the frame load at all. Claude uses the `srcdoc` shape, ChatGPT the served shape.
3. **No synchronous-instantiation limit applies.** Chromium refuses synchronous compile and instantiate on the main thread only above 8 MiB. The engine is 0.5 MB (sync build) or 1.0 MB (server build), and the loader instantiates asynchronously anyway.
4. **Size.** A frame document with the sync build inlined is 718 KB (306 KB gzip, 258 KB brotli); with the server's asyncify build it is 1,406 KB (476 KB gzip, 363 KB brotli). Today's frame document is 521 KB (364 KB gzip).
5. **Engine start.** From the start of the frame script to a ready context: 24–26 ms at 1× CPU, 74–84 ms at 4×, 131–137 ms at 6× (sync build, medians). Loading one large app source then takes 59–60 ms at 1× and about 180 ms at 4×, once per open.
6. **Renders, kept-alive context, demo data, QuickJS sync build, render plus DOM apply (median):** 11–26 ms at 1×, 21–47 ms at 2×, 39–108 ms at 4×, 70–163 ms at 6×. The 1 s screen-change target is met with a wide margin in every one of these cases. The 0.1 s figure is met at 1× and 2× (p95 at most 71 ms); at 4× the two largest apps sit at the line (medians 80–108 ms, p95 112–131 ms); at 6× they are over it.
7. **The server's asyncify build is 1.4 to 2 times slower per render than the sync build** and twice the size. Both produced output identical to the server runtime.
8. **Native execution (`new Function`) is 4 to 6.5 times faster per render** (6–16 ms at 4×), about 2 to 3 times faster once DOM work is included, and needs `'unsafe-eval'`, which removes the isolation between app source and the frame.
9. **Recommendation: QuickJS in the frame is viable. Use the sync build.** It meets the screen-change target everywhere measured, and the 0.1 s target if the frame acknowledges a tap before it renders on slow devices. A host that refuses WebAssembly stays on server mode (`D21`); the frame can detect that at start.

## 2. What was run

| Item | Value |
| --- | --- |
| Browser | Chromium 153.0.8010.12, headless, driven by Playwright 1.51.1 |
| Machine | Intel Xeon 2.10 GHz, 4 cores, Linux; shared with other jobs (1-minute load average 2.3 to 5.7 during the run) |
| Engine | `quickjs-emscripten` 0.32.0, the package the server uses: `RELEASE_ASYNC` (the server build, `src/foundation/runtime-child.mjs`) and `RELEASE_SYNC` (same release, without asyncify) |
| Frame | One inline script (QuickJS loader, harness, WASM as a base64 string), its SHA-256 in `script-src`, policy as `<meta>` and, when served, as the header `sandbox allow-scripts; <policy>`; iframe `sandbox="allow-scripts"`. The policy text is read from `src/shared/frontend-frame.ts` and checked against `src/server/app.ts` at build time |
| Guest wrapper | The server's wrapper (strict function, JSON strings only across the boundary, 16 MB heap limit, 256 KB stack, 64 MiB WASM memory ceiling, interrupt handler). One change: the app function is kept and called per event, so the source is parsed once per open |
| Apps | The published catalog source of the three named apps, with configuration and bindings prepended as `AppTemplates.operation` does |
| Data | The fictional demo records of each app ("demo"), and the same with the largest table padded to 350 rows ("long table"), as in `tests/batched-read-apps.test.ts` |
| `tools.call` | Answered synchronously from memory inside the frame, outside the engine: `records.read`, `records.readMany`, `integrations.list`, `roles.list`, `documents.list` and the exchange reads, with the response shapes of the existing test fixtures. Anything with an outside effect is refused |
| Events | `open`, and one navigation event per app; rendered alternately, 30 times each (20 for the long table), from the state the first `open` returned |
| CPU rates | 1×, and `Emulation.setCPUThrottlingRate` 2×, 4× and 6×. The task asked for 4× and 6×; 2× was added |
| Frame size | 412 × 915 CSS pixels in every run |

| App | Version | Readable source | Catalog source | Installed source (with configuration) | Navigation event | Demo records | Long-table records |
| --- | --- | --- | --- | --- | --- | --- | --- |
| partnership-tracker | 2.2.1 | 216524 bytes | 225866 chars | 237528 chars | `nav:pipeline` | 193 | 471 (partnerships.stage_history padded to 350) |
| cash-runway | 2.2.1 | 203701 bytes | 219103 chars | 228224 chars | `nav:cash_flow` | 55 | 392 (runway.plan_lines padded to 350) |
| cro-selection | 2.1.1 | 208215 bytes | 214399 chars | 223553 chars | `nav:evaluation` | 108 | 435 (croselection.scores padded to 350) |

`investor-updates` (212,574 bytes of readable source) is larger than `cash-runway` and `cro-selection`; the spike measured the three apps it was asked to measure.

"Render" is the time from handing the event to the engine to having the parsed `{html, css, state}` back in the frame, including every `tools.call`. "DOM apply" parses the HTML into a template, walks every element and attribute, replaces the root, sets the style sheet and forces style and layout. It approximates the product frame's `paint`; it is not the product's sanitiser, and the paint that follows is not timed.

## 3. What works under which CSP

Product frame policy today: `default-src 'none'; script-src 'sha256-…'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`.

| Frame policy label | Change to the product policy |
| --- | --- |
| product | none |
| wasm | `script-src` gains `'wasm-unsafe-eval'` |
| eval | `script-src` gains `'unsafe-eval'` |
| wasm+worker | `script-src` gains `'wasm-unsafe-eval'`, and `worker-src blob:` is added |

| Parent policy label | Policy of the page that contains the frame (written for the spike) |
| --- | --- |
| none | no CSP |
| strict | `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'none'` |
| strict+frame | strict, plus `frame-src` naming the frame's origin |
| strict+wasm | strict, with `'wasm-unsafe-eval'` in `script-src` |
| strict+eval | strict, with `'unsafe-eval'` in `script-src` |
| strict+wasm+worker | strict+wasm, plus `worker-src blob:` |

"App rendered" means Partnerships was loaded and its `open` event rendered inside the frame. The third delivery shape puts the `srcdoc` frame inside a widget document that carries the parent policy and is itself framed by a page on another origin, which is the nesting an assistant uses.

| Delivery | Parent (host) policy | Frame policy | Engine build | Frame script ran | WebAssembly allowed | Engine started | App rendered | `new Function` allowed | Blob Worker: started / engine / rendered |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (a) served from its own origin | none | product | sync | yes | no | no | no | no | not tried |
| (a) served from its own origin | none | wasm | sync | yes | yes | yes | yes | no | no / no / no |
| (a) served from its own origin | none | wasm | asyncify | yes | yes | yes | yes | no | not tried |
| (a) served from its own origin | none | eval | sync | yes | yes | yes | yes | yes | not tried |
| (a) served from its own origin | strict+frame | wasm | sync | yes | yes | yes | yes | no | not tried |
| (a) served from its own origin | strict | wasm | sync | no | – | no | no | – | not tried |
| (a) served from its own origin | none | wasm+worker | sync | yes | yes | yes | yes | no | yes / yes / yes |
| (a) served from its own origin | strict+frame | wasm+worker | sync | yes | yes | yes | yes | no | yes / yes / yes |
| (b) srcdoc in the parent page | none | product | sync | yes | no | no | no | no | not tried |
| (b) srcdoc in the parent page | none | wasm | sync | yes | yes | yes | yes | no | not tried |
| (b) srcdoc in the parent page | none | wasm | asyncify | yes | yes | yes | yes | no | not tried |
| (b) srcdoc in the parent page | none | eval | sync | yes | yes | yes | yes | yes | not tried |
| (b) srcdoc in the parent page | strict | wasm | sync | yes | no | no | no | no | not tried |
| (b) srcdoc in the parent page | strict | eval | sync | yes | no | no | no | no | not tried |
| (b) srcdoc in the parent page | strict+wasm | wasm | sync | yes | yes | yes | yes | no | not tried |
| (b) srcdoc in the parent page | strict+wasm | product | sync | yes | no | no | no | no | not tried |
| (b) srcdoc in the parent page | strict+eval | wasm | sync | yes | yes | yes | yes | no | not tried |
| (b) srcdoc in the parent page | strict+eval | eval | sync | yes | yes | yes | yes | yes | not tried |
| (b) srcdoc in the parent page | none | wasm+worker | sync | yes | yes | yes | yes | no | yes / yes / yes |
| (b) srcdoc in the parent page | strict+wasm | wasm+worker | sync | yes | yes | yes | yes | no | no / no / no |
| (b) srcdoc in the parent page | strict+wasm+worker | wasm+worker | sync | yes | yes | yes | yes | no | yes / yes / yes |
| (b) srcdoc in a widget document that is itself framed | strict | wasm | sync | yes | no | no | no | no | not tried |
| (b) srcdoc in a widget document that is itself framed | strict+wasm | wasm | sync | yes | yes | yes | yes | no | not tried |

What the matrix shows:

- **Today's policy blocks the engine** in both shapes: `WebAssembly.compile` rejects with a `CompileError` that names the policy. The frame script itself still runs.
- **Served from our origin (a):** only the frame's own policy counts. `'wasm-unsafe-eval'` in the frame policy is enough, also under a restrictive parent without it. The parent matters in one way only: without a `frame-src` that names our origin the frame does not load at all (row "strict / wasm").
- **`srcdoc` (b):** the parent's policy and the frame's own `<meta>` policy both apply, and both must allow WebAssembly. Parent without it: blocked. Parent with it but frame policy unchanged: blocked. `'unsafe-eval'` in the parent also satisfies the parent's side. The nested rows behave the same.
- **`'wasm-unsafe-eval'` does not allow `new Function`.** Only the `eval` rows do, and under `srcdoc` only when the parent allows `'unsafe-eval'` too.
- **A blob Worker** started the engine and rendered when `worker-src blob:` was in the frame policy and, for `srcdoc`, also in the parent policy. Without it `worker-src` falls back to `script-src` and the Worker is refused.
- **A refusal is detectable at once.** Compiling an 8-byte module at frame start fails with the same error, before any engine code runs. The frame can report that and stay on server mode.

Mapping to the delivery shapes in the code (the hosts themselves were not loaded):

| Host | Shape in the code | What the engine needs |
| --- | --- | --- |
| Web platform | Frame served from our origin inside our own page (`/frontend/frame`) | Our frame policy only. We control it |
| ChatGPT | Frame served from our origin inside the widget (`src/server/ui-resource.ts`, `frameDomains`) | Our frame policy only, as long as ChatGPT keeps letting the frame load. Shape (a) |
| Claude | Frame as `srcdoc` inside the widget (`src/server/claude-frame.ts`) | Our frame policy **and** a Claude widget policy that allows `'wasm-unsafe-eval'` or `'unsafe-eval'`. Shape (b). Unknown until checked on Claude |

The resource metadata the server sends today (`connectDomains`, `resourceDomains`, `frameDomains`) has no field that asks a host for WebAssembly. No client-side way around a refusing `srcdoc` parent was found: a `<meta>` policy can only tighten, and a Worker inherits the same policy.

## 4. Synchronous instantiation limits

| Module | Thread | `new WebAssembly.Module` | `WebAssembly.compile` | `new WebAssembly.Instance` | `WebAssembly.instantiate` |
| --- | --- | --- | --- | --- | --- |
| engine binary (sync build), 503134 bytes | main | yes (2.3 ms) | – | – | – |
| padded module, 1048576 bytes | main | yes | yes | yes | yes |
| padded module, 8388608 bytes | main | yes | yes | yes | yes |
| padded module, 8388609 bytes | main | no | yes | no | yes |
| padded module, 16777216 bytes | main | no | yes | no | yes |
| engine binary (asyncify build), 1027523 bytes | main | yes (6.2 ms) | – | – | – |
| padded module, 16777216 bytes | blob Worker | yes | yes | yes | yes |

- Chromium 153 refuses `new WebAssembly.Module` and `new WebAssembly.Instance` on the main thread for modules larger than 8 MiB (8,388,608 bytes passes, one byte more fails). The asynchronous calls and a Worker have no such limit.
- Both engine binaries are far below it and compiled synchronously in 2 to 6 ms. The emscripten loader uses `WebAssembly.instantiate` (asynchronous) when it is handed the bytes, which is what the spike does.
- The workaround, should a larger module ever be needed, is asynchronous instantiation (no policy change) or a Worker (needs `worker-src blob:`). Neither is needed for QuickJS.

## 5. Size of the inlined engine

KB is 1,024 bytes. The sync WASM binary is 503,134 bytes, the asyncify one 1,027,523 bytes.

| Engine build | Part | Raw | gzip -9 | brotli 11 |
| --- | --- | --- | --- | --- |
| QuickJS release, sync build | WASM binary | 491 KB | 228 KB | 194 KB |
| QuickJS release, sync build | WASM as base64 text (as inlined) | 655 KB | 285 KB | 241 KB |
| QuickJS release, sync build | JavaScript glue and spike harness | 62 KB | 19 KB | 17 KB |
| QuickJS release, sync build | Whole frame document | 718 KB | 306 KB | 258 KB |
| QuickJS release, asyncify build (the server build) | WASM binary | 1003 KB | 354 KB | 278 KB |
| QuickJS release, asyncify build (the server build) | WASM as base64 text (as inlined) | 1338 KB | 454 KB | 345 KB |
| QuickJS release, asyncify build (the server build) | JavaScript glue and spike harness | 67 KB | 20 KB | 18 KB |
| QuickJS release, asyncify build (the server build) | Whole frame document | 1406 KB | 476 KB | 363 KB |

For comparison, the product frame document today (`frontendFrameDocument` with the bundled font) is 533,426 bytes raw and 372,867 bytes gzip (521 KB and 364 KB); most of it is the font, which does not compress. This was measured separately by calling that function; it is not part of the spike's result file. The sync engine therefore roughly doubles the compressed size of the frame document. On Claude the frame document travels inside the widget resource, so that resource grows by the same amount.

## 6. Engine start (cold)

Seven fresh browser contexts per row. Times are taken inside the frame. "Document start → frame script" includes parsing the document with the inlined engine. "Load app source" and "First render" are for Partnerships with demo data, directly after the engine is ready.

| CPU rate | Engine build | Delivery | Samples | Document start → frame script | Base64 decode | WASM instantiate | Runtime + context | Engine start (script → ready) | Ready at (from document start) | Load app source | First render | First DOM apply |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | sync | served | 7 | 25 / 33 | 5.8 / 7.2 | 6.6 / 43 | 8.6 / 12 | 24 / 67 | 49 / 94 | 59 / 80 | 41 / 69 | 22 / 29 |
| 1× | sync | srcdoc | 7 | 28 / 33 | 5.1 / 9.7 | 7.7 / 9.9 | 8.3 / 11 | 26 / 27 | 55 / 60 | 60 / 64 | 43 / 57 | 20 / 23 |
| 1× | asyncify | served | 7 | 42 / 44 | 8.9 / 17 | 9.8 / 16 | 15 / 28 | 36 / 58 | 80 / 100 | 109 / 150 | 101 / 116 | 69 / 81 |
| 1× | asyncify | srcdoc | 7 | 49 / 64 | 7.8 / 10 | 9.3 / 11 | 16 / 27 | 36 / 45 | 87 / 104 | 96 / 135 | 90 / 112 | 58 / 111 |
| 2× | sync | served | 7 | 45 / 59 | 9.9 / 11 | 15 / 21 | 22 / 27 | 58 / 66 | 105 / 123 | 104 / 144 | 75 / 79 | 36 / 61 |
| 2× | sync | srcdoc | 7 | 49 / 58 | 8.5 / 10 | 11 / 17 | 18 / 28 | 45 / 56 | 93 / 113 | 104 / 122 | 74 / 89 | 35 / 38 |
| 2× | asyncify | served | 7 | 76 / 94 | 15 / 23 | 17 / 24 | 34 / 52 | 69 / 93 | 145 / 186 | 149 / 179 | 118 / 148 | 36 / 55 |
| 2× | asyncify | srcdoc | 7 | 89 / 90 | 15 / 16 | 15 / 20 | 34 / 37 | 68 / 74 | 155 / 163 | 175 / 218 | 145 / 159 | 40 / 43 |
| 4× | sync | served | 7 | 91 / 115 | 17 / 24 | 19 / 31 | 31 / 58 | 74 / 122 | 169 / 236 | 180 / 208 | 128 / 140 | 63 / 93 |
| 4× | sync | srcdoc | 7 | 95 / 120 | 16 / 17 | 23 / 29 | 37 / 43 | 84 / 99 | 182 / 214 | 184 / 206 | 121 / 163 | 62 / 103 |
| 4× | asyncify | served | 7 | 141 / 144 | 28 / 42 | 30 / 32 | 74 / 86 | 144 / 176 | 288 / 316 | 259 / 304 | 194 / 275 | 87 / 98 |
| 4× | asyncify | srcdoc | 7 | 154 / 178 | 28 / 33 | 26 / 32 | 68 / 76 | 134 / 150 | 293 / 312 | 265 / 377 | 218 / 277 | 70 / 84 |
| 6× | sync | served | 7 | 146 / 170 | 24 / 38 | 33 / 46 | 58 / 65 | 131 / 172 | 263 / 324 | 279 / 367 | 181 / 224 | 98 / 128 |
| 6× | sync | srcdoc | 7 | 182 / 228 | 24 / 25 | 34 / 57 | 58 / 71 | 137 / 156 | 307 / 365 | 308 / 375 | 203 / 346 | 103 / 127 |
| 6× | asyncify | served | 7 | 228 / 270 | 42 / 65 | 48 / 55 | 89 / 136 | 198 / 268 | 426 / 537 | 456 / 604 | 340 / 521 | 125 / 145 |
| 6× | asyncify | srcdoc | 7 | 294 / 328 | 46 / 85 | 39 / 70 | 105 / 130 | 205 / 282 | 476 / 590 | 401 / 657 | 397 / 482 | 114 / 157 |

- Sync build, served, medians: the context is ready 49 ms after the document starts at 1×, 169 ms at 4× and 263 ms at 6×.
- Adding the source load, the first render and the first DOM apply, a frame that had to draw its first screen entirely by itself would need about 0.17 s at 1×, 0.54 s at 4× and 0.82 s at 6× (sum of the medians in the table). In the plan the first screen comes from the server, so this work can run after the first paint.
- The first render after loading is slower than later ones: 121–128 ms at 4× against about 60 ms for later renders of the same app (section 7). The engine's own code is still being optimised by the browser at that point.
- Served and `srcdoc` start in about the same time.

Once per open, for all three apps (single samples taken at the start of each render series):

| CPU rate | App | QuickJS sync: load source | first render | QuickJS asyncify: load source | first render | Native: compile source | first render | QuickJS heap in use, before → after the renders |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | partnership-tracker | 72 | 49 | 110 | 122 | 6.9 | 19 | 1057 → 1229 KB |
| 1× | cash-runway | 28 | 19 | 33 | 28 | 4.1 | 11 | 875 → 875 KB |
| 1× | cro-selection | 25 | 6.4 | 44 | 11 | 4.9 | 8.8 | 884 → 884 KB |
| 2× | partnership-tracker | 98 | 73 | 195 | 95 | 9.7 | 27 | 1057 → 1229 KB |
| 2× | cash-runway | 65 | 44 | 75 | 81 | 9.4 | 29 | 875 → 875 KB |
| 2× | cro-selection | 68 | 20 | 88 | 29 | 25 | 32 | 884 → 884 KB |
| 4× | partnership-tracker | 149 | 91 | 273 | 199 | 25 | 71 | 1057 → 1229 KB |
| 4× | cash-runway | 95 | 78 | 125 | 177 | 20 | 56 | 875 → 875 KB |
| 4× | cro-selection | 87 | 29 | 134 | 61 | 18 | 35 | 884 → 884 KB |
| 6× | partnership-tracker | 218 | 154 | 349 | 342 | 37 | 74 | 1057 → 1229 KB |
| 6× | cash-runway | 179 | 110 | 208 | 195 | 33 | 96 | 875 → 875 KB |
| 6× | cro-selection | 184 | 52 | 214 | 79 | 26 | 55 | 884 → 884 KB |

The QuickJS heap in use is about 0.9 to 1.2 MB per loaded app. It did not grow over 60 renders for two apps and moved from 1,057 to 1,229 KB for Partnerships. A separate 1,200-render loop of the same wrapper in Node (`memory-check.mjs`) stayed between 1.08 and 1.78 MB, rising and falling as the engine's cycle collector runs.

## 7. Render times with a kept-alive context

Median / p95 in milliseconds. The source is loaded once; each event is then rendered 30 times (demo data) or 20 times (long table).

| CPU rate | App | Event | Renders | QuickJS sync: render | DOM apply | QuickJS sync: render + DOM | QuickJS asyncify: render | QuickJS asyncify: render + DOM | Native: render | Native: render + DOM |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | partnership-tracker | open | 30 | 14 / 20 | 4.7 / 5.7 | 19 / 25 | 25 / 36 | 30 / 41 | 2.4 / 6.3 | 7.4 / 12 |
| 1× | partnership-tracker | `nav:pipeline` | 30 | 12 / 19 | 4.5 / 8.1 | 17 / 26 | 21 / 35 | 26 / 43 | 2.2 / 5.1 | 7.1 / 14 |
| 1× | cash-runway | open | 30 | 20 / 27 | 6.1 / 12 | 26 / 36 | 30 / 38 | 36 / 47 | 3.1 / 5.5 | 8.4 / 13 |
| 1× | cash-runway | `nav:cash_flow` | 30 | 17 / 30 | 4.1 / 7.7 | 21 / 34 | 27 / 31 | 32 / 35 | 2.8 / 4.9 | 6.4 / 14 |
| 1× | cro-selection | open | 30 | 7.8 / 24 | 3.4 / 7.4 | 11 / 28 | 11 / 14 | 14 / 17 | 1.4 / 2.3 | 4.5 / 6.6 |
| 1× | cro-selection | `nav:evaluation` | 30 | 8.7 / 14 | 6.1 / 10 | 16 / 25 | 13 / 20 | 18 / 31 | 1.5 / 3.8 | 6.8 / 12 |
| 2× | partnership-tracker | open | 30 | 33 / 44 | 11 / 19 | 44 / 56 | 57 / 77 | 68 / 101 | 6.3 / 14 | 18 / 31 |
| 2× | partnership-tracker | `nav:pipeline` | 30 | 29 / 42 | 11 / 20 | 40 / 58 | 49 / 93 | 61 / 117 | 5.6 / 9.7 | 18 / 36 |
| 2× | cash-runway | open | 30 | 36 / 48 | 12 / 19 | 47 / 71 | 63 / 92 | 77 / 108 | 7.6 / 16 | 20 / 40 |
| 2× | cash-runway | `nav:cash_flow` | 30 | 32 / 38 | 8.8 / 13 | 42 / 48 | 57 / 79 | 65 / 93 | 7.5 / 14 | 17 / 32 |
| 2× | cro-selection | open | 30 | 15 / 23 | 6.8 / 9.2 | 21 / 32 | 26 / 44 | 34 / 54 | 3.3 / 6.6 | 10 / 23 |
| 2× | cro-selection | `nav:evaluation` | 30 | 17 / 27 | 11 / 18 | 28 / 47 | 29 / 43 | 44 / 63 | 3.7 / 8.0 | 16 / 29 |
| 4× | partnership-tracker | open | 30 | 62 / 95 | 21 / 43 | 85 / 121 | 104 / 158 | 125 / 181 | 12 / 25 | 36 / 50 |
| 4× | partnership-tracker | `nav:pipeline` | 30 | 59 / 86 | 20 / 42 | 80 / 124 | 90 / 123 | 111 / 150 | 11 / 26 | 32 / 61 |
| 4× | cash-runway | open | 30 | 79 / 93 | 28 / 38 | 108 / 131 | 130 / 178 | 157 / 212 | 16 / 28 | 45 / 75 |
| 4× | cash-runway | `nav:cash_flow` | 30 | 71 / 92 | 20 / 25 | 90 / 112 | 113 / 156 | 131 / 175 | 13 / 22 | 32 / 48 |
| 4× | cro-selection | open | 30 | 26 / 44 | 13 / 20 | 39 / 65 | 49 / 61 | 64 / 78 | 5.9 / 11 | 18 / 26 |
| 4× | cro-selection | `nav:evaluation` | 30 | 28 / 35 | 22 / 29 | 49 / 60 | 56 / 67 | 81 / 96 | 6.7 / 14 | 27 / 40 |
| 6× | partnership-tracker | open | 30 | 100 / 145 | 33 / 47 | 129 / 192 | 148 / 252 | 181 / 286 | 17 / 31 | 49 / 83 |
| 6× | partnership-tracker | `nav:pipeline` | 30 | 91 / 130 | 33 / 53 | 121 / 178 | 134 / 194 | 166 / 222 | 16 / 30 | 47 / 67 |
| 6× | cash-runway | open | 30 | 121 / 157 | 42 / 70 | 163 / 222 | 211 / 252 | 255 / 294 | 25 / 44 | 67 / 104 |
| 6× | cash-runway | `nav:cash_flow` | 30 | 119 / 150 | 30 / 57 | 147 / 200 | 198 / 240 | 229 / 271 | 23 / 42 | 52 / 79 |
| 6× | cro-selection | open | 30 | 47 / 64 | 24 / 41 | 70 / 91 | 79 / 126 | 106 / 139 | 11 / 16 | 34 / 44 |
| 6× | cro-selection | `nav:evaluation` | 30 | 54 / 80 | 35 / 60 | 91 / 128 | 93 / 118 | 132 / 161 | 11 / 19 | 50 / 79 |

| CPU rate | App | Event | Renders | QuickJS sync: render | DOM apply | QuickJS sync: render + DOM | QuickJS asyncify: render | QuickJS asyncify: render + DOM | Native: render | Native: render + DOM |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | partnership-tracker | open | 20 | 30 / 61 | 4.5 / 6.6 | 35 / 67 | 48 / 54 | 52 / 59 | 5.2 / 7.7 | 9.2 / 15 |
| 1× | partnership-tracker | `nav:pipeline` | 20 | 19 / 26 | 4.4 / 8.4 | 23 / 34 | 31 / 43 | 35 / 49 | 3.7 / 5.9 | 7.8 / 13 |
| 1× | cash-runway | open | 20 | 142 / 216 | 6.0 / 8.3 | 148 / 223 | 256 / 301 | 262 / 308 | 31 / 40 | 37 / 53 |
| 1× | cash-runway | `nav:cash_flow` | 20 | 131 / 157 | 4.8 / 6.4 | 136 / 164 | 254 / 291 | 259 / 295 | 30 / 42 | 34 / 48 |
| 1× | cro-selection | open | 20 | 14 / 23 | 3.6 / 6.8 | 18 / 30 | 20 / 24 | 24 / 28 | 2.1 / 6.9 | 5.4 / 14 |
| 1× | cro-selection | `nav:evaluation` | 20 | 15 / 18 | 5.8 / 8.6 | 21 / 24 | 24 / 28 | 30 / 35 | 2.4 / 4.3 | 8.4 / 13 |
| 2× | partnership-tracker | open | 20 | 62 / 78 | 9.3 / 12 | 72 / 89 | 106 / 147 | 117 / 161 | 10 / 21 | 20 / 41 |
| 2× | partnership-tracker | `nav:pipeline` | 20 | 42 / 48 | 9.6 / 11 | 51 / 60 | 71 / 109 | 80 / 128 | 7.1 / 12 | 17 / 26 |
| 2× | cash-runway | open | 20 | 314 / 404 | 13 / 17 | 327 / 420 | 601 / 742 | 623 / 754 | 76 / 96 | 92 / 125 |
| 2× | cash-runway | `nav:cash_flow` | 20 | 303 / 376 | 10 / 17 | 312 / 391 | 572 / 655 | 583 / 665 | 65 / 89 | 77 / 100 |
| 2× | cro-selection | open | 20 | 31 / 47 | 7.7 / 12 | 39 / 59 | 50 / 75 | 58 / 83 | 4.3 / 6.2 | 11 / 14 |
| 2× | cro-selection | `nav:evaluation` | 20 | 35 / 52 | 12 / 18 | 48 / 69 | 59 / 82 | 73 / 107 | 5.9 / 9.3 | 20 / 27 |
| 4× | partnership-tracker | open | 20 | 122 / 141 | 18 / 23 | 140 / 159 | 204 / 261 | 224 / 282 | 22 / 35 | 42 / 57 |
| 4× | partnership-tracker | `nav:pipeline` | 20 | 76 / 106 | 18 / 26 | 95 / 124 | 129 / 155 | 147 / 175 | 15 / 28 | 36 / 51 |
| 4× | cash-runway | open | 20 | 647 / 700 | 25 / 29 | 671 / 728 | 1152 / 1301 | 1186 / 1326 | 123 / 150 | 147 / 176 |
| 4× | cash-runway | `nav:cash_flow` | 20 | 609 / 674 | 20 / 26 | 630 / 698 | 1166 / 1347 | 1195 / 1370 | 107 / 129 | 125 / 149 |
| 4× | cro-selection | open | 20 | 56 / 77 | 17 / 22 | 74 / 101 | 102 / 123 | 117 / 144 | 8.6 / 25 | 23 / 40 |
| 4× | cro-selection | `nav:evaluation` | 20 | 66 / 71 | 26 / 39 | 94 / 101 | 115 / 131 | 143 / 159 | 9.0 / 15 | 33 / 42 |
| 6× | partnership-tracker | open | 20 | 182 / 248 | 26 / 46 | 209 / 289 | 304 / 405 | 335 / 489 | 33 / 43 | 64 / 90 |
| 6× | partnership-tracker | `nav:pipeline` | 20 | 117 / 156 | 27 / 36 | 140 / 192 | 205 / 234 | 233 / 288 | 28 / 43 | 61 / 84 |
| 6× | cash-runway | open | 20 | 939 / 1069 | 41 / 47 | 979 / 1101 | 1584 / 1962 | 1618 / 2002 | 219 / 262 | 259 / 303 |
| 6× | cash-runway | `nav:cash_flow` | 20 | 897 / 1069 | 29 / 41 | 932 / 1105 | 1623 / 1845 | 1653 / 1879 | 200 / 240 | 233 / 273 |
| 6× | cro-selection | open | 20 | 93 / 110 | 25 / 29 | 117 / 135 | 149 / 219 | 173 / 243 | 15 / 22 | 39 / 59 |
| 6× | cro-selection | `nav:evaluation` | 20 | 99 / 120 | 37 / 42 | 135 / 161 | 164 / 187 | 202 / 222 | 17 / 24 | 59 / 71 |

Every screen of each app, QuickJS sync build, demo data, 7 renders per screen (to check that the chosen navigation event is not an outlier):

| CPU rate | App | Screens | Fastest screen | Slowest screen | Slowest: render | Slowest: DOM apply | Screens over 100 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | partnership-tracker | 7 | 15 (`research`) | 21 (`overview`) | 16 | 5.5 | 0 |
| 1× | cash-runway | 7 | 16 (`scenarios`) | 23 (`overview`) | 18 | 5.9 | 0 |
| 1× | cro-selection | 8 | 8.4 (`decision`) | 15 (`vendors`) | 9.6 | 5.4 | 0 |
| 4× | partnership-tracker | 7 | 62 (`research`) | 98 (`settings`) | 68 | 30 | 0 |
| 4× | cash-runway | 7 | 77 (`scenarios`) | 114 (`overview`) | 87 | 26 | 1 |
| 4× | cro-selection | 8 | 39 (`decision`) | 65 (`proposals`) | 42 | 23 | 0 |

Reading the tables against the targets (`P1`: a visible response within 0.1 s; a screen change within 1 s):

| CPU rate | QuickJS sync, demo data: render + DOM, median (range over the six events) | p95 (range) | Under 0.1 s | Under 1 s |
| --- | --- | --- | --- | --- |
| 1× | 11–26 ms | 25–36 ms | yes | yes |
| 2× | 21–47 ms | 32–71 ms | yes | yes |
| 4× | 39–108 ms | 60–131 ms | CRO Selection yes; Partnerships and Runway at the line (medians 80–108 ms, p95 112–131 ms) | yes |
| 6× | 70–163 ms | 91–222 ms | CRO Selection at the line (70–91 ms median); Partnerships and Runway no (121–163 ms median) | yes |

- **The engine is not the whole cost.** At 4× the DOM apply alone is 13–28 ms of each figure.
- **The long table is an app-data problem, not an engine problem.** Runway reads and recalculates all plan lines on every event. With 350 plan lines one render takes 131–142 ms at 1×, 609–647 ms at 4× and about 0.9 s at 6× (p95 1.1 s) in the sync build, and over 1 s at 4× in the asyncify build. Native execution needs 107–123 ms at 4× for the same event, so it also misses 0.1 s. Partnerships and CRO Selection stay at or under 0.21 s at 6× (median, render + DOM) with their largest table at 350 rows.
- **Time in the store is negligible.** The in-memory store answered each render's 3 to 8 calls in 0.1 to 0.5 ms in total at 1× and at most 2 ms at 4× (medians). The cost is inside the guest: parsing the returned records, running the app's calculations and building the HTML.
- **Evaluating the source again for every event, as the server does, would add the "load app source" time to every render:** 25–72 ms at 1× and 87–149 ms at 4× (sync build). The kept-alive context is what makes the frame fast enough.

## 8. Native comparison and its trade-off

Measured the same way, in the same frame, with the source compiled by `new Function` under a frame policy with `'unsafe-eval'` (columns "Native" above). The same JSON boundary was kept for `tools.call`, input and output.

| CPU rate | Native render, median (range) | Native render + DOM, median (range) | QuickJS sync render + DOM, median (range) |
| --- | --- | --- | --- |
| 1× | 1.4–3.1 ms | 4.5–8.4 ms | 11–26 ms |
| 4× | 5.9–16 ms | 18–45 ms | 39–108 ms |
| 6× | 11–25 ms | 34–67 ms | 70–163 ms |

Trade-off, stated as design facts rather than measurements:

- `'unsafe-eval'` lets any string become code in the frame. App source then runs as ordinary frame script: it can reach the frame's DOM, its message channel to the host and everything the frame holds in memory, including the local store. In QuickJS the source sees only `input` and `tools.call`, and only JSON crosses the boundary.
- On a `srcdoc` host it needs the parent to allow `'unsafe-eval'`, a larger request than `'wasm-unsafe-eval'`.
- The server keeps running QuickJS for first render, commands and public links, so native execution in the frame runs the same source on a second engine. In this spike the output was identical for the events compared (section 9), which is two events per app and not a guarantee.

## 9. Same output as the server, and what was not measured

For each app, `open` and the navigation event were run through the product's own runtime child process (`src/foundation/runtime-child.mjs`, unchanged) and through the frame. The complete outputs (`html`, `css`, `state`) were compared as strings.

| App | Events | Frame, sync build | Frame, asyncify build | Frame, native |
| --- | --- | --- | --- | --- |
| partnership-tracker | `open`, `nav:pipeline` | identical | identical | identical |
| cash-runway | `open`, `nav:cash_flow` | identical | identical | identical |
| cro-selection | `open`, `nav:evaluation` | identical | identical | identical |

**Simulated, not real:**

- **The hosts.** Local pages with spike-written policies stand in for Claude and ChatGPT. To confirm on the real hosts: (1) in Claude, whether `WebAssembly.compile` of a small module succeeds inside the widget's `srcdoc` frame once our frame policy carries `'wasm-unsafe-eval'`; (2) in ChatGPT, that the frame served from our origin still loads and starts the engine with the changed header; (3) on both, on desktop and in the mobile apps.
- **The phone.** CPU throttling slows the frame's main thread by pausing it in slices. It is not a phone: memory, caches, heat and the browser's background compilation threads are not slowed. Single renders at 4× ranged from near-1× times to well above the median; the medians are the usable figures. A calibration loop inside the frame ran 3.2 to 4.3 times slower at 4× and 4.7 to 6.3 times slower at 6×.
- **The process model.** Desktop Chromium normally gives a sandboxed frame its own process; then the page-level CPU rate does not reach it. The spike switches that off (`--disable-features=IsolateSandboxedIframes`) so the rate applies to the frame from its first instruction.

| CPU rate | Frame | JavaScript loop | × of 1× | QuickJS loop | × of 1× | Device index | Machine load average |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1× | quickjs-sync | 229 | 1.0 | 16 | 1.0 | 2398 | 4.99 |
| 1× | quickjs-asyncify | 265 | 1.0 | 37 | 1.0 | 2061 | 5.71 |
| 1× | native | 266 | 1.0 | 20 | 1.0 | 2501 | 4.62 |
| 2× | quickjs-sync | 543 | 2.4 | 24 | 1.5 | 1114 | 4.52 |
| 2× | quickjs-asyncify | 490 | 1.9 | 48 | 1.3 | 1326 | 4.71 |
| 2× | native | 435 | 1.6 | 27 | 1.4 | 977 | 4.61 |
| 4× | quickjs-sync | 977 | 4.3 | 67 | 4.3 | 510 | 5.1 |
| 4× | quickjs-asyncify | 944 | 3.6 | 96 | 2.6 | 595 | 4.35 |
| 4× | native | 859 | 3.2 | 24 | 1.2 | 460 | 2.63 |
| 6× | quickjs-sync | 1435 | 6.3 | 81 | 5.1 | 398 | 3.4 |
| 6× | quickjs-asyncify | 1238 | 4.7 | 116 | 3.2 | 374 | 3.33 |
| 6× | native | 1429 | 5.4 | 72 | 3.7 | 319 | 3.12 |

"Device index" is a speed figure modelled on the two loops of Lighthouse's BenchmarkIndex, written out in the spike; it was not produced by Lighthouse and no device class is claimed from it.

**Not measured:**

- Claude and ChatGPT themselves, in any browser or app.
- A real phone. Safari and other WebKit browsers (every browser on iOS), and Firefox. Only Chromium 153 on Linux was run.
- The product frame's real sanitiser and the paint after layout; "DOM apply" is an approximation.
- Render timing inside a Worker. The Worker rows show that it starts and renders, not how fast.
- Real account data. Volumes were the demo set and one table padded to 350 rows.
- An idle machine. The run shared its machine with other jobs. An earlier full run under heavy load (load average 10 to 19, `results/under-load.md`) gave the same CSP and limit results, similar medians (4×, demo data, sync build, render + DOM: 55–108 ms) and wider p95 (103–187 ms).
- The p95 figures come from 20 or 30 renders and include the first, slower renders after loading.
- Timer resolution in the frame is 0.1 ms.

## 10. Recommendation

**QuickJS in the frame is viable for architecture E.** Against the targets:

- **Screen change within 1 s: met** in every measured case with demo data, at every CPU rate, by a factor of four or more. The one case near the limit is Runway with 350 plan lines at 6× (0.9 s median, 1.1 s p95), which loading only what the screen needs (`P3`) addresses, not the engine.
- **Visible response within 0.1 s: met by the render itself at 1× and 2×; not reliably at 4× and 6× for the two largest apps.** On slow devices the frame should acknowledge the tap first (for example the pressed or selected state of the control, drawn by the frame shell) and render straight after. The screen change then follows 0.1 to 0.2 s later. That acknowledgement was not built or measured in this spike.

For package 5.1:

1. Add `'wasm-unsafe-eval'` to the frame policy in both places (`src/shared/frontend-frame.ts`, `src/server/app.ts`). Do not add `'unsafe-eval'`.
2. Put the **sync build** (`RELEASE_SYNC`, same `quickjs-emscripten` release) in the frame. Reads are answered synchronously from the local store, so asyncify is not needed there. It is half the size and 1.4 to 2 times faster, and its output matched the server's. The server keeps its build.
3. Keep the context alive per open app. Start the engine and load the source after the first server-rendered paint, then render the seeded state once in the background: this warms the engine and gives a check that the frame's output equals the server's.
4. At frame start, compile an 8-byte module. If that fails, report it to the host shell and stay on server mode.
5. Treat a Worker as optional. It keeps the frame responsive during long renders but needs `worker-src blob:` in our policy and in a `srcdoc` host's policy, one more thing a host can refuse.
6. Keep native execution out of the plan unless a real phone shows QuickJS missing the 1 s target. It is faster, but it gives up the isolation and it needs more from the host.

**Expected server-mode (fallback) conditions:**

| Condition | How it shows | Measured here |
| --- | --- | --- |
| Host policy refuses WebAssembly for the frame (`srcdoc` hosts) | `CompileError` at frame start | Yes, with a simulated host |
| Host stops the frame from loading (`frame-src`) | Frame script never runs; today's situation for a served frame in Claude according to `claude-frame.ts` | Yes, with a simulated host |
| Engine fails to start or the source fails to load (old browser, memory limit, WebAssembly switched off on the device) | Start promise rejects or times out | Failure path exercised only through the CSP refusal |
| Frame output differs from the server's for the seeded state | Comparison after the background render | Not built; outputs were identical for the events compared |
| An event has an outside effect (send, connector call, exchange write, `functions.invoke`, `layout.propose`) | The store refuses it; the event goes to the server | The store stub refuses these; forwarding was not built |
| Customised copies and public links | Server mode by plan | Not part of the spike |

**Risks:**

- **Claude may refuse WebAssembly in the widget.** It is the `srcdoc` shape, where our policy alone decides nothing. If it refuses, Claude stays on server mode (`D21`) until Claude's policy changes or the frame can be served from our origin there.
- **Real phones may be slower than the 4× profile**, and WebKit was not run. The 0.1 s line is already touched at 4×.
- **Renders block the frame's main thread** for their whole duration: 26–79 ms at 4× with demo data, 0.6 s for the 350-row Runway case. Taps during a render wait.
- **The frame document grows** by about 0.7 MB raw (0.26–0.31 MB compressed) per load unless it is cached; today it is served with `max-age=0`.
- **A kept-alive context is not the server's single-use context.** Globals survive between events in the frame and not on the server. The three apps produced identical output on the events compared; a source that keeps state outside `state` would differ.
- **`'wasm-unsafe-eval'` is a small loosening of the frame policy.** Script already allowed in the frame may compile WebAssembly; no new script source and no `eval` is allowed (measured).
