import "leaflet/dist/leaflet.css";
import "./style.css";
import { aboutGuide } from "./about";
import { get, set } from "idb-keyval";
import { Capacitor } from "@capacitor/core";
import {
  analytics,
  COLORS,
  emptyWorkspace,
  restoreDrawingWorkspace,
  validateWorkspace,
  type Track,
} from "./model";
import { saveTrack, shareRoutecard, sharePDF, isCancelled } from "./files";
import { TrackMap, CreateMap } from "./map";
import { icon } from "./icons";
import { routecardText, routecardRows, SUMMARY_CARD_POINTS } from "./routecard";
import "vanilla-colorful/hex-color-picker.js";
import type { HexColorPicker } from "vanilla-colorful/hex-color-picker.js";
import { enrichTerrain } from "./terrain";
import { getDevicePosition, locationError } from "./location";
let locating = false;
import {
  coordinateSystems,
  formatCoordinate,
  isCoordinateSystem,
  type CoordinateSystem,
} from "./coordinates";
let coordinateSystem: CoordinateSystem = "latlon";
const COORDINATE_KEY = "baregps-route-maker-coordinate-system-v1";
let allowPointNaming = false;
const POINT_NAMING_KEY = "baregps-route-maker-allow-point-naming-v1";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const km = (n: number) =>
  (n / 1000).toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const metres = (n: number) => Math.round(n).toLocaleString("en-IE");
let workspace = emptyWorkspace();
let expanded = false,
  busy = false,
  saveTimer: ReturnType<typeof setTimeout>,
  saveQueue = Promise.resolve();
let terrainController: AbortController | null = null;
const dismissedTileWarning = { create: false, edit: false };
import {
  newCreatedRoute,
  insertWaypoint,
  moveWaypoint,
  removeWaypoint,
  closeRoute,
  isClosedRoute,
  type DrawingMode,
} from "./create";
let cardExpanded = false;
let drawingMode: DrawingMode = "add";
let selectedCreatePoint: number | null = null;
type CreatedSnapshot = {
  route: Track;
  terrain?: Track;
};
let createUndo: CreatedSnapshot[] = [],
  createRedo: CreatedSnapshot[] = [];
const draft = () => (workspace.created ??= newCreatedRoute());
const createdTrack = () => workspace.createdTerrain ?? draft();
const visibleMap = () => createMap;
const STORAGE_KEY = "baregps-route-maker-workspace-v1";
const CONNECTION_ELEVATION_NOTE =
  "Connection distance is included. Connection ascent uses endpoint heights until you fetch terrain; intermediate hills may be missed.";
document.querySelector("#app")!.innerHTML = `
<header class="app-header"><a class="brand" href="#" aria-label="BareGPS Route Maker home"><img src="${import.meta.env.BASE_URL}logo.svg" alt="" width="40" height="40"><span class="brand-copy"><strong class="brand-title">BareGPS Route Maker</strong><span class="brand-subtitle">Walking Route Creator</span></span></a><div class="header-right"><div class="device-status"><span id="save-state" class="save-state" role="status" title="Your workspace is kept on this device. Use Save Route to export a GPX file."><span class="save-full">On your device</span><span class="save-short" aria-hidden="true">On device</span></span><div class="history" role="group" aria-label="Edit history"><button id="undo" class="icon-button" aria-label="Undo" title="Undo (⌘/Ctrl Z)">${icon("undo", 18)}</button><button id="redo" class="icon-button" aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)">${icon("redo", 18)}</button></div></div><div class="header-utilities"><button id="help" class="icon-button" aria-label="About and keyboard shortcuts">${icon("help")}</button><button id="settings" class="icon-button" aria-label="Settings" title="Settings">${icon("settings", 19)}</button></div></div></header>
<main>
  <span id="track-count" class="sr-only">Your workspace</span>
  <section id="map-panel" class="map-panel" aria-label="Track map">
    <div class="map-toolbar"><span class="map-label">${icon("mountain", 18)}<strong>OpenTopoMap</strong><span class="terrain-label">TERRAIN</span></span><div class="map-actions"><button id="fit" class="icon-button" aria-label="Fit tracks to map" title="Fit tracks">${icon("fit", 18)}</button><button id="expand" class="icon-button" aria-label="Expand map" title="Expand map">${icon("expand", 18)}</button></div></div>
    <div id="create-map-view" role="region" aria-label="Route creation map" hidden><div id="create-map" aria-label="Create a walking route"></div><button id="create-locate" class="icon-button map-locate" aria-label="Go to current position" title="Go to current position">${icon("locate", 21)}</button><span id="create-coordinates" class="map-coordinates" aria-label="Map centre coordinates"></span><p class="create-map-hint" id="create-map-hint">Tap the map to place your starting point.</p></div>
    <div id="create-tools" class="create-tools" role="group" aria-label="Route drawing controls" hidden><div class="drawing-modes" role="group" aria-label="Drawing mode"><button id="draw-add" aria-pressed="true">Add points</button><button id="draw-insert" aria-pressed="false">Insert point</button><button id="create-delete" disabled>Delete point</button><button id="create-close">Close loop</button></div></div>
    <div id="create-map-error" class="map-error" hidden><span>Some map tiles couldn’t load. Editing still works.</span><div class="map-warning-actions"><button id="retry-create-map" class="text-button">Retry</button><button id="dismiss-create-map" class="icon-button" aria-label="Dismiss map warning">${icon("close", 16)}</button></div></div>
  </section>
  <section id="analytics" class="analytics" aria-label="Live track analytics"><div class="metric"><span>${icon("route", 17)} Distance(km)</span><strong id="distance">0.00</strong></div><div class="metric"><span>${icon("up", 17)} Ascent(m)</span><strong id="ascent">u/a</strong></div><div class="metric"><span>${icon("down", 17)} Descent(m)</span><strong id="descent">u/a</strong></div><div class="metric selection-metric"><span>${icon("pin", 17)} <span id="selection-caption">SELECTED TRACK</span></span><strong id="point-count">No track selected</strong><span id="analytics-source" class="metric-note">Open a file to begin</span></div></section>
  <section class="profile-card" aria-label="Elevation profile"><div class="profile-heading"><span>ELEVATION PROFILE</span><span id="profile-range"></span></div><div id="profile"></div><div class="profile-note-slot"><div id="elevation-note" class="elevation-note" role="status" aria-live="polite"></div></div></section>
  <section id="create-card" class="card create-card" aria-label="Route Card" hidden>
    <div class="card-heading"><h2>Route Card <span id="waypoint-count" class="badge">0</span></h2><button id="card-detail-toggle" class="button secondary compact" aria-pressed="false" hidden>Full Card</button><button id="expand-card" class="icon-button" aria-label="Expand Route Card" aria-expanded="false" title="Expand Route Card">${icon("expand", 18)}</button></div>
    <p id="card-summary-note" class="card-source-note" hidden></p>
    <div class="create-settings"><label><span id="card-name-label">Route name</span><input id="create-name" class="text-input" maxlength="120" value="Created Route"></label></div>
    <div class="waypoint-scroll" role="region" aria-label="Route points" tabindex="0"><table class="waypoint-table"><caption class="sr-only">Route points in walking order</caption><colgroup><col class="point-col"><col class="name-col"><col class="grid-col"><col class="height-col"><col class="card-extra distance-col"><col class="card-extra cumulative-distance-col"><col class="card-extra ascent-col"><col class="card-extra cumulative-ascent-col"><col class="compact-delete"></colgroup><thead><tr><th scope="col">Point</th><th class="point-name-cell" scope="col">Name</th><th id="coordinate-heading" scope="col">Grid ref.</th><th scope="col">Height<span class="heading-unit">(m)</span></th><th class="card-extra distance-cell" scope="col">Distance<span class="heading-unit">(km)</span></th><th class="card-extra" scope="col">Cumul<br>Distance<span class="heading-unit">(km)</span></th><th class="card-extra" scope="col">Ascent<span class="heading-unit">(m)</span></th><th class="card-extra" scope="col">Cumul<br>Ascent<span class="heading-unit">(m)</span></th><th class="compact-delete" scope="col"><span class="sr-only">Delete point</span></th></tr></thead><tbody id="waypoint-rows"></tbody></table></div>
    <div class="card-share-actions card-extra"><button id="create-share" class="button secondary">${icon("export", 17)}Share Text</button><button id="create-pdf" class="button secondary">${icon("file", 17)}Share PDF</button></div>
    <div class="create-buttons"><button id="create-terrain" class="button secondary">${icon("mountain", 17)}Fetch Terrain</button><button id="create-clear" class="button secondary">${icon("trash", 17)}Clear route</button><button id="create-save" class="button primary">${icon("export", 17)}Save Route</button></div>
  </section>
  <footer><span>Your files stay on your device. Map & terrain requests use the internet.</span></footer>
</main>
<div id="notice" class="notice" role="status" hidden></div>
<dialog id="dialog"><div id="dialog-content"></div></dialog>
`;
document.body.classList.toggle("web-route-card", !Capacitor.isNativePlatform());
const createMap = new CreateMap(
  (index, point) => {
    if (
      changeCreated(() => insertWaypoint(draft(), index, point)) &&
      drawingMode === "insert"
    ) {
      drawingMode = "add";
      render();
    }
  },
  (index, point) => {
    changeCreated(() => moveWaypoint(draft(), index, point));
    renderMap();
  },
  (index, point) => {
    const preview = {
      ...draft(),
      points: draft().points.map((p, i) =>
        i === index ? point : { lat: p.lat, lon: p.lon },
      ),
    };
    renderStats(preview);
  },
  (failed) => {
    if (!failed) dismissedTileWarning.create = false;
    $("create-map-error").hidden = !failed || dismissedTileWarning.create;
  },
);
createMap.onSelect = (index) => {
  if (busy) return;
  selectedCreatePoint = index;
  createMap.selectedIndex = index;
  $<HTMLButtonElement>("create-delete").disabled = false;
  renderMap();
};
createMap.map.on("moveend resize", () =>
  updateMapCoordinates("create", createMap),
);
function updateMapCoordinates(name: string, view: TrackMap) {
  const centre = view.map.getCenter().wrap();
  const attribution = view.map
    .getContainer()
    .querySelector<HTMLElement>(".leaflet-control-attribution");
  if (attribution) {
    $(name + "-coordinates").style.bottom = `${attribution.offsetHeight + 2}px`;
    view.map
      .getContainer()
      .style.setProperty(
        "--map-attribution-height",
        `${attribution.offsetHeight}px`,
      );
  }
  $(name + "-coordinates").textContent =
    `Centre · ${formatCoordinate({ lat: centre.lat, lon: centre.lng }, coordinateSystem)}`;
  $(name + "-coordinates").title = coordinateSystems[coordinateSystem];
}
for (const name of ["create"])
  $(name + "-locate").onclick = goToCurrentPosition;
function renderLocationButtons() {
  for (const name of ["create"]) {
    const button = $<HTMLButtonElement>(name + "-locate");
    button.disabled = locating;
    button.setAttribute("aria-busy", String(locating));
    button.setAttribute(
      "aria-label",
      locating ? "Finding current position" : "Go to current position",
    );
  }
}
async function goToCurrentPosition() {
  if (locating) return;
  locating = true;
  renderLocationButtons();
  try {
    const point = await getDevicePosition();
    const target = visibleMap();
    target.showPosition(point, true);
    notification(
      `Current position found · reported accuracy ±${Math.round(point.accuracy)} m`,
    );
  } catch (error) {
    notification(locationError(error), true);
  } finally {
    locating = false;
    renderLocationButtons();
  }
}
function notification(message: string, error = false, showSuccess = false) {
  // Routine actions stay quiet; warnings and errors remain visible until dismissed.
  if (!error && !showSuccess) return;
  const el = $("notice");
  el.className = `notice ${error ? "error" : ""}`;
  el.setAttribute("role", error ? "alert" : "status");
  el.innerHTML = `${icon(error ? "info" : "check", 18)}<span>${esc(message)}</span><button class="icon-button" aria-label="Dismiss message">${icon("close", 16)}</button>`;
  el.hidden = false;
  el.querySelector("button")!.onclick = () => {
    el.hidden = true;
  };
}
function report(error: unknown) {
  if (isCancelled(error)) return;
  console.error(error);
  notification(
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "Something went wrong. Your tracks are safe. Please try again.",
    true,
  );
}
function setSaveState(full: string, short: string) {
  $("save-state").innerHTML =
    `<span class="save-full">${full}</span><span class="save-short" aria-hidden="true">${short}</span>`;
  $("save-state").setAttribute("aria-label", full);
  $("save-state").title =
    `${full}. This refers to the workspace on this device; use Save Input Track or Save Route to export a GPX file.`;
}
let storageRevision = 0;
function flushWorkspace() {
  clearTimeout(saveTimer);
  const snapshot = structuredClone(workspace),
    revision = storageRevision;
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => set(STORAGE_KEY, snapshot))
    .then(() => {
      if (revision === storageRevision)
        setSaveState("Saved on device", "Saved");
    })
    .catch(() => {
      setSaveState("Not saved", "Not saved");
      notification(
        "Your device could not save this workspace. Export your tracks before closing the app.",
        true,
      );
    });
}
function persist() {
  storageRevision++;
  clearTimeout(saveTimer);
  setSaveState("Saving…", "Saving…");
  saveTimer = setTimeout(flushWorkspace, 300);
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && storageRevision > 0)
    flushWorkspace();
});
function fitMap() {
  createMap.fit([draft()]);
  return;
}
function renderMap() {
  createMap.enabled = !busy;
  createMap.drawingMode = drawingMode;
  createMap.selectedIndex = selectedCreatePoint;
  createMap.renderCreated(draft());
  return;
}
function renderStats(preview?: Track) {
  const t = preview ?? createdTrack(),
    points = t!.points,
    a = analytics(points);
  $("distance").innerHTML = `${km(a.length)}`;
  const hasElevation = points.some((p) => p.ele !== undefined);
  const totalsAvailable =
    hasElevation &&
    !a.missingEdges &&
    !a.estimatedGap &&
    !t?.terrainNeedsRefresh &&
    !points.some((p) => p.terrainPending);
  $("ascent").innerHTML =
    `${totalsAvailable ? metres(a.ascent) : "u/a"}${totalsAvailable ? "<sup>est.</sup>" : ""}`;
  $("descent").innerHTML = `${totalsAvailable ? metres(a.descent) : "u/a"}`;
  $("point-count").textContent =
    `${draft().points.length.toLocaleString()} waypoints`;
  $("analytics-source").textContent = t
    ? a.gapDistance
      ? `Includes ${km(a.gapDistance)} km of connections`
      : workspace.createdTerrain && !preview
        ? "Terrain estimate · entire route"
        : "Straight-line route · live totals"
    : "Open a file to begin";
  $("profile-range").textContent = hasElevation
    ? `${metres(a.min!)}–${metres(a.max!)} m · ${t!.name}`
    : "";
  const note = $("elevation-note");
  note.hidden = false;
  const needsRefresh =
    t?.terrainNeedsRefresh || points.some((point) => point.terrainPending);
  const status = !points.length
    ? "Add points to see terrain status"
    : needsRefresh
      ? "Terrain needs refresh"
      : !hasElevation
        ? "Terrain not fetched"
        : a.missingEdges || a.estimatedGap
          ? "Terrain incomplete"
          : "Terrain up to date";
  const detail = !points.length
    ? ""
    : needsRefresh
      ? "Route geometry changed. Fetch terrain to update heights and ascent."
      : !hasElevation
        ? "Ascent and descent are unavailable until terrain is fetched."
        : a.missingEdges
          ? "Elevation is missing for some points. Ascent and descent are partial; distance includes the entire track."
          : a.estimatedGap
            ? CONNECTION_ELEVATION_NOTE
            : "Estimated terrain heights and ascent.";
  const label = document.createElement("strong");
  label.textContent = status;
  note.replaceChildren(label);
  if (detail) note.append(document.createTextNode(` · ${detail}`));
  note.dataset.state = !points.length
    ? "empty"
    : needsRefresh
      ? "refresh"
      : !hasElevation
        ? "missing"
        : a.missingEdges || a.estimatedGap
          ? "incomplete"
          : "ready";
  const profile = $("profile");
  if (!hasElevation) {
    profile.replaceChildren();
    return;
  }
  const width = 1000,
    height = 70,
    min = a.min!,
    span = Math.max(20, a.max! - min);
  let cumulative = 0;
  const coords = points.map((p, i) => {
    if (i) cumulative += analyticsDistance(points[i - 1], p);
    return {
      x: a.length ? (cumulative / a.length) * width : 0,
      y:
        p.ele === undefined
          ? null
          : height - 8 - ((p.ele - min) / span) * (height - 16),
      gap: !!p.gapBefore,
    };
  });
  // Preserve missing elevation gaps and dashed walking connectors in the chart.
  let paths = "",
    area = "",
    current = "",
    gapPaths = "";
  coords.forEach((p, i) => {
    if (p.y === null) {
      current = "";
      return;
    }
    const prev = coords[i - 1];
    if (prev?.y !== null && prev && p.gap)
      gapPaths += `M${prev.x.toFixed(1)},${prev.y!.toFixed(1)}L${p.x.toFixed(1)},${p.y.toFixed(1)} `;
    const cmd = current && !p.gap ? "L" : "M";
    current = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    paths += `${cmd}${current} `;
  });
  if (!a.missingEdges)
    area = `${paths.replace(/M/g, "L").replace(/^L/, "M")} L1000,70 L0,70 Z`;
  profile.innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Elevation profile, ${metres(min)} to ${metres(a.max!)} metres"><defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${t!.color}" stop-opacity=".18"/><stop offset="100%" stop-color="${t!.color}" stop-opacity=".015"/></linearGradient></defs><path d="M0 23H1000M0 47H1000" stroke="var(--divider)" stroke-dasharray="3 5"/>${area ? `<path d="${area}" fill="url(#profile-fill)"/>` : ""}<path d="${paths}" fill="none" stroke="${t!.color}" stroke-width="2" vector-effect="non-scaling-stroke"/><path d="${gapPaths}" fill="none" stroke="${t!.color}" stroke-width="2" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/></svg><div class="profile-axis"><span>0 km</span><span>${km(a.length)} km</span></div>`;
}
import { distance as analyticsDistance } from "./model";
function render() {
  renderLayout();
  renderCreated();
  renderStats();
  renderMap();
  $<HTMLButtonElement>("undo").disabled = !createUndo.length || busy;
  $<HTMLButtonElement>("redo").disabled = !createRedo.length || busy;
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    if (
      busy &&
      !button.closest("#dialog") &&
      !button.closest("#notice") &&
      !["help", "settings", "retry-create-map", "fit"].includes(button.id)
    )
      button.disabled = true;
  });
  renderLocationButtons();
}
async function exportTrack(track: Track) {
  if (busy) return;
  busy = true;
  render();
  try {
    if (await saveTrack(track, "Created Route"))
      notification(
        Capacitor.isNativePlatform()
          ? "GPX saved to your chosen location."
          : "GPX saved. Your workspace is still here.",
      );
  } catch (e) {
    report(e);
  } finally {
    busy = false;
    render();
  }
}
function openDialog(content: string, variant?: "about" | "plan") {
  $("dialog").classList.toggle("plan-dialog", variant === "plan");
  $("dialog").classList.toggle("about-dialog", variant === "about");
  $("dialog-content").innerHTML = content;
  $<HTMLDialogElement>("dialog").showModal();
  $("dialog").setAttribute("aria-labelledby", "dialog-title");
  bindDialogClose();
}
function bindDialogClose(cancel?: () => void) {
  const dialog = $<HTMLDialogElement>("dialog");
  $("dialog-content")
    .querySelectorAll<HTMLButtonElement>("[data-close]")
    .forEach((button) => {
      button.onclick = () => (cancel ? cancel() : dialog.close());
      if (button.closest(".dialog-heading")) {
        button.setAttribute(
          "aria-label",
          cancel ? "Cancel operation" : "Close dialog",
        );
        button.title = cancel ? "Cancel operation" : "Close dialog";
      }
    });
  dialog.oncancel = cancel
    ? (event) => {
        event.preventDefault();
        cancel();
      }
    : null;
}
function bindTerrainCancellation(buttonId: string) {
  const controller = terrainController;
  const cancel = () => {
    controller?.abort();
    if (Capacitor.isNativePlatform())
      notification(
        "Terrain cancelled. The current network request may finish in the background; its result will be ignored.",
      );
  };
  bindDialogClose(cancel);
  $(buttonId).onclick = cancel;
}
function confirmRemoval(
  title: string,
  message: string,
  action: () => unknown,
  confirmLabel = "Delete point",
  cancel?: () => void,
) {
  if (busy) return;
  openDialog(
    `${dialogHeader(esc(title))}<p>${esc(message)}</p><div class="dialog-actions"><button id="cancel-delete" class="button secondary" autofocus>Cancel</button><button id="confirm-delete" class="button primary">${esc(confirmLabel)}</button></div>`,
  );
  const dialog = $<HTMLDialogElement>("dialog");
  const finish = (confirmed: boolean) => {
    dialog.oncancel = null;
    dialog.close();
    if (confirmed) action();
    else cancel?.();
  };
  $("cancel-delete").onclick = () => finish(false);
  $("confirm-delete").onclick = () => finish(true);
  // The title-bar close control and Escape have the same non-destructive result.
  dialog.querySelector<HTMLButtonElement>(
    ".dialog-heading [data-close]",
  )!.onclick = () => finish(false);
  dialog.oncancel = (event) => {
    event.preventDefault();
    finish(false);
  };
}
function dialogHeader(title: string, subtitle = "", branded = false) {
  return `<div class="dialog-heading${branded ? " branded-dialog-heading" : ""}"><div class="dialog-heading-content">${branded ? `<img class="dialog-logo" src="${import.meta.env.BASE_URL}logo.svg" alt="BareGPS" width="36" height="36">` : ""}<div><h2 id="dialog-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div></div><button class="icon-button" data-close aria-label="Close dialog">${icon("close", 20)}</button></div>`;
}
function colourForm(initial: string) {
  return `<form id="colour-form"><hex-color-picker id="colour-spectrum" color="${initial}"></hex-color-picker><div class="colour-presets" role="group" aria-label="Preset colours">${COLORS.map((color) => `<button type="button" class="colour-preset" data-colour="${color}" style="--line-colour:${color}" aria-label="Use ${color}" aria-pressed="${color === initial}"></button>`).join("")}</div><label class="field-label" for="colour-hex">Hex colour</label><div class="colour-value"><span id="colour-preview" style="--line-colour:${initial}" aria-hidden="true"></span><input id="colour-hex" class="text-input" value="${initial.toUpperCase()}" pattern="#[0-9A-Fa-f]{6}" maxlength="7" spellcheck="false" autocapitalize="characters" required title="Use # followed by six hexadecimal characters"></div><div class="dialog-actions"><button class="button primary">Apply colour</button></div></form>`;
}
function bindColourPicker(apply: (color: string) => void) {
  const spectrum = $<HexColorPicker>("colour-spectrum");
  const field = $<HTMLInputElement>("colour-hex");
  function preview(color: string, updateField: boolean) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    spectrum.color = color;
    if (updateField) field.value = color.toUpperCase();
    $("colour-preview").style.setProperty("--line-colour", color);
    document
      .querySelectorAll<HTMLButtonElement>("[data-colour]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.colour === color.toLowerCase()),
        ),
      );
  }
  spectrum.addEventListener("color-changed", (event) =>
    preview(event.detail.value, true),
  );
  field.oninput = () => preview(field.value, false);
  document
    .querySelectorAll<HTMLButtonElement>("[data-colour]")
    .forEach(
      (button) =>
        (button.onclick = () => preview(button.dataset.colour!, true)),
    );
  $("colour-form").onsubmit = (event) => {
    event.preventDefault();
    if (!field.reportValidity()) return;
    apply(field.value.toLowerCase());
    $("colour-status").textContent = "Route colour applied.";
  };
}
function createdSnapshot(): CreatedSnapshot {
  return structuredClone({ route: draft(), terrain: workspace.createdTerrain });
}
function restoreCreated(snapshot: CreatedSnapshot) {
  workspace.created = snapshot.route;
  workspace.createdTerrain = snapshot.terrain;
}
function changeCreated(change: () => Track) {
  if (busy) return false;
  try {
    const before = createdSnapshot(),
      route = change();
    createUndo.push(before);
    if (createUndo.length > 30) createUndo.shift();
    createRedo = [];
    workspace.created = {
      ...route,
      terrainNeedsRefresh:
        route.points.length > 0 &&
        (!!before.terrain || !!before.route.terrainNeedsRefresh),
    };
    workspace.createdTerrain = undefined;
    persist();
    render();
    return true;
  } catch (error) {
    report(error);
    render();
    return false;
  }
}
function renderLayout() {
  const creating = true;
  updateMapCoordinates("create", createMap);
  document.body.classList.toggle("creating", creating);
  document.body.classList.toggle("point-naming", allowPointNaming);
  $("create-map-view").hidden = !creating;
  $("create-card").hidden = false;
  $("create-tools").hidden = !creating;
  $("selection-caption").textContent = "CREATED ROUTE";
  $("map-panel").setAttribute("aria-label", "Create route map");
  $("create-map-error").hidden =
    !createMap.hasTileError() || dismissedTileWarning.create;
}
const emptyCardRoute: Track = {
  id: "empty-card",
  name: "",
  color: "#16724d",
  points: [],
  source: "",
  kind: "track",
};
function routeCardContext() {
  return {
    route: draft(),
    terrain: workspace.createdTerrain,
    source: draft(),
    offset: 0,
    description: "",
  };
}
function fitCardCoordinates() {
  const values = Array.from(
    $("waypoint-rows").querySelectorAll<HTMLElement>(".coordinate-value"),
  );
  for (const value of values) value.style.fontSize = "";
  // Re-measure rendered glyphs: font hinting can make proportional estimates a pixel wider.
  for (let pass = 0; pass < 4; pass++) {
    const sizes = values.map((value) => {
      const cell = value.parentElement!;
      const style = getComputedStyle(cell);
      const available =
        cell.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const width = value.getBoundingClientRect().width;
      const currentSize = parseFloat(getComputedStyle(value).fontSize);
      return available > 0 && width > available
        ? Math.max(
            1,
            Math.floor(
              ((currentSize * Math.max(1, available - 1)) / width) * 100,
            ) / 100,
          )
        : null;
    });
    if (sizes.every((size) => size === null)) break;
    values.forEach((value, i) => {
      if (sizes[i] !== null) value.style.fontSize = `${sizes[i]}px`;
    });
  }
}
function updateCardScrollLimit() {
  fitCardCoordinates();
  const empty =
    $("waypoint-rows").querySelector<HTMLTableCellElement>(".waypoint-empty");
  if (empty)
    empty.colSpan =
      !Capacitor.isNativePlatform() && !cardExpanded
        ? (allowPointNaming ? 8 : 7) + 1
        : cardExpanded
          ? allowPointNaming
            ? 8
            : 7
          : 5;
  if (cardExpanded) return;
  const table =
    $("create-card").querySelector<HTMLTableElement>(".waypoint-table")!;
  const rows = Array.from(
    $<HTMLTableSectionElement>("waypoint-rows").rows,
  ).slice(0, 6);
  const last = rows.at(-1);
  if (!last || !table.getBoundingClientRect().height) return;
  const height =
    Math.floor(
      last.getBoundingClientRect().bottom - table.getBoundingClientRect().top,
    ) + 1;
  const value = `${height}px`;
  if (
    table.parentElement!.style.getPropertyValue("--compact-card-height") !==
    value
  )
    table.parentElement!.style.setProperty("--compact-card-height", value);
}
const cardTableObserver = new ResizeObserver(updateCardScrollLimit);
cardTableObserver.observe($("create-card").querySelector(".waypoint-table")!);
function renderCreated() {
  const route = draft(),
    points = route.points;
  $("track-count").textContent = `${points.length} route points`;
  $("waypoint-count").textContent = String(points.length);
  $<HTMLInputElement>("create-name").value = route.name;
  if (points.length < 2) drawingMode = "add";
  const closed = isClosedRoute(route);
  $("create-map-hint").textContent =
    drawingMode === "insert"
      ? "Tap a route line to insert one point. Then Add points resumes automatically."
      : !points.length
        ? "Tap the map to place your starting point."
        : closed
          ? "Loop closed · Drag markers to reshape, or tap to extend"
          : "Add points · Every map tap extends the route, even near an existing line";
  $("draw-add").setAttribute("aria-pressed", String(drawingMode === "add"));
  $("draw-insert").setAttribute(
    "aria-pressed",
    String(drawingMode === "insert"),
  );
  $<HTMLButtonElement>("draw-add").disabled = busy;
  $<HTMLButtonElement>("draw-insert").disabled = busy || points.length < 2;
  $<HTMLButtonElement>("create-close").disabled =
    busy || points.length < 3 || closed;
  $("create-close").textContent = "Close loop";
  if (selectedCreatePoint !== null && !points[selectedCreatePoint])
    selectedCreatePoint = null;
  $<HTMLButtonElement>("create-delete").disabled =
    busy || selectedCreatePoint === null;
  renderPointCard();
}
let fullRouteCard = false;
$("card-detail-toggle").onclick = () => {
  fullRouteCard = !fullRouteCard;
  renderPointCard();
};
let cardSourceKey = "";
function renderPointCard() {
  const context = routeCardContext();
  const route = context?.route ?? emptyCardRoute;
  const points = route.points;
  const offset = context?.offset ?? 0;
  const rows = routecardRows(route, context?.terrain, fullRouteCard);
  $("waypoint-count").textContent = String(rows.length);
  const detailToggle = $<HTMLButtonElement>("card-detail-toggle");
  detailToggle.hidden = points.length <= SUMMARY_CARD_POINTS;
  detailToggle.disabled = busy;
  detailToggle.textContent = fullRouteCard ? "Summary Card" : "Full Card";
  detailToggle.setAttribute("aria-pressed", String(fullRouteCard));
  const summaryNote = $("card-summary-note");
  summaryNote.hidden = points.length <= SUMMARY_CARD_POINTS;
  summaryNote.textContent = `${fullRouteCard ? "Full card" : "Summary card"}: ${rows.length} of ${points.length} route points. ${!fullRouteCard && rows.length > SUMMARY_CARD_POINTS ? "All named points retained; more than 30 checkpoints. " : ""}Distances and ascent use the full route. GPX keeps every point.`;
  const nameField = $<HTMLInputElement>("create-name");
  nameField.value = route.name;
  nameField.readOnly = false;
  nameField.closest<HTMLElement>(".create-settings")!.hidden = false;
  $("card-name-label").textContent = "Route name";
  $("create-save").setAttribute("aria-label", "Save Route");
  $("create-save").innerHTML = `${icon("export", 17)}Save Route`;
  $("coordinate-heading").textContent = {
    latlon: "Lat/Lon",
    irish: "Irish Grid",
    british: "British Grid",
    itm: "ITM",
    mgrs: "MGRS",
    utm: "UTM",
    usng: "USNG",
  }[coordinateSystem];
  $("coordinate-heading").title = coordinateSystems[coordinateSystem];
  $("create-card").classList.toggle(
    "latlon-coordinates",
    coordinateSystem === "latlon",
  );
  const table =
    $("create-card").querySelector<HTMLTableElement>(".waypoint-table")!;
  const scroller = table.parentElement!;
  const key = `${context?.source.id}:${offset}:${points.length}:${cardExpanded}:${fullRouteCard}`;
  if (cardSourceKey !== key) {
    scroller.scrollTop = 0;
    cardSourceKey = key;
  }
  table.setAttribute("aria-rowcount", String(rows.length + 1));
  {
    $("waypoint-rows").innerHTML = points.length
      ? rows
          .map((row, localIndex) => {
            const i = row.index;
            const point = row.point;
            const coordinate = formatCoordinate(point, coordinateSystem);
            const ascent = (value: number | undefined) =>
              value === undefined
                ? "—"
                : `${metres(value)}<span class="card-cell-unit"> m</span>`;
            return `<tr data-card-row="${i}" aria-rowindex="${localIndex + 2}"><th scope="row"><button class="text-button" data-focus-point="${i}" aria-label="Show point ${offset + i + 1} on map">${offset + i + 1}</button></th><td class="point-name-cell"><input class="point-name" data-point-name="${i}" aria-label="Name for point ${offset + i + 1} (optional)" maxlength="10" placeholder="[Name]" value="${esc(point.name || "")}" ${busy ? "disabled" : ""}></td><td class="grid-reference" title="${esc(coordinate)}"><span class="coordinate-value">${esc(coordinate)}</span></td><td>${ascent(point.ele)}</td><td class="card-extra distance-cell numeric-cell">${km(row.distance)}</td><td class="card-extra">${km(row.total)}</td><td class="card-extra">${ascent(row.ascent)}</td><td class="card-extra">${ascent(row.totalAscent)}</td><td class="compact-delete"><button class="icon-button" data-remove-point="${i}" aria-label="Remove point ${i + 1}" ${busy ? "disabled" : ""}>${icon("trash", 15)}</button></td></tr>`;
          })
          .join("")
      : `<tr><td colspan="${5}" class="waypoint-empty">${"Your points will appear here. Tap the map to begin."}</td></tr>`;
    $("waypoint-rows")
      .querySelectorAll<HTMLButtonElement>("[data-remove-point]")
      .forEach((button) => {
        button.onclick = () => {
          if (busy) return;
          const index = Number(button.dataset.removePoint);
          confirmRemoval(
            `Delete Point ${index + 1}?`,
            "Remove this point from the Create route? Terrain will need refreshing. You can undo this change.",
            () => changeCreated(() => removeWaypoint(draft(), index)),
          );
        };
      });
    $("waypoint-rows")
      .querySelectorAll<HTMLInputElement>("[data-point-name]")
      .forEach((input) => {
        let started = false;
        input.onfocus = () => {
          started = false;
        };
        input.oninput = () => {
          if (busy) return;
          if (!started) {
            createUndo.push(createdSnapshot());
            if (createUndo.length > 30) createUndo.shift();
            createRedo = [];
            started = true;
          }
          const point =
            context!.source.points[offset + Number(input.dataset.pointName)];
          point.name = input.value.slice(0, 10) || undefined;
          points[Number(input.dataset.pointName)].name = point.name;
          if (workspace.createdTerrain) {
            for (const p of workspace.createdTerrain.points) {
              if (p.lat === point.lat && p.lon === point.lon)
                p.name = point.name;
            }
          }
          persist();
          $<HTMLButtonElement>("undo").disabled = false;
          $<HTMLButtonElement>("redo").disabled = true;
        };
        input.onkeydown = (event) => {
          if (event.key === "Enter") input.blur();
        };
      });
    $("waypoint-rows")
      .querySelectorAll<HTMLButtonElement>("[data-focus-point]")
      .forEach((button) => {
        button.onclick = () => {
          if (busy) return;
          const p = points[Number(button.dataset.focusPoint)];
          if (cardExpanded) toggleCard();
          visibleMap().map.setView(
            [p.lat, p.lon],
            Math.max(visibleMap().map.getZoom(), 15),
          );
          $("map-panel").scrollIntoView({ behavior: "smooth", block: "start" });
        };
      });
    fitCardCoordinates();
    requestAnimationFrame(updateCardScrollLimit);
  }
  $<HTMLButtonElement>("create-save").disabled = busy || points.length < 2;
  $<HTMLButtonElement>("create-share").disabled = busy || points.length < 2;
  $<HTMLButtonElement>("create-pdf").disabled = busy || points.length < 2;
  $("create-terrain").hidden = false;
  $<HTMLButtonElement>("create-terrain").disabled =
    busy || points.length < 2 || !!workspace.createdTerrain;
  $<HTMLButtonElement>("create-clear").disabled = busy || !points.length;
  $<HTMLInputElement>("create-name").disabled = busy;
  requestAnimationFrame(updateCardScrollLimit);
}
let nameEditStarted = false;
$<HTMLInputElement>("create-name").oninput = (e) => {
  if (busy || false) return;
  if (!nameEditStarted) {
    createUndo.push(createdSnapshot());
    if (createUndo.length > 30) createUndo.shift();
    createRedo = [];
    nameEditStarted = true;
  }
  const name = (e.target as HTMLInputElement).value.trim() || "Created Route";
  workspace.created = { ...draft(), name };
  if (workspace.createdTerrain)
    workspace.createdTerrain = { ...workspace.createdTerrain, name };
  $<HTMLButtonElement>("undo").disabled = false;
  $<HTMLButtonElement>("redo").disabled = true;
  persist();
  renderStats();
};
$<HTMLInputElement>("create-name").onblur = () => {
  nameEditStarted = false;
  $<HTMLInputElement>("create-name").value =
    routeCardContext()?.route.name ?? "";
};
function applyCreatedColour(color: string) {
  if (busy || color === draft().color) return;
  const terrain = workspace.createdTerrain;
  changeCreated(() => ({ ...draft(), color }));
  if (terrain) {
    workspace.createdTerrain = { ...terrain, color };
    persist();
    render();
  }
}
$("draw-add").onclick = () => {
  if (!busy) {
    drawingMode = "add";
    render();
  }
};
$("draw-insert").onclick = () => {
  if (!busy && draft().points.length >= 2) {
    drawingMode = "insert";
    render();
  }
};
$("create-delete").onclick = () => {
  if (selectedCreatePoint === null || busy) return;
  const index = selectedCreatePoint;
  confirmRemoval(
    `Delete Point ${index + 1}?`,
    "Remove this point from the Create route? Terrain will need refreshing. You can undo this change.",
    () => {
      selectedCreatePoint = null;
      changeCreated(() => removeWaypoint(draft(), index));
    },
  );
};
$("create-close").onclick = () => {
  if (changeCreated(() => closeRoute(draft()))) {
    drawingMode = "add";
    render();
    notification(
      "Loop closed at your starting point. The return leg is included in distance; fetch terrain for updated ascent.",
    );
  }
};
$("create-save").onclick = () => {
  if (!workspace.createdTerrain) {
    void fetchCreatedTerrain(true);
    return;
  }
  const context = routeCardContext();
  if (context && context.route.points.length >= 2)
    void exportTrack(context.terrain ?? context.route);
};
$("create-clear").onclick = () => {
  if (busy) return;
  openDialog(
    `${dialogHeader("Clear Created Route?", "Your saved GPX files stay in place.")}<p>You can undo this change. Save the current route first if you need a GPX copy.</p><div class="dialog-actions"><button class="button secondary" data-close>Cancel</button><button id="confirm-clear-created" class="button primary">Clear route</button></div>`,
  );
  $("confirm-clear-created").onclick = () => {
    drawingMode = "add";
    changeCreated(newCreatedRoute);
    $<HTMLDialogElement>("dialog").close();
  };
};
$("dismiss-create-map").onclick = () => {
  dismissedTileWarning.create = true;
  $("create-map-error").hidden = true;
};
$("retry-create-map").onclick = () => {
  $("create-map-error").hidden = true;
  createMap.retryTiles();
};
$("create-pdf").onclick = async () => {
  const context = routeCardContext();
  if (busy || !context || context.route.points.length < 2) return;
  const route = structuredClone(context.route);
  const terrain = context.terrain
    ? structuredClone(context.terrain)
    : undefined;
  const system = coordinateSystem;
  try {
    const { routecardPDF } = await import("./routecard-pdf");
    await sharePDF(
      route.name,
      routecardPDF(route, system, terrain, context.offset, fullRouteCard),
    );
  } catch (error) {
    if (!isCancelled(error)) report(error);
  }
};
function toggleCard() {
  if (!cardExpanded && expanded) expandMap();
  cardExpanded = !cardExpanded;
  document.body.classList.toggle("card-expanded", cardExpanded);
  $("expand-card").innerHTML = icon(cardExpanded ? "collapse" : "expand", 18);
  $("expand-card").setAttribute("aria-expanded", String(cardExpanded));
  $("expand-card").setAttribute(
    "aria-label",
    cardExpanded ? "Collapse Route Card" : "Expand Route Card",
  );
  $("expand-card").title = cardExpanded
    ? "Collapse Route Card"
    : "Expand Route Card";
  requestAnimationFrame(updateCardScrollLimit);
}
$("expand-card").onclick = toggleCard;
$("create-share").onclick = async () => {
  const context = routeCardContext();
  if (busy || !context || context.route.points.length < 2) return;
  const title = `${context.route.name} — Routecard`;
  const text = routecardText(
    context.route,
    coordinateSystem,
    context.terrain,
    context.offset,
    fullRouteCard,
  );
  try {
    if (await shareRoutecard(title, text)) return;
  } catch (error) {
    if (isCancelled(error)) return;
  }
  openDialog(
    `${dialogHeader("Share Route Card")}<p>Copy this Route Card into a message.</p><textarea id="routecard-text" class="text-input routecard-text" aria-label="Route Card text" readonly>${esc(text)}</textarea><div class="dialog-actions"><button class="button secondary" data-close>Done</button><button id="copy-routecard" class="button primary">Copy text</button></div><p id="routecard-copy-status" role="status"></p>`,
  );
  $("copy-routecard").onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      $("routecard-copy-status").textContent =
        "Routecard copied. Paste it into your message.";
    } catch {
      const field = $<HTMLTextAreaElement>("routecard-text");
      field.focus();
      field.select();
      $("routecard-copy-status").textContent =
        "Text selected. Use your device’s Copy command, then paste into your message.";
    }
  };
};
$("create-terrain").onclick = () => {
  if (busy || draft().points.length < 2) return;
  openDialog(
    `${dialogHeader("Fetch Created Route Terrain")}<p>Route coordinates are sent to Open Topo Data to sample heights about every 90 metres along each straight leg. Ascent is an estimate. This does not make the route follow paths.</p><div class="dialog-actions"><button class="button secondary" data-close>Cancel</button><button id="confirm-create-terrain" class="button primary">Fetch route terrain</button></div>`,
  );
  $("confirm-create-terrain").onclick = () => fetchCreatedTerrain(false);
};
async function fetchCreatedTerrain(saveAfter: boolean) {
  if (busy || draft().points.length < 2) return;
  if (workspace.createdTerrain) {
    if (saveAfter) await exportTrack(workspace.createdTerrain);
    return;
  }
  busy = true;
  terrainController = new AbortController();
  render();
  openDialog(
    `${dialogHeader(saveAfter ? "Preparing Route for Saving" : "Fetching Created Route Terrain")}<p class="dialog-note">Route coordinates are sent to Open Topo Data for terrain heights.</p><p id="create-terrain-progress" role="status">Preparing route…</p><div class="dialog-actions"><button id="cancel-create-terrain" class="button secondary">Cancel</button></div>`,
  );
  bindTerrainCancellation("cancel-create-terrain");
  let failure: unknown;
  let succeeded = false;
  try {
    const before = createdSnapshot(),
      route = draft();
    const sampled = await enrichTerrain(
      {
        ...route,
        points: route.points.map((p, i) => ({
          ...p,
          gapBefore: i > 0,
          terrain: undefined,
        })),
      },
      (message) => {
        $("create-terrain-progress").textContent = message;
      },
      terrainController.signal,
    );
    const heights = new Map(
      sampled.points.map((p) => [`${p.lat},${p.lon}`, p.ele]),
    );
    createUndo.push(before);
    if (createUndo.length > 30) createUndo.shift();
    createRedo = [];
    workspace.createdTerrain = {
      ...sampled,
      terrainNeedsRefresh: false,
      points: sampled.points.map(({ lat, lon, ele, name }) => ({
        lat,
        lon,
        ele,
        name,
      })),
    };
    workspace.created = {
      ...route,
      terrainNeedsRefresh: false,
      points: route.points.map((p) => ({
        ...p,
        ele: heights.get(`${p.lat},${p.lon}`),
      })),
    };
    persist();
    succeeded = true;
  } catch (error) {
    failure = error;
  } finally {
    busy = false;
    terrainController = null;
    $<HTMLDialogElement>("dialog").oncancel = null;
    $<HTMLDialogElement>("dialog").close();
    render();
  }
  if (succeeded) {
    if (saveAfter) await exportTrack(workspace.createdTerrain!);
    return;
  }
  if (isCancelled(failure)) return;
  if (!saveAfter) {
    report(failure);
    return;
  }
  const message =
    failure instanceof Error
      ? failure.message
      : "Terrain could not be fetched.";
  openDialog(
    `${dialogHeader("Terrain Unavailable")}<p role="alert">${esc(message)}</p><p class="dialog-note">Your route is unchanged. Retry to include terrain, or explicitly save with incomplete heights and partial ascent.</p><div class="terrain-failure-actions"><button id="retry-create-save" class="button primary">Retry terrain and save</button><button id="save-without-terrain" class="button secondary">Save without terrain</button><button class="button secondary" data-close>Cancel</button></div>`,
  );
  $("retry-create-save").onclick = () => fetchCreatedTerrain(true);
  $("save-without-terrain").onclick = () => {
    $<HTMLDialogElement>("dialog").close();
    void exportTrack(draft());
  };
}
$("fit").onclick = fitMap;
function expandMap() {
  if (cardExpanded) toggleCard();
  expanded = !expanded;
  document.body.classList.toggle("map-expanded", expanded);
  $("expand").innerHTML = icon(expanded ? "collapse" : "expand", 18);
  $("expand").setAttribute(
    "aria-label",
    expanded ? "Collapse map" : "Expand map",
  );
  $("expand").title = expanded ? "Collapse map" : "Expand map";
  setTimeout(() => {
    visibleMap().map.invalidateSize();
    fitMap();
  }, 50);
}
$("expand").onclick = expandMap;
function history(back: boolean) {
  if (busy) return;
  const from = back ? createUndo : createRedo,
    to = back ? createRedo : createUndo;
  if (!from.length) return;
  to.push(createdSnapshot());
  restoreCreated(from.pop()!);
  persist();
  render();
  return;
}
$("undo").onclick = () => history(true);
$("redo").onclick = () => history(false);
$("settings").onclick = () => {
  openDialog(
    `${dialogHeader("Settings", "", true)}<section class="settings-grid-section"><h3 id="grid-settings-heading">Grid references</h3><p class="system-picker-prompt">Choose a Grid Reference System.</p><label id="available-systems-heading" class="field-label system-picker-label" for="coordinate-system">Available Systems</label><select id="coordinate-system" class="text-input system-picker" aria-labelledby="available-systems-heading">${Object.entries(
      coordinateSystems,
    )
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === coordinateSystem ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></section><section class="product-colour-settings"><h3 class="settings-colour-heading">Route Colour</h3>${colourForm(draft().color)}<p id="colour-status" class="dialog-note" role="status"></p></section><section class="settings-point-naming"><div class="settings-toggle-row"><h3 id="point-naming-heading">Allow Point Naming</h3><button id="allow-point-naming" class="settings-switch" type="button" role="switch" aria-labelledby="point-naming-heading" aria-describedby="point-naming-description" aria-checked="${allowPointNaming}"><span aria-hidden="true"></span></button></div><p id="point-naming-description">Allow individual points in a route to be named.</p></section><button class="button primary full" data-close>Done</button>`,
  );
  $("allow-point-naming").onclick = async () => {
    allowPointNaming = !allowPointNaming;
    $("allow-point-naming").setAttribute(
      "aria-checked",
      String(allowPointNaming),
    );
    render();
    try {
      await set(POINT_NAMING_KEY, allowPointNaming);
    } catch {
      notification(
        "Point naming changed for this session, but could not be saved on this device.",
        true,
      );
    }
  };
  bindColourPicker(applyCreatedColour);
  $("coordinate-system").onchange = async (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (!isCoordinateSystem(value)) return;
    coordinateSystem = value;
    render();
    try {
      await set(COORDINATE_KEY, value);
    } catch {
      notification(
        "Coordinate format changed for this session, but could not be saved on this device.",
        true,
      );
    }
  };
};
$("help").onclick = () =>
  openDialog(
    `${dialogHeader("BareGPS Route Maker", "", true)}${aboutGuide}`,
    "about",
  );
window.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    cardExpanded &&
    !$<HTMLDialogElement>("dialog").open
  )
    toggleCard();
  if (e.key === "Escape" && expanded && !$<HTMLDialogElement>("dialog").open)
    expandMap();
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "z" &&
    !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
  ) {
    e.preventDefault();
    history(!e.shiftKey);
  }
});
window.addEventListener("unhandledrejection", (e) => {
  report(e.reason);
  e.preventDefault();
});
window.addEventListener("error", (e) => {
  if (e.error) report(e.error);
});
async function init() {
  try {
    const savedCoordinates = await get(COORDINATE_KEY);
    allowPointNaming = (await get(POINT_NAMING_KEY)) === true;
    if (isCoordinateSystem(savedCoordinates))
      coordinateSystem = savedCoordinates;
  } catch {}
  try {
    const saved = await get(STORAGE_KEY);
    if (saved) {
      if (validateWorkspace(saved)) {
        workspace = restoreDrawingWorkspace(saved);
      } else
        notification(
          "The saved drawing could not be restored. The saved data has not been overwritten.",
          true,
        );
    }
  } catch {
    notification(
      "Workspace storage is unavailable. You can still draw and export a route.",
      true,
    );
  }
  render();
  fitMap();
}
void init();
