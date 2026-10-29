import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@jobify/shared"],
  // The browser only ever talks to this origin, so auth cookies stay first-party.
  // Evaluated at build time: set API_URL when building, not only when running.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
  webpack(config, { isServer }) {
    // Next 15.5's production build concatenated the "use client" InterviewList
    // module into the page entry, so it was missing from the client reference
    // manifest and the Interviews pages returned 500. Dev was fine. Keeping
    // client modules separate avoids that class of bug at a small size cost.
    if (!isServer) config.optimization.concatenateModules = false;
    return config;
  },
};

export default nextConfig;
