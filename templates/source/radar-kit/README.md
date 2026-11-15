# Bio Radars kit 1.1.0

Shared source for every Bio Radar app (scope: [BIO_RADAR.md](../../../docs/product/app-template-blueprints/apps/BIO_RADAR.md) §2, §5 and §7). A radar is a definition on this kit; the kit supplies the four screens, the common tables, the brief builder, the research-template editor, the source report, the digest and alert, and the recommended automations.

## Files

| File | Purpose |
|---|---|
| `kit.mjs` (+ `kit.d.mts`) | Pure functions from a radar definition: installer schema (common tables + radar fields), `radar.v1` output contract, research template defaults with the 8 locked rules, recommended automations (scan + digest as one automation, alert after the scan), function declarations, layout schema and catalog documentation. |
| `radar.source.js` | App source (`frontend-js`, Vivid kit, theme graphite): Overview, Tracker, Events (New / Feed / Calendar), Setup (Scopes, Research template, Fields, Automations and access). Server-side pages only. |
| `radar.css` | Graphite theme (derived from Contracts' graphite rail), `rd-` prefix. |
| `brief-core.js` | The brief builder, shared by the `brief` function and the Setup preview: template + locked rules, active scopes with named sources and since dates, current tracker fields (custom ones included) and the return format. |
| `functions/` | Read-only app functions (E7): `brief`, `digest_summary`, `alert_summary`, and their shared helpers. |
| `archive/<version>/` | Frozen copies of earlier kit versions. A radar's `"kit"` pins the version it was released on. |

## Kit versions

| Version | Used by | Changes |
|---|---|---|
| 1.0.0 (`archive/1.0.0/`) | Trial Radar 1.0.0 | First release. |
| 1.1.0 (current) | Pipeline Radar 1.0.0, Literature Radar 2.0.0, Deal Radar 1.0.0, Funding Radar 1.0.0 | New definition keys (below); multiline scope fields; disclaimer in the footer, digest and alert; item-based digest section with disclosed amounts per currency; thousands separators in the digest; drawers scroll as a whole so the footer never covers a field. |

Definition keys added in 1.1.0 (all optional):

| Key | Meaning |
|---|---|
| `kit` | Kit version the radar is built on. Missing means the current kit. |
| `userOwnedFields` | Extra tracker fields the team owns (for example a reading queue). Research never writes them. |
| `trackerOutput` | Publish the tracker as a `radar.v1` output (`<prefix>.<trackerTable>`, one writer) with a `note` for readers. |
| `itemNameField` | Field that names an item when it isn't `title` (for example `company_name`). |
| `disclaimer` | One line shown in the footer and every email (for example "Not legal advice."). |
| `scopeFields[].multiline` | Textarea, up to 6,000 characters (for example a synthesis prompt). |
| `dateField.upcoming: false` | The date is in the past (publication, announcement): no "Coming up" panel or digest section. |
| `digestSection.source: "items"` | Build the digest section from tracker rows changed in the run instead of events: `filter`, `lineField`, `amountField` + `currencyField` + `disclosedField` (per-currency totals), `countField` + `countLabel`. |

## Add a radar

1. Create `templates/source/radars/<slug>/` with `radar.json` (copy Trial Radar's and change: id, version, name, prefix, trackerTable/Label, item labels, cadence, scopeFields, trackerFields, naturalKey, dateField, eventKinds, digestSection, listColumns, optionLabels, sources, instruction, examplePrompts), `catalog.metadata.json` (description, tags, whenToUse, whenNotToUse) and fictional `demo_data.json`.
2. Run `node scripts/build-radar-templates.mjs`. It writes `templates/apps/<id>-<version>.json`, `schema.example.json`, `<slug>.preview.html`, the radar's events entry in `templates/contracts/outputs.json` and its line in `templates/catalog-installers.json`.
3. Add tests (copy `tests/trial-radar.test.ts` and the integration test's install/run flow) and the radar's README and QA.

Never change a released version: bump `version` in `radar.json`. A released radar pins its kit with `"kit"`; before changing the kit for new radars, copy the current files to `archive/<version>/` so released packages stay byte-identical (the `--check` run fails otherwise), then bump `KIT_VERSION` in `kit.mjs`.
