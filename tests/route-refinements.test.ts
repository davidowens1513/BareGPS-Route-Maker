import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { newCreatedRoute } from "../src/create";
const state = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  maps: [] as any[],
  saveResult: Promise.resolve(true),
  saveTrack: vi.fn(),
  terrainJob: null as
    null | ((track: any, progress: any, signal: AbortSignal) => Promise<any>),
}));
vi.mock("idb-keyval", () => ({
  get: async (key: string) => structuredClone(state.store.get(key)),
  set: async (key: string, value: unknown) => {
    state.store.set(key, structuredClone(value));
  },
}));
vi.mock("../src/files", () => ({
  saveTrack: (...args: unknown[]) => {
    state.saveTrack(...structuredClone(args));
    return state.saveResult;
  },
  shareRoutecard: vi.fn(),
  sharePDF: vi.fn(),
  isCancelled: (error: any) => error?.name === "AbortError",
}));
vi.mock("../src/terrain", () => ({
  enrichTerrain: (...args: any[]) =>
    state.terrainJob!(args[0], args[1], args[2]),
}));
vi.mock("../src/map", () => ({
  TrackMap: class {},
  CreateMap: class {
    map = {
      on: vi.fn(),
      getCenter: () => ({ wrap: () => ({ lat: 53, lng: -6 }) }),
      getContainer: () => document.getElementById("create-map")!,
      invalidateSize: vi.fn(),
    };
    setBaseLayer = vi.fn();
    home = vi.fn();
    fit = vi.fn();
    renderCreated = vi.fn();
    showPosition = vi.fn();
    retryTiles = vi.fn();
    hasTileError = () => false;
    constructor() {
      state.maps.push(this);
    }
  },
}));
const button = (id: string) => document.getElementById(id) as HTMLButtonElement;
const click = (id: string) => button(id).click();
beforeEach(() => {
  vi.resetModules();
  state.store.clear();
  state.maps = [];
  state.saveResult = Promise.resolve(true);
  state.saveTrack.mockReset();
  state.terrainJob = null;
  document.body.innerHTML = '<div id="app"></div>';
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  vi.unstubAllGlobals();
});
async function start(terrain = true) {
  const route = {
    ...newCreatedRoute(),
    points: [
      { lat: 53, lon: -6, ele: 100 },
      { lat: 53.01, lon: -6, ele: 120 },
    ],
  };
  state.store.set("baregps-route-maker-workspace-v1", {
    version: 1,
    created: route,
    ...(terrain ? { createdTerrain: structuredClone(route) } : {}),
  });
  await import("../src/main");
  await vi.waitFor(() => expect(button("create-save").disabled).toBe(false));
}
function rename(name: string) {
  const field = document.getElementById("create-name") as HTMLInputElement;
  field.value = name;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("blur"));
}
it("saves the current route name after renaming an already fetched route", async () => {
  await start();
  rename("Edited1");
  click("create-save");
  await vi.waitFor(() => expect(state.saveTrack).toHaveBeenCalled());
  expect(state.saveTrack.mock.calls[0]).toHaveLength(1);
  expect(state.saveTrack.mock.calls[0][0].name).toBe("Edited1");
});
it("keeps the chosen route name through automatic terrain fetching before saving", async () => {
  await start(false);
  rename("Wicklow walk");
  state.terrainJob = async (track) => track;
  click("create-save");
  await vi.waitFor(() => expect(state.saveTrack).toHaveBeenCalled());
  expect(state.saveTrack.mock.calls[0]).toHaveLength(1);
  expect(state.saveTrack.mock.calls[0][0].name).toBe("Wicklow walk");
});
it("switches directly with one icon, remembers the layer and updates About credits", async () => {
  await start();
  click("map-layer-toggle");
  expect(state.maps[0].setBaseLayer).toHaveBeenLastCalledWith("satellite");
  expect(button("map-layer-toggle").getAttribute("aria-label")).toBe(
    "Switch to OpenTopo",
  );
  expect(state.store.get("baregps-route-maker-map-layer-v1")).toBe("satellite");
  click("help");
  expect(document.querySelector("dialog")!.textContent).toContain("Vantor");
  expect(document.querySelector("dialog")!.textContent).not.toContain(
    "Map rendering ©",
  );
  click("map-layer-toggle");
  expect(state.maps[0].setBaseLayer).toHaveBeenLastCalledWith("opentopo");
  expect(state.store.get("baregps-route-maker-map-layer-v1")).toBe("opentopo");
});
it("restores the saved layer independently of the route", async () => {
  state.store.set("baregps-route-maker-map-layer-v1", "satellite");
  await start();
  expect(state.maps[0].setBaseLayer).toHaveBeenLastCalledWith("satellite");
  expect(button("map-layer-toggle").title).toBe("Switch to OpenTopo");
});
it.each(["success", "cancel", "failure"])(
  "re-enables layer switching after save %s",
  async (outcome) => {
    await start();
    let finish!: (value: boolean) => void, reject!: (error: Error) => void;
    state.saveResult = new Promise((resolve, fail) => {
      finish = resolve;
      reject = fail;
    });
    click("create-save");
    expect(button("map-layer-toggle").disabled).toBe(true);
    if (outcome === "success") finish(true);
    else
      reject(
        outcome === "cancel"
          ? new DOMException("Cancelled", "AbortError")
          : new Error("Save failed"),
      );
    await vi.waitFor(() =>
      expect(button("map-layer-toggle").disabled).toBe(false),
    );
    click("map-layer-toggle");
    expect(state.maps[0].setBaseLayer).toHaveBeenLastCalledWith("satellite");
  },
);
it.each(["success", "cancel", "failure"])(
  "re-enables layer switching after terrain %s",
  async (outcome) => {
    await start(false);
    let finish!: (value: any) => void,
      reject!: (error: Error) => void,
      prepared: any;
    state.terrainJob = (track, _progress, signal) => {
      prepared = track;
      return new Promise((resolve, fail) => {
        finish = resolve;
        reject = fail;
        signal.addEventListener("abort", () =>
          fail(new DOMException("Cancelled", "AbortError")),
        );
      });
    };
    click("create-terrain");
    click("confirm-create-terrain");
    expect(button("map-layer-toggle").disabled).toBe(true);
    if (outcome === "success") finish(prepared);
    else if (outcome === "cancel") click("cancel-create-terrain");
    else reject(new Error("Terrain failed"));
    await vi.waitFor(() =>
      expect(button("map-layer-toggle").disabled).toBe(false),
    );
    click("map-layer-toggle");
    expect(state.maps[0].setBaseLayer).toHaveBeenLastCalledWith("satellite");
  },
);
