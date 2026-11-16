# BareGPS Route Maker

Draw, shape and share a walking route directly on the map.

**iPhone 1.0.1 · build 102. Android 0.1.6 · build 12. Browser/source version 0.1.6.**

[Open in browser](https://appsbyonzy.dev/tools/baregps-route-maker/) · [Downloads and instructions](https://appsbyonzy.dev/#baregps-route-maker) · [Development and validation notes](docs/development.md)

## Making a route

- Tap the map to add points. Insert points between existing points, drag markers to move them, or select a point to delete it. Close loop joins the finish back to the start.
- Name the route in its Route Card. Save Route suggests that name as the GPX filename; the GPX also contains the chosen route name. Invalid filename characters are removed from the suggested filename.
- Choose a line colour and coordinate display in Settings. GPX always uses WGS84 coordinates.
- Switch directly between OpenTopo and Satellite using the layers icon below the current-position button. The map position and route stay in place, the choice is remembered, and About credits follow the selected provider.
- Undo/Redo changes while working. Reset asks for confirmation, clears the route and restores its default name; Undo restores the previous route.

Route Maker draws routes from scratch. It has no GPX importer, Input Tracks, simplification tool or Route Plan. [Track Editor](https://appsbyonzy.dev/#baregps-track-editor) works with existing tracks.

## Heights, saving and Route Cards

Fetch Terrain requests estimated ground heights from Open Topo Data's Mapzen dataset. Save Route fetches missing terrain before saving; after a failure you can retry or choose Save without terrain. Requests can be cancelled, and late results do not change the route.

Route Cards include every drawn point. Point Naming controls the optional name column. Expand the card to share text or a portrait A4 PDF. Distances and ascent use the full route; GPX retains every route point.

Drawing has no application-imposed point cap. Terrain jobs support up to 5,000 points, including added samples roughly 90 metres apart. Each response is bounded to 20 seconds and the complete job to three minutes. On phones a native request may finish in the background after cancellation, without applying its result. Incomplete or stale elevation totals show **u/a**. Heights are unsmoothed estimates, and noise can inflate ascent.

## Storage, maps and supported devices

The drawing, terrain and preferences are saved locally where storage is available. Autosave is recovery, not cloud sync or a complete backup. Export important routes and protect your device.

Online maps and terrain need internet. Map providers receive the area being viewed; terrain services receive route coordinates. Browser terrain requests use a Cloudflare-hosted relay. About includes provider attribution and third-party licences.

Native projects target iPhone and Android phones. Tablets and iPads can use the responsive browser app. There is no navigation, activity recording, account or offline map pack. Lines connect points directly and do not follow paths automatically; check access, terrain and walkability independently.

## Download or build

The public Android APK is release-signed and non-debuggable. Keep the same signing identity for future updates. Application ID: `com.baregps.routemaker`.

The iPhone download is an Xcode source bundle with prebuilt web assets, **not an installable IPA or TestFlight package**. Open `ios/App/App.xcodeproj`, choose your development team and connected iPhone, then Build/Run. Bundle ID: `com.baregps.routemaker`. Source versions are not a claim of App Store approval or availability.

For source builds, use Node.js/npm, Xcode for iOS, and the Android SDK with Java 21:

```sh
npm ci
npm test
npm run build
npm run native:sync
npm run ios
npm run android
```

`npm run dev` starts local development; `npm run test:e2e` runs browser checks. `npm run build:web` builds the hosted preview. `python3 scripts/distribution/package-bundles.py` packages platform downloads after a signed release APK is available. The packager verifies the permanent Android certificate and excludes signing material. Supply private signing properties externally through `BAREGPS_ANDROID_SIGNING_PROPERTIES` or `-PbaregpsSigningProperties=/absolute/private/path/release.properties`.

Both native projects use this repository's dependencies. Track Editor is not required to build Route Maker. The existing Cloudflare Pages site hosts the browser app and its scoped terrain relay.

## Support and terms

Provided **as is**, without warranty. Review routes and exported files before relying on them outdoors.

Copyright © AppsbyOnzy. [Support](https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Support-Page-4150e3f94c3580c99fd8e2fad309826e) · [Privacy Policy](https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Privacy-Policy-4150e3f94c35804389a3f3d3773b261e) · [Email](mailto:appsbyonzy@gmail.com). No source licence is granted by this README; third-party licences remain applicable.
