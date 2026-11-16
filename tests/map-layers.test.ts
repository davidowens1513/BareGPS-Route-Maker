import { beforeEach, afterEach, it, expect, vi } from "vitest";
import L from "leaflet";
import { TrackMap } from "../src/map";
let view: TrackMap;
beforeEach(() => {
  document.body.innerHTML = '<div id="create-map"></div>';
  view = new TrackMap(vi.fn());
  view.map.setView([53, -6], 16, { animate: false });
});
afterEach(() => view.map.remove());
it("swaps only the basemap, preserves centre/zoom and replaces attribution", () => {
  const centre = view.map.getCenter(),
    zoom = view.map.getZoom();
  const tiles = () => {
    const result: L.TileLayer[] = [];
    view.map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) result.push(layer);
    });
    return result;
  };
  const old = tiles()[0];
  view.setBaseLayer("satellite");
  expect(view.map.getCenter()).toEqual(centre);
  expect(view.map.getZoom()).toBe(zoom);
  expect(tiles()).toHaveLength(1);
  expect(tiles()[0].getAttribution()).toContain("Esri");
  expect(
    document.querySelector(".leaflet-control-attribution")!.textContent,
  ).not.toContain("OpenTopoMap");
  const tile = document.createElement("img");
  document.body.append(tile);
  old.fire("tileerror", { tile });
  expect(view.hasTileError()).toBe(false);
  tiles()[0].fire("tileerror", { tile });
  expect(view.hasTileError()).toBe(true);
  view.setBaseLayer("opentopo");
  expect(view.hasTileError()).toBe(false);
  expect(tiles()[0].getAttribution()).toContain("OpenTopoMap");
  tile.remove();
});
