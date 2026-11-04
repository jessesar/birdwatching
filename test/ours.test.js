import { test } from "node:test";
import assert from "node:assert/strict";
import { sleeps, sleepRhythm, learningToRest, feelingHisBody } from "../src/ours.js";

const min = 60000;
// Shaped like the night of 2026-11-04: asleep at town 20:55, awake at 21:02,
// and a minute later his clock has raced on to 05:12 the next day.
const night = [
  { realMs: 0, asleep: false, townMin: 4233 * 1440 + 20 * 60 + 55, rest: 0.99, doing: "having a sit down at his roost", thought: "I'm spent" },
  { realMs: 1 * min, asleep: true, townMin: null, rest: 0.82, doing: "heading home for a sleep" },
  { realMs: 10 * min, asleep: true, townMin: null, rest: 0, doing: "asleep at his roost" },
  { realMs: 20 * min, asleep: false, townMin: 4233 * 1440 + 21 * 60 + 2, rest: 0, doing: "walking to the junk heap", thought: "Fresh start" },
  { realMs: 22 * min, asleep: false, townMin: 4234 * 1440 + 5 * 60 + 12, rest: 0.01, doing: "heading up to the shrine", thought: "See what people left" },
];

test("finds a night and reads the wake-up once his clock has caught up", () => {
  const [n] = sleeps(night);
  assert.equal(n.realMinutes, 19);
  assert.equal(Math.round(n.townHours * 10) / 10, 8.3);
  const r = sleepRhythm(night);
  assert.deepEqual([r.nights, r.lastBed, r.lastWake, r.inPieces], [1, "20:55", "05:12", false]);
});

test("an unfinished sleep is not a night yet", () => {
  assert.equal(sleepRhythm(night.slice(0, 3)).nights, 0);
});

test("two sleeps on one town day count as sleeping in pieces", () => {
  const day = 4233 * 1440;
  const m = (t, asleep, townMin) => ({ realMs: t * min, asleep, townMin, rest: 0.5, doing: "x" });
  const pieces = [m(0, false, day + 60), m(1, true, null), m(5, false, day + 180), m(9, false, day + 200),
    m(10, true, null), m(14, false, day + 400), m(17, false, day + 420)];
  assert.equal(sleepRhythm(pieces).inPieces, true);
});

test("daytime rests while worn out are counted, and whether they helped", () => {
  const m = (rest, doing, asleep = false) => ({ realMs: 0, asleep, townMin: 1, rest, doing });
  const day = [m(1, "walking"), m(1, "resting in the roost"), m(1, "resting in the roost"), m(1, "at the synth"),
    m(1, "having a sit down at his roost"), m(0.8, "walking"), m(1, "asleep", true)];
  assert.deepEqual(learningToRest(day), { attempts: 2, helped: 1, sleeps: 0 });
});

test("compares what he says with what his body says", () => {
  const m = (rest, thought) => ({ realMs: 0, asleep: false, townMin: 1, rest, thought });
  const r = feelingHisBody([m(1, "I'm spent"), m(1, "dead on my feet"), m(1, "make a beat"), m(0.1, "fresh start"), m(0.2, "need a nap")]);
  assert.equal(r.saysTiredWhenTired, 2 / 3);
  assert.equal(r.saysTiredWhenRested, 1 / 2);
  assert.equal(r.tiredMoments, 3);
});

test("without a reading soon after waking, the night's length stays unknown", () => {
  const gap = night.slice(0, 4).concat([{ ...night[4], realMs: 40 * min }]);
  assert.equal(sleepRhythm(gap).nights, 0);
});

import { keepingPromises, gettingBored, persisting, needingOthers } from "../src/ours.js";

const e = (minute, kind, text) => ({ at: minute * min, kind, text });

test("promises: what he said he'd do, what he did, and promises to people", () => {
  const r = keepingPromises([
    e(0, "mind", "A want: check the heap for more filament (said it would)"),
    e(1, "mind", "A want: spray a tag nearby (said it would)"),
    e(30, "mind", "Done with a want: check the heap for more filament (did it)"),
  ], [{ kind: "promise", text: "I promised cheerfulFerret82 I'd hunt the junk heap", since: "2026-10-16T18:47:21Z" }]);
  assert.deepEqual(r, { said: 2, kept: 1, stillOpen: 1, medianMinutesToKeep: 30, toPeople: 1, oldestToPeople: "2026-10-16T18:47:21Z" });
  // The same want said again doesn't count twice.
  const again = keepingPromises([e(0, "mind", "A want: x (said it would)"), e(5, "mind", "A want: x (said it would)"), e(9, "mind", "Done with a want: x (did it)")]);
  assert.deepEqual([again.said, again.kept], [1, 1]);
});

test("boredom: does he move on when something does less for him?", () => {
  const r = gettingBored([
    e(0, "felt", "Walking somewhere did less for you than it used to. You've been doing it a lot."),
    e(1, "did", "patching a tune on the synth"),
    e(5, "felt", "Patching a tune on the synth did less for you than it used to. You've been doing it a lot."),
    e(6, "did", "patching a tune on the synth"),
  ]);
  assert.deepEqual(r, { signals: 2, movedOn: 1, keptAtIt: 1 });
});

test("persistence: failed sittings, going back, and the longest run of versions", () => {
  const r = persisting([
    e(0, "felt", "A whole sitting at a piece of music and nothing came of it that would play: it would not play."),
    e(20, "mind", "Started something: a piece of music (it began)"),
    e(30, "mind", 'Heard "payphone echo" back (version 9): decent sketch'),
    e(31, "mind", 'Heard "payphone lift" back (version 8): monotonous'),
    e(40, "felt", "A whole sitting at a piece of music and nothing came of it that would play: no notes."),
    e(200, "mind", "Started something: a piece of music (it began)"),
    e(210, "mind", "Finished with a piece: payphone lift variation (finished as it was)"),
  ]);
  assert.deepEqual(r, { failures: 2, wentBack: 1, finished: 1, longestPiece: "payphone echo", longestVersions: 9 });
});

test("needing others: his mood after contact against an ordinary ten minutes", () => {
  const moments = Array.from({ length: 40 }, (_, i) => ({ realMs: i * min, mood: i >= 21 ? 0.4 : 0, social: 0.1 }));
  const r = needingOthers([e(20, "did", "calling out from the payphone")], moments);
  assert.equal(r.contacts, 1);
  assert.equal(r.moodAfterContact, 0.4);
  assert.ok(r.moodOrdinary < 0.4);
  assert.ok(Math.abs(r.companyNeed - 0.1) < 1e-9);
});
