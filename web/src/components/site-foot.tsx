import Link from "next/link";

import { KmStone } from "./ui";

/*
  The foot of every page: a band the colour of tarmac, closed off by the dashed middle line of a road.
  Drawn in the wireframes as screen 31, "The foot of every page".
*/

const GROUPS: Array<{ title: string; links: Array<[href: string, words: string]> }> = [
  {
    title: "Routes",
    links: [
      ["/", "All routes"],
      ["/tools", "Fuel, altitude and packing"],
      ["/report", "Send a trip report"],
    ],
  },
  {
    title: "Riding together",
    links: [
      ["/trips", "Trips riders are planning"],
      ["/trips/new", "Post a trip"],
      ["/rules", "Rules for riding together"],
    ],
  },
  {
    title: "Meel",
    links: [
      ["/about", "About Meel"],
      ["/credits", "Credits and sources"],
      // A rider who is not logged in is taken to the log-in page, and brought back here afterwards.
      ["/account", "Your account"],
    ],
  },
];

// The site's green focus ring disappears on tarmac, so links here use the kilometre-stone yellow.
const ON_TARMAC = "rounded-sm focus-visible:outline-stone";

export function SiteFoot() {
  return (
    <footer className="site-foot bg-tarmac pb-24 text-on-tarmac/80 md:pb-0">
      {/* Under a form taken in steps, one line (frame 31.3). The map credit stays. */}
      <p className="foot-line mx-auto hidden w-full max-w-6xl px-4 py-3 text-xs text-on-tarmac/70">
        Meel ·{" "}
        <Link className={`font-medium text-on-tarmac underline underline-offset-2 ${ON_TARMAC}`} href="/credits">
          Credits and sources
        </Link>{" "}
        · Map data ©{" "}
        <a
          className={`font-medium text-on-tarmac underline underline-offset-2 ${ON_TARMAC}`}
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer noopener"
        >
          OpenStreetMap contributors
        </a>
      </p>
      <div className="foot-full mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-8 pb-6 text-sm leading-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8">
          <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
            <Link href="/" className={`flex items-center gap-2 self-start ${ON_TARMAC}`} aria-label="Meel, all routes">
              {/* The stone's letter is dark, as on a real kilometre stone, whatever the text around it. */}
              <span className="text-stone-ink">
                <KmStone cap="" value="M" unit="" size="sm" />
              </span>
              <span className="display text-[1.375rem] tracking-wide text-on-tarmac uppercase">Meel</span>
            </Link>
            <p>Dated facts for Indian motorcycle routes.</p>
            <p className="text-xs text-on-tarmac/60">Kept by one person, as a hobby. No advertising.</p>
          </div>

          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col gap-2">
              <h2 className="display text-[0.8125rem] font-semibold tracking-[0.12em] text-stone uppercase">
                {group.title}
              </h2>
              {group.links.map(([href, words]) => (
                <Link
                  key={href}
                  href={href}
                  className={`self-start font-medium text-on-tarmac underline-offset-2 hover:underline ${ON_TARMAC}`}
                >
                  {words}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <hr className="border-0 border-t-2 border-dashed border-stone/75" />

        <div className="flex flex-col gap-1.5 md:flex-row md:items-baseline md:justify-between md:gap-6">
          <p className="font-medium text-on-tarmac">Meel never says a road is open. It links to the office that decides.</p>
          <p className="text-xs text-on-tarmac/60">rideplanner.in</p>
        </div>

        {/* OpenStreetMap asks for this wherever its data appears. Its data is on nearly every page. */}
        <p className="text-xs text-on-tarmac/60">
          Map data ©{" "}
          <a
            className={`font-medium text-on-tarmac underline underline-offset-2 ${ON_TARMAC}`}
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer noopener"
          >
            OpenStreetMap contributors
          </a>{" "}
          · Heights from NASA · Pictures from Wikimedia Commons, credited beside each one
        </p>
      </div>
    </footer>
  );
}
