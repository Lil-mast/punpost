import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Client-heavy app; OpenNext/Workers consume the standard Next build.
};

export default nextConfig;

// Enable Cloudflare bindings during local `next dev` when the adapter is present.
try {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
} catch {
  // Optional during plain local Next without Cloudflare tooling.
}
