import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build output dir. Overridable so a second "preview" dev server (no Supabase
  // env → sample-data sandbox) can run alongside the live one on another port
  // without clobbering its .next cache. Unset = the normal .next, so the live
  // server is unaffected.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Enables React's <ViewTransition> integration so route changes can morph
    // shared elements (the card → trip-header cover is Meridian's signature move).
    viewTransition: true,
  },
};

export default nextConfig;
