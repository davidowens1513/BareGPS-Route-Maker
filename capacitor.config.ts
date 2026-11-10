import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.baregps.routemaker",
  appName: "BareGPS Route Maker",
  webDir: "dist",
  ios: { contentInset: "never" },
  android: { backgroundColor: "#f5f6f2" },
};
export default config;
