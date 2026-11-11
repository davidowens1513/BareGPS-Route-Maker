# Privacy declaration review - 11 November 2026

Scope: BareGPS Route Maker 0.1.1 (2), com.baregps.routemaker. Track Editor is unchanged.

## Published information

- Privacy Policy: https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Privacy-Policy-4150e3f94c35804389a3f3d3773b261e
- Support: https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Support-Page-4150e3f94c3580c99fd8e2fad309826e
- Both public Notion pages use the green Route Maker logo. Both are linked in About.

## Verified in source

- No accounts, ad SDK, analytics SDK, advertising identifier or tracking code. `analytics()` in model.ts calculates route distance and ascent on-device; it is not telemetry.
- One-shot geolocation after permission, initiated by the location control. No location watch, background modes or Android background location permission.
- Local route and preferences in IndexedDB through idb-keyval. No developer-operated route upload or cloud account.
- OpenTopoMap tile requests expose viewed map areas and ordinary network metadata. Native terrain requests send route/sample coordinates directly to Open Topo Data; browser terrain goes through Cloudflare. Route names and point names are not in terrain requests.
- GPX and Route Cards are written/shared through the destinations selected by the user. Temporary native export files are removed after the share/export callback where implemented. Saved destination copies are outside the app's control.
- HTTPS endpoints. No arbitrary cleartext exception added.

## iOS manifest and permission declarations

`PrivacyInfo.xcprivacy` is included in the app's Resources build phase. It explicitly declares no tracking and an empty tracking-domain list. The app-owned collected-data list is empty because this app has no developer-operated collection backend. That is NOT a blanket 'Data Not Collected' decision for App Store Connect: external service retention must also be considered.

The native app, resolved Capacitor 8.6.0 and geolocation 8.2.4 / IONGeolocationLib 3.0.0 sources were searched for the required-reason API families (UserDefaults, file timestamps, disk space, uptime and active keyboard use). No app usage requiring an added approved reason was identified. The custom file bridge writes and shares files but does not read file timestamps. Capacitor and Cordova include their own privacy manifests. Do not add a fictional UserDefaults or file-timestamp reason merely because the app stores data or exports files. Recheck the final archive and Xcode privacy report before upload.

Info.plist already has the required location-purpose strings. Both location keys are retained for the installed geolocation plugin's requirements; no Always/background location capability is enabled. Android declares only internet, coarse and fine location. No tracking consent prompt is required by the inspected code because no tracking is implemented.

## App Store Connect answers and unresolved item

Verified answers: tracking = No; advertising = No; accounts = none; location permission = optional and for current-map position; public privacy policy = URL above. Local-only route names, preferences and coordinates are not by themselves off-device collection.

Do not publish 'Data Not Collected' yet. Apple distinguishes real-time processing from longer retention. OpenTopoMap and Open Topo Data receive IP/request information, and terrain coordinates leave the device. Their production log retention and identity linkage could not be established from the available provider documentation. Confirm those facts before finalising collection categories and linkage. If retained, consider precise/coarse location and technical/diagnostic data as applicable, for App Functionality; confirm linkage from provider handling. Update this app manifest if the final collection assessment requires it. Do not mark a category or purpose based only on a guess.

No App Store Connect declaration has been published in this session. The public Privacy Policy discloses these external requests without claiming that providers keep no logs. This remaining service-retention decision is a submission gate, not a reason to block local phone testing.

## Primary references

- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- https://capacitorjs.com/docs/ios/privacy-manifest
- https://capacitorjs.com/docs/apis/geolocation
- https://www.opentopodata.org/
