# Approved design language: Theme 2 / Vivid Tints

**Final user-approved theme.** Read for every tracker build or visual revision. This reference is based on the actual `/assets/approved-theme2-reference.html` final HTML, not a guessed ChatGPT brand color palette. Use the approved asset as the precise source for selectors and interactions; the business-specific CRO values in that file are illustration only and must be replaced for new trackers.

## Table of contents
1. Aesthetic intent and immutable visual behavior
2. Core palette tokens
3. Semantic label tokens
4. Typography and sizing
5. Spacing, table and details treatment
6. Styling boundaries and QA

## 1. Aesthetic intent

Make the tracker look like a clean, familiar ChatGPT-style workspace: **comfortable system sans-serif typography, crisp dark text, restrained white/light gray surfaces, thoughtful spacing, and rich but elegant semantic labels**. Theme 2 is stronger than a washed-out pastel treatment but less visually aggressive than fully saturated solid badges. Do not add new color *families*. Existing families: neutral, emerald/green, amber, red, blue and purple only for Custom permission states; owner dark teal. Avoid gradients, glassmorphism, oversized colorful headers, chart decorations, new icons beside date/dropdown fields or exaggerated shadows.

Use natural interaction cues: green for pending editable changes, gray for hidden/disabled, strong dark owner color, neutral text for controls, darker text for facts, red for blocked/restricted, amber for pending/risk, green for completed/positive **only when semantically valid**. Actual statuses have explicit text labels.

## 2. Base colors from the approved Theme 2 override

| Token / role | Exact reference color | Typical use |
| --- | --- | --- |
| `--ink` | `#102022` | Primary text and important titles |
| `--muted` | `#46585b` | Subtitles, auxiliary text, help |
| `--accent` | `#087b58` | Primary action, active tabs, links, ranks |
| Base surface | `#ffffff` | Table card, drawer, settings sections |
| Page surface | `#f8faf9` | Document background (retained original) |
| Table header text | `#34484a` | Headings including **Details** |
| Data text | `#253c40` | Table cell content |
| Important first-column text | `#102d32` | Primary record names |
| Input text | `#1a3535` | Inputs, dropdowns, editable areas |
| Tab inactive text | `#4c6264` | Unselected tab label |
| Placeholder text | `#627877` | Placeholders |
| Border token | `#e4e8e6` | Table sections, divider, input edges |
| Pending edit cell | `#e5f6e9` | Unsaved changed cell background (original canonical pending state) |
| Pending edit inner border | `#c0e8ca` | Changed cell outline |
| Dark metric cards | dark teal `#243b40` (base), white text | Overview summary, when justified |

Do not rewrite the entire stylesheet to these values if retaining the original asset: the approved CSS uses cascade overrides near the end. When implementing from scratch, set semantic tokens and apply the same results.

## 3. Status, tags and permission semantics

### Status pill colors

| Status family | Background | Text |
| --- | --- | --- |
| Neutral | `#d8e4e1` | `#324a4b` |
| Green/positive | `#b9edcd` | `#075a39` |
| Amber/pending | `#ffe09b` | `#75500b` |
| Red/problem | `#ffcfc8` | `#932b25` |
| Blue/information | `#c4ddff` | `#1d5186` |
| Small green tag | `#bfe8d5` | `#095a41` |

### Permission role colors

| Role | Background | Text | Border |
| --- | --- | --- | --- |
| Owner (strongest) | `#123941` | `#ffffff` | `#123941` |
| Editor / Can edit | `#b9edcd` | `#075a39` | `#8bcba8` |
| Viewer / Can view | `#c4ddff` | `#1d5186` | `#8cbaeb` |
| Custom overall | `#e3d3ff` | `#59308f` | `#c3a0ef` |
| Restricted | `#ffcfc8` | `#932b25` | `#e6a69c` |
| Hidden Layout selector | `#dce5e1` | `#455956` | `#b4c4bc` |

The user specifically chose **strong dark owner color** to avoid confusing Owner and Viewer; one overall Custom role when exceptions exist, **not a Custom tag next to individual override**; Hidden grayish background. Keep these exact visual distinctions. Don't invent a new status palette for each domain.

## 4. Typography and approximate measurements

Use the approved system stack (not a distributed/proprietary font file):

```css
body {
  font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #102022;
}
button,input,select,textarea { font-family: inherit; }
```

Key applied sizes from the reference, where CSS cascade defines them:

| Element | Approved/default size | Notes |
| --- | --- | --- |
| Tracker H1 | `34px` desktop; `27px` narrow-screen override | Comfortable, not a giant app hero |
| Subtitle | `15px` | Muted |
| Tab labels | `15px` | Active underline/accent |
| Table headings | `14px` | Semibold, readable; Details **identical** |
| Table cells | `15.5px` | Natural line height and single-line truncation except intentional multiline |
| Status pills | `12px` | Distinct, text-first |
| Search and primary controls | `14–15px`; approx. `42px` control height | Consistent with ChatGPT-like input density |
| Details title | approx. `19px` | See canonical asset |
| Row expand glyph | `24px` inside ~`40px` target | Do not shrink icon and leave unused margin |
| Overview metric number | approx. `29px` | Dark cards only when useful |
| Owner/member name | approx. `15px` | See access settings reference |
| Standard body inputs | approx. `15px`, unless narrower detailed form style applies | Do not shrink field text to fit |

Use canonical styles where exact measurements matter: not every declaration uses variables or one base font size. Do not claim this is OpenAI's proprietary ChatGPT font; it is the **approved ChatGPT-like system-font implementation**.

## 5. Layout, spacing and surfaces

- Page content max width around `1440px`, light page background, comfortable desktop horizontal padding (`28px`) and mobile padding (`16px`). Preserve normal global page vertical scrolling.
- Tab row with moderate whitespace (`~27px` desktop gap), one quiet underline for active tab; Settings icon on same level with transparent background and no tile.
- Toolbar search/filter/sort and **Add record** arranged in one restrained row with `~10px` gaps and enough wrap space; only show Save/Ignore actions when edits are pending.
- Table card white with small rounded corners (`~12px`), light divider, readably padded rows (`~14–15px` vertical/horizontal), soft hover state. No decorative row cards, no inner Y-scrolling.
- Support horizontal resize, reordering (in Settings), visible pinned right **Details** column (`~84px` width), header typography matching every other column header and 24px corner-expand icon without background. Icon only for row action, visible `Details` label as column header.
- Settings is **full page**. Its Layout and Access control sections are readable, with `~17px` between cells in multi-column grids, `~21px` vertically stacked metadata fields, `~28px` gap between person identity and role controls; compact but not touching. On mobile, stack/reflow these controls while preserving clear gaps.
- Drawer fixed to viewport right, **no box shadow**, just a thin left border in the neutral line family. Resizable by dragging left edge. Inside: straightforward labels, input controls and Duplicate/Delete actions. Do not add a parallel navigation/sidebar.
- Tab names and column display names are editable inline in Settings; drag handles visually subdued. Hidden selectors gray. Show all fields including those hidden from table.
- Avoid extra chart colors, dashboard cards, sourcing history sidebars, file-upload widgets, and custom global buttons in reusable template defaults.

## 6. CSS behavior under theme revisions

The user selected **Theme 2 / Vivid Tints**, after comparing Crisp, Vivid and Bold variants. Treat Theme 2 as final. Do not let future generated trackers drift into those alternative styles without explicit request.

In the bundled HTML, the final CSS section starts with:

```css
/* TRIALY COLOR-ONLY VARIANT: Vivid Tints | no changes to structure/behavior */
```

Use this section as the authoritative theme override if adapting the asset. It changes color **without modifying DOM, JS, geometry, or behavior**. The reference HTML's other CSS implements the fixed layout and interactions. Do not copy its content logic or create dummy `CRO #1` fields for unrelated workflows. Keep the same role and status color semantics across domains even as actual status vocabulary changes.

Before delivery compare side by side on desktop/mobile with `assets/approved-theme2-screenshot.png` and the live reference HTML. Verify that contrast is strong, inputs readable, every icon retains the correct interaction, and changes outside the requested scope did not occur. The screenshot is a **visual style baseline**, not a mandatory layout of business-specific fields.
