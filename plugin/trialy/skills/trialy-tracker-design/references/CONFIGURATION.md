# Standard tool configuration

Use `prepare_tracker` for a new tailored tool and `prepare_tracker_revision` for changes. The template ID is `trialy.standard.v1`. This is an interface template, not a fixed business workflow. Adapt every tab, field and status to the actual task. The server stores JSON configuration and supplies the versioned renderer and approved stylesheet; do not copy the renderer or write HTML/CSS.

## Creation inputs

- `name`, `description`, `resourceKind` (`tracker`, `form`, `visualization`), `projectId`, `scope`.
- `pageSize`: 1–25, default 25. Very wide tables are bounded to 480 interactive cells per page.
- `tabs`: tailored name, authorized `typeId`, `visible`, `filters` (keys of scalar select or boolean columns), `columns` and optional labelled fictional `example`.
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

Calculated fields are read-only, scalar, optional and non-unique. Numeric formula inputs must be scalar numeric fields. Declare every computed dependency. Processing runs in a time/memory-bounded sandbox without network, tools, DOM or writes; return the declared data type. Do not claim calculations succeeded when derived status reports an error. Access restrictions propagate to dependencies and linked values.

## Column display

`display` is optional and does not change stored values:

```json
{"kind":"badge","tone":"neutral","valueTones":{"New":"blue","Contacted":"amber","Engaged":"green","Declined":"red"}}
```

Kinds: text, badge, number, progress, link. Tones: neutral, green, blue, amber, red. Numeric formatting supports `prefix`, `suffix`, `decimals`; progress supports `min`, `max`. Link display accepts HTTP(S) values. Editing uses the underlying value. Formatting is supplied by the trusted UI; raw CSS, HTML and event handlers are not configuration inputs.

For a currency column, use `display:{kind:"number",prefix:"€ ",decimals:2}`. For status filtering, include `filters:["status"]` on that tab. Filters apply to the whole bound table before pagination; search/sort are explicitly labelled as page-local.

## Adaptable overview

Use `overview:{showCounts:true,nextSteps:[{tabIndex:0,titleField:"name",textField:"next_step",heading:"Next steps"}]}` to choose summary content. Both fields must be selected columns in that tab. Next-step panels explicitly summarize a bounded first page, not every record in a large table. Hide counts with showCounts:false.

## Revisions

Read the saved tool and its current version. Call `prepare_tracker_revision` with `componentId`, `expectedVersion` and only changed configuration properties. Omitted properties are preserved. Prefer `changes.columns:[{tabIndex:0,field:"status",label:"Stage"}]` for targeted label, visibility, editability or display changes; these preserve every other column. Do not combine columns with a replacement tabs array. If replacing `tabs`, include every tab/column to retain; this replaces presentation configuration, not database records. Keep all unrelated fields, labels, visibility, display settings and relationships. Required schema additions can use `newTables` or `extendTables` in the same confirmed revision. A stale version fails rather than overwriting a concurrent edit.

## Unsupported designs

Use the approved Vivid HTML template as the first and default tracker format. Always adapt tables, columns, labels, statuses, calculations and other content to the user. Different business terminology is not a reason for new code. Only when a required interaction or presentation cannot be expressed by the template may ChatGPT choose a new custom format: explain the specific limitation in `prepare_workspace_change` → `save_component.designChangeReason`, preserve the connected resource manifest and permissions, then open the draft with `open_tracker_draft` and use the normal reviewed save. This exception creates a new tool only; it cannot replace a saved standard tracker. Ordinary revisions use `prepare_tracker_revision`.
