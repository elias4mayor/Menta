import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Next.js 16 blocks cross-origin requests to dev-only assets (_next/static
  // chunks, HMR) by default, allowing only localhost — see
  // node_modules/next/dist/docs/.../allowedDevOrigins.md. Without this,
  // loading the dev server from a phone/tablet via the Mac's LAN IP gets
  // every JS chunk silently 403'd, React never hydrates, and any <form>
  // submit falls back to a plain native GET (blank fields, no error, no
  // account created — this is what broke LAN-IP signup). Dev-only; ignored
  // in production builds. Update this if your LAN IP changes.
  allowedDevOrigins: ["192.168.1.161"],
};

export default nextConfig;
