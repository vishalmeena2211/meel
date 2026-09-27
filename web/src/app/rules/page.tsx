import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { Callout } from "@/components/ui";

export const metadata: Metadata = {
  title: "Rules for riding together",
  description: "What Meel asks of riders who post or join a trip, and how to stay safe riding with people you have not met.",
};

const RULES: Array<{ title: string; items: string[] }> = [
  {
    title: "If you post a trip",
    items: [
      "Say plainly what the trip is: the road, the dates, the pace, and what you ask of riders.",
      "If riders pay you to join, or a tour company runs the trip, tick the box that says so. Trips that hide this are removed.",
      "Do not ask for money before riders have met you.",
      "Answer requests. A rider waiting for a yes or a no cannot plan.",
      "If plans change, change the trip or withdraw it. Do not leave it on the board.",
    ],
  },
  {
    title: "If you join a trip",
    items: [
      "Ride your own ride. A group’s pace is not a reason to ride beyond your skill.",
      "Tell the leader the truth about your bike and your experience.",
      "If you cannot come, leave the trip on Meel so your place opens for someone else.",
      "Carry your own papers, your own tools and your own fuel margin. The group is company, not a support crew.",
    ],
  },
  {
    title: "Riding with people you have not met",
    items: [
      "Meet in a public place before the ride, in daylight.",
      "Tell someone at home your route, your dates and who you are riding with.",
      "Keep your own money, papers and phone on you, not in someone else’s luggage.",
      "You can leave a trip at any point. Nobody is owed your company.",
      "If something about a trip seems wrong, report it. Reports go to the person who keeps Meel, never to the leader.",
    ],
  },
  {
    title: "What is not allowed",
    items: [
      "Trips that are not real, or that exist to collect money or phone numbers.",
      "Harassment of any rider, before, during or after a trip.",
      "Posting another person’s phone number, address or photograph.",
      "Reports you know to be false. Riders rely on these facts on roads with no help nearby.",
    ],
  },
];

export default function RulesPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageTitle
        title="Rules for riding together"
        lede="Meel puts riders in touch. It does not run trips, check riders, or take responsibility for what happens on the road."
      />
      {RULES.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="display text-2xl">{section.title}</h2>
          <ul className="card flex flex-col text-[0.9375rem]">
            {section.items.map((item) => (
              <li key={item} className="border-b border-line px-3 py-2.5 last:border-b-0">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Callout tone="warn" title="You must be 18 or older to post or join a trip">
        And you ride at your own risk. Roads in the mountains kill experienced riders every year.
      </Callout>
      <p className="hint">
        These rules were written by the person who keeps Meel. They have not been reviewed by a lawyer.{" "}
        <Link className="link" href="/about">
          About Meel
        </Link>
      </p>
    </div>
  );
}
