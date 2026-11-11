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
  await expect(page.locator("#editor")).toHaveCount(0);
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
  await expect(page.locator("#expand")).toBeEnabled();
  await expect(page.locator("#expand-card")).toBeEnabled();
  await page.locator("#expand-card").click();
  await expect(page.locator("body")).toHaveClass(/card-expanded/);
  await page.locator("#expand-card").click();
  await page.locator("#expand").click();
  await expect(page.locator("body")).toHaveClass(/map-expanded/);
  await page.locator("#expand").click();
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

test("one drawing map supports undo, point naming and route colour without Editor controls", async ({
  page,
}) => {
  await expect(page.locator(".leaflet-container")).toHaveCount(1);
  await expect(page.locator("#map")).toHaveCount(0);
  await page.locator("#create-map").click({ position: { x: 100, y: 100 } });
  await page.locator("#create-map").click({ position: { x: 180, y: 180 } });
  await expect(page.locator("#waypoint-count")).toHaveText("2");
  await page.locator("#undo").click();
  await expect(page.locator("#waypoint-count")).toHaveText("1");
  await page.locator("#redo").click();
  await expect(page.locator("#waypoint-count")).toHaveText("2");
  await page.locator("#settings").click();
  await page.locator("#colour-hex").fill("#aa3344");
  await page.getByRole("button", { name: "Apply colour", exact: true }).click();
  await expect(page.locator("#colour-status")).toContainText(
    "Route colour applied",
  );
  await page.locator("#allow-point-naming").click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator('[data-point-name="0"]').fill("Gate");
  await page.locator("#expand-card").click();
  await page.locator("#create-share").click();
  await expect(page.locator("#routecard-text")).toContainText("Gate");
});

for (const outcome of ["cancel", "failure"] as const) {
  test(`expansion recovers after terrain ${outcome}`, async ({ page }) => {
    let requestRoute: import("@playwright/test").Route | undefined;
    await page.route("**/terrain/**", (route) => {
      requestRoute = route;
    });
    await page.locator("#create-map").click({ position: { x: 100, y: 100 } });
    await page.locator("#create-map").click({ position: { x: 180, y: 180 } });
    await expect(page.locator("#card-expand-hint")).toHaveText(
      "Expand to Share",
    );
    await page.locator("#create-terrain").click();
    await page.locator("#confirm-create-terrain").click();
    await expect.poll(() => !!requestRoute).toBe(true);
    await expect(page.locator("#expand")).toBeDisabled();
    await expect(page.locator("#expand-card")).toBeDisabled();
    if (outcome === "cancel") {
      await page.locator("#cancel-create-terrain").click();
      await requestRoute!.abort();
    } else {
      await requestRoute!.fulfill({ status: 500, body: "Unavailable" });
    }
    await expect(page.locator("#dialog")).not.toBeVisible();
    await expect(page.locator("#expand")).toBeEnabled();
    await expect(page.locator("#expand-card")).toBeEnabled();
    await page.locator("#expand-card").click();
    await expect(page.locator("body")).toHaveClass(/card-expanded/);
    await expect(page.locator("#card-expand-hint")).not.toBeVisible();
    await page.locator("#expand-card").click();
    await page.locator("#expand").click();
    await expect(page.locator("body")).toHaveClass(/map-expanded/);
  });
}

test("double tapping the card heading keeps the phone viewport at its normal scale", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch gesture check");
  await page.locator("#create-card .card-heading h2").scrollIntoViewIfNeeded();
  const heading = await page
    .locator("#create-card .card-heading h2")
    .boundingBox();
  await page.touchscreen.tap(heading!.x + 20, heading!.y + heading!.height / 2);
  await page.touchscreen.tap(heading!.x + 20, heading!.y + heading!.height / 2);
  expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  // The gesture policy must cover descendants; a viewport zoom lock would also
  // remove deliberate pinch zoom, so retain manipulation rather than none.
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).touchAction),
  ).toBe("manipulation");
  expect(
    await page.locator('meta[name="viewport"]').getAttribute("content"),
  ).not.toMatch(/user-scalable=no|maximum-scale=1/);
});
