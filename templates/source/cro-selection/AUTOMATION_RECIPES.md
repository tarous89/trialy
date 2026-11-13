# CRO Selection 2.0.0: optional automations

The app works fully without automations, never reads automation status, and never waits for one. Manage automations in TrialAgents → Automations.

1. **Deadline reminders.** In Vendors → Email, choose *Reminder* and a send date. The send review pre-approves the batch, and the platform sends it at 08:00 UTC on that date with exactly that text. Only suppliers whose link is still open receive it. Without a pre-approval, prepare the reminder in the same form when needed and confirm the send.
2. **Request digest (email to the owner).** A TrialAgents email action with a daily calendar schedule at 08:00 in the owner's timezone, linked to CRO Selection. It goes to the owner, plus only explicitly approved registered members with app access. Fixed text: "CRO Selection: check Overview → Waiting on us and Decisions due". Disable it when no request is open. Limits: one app email per recipient per hour, and 15 recipient deliveries per account per day.
3. **Proposal mapping (research on the user's Claude or ChatGPT runner).** Trigger: a database change on croselection.proposals where `document_ids` becomes non-empty. It reads only accepted, AI-readable proposal documents, and proposes croselection.proposal_lines for review. Lines use the cost categories of the request's bid grid, in the proposal currency, with deviation text. Dedup key: proposal_id + category + description. With nothing new it produces no update. It never accepts, sends, publishes or decides. Files that are not AI-readable are reported, not read.

**No automation:** ask your assistant in chat to map an accepted file, or enter the lines in Proposals → Lines. Send reminders from Vendors → Email.
