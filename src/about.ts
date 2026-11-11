import { icon } from "./icons";
import thirdPartyNotices from "./third-party-notices.txt?raw";
const noticesHTML = thirdPartyNotices
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

export const aboutGuide = `
<div id="about-guide" class="about-guide" role="region" aria-label="About information" tabindex="0">
<section class="about-overview"><h3>Overview</h3><p>Draw, shape and share a walking route directly on the map.</p><p><a href="https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Support-Page-4150e3f94c3580c99fd8e2fad309826e" target="_blank" rel="noopener noreferrer">Support</a> · <a href="https://mixolydian-flyingfish-56d.notion.site/BareGPS-Route-Maker-Privacy-Policy-4150e3f94c35804389a3f3d3773b261e" target="_blank" rel="noopener noreferrer">Privacy Policy</a></p></section>
<details id="about-create" class="about-section"><summary><h3>Make a route</h3></summary><div class="about-section-content"><ul>
<li><strong>Add points:</strong> Tap the map to place your start point, then continue tapping to extend the route.</li>
<li><strong>Insert a point:</strong> Choose Insert point, then tap a route line between two existing points.</li>
<li><strong>Move a point:</strong> Drag its marker.</li>
<li><strong>Delete a point:</strong> Select its marker and choose Delete point, or use its bin in the Route Card.</li>
<li><strong>Close loop:</strong> Join the last point back to the start.</li>
<li><strong>Name your route:</strong> Edit its name in the Route Card.</li>
<li><strong>Choose a colour:</strong> Open Settings to change the route’s line and export colour.</li>
<li><strong>Reset:</strong> Clear all points and restore the default route name after confirmation. Undo restores the previous route.</li>
<li><strong>Save Route:</strong> Fetch any missing terrain heights and save a GPX file to your chosen location. If terrain fails, retry or choose Save without terrain.</li>
</ul></div></details>
<details class="about-section"><summary><h3>Terrain and height estimates</h3></summary><div class="about-section-content"><p>Fetch Terrain looks up ground heights along your route so the app can estimate how much climbing and descending it involves. It needs an internet connection.</p><p>Fetch Terrain sends route coordinates to Open Topo Data, using the Mapzen dataset.</p><p>The primary ascent/descent metrics show u/a for missing, incomplete or invalidated heights. Ascent sums positive height changes; descent sums negative changes.</p></div></details>
<details class="about-section"><summary><h3>Route Cards and sharing</h3></summary><div class="about-section-content"><p>The Route Card lists the points along your route and shows distances, heights and climbing estimates.</p><p>Expanding Route Card allows sharing of your route either in text or PDF format.</p></div></details>
<details class="about-section"><summary><h3>Maps, coordinates and Settings</h3></summary><div class="about-section-content"><p>The app uses OpenTopoMap for the map display and Open Topo Data to fetch terrain data. Both need data access to load maps and terrain details.</p><p>Fit ${icon("fit", 16)} frames the route; Expand ${icon("expand", 16)} map provides more room.</p><p>Settings offers Lat/Long (WGS84), Irish National Grid, British National Grid, ITM, MGRS, UTM and USNG. The choice applies to map readouts and text/PDF cards; GPX uses WGS84. Regional conversions are approximate and coordinate precision does not imply GPS accuracy.</p><p>Settings also includes Colouring and Point Naming options.</p><p>Your preferences are retained.</p></div></details>
  <details id="about-credits" class="about-section">
    <summary><h3>Credits &amp; Attributions</h3></summary>
    <div class="about-section-content">
      <p><strong>Copyright.</strong> © AppsbyOnzy · <a href="mailto:appsbyonzy@gmail.com">appsbyonzy@gmail.com</a></p>
      <p><strong>The BareGPS family.</strong> Visit <a href="https://appsbyonzy.dev" target="_blank" rel="noopener noreferrer">appsbyonzy.dev</a> for BareGPS apps and other outdoor mapping tools.</p>
      <p><strong>Maps.</strong> Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>, available under the Open Database Licence (ODbL), with SRTM elevation data. Map rendering © <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>, under <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a>. Thanks to the contributors who create and maintain these maps.</p>
      <p><strong>Terrain heights.</strong> Elevation estimates use <a href="https://www.opentopodata.org/datasets/mapzen/" target="_blank" rel="noopener noreferrer">Open Topo Data’s Mapzen dataset</a>, assembled from multiple open elevation sources. Credits and source-specific terms are listed in the <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener noreferrer">Mapzen / Tilezen terrain attributions</a>.</p>
      <p><strong>Open-source software.</strong> Built with <a href="https://capacitorjs.com" target="_blank" rel="noopener noreferrer">Capacitor</a> and its <a href="https://github.com/ionic-team/capacitor-geolocation" target="_blank" rel="noopener noreferrer">Geolocation plugin</a> for the native app, <a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer">Leaflet</a> for interactive maps, <a href="https://proj4js.org/" target="_blank" rel="noopener noreferrer">Proj4js</a> and <a href="https://github.com/proj4js/mgrs" target="_blank" rel="noopener noreferrer">mgrs</a> for coordinate conversions, <a href="https://github.com/parallax/jsPDF" target="_blank" rel="noopener noreferrer">jsPDF</a> and <a href="https://github.com/simonbengtsson/jsPDF-AutoTable" target="_blank" rel="noopener noreferrer">jsPDF-AutoTable</a> for PDF cards, and <a href="https://github.com/jakearchibald/idb-keyval" target="_blank" rel="noopener noreferrer">idb-keyval</a> for local storage. These projects and their contributors retain their respective copyrights and licences.</p>
      <p><strong>Software licences.</strong> Leaflet uses BSD-2-Clause; idb-keyval uses Apache-2.0. Capacitor, Geolocation, Proj4js, mgrs, jsPDF and jsPDF-AutoTable use MIT.</p>
      <details class="about-notices"><summary>Third-party copyright and licence notices</summary><pre>${noticesHTML}</pre></details>
      <p><strong>Web hosting.</strong> The web preview and its terrain relay are hosted through Cloudflare.</p>
    </div>
  </details>
</div><div class="about-dialog-actions"><button class="button primary full" data-close>Done</button></div>`;
