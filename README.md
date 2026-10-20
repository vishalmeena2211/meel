<div align="center">

<img src=".github/readme/banner.png" alt="Meel: dated facts for Indian motorcycle routes" width="100%">

<br>

**51 Indian motorcycle routes. Every fact dated and sourced. Ask it anything.**

<br>

[![Next.js 16](https://img.shields.io/badge/Next.js-16-16201c?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-16201c?logo=react&logoColor=61dafb)](https://react.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-0f5f4b?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-0f5f4b?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Postgres with Prisma](https://img.shields.io/badge/Postgres-Prisma_7-0f5f4b?logo=postgresql&logoColor=white)](https://www.prisma.io)
[![Auth.js](https://img.shields.io/badge/Auth.js-Google_and_email-0f5f4b)](https://authjs.dev)
[![Hosted on Vercel](https://img.shields.io/badge/Vercel-Singapore-16201c?logo=vercel&logoColor=white)](https://vercel.com)
[![Ask Meel: Gemini on Vertex AI](https://img.shields.io/badge/Ask_Meel-Gemini_on_Vertex_AI-16201c?logo=googlegemini&logoColor=white)](#ask-meel)
<br>
[![Live at rideplanner.in](https://img.shields.io/badge/live-rideplanner.in-0f5f4b)](https://rideplanner.in)
[![Status: early](https://img.shields.io/badge/status-early,_facts_not_yet_confirmed_by_riders-f2b807)](#how-far-to-trust-it)
[![Kept as a hobby](https://img.shields.io/badge/kept_by-one_person,_as_a_hobby-f2b807)](#the-rules-it-keeps)
[![Licence: MIT for the code](https://img.shields.io/badge/licence-MIT_for_the_code-0f5f4b)](#licence)

**[Open rideplanner.in](https://rideplanner.in)** · [How riders use it](#how-riders-use-it) · [Ask Meel](#ask-meel) · [Where facts come from](#where-the-facts-come-from) · [Run it](#run-it) · [Meel in detail](docs/meel-in-detail.md)

</div>

<br>

<p align="center">
  <img src=".github/readme/screens.png" alt="Four phone screens: the routes nearest to Delhi, each with its distance by road; the Manali to Leh route page; its fuel section, where each pump is dated and sourced; and the fuel check, which asks for your bike" width="100%">
</p>

> [!IMPORTANT]
> **Meel is early.** Every fact was gathered at a desk from official and published sources. No rider has confirmed one yet, so read each as a lead and look at its date.

## How riders use it

```mermaid
flowchart LR
  GOOGLE["Google search<br/>or a link in a chat group"] --> FACT["One fact<br/>with its source and date"]
  HOME["Front page<br/>routes nearest your city"] --> ROUTE["Route page"]
  FACT --> ROUTE
  ROUTE --> SECTION["Fuel · rules · altitude<br/>is it open? · videos"]
  SECTION --> TOOLS["Fuel check · altitude check<br/>packing list · save for no network"]
  SECTION --> REPORT["Still true / This has changed<br/>no account needed"]
  REPORT --> EDITOR["Editor reads every report"] --> SECTION
  ROUTE --> ASK["Ask Meel"]
  HOME --> ASK
```

<p align="center">
  <img src=".github/readme/laptop.png" alt="The fuel section of Manali to Leh on a laptop: sections on the left, the fuel gap and dated pumps in the middle" width="100%">
</p>

## Ask Meel

Ask in English, Hindi or Hinglish. The answer comes only from Meel's facts, with a number on every sentence that opens its source.

<p align="center">
  <img src=".github/readme/ask-meel.png" alt="Four phone screens of Ask Meel: the starting page with questions riders often ask; an answer about fuel near Chitkul with numbered sources and the fuel gap drawn to scale; an answer about the road from Sarchu to Leh with the route photo and riders' videos; and the reply to 'is Zoji La open today', which lists the offices that announce it instead of saying open or closed" width="100%">
</p>

```mermaid
flowchart LR
  Q["A question"] --> RULES{"Word rules"}
  RULES -->|"is it open?"| OFFICES["The offices that announce it<br/>never open or closed"]
  RULES -->|"unwell · costs · bikes"| FIXED["A fixed reply"]
  RULES -->|"asked before, facts unchanged"| SAME["The same answer, free"]
  RULES --> FIND["Find facts by meaning<br/>4,650 entries"]
  FIND --> MATHS["Distances worked out in code"]
  MATHS --> GEMINI["Gemini writes 2–4 sentences"]
  GEMINI --> CHECK["Sentences without a source<br/>are dropped"]
  CHECK --> ANSWER["Answer · numbered sources<br/>Meel's own pictures"]
```

<p align="center">
  <img src=".github/readme/ask-meel-laptop.png" alt="Ask Meel on a laptop, filling the window: past questions on the left, a Hinglish answer about fuel from Manali to Leh with the 329 km gap drawn in the middle, and its four sources on the right" width="100%">
</p>

<sub>10 questions a day without an account, 40 with one. About one paisa a question. Code in [`web/src/server/ask`](web/src/server/ask).</sub>

## Where the facts come from

```mermaid
flowchart LR
  OSM["OpenStreetMap"] --> TOOLS["data/tools<br/>Python"]
  NASA["NASA heights"] --> TOOLS
  WM["Wikimedia Commons"] --> TOOLS
  GOV["Official pages"] -->|desk research| DATA
  TOOLS --> DATA["data/routes<br/>one file per route"]
  DATA --> PAGES["Route and fact pages<br/>rebuilt every hour"]
  DATA -->|embedded once| ASK["Ask Meel"]
  LIVE["Alerts · offices' pages<br/>closures · pass weather"] -->|read every hour| PAGES
  RIDERS(("Riders")) -->|reports, trips| DB[("Postgres")]
  DB -->|confirmations| PAGES
```

<sub>Facts live in files, so every change to one is a change you can read in git. The database holds only what riders create.</sub>

## Run it

Node.js 22.13+, pnpm 9 and Postgres 14+.

```bash
git clone https://github.com/vishalmeena2211/meel.git && cd meel/web
```

```bash
pnpm install
```

```bash
createdb meel && pnpm db:migrate
```

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

```bash
pnpm dev
```

Open http://localhost:3000. Settings, Google login and Ask Meel's setup: [`web/README.md`](web/README.md).

## In this repository

| Folder | What is in it |
|---|---|
| [`web/`](web) | The website and Ask Meel |
| [`data/`](data) | 51 routes, every fact with its source ([`data/README.md`](data/README.md)) |
| [`design/`](design) | Wireframes: one frame per situation, with build notes |
| [`docs/`](docs) | The plan, audits, and [Meel in detail](docs/meel-in-detail.md) |

## Roadmap

- [x] 51 routes, every fact dated and sourced
- [x] Fuel, altitude and packing checks; save for no network
- [x] Official alerts, offices' dates, closures and pass weather, read every hour
- [x] Reports, trips board and the editor's desk
- [x] Ask Meel (19 October 2026); light and dark
- [ ] Riders confirming the facts
- [ ] A privacy notice on the site
- [ ] Password reset, phone login, automatic tests

## Contributing

**Ride a road Meel covers?** Press "Still true" or "This has changed" on any fact. No account needed.
**Code or data?** Read [`CONTRIBUTING.md`](CONTRIBUTING.md). Security problems go to [`SECURITY.md`](SECURITY.md), not issues.

## Credits and licence

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) · heights from NASA SRTM · weather from [Open-Meteo](https://open-meteo.com) · alerts from [NDMA SACHET](https://sachet.ndma.gov.in) · pictures from [Wikimedia Commons](https://commons.wikimedia.org), credited beside each. The full list is in [Meel in detail](docs/meel-in-detail.md#credits).

Code: [MIT](LICENSE). Data keeps its sources' licences: [`data/LICENSE.md`](data/LICENSE.md).

<br>

<div align="center">
<sub>Made in India, for riders. Meel never says a road is open.</sub>
</div>
