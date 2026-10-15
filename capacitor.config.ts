import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iPhone prototype shell (see docs/IOS_PROTOTYPE_SETUP.md).
 *
 * MENTA is a server-rendered Next.js app, so the iOS app loads a running
 * MENTA site instead of bundling static files. Staging previews sit behind
 * Vercel login, so the prototype loads your Mac's dev server over Wi-Fi.
 */
const serverUrl = process.env.CAP_SERVER_URL;
if (!serverUrl) {
  throw new Error(
    "Set CAP_SERVER_URL to the MENTA site the iPhone app should load, e.g.\n" +
      "  CAP_SERVER_URL=http://192.168.1.161:3000 npx cap sync ios\n" +
      "(your Mac's LAN IP running `npm run dev -- -H 0.0.0.0`; see docs/IOS_PROTOTYPE_SETUP.md)"
  );
}

const config: CapacitorConfig = {
  appId: "coach.menta.app",
  appName: "MENTA",
  webDir: "capacitor-shell",
  backgroundColor: "#000000",
  ios: {
    contentInset: "never",
    backgroundColor: "#000000",
  },
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
};

export default config;
