const { test, expect } = require("@playwright/test");
const fixtureBase='http://127.0.0.1:4179';
for (const width of [1440, 1100, 390]) test(`Vivid connected tracker at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1e3 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(fixtureBase);
  await page.waitForFunction(() => window.hostReady);
  const initial=await (await page.request.get(fixtureBase+"/fixture/initial")).json();
  await page.evaluate(result=>window.deliver(result),initial);
  const embed = page.frameLocator("#app"), tracker = embed.frameLocator('iframe[title="Saved frontend code"]');
  await tracker.getByRole("button", { name: "Companies", exact: true }).click();
  await expect(tracker.getByRole("combobox", { name: "Filter by Status", exact: true })).toBeVisible();
  await expect(tracker.locator("tbody tr")).toHaveCount(25);
  await expect(tracker.locator(".pill.green")).not.toHaveCount(0);
  await expect(tracker.locator(".pill.red")).not.toHaveCount(0);
  await expect(embed.getByText("Opening your account…",{exact:true})).toHaveCount(0);
  await expect(page).toHaveScreenshot(`tracker-${width}.png`);
  const outerScroll = await embed.locator("#ty-main").evaluate((el) => getComputedStyle(el).overflowY);
  expect(outerScroll).toBe("hidden");
  await tracker.getByRole("combobox", { name: "Filter by Status", exact: true }).selectOption("Active");
  await expect(tracker.locator("tbody tr")).toHaveCount(9);
  await tracker.getByRole("combobox", { name: "Filter by Status", exact: true }).selectOption("");
  await expect(tracker.locator("tbody tr")).toHaveCount(25);
  await tracker.getByRole("button", { name: "Company", exact: true }).click();
  await expect(tracker.getByRole("button", { name: "Company", exact: true })).toHaveAttribute("aria-sort", "ascending");
  await tracker.getByRole("button", { name: "Company", exact: true }).click();
  await expect(tracker.getByRole("button", { name: "Company", exact: true })).toHaveAttribute("aria-sort", "descending");
  await tracker.getByRole("button", { name: "Open record details", exact: true }).first().click();
  await expect(tracker.getByRole("dialog", { name: "Record details" })).toBeVisible();
  const drawer = await tracker.getByRole("dialog", { name: "Record details" }).evaluate((el) => ({ top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height, viewport: innerHeight }));
  expect(drawer.top).toBe(0);
  expect(drawer.height).toBeGreaterThanOrEqual(drawer.viewport);
  await expect(tracker.getByRole("button", { name: "Duplicate", exact: true })).toBeVisible();
  await expect(tracker.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  const referenceDetails=await page.context().newPage();await referenceDetails.setViewportSize({width,height:1000});await referenceDetails.goto(fixtureBase+'/reference');
  await referenceDetails.locator('.expand-row').first().click();
  for(const selector of ['.drawer-main .detail','.drawer-main dt','.drawer-main dd']){
    const props=['fontFamily','fontSize','fontWeight','color','backgroundColor','borderRadius','paddingTop','paddingBottom'];
    const measure=(el,ps)=>Object.fromEntries(ps.map(p=>[p,getComputedStyle(el)[p]]));
    expect(await tracker.locator(selector).first().evaluate(measure,props),selector).toEqual(await referenceDetails.locator(selector).first().evaluate(measure,props));
  }
  await referenceDetails.close();
  await expect(page).toHaveScreenshot(`details-${width}.png`);
  await tracker.getByRole("button", { name: "Close details", exact: true }).click();
  if (width === 1440) {
    const reference = await page.context().newPage();
    await reference.setViewportSize({ width, height: 1e3 });
    await reference.goto(fixtureBase + "/reference");
    await reference.getByRole("tab", { name: "Vendors", exact: true }).click();
    for (const selector of ["body", "h1", ".subtitle", ".tab", ".primary", ".filter", "thead th", ".pill.green"]) {
      const properties = ["fontFamily", "fontSize", "fontWeight", "color", "backgroundColor", "borderRadius", "paddingTop", "paddingBottom"];
      const measure = (el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]));
      const expected = await reference.locator(selector).first().evaluate(measure, properties);
      const actual = await tracker.locator(selector).first().evaluate(measure, properties);
      expect(actual, selector + " matches approved reference").toEqual(expected);
    }
    await reference.close();
    await tracker.getByRole("button", { name: "Edit Company", exact: true }).first().click();
    const editor = tracker.getByRole("textbox", { name: "Company", exact: true });
    await editor.fill("Pending company edit");
    await editor.press("Enter");
    await expect(embed.getByRole("button", { name: "Ignore edits", exact: true })).toBeVisible();
    await embed.getByRole("button", { name: "Ignore edits", exact: true }).click();
    await expect(tracker.getByText("Pending company edit", { exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
