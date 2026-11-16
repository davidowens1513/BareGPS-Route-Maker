# Development and validation notes

## iOS 1.0.1, build 102 — prepared update

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
