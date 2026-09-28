import { ImageResponse } from "next/og";

import { getIndex } from "@/lib/content";
import { SITE_LINE } from "@/lib/site";

/*
  Meel's own card, shown when a link to the site itself is pasted into a chat group or shared.
  Drawn in the wireframes as screen 1, frame 3. It matches the card each fact has (the stone on the left,
  the words on the right). The number of routes is counted when the site is built.
*/

export const alt = "Meel: dated facts for Indian motorcycle routes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const index = await getIndex();
  const routes = index.routes.length;

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
          <div style={{ height: 110, display: "flex", background: "#f2b807", borderBottom: "8px solid #16201c" }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 130, fontWeight: 700 }}>
            M
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 34, color: "#55615b" }}>Meel · rideplanner.in</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.08 }}>{SITE_LINE}</div>
          <div style={{ display: "flex", fontSize: 32, color: "#55615b", lineHeight: 1.3 }}>
            {`Fuel gaps, permits, passes and night halts for ${routes} routes. Every fact shows where it came from and when it was last confirmed.`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
