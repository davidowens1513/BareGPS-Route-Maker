import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/*.tile.opentopomap.org/**", (r) => r.abort());
  await page.addInitScript(() => {
    Object.defineProperty(window, "showSaveFilePicker", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
});
test("standalone Maker draws, exports GPX and provides focused Settings and About", async ({
  page,
}) => {
  await expect(page).toHaveTitle("BareGPS Route Maker");
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.locator("#open-in-edit")).toHaveCount(0);
  await expect(page.locator("#create-map")).toBeVisible();
  await expect(page.locator("#editor")).toBeHidden();
  await page.locator("#create-map").click({ position: { x: 100, y: 100 } });
  await page.locator("#create-map").click({ position: { x: 180, y: 180 } });
  await expect(page.locator("#waypoint-count")).toHaveText("2");
  await page.locator("#settings").click();
  await expect(
    page.getByRole("heading", { name: "Route Colour", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Input Track Editing", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator("#help").click();
  await expect(page.locator("#dialog")).toContainText("BareGPS Route Maker");
  await expect(page.locator("#about-edit")).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.route("**/terrain/**", (r) =>
    r.fulfill({
      json: {
        status: "OK",
        results: new URL(r.request().url()).searchParams
          .get("locations")!
          .split("|")
          .map(() => ({ elevation: 100 })),
      },
    }),
  );
  const download = page.waitForEvent("download");
  await page.locator("#create-save").click();
  const file = await download;
  const fs = await import("node:fs/promises");
  const xml = await fs.readFile((await file.path())!, "utf8");
  expect(xml).toContain('creator="BareGPS Route Maker"');
  expect(xml.match(/<trkpt /g)!.length).toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("native Maker gives Save Route the full action row", async ({ page }) => {
  await page.evaluate(() => document.body.classList.remove("web-route-card"));
  const save = await page.locator("#create-save").boundingBox();
  const row = await page.locator(".create-buttons").boundingBox();
  const padding = await page.locator(".create-buttons").evaluate((el) => {
    const s = getComputedStyle(el);
    return parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
  });
  expect(save!.width).toBeGreaterThan(row!.width - padding - 3);
});
