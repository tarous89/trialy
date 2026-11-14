<!-- Generated from resources/design-baseline.md; run node scripts/sync-plugin-guidance.mjs. -->
# TrialAgents design baseline

Use this baseline for general visual quality if optional design guidance is temporarily unavailable. It is not a template, runtime specification or authorization to skip validation. Current server contracts govern supported behavior; explicit user design choices take precedence over visual defaults.

- Preserve an existing app's appearance and unrelated behavior. Keep a selected template's styling unless a change was requested. Configure the template before replacing its source. Users may request custom apps and designs.
- Use one clear page title, readable typography, sufficient contrast, consistent spacing, restrained semantic colors and accessible labels/focus states. Ordinary text, links and multi-value fields are neutral; color conveys meaningful status.
- Keep Search, Filters and Add record usable on one primary row; use an Expand filters control on narrow screens. Use real pagination (20 by default), one vertical page scroller and contained table overflow. Search, sort and filter the full authorized dataset before pagination. Never present page-only results as complete.
- Preserve record details, multi-value editing, Duplicate/Delete where supported, and settings-based drag reordering. Label unsaved fictional examples and exclude them from records and totals. Verify empty, populated, error, mobile and desktop states.
- Apps use the existing TrialAgents account. Do not build a second login/account system. Optional TrialAgents branding uses the official icon linked to https://platform.trialagents.com; omit optional branding if the exact asset cannot be embedded. Preserve the host header and available content viewport; reserve bottom space only for applicable first-publication controls.
- Database integrity, access checks, code isolation, exact reviewed writes and audit logs remain enforced by the backend. Unavailable schema, selected-template source, runtime contracts or required validation blocks the dependent preparation/save; a design fallback cannot bypass them. Preserve the saved app and resume the same draft after recovery.

## Cross-platform shell

TrialAgents apps should work inside ChatGPT, inside Claude and standalone on the web. Ready-made apps, customization and assistant-built custom apps share the same design/access contracts. Web headers keep Open ChatGPT and Open Claude visible; the plugin uses Open TrialAgents. Apps open within the platform in the same tab, with the sidebar initially collapsed. Do not add duplicate platform chrome or an attribution watermark.

## Saving controls

Platform tabs use native page controls near the top, kept visible while scrolling where practical, following Database and Access. Do not add floating Save footers to ordinary platform or app editing pages. The exception is first publication of a new preview: the host shows a dark floating footer with Save app and Discard app, in both the website and ChatGPT extension.

Apps own their save behavior. Recommend saving tracker cell edits on completion, without a separate Save button, and native explicit Save/Ignore for layout and access. These are template recommendations, not platform-enforced UI. Custom apps can choose an appropriate interaction. First-time app publication uses that trusted preview approval footer; later app revisions retain native review controls. Preserve exact backend proposals, confirmation or authorized grants, optimistic versions, permissions and audit logs; a failed save retains the draft and supports safe retry.

## App actions and automations

Read current template and automation guidance before adding services. Research/drafting automations must save results in the app database; the required scoped writes are included in the same exact install/setup approval, with no separate write opt-in. Missing writable storage leaves Needs setup while the app remains usable. A research automation may include an email step; email failure never reruns research.

The owner controls app access, with database, assistant, connector and approved-action restrictions still enforced. Helpers may use existing approved write-function/action paths when needed; app edit access alone is not blanket execution authority. Brief and email-summary bindings specifically stay read-only. Do not claim proposed catalog helper installation is available before it ships, or change existing grants/paused states through a documentation update.
