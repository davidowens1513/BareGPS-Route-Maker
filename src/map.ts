import L from "leaflet";
import { mapLayers, type MapLayer } from "./map-layers";
import type { Track, Point } from "./model";
import { routeTapIndex, isClosedRoute, type DrawingMode } from "./create";
export const HOME_CENTER: L.LatLngTuple = [51.99947, -9.74269];
export const HOME_ZOOM = 13;
export class TrackMap {
  map: L.Map;
  protected layers = L.layerGroup();
  private positionLayers = L.layerGroup();
  private tileLayer!: L.TileLayer;
  private baseLayer: MapLayer | null = null;
  private tileFailed = false;
  private failedTiles = new Set<HTMLElement>();
  constructor(private onTileError: (failed: boolean) => void) {
    this.map = L.map("create-map", {
      zoomControl: false,
      preferCanvas: true,
      attributionControl: true,
    }).setView(HOME_CENTER, HOME_ZOOM);
    this.map.attributionControl.setPosition("bottomright");
    this.setBaseLayer("opentopo");
    window.addEventListener("online", () => {
      if (this.tileFailed) this.retryTiles();
    });
    this.layers.addTo(this.map);
    L.control
      .scale({ position: "bottomleft", imperial: false })
      .addTo(this.map);
    L.control.zoom({ position: "bottomleft" }).addTo(this.map);
  }
  setBaseLayer(selected: MapLayer) {
    if (selected === this.baseLayer) return;
    if (this.tileLayer) {
      this.tileLayer.remove();
      this.tileLayer.off();
    }
    this.baseLayer = selected;
    this.failedTiles.clear();
    this.tileFailed = false;
    if (this.baseLayer !== null && this.tileLayer) this.onTileError(false);
    const config = mapLayers[selected];
    const layer = L.tileLayer(config.url, config.options);
    this.tileLayer = layer;
    const refreshTileWarning = () => {
      for (const tile of this.failedTiles)
        if (!tile.isConnected) this.failedTiles.delete(tile);
      const failed = this.failedTiles.size > 0;
      if (failed !== this.tileFailed) {
        this.tileFailed = failed;
        this.onTileError(failed);
      }
    };
    layer.on("tileerror", (event: L.TileErrorEvent) => {
      if (event.tile.isConnected) this.failedTiles.add(event.tile);
      refreshTileWarning();
    });
    const removeFailedTile = (event: L.TileEvent) => {
      this.failedTiles.delete(event.tile);
      refreshTileWarning();
    };
    layer.on("tileload", removeFailedTile);
    layer.on("tileunload", removeFailedTile);
    layer.addTo(this.map);
  }
  home() {
    this.map.setView(HOME_CENTER, HOME_ZOOM, { animate: false });
  }
  hasTileError() {
    return this.tileFailed;
  }
  retryTiles() {
    this.failedTiles.clear();
    this.tileFailed = false;
    this.onTileError(false);
    this.tileLayer.redraw();
  }
  showPosition(
    point: { lat: number; lon: number; accuracy: number },
    centre: boolean,
  ) {
    this.positionLayers.clearLayers();
    this.positionLayers.addTo(this.map);
    const position: L.LatLngTuple = [point.lat, point.lon];
    L.circle(position, {
      radius: point.accuracy,
      color: "#1976d2",
      weight: 1,
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(this.positionLayers);
    L.circleMarker(position, {
      radius: 7,
      color: "white",
      weight: 3,
      fillColor: "#1976d2",
      fillOpacity: 1,
      interactive: false,
    }).addTo(this.positionLayers);
    if (centre) {
      this.map.invalidateSize({ pan: false });
      this.map.setView(
        position,
        Math.min(17, Math.max(this.map.getZoom(), 15)),
      );
      if (point.accuracy > 300)
        this.map.fitBounds(L.latLng(position).toBounds(point.accuracy * 2), {
          maxZoom: 15,
        });
    }
  }
  protected handleIcon(label: string, offset: number) {
    return L.divIcon({
      className: "track-handle",
      html: `<span>${label}</span>`,
      iconSize: [32, 40],
      iconAnchor: [16 - offset, 36],
    });
  }
  fit(tracks: Track[]) {
    // Construction happens while the drawing panel is hidden. Refresh its size
    // even with no route, so the initial tile grid fills the visible map.
    this.map.invalidateSize({ pan: false });
    const coords = tracks.flatMap((t) =>
      t.points.map((p) => [p.lat, p.lon] as L.LatLngTuple),
    );
    if (!coords.length) return;
    this.map.fitBounds(L.latLngBounds(coords).pad(0.15), { maxZoom: 16 });
  }
}
export class CreateMap extends TrackMap {
  selectedIndex: number | null = null;
  onSelect: (index: number) => void = () => {};
  drawingMode: DrawingMode = "add";
  enabled = true;
  private draggingPoint = false;
  private current: Track | null = null;
  private segments: L.Polyline[] = [];
  constructor(
    private onAdd: (index: number, point: Point) => void,
    private onMove: (index: number, point: Point) => void,
    private onPreview: (index: number, point: Point) => void,
    onTileError: (failed: boolean) => void,
  ) {
    super(onTileError);
    this.map.doubleClickZoom.disable();
    this.map.on("click", (event: L.LeafletMouseEvent) => {
      if (this.enabled && !this.draggingPoint && this.current) {
        const index = routeTapIndex(
          this.drawingMode,
          this.current.points.length,
        );
        if (index !== null) this.onAdd(index, this.coordinate(event.latlng));
      }
    });
  }
  private coordinate(pos: L.LatLng): Point {
    return { lat: pos.lat, lon: pos.wrap().lng };
  }
  renderCreated(route: Track) {
    if (this.draggingPoint) return;
    this.current = route;
    this.layers.clearLayers();
    this.segments = [];
    route.points.forEach((point, index) => {
      if (!index) return;
      const previous = route.points[index - 1];
      const coords: L.LatLngTuple[] = [
        [previous.lat, previous.lon],
        [point.lat, point.lon],
      ];
      const options = {
        bubblingMouseEvents: false,
        interactive: this.drawingMode === "insert",
      };
      const hit = L.polyline(coords, {
        ...options,
        weight: 24,
        opacity: 0,
        className: "create-segment-hit",
      }).addTo(this.layers);
      const line = L.polyline(coords, {
        ...options,
        weight: 4,
        color: route.color,
        className: "create-segment",
      }).addTo(this.layers);
      const insert = (event: L.LeafletMouseEvent) => {
        const target = routeTapIndex(
          this.drawingMode,
          route.points.length,
          index,
        );
        if (this.enabled && target !== null)
          this.onAdd(target, this.coordinate(event.latlng));
      };
      hit.on("click", insert);
      line.on("click", insert);
      this.segments.push(hit, line);
    });
    route.points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lon], {
        draggable: this.enabled,
        autoPan: true,
        bubblingMouseEvents: false,
        icon: this.handleIcon(
          String(index + 1),
          isClosedRoute(route)
            ? index === 0
              ? -19
              : index === route.points.length - 1
                ? 19
                : 0
            : 0,
        ),
        title: `Route point ${index + 1} · drag to move`,
        keyboard: true,
      }).addTo(this.layers);
      marker
        .getElement()
        ?.classList.toggle("selected", this.selectedIndex === index);
      marker.on("click", () => {
        if (this.enabled) this.onSelect(index);
      });
      marker.on("dragstart", () => {
        this.draggingPoint = true;
        this.onSelect(index);
      });
      marker.on("drag", () => {
        const pos = marker.getLatLng();
        const preview = route.points.map((p, i) =>
          i === index ? this.coordinate(pos) : p,
        );
        this.segments.forEach((segment, i) => {
          const end = Math.floor(i / 2) + 1;
          segment.setLatLngs([
            [preview[end - 1].lat, preview[end - 1].lon],
            [preview[end].lat, preview[end].lon],
          ]);
        });
        this.onPreview(index, this.coordinate(pos));
      });
      marker.on("dragend", () => {
        this.draggingPoint = false;
        this.onMove(index, this.coordinate(marker.getLatLng()));
      });
    });
  }
}
