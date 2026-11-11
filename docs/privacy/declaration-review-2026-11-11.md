# Privacy declaration review — 11 November 2026

Scope: BareGPS Route Maker 0.1.2 (3), com.baregps.routemaker. Track Editor is unchanged.

## Published policy and support

- Privacy: https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Privacy-Policy-4150e3f94c35804389a3f3d3773b261e
- Support: https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Support-Page-4150e3f94c3580c99fd8e2fad309826e
- Both pages use the green logo and are linked from About and the website.

The privacy wording describes map requests during loading, panning and zooming; possible precise/coarse viewed areas; IP and normal request metadata; possible access/error/security/backup logs; no verified fixed provider retention period; potential network linkage; and terrain coordinate transfer, including automatic fetching while saving. No deletion or anonymity promise is made.

## Verified app behaviour

No accounts, advertising SDK, analytics SDK, advertising identifier or tracking code. The model analytics function calculates route metrics locally. Geolocation is optional, one-shot and initiated by the location control, with no background location capability. IndexedDB stores routes and preferences locally. There is no developer route database.

OpenTopoMap receives requested map tile paths/areas and network metadata. Open Topo Data receives sampled route coordinates and network metadata; browser terrain passes through Cloudflare. Route and point names are not sent in terrain requests. GPX/Route Card sharing uses destinations selected by the user. Destination copies are outside app control. HTTPS endpoints are used.

## Conservative declarations included in this release

The user declined provider contact. No inquiries were sent. Production retention and linkage could not be established from public documentation. The iOS PrivacyInfo.xcprivacy therefore declares Precise Location, Coarse Location and Other Diagnostic Data for App Functionality, potentially linked to the user, with no tracking. This is a conservative disclosure assumption covering possible retained/IP-linked service logs, not confirmation of actual provider practices. Other Diagnostic Data refers to possible access/error/security diagnostics, not an app analytics SDK.

The manifest is included in the native build and source bundle. App Store Connect has not been edited or submitted. Proposed Store answers are in app-store-privacy-assessment.json; they require reconciliation with the final archive/report and any later provider evidence before submission. Do not claim a verified retention duration or a published Store privacy label.

## Required-reason API and permissions audit

The app, Capacitor 8.6.0 and geolocation 8.2.4 / IONGeolocationLib 3.0.0 sources were searched for required-reason API families (UserDefaults, file timestamps, disk space, uptime and active keyboard use). No additional app use requiring a reason was identified. The custom export bridge writes/shares files without reading file timestamps. Capacitor/Cordova include their own manifests. Recheck the final archive and Xcode privacy report before upload; do not invent an API reason.

Info.plist location-purpose strings remain for plugin requirements. No Always/background location capability is enabled. Android requests only internet, coarse and fine location. No tracking consent prompt is required by the inspected behaviour.

## Provider investigation follow-up - 11 November 2026

### OpenTopoMap

The live About page and imprint were read, including the ISO-8859-1 About page fetched directly because the web reader could not decode it. Neither page states an access/error-log retention duration, anonymisation-before-storage rule, backup deletion period or identity-linkage policy. The imprint identifies the public contact as stefan@opentopomap.org.

The provider's published server setup mentions Apache log rotation/compression. This is evidence of a logging-capable example deployment, not proof of the live tile servers' configuration or retention. No period can be inferred from log rotation or from an unrelated organisation's OpenStreetMap privacy policy.

Source snapshot: der-stefan/OpenTopoMap commit 60c50cb8329d67c8556cd9f25b4a8e50bfc19c91, mapnik/HOWTO_Ubuntu_18.04 lines 147-148.

### Open Topo Data

The public API documentation describes requests and limits but does not state production request-log retention, anonymisation or identity linkage. Its official documentation identifies andrew@opentopodata.org as the support contact.

The published Docker nginx configuration explicitly enables access logging and informational error logging to stdout. This disproves an assumption that the software is necessarily log-free. It does not establish whether the live public API uses that configuration, what its log format includes, or how long a host retains stdout logs. The actual production URL includes route/sample coordinates in a GET query; HTTPS does not hide that query from the receiving service or its logs.

Source snapshot: ajnisbet/opentopodata commit 2f365f8d9018aea7b3d70a762bc8c29515c9dd1b, docker/nginx.conf lines 4-5.

## Primary references

- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- https://capacitorjs.com/docs/ios/privacy-manifest
- https://capacitorjs.com/docs/apis/geolocation
- https://opentopomap.org/about
- https://opentopomap.org/credits
- https://github.com/der-stefan/OpenTopoMap/blob/60c50cb8329d67c8556cd9f25b4a8e50bfc19c91/mapnik/HOWTO_Ubuntu_18.04#L147-L148
- https://www.opentopodata.org/api/
- https://github.com/ajnisbet/opentopodata/blob/2f365f8d9018aea7b3d70a762bc8c29515c9dd1b/docker/nginx.conf#L4-L5
