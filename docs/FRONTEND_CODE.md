# Hosting ChatGPT-written frontend code

Trialy stores and hosts code written by ChatGPT. It does not require an app to be assembled from Trialy text/table/form/chart blocks. The earlier `trialy-ui-v1` direction is legacy compatibility only: no new packages or conversions into that format are accepted. Saved records and their history are preserved.

## Initial runtime contract: trialy-frontend-js-v1

Save a component with `format: "frontend-js"`, a JavaScript function body in `source`, and explicit table/field `bindings`. The code runs in the existing isolated QuickJS/WASM process and returns `{html, css, state}`. ChatGPT authors the HTML, CSS, rendering, calculations and event-handling code. No fixed layout or business template is required.

The input is `{state, event}`. Event kinds are `open`, `click`, `change` and `submit`; events have an `action`, a `value`, and string/boolean `form` values. Add `data-action="your-action"` to a button, input, or form to send an event to the code. Every event reruns the function with the previous returned state. This state is temporary UI state, not a saved database record. Persist important work through reviewed record proposals.

Example function body (no database needed):

```js
const count = Number(input.state?.count ?? 0)
  + (input.event.action === 'increase' ? 1 : 0);
return {
  html: `<article><h1>My custom interface</h1><p>${count}</p>
    <button type="button" data-action="increase">Increase</button></article>`,
  css: 'article {padding:24px;background:#eef7f0;border-radius:16px}',
  state: {count}
};
```

For data, `tools.call('records.read', {typeId, limit:50, offset:0})` returns IDs, versions and only declared fields. `tools.call('records.propose', changes)` collects up to 50 create_record/update_record operations. It does not commit. Trialy's trusted outer workspace displays an exact review and confirm action; the code cannot press that button or obtain its credentials. Confirmed writes recheck project/component permissions, bindings, record versions and component version, then commit atomically with history/audit and an idempotent receipt. Undeclared fields and calculated-field writes are rejected. A failed render does not leave a partial database write or proposal.

Use `run_component_frontend` from the app bridge with either `{componentId,expectedVersion}` or an owned `{previewId}`. The code preview is allowed before saving, can read declared fields, and cannot propose writes. Drafts expire after 24 hours. Saved source begins at version zero; changes, moves and recovery retain the existing revision/audit behavior. Saved component and data permissions are rechecked after execution as well as during reads. No frontend authority grants permission to email, invoke unrelated tools or run a scheduled worker.

## Display and isolation

The frame shell is hosted at `/frontend/frame` on Trialy's existing origin. It contains no account/session/customer data. HTTP CSP applies `sandbox allow-scripts` without same-origin, form submission, popup or top-navigation privileges. Only the hash-pinned trusted bridge script is executable. Generated JavaScript never runs in the frame. HTML is parsed into an inert template and limited to non-executable display/form/SVG elements and attributes before insertion. Script/event handlers, frames, metadata, navigation URLs and external resources are removed. CSS is scoped by the frame; CSP disallows network connections and external assets. Only inline raster data images are accepted.

The parent validates the frame window and a per-instance channel before handling events. Generated content cannot access the outer review buttons. Source may still render misleading text, so trusted save status and confirmation always remain outside it. The MCP resource declares only Trialy's own origin in `frameDomains`; no wildcard external domains or relaxed widget network access are added. OpenAI's frame policy is documented at https://developers.openai.com/plugins/reference (component resource CSP).

Execution retains the existing 15-second wall limit, 64 MiB WASM ceiling, 16 MiB guest heap and broker/output limits. Frontend execution adds two concurrent runs per web process, one per workspace/user, at most 50 proposed writes, 200,000 HTML characters, 50,000 CSS characters and 100 KB state. No secrets, host process/files, arbitrary imports, fetch, external network or browser DOM APIs are exposed to generated code. Standalone and embedded workspace use the same backend and renderer.

## Explicit limits and remaining work

This is an HTML/CSS/JavaScript **render/event runtime**, not an unmodified browser-JavaScript, React/npm, canvas or general DOM application host. Third-party packages, remote assets, raw event-handler attributes and external navigation are unsupported. Repeated form names currently use the last string value; file inputs are unsupported. Event handling is a server round trip; CSS handles purely visual animation. Saved-function attachment is implemented below; approved external adapters remain pending.

Default source access requires full workspace field/document access plus project/component restrictions. The owner-reviewed binding-scoped exception is specified below. A separate human-only channel within ChatGPT is not implemented. Historical `trialy-ui` objects can still be read/edited; they are not the product authoring model.

Verification: backend tests cover read-only draft execution, bound reads, missing host/network APIs, reviewed writes, stale changes, failure cleanup and revocation. The frame response is checked for its hash-only script and HTTP sandbox. Local Chromium could not launch because the execution environment denied a required socket operation; actual browser interaction/isolation and real ChatGPT embedding remain unverified. Do not describe this as production security validation.

## Bound workers — migration 023

Reviewed component execution bindings name exact owned function revisions and optional existing type-scoped grants. tools.call('functions.invoke',{binding,input,requestKey}) stages a request; up to three requests and any data proposal are admitted atomically after successful render and access recheck. No queued request survives a failed render/admission. The immediate guest response is pending_render_completion; the HTTP response includes queued run IDs. Use functions.status with the same requestKey on a later event for its result. Unsaved previews cannot enqueue. Component changes/archive/access loss invalidate its runs. Restoring source clears execution bindings.

The component configuration screen also has generic run/status/cancel controls. Schedules use the existing reviewed function schedule with componentContext:{id,version,binding}. Function-generated writes remain proposals unless an explicit attached data-type grant authorizes them. No provider credentials or direct network are exposed.

## Named assets, project queries and audience release — migrations 028–031

Component content accepts `assets:[{name,versionId}]` (up to 20 unique names). Each reference is an exact committed document version; source bytes stay in PostgreSQL. `files.list` returns allowed asset metadata; `files.text({name,offset})` reads extracted text and its availability flag; `files.image({name})` returns a checksum-verified raster data URL for a supported PNG/JPEG/GIF/WebP original up to 120,000 bytes. No SVG/script/network asset loading. Extraction failure does not lose the original. Permissions are rechecked on access and after execution. Copies keep references; restored revisions revalidate them.

`project.records({offset})` and `project.relationships({offset})` are read-only queries for the saved component's current project, restricted to its declared type/field bindings. Relationship edges require both records in the project and a visible declared relationship field. The returned page has nextOffset; no implicit transitive entity graph or cross-project disclosure.

`sourceAccess:'workspace'` remains the default. `sourceAccess:'bindings'` requires an owner-reviewed source save that explicitly releases the **entire source, including literal data** to the project's permitted audience. Each reader still needs all declared bound fields and named assets; live reads/writes remain permission filtered. This is not an automatic workaround for inaccessible sources. Historical source snapshots retain their own stricter access checks. Restoring a formerly workspace-only snapshot cannot silently release it. Binding-scoped components cannot attach functions with workspace-wide document access. Human-only data inside ChatGPT is still unsupported.
