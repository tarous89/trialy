# Benchmark and design evidence

**Chosen professional SaaS benchmark:** [eLabFTW](https://www.elabftw.net/) (free/open-source electronic laboratory notebook; not copied or integrated). Design reference read on 1 November 2026.

- [eLabFTW official website](https://www.elabftw.net/) describes experiment and protocol entry, search, experiment templates, attachment references and team collaboration.
- [eLabFTW official experiment documentation](https://doc.elabftw.net/docs/usage/user-guide/experiments/) describes experiment lists, edit/view modes, unique experiment IDs, links to resources, source attachments, duplicate records and archive behavior.
- [eLabFTW experiment templates](https://doc.elabftw.net/docs/usage/user-guide/templates/) describes standardized experiment structure.

**Specific pattern adopted:** searchable experiment directory; structured bench entry; exact method version references; observable source links; duplicate-as-draft and archive; internal saved research summaries. **Distinctive original UI:** side rail with 6 bounded screens, evergreen dashboard, editorial paper notebook, method-history inspector, source-click assay strip chart and reviewed report archive. No benchmark screenshot, code, copied demo content or logo is included. eLabFTW's own login, GxP/time stamping and file attachment systems are **intentionally excluded**, as TrialAgents supplies identity and the requested notebook is an internal nonclinical coordination aid.

**Architecture standard:** `tarous89/trialy` repository `templates/TEMPLATE_AUTHORING.md` and `templates/TEMPLATE_USAGE.md` **v1.3.9**, plus `docs/product/app-template-blueprints/RESEARCH_TEAMS.md` RS-01 and the universal design/build contract. All app-level accounts, arbitrary external sends, clinical person data and independently running ChatGPT source services are out of scope.
