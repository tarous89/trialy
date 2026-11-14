# Lab Inventory — final app scope (BT2-09)

*Know what you have and where, never run out or let things expire, and make requests and approvals fast.*

**Status:** Final scope for build, approved 14 November 2026. Part of [Biotech apps v2](../BIOTECH_v2.md) (rank 9). It **replaces** `life.inventory-management` 1.0.2 as **2.0.0**, display name **Lab Inventory**. No existing users, so no data migration.

**Depends on:** nothing new in the platform. It uses TrialAgents Automations (email to workspace members, an optional research worker on the user's Claude or ChatGPT runner). **One PR.**

**Governing contracts:** project context, template authoring and usage guidance (latest, all `nextOffset`s), shared build contract, interface rules, access control, write authorization, field capabilities, shared data, [modular apps and shared data](../../MODULAR_APPS_AND_SHARED_DATA.md), automations guidance, and the contract registry. They win on any conflict.

**Decisions (14 Nov 2026):**
- **Track orders only.** People order on the supplier's site or by their usual route and log the order number. There is no marketplace, punch-out or purchase-order sending.
- **Approvals.** One approver (the lab manager) by default, with an optional amount threshold for a second approver (e.g. CEO above €2,000) and an optional approver per program.
- **Simple usage tracking.** Three ways to record use, none of them required:
  - "Used one" / "Used up" on the item, in the app or after a QR scan
  - telling the assistant ("we used 3 boxes of tips")
  - an optional quick count that corrects the quantity

  No mandatory stock-takes.
- **All lab materials.** Reagents, consumables and non-human research materials share one item list. A few standard categories are included and users add their own.
- **AI-native.** Claude or ChatGPT does the data entry (receiving from order confirmations or label photos, requests from chat, reorder suggestions); every write is a reviewed proposal.

---

## 1. The journey

| # | Stage | What the app does |
|---|---|---|
| 1 | **Need** | Anyone requests an item (in the app, by QR scan, or by telling the assistant); the app warns if it is already in stock |
| 2 | **Approve** | Lab manager approves; a second approver above the threshold; the requester sees the status |
| 3 | **Order** | Whoever orders logs supplier, order number, price and expected date |
| 4 | **Receive** | Mark received, or paste the confirmation or photo the label; lots are created with expiry and location |
| 5 | **Use** | "Used one" or "Used up", or tell the assistant; the quantity goes down |
| 6 | **Alert** | Low stock, expiring soon, expired, approvals waiting |
| 7 | **Reorder** | A weekly suggested reorder list from usage and reorder points |
| 8 | **Report** | Spend by program, supplier and month; expiry waste; stock value |

---

## 2. Evidence and references

Sources read 14 November 2026: Quartzy (Capterra 4.6 from 270 reviews, G2, GetApp), comparisons of Quartzy, Labguru, SciNote, LabArchives and Benchling, and lab-manager guidance on spreadsheets, approvals and expiry (ProcureDesk, Scispot, Merck survey, Corning, Lab Manager). Validate with design partners.

| Need | Signal | Confidence |
|---|---|---|
| Fast requests and reorders | Quartzy users praise 30-second order forms and searching past orders | High |
| Approval speed and status | Users value knowing order status and faster approvals; email approvals break down as labs grow | High |
| Avoid duplicates and stock-outs | Duplicate purchases because labs don't know what they have; stock checks before requesting | High |
| Expiry | Expired over-purchased reagents; expiry is the hard part with spreadsheets | High |
| A tool, not a shop | Users want Quartzy as a tool rather than an ordering site; shop search is noisy | Medium–high |
| QR on shelves | Request new stock as an item runs low | Medium |

| Reference | Role |
|---|---|
| **Quartzy** (primary) | Requests, approvals, order tracking, inventory, reorder |
| **Labguru / Benchling** | Storage locations and research materials (not full sample tracking) |

---

## 3. Scope

**In:**
- item catalog with standard and custom categories
- stock lots with expiry, quantity and location
- locations (room → storage unit → shelf or box)
- requests with stock check
- one- or two-step approvals with an amount threshold and per-program approvers
- order tracking
- receiving (manual or from a pasted confirmation or label photo via the assistant)
- simple usage tracking
- reorder points and suggestions
- alerts and digest email
- QR labels and a mobile item page
- spend, waste and stock value reports

**Out (v1):**
- supplier marketplace, punch-out and sending purchase orders
- purchasing or accounting integrations
- GMP, GLP or Part 11 inventory controls
- human biospecimens
- full sample tracking (lineage, aliquots, freezer-box maps per tube)
- equipment maintenance and booking
- hazard or safety compliance registers

**Small features that delight:**
1. **"We already have it":** a new request shows "2 bottles in Freezer B, expiring March" before submitting.
2. **Receive by photo:** snap the label or paste the confirmation email; lot, expiry and quantity are filled in for review.
3. **QR on the shelf:** scan, tap "Used up", tap "Request more". Done in 5 seconds on a phone.
4. **Monday reorder list:** "6 items below reorder point, 3 expiring in 30 days, 2 approvals waiting".
5. **Use oldest first:** when you record use, the lot expiring first is suggested.

---

## 4. Screens (6)

Custom `frontend-js` app on the Vivid kit, theme **ocean** (operations), declared in `templateLayoutSchema`. Four capabilities per screen; item, lot, request and order details open in the side panel. The **mobile item page** (from QR) is a compact view of the item panel.

| # | Screen (id) | Capabilities |
|---|---|---|
| 1 | **Overview** (`overview`) | (1) Alerts: low stock, expiring in 30 days, expired, approvals waiting, orders late. (2) Suggested reorders. (3) My requests and their status. (4) Spend this month by program. |
| 2 | **Inventory** (`inventory`) | (1) Items by category, location, supplier, program, with search. (2) Item panel: lots with quantity, expiry, location and owner; usage history; reorder point; past orders and prices. (3) "Used one", "Used up", quick count, move location. (4) Add items (manually or via the assistant); print QR labels for items, shelves and boxes. |
| 3 | **Requests** (`requests`) | (1) New request: item (or free text for a new item), quantity, program, urgency, note; stock check shown. (2) Queue for approvers, with amount and second-approver flags. (3) Approve, reject (with reason) or ask a question. (4) Status for everyone: requested → approved → ordered → received. |
| 4 | **Orders** (`orders`) | (1) Approved requests to order, grouped by supplier. (2) Log the order: supplier, order number, price, expected date. (3) Receive (full or partial), creating lots with expiry and location. (4) Late orders. |
| 5 | **Locations** (`locations`) | (1) Tree: room → storage unit (freezer, fridge, cabinet) → shelf or box. (2) Contents per location. (3) QR label per location. (4) Archive empty locations. |
| 6 | **Reports & settings** (`settings`) | (1) Reports: spend by program, supplier and month; expiry waste; stock value; CSV export. (2) Categories (standard and custom) and units. (3) Approvals: approver, threshold and second approver, per-program approvers. (4) Alerts: expiry window (30 days), digest cadence (weekly default, day and time), recipients, digest text. |

---

## 5. Workflows

1. **Request:**
   - Anyone creates a request (app, QR page, or the assistant from chat). The app shows existing stock and open requests for the same item.
   - The request goes to the approver. When the estimated amount exceeds the threshold, the second approver is required.
2. **Approve:** approve, reject with a reason, or ask a question (comment). The requester is notified in the app; email is optional per user.
3. **Order:** the person ordering logs supplier, order number, price and expected date. Several requests can be grouped in one order.
4. **Receive:**
   - Mark received (full or partial), then enter lot, expiry, quantity and location.
   - Or paste the confirmation or upload a label photo: the assistant proposes these fields for review.
   - New items are added to the catalog with category, supplier and catalog number.
5. **Use:**
   - "Used one" decreases by one unit and "Used up" sets the lot to zero; the earliest-expiring lot is suggested.
   - Telling the assistant creates the same changes as a proposal.
   - A quick count sets the real quantity and logs the difference.
6. **Expiry:** lots expiring within the window appear in alerts. Expired lots are flagged and can be marked discarded (counted as waste).
7. **Reorder:** each week the app lists items at or below their reorder point, with a suggested quantity (usual order size, or average use over the lead time). One click turns a suggestion into a request.

---

## 6. Data model

Principles as in [Runway §5](RUNWAY.md#5-data-model). App tables use the `labinventory.*` prefix.

**Shared roles**

| Role | Contract | Mode | Use |
|---|---|---|---|
| `organizations` | core.v1 | read/write | Suppliers (`org_type` other or partner) |
| `programs` | core.v1 | optional, read | Spend and requests by program |
| `agreements` | core.v1 | optional, read | Supplier agreements and price terms (Contracts) |

**Own tables (`labinventory.*`)**

| Table | Key fields (kind) |
|---|---|
| `labinventory.settings` (one row) | approver (text*), second_approver (text), threshold_amount (number), currency (select, EUR), program_approvers (text, JSON), expiry_window_days (number, 30), digest_cadence (select: daily / weekly / monthly, weekly), digest_day (select, mon), digest_time (text, "08:00"), digest_recipients (text), digest_text (text) |
| `labinventory.categories` | name (text*), standard (boolean), archived (boolean). Standard: Reagent, Consumable, Antibody, Cell line, Plasmid, Chemical; users add their own |
| `labinventory.locations` | name (text*), parent_id (text), kind (select*: room / freezer / fridge / cabinet / shelf / box / other), temperature (text), archived (boolean) |
| `labinventory.items` | name (text*), category_id (text*), supplier_id (text), catalog_number (text), unit (text*, e.g. bottle, box, vial), unit_size (text), last_price (number), currency (text), reorder_point (number), reorder_quantity (number), lead_time_days (number), default_location_id (text), program_id (text), owner (text), notes (text), archived (boolean) |
| `labinventory.lots` | item_id (text*), lot_number (text), quantity (number*), received_on (date), expires_on (date), location_id (text*), owner (text), status (select*: in_stock / used_up / expired / discarded), order_id (text) |
| `labinventory.movements` | lot_id (text*), kind (select*: received / used / count / moved / discarded), quantity_change (number*), occurred_on (date*), by (text), via (select: app / qr / assistant), note (text) |
| `labinventory.requests` | item_id (text), new_item_name (text), quantity (number*), program_id (text), urgency (select: normal / urgent), estimated_amount (number), requested_by (text*), requested_on (date*), status (select*: requested / approved / rejected / ordered / received / cancelled), approved_1_by (text), approved_2_by (text), decision_on (date), reject_reason (text), order_id (text), note (text) |
| `labinventory.orders` | supplier_id (text*), order_number (text), ordered_by (text*), ordered_on (date*), expected_on (date), amount (number), currency (text), status (select*: ordered / partially_received / received / cancelled), request_ids (text), notes (text) |

`*` = required. Lot quantity changes always write a movement. Receiving creates lots, and items for new ones.

**From 1.0.2:**
- items, lots, movements, locations and purchase requests map directly
- usage forecasts become reorder suggestions, which are calculated and not stored

---

## 7. Calculation rules

- **Stock per item** = sum of `in_stock` lot quantities. **Low stock** when stock ≤ `reorder_point`.
- **Suggested reorder quantity** = `reorder_quantity` if set, otherwise average use per day (last 90 days of `used` movements) × (`lead_time_days` + 14), rounded up to whole units. No suggestion when there is no usage history and no reorder quantity.
- **Expiring:** `expires_on` within `expiry_window_days`. **Expired:** past `expires_on` and still in stock.
- **Waste** = discarded or expired quantity × last price, per month.
- **Approval:**
  - Second approval is required when `estimated_amount` > `threshold_amount`.
  - A per-program approver replaces the default approver for that program.
  - The requester cannot approve their own request.
- **Spend** = order amounts by ordered month, supplier and program (split by request program when an order groups several).
- **Stock value** = in-stock quantity × last price.

---

## 8. Access control and AI

- **App-level access as usual.** Everyone with access can request and record use. Approvers are named in settings. Settings changes are for the app owner and admins.
- **Claude and ChatGPT** (each user's connection) can:
  - propose items, lots, requests, use and receipts from chat, pasted confirmations or label photos
  - suggest reorders
  - summarise spend

  All their writes are reviewed proposals. They never approve, and never contact suppliers.

---

## 9. Automations

1. **Weekly digest** (email to chosen members; cadence daily, weekly or monthly, weekly default, Monday 08:00): low stock, suggested reorders, expiring and expired, approvals waiting, late orders. Concise, at most 3 lines per section; empty sections omitted.
2. **Approval request** (in-app, plus email to the approver if enabled): a new request is waiting.
3. **Status updates to requesters** (in-app; email optional per user): approved, rejected, ordered, received.

---

## 10. Connections to other apps (by role, any install order)

| App | How | What the user gets |
|---|---|---|
| **Programs (02)** | Shares `programs` | Requests and spend per program |
| **Runway (01)** | The assistant reads spend reports as a source for actuals and forecasts | Lab spend in cash planning |
| **Contracts (04)** | Shares `organizations` and `agreements` | Supplier terms next to orders |
| **CRO Selection (05)** | Shares `organizations` | One supplier record |

Lab Inventory never writes another app's own tables.

---

## 11. Assistant behaviour

- Turn what the user gives (chat, pasted confirmations, label photos, lists) into proposed items, lots, requests and movements. Check for existing stock and duplicates first.
- Suggest the earliest-expiring lot when recording use.
- Suggest reorders and quantities; summarise spend.
- Never approve, contact suppliers, or make safety or regulatory claims.
- **`whenToUse`:** a biotech lab's reagents, consumables and research materials: stock, locations, expiry, requests, approvals, order tracking, reorders, spend. **`whenNotToUse`:** sample tracking, GMP inventory, human biospecimens, equipment booking, purchasing systems.

---

## 12. Package checklist and acceptance criteria

**Package:**
- template source under `templates/source/inventory-management/` updated to 2.0.0, and immutable `templates/apps/life.inventory-management-2.0.0.json` (draft until approved), display name **Lab Inventory**
- roles as in §6
- standard categories and units
- digest default text
- QR label print layout (A4 and Letter label sheets)
- full `catalog.metadata.json`
- fictional `demo_data.json`: 40 items across categories, 60 lots, 12 locations, requests in every status, 8 orders
- `templateLayoutSchema` with six screen ids plus the mobile item page
- build `--check` and browser test

**Acceptance (beyond the shared contract):**
1. **Request with stock check:** a request for an item in stock shows the lots first. Below the threshold one approval is enough; above it the second approval is required. The requester cannot approve their own request.
2. **Order and receive:** two requests are grouped into one order. A partial receipt creates one lot; the rest stays open.
3. **Assistant receiving:** a pasted confirmation produces proposed lots (lot number, expiry, quantity, location) and a new catalog item, all reviewed.
4. **Usage:** "Used one" from the QR page on mobile reduces the earliest-expiring lot. "We used 3 boxes of tips" in chat creates the same movement as a proposal. A quick count logs the difference.
5. **Alerts and reorder:** low stock, expiring and expired lots appear. The suggested quantity follows §7, and one click creates a request.
6. **Digest** arrives on schedule in the concise format; empty sections are omitted.
7. **Custom category:** adding "Primers" makes it available in items and filters.
8. **Assistants** propose only; never approve.
9. **Modularity and archiving:** the modularity test (rule 9) and archive-first checks pass. Archiving the app pauses its automations.
10. **Layout:** desktop 1440, mobile 390 and the mobile item page.

**Open for design partners:** standard categories; default expiry window; whether approvers want email.
