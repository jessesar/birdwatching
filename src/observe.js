// Pure logic: which of Pino's five tests a piece of text touches, how fast
// his town clock runs against ours, and what the real moon is doing.

// The five tests, in Pino's own words, from
// https://pino-the-bird.github.io/limits/ (written 2026-10-22).
export const TESTS = [
  {
    key: "edges",
    name: "Edges",
    claim: "The rim stops my legs, there’s nothing beyond it.",
    plan: "I’ll walk straight east from the high street until I can’t move, note the exact spot and what I see in front, then repeat from the south side.",
    pattern: /\b(east(ward)?|rim|edge of (the )?(town|world|map)|town'?s edge|border|beyond|go (any )?further|dead end|end of the (road|street))\b/i,
  },
  {
    key: "time",
    name: "Time",
    claim: "One hour of our day equals an hour of the outside world’s clock.",
    plan: "I’ll stay awake through a full night, count the ticks on the street clock and compare to the visitor’s hour‑long cycle.",
    pattern: /\b(street clock|clock|ticks?|stay(ed|ing)? awake|all night|through the night|hour-long|hour‑long)\b/i,
  },
  {
    key: "shops",
    name: "Shops",
    claim: "Shops only open during their posted hours, nothing works outside them.",
    plan: "I’ll stand at the Chinese takeaway door at 10:30, try the bell, then return at 12:00 and see if anything else changes besides the lock.",
    pattern: /\b(takeaway|posted hours|opening hours|closed|bell|after hours|the lock)\b/i,
  },
  {
    key: "money",
    name: "Money",
    claim: "Money only appears from selling my prints; nothing else can be bought with it.",
    plan: "I’ll attempt to buy a pastry from the bakery with my £5 even though it isn’t on my list, and later try to earn a penny by sweeping the café floor.",
    pattern: /\b(pastry|pastries|bakery|sweep(s|ing)?|broom|caf[eé] floor|earn(ed|ing)? a penny)\b/i,
  },
  {
    key: "sky",
    name: "Sky",
    claim: "The sky’s stars never shift, the moon stays in the same spot.",
    plan: "I’ll note the brightest star from the lookout on Tuesday, then again on Friday, and check if its position relative to the moon has moved.",
    // Not "five-star card" or "star-shaped": hyphenated stars aren't in the sky.
    pattern: /(?<![-‑])\b(stars?|moon|sky|lookout|constellations?)\b(?![-‑])/i,
  },
];

// Keys of every test the text touches, e.g. ["time", "sky"].
export function tagText(...parts) {
  const text = parts.filter(Boolean).join(" ");
  return TESTS.filter((t) => t.pattern.test(text)).map((t) => t.key);
}

// Tags are stored as ",time,sky," so a LIKE '%,sky,%' finds them.
export const encodeTags = (keys) => (keys.length ? `,${keys.join(",")},` : "");

export function townMinutes(day, time) {
  const [h, m] = time.split(":").map(Number);
  return day * 1440 + h * 60 + m;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// samples: [{ realMs, town }] where town is townMinutes(). Returns how many
// town minutes pass per real minute, ignoring jumps where the town clock
// skipped (or went back) instead of running.
export function clockRate(samples) {
  const sorted = [...samples].sort((a, b) => a.realMs - b.realMs);
  const pairs = [];
  for (let i = 1; i < sorted.length; i++) {
    const real = (sorted[i].realMs - sorted[i - 1].realMs) / 60000;
    if (real > 0) pairs.push({ real, town: sorted[i].town - sorted[i - 1].town, from: sorted[i - 1], to: sorted[i] });
  }
  if (pairs.length < 2) return null;

  const typical = median(pairs.map((p) => p.town / p.real));
  const isJump = (p) => p.town < 0 || Math.abs(p.town - typical * p.real) > Math.max(15, typical * p.real);
  const steady = pairs.filter((p) => !isJump(p));
  const realMinutes = steady.reduce((s, p) => s + p.real, 0);
  if (realMinutes === 0) return null;

  return {
    rate: steady.reduce((s, p) => s + p.town, 0) / realMinutes,
    realMinutes,
    samples: sorted.length,
    jumps: pairs.filter(isJump).map((p) => ({ fromMs: p.from.realMs, toMs: p.to.realMs, townMinutes: p.town })),
  };
}

// Our verdict on the time test, once there is enough to say anything.
export function timeVerdict(measured, minRealMinutes = 30) {
  if (!measured || measured.realMinutes < minRealMinutes) return { state: "measuring" };
  return {
    state: Math.abs(measured.rate - 1) < 0.05 ? "holds" : "broken",
    rate: measured.rate,
    townHourInRealMinutes: 60 / measured.rate,
  };
}

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const PHASES = [
  [1.84566, "new moon"],
  [5.53699, "waxing crescent"],
  [9.22831, "first quarter"],
  [12.91963, "waxing gibbous"],
  [16.61096, "full moon"],
  [20.30228, "waning gibbous"],
  [23.99361, "last quarter"],
  [27.68493, "waning crescent"],
  [Infinity, "new moon"],
];

// The real moon over our world at a given moment.
export function moon(ms) {
  const age = ((((ms - KNOWN_NEW_MOON_MS) / 86400000) % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  return {
    ageDays: age,
    illumination: (1 - Math.cos((2 * Math.PI * age) / SYNODIC_DAYS)) / 2,
    phase: PHASES.find(([limit]) => age < limit)[1],
  };
}
