# Programs 2.2.0: automations

The platform owns these automations ([app automations](../../../docs/product/RECOMMENDED_AUTOMATIONS.md)). They are declared in `catalog.metadata.json`.

- **At Add app:** the six install recommendations are listed, all on by default; the owner can turn any off. Add app approves them once, including the digest's create-only permission on `programs.digests`, and they are enabled after the app is saved.
- **Later changes:** schedule, recipients and on/off are changed in TrialAgents → Automations, or through Claude or ChatGPT with the exact reviewed setup. The app stores none of them and never waits for them.
- **If an automation can't run:** a missing runner leaves the AI digest at Needs setup; the notices do not need a runner.

| Key | Name | Trigger | What it does |
| --- | --- | --- | --- |
| `weekly_digest` | Weekly digest | Calendar, Mondays 08:00 Europe/Berlin | Research on the user's Claude or ChatGPT runner reads the `digest_brief` helper: each program's status and what needs attention, by the app's own rules. If `digest.count` is 0, it saves nothing and completes as `no_update`, so no email is sent. Otherwise it creates one `programs.digests` row (create only: run_on, period, summary, attention_count, run_id, written_by), then the email step sends the summary to the owner (`when: meaningful`). |
| `team_added` | Added to a program team | Record date `programs.team.added_on`, 08:00 | Email to the team row's `member_id`. |
| `item_assigned` | Assigned a milestone or activity | Record date `programs.plan_items.assigned_on` | Email to `owner_member_id` with the name, end date and status. |
| `item_due` | Milestone or activity due soon | Record date `programs.plan_items.remind_on` | Email to `owner_member_id`; `remind_on` is the end date minus Settings → reminder lead time, only while planned, in progress or at risk. |
| `raid_assigned` | Assigned a risk or issue | Record date `programs.raid.assigned_on` | Email to `owner_member_id`. |
| `raid_review` | Risk or issue review due | Record date `programs.raid.remind_on` | Email to `owner_member_id` on the next review date while the entry is not closed. |

**Dates the app keeps.**
- **Notice dates.** The app sets them on every save and command. They are empty for done, cancelled, closed and archived work, which is how notices stay quiet without recipe conditions.
- **Missing member ID.** A record with no member ID gets no notice date, so nothing is sent to the owner in its place.
- **Catching up.** Notices catch up for up to seven days.
- **After a change.** After a team or lead-time change, use Settings → Update owners and reminders (`reminders.refresh`).

**Weekly digest without AI (Automations → From app features).** `weekly_digest_plain` sends the same content as a plain email, using the `digest_email` helper. Quiet weeks send nothing. It is not offered at install, so nobody gets two digests.

**Removed from 2.1.0 (owner decision P1).** The monthly update reminder and the key-milestone slip notice are now part of the weekly digest. The monthly status draft is a chat request instead: "Draft this month's updates", which runs through app commands and the normal review.

**Archive and no automation.**
- Archiving the app pauses every automation. Restoring brings them back switched off.
- With no automations, Overview shows exceptions and the next N days whenever the app is opened.
