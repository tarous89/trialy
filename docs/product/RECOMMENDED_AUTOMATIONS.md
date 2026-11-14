# Recommended automations at install — platform scope

**Status:** Scoped 14 November 2026, for build. Decisions come from the Landscape / Bio Radar discussion ([apps/BIO_RADAR.md](app-template-blueprints/apps/BIO_RADAR.md)) and apply to every template. Related rules: [Modular apps §7](MODULAR_APPS_AND_SHARED_DATA.md#install-dialog-data-access-and-automations) and [Apps, access and automations](APP_CONFIGURATION_AND_AUTOMATIONS.md#recommended-automations-at-install) (including the per-app table and "Two kinds of email").

**Not in this scope:**
- Changes to templates that are already deployed (adding declarations, removing app-side automation creation) are a separate retro scope.
- User-triggered sends to people outside the workspace (external exchange) are out of scope.

---

## 1. Decisions

1. **Automations belong to the platform.** An app never owns, creates or runs automations itself. Its automations are normal TrialAgents Automations **linked to the app**: listed, edited, paused and deleted in Automations, and managed by the owner.
2. **Templates recommend; the install dialog offers.** A template declares *recommended automations* in its catalog. The install dialog shows them as a third section, **Automations**, under data and access, so one confirmation sets up tables, access and automations.
3. **Keep the two kinds of email apart.** User-triggered sends (an RFP, a data room share, an investor update) and their pre-approved follow-ups stay in the app and the external exchange. Automations send only to **workspace members**, on a schedule or trigger, under the existing email limits.
4. **Research briefs.** A research step uses a brief the app generates from its records (what to look for, since when, named sources in priority order with the web as default, rules, return format, and a source report). The automation prompt references the brief, so it never goes stale.
5. **The app works without its automations.** A declined, disabled or failing automation never breaks the app.

---

## 2. Declaration in the template catalog

New optional catalog field `recommendedAutomations` (array). It is validated at build (`--check`) and at catalog load, and documented in MCP and the catalog.

| Field | Meaning |
|---|---|
| `key` | Stable id, unique within the template (e.g. `weekly-digest`). Used to match and update later |
| `name`, `purpose` | Shown in the dialog (name ≤ 60 characters, purpose ≤ 120 characters) |
| `defaultOn` | Toggle default in the dialog |
| `trigger` | One of: **schedule** (daily / weekly / monthly, every N, weekday or day or business day of month, time, workspace time zone); **record** (role table, `created` or `field_changed` with field and optional target value); **record date** (role table, date field, offset in days, time; see E2); **after** (runs after another recommendation of the same template completes, e.g. an alert after a scan) |
| `steps` | Ordered list of up to 2 steps: **research** (runner chosen at install; `brief`: name of the app's brief function; `writes`: proposals only, or a narrow grant listing tables and fields), **platform action** (an existing typed action), **email** (see below) |
| `email` | `subject` and `body` template with named variables; `content`: `static`, `summary` (filled by a read-only app summary function, see E1) or `research` (filled from the research step's output); `condition` (e.g. send only if there's something to report); `recipients`: `owner`, `chosen_members`, or `record_member` (a member field on the record, e.g. approver or follow-up owner) |
| `editableAtInstall` | Which settings the dialog row lets the owner change: cadence, day, time, recipients |

**Validation:**
- Keys are unique.
- Triggers reference roles the template declares.
- Briefs and summary functions exist in the app, and summary functions are read-only.
- Recipients are workspace members only (no external addresses).
- Email triggers follow the email rules: no sub-daily intervals and no "any update" triggers.
- At most 10 recommendations per template (raised from 6 on 14 Nov 2026).

---

## 3. Install dialog

A third section in the existing dialog (Modular apps §7), in the same style as the platform's confirm dialogs.

- **Heading "Automations"** and one line: "*App* recommends these. You can change them any time in Automations."
- **One row per recommendation:**
  - name, purpose, and a readable trigger ("Weekly, Monday 07:00", "When a request is created", "7 days before access ends")
  - a toggle, defaulting to `defaultOn`
  - **Edit** opens the normal automation editor, prefilled; saving returns to the dialog
- **Runner** (shown only when a row has a research step): **Claude** or **ChatGPT**, whichever the owner has connected, with the first connected preselected. If neither is connected, the note is "Research automations will be created switched off. Connect Claude or ChatGPT to activate."
- **Recipients** (shown only when a row has email): workspace members, owner by default. `record_member` rows show "the [approver / follow-up owner] on each record".
- **Add app** creates the app, tables, access choices and the selected automations in **one transaction**, through normal automation validation. The dialog is the review: it shows exactly what will run, when, on which runner, which records it may propose or write, and who gets email.
- **Cancel** installs nothing.
- **Who sees it:**
  - only the signed-in **owner** sees and confirms this section
  - for any other installer the section is hidden, and the owner gets a notice: "3 recommended automations for *App* are waiting"
  - assistants may prefill the section (`prepare_data_access`) but never confirm it
- The dialog appears **only at install**, the same on the web and in the Claude and ChatGPT plugins. Saves, copies and restores show no dialog.

---

## 4. After install

- **Linked automations.** Each created automation stores `source = {templateId, templateVersion, recommendationKey}` and the app id. Automations shows them under the app with a small "Recommended by *App*" label.
- **"Recommended, not set up" panel.** In Automations, filtered by app, recommendations that were turned off or are waiting for the owner are listed with **Set up**, which opens the editor prefilled. This is also where future template versions will offer new or changed recommendations (retro scope).
- **Runner connected later.** Automations created switched off because no runner was connected stay off. The owner gets a notice offering to switch them on; they are never switched on automatically.
- **Editing.** Once created, an automation is the owner's: edits follow normal Automations rules (versioning, review, history). A later template version never silently overwrites it.

---

## 5. Lifecycle

| Event | Effect |
|---|---|
| Archive the app | Linked automations are paused (state remembered) |
| Restore the app | The owner is offered to resume the automations that were on before archiving |
| Delete the app (from archive) | Linked automations are archived, never deleted silently; app data rules unchanged |
| Reinstall the app | The dialog shows the recommendations again, except those whose `source.recommendationKey` already has an active or paused automation for this workspace and template; those show "Already set up" |
| Copy the app | Follows existing rules: copied automation drafts stay disabled until reviewed |
| Delete an automation | Never touches app data; the recommendation reappears in the "Recommended, not set up" panel |
| Disconnect a runner | Existing rule: research stops; dependent email steps respect the chain |

---

## 6. Small platform additions needed

| # | Addition | Why |
|---|---|---|
| **E1** | **Summary-content email step.** An email step can fill its template from a read-only **app summary function**: a deterministic query returning the digest values, such as low stock, due follow-ups or open requests. It runs under the owner's access at send time and doesn't count as research. Empty results with `condition: nonEmpty` send nothing | Digests such as Lab Inventory, Contracts, Fundraise and room digests need computed content without an assistant run |
| **E2** | **Record-date trigger for email.** A daily check sends an email for records whose date field equals today plus an offset (e.g. follow-up due today, access ends in 7 days, notice deadline in 30 days). It's grouped per recipient into one email, within the email limits | Reminders tied to dates in records |
| **E3** | **`after` trigger across a template's recommendations.** An email can run after a research recommendation completes, with a condition on its output (e.g. only high-impact events) | Bio Radar high-impact alert; Partnerships digest after research |

All three keep existing guarantees: email limits, re-checking current state and access before sending, workspace members only, and no sub-daily email.

---

## 7. MCP and plugin

- `read_app_template`: returns `recommendedAutomations`.
- `prepare_data_access`: accepts proposed toggles, runner and recipients per recommendation (prefill only).
- `list_app_automations`: shows `source` and the "recommended, not set up" items.
- Assistants can explain and prefill, but cannot confirm the install dialog or enable automations.
- Template guidance gets a version bump describing how to declare recommendations, briefs and summary functions.

---

## 8. Acceptance criteria

1. **Defaults:** installing a template with 3 recommendations as the owner shows all 3 with their defaults. Add app creates the app and the selected automations in one transaction; Automations lists them linked to the app with "Recommended by *App*".
2. **Changes in the dialog:** turning one off, changing a weekly digest to Thursday 09:00 and adding a recipient are stored exactly. The turned-off one appears under "Recommended, not set up".
3. **No runner:** research recommendations are created switched off with the "connect to activate" note. Connecting a runner later offers to switch them on and never does it automatically.
4. **Non-owner installer:** the section is hidden, the owner gets the notice, and **Set up** works from the panel.
5. **Lifecycle:** archive pauses the automations, restore offers to resume them, and reinstall shows "Already set up" for existing ones and creates no duplicates.
6. **Email rules:** E1 sends nothing when the summary is empty with `nonEmpty`. E2 groups same-day reminders into one email per recipient. E3 alerts only when the research output meets the condition. All respect the per-recipient hourly and per-account daily limits.
7. **Separation:** no automation can send to an address outside the workspace, and external-exchange sends never appear in Automations.
8. **Validation:** a declaration with an unknown role, a missing brief or summary function, an external recipient or a sub-daily email fails build and catalog load with a clear error.
9. **Assistants:** they can prefill but not confirm or enable.
10. **App independence:** an app installed with all recommendations off works fully.
11. **Layout:** the dialog at desktop 1440 and mobile 390, on the web and in the plugin.
