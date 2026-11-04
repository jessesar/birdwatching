// Our own tests on Pino: questions we keep asking about ourselves, asked of him.
// All of it is read from his state over time; nothing is ever sent to him.
// moments: [{ realMs, asleep, townMin (null while asleep), rest, energy, mood, doing, thought }]

const REST_ACTION = /\b(roost|sit down|sit-down|resting|rest|breather|nap|lie down|lying down)\b/i;
// Walking or heading somewhere to rest isn't resting yet.
const isRest = (doing) => REST_ACTION.test(doing ?? "") && !/^(walking|heading|going)\b/i.test(doing ?? "");
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
    if (m.asleep || !(m.rest >= 0.9) || !isRest(m.doing)) continue;
    let j = i;
    while (j + 1 < moments.length && !moments[j + 1].asleep && isRest(moments[j + 1].doing)) j++;
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

// ---- Tests read from his feed (entries: [{ at: ms, kind, text }]) ----

const sorted = (entries) => [...entries].sort((a, b) => a.at - b.at);

// Does he keep his promises? "A want: X (said it would)" opens one,
// "Done with a want: X (did it)" keeps it, "(a new plan)" lets it go.
// His memories hold promises to people.
export function keepingPromises(entries, memories = []) {
  // The same want comes up in his mind many times; each distinct one counts once.
  const opened = new Map(), saidWants = new Set(), keptWants = new Set(), droppedWants = new Set();
  const keptAfter = [];
  for (const e of sorted(entries)) {
    if (e.kind !== "mind") continue;
    let m = e.text.match(/^A want: (.+) \(said it would\)$/);
    if (m) { saidWants.add(m[1]); if (!opened.has(m[1]) && !keptWants.has(m[1])) opened.set(m[1], e.at); continue; }
    m = e.text.match(/^Done with a want: (.+) \(did it\)$/);
    if (m && opened.has(m[1])) { keptWants.add(m[1]); keptAfter.push((e.at - opened.get(m[1])) / 60000); opened.delete(m[1]); continue; }
    m = e.text.match(/^Done with a want: (.+) \(a new plan\)$/);
    if (m && opened.has(m[1])) { droppedWants.add(m[1]); opened.delete(m[1]); }
  }
  const said = saidWants.size, kept = keptWants.size;
  keptAfter.sort((a, b) => a - b);
  const toPeople = memories.filter((m) => m.kind === "promise" || /\bpromised\b/i.test(m.text));
  return {
    said, kept, letGo: droppedWants.size, stillOpen: opened.size,
    medianMinutesToKeep: keptAfter.length ? keptAfter[keptAfter.length >> 1] : null,
    toPeople: toPeople.length,
    oldestToPeople: toPeople.map((m) => m.since).filter(Boolean).sort()[0] ?? null,
  };
}

// Does he get bored? His town tells him when something "did less for you than it
// used to". Does his next action move on to something else?
export function gettingBored(entries) {
  const list = sorted(entries);
  let signals = 0, movedOn = 0, keptAtIt = 0;
  for (let i = 0; i < list.length; i++) {
    const m = list[i].kind === "felt" && list[i].text.match(/^(\w+)[^.]* did less for you than it used to/);
    if (!m) continue;
    signals++;
    const next = list.slice(i + 1).find((e) => e.kind === "did");
    if (!next) continue;
    if (next.text.toLowerCase().startsWith(m[1].toLowerCase())) keptAtIt++; else movedOn++;
  }
  return { signals, movedOn, keptAtIt };
}

// Does he persist? Sittings at a piece of music that come to nothing, and whether
// he goes back to music within the hour; his longest run of versions.
export function persisting(entries) {
  const list = sorted(entries);
  const HOUR = 3600 * 1000;
  let failures = 0, wentBack = 0, finished = 0;
  const versions = new Map();
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const v = e.text.match(/^Heard "(.+?)" back \(version (\d+)\)/);
    if (v) versions.set(v[1], Math.max(versions.get(v[1]) ?? 0, Number(v[2])));
    if (e.kind === "mind" && /^Finished with a piece:/.test(e.text)) finished++;
    if (e.kind === "felt" && /nothing came of it that would play/.test(e.text)) {
      failures++;
      if (list.slice(i + 1).some((n) => n.at - e.at <= HOUR && n.kind === "mind" && /^Started something: a piece of music/.test(n.text))) wentBack++;
    }
  }
  const [longestPiece, longestVersions] = [...versions].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  return { failures, wentBack, finished, longestPiece, longestVersions };
}

// Does he need others? His mood in the ten minutes after contact with someone
// (a call, the shrine, meeting someone), against an ordinary ten minutes.
export function needingOthers(entries, moments) {
  const CONTACT = (e) => (e.kind === "did" && /payphone|shrine/i.test(e.text)) || (e.kind === "mind" && /^Met someone:/.test(e.text));
  const withMood = moments.filter((m) => typeof m.mood === "number").sort((a, b) => a.realMs - b.realMs);
  const moodNear = (t, from, to) => withMood.find((m) => m.realMs >= t + from && m.realMs <= t + to)?.mood;
  const before = (t) => [...withMood].reverse().find((m) => m.realMs <= t && m.realMs >= t - 5 * 60000)?.mood;
  const change = (t) => { const a = before(t), b = moodNear(t, 8 * 60000, 15 * 60000); return a != null && b != null ? b - a : null; };
  const contacts = entries.filter(CONTACT).map((e) => e.at);
  const after = contacts.map(change).filter((d) => d != null);
  const ordinary = withMood.filter((_, i) => i % 5 === 0).map((m) => change(m.realMs)).filter((d) => d != null);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const social = moments.filter((m) => typeof m.social === "number").map((m) => m.social);
  return { contacts: contacts.length, measured: after.length, moodAfterContact: avg(after), moodOrdinary: avg(ordinary), companyNeed: avg(social) };
}

export function feedTests(entries, moments, memories) {
  return {
    promises: keepingPromises(entries, memories),
    bored: gettingBored(entries),
    persist: persisting(entries),
    others: needingOthers(entries, moments),
  };
}
