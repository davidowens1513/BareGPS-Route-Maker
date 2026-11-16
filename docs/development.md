# Development and validation notes

## iOS 1.0.1, build 102 — prepared update

- Save Route uses the chosen route name for the suggested GPX filename, rather than overriding it with Created Route. GPX metadata and track names continue to use the route name. Invalid filename characters are removed for the filesystem only.
- A single layers icon below the current-position button switches directly between OpenTopo and Satellite, preserving map position, zoom, drawing and edit history. The selected layer is stored separately from the route workspace.
- Both the on-map attribution and About credits reflect the selected layer.
- The layer button follows the current busy state on every render, re-enabling after saving or terrain work completes, fails or is cancelled.
- iOS version prepared as 1.0.1 (102). Android and public website version numbers remain unchanged pending their releases.
- Submission requires a fresh Xcode archive and App Store Connect upload/review. No submission is implied by source preparation.

## Validation

- All 64 tests pass, including real native save request/GPX contents, UI rename-save flow with and without fetched terrain, layer preference/credits and recovery after success/cancel/failure.
- TypeScript and production web build pass. Capacitor assets copied into both native projects; iOS dependency path normalized to this checkout.
- Xcode build and release archive succeeded. Xcode Organizer shows com.baregps.routemaker, 1.0.1 (102), arm64. Every archived web asset matches the tested production build. [Archive validation](testing/ios-1.0.1-build102.json). The archive has not been uploaded to Apple.
- [Update text and review checks](distribution/update-1.0.1.txt).

## Review notes

Satellite uses Esri World Imagery; map area/network requests go to the selected provider. Provider disclosure must include Esri in the published privacy policy before submitting the update. Existing native privacy declarations conservatively cover location and diagnostic information; do not assume verified provider retention periods.
