# CRO Selection 2.1.0: no automations

**Owner decision (15 November 2026):** CRO Selection declares no automations. There are no install recommendations, no app features in Automations → From app features, and nothing runs in the background. The app works fully on its own.

The 2.0.0 draft described three optional automations. In 2.1.0:

| 2.0.0 optional automation | 2.1.0 |
| --- | --- |
| Deadline reminders to suppliers | Not an automation. Reminders are a platform exchange feature: in Vendors → Email, choose *Reminder* and a send date, and the owner pre-approves the batch in the send review. The platform sends exactly that text at 08:00 UTC on that date to suppliers whose link is still open. External sends stay in the exchange ([app automations §1.5](../../../docs/product/RECOMMENDED_AUTOMATIONS.md)). |
| Request digest (daily email to the owner) | Dropped. Overview shows what is waiting on us and what is due; assistants read it with `overview.read`. |
| Proposal mapping (research on the user's runner) | Dropped. It only proposed lines for review, and research automations must now save their output in the app ([PR #169](../../../docs/product/RECOMMENDED_AUTOMATIONS.md)). Since the bid grid drives the award decision, mapping stays a person's request: ask your assistant in chat (it runs `lines.save` and you approve the review) or enter the lines in Proposals → Lines. |

Users may still create their own automations for this app in TrialAgents → Automations, or ask Claude or ChatGPT to set one up. Such an automation follows the platform rules and is the user's own, not part of the template.
