import { km, plural, sayDate } from "@/lib/format";
import { gpxPath, googleMapsLink, organicMapsLink } from "@/lib/route-file";
import type { HelpPlace, Route, RouteHelp } from "@/lib/types";

import { IconExternal, IconMap, IconSave } from "../icons";
import { ShowMore } from "../show-more";
import { Callout, SectionHeading } from "../ui";

/*
  Two of the three screens a rider opens the night before: the route file for their map app, and the emergency card.
  The third, the message for home, is written in the browser: see tell-home.tsx.
*/

function LinkRow({ href, title, sub, app }: { href: string; title: string; sub: string; app: string }) {
  return (
    <a
      href={href}
      data-track="Map app opened"
      data-track-props={JSON.stringify({ app })}
      target="_blank"
      rel="noreferrer noopener"
      className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">
        <IconMap />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">{title}</b>
        <span className="hint block">{sub}</span>
      </span>
      <IconExternal className="size-4 shrink-0 text-ink-2" />
    </a>
  );
}

/** The route file, and the two map apps that open straight from a link. Meel itself draws no map. */
export function MapAppsScreen({ route }: { route: Route }) {
  const organic = organicMapsLink(route);
  const google = googleMapsLink(route);
  const pumps = route.fuel.listed ? route.fuel.pumps.length : 0;
  const stops = Math.min(Math.max(route.waypoints.length - 2, 0), 9);
  return (
    <div className="flex flex-col gap-3">
      <Callout tone="info" title="Meel draws no map">
        Your map app draws the road on its own map. The file carries the road line and the places on it.
      </Callout>
      <a
        className="btn btn-primary btn-block md:w-auto md:self-start"
        href={gpxPath(route.slug)}
        download={`${route.slug}.gpx`}
        data-track="Route file downloaded"
      >
        <IconSave />
        Download the route file (GPX)
      </a>
      <p className="hint">
        Opens in Organic Maps, OsmAnd, Google Earth and most riding apps. {km(route.header.distance_km)} of road,{" "}
        {plural(route.waypoints.length, "place")}
        {pumps > 0 ? `, ${plural(pumps, "pump")}` : ""}. Saved with the route for no network.
      </p>
      {organic || google ? (
        <section className="flex flex-col gap-1.5">
          <h2 className="label">Or open it straight in an app</h2>
          <div className="card flex flex-col">
            {organic ? (
              <LinkRow
                href={organic}
                app="Organic Maps"
                title="Open in Organic Maps"
                sub="Free, works with no network once its map is downloaded"
              />
            ) : null}
            {google ? (
              <LinkRow
                href={google}
                app="Google Maps"
                title="Open in Google Maps"
                sub={stops > 0 ? `Two-wheeler directions through ${plural(stops, "place")} on the way` : "Two-wheeler directions"}
              />
            ) : null}
          </div>
        </section>
      ) : null}
      <Callout title="Check the line before you ride">
        An app picks its own road between the places. Google Maps on a phone browser may keep only the first three stops.
      </Callout>
      <p className="hint">Road line from OpenStreetMap contributors, Open Database Licence. The credit travels inside the file.</p>
    </div>
  );
}

const SOURCE_112 = "https://112.gov.in/";
const SOURCE_1033 = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2265867";
const SOURCE_SATELLITE = "https://indianembassyusa.gov.in/Publicind?id=93";

/** Every national highway number in the route's highway line: "NH 3", "NH 13". */
function nationalHighways(route: Route): string[] {
  const words = route.header.highway?.value ?? "";
  return [...new Set([...words.matchAll(/\bNH[\s-]?(\d+[A-Z]?)\b/gi)].map((m) => `NH ${(m[1] ?? "").toUpperCase()}`))];
}

function nearestPlace(route: Route, at: number): string {
  const w = [...route.waypoints].sort((a, b) => Math.abs(a.km_from_start - at) - Math.abs(b.km_from_start - at))[0];
  return w?.name ?? km(at);
}

function PlaceRows({ places, unnamed }: { places: HelpPlace[]; unnamed: string }) {
  return (
    <ShowMore first={6} noun="places" className="card flex flex-col">
      {places.map((p) => (
        <a
          key={p.osm_url}
          href={p.osm_url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0 hover:bg-surface-2"
        >
          <span className="min-w-0 flex-1">
            <b className="block text-sm leading-5">{p.name ?? unnamed}</b>
            <span className="hint num block">
              {km(p.km_from_start)}
              {p.off_road_m >= 500 ? `, ${km(p.off_road_m / 1000)} off the road` : ""} · from the open map
            </span>
          </span>
        </a>
      ))}
    </ShowMore>
  );
}

/** Numbers that work everywhere, then what the open map shows near the road. Saved with the route for no network. */
export function EmergencyCard({ route, help, fetched }: { route: Route; help: RouteHelp | null; fetched: string }) {
  const highways = nationalHighways(route);
  const gap = help?.hospital_gap;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-2">
        <a
          href="tel:112"
          data-track="Emergency number tapped"
          data-track-props='{"number":"112"}'
          className="card flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2"
        >
          <b className="display num min-w-16 text-[1.75rem] leading-none">112</b>
          <span className="min-w-0">
            <b className="block text-[0.9375rem] leading-5">Police, fire, ambulance</b>
            <span className="hint block">One number for all of India</span>
          </span>
        </a>
        {highways.length > 0 ? (
          <a
            href="tel:1033"
            data-track="Emergency number tapped"
            data-track-props='{"number":"1033"}'
            className="card flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2"
          >
            <b className="display num min-w-16 text-[1.75rem] leading-none">1033</b>
            <span className="min-w-0">
              <b className="block text-[0.9375rem] leading-5">National highway helpline</b>
              <span className="hint block">
                NHAI, on the national highways it runs: {highways.join(", ")} on this route. A mountain highway run by
                the BRO or the state may not be covered.
              </span>
            </span>
          </a>
        ) : null}
      </div>

      {help && help.hospitals.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <SectionHeading title="Hospitals on the way" aside={String(help.hospitals.length)} />
          <PlaceRows places={help.hospitals} unnamed="Hospital, no name on the map" />
          {gap && gap.gap_km >= 60 ? (
            <p className="hint num">
              {km(gap.gap_km)} with no hospital on the map, {nearestPlace(route, gap.from_km)} to{" "}
              {nearestPlace(route, gap.to_km)}.
            </p>
          ) : null}
        </section>
      ) : help ? (
        <Callout title="No hospital on the map near this road">
          The open map shows none within 2 km of the road. That does not mean there is none.
        </Callout>
      ) : (
        <Callout title="Hospitals not looked up yet">
          Meel has not read the open map for hospitals near this road. Call 112 and say where you are.
        </Callout>
      )}

      {help && help.police.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <SectionHeading title="Police on the way" aside={String(help.police.length)} />
          <PlaceRows places={help.police} unnamed="Police post, no name on the map" />
        </section>
      ) : null}

      <Callout tone="warn" title="Satellite phones and messengers">
        Thuraya and Iridium satellite phones are not allowed in India; a Garmin inReach uses Iridium. They can be seized
        and the owner fined.{" "}
        <a className="link font-medium" href={SOURCE_SATELLITE} target="_blank" rel="noreferrer noopener">
          Embassy of India notice
        </a>
      </Callout>

      <section className="flex flex-col gap-1.5">
        <h2 className="label">Where this came from</h2>
        <ul className="hint flex flex-col gap-1">
          <li>
            112:{" "}
            <a className="link font-medium" href={SOURCE_112} target="_blank" rel="noreferrer noopener">
              112.gov.in
            </a>
            , the government’s emergency response service.
          </li>
          {highways.length > 0 ? (
            <li>
              1033:{" "}
              <a className="link font-medium" href={SOURCE_1033} target="_blank" rel="noreferrer noopener">
                Press Information Bureau
              </a>
              , on NHAI’s helpline.
            </li>
          ) : null}
          <li>
            Hospitals and police: OpenStreetMap contributors, read {sayDate(fetched) ?? "recently"}, at most two in each 10
            km of road. Nobody has checked them.
          </li>
          <li>Satellite phones: the Embassy of India’s notice, which carries no date. The telecom department’s own page could not be opened.</li>
        </ul>
      </section>
      <p className="hint">Saved with the route, so it opens with no network.</p>
    </div>
  );
}
