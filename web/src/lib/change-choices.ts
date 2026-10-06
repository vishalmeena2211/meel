/*
  What a rider can say has changed. The list depends on what kind of thing the fact is about.
  The first part of each pair is kept with the report. The second is what the rider reads.
*/

export type ChoiceSet = "pump" | "shop" | "stay" | "rule" | "road" | "office";

export const CHANGE_CHOICES: Record<ChoiceSet, ReadonlyArray<readonly [string, string]>> = {
  pump: [
    ["closed", "It has closed for good"],
    ["moved", "It has moved"],
    ["no-fuel", "It had no fuel"],
    ["wrong-detail", "A detail here is wrong"],
    ["other", "Something else"],
  ],
  shop: [
    ["closed", "It has closed for good"],
    ["moved", "It has moved"],
    ["phone", "The phone number is wrong"],
    ["fixes", "What they can fix is different"],
    ["other", "Something else"],
  ],
  stay: [
    ["closed", "It has closed for good"],
    ["moved", "It has moved"],
    ["phone", "The phone number is wrong"],
    ["offers", "What it offers is different"],
    ["other", "Something else"],
  ],
  rule: [
    ["rule-changed", "The rule has changed"],
    ["not-enforced", "It is not applied the way this says"],
    ["wrong-detail", "A detail here is wrong"],
    ["other", "Something else"],
  ],
  road: [
    ["gone", "It is no longer so"],
    ["worse", "It is worse than this says"],
    ["wrong-detail", "A detail here is wrong"],
    ["other", "Something else"],
  ],
  office: [
    ["moved", "They announce somewhere else now"],
    ["other", "Something else"],
  ],
};

/** Every value a report may carry, for checking on the server and for naming in the editor's inbox. */
export const CHANGE_WORDS: Record<string, string> = Object.fromEntries(
  Object.values(CHANGE_CHOICES).flatMap((set) => set.map(([value, words]) => [value, words])),
);

export const CHANGE_VALUES = Object.keys(CHANGE_WORDS) as [string, ...string[]];

/** "This has changed" needs a reason of at least this many letters, so the editor knows what was seen. */
export const MIN_REASON = 8;
export const REASON_WORDS = "Say what you saw, in a few words.";
