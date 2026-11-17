# Development and validation notes

## Export name from restored terrain — local iOS build 103 / Android build 13

A regression test reproduces a restored workspace whose drawing is named but whose retained terrain copy still has Created Route. Save previously exported the terrain copy's stale name. Export now takes sampled geometry from the selected track and the name from the current drawing, so the filename and both GPX name fields agree with Route Card. Tests also cover saving two separately named routes with Clear or Reset between them. The supplied XXtest2(2).gpx was inspected: both metadata/name and trk/name contain Created Route, confirming that the name was already wrong before Track Editor import. The restored-terrain case reproduces a matching export failure, though its history cannot be established from GPX alone. All 67 tests, TypeScript and native asset preparation passed. iOS 1.0.1 build 103 is installed and running on TestBed iOS; release-signed Android 0.1.6 build 13 is installed and launched on SM-A075F. Both native packages match current dist assets. Publication was subsequently authorised; see the release record below. Existing exported files are unchanged; re-export from the updated app to create a corrected file.

## Route Maker 0.1.6 / iOS 1.0.1 — publication

- Save Route uses the chosen route name for the suggested GPX filename, rather than overriding it with Created Route. GPX metadata and track names continue to use the route name. Invalid filename characters are removed for the filesystem only.
- A single layers icon below the current-position button switches directly between OpenTopo and Satellite, preserving map position, zoom, drawing and edit history. The selected layer is stored separately from the route workspace.
- Both the on-map attribution and About credits reflect the selected layer.
- The layer button follows the current busy state on every render, re-enabling after saving or terrain work completes, fails or is cancelled.
- iOS version is 1.0.1 (102). Android project/source and browser versions are 0.1.6 (12). The website publication record below covers their alignment.
- Submission requires a fresh Xcode archive and App Store Connect upload/review. No submission is implied by source preparation.

## Validation

- All 64 tests pass, including real native save request/GPX contents, UI rename-save flow with and without fetched terrain, layer preference/credits and recovery after success/cancel/failure.
- TypeScript and production web build pass. Capacitor assets copied into both native projects; iOS dependency path normalized to this checkout.
- Xcode build and release archive succeeded. Xcode Organizer shows com.baregps.routemaker, 1.0.1 (102), arm64. Every archived web asset matches the tested production build. [Archive validation](testing/ios-1.0.1-build102.json). The user subsequently reported uploading and submitting the update for review; this website publication does not submit or change an App Store version.
- [Update text and review checks](distribution/update-1.0.1.txt).

## Review notes

Satellite uses Esri World Imagery; map area/network requests go to the selected provider. Provider disclosure must include Esri in the published privacy policy before submitting the update. Existing native privacy declarations conservatively cover location and diagnostic information; do not assume verified provider retention periods.

## Phone installation — 16 November 2026

Installed and launched iOS 1.0.1 (102) on TestBed iOS. Installed release-signed Android 0.1.6 (12) on SM-A075F, retaining its existing release signing identity and app data. Android Studio uses Java 21 for this Gradle 8.14.3 project. The release signing properties can be provided through the existing environment variable or `-PbaregpsSigningProperties=/path/to/release.properties`; no private values are committed. All packaged Android web assets match the tested production build. [Installation verification](testing/phone-installs-2026-11-16.json).

The Android phone rejected a development-signed update because its installed app was release-signed. The successful update used the permanent Route Maker release key; no uninstall or data clearing was used. These phone installations preceded the website publication documented below.


## Earlier README development record

The following history is retained separately from the current product README.

## Latest fixes - 0.1.3 (build 7)

Map and Route Card expansion controls recover after terrain fetching or GPX saving, including cancellation and failure. A small “Expand to Share” hint appears beside Route Card expansion and hides in the expanded view.

The native iPhone page stays at its normal scale on double taps; map pinch zoom remains available. A native-only viewport policy is applied after Capacitor sets up its content controller, avoiding the iOS double-tap issue that CSS and Capacitor's zoom flag alone did not prevent. The web viewport remains scalable. Native simulator tests reproduce the old enlargement and pass with the correction; a separate pinch test verifies map scale changes without enlarging app controls. The user confirmed the phone screen stays at the right size. Physical automated touch testing could not start and is not reported as passed. These targeted checks do not close the broader native failure, lifecycle or accessibility acceptance work.

## Latest controls and startup fix - 0.1.4 (build 8)

The map has five equal-width controls: Add points, Insert point, Delete point, Close loop and Reset. The existing 34-pixel button height and phone/desktop font sizes are retained; labels wrap onto two lines where needed. Reset asks for confirmation, removes all points and restores the default route name while retaining colour and saved exports, and supports Undo. Insert point is disabled while a waypoint is selected. Add points clears that selection.

On a fresh workspace, the map was constructed while hidden and skipped its size refresh because there were no route points. This could leave only a clipped tile visible until Home/location or another resize. Map fitting now refreshes its size even for an empty route. The fresh-start browser check verifies tiles cover all four map corners before any user interaction. Checks passed at phone, tablet and desktop sizes; the controls also fit 320-pixel phones without reducing type or increasing height.


## Latest refinements — 0.1.5 (build 11)

- Android content and expanded views respect system bars, screen cutouts and the keyboard. The bottom safe area was verified on a physical Samsung Galaxy A07.
- Fit is disabled until a route has points; initial empty-map sizing still refreshes correctly.
- Reset and Clear restore the default “Created Route” name. Undo restores the previous route and name.
- Route Cards include every point. Shared PDFs are portrait A4, show the name column only when Point Naming is enabled, and give all four distance/ascent columns equal widths. Text and PDF share the same closing wording.
- Settings keeps its title, close control and Done visible while options scroll, with a separator above Done. Colours use two centred rows of seven choices plus hex entry. Apply colour enables only for a valid change and disables after applying.
- About keeps its heading and controls visible while the text scrolls. It includes the revised route-making bullets, plain-English terrain and Route Card explanations, accurate provider names and expandable third-party copyright/licence notices. The footer and drawing-point cap have been removed; terrain sampling retains its separate limit.

Validation: 49 unit tests and 44 browser checks passed across phone, tablet and desktop layouts (one desktop touch-only check intentionally skipped). Android release and iPhone device builds passed. Both phones received and launched the latest functional changes before this publication; public build 11 adds release version metadata. These checks do not close the broader Store acceptance work described above.


## First App Store upload — iOS 1.0.0 (build 101)

The iPhone archive was uploaded successfully to App Store Connect on 11 November 2026 as version 1.0.0, build 101. The app record uses `com.baregps.routemaker`. Upload completion is not App Store approval or publication. The iOS source download now includes these Xcode version and signing settings; developers should select their own signing team.

Android remains 0.1.5, build 11, and the web preview retains the same current app features. Store screenshots and the preview recording are kept locally and are not included in Git or website downloads.


## Website publication preparation — 16 November 2026

The website preview and versioned downloads are aligned with Android/web/source 0.1.6 build 12 and iOS 1.0.1 build 102. These are the functional versions installed earlier today. About already contains the direct layer toggle and selected-provider credits; this publication includes that current guide. The README describes current behaviour only and links here for progress. The signed Android APK matches all nine current native web assets. Earlier Route Maker website files are restored from the retained publication snapshot and kept alongside the latest downloads. Cloudflare deployment `79323053-b8d5-4878-9523-f76cb5fd4646` is live. The preview, two-way layer switching, selected-provider About credits and homepage versions were verified. The downloaded APK matches its SHA-256 and all files in both Safari-expanded bundles match the packaged archives. All 64 tests, TypeScript and web build passed. Track Editor and all previous site files remain intact. [Publication and download verification](website/release-0.1.6.json). No App Store submission is performed by this publication.

## Build 103 / 13 publication — 16 November 2026

The user reports uploading iOS 1.0.1 build 103, removing the earlier submission, selecting the new build and submitting it for review. This does not establish Apple approval. Website publication and Git updates are now authorised. Browser and Android remain version 0.1.6; the corrected downloads use a new 0.1.6-build13 directory so earlier published downloads remain unchanged. The README describes current behaviour and links here for history. Verification is recorded in docs/website/release-0.1.6-build13.json.

Production deployment `e8b03317-4297-41a5-8c9b-24f481e0122a` is live. The homepage shows Track Editor 0.3.6 build 80 and Route Maker iOS 1.0.1 build 103 / Android 0.1.6 build 13. Both previews loaded; current About guidance and selected-layer credits were checked. Downloaded APK SHA-256 values and every file in both products’ expanded iOS/Android bundles match the packaged releases. All previous site files are retained. All three repositories were pushed; this verification record is committed separately. App Store Connect was observed showing Route Maker build 103 Waiting for Review.


## Website instruction review — 17 November 2026

Reviewed all 35 current homepage instruction links. All 30 OpenBareMap guides match the regional releases. Corrected Track Editor to 0.3.7 build 81 and Route Maker to Android 0.1.6 build 13 / iOS 1.0.1 build 103; removed obsolete App Store submission status. Added step-by-step Android sideloading, ZIP extraction, installation permissions, safe updates and signing-conflict troubleshooting. The standalone guides and those inside current ZIP downloads agree; checksums and manifests were refreshed without changing APK bytes. Packaging now derives instruction versions/builds and APK filenames from native release metadata. Added Android 7 installation guidance to the BareGPS Ireland guide. Homepage changes: Track Editor uses Privacy | Support; Route Maker blurb no longer includes the filename sentence. Production publication and live verification are recorded in the website instruction-review verification file.
