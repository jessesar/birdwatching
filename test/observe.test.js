import { test } from "node:test";
import assert from "node:assert/strict";
import { tagText, encodeTags, townMinutes, clockRate, timeVerdict, moon } from "../src/observe.js";

test("tags text with the tests it touches", () => {
  assert.deepEqual(tagText("walked east until the rim stopped me"), ["edges"]);
  assert.deepEqual(tagText("counted ticks on the street clock under the moon"), ["time", "sky"]);
  assert.deepEqual(tagText("tried to buy a pastry", "the bakery was closed"), ["shops", "money"]);
  assert.deepEqual(tagText("patching a tune on the synth", undefined), []);
});

test("does not match words that merely contain a keyword", () => {
  assert.deepEqual(tagText("starting a new sketch", "skyline? no, stardust"), []);
  // Seen in his real feed: music talk, not a shop.
  assert.deepEqual(tagText("the groove is locked in but the intended syncopated lift never shows up"), []);
  assert.deepEqual(tagText("Found the five‑star card on the till, reads “restorative”."), []);
  assert.deepEqual(tagText("the brightest star sat left of the moon"), ["sky"]);
});

test("encodes tags for LIKE lookups", () => {
  assert.equal(encodeTags(["time", "sky"]), ",time,sky,");
  assert.equal(encodeTags([]), "");
});

test("town minutes count across days", () => {
  assert.equal(townMinutes(4233, "14:23") - townMinutes(4232, "23:59"), 14 * 60 + 24);
});

const minute = 60000;
const samplesAt = (rate, n, start = 0) =>
  Array.from({ length: n }, (_, i) => ({ realMs: i * minute, town: start + Math.round(i * rate) }));

test("measures a steady clock rate", () => {
  const r = clockRate(samplesAt(5.5, 61));
  assert.ok(Math.abs(r.rate - 5.5) < 0.02, `rate ${r.rate}`);
  assert.equal(r.realMinutes, 60);
  assert.deepEqual(r.jumps, []);
});

test("ignores a skip in the town clock and reports it", () => {
  const s = samplesAt(2, 40);
  for (let i = 20; i < 40; i++) s[i].town += 480; // he slept, eight town hours vanished
  const r = clockRate(s);
  assert.ok(Math.abs(r.rate - 2) < 0.01, `rate ${r.rate}`);
  assert.equal(r.jumps.length, 1);
  assert.equal(r.jumps[0].townMinutes, 482);
});

test("needs at least three samples", () => {
  assert.equal(clockRate(samplesAt(1, 2)), null);
});

test("time verdict waits for enough watching, then decides", () => {
  assert.equal(timeVerdict(clockRate(samplesAt(1, 10))).state, "measuring");
  assert.equal(timeVerdict(clockRate(samplesAt(1, 61))).state, "holds");
  const broken = timeVerdict(clockRate(samplesAt(6, 61)));
  assert.equal(broken.state, "broken");
  assert.ok(Math.abs(broken.townHourInRealMinutes - 10) < 0.1);
});

test("moon phase matches known dates", () => {
  assert.equal(moon(Date.UTC(2024, 3, 8, 18, 21)).phase, "new moon"); // 2024 total solar eclipse
  assert.equal(moon(Date.UTC(2025, 2, 14, 6, 55)).phase, "full moon"); // March 2025 lunar eclipse
  assert.ok(moon(Date.UTC(2025, 2, 14, 6, 55)).illumination > 0.98);
});
