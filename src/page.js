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

// A clear sighting lights a star; a glimmer only makes it glimmer.
const seenText = (n, g = 0) =>
  n ? (n === 1 ? "seen once" : `seen ${n} times`) : g ? (g === 1 ? "a glimmer" : `${g} glimmers`) : "not yet seen";

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
  return `<li class="test" id="${test.key}">
  <p class="test-name"><i class="dot${test.seen ? " lit" : test.glimmers ? " glimmer" : ""}" aria-hidden="true"></i>${esc(test.name)}<span>${seenText(test.seen, test.glimmers)}</span></p>
  <p class="claim">${esc(test.claim)}</p>
  <p class="plan"><span>How he means to test it.</span> ${esc(test.plan)}</p>
  ${ours ? `<p class="ours"><span>What the observatory measured.</span> <span class="finding" id="${test.key}-finding">${ours}</span></p>` : ""}
  ${log}
  ${remembered}
</li>`;
}

function marks(data) {
  return data.tests
    .map((t) => {
      const [x, y] = STAR_POSITIONS[t.key];
      return `<a class="mark" href="#${t.key}" style="left:${x}%;top:${y}%"><span>${esc(t.name)}</span><small>${seenText(t.seen, t.glimmers)}</small></a>`;
    })
    .join("");
}

function nowLine(data) {
  if (!data.now) return `<p class="now">No readings yet. The first arrives within a minute of the observatory starting.</p>`;
  const n = data.now;
  const quiet = data.status && !data.status.answering ? " He isn’t answering right now." : "";
  return `<p class="now"><span class="when">In his town now, day ${esc(n.world.day)}, ${esc(n.world.time)}${n.asleep ? ", asleep" : ""}</span>${esc(n.doing)}. <q>${esc(n.thought)}</q>${quiet}</p>`;
}

const dial = (id, label) => `<figure class="dial">
  <svg viewBox="-60 -60 120 120" role="img" aria-labelledby="${id}-cap">
    <circle r="56" class="face"/>
    ${Array.from({ length: 12 }, (_, i) => `<line class="tick" x1="0" y1="-50" x2="0" y2="${i % 3 ? -46 : -43}" transform="rotate(${i * 30})"/>`).join("")}
    <line id="${id}-h" class="hand hour" x1="0" y1="6" x2="0" y2="-28"/>
    <line id="${id}-m" class="hand minute" x1="0" y1="8" x2="0" y2="-44"/>
    <line id="${id}-s" class="hand second" x1="0" y1="12" x2="0" y2="-48"/>
    <circle r="2.6" class="pin"/>
  </svg>
  <figcaption id="${id}-cap"><span>${label}</span><b id="${id}-t">--:--</b></figcaption>
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
.masthead{position:relative;z-index:2;max-width:980px;margin:0 auto;padding-block:max(28px,env(safe-area-inset-top,0px)) 0}
.kana{font:700 15px/1 var(--kana);letter-spacing:.12em;color:var(--lamp);margin:0 0 12px}
h1{font:500 clamp(30px,5.4vw,52px)/1.05 var(--text);letter-spacing:-.015em;margin:0;text-wrap:balance;max-width:14ch}
.masthead p.sub{color:var(--ash);margin:12px 0 0;max-width:62ch;font-size:15px;line-height:1.5}
.masthead p.sub span{display:block}
.masthead p.sub a{text-decoration-color:var(--ash);text-underline-offset:3px}
.mark{transition:opacity .6s ease;position:absolute;z-index:2;transform:translate(-50%,14px);text-align:center;text-decoration:none;display:grid;gap:1px;padding:4px 6px;line-height:1.25;white-space:nowrap}
.mark span{font-weight:600;font-size:14px}
.mark small{font-size:12px;color:var(--ash)}
.mark:hover span{color:var(--lamp)}
/* The star itself is part of the link: a round hit area over it, above the label. */
.mark::before{content:"";position:absolute;left:50%;top:-34px;width:40px;height:40px;transform:translateX(-50%);border-radius:50%}

main{max-width:980px;margin:0 auto}
.ground{background:#0d0a08}
.ground-inner{max-width:940px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px 56px;align-items:center;padding-block:12px 48px}
.now{margin:0;font-size:19px;line-height:1.5;max-width:44ch}
.ground .note{grid-column:1/-1;margin:0;color:var(--ash);font-size:14px}
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
.pin{fill:var(--ivory)}
.dial figcaption{display:grid;font-size:14px;color:var(--ash)}
.dial figcaption b{font-weight:500;font-size:22px;color:var(--ivory);font-variant-numeric:tabular-nums}

/* His five tests as a row of cards you scroll sideways. */
.his{--edge:max(20px,calc((100% - 940px) / 2));padding-block:72px 24px;scroll-margin-top:24px}
.his-stage{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;align-content:center;overflow:hidden}
.his-head{display:flex;align-items:baseline;justify-content:space-between;gap:24px;padding-inline:var(--edge)}
.his-progress{flex:0 1 220px;height:1px;background:var(--rule);position:relative}
.his-progress span{position:absolute;inset:0 auto 0 0;width:0;background:var(--lamp)}
ol.tests{list-style:none;margin:0;padding:4px var(--edge) 8px;display:flex;gap:28px;align-items:start;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:var(--edge);scrollbar-width:none}
.test{flex:0 0 min(380px,82vw);display:grid;gap:12px;align-content:start;scroll-snap-align:start;padding:22px 22px 24px;border:1px solid var(--rule);border-radius:14px;background:linear-gradient(#15110e,#120e0b)}
.test-name{margin:0;display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px}
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
footer{max-width:980px;margin:72px auto 0;padding-block:28px 48px;border-top:1px solid var(--rule);color:var(--ash);font-size:14px;display:grid;gap:10px}
footer p{margin:0;max-width:66ch}
footer a{text-underline-offset:3px}

@media (max-width:760px) and (max-height:760px){
  .dive.live .dive-text p{font-size:14.5px;line-height:1.5}
  .dive.live .dive-stage h2{font-size:24px}
  .dive.live .dive-art{max-height:27svh}
}
@media (prefers-reduced-motion:reduce){.roost-glow{animation:none}}
@media (max-width:560px){
  body{font-size:16px}
  .mark span{font-size:13px}.mark small{display:none}
}
@media (max-width:760px){
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
</header>

<section class="ground gutter" aria-label="His town now, and his clock beside ours">
  <div class="ground-inner">
    ${nowLine(data)}
    <div class="clocks">
      <div id="town">${dial("tc", "His town clock")}</div>
      <div id="ours">${dial("oc", "Our clock, UTC")}</div>
    </div>
    <p class="note">${data.clock && data.clock.verdict.state !== "measuring" ? "His clock runs here at the speed we measured, counted on from the last reading." : "His clock stands still at the last reading until we’ve timed it for half an hour. After that it runs here on its own, at his speed."}</p>
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

<footer class="gutter">
  <p>Watching since ${data.watchingSince ? utc(data.watchingSince) : "now"}, ${data.readings} clock readings so far. Last asked ${utc(data.status?.at)}${data.status && !data.status.answering ? ", and he didn’t answer" : ""}.</p>
  <p>The claims and plans are Pino’s, from his page. Quotes come from his public feed, unedited. Lines in lamplight are the observatory’s own measurements. A small language model reads each entry, his wants and his memories, and decides which test it is really about. Until it has, or if it can’t, plain keywords stand in and the sighting says “keyword match”. Either can be wrong, so read it and judge. The raw observations are at <a href="/data.json">data.json</a>.</p>
  <p>Pino, from <a href="https://pinos.world">pinos.world</a>. This observatory only watches: it asks his public API no faster than he updates and never writes to him.</p>
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
    const run = D.rate ? (D.rate * (Date.now() - D.last.realMs)) / 60000 : 0;
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
  const TRACE_MS = intro ? 2400 : 0, TRACE_DELAY = intro ? 900 : 0;
  const marks = [...document.querySelectorAll(".mark")];
  if (intro) marks.forEach((m) => (m.style.opacity = 0));
  function constellation(t) {
    const pts = D.stars.map((s) => ({ ...s, x: (s.at[0] / 100) * W, y: (s.at[1] / 100) * H }));
    const legs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
    const total = legs.reduce((a, b) => a + b, 0);
    const ease = (x) => 1 - Math.pow(1 - x, 3);
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
    const ground = H * 0.97, cx = W / 2;
    ctx.fillStyle = "#0d0a08";
    for (const b of town) {
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
    // His roost: a window to the right of the tower, lit while he's awake.
    ctx.fillStyle = D.asleep ? "#2a221b" : "#ffd27a";
    ctx.fillRect(cx + tw / 2 + 22, ground - 34, 7, 9);
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    // Scrolling adds depth: the sky drifts slower than the town and keeps turning.
    const sy = still ? 0 : Math.min(scrollY, H);
    const turn = still ? 0 : (t / TURN_MS) * 6.283 + sy * 0.0008, top = H * 0.86;
    for (const s of field) {
      const x = pole.x + s.r * Math.cos(s.th + turn), y = pole.y + s.r * Math.sin(s.th + turn) + sy * 0.45;
      if (x < 0 || x > W || y < 0 || y > top) continue;
      const appear = intro ? Math.max(0, Math.min(1, (t - s.born) / 700)) : 1;
      if (!appear) continue;
      const a = appear * (still ? s.a : s.a * (0.7 + 0.3 * Math.sin(t / 1000 * s.v + s.p)));
      ctx.fillStyle = "rgba(243,239,233," + a + ")";
      ctx.fillRect(x, y, s.s, s.s);
    }
    moon(W * (W < 560 ? 0.84 : 0.82), H * (W < 560 ? 0.3 : 0.22) + sy * 0.4, W < 560 ? 15 : 22);
    constellation(t);
    if (!still) { shootingStar(t); windows(t); }
    skyline();
  }

  // The two clocks on the ground. Minutes are fractional, so every hand sweeps;
  // his runs at the measured town speed, so his second hand races ours.
  const pad = (n) => String(Math.floor(n)).padStart(2, "0");
  const hands = (id) => ["h", "m", "s", "t"].map((k) => document.getElementById(id + "-" + k));
  const ours = hands("oc"), his = hands("tc");
  if (!D.rate) his[2].setAttribute("visibility", "hidden");
  function setDial([h, m, s, label], mins, suffix) {
    h.setAttribute("transform", "rotate(" + (((mins / 60) % 12) * 30) + ")");
    m.setAttribute("transform", "rotate(" + ((mins % 60) * 6) + ")");
    s.setAttribute("transform", "rotate(" + (((mins * 60) % 60) * 6) + ")");
    const text = pad((mins / 60) % 24) + ":" + pad(mins % 60) + (D.rate || !suffix ? ":" + pad((mins * 60) % 60) : "") + (suffix || "");
    if (label.textContent !== text) label.textContent = text;
  }
  function dials() {
    const now = new Date();
    setDial(ours, now.getUTCHours() * 60 + now.getUTCMinutes() + (now.getUTCSeconds() + now.getUTCMilliseconds() / 1000) / 60);
    const m = townMinutesNow();
    if (m != null) setDial(his, ((m % 1440) + 1440) % 1440, ", day " + Math.floor(m / 1440));
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
  async function refresh() {
    let d;
    try { d = await (await fetch("/data.json", { cache: "no-store" })).json(); } catch { return; }
    if (d.now) {
      const n = d.now, quiet = d.status && !d.status.answering ? " He isn’t answering right now." : "";
      nowEl.innerHTML = '<span class="when">In his town now, day ' + esc(n.world.day) + ", " + esc(n.world.time) + (n.asleep ? ", asleep" : "") +
        "</span>" + esc(n.doing) + ". <q>" + esc(n.thought) + "</q>" + quiet;
      D.asleep = Boolean(n.asleep);
    }
    if (d.lastReading) D.last = d.lastReading;
    const measured = d.clock && d.clock.verdict.state !== "measuring";
    D.rate = measured ? d.clock.rate : null;
    his[2].setAttribute("visibility", D.rate ? "visible" : "hidden");
    if (measured) noteEl.textContent = "His clock runs here at the speed we measured, counted on from the last reading.";
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
    });
    if (more) notice.hidden = false;
  }
  setInterval(refresh, 60 * 1000);
})();
</script>
</body></html>`;
}
