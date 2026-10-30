# Standard app configuration

Use `prepare_tracker` for a new tailored app and `prepare_tracker_revision` for changes. The template ID is `trialy.standard.v1`. This is an interface template, not a fixed business workflow. Adapt every tab, field and status to the actual task. The server stores JSON configuration and supplies the versioned renderer and default stylesheet. Use theme overrides or custom frontend-js when requested.

## Creation inputs

- `name`, `description`, `resourceKind` (`tracker`, `form`, `visualization`), `projectId`, `scope`.
- `pageSize`: 1–25, default 25. Very wide tables are bounded to 480 interactive cells per page.
- `tabs`: tailored name, authorized `typeId`, `visible`, `filters` (keys of select or boolean columns, including multi-value choices), `columns` and optional labelled fictional `example`.
- Each column: stable database `field`, display `label`, `visible`, `editable`, optional `display`. Existing field type, dropdown options, multiplicity and calculation definition come from the database, not invented UI metadata.
- `newTables` and `extendTables`: reviewed schema definitions. Existing tables use current schema versions. Relationships/lookups can target existing authorized tables. New mutually linked tables need staged schema preparation; do not invent saved IDs.
- `showExample`: controls fictional empty-state examples; these are never saved records. `omitSource` only when Source is explicitly excluded.

## Field definitions

Define new fields with `key`, `name`, `kind`, `ai`, `required`, and optional `multiple`, `unique`, `options`, `targetTypeId`, `formula`, `computed`, `lookup`, `renderer`.

| Need | Configuration |
| --- | --- |
| Ordinary text, URL, email | `kind: "text"`; URLs/email are text values, not separate schema types |
| Dropdown/status | `kind: "select"`, `options: ["New", "Contacted", "Engaged", "Declined"]`; use `multiple:false` for one status |
| Numeric value or currency | `kind:"number"` or `"money"` |
| Date / yes-no | `kind:"date"` / `"boolean"`; scalar |
| Linked record | `kind:"relationship"`, `targetTypeId` of an existing authorized table |
| Simple math | Numeric field with `formula:{operator:"product",fields:["quantity","unit_cost"]}`; operators: sum, product, difference, ratio |
| Processing / conditional value | `computed:{fields:["status"],source:"return input.status === 'Engaged' ? 'Arrange meeting' : 'Review next step';"}` on a text field |
| Linked database field | `lookup:{reference:"company",field:"name",aggregate:"first"}`; aggregations: first, sum, count, min, max, join |
| Custom display text | `renderer:{kind:"code",source:"return String(input.value).toUpperCase();"}`; returns text or a validated display object, never HTML |

Calculated fields are read-only, scalar, optional and non-unique. Numeric formula inputs must be scalar numeric fields. Declare every computed dependency. Processing runs in a time/memory-bounded sandbox without network, apps, DOM or writes; return the declared data type. Do not claim calculations succeeded when derived status reports an error. Access restrictions propagate to dependencies and linked values.

## Column display

`display` is optional and does not change stored values. Status/stage/priority/outcome fields receive badge defaults only when display is omitted. Other categories and multiple values stay plain. Explicit text or neutral badge settings always win. Optional valueTones customize meaning:

```json
{"kind":"badge","tone":"neutral","valueTones":{"New":"blue","Contacted":"amber","Engaged":"green","Declined":"red"}}
```

Kinds: text, badge, number, progress, link. Tones: neutral, green, blue, amber, red. Numeric formatting supports `prefix`, `suffix`, `decimals`; progress supports `min`, `max`. Link display accepts HTTP(S) values. Editing uses the underlying value. Formatting is supplied by the trusted UI; raw CSS, HTML and event handlers are not configuration inputs.

For a currency column, use `display:{kind:"number",prefix:"€ ",decimals:2}`. Categorical filters are automatic (up to eight, status/stage first). `filters:["status"]` narrows the controls; `filterMode:"custom"` uses exactly the supplied list; `filterMode:"none"` hides them only when requested. Multi-value filtering matches records containing the selected value. Filters apply to the whole bound table before pagination; search/sort are explicitly labelled as page-local.

## Adaptable overview

Use `overview:{showCounts:true,nextSteps:[{tabIndex:0,titleField:"name",textField:"next_step",heading:"Next steps"}]}` to choose summary content. Both fields must be selected columns in that tab. Next-step panels explicitly summarize a bounded first page, not every record in a large table. Hide counts with showCounts:false.

## Revisions

Read the saved app and its current version. Call `prepare_tracker_revision` with `componentId`, `expectedVersion` and only changed configuration properties. Omitted properties are preserved. Prefer `changes.columns:[{tabIndex:0,field:"status",label:"Stage"}]` for targeted label, visibility, editability or display changes; these preserve every other column. Do not combine columns with a replacement tabs array. If replacing `tabs`, include every tab/column to retain; this replaces presentation configuration, not database records. Keep all unrelated fields, labels, visibility, display settings and relationships. Required schema additions can use `newTables` or `extendTables` in the same confirmed revision. A stale version fails rather than overwriting a concurrent edit.

## Unsupported designs

Use Vivid as a reusable default. Users may customize branding, fonts, icons, layouts and interactions or request fully custom frontend-js code, including revisions of saved template apps. No design exception or capability whitelist is required. Use prepare_tracker / prepare_tracker_revision for template configuration and theme; use save_component for custom source with authorized bindings and a complete manifest. Preserve database validation, access controls, reviewed writes and audit logging.

## Exact reusable template

Read [TEMPLATE_REUSE.md](TEMPLATE_REUSE.md). The fixed component kit supersedes conflicting styling advice in older references. Each tab may optionally select `icon: "people" | "document" | "checklist" | "contract"`; these reuse the original four SVGs without changing their paths, colors or size. All other visual decisions remain template-owned. Labels, fields and record content do not inherit the example HTML's business domain.

## Theme and custom interfaces

`theme` is supported by prepare_tracker, prepare_tracker_revision.changes and app Settings. Fields: primary, accent, success, background, surface, text, muted, border (six-digit hex); fontFamily (font stack); fontSize (12–24); density (comfortable/compact); radius (0–30); css (up to 12,000 characters, applied last inside the isolated app frame). Omitted values preserve the Vivid preset. Revisions merge the theme unless the caller deliberately supplies a replacement theme; use {} to reset.

Example requested brand: `theme:{primary:"#003B71",accent:"#00A3E0",success:"#65B32E",surface:"#FFFFFF",background:"#F3F6F8"}`. Preserve all unrelated configuration and database bindings.

Tabs accept an optional iconPath (SVG path data) in addition to the preset icon names. Use custom source for arbitrary SVGs or different component structures. `allowEdits:true` enables explicitly editable columns on an interactive dashboard; omitted keeps new dashboards read-only. Existing field permission checks and reviewed saves still apply.

For fully custom apps, create or revise save_component with frontend-js source and its authorized manifest. Preserve the existing componentId/expectedVersion and bindings when changing only presentation. No designException is needed.
