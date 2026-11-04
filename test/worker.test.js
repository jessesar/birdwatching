import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { collect } from "../src/index.js";
import { renderPage } from "../src/page.js";
import { TESTS, moon } from "../src/observe.js";

// A stand-in for D1 that records what would be written.
function fakeDb() {
  const db = { runs: [], batches: [] };
  db.prepare = (sql) => ({
    bind: (...args) => ({ sql, args, run: async () => db.runs.push({ sql, args }) }),
  });
  db.batch = async (stmts) => db.batches.push(stmts);
  return db;
}

const NOW = {
  v: 1, at: "2026-11-03T23:40:05.000Z", name: "Pino", asleep: false,
  doing: "walking east", thought: "see how far the street goes",
  world: { name: "Pino's town", day: 4233, time: "17:30" },
};
const FEED = { entries: [
  { at: "2026-11-03T23:39:50.000Z", kind: "did", text: "walking east past the high street", why: "find the rim", ok: true },
  { at: "2026-11-03T23:39:40.000Z", kind: "felt", text: "a quiet one" },
] };
const MEMORIES = { beliefs: [{ text: "The moon never moves.", evidence: 2 }], long: [], short: [] };

const MIND = { at: "2026-11-03T23:40:01.000Z", loudest: [
  { kind: "want", subject: "walk east until the town stops me" },
  { kind: "worry", subject: "rent" },
] };

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

// Answers each Pino endpoint from a table; records every URL asked.
function stubPino(answers) {
  const asked = [];
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname.replace("/api/v1", "") + new URL(url).search;
    asked.push(path);
    const a = answers[path.split("?")[0]];
    if (a === 503) return new Response(JSON.stringify({ error: "asleep" }), { status: 503 });
    if (typeof a === "number") return new Response("nope", { status: a });
    return Response.json(a);
  };
  return asked;
}

const at = (minute) => Date.UTC(2026, 10, 3, 23, minute, 0);

test("asks only /now and /feed off the ten-minute mark", async () => {
  const asked = stubPino({ "/now": NOW, "/feed": FEED, "/memories": MEMORIES });
  await collect({ DB: fakeDb() }, at(41));
  assert.deepEqual(asked, ["/now", "/feed?limit=50"]);
});

test("also asks /memories on the ten-minute mark", async () => {
  const asked = stubPino({ "/now": NOW, "/feed": FEED, "/memories": MEMORIES, "/mind": MIND });
  const db = fakeDb();
  await collect({ DB: db }, at(40));
  assert.deepEqual(asked, ["/now", "/feed?limit=50", "/memories", "/mind"]);
  const mem = db.batches[0].find((s) => s.sql.includes("INTO memories"));
  assert.equal(mem.args[0], "The moon never moves.");
  assert.equal(mem.args[3], ",sky,");
});

test("stores the clock reading and tags feed entries", async () => {
  stubPino({ "/now": NOW, "/feed": FEED });
  const db = fakeDb();
  await collect({ DB: db }, at(41));
  const stmts = db.batches[0];
  const clock = stmts.find((s) => s.sql.includes("INTO clock"));
  assert.deepEqual(clock.args.slice(0, 5), [NOW.at, Date.parse(NOW.at), 4233, "17:30", 4233 * 1440 + 17 * 60 + 30]);
  const entries = stmts.filter((s) => s.sql.includes("INTO entries"));
  assert.equal(entries.length, 2);
  assert.equal(entries[0].args[4], ",edges,");
  assert.equal(entries[1].args[4], "");
  assert.equal(entries[0].args[5], "day 4233, 17:30");
});

test("when he doesn't answer, records that and asks nothing else", async () => {
  const asked = stubPino({ "/now": 503 });
  const db = fakeDb();
  await collect({ DB: db }, at(40));
  assert.deepEqual(asked, ["/now"]);
  assert.equal(db.batches.length, 0);
  assert.equal(db.runs.length, 1);
  assert.deepEqual(JSON.parse(db.runs[0].args[1]).answering, false);
});

test("a failing feed still keeps the clock reading", async () => {
  stubPino({ "/now": NOW, "/feed": 500 });
  const db = fakeDb();
  await collect({ DB: db }, at(41));
  const stmts = db.batches[0];
  assert.ok(stmts.some((s) => s.sql.includes("INTO clock")));
  assert.ok(!stmts.some((s) => s.sql.includes("INTO entries")));
});

const pageData = (over = {}) => ({
  at: "2026-11-03T23:40:00.000Z", watchingSince: "2026-11-03T23:29:45.021Z", readings: 10,
  status: { answering: true, at: "2026-11-03T23:40:00.000Z" }, now: NOW,
  clock: null, lastReading: { realMs: Date.parse(NOW.at), town: 4233 * 1440 + 17 * 60 + 30 },
  realMoon: moon(Date.UTC(2026, 10, 3)),
  tests: TESTS.map((t) => ({ key: t.key, name: t.name, claim: t.claim, plan: t.plan, seen: 0, sightings: [], memories: [] })),
  ...over,
});

test("Pino's words are escaped, never run as markup", () => {
  const evil = '<img src=x onerror="alert(1)"></script><script>alert(2)</script>';
  const data = pageData({ now: { ...NOW, doing: evil, thought: evil } });
  data.tests[0] = { ...data.tests[0], seen: 1, sightings: [{ at: NOW.at, kind: "did", text: evil, why: evil, town: evil }] };
  const html = renderPage(data);
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  // Exactly the three scripts the page ships: structured data, its data and its sky.
  assert.equal(html.match(/<script/g).length, 3);
});

test("renders a fresh observatory with no readings yet", () => {
  const html = renderPage(pageData({ now: null, status: null, readings: 0, watchingSince: null, lastReading: null }));
  assert.ok(html.includes("No readings yet."));
  assert.ok(html.includes("Watching since now"));
  assert.equal(html.match(/class="mark[ "]/g).length, 5);
  // Unseen stars explain their test on hover.
  assert.ok(html.includes("Whether his town has an edge."));
});

test("a glimmer shows as a glimmer, with evidence highlighted and the reasoning labelled as ours", () => {
  const data = pageData();
  data.tests[1] = { ...data.tests[1], seen: 0, glimmers: 1, sightings: [{
    at: NOW.at, kind: "noticed", town: "day 4233, 18:21", tagged_by: "model", glimmer: 1,
    text: "I dialed the payphone, asked for the time and the speaking clock barked it out.", why: null,
    quote: "asked for the time", reason: "He checks his time against the speaking clock.",
  }] };
  const html = renderPage(data);
  assert.ok(html.includes("<span>Time</span><small>a glimmer</small>"));
  assert.ok(html.includes("<mark>asked for the time</mark>"));
  assert.ok(html.includes("The observatory’s reading, why only a glimmer:</span> He checks his time against the speaking clock."));
  assert.ok(html.includes('class="dot glimmer"'));
});

test("shows the measured clock speed once there is a verdict", () => {
  const clock = { rate: 4.8, realMinutes: 45, samples: 45, jumps: [], verdict: { state: "broken", rate: 4.8, townHourInRealMinutes: 12.5 } };
  const html = renderPage(pageData({ clock }));
  assert.ok(html.includes("runs 4.8 times faster than ours: one town hour lasts 12.5 of our minutes"));
  assert.ok(html.includes('"rate":4.8'));
});


test("tells search engines and link previews what the page is", async () => {
  const html = renderPage(pageData());
  for (const tag of ['<link rel="canonical" href="https://birdwatching.pino-observatory.workers.dev/">', 'property="og:image" content="https://birdwatching.pino-observatory.workers.dev/og.png"', 'name="twitter:card" content="summary_large_image"', '<meta name="description"', '"@type":"WebSite"'])
    assert.ok(html.includes(tag), tag);
  assert.ok(!html.includes('name="robots"'));
  const { default: worker } = await import("../src/index.js");
  const robots = await (await worker.fetch(new Request("https://example.test/robots.txt"), {})).text();
  assert.match(robots, /Allow: \/\n\nSitemap: https:\/\/birdwatching\.pino-observatory\.workers\.dev\/sitemap\.xml/);
  const sitemap = await (await worker.fetch(new Request("https://example.test/sitemap.xml"), {})).text();
  assert.match(sitemap, /<loc>https:\/\/birdwatching\.pino-observatory\.workers\.dev\/<\/loc>/);
});

test("health says whether the observatory is still asking Pino", async () => {
  const { health } = await import("../src/index.js");
  const at = Date.parse("2026-11-04T02:00:00Z");
  const env = (status) => ({ DB: { prepare: () => ({ bind: () => ({ first: async () => (status ? { value: JSON.stringify(status) } : null) }) }) } });
  const fresh = await health(env({ answering: true, at: "2026-11-04T01:59:00Z" }), at);
  assert.equal(fresh.status, 200);
  assert.deepEqual(await fresh.json(), { ok: true, lastAskedAt: "2026-11-04T01:59:00Z", minutesAgo: 1, pinoAnswering: true });
  const stale = await health(env({ answering: true, at: "2026-11-04T01:50:00Z" }), at);
  assert.equal(stale.status, 503);
  assert.equal((await health(env(null), at)).status, 503);
});

test("visitors are served the stored snapshot, not fresh queries", async () => {
  const { default: worker } = await import("../src/index.js");
  const snap = { ...pageData(), tests: pageData().tests.map((t) => ({ ...t, glimmers: 0 })) };
  let queries = 0;
  const DB = { prepare: (sql) => { queries++; assert.match(sql, /FROM meta/); return { bind: () => ({ first: async () => ({ value: JSON.stringify(snap) }) }) }; } };
  const res = await worker.fetch(new Request("https://example.test/data.json"), { DB });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).readings, snap.readings);
  assert.ok(queries <= 1);
});

test("while Pino sleeps, it keeps collecting but reads no town clock", async () => {
  // What /now actually returned on 2026-11-04 at 00:24 UTC, when he fell asleep.
  const asleep = { v: 1, at: "2026-11-04T00:38:26.551Z", name: "Pino", asleep: true, doing: "asleep at his roost",
    thought: "Need a synth hook.", world: { name: "Pino's town", day: null, time: null } };
  stubPino({ "/now": asleep, "/feed": FEED });
  const db = fakeDb();
  await collect({ DB: db }, at(41));
  const stmts = db.batches[0];
  assert.ok(!stmts.some((s) => s.sql.includes("INTO clock")));
  assert.equal(stmts.filter((s) => s.sql.includes("INTO entries")).length, 2);
  assert.equal(stmts.find((s) => s.sql.includes("INTO entries")).args[5], "asleep, no town time");
  const html = renderPage(pageData({ now: asleep }));
  assert.ok(html.includes("In his town now, asleep. His town shows no time while he sleeps"));
});

test("the note under the clocks puts the measured speed in human terms", async () => {
  const { clockNote } = await import("../src/page.js");
  const v = (rate) => ({ rate, verdict: { state: rate === 1 ? "holds" : "broken" } });
  assert.equal(clockNote(v(3.5)), "Time runs 3.5 times faster in Pino’s world. One Pino hour passes in 17 of our minutes, a whole Pino day in 6.9 hours.");
  assert.equal(clockNote(v(2)), "Time runs 2.0 times faster in Pino’s world. One Pino hour passes in 30 of our minutes, a whole Pino day in 12 hours.");
  assert.match(clockNote(null), /stands still at the last reading/);
});
