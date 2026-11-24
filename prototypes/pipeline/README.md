# Pipeline prototype

Pipeline is a standalone portfolio planner for a biotech team. It connects programs, milestones, activities and decisions with their deliverables, risks and changes. Download [Pipeline.html](Pipeline.html) and open it in a browser with JavaScript enabled. The file contains the sample portfolio, styling and application logic. No build or account is required.

## Source files

| File | Purpose |
| --- | --- |
| [Pipeline.html](Pipeline.html) | Complete, runnable 23 November 2026 snapshot, including the earlier design available from **Design review** in the header. |
| [src/pipeline.js](src/pipeline.js) | Exact active JavaScript extracted from the HTML, including sample data, views, validation, forecasts and persistence. |
| [src/pipeline.css](src/pipeline.css) | Exact active stylesheet extracted from the HTML, including drawer, chart and responsive filter styles. |

The standalone file uses its embedded copies. Edits to the separate source files require updating the corresponding embedded blocks to appear in the HTML. The original HTML is 875,405 bytes with SHA-256 `1fe80bbba964c4a571efb1e3b6c63eae2e319aab2ac72f66f6bedeec4d216db8`.

## Portfolio views

| View | Workflow |
| --- | --- |
| Overview | Compare programs by asset, disease, stage, next open milestone, time to deadline, spending, forecast budget, status and linked events. The next milestone is a plain bold name. Open the program to inspect its plan or use the pencil to edit it. Review upcoming decisions and the completion approval queue below. The programs-at-risk counter includes medium and high exposure. |
| Programs | Browse cards grouped by program and expand milestones. Rows show type, forecast deadline, budget, owner, status and event counts. Unassigned items have a separate group. |
| Timeline | Use the same program structure and forecast dates on a shared scale. Bars indicate durations, flags indicate milestones and diamonds indicate decisions. Unscheduled items are labeled. A single legend follows the cards. |
| Deliverables | Review received evidence, affected items, dates, responsible people, sign-off and file counts. Filter by responsible person or open a record. |
| Risks | Review severity, open or closed status and directly affected items. Open a risk to inspect or update its mitigation. |
| Changes | Review dated changes and their directly affected items. Edit a change to revise individual forecasts. |
| Digest | Switch between All, Weekly and Monthly, select a program, or open a report from the archive. Program selection narrows the sections displayed. Reports are prepared examples. Editing records does not generate a new digest. |
| Settings | Save currency, date format, milestone lookahead, deadline reminder lead time and individual email preferences. |

Programs and Timeline share filters when switching directly between them. Search covers names, owners, descriptions and program names. Other filters cover program, owner, record type, status, risk, forecast budget under or at least 50,000, and forecast deadline bounds. Ancestors remain visible when needed to give a matching child context. When controls exceed the first row, **More filters** opens a second row. **Reset** clears filters.

## Create and maintain plan records

1. Choose **Add record** and select a plan type. A **program** groups work and can carry asset, stage and disease. A **milestone** has a target date. An **activity** spans a date range. A **decision** is a dated point with an outcome.
2. Enter the name, description, owner, status and baseline dates. Set earliest and latest dates under timeline tolerance. Use Budget for approved budget, contingency and spend to date. Risk exposure is derived from risk records.
3. Under Linked items, search for a parent or child by name. Suggestions identify record type. A milestone can belong to a program. Activities and decisions can belong to programs or milestones. Selecting a child already assigned elsewhere moves it when saved.
4. Select a dependency on the same row. Both ends edit the same rule. A decision prerequisite also checks the selected outcome of Approved, Conditional or No-go. The editor rejects hierarchy and dependency cycles, incomplete links and invalid date ranges.
5. Add team members by name and select one or more organizations. Organizations are directory records with contact people. The selected organization's pencil opens its details. Removing its link from one record leaves the organization available to others.
6. Attach files, then save. Use the pencil to reopen the drawer. **Ignore changes** discards draft edits. **Duplicate** starts a separately savable draft. **Delete** requires confirmation and is blocked while another record names the item as a parent. Reassign or remove those links first. Deletion cleans up remaining references.

| Dependency choice | What it means for the parent |
| --- | --- |
| Optional | The child belongs to the parent without gating its status. |
| Required to start | The child must complete before the parent can move to In progress. An unresolved required dependency also prevents completion. |
| Required to complete | The parent can start while the child is open. Completing the parent requires the child to complete. |

## Log events and understand their effects

Create events from **Add record**, from a register or from the corresponding section of a plan drawer. Every event supports a name, affected plan items, date, responsible person, team members, organizations and files. Events created inside a new plan draft are staged until its first save. An event saved from an existing plan has its own save operation. Click an event count on a plan item to open its history.

**Deliverable.** Record the content, format and sign-off person. Link evidence directly to the item that should enter completion review. Ancestors display the history, while automatic review eligibility checks for a deliverable directly attached to the item.

**Risk.** Record the risk, mitigation, severity and open or closed status. An open risk flags directly affected items, downstream work connected through prerequisite chains, and the ancestors of each affected item. Multiple paths count the same risk once. The highest open severity determines exposure. Closing a risk removes its contribution without clearing other open risks. The register retains closed records.

**Change.** Describe the change and optional workstream. For each affected item, enter a revised date, budget or both. Forecasts start from baseline values and apply the dated changes in order. Later supplied values supersede earlier ones field by field. A milestone's revised deadline can coexist with an earlier budget revision. An ancestor can display the change in its history while keeping its own forecast.

## Review and approve completion

The available plan statuses are Planned, In progress, Pending, On hold, Completed and Cancelled. Pending represents a decision or an item whose only outstanding prerequisites are decisions. At load and after saving a record, an item with direct deliverable evidence is checked for decision blockers and start prerequisites. Decision-only blockers lead to Pending, another unresolved start prerequisite leads to Planned, and otherwise eligible work moves to In progress. Completed, Cancelled and On hold items are skipped.

1. Add a deliverable to the plan item and resolve its required dependencies.
2. In **Overview → Awaiting owner approval**, select **Review completion**. The queue shows the recorded owner for eligible In progress or Pending items. Everyone using that browser copy can see the queue.
3. In the drawer, review the evidence and decision outcome. Choose **Approve completion**, confirm and save. The record stores the owner name and approval timestamp. A saved eligible item can also be approved directly in its drawer once prerequisites are satisfied, before a deliverable places it in the queue.

The owner is a record field. The prototype has no signed-in identity check for the person pressing the approval button.

## Preferences and email

Currency options are EUR, USD, GBP, CHF, CAD, AUD and JPY. Changing currency preserves the numeric values and updates their display. Dates can use a short month name, DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD. Native date-entry controls follow the browser. Milestone lookahead defaults to 90 days and reminder lead time to seven days. The lookahead value is stored. The overview chooses the next open milestone without applying that window.

The six owner email switches default to on. **Save settings** retains explicit opt-outs. These are local preferences for intended notifications. The standalone file has no email delivery or scheduler.

| Preference | Intended trigger |
| --- | --- |
| Owner assignment | A person becomes the record owner. |
| Deadline reminder | Once per deadline at the selected lead time. |
| Completion review | A deliverable is present and prerequisites are satisfied. |
| Change recorded | A change is logged against an owned item. |
| Risk recorded | A risk is logged against an owned item. |
| Deliverable received | A deliverable is added to an owned item. |

## Persistence and verification

Browser edits persist in local storage for the current browser context. Records and organizations use `norththerapeutics-pipeline-v1`. Settings use the same key with a `-settings` suffix. The loader recognizes the older program-review key and migrates legacy statuses, team fields and organization names. Attachments use browser storage and can be downloaded or removed. A storage failure leaves edits available for the current session. Browser edits do not update GitHub or synchronize with another user.

For a walkthrough, use an isolated browser profile. Create a program, a milestone and an activity required to complete the milestone. Log a high risk on the activity and inspect the milestone and program flags. Close it and check the rollup again. Log a change revising the milestone budget and date, then compare the baseline with the new forecast in Programs and Timeline. Approve the activity, attach evidence directly to the milestone and review its completion from Overview. Finally, change a display preference and reload to check persistence.
