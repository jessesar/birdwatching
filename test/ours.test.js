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
