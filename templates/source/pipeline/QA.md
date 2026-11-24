# Pipeline 1.0.0: QA

## Automated

`tests/pipeline.test.ts` runs the catalog version in the production QuickJS runtime with stub tools, as the platform runs a v2 catalog app. It covers:

- **Package.** v2 marker, installer schema and roles, draft status, gallery media. It also checks that the source has none of the standalone prototype's browser storage, file reader, dialog, own header, email preferences or prepared reports.
- **Screens.** Every screen at wide, panel and phone widths: no header, banner or footer of its own; opening never writes; the screen and program are remembered; Settings is for owners only.
- **Rules.** Forecasts from changes, and risk rollup to downstream work and ancestors (closing a risk removes it).
- **Completion.** Completion needs owner approval, which is recorded with the owner and date. Mandatory dependencies gate status. Pending applies only when a decision remains.
- **Saving.** A deliverable moves its item to In progress in the same save. A new plan item reopens after its first save. Delete is blocked while records name the item.
- **Settings and files.** Settings hold only currency and date format. Files come from the platform upload.
- **Digest and commands.** The digest is built from the records and saved to the archive. The four read commands are covered.
- **Honesty.** Loading, missing tables and viewers are shown as such.
- **Install.** Installed from the catalog with the platform installer into new tables, with no sample records.
- **Design.** The design check under the current rules on every screen and the record side panels, at 1440, 400 and 390 px. It runs unless `APP_DESIGN_CHECKS=off`. Where the preinstalled Chromium differs from the pinned Playwright, set `APP_DESIGN_CHROMIUM`.

## Manual

A walkthrough of `pipeline.preview.html` in Chromium raised no page errors. It covered:
1. Approve the completion waiting on Overview.
2. Add a program; it reopens after saving.
3. Add a milestone under it.
4. Log a High risk from the milestone form, which returns to the milestone form.
5. Check that Programs at risk rises.
6. Search on Programs.
7. Save the weekly digest.
8. Switch to USD and ISO dates.
9. Try to delete a program with children: refused.

The phone width (390 px) has no horizontal page scroll; the navigation becomes a row of icons.

## Not covered

- Live sessions on the platform (frame runtime with a real workspace) and the browser speed gate. Pipeline is not listed in `templates/browser-runtime.json`. As a v2 app it runs in the browser anyway.
