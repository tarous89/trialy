/**
 * Optional reusable visual shells, not catalog templates or security boundaries.
 * These are style/layout recipes for custom apps. Existing templates keep their
 * own canonical source and styling unless the user requests a design change.
 */
export const APP_SHELL_LIBRARY_VERSION = '1.0.0';
export const appShells = [
  {
    id: 'analytics',
    name: 'Analytics & reporting',
    whenToUse: 'Recurring KPI analysis, cohort trends, website metrics, finance and reporting where interpreting charts is the main task.',
    whenNotToUse: 'Bulk record editing is the main job, or approval/evidence integrity is more important than analysis.',
    layout: 'Compact top navigation; overview KPIs; grouped interactive charts; source-data table; full Settings page.',
    recommendedSections: ['Overview', 'Analysis', 'Data', 'Settings'],
    components: ['page-header', 'section-nav', 'kpi-grid', 'chart-card', 'filter-toolbar', 'data-table', 'settings-page'],
    palette: {page:'#f6f7fa',surface:'#ffffff',ink:'#1f2d41',accent:'#5767b7',rail:'#202c40'},
    example: '<div class="ta-shell" data-ta-shell="analytics"><header class="ta-page-header"><h1>Analytics</h1></header><nav class="ta-section-nav" aria-label="App sections"><button aria-current="page">Overview</button><button>Analysis</button><button>Data</button><button>Settings</button></nav><div class="ta-card-grid"><section class="ta-card"><h2>Metric</h2></section><section class="ta-card"><h2>Trend</h2></section></div></div>'
  },
  {
    id: 'portfolio',
    name: 'Portfolio & project planning',
    whenToUse: 'Multiple projects or workstreams, milestones, timelines, deliverables, risk ownership and management review.',
    whenNotToUse: 'A flat transactional register or a one-off simple chart is sufficient.',
    layout: 'Persistent dark left navigation on desktop; horizontal scrollable tabs on narrow screens; project timeline and action-focused cards.',
    recommendedSections: ['Portfolio', 'Projects', 'Timeline', 'Risks', 'Reports', 'Settings'],
    components: ['side-navigation', 'page-header', 'kpi-grid', 'timeline', 'progress-row', 'status-pill', 'data-table', 'settings-page'],
    palette: {page:'#f6f7fb',surface:'#ffffff',ink:'#202d41',accent:'#7354b4',rail:'#18283b'},
    example: '<div class="ta-shell ta-sidebar-layout" data-ta-shell="portfolio"><aside class="ta-side-nav"><nav aria-label="App sections"><button aria-current="page">Portfolio</button><button>Projects</button><button>Timeline</button><button>Settings</button></nav></aside><main class="ta-main"><header class="ta-page-header"><h1>Project oversight</h1></header><div class="ta-card-grid"><section class="ta-card"><h2>Milestones</h2></section></div></main></div>'
  },
  {
    id: 'records',
    name: 'Records & operations',
    whenToUse: 'CRM, biotech outreach, CRO/site/PI directories, trackers and work where search and editing records dominate.',
    whenNotToUse: 'A pure read-only report or a formal weighted decision is the primary goal.',
    layout: 'Dense accessible table with visible search/filter/add controls; record details, edit and paging; restrained top navigation.',
    recommendedSections: ['Overview', 'Records', 'Activities', 'Settings'],
    components: ['section-nav', 'filter-toolbar', 'data-table', 'record-details', 'status-pill', 'pagination', 'settings-page'],
    palette: {page:'#f8faf9',surface:'#ffffff',ink:'#102d32',accent:'#087b58',rail:'#123941'},
    example: '<div class="ta-shell" data-ta-shell="records"><header class="ta-page-header"><h1>Outreach tracker</h1></header><nav class="ta-section-nav" aria-label="App sections"><button>Overview</button><button aria-current="page">Records</button><button>Settings</button></nav><div class="ta-card"><div class="ta-toolbar"><input type="search" aria-label="Search records" placeholder="Search records"><button>Filters</button><button class="ta-primary">Add record</button></div><div class="ta-table-scroll"><table><thead><tr><th scope="col">Name</th><th scope="col">Status</th></tr></thead><tbody></tbody></table></div></div></div>'
  },
  {
    id: 'decision',
    name: 'Decision & evidence review',
    whenToUse: 'RFPs, CRO selection, vendor qualification, proposals, scoring, evidence gaps and human approvals.',
    whenNotToUse: 'Simple status tracking with no evaluation criteria, evidence or decision workflow.',
    layout: 'Focused review stages; criteria and evidence matrices; explicit incomplete-coverage warnings and human decision steps.',
    recommendedSections: ['Overview', 'Candidates', 'Comparison', 'Decision', 'Settings'],
    components: ['side-navigation', 'page-header', 'ranking', 'criteria-matrix', 'evidence-checklist', 'status-pill', 'data-table', 'settings-page'],
    palette: {page:'#f8f8f5',surface:'#ffffff',ink:'#273b44',accent:'#476d83',rail:'#1d323d'},
    example: '<div class="ta-shell ta-sidebar-layout" data-ta-shell="decision"><aside class="ta-side-nav"><nav aria-label="Review stages"><button>Overview</button><button>Comparison</button><button aria-current="page">Decision</button><button>Settings</button></nav></aside><main class="ta-main"><header class="ta-page-header"><h1>CRO evaluation</h1></header><section class="ta-card"><h2>Evidence requirements</h2><p>Check complete authorized coverage before scoring or approval.</p></section></main></div>'
  }
] as const;

export const sharedComponents = [
 {id:'page-header',usage:'One page title, one concise subline and page-level actions in the same aligned row. No duplicate banners.'},
 {id:'section-nav',usage:'All top-level destinations in one clean navigation row or side rail. Settings is a true full-page destination, never a utility dropdown. Refresh belongs in the relevant action row if needed.'},
 {id:'side-navigation',usage:'Optional project/portfolio rail. Collapse to scrollable tabs on narrow extensions; do not force secondary page scroll.'},
 {id:'kpi-grid',usage:'Aligned metric cards with comparable heights; meaning, unit and denominator visible; distinguish unavailable data from zero.'},
 {id:'chart-card',usage:'Title and controls, spaced plot, interactive per-series legend, hover AND keyboard point detail, clearly labeled axes and inspectable underlying data. Use supported bounded runtime, not remote libraries.'},
 {id:'filter-toolbar',usage:'Search, relevant filters and one primary action in one row on desktop; responsive Filters disclosure. Filter full authorized data before pagination and label partial coverage.'},
 {id:'data-table',usage:'Readable headers, full-data sort/search/filter before paging; first-column names emphasized; per-row details and authorized edit/duplicate/archive where applicable.'},
 {id:'record-details',usage:'A full details view or right drawer with clear close and reviewable updates. Preserve drafts on error or stale versions.'},
 {id:'pagination',usage:'One stable bottom pager with Previous / Next and Page X of Y; do not misrepresent unknown totals.'},
 {id:'timeline',usage:'Compact milestone bars and consistent date labels, accessible list equivalent and dependency/overdue states.'},
 {id:'ranking',usage:'Evidence-backed, explainable ordered comparison; do not score unknown or inaccessible evidence as zero.'},
 {id:'criteria-matrix',usage:'Stable criteria, weights, source coverage, compare rows and human review status. Horizontal scrolling confined to the matrix.'},
 {id:'evidence-checklist',usage:'Visible missing requirements and explicit human decision, with signed/approved state only after trusted review.'},
 {id:'settings-page',usage:'Full structured General / Display / About page using the same width and alignment as app sections. Save/Ignore only when supported by native versioned configuration; no simulated local persistence, per-app accounts or connector settings.'},
 {id:'status-pill',usage:'Compact semantically labeled status; neutral, green, amber or red with text, never color alone.'},
 {id:'empty-state',usage:'Specific explanatory empty/unavailable state and permitted next action; never invent example records.'}
] as const;

export const shellSelection = {
 precedence: 'Explicit user-selected template and existing saved-app design always take precedence. These shells are optional custom-app composition patterns, not substitutes for existing templates or their exact UI.',
 approach: 'Choose the shell for the primary recurring decision: interpret metrics = analytics; coordinate workstreams = portfolio; operate records = records; assess evidence/approve = decision. Mix components from other shells when helpful. A simple user-requested one-page report remains valid.',
 mandatory: 'Every visible control must work using supported runtime operations. Preserve real bindings, permissions, reviewed writes, concurrency protection, provenance and audit. Do not seed prototype data or copy its browser-only state storage.',
 mobile: 'Test 390px and 1440px; prevent page-wide horizontal overflow; scroll only the relevant table/matrix; reserve the hosted watermark area and maintain one page vertical scroll.',
 charts: 'Prefer clean SVG/HTML in the supported runtime with visible series toggles, hover/focus inspection, and an inspectable data view. No chart controls that merely look interactive.',
 design: 'Apply consistent 8/12/16/20/24px gaps between controls, text, chart legend, plots and sibling cards. Keep action bars aligned, cards padded, and Settings controls full-width and properly spaced.'
} as const;

/** Opt-in low-priority classes. They do not alter canonical template designs. */
export const appShellCss = `@layer trialagents-defaults {
 .ta-shell{--ta-page:#f6f7fa;--ta-paper:#fff;--ta-ink:#1f2d41;--ta-muted:#64738a;--ta-line:#e3e9f0;--ta-accent:#5767b7;--ta-rail:#202c40;--ta-gap:20px;--ta-radius:14px;box-sizing:border-box;min-width:0;width:100%;min-height:100%;padding:clamp(16px,3vw,32px);color:var(--ta-ink);background:var(--ta-page);line-height:1.5}
 .ta-shell[data-ta-shell="portfolio"]{--ta-page:#f6f7fb;--ta-ink:#202d41;--ta-accent:#7354b4;--ta-rail:#18283b}
 .ta-shell[data-ta-shell="records"]{--ta-page:#f8faf9;--ta-ink:#102d32;--ta-accent:#087b58;--ta-rail:#123941}
 .ta-shell[data-ta-shell="decision"]{--ta-page:#f8f8f5;--ta-ink:#273b44;--ta-accent:#476d83;--ta-rail:#1d323d}
 .ta-shell *{box-sizing:border-box;min-width:0}
 .ta-shell h1,.ta-shell h2,.ta-shell p{margin:0}
 .ta-page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}
 .ta-page-header h1{font-size:clamp(25px,2.8vw,31px);line-height:1.2;font-weight:760;letter-spacing:-.035em}
 .ta-page-header p{margin-top:8px;color:var(--ta-muted);font-size:13px;line-height:1.6}
 .ta-section-nav{display:flex;gap:6px;align-items:center;overflow-x:auto;margin-bottom:24px;border-bottom:1px solid var(--ta-line)}
 .ta-section-nav button{flex:none;background:transparent;border:0;border-bottom:2px solid transparent;border-radius:0;color:var(--ta-muted);padding:12px 16px;font-weight:680}
 .ta-section-nav button[aria-current="page"]{color:var(--ta-accent);border-bottom-color:var(--ta-accent)}
 .ta-sidebar-layout{display:grid;grid-template-columns:218px minmax(0,1fr);gap:24px}
 .ta-side-nav{background:var(--ta-rail);color:#edf3f7;border-radius:12px;padding:18px 12px;align-self:stretch}
 .ta-side-nav nav{display:flex;flex-direction:column;gap:6px}
 .ta-side-nav button{display:block;width:100%;text-align:left;color:#e0e8f1;background:transparent;border:0;border-radius:8px;padding:11px 13px}
 .ta-side-nav button[aria-current="page"]{background:#ffffff23;color:#fff}
 .ta-main{min-width:0}
 .ta-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:var(--ta-gap);align-items:stretch;margin:0 0 24px}
 .ta-card{background:var(--ta-paper);border:1px solid var(--ta-line);border-radius:var(--ta-radius);padding:22px;min-width:0;overflow-wrap:anywhere}
 .ta-card + .ta-card{margin-top:20px}
 .ta-card-grid>.ta-card + .ta-card{margin-top:0}
 .ta-card h2{font-size:16px;font-weight:740;line-height:1.4}
 .ta-card h2 + p,.ta-card p + p{margin-top:10px}
 .ta-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
 .ta-toolbar{display:flex;flex-wrap:nowrap;align-items:center;gap:10px;margin:0 0 18px}
 .ta-toolbar input[type="search"]{flex:1 1 180px;width:0;min-width:80px}
 .ta-toolbar button,.ta-toolbar input,.ta-toolbar select,.ta-shell .ta-button{min-height:40px}
 .ta-shell .ta-primary{background:var(--ta-accent);border-color:var(--ta-accent);color:#fff}
 .ta-shell .ta-button{display:inline-flex;justify-content:center;align-items:center;gap:8px;padding:9px 13px;border:1px solid var(--ta-line);border-radius:9px;background:#fff}
 .ta-shell :focus-visible{outline:3px solid var(--ta-accent);outline-offset:3px}
 .ta-chart-legend{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 16px}
 .ta-chart-legend button{border:0;border-radius:6px;background:transparent;padding:6px 8px;color:var(--ta-ink)}
 .ta-chart-plot{position:relative;min-height:180px;margin-bottom:12px}
 .ta-chart-plot svg{display:block;width:100%;height:auto;max-width:100%}
 .ta-chart-foot{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;margin-top:12px;color:var(--ta-muted);font-size:12px}
 .ta-table-scroll{max-width:100%;overflow-x:auto}
 .ta-table-scroll table{width:100%;border-collapse:collapse}
 .ta-table-scroll th,.ta-table-scroll td{padding:12px 15px;text-align:left;border-bottom:1px solid var(--ta-line)}
 .ta-table-scroll th{font-weight:720;white-space:nowrap}
 .ta-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px}
 .ta-settings{display:grid;grid-template-columns:190px minmax(0,1fr);gap:24px;align-items:start}
 .ta-settings-nav{display:flex;flex-direction:column;gap:6px}
 .ta-settings-content{display:grid;gap:20px}
 .ta-settings .ta-field{display:grid;gap:8px;margin-bottom:16px}
 .ta-settings .ta-field input,.ta-settings .ta-field select,.ta-settings .ta-field textarea{width:100%;max-width:100%}
 .ta-settings-actions{display:flex;flex-wrap:wrap;gap:10px;padding-top:20px;margin-top:20px;border-top:1px solid var(--ta-line)}
 @media(max-width:850px){.ta-sidebar-layout{grid-template-columns:minmax(0,1fr)}.ta-side-nav{padding:8px}.ta-side-nav nav{flex-direction:row;overflow-x:auto}.ta-side-nav button{width:auto;white-space:nowrap}.ta-settings{grid-template-columns:minmax(0,1fr)}.ta-settings-nav{flex-direction:row;overflow-x:auto}}
 @media(max-width:620px){.ta-shell{padding:16px;--ta-gap:14px}.ta-page-header{flex-direction:column;gap:12px}.ta-card{padding:18px}.ta-toolbar{gap:8px}.ta-toolbar .ta-secondary-filter{display:none}.ta-chart-legend{gap:6px}.ta-pager{flex-wrap:wrap}}
}`;
