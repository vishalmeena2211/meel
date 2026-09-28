import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/site";

/** What a phone shows when a rider adds Meel to the home screen. It opens as the website, in the browser. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · dated facts for Indian motorcycle routes`,
    short_name: SITE_NAME,
    description:
      "Fuel gaps, permits, passes and night halts for Indian motorcycle routes. Every fact shows where it came from and when it was last confirmed.",
    start_url: "/",
    display: "browser",
    background_color: "#e8ece9",
    theme_color: "#16201c",
    lang: "en-IN",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
