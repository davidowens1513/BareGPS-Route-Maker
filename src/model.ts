export interface Point {
  lat: number;
  lon: number;
  name?: string;
  ele?: number;
  time?: string;
  gapBefore?: boolean;
  terrain?: boolean;
  terrainPending?: boolean;
}
export interface Track {
  id: string;
  name: string;
  color: string;
  points: Point[];
  source: string;
  kind: "track" | "route";
  terrainNeedsRefresh?: boolean;
}
export interface Workspace {
  version: 1;
  created?: Track;
  createdTerrain?: Track;
}
export const MAX_POINTS = 5000;
export const COLORS = [
  { name: "Red", color: "#ff0000" },
  { name: "Green", color: "#16724d" },
  { name: "Yellow", color: "#ffff00" },
  { name: "Blue", color: "#0000ff" },
  { name: "White", color: "#ffffff" },
  { name: "Black", color: "#000000" },
  { name: "Grey", color: "#808080" },
  { name: "Orange", color: "#ff8000" },
  { name: "Lime", color: "#80c000" },
  { name: "Turquoise", color: "#00a6a6" },
  { name: "Sky blue", color: "#00bfff" },
  { name: "Pink", color: "#ff69b4" },
  { name: "Purple", color: "#800080" },
  { name: "Brown", color: "#8b4513" },
];
export const uid = () => crypto.randomUUID();
export const emptyWorkspace = (): Workspace => ({ version: 1 });
export function distance(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return (
    6371008.8 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
export function analytics(points: Point[]) {
  let length = 0,
    ascent = 0,
    descent = 0,
    gapDistance = 0,
    missingEdges = 0,
    estimatedGap = false;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      d = distance(a, b);
    length += d;
    if (b.gapBefore) {
      gapDistance += d;
      if (!b.terrain) estimatedGap = true;
    }
    if (a.ele === undefined || b.ele === undefined) {
      missingEdges++;
      continue;
    }
    const delta = b.ele - a.ele;
    if (delta > 0) ascent += delta;
    else descent -= delta;
  }
  const elevations = points.flatMap((p) =>
    p.ele === undefined ? [] : [p.ele],
  );
  return {
    length,
    ascent,
    descent,
    gapDistance,
    missingEdges,
    estimatedGap,
    min: elevations.length
      ? elevations.reduce((a, b) => Math.min(a, b), Infinity)
      : undefined,
    max: elevations.length
      ? elevations.reduce((a, b) => Math.max(a, b), -Infinity)
      : undefined,
  };
}
const escapeXML = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function exportGPX(track: Track): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="BareGPS Route Maker" xmlns="http://www.topografix.com/GPX/1/1" xmlns:b="https://baregps.app/gpx/1"><metadata><name>${escapeXML(track.name)}</name><desc>Dashed gaps are straight-line walking connections included in distance and ascent. Elevation may be estimated.</desc></metadata><trk><name>${escapeXML(track.name)}</name><extensions><b:color>${track.color}</b:color></extensions><trkseg>\n${track.points.map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}">${p.ele !== undefined ? `<ele>${p.ele}</ele>` : ""}${p.time ? `<time>${escapeXML(p.time)}</time>` : ""}${p.name ? `<name>${escapeXML(p.name)}</name>` : ""}${p.gapBefore || p.terrainPending ? `<extensions>${p.gapBefore ? "<b:gapBefore>true</b:gapBefore>" : ""}${p.gapBefore && p.terrain ? "<b:terrain>true</b:terrain>" : ""}${p.terrainPending ? "<b:terrainPending>true</b:terrainPending>" : ""}</extensions>` : ""}</trkpt>`).join("\n")}\n</trkseg></trk></gpx>\n`;
}

export function validateWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== "object") return false;
  const w = value as Workspace;
  if (w.version !== 1) return false;
  return [
    [w.created, Number.POSITIVE_INFINITY, 0],
    [w.createdTerrain, MAX_POINTS, 2],
  ].every(([value, max, min]) => {
    if (value === undefined) return true;
    const t = value as Track;
    return (
      t &&
      typeof t.id === "string" &&
      /^[a-z0-9-]{1,64}$/i.test(t.id) &&
      typeof t.name === "string" &&
      typeof t.source === "string" &&
      ["route", "track"].includes(t.kind) &&
      /^#[0-9a-f]{6}$/i.test(t.color) &&
      Array.isArray(t.points) &&
      t.points.length >= (min as number) &&
      t.points.length <= (max as number) &&
      t.points.every(
        (p) =>
          p &&
          Number.isFinite(p.lat) &&
          Math.abs(p.lat) <= 90 &&
          Number.isFinite(p.lon) &&
          Math.abs(p.lon) <= 180 &&
          (p.ele === undefined || Number.isFinite(p.ele)) &&
          (p.name === undefined || typeof p.name === "string") &&
          (p.time === undefined || typeof p.time === "string") &&
          (p.gapBefore === undefined || typeof p.gapBefore === "boolean") &&
          (p.terrain === undefined || typeof p.terrain === "boolean") &&
          (p.terrainPending === undefined ||
            typeof p.terrainPending === "boolean"),
      )
    );
  });
}
export function restoreDrawingWorkspace(saved: Workspace): Workspace {
  return {
    version: 1,
    ...(saved.created ? { created: structuredClone(saved.created) } : {}),
    ...(saved.createdTerrain
      ? { createdTerrain: structuredClone(saved.createdTerrain) }
      : {}),
  };
}
