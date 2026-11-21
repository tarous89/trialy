<!-- Generated from templates/APP_GUIDE.md; run node scripts/sync-plugin-guidance.mjs. -->
# TrialAgents app guide

Version: 2.0.0

How to design an app on TrialAgents, for assistants building, changing or customizing one. It holds principles, not fixed limits: you decide the screens, the navigation and the layout from the app's main job. How things work technically (runtime, data, saving, exchange, automations, installation) is in the separate **technical reference** (`read_app_template_guidance` resource `reference`), which holds no design rules.

The user's instructions take priority over everything in this guide except section 1.

## 1. Rules that never bend

These hold even when a user asks otherwise. When a request would break one, say why and offer the closest allowed option.

1. **Platform elements stay the platform's.** The platform header (with the app's name and its access and refresh status), the platform sidebar, the shared message, the approval footer, linked-value tooltips and the request-access control are provided by the platform. Never recreate, cover or hide them: no header or title bar of the app's own, no banners, toasts or pop-ups for system messages, no footer or disclaimer bar.
2. **Platform features stay on platform pages.** Access, sharing, automations, logs and history are managed on their platform pages. Link to them where useful (`platform:access`, `platform:automations`, `platform:logs`); never rebuild them or fill screens with explanations of them.
3. **Access and safety.** Apps respect database and app permissions, use the platform's sign-in only (never a sign-in, sign-up or password form of their own) and follow the platform's saving, approval and validation rules.
4. **Honest data.** Missing or partial data is never shown as complete or as zero. Say what is missing, loading or restricted.

The design check refuses an app that draws its own fixed header, footer or message bar, or asks for credentials.

## 2. What the platform already provides

- The **header** shows the app's name and one quiet status (view only, access removed, a newer version, saved but not refreshed). The app needs no title of its own.
- The **sidebar** is hidden while an app is open; people open it to go back to the platform or to other apps.
- **One message at a time.** Return `notice` from your app (`kit.notice('success','Saved')`). Info and success close on their own; errors stay until dismissed. An error about one value also shows next to that value.
- The **approval footer** holds every pending change an assistant prepared; a person approves it there.
- **Undo** support: the platform keeps the person's own recent actions; the app decides whether to offer Undo and where (`undo.list`, `undo.run`, `kit.undo`).
- **One app on every screen.** The app fills the space below the header in the browser, the assistant panel and on a phone. It receives the width class (`input.viewport`) and scrolls inside its own frame.

## 3. Start from the job

- Design around the main jobs people come to do. Every screen helps with one of them; use only as many screens as the job needs. There are no required screens.
- The first screen shows what needs attention now and the obvious next step, with only the few numbers that matter.
- When a person picks a working context (a program, a request, a room, a round), keep it across screens and the next visit until they change it. Return it as `context`; it is remembered for that person only.

## 4. Fewest clicks

- Let people edit a value where it is shown, and save it at once (`kit.cell` and `records.save`). The value shows immediately; if the save fails, the earlier value comes back with a message.
- Use a side panel (`kit.panel`) only to create a record or edit many fields at once.
- Use drag and drop for stages and ordering where it fits (`kit.board`); every card also has a menu, so it works with a keyboard and on touch screens.
- Every empty screen offers the first action, such as adding the first item or importing existing data (`kit.empty`), so a newly installed app is useful straight away.
- Saving follows the platform rules: record edits save directly; platform content needs Save; app changes an assistant prepares need a person's approval.

## 5. Only what helps

- Show what helps people decide or act. Keep technical details (raw data, codes, IDs, source reports) hidden or one click away.
- Settings hold only business choices that change how the app works, and only the app's owners can change them (`input.appRole`, `kit.settings`). An app with no such choices has no Settings screen.
- Settings never hold layout, styling, access, automation notes or data lists. Data lists belong on their own screen or in the Database.

## 6. Navigation and view choices

- Everything below the platform header is the app's, including its own navigation. Decide whether the app needs tabs, its own side navigation (`kit.nav`, `kit.layout`) or none. An app's own side navigation may carry its branding.
- Offer quick view choices inside the app where the job benefits: filters, sorting, showing or hiding columns. Filter and sort the data already loaded, so the screen changes at once.
- Changes to screens, layout and design are made through an assistant, and a person approves them.

## 7. Style

- Use the general style and the kit (`read_app_design`): one set of colours, type, spacing and components shared with the standard tracker. The runtime adds it to every v2 app; an app adds only the few styles of its own that it needs.
- Plain screen names, a clear hierarchy, tidy alignment. Layouts follow the app's own width, so they work in the assistant panel and on phones; nothing depends on hover.
- The user's own instructions on style win.

## 8. Real and honest

- Every requested feature works for real with the user's data. No placeholder buttons, fake data or invented example records in an installed app.
- Label data that is partial, loading or restricted (`pending` reads, `unavailable` tables). Totals come from the full data (`records.summarize`), never from one loaded page.

## 9. Catalog first

- When a request matches a catalog app, offer it first (`list_app_templates`, `read_app_template`). It installs through the installation popup and can then be customized through an assistant.
- Catalog apps follow this guide too.

## 10. Check before the preview

Before showing an app for approval, ask:

1. Does every screen serve a main job?
2. Is any platform element or feature recreated?
3. Is anything shown that does not help people decide or act?
4. Can the main job be done in the fewest clicks?
5. Does every empty screen offer a first action?
6. Does every requested feature work?
7. Does it open fast and respond at once (screens and filters without waiting for the server)?
8. Does it work on a phone and in the assistant panel?

These are questions, not limits. Fix what fails before showing the preview.
