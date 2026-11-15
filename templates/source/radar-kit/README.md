# Bio Radars kit 1.0.0

Shared source for every Bio Radar app (scope: [BIO_RADAR.md](../../../docs/product/app-template-blueprints/apps/BIO_RADAR.md) §2, §5 and §7). A radar is a definition on this kit; the kit supplies the four screens, the common tables, the brief builder, the research-template editor, the source report, the digest and alert, and the recommended automations.

## Files

| File | Purpose |
|---|---|
| `kit.mjs` (+ `kit.d.mts`) | Pure functions from a radar definition: installer schema (common tables + radar fields), `radar.v1` output contract, research template defaults with the 8 locked rules, recommended automations (scan + digest as one automation, alert after the scan), function declarations, layout schema and catalog documentation. |
| `radar.source.js` | App source (`frontend-js`, Vivid kit, theme graphite): Overview, Tracker, Events (New / Feed / Calendar), Setup (Scopes, Research template, Fields, Automations and access). Server-side pages only. |
| `radar.css` | Graphite theme (derived from Contracts' graphite rail), `rd-` prefix. |
| `brief-core.js` | The brief builder, shared by the `brief` function and the Setup preview: template + locked rules, active scopes with named sources and since dates, current tracker fields (custom ones included) and the return format. |
| `functions/` | Read-only app functions (E7): `brief`, `digest_summary`, `alert_summary`, and their shared helpers. |

## Add a radar

1. Create `templates/source/radars/<slug>/` with `radar.json` (copy Trial Radar's and change: id, version, name, prefix, trackerTable/Label, item labels, cadence, scopeFields, trackerFields, naturalKey, dateField, eventKinds, digestSection, listColumns, optionLabels, sources, instruction, examplePrompts), `catalog.metadata.json` (description, tags, whenToUse, whenNotToUse) and fictional `demo_data.json`.
2. Run `node scripts/build-radar-templates.mjs`. It writes `templates/apps/<id>-<version>.json`, `schema.example.json`, `<slug>.preview.html`, the radar's events entry in `templates/contracts/outputs.json` and its line in `templates/catalog-installers.json`.
3. Add tests (copy `tests/trial-radar.test.ts` and the integration test's install/run flow) and the radar's README and QA.

Never change a released version: bump `version` in `radar.json`. Kit changes rebuild every radar, so released radars must keep their output byte-identical (the `--check` run fails otherwise): put kit changes behind a new radar version.
