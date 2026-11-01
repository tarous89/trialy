# CO-03 Site Feasibility Management — v1.1.0 design rationale

**Primary reference:** Veeva Study Startup, sponsor workflow for feasibility survey responses, qualification, selection and activation. https://www.veeva.com/products/veeva-study-startup/

**Secondary reference:** Oracle Site Select, study-scoped site grids, state/bucket workflow, survey responses and selection review. https://docs.oracle.com/en/industries/life-sciences/site-select/25.1/cro-sponsor/site-grid.html

**Additional pattern:** Veeva 26R3 feasibility homepage release notes describe study-level filters and expand/collapse survey result sections. https://rn.veevavault.help/en/gr/whats-new-in-26r3/

This is a **new original UI**, not copied proprietary product assets, source code, or screenshots. Workflow precedents are not claims that any particular visual arrangement was A/B-tested.

## Changes from v1.0.0

1. Header uses persistent study selector, not a generic product banner; all six screens share the same selected-study context.
2. Overview is an action-first worklist of overdue questionnaire/decision/activation events. A five-step feasibility journey provides context and direct navigation. KPI counts are subordinate to work.
3. Study sites opens with a study-specific candidate register. Reusable institution and professional-investigator masters remain accessible as tabs; no duplicated organization records.
4. Questionnaire becomes a paginated site-by-site inbox with evidenced response counts and review states; raw answers and criteria remain editable in adjacent tabs.
5. Evidence comparison uses three site columns per view with sticky criteria on desktop and vertical site evidence cards on mobile, mandatory flags, source dates, explicit incomplete state and reachable next/previous pages. No automatic ranking of incomplete sites.
6. Selection defaults to a filtered, paginated decision worklist. The six cramped Kanban columns from v1.0.0 were removed.
7. Activation groups milestones by selected institution and retains the complete paginated underlying register.
8. Text, toolbar, menu, and mobile touch targets have been enlarged; primary navigation remains a single shared app shell.

## Behavioral safeguards unchanged

- No patient identifiers or recruitment-level predictions.
- Incomplete/denied reads withhold authoritative totals and readiness.
- Mandatory evidence and current approved assessments required before selecting sites.
- Original record versions used for reviewed edits and archives; no silent conflict overwrite.
- Existing TrialAgents account, backend permissions, host logo/watermark and app-linked automation management. No app-level authentication.
- Layout changes are presentation-only, persisted only through native host review. The standalone adapter illustrates interactions but is not the production host.

## 1.1.1 acceptance corrections

Readable secondary text and contrast now pass the production inspector. Mobile navigation occupies a dedicated row instead of overlapping page controls, and startup rows wrap at 320px. Field permissions and managed assessment values are visibly read only. Required clears retain the draft with an error. Study/country scopes apply before pagination; incomplete linked scopes and comparison counts are explicitly unavailable.

Run the repository commands in `QA.md`. The actual QuickJS, reviewed database, sanitized frame and native layout persistence are covered there. Live deployment and customer installation remain separate outcomes.
