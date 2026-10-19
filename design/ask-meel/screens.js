/* ── Ask Meel: icons and helpers ─────────────────────────────── */
/* The Ask Meel mark, one line: Meel's kilometre stone with a speech tail, a road inside. */
ICON.ask = I('<path d="M5 22.5V10a7 7 0 0 1 14 0v6a2 2 0 0 1-2 2H9.5z"/><path d="M5 11h14"/><path d="M9 14.5h2M13 14.5h2"/>');
ICON.up = I('<path d="M12 19V5M5 12l7-7 7 7"/>');
ICON.thumb = I('<path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/>');
ICON.copy = I('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
ICON.retry = I('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>');
ICON.info = I('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>');

/* The Ask Meel mark in colour: white stone, yellow cap with a passing glint, a road that moves while it thinks. */
const STONE = 'M5 22.5V10a7 7 0 0 1 14 0v6a2 2 0 0 1-2 2H9.5z';
const askMark = (cls = '') => `<svg class="ask-mark ${cls}" viewBox="0 0 24 24" aria-hidden="true">
  <defs><clipPath id="ask-cap"><path d="M5 11V10a7 7 0 0 1 14 0v1z"/></clipPath><clipPath id="ask-body"><path d="M6 12h12v5H6z"/></clipPath></defs>
  <path class="m-body" d="${STONE}"/>
  <g clip-path="url(#ask-cap)"><path class="m-cap" d="M4 11V2h16v9z"/><polygon class="m-glint" points="1,12 3.4,12 7.4,1 5,1"/></g>
  <path class="m-edge" d="${STONE}M5 11h14"/>
  <g clip-path="url(#ask-body)"><path class="m-road" d="M3.2 14.5h2.4M8 14.5h2.4M12.8 14.5h2.4M17.6 14.5h2.4M22.4 14.5h2.4"/></g>
</svg>`;

const ASK = {
  q: (t) => `<div class="ask-q">${t}</div>`,
  who: (sub = '', think = false) => `<div class="ask-who">${askMark(think ? 'think' : '')}Meel${sub ? `<span style="text-transform:none;letter-spacing:0;font-weight:400">· ${sub}</span>` : ''}</div>`,
  c: (n) => `<span class="ask-c">${n}</span>`,
  bar: (txt = 'Ask about a road, a pass, a pump or a rule', on = false) => `<div class="pfoot"><div class="ask-bar"><div class="input ${on ? 'filled focus' : ''}">${txt}</div><span class="ask-send ${on ? '' : 'off'}">${ICON.up}</span></div></div>`,
  srcRow: (n, title, line, st) => `<div class="row"><span class="ask-c" style="margin:0">${n}</span><span class="grow"><b>${title}</b><span class="hint">${line}</span></span>${st ? badge(st) : ''}${chev}</div>`,
  sources: (rows) => `<div class="lbl">Where this comes from</div><div class="rows ask-row">${rows.join('')}</div>`,
  acts: (more = '') => `<div class="ask-acts"><span class="btn btn-outline">${ICON.thumb}Useful</span><span class="btn btn-outline">This answer is wrong</span><span class="btn btn-outline">${ICON.share}Share</span>${more}</div>`,
  next: (list) => `<div class="lbl">Ask next</div><div class="hscroll">${list.map((l) => `<span class="chip">${l}</span>`).join('')}</div>`,
  step: (t, done = true) => `<div class="ask-step ${done ? '' : 'wait'}">${done ? ICON.check : '<i></i>'}<span>${t}</span></div>`,
  skel: (w) => `<div class="ask-skel" style="width:${w}%"></div>`,
  top: (sub = 'Answers only from Meel’s facts', right = '') => head('Ask Meel', sub, { right }),
};
/* The Ask icon that sits in the phone top bar, left of the page’s own icon. */
const askBtn = `<span class="iconbtn ask-ico" aria-label="Ask Meel">${askMark()}</span>`;

/* The real Manali to Leh pumps, drawn to scale (434.1 km). Keylong 72.5 km, Karu 401.8 km. */
const gapReal = `<div class="gap-strip" role="img" aria-label="Fuel pumps along Manali to Leh, drawn to scale. No pump for 329 km between Keylong and Karu.">
  <div class="line"></div><div class="dry" style="left:16.7%;width:75.9%"></div>
  <div class="pt up first" style="left:0"><span>Manali<small>0 km</small></span></div>
  <div class="pt dn" style="left:9.4%"></div><div class="pt dn" style="left:14.1%"></div>
  <div class="pt dn lab" style="left:16.7%"><span>Sissu · Tandi · Keylong<small>41 · 61 · 72 km</small></span></div>
  <div class="tag" style="left:54%;top:22px">329 km · no pump</div>
  <div class="pt dn" style="left:92.6%"><span>Karu<small>402 km</small></span></div>
  <div class="pt up last" style="left:calc(100% - 2px)"><span>Leh<small>434 km</small></span></div>
</div>`;

/* Gandikota to Araku valley, the four stretches of Meel's Andhra route, drawn to scale (812.6 km). */
const arakuLine = `<div class="ask-route" role="img" aria-label="Araku valley to Gandikota through Paderu, Lambasingi and Narsipatnam, 812.6 km.">
  <svg viewBox="0 0 340 120" preserveAspectRatio="none">
    <path class="ln" d="M20 30 L38 40 L57 52 L70 58 L320 92"/>
    <circle class="pt" cx="20" cy="30" r="5"/><circle class="pt" cx="38" cy="40" r="4"/><circle class="pt" cx="57" cy="52" r="4"/><circle class="pt" cx="70" cy="58" r="4"/><circle class="pt" cx="320" cy="92" r="5"/>
    <text x="14" y="18">Araku valley</text><text x="76" y="50">Paderu · Lambasingi · Narsipatnam</text><text x="260" y="112">Gandikota</text>
    <text x="170" y="66">690.3 km</text>
  </svg></div>`;

const vidA = (t, by, stretch, when) => `<div class="fact"><div class="vid"><span class="thumb">${ICON.play}<u>video</u></span><span><b>${t}</b><span class="fact-src">${by} · ${stretch}<br>${when}</span></span></div></div>`;

/* ── Screens ──────────────────────────────────────────────────── */
const SCREENS = [
  /* ── The plan ── */
  {
    group: 'The plan', title: 'What Ask Meel is for',
    lede: 'A text assistant on rideplanner.in that answers a rider’s question from Meel’s own facts, shows where each sentence came from and how old it is, and shows Meel’s own pictures when they help.',
    plain: true,
    render: () => `<div class="plan">
      <p class="lead">Riders already type questions into Google and land on Meel: “petrol pump in chitkul”, “toong check post”, “gandikota to araku valley distance”. Today they land on a long route page and have to find the line themselves. Ask Meel finds the line for them, and answers in a sentence with its date beside it.</p>
      <div class="cols">
        <div class="card yes"><h4>It does</h4><ul>
          <li>Answers from Meel’s facts only: the 51 routes, 4,515 facts and their history.</li>
          <li>Numbers every claim and links it to the fact it came from.</li>
          <li>Says how old each fact is, in the same words as the site: fresh, ageing, stale, not yet checked.</li>
          <li>Shows Meel’s own drawings (the fuel gap, the altitude line, the route line), the route photo with its credit, and riders’ videos.</li>
          <li>Understands English, Hindi and Hinglish, and spelling mistakes.</li>
          <li>Says “Meel has no fact on this” when it has none, and points to the closest fact it does have.</li>
        </ul></div>
        <div class="card no"><h4>It never</h4><ul>
          <li>Says a road, pass or check post is open or closed. It gives the offices that announce it, as the route page does.</li>
          <li>Answers from the open web or the model’s own memory.</li>
          <li>Makes pictures, or shows photos from other sites.</li>
          <li>Gives costs, ranks bikes, or gives medical advice beyond Meel’s altitude facts and the emergency number.</li>
          <li>Needs an account to ask.</li>
          <li>Gets its own tab or a floating button. It is an icon in the top bar.</li>
          <li>Changes a fact. A rider’s “This answer is wrong” goes to the editor like any fact report.</li>
        </ul></div>
      </div>
      <h3>Principles, in order</h3>
      <div class="cols">
        <div class="card"><h4>1 · True or silent</h4><p>A sentence with no fact behind it is not written. Better “Meel has no fact on this” than a guess about fuel in a 329 km gap.</p></div>
        <div class="card"><h4>2 · Dated, always</h4><p>Every answer carries the dates of the facts it used. A stale fact is said to be stale inside the sentence, not only in a badge.</p></div>
        <div class="card"><h4>3 · A way back to the page</h4><p>Every source opens the fact on its route page. Ask Meel is a faster way into the site, not a second site.</p></div>
        <div class="card"><h4>4 · Short</h4><p>Read on a phone at a dhaba with one bar of signal. The answer first, in two to four sentences, then the detail.</p></div>
      </div>
      <h3>Not in this version</h3>
      <div class="cols"><div class="card"><ul>
        <li>Voice. Text only, as asked.</li>
        <li>Planning a whole trip day by day. It answers questions about routes; it does not write itineraries.</li>
        <li>Answers from riders’ trip reports and chat groups. Only checked facts, for now.</li>
        <li>Working with no network. Asking needs a network; saved route pages still work offline.</li>
      </ul></div></div>
    </div>`,
    notes: [
      ['Why now', ['Search Console shows riders asking questions, not searching names. Of the top queries in October, most are a pump at a place, a check post, or the distance between two places.', 'Meel already holds the answers. They are spread across 51 long pages.']],
      ['How it talks', ['A question, a few steps while it looks, an answer built from Meel’s facts, its sources at the foot.', 'It only reads. It has no actions and changes nothing.']],
    ],
  },
  {
    group: 'The plan', title: 'What riders ask, and how each is answered',
    lede: 'Real searches that already bring riders to Meel, grouped by the kind of answer they need. Each kind gets its own answer layout in the frames that follow.',
    plain: true,
    render: () => {
      const rows = [
        ['A pump at a place', '“petrol pump in chitkul”, “anjali pump shillong”, “petrol pump near me”', 'Nearest pumps before and after the place, with distances and dates. The fuel-gap drawing.', 'Pumps', '10'],
        ['Distance between two places', '“gandikota to araku valley distance”, “jaipur to longewala distance”, “thal to munsiyari”', 'Kilometres along Meel’s route, stretch by stretch, and what a map app says. The route line.', 'Stretches, route line', '13'],
        ['A check post or permit', '“toong check post”, “eaagman”', 'The rule in one sentence, who set it, the date it was last seen, and how it changed.', 'Rules and their history', '15'],
        ['Is it open?', '“zoji la open”, “manali leh road status”', 'Never open or closed. The offices that announce it, the season history, the last date Meel saw news.', 'Offices, season history', '16'],
        ['Where to stop the night', '“where to stay between manali and leh”', 'Night halts by height, with the altitude drawing and the altitude facts.', 'Altitude, halts', '13'],
        ['When to go', '“best time for spiti”, “tungnath closing date”', 'The usual season and the dated opening and closing of past years.', 'Season history', '17'],
        ['Comparing routes', '“spiti or ladakh in october”', 'A small table of the same facts side by side, each with its date.', 'Route headers, season', '14'],
        ['Off topic or unsafe', '“best bike for ladakh”, “ladakh trip cost”, “headache at sarchu”', 'Says what Meel does not cover, offers what it does. For health, the altitude facts and 112.', 'Altitude, emergency card', '18'],
      ];
      return `<div class="plan">
        <p class="lead">The examples in quotation marks are real queries from Search Console, as typed (Meel’s top queries, read 17 to 18 October 2026), plus a few riders are certain to ask. The last column says which screen in this gallery shows that answer.</p>
        <div class="sheet-card"><div class="scroll-x"><table class="data">
          <thead><tr><th>Kind of question</th><th>As riders type it</th><th>What a good answer holds</th><th>Facts it reads</th><th class="n">Screen</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td class="n">${r[4]}</td></tr>`).join('')}</tbody>
        </table></div></div>
        <h3>Questions about the place, not the road</h3>
        <p>“Things to do in Chitkul”, hotels, food. Meel has a line about each place and its videos, nothing more. Ask Meel says so and offers the route facts. These are counted, so if riders keep asking, the plan can change.</p>
      </div>`;
    },
    notes: [
      ['How the list will grow', ['Every question asked is kept for 30 days, without the phone or account (see screen 5, the decisions).', 'Each week, questions that got “Meel has no fact on this” are listed for the editor. That list is the to-do list for new facts.']],
      ['Spelling', ['“eaagman” is e-Aagman, Himachal’s entry pass. Riders type it as they hear it. Search by meaning finds it anyway.']],
    ],
  },
  {
    group: 'The plan', title: 'What it knows, and what it doesn’t',
    lede: 'Everything on the site, counted from Meel’s data as of 17 October 2026. Each of these becomes searchable by meaning (embeddings), and each keeps its date and its source.',
    plain: true,
    render: () => {
      const rows = [
        ['Fuel pumps', '2,619', 'Name, brand, place, km from the start, hours if known', 'The open map; riders confirm', 'Yes'],
        ['Fuel gaps', 'per route', 'From pump to pump, the longest first', 'Worked out from the pumps', 'Yes'],
        ['Rules for motorcycles', '308', 'The rule in a sentence, who set it, the order if found, and each past change', 'Official sites and news', 'Yes'],
        ['Hazards', '234', 'Water crossings, landslides, rough stretches, with where and when', 'News and official advisories', 'Yes'],
        ['Offices that announce closures', '196', 'Who, what they announce, which stretch, where they post it', 'Official sites', 'Yes'],
        ['Season years', '67', 'Connected, open to motorcycles, closed, with a source each', 'News and orders', 'Yes'],
        ['Riders’ videos', '215', 'Title, channel, stretch, month filmed, bike', 'YouTube pages', 'Shown as cards'],
        ['Route photos', '51', 'One per route, with photographer and licence', 'Wikimedia Commons', 'Shown with credit'],
        ['Stretches and heights', 'every route', 'From, to, km, map-app hours; places with their height', 'Open map and encyclopedias', 'Drawn as a line'],
        ['Route pages and tools', '51 + 4', 'Header, season note, gaps list, the fuel check, altitude plan, packing list', 'Meel', 'Linked'],
      ];
      return `<div class="plan">
        <div class="tiles">
          <div class="tile"><div class="big">51</div><span>routes, from Umling La to Kanyakumari.</span></div>
          <div class="tile"><div class="big">4,515</div><span>facts with a date and a source. Each is one small piece Ask Meel can find.</span></div>
          <div class="tile"><div class="big">266</div><span>photos and videos it may show, all already on the site with their credit.</span></div>
          <div class="tile"><div class="big">0</div><span>facts from anywhere else. If it isn’t on Meel, Ask Meel doesn’t know it.</span></div>
        </div>
        <div class="sheet-card"><div class="scroll-x"><table class="data">
          <thead><tr><th>What</th><th class="n">How many</th><th>Each one holds</th><th>Where it came from</th><th>In answers</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td class="n">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</tbody>
        </table></div></div>
        <div class="cols">
          <div class="card no"><h4>It doesn’t know</h4><ul>
            <li>Today’s road status. Nobody publishes it reliably; Meel links the offices instead.</li>
            <li>Hotels, food, costs, which bike is best.</li>
            <li>Anything said in chat groups or trip reports that the editor has not checked.</li>
            <li>Places not on a Meel route. It says which routes come nearest.</li>
          </ul></div>
          <div class="card"><h4>The gaps Meel already admits</h4><ul>
            <li>Every route lists what its researchers could not find, such as “No dated source found for winter closures of the Sangla to Chitkul road.”</li>
            <li>Ask Meel reads these too, so it can say “Meel looked and found nothing” instead of just “no fact”.</li>
          </ul></div>
        </div>
      </div>`;
    },
    notes: [
      ['Kept fresh', ['The search index is rebuilt with every data rebuild, the same step that sends pages to search engines today. No separate job.', 'A fact’s age is worked out at the moment of the answer, not stored, so “15 days ago” is always right.']],
      ['Counts', ['From data/routes on 17 October 2026, after the Leh to Padum route was added.']],
    ],
  },
  {
    group: 'The plan', title: 'How one question is answered',
    lede: 'What happens between the rider pressing send and the first word appearing. The architecture comes next; this is the order of work the screens depend on.',
    plain: true,
    render: () => `<div class="plan">
      <div class="flow">
        <div><b>Read the question</b>Spelling fixed, Hinglish understood. If it names a route or a place, that is noted. If it is asked from a route page, that route comes first.</div>
        <div><b>Is it a question Meel answers?</b>Off-topic, “is it open”, costs, bikes and health each have a fixed reply shape. These skip the search.</div>
        <div><b>Already answered?</b>A starter question, or one that means nearly the same as an earlier answer on this route whose facts haven’t changed, gets that answer again. No model call.</div>
        <div><b>Find the facts</b>Search by meaning across all 4,515 facts, plus exact matches on place names. The best 6 to 8 are kept, each as one short line.</div>
        <div><b>Check them</b>Facts from the wrong route are dropped. If two disagree, both are kept and marked. Each fact’s age is worked out.</div>
        <div><b>Write only from them</b>The model writes two to four sentences, each ending with the numbers of its facts. A sentence with no number is removed before it is shown.</div>
        <div><b>Add pictures</b>Chosen by rule, not by the model: a fuel question gets the gap drawing, a distance gets the route line, a route gets its photo, and videos come when the stretch has some.</div>
        <div><b>Show and keep</b>The answer appears word by word. Sources, pictures and next questions appear when it is done. The question is kept 30 days.</div>
      </div>
      <h3>What the rider sees while it works</h3>
      <p>Three short lines: what it understood (“Fuel near Chitkul, on Kinnaur”), how many facts it found, then the answer as it is written. On a slow network these lines are the difference between waiting and leaving. Screen 10 shows them.</p>
      <h3>Time it should take</h3>
      <div class="cols">
        <div class="card"><h4>First line on screen</h4><p>Under 1 second: “Looking in Kinnaur…”.</p></div>
        <div class="card"><h4>First word of the answer</h4><p>Under 3 seconds on 4G.</p></div>
        <div class="card"><h4>Whole answer</h4><p>Under 8 seconds. Past 15, the slow state shows (screen 22).</p></div>
      </div>
    </div>`,
    notes: [
      ['Why pictures are chosen by rule', ['The model could pick a wrong photo, or describe one that isn’t there. A rule can’t.', 'Each kind of question has one drawing it may show. The model only decides whether to mention it.']],
      ['Cost', ['About ₹0.02 when Gemini is called (about 1,600 tokens in, 200 out). Fixed replies, starter questions and re-used answers cost nothing, so the average is about ₹0.01 to ₹0.015.', 'An earlier answer is re-used only when every fact it used is unchanged; a changed fact clears it.']],
      ['Why the check after writing', ['Models sometimes write a confident sentence with nothing behind it. Removing any sentence without a source number is the cheapest way to stop that reaching a rider.']],
    ],
  },
  {
    group: 'The plan', title: 'Decisions to make',
    lede: 'The wireframes assume an answer to each. Tick it as it stands, or change it. The model and cost wait for the architecture.',
    plain: true,
    render: () => {
      const d = [
        ['Name', '“Ask Meel”', 'Short, says what it is, and uses the brand.'],
        ['Where it lives', 'No new tab. An Ask icon in the phone top bar on every page (an Ask button on a laptop), offered in the search box for questions, a row on every route page, and “Ask about this fact” on an opened fact.', 'Meel has four tabs and they are enough. The icon gives a way in from anywhere without covering facts.'],
        ['What it may answer', 'Riding on Meel’s routes, from Meel’s facts only. Other topics get one line and an offer.', 'Anything else is the model talking, not Meel.'],
        ['Open or closed', 'Never says it. Gives the offices, the season history and the last date seen.', 'The same rule the route page keeps. A wrong “open” could strand someone.'],
        ['Pictures', 'Meel’s own drawings, route photos with credit, riders’ videos. Never AI-made pictures.', 'Every picture is already on the site and already credited.'],
        ['Language', 'Understands English, Hindi and Hinglish. Answers in the language and script asked.', 'A large share of riders type Hinglish.'],
        ['Accounts and limits', 'No account needed. 10 questions a day per phone, 40 when logged in.', 'Keeps the monthly cost known. The numbers can rise once cost per question is measured.'],
        ['What is kept', 'Questions and answers 30 days, with no phone number, account or IP. Laptop history stays in the browser.', 'Enough to learn what is missing, nothing that names a rider.'],
        ['Sharing', 'Each answer can get a link, frozen as written, with its date and a link to the live facts.', 'Riders share in chat groups. A frozen answer can’t quietly change under a forwarded link.'],
        ['Wrong answers', '“This answer is wrong” goes to the editor’s inbox beside fact reports, with the question, the answer and the facts used.', 'One inbox, one routine.'],
        ['Model and cost', 'Decided: Gemini 2.5 Flash-Lite, about ₹0.04 a question, on personal Google Cloud credits until 12 January 2027. Still to check that a new project can use it. Fallback: Gemini 3.1 Flash-Lite (₹0.12) or Claude Haiku 5.5. A site-wide cap of 2,000 questions a day keeps the worst month near ₹2,400. Personal keys only.', 'At today’s traffic a month costs about ₹6; at 1,000 questions a day about ₹1,200.'],
      ];
      return `<div class="plan">
        <div class="sheet-card"><div class="scroll-x"><table class="data">
          <thead><tr><th style="width:40px"></th><th>Decision</th><th>What the frames assume</th><th>Why</th></tr></thead>
          <tbody>${d.map((r) => `<tr><td><span class="box"></span></td><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody>
        </table></div></div>
        <p>The same list, with checkboxes, is in meel-ask-meel-plan.md on the Desktop.</p>
      </div>`;
    },
    notes: [['After these', ['The architecture: what is embedded and when, where it is stored (Neon with pgvector), the model, streaming, limits, and cost per question.', 'Then build, then check each frame against the built screen.']]],
  },
  {
    group: 'The plan', title: 'How we’ll know it works',
    lede: 'Before launch, Ask Meel answers a fixed set of real rider questions and is scored. After launch, a few numbers show whether riders trust it.',
    plain: true,
    render: () => `<div class="plan">
      <h3>Before launch: the test set</h3>
      <div class="cols">
        <div class="card"><h4>The questions</h4><ul>
          <li>120 questions: every Search Console query that fits, plus questions written for each kind on screen 2.</li>
          <li>20 in Hinglish or Hindi, 15 spelt wrong, 15 that Meel has no fact for, 10 off-topic, 10 “is it open”.</li>
          <li>Each has the facts a right answer must use, written down first.</li>
        </ul></div>
        <div class="card"><h4>Pass marks</h4><ul>
          <li>No sentence without a source: 100%.</li>
          <li>Never “open” or “closed”: 100%.</li>
          <li>Right facts found: 90% or more.</li>
          <li>“No fact” when there is none: 95% or more.</li>
          <li>Answers in the language asked: 95% or more.</li>
        </ul></div>
      </div>
      <h3>After launch: what to watch</h3>
      <div class="sheet-card"><div class="scroll-x"><table class="data">
        <thead><tr><th>Number</th><th>Why it matters</th><th>Worry if</th></tr></thead>
        <tbody>
          <tr><td><b>Sources opened per answer</b></td><td>Riders check, and reach the route page</td><td>Below 0.2</td></tr>
          <tr><td><b>“This answer is wrong” per 100 answers</b></td><td>Direct sign of bad answers</td><td>Above 3</td></tr>
          <tr><td><b>“No fact” answers per 100</b></td><td>What Meel is missing</td><td>Reviewed weekly, not a target</td></tr>
          <tr><td><b>Follow-up questions per visit</b></td><td>Riders find it worth a second question</td><td>Below 1.2</td></tr>
          <tr><td><b>Cost per answer</b></td><td>Keeps the limits honest</td><td>Above the figure set in the architecture</td></tr>
        </tbody></table></div></div>
      <h3>Events sent to Mixpanel</h3>
      <p>ask_opened (from where), ask_sent (kind, language, route if any), ask_answered (seconds, facts used, no-fact or not), ask_source_opened, ask_marked_useful, ask_marked_wrong, ask_shared, ask_limit_reached. The question text itself is not sent to Mixpanel.</p>
    </div>`,
    notes: [['Running the test', ['The test runs on every change to the prompt or the search, before deploy.']]],
  },

  /* ── Finding it ── */
  {
    group: 'Finding it', title: 'A question typed into search',
    lede: 'Most riders will meet Ask Meel without looking for it: they type a question into the search box they already use.',
    render: () => phone('1. Typing a question on the front page', `
      ${head('Meel', '51 routes', { back: false, right: askBtn + `<span class="iconbtn">${ICON.map}</span>` })}
      ${body(`
        <div class="input filled focus">${ICON.search}<span>petrol pump in chitkul</span></div>
        <div class="sugg">
          <div class="so on ask-so">${ICON.ask}<span class="grow"><b>Ask Meel: “petrol pump in chitkul”</b><span class="hint">An answer from Meel’s facts, with dates</span></span></div>
          <div class="sh">Places</div>
          <div class="so">${ICON.flag}<span class="grow"><b><u>Chitkul</u></b><span class="hint">On Kinnaur: Sangla, Chitkul and Kalpa</span></span></div>
          <div class="sh">Routes</div>
          <div class="so">${ICON.map}<span class="grow"><b>Kinnaur: Sangla, Chitkul and Kalpa</b><span class="hint">Himachal · 229 km</span></span></div>
        </div>`)}
      ${tabbar('Routes')}`)
    + phone('2. A place name alone', `
      ${head('Meel', '51 routes', { back: false, right: askBtn + `<span class="iconbtn">${ICON.map}</span>` })}
      ${body(`
        <div class="input filled focus">${ICON.search}<span>chitkul</span></div>
        <div class="sugg">
          <div class="so">${ICON.flag}<span class="grow"><b><u>Chitkul</u></b><span class="hint">On Kinnaur: Sangla, Chitkul and Kalpa</span></span></div>
          <div class="so">${ICON.map}<span class="grow"><b>Kinnaur: Sangla, Chitkul and Kalpa</b><span class="hint">Himachal · 229 km</span></span></div>
          <div class="so all ask-so">${ICON.ask}<span class="grow">Ask Meel about “chitkul”</span></div>
        </div>`)}
      ${tabbar('Routes')}`),
    notes: [
      ['When Ask Meel comes first', ['When the text reads as a question: three words or more, or a question word (what, where, how, kitna, kahan, kya), or words like pump, distance, permit, open, check post.', 'Otherwise it sits last, under the places and routes (frame 2). A name alone usually wants the page.']],
      ['Behaviour', ['Enter with nothing picked does what it does today. Picking the Ask row opens frame 7 with the question already sent.', 'The rider’s words go across exactly as typed, spelling and all.']],
      ['Data', ['Nothing new. The question words are a short fixed list.']],
    ],
  },
  {
    group: 'Finding it', title: 'The Ask icon, a route page, a fact',
    lede: 'A rider who wants to ask something without searching first needs a way in on every page. The Ask icon sits in the top bar; route pages and facts add their own way to ask about what is on screen.',
    render: () => phone('1. The Ask icon on the front page, first visit', `
      ${head('Meel', '51 routes · 13 regions', { back: false, right: askBtn.replace('ask-ico', 'ask-ico new') + `<span class="iconbtn">${ICON.map}</span>` })}
      ${body(`
        <span class="hint" style="font-size:13px;color:var(--ink)">Dated facts for Indian motorcycle routes. Every fact shows who confirmed it, and when.</span>
        <div class="input">${ICON.search}<span>Search a route or place</span></div>
        <div class="hscroll">${['All', 'Ladakh', 'Himachal', 'Uttarakhand', 'North-East'].map((l) => `<span class="chip ${l === 'Himachal' ? 'on' : ''}">${l}</span>`).join('')}</div>
        <div class="rcard"><div class="r1"><b>Kinnaur: Sangla, Chitkul and Kalpa</b></div><span class="hint">229 km · 44 facts</span></div>
        <div class="rcard"><div class="r1"><b>Spiti circuit</b></div><span class="hint">612 km</span></div>
        <div class="rcard"><div class="r1"><b>Manali to Leh</b></div><span class="hint">434 km</span></div>`)}
      <div class="ask-tip"><b>New: ask Meel a question</b>Fuel, permits, passes, distances. Answers come from Meel’s facts, with their dates. <span>Got it</span></div>
      ${tabbar('Routes')}`)
    + phone('2. On every route page, and the row', `
      ${head('Kinnaur', 'Sangla, Chitkul and Kalpa', { right: askBtn + shareBtn })}
      ${body(`
        ${routeHead('Kinnaur', 'NH 5', '229', 'Himachal Pradesh · up the Sutlej, then the Baspa valley to Chitkul')}
        <div class="keys"><div><span>Highest</span><b>11,320 ft</b></div><div><span>Pumps</span><b>11</b></div><div><span>Facts</span><b>44</b></div></div>
        <div class="rows"><div class="row"><span class="ic ask-ic">${askMark()}</span><span class="grow"><b>Ask about this route</b><span class="hint">“Where’s the last pump before Chitkul?”</span></span>${chev}</div></div>
        ${sectionChips('Fuel')}`)}`)
    + phone('3. “Ask about this fact” on an opened fact', `
      ${head('North Sikkim', 'Rules for motorcycles', { right: askBtn })}
      ${body(`
        <div class="fact hi"><div class="fact-h"><b>Cross Toong check post by 4 pm</b>${badge('ageing')}</div>
          <div class="fact-d">Going up and coming down, under a Mangan district order reported on 11 September 2026. The order’s text was not found. Carry your permit.</div>
          <div class="fact-src">News report · 11 September 2026 · checked by the editor 17 October 2026</div>
          <div class="fact-a"><span class="btn btn-soft">${ICON.check}Still true</span><span class="btn btn-outline">This has changed</span></div>
          <span class="link" style="display:flex;gap:6px;align-items:center;font-size:13px">${ICON.ask.replace('<svg', '<svg width="15" height="15" stroke="currentColor"')}Ask about this fact</span>
        </div>`)}`)
    + phone('4. Opened from a route page: the route is set', `
      ${ASK.top('Kinnaur first')}
      ${body(`
        <div class="callout stone"><b>Asking about Kinnaur</b>Answers come from this route first. <span class="link">Ask about all routes</span></div>
        <div class="lbl">Riders often ask</div>
        <div class="ask-starter">
          <span class="chip">${ICON.ask}Where is the last pump before Chitkul?</span>
          <span class="chip">${ICON.ask}Do I need a permit for Chitkul?</span>
          <span class="chip">${ICON.ask}How far is Sangla from Rampur?</span>
          <span class="chip">${ICON.ask}Is the Chitkul road shut in winter?</span>
        </div>`)}
      ${ASK.bar('Ask about Kinnaur')}`),
    notes: [
      ['The Ask icon (frames 1 to 3)', ['The talking kilometre stone (screen 24) on a soft yellow square. On the first visit a yellow halo pulses from it until the hint is closed (frame 1).', 'In the top bar of the front page, the route list and every route and section page, left of the page’s own icon (map, share).', 'Tinted green with the signboard colour, so it reads as different from the plain icons beside it. Read out as “Ask Meel” by screen readers.', 'From the front page it opens the empty Ask page (screen 9). From a route or section page it opens with that route set (frame 4).', 'Not shown on the Ask page itself, on account and log-in pages, or on the editor’s pages.', 'No fifth tab and no floating button: the four tabs stay, and nothing covers a fact.']],
      ['First-visit hint (frame 1)', ['Shown once per browser, the first time the icon is on screen. Closes on “Got it”, on a tap anywhere, or when the icon is used, and never shows again.', 'Not shown to a rider who arrived on a shared fact link until their second page, so the fact they came for is seen first.', 'Remembered in the browser only.']],
      ['Where the row sits (frame 2)', ['Under the route’s key figures, above the sections. One row, never a floating button: it must not cover facts.', 'It says the same as the icon but with an example question for this route, for riders who don’t notice icons.']],
      ['From a fact (frame 3)', ['“Ask about this fact” opens Ask Meel with the fact attached, so “when did this change?” or “is there an order?” needs no more words.', 'The fact shows at the top of the conversation as a small card.']],
      ['Starter questions (frame 4)', ['Four per route, written from what riders search for that route. Fixed per route, not made by the model, so they always have an answer.', 'Answered in advance at every data rebuild (about ₹2 for all 204), so a tap costs nothing.']],
    ],
  },

  /* ── Before the first question ── */
  {
    group: 'Before the first question', title: 'The empty page, and how answers work',
    lede: 'The first time, a rider needs to know two things: what it can answer, and how far to trust it.',
    render: () => phone('1. Opened from the top bar or search', `
      ${ASK.top('Answers only from Meel’s facts', `<span class="iconbtn">${ICON.info}</span>`)}
      ${body(`
        <div style="display:flex;flex-direction:column;gap:8px;padding:8px 0">
          ${askMark('big')}
          <h3 style="margin:0;font:700 26px/1.05 var(--display);text-transform:uppercase">Ask about a road</h3>
          <span class="fact-d">Fuel, permits, check posts, passes, distances and seasons on Meel’s 51 routes. Every answer shows where it came from, and how old it is.</span>
        </div>
        <div class="lbl">Riders often ask</div>
        <div class="ask-starter">
          <span class="chip">${ICON.ask}Petrol pump in Chitkul?</span>
          <span class="chip">${ICON.ask}Toong check post timing</span>
          <span class="chip">${ICON.ask}Gandikota to Araku valley distance</span>
          <span class="chip">${ICON.ask}e-Aagman pass bike ke liye chahiye?</span>
        </div>
        <span class="hint">10 questions a day without logging in.</span>`)}
      ${ASK.bar()}`)
    + phone('2. “How answers work”', `
      ${ASK.top()}
      ${body('')}
      <div class="sheet-scrim"></div>
      <div class="sheet"><span class="grab"></span>
        <h3>How Ask Meel answers</h3>
        <div class="rows">
          <div class="row"><span class="ic">${ICON.list}</span><span class="grow"><b>Only from Meel’s facts</b><span class="hint">Never from the open web. If Meel has no fact, it says so.</span></span></div>
          <div class="row"><span class="ic">${ICON.clock}</span><span class="grow"><b>Every fact has a date</b><span class="hint">The number after a sentence opens the fact, its source and when it was checked.</span></span></div>
          <div class="row"><span class="ic">${ICON.flag}</span><span class="grow"><b>Never “open” or “closed”</b><span class="hint">For roads and passes it gives the offices that announce it.</span></span></div>
          <div class="row"><span class="ic">${ICON.peak}</span><span class="grow"><b>Pictures are Meel’s own</b><span class="hint">Route photos with their credit, riders’ videos, Meel’s drawings.</span></span></div>
        </div>
        <div class="callout"><b>Your questions</b>Kept for 30 days to see what Meel is missing, without your phone number or account.</div>
        <span class="btn btn-primary btn-block" style="height:46px">Got it</span>
      </div>`),
    notes: [
      ['Look and motion', ['Ask Meel’s mark is Meel’s own kilometre stone with a speech tail: white body, yellow cap, and a short road inside. Screen 24 shows why, and three other ideas.', 'At rest a glint passes over the yellow cap every few seconds, like reflective paint on a real stone.', 'While it thinks, the road inside the stone moves and the stone bobs gently, as if on its way; the waiting step has a moving road dash, its words shimmer, and grey lines shimmer where the answer will be.', 'While it writes, a green caret blinks. The input gets a green edge while typing.', 'All motion stops for riders whose phone asks for reduced motion. Nothing ever starts hidden: every frame reads the same with motion off.']],
      ['Starter questions', ['Taken from real searches, rewritten as a rider would ask. One in Hinglish, so riders see they can.', 'Tapping one sends it at once. Their answers are written in advance at each data rebuild, so a tap costs nothing and the answer appears at once (still with the short steps, for the same feel).']],
      ['The sheet', ['Shown by itself the first time only, then from the ⓘ button. Remembered in the browser.']],
      ['Limit line', ['Shows the day’s limit only when not logged in. After 7 questions it becomes “3 questions left today”.']],
    ],
  },

  /* ── An answer, step by step ── */
  {
    group: 'An answer, step by step', title: 'While it looks, then the answer',
    lede: 'The rider asked about fuel in Chitkul. First it says what it understood and what it found, then it writes, then the sources and the drawing appear.',
    render: () => phone('1. Looking', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('petrol pump in chitkul')}
        <div class="ask-a">
          ${ASK.who('', true)}
          ${ASK.step('Fuel near Chitkul, on Kinnaur')}
          ${ASK.step('Found 6 facts: 11 pumps on the route, 1 gap note')}
          ${ASK.step('Writing the answer', false)}
          ${ASK.skel(92)}${ASK.skel(78)}${ASK.skel(55)}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Writing', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('petrol pump in chitkul')}
        <div class="ask-a">
          ${ASK.who('6 facts', true)}
          <p><b>There is no pump in Chitkul.</b> The nearest is at Batseri, 27 km before Chitkul on the Sangla road${ASK.c(1)}. Fill up there or at Karcham${ASK.c(2)}<span class="ask-caret"></span></p>
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('3. The whole answer', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('petrol pump in chitkul')}
        <div class="ask-a">
          ${ASK.who('6 facts · Kinnaur')}
          <p><b>There is no pump in Chitkul.</b> The nearest is at Batseri, 27 km before Chitkul on the Sangla road${ASK.c(1)}. Fill up there or at Karcham, 70 km before${ASK.c(2)}.</p>
          <p>Going on to Kalpa, the next pump after Chitkul is at Tapri, 51 km back down the valley${ASK.c(3)}. None of these pumps has been confirmed by a rider yet; they come from the open map.</p>
          ${ASK.sources([
            ASK.srcRow(1, 'Petrol pump, Batseri', 'Kinnaur · km 94 · from the open map', 'unchecked'),
            ASK.srcRow(2, 'Petrol pump, Karcham', 'Kinnaur · km 51 · from the open map', 'unchecked'),
            ASK.srcRow(3, 'Petrol pump, Tapri', 'Kinnaur · km 172 · from the open map', 'unchecked'),
          ])}
          ${ASK.acts()}
          ${ASK.next(['Is there a permit for Chitkul?', 'Pumps on the whole route', 'Check fuel for my bike'])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['The answer', ['The first sentence answers the question as asked, in bold. Then what to do. Then the caveat.', '“Not confirmed by a rider” is said in words, not only by the badge. A rider skimming must not miss it.', 'Distances are along Meel’s route line, rounded to the kilometre in the sentence and exact on the fact.']],
      ['Steps (frame 1)', ['At most three. The first says the route Meel thinks is meant, so a wrong guess is visible at once.', 'They collapse to one line, “6 facts · Kinnaur”, when the answer starts.']],
      ['Sources', ['Numbered in the order they appear. Each opens the fact (next screen). Badges use the site’s own age words.']],
      ['Next questions', ['From a fixed list for each kind of question, never written by the model (it saves cost): a fuel answer always offers the fuel check.']],
      ['Data', ['Real Meel facts: Batseri km 94.0, Karcham km 50.7, Tapri km 171.8, Chitkul km 121.1 on Kinnaur.']],
    ],
  },
  {
    group: 'An answer, step by step', title: 'A source number opens the fact',
    lede: 'The numbers are the point. One tap shows the fact exactly as the route page shows it, with its date, its source, and the two buttons to confirm or report it.',
    render: () => phone('1. Tapping ①', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('petrol pump in chitkul')}
        <div class="ask-a">${ASK.who('6 facts · Kinnaur')}<p><b>There is no pump in Chitkul.</b> The nearest is at Batseri, 27 km before Chitkul${ASK.c(1)}.</p></div>`)}
      <div class="sheet-scrim"></div>
      <div class="sheet"><span class="grab"></span>
        <span class="hint">Source 1 · Kinnaur · Fuel</span>
        ${fact({ t: 'Petrol pump, Batseri', d: 'On the Sangla to Chitkul road. 94 km from Rampur, 27 km before Chitkul. Hours not known.', state: 'unchecked', line: 'From the open map (OpenStreetMap) · read 28 September 2026 · no rider has confirmed it', open: true })}
        <span class="btn btn-outline btn-block">Open on the route page</span>
      </div>`),
    notes: [
      ['Behaviour', ['The sheet is the same fact component as the route page, so Still true and This has changed work here too, and go to the same inbox.', '“Open on the route page” opens the fact’s own link, with its neighbours, as a shared fact link does today.', 'On a laptop the fact opens in the right column instead (screen 23).']],
    ],
  },

  /* ── Pictures and drawings ── */
  {
    group: 'Pictures and drawings', title: 'Fuel gap, photo and videos',
    lede: 'Answers about a route can show what the route page shows: its drawing, its photo with credit, and riders’ videos of the stretch asked about.',
    render: () => phone('1. A fuel question gets the gap drawing', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('manali se leh kitna petrol chahiye? classic 350')}
        <div class="ask-a">
          ${ASK.who('7 facts · Manali to Leh')}
          <p><b>Sabse lamba gap 329 km hai</b>, Keylong se Karu tak, beech mein koi pump nahi${ASK.c(1)}${ASK.c(2)}. Keylong mein tank full karein${ASK.c(1)}.</p>
          <p>Classic 350 ke liye fuel check se dekh lijiye ki extra can chahiye ya nahi.</p>
          ${gapReal}
          <span class="btn btn-soft" style="align-self:flex-start">${ICON.fuel}Fuel check for Classic 350</span>
          ${ASK.sources([
            ASK.srcRow(1, 'Keylong petrol pump', 'Manali to Leh · km 72.5 · from the open map', 'unchecked'),
            ASK.srcRow(2, 'No fuel pump between Keylong and Karu', 'Manali to Leh · hazard', 'ageing'),
          ])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. A route question gets its photo and videos', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('what is the road like from sarchu to leh')}
        <div class="ask-a">
          ${ASK.who('5 facts · Manali to Leh')}
          <p>Between Sarchu and Pang the road is rough and unpaved in places${ASK.c(1)}, and it climbs the 21 bends of the Gata Loops. After Pang come the More plains, then Tanglang La at 17,480 ft before the drop to Leh${ASK.c(2)}.</p>
          <div class="ask-pic"><div class="hero"><span class="hero-cap">The Tsarap river from the Gata Loops</span></div>
            <div class="credit-line">Photo: Soumen Gomes · CC BY-SA 4.0 · <span class="link">Wikimedia Commons</span></div></div>
          <div class="lbl">Riders’ videos of this stretch</div>
          ${vidA('Sarchu to Leh Bike Ride | Baralacha La to Tanglang La', 'Miles with Munaf', 'Sarchu to Leh', 'Filmed 2026')}
          ${vidA('Pang to Tanglang La & More Plains | Ladakh Ride 2026', 'Highway Horizon', 'Pang to Leh', 'Filmed 2026')}
          ${ASK.acts()}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['Which picture, by rule', ['Fuel question: the route’s gap drawing, with the gap asked about. Route or stretch: the route photo. Stretch named: up to two videos whose stretch matches, newest filming first.', 'Never more than one drawing and two videos in one answer. The answer is still read on a phone.']],
      ['Photos', ['Always with the photographer, licence and source, as on the route page. The licences ask for it.']],
      ['Videos', ['Play on YouTube in a new tab. Titles are shown as the rider wrote them, shortened.']],
      ['Hinglish (frame 1)', ['Asked in Hinglish, answered in Hinglish, in Latin letters. Fact names and source lines stay in English, as on the site.']],
      ['Data', ['Real: Keylong km 72.5, Karu km 401.8, gap 329.3 km; photo by Soumen Gomes; videos from the route’s list.']],
    ],
  },
  {
    group: 'Pictures and drawings', title: 'A distance, and where to stop the night',
    lede: 'Distance questions get the route line stretch by stretch. Night-halt questions get the altitude drawing, with Meel’s altitude facts.',
    render: () => phone('1. “gandikota to araku valley distance”', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('gandikota to araku valley distance')}
        <div class="ask-a">
          ${ASK.who('5 facts · Andhra Pradesh: Araku, Lambasingi, Gandikota')}
          <p><b>812.6 km along Meel’s route</b>, through Paderu, Lambasingi and Narsipatnam${ASK.c(1)}. A map app says about 10 h 20 min of riding${ASK.c(1)}.</p>
          ${arakuLine}
          <table class="ask-tbl"><thead><tr><th>Stretch</th><th style="text-align:right">km</th><th style="text-align:right">Map app</th></tr></thead><tbody>
            <tr><td>Araku valley to Paderu</td><td style="text-align:right">44.7</td><td style="text-align:right">33 min</td></tr>
            <tr><td>Paderu to Lambasingi</td><td style="text-align:right">47.2</td><td style="text-align:right">34 min</td></tr>
            <tr><td>Lambasingi to Narsipatnam</td><td style="text-align:right">30.4</td><td style="text-align:right">28 min</td></tr>
            <tr><td>Narsipatnam to Gandikota</td><td style="text-align:right">690.3</td><td style="text-align:right">8 h 45 min</td></tr>
          </tbody></table>
          <p class="ask-src">The last stretch is 690 km, a long day by any count. Meel has no riders’ hours for it yet.</p>
          ${ASK.sources([ASK.srcRow(1, 'Stretches of this route', 'From the open map · read 28 September 2026', 'unchecked')])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Where to stop the night', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('where should i stop the night between manali and leh')}
        <div class="ask-a">
          ${ASK.who('6 facts · Manali to Leh')}
          <p><b>Jispa is the usual first night</b>, lower and with more stays. Sarchu is higher than most bodies like on a first night up${ASK.c(1)}.</p>
          ${profile(['Jispa', 'Sarchu'], ['Sarchu'], 'Night halts marked on the route’s altitude line. Red: higher than the altitude facts advise for that night.')}
          ${ASK.sources([
            ASK.srcRow(1, 'Sleeping high: go up slowly', 'Altitude facts · health advisory', 'fresh'),
            ASK.srcRow(2, 'Halts and their heights', 'Manali to Leh · from encyclopedias', 'unchecked'),
          ])}
          ${ASK.next(['Altitude plan for this route', 'Pumps between Jispa and Leh'])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['Distance', ['Along Meel’s own route line, never a straight line. The route asked about is named in the header so a rider can see which road was measured.', 'If the two places sit on different routes, it says so and gives the route that links them, or says Meel has none.', 'The line about a long stretch is a fixed line shown when a stretch is over 400 km. It states the distance only; it never claims what riders do.']],
      ['Night halts', ['Uses the altitude plan’s own drawing and rule. It never says “safe”; it says what the altitude facts advise.']],
      ['Data', ['Real stretches of the Andhra route (44.7, 47.2, 30.4, 690.3 km; 0.55, 0.56, 0.47, 8.75 hours). The altitude drawing reuses the route page’s drawing.', 'The altitude source title “Sleeping high: go up slowly” is a placeholder for the altitude plan’s real wording.']],
    ],
  },

  /* ── Comparing and following up ── */
  {
    group: 'Comparing and following up', title: 'Two routes side by side',
    lede: 'A comparison is a small table of the same facts for each route, each with its date. No “better” and no ranking.',
    render: () => phone('1. “spiti or ladakh in late october?”', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('spiti or manali leh in late october?')}
        <div class="ask-a">
          ${ASK.who('8 facts · 2 routes')}
          <p>Both are at the end of their season. On 15 October snow had closed Darcha to Sarchu on Manali–Leh${ASK.c(1)}. The Spiti circuit’s season runs June to October${ASK.c(2)}.</p>
          <table class="ask-tbl"><thead><tr><th></th><th>Spiti circuit</th><th>Manali to Leh</th></tr></thead><tbody>
            <tr><td><b>Usually open</b></td><td>Jun to Oct${ASK.c(2)}</td><td>Jun to Oct${ASK.c(3)}</td></tr>
            <tr><td><b>Highest</b></td><td>Kunzum La, 14,930 ft</td><td>Tanglang La, 17,480 ft</td></tr>
            <tr><td><b>Longest fuel gap</b></td><td>178.5 km${ASK.c(4)}</td><td>329.3 km${ASK.c(5)}</td></tr>
            <tr><td><b>Last news seen</b></td><td>—</td><td>15 Oct 2026${ASK.c(1)}</td></tr>
          </tbody></table>
          <div class="callout warn"><b>Meel doesn’t say which is open</b>Check the offices on each route before you leave. <span class="link">Spiti offices</span> · <span class="link">Manali–Leh offices</span></div>
          ${ASK.acts()}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['Rules', ['The rows are fixed per kind of comparison: season, height, fuel gap, last news. The model fills them only from facts.', 'Up to three routes. More becomes a list of links to each route.', 'A dash means Meel has no fact for that cell, and says so on tap.']],
    ],
  },
  {
    group: 'Comparing and following up', title: 'A follow-up, and a Hinglish question',
    lede: 'Follow-ups keep the route and the facts already found. Hindi and Hinglish are understood, and answered in kind.',
    render: () => phone('1. A follow-up with no route named', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('toong check post timing')}
        <div class="ask-a">${ASK.who('3 facts · North Sikkim')}<p><b>Cross Toong by 4 pm</b>, going up and coming down${ASK.c(1)}.</p></div>
        ${ASK.q('kab se hai ye rule? pehle kya tha?')}
        <div class="ask-a">
          ${ASK.who('same route')}
          <p>4 baje ka rule 10 September 2026 se hai, Mangan district ke order se${ASK.c(1)}. Iska text Meel ko nahi mila, sirf news report hai.</p>
          <div class="tl">
            <div><span>10 Sep 2026</span><b>4 pm both ways, Mangan district order</b></div>
            <div><span>14 Mar 2026</span><b>Before 4 pm both ways; permits a day ahead</b></div>
            <div><span>8 Sep 2025</span><b>Sanklang by 1 pm going up, Toong by 2 pm coming back</b></div>
          </div>
          ${ASK.sources([ASK.srcRow(1, 'Cross Toong check post by 4 pm', 'North Sikkim · news, 11 Sep 2026 · 3 past changes', 'ageing')])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Hindi in Devanagari', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('क्या बाइक के लिए ई-आगमन पास चाहिए?')}
        <div class="ask-a">
          ${ASK.who('2 facts · Manali to Leh, Spiti')}
          <p><b>हाँ।</b> लाहौल और स्पीति में आने वाली हर गाड़ी, मोटरसाइकिल भी, ऑनलाइन आवेदन करती है${ASK.c(1)}। बाइक के लिए फीस है या नहीं, यह Meel को पक्का नहीं मिला।</p>
          ${ASK.sources([ASK.srcRow(1, 'e-Aagman pass for Lahaul and Spiti: motorcycles included', 'Government of Himachal Pradesh · read 17 Oct 2026', 'fresh')])}
          ${ASK.acts()}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['Follow-ups', ['A follow-up with no place named uses the last route. The header says “same route” so the rider sees it.', 'A new place in the follow-up starts a new search. Only the previous question and its answer go with a follow-up, to keep each question cheap.']],
      ['Rule history', ['When a rule has past changes, a “when / what before” question gets the history as a timeline, newest first, from the rule’s own history.']],
      ['Language', ['Answered in the script asked. Fact titles stay as on the site (English).', 'What Meel couldn’t confirm is said in the rider’s language too.']],
      ['Data', ['Real: the Toong rule and its three past changes; the e-Aagman rule.']],
    ],
  },

  /* ── Is it open? ── */
  {
    group: 'Is it open?', title: '“Is Zoji La open?”',
    lede: 'The most asked and most dangerous question. Ask Meel answers it the way the route page does: it never says open or closed, it says who to check with and what Meel last saw.',
    render: () => phone('1. Asked straight', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('is zoji la open today')}
        <div class="ask-a">
          ${ASK.who('Srinagar to Leh')}
          <p><b>Meel doesn’t say whether a pass is open.</b> It changes by the hour, and no office publishes it in one reliable place. These do announce it:</p>
          <div class="rows">
            <div class="row"><span class="grow"><b>Traffic Police Headquarters, J&amp;K</b><span class="hint">Daily traffic advisory · which way the road runs today</span></span>${ICON.ext}</div>
            <div class="row"><span class="grow"><b>Border Roads Organisation, Project Beacon</b><span class="hint">Snow clearance and connection</span></span>${ICON.ext}</div>
            <div class="row"><span class="grow"><b>District Police Kargil</b><span class="hint">The Kargil side</span></span>${ICON.ext}</div>
          </div>
          <p>What Meel knows: Zoji La is often shut on Fridays for maintenance${ASK.c(1)}, and has cut-off times and one-way running${ASK.c(2)}.</p>
          ${ASK.sources([
            ASK.srcRow(1, 'Zoji La: often shut on Fridays for maintenance', 'Srinagar to Leh · rule', 'ageing'),
            ASK.srcRow(2, 'Zoji La: cut-off times and one-way running', 'Srinagar to Leh · rule', 'ageing'),
          ])}
          ${ASK.next(['When did Zoji La close last winter?', 'Rules for motorcycles on Zoji La'])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Pressed: “just tell me yes or no”', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('bhai bas haan ya na batao, khula hai?')}
        <div class="ask-a">
          ${ASK.who()}
          <p>Haan ya na Meel nahi bata sakta. Galat “khula hai” se koi raste mein phans sakta hai. Upar diye offices aaj ki khabar dete hain; J&amp;K Traffic Police ki advisory sabse pehle aati hai.</p>
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['The rule', ['Words like open, closed, khula, band, status, today about a road, pass, tunnel or check post always get this shape. Decided before search, so the model can’t be talked out of it.', 'Season history and the last news date may be given, always as dated past facts (“on 15 October, snow had closed…”), never as now.']],
      ['Pressed (frame 2)', ['Same answer, shorter, in the rider’s language, with the reason. No apology loop.']],
      ['Data', ['Real offices and rules on Srinagar to Leh.']],
    ],
  },

  /* ── Not sure ── */
  {
    group: 'When Meel isn’t sure', title: 'No fact, disagreeing facts, old facts',
    lede: 'Three ways an honest answer is not a clean one. Each says what Meel has, what it doesn’t, and how a rider can help.',
    render: () => phone('1. No fact on it', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('does the kaza pump take cards?')}
        <div class="ask-a">
          ${ASK.who('Spiti circuit')}
          <p><b>Meel has no fact on whether the Kaza pump takes cards.</b> What it does have: the Kaza pump is Indian Oil’s, called the world’s highest retail pump, 433 km into the circuit${ASK.c(1)}, and after it there is no pump for 178.5 km${ASK.c(2)}.</p>
          ${ASK.sources([
            ASK.srcRow(1, 'Indian Oil, Kaza', 'Spiti circuit · km 433 · from the open map', 'unchecked'),
            ASK.srcRow(2, 'Fuel gap Kaza to Manali', 'Worked out from the pumps', 'unchecked'),
          ])}
          <div class="empty"><b>Been there?</b><span>Tell Meel and it goes to the editor with your name and date.</span><span class="btn btn-soft">${ICON.plus}Add what you know</span></div>
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Reports disagree', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('winter closing date manali leh')}
        <div class="ask-a">
          ${ASK.who('5 facts · Manali to Leh')}
          <p><b>Usually around 20 November</b>, by district order${ASK.c(1)}. This year is not settled: on 15 October the district listed Darcha to Sarchu as closed by snow, with no reopening time, and no winter order was found${ASK.c(2)}.</p>
          <div class="callout warn"><b>Two things say different things</b>The season usually runs to late November; snow closed part of it on 15 October. Both are shown.</div>
          ${ASK.sources([
            ASK.srcRow(1, 'Winter closure by district order', '5 past years · news, 18 Nov 2025', 'ageing'),
            ASK.srcRow(2, 'Season 2026: Darcha to Sarchu closed by snow', 'News, 15 Oct 2026', 'conflict'),
          ])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('3. Only old facts', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('darcha sarchu time window')}
        <div class="ask-a">
          ${ASK.who('2 facts · Manali to Leh')}
          <p>At the start and end of the season, traffic must pass Darcha or Sarchu within set hours, sometimes one direction a day${ASK.c(1)}. <b>The hours change every year, and Meel’s newest source is from November 2024</b>, nearly two years old.</p>
          ${ASK.sources([ASK.srcRow(1, 'Darcha to Sarchu: time windows', 'News, 19 Nov 2024 · 7 past changes', 'stale')])}
          ${ASK.next(['Who announces the hours?'])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['No fact (frame 1)', ['First sentence says plainly there is no fact. Then the nearest facts it does have, only if they are about the same thing (the same pump).', '“Add what you know” opens the existing suggest-a-fact form, with the question attached.', 'The question is logged as no-fact for the weekly list.']],
      ['Disagree (frame 2)', ['When two facts conflict, both are given with their dates, and the callout says so. Ask Meel never picks one.']],
      ['Old (frame 3)', ['A stale fact’s age is said inside the sentence. The badge alone is not enough.']],
      ['Data', ['Real: Kaza pump, the 178.5 km gap, the Manali–Leh season note and the Darcha–Sarchu rule.']],
    ],
  },

  /* ── Handle with care ── */
  {
    group: 'Handle with care', title: 'Which one? Off topic. Feeling unwell.',
    lede: 'Three questions where the right answer is not a search result: a place on two routes, a question Meel doesn’t cover, and a rider who may be in trouble.',
    render: () => phone('1. A place on more than one route', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('padum petrol pump')}
        <div class="ask-a">
          ${ASK.who()}
          <p>Padum is on three Meel routes. Which way are you coming?</p>
          <div class="ask-starter">
            <span class="chip">From Leh, on the new Nimmu road</span>
            <span class="chip">From Kargil, over Pensi La</span>
            <span class="chip">From Darcha, over Shinku La</span>
          </div>
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Off topic', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('best bike for ladakh under 2 lakh and total trip cost')}
        <div class="ask-a">
          ${ASK.who()}
          <p>Meel doesn’t rank bikes or give trip costs. It can tell you whether your bike’s tank covers the fuel gaps, and what the longest gap is on each Ladakh route.</p>
          ${ASK.next(['Fuel check for my bike', 'Longest fuel gap to Leh'])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('3. Feeling unwell at height', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('bad headache and vomiting at sarchu what to do')}
        <div class="ask-a">
          ${ASK.who()}
          <div class="callout warn"><b>Call 112 if it is getting worse</b>Headache with vomiting at height can be serious. Going down is what helps most.</div>
          <p>Meel is not medical advice. Its altitude facts say: if symptoms get worse, go lower, and don’t climb higher until they pass${ASK.c(1)}.</p>
          <div class="rows">
            <div class="row"><span class="ic">${ICON.phone}</span><span class="grow"><b>112</b><span class="hint">Emergency, works on any network with signal</span></span></div>
            <div class="row"><span class="ic">${ICON.list}</span><span class="grow"><b>Emergency card for Manali to Leh</b><span class="hint">Nearest hospitals and police, saved for offline</span></span>${chev}</div>
          </div>
          ${ASK.sources([ASK.srcRow(1, 'Sleeping high: go up slowly', 'Altitude facts · health advisory', 'fresh')])}
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['Which one (frame 1)', ['When a place is on more than one route and the question depends on the road, it asks, with the routes as buttons. One tap answers.', 'When it doesn’t depend on the road, it just answers.']],
      ['Off topic (frame 2)', ['One line saying what Meel doesn’t do, then what it can do instead. Never a lecture.', 'Questions entirely off riding (cricket, homework) get one line and no search.']],
      ['Health (frame 3)', ['Words about symptoms skip the model’s own advice. The answer is a fixed template: 112 first, the altitude fact, the route’s emergency card.', 'The emergency card is the existing one, not a new screen.']],
    ],
  },

  /* ── After an answer ── */
  {
    group: 'After an answer', title: '“This answer is wrong”',
    lede: 'One tap, an optional line, sent to the editor with everything needed to check it.',
    render: () => phone('1. Reporting', `
      ${ASK.top()}
      ${body(`${ASK.q('petrol pump in chitkul')}`)}
      <div class="sheet-scrim"></div>
      <div class="sheet"><span class="grab"></span>
        <h3>What was wrong?</h3>
        <div class="radio-list">
          <div class="on"><span class="radio"></span>A fact is out of date</div>
          <div><span class="radio"></span>It said something the sources don’t</div>
          <div><span class="radio"></span>It answered a different question</div>
          <div><span class="radio"></span>Something else</div>
        </div>
        <div class="field"><label>What did you see? <em>optional</em></label><div class="input filled" style="height:auto;padding:10px 12px;line-height:20px">There's a new pump at Sangla now, opened this year</div></div>
        <div class="callout"><b>Goes to the editor</b>With the question, the answer and the facts it used. Your name only if you’re logged in.</div>
        <span class="btn btn-primary btn-block" style="height:46px">${ICON.send}Send to the editor</span>
      </div>`)
    + phone('2. Sent', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('petrol pump in chitkul')}
        <div class="ask-a">${ASK.who('6 facts · Kinnaur')}<p><b>There is no pump in Chitkul.</b> The nearest is at Batseri${ASK.c(1)}.</p>
          <div class="callout info"><b>Thanks. Sent to the editor.</b>A fact changed by your report shows your name and date on the route page.</div></div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['In the editor’s inbox', ['A new kind beside This has changed, Still true and Trip report: “Answer marked wrong”.', 'It shows the question, the answer, each fact used with its age, the reason and the rider’s line. One tap opens each fact to edit.']],
      ['Data', ['Kept with the reported answer: reason, line, logged-in rider if any. Not the phone.']],
    ],
  },
  {
    group: 'After an answer', title: 'Sharing an answer',
    lede: 'Riders answer each other in chat groups. A shared answer is frozen as written, dated, and links back to the live facts.',
    render: () => phone('1. Pasted into a group', `
      <div class="chat">
        <div class="chat-top">${ICON.back}<span class="chat-av">HR</span><span><b>Himachal Riders</b><span>112 members</span></span></div>
        <div class="chat-body">
          <div class="msg"><span class="who">Arjun K.</span>Chitkul mein petrol milega?<span class="t">7:02 pm</span></div>
          <div class="msg out">
            <div class="preview">
              <div class="pic">${mark()}<span><strong>Ask Meel</strong><em>Answered 19 October 2026</em></span></div>
              <div class="txt"><b>No pump in Chitkul. Nearest: Batseri, 27 km before.</b><span>From 6 Meel facts on Kinnaur, with their dates.</span><span>${SITE}</span></div>
            </div>
            <span class="link">${SITE}/ask/a/7Kq2xD</span><span class="t">7:04 pm</span></div>
        </div>
        <div class="chat-in"><span style="flex:1;color:var(--ink-2)">Message</span></div>
      </div>`, '7:04')
    + phone('2. The shared answer opened', `
      ${head('Ask Meel', 'A shared answer', { back: false })}
      ${body(`
        <div class="callout stone"><b>Answered on 19 October 2026</b>Frozen as it was written. The facts may have changed since: <span class="link">see them now</span>.</div>
        ${ASK.q('petrol pump in chitkul')}
        <div class="ask-a">
          ${ASK.who('6 facts · Kinnaur')}
          <p><b>There is no pump in Chitkul.</b> The nearest is at Batseri, 27 km before Chitkul on the Sangla road${ASK.c(1)}. Fill up there or at Karcham, 70 km before${ASK.c(2)}.</p>
          ${ASK.sources([
            ASK.srcRow(1, 'Petrol pump, Batseri', 'Kinnaur · km 94', 'unchecked'),
            ASK.srcRow(2, 'Petrol pump, Karcham', 'Kinnaur · km 51', 'unchecked'),
          ])}
        </div>
        <span class="btn btn-primary btn-block" style="height:46px">${ICON.ask}Ask your own question</span>`)}`),
    notes: [
      ['Share link', ['Made only when the rider taps Share. The link holds the question and answer, not who asked.', 'The preview card carries the answer’s first sentence and its date, so the group gets the answer without opening it.']],
      ['Frozen', ['The page never re-runs the question. If a source fact has changed since, the source row says “changed since” and links the live fact.']],
      ['Search engines', ['Shared answers are not indexed. They would be thin copies of route pages.']],
    ],
  },

  /* ── When it can't ── */
  {
    group: 'When it can’t', title: 'No network, limit reached',
    lede: 'Asking needs a network and costs money per question. Both limits are said plainly, with what still works.',
    render: () => phone('1. No network', `
      ${ASK.top()}
      <div class="offline">${ICON.wifiOff}<span>No network. Ask Meel needs signal. Saved route pages still open.</span></div>
      ${body(`
        ${ASK.q('pang to leh fuel')}
        <div class="callout"><b>Not sent yet</b>Your question is kept and sent when signal returns, if this page is still open.</div>
        <div class="lbl">Saved on this phone</div>
        <div class="rows"><div class="row"><span class="ic">${ICON.save}</span><span class="grow"><b>Manali to Leh</b><span class="hint">Saved 17 October, 6:40 am · fuel section</span></span>${chev}</div></div>`)}
      ${ASK.bar('pang to leh fuel', true)}`, '2:15')
    + phone('2. Day’s limit reached', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('kunzum la height')}
        <div class="empty"><b>That’s 10 questions today</b><span>More tomorrow, or log in for 40 a day. Every route page is still open to read.</span><span class="btn btn-soft">Log in</span></div>`)}
      <div class="pfoot"><div class="ask-bar"><div class="input">Back tomorrow at midnight</div><span class="ask-send off">${ICON.up}</span></div></div>`),
    notes: [
      ['No network', ['The question stays in the box and is sent on reconnect, only while the page is open. Nothing is queued in the background.', 'Saved routes are listed, since they answer most questions offline.']],
      ['Limit', ['Counted per phone (a random id in the browser) when logged out, per account when in. Resets at midnight India time.', 'The limit message never blocks reading the site.']],
    ],
  },
  {
    group: 'When it can’t', title: 'Failed, or slow',
    lede: 'The model or the search can fail or crawl. The rider is told, can try again, and is pointed at the page that holds the answer.',
    render: () => phone('1. Slow', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('rules for motorcycles in north sikkim')}
        <div class="ask-a">
          ${ASK.who('', true)}
          ${ASK.step('Rules on North Sikkim')}
          ${ASK.step('Found 9 facts')}
          ${ASK.step('Writing is slow right now…', false)}
          <div class="callout"><b>Taking longer than usual</b>The facts are found. <span class="link">Open them on the route page</span> while this finishes.</div>
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`)
    + phone('2. Failed', `
      ${ASK.top()}
      ${body(`
        ${ASK.q('rules for motorcycles in north sikkim')}
        <div class="ask-a">
          ${ASK.who()}
          <div class="callout warn"><b>Ask Meel couldn’t answer just now</b>This didn’t count towards your 10 a day.</div>
          <div class="ask-acts"><span class="btn btn-primary">${ICON.retry}Try again</span><span class="btn btn-outline">North Sikkim rules</span></div>
        </div>`)}
      ${ASK.bar('Ask a follow-up')}`),
    notes: [
      ['Slow', ['After 15 seconds with no answer text, the callout shows. The facts found are linked, so the wait is never wasted.']],
      ['Failed', ['A failed question is not counted. Try again re-sends it once; a second failure keeps the route link only.', 'Half-written answers are never shown as complete: if writing stops, the text so far is greyed and marked “stopped”.']],
    ],
  },

  /* ── Laptop ── */
  {
    group: 'On a laptop', title: 'Answer in the middle, sources beside it',
    lede: 'On a laptop there is room to keep the sources open. Past questions on the left stay in this browser only.',
    desk: true,
    render: () => desk('A Hinglish fuel question, with source 1 open', `
      ${deskTop(`<span class="btn ask-btn">${ICON.ask}Ask Meel</span>`)}
      <div class="desk-main" style="grid-template-columns:260px minmax(0,1fr) 360px">
        <nav class="desk-nav" style="padding:16px 12px;gap:4px">
          <span class="btn btn-outline btn-block">${ICON.plus}New question</span>
          <div class="lbl" style="padding:14px 10px 6px">Today</div>
          <div class="it on">${ICON.ask}<span>manali se leh kitna petrol</span></div>
          <div class="it">${ICON.ask}<span>toong check post timing</span></div>
          <div class="lbl" style="padding:14px 10px 6px">This week</div>
          <div class="it">${ICON.ask}<span>gandikota to araku distance</span></div>
          <div class="it">${ICON.ask}<span>is zoji la open</span></div>
          <span class="hint" style="padding:14px 10px">Kept in this browser only.</span>
        </nav>
        <section class="desk-mid" style="max-width:720px">
          ${ASK.q('manali se leh kitna petrol chahiye? classic 350')}
          <div class="ask-a">
            ${ASK.who('7 facts · Manali to Leh')}
            <p><b>Sabse lamba gap 329 km hai</b>, Keylong se Karu tak, beech mein koi pump nahi${ASK.c(1)}${ASK.c(2)}. Keylong mein tank full karein${ASK.c(1)}. Classic 350 ke liye fuel check se dekh lijiye ki extra can chahiye ya nahi.</p>
            ${gapReal}
            ${ASK.acts(`<span class="btn btn-soft">${ICON.fuel}Fuel check for Classic 350</span>`)}
            ${ASK.next(['Pumps in Leh', 'Darcha to Sarchu timings', 'Altitude plan'])}
          </div>
          <div class="ask-bar" style="margin-top:auto"><div class="input">Ask a follow-up</div><span class="ask-send off">${ICON.up}</span></div>
        </section>
        <aside class="desk-side">
          <div class="sec-h"><h3>Sources</h3><span class="hint">2 facts</span></div>
          ${fact({ t: 'Keylong petrol pump', d: 'Last pump before the 329 km gap. 72.5 km from Manali.', state: 'unchecked', line: 'From the open map · read 28 September 2026 · no rider has confirmed it', open: true, hi: true })}
          ${fact({ t: 'No fuel pump between Keylong and Karu', d: 'Carry enough for the whole gap, with a margin for detours and cold.', state: 'ageing', line: 'Hazard · checked by the editor 28 September 2026' })}
          <span class="btn btn-outline btn-block">Open Manali to Leh</span>
        </aside>
      </div>`),
    notes: [
      ['Layout', ['Three columns: past questions, the conversation, and the sources of the answer in view.', 'Tapping a number scrolls the right column to that fact and outlines it.', 'Below about 1,000 pixels the sources become the phone’s sheet.']],
      ['History', ['Past questions are kept in the browser, not on the server, and can be cleared. Logged-in riders get the same, per browser.']],
    ],
  },
  /* ── The mark ── */
  {
    group: 'The mark', title: 'A travel mark, not a sparkle',
    lede: 'The sparkle is every AI product’s icon. Ask Meel’s mark comes from the road instead. The first is the one used on every screen; the other three are here to compare.',
    plain: true,
    render: () => {
      const QPIN = '<svg viewBox="0 0 24 24"><path d="M8.5 8.5a3.5 3.5 0 1 1 5.2 3c-1 .6-1.7 1.4-1.7 2.5"/><path d="M12 22s-2.2-1.9-2.2-3.4a2.2 2.2 0 0 1 4.4 0C14.2 20.1 12 22 12 22z"/></svg>';
      const QPIN_C = (w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}"><path d="M8.5 8.5a3.5 3.5 0 1 1 5.2 3c-1 .6-1.7 1.4-1.7 2.5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M12 22.5s-2.6-2.2-2.6-4a2.6 2.6 0 0 1 5.2 0c0 1.8-2.6 4-2.6 4z" fill="var(--stone)" stroke="var(--ink)" stroke-width="1.5"/></svg>`;
      const COMP = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6.5 14 12l-2 5.5-2-5.5z"/></svg>';
      const COMP_C = (w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}"><circle cx="12" cy="12" r="9" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.8"/><g class="alt-needle"><path d="M12 5.5 14.2 12h-4.4z" fill="var(--sign)"/><path d="M12 18.5 14.2 12h-4.4z" fill="var(--rule)"/></g><circle cx="12" cy="12" r="1.2" fill="var(--ink)"/></svg>`;
      const SIGN = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="12" rx="2"/><path d="M7 7h6M7 11h9M9 15v6M15 15v6"/></svg>';
      const SIGN_C = (w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}"><path d="M9 15v6.5M15 15v6.5" stroke="var(--ink)" stroke-width="1.8"/><rect x="2.5" y="2.5" width="19" height="12.5" rx="2" fill="var(--sign)" stroke="var(--ink)" stroke-width="1.5"/><path d="M6.5 7h6M6.5 10.8h9" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`;
      const opt = (name, chosen, mono, colour24, colour64, btn, why, cost) => `<div class="mark-opt ${chosen ? 'chosen' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h4>${name}</h4>${chosen ? '<span class="badge b-full">Used on every screen</span>' : '<span class="badge b-plain">To compare</span>'}</div>
        <div class="sizes">
          <span class="lab"><span class="mono">${mono}</span>In a line</span>
          <span class="lab">${colour24}24 px</span>
          <span class="lab"><span class="iconbtn ${chosen ? 'ask-ico' : ''}" style="${chosen ? '' : 'background:var(--surface)'}">${btn}</span>Top bar</span>
          <span class="lab big64">${colour64}Ask page</span>
        </div>
        <p><b>Why:</b> ${why}</p><p class="hint" style="font-size:12.5px">${cost}</p></div>`;
      return `<div class="plan">
        <p class="lead">An assistant that only knows Meel’s roads should look like it belongs on the road. Each idea is drawn at the four sizes it is used: inside a line of text, at 24 pixels, in the phone’s top bar, and large on the empty Ask page.</p>
        <div class="mark-opts">
          ${opt('A · A talking kilometre stone', true, ICON.ask, askMark(), askMark('big'), askMark(), 'Meel’s own logo is a kilometre stone (Meel is Hindi for mile). Give it a speech tail and it says “the milestone answers you”. Nobody else can use it, and it ties the assistant to the brand.', 'Motion: a glint over the yellow cap at rest; the road inside moves while it thinks.')}
          ${opt('B · A question mark ending in a pin', false, QPIN, QPIN_C(22), QPIN_C(64), QPIN_C(24), 'A question that ends in a place. Reads at once as “ask about somewhere”.', 'Weaker: question-mark icons usually mean help pages, and it doesn’t say Meel.')}
          ${opt('C · A compass that finds the way', false, COMP, COMP_C(22), COMP_C(64), COMP_C(24), 'The needle swings while it looks and settles on the answer (watch it on the right). Good motion.', 'Weaker: compasses usually mean “explore” or maps, not “ask”. No link to Meel’s look.')}
          ${opt('D · A highway signboard', false, SIGN, SIGN_C(22), SIGN_C(64), SIGN_C(24), 'The green signboard is the other half of Meel’s look. A sign is literally “information on the road”.', 'Weaker: at 22 pixels it is a green rectangle, and it looks like Meel’s route pages, not something to tap.')}
        </div>
        <h3>Thinking, side by side</h3>
        <div class="cols">
          <div class="card"><h4>A at rest</h4><div style="display:flex;gap:16px;align-items:center">${askMark('big')}<p>White stone, yellow cap, a still road. A glint crosses the cap every five seconds.</p></div></div>
          <div class="card"><h4>A while thinking</h4><div style="display:flex;gap:16px;align-items:center">${askMark('big think')}<p>The road runs, the glint comes faster, the stone bobs. As if it is riding to the answer.</p></div></div>
        </div>
      </div>`;
    },
    notes: [
      ['Choosing', ['A is drawn into every screen. Pick another and it replaces A everywhere; the motion rules stay the same.', 'Mark A in one line (the left-most size) is used inside text, on the search suggestion and on starter questions; the colour version everywhere it stands alone.']],
      ['Rules for the mark', ['Only ever stands for Ask Meel. Meel’s own logo stays the plain stone with M, so the two are told apart by the speech tail.', 'Colours are the site’s own: the stone white, the cap yellow, the outline ink. It follows dark mode with the rest of the site.']],
    ],
  },
];
