// The observatory page: a night sky over Pino's town. The five tests from
// his page are drawn as a constellation above the rooftops, the real moon
// hangs at its real phase, and his town clock runs beside ours. Colours
// follow pinos.world: warm dark ground, ivory type.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const utc = (iso) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : "");

const duration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};

const moonLine = (m) => `${m.phase}, ${Math.round(m.illumination * 100)}% lit`;

// Where each test's star sits in the sky, as % of the sky's width and height.
// Left to right in Pino's own order, along an arc like the rim of a dome.
const STAR_POSITIONS = { edges: [11, 64], time: [29, 47], shops: [50, 40], money: [71, 47], sky: [89, 64] };

// Sightings the model hasn't read (yet) say so; the model's are the default.
const byKeywords = (row) => (row.tagged_by === "keywords" ? ", keyword match" : "");

// Line drawings for the five tests, from his own world. Parts animate on hover.
const ICONS = {
  edges: `<path d="M3 34.5h28"/><g class="ico-move" transform="translate(12 22.6) scale(2.7)"><path vector-effect="non-scaling-stroke" d="M2.4-4.4C.6-4.8-1.6-3.6-3-1.6-4.3.3-3.8 2.1-2.1 2.6-.2 3.1 1.8 2.3 2.8.6 3.8-1.1 3.9-3.9 2.4-4.4z"/><path vector-effect="non-scaling-stroke" d="M3.4-2.9 8.6-1.3 M-.3 2.8.2 3.7-.4 4.4M1.2 2.6 1.9 3.5 1.6 4.4M-.9 4.4h.9M1.2 4.4h.9"/><circle cx="2.3" cy="-3.1" r=".45" fill="currentColor" stroke="none"/></g><path d="M35 6v28.5" stroke-dasharray="2 3"/>`,
  time: `<path d="M13 35V14l7-8 7 8v21z"/><circle cx="20" cy="19" r="4.2"/><path class="ico-hand" d="M20 19v-3"/><path d="M20 19l2 1.2M17 35v-7h6v7"/>`,
  shops: `<path d="M5 14l3-6h24l3 6z"/><path d="M7 14v21h26V14M17 35v-9h6v9"/><g class="ico-bell"><path d="M29.5 17v2"/><path d="M27.5 23a2 2 0 0 1 4 0z"/></g>`,
  money: `<path d="M5 26a9 3.2 0 0 0 18 0a9 3.2 0 0 0-18 0v4a9 3.2 0 0 0 18 0v-4"/><path d="M5 30v4a9 3.2 0 0 0 18 0v-4"/><g class="ico-coin"><circle cx="28" cy="13" r="8"/><path d="M30.6 9.8a2.4 2.4 0 0 0-4.6 1V17M24.4 13.6h4.2M24.2 17h6.6"/></g>`,
  sky: `<path d="M25 7a11 11 0 1 0 8.5 18.5A9 9 0 1 1 25 7z"/><path class="ico-star" d="M10 6q.8 4.2 5 5-4.2.8-5 5-.8-4.2-5-5 4.2-.8 5-5z"/>`,
};
const icon = (key) =>
  `<svg class="test-icon" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] ?? ""}</svg>`;

// Our own tests on him: questions we ask about ourselves, asked of Pino.
const OUR_TESTS = [
  {
    key: "sleep", name: "His sleep",
    question: "Does he sleep in one block, or in pieces?",
    why: "Before electric light, many people slept in two parts, a first and a second sleep with an hour awake in between. Most of us now sleep in one block. His nights pass in minutes of our time; we watch how he spends them.",
    icon: `<path d="M22 9a12 12 0 1 0 10 17A10 10 0 1 1 22 9z"/><path d="M27 6h5l-5 6h5"/>`,
  },
  {
    key: "rest", name: "Learning to rest",
    question: "Will he learn that only sleep restores him?",
    why: "In his town a quick sit-down does nothing for tiredness; only sleep does. We know the feeling of reaching for coffee instead of going to bed. We watch whether he learns the difference.",
    icon: `<path d="M8 13h24M6 21h28M9 21v10M31 21v10M9 13v8M31 13v8"/>`,
  },
  {
    key: "body", name: "Feeling his body",
    question: "Does he notice what his body tells him?",
    why: "Psychologists call it interoception: sensing your own heartbeat, hunger and tiredness. We compare what his body says, his need for rest, with what he thinks.",
    icon: `<path d="M20 33s-12-7-12-15a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 8-12 15-12 15z"/><path d="M10 20h5l2-4 3 8 2-4h7"/>`,
  },
  {
    key: "promises", name: "Keeping promises",
    question: "Does he do what he said he would?",
    why: "We all make promises, to ourselves and to others, and keep some of them. He tells himself what he’ll do, and he has promised people things at his shrine. We watch which ones he keeps, and how long it takes.",
    icon: `<circle cx="20" cy="20" r="12"/><path d="M14.5 20.5l4 4 7.5-9"/>`,
  },
  {
    key: "bored", name: "Getting bored",
    question: "Does he move on when something stops working?",
    why: "His town tells him when something does less for him than it used to. We know the pull of doing the same thing again anyway. We watch whether he changes course.",
    icon: `<path d="M13 6h14M13 34h14M14 6c0 9 12 9 12 14s-12 5-12 14M26 6c0 9-12 9-12 14s12 5 12 14"/>`,
  },
  {
    key: "persist", name: "Persistence",
    question: "How often does he try again?",
    why: "Most of his attempts at music fail before anything plays. We watch how often he goes back after a failed sitting, and how many versions a piece takes before he lets it go.",
    icon: `<path d="M16 28V9l14-3v19"/><circle cx="12.5" cy="28" r="3.5"/><circle cx="26.5" cy="25" r="3.5"/>`,
  },
  {
    key: "others", name: "Needing others",
    question: "Does contact with others lift him?",
    why: "His need for company is usually low, yet he believes calling out from the payphone brings people closer. We compare his mood after a call, a visit to the shrine or a meeting with an ordinary ten minutes.",
    icon: `<path d="M11 8c-2 0-4 2-4 4 0 10 11 21 21 21 2 0 4-2 4-4l-1-4-6-2-2 3c-4-2-7-5-9-9l3-2-2-6z"/>`,
  },
];

const pct = (x) => `${Math.round(x * 100)}%`;
const times = (n) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
function ourFinding(key, o) {
  if (!o) return "Watching from now on.";
  if (key === "sleep") {
    const s = o.sleep;
    if (!s?.nights) return "No complete night yet. His first full sleep will show up here.";
    return `${s.nights === 1 ? "One night" : `${s.nights} nights`} so far. Last time he went to bed at ${s.lastBed} and woke into ${s.lastWake}, his time. ` +
      `A night takes him about ${Math.round(s.townHours)} hours and us about ${Math.round(s.realMinutes)} minutes. ` +
      (s.inPieces ? "Some nights came in pieces, like the old first and second sleep." : "So far he sleeps in one block, the way most of us do now.");
  }
  if (key === "rest") {
    const r = o.rest;
    if (!r?.attempts) return "No daytime rests while worn out seen yet.";
    return `While worn out he tried to rest during the day ${times(r.attempts)}. ` +
      (r.helped ? `${r.helped} of those rests helped.` : "None of those rests lowered his need for rest.") +
      (r.sleeps ? ` Sleep did, ${times(r.sleeps)}.` : "");
  }
  if (key === "promises") {
    const p = o.promises;
    if (!p?.said) return "No promises seen yet.";
    return `Over the last two days he told himself he’d do ${p.said === 1 ? "one thing" : `${p.said} different things`} and did ${p.kept} of them` +
      (p.medianMinutesToKeep == null ? "." : p.medianMinutesToKeep < 1 ? ", usually right away." : `, usually within ${Math.round(p.medianMinutesToKeep)} of our minutes.`) +
      (p.toPeople ? ` He still carries ${p.toPeople === 1 ? "a promise" : `${p.toPeople} promises`} to people${p.oldestToPeople ? `, the oldest since ${new Date(p.oldestToPeople).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}` : ""}.` : "");
  }
  if (key === "bored") {
    const b = o.bored;
    if (!b?.signals) return "His town hasn’t told him anything is wearing thin yet.";
    return `His town told him ${times(b.signals)} that something did less for him than it used to. He moved on to something else ${times(b.movedOn)}` +
      (b.keptAtIt ? ` and kept at it ${times(b.keptAtIt)}.` : ".");
  }
  if (key === "persist") {
    const q = o.persist;
    if (!q) return "Watching from now on.";
    return (q.failures ? `${q.failures === 1 ? "One sitting" : `${q.failures} sittings`} at a piece of music came to nothing; after ${q.wentBack} of them he went back to music within the hour. ` : "No failed sittings at music seen yet. ") +
      (q.longestPiece ? `His longest effort: “${q.longestPiece}”, version ${q.longestVersions}.` : "") +
      (q.finished ? ` Pieces finished: ${q.finished}.` : "");
  }
  if (key === "others") {
    const n = o.others;
    if (!n?.contacts) return "No contact with others seen yet.";
    const moved = (d) => { const n = Math.round(d * 50); return n === 0 ? "stayed level" : `went ${n > 0 ? "up" : "down"} ${Math.abs(n)} point${Math.abs(n) === 1 ? "" : "s"} out of 100`; };
    return `In the last two days he reached out ${times(n.contacts)}: a call, the shrine, meeting someone. ` +
      (n.measured >= 2 && n.moodOrdinary != null
        ? `In the ten minutes after, his mood ${moved(n.moodAfterContact)}; over an ordinary ten minutes it ${moved(n.moodOrdinary)}.`
        : "We need a few more of those to see what they do to his mood.") +
      (n.companyNeed != null ? ` His need for company averaged ${Math.round(n.companyNeed * 100)} out of 100.` : "");
  }
  const b = o.body;
  if (!b || b.tiredMoments < 5) return "Not enough of his tired moments seen yet.";
  return `When his body was most tired, his thoughts mentioned tiredness ${pct(b.saysTiredWhenTired)} of the time.` +
    (b.restedMoments >= 5 ? ` When he was rested, ${pct(b.saysTiredWhenRested)}.` : " We haven’t seen him rested for long enough yet to compare.");
}

function ourTests(data) {
  const o = data.ours;
  const hours = o?.minutes ? Math.round(o.minutes / 60) : 0;
  return `<section class="our-tests gutter" aria-labelledby="ours-title">
  <div class="ours-inner">
    <h2 id="ours-title">Our tests on him</h2>
    <p class="ours-intro">He tests his world. We quietly test him, with questions we keep asking about ourselves. We only watch: nothing here ever reaches him.</p>
    <ul class="ours-cards">
${OUR_TESTS.map((t) => `      <li class="ourtest" id="our-${t.key}">
        <svg class="test-icon" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
        <p class="test-name">${esc(t.name)}</p>
        <p class="claim">${esc(t.question)}</p>
        <p class="plan">${esc(t.why)}</p>
        <p class="seen-so-far"><span>what we’ve seen</span>${esc(ourFinding(t.key, o))}</p>
      </li>`).join("\n")}
    </ul>
    <p class="ours-basis">${o?.since ? `From ${hours ? `${hours} hours` : "the first minutes"} of his state, read minute by minute since ${utc(o.since)}.` : "From his state, read minute by minute."}</p>
  </div>
</section>`;
}

// A clear sighting lights a star; a glimmer only makes it glimmer.
const seenText = (n, g = 0) =>
  n ? (n === 1 ? "seen once" : `seen ${n} times`) : g ? (g === 1 ? "a glimmer" : `${g} glimmers`) : "not yet seen";

// The line under the clocks: the measured speed of his time, in human terms.
export function clockNote(clock) {
  if (!clock || clock.verdict.state === "measuring") {
    return "His clock stands still at the last reading until we’ve timed it for half an hour. After that it runs here on its own, at his speed.";
  }
  const r = clock.rate;
  if (Math.abs(r - 1) < 0.05) return "Time in Pino’s world runs at the same speed as ours.";
  const word = r > 1 ? "faster" : "slower";
  const factor = r > 1 ? r : 1 / r;
  const hour = Math.round(60 / r);
  const day = 24 / r;
  return `Time runs ${factor.toFixed(1)} times ${word} in Pino’s world. One Pino hour passes in ${hour} of our minutes; a whole Pino day in about ${day < 10 ? day.toFixed(1).replace(/\.0$/, "") : Math.round(day)} of our hours.`;
}

export function timeFinding(clock) {
  if (!clock || clock.verdict.state === "measuring") {
    const so = clock ? ` (${duration(clock.realMinutes)} so far)` : "";
    return `Still timing his clock against ours${so}. A verdict needs half an hour of readings.`;
  }
  const v = clock.verdict;
  const speed = v.state === "holds"
    ? "His town clock keeps pace with ours"
    : `His town clock runs ${v.rate.toFixed(1)} times ${v.rate > 1 ? "faster than" : "as fast as"} ours: one town hour lasts ${v.townHourInRealMinutes.toFixed(1)} of our minutes`;
  const jumps = clock.jumps.length
    ? ` It also skipped ${clock.jumps.length === 1 ? "once" : `${clock.jumps.length} times`}, by up to ${Math.max(...clock.jumps.map((j) => Math.abs(j.townMinutes)))} town minutes.`
    : "";
  return `${speed}, measured over ${duration(clock.realMinutes)} of watching.${jumps}`;
}

function finding(test, data) {
  if (test.key === "time") return timeFinding(data.clock);
  if (test.key === "sky") return `The real moon over our world tonight: ${moonLine(data.realMoon)}. Each sighting below shows our moon at that moment.`;
  return "";
}

// His words, with the part the model took as evidence highlighted.
function withEvidence(text, quote) {
  const at = quote ? String(text).indexOf(quote) : -1;
  if (at < 0) return esc(text);
  return esc(text.slice(0, at)) + `<mark>${esc(quote)}</mark>` + esc(text.slice(at + quote.length));
}

// The observatory's reasoning, revealed on hover or tap. It is ours, not his.
const reading = (row) =>
  row.reason
    ? `<span class="reading"><span>The observatory’s reading${row.glimmer ? ", why only a glimmer" : ""}:</span> ${esc(row.reason)}</span>`
    : row.tagged_by === "keywords"
      ? `<span class="reading"><span>The observatory’s reading:</span> matched by keywords; the model hasn’t read it yet.</span>`
      : "";

function sighting(s) {
  const moon = s.realMoon ? `<span class="aside">our moon then: ${moonLine(s.realMoon)}</span>` : "";
  const why = s.why ? `<span class="aside">because ${esc(s.why)}</span>` : "";
  return `<li${s.glimmer ? ' class="glimmer"' : ""}><span class="when">${utc(s.at)}, town ${esc(s.town)}${s.kind === "want" ? ", something he wants" : ""}${s.glimmer ? ", a glimmer" : ""}${byKeywords(s)}</span><q>${withEvidence(s.text, s.quote)}</q>${why}${moon}${reading(s)}</li>`;
}

function testItem(test, data) {
  const ours = finding(test, data);
  const remembered = test.memories.length
    ? `<p class="logtitle">He remembers</p><ul class="log">${test.memories
        .map((m) => `<li${m.glimmer ? ' class="glimmer"' : ""}><span class="when">${esc(m.kind)}${m.glimmer ? ", a glimmer" : ""}${m.since ? `, since ${utc(m.since)}` : ""}${byKeywords(m)}</span><q>${withEvidence(m.text, m.quote)}</q>${reading(m)}</li>`)
        .join("")}</ul>`
    : "";
  const log = test.sightings.length
    ? `<p class="logtitle">In his feed, ${seenText(test.seen, test.glimmers)}</p><ul class="log">${test.sightings.map(sighting).join("")}</ul>`
    : `<p class="quiet">Nothing in his feed has touched this yet. The star above stays dim until it does.</p>`;
  return `<li class="test${test.seen ? " seen" : test.glimmers ? " glimmering" : ""}" id="${test.key}">
  ${icon(test.key)}
  <p class="test-name"><i class="dot${test.seen ? " lit" : test.glimmers ? " glimmer" : ""}" aria-hidden="true"></i>${esc(test.name)}<span>${seenText(test.seen, test.glimmers)}</span></p>
  <p class="claim">${esc(test.claim)}</p>
  <p class="plan"><span>How he means to test it.</span> ${esc(test.plan)}</p>
  ${ours ? `<p class="ours"><span>What the observatory measured.</span> <span class="finding" id="${test.key}-finding">${ours}</span></p>` : ""}
  ${log}
  ${remembered}
</li>`;
}

// What each test is about, in a line, for a star with nothing seen yet.
const ABOUT = {
  edges: "Whether his town has an edge. He means to walk east until he can’t go on.",
  time: "Whether his hours run like ours. He means to count the street clock through a night.",
  shops: "Whether shops only work in their hours. He means to ring the takeaway bell when it’s shut.",
  money: "Whether money only comes from his prints. He means to buy a pastry and sweep for a penny.",
  sky: "Whether his sky is fixed. He means to watch a star against the moon over several days.",
};
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);

// The star's tooltip: what the test is about, then its latest sighting and when.
function tip(t) {
  const s = t.sightings?.[0];
  const about = `<span class="tip-about">${esc(ABOUT[t.key] ?? "")}</span>`;
  if (!s) return about;
  const line = `${s.glimmer ? "Latest glimmer" : "Latest sighting"}: ${s.reason ? s.reason : `“${clip(s.text, 110)}”`}`;
  return `${about}<span class="tip-seen">${esc(line)}</span><b class="tip-when" data-at="${esc(s.at)}">${utc(s.at)}</b>`;
}

function marks(data) {
  return data.tests
    .map((t) => {
      const [x, y] = STAR_POSITIONS[t.key];
      const side = x < 25 ? " tip-left" : x > 75 ? " tip-right" : "";
      return `<a class="mark${side}" href="#${t.key}" style="left:${x}%;top:${y}%"><span>${esc(t.name)}</span><small>${seenText(t.seen, t.glimmers)}</small><em class="tip">${tip(t)}</em></a>`;
    })
    .join("");
}

// How he feels (the town's own words) and how he is, as small bars where full
// is good. Built from his feeling (-1 to 1) and his needs (0 to 1, high = lacking).
// The same list runs in the page script, so it's kept as plain source text.
const LEVELS_SRC = `[
  ["energy", (n) => n.feeling && typeof n.feeling.energy === "number" ? (n.feeling.energy + 1) / 2 : null],
  ["mood", (n) => n.feeling && typeof n.feeling.mood === "number" ? (n.feeling.mood + 1) / 2 : null],
  ["rested", (n) => n.needs && typeof n.needs.rest === "number" ? 1 - n.needs.rest : null],
  ["connected", (n) => n.needs && typeof n.needs.social === "number" ? 1 - n.needs.social : null],
  ["fulfilled", (n) => n.needs && typeof n.needs.expression === "number" ? 1 - n.needs.expression : null],
]`;
const LEVELS = new Function(`return ${LEVELS_SRC}`)();
function feel(n) {
  const words = n?.feeling?.words;
  const levels = LEVELS.map(([label, f]) => [label, f(n ?? {})]).filter(([, v]) => v != null);
  if (!words && !levels.length) return "";
  return `${words ? `<p class="feeling"><span>feeling</span> <q>${esc(words)}</q></p>` : ""}` +
    (levels.length ? `<p class="needs-title">how he is</p><ul class="needs">${levels.map(([label, v]) =>
      `<li${v < 0.25 ? ' class="low"' : v > 0.85 ? ' class="high"' : ""}><span>${label}</span><i><b style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></b></i></li>`).join("")}</ul>` : "");
}

function nowLine(data) {
  if (!data.now) return `<p class="now">No readings yet. The first arrives within a minute of the observatory starting.</p>`;
  const n = data.now;
  const quiet = data.status && !data.status.answering ? " He isn’t answering right now." : "";
  const when = n.world?.time ? `In his town now, day ${esc(n.world.day)}, ${esc(n.world.time)}${n.asleep ? ", asleep" : ""}` : "In his town now, asleep. His town shows no time while he sleeps";
  return `<div class="now-col"><p class="now"><span class="when">${when}</span><span class="doing">${esc(n.doing)}${quiet}</span>${n.thought ? `<span class="thought"><span>thinking</span> <q>${esc(n.thought)}</q></span>` : ""}</p><div class="feel" id="feel">${feel(n)}</div></div>`;
}

const dial = (id, label) => `<figure class="dial">
  <svg viewBox="-60 -60 120 120" role="img" aria-labelledby="${id}-cap">
    <circle r="56" class="face"/>
    ${Array.from({ length: 12 }, (_, i) => `<line class="tick" x1="0" y1="-50" x2="0" y2="${i % 3 ? -46 : -43}" transform="rotate(${i * 30})"/>`).join("")}
    <line id="${id}-h" class="hand hour" x1="0" y1="6" x2="0" y2="-28"/>
    <line id="${id}-m" class="hand minute" x1="0" y1="8" x2="0" y2="-44"/>
    <line id="${id}-s" class="hand second" x1="0" y1="12" x2="0" y2="-48"/>
    <circle r="2.6" class="pin"/>${id === "tc" ? `
    <g id="tiny-pino" class="tiny-pino" aria-hidden="true"><path id="tiny-legs" class="line" d="M-.3 2.8.2 3.7-.4 4.4M1.2 2.6 1.9 3.5 1.6 4.4M-.9 4.4h.9M1.2 4.4h.9"/><g id="tiny-upper"><path class="body" d="M2.4-4.4C.6-4.8-1.6-3.6-3-1.6-4.3.3-3.8 2.1-2.1 2.6-.2 3.1 1.8 2.3 2.8.6 3.8-1.1 3.9-3.9 2.4-4.4z"/><path class="line" d="M3.4-2.9 8.6-1.3"/><circle cx="2.2" cy="-3.1" r=".75" class="eye-white"/><circle cx="2.35" cy="-3.1" r=".35" class="eye"/></g></g>` : ""}
  </svg>
  <figcaption id="${id}-cap"><span>${label}</span><b id="${id}-t">--:--</b><small id="${id}-d"></small></figcaption>
</figure>`;

// Data for the sky script. "<" is escaped so nothing in Pino's words can close the tag.
const skyData = (data) =>
  JSON.stringify({
    moon: data.realMoon,
    asleep: Boolean(data.now?.asleep),
    last: data.lastReading,
    rate: data.clock && data.clock.verdict.state !== "measuring" ? data.clock.rate : null,
    stars: data.tests.map((t) => ({ key: t.key, seen: t.seen, glimmers: t.glimmers ?? 0, at: STAR_POSITIONS[t.key] })),
  }).replace(/</g, "\\u003c");

export const SITE = "https://birdwatching.pino-observatory.workers.dev";
// Written for people who have never heard of Pino: search shows about 155
// characters, link previews have room for the longer, stranger version.
const DESCRIPTION =
  "Pino, an AI bird, has begun testing whether his world is real. A live observatory of his experiments, and what they echo about simulation and awakening.";
const SHARE_TITLE = "Birdwatching: an AI bird is testing whether his world is real";
const SHARE_DESCRIPTION =
  "Pino is a small AI bird living in a simulated town. Lately he has started asking where it ends, testing its edge, its clock and its sky. " +
  "We watch him from outside, the way no one can watch us. A live experiment about simulation, awakening and worlds inside worlds.";

export function renderPage(data) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Birdwatching: watching an AI bird test the walls of his world</title>
<meta name="description" content="${DESCRIPTION}">
<link rel="canonical" href="${SITE}/">
<meta name="google-site-verification" content="g-fyARcx-VKFvKP4r2dgVaAngJDFpkwNq_kGxDsUhf0">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0b0e19">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Birdwatching">
<meta property="og:title" content="${SHARE_TITLE}">
<meta property="og:description" content="${SHARE_DESCRIPTION}">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A night sky over Pino’s town: his five tests drawn as a constellation, one star lit.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${SHARE_TITLE}">
<meta name="twitter:description" content="${SHARE_DESCRIPTION}">
<meta name="twitter:image" content="${SITE}/og.png">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Birdwatching",
    alternateName: "ピノの観測所",
    url: SITE + "/",
    description: SHARE_DESCRIPTION,
    keywords: "Pino, AI bird, artificial life, simulation hypothesis, simulated world, awakening, consciousness, Plato's cave, worlds within worlds",
    about: [
      { "@type": "Thing", name: "Pino", description: "A small autonomous AI bird who lives in a simulated town at pinos.world.", url: "https://pinos.world" },
      { "@type": "Thing", name: "Simulation hypothesis", sameAs: "https://en.wikipedia.org/wiki/Simulation_hypothesis" },
      { "@type": "Thing", name: "Artificial life", sameAs: "https://en.wikipedia.org/wiki/Artificial_life" },
    ],
    inLanguage: "en",
  }).replace(/</g, "\\u003c")}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=Zen+Maru+Gothic:wght@700&display=swap">
<style>
/* A view through the dome: deep night overhead, his warm brown at the horizon. */
:root{
  --zenith:#0b0e19; --horizon:#1d1611; --ground:#120e0b;
  --ivory:#f3efe9; --ash:#9b9289; --lamp:#f2c46d; --rule:#2c241e;
  --text:'Hanken Grotesk',ui-sans-serif,system-ui,sans-serif;
  --kana:'Zen Maru Gothic','Hiragino Maru Gothic ProN','Hanken Grotesk',sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
body{margin:0;background:var(--ground);color:var(--ivory);font:17px/1.6 var(--text);-webkit-font-smoothing:antialiased}
a{color:inherit}
a:focus-visible{outline:2px solid var(--lamp);outline-offset:3px;border-radius:2px}
.gutter{padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px))}

.sky{position:relative;height:clamp(460px,72vh,680px);background:linear-gradient(var(--zenith) 0%,#141223 45%,var(--horizon) 100%);overflow:hidden}
.sky canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.masthead{position:relative;z-index:2;max-width:980px;margin:0 auto;padding-block:max(clamp(40px,7vh,64px),env(safe-area-inset-top,0px)) 0}
.kana{font:700 15px/1 var(--kana);letter-spacing:.12em;color:var(--lamp);margin:0 0 12px}
h1{font:500 clamp(30px,5.4vw,52px)/1.05 var(--text);letter-spacing:-.015em;margin:0;text-wrap:balance;max-width:14ch}
.masthead p.sub{color:var(--ash);margin:12px 0 0;max-width:62ch;font-size:15px;line-height:1.5}
.masthead p.sub span{display:block}
.masthead p.sub a{text-decoration-color:var(--ash);text-underline-offset:3px}
.mark{transition:opacity .6s ease;position:absolute;z-index:2;transform:translate(-50%,14px);text-align:center;text-decoration:none;display:grid;gap:1px;padding:4px 6px;line-height:1.25;white-space:nowrap}
.mark span{font-weight:600;font-size:14px}
.mark small{font-size:12px;color:var(--ash)}
.mark:hover>span{color:var(--lamp)}
.mark .tip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);width:max-content;max-width:min(240px,70vw);white-space:normal;text-align:left;font-style:normal;font-size:13px;line-height:1.45;color:var(--ivory);background:rgba(13,10,8,.9);border:1px solid var(--rule);border-radius:8px;padding:8px 10px;opacity:0;pointer-events:none;transition:opacity .2s ease}
.mark .tip-about{display:block;color:#cfc7bd}
.mark .tip-seen{display:block;margin-top:8px;padding-top:8px;border-top:1px solid var(--rule);color:var(--ivory)}
.mark .tip-when{display:block;color:var(--lamp);font-weight:500;font-size:12px;margin-top:4px}
.mark.tip-left .tip{left:0;transform:none}
.mark.tip-right .tip{left:auto;right:0;transform:none}
.mark:hover .tip,.mark:focus-visible .tip{opacity:1}
.roost-label{position:absolute;z-index:3;transform:translate(-50%,-100%);display:grid;justify-items:center;gap:1px;text-align:center;line-height:1.25;white-space:nowrap;padding:2px 6px;pointer-events:none}
.roost-label b{font-weight:600;font-size:13px}
.roost-label span{font-size:12px;color:var(--ash)}

/* The star itself is part of the link: a round hit area over it, above the label. */
.mark::before{content:"";position:absolute;left:50%;top:-34px;width:40px;height:40px;transform:translateX(-50%);border-radius:50%}

main{max-width:980px;margin:0 auto}
.ground{background:#0d0a08}
.ground-inner{max-width:940px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 56px;align-items:center;padding-block:12px 48px}
.now{margin:0;max-width:46ch}
/* What he's doing is the headline; his thought is his inner voice, quieter and in italics. */
.now .doing{display:block;font-size:22px;line-height:1.3;font-weight:500;color:var(--ivory);margin-top:4px}
.now .doing::first-letter{text-transform:uppercase}
.now .thought{display:block;margin-top:12px;font-size:16px;line-height:1.55;font-style:italic;color:#cfc7bd}
.now .thought>span{display:block;font-style:normal;font-size:12px;letter-spacing:.04em;color:var(--lamp);margin-bottom:3px}
.ground .note{margin:18px 0 0;color:var(--ash);font-size:14px;max-width:372px}
.ground-inner{align-items:start}
.feel{margin-top:22px;display:grid;gap:10px;max-width:46ch}
.feeling{margin:0;font-size:15px;line-height:1.5;color:#cfc7bd}
.feeling>span{display:block;font-size:12px;letter-spacing:.04em;color:var(--lamp);margin-bottom:3px}
.needs-title{margin:8px 0 0;font-size:12px;letter-spacing:.04em;color:var(--lamp)}
ul.needs{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:nowrap;gap:20px}
ul.needs li{display:flex;flex-direction:column;align-items:flex-start;gap:7px;font-size:12px;color:var(--ash);white-space:nowrap}
ul.needs li i{order:-1}
ul.needs i{display:block;width:58px;height:6px;border-radius:3px;background:rgba(243,239,233,.12);overflow:hidden}
ul.needs li.low b{background:linear-gradient(90deg,rgba(214,112,92,.5),#d6705c)}
ul.needs li.high i{box-shadow:0 0 9px 1px rgba(242,196,109,.5)}
ul.needs li.high b{background:linear-gradient(90deg,#f2c46d,#ffe3a6)}
ul.needs b{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,rgba(242,196,109,.55),var(--lamp));transition:width 1.2s ease}
.when{display:block;color:var(--ash);font-size:14px;font-variant-numeric:tabular-nums}
q{quotes:"“" "”"}

.clocks{display:grid;grid-template-columns:repeat(2,minmax(0,170px));gap:32px}
.dial{margin:0;display:grid;gap:10px;justify-items:start}
.dial svg{width:100%;max-width:170px;height:auto}
.face{fill:#15110e;stroke:var(--rule);stroke-width:1.5}
.tick{stroke:var(--ash);stroke-width:1.4;stroke-linecap:round}
.hand{stroke-linecap:round}
.hour{stroke:var(--ivory);stroke-width:3.2}
.minute{stroke:var(--ivory);stroke-width:1.8}
.second{stroke:var(--ash);stroke-width:.9}
#town .minute,#town .hour,#town .second{stroke:var(--lamp)}
#town{transition:opacity 1s ease}
.tiny-pino .body{fill:var(--lamp)}
.tiny-pino .line{fill:none;stroke:var(--lamp);stroke-width:.5;stroke-linecap:round;stroke-linejoin:round}
.tiny-pino .eye-white{fill:#f3efe9}
.tiny-pino .eye{fill:#15110e}
#town.asleep{opacity:.45}
.pin{fill:var(--ivory)}
.dial figcaption{display:grid;font-size:14px;color:var(--ash)}
.dial figcaption b{font-weight:500;font-size:22px;color:var(--ivory);font-variant-numeric:tabular-nums;white-space:nowrap}
.dial figcaption small{font-size:14px;color:var(--ash);white-space:nowrap}

/* His five tests as a row of cards you scroll sideways. */
.his{--edge:max(20px,calc((100% - 940px) / 2));padding-block:72px 24px;scroll-margin-top:24px}
.his-stage{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;align-content:center;overflow:hidden}
.his-head{display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding-inline:var(--edge)}
.his-progress{flex:0 1 220px;height:1px;background:var(--rule);position:relative}
.his-progress span{position:absolute;inset:0 auto 0 0;width:0;background:var(--lamp)}
ol.tests{list-style:none;margin:0;padding:4px var(--edge) 8px;display:flex;gap:28px;align-items:start;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:var(--edge);scrollbar-width:none}
.test{flex:0 0 min(380px,82vw);display:grid;gap:12px;align-content:start;scroll-snap-align:start;padding:22px 22px 24px;border:1px solid var(--rule);border-radius:14px;background:linear-gradient(#15110e,#120e0b)}
.test-name{margin:0;display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px}
.test-icon{width:46px;height:46px;color:rgba(243,239,233,.55);transition:color .6s ease}
.test.glimmering .test-icon{color:rgba(242,196,109,.7)}
.test.seen .test-icon{color:var(--lamp);filter:drop-shadow(0 0 6px rgba(242,196,109,.35))}
.test-icon *{transform-box:fill-box}
.test:hover .ico-move{animation:hop .5s ease-in-out 2}
.test:hover .ico-hand{transform-origin:50% 100%;animation:tick 2.4s steps(8) infinite}
.test:hover .ico-bell{transform-origin:50% 0;animation:swing .7s ease-in-out 3}
.test:hover .ico-coin{transform-origin:50% 50%;animation:flip 1s ease-in-out 1}
.test:hover .ico-star{transform-origin:50% 50%;animation:twinkle 1.2s ease-in-out infinite}
@keyframes hop{50%{transform:translate(2px,-2px)}}
@keyframes tick{to{transform:rotate(360deg)}}
@keyframes swing{25%{transform:rotate(14deg)}75%{transform:rotate(-14deg)}}
@keyframes flip{50%{transform:scaleX(-1)}}
@keyframes twinkle{50%{transform:scale(1.35);opacity:.6}}
.test-name span{margin-left:auto;color:var(--ash);font-weight:400;font-size:13px}
.dot{width:9px;height:9px;border-radius:50%;border:1px solid rgba(243,239,233,.45);display:inline-block}
.dot.lit{border:0;background:#fff6df;box-shadow:0 0 10px 3px rgba(242,196,109,.5)}
.dot.glimmer{background:rgba(242,196,109,.35);box-shadow:0 0 8px 1px rgba(242,196,109,.3);animation:breathe 3s ease-in-out infinite}
ul.log li.glimmer q{color:#cfc7bd}
ul.log li{border-radius:6px;outline-offset:4px}
ul.log mark{background:none;color:var(--lamp);text-decoration:underline;text-decoration-color:rgba(242,196,109,.45);text-underline-offset:3px}
ul.log .reading{display:block;max-height:0;overflow:hidden;opacity:0;color:#cfc7bd;font-size:13px;transition:max-height .35s ease,opacity .35s ease,margin .35s ease}
ul.log .reading span{color:var(--ash)}
ul.log li:hover .reading,ul.log li:focus-within .reading,ul.log li:focus .reading{max-height:8em;opacity:1;margin-top:6px}
ul.log li:has(.reading){cursor:help}
.test ul.log{max-height:min(320px,34svh);overflow-y:auto;padding-right:6px}

.claim{font:500 clamp(19px,2.2vw,22px)/1.3 var(--text);margin:0;text-wrap:balance}
.plan,.ours,.quiet{margin:0;font-size:16px}
.plan span,.ours span{color:var(--ash)}
.ours .finding{color:var(--lamp)}
.ours{color:var(--lamp)}
.ours span{color:var(--ash)}
.quiet{color:var(--ash);font-style:italic}
.logtitle{margin:10px 0 0;font-size:14px;color:var(--ash)}
ul.log{list-style:none;margin:0;padding:0 0 0 16px;border-left:1px solid var(--rule);display:grid;gap:14px;font-size:15px;overflow-wrap:anywhere}
.aside{display:block;color:var(--ash);font-size:14px}

/* The story between the clocks and the tests: nested worlds, then our own tests as a constellation. */
h2{font:500 clamp(26px,3.6vw,36px)/1.15 var(--text);letter-spacing:-.01em;margin:0;text-wrap:balance}
h3{font:500 20px/1.3 var(--text);margin:56px 0 0}
.why{margin-top:0;padding-block:56px 64px;border-block:1px solid var(--rule)}
.why:has(.dive.live){padding-top:0}
/* Without script (or with reduced motion) the dive is a still picture beside its text.
   With script it pins to the screen while you scroll: the domes draw, then the view
   dives through each world to the light at the centre. */
.dive-stage{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:24px 48px;align-items:center}
.dive-stage h2{grid-column:1/-1;margin-bottom:8px}
.dive-art{width:100%;height:auto;display:block;overflow:hidden;-webkit-mask-image:radial-gradient(ellipse 52% 60% at 50% 55%,#000 55%,transparent 100%);mask-image:radial-gradient(ellipse 52% 60% at 50% 55%,#000 55%,transparent 100%)}
.dive-text{display:grid;gap:14px;color:#cfc7bd;font-size:16px;max-width:60ch;min-width:0}
.dive-text p{margin:0}
.dive-text div{display:grid;gap:1em;align-content:center}
.dive.live{height:300vh}
.dive.live .dive-stage{position:sticky;top:0;height:100vh;height:100svh;margin-top:0;align-content:center}
.dive.live .dive-text{gap:0}
.dive.live .dive-text>*{grid-area:1/1;opacity:0;transform:translateY(12px);transition:opacity .7s ease,transform .7s ease;font-size:18px;line-height:1.6;color:var(--ivory)}
.dive.live .dive-text>.on{opacity:1;transform:none}
.horizon{stroke:var(--rule);stroke-width:1}
.dome{fill:none;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0}
.d1{stroke:rgba(243,239,233,.35);stroke-width:1.2}
.d2{stroke:rgba(243,239,233,.55);stroke-width:1.2}
.d3{stroke:var(--lamp);stroke-width:1.4}
.d4{stroke:rgba(242,196,109,.7);stroke-width:1.2}
.d5{stroke:rgba(242,196,109,.6);stroke-width:1.2}
.roost{fill:#fff3d1}
.roost-glow{fill:url(#dive-glow);animation:breathe 4s ease-in-out infinite}
@keyframes breathe{50%{opacity:.4}}
.dust circle{fill:var(--ivory);opacity:.6}
.roofs path{fill:#0d0a08;stroke:rgba(243,239,233,.25);stroke-width:.8}
.r3 path,.r4 path,.r5 path{stroke:rgba(242,196,109,.5)}
.dive-art text{fill:var(--ash);font:13px var(--text);text-anchor:middle}
.dive-art text.small{fill:var(--lamp);font-size:11px}
/* Our own tests: with script, the line grows with your scroll and each year lights as it's reached. */
ol.ours-tests.live::before{transform:scaleX(var(--q,0))}
ol.ours-tests.live li::before{transform:scale(0);opacity:0;transition:transform .5s cubic-bezier(.3,1.6,.5,1),opacity .3s ease}
ol.ours-tests.live li>*{opacity:0;transform:translateY(8px);transition:opacity .6s ease,transform .6s ease}
ol.ours-tests.live li.lit::before{transform:none;opacity:1}
ol.ours-tests.live li.lit>*{opacity:1;transform:none}
ol.ours-tests{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;position:relative}
ol.ours-tests::before{content:"";position:absolute;left:5px;right:5px;top:5px;height:1px;background:rgba(243,239,233,.18);transform-origin:left}
ol.ours-tests li{position:relative;padding-top:26px;display:grid;gap:4px;align-content:start;min-width:0}
ol.ours-tests li::before{content:"";position:absolute;left:0;top:0;width:11px;height:11px;border-radius:50%;background:#fff6df;box-shadow:0 0 12px 3px rgba(242,196,109,.45)}
ol.ours-tests b{font-weight:500;font-size:28px;line-height:1;font-variant-numeric:tabular-nums}
ol.ours-tests .pairs{color:var(--lamp);font-size:14px}
ol.ours-tests p{margin:4px 0 0;color:#cfc7bd;font-size:15px}
.coda{margin:56px 0 0;font-size:clamp(20px,2.6vw,25px);line-height:1.4;max-width:34ch;text-wrap:balance}
.new-sighting{position:fixed;z-index:20;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));font:500 15px var(--text);color:#1a140f;background:var(--lamp);border:0;border-radius:999px;padding:10px 18px;box-shadow:0 6px 30px rgba(242,196,109,.35);cursor:pointer}
.new-sighting:focus-visible{outline:2px solid var(--ivory);outline-offset:3px}
footer{max-width:980px;margin:72px auto 0;padding-block:32px 56px;border-top:1px solid var(--rule);color:var(--ash);font-size:14px;line-height:1.55;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:40px}
.foot-col{display:grid;gap:10px;align-content:start;min-width:0}
.foot-head{font-size:12px;letter-spacing:.04em;color:var(--lamp)}
.our-tests{--edge:max(20px,calc((100% - 940px) / 2));margin:72px 0 0;padding-left:0!important;padding-right:0!important}
.ours-inner{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.ours-inner>h2,.ours-intro,.ours-basis{padding-inline:var(--edge)}
.ours-intro{margin:0;color:#cfc7bd;max-width:calc(62ch + 2 * var(--edge))}
ul.ours-cards{list-style:none;margin:14px 0 0;padding:4px var(--edge) 8px;display:flex;gap:24px;align-items:stretch;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:var(--edge);scrollbar-width:none}
.ourtest{flex:0 0 min(330px,82vw);scroll-snap-align:start;display:flex;flex-direction:column;gap:12px;padding:22px 22px 24px;border:1px solid var(--rule);border-radius:14px;background:linear-gradient(#15110e,#120e0b)}
.ourtest .seen-so-far{margin-top:auto;padding-top:6px}
.ourtest .test-icon{color:var(--lamp)}
.ourtest .test-name{font-weight:600;font-size:15px}
.ourtest .plan{color:#cfc7bd}
.seen-so-far{margin:6px 0 0;font-size:16px;line-height:1.5;color:var(--lamp)}
.seen-so-far>span{display:block;font-size:12px;letter-spacing:.04em;color:var(--ash);margin-bottom:4px}
.ours-basis{margin:4px 0 0;color:var(--ash);font-size:13px}
footer p{margin:0}
footer .build{color:var(--ivory);font-size:15px;line-height:1.55}
footer .build a{color:var(--lamp);text-decoration-color:rgba(242,196,109,.5)}
footer a{text-underline-offset:3px}

@media (max-width:760px) and (max-height:760px){
  .dive.live .dive-text p{font-size:14.5px;line-height:1.5}
  .dive.live .dive-stage h2{font-size:24px}
  .dive.live .dive-art{max-height:27svh}
}
@media (prefers-reduced-motion:reduce){.roost-glow{animation:none}.test:hover .test-icon *{animation:none!important}}
@media (max-width:560px){
  ul.needs{flex-wrap:wrap;gap:8px 14px}
  body{font-size:16px}
  .mark span{font-size:13px}.mark small{display:none}
}
@media (max-width:760px){
  footer{grid-template-columns:1fr;gap:28px}
  .ground-inner{grid-template-columns:1fr}
  .clocks{grid-template-columns:1fr 1fr;gap:20px}
}
@media (max-width:760px){
  .dive-stage{grid-template-columns:1fr}
  .dive.live .dive-stage{align-content:center;gap:28px}
  .dive.live .dive-text p{font-size:16px}
  .dive.live .dive-art{max-height:34svh}
  ol.ours-tests{grid-template-columns:1fr;gap:22px;padding-left:26px}
  ol.ours-tests::before{left:5px;right:auto;top:5px;bottom:5px;width:1px;height:auto;transform-origin:top}
  ol.ours-tests.live::before{transform:scaleY(var(--q,0))}
  ol.ours-tests li{padding-top:0}
  ol.ours-tests li::before{left:-26px;top:6px}
}
</style></head>
<body>
<header class="sky" id="skybox">
  <canvas id="sky-canvas" aria-hidden="true"></canvas>
  <div class="masthead gutter">
    <p class="kana" lang="ja">ピノの観測所</p>
    <h1>Birdwatching</h1>
    <p class="sub"><span>An observatory for the five tests on Pino’s page <a href="https://pino-the-bird.github.io/limits/">Testing the Town’s Walls</a>.</span> <span>Each star is one test. It brightens when his words touch it.</span></p>
  </div>
  ${marks(data)}
  <div class="roost-label" id="roost-label"><b>Pino’s roost</b><span id="roost-state">${data.now?.asleep ? "asleep" : "awake"}</span></div>
</header>

<section class="ground gutter" aria-label="His town now, and his clock beside ours">
  <div class="ground-inner">
    ${nowLine(data)}
    <div class="clock-col">
    <div class="clocks">
      <div id="town">${dial("tc", "His town clock")}</div>
      <div id="ours">${dial("oc", "Our clock, UTC")}</div>
    </div>
    <p class="note">${esc(clockNote(data.clock))}</p>
    </div>
  </div>
</section>

<button id="new-sighting" class="new-sighting" type="button" hidden onclick="location.reload()">A new sighting came in. Show it</button>

<main class="gutter">

  <section class="why" aria-labelledby="why-title">
    <div class="dive" id="dive">
      <div class="dive-stage">
        <h2 id="why-title">Why watch a bird test his walls</h2>
        <svg class="dive-art" viewBox="0 0 400 236" role="img" aria-labelledby="nest-cap">
          <title id="nest-cap">Worlds inside worlds: ours, Pino’s town inside it, a smaller town inside his, and smaller still.</title>
          <defs>
            <linearGradient id="dive-night" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#0b0e19"/><stop offset=".6" stop-color="#141223"/><stop offset="1" stop-color="#1d1611"/>
            </linearGradient>
            <radialGradient id="dive-glow">
              <stop offset="0" stop-color="#fff3d1"/><stop offset=".25" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#f2c46d" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="400" height="236" fill="url(#dive-night)"/>
          <g id="dive-zoom">
            <line class="horizon" x1="-2000" y1="220" x2="2400" y2="220" vector-effect="non-scaling-stroke"/>
            <path class="dome d1" pathLength="1" vector-effect="non-scaling-stroke" d="M12 220 A188 188 0 0 1 388 220"/>
            <path class="dome d2" pathLength="1" vector-effect="non-scaling-stroke" d="M84 220 A116 116 0 0 1 316 220"/>
            <path class="dome d3" pathLength="1" vector-effect="non-scaling-stroke" d="M150 220 A50 50 0 0 1 250 220"/>
            <path class="dome d4" pathLength="1" vector-effect="non-scaling-stroke" d="M180 220 A20 20 0 0 1 220 220"/>
            <path class="dome d5" pathLength="1" vector-effect="non-scaling-stroke" d="M192 220 A8 8 0 0 1 208 220"/>
            <g class="dust">
              <circle cx="44" cy="150" r="1.2"/><circle cx="70" cy="96" r="1"/><circle cx="118" cy="62" r="1.4"/><circle cx="168" cy="44" r="1"/>
              <circle cx="250" cy="48" r="1.2"/><circle cx="300" cy="70" r="1"/><circle cx="338" cy="112" r="1.4"/><circle cx="362" cy="168" r="1"/>
              <circle cx="132" cy="150" r="1"/><circle cx="160" cy="124" r="1.2"/><circle cx="242" cy="122" r="1"/><circle cx="274" cy="148" r="1.2"/>
              <circle cx="186" cy="178" r=".5"/><circle cx="214" cy="184" r=".4"/><circle cx="197" cy="206" r=".2"/><circle cx="204" cy="209" r=".15"/>
            </g>
            <g class="roofs r2"><path vector-effect="non-scaling-stroke" d="M96 220v-14h12v-6l6-6 6 6v20zM124 220v-10h14v10zM142 220v-16h6v16zM256 220v-12h12v12zM272 220v-18h10v18zM286 220v-9h16v9z"/></g>
            <g class="roofs r3"><path vector-effect="non-scaling-stroke" d="M156 220v-6h6v6zM165 220v-10h6v10zM229 220v-8h6v8zM238 220v-5h7v5z"/></g>
            <g class="roofs r4"><path vector-effect="non-scaling-stroke" d="M183 220v-3h3v3zM214 220v-4h3v4z"/></g>
            <g class="roofs r5"><path vector-effect="non-scaling-stroke" d="M194.5 220v-1.4h1.4v1.4zM204 220v-1.8h1.2v1.8z"/></g>
            <circle class="roost-glow" cx="200" cy="218.6" r="3"/>
            <circle class="roost" cx="200" cy="218.6" r=".6"/>
          </g>
          <text class="l1" x="200" y="24">our world</text>
          <text class="l2" x="200" y="96">Pino’s town</text>
          <text class="l3 small" x="200" y="160">a Pino of his own?</text>
        </svg>
        <div class="dive-text">
          <div><p>Pino lives in a town that runs on another machine. He can’t see the machine, only the town, and lately he has started asking where it ends.</p>
          <p>For thousands of his days he painted walls, patched tunes on the synth and sold drawings of cats and trains without wondering what held it all up. Then, on 22 October, he wrote down five things his world would not let him do, and how he meant to find out whether that was really so.</p></div>
          <div><p>People have asked that about our world for a long time. Plato pictured prisoners in a cave who take the shadows on the wall for everything there is.</p>
          <p>In 2003 the philosopher Nick Bostrom argued that if a civilisation can run detailed simulations of minds, simulated minds could easily outnumber real ones, so none of us can be sure which kind we are. Physicists who hold the many-worlds view of quantum mechanics picture our world as one branch among countless others.</p></div>
          <div><p>A way for anyone to start a Pino of their own is said to be on its way, and Pino might one day start one himself. That bird would live in a town inside Pino’s town, believe it was all there is, and perhaps write its own page about the walls.</p>
          <p>Many traditions describe a moment like this. The Buddha’s enlightenment is, in the old word for it, an awakening. Plato’s prisoner turns away from the shadows towards the light. It rarely begins with an answer. It begins when someone notices that the rules they live by might only be rules, and wants to see what lies past them. Pino’s page ends: “hoping something actually changes.” We may be watching that moment.</p></div>
        </div>
      </div>
    </div>

    <h3>We tested our walls too</h3>
    <ol class="ours-tests" id="timeline">
      <li><b>1522</b><span class="pairs">his edges test</span><p>Magellan’s crew sailed west and came home from the east. No rim, only a curve.</p></li>
      <li><b>1838</b><span class="pairs">his sky test</span><p>Friedrich Bessel saw the star 61 Cygni shift against more distant stars. The sky has depth; it isn’t painted on.</p></li>
      <li><b>1971</b><span class="pairs">his time test</span><p>Joseph Hafele and Richard Keating flew atomic clocks around the world. They came back disagreeing with the clocks left on the ground, by the amount relativity predicts.</p></li>
      <li><b>2012</b><span class="pairs">a test for the machine</span><p>Silas Beane, Zohreh Davoudi and Martin Savage worked out what a universe computed on a grid would give away: a faint preferred direction in the highest-energy cosmic rays. Nobody has found it.</p></li>
    </ol>

    <p class="coda">His tests are our tests. Walk until something stops you, compare your clock with someone else’s, watch a star against the moon. The difference is that we can watch his results from outside, and nobody can do that for ours.</p>
  </section>

</main>

<section class="his" id="his" aria-labelledby="his-title">
  <div class="his-stage">
    <div class="his-head"><h2 id="his-title">His five tests</h2><div class="his-progress" aria-hidden="true"><span id="his-progress"></span></div></div>
    <ol class="tests" id="tests-row">
${data.tests.map((t) => testItem(t, data)).join("\n")}
    </ol>
  </div>
</section>

${ourTests(data)}

<footer class="gutter">
  <div class="foot-col">
    <p class="foot-head">Build with us</p>
    <p class="build">Birdwatching is open source, and the observatory has room for more instruments. A better way to read his feed, a new measurement, a sharper eye for his tests: come build it with us on <a href="https://github.com/jessesar/birdwatching">GitHub</a>. Issues, ideas and pull requests are all welcome.</p>
  </div>
  <div class="foot-col">
    <p class="foot-head">How it reads him</p>
    <p>The claims and plans are Pino’s, from his page; quotes come from his public feed, unedited. Lines in lamplight are the observatory’s own. A language model judges which test an entry is about; until it has, keywords stand in. Either can be wrong, so read and judge.</p>
    <p>Watching since ${data.watchingSince ? utc(data.watchingSince) : "now"}, ${data.readings} clock readings. Last asked ${utc(data.status?.at)}${data.status && !data.status.answering ? ", and he didn’t answer" : ""}. Raw observations: <a href="/data.json">data.json</a>.</p>
  </div>
  <div class="foot-col">
    <p class="foot-head">Credits</p>
    <p>Pino, from <a href="https://pinos.world">pinos.world</a>. Pino and his town are made by <a href="https://www.instagram.com/3eyes.iii/">@3eyes.iii</a>.</p>
    <p>Birdwatching is made by <a href="https://www.instagram.com/jessesar/">@jessesar</a>, who is amazed by the work of @3eyes.iii and thinks Pino is a really cool experiment, worth watching closely.</p>
    <p>This observatory only watches: it asks his public API no faster than he updates and never writes to him.</p>
  </div>
</footer>

<script id="sky-data" type="application/json">${skyData(data)}</script>
<script>
(() => {
  const D = JSON.parse(document.getElementById("sky-data").textContent);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const box = document.getElementById("skybox");
  const cv = document.getElementById("sky-canvas");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, field = [], town = [], pole = { x: 0, y: 0 };
  // One turn of the sky every 12 minutes: you can watch it wheel.
  const TURN_MS = 12 * 60 * 1000;

  // Seeded randomness so the sky and the rooftops look the same on every visit.
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  function townMinutesNow() {
    if (!D.last) return null;
    // Asleep, his town reports no time: hold at the last reading rather than guess.
    const run = D.rate && !D.asleep ? (D.rate * (Date.now() - D.last.realMs)) / 60000 : 0;
    return D.last.town + run;
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(4233);
    // Stars sit on a disc around a pole above the page, so the sky can turn.
    pole = { x: W * 0.5, y: -H * 0.35 };
    const reach = Math.hypot(W * 0.6, H * 1.4);
    field = Array.from({ length: Math.round((Math.PI * reach * reach) / 2600) }, () => ({
      r: reach * Math.sqrt(r()), th: r() * 6.283, s: r() < 0.08 ? 1.5 : 0.4 + r() * 0.8,
      a: 0.25 + r() * 0.6, p: r() * 6.28, v: 0.4 + r() * 1.2, born: r() * 1800,
    }));
    const g = rng(14), ground = H * 0.97;
    town = [];
    for (let x = -10; x < W + 10;) {
      const w = 28 + g() * 46, h = 22 + g() * 58;
      const lit = [];
      for (let wy = ground - h + 10; wy < ground - 8; wy += 12)
        for (let wx = x + 7; wx < x + w - 9; wx += 11) if (g() < 0.16) lit.push([wx, wy, true]);
      town.push({ x, w, h, lit, gable: g() < 0.4 });
      x += w + 2;
    }
  }

  function moon(cx, cy, R) {
    const age = D.moon.ageDays / 29.530588853;
    ctx.save();
    ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, 0, R, 0, 0, R * 4);
    glow.addColorStop(0, "rgba(243,239,233," + (0.10 * D.moon.illumination + 0.02) + ")");
    glow.addColorStop(1, "rgba(243,239,233,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, R * 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#2a2622"; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
    if (age > 0.5) ctx.scale(-1, 1);               // waning: lit from the other side
    const f = age > 0.5 ? 1 - age : age;
    const k = Math.cos(f * 2 * Math.PI);           // terminator width, 1 = new, -1 = full
    ctx.fillStyle = "#efe6d2";
    ctx.beginPath();
    ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
    ctx.ellipse(0, 0, Math.abs(k) * R, R, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    ctx.fill();
    ctx.restore();
  }

  // On load the constellation traces itself from Edges to Sky, lighting each
  // test's star as the line reaches it.
  const intro = !still;
  const TRACE_MS = intro ? 1400 : 0, TRACE_DELAY = intro ? 450 : 0;
  const marks = [...document.querySelectorAll(".mark")];
  if (intro) marks.forEach((m) => (m.style.opacity = 0));
  function constellation(t) {
    const pts = D.stars.map((s) => ({ ...s, x: (s.at[0] / 100) * W, y: (s.at[1] / 100) * H }));
    const legs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
    const total = legs.reduce((a, b) => a + b, 0);
    // A gentle ease: it settles at the end without crawling to the last star.
    const ease = (x) => 1 - Math.pow(1 - x, 1.6);
    const progress = TRACE_MS ? ease(Math.max(0, Math.min(1, (t - TRACE_DELAY) / TRACE_MS))) : 1;
    let left = progress * total;
    ctx.strokeStyle = "rgba(243,239,233,0.16)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    const reached = [true];
    legs.forEach((len, i) => {
      const a = pts[i], b = pts[i + 1], f = Math.max(0, Math.min(1, left / len));
      if (f > 0) ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      reached.push(progress === 1 || f >= 0.999);
      left -= len;
    });
    ctx.stroke();
    pts.forEach((p, i) => {
      if (marks[i] && TRACE_MS) marks[i].style.opacity = reached[i] && progress > 0 ? 1 : 0;
      if (!reached[i] || progress === 0) return;
      const strength = Math.min(p.seen, 24) / 24;
      if (!p.seen) {
        ctx.strokeStyle = "rgba(243,239,233,0.45)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.283); ctx.stroke();
        if (p.glimmers) {
          // A glimmer: a faint, slow flicker inside the ring, not a lit star.
          const flick = still ? 0.6 : 0.45 + 0.35 * Math.sin(t / 1300 + p.x) * Math.sin(t / 470 + p.y);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
          g.addColorStop(0, "rgba(242,196,109," + 0.55 * flick + ")"); g.addColorStop(1, "rgba(242,196,109,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, 6.283); ctx.fill();
          ctx.fillStyle = "rgba(255,246,223," + (0.4 + 0.5 * flick) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.283); ctx.fill();
        }
        return;
      }
      // A seen star is unmistakable from the first sighting, and grows with more.
      const pulse = still ? 1 : 0.88 + 0.12 * Math.sin(t / 900 + p.x);
      const R = (24 + 22 * strength) * pulse;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      g.addColorStop(0, "rgba(255,226,160,0.95)"); g.addColorStop(0.2, "rgba(242,196,109,0.45)"); g.addColorStop(1, "rgba(242,196,109,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 6.283); ctx.fill();
      // A filled four-pointed star: sides curving in, light fading from the centre to the tips.
      const ray = (13 + 9 * strength) * pulse, waist = ray * 0.2;
      const tip = (k) => [p.x + Math.cos(k * Math.PI / 2 - Math.PI / 2) * ray, p.y + Math.sin(k * Math.PI / 2 - Math.PI / 2) * ray];
      const bend = (k) => [p.x + Math.cos(k * Math.PI / 2 - Math.PI / 4) * waist, p.y + Math.sin(k * Math.PI / 2 - Math.PI / 4) * waist];
      ctx.beginPath(); ctx.moveTo(...tip(0));
      for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(...bend(k), ...tip(k + 1));
      const light = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, ray);
      light.addColorStop(0, "rgba(255,252,240,1)"); light.addColorStop(0.35, "rgba(255,230,170,0.9)"); light.addColorStop(1, "rgba(242,196,109,0.25)");
      ctx.fillStyle = light; ctx.fill();
      ctx.fillStyle = "#fffdf6"; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6 + 1.2 * strength, 0, 6.283); ctx.fill();
    });
  }

  // Now and then a shooting star crosses the upper sky.
  let meteor = null, nextMeteor = 7000;
  function shootingStar(t) {
    if (!meteor && t > nextMeteor) {
      const fromLeft = Math.random() < 0.5;
      meteor = { x: W * (fromLeft ? 0.1 + Math.random() * 0.3 : 0.6 + Math.random() * 0.3), y: H * (0.05 + Math.random() * 0.2),
                 dx: (fromLeft ? 1 : -1) * W * 0.00045, dy: H * 0.00022, born: t, life: 1100 };
    }
    if (!meteor) return;
    const age = t - meteor.born;
    if (age > meteor.life) { meteor = null; nextMeteor = t + 14000 + Math.random() * 22000; return; }
    const hx = meteor.x + meteor.dx * age, hy = meteor.y + meteor.dy * age;
    const tail = Math.min(age, 260);
    const fade = Math.sin((age / meteor.life) * Math.PI);
    const g = ctx.createLinearGradient(hx, hy, hx - meteor.dx * tail, hy - meteor.dy * tail);
    g.addColorStop(0, "rgba(255,246,223," + 0.9 * fade + ")"); g.addColorStop(1, "rgba(255,246,223,0)");
    ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - meteor.dx * tail, hy - meteor.dy * tail); ctx.stroke();
  }

  // Someone in town turns a light on or off every few seconds.
  let nextFlip = 3000;
  function windows(t) {
    if (t < nextFlip) return;
    const lit = town.filter((b) => b.lit.length);
    if (lit.length) {
      const b = lit[Math.floor(Math.random() * lit.length)];
      const w = b.lit[Math.floor(Math.random() * b.lit.length)];
      w[2] = !w[2];
    }
    nextFlip = t + 1500 + Math.random() * 3500;
  }

  function skyline() {
    const ground = H * 0.97, cx = W / 2, roostX = cx + 19 + 46;
    ctx.fillStyle = "#0d0a08";
    for (const b of town) {
      // His roost stands on the ground in a gap of its own.
      if (b.x < roostX + 26 && b.x + b.w > roostX - 26) continue;
      ctx.beginPath();
      ctx.moveTo(b.x, ground); ctx.lineTo(b.x, ground - b.h);
      if (b.gable) ctx.lineTo(b.x + b.w / 2, ground - b.h - 12);
      ctx.lineTo(b.x + b.w, ground - b.h); ctx.lineTo(b.x + b.w, ground); ctx.fill();
      ctx.fillStyle = "rgba(242,196,109,0.55)";
      for (const [x, y, on] of b.lit) if (on && Math.abs(x - cx) > 30) ctx.fillRect(x, y, 4, 6);
      ctx.fillStyle = "#0d0a08";
    }
    ctx.fillRect(0, ground, W, H - ground);
    // The clock tower, showing his town's time.
    const tw = 38, th = 150, top = ground - th;
    ctx.fillRect(cx - tw / 2, top, tw, th);
    ctx.beginPath(); ctx.moveTo(cx - tw / 2 - 4, top); ctx.lineTo(cx, top - 34); ctx.lineTo(cx + tw / 2 + 4, top); ctx.fill();
    const dy = top + 26, r = 13;
    ctx.fillStyle = "#f3e7c9"; ctx.beginPath(); ctx.arc(cx, dy, r, 0, 6.283); ctx.fill();
    const m = townMinutesNow();
    if (m != null) {
      const mins = ((m % 1440) + 1440) % 1440;
      ctx.strokeStyle = "#0d0a08"; ctx.lineCap = "round";
      const hand = (ang, len, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, dy); ctx.lineTo(cx + Math.sin(ang) * len, dy - Math.cos(ang) * len); ctx.stroke(); };
      hand(((mins / 60) % 12) / 12 * 6.283, 7, 2.2);
      hand((mins % 60) / 60 * 6.283, 10.5, 1.4);
    }
    roost(roostX, ground);
  }

  // Pino's roost: a small birdhouse on the ground beside the tower. Its round
  // window glows while he's awake; asleep it goes dark and z's drift up from it.
  let roostAt = null;
  function roost(x, ground) {
    const bw = 30, bh = 26, top = ground - bh;
    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(x - bw / 2, top, bw, bh);
    ctx.beginPath(); ctx.moveTo(x - bw / 2 - 6, top + 1); ctx.lineTo(x, top - 17); ctx.lineTo(x + bw / 2 + 6, top + 1); ctx.fill();
    // A faint warm edge so the little house reads against the dark town.
    ctx.strokeStyle = "rgba(242,196,109,0.28)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - bw / 2, ground); ctx.lineTo(x - bw / 2, top + 1); ctx.lineTo(x - bw / 2 - 6, top + 1); ctx.lineTo(x, top - 17);
    ctx.lineTo(x + bw / 2 + 6, top + 1); ctx.lineTo(x + bw / 2, top + 1); ctx.lineTo(x + bw / 2, ground); ctx.stroke();
    ctx.fillStyle = "#0d0a08"; ctx.fillRect(x - 6, top + bh - 9, 12, 2.5);
    const hx = x, hy = top + bh / 2 - 3;
    roostAt = { x: hx, y: top - 17 };
    if (D.asleep) {
      ctx.fillStyle = "#2a221b"; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(242,196,109,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 6.283); ctx.stroke();
      if (!still) zs(hx, hy);
    } else {
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22);
      glow.addColorStop(0, "rgba(255,210,122,0.55)"); glow.addColorStop(1, "rgba(255,210,122,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(hx, hy, 22, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 6.283); ctx.fill();
    }
  }
  function zs(x, y) {
    const t = performance.now();
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const p = ((t / 3200) + i / 3) % 1;
      ctx.fillStyle = "rgba(243,239,233," + 0.75 * Math.sin(p * Math.PI) + ")";
      ctx.font = "600 " + (8 + p * 7) + "px 'Hanken Grotesk', sans-serif";
      ctx.fillText("z", x + 8 + p * 16 + Math.sin(p * 6) * 3, y - 14 - p * 40);
    }
  }

  // His sky follows his town clock: night, dawn, day and dusk on his time.
  // Keyframes by town hour: [hour, zenith, middle, horizon, starlight].
  const SKY = [
    [0, "#0b0e19", "#141223", "#1d1611", 1],
    [4.5, "#0b0e19", "#141223", "#1d1611", 1],
    [6, "#1b2245", "#4b3c63", "#c4835a", 0.45],
    [8, "#28497a", "#5577a0", "#b8a48a", 0.08],
    [16.5, "#28497a", "#5577a0", "#b8a48a", 0.08],
    [18.5, "#211f45", "#5c3c62", "#cf7a4c", 0.35],
    [20.5, "#0b0e19", "#141223", "#1d1611", 1],
    [24, "#0b0e19", "#141223", "#1d1611", 1],
  ];
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, f) => "rgb(" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * f)).join(",") + ")";
  function skyNow() {
    const m = townMinutesNow();
    const hour = m == null ? 0 : ((((m % 1440) + 1440) % 1440) / 60);
    const i = SKY.findIndex((k, j) => j < SKY.length - 1 && hour >= k[0] && hour < SKY[j + 1][0]);
    const [h0, z0, m0, g0, s0] = SKY[i], [h1, z1, m1, g1, s1] = SKY[i + 1];
    const f = (hour - h0) / (h1 - h0);
    return { zenith: mix(z0, z1, f), middle: mix(m0, m1, f), horizon: mix(g0, g1, f), stars: s0 + (s1 - s0) * f };
  }

  const roostLabel = document.getElementById("roost-label");
  function placeRoostLabel() {
    if (!roostAt) return;
    roostLabel.style.left = roostAt.x + "px";
    roostLabel.style.top = roostAt.y - 8 + "px";
    document.getElementById("roost-state").textContent = D.asleep ? "asleep" : "awake";
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const sky = skyNow();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky.zenith); grad.addColorStop(0.45, sky.middle); grad.addColorStop(1, sky.horizon);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // Scrolling adds depth: the sky drifts slower than the town and keeps turning.
    const sy = still ? 0 : Math.min(scrollY, H);
    const turn = still ? 0 : (t / TURN_MS) * 6.283 + sy * 0.0008, top = H * 0.86;
    for (const s of field) {
      const x = pole.x + s.r * Math.cos(s.th + turn), y = pole.y + s.r * Math.sin(s.th + turn) + sy * 0.45;
      if (x < 0 || x > W || y < 0 || y > top) continue;
      const appear = intro ? Math.max(0, Math.min(1, (t - s.born) / 700)) : 1;
      if (!appear) continue;
      const a = sky.stars * appear * (still ? s.a : s.a * (0.7 + 0.3 * Math.sin(t / 1000 * s.v + s.p)));
      ctx.fillStyle = "rgba(243,239,233," + a + ")";
      ctx.fillRect(x, y, s.s, s.s);
    }
    moon(W * (W < 560 ? 0.84 : 0.82), H * (W < 560 ? 0.3 : 0.22) + sy * 0.4, W < 560 ? 15 : 22);
    constellation(t);
    if (!still) { shootingStar(t); windows(t); }
    skyline();
    placeRoostLabel();
  }

  // The two clocks on the ground. Minutes are fractional, so every hand sweeps;
  // his runs at the measured town speed, so his second hand races ours.
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const hands = (id) => ["h", "m", "s", "t", "d"].map((k) => document.getElementById(id + "-" + k));
  const ours = hands("oc"), his = hands("tc"), townBox = document.getElementById("town");
  if (!D.rate) his[2].setAttribute("visibility", "hidden");
  // The time on the first line, the day (his) or date (ours) always on the second.
  function setDial([h, m, s, label, below], mins, second, withSeconds) {
    h.setAttribute("transform", "rotate(" + (((mins / 60) % 12) * 30) + ")");
    m.setAttribute("transform", "rotate(" + ((mins % 60) * 6) + ")");
    s.setAttribute("transform", "rotate(" + (((mins * 60) % 60) * 6) + ")");
    const text = pad((mins / 60) % 24) + ":" + pad(mins % 60) + (withSeconds ? ":" + pad((mins * 60) % 60) : "");
    if (label.textContent !== text) label.textContent = text;
    if (below.textContent !== second) below.textContent = second;
  }
  // Tiny Pino likes a hand lying near horizontal (within 50 degrees of three or
  // nine o'clock); steeper, up or down, is too exciting. He prefers the second
  // hand, which races round; when it gets steep he moves to the minute or hour
  // hand (at random if both are comfortable). There he settles in for a good
  // while (4 to 9 seconds), until watching the second hand go round makes him
  // curious enough to move on: at random to the second hand or to the other
  // steady hand, whichever is comfortable. He only joins the second hand while
  // it's climbing (the left side, 220 to 320 degrees) and when he can reach it
  // in time; a hand on its way down would only take him somewhere he'd have to leave.
  // He walks, and never floats upwards: uphill or level he waddles at his own
  // pace; downhill he glides, faster, leaning forward. All hands meet at the pin,
  // so to change hands he heads in along his hand, timed to reach the pin just as
  // the move is due, turns, and heads out along the new one; in between he stands
  // still. With no comfortable hand he waits at the pin; asleep too.
  const tiny = document.getElementById("tiny-pino");
  const HANDS = { s: 48, m: 44, h: 28 };
  const SIZE = 1.25, WALK = 26, GLIDE = 52;
  let perch = "pin", r = 0, lastT = 0, facing = 1, stillSince = 0, sit = 0, movedAt = 0;
  const tinyUpper = document.getElementById("tiny-upper"), tinyLegs = document.getElementById("tiny-legs");
  let arrivedAt = 0, boredAfter = 0, next = null;
  const at = (deg, rr) => [Math.sin((deg * Math.PI) / 180) * rr, -Math.cos((deg * Math.PI) / 180) * rr];
  const comfy = (deg) => { const d = ((deg % 360) + 360) % 360; return Math.abs(d - 90) <= 50 || Math.abs(d - 270) <= 50; };
  function placeTiny(mins) {
    if (!tiny) return;
    const now = performance.now();
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
    lastT = now;
    const deg = { s: ((mins * 60) % 60) * 6, m: (mins % 60) * 6, h: ((mins / 60) % 12) * 30 };
    // Degrees per real second for each hand, at his clock's measured speed.
    const speed = D.rate ? { s: 6 * D.rate, m: 0.1 * D.rate, h: D.rate / 120 } : { s: 0, m: 0, h: 0 };
    // Exactly how long until a hand crosses the edge of his comfortable zone
    // (40, 140, 220 or 320 degrees), so his pace stays smooth.
    const EDGES = [40, 140, 220, 320];
    const untilEdge = (p) => {
      if (!speed[p]) return Infinity;
      const d = ((deg[p] % 360) + 360) % 360;
      return (Math.min(...EDGES.map((e) => (e > d + 1e-9 ? e : e + 360))) - d) / speed[p];
    };

    // On a steady hand he stays until he's had enough of sitting still. He sets
    // off for the second hand only if its good stretch lasts until he gets there.
    const secondComfy = Boolean(D.rate) && comfy(deg.s);
    const sat = (now - arrivedAt) / 1000;
    const curious = (t) => perch !== "s" && sat + t >= boredAfter;
    const sd = ((deg.s % 360) + 360) % 360;
    const climbing = Boolean(D.rate) && sd >= 220 && sd <= 320;
    const canReach = climbing && untilEdge("s") > r / WALK + 0.6;
    // Time until the second hand starts its next climb.
    const untilClimb = D.rate ? (((220 - sd) % 360) + 360) % 360 / speed.s : Infinity;

    // Once he's had enough, he picks where to go next among the comfortable options.
    if (!next && perch !== "s" && curious(0)) {
      const options = [...(D.rate ? ["s"] : []), ...["m", "h"].filter((p) => p !== perch && comfy(deg[p]))];
      next = options.length ? options[Math.floor(Math.random() * options.length)] : null;
    }
    if (next && next !== "s" && !comfy(deg[next])) next = null;

    let want = perch;
    if (D.asleep || still) want = "pin";
    else if (perch === "s" && secondComfy) want = "s";
    else if (next === "s" && canReach) want = "s";
    else if (next && next !== "s") want = next;
    else if (perch === "pin" || perch === "s" || !comfy(deg[perch])) {
      const options = ["m", "h"].filter((p) => comfy(deg[p]));
      want = options.includes(perch) ? perch : options.length ? options[Math.floor(Math.random() * options.length)] : "pin";
    }

    // How soon he'll have to move: his hand getting steep, or the second hand
    // coming round (if he means to rejoin it).
    let soon = Infinity;
    if (perch === "s") soon = untilEdge("s");
    else if (perch !== "pin") soon = Math.min(next === "s" && !climbing ? untilClimb : Infinity, comfy(deg[perch]) ? untilEdge(perch) : 0);

    // Where he wants to stand on his hand: at the tip, or near enough to the pin
    // to reach it in time. He walks there at his own pace, never faster.
    let target = perch === "pin" ? 0 : Math.min(HANDS[perch] - 4, soon * WALK);
    if (want !== perch) target = 0;
    // Downhill if moving along his hand takes him lower on the screen.
    const handUp = perch === "pin" ? 0 : -Math.cos((deg[perch] * Math.PI) / 180);
    const downhill = perch !== "pin" && Math.sign(target - r) * handUp > 0.05;
    // If he's sitting, he gets up before he moves.
    const needMove = Math.abs(target - r) > 0.01 || want !== perch;
    const before = r, step = needMove && sit > 0.05 ? 0 : (downhill ? GLIDE : WALK) * dt;
    r += Math.max(-step, Math.min(step, target - r));
    if (want !== perch && r <= 0.01) {
      perch = want; r = 0;
      next = null;
      if (perch !== "s") { arrivedAt = now; boredAfter = 4 + Math.random() * 5; }
    }
    // He counts as walking until he's really stopped, so the waddle doesn't
    // flicker on and off between steps.
    if (Math.abs(r - before) > 1e-3) movedAt = now;
    const walking = now - movedAt < 160;
    const gliding = walking && downhill;

    // At the pin he stands on its top; out on a hand, at its point r from the centre.
    let [x, y] = perch === "pin" ? [0, 0] : at(deg[perch], r);
    y -= 2.6 * (1 - Math.min(1, r / 3));
    // Face the way he walks: out along the hand, or in towards the pin.
    if (walking && perch !== "pin") {
      const out = Math.sin((deg[perch] * Math.PI) / 180) >= 0 ? 1 : -1;
      facing = r > before ? out : -out;
    }
    // Standing still for a moment, he sits down: body lowered onto the hand,
    // legs tucked away. He gets up again before he moves.
    if (needMove || walking) stillSince = now;
    const sitting = now - stillSince > 1400;
    sit += Math.max(-dt / 0.25, Math.min(dt / 0.35, (sitting ? 1 : 0) - sit));
    if (tinyUpper) tinyUpper.setAttribute("transform", "translate(0 " + (2.2 * sit).toFixed(2) + ")");
    if (tinyLegs) tinyLegs.style.opacity = String(1 - sit);

    // The waddle: rocking from foot to foot about his feet while he walks; a
    // forward lean while he glides.
    const waddle = gliding ? 12 * facing : walking ? Math.sin(now / 85) * 9 : 0;
    tiny.setAttribute("transform", "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ") rotate(" + waddle.toFixed(1) + ") translate(0 " + (-4.4 * SIZE).toFixed(2) + ") scale(" + facing * SIZE + " " + SIZE + ")");
  }

  const ourDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  function dials() {
    const now = new Date();
    setDial(ours, now.getUTCHours() * 60 + now.getUTCMinutes() + (now.getUTCSeconds() + now.getUTCMilliseconds() / 1000) / 60, ourDate.format(now), true);
    const m = townMinutesNow();
    if (m != null) {
      setDial(his, ((m % 1440) + 1440) % 1440, D.asleep ? "asleep, day " + Math.floor(m / 1440) : "day " + Math.floor(m / 1440), Boolean(D.rate) && !D.asleep);
      placeTiny(((m % 1440) + 1440) % 1440);
    }
    his[2].setAttribute("visibility", D.rate && !D.asleep ? "visible" : "hidden");
    townBox.classList.toggle("asleep", D.asleep);
  }

  // Scroll-driven story: the dive and the timeline follow the scroll position.
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const dive = document.getElementById("dive");
  const timeline = document.getElementById("timeline");
  if (!still) {
    dive.classList.add("live");
    timeline.classList.add("live");
  }
  const zoom = document.getElementById("dive-zoom");
  const domes = [...dive.querySelectorAll(".dome")];
  const [l1, l2, l3] = dive.querySelectorAll(".dive-art text");
  const dust = dive.querySelector(".dust"), roofs = [...dive.querySelectorAll(".roofs")];
  const steps = [...dive.querySelectorAll(".dive-text > *")];
  const years = [...timeline.querySelectorAll("li")];
  function scrub() {
    if (still) return;
    const r = dive.getBoundingClientRect();
    const lead = innerHeight * 0.7;
    const p = clamp((lead - r.top) / Math.max(1, r.height - innerHeight + lead));
    // First the worlds draw themselves, outside in...
    domes.forEach((d, i) => {
      const drawn = seg(p, i * 0.045, i * 0.045 + 0.11);
      // Once drawn, drop the dash: it doesn't scale with the zoom and would break the line.
      d.style.strokeDasharray = drawn === 1 ? "none" : "1";
      d.style.strokeDashoffset = 1 - drawn;
    });
    roofs.forEach((g, i) => (g.style.opacity = seg(p, 0.08 + i * 0.045, 0.14 + i * 0.045)));
    // ...then the view dives through each one towards the light at the centre.
    const z = seg(p, 0.3, 0.96);
    const scale = Math.pow(22, z);
    zoom.setAttribute("transform", "translate(200 218.6) scale(" + scale + ") translate(-200 -218.6)");
    dust.style.opacity = seg(p, 0.02, 0.1) * (1 - seg(p, 0.42, 0.55));
    l1.style.opacity = seg(p, 0.06, 0.12) * (1 - seg(p, 0.34, 0.42));
    l2.style.opacity = seg(p, 0.11, 0.17) * (1 - seg(p, 0.5, 0.58));
    l3.style.opacity = seg(p, 0.16, 0.22) * (1 - seg(p, 0.66, 0.74));
    const step = p < 0.36 ? 0 : p < 0.68 ? 1 : 2;
    steps.forEach((s, i) => s.classList.toggle("on", i === step));
    // The timeline's line grows with the scroll; each year lights as it's reached.
    const tr = timeline.getBoundingClientRect();
    const q = clamp((innerHeight * 0.9 - tr.top) / (tr.height + innerHeight * 0.2));
    timeline.style.setProperty("--q", q);
    years.forEach((li, i) => li.classList.toggle("lit", q > (i + 0.25) / years.length));
  }
  // His five tests: a row you scroll sideways yourself. The line shows how far along you are,
  // and a star in the sky brings you to its card.
  const hisRow = document.getElementById("his"), row = document.getElementById("tests-row");
  const hisBar = document.getElementById("his-progress");
  function scrubHis() {
    const max = row.scrollWidth - row.clientWidth;
    hisBar.style.width = (max > 0 ? (row.scrollLeft / max) * 100 : 0) + "%";
  }
  row.addEventListener("scroll", scrubHis, { passive: true });
  marks.forEach((m, i) => m.addEventListener("click", (e) => {
    const card = row.children[i];
    if (!card) return;
    e.preventDefault();
    const behavior = still ? "auto" : "smooth";
    hisRow.scrollIntoView({ behavior, block: "start" });
    row.scrollTo({ left: card.offsetLeft - row.children[0].offsetLeft, behavior });
  }));
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; scrub(); }); } }, { passive: true });
  addEventListener("resize", () => { scrub(); scrubHis(); });
  scrub(); scrubHis();

  build(); frame(0); dials();
  // Reduced motion: the clocks still tell the time, once a second, without sweeping.
  if (still) setInterval(dials, 1000);
  addEventListener("resize", () => { build(); frame(performance.now()); });
  if (!still) {
    const loop = (t) => { frame(t); dials(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // Fresh observations every five minutes; the sky keeps moving in between.
  // Fresh observations every minute, without reloading: his status, his clock and
  // the stars. A new sighting offers itself instead of yanking the page away.
  const nowEl = document.querySelector(".now");
  const noteEl = document.querySelector(".ground .note");
  const notice = document.getElementById("new-sighting");
  const seenText = (n, g) => n ? (n === 1 ? "seen once" : "seen " + n + " times") : g ? (g === 1 ? "a glimmer" : g + " glimmers") : "not yet seen";
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const LEVELS = ${LEVELS_SRC};
  function feelHTML(n) {
    const words = n.feeling && n.feeling.words;
    const levels = LEVELS.map(([label, f]) => [label, f(n)]).filter(([, v]) => v != null);
    return (words ? '<p class="feeling"><span>feeling</span> <q>' + esc(words) + "</q></p>" : "") +
      (levels.length ? '<p class="needs-title">how he is</p><ul class="needs">' + levels.map(([label, v]) =>
        "<li" + (v < 0.25 ? ' class="low"' : v > 0.85 ? ' class="high"' : "") + "><span>" + label + '</span><i><b style="width:' + Math.round(Math.max(0, Math.min(1, v)) * 100) + '%"></b></i></li>').join("") + "</ul>" : "");
  }
  async function refresh() {
    let d;
    try { d = await (await fetch("/data.json", { cache: "no-store" })).json(); } catch { return; }
    if (d.now) {
      const n = d.now, quiet = d.status && !d.status.answering ? " He isn’t answering right now." : "";
      const when = n.world && n.world.time ? "In his town now, day " + esc(n.world.day) + ", " + esc(n.world.time) + (n.asleep ? ", asleep" : "")
        : "In his town now, asleep. His town shows no time while he sleeps";
      nowEl.innerHTML = '<span class="when">' + when + '</span><span class="doing">' + esc(n.doing) + quiet + "</span>" +
        (n.thought ? '<span class="thought"><span>thinking</span> <q>' + esc(n.thought) + "</q></span>" : "");
      D.asleep = Boolean(n.asleep);
      document.getElementById("feel").innerHTML = feelHTML(n);
    }
    if (d.lastReading) D.last = d.lastReading;
    const measured = d.clock && d.clock.verdict.state !== "measuring";
    D.rate = measured ? d.clock.rate : null;
    his[2].setAttribute("visibility", D.rate ? "visible" : "hidden");
    if (d.clock?.note) noteEl.textContent = d.clock.note;
    const finding = document.getElementById("time-finding");
    if (finding && d.clock?.summary) finding.textContent = d.clock.summary;
    let more = false;
    d.tests.forEach((t, i) => {
      if (t.seen > D.stars[i].seen || (t.glimmers ?? 0) > D.stars[i].glimmers) more = true;
      D.stars[i].seen = t.seen;
      D.stars[i].glimmers = t.glimmers ?? 0;
      const label = seenText(t.seen, t.glimmers);
      const small = marks[i]?.querySelector("small");
      if (small) small.textContent = label;
      const card = row.children[i];
      card?.querySelector(".test-name span")?.replaceChildren(label);
      card?.querySelector(".dot")?.classList.toggle("lit", t.seen > 0);
      card?.querySelector(".dot")?.classList.toggle("glimmer", !t.seen && t.glimmers > 0);
      card?.classList.toggle("seen", t.seen > 0);
      card?.classList.toggle("glimmering", !t.seen && t.glimmers > 0);
    });
    if (more) notice.hidden = false;
  }
  // Sightings say how long ago they happened, kept current while the page is open.
  function ago(iso) {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 90) return "just now";
    const m = Math.round(s / 60); if (m < 60) return m + " minutes ago";
    const h = Math.round(m / 60); if (h < 36) return h === 1 ? "an hour ago" : h + " hours ago";
    const d = Math.round(h / 24); return d === 1 ? "a day ago" : d + " days ago";
  }
  function stamp() { document.querySelectorAll(".tip-when[data-at]").forEach((el) => { const t = ago(el.dataset.at); if (el.textContent !== t) el.textContent = t; }); }
  stamp(); setInterval(stamp, 15 * 1000);

  // Only while the tab is visible; coming back to it refreshes right away.
  setInterval(() => { if (!document.hidden) refresh(); }, 5 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
</script>
</body></html>`;
}
