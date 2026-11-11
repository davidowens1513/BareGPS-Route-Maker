# BareGPS Route Maker

Draw, shape and share a hiking route directly on the map.

**Current versions: iOS 1.0.0 (build 101); Android 0.1.5 (build 11); web/source package 0.1.5.** This is the standalone green Route Maker, split from the former combined BareGPS Route Planner on 10 November 2026. There is no Edit screen or Open in Edit handoff.

[Browser preview](https://appsbyonzy.dev/tools/baregps-route-maker/) · [Downloads and platform instructions](https://appsbyonzy.dev/#tools) · [Source](https://github.com/davidowens1513/BareGPS-Route-Maker)

## What it does

- Draw a route by tapping the map; insert, move or delete waypoints and close loops.
- Choose a route name, line colour and regional coordinate system.
- Fetch terrain estimates and show distance, ascent, descent and an elevation profile.
- Save the full route as GPX; share every Route Card point as text or portrait PDF.
- Keep a local drawing with Undo/Redo. Save Route spans the full row on iOS/Android.
- Draw without an application-imposed waypoint cap; terrain requests retain their separate sampling limit.

## Terrain and Route Cards

Route Cards contain every drawn route point; the Point Naming preference controls whether a name column appears. Expanded cards support sharing as text or PDF, both with all points. Distances and ascent use the full route geometry, and GPX retains every route point.

Terrain uses Open Topo Data's Mapzen dataset, roughly 90-metre sampling and a 5,000-point job limit including added samples. Primary elevation totals show **u/a** while missing, incomplete or invalidated. Heights are unsmoothed estimates; noise can inflate ascent.

Cancellation returns promptly and late results are ignored. Each complete response is bounded to 20 seconds and the full job to three minutes. On phones an active native request may finish in the background after cancellation, without applying its result.

Lines connect points directly; they do not automatically follow paths. Check access and walkability. No navigation, activity recording, accounts, cloud sync or offline map packs are provided.

## Source layout

Route Maker contains drawing and route-card UI only. It has no GPX importer, Input Tracks, simplification module, Route Plan or inbound native-file queue. Its saved workspace holds only the drawing and fetched terrain.

The two products have independent entry points and storage models; there is no product-mode switch. The current main branch includes independent dependencies, phone targets, published policy links and the refinements below.

## Run and build

Requirements: Node.js with npm, installed dependencies, Xcode for iOS, Android SDK and Java 21 for Android.

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
npm run native:sync
```

The browser tests exercise this standalone product. The old combined-app browser fixtures and cloning runners have been removed; they remain available in Git history. Shared geometry, terrain, coordinate and export helpers are retained only where this product uses them.

```sh
npm run ios
npm run android
```

Native smoke fixtures cover iOS launch, Android identity and Android system-bar/keyboard insets. The inset check passed on the connected Samsung Galaxy A07. Broader physical-device save/share, lifecycle and failure acceptance remains a release gate. Source cleanup verification is recorded separately from the published release evidence in `docs/testing/`.

## Android signing and installation

Application ID: `com.baregps.routemaker`. Public APKs must be release-signed and non-debuggable. Private signing material is kept outside the repository and excluded from bundles.

```sh
# Point this at your private signing properties; never commit them.
export BAREGPS_ANDROID_SIGNING_PROPERTIES=/absolute/private/path/release.properties
cd android
./gradlew assembleRelease
```

The properties file supplies `storeFile`, `storePassword`, `keyAlias` and `keyPassword`. Keep the signing identity stable for future updates. `scripts/distribution/package-bundles.py` verifies the permanent certificate before packaging.

## iOS distribution

Bundle ID: `com.baregps.routemaker`. Open `ios/App/App.xcodeproj`, select your own development team and build for a connected phone. Public iOS downloads are **source bundles with prebuilt web assets**, not installable IPAs or TestFlight packages. No signing certificates, private keys or provisioning profiles are bundled. App Store/TestFlight distribution still requires its own archive, validation and acceptance.

## Website and packages

`npm run build:web` builds the preview for `/tools/baregps-route-maker/`. The Tools heading at appsbyonzy.dev lists Route Maker and Track Editor as separate sections, each with its own preview, Android APK/ZIP, iOS source ZIP, instructions and Git link. Publishing uses the existing Cloudflare Pages site, not a new hosting project. Its scoped worker relays validated terrain requests for the preview paths.

```sh
python3 scripts/distribution/package-bundles.py
```

Packaging excludes local settings, dependency trees, build caches and signing material. Verify manifest/checksum agreement and archive contents before publishing.

## Storage, privacy and remaining work

Each standalone product has its own app identity and local workspace key. Autosave is device/browser recovery, not a complete backup. Keep original GPX files and export important routes. This split intentionally does not migrate the former combined workspace.

Map providers receive viewed map areas; terrain providers receive coordinates. Browser terrain uses the Cloudflare relay. Sharing sends files only to the destination selected by the user. The in-app guide is not a complete privacy policy.

Outstanding release work includes physical-device failure/lifecycle testing, accessibility/readability, measured supported sizes, a user backup/restore path, documented provider capacity, licence clarification and final Store privacy-label submission and actual TestFlight acceptance. Do not infer App Store readiness from a successful local install.

Copyright © AppsbyOnzy. Support: [appsbyonzy@gmail.com](mailto:appsbyonzy@gmail.com). Dependency and map credits are in About. No new source licence is implied by this split; third-party licences remain applicable.

## Support and privacy

Published on 11 November 2026, with the green Route Maker logo: [Support](https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Support-Page-4150e3f94c3580c99fd8e2fad309826e) and [Privacy Policy](https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Privacy-Policy-4150e3f94c35804389a3f3d3773b261e). Both are linked at the top of About. See `docs/privacy/declaration-review-2026-11-11.md` for the code and dependency audit and the conservative privacy assumptions and remaining App Store submission. Version 0.1.2 (build 3) includes these links, conservative provider-request declarations and independent dependencies.

The native sync script normalises the generated iOS dependency path to this project’s node_modules folder, so a source bundle does not require Track Editor beside it.

Route Maker now has its own physical node_modules folder on the development Mac. Its Android and iOS projects resolve libraries within Route Maker; Track Editor is not required to build or run it. Install the locked dependencies with npm ci when setting up a fresh checkout.

## Supported devices

Native builds target phones: iPhone (device family 1) and Android small/normal screen classes, with common and intermediate densities listed for store filtering. iPad native layouts are not targeted. Tablets, including iPads, use the responsive [web version](https://appsbyonzy.dev/tools/baregps-route-maker/), covered by a tablet browser test alongside phone and desktop tests.

Apple can still offer an iPhone app on iPad in compatibility mode. Android compatible-screen declarations filter store distribution but do not prevent manual APK sideloading; final Play device availability must be reviewed before submission. No artificial hardware requirement has been added.

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
