# Vivid template reuse contract

The user's supplied HTML is the visual authority. Its contents are examples, not the product model. The template kit is `assets/vivid-template/`. This contract supersedes visual advice in older references.

## What GPT supplies

Use `prepare_tracker` or `prepare_tracker_revision` with `templateId: "trialy.standard.v1"`. Supply names, descriptions, tabs, authorized table/field bindings, visibility, order, filters, and display semantics. Read CONFIGURATION.md for the validated tool arguments. Do not output HTML, CSS, SVG, a new renderer, or a reproduction of the sample tracker.

A tab can select `icon: "people" | "document" | "checklist" | "contract"`. These are the four exact SVGs from the HTML, with content-independent names. Without a selection, their reference order repeats. Badges use only `neutral`, `green`, `blue`, `amber`, or `red` through column display/valueTones. This chooses a fixed reference class; it does not accept color values.

Labels and fields are entirely replaceable. Bind them to the actual authorized schemas; never infer a UUID from a sample. The template needs no CROs, vendors, RFPs, contracts, rankings, example people, dates, or preset business workflow. If an empty-state example is wanted, explicitly label it fictional and keep it out of storage and counts. Set showExample:false when the user wants no sample content.

## Fixed component catalog

| Family | Components | Replaceable slots |
| --- | --- | --- |
| Page | page, heading | content; title, description |
| Navigation | tabs, tab | label, tab items, settings action; selected state |
| Overview | stats, stat | items; value, icon, label, hint |
| Values | pill, tags, tag, rank, empty | label/items; catalog tone class |
| Table | search, toolbar, table | inputs, filters, sort, actions; rows, counts, feedback |
| Details | details, detail, drawerHead, drawerBody, drawerActions | fields, label/value, title/hint, controls |
| Settings | settingsTop, settingsTabs, settingsTab, settingsContent | navigation/actions, selection, content |
| Layout | section, field, stack, tabLayoutRow, columnLayoutRow, gripIcon | title/info, label/control, reorder/name/type/visibility controls |
| Access | person, permission | avatar/name/description/role; label/control |
| Icons | icon.people, icon.document, icon.checklist, icon.contract, icon.expand, icon.settings | none |

`components.json` stores the fixed element trees, original classes, and original icon paths. `{ "slot": "name" }` is a data/control slot. The trusted adapters escape text and bind events; user configuration never supplies raw component trees or HTML. `catalog.html` is a content-neutral visual specimen, not a working tracker or database. It is generated from these components and the exact stylesheet.

## Runtime and development

- `theme.css` is the byte-exact content of the reference HTML's style block, including its cascade and responsive rules. Do not simplify, reorder, recolor, rename selectors, or regenerate it from a screenshot.
- `manifest.json` pins the original HTML and stylesheet SHA-256 hashes. Keep the original HTML unchanged as the comparison fixture. Do not execute its business/demo script in production.
- `engine.js` renders component trees; generated `runtime.js` combines it with the definitions. `connected-tracker.js` is the authorized data/action adapter and uses this runtime. `read_tracker_design(resource:"skeleton")` returns the composed executable renderer.
- React Settings uses the same component definitions and stylesheet inside a Shadow DOM. The sole stylesheet selector adaptation is `:root` to `:host`; body and tbody selectors remain intact. Host app rules cannot override them.
- `scripts/build-vivid-template.ts` regenerates runtime.js, vivid.generated.ts and catalog.html. Its `--check` mode fails the build if the original style or generated assets drift.
- New component work must come from the original HTML, with original-vs-component comparisons at 1440px and 390px, not a fresh design. Changes to a fixture hash are not evidence of parity.

## Necessary app integration differences

The template defines presentation, not authority. Real records, totals, schema types, memberships and permissions come from the server. It never inherits the demo's fake access engine, local-storage data, invite flow, role editing, business calculations or record writes. Workspace roles are displayed read-only; shared permission changes retain their impact review. New database fields use the reviewed schema workflow.

The connected app retains bounded data pages, signed write controls, accessible resizers, unsaved-change handling and one-scroller embedding adapters. Those functional adapters are separate from theme.css. The overview's record summaries use the reference table component; empty examples live in the data tab rather than introducing a different card design. Specialized visualizations may require an explicitly supported capability; never invent one to bypass the standard template.

## Authoring check

Before preparing: identify the user's actual job and authorized bindings. Before saving: check templateId, labels, field types, cardinality, explicit icon/tone choices if needed, counts excluding examples, and no sample-domain leakage. A different subject changes configuration, not the stylesheet or component hierarchy.
