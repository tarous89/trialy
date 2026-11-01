# Optional automation recipes

## mode

optional

## whenUseful

After explicitly approved project reviews, propose a weekly or monthly nonclinical evidence summary, or a separately approved internal notification of verified Reviewed status. Default is no automation.

## readRequirements

Only after app save and user authorization: read_automation_setup, list_app_automations, read_app_automation_guide. If shared runner is connected and approved, prepare one app-linked ChatGPT monitor; suggested weekly Europe/Berlin Monday 09:00 only when owner requests cadence. Stable authoringKey life.experiment-notebook.weekly-science-review.v1. Read only currently authorized project/experiment/protocol/observation/measurement/interpretation records; no patient identifiers, lab file secrets, instrument API or unreviewed source outside scope. Match selected project IDs and allow only approved own-project review proposals. No automatic duplicate experiment creation. Use a current cutoff/last reviewed record identifier and coverage/dedupe keys; no_update if no eligible new source-backed findings where user approved quiet completion. Respect explicit authorization expiry; expired or revoked grants stop writes. Inherit current app access, never grant it. Bound each run to one project and at most 700 records per role, checkpoint only verified complete coverage. Keep disabled definitions disabled on edit; inspect outcomes in platform Logs. No host subscription means setup pending, not activated.

## outputContract

Produce source-linked nonclinical scientific memo draft with cutoff, used experiment IDs, exact versioned protocols, value/unit/replicate counts, stated controls, descriptive statistics, missing data, uncertainties and limitations. No inferential statistics or invented results. Proposed report is Draft and must undergo trusted human review before status Reviewed. Optional separate TrialAgents email action only on transition into Reviewed for an authorized report; owner and explicitly selected existing TrialAgents team members, never external correspondents or data-field addresses. Use stable authoringKey life.experiment-notebook.internal-reviewed-memo-email.v1. Backend deduplicates and rechecks current grant; suppress on cancelled/archived/superseded/partial/failure. ChatGPT does not send; no independent email schedule if linked to processing. Log failure without blocking notebook and do not rerun successful research because email failed. Email subject: Research summary reviewed. Fixed body: A reviewed research summary is available in TrialAgents. Open https://platform.trialagents.com to inspect authorized details. Do not invent interpolation tokens. Use the current typed database field-transition email action from read_app_automation_guide, not a digest/report mode. Platform applies coalescing, current-state checks, recipient limits and cancellation; never bypass them.

## promptExample

For the authorized project and approved coverage window, read complete experiments, exact protocols, observations, measurements and interpretations. Deduplicate by project ID, coverage window and source record IDs/versions. Propose one Draft report with cutoff, source experiment codes, factual findings, units, replicate counts and limitations. Never set Reviewed automatically. Do not advance coverage on partial/denied/failed reads. With complete coverage only, return no_update when no eligible evidence changed and the owner approved silence. Without approved ongoing write scope return a reviewable draft only. No automation is the default; manual entry and manual ChatGPT drafting remain available.

Manual path: create a project, method and experiment; record evidence; manually draft and review findings/reports. No automation or email setup is required.
