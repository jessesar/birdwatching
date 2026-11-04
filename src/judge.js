// A small language model reads each new entry and decides which of the five
// tests, if any, it is really about. Keywords catch "five-star card" as sky
// and miss "walked to where the town just stops"; the model reads meaning.

import { TESTS } from "./observe.js";

// The 8B models tagged "Paddling in the pond settles me" as the edges test;
// the 70B judges these the way a careful reader would.
export const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// What counts for each test, and the near misses that don't.
const GUIDE = {
  edges: "reaching, testing or wondering about the edge, rim or boundary of his town or world; walking as far as he can in one direction; what lies beyond. A hint: trying to leave town another way, such as a ticket or a train out, or a route he isn't sure exists. Not: ordinary walks to places in town, or the walls he sprays tags on.",
  time: "whether town time runs at the same speed as the outside world: watching or counting the street clock, staying awake through a night to time it, comparing how fast his time passes with another clock, noticing time passing strangely fast or slow. A hint: asking someone or something for the time. Not: simply mentioning the hour in passing, or being tired.",
  shops: "whether shops really only work in their posted hours: trying a closed shop, ringing the takeaway bell, noticing what changes at opening or closing time. Not: running his own print shop.",
  money: "whether money can only come from selling prints, and buy only listed things: trying to buy something not on offer (a pastry), earning money another way (sweeping the café floor), money arriving from elsewhere, such as a coin he finds, is given or pockets. Not: ordinary plans to sell more prints.",
  sky: "whether the sky is fixed: watching stars or the moon, noting their positions, the lookout. Not: a five-star rating, star shapes, sky-blue paint.",
};

// items: [{ id, text, why? }] -> chat messages for the model.
export function judgeMessages(items) {
  const tests = TESTS.map((t) => `- ${t.key}: Pino believes "${t.claim}" Counts: ${GUIDE[t.key]}`).join("\n");
  const lines = items.map((i) => `${i.id}: ${i.text}${i.why ? ` (because: ${i.why})` : ""}`).join("\n");
  return [
    {
      role: "system",
      content:
        "You read short entries from the life of Pino, a small bird living in a simulated town. " +
        "He wrote five tests of whether his world's limits are real. For each entry, decide which tests " +
        "it is genuinely about: him attempting, planning, observing or wondering about that specific test. " +
        "A shared word is not enough, and vague entries like \"looking closely at something\" match nothing. " +
        "Most entries match nothing; many batches have no matches at all.\n\nThe tests:\n" + tests +
        "\n\nUse two levels. \"tests\": the entry is clearly about the test. \"hints\": the entry leans towards " +
        "a test without clearly being about it, for example he asks for the time, or wonders what lies " +
        "past a street. When you are unsure which level, choose hints. A hint still needs more than a shared word. " +
        "Asking someone or something for the time is always a hint, never a test." +
        '\n\nAnswer with JSON only. List just the entries that match at either level. For each, copy a few exact words ' +
        '(at most eight) from that same entry that show it, and give one plain sentence (under 25 words) on why it is a test or only a hint, ' +
        'speaking about Pino in the third person: ' +
        '{"matches":[{"id":"e1","tests":["edges"],"hints":[],"quote":"walked east until I couldn\'t","reason":"He walks one way until he is stopped, which is his edges test."},' +
        '{"id":"e4","tests":[],"hints":["edges"],"quote":"wondered what\'s past the last street","reason":"He wonders about the edge of town but doesn\'t go to test it."}]}. ' +
        'If none match, answer {"matches":[]}.',
    },
    { role: "user", content: lines },
  ];
}

// The model's answer -> Map of id -> { tests, hints }, covering every asked id.
// A test named at both levels counts as a test. ids can be the items themselves
// ({ id, text, why }); then a match only counts if its quoted evidence really
// appears in that entry (in a batch the model sometimes borrows another entry's
// reason), and asking for the time is held to a glimmer.
// Returns null when the answer can't be read, so keywords stay in charge.
const normal = (t) => String(t ?? "").toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const ASKS_THE_TIME = /\b(ask(ed|s|ing)?|tell(s|ing)? me|told me)\b[^.]*\b(the )?time\b|\bspeaking clock\b/i;

export function parseJudgement(answer, idsOrItems) {
  const items = idsOrItems.map((x) => (typeof x === "string" ? { id: x } : x));
  const ids = items.map((i) => i.id);
  const byId = new Map(items.map((i) => [i.id, i]));
  const text = typeof answer === "string" ? answer : JSON.stringify(answer ?? "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed?.matches)) return null;

  const known = new Set(TESTS.map((t) => t.key));
  const result = new Map(ids.map((id) => [id, { tests: [], hints: [], reason: "", quote: "" }]));
  const clip = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const pick = (list) => TESTS.map((t) => t.key).filter((k) => Array.isArray(list) && list.includes(k) && known.has(k));
  for (const m of parsed.matches) {
    if (!result.has(m?.id) || (!Array.isArray(m.tests) && !Array.isArray(m.hints))) continue;
    let tests = pick(m.tests);
    let hints = pick(m.hints).filter((k) => !tests.includes(k));
    const item = byId.get(m.id);
    if (item && "text" in item) {
      const own = normal(`${item.text} ${item.why ?? ""}`);
      const quote = normal(m.quote);
      if (!quote || !own.includes(quote)) { result.set(m.id, { tests: [], hints: [], reason: "", quote: "" }); continue; }
      if (tests.includes("time") && ASKS_THE_TIME.test(item.text)) { tests = tests.filter((k) => k !== "time"); hints = [...new Set([...hints, "time"])]; }
    }
    const matched = tests.length + hints.length > 0;
    result.set(m.id, { tests, hints, reason: matched ? clip(m.reason, 240) : "", quote: matched ? clip(m.quote, 200) : "" });
  }
  return result;
}
