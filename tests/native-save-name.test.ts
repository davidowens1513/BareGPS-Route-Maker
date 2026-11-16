import { beforeEach, it, expect, vi } from "vitest";
import { newCreatedRoute } from "../src/create";
const native = vi.hoisted(() => ({
  save: vi.fn(async (_options: { name: string; data: string }) => ({
    saved: true,
  })),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => native,
}));
import { saveTrack } from "../src/files";
beforeEach(() => native.save.mockClear());
it.each(["Edited1", "Wicklow & Glendalough", "Created Route"])(
  "passes route name %s to the native iOS saver and GPX contents",
  async (name) => {
    const route = {
      ...newCreatedRoute(),
      name,
      points: [
        { lat: 53, lon: -6 },
        { lat: 53.01, lon: -6 },
      ],
    };
    await saveTrack(route);
    const options = native.save.mock.calls[0][0];
    expect(options.name).toBe(`${name}.gpx`);
    const xml = new TextDecoder().decode(
      Uint8Array.from(atob(options.data), (c) => c.charCodeAt(0)),
    );
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    expect(doc.querySelector("metadata > name")!.textContent).toBe(name);
    expect(doc.querySelector("trk > name")!.textContent).toBe(name);
  },
);
it("sanitizes only the filename while keeping the full route name inside GPX", async () => {
  await saveTrack({
    ...newCreatedRoute(),
    name: "Wicklow / route",
    points: [
      { lat: 53, lon: -6 },
      { lat: 53.01, lon: -6 },
    ],
  });
  const options = native.save.mock.calls[0][0];
  expect(options.name).toBe("Wicklow  route.gpx");
  expect(atob(options.data)).toContain("<name>Wicklow / route</name>");
});
