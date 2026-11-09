> Historical snapshot of `resources/design-baseline.md`, archived 9 November 2026. Superseded by [current context](../../../../CONTEXT.md). Do not use as current product or implementation instructions. Relative Markdown links resolve to repository documents.

# TrialAgents design baseline

Use this baseline for general visual quality if optional design guidance is temporarily unavailable. It is not a template, runtime specification or authorization to skip validation. Current server contracts govern supported behavior; explicit user design choices take precedence over visual defaults.

- Preserve an existing app's appearance and unrelated behavior. Keep a selected template's styling unless a change was requested. Configure the template before replacing its source. Users may request custom apps and designs.
- Use one clear page title, readable typography, sufficient contrast, consistent spacing, restrained semantic colors and accessible labels/focus states. Ordinary text, links and multi-value fields are neutral; color conveys meaningful status.
- Keep Search, Filters and Add record usable on one primary row; use an Expand filters control on narrow screens. Use real pagination (20 by default), one vertical page scroller and contained table overflow. Search, sort and filter the full authorized dataset before pagination. Never present page-only results as complete.
- Preserve record details, multi-value editing, Duplicate/Delete where supported, and settings-based drag reordering. Label unsaved fictional examples and exclude them from records and totals. Verify empty, populated, error, mobile and desktop states.
- Apps use the existing TrialAgents account. Do not build a second login/account system. Optional TrialAgents branding uses the official icon linked to https://platform.trialagents.com; omit optional branding if the exact asset cannot be embedded. Preserve the host header and reserved bottom space.
- Database integrity, access checks, code isolation, exact reviewed writes and audit logs remain enforced by the backend. Unavailable schema, selected-template source, runtime contracts or required validation blocks the dependent preparation/save; a design fallback cannot bypass them. Preserve the saved app and resume the same draft after recovery.

## Saving controls

Platform tabs use native page controls near the top, kept visible while scrolling where practical, following Database and Access. Do not add floating Save footers to ordinary platform or app editing pages. The exception is first publication of a new preview: the host shows a dark floating footer with Save app and Discard app, in both the website and ChatGPT extension.

Apps own their save behavior. Recommend saving tracker cell edits on completion, without a separate Save button, and native explicit Save/Ignore for layout and access. These are template recommendations, not platform-enforced UI. Custom apps can choose an appropriate interaction. First-time app publication uses that trusted preview approval footer; later app revisions retain native review controls. Preserve exact backend proposals, confirmation or authorized grants, optimistic versions, permissions and audit logs; a failed save retains the draft and supports safe retry.
