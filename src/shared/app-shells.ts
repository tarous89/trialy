/** 5.6: the four optional shells were retired with the single app guide. Their CSS stays for v1 apps that use ta- classes. */
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
