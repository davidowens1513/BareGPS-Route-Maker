import { it, expect } from "vitest";
import {
  emptyWorkspace,
  validateWorkspace,
  restoreDrawingWorkspace,
  analytics,
  exportGPX,
} from "../src/model";
import { newCreatedRoute } from "../src/create";
it("validates and restores drawings without retaining Editor state", () => {
  const created = {
    ...newCreatedRoute(),
    points: [
      { lat: 53, lon: -6 },
      { lat: 53.001, lon: -6 },
    ],
  };
  const saved = {
    ...emptyWorkspace(),
    created,
    createdTerrain: structuredClone(created),
    tracks: [{ id: "old" }],
    routePlan: [{}],
  };
  expect(validateWorkspace(saved)).toBe(true);
  const restored = restoreDrawingWorkspace(saved);
  expect(restored).toEqual({ version: 1, created, createdTerrain: created });
  expect(restored.created).not.toBe(saved.created);
  expect(saved.tracks).toHaveLength(1);
});
it("accepts large drawings while rejecting invalid points and oversized terrain jobs", () => {
  const created = newCreatedRoute();
  expect(validateWorkspace(emptyWorkspace())).toBe(true);
  expect(validateWorkspace({ version: 2 })).toBe(false);
  expect(
    validateWorkspace({
      version: 1,
      created: { ...created, points: Array(6001).fill({ lat: 53, lon: -6 }) },
    }),
  ).toBe(true);
  expect(
    validateWorkspace({
      version: 1,
      createdTerrain: {
        ...created,
        points: Array(5001).fill({ lat: 53, lon: -6 }),
      },
    }),
  ).toBe(false);
  expect(
    validateWorkspace({
      version: 1,
      created: { ...created, points: [{ lat: NaN, lon: -6 }] },
    }),
  ).toBe(false);
  expect(
    validateWorkspace({
      version: 1,
      created: { ...created, points: [{ lat: 53, lon: -6, ele: Infinity }] },
    }),
  ).toBe(false);
});
it("keeps full route metrics and escapes names in exported GPX", () => {
  const route = {
    ...newCreatedRoute(),
    name: "Gate & <hill>",
    points: [
      { lat: 53, lon: -6, ele: 10 },
      { lat: 53.001, lon: -6, ele: 30 },
      { lat: 53.002, lon: -6, ele: 20 },
    ],
  };
  expect(analytics(route.points).ascent).toBe(20);
  expect(analytics(route.points).descent).toBe(10);
  const doc = new DOMParser().parseFromString(
    exportGPX(route),
    "application/xml",
  );
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(doc.querySelector("trk name")!.textContent).toBe(route.name);
  expect(doc.querySelectorAll("trkpt")).toHaveLength(3);
});
