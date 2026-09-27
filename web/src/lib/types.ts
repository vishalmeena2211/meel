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
}

export interface Pump {
  id: string;
  name: string;
  brand: string | null;
  near: string | null;
  km_from_start: number;
  lat: number;
  lon: number;
  opening_hours: string | null;
  osm_url: string;
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
}
