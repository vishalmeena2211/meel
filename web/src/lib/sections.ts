/*
  The parts of a route. On a phone each is a screen of its own, reached from the list "On this page".
  On a wider screen they sit one under another, with the list at the side.

  A section's id is also the middle of its address: /routes/manali-leh/fuel
*/

export type SectionId =
  | "open"
  | "fuel"
  | "rules"
  | "altitude"
  | "road"
  | "network"
  | "mechanics"
  | "hours"
  | "stays"
  | "packing"
  | "videos"
  | "bikes"
  | "costs";

/** Screens of a route that are not sections of facts. */
export type ToolId = "fuel-check" | "trips" | "sources" | "getting-there" | "map-apps" | "emergency" | "tell-home";

export const SECTION_NAMES: Record<SectionId, { name: string; chip: string }> = {
  open: { name: "Is it open?", chip: "Is it open?" },
  fuel: { name: "Fuel", chip: "Fuel" },
  rules: { name: "Rules for motorcycles", chip: "Bike rules" },
  altitude: { name: "Altitude and night halts", chip: "Altitude" },
  road: { name: "Trouble on the road", chip: "Trouble" },
  network: { name: "Mobile network", chip: "Network" },
  mechanics: { name: "Mechanics and puncture repair", chip: "Mechanics" },
  hours: { name: "Real riding hours", chip: "Hours" },
  stays: { name: "Stays", chip: "Stays" },
  packing: { name: "Packing list", chip: "Packing" },
  videos: { name: "Videos", chip: "Videos" },
  bikes: { name: "Bikes riders took", chip: "Bikes" },
  costs: { name: "What the trip cost", chip: "Cost" },
};

/** The order sections are listed in. */
export const SECTION_ORDER: SectionId[] = [
  "open",
  "fuel",
  "rules",
  "altitude",
  "road",
  "network",
  "mechanics",
  "hours",
  "stays",
  "packing",
  "videos",
  "bikes",
  "costs",
];

/** Sections that only riders can fill. Until they do, the page lists them as not here yet. */
export const FROM_RIDERS: SectionId[] = ["mechanics", "network", "hours", "stays"];

/** Sections worked out from trip reports. They stay locked until a route has this many. */
export const FROM_REPORTS: SectionId[] = ["bikes", "costs"];
export const REPORTS_NEEDED = 10;

export const TOOL_IDS: ToolId[] = ["fuel-check", "trips", "sources", "getting-there", "map-apps", "emergency", "tell-home"];

/** The screens a rider opens the night before. Each needs the road's line. */
export const BEFORE_YOU_LEAVE: ToolId[] = ["getting-there", "map-apps", "emergency", "tell-home"];

export function isSection(value: string): value is SectionId {
  return value in SECTION_NAMES;
}

export function isTool(value: string): value is ToolId {
  return (TOOL_IDS as string[]).includes(value);
}
