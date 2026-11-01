import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

export default function nextConfig(phase: string): NextConfig {
  return {
    // `next dev` gets its own folder. `next build` (pnpm build, CI-style checks) rewrites .next,
    // which would delete a running dev server's files and make every page return 500.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
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
}
