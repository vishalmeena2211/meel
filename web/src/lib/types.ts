// The shape of everything in content/, as written by data/tools/assemble.py.

export type SourceKind =
  | "official"
  | "news"
  | "encyclopedia"
  | "blog"
  | "forum"
  | "operator"
  | "map";

export interface Source {
  url: string;
  title: string;
  kind: SourceKind;
  /** True only when the page was actually opened and read. */
  opened: boolean;
  source_date: string | null;
  accessed: string;
}

export interface Sourced<T> {
  value: T;
  source: Source;
}

export type Terrain = "mountain" | "hills" | "plains" | "coast";
export type RouteLevel = "basic" | "full" | "unwritten";

export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  km_from_start: number;
  altitude_m: number | null;
  kind: "place" | "pass";
  moved_to_road_m: number;
}

export interface Stretch {
  from: string;
  to: string;
  distance_km: number;
  map_app_hours: number;
  /** The open map may not know the road riders use. */
  doubtful: boolean;
}

export interface ProfilePoint {
  km: number;
  m: number;
  /** Inside this tunnel. The height grid gives the mountain above it, so the height is drawn straight between its ends. */
  tunnel?: string;
}

/** A tunnel the height line runs straight through. */
export interface Tunnel {
  name: string;
  from_km: number;
  to_km: number;
  length_km: number;
}

export interface Pump {
  id: string;
  name: string;
  brand: string | null;
  near: string | null;
  km_from_start: number;
  /** How far the pump is from the road line, in metres. */
  off_road_m?: number | null;
  lat: number;
  lon: number;
  opening_hours: string | null;
  /** Its page on the open map. Absent for a pump taken from an oil company's own locator. */
  osm_url: string | null;
  /** Where a pump that is not on the open map came from: the oil company's own locator. */
  source?: Source | null;
}

export interface FuelGap {
  from_km: number;
  to_km: number;
  gap_km: number;
  from_is: string;
  to_is: string;
  near_from: string;
  near_to: string;
}

export interface Fuel {
  listed: boolean;
  pumps: Pump[];
  pump_count: number;
  stops: number;
  longest_gaps: FuelGap[];
  note: string | null;
  fetched: string | null;
}

export type RuleKind =
  | "permit"
  | "fee"
  | "tax"
  | "motorcycle-rule"
  | "document"
  | "timing";

export interface RuleChange {
  date: string | null;
  change: string;
  source: Source;
}

export interface Rule {
  id: string;
  kind: RuleKind | string;
  title: string;
  detail: string;
  applies_to: string | null;
  set_by: string | null;
  official_url: string | null;
  has_official_order: boolean;
  source: Source;
  history: RuleChange[];
}

export interface SeasonYear {
  year: number;
  connected: string | null;
  open_to_motorcycles: string | null;
  closed: string | null;
  note: string;
  sources: Source[];
}

export interface Authority {
  id: string;
  office: string;
  announces: string;
  stretch: string | null;
  channel: string | null;
  url: string | null;
  source: Source;
}

export interface Hazard {
  id: string;
  title: string;
  detail: string;
  months: number[];
  source: Source;
}

export interface Video {
  id: string;
  url: string;
  title: string;
  channel: string | null;
  stretch: string | null;
  filmed: string | null;
  bike: string | null;
  checked: boolean;
}

export interface ImageCredit {
  file: string;
  small: string;
  title: string;
  shows: string;
  author: string;
  licence: string;
  licence_url: string;
  source_page: string;
  source: string;
  taken: string | null;
  changes: string;
  fetched: string;
}

export interface HighestPoint {
  name: string;
  altitude_m: number;
  source: Source | null;
  computed: boolean;
}

export interface RouteHeader {
  highway: Sourced<string> | null;
  distance_km: number | null;
  map_app_hours: number | null;
  usual_days: Sourced<string> | null;
  highest_point: HighestPoint | null;
  usual_season: Sourced<string> | null;
}

/*
  The five kinds below come only from riders. No route has any yet.
  The site shows each section as soon as its list is not empty.
*/

/** A mechanic or puncture shop a rider used. A phone number is shown only if the shop agreed to it. */
export interface Mechanic {
  id: string;
  name: string;
  village: string;
  fixes: string;
  phone: string | null;
  phone_agreed: boolean;
  source: Source | null;
}

/** A place to sleep that has no listing online. */
export interface Stay {
  id: string;
  name: string;
  village: string;
  notes: string;
  phone: string | null;
  phone_agreed: boolean;
  source: Source | null;
}

/** What a rider saw on the road, on one day. Not official. */
export interface Sighting {
  id: string;
  title: string;
  detail: string;
  seen_on: string;
  by: string;
  bike: string | null;
}

/** Whether one operator's network worked at one halt, in one month. */
export interface NetworkReport {
  halt: string;
  operator: string;
  worked: boolean;
  /** "2027-06" */
  month: string;
  by: string;
}

/** How long one rider took over one stretch, with stops. */
export interface LegHours {
  from: string;
  to: string;
  hours: number;
  month: string;
  bike: string | null;
  by: string;
}

export interface Route {
  slug: string;
  name: string;
  region: string;
  region_name: string;
  batch: 1 | 2 | 3;
  terrain: Terrain;
  country: string;
  level: RouteLevel;
  one_line: string | null;
  places: string[];
  header: RouteHeader;
  waypoints: Waypoint[];
  stretches: Stretch[];
  profile: ProfilePoint[];
  /** Absent on a route assembled before tunnels were known (28 September 2026). */
  tunnels?: Tunnel[];
  /** [longitude, latitude] pairs. */
  line: [number, number][];
  fuel: Fuel;
  rules: Rule[];
  season: { note: string | null; history: SeasonYear[] };
  authorities: Authority[];
  hazards: Hazard[];
  videos: Video[];
  image: ImageCredit | null;
  gaps: string[];
  counts: { facts: number };
  built: string;
  mechanics?: Mechanic[];
  stays?: Stay[];
  sightings?: Sighting[];
  network?: NetworkReport[];
  leg_hours?: LegHours[];
}

export interface RouteSummary {
  slug: string;
  name: string;
  region: string;
  region_name: string;
  batch: 1 | 2 | 3;
  terrain: Terrain;
  level: RouteLevel;
  one_line: string | null;
  places: string[];
  distance_km: number | null;
  facts: number;
  highest_m: number | null;
  image: string | null;
  has_line: boolean;
}

export interface Region {
  id: string;
  name: string;
}

export interface RouteIndex {
  built: string;
  regions: Region[];
  routes: RouteSummary[];
}

export interface Bike {
  id: string;
  maker: string;
  model: string;
  engine_cc: number | null;
  tank_litres: number | null;
  claimed_kmpl: number | null;
  claimed_kmpl_basis: string | null;
  tyres_tubeless: boolean | null;
  still_sold: boolean | null;
  source: Source | null;
}

export interface PackingItem {
  item: string;
  reason: string;
  /** Months 1 to 12. Empty means every month. */
  months: number[];
  links_to?: "fuel-check" | "rules" | "save";
}

export interface PackingList {
  terrain: Terrain;
  written_by: string;
  items: PackingItem[];
}

export interface FactKind {
  id: string;
  name: string;
  ageing_after_days: number;
  stale_after_days: number;
}

export type FactState =
  | "fresh"
  | "ageing"
  | "stale"
  | "unchecked"
  | "conflict"
  | "pending";

/** A rider or the editor saying what they saw, and when. Kept in the database. */
export interface Confirmation {
  fact_id: string;
  route_slug: string;
  seen_on: string;
  by: string;
  kind: "still-true" | "changed";
  note: string | null;
  /** False while a report of a change waits for the editor. Its words are held back until then. */
  read?: boolean;
  /** The moment the editor applied it to the page. */
  applied_on?: string | null;
}
