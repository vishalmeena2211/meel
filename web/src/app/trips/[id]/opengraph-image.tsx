import { ImageResponse } from "next/og";

import SiteCard from "@/app/opengraph-image";
import { indiaDay, sayDate, stoneCap } from "@/lib/format";
import { getRouteView } from "@/server/route-view";
import { getTrip } from "@/server/trips";

/*
  The card a chat app shows when a trip's link is pasted into a group. Drawn as screen 19, frame 4.
  It carries what a rider decides on: the route, the dates, where it starts, and the places left.
  A trip that is not on the board (waiting for the editor, hidden, withdrawn, or already ridden) shows
  Meel's own card instead, so a preview never gives one away. Never the chat group link.
*/

export const alt = "A trip on Meel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Places fill up, so the card is made again at most every ten minutes. Chat apps keep their own copy anyway.
export const revalidate = 600;

const TONE = {
  open: { bg: "#e7f6ec", fg: "#17663a" },
  full: { bg: "#fff4db", fg: "#8a4b06" },
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip || trip.status !== "open" || trip.back_on < indiaDay()) return SiteCard();

  const view = await getRouteView(trip.route_slug);
  const name = view?.route.name ?? trip.route_slug;
  const cap = stoneCap(view?.route.header.highway?.value) || "MEEL";
  const left = trip.places - trip.going;
  const tone = left > 0 ? TONE.open : TONE.full;
  const dates = `${(sayDate(trip.leaves_on) ?? trip.leaves_on).replace(/ \d{4}$/, "")} to ${sayDate(trip.back_on) ?? trip.back_on}`;

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
          <div style={{ display: "flex", fontSize: 34, color: "#55615b" }}>{`Trip · led by ${trip.leader_name}`}</div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.08 }}>{name}</div>
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
            {left > 0 ? `${left} OF ${trip.places} PLACES LEFT` : "FULL"}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#55615b", lineHeight: 1.3 }}>{`${dates} · from ${trip.from_city}`}</div>
        </div>
      </div>
    ),
    size,
  );
}
