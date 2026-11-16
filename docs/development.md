# Development and validation notes

## Route Maker 0.1.6 / iOS 1.0.1 — publication

- Save Route uses the chosen route name for the suggested GPX filename, rather than overriding it with Created Route. GPX metadata and track names continue to use the route name. Invalid filename characters are removed for the filesystem only.
- A single layers icon below the current-position button switches directly between OpenTopo and Satellite, preserving map position, zoom, drawing and edit history. The selected layer is stored separately from the route workspace.
- Both the on-map attribution and About credits reflect the selected layer.
- The layer button follows the current busy state on every render, re-enabling after saving or terrain work completes, fails or is cancelled.
- iOS version prepared as 1.0.1 (102). Android project/source version is 0.1.6 (12); the public website remains unchanged.
- Submission requires a fresh Xcode archive and App Store Connect upload/review. No submission is implied by source preparation.

## Validation

- All 64 tests pass, including real native save request/GPX contents, UI rename-save flow with and without fetched terrain, layer preference/credits and recovery after success/cancel/failure.
- TypeScript and production web build pass. Capacitor assets copied into both native projects; iOS dependency path normalized to this checkout.
- Xcode build and release archive succeeded. Xcode Organizer shows com.baregps.routemaker, 1.0.1 (102), arm64. Every archived web asset matches the tested production build. [Archive validation](testing/ios-1.0.1-build102.json). The archive has not been uploaded to Apple.
- [Update text and review checks](distribution/update-1.0.1.txt).

## Review notes

Satellite uses Esri World Imagery; map area/network requests go to the selected provider. Provider disclosure must include Esri in the published privacy policy before submitting the update. Existing native privacy declarations conservatively cover location and diagnostic information; do not assume verified provider retention periods.

## Phone installation — 16 November 2026

Installed and launched iOS 1.0.1 (102) on TestBed iOS. Installed release-signed Android 0.1.6 (12) on SM-A075F, retaining its existing release signing identity and app data. Android Studio uses Java 21 for this Gradle 8.14.3 project. The release signing properties can be provided through the existing environment variable or `-PbaregpsSigningProperties=/path/to/release.properties`; no private values are committed. All packaged Android web assets match the tested production build. [Installation verification](testing/phone-installs-2026-11-16.json).

The Android phone rejected a development-signed update because its installed app was release-signed. The successful update used the permanent Route Maker release key; no uninstall or data clearing was used. Public website/downloads and Apple upload are unchanged.


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

The website preview and versioned downloads are being aligned with Android/web/source 0.1.6 build 12 and iOS 1.0.1 build 102. These are the functional versions installed earlier today. About already contains the direct layer toggle and selected-provider credits; this publication includes that current guide. The README describes current behaviour only and links here for progress. The signed Android APK matches all nine current native web assets. Earlier Route Maker website files are restored from the retained publication snapshot and kept alongside the latest downloads. Publication and live verification results follow when confirmed. No App Store submission is performed by this publication.
