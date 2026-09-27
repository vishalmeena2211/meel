# Research file format

One JSON file per route, named `<slug>.json`, saved in this folder. Valid JSON only: double quotes, no comments, no trailing commas.

## The source object

Every fact carries one. Call it SRC below.

```json
{
  "url": "https://leh.nic.in/48-hours-acclimatization-for-tourists-arriving-in-leh/",
  "title": "48 hours acclimatization for tourists arriving in Leh",
  "kind": "official",
  "opened": true,
  "source_date": null,
  "accessed": "2026-09-28"
}
```

- `kind` is one of: `official`, `news`, `encyclopedia`, `blog`, `forum`, `operator`.
- `opened` is `true` only if you fetched the page and read it. A search-result snippet is `false`.
- `source_date` is the date printed on the page, as `YYYY-MM-DD`, `YYYY-MM` or `YYYY`. Use `null` if the page shows none.
- Never invent a URL. If you have no source, leave the fact out and add a line to `gaps`.

## The file

```json
{
  "slug": "manali-leh",
  "header": {
    "highway": { "value": "NH 3", "source": SRC },
    "highest_point": { "name": "Tanglang La", "altitude_m": 5328, "source": SRC },
    "usual_days": { "value": "2 to 3", "source": SRC },
    "usual_season": { "value": "June to October", "source": SRC },
    "one_line": "Himachal Pradesh and Ladakh, over Baralacha La and Tanglang La"
  },
  "rules": [
    {
      "id": "ladakh-no-permit-indian-citizens",
      "kind": "permit",
      "title": "Ladakh: no permit for Indian citizens",
      "detail": "A fee is paid online before arrival and the receipt is carried.",
      "applies_to": "Indian citizens",
      "set_by": "Ladakh Autonomous Hill Development Council, Leh",
      "official_url": "https://www.lahdclehpermit.in/",
      "has_official_order": true,
      "source": SRC,
      "history": [
        { "date": "2021-08", "change": "Permit dropped for Indian citizens.", "source": SRC }
      ]
    }
  ],
  "season": {
    "note": "One sentence, in your own words.",
    "history": [
      {
        "year": 2026,
        "connected": "2026-05",
        "open_to_motorcycles": "2026-06-01",
        "closed": null,
        "note": "",
        "sources": [SRC]
      }
    ]
  },
  "authorities": [
    {
      "office": "Lahaul and Spiti Police",
      "announces": "Daily road and weather advisories",
      "stretch": "Manali to Sarchu",
      "channel": "Facebook page",
      "url": "https://www.facebook.com/splahhp/",
      "source": SRC
    }
  ],
  "hazards": [
    {
      "title": "Water crossings before Zingzingbar",
      "detail": "Deepest in the afternoon, when snow melt peaks.",
      "months": [6, 7],
      "source": SRC
    }
  ],
  "videos": [
    {
      "url": "https://www.youtube.com/watch?v=...",
      "title": "As shown on the video page",
      "channel": "Channel name",
      "stretch": "Sarchu to Pang",
      "filmed": "2026-06",
      "bike": null
    }
  ],
  "gaps": [
    "No official source found for the rule on rental bikes from outside Ladakh."
  ]
}
```

## Rules for every field

- `rules[].kind` is one of: `permit`, `fee`, `tax`, `motorcycle-rule`, `document`, `timing`.
- `title` is at most 10 words. `detail` is at most 30 words. Both in your own words. Do not paste text from a page.
- `has_official_order` is `false` when the rule is enforced in practice but you found no government order for it. Say so in `detail`.
- Dates are `YYYY-MM-DD`, `YYYY-MM` or `YYYY`. Use `null` for unknown. Never guess a date.
- `hazards[].months` are numbers 1 to 12. Use an empty list if it applies all year.
- An empty list `[]` is a correct answer. A made-up entry is not.
- Leave out fee amounts unless an `official` source states them.
- No phone numbers. No names of private people.
