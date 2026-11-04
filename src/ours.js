// Our own tests on Pino: questions we keep asking about ourselves, asked of him.
// All of it is read from his state over time; nothing is ever sent to him.
// moments: [{ realMs, asleep, townMin (null while asleep), rest, energy, mood, doing, thought }]

const REST_ACTION = /\b(roost|sit down|sit-down|resting|rest|breather|nap|lie down|lying down)\b/i;
const TIRED_WORDS = /\b(tired|spent|exhausted|exhaustion|dead on my feet|collapse|breather|rest|sleep|nap|knackered|wiped|drained|worn|weary|burn(ed|t)? out|cuppa)\b/i;

const clockTime = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Each complete sleep: from the first moment asleep to the first moment awake again.
// His town clock races through the night and catches up just after he wakes, so
// the wake-up time is read a couple of minutes later, once it has.
export function sleeps(moments) {
  const out = [];
  for (let i = 1; i < moments.length; i++) {
    if (!moments[i].asleep || moments[i - 1].asleep) continue;
    const bed = moments[i - 1];
    let j = i;
    while (j < moments.length && moments[j].asleep) j++;
    if (j >= moments.length) break;
    const woke = moments[j];
    // Only a reading within five minutes of waking tells us where the night ended.
    const settled = moments.slice(j).find((m) => m.townMin != null && m.realMs >= woke.realMs + 90_000 && m.realMs <= woke.realMs + 300_000);
    if (bed.townMin == null || !settled) continue;
    out.push({
      realMinutes: (woke.realMs - moments[i].realMs) / 60000,
      bedTown: bed.townMin,
      wakeTown: settled.townMin,
      townHours: (settled.townMin - bed.townMin) / 60,
    });
    i = j;
  }
  return out;
}

export function sleepRhythm(moments) {
  const nights = sleeps(moments);
  if (!nights.length) return { nights: 0 };
  const avg = (f) => nights.reduce((s, n) => s + f(n), 0) / nights.length;
  const perDay = new Map();
  for (const n of nights) perDay.set(Math.floor(n.bedTown / 1440), (perDay.get(Math.floor(n.bedTown / 1440)) ?? 0) + 1);
  const last = nights[nights.length - 1];
  return {
    nights: nights.length,
    realMinutes: avg((n) => n.realMinutes),
    townHours: avg((n) => n.townHours),
    lastBed: clockTime(last.bedTown),
    lastWake: clockTime(last.wakeTown),
    inPieces: [...perDay.values()].some((c) => c > 1),
  };
}

// Daytime rests while worn out: runs of moments where he's awake, his rest need
// is near its maximum, and what he's doing is a rest. Did any of them help?
export function learningToRest(moments) {
  let attempts = 0, helped = 0;
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    if (m.asleep || !(m.rest >= 0.9) || !REST_ACTION.test(m.doing ?? "")) continue;
    let j = i;
    while (j + 1 < moments.length && !moments[j + 1].asleep && REST_ACTION.test(moments[j + 1].doing ?? "")) j++;
    attempts++;
    const after = moments[j + 1] && !moments[j + 1].asleep ? moments[j + 1] : moments[j];
    if (after.rest <= m.rest - 0.05) helped++;
    i = j;
  }
  return { attempts, helped, sleeps: sleeps(moments).length };
}

// Does what he thinks match what his body says? Compare how often his thoughts
// mention tiredness when his rest need is high, and when he's rested.
export function feelingHisBody(moments) {
  const awake = moments.filter((m) => !m.asleep && m.thought && typeof m.rest === "number");
  const share = (list) => (list.length ? list.filter((m) => TIRED_WORDS.test(m.thought)).length / list.length : null);
  const tired = awake.filter((m) => m.rest >= 0.9), rested = awake.filter((m) => m.rest <= 0.4);
  return { tiredMoments: tired.length, restedMoments: rested.length, saysTiredWhenTired: share(tired), saysTiredWhenRested: share(rested) };
}

export function ourTests(moments) {
  return {
    minutes: moments.length ? (moments[moments.length - 1].realMs - moments[0].realMs) / 60000 : 0,
    since: moments.length ? new Date(moments[0].realMs).toISOString() : null,
    sleep: sleepRhythm(moments),
    rest: learningToRest(moments),
    body: feelingHisBody(moments),
  };
}
