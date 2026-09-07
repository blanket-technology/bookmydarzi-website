import type { NextConfig } from "next";

// Enables next/image's automatic responsive srcset + lazy-loading + modern
// format (AVIF/WebP) conversion for the two hosts every product/service
// photo actually comes from (see app/api/v1/services and catalog
// endpoints): ImageKit for uploaded catalog/lookbook assets, and the
// backend's own /static/... path for a handful of built-in category icons.
// Without this file, next/image throws for any external host at request
// time - every image on the site was a raw <img> tag as a result, which
// skips all of that optimization and hurts mobile load time the most on
// image-heavy pages (the services grid alone renders ~34 photos).
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "web-production-efff7.up.railway.app",
        pathname: "/static/**",
      },
    ],
  },
};

export default nextConfig;
