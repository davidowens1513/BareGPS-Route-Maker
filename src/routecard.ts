import { needsTerrain } from "./terrain-state";
import { analytics, type Track } from "./model";
import {
  coordinateSystems,
  formatCoordinate,
  type CoordinateSystem,
} from "./coordinates";

export const ROUTE_CARD_FOOTER = [
  "Distances follow the full route between checkpoints; route legs do not automatically follow paths.",
  "Heights and ascent, where available, are estimates. Check the route is walkable.",
  "Created with BareGPS Route Maker",
] as const;

export function routecardRows(route: Track, terrain?: Track) {
  const sampled = terrain?.points;
  let cursor = 0,
    total = 0,
    totalAscent: number | undefined = 0;
  const rows = route.points.map((point, i) => {
    let segment = i ? [route.points[i - 1], point] : [point];
    if (sampled && i) {
      const end = sampled.findIndex(
        (p, n) => n > cursor && p.lat === point.lat && p.lon === point.lon,
      );
      if (end >= 0) {
        segment = sampled.slice(cursor, end + 1);
        cursor = end;
      }
    }
    const stats = analytics(segment);
    total += stats.length;
    const ascent = stats.missingEdges ? undefined : stats.ascent;
    totalAscent =
      totalAscent === undefined || ascent === undefined
        ? undefined
        : totalAscent + ascent;
    return {
      point,
      index: i,
      distance: stats.length,
      total,
      ascent,
      totalAscent,
    };
  });
  return rows;
}

export function routecardText(
  route: Track,
  system: CoordinateSystem,
  terrain?: Track,
  pointOffset = 0,
): string {
  const rows = routecardRows(route, terrain);
  const km = (value: number) => `${(value / 1000).toFixed(2)} km`;
  const metres = (value: number | undefined) =>
    value === undefined ? "unavailable" : `${Math.round(value)} m`;
  return [
    `${route.name} — Routecard`,
    `${rows.length} route points · ${km(rows.at(-1)?.total ?? 0)}`,
    `Coordinates: ${coordinateSystems[system]}`,
    ...(needsTerrain(terrain ?? route)
      ? ["Terrain incomplete — heights and ascent are partial."]
      : []),
    "",
    ...rows.map(({ point, index, distance, total, ascent, totalAscent }) => {
      const label = [
        `Point ${index + 1 + pointOffset}`,
        point.name?.trim(),
        index === 0 ? "Start" : index === route.points.length - 1 ? "End" : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `${label}\n${formatCoordinate(point, system)}\nLeg: ${km(distance)} · Total: ${km(total)} · Height: ${metres(point.ele)}\nAscent: ${metres(ascent)} · Cumulative ascent: ${metres(totalAscent)}\n`;
    }),
    ...ROUTE_CARD_FOOTER,
  ].join("\n");
}
