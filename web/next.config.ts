import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Video thumbnails come from YouTube's own picture server. Nothing else is fetched from outside.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Only rideplanner.in belongs in search results. The same site on meel-livid.vercel.app, on a
        // deployment's own address, or on this machine is kept out, so search engines never list a copy.
        source: "/:path*",
        missing: [{ type: "host", value: "rideplanner.in" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
