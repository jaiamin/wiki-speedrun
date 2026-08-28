# Wiki Speedrun

Race from one Wikipedia article to another using only the links on the page.
Two articles are drawn, a clock starts when the first page loads, and the run
ends the instant you land on the target.

Think GeoGuessr, but the map is Wikipedia.

```
    CHINA        · · · ? · · ·        DEW
  Country in East Asia          Droplets of water
```

## Features

- **Four difficulties.** Endpoints are drawn from Wikipedia's own
  [Vital Articles](https://en.wikipedia.org/wiki/Wikipedia:Vital_articles)
  lists — ~1,000 core subjects for warm-ups, ~9,000 broader ones for deep
  cuts, and true random for Chaos.
- **Daily challenge.** Everyone gets the same pairing each day, derived from
  the date rather than stored, so it works with no database.
- **Custom runs.** Pick both endpoints yourself with typeahead search.
- **Splits.** Every article you land on is a timed segment. The results
  screen shows the whole run as a split table, with the slowest leg marked.
- **Par.** After the run, your route is scored against the shortest path that
  actually existed, computed live from Wikipedia's link graph.
- **No Ctrl+F.** The classic wikiracing rule, enforced.
- **Local history.** Runs and personal bests are kept in your browser. No
  account, no server, no tracking.

## Design

Two pages: pick a matchup, then run it. The pairing lives in the URL
(`/play?start=…&target=…`), so a run is shareable and survives a refresh.

Everything on the home page sits on one alignment — a fixed label column, then
content, rows separated by hairlines. The pairing, the settings, the rules and
the run history all use it, which is what holds the page together without
putting anything in a card. During a run the clock, target and trail live in a
fixed column on the right, and the article takes the whole of the rest.

The interface is monochrome on purpose. The only colour anywhere is the colour
of a hyperlink — Wikipedia's own unvisited blue and visited purple — because
links are what the game is played with, and reserving colour for the mechanic
keeps the article the most saturated thing on screen. Emphasis elsewhere comes
from weight and contrast, which is why there is exactly one black button per
screen.

Three typefaces, three jobs: Schibsted Grotesk for the interface, Source Serif
for the article (it is quoted content, not our own UI, and the shift in voice
is deliberate), and IBM Plex Mono for every number, which is what makes the
clock read as instrumentation.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. There is nothing else to configure — the game
talks directly to Wikipedia's public APIs and stores everything else in your
browser.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `WIKI_USER_AGENT` | a project-identifying string | Sent on every Wikimedia request. **Set this to your own contact if you deploy publicly** — it is [required by Wikimedia policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy). |
| `NEXT_PUBLIC_WIKI_LANG` | `en` | Wikipedia language edition. Other editions work, but the bundled article pools are English. |

Copy `.env.example` to `.env.local` to override either.

## How it works

### Serving the article

Wikipedia sends `x-frame-options: SAMEORIGIN`, so an iframe is impossible —
and even if it were not, an iframe offers no way to intercept a click and stop
the clock. So articles are proxied: fetched through the MediaWiki
`action=parse` API, sanitized server-side, and rendered into the page.

Sanitizing does four things:

1. **Strips the unplayable.** Citation markers, reference lists, edit links,
   maintenance banners and `<script>`/`<style>` blocks all go. A typical
   article drops from ~520KB to ~175KB — about a 67% cut.
2. **Rewrites links.** Every article link becomes an inert anchor tagged with
   `data-wiki-title`; one delegated listener turns clicks into moves. Links to
   files, categories, `Special:Search` and other non-article namespaces are
   unwrapped to plain text so they are visibly not a move.
3. **Resolves redirects.** Clicking "USA" has to win on "United States", so
   the canonical title is resolved server-side and everything downstream
   compares against that.
4. **Hands over the styling.** Removing TemplateStyles means infoboxes,
   navboxes and thumbnails are restyled from scratch in
   [`src/app/article.css`](src/app/article.css), so the article looks like part
   of this game rather than a different product.

Navboxes are deliberately **kept**. They are part of how wikiracing is
actually played, and the pathfinder searches the same link graph they belong
to — removing them would let the route we show a player run through a link
they never had.

### Finding the shortest path

Par comes from a **bidirectional breadth-first search** over Wikipedia's live
link graph. Searching from both ends matters: the frontier at
depth *d* grows roughly like *b^d*, so two searches of depth *d/2* cost
dramatically less than one of depth *d*.

Level 1 is expanded exhaustively in both directions — every page the start
links to (`prop=links`), and every page that links to the target
(`prop=linkshere`). That catches every route of one or two clicks.

Depth 3 is where a naive implementation falls over. Downloading every outgoing
link of a 250-page frontier means tens of thousands of links and hundreds of
requests. Instead the search uses **`pltitles`**, which asks MediaWiki *which
of these specific titles does this page link to* and returns only the edges
that exist. Titles and `pltitles` are each capped at 50, so one request tests
a 50×50 block — 2,500 candidate edges per round trip.

The difference is not marginal:

| | Naive expansion | With `pltitles` |
| --- | --- | --- |
| `Taco → Quantum mechanics` | not found in 60 requests | **3 clicks, 25 requests, 4.2s** |

A worked set of results:

```
Banana        → Nuclear fission     2 clicks   5 req   0.7s
Skateboarding → Byzantine Empire    2 clicks  30 req   3.1s
Taco          → Quantum mechanics   3 clicks  25 req   4.2s
Origami       → Fidel Castro        3 clicks  25 req   4.3s
```

**On the optimality guarantee.** If level 1 completed in both directions and
the two sets do not intersect, then no route of two clicks or fewer can exist
— so any three-click route found afterwards is genuinely shortest, regardless
of how it was found. When a cap truncates level 1 (targets like *United
States* have hundreds of thousands of inbound links) the search still returns
a working route, but reports `optimal: false` rather than overclaiming.

### Picking the puzzle

`list=random` is unusable as a puzzle source. It overwhelmingly returns stubs
— school articles, individual sporting events, taxonomic entries — with almost
no outgoing links, which makes for an unwinnable run. Real samples from one
call: *Zimuto High School (Zimbabwe)*, *Swimming at the 2024 European Aquatics
Championships – Women's 1500 metre freestyle*.

So endpoints come from Vital Articles instead, baked into `src/data/pools.json`
by `npm run pools`. Curating at build time keeps game start instant and means
contributors can tune the pools by editing a file.

Chaos mode still uses `list=random`, but samples 30 candidates and keeps only
those with enough outgoing links to be playable.

## Strategy

If you want to get faster:

- **Climb, then descend.** Most articles are within two clicks of a big hub —
  a country, a century, a discipline. Getting to *France* or *World War II* is
  usually easier than getting to the target directly, and hubs link everywhere.
- **Geography and time are the great connectors.** Almost everything on
  Wikipedia has a place and a date, and both are linked. A person → their
  country → anything.
- **Read the first sentence.** It is nearly always the densest link in the
  article and states the subject's category, which is the fastest way up.
- **The infobox is a shortcut.** Nationality, field, era, parent topic — all
  one click, no scrolling.
- **Think backwards.** Ask what kinds of page would link *to* the target, then
  aim for one of those. This is exactly what the pathfinder does.
- **See also is underrated.** It is a hand-curated list of adjacent topics.

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── article/[title]/   sanitized article HTML
│   │   ├── path/              bidirectional BFS (par)
│   │   ├── puzzle/            puzzle + daily generation
│   │   ├── search/            typeahead
│   │   └── summary/[title]/   blurb and thumbnail
│   ├── play/                  the run (pairing comes from the URL)
│   ├── article.css            styling for proxied Wikipedia markup
│   └── globals.css            design tokens
├── components/
│   ├── game/                  article view, run panel, splits, results
│   ├── home/                  matchup picker, rules, run history
│   └── ui/                    button, segmented control
├── data/pools.json            curated endpoint pools (generated)
└── lib/
    ├── game/                  run state machine, scoring, storage
    └── wiki/                  API client, sanitizer, link graph, pathfinder
```

## Roadmap

The pieces below are deliberately shaped so they are additions rather than
rewrites.

- **Hosted leaderboards.** `RunRecord` in
  [`src/lib/game/types.ts`](src/lib/game/types.ts) is already the shape a
  leaderboard row wants, and the daily challenge is derived from a date seed,
  so daily boards need only a table and an insert. Server-side validation of a
  submitted trail is the real work — each consecutive pair must be a genuine
  edge, which `linksAmong` can already check in one request.
- **Precomputed link graph.** Live search is capped at depth 3. A precomputed
  graph from the Wikipedia dumps (the approach
  [Six Degrees of Wikipedia](https://www.sixdegreesofwikipedia.com/) takes)
  would make arbitrary-depth search instant and exact.
- **Head-to-head races.** Same pairing, several players, live splits.
- **Sprint mode.** Fixed article count instead of a fixed target.
- **Other language editions.** Mostly a matter of generating pools per wiki.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and pull requests welcome.

## Licence

MIT — see [LICENSE](LICENSE).

Article content comes from Wikipedia and is licensed
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This project
is not affiliated with or endorsed by the Wikimedia Foundation.
