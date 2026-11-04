import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeMessages, parseJudgement } from "../src/judge.js";
import { collect, judge } from "../src/index.js";

const ids = ["e1", "e2", "m7"];

const none = { tests: [], hints: [], reason: "", quote: "" };

test("reads the model's answer into tests for every asked entry", () => {
  const v = parseJudgement('{"matches":[{"id":"e2","tests":["sky","edges"]}]}', ids);
  assert.deepEqual([...v], [["e1", none], ["e2", { tests: ["edges", "sky"], hints: [], reason: "", quote: "" }], ["m7", none]]);
});

test("keeps glimmers apart from clear tests, with reasoning and evidence", () => {
  const v = parseJudgement(JSON.stringify({ matches: [
    { id: "e1", tests: [], hints: ["time"], quote: "asked for the time", reason: "He checks the time with the speaking clock, close to his time test." },
    { id: "e2", tests: ["sky"], hints: ["sky", "edges"], quote: "the star moved", reason: "He tracks a star." },
  ] }), ids);
  assert.deepEqual(v.get("e1"), { tests: [], hints: ["time"], reason: "He checks the time with the speaking clock, close to his time test.", quote: "asked for the time" });
  // A test named at both levels counts as a test.
  assert.deepEqual(v.get("e2").tests, ["sky"]);
  assert.deepEqual(v.get("e2").hints, ["edges"]);
});

test("tolerates chatter around the JSON and answers given as objects", () => {
  const v = parseJudgement('Sure! Here you go:\n{"matches":[{"id":"m7","tests":["time"]}]}\nHope that helps.', ids);
  assert.deepEqual(v.get("m7").tests, ["time"]);
  assert.deepEqual(parseJudgement({ matches: [] }, ids).get("e1"), none);
});

test("ignores ids it wasn't asked about and tests that don't exist", () => {
  const v = parseJudgement('{"matches":[{"id":"e9","tests":["sky"]},{"id":"e1","tests":["weather","money"]}]}', ids);
  assert.equal(v.has("e9"), false);
  assert.deepEqual(v.get("e1").tests, ["money"]);
});

test("returns null for an unreadable answer, so keywords stay", () => {
  assert.equal(parseJudgement("I think e1 is about the sky.", ids), null);
  assert.equal(parseJudgement('{"matches": "e1"}', ids), null);
  assert.equal(parseJudgement("{not json}", ids), null);
  assert.equal(parseJudgement(undefined, ids), null);
});

test("the prompt carries every entry, its reason, and all five tests", () => {
  const [system, user] = judgeMessages([{ id: "e1", text: "walked east", why: "find the rim" }, { id: "m2", text: "the moon never moves" }]);
  for (const k of ["edges", "time", "shops", "money", "sky"]) assert.ok(system.content.includes(`- ${k}:`));
  assert.ok(system.content.includes("five-star"));
  assert.equal(user.content, "e1: walked east (because: find the rim)\nm2: the moon never moves");
});

// A D1 stand-in that answers SELECTs from canned rows and records writes.
function fakeDb(rows = {}, meta = {}) {
  const db = { batches: [], runs: [] };
  db.prepare = (sql) => {
    const stmt = (args) => ({
      sql, args,
      all: async () => ({ results: Object.entries(rows).find(([k]) => sql.includes(k))?.[1] ?? [] }),
      first: async () => (sql.includes("FROM meta") && meta[args[0]] ? { value: JSON.stringify(meta[args[0]]) } : null),
      run: async () => db.runs.push({ sql, args }),
    });
    return { ...stmt([]), bind: (...args) => stmt(args) };
  };
  db.batch = async (stmts) => db.batches.push(stmts);
  return db;
}

const rows = {
  "FROM entries WHERE judged = 0": [
    { id: 1, text: "wandered to where the town just stops", why: "see what's past it" },
    { id: 2, text: "found the five-star card on the till", why: null },
  ],
  "FROM memories WHERE judged = 0": [{ id: 7, text: "The moon sat lower than last week." }],
};

test("the model's verdict replaces keyword tags and marks entries judged", async () => {
  const db = fakeDb(rows);
  let asked;
  const AI = { run: async (model, input) => { asked = { model, input }; return { response: '{"matches":[{"id":"e1","tests":["edges"],"quote":"where the town just stops","reason":"He goes to the end of town."},{"id":"m7","tests":[],"hints":["sky"],"quote":"The moon sat lower","reason":"He notices the moon."}]}' }; } };
  await judge({ DB: db, AI }, Date.UTC(2026, 10, 3, 23, 45));
  assert.match(asked.model, /^@cf\//);
  assert.equal(asked.input.temperature, 0);
  const writes = db.batches[0].map((s) => [s.sql.split(" ")[1], s.args]);
  assert.deepEqual(writes, [
    ["entries", [",edges,", "", "He goes to the end of town.", "where the town just stops", 1]],
    ["entries", ["", "", "", "", 2]],
    ["memories", ["", ",sky,", "He notices the moon.", "The moon sat lower", 7]],
  ]);
  assert.ok(db.batches[0].every((s) => s.sql.includes("tagged_by = 'model', judged = 1")));
});

test("when the model fails, keyword tags stand and only old entries are settled", async () => {
  const db = fakeDb(rows);
  const AI = { run: async () => { throw new Error("3040: out of capacity"); } };
  const when = Date.UTC(2026, 10, 3, 23, 45);
  await judge({ DB: db, AI }, when);
  const [settleEntries, settleMemories] = db.batches[0];
  assert.match(settleEntries.sql, /UPDATE entries SET judged = 1 WHERE judged = 0 AND seen_at < \?/);
  assert.equal(settleEntries.args[0], new Date(when - 3600 * 1000).toISOString());
  assert.match(settleMemories.sql, /UPDATE memories SET judged = 1/);
  assert.ok(!db.batches[0].some((s) => s.sql.includes("tagged_by = 'model'")));
});

test("without an AI binding, judging does nothing", async () => {
  const db = fakeDb(rows);
  await judge({ DB: db }, Date.now());
  assert.equal(db.batches.length, 0);
});

test("stores his wants once, tagged by keywords until judged", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname.replace("/api/v1", "");
    const body = {
      "/now": { at: "2026-11-03T23:45:05.000Z", asleep: false, doing: "x", thought: "y", world: { day: 4233, time: "18:00" } },
      "/feed": { entries: [] },
      "/mind": { at: "2026-11-03T23:45:01.000Z", loudest: [{ kind: "want", subject: "walk east until the town stops me" }, { kind: "worry", subject: "rent" }] },
    }[path];
    return Response.json(body);
  };
  try {
    const db = fakeDb();
    await collect({ DB: db }, Date.UTC(2026, 10, 3, 23, 45));
    const wants = db.batches[0].filter((s) => s.sql.includes("'want'"));
    assert.equal(wants.length, 1);
    assert.match(wants[0].sql, /WHERE NOT EXISTS \(SELECT 1 FROM entries WHERE kind = 'want' AND text = \?\)/);
    assert.deepEqual(wants[0].args, ["2026-11-03T23:45:01.000Z", "walk east until the town stops me", ",edges,", "day 4233, 18:00", "2026-11-03T23:45:00.000Z", "walk east until the town stops me"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("stops judging once the day's free budget is spent", async () => {
  const when = Date.UTC(2026, 10, 3, 23, 45);
  const db = fakeDb(rows, { "ai-budget": { day: "2026-11-03", neurons: 9000 } });
  let calls = 0;
  await judge({ DB: db, AI: { run: async () => { calls++; return { response: '{"matches":[]}' }; } } }, when);
  assert.equal(calls, 0);
  assert.equal(db.batches.length, 0);
});

test("counts what each call cost toward today's budget", async () => {
  const when = Date.UTC(2026, 10, 3, 23, 45);
  const db = fakeDb(rows, { "ai-budget": { day: "2026-11-02", neurons: 8999 } });
  const AI = { run: async () => ({ response: '{"matches":[]}', usage: { neurons: 42.5 } }) };
  await judge({ DB: db, AI }, when);
  const budget = db.runs.find((r) => r.args[0] === "ai-budget");
  assert.deepEqual(JSON.parse(budget.args[1]), { day: "2026-11-03", neurons: 42.5 });
});

test("a match only counts if its quoted evidence is really in that entry", () => {
  const items = [{ id: "e1", text: "looking closely at something" }, { id: "e2", text: "A want: hunt the ghost line north for a ticket" }];
  const v = parseJudgement(JSON.stringify({ matches: [
    { id: "e1", tests: ["edges"], quote: "hunt the ghost line north", reason: "He searches for a ticket out." },
    { id: "e2", tests: [], hints: ["edges"], quote: "hunt the ghost line north", reason: "He looks for a way out." },
  ] }), items);
  assert.deepEqual(v.get("e1").tests, []);
  assert.deepEqual(v.get("e2").hints, ["edges"]);
});

test("asking for the time is held to a glimmer", () => {
  const items = [{ id: "e1", text: "I dialed the payphone, asked for the time and the speaking clock barked it out" }];
  const v = parseJudgement('{"matches":[{"id":"e1","tests":["time"],"quote":"asked for the time","reason":"He asks for the time."}]}', items);
  assert.deepEqual([v.get("e1").tests, v.get("e1").hints], [[], ["time"]]);
});
