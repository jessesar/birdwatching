import { TESTS, tagText, encodeTags, townMinutes, clockRate, timeVerdict, moon } from "./observe.js";
import { renderPage, timeFinding, SITE } from "./page.js";
import { MODEL, judgeMessages, parseJudgement } from "./judge.js";

const API = "https://pinos.world/api/v1";
const USER_AGENT = "birdwatching/1.0 (read-only; polls on Pino's clock)";
const CLOCK_WINDOW_MS = 72 * 3600 * 1000;
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

  const town = `day ${now.world.day}, ${now.world.time}`;
  const writes = [
    setMeta(env, "status", { answering: true, at: seenAt }),
    setMeta(env, "now", now),
    env.DB.prepare(
      "INSERT OR IGNORE INTO clock (at, real_ms, town_day, town_time, town_min, asleep, doing) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(now.at, Date.parse(now.at), now.world.day, now.world.time, townMinutes(now.world.day, now.world.time), now.asleep ? 1 : 0, now.doing ?? null),
  ];

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

export async function observations(env, at = Date.now()) {
  const db = env.DB;
  const [clockRows, watching, now, status] = await Promise.all([
    db.prepare("SELECT real_ms, town_min FROM clock WHERE at >= ? ORDER BY at")
      .bind(new Date(at - CLOCK_WINDOW_MS).toISOString()).all(),
    db.prepare("SELECT MIN(at) AS since, COUNT(*) AS readings FROM clock").first(),
    readMeta(env, "now"),
    readMeta(env, "status"),
  ]);

  const clock = clockRate(clockRows.results.map((r) => ({ realMs: r.real_ms, town: r.town_min })));

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
    clock: measured && { ...measured, summary: timeFinding(measured) },
    lastReading: now && { realMs: Date.parse(now.at), town: townMinutes(now.world.day, now.world.time) },
    realMoon: moon(at),
    tests,
  };
}

export default {
  async scheduled(controller, env, ctx) {
    const when = controller.scheduledTime;
    ctx.waitUntil(
      (async () => {
        await collect(env, when);
        if (new Date(when).getUTCMinutes() % 5 === 0) await judge(env, when);
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
    if (pathname !== "/" && pathname !== "/data.json") return new Response("Not here.", { status: 404 });

    const data = await observations(env);
    const headers = { "cache-control": "public, max-age=30" };
    if (pathname === "/data.json") {
      return Response.json(data, { headers: { ...headers, "access-control-allow-origin": "*" } });
    }
    return new Response(renderPage(data), { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  },
};
