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

test("five equal map controls confirm Reset and disable Insert for a selected point", async ({
  page,
}) => {
  const controls = page.locator(".drawing-modes button");
  await expect(controls).toHaveCount(5);
  const sizes = await controls.evaluateAll((elements) =>
    elements.map((el) => ({
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      font: parseFloat(getComputedStyle(el).fontSize),
      fits:
        el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
    })),
  );
  expect(
    Math.max(...sizes.map((s) => s.width)) -
      Math.min(...sizes.map((s) => s.width)),
  ).toBeLessThan(1);
  for (const size of sizes) {
    expect(size.height).toBe(34);
    expect(size.font).toBeGreaterThanOrEqual(11);
    expect(size.fits).toBe(true);
  }
  await expect(page.locator("#create-reset")).toBeDisabled();
  await page.locator("#create-map").click({ position: { x: 100, y: 100 } });
  await page.locator("#create-map").click({ position: { x: 180, y: 180 } });
  await expect(page.locator("#draw-insert")).toBeEnabled();
  await page.locator("#dismiss-create-map").click();
  await page.locator('.track-handle[title^="Route point 1"]').click();
  await expect(page.locator("#draw-insert")).toBeDisabled();
  await expect(page.locator("#create-delete")).toBeEnabled();
  await page.locator("#draw-add").click();
  await expect(page.locator("#draw-insert")).toBeEnabled();
  await expect(page.locator("#create-delete")).toBeDisabled();
  await page.locator("#create-name").fill("My route");
  await page.locator("#create-name").blur();
  await page.locator("#create-reset").click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#waypoint-count")).toHaveText("2");
  await page.locator("#create-reset").click();
  await page.locator("#confirm-reset-created").click();
  await expect(page.locator("#waypoint-count")).toHaveText("0");
  await expect(page.locator("#create-name")).toHaveValue("Created Route");
  await page.locator("#undo").click();
  await expect(page.locator("#waypoint-count")).toHaveText("2");
  await expect(page.locator("#create-name")).toHaveValue("My route");
  await page.locator("#create-clear").click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#create-name")).toHaveValue("My route");
  await page.locator("#create-clear").click();
  await page.locator("#confirm-clear-created").click();
  await expect(page.locator("#waypoint-count")).toHaveText("0");
  await expect(page.locator("#create-name")).toHaveValue("Created Route");
  await page.locator("#undo").click();
  await expect(page.locator("#create-name")).toHaveValue("My route");
  await expect(page.locator("#waypoint-count")).toHaveText("2");
});

test("an empty route loads tiles across the whole map on first opening", async ({
  page,
}) => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP2kAAAAASUVORK5CYII=",
    "base64",
  );
  await page.route("**/*.tile.opentopomap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.reload();
  await expect(page.locator("#waypoint-count")).toHaveText("0");
  await expect
    .poll(() =>
      page.locator("#create-map").evaluate((el) => {
        const map = el.getBoundingClientRect();
        const tiles = Array.from(
          el.querySelectorAll<HTMLImageElement>(".leaflet-tile-loaded"),
        )
          .filter((i) => i.naturalWidth > 0)
          .map((i) => i.getBoundingClientRect());
        return [
          [map.left + 1, map.top + 1],
          [map.right - 1, map.top + 1],
          [map.left + 1, map.bottom - 1],
          [map.right - 1, map.bottom - 1],
        ].every(([x, y]) =>
          tiles.some(
            (t) => t.left <= x && t.right >= x && t.top <= y && t.bottom >= y,
          ),
        );
      }),
    )
    .toBe(true);
});

test("Android safe area keeps normal and expanded controls above navigation", async ({
  page,
}) => {
  await page.evaluate(() => {
    document.body.classList.remove("web-route-card");
    document.documentElement.style.setProperty("--safe-area-inset-top", "28px");
    document.documentElement.style.setProperty(
      "--safe-area-inset-bottom",
      "45px",
    );
  });
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const safeBottom = () => page.evaluate(() => innerHeight - 45);
  const save = await page.locator("#create-save").boundingBox();
  expect(save!.y + save!.height).toBeLessThanOrEqual(await safeBottom());
  await page.locator("#expand-card").click();
  for (const selector of ["#create-share", "#create-pdf"]) {
    const rect = await page.locator(selector).boundingBox();
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(await safeBottom());
  }
  await page.locator("#expand-card").click();
  await page.locator("#expand").click();
  const metric = await page.locator("#descent").boundingBox();
  expect(metric!.y + metric!.height).toBeLessThanOrEqual(await safeBottom());
  await page.locator("#help").click();
  const dialog = await page.locator("#dialog").boundingBox();
  expect(dialog!.y).toBeGreaterThanOrEqual(28);
  expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(await safeBottom());
  await page.getByRole("button", { name: "Done", exact: true }).click();
  // Keyboard/native-inset changes must remove the extra gap automatically.
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      "--safe-area-inset-bottom",
      "0px",
    ),
  );
  expect(
    await page
      .locator("main")
      .evaluate((el) => getComputedStyle(el).paddingBottom),
  ).toBe("16px");
});

test("About scrolls its text while keeping the title and close control visible", async ({
  page,
}, testInfo) => {
  await page.locator("#help").click();
  const dialog = page.locator("#dialog"),
    guide = page.locator("#about-guide");
  await expect(dialog.locator(".about-logo")).toHaveCount(0);
  await expect(dialog.locator(".dialog-logo")).toHaveCount(1);
  await expect(dialog.locator(".about-overview")).not.toContainText(
    "BareGPS Route Maker",
  );
  await expect(dialog).not.toContainText("Keyboard shortcuts");
  await expect(dialog).not.toContainText("Storage, privacy and limitations");
  await expect(dialog).not.toContainText("On iOS and Android");
  await expect(dialog).not.toContainText("Heights are not smoothed");
  await expect(dialog).not.toContainText("Legs are sampled");
  await expect(dialog).toContainText(
    "Note that OpenTopoMap needs data access to load maps and/or terrain.",
  );
  await expect(page.locator(".brand-subtitle")).toHaveText(
    "Hiking Route Creator",
  );
  await expect(dialog).toContainText(
    "Expanding Route Card allows sharing of your route either in text or PDF format.",
  );
  await expect(dialog).toContainText(
    "Settings also includes Colouring and Point Naming options.",
  );
  await expect(dialog).toContainText("Your preferences are retained.");
  const maps = guide
    .locator("details")
    .filter({ hasText: "Maps, coordinates and Settings" });
  await expect(
    maps.locator(".about-section-content p").first().locator("svg"),
  ).toHaveCount(2);
  for (const summary of await guide.locator("summary").all())
    await summary.click();
  const titleBefore = await dialog.locator("#dialog-title").boundingBox();
  const close = dialog.getByRole("button", {
    name: "Close dialog",
    exact: true,
  });
  const closeBefore = await close.boundingBox();
  await guide.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await guide.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect((await dialog.locator("#dialog-title").boundingBox())!.y).toBe(
    titleBefore!.y,
  );
  expect((await close.boundingBox())!.y).toBe(closeBefore!.y);
  await expect(close).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("about-scrolled.png") });
  const bounds = await dialog.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    await page.evaluate(() => innerHeight),
  );
  await close.click();
  await expect(dialog).not.toBeVisible();
});

test("every route point remains in the card, restored workspace and text share", async ({
  page,
}, testInfo) => {
  await page.evaluate(async () => {
    const request = indexedDB.open("keyval-store", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("keyval"))
          request.result.createObjectStore("keyval");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction("keyval", "readwrite");
    tx.objectStore("keyval").put(
      {
        version: 1,
        created: {
          id: "all-points-route",
          name: "All points",
          source: "Created in BareGPS",
          kind: "route",
          color: "#16724d",
          points: Array.from({ length: 1001 }, (_, i) => ({
            lat: 53 + i * 0.00001,
            lon: -6,
            name: i === 1000 ? "Last" : `P${i}`,
          })),
        },
      },
      "baregps-route-maker-workspace-v1",
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.locator("#waypoint-count")).toHaveText("1001");
  await expect(page.locator("#waypoint-rows tr")).toHaveCount(1001);
  await expect(page.locator("#card-detail-toggle")).toHaveCount(0);
  await page.locator("#expand-card").click();
  await page.locator("#create-share").click();
  await expect(page.locator("#routecard-text")).toContainText(
    "Point 1001 · Last · End",
  );
  expect(
    (await page.locator("#routecard-text").inputValue()).match(/^Point /gm),
  ).toHaveLength(1001);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const withoutNames = page.waitForEvent("download");
  await page.locator("#create-pdf").click();
  await (
    await withoutNames
  ).saveAs(testInfo.outputPath("all-points-route-card-no-names.pdf"));
  await page.locator("#settings").click();
  await page.locator("#allow-point-naming").click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.locator("#create-pdf").click();
  await (
    await download
  ).saveAs(testInfo.outputPath("all-points-route-card.pdf"));
});

test("Fit is unavailable for an empty route and does not reset the map centre", async ({
  page,
}) => {
  await expect(page.locator("#fit")).toBeDisabled();
  await page.locator("#create-map").click({ position: { x: 100, y: 100 } });
  await page.locator("#create-map").click({ position: { x: 180, y: 180 } });
  await expect(page.locator("#fit")).toBeEnabled();
  await page.locator("#fit").click();
  await expect(
    page.locator(
      "#create-map .leaflet-pan-anim, #create-map .leaflet-zoom-anim",
    ),
  ).toHaveCount(0);
  await page.locator("#create-reset").click();
  await page.locator("#confirm-reset-created").click();
  await expect(page.locator("#fit")).toBeDisabled();
  let lastCentre = "",
    stable = 0;
  await expect
    .poll(
      async () => {
        const current =
          (await page.locator("#create-coordinates").textContent()) ?? "";
        stable = current === lastCentre ? stable + 1 : 0;
        lastCentre = current;
        return stable;
      },
      { intervals: [150] },
    )
    .toBeGreaterThanOrEqual(3);
  const centre = lastCentre;
  await page.locator("#fit").dispatchEvent("click");
  await expect(page.locator("#create-coordinates")).toHaveText(centre!);
});

test("Apply colour only enables for a valid unapplied change", async ({
  page,
}) => {
  await page.locator("#settings").click();
  const apply = page.locator("#apply-colour"),
    field = page.locator("#colour-hex");
  const original = await field.inputValue();
  await expect(apply).toBeDisabled();
  await field.fill("#AA3344");
  await expect(apply).toBeEnabled();
  await field.fill(original);
  await expect(apply).toBeDisabled();
  await field.fill("#AA3344");
  await apply.click();
  await expect(apply).toBeDisabled();
  await field.fill("#12");
  await expect(apply).toBeDisabled();
  await field.fill("#223344");
  await expect(apply).toBeEnabled();
});

test("Settings keeps its title, X and Done visible while its options scroll", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 430 });
  await page.locator("#settings").click();
  const body = page.locator(".settings-dialog-body"),
    title = page.locator("#dialog-title"),
    close = page.getByRole("button", { name: "Close dialog", exact: true }),
    done = page.getByRole("button", { name: "Done", exact: true });
  const before = {
    title: (await title.boundingBox())!.y,
    close: (await close.boundingBox())!.y,
    done: (await done.boundingBox())!.y,
  };
  await body.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect((await title.boundingBox())!.y).toBe(before.title);
  expect((await close.boundingBox())!.y).toBe(before.close);
  expect((await done.boundingBox())!.y).toBe(before.done);
  await expect(close).toBeInViewport();
  await expect(done).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("settings-scrolled.png") });
  await done.click();
  await expect(page.locator("#dialog")).not.toBeVisible();
});

test("Colour choices form two centred rows of seven and retain hex entry", async ({
  page,
}, testInfo) => {
  await page.locator("#settings").click();
  const presets = page.locator(".colour-preset");
  await expect(presets).toHaveCount(14);
  await expect(page.locator("hex-color-picker")).toHaveCount(0);
  const names = ["Red", "Green", "Yellow", "Blue", "White", "Black", "Grey"];
  for (let i = 0; i < names.length; i++)
    await expect(presets.nth(i)).toHaveAttribute(
      "aria-label",
      `Use ${names[i]}`,
    );
  const boxes = await presets.evaluateAll((elements) =>
    elements.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width };
    }),
  );
  const panel = (await page.locator(".colour-presets").boundingBox())!;
  for (let row = 0; row < 2; row++) {
    const first = boxes[row * 7],
      last = boxes[row * 7 + 6];
    expect(
      Math.abs(
        (first.x + last.x + last.width) / 2 - (panel.x + panel.width / 2),
      ),
    ).toBeLessThan(1);
    for (let col = 0; col < 7; col++)
      expect(boxes[row * 7 + col].y).toBe(first.y);
  }
  expect(boxes[7].y).toBeGreaterThan(boxes[0].y);
  await page.getByRole("button", { name: "Use Red", exact: true }).click();
  await expect(page.locator("#colour-hex")).toHaveValue("#FF0000");
  await expect(page.locator("#apply-colour")).toBeEnabled();
  await page.locator("#apply-colour").click();
  await expect(page.locator("#apply-colour")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Use Red", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("settings-colours.png") });
});
