// Drawings made from the route's own numbers. Each uses one scale, and says what it shows.
import { km, metres } from "@/lib/format";
import type { Fuel, ProfilePoint, Waypoint } from "@/lib/types";

// ── fuel along the road ──────────────────────────────────────────────────

export function GapStrip({ fuel, distanceKm, from, to }: { fuel: Fuel; distanceKm: number; from: string; to: string }) {
  const longest = fuel.longest_gaps[0];
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / distanceKm) * 100))}%`;
  const stops = collapse(fuel.pumps.map((p) => p.km_from_start));
  const label = longest
    ? `Fuel pumps along the road, drawn to scale. The longest stretch with no pump is ${km(longest.gap_km)}, from near ${longest.near_from} to near ${longest.near_to}.`
    : "Fuel pumps along the road, drawn to scale.";
  return (
    <figure className="flex flex-col gap-1">
      <div role="img" aria-label={label} className="relative mx-1 h-16">
        <div className="absolute inset-x-0 top-7 h-1.5 rounded-full bg-sign" />
        {longest && longest.gap_km >= 40 ? (
          <>
            <div
              className="absolute top-7 h-1.5"
              style={{
                left: pct(longest.from_km),
                width: pct(longest.gap_km),
                background:
                  "repeating-linear-gradient(90deg, var(--color-stale-fg) 0 6px, var(--color-surface) 6px 10px)",
              }}
            />
            <span
              className="font-display absolute top-1 -translate-x-1/2 text-xs font-semibold tracking-wider whitespace-nowrap text-stale-fg uppercase"
              style={{ left: pct(longest.from_km + longest.gap_km / 2) }}
            >
              {km(longest.gap_km)} · no pump
            </span>
          </>
        ) : null}
        {stops.map((at) => (
          <span key={at} className="absolute top-5 h-5 w-0.5 bg-ink" style={{ left: pct(at) }} />
        ))}
        <span className="hint num absolute top-11 left-0 text-xs font-semibold text-ink">{from}</span>
        <span className="hint num absolute top-11 right-0 text-right text-xs font-semibold text-ink">
          {to} · {km(distanceKm)}
        </span>
      </div>
      <figcaption className="hint">
        Each mark is a pump on the open map. A pump missing from the map is missing here, so the gap is a worst case.
      </figcaption>
    </figure>
  );
}

function collapse(positions: number[]): number[] {
  const out: number[] = [];
  for (const p of [...positions].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last === undefined || p - last > 2) out.push(p);
  }
  return out;
}

// ── height along the road ────────────────────────────────────────────────

export interface ProfileMark {
  name: string;
  km: number;
  m: number;
  /** 1 for the first night, 2 for the second. Absent for a place that is only labelled. */
  night?: number;
  tooSteep?: boolean;
}

export function niceStep(range: number): number {
  const rough = range / 3;
  const pow = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  const n = rough / pow;
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * pow;
}

export function Profile({
  profile,
  distanceKm,
  marks,
}: {
  profile: ProfilePoint[];
  distanceKm: number;
  marks: ProfileMark[];
}) {
  if (profile.length < 2) return null;
  const W = 346;
  const H = 180;
  const L = 38;
  const R = 10;
  const T = 24;
  const B = 28;
  const heights = profile.map((p) => p.m).concat(marks.map((m) => m.m));
  const lo = Math.min(...heights);
  const hi = Math.max(...heights);
  const step = niceStep(Math.max(hi - lo, 200));
  const floor = Math.floor(lo / step) * step;
  const ceil = Math.ceil(hi / step) * step;
  const x = (k: number) => L + (k / distanceKm) * (W - L - R);
  const y = (m: number) => T + (1 - (m - floor) / Math.max(ceil - floor, 1)) * (H - T - B);
  const points = profile.map((p) => `${x(p.km).toFixed(1)},${y(p.m).toFixed(1)}`).join(" ");
  const lines: number[] = [];
  for (let v = floor; v <= ceil; v += step) lines.push(v);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((distanceKm * f) / 10) * 10);
  ticks[ticks.length - 1] = Math.round(distanceKm);

  // Keep labels apart: a label is dropped if it would sit on top of the one before it.
  const labelled = marks.reduce<Array<ProfileMark & { px: number; py: number; show: boolean }>>((done, mark) => {
    const px = x(mark.km);
    const lastShown = [...done].reverse().find((d) => d.show);
    const show = mark.night !== undefined || lastShown === undefined || px - lastShown.px > 46;
    return [...done, { ...mark, px, py: y(mark.m), show }];
  }, []);

  return (
    <figure className="card px-1.5 pt-2 pb-0.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Height along the road, drawn to scale, from ${metres(lo)} to ${metres(hi)}.`}
        className="block h-auto w-full overflow-visible"
      >
        {lines.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={L - 4} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--color-ink-2)">
              {v.toLocaleString("en-IN")}
            </text>
          </g>
        ))}
        <text x={L - 4} y={12} textAnchor="end" fontSize={10} fill="var(--color-ink-2)">
          metres
        </text>
        <polygon
          points={`${x(0)},${y(floor)} ${points} ${x(distanceKm)},${y(floor)}`}
          fill="var(--color-sign-soft)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-sign)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {labelled.map((m, i) => {
          const above = m.py > T + 26 && i % 2 === 1;
          const anchor = m.px < L + 30 ? "start" : m.px > W - R - 30 ? "end" : "middle";
          return (
            <g key={`${m.name}-${m.km}`}>
              {m.night !== undefined ? (
                <>
                  <circle
                    cx={m.px}
                    cy={m.py}
                    r={7.5}
                    fill={m.tooSteep ? "var(--color-stale-fg)" : "var(--color-stone)"}
                    stroke="var(--color-ink)"
                    strokeWidth={2}
                  />
                  <text
                    x={m.px}
                    y={m.py + 3.5}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill={m.tooSteep ? "var(--color-surface)" : "var(--color-ink)"}
                  >
                    {m.night}
                  </text>
                </>
              ) : (
                <circle cx={m.px} cy={m.py} r={3.5} fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth={2} />
              )}
              {m.show ? (
                <text
                  x={m.px}
                  y={above ? m.py - (m.night ? 13 : 9) : m.py + (m.night ? 20 : 15)}
                  textAnchor={anchor}
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--color-ink)"
                >
                  {m.name}
                </text>
              ) : null}
            </g>
          );
        })}
        {ticks.map((t, i) => (
          <text
            key={`${t}-${i}`}
            x={x(t)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="var(--color-ink-2)"
          >
            {t.toLocaleString("en-IN")}
            {i === ticks.length - 1 ? " km" : ""}
          </text>
        ))}
      </svg>
    </figure>
  );
}

// ── the road as a line ───────────────────────────────────────────────────

/**
 * The route drawn on its own, with no map beneath it and no borders.
 * North is up. East and west are squeezed to match the latitude, so distances look right.
 */
export function RouteLine({ line, waypoints }: { line: [number, number][]; waypoints: Waypoint[] }) {
  if (line.length < 2) return null;
  const W = 346;
  const H = 230;
  const pad = 26;
  const lats = line.map((p) => p[1]);
  const lons = line.map((p) => p[0]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const squeeze = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lons) * squeeze;
  const maxX = Math.max(...lons) * squeeze;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const scale = Math.min((W - 2 * pad) / Math.max(maxX - minX, 1e-6), (H - 2 * pad) / Math.max(maxY - minY, 1e-6));
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const px = (lon: number) => offX + (lon * squeeze - minX) * scale;
  const py = (lat: number) => H - offY - (lat - minY) * scale;
  const every = Math.max(1, Math.floor(line.length / 400));
  const path = line
    .filter((_, i) => i % every === 0 || i === line.length - 1)
    .map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`)
    .join(" ");

  const seen = new Set<string>();
  const placed: Array<{ x: number; y: number }> = [];
  const dots = waypoints
    .filter((w) => {
      if (seen.has(w.name)) return false;
      seen.add(w.name);
      return true;
    })
    .map((w, i, arr) => {
      const x = px(w.lon);
      const y = py(w.lat);
      const ends = i === 0 || i === arr.length - 1;
      const clear = placed.every((p) => Math.abs(p.x - x) > 44 || Math.abs(p.y - y) > 13);
      const label = ends || (clear && (w.kind === "pass" || arr.length <= 9 || i % 2 === 0));
      if (label) placed.push({ x, y });
      return { ...w, x, y, label };
    });

  return (
    <figure className="card overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`The road from ${waypoints[0]?.name ?? "the start"} to ${waypoints[waypoints.length - 1]?.name ?? "the end"}, drawn as a line. North is up.`}
        className="block h-auto w-full bg-surface-2"
      >
        <polyline
          points={path}
          fill="none"
          stroke="var(--color-sign)"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dots.map((d) => (
          <g key={d.name}>
            {d.kind === "pass" ? (
              <path
                d={`M${d.x - 5},${d.y + 4} L${d.x},${d.y - 5} L${d.x + 5},${d.y + 4} Z`}
                fill="var(--color-stone)"
                stroke="var(--color-ink)"
                strokeWidth={1.5}
              />
            ) : (
              <circle cx={d.x} cy={d.y} r={4} fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth={2} />
            )}
            {d.label ? (
              <text
                x={d.x > W - 70 ? d.x - 8 : d.x + 8}
                y={d.y + 3.5}
                textAnchor={d.x > W - 70 ? "end" : "start"}
                fontSize={10.5}
                fontWeight={600}
                fill="var(--color-ink)"
                stroke="var(--color-surface-2)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {d.name}
              </text>
            ) : null}
          </g>
        ))}
        <text x={W - 10} y={16} textAnchor="end" fontSize={10} fill="var(--color-ink-2)">
          North is up
        </text>
      </svg>
      <figcaption className="hint border-t border-line px-3 py-1.5">
        The road only, with no map beneath. Triangles are passes. ©{" "}
        <a className="link font-medium" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
          OpenStreetMap contributors
        </a>
      </figcaption>
    </figure>
  );
}
