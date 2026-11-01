# UI rationale — contact book, not another dashboard

- **Network overview:** deep indigo visual table of people around a professional network hub, source-backed profile counts, time-bounded outreach summary and action queue. It is not a geolocation map or inferred affiliation network. Every visible node is interactive and opens its underlying person record.
- **Investigator directory:** two-pane contact book. Investigator index + profile 360, dated institutional affiliations, verified study experience and recent engagement source. A full register below retains familiar reviewed drawer editing and native column rearrangement.
- **Institution network:** institution index with selected organization dossier and person relationships; historical affiliations survive changes in university titles.
- **Engagement history:** chronological timeline rather than a generic table. Each activity shows date, channel, owner, recorded outcome and manual record actions.
- **Interaction entry:** full focused form with inline follow-up assignment, no extra app-local authentication or scheduler panel.
- **Investigator research:** dark editorial research brief and evidence triage queue for public sources, with review dates/quality controls.

Colors: warm stone `#f8f7f6`, deep indigo `#252039`, restrained plum `#79549b`, lilac `#f0e5ed`, sage `#e7ede8`; no unsupported external fonts, image files or icons. Full app name in the rail without an icon and one page title + one subline, per user preference. Mobile nav uses short labels only to prevent truncation, retaining the full sidebar app name.

Component/access rationale: all records in the custom frontend-js app use the host's app-level permission boundary; making a field invisible changes presentation only. Each select/input/textarea gets `name`, `data-action`, and `data-ui-state`, preserving transient drafts. Scrollable tables are labeled regions and source coverage is disclosed. Buttons have real navigation, forms or reviewed-proposal handlers.
