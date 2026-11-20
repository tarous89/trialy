# Spike 1.9: the QuickJS engine inside the app frame

Run it, from the repository root (Chromium for Playwright must be installed; `CHROMIUM_PATH` overrides the binary):

```
node scripts/spikes/frame-engine/run.mjs
```

It builds the frame documents, serves them on two local origins, drives headless Chromium and writes
`results/latest.json` and `results/latest.md` (also printed). A full run takes about 15 minutes; `--quick` takes
about four. The write-up of the committed run is
[docs/scopes/platform-decisions-2026-11-19/7-frame-engine-spike.md](../../../docs/scopes/platform-decisions-2026-11-19/7-frame-engine-spike.md).

Nothing under `src/` is changed or started. Nothing leaves the machine: the frame has `connect-src 'none'` and the
records are the fictional demo data in `templates/source/`.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `--quick` | off | 5 renders, 2 cold samples, CPU rates 1× and 4×; writes `results/quick.*` |
| `--renders=N` | 30 | Renders per event with demo data (the long-table fixture uses two thirds, at least 20) |
| `--cold=N` | 7 | Fresh page loads per cold-start row |
| `--rates=1,2,4,6` | `1,2,4,6` | CPU throttling rates (`Emulation.setCPUThrottlingRate`) |
| `--only=a,b` | all | Stages: `sizes,matrix,limits,parity,cold,bench,screens` |
| `--out=name` | `latest` | Result file name under `results/` |
| `--high-priority` | off | Raises the scheduling priority of the run and its browser (needs permission; for a shared machine) |

`node scripts/spikes/frame-engine/report.mjs [results/file.json]` prints the tables for an existing result file.

## What it does

| Stage | Question | How |
| --- | --- | --- |
| `sizes` | How large is the inlined engine? | Raw, gzip -9 and brotli 11 sizes of the WASM binary, its base64 text and the whole frame document |
| `matrix` | Under which CSP does the engine start? | One page per combination of delivery shape, parent policy and frame policy; the frame reports what happened |
| `limits` | Do synchronous WebAssembly limits apply? | `new WebAssembly.Module` / `Instance` on the engine binary and on padded modules around 8 MB, main thread and Worker |
| `parity` | Same output as the server? | The same two events through the product's `src/foundation/runtime-child.mjs` (unchanged, started as a child process) and through the frame; outputs compared as strings |
| `cold` | How long does the engine take to start? | Fresh browser context per sample; timings taken inside the frame |
| `bench` | How long does a render take? | Source loaded once, then an `open` event and one navigation event rendered alternately |
| `screens` | Is the chosen navigation event typical? | Every screen of each app, QuickJS sync build, at 1× and 4× |

## Files

| File | Purpose |
| --- | --- |
| `run.mjs` | The command: local servers, Playwright, stages, result files |
| `build.mjs` | Bundles the frame script with esbuild, inlines the WASM as base64, computes the script hash, reads the product CSP from `src/shared/frontend-frame.ts` and `src/server/app.ts` |
| `frame/harness.mjs` | The script inside the frame: engine start, kept-alive context, renders, probes |
| `frame/entry-sync.mjs`, `frame/entry-asyncify.mjs` | One frame script per QuickJS build |
| `fixtures.mjs` | Catalog source of the three apps with configuration and bindings prepended as `AppTemplates.operation` does, and the demo records |
| `store.mjs` | The in-memory answer to `tools.call` (response shapes from `tests/batched-read-apps.test.ts` and `tests/fixtures/cro-selection.ts`) |
| `report.mjs` | Markdown tables from a result file |
| `memory-check.mjs` | Side check in Node: QuickJS heap use over 1,200 renders in one kept-alive context |
| `results/latest.*` | The committed run (20 November 2026) |
| `results/under-load.md` | An earlier full run on the same machine while it was heavily loaded, kept for comparison |

## How the frame is modelled

- The frame document has the product's layout: one inline script, its SHA-256 in `script-src`, the CSP as a `<meta>`
  and, when served, also as the header `sandbox allow-scripts; <policy>`. The policy text is read from the product
  source at build time; a frame policy under test adds one keyword to it (`'wasm-unsafe-eval'`, `'unsafe-eval'`, or
  `'wasm-unsafe-eval'` plus `worker-src blob:`).
- The iframe is `sandbox="allow-scripts"` with `referrerpolicy="no-referrer"`, as in `FrontendCodeRuntime.tsx`.
- The guest wrapper is the one in `runtime-child.mjs` (strict function, JSON strings only across the boundary, 16 MB
  heap limit, 256 KB stack, 64 MiB WASM memory ceiling, interrupt handler), with one change: the app function is kept
  and called per event instead of the source being evaluated again.
- "DOM apply" parses the HTML into a template, walks every element and attribute, replaces the root, sets the style
  sheet and forces style and layout. It approximates the product frame's `paint`; it does not copy its sanitiser rules
  and it does not time the paint itself.

## What is simulated

- **Hosts.** The parent pages are local pages with policies written for this spike. They are not Claude or ChatGPT.
  The `strict` parent stands for "a host whose policy we do not control and that does not allow WebAssembly".
- **Phone.** CPU throttling slows the frame's main thread by a fixed factor. It does not model a phone's memory,
  caches, thermal limits or background compilation threads.
- **Process model.** Desktop Chromium puts a sandboxed frame in its own process. The spike switches that off
  (`--disable-features=IsolateSandboxedIframes`) so one CPU rate covers the frame from its first instruction; a
  calibration loop inside the frame checks that the rate applies.
