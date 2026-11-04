import { TESTS, tagText, encodeTags, townMinutes, clockRate, timeVerdict, moon } from "./observe.js";
import { renderPage, timeFinding, clockNote, SITE } from "./page.js";
import { ourTests, feedTests } from "./ours.js";
import { MODEL, judgeMessages, parseJudgement } from "./judge.js";

const API = "https://pinos.world/api/v1";
const USER_AGENT = "birdwatching/1.0 (read-only; polls on Pino's clock)";
const CLOCK_WINDOW_MS = 72 * 3600 * 1000;
const MOMENTS_WINDOW_MS = 72 * 3600 * 1000;
// The clock speed and our tests read thousands of rows. How often they're worked
// out is a setting (wrangler.jsonc vars): every 10 and 30 minutes keeps the
// free plan's database reads comfortable; on the paid plan both can be 1.
const every = (env, key, fallback) => Math.max(1, Number(env[key]) || fallback);
const FEED_WINDOW_MS = 48 * 3600 * 1000;
const SIGHTINGS_PER_TEST = 12;
// How much the model reads per run, and how long an entry may wait for it
// before its keyword tags are taken as final.
const JUDGE_ENTRIES = 16;
const JUDGE_MEMORIES = 4;
const JUDGE_ROUNDS = 3;
// Workers AI gives 10,000 neurons a day free. Judging stops a little short of
// that; whatever is left keeps its keyword tags.
const DAILY_NEURONS = 9000;
const JUDGE_PATIENCE_MS = 3600 * 1000;

// GET one part of Pino. A 503 means he isn't answering; that is not an error.
async function ask(path) {
  const res = await fetch(API + path, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 503) return null;
  if (!res.ok) throw new Error(`${path} answered HTTP ${res.status}`);
  return res.json();
}

const setMeta = (env, key, value) =>
  env.DB.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .bind(key, JSON.stringify(value));

export async function collect(env, when = Date.now()) {
  const seenAt = new Date(when).toISOString();
  const now = await ask("/now");
  if (!now) {
    await setMeta(env, "status", { answering: false, at: seenAt }).run();
    return;
  }

  // While he sleeps his town reports no day and no time; there's no clock to read then.
  const clockReadable = now.world?.day != null && typeof now.world?.time === "string";
  const town = clockReadable ? `day ${now.world.day}, ${now.world.time}` : "asleep, no town time";
  const writes = [
    setMeta(env, "status", { answering: true, at: seenAt }),
    setMeta(env, "now", now),
  ];
  writes.push(env.DB.prepare(
    "INSERT OR IGNORE INTO moments (at, real_ms, asleep, town_min, rest, energy, mood, doing, thought, social) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(now.at, Date.parse(now.at), now.asleep ? 1 : 0, clockReadable ? townMinutes(now.world.day, now.world.time) : null,
    now.needs?.rest ?? null, now.feeling?.energy ?? null, now.feeling?.mood ?? null, now.doing ?? null, now.thought ?? null, now.needs?.social ?? null));
  if (clockReadable) {
    writes.push(env.DB.prepare(
      "INSERT OR IGNORE INTO clock (at, real_ms, town_day, town_time, town_min, asleep, doing) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(now.at, Date.parse(now.at), now.world.day, now.world.time, townMinutes(now.world.day, now.world.time), now.asleep ? 1 : 0, now.doing ?? null));
  }

  // The clock reading above is kept even if the feed or memories fail.
  try {
    const feed = await ask("/feed?limit=50");
    for (const e of feed?.entries ?? []) {
      writes.push(
        env.DB.prepare(
          "INSERT OR IGNORE INTO entries (at, kind, text, why, tags, town, seen_at, judged) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(e.at, e.kind, e.text, e.why ?? null, encodeTags(tagText(e.text, e.why)), town, seenAt, e.kind === "felt" ? 1 : 0)
      );
    }
  } catch (err) {
    console.error("feed", err);
  }

  // Memories only change every five minutes; asking every ten is plenty.
  if (new Date(when).getUTCMinutes() % 10 === 0) {
    try {
      const memories = await ask("/memories");
      for (const m of ["beliefs", "long", "short"].flatMap((k) => memories?.[k] ?? [])) {
        writes.push(
          env.DB.prepare("INSERT OR IGNORE INTO memories (text, kind, since, tags, first_seen) VALUES (?, ?, ?, ?, ?)")
            .bind(m.text, m.kind ?? "belief", m.since ?? null, encodeTags(tagText(m.text)), seenAt)
        );
      }
    } catch (err) {
      console.error("memories", err);
    }
  }

  // His loudest wants change slowly; every five minutes catches a plan
  // before he acts on it. A want is stored once, when first seen.
  if (new Date(when).getUTCMinutes() % 5 === 0) {
    try {
      const mind = await ask("/mind");
      for (const w of mind?.loudest ?? []) {
        if (w.kind !== "want" || !w.subject) continue;
        writes.push(
          env.DB.prepare(
            "INSERT INTO entries (at, kind, text, why, tags, town, seen_at) SELECT ?, 'want', ?, NULL, ?, ?, ? " +
              "WHERE NOT EXISTS (SELECT 1 FROM entries WHERE kind = 'want' AND text = ?)"
          ).bind(mind.at, w.subject, encodeTags(tagText(w.subject)), town, seenAt, w.subject)
        );
      }
    } catch (err) {
      console.error("mind", err);
    }
  }

  await env.DB.batch(writes);
}

// Let the model read entries it hasn't judged yet. Its tags replace the
// keyword tags. If it fails or can't be read, the keyword tags stand, and
// anything left waiting longer than JUDGE_PATIENCE_MS is settled as-is.
export async function judge(env, when = Date.now()) {
  if (!env.AI) return;
  for (let round = 0; round < JUDGE_ROUNDS; round++) {
    if (!(await judgeBatch(env, when))) return;
  }
}

// One call to the model. Returns false when there's nothing to do, the day's
// budget is spent, or it failed.
async function judgeBatch(env, when) {
  const db = env.DB;
  const day = new Date(when).toISOString().slice(0, 10);
  const spent = await readMeta(env, "ai-budget");
  const used = spent?.day === day ? spent.neurons : 0;
  if (used >= DAILY_NEURONS) return false;

  const [entries, memories] = await Promise.all([
    db.prepare("SELECT rowid AS id, text, why FROM entries WHERE judged = 0 ORDER BY at LIMIT ?").bind(JUDGE_ENTRIES).all(),
    db.prepare("SELECT rowid AS id, text FROM memories WHERE judged = 0 ORDER BY first_seen LIMIT ?").bind(JUDGE_MEMORIES).all(),
  ]);
  const items = [
    ...entries.results.map((e) => ({ id: `e${e.id}`, text: e.text, why: e.why })),
    ...memories.results.map((m) => ({ id: `m${m.id}`, text: m.text })),
  ];
  if (!items.length) return false;

  let verdict = null;
  try {
    const out = await env.AI.run(MODEL, { messages: judgeMessages(items), max_tokens: 400, temperature: 0 });
    // When the answer doesn't say what it cost, assume a generous 200.
    await setMeta(env, "ai-budget", { day, neurons: used + (out?.usage?.neurons ?? 200) }).run();
    verdict = parseJudgement(out?.response, items.map((i) => i.id));
    if (!verdict) console.error("judge: unreadable answer", String(out?.response).slice(0, 300));
  } catch (err) {
    console.error("judge", err);
  }

  if (!verdict) {
    const cutoff = new Date(when - JUDGE_PATIENCE_MS).toISOString();
    await db.batch([
      db.prepare("UPDATE entries SET judged = 1 WHERE judged = 0 AND seen_at < ?").bind(cutoff),
      db.prepare("UPDATE memories SET judged = 1 WHERE judged = 0 AND first_seen < ?").bind(cutoff),
    ]);
    return false;
  }

  await db.batch(
    [...verdict].map(([id, { tests, hints, reason, quote }]) =>
      db.prepare(`UPDATE ${id[0] === "e" ? "entries" : "memories"} SET tags = ?, hints = ?, reason = ?, quote = ?, tagged_by = 'model', judged = 1 WHERE rowid = ?`)
        .bind(encodeTags(tests), encodeTags(hints), reason, quote, Number(id.slice(1)))
    )
  );
  return true;
}

const readMeta = async (env, key) => {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE key = ?").bind(key).first();
  return row ? JSON.parse(row.value) : null;
};

function mergeMoments(moments, readings) {
  const seen = new Set(moments.map((m) => Math.round(m.realMs / 1000)));
  return [...moments, ...readings.filter((r) => !seen.has(Math.round(r.realMs / 1000)))].sort((a, b) => a.realMs - b.realMs);
}

// The expensive part: his clock speed and our own tests.
export async function derive(env, at = Date.now()) {
  const db = env.DB;
  const [clockRows, momentRows] = await Promise.all([
    db.prepare("SELECT real_ms, town_min FROM clock WHERE at >= ? ORDER BY at")
      .bind(new Date(at - CLOCK_WINDOW_MS).toISOString()).all(),
    db.prepare("SELECT real_ms, asleep, town_min, rest, energy, mood, doing, thought, social FROM moments WHERE at >= ? ORDER BY at")
      .bind(new Date(at - MOMENTS_WINDOW_MS).toISOString()).all(),
  ]);
  return {
    clock: clockRate(clockRows.results.map((r) => ({ realMs: r.real_ms, town: r.town_min }))),
    // Clock readings fill gaps in the moments: each one is an awake moment with a town time.
    ours: ourTests(mergeMoments(toMoments(momentRows.results), clockRows.results.map((r) => ({ realMs: r.real_ms, asleep: false, townMin: r.town_min })))),
  };
}

const toMoments = (rows) => rows.map((m) => ({
  realMs: m.real_ms, asleep: Boolean(m.asleep), townMin: m.town_min, rest: m.rest, energy: m.energy, mood: m.mood, doing: m.doing, thought: m.thought, social: m.social,
}));

// Tests read from his feed: promises, boredom, persistence, needing others.
export async function deriveFeed(env, at = Date.now()) {
  const db = env.DB;
  const since = new Date(at - FEED_WINDOW_MS).toISOString();
  const [entries, moments, memories] = await Promise.all([
    db.prepare("SELECT at, kind, text FROM entries WHERE at >= ? AND kind IN ('mind', 'felt', 'did')").bind(since).all(),
    db.prepare("SELECT real_ms, mood, social FROM moments WHERE at >= ? ORDER BY at").bind(since).all(),
    db.prepare("SELECT text, kind, since FROM memories WHERE kind = 'promise' OR text LIKE '%promised%'").all(),
  ]);
  return feedTests(
    entries.results.map((e) => ({ at: Date.parse(e.at), kind: e.kind, text: e.text })),
    moments.results.map((m) => ({ realMs: m.real_ms, mood: m.mood, social: m.social })),
    memories.results
  );
}

export async function observations(env, at = Date.now(), derived = null) {
  const db = env.DB;
  const { clock, ours, feed } = derived ?? { ...(await derive(env, at)), feed: await deriveFeed(env, at) };
  const [watching, now, status, latest] = await Promise.all([
    // MIN(at) reads one index entry; the highest rowid is the count (rows are never deleted).
    db.prepare("SELECT (SELECT at FROM clock ORDER BY at LIMIT 1) AS since, (SELECT MAX(rowid) FROM clock) AS readings").first(),
    readMeta(env, "now"),
    readMeta(env, "status"),
    db.prepare("SELECT real_ms, town_min FROM clock ORDER BY at DESC LIMIT 1").first(),
  ]);


  const tests = await Promise.all(
    TESTS.map(async (t) => {
      const like = `%,${t.key},%`;
      // A sighting is a clear match (tags) or a glimmer (hints).
      const [sightings, count, glimmers, memories] = await Promise.all([
        db.prepare("SELECT at, kind, text, why, town, tagged_by, reason, quote, hints LIKE ?1 AS glimmer FROM entries " +
          "WHERE (tags != '' OR hints != '') AND (tags LIKE ?1 OR hints LIKE ?1) ORDER BY at DESC LIMIT ?2")
          .bind(like, SIGHTINGS_PER_TEST).all(),
        db.prepare("SELECT COUNT(*) AS n FROM entries WHERE tags != '' AND tags LIKE ?").bind(like).first(),
        db.prepare("SELECT COUNT(*) AS n FROM entries WHERE hints != '' AND hints LIKE ?").bind(like).first(),
        db.prepare("SELECT text, kind, since, tagged_by, reason, quote, hints LIKE ?1 AS glimmer FROM memories " +
          "WHERE (tags != '' OR hints != '') AND (tags LIKE ?1 OR hints LIKE ?1) ORDER BY first_seen DESC LIMIT 5")
          .bind(like).all(),
      ]);
      return {
        key: t.key,
        name: t.name,
        claim: t.claim,
        plan: t.plan,
        seen: count.n,
        glimmers: glimmers.n,
        sightings: sightings.results.map((s) => (t.key === "sky" ? { ...s, realMoon: moon(Date.parse(s.at)) } : s)),
        memories: memories.results,
      };
    })
  );

  const measured = clock && { ...clock, verdict: timeVerdict(clock) };
  return {
    at: new Date(at).toISOString(),
    watchingSince: watching.since,
    readings: watching.readings,
    status,
    now,
    // summary: the Time test's sentence, so an open page can update it live.
    clock: measured && { ...measured, summary: timeFinding(measured), note: clockNote(measured) },
    // The last time his town clock could be read (not while he sleeps).
    lastReading: latest && { realMs: latest.real_ms, town: latest.town_min },
    realMoon: moon(at),
    ours: ours && { ...ours, ...(feed ?? {}) },
    tests,
  };
}

// The page's data is built once a minute by the cron and stored as a single row,
// so a visit costs one read however many people are watching. Each Worker
// instance also keeps it for a few seconds.
const SNAPSHOT_TTL_MS = 15 * 1000;
let cached = null;

export async function snapshot(env, when = Date.now()) {
  const minute = Math.floor(when / 60000);
  const stored = await readMeta(env, "derived");
  let derived = stored;
  if (!stored || minute % every(env, "DERIVE_EVERY_MIN", 10) === 0) derived = { ...stored, ...(await derive(env, when)) };
  if (!derived.feed || minute % every(env, "FEED_TESTS_EVERY_MIN", 30) === 0) derived = { ...derived, feed: await deriveFeed(env, when) };
  if (derived !== stored) await setMeta(env, "derived", derived).run();
  await setMeta(env, "snapshot", await observations(env, when, derived)).run();
}

async function current(env) {
  if (cached && Date.now() - cached.t < SNAPSHOT_TTL_MS) return cached.data;
  const data = (await readMeta(env, "snapshot")) ?? (await observations(env));
  cached = { t: Date.now(), data };
  return data;
}

// For uptime monitors: 200 while the observatory is collecting, 503 when it
// hasn't asked Pino anything for five minutes.
export async function health(env, at = Date.now()) {
  const status = await readMeta(env, "status");
  const minutesAgo = status ? (at - Date.parse(status.at)) / 60000 : Infinity;
  const ok = minutesAgo < 5;
  return Response.json(
    { ok, lastAskedAt: status?.at ?? null, minutesAgo: Number.isFinite(minutesAgo) ? Math.round(minutesAgo) : null, pinoAnswering: status?.answering ?? null },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}

export default {
  async scheduled(controller, env, ctx) {
    const when = controller.scheduledTime;
    ctx.waitUntil(
      (async () => {
        try {
          await collect(env, when);
          if (new Date(when).getUTCMinutes() % 5 === 0) await judge(env, when);
        } finally {
          // Even after a failed run, refresh what visitors see.
          await snapshot(env, when);
        }
      })().catch((err) => console.error("collect failed", err))
    );
  },

  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/robots.txt") return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
    if (pathname === "/sitemap.xml") {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
        `<url><loc>${SITE}/</loc><changefreq>hourly</changefreq></url></urlset>\n`;
      return new Response(xml, { headers: { "content-type": "application/xml" } });
    }
    if (pathname === "/health") return health(env);
    if (pathname !== "/" && pathname !== "/data.json") return new Response("Not here.", { status: 404 });

    const data = await current(env);
    const headers = { "cache-control": "public, max-age=30" };
    if (pathname === "/data.json") {
      return Response.json(data, { headers: { ...headers, "access-control-allow-origin": "*" } });
    }
    return new Response(renderPage(data), { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  },
};
