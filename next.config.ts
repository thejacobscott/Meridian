import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables React's <ViewTransition> integration so route changes can morph
    // shared elements (the card → trip-header cover is Meridian's signature move).
    viewTransition: true,
  },
};

export default nextConfig;
