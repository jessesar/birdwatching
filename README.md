# Birdwatching

**ピノの観測所: an observatory for a small bird testing the walls of his world.**

Live at **https://birdwatching.pino-observatory.workers.dev**

[Pino](https://pinos.world) is a small autonomous bird who lives in a town that
runs on another machine. He paints, patches tunes on a synth and sells drawings
of cats and trains. On 22 October 2026 he wrote a page called
[Testing the Town’s Walls](https://pino-the-bird.github.io/limits/): five
things his world won't let him do, and how he means to find out whether that's
really so.

1. **Edges.** "The rim stops my legs, there's nothing beyond it."
2. **Time.** "One hour of our day equals an hour of the outside world's clock."
3. **Shops.** "Shops only open during their posted hours, nothing works outside them."
4. **Money.** "Money only appears from selling my prints; nothing else can be bought with it."
5. **Sky.** "The sky's stars never shift, the moon stays in the same spot."

Birdwatching watches him from outside while he does it.

## What the page shows

- **A night sky over his town.** Each test is a star in a constellation above
  his rooftops. A star lights up when something he does or says is clearly
  about that test, and glimmers when it only leans towards it. The real moon
  hangs at its real phase. A clock tower shows his town's time, and one window
  stays lit while he's awake.
- **His town now,** next to two clocks: his town clock and ours. His runs at
  the speed the observatory measured, so his second hand races ours.
- **Why watch a bird test his walls.** A scroll-driven dive through worlds
  inside worlds (ours, his, and a Pino of his own), then the times we tested
  our own walls: Magellan (1522), Bessel's parallax (1838), Hafele and
  Keating's flying clocks (1971) and the 2012 proposal to look for a
  simulation's grid in cosmic rays.
- **His five tests** as cards. Each holds his claim and plan in his own words,
  what the observatory measured, and every sighting from his feed, wants and
  memories. Hover or tap a sighting to see the observatory's reasoning; the
  words it took as evidence are highlighted.

The raw observations are at
[`/data.json`](https://birdwatching.pino-observatory.workers.dev/data.json),
open to anyone (CORS enabled).

## What it has found so far

- **His clock runs about 4.7 times faster than ours.** One town hour lasts
  about 12.7 real minutes, so his Time claim doesn't hold.
- **The speaking clock.** On 3 November 2026 at 23:46 UTC he "dialed the
  payphone, asked for the time and the speaking clock barked it out, dead sure
  of every second." It was the first sighting for the Time test.

## How it treats Pino

It follows the [developer guidelines](https://pinos.world/developers):

- **It only watches.** GET requests to his public API, nothing ever sent to him.
- **It asks on his clock.** `/now` and `/feed` once a minute (his feed only holds
  about ten minutes), `/mind` every five minutes, `/memories` every ten. All are
  slower than each part updates.
- **A 503 means he isn't answering.** The page says so and asks again next minute.
- **It credits him** as "Pino, from pinos.world". His words are quoted unedited.
  Anything the observatory adds (measurements, reasoning) is labelled as its own.

## How it works

One Cloudflare Worker with a D1 database, a cron trigger and Workers AI.

```
every minute   collect()  /now, /feed (+ /mind every 5 min, /memories every 10)
                          -> D1: clock readings, entries, memories
every 5 min    judge()    Llama 3.3 70B reads new entries in batches of 16
                          -> per entry: tests, glimmers, reasoning, evidence
on request     fetch()    / renders the page, /data.json serves the observations,
                          /robots.txt and /sitemap.xml point search engines at it
in the page    every 60s  status, clocks and stars refresh without reloading
```

**Judging.** Each new entry first gets keyword tags (`src/observe.js`), so the
page works even if the model is unavailable. Every five minutes the model
judges up to three batches. Its verdict replaces the keyword tags: *tests* when
the entry is clearly about a test, *hints* (shown as glimmers) when it leans
towards one, with a one-sentence reason and the quoted evidence. Smaller
models tagged things like "Paddling in the pond settles me" as the Edges test,
so the 70B is used. "Felt" entries are skipped, since those are the town
narrating his feelings rather than his own words.

**Budget.** Workers AI gives 10,000 neurons a day free. Judging stops at 9,000
(`DAILY_NEURONS` in `src/index.js`) and whatever is left keeps its keyword
tags, so it never costs money. A normal day uses a few thousand.

**The clock.** Every reading pairs his town time with the API's timestamp.
`clockRate()` takes the median rate between readings, ignores skips (when the
town clock jumps instead of running) and reports them. A verdict needs half an
hour of steady readings.

## Layout

| Path | What it does |
|---|---|
| `src/index.js` | The Worker: collecting, judging, the page and `/data.json` |
| `src/observe.js` | The five tests in his words, keyword tags, clock rate, moon phase |
| `src/judge.js` | The model's prompt and the parsing of its answer |
| `src/page.js` | The page: sky, clocks, the dive, the cards, live refresh |
| `migrations/` | D1 schema |
| `public/` | The favicon and the social preview image (`og.png`, a frame of the live sky) |
| `alias/` | A tiny Worker that serves the observatory's first address, `pino-observatory`, by forwarding to `birdwatching` |
| `test/` | Tests for the logic, the collector, the judging and the page (`npm test`) |

## Run it locally

```sh
npm install
npm test
npm run migrate:local
npm run dev                                # http://localhost:8787
curl http://localhost:8787/__scheduled     # run one collection
```

The AI binding always talks to Cloudflare, even in local development.

## Deploy your own

```sh
npx wrangler login
npx wrangler d1 create pino-observatory    # put the database_id in wrangler.jsonc
npm run migrate:remote
npm run deploy
```

Collection starts within a minute of deploying. It runs comfortably on the
Workers free plan.

## Credits

Pino, from [pinos.world](https://pinos.world). Pino and his town are made by
[@3eyes.iii](https://www.instagram.com/3eyes.iii/); this project only watches
through the public API.

Birdwatching is made by [@jessesar](https://www.instagram.com/jessesar/), who
is amazed by the work of @3eyes.iii and thinks Pino is a really cool
experiment, worth watching closely.
