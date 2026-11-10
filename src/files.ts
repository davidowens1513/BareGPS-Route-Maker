import { Capacitor, registerPlugin } from "@capacitor/core";
import { exportGPX, type Track } from "./model";
export const NativeFiles = registerPlugin<{
  save(options: { name: string; data: string }): Promise<{ saved: boolean }>;
  shareFile(options: { name: string; data: string }): Promise<void>;
  shareText(options: { title: string; text: string }): Promise<void>;
}>("BareFiles");
export async function saveTrack(track: Track, filename = track.name) {
  const name =
    (filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .trim()
      .slice(0, 90) || "BareGPS track") + ".gpx";
  const xml = exportGPX(track);
  if (Capacitor.isNativePlatform()) {
    const bytes = new TextEncoder().encode(xml);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return (await NativeFiles.save({ name, data: btoa(binary) })).saved;
  }
  const blob = new Blob([xml], { type: "application/gpx+xml" });
  if (typeof (window as any).showSaveFilePicker === "function") {
    const handle = await (
      window as unknown as {
        showSaveFilePicker(o: unknown): Promise<{
          createWritable(): Promise<{
            write(b: Blob): Promise<void>;
            close(): Promise<void>;
          }>;
        }>;
      }
    ).showSaveFilePicker({
      suggestedName: name,
      types: [
        {
          description: "GPX track",
          accept: { "application/gpx+xml": [".gpx"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }
  return true;
}
export function isCancelled(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (!!error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "CANCELLED")
  );
}

export async function shareRoutecard(
  title: string,
  text: string,
): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    await NativeFiles.shareText({ title, text });
    return true;
  }
  if (typeof navigator.share !== "function") return false;
  await navigator.share({ title, text });
  return true;
}

export async function sharePDF(title: string, blob: Blob) {
  const name =
    (title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .trim()
      .slice(0, 80) || "Route Card") + "-route-card.pdf";
  if (Capacitor.isNativePlatform()) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    await NativeFiles.shareFile({ name, data: btoa(binary) });
    return;
  }
  const file = new File([blob], name, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
