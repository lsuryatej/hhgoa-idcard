import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Dev server blocks its own JS chunks from origins outside this list —
  // without it, a phone hitting the LAN IP gets a page that never hydrates
  // (file input opens, but nothing is listening for onChange).
  allowedDevOrigins: ["192.168.68.101"],
};

export default config;
