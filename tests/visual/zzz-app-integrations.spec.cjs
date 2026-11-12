const {test,expect}=require('./test.cjs');
const base='http://127.0.0.1:4179';
// Modular apps §7: a subtle in-app hint opens the platform dialog; the user picks one data source, which is kept.
for(const width of [1440,390])test(`in-app integration: hint, both sources side by side, the choice is kept at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const f=await(await page.request.post(base+'/fixture/programs-integration')).json();
 await page.goto(base+f.url);
 const frame=page.frameLocator('iframe[title="Saved frontend code"]');
 await frame.getByRole('button',{name:'Timeline'}).click();
 const hint=frame.getByRole('button',{name:'Use its cash data',exact:true});await expect(hint).toBeVisible();
 await hint.click();
 const dialog=page.getByRole('dialog',{name:'Choose a data source'});await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('radio',{name:/^Runway/}).first()).toBeChecked();await expect(dialog.getByRole('radio',{name:/Programs entries/})).toBeVisible();
 await page.screenshot({path:`/tmp/integration-dialog-${width}.png`});
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await expect(dialog).toContainText('Where should Programs get its cash forecast?');
 await dialog.getByRole('button',{name:'Use selected',exact:true}).click();await expect(dialog).toHaveCount(0);
 // The app reloads with the new source.
 await expect(frame.getByText('Programs / Overview')).toBeVisible();
 await frame.getByRole('button',{name:'Settings',exact:true}).click();
 await expect(frame.getByText('From Runway. Read-only here.')).toBeVisible();await expect(frame.locator('[data-trialy-integration]')).toHaveCount(0);
});
