# Lab Inventory 2.0.0 (`life.inventory-management`)

*Know what you have and where, never run out or let things expire, and make requests and approvals fast.*

Built from the final scope [LAB_INVENTORY.md](../../../docs/product/app-template-blueprints/apps/LAB_INVENTORY.md) (BT2-09, approved 14 Nov 2026). It replaces Inventory Management 1.0.2 as the next major version of the same catalog ID. 1.0.2 is archived unchanged under [`archive/1.0.2/`](archive/1.0.2/) and keeps its catalog file; saved 1.0.2 apps are not migrated (there are no existing users).

**Catalog status:** draft. `templates/catalog-seed.json` still names 1.0.2; 1.0.2 is listed in `templates/catalog-retirements.json` for withdrawal when the owner approves 2.0.0.

## Package

| File | What it is |
|---|---|
| `lab-inventory.source.js` | Canonical readable `frontend-js` source. Line 1 declares `templateLayoutSchema` (six screens plus the item page, column groups `items` and `requests`). |
| `lab-inventory.css` | Vivid kit, theme ocean (`#175B94`), rail `#182C35`, print rules for label sheets. |
| `schema.example.json` | Installer schema: roles, contracts, field kinds, required fields and logical-to-real mapping. |
| `catalog.metadata.json` | Catalog entry without source: instructions, documentation, automation recipes. |
| `demo_data.json` | Fictional demo set as of 14 Nov 2026: 40 items across 7 categories, 60 lots, 12 locations, 18 requests in every status, 8 orders, movements. |
| `lab-inventory.preview.html` | Offline fictional preview generated from the same source and CSS. |
| `AUTOMATION_RECIPES.md`, `QA.md` | Optional automations; what was tested and what was not. |

Build: `node scripts/build-lab-inventory-template.mjs` writes `templates/apps/life.inventory-management-2.0.0.json` and the preview; `--check` (part of `npm run build`) fails when either is stale. The catalog carries the source with whitespace and redundant syntax removed (identifiers unchanged) to stay under the 180,000-character limit.

## Screens

Overview · Inventory · Requests · Orders · Locations · Reports & settings, plus the **mobile item page** (`item`), opened from a QR label (route `/item?recordId=…`) or from an item. Item, lot, request and order details open in the side panel.

## Data (roles)

| Role | Contract | Mode |
|---|---|---|
| `organizations` | core.v1 | required, read/write (suppliers, `org_type` other or partner) |
| `programs` | core.v1 | optional, read only (never created) |
| `agreements` | core.v1 | optional, read only, core fields (never created) |
| `labinventory.settings`, `.categories`, `.locations`, `.items`, `.lots`, `.movements`, `.requests`, `.orders` | labinventory.v1 | app tables |

Fields as in scope §6. Two small additions: `labinventory.requests.item_name` (the item's name at request time, for lists and notification emails) and `labinventory.settings.units` / `app_link` (the units list and the app address used to build QR codes; the app runtime does not know its own URL).

## Rules worth knowing

- **Every lot quantity change writes a movement** in the same review (Used one, Used up, count, discard; a move writes a 0 movement). A lot created by receiving or "Add lot" gets its *received* movement in the next review, because the platform gives a record its ID only when it is created. The app shows "N lots received without a movement yet" with a one-click review until they are recorded.
- **Approvals**: the program approver (if set) or the approver; above `threshold_amount` the second approver. The requester never approves: the next available approver is used. A request marked approved without valid approvals is flagged and cannot be ordered. People are identified by the name entered under "You"; the TrialAgents review log records who confirmed each change. Database column rules can deny Claude and ChatGPT writes to `approved_1_by`, `approved_2_by`, `decision_on` and `reject_reason`.
- **Orders are tracked only.** Nothing is sent to suppliers; there is no marketplace, punch-out or purchase-order sending.
- **QR labels**: A4 (21 labels, 63.5 × 38.1 mm) and Letter (10 labels, 4 × 2 in), printed with the browser's Print. The QR encoder (byte mode, ECC L, versions 1–15) is in the source; QR codes need the app link in Settings.
- **CSV**: reports show their CSV in a read-only text box to copy (custom apps cannot start a download).
