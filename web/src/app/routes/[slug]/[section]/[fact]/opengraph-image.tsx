import { ImageResponse } from "next/og";

import { STATE_WORDS } from "@/lib/facts";
import { stoneCap } from "@/lib/format";
import { isSection } from "@/lib/sections";
import { getRouteView } from "@/server/route-view";

// The picture a chat app shows beside a pasted link. It carries the fact and how far to trust it.
export const alt = "One dated fact from Meel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TONE: Record<string, { bg: string; fg: string }> = {
  fresh: { bg: "#e7f6ec", fg: "#17663a" },
  ageing: { bg: "#fff4db", fg: "#8a4b06" },
  stale: { bg: "#fdecea", fg: "#a1241a" },
  unchecked: { bg: "#eef1f4", fg: "#3f4a57" },
  conflict: { bg: "#f1ecfb", fg: "#4e2f8f" },
  pending: { bg: "#fff4db", fg: "#8a4b06" },
};

export default async function Image({ params }: { params: Promise<{ slug: string; section: string; fact: string }> }) {
  const { slug, section, fact } = await params;
  const view = await getRouteView(slug);
  const found = view && isSection(section) ? view.views.all.find((v) => v.section === section && v.slug === fact) : null;
  const title = found?.title ?? view?.route.name ?? "Meel";
  const line = found?.line ?? "Dated facts for Indian motorcycle routes";
  const state = found?.state ?? "unchecked";
  const tone = TONE[state] ?? { bg: "#eef1f4", fg: "#3f4a57" };
  const cap = stoneCap(view?.route.header.highway?.value) || "MEEL";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: 72,
          background: "#ffffff",
          color: "#16201c",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 250,
            height: 310,
            display: "flex",
            flexDirection: "column",
            border: "8px solid #16201c",
            borderRadius: "125px 125px 20px 20px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: 110,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 10,
              background: "#f2b807",
              borderBottom: "8px solid #16201c",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            {cap}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, fontWeight: 700 }}>
            MEEL
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 34, color: "#55615b" }}>{view?.route.name ?? "rideplanner.in"}</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.08 }}>{title}</div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 20px",
              borderRadius: 10,
              background: tone.bg,
              color: tone.fg,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {STATE_WORDS[state].toUpperCase()}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#55615b", lineHeight: 1.3 }}>{line}</div>
        </div>
      </div>
    ),
    size,
  );
}
