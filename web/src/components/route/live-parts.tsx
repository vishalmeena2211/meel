import { Fragment } from "react";

import { feet, plural, sayMoment } from "@/lib/format";
import {
  OPEN_METEO,
  SACHET_HOME,
  UK_CLOSURES_PAGE,
  type AlertsRead,
  type Closure,
  type ClosuresRead,
  type WeatherDay,
  type WeatherPlace,
  type WeatherRead,
} from "@/server/live";

import { IconExternal } from "../icons";
import { Badge, Callout, SectionHeading } from "../ui";

/*
  What some offices and a weather service say today, read every hour. Each part says when it was read,
  says so plainly when it could not read, and never turns what it read into "open" or "closed".
*/

const GRID = "grid gap-2 lg:grid-cols-2";

/** "Kullu, Lahaul and Spiti or Leh district". */
function districtWords(names: string[]): string {
  const clean = names.map((n) => n.replace(/\s+district$/i, ""));
  if (clean.length <= 1) return `${clean[0] ?? "this"} district`;
  return `${clean.slice(0, -1).join(", ")} or ${clean.at(-1)} district`;
}

function severityTone(severity: string | null): "stale" | "ageing" | "plain" {
  const s = (severity ?? "").toLowerCase();
  return s === "extreme" || s === "severe" ? "stale" : s === "moderate" ? "ageing" : "plain";
}

/** Official alerts in force for the districts the road crosses, in the issuer's words. */
export function OfficialAlerts({ read }: { read: AlertsRead }) {
  const { alerts } = read;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading title="Official alerts" aside={alerts.length > 0 ? `${alerts.length} in force` : undefined} />
      {read.failed ? (
        <Callout tone="warn" title="Could not read the alert feed">
          The government’s alert feed did not answer at {sayMoment(read.read)}. Meel tries again within the hour.{" "}
          <a className="link font-medium" href={SACHET_HOME} target="_blank" rel="noreferrer noopener">
            See the alerts on SACHET
          </a>
        </Callout>
      ) : alerts.length === 0 ? (
        <Callout title="None in force for this road">
          No alert from the government’s feed for {districtWords(read.districts)}, read {sayMoment(read.read)}. That is
          not the same as clear weather.
        </Callout>
      ) : (
        <>
          <div className={GRID}>
            {alerts.map((a) => (
              <article key={a.id} className="fact">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[0.9375rem] leading-5 font-semibold">{a.event}</h3>
                  {a.severity ? <Badge tone={severityTone(a.severity)}>{a.severity}</Badge> : null}
                </div>
                <p className="text-sm leading-5">“{a.headline}”</p>
                <p className="hint num">
                  {a.where} · {a.issuer}
                  <br />
                  Issued {sayMoment(a.sent)}
                  {a.expires ? ` · until ${sayMoment(a.expires)}` : ""}
                </p>
                <a className="link self-start text-sm" href={a.url} target="_blank" rel="noreferrer noopener">
                  Read it on SACHET
                </a>
              </article>
            ))}
          </div>
          <p className="hint">
            From the government’s alert feed (NDMA SACHET), read {sayMoment(read.read)}, for the{" "}
            {plural(read.districts.length, "district")} this road crosses. In the issuer’s words.
          </p>
        </>
      )}
    </div>
  );
}

function kmWords(km: string): string {
  const parts = km.split(/\s*,\s*/).filter(Boolean);
  if (parts.length <= 2) return `km ${parts.join(", ")}`;
  return `km ${parts[0]} to ${parts.at(-1)}`;
}

function closureWords(c: Closure): string {
  const since = c.closedAt ? `${c.status === "Partly reopened" ? "" : " since"} ${sayMoment(c.closedAt)}` : "";
  const expected = c.expectedAt && c.status !== "Partly reopened" ? ` · expected to open ${sayMoment(c.expectedAt)}` : "";
  return `${c.status}${since}${expected}`;
}

/** Main roads Uttarakhand's PWD lists as closed, in the districts the route crosses. */
export function PwdClosures({ read }: { read: ClosuresRead }) {
  const { closures } = read;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading
        title="Closures the PWD lists"
        aside={closures.length > 0 ? `${closures.length} on main roads` : undefined}
      />
      <Callout title="Uttarakhand PWD’s own list">
        National and state highways and major district roads in the {plural(read.districts.length, "district")} this
        route crosses. A road not on the list is not known to be open.
      </Callout>
      {read.failed ? (
        <Callout tone="warn" title="Could not read the PWD’s list">
          It did not answer at {sayMoment(read.read)}. Meel tries again within the hour.
        </Callout>
      ) : closures.length === 0 ? (
        <p className="hint">None of these roads was listed as closed when Meel read the list, {sayMoment(read.read)}.</p>
      ) : (
        <div className={GRID}>
          {closures.map((c) => (
            <article key={`${c.road}|${c.km}|${c.closedAt}`} className="fact">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[0.9375rem] leading-5 font-semibold">
                  {c.road}, {kmWords(c.km)}
                </h3>
                <Badge tone={c.status === "Closed" ? "stale" : c.status === "Partly closed" ? "ageing" : "plain"}>
                  {c.status}
                </Badge>
              </div>
              <p className="text-sm leading-5">{closureWords(c)}</p>
              <p className="hint num">
                {c.district} · {c.roadType} · Uttarakhand PWD
              </p>
            </article>
          ))}
        </div>
      )}
      <a className="btn btn-soft self-start" href={UK_CLOSURES_PAGE} target="_blank" rel="noreferrer noopener">
        <IconExternal />
        Open the PWD’s full list
      </a>
      {read.failed ? null : (
        <p className="hint">
          {closures.length > 0 ? `Read ${sayMoment(read.read)}. ` : ""}Village roads are left out. Names of officers on the
          list are not copied.
        </p>
      )}
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayWords(day: string): string {
  const at = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[at.getUTCDay()]} ${at.getUTCDate()}`;
}

/** "18:59" becomes "6:59 pm". */
function clock(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

function snowWords(cm: number): string {
  if (cm < 0.1) return "—";
  if (cm < 1) return "under 1 cm";
  return `${Math.round(cm)} cm`;
}

function minus(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

function PlaceWeather({ place }: { place: WeatherPlace }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 px-3 pt-2 pb-1.5">
        <b className="text-[0.9375rem] leading-5">{place.name}</b>
        <span className="hint num text-right">
          {feet(place.altitudeM)}
          {place.sunset ? ` · sunset ${clock(place.sunset)}` : ""}
        </span>
      </div>
      <table className="num w-full text-sm">
        <thead>
          <tr className="border-t border-line text-left text-xs text-ink-2">
            <th className="px-3 py-1 font-normal">
              <span className="sr-only">Day</span>
            </th>
            <th className="py-1 font-normal">Snow</th>
            <th className="py-1 font-normal">Low</th>
            <th className="py-1 pr-3 font-normal">Gusts</th>
          </tr>
        </thead>
        <tbody>
          {place.days.map((d: WeatherDay) => (
            <Fragment key={d.day}>
              <tr className="border-t border-dashed border-line">
                <td className="px-3 py-1 font-semibold">{dayWords(d.day)}</td>
                <td className={`py-1 ${d.snowCm >= 0.1 ? "font-semibold text-stale-fg" : ""}`}>{snowWords(d.snowCm)}</td>
                <td className="py-1">{minus(d.lowC)}°C</td>
                <td className="py-1 pr-3">{d.gustKmh} km/h</td>
              </tr>
              {d.freezingBelow ? (
                <tr>
                  <td />
                  <td colSpan={3} className="pb-1 text-xs text-stale-fg">
                    Freezing level below {place.kind === "pass" ? "the pass" : place.name}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A three-day forecast for each pass and high night halt. Always labelled a forecast, never a road status. */
export function PassWeather({ read }: { read: WeatherRead }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading title="Weather at the passes" aside="Next 3 days" />
      {read.failed ? (
        <Callout tone="warn" title="Could not read the forecast">
          The weather service did not answer at {sayMoment(read.read)}. Meel tries again within three hours.{" "}
          <a className="link font-medium" href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer noopener">
            Open IMD’s forecast
          </a>
        </Callout>
      ) : (
        <>
          <Callout title="A forecast, not a road status">
            Snow on the forecast does not mean the road is shut, and none does not mean it is open.
          </Callout>
          <div className={GRID}>
            {read.places.map((p) => (
              <PlaceWeather key={p.name} place={p} />
            ))}
          </div>
          <p className="hint">
            From{" "}
            <a className="link font-medium" href={OPEN_METEO} target="_blank" rel="noreferrer noopener">
              Open-Meteo
            </a>
            , read {sayMoment(read.read)}, under the CC BY 4.0 licence. Global weather models, a grid about 10 km apart:
            a pass can be colder and windier than this.
          </p>
        </>
      )}
    </div>
  );
}
