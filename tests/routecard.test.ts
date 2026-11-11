import { it, expect } from "vitest";
import { routecardText, routecardRows } from "../src/routecard";
import { newCreatedRoute } from "../src/create";
it("formats named and unnamed points with coordinates, distances and available heights", () => {
  const route = {
    ...newCreatedRoute(),
    name: "Hill walk",
    points: [
      { lat: 53, lon: -6, name: "Gate & bridge", ele: 120 },
      { lat: 53.001, lon: -6 },
      { lat: 53.002, lon: -6, name: "Summit", ele: 240 },
    ],
  };
  const text = routecardText(route, "latlon");
  expect(text).toContain("Hill walk — Routecard");
  expect(text).toContain("Point 1 · Gate & bridge · Start");
  expect(text).toContain("Point 3 · Summit · End");
  expect(text).toContain("\nPoint 2\n");
  expect(text).toContain("Height: unavailable");
  expect(text).toContain("Height: 240 m");
  expect(text).toContain("Total: 0.22 km");
  expect(text).toContain("Coordinates: Lat/Long (WGS84)");
  expect(text).not.toContain("undefined");
});

it("sums terrain climbs within each leg and carries cumulative ascent", () => {
  const points = [
    { lat: 53, lon: -6, ele: 100 },
    { lat: 53.002, lon: -6, ele: 100 },
    { lat: 53.004, lon: -6, ele: 130 },
  ];
  const route = { ...newCreatedRoute(), points };
  const terrain = {
    ...route,
    points: [
      points[0],
      { lat: 53.001, lon: -6, ele: 160 },
      points[1],
      points[2],
    ],
  };
  const rows = routecardRows(route, terrain);
  expect(rows.map((r) => r.ascent)).toEqual([0, 60, 30]);
  expect(rows.map((r) => r.totalAscent)).toEqual([0, 60, 90]);
  expect(rows[2].total).toBeCloseTo(rows[1].distance + rows[2].distance);
  const missing = routecardRows({
    ...route,
    points: [points[0], { ...points[1], ele: undefined }, points[2]],
  });
  expect(missing[1].ascent).toBeUndefined();
  expect(missing[2].totalAscent).toBeUndefined();
});

it("keeps every original point and full totals in large cards and shared text", () => {
  const route = {
    ...newCreatedRoute(),
    points: Array.from({ length: 6001 }, (_, i) => ({
      lat: 53 + i * 0.00001,
      lon: -6,
      ele: i % 2 ? 150 : 100,
      ...(i === 47 ? { name: "Gate" } : {}),
    })),
  };
  const before = structuredClone(route);
  const rows = routecardRows(route);
  expect(rows).toHaveLength(6001);
  expect(rows.map((r) => r.index)).toEqual(route.points.map((_, i) => i));
  expect(rows[47].point.name).toBe("Gate");
  expect(rows.reduce((sum, r) => sum + r.distance, 0)).toBeCloseTo(
    rows.at(-1)!.total,
  );
  expect(rows.reduce((sum, r) => sum + r.ascent!, 0)).toBe(
    rows.at(-1)!.totalAscent,
  );
  const text = routecardText(route, "latlon");
  expect(text).toContain("6001 route points");
  expect(text.match(/^Point /gm)).toHaveLength(6001);
  expect(text).toContain("Point 48 · Gate");
  expect(text).toContain("Point 6001 · End");
  expect(route).toEqual(before);
});

it("retains coincident and unnamed points and missing ascent on every row", () => {
  const route = {
    ...newCreatedRoute(),
    points: Array.from({ length: 100 }, (_, i) => ({
      lat: 53,
      lon: -6,
      ...(i !== 51 ? { ele: 100 } : {}),
      ...(i % 2 ? { name: `P${i}` } : {}),
    })),
  };
  const rows = routecardRows(route);
  expect(rows).toHaveLength(100);
  expect(rows.filter((r) => r.point.name)).toHaveLength(50);
  expect(rows[51].ascent).toBeUndefined();
  expect(rows.at(-1)!.totalAscent).toBeUndefined();
  expect(rows.at(-1)!.total).toBe(0);
  expect(routecardRows({ ...route, points: [] })).toEqual([]);
});
