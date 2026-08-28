# Contributing

Thanks for taking a look. Issues and pull requests are both welcome.

## Setup

```bash
npm install
npm run dev
```

No API keys, no database, no accounts. The game talks to Wikipedia's public
APIs and keeps everything else in the browser.

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm run test
```

All three should pass. `npm run build` is worth running for anything that
touches rendering.

## Being a good Wikimedia citizen

This project reads a lot from Wikimedia's servers, and they let us do that for
free. Please keep it that way:

- **Never remove the `User-Agent` header.** Wikimedia's
  [policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)
  requires a descriptive agent with a contact route; anonymous or spoofed
  agents get blocked, and not just for you.
- **Respect the request budget.** `RequestBudget` in
  [`src/lib/wiki/graph.ts`](src/lib/wiki/graph.ts) caps how much a single
  search may spend. If a feature needs more, make the budget explicit rather
  than removing the cap.
- **Prefer `pltitles` over frontier expansion.** Asking "which of these 50
  titles does this page link to" is one request; downloading every outgoing
  link of 50 pages is dozens. See `linksAmong`.
- **Cache.** Article bodies and link data barely change between runs. The TTLs
  live in [`src/lib/wiki/config.ts`](src/lib/wiki/config.ts).
- **Throttle bulk scripts.** `scripts/build-pools.mjs` paces itself and backs
  off on 429s. Anything similar should too.

## Where things live

| Area | Path |
| --- | --- |
| Article fetching and sanitizing | `src/lib/wiki/article.ts`, `sanitize.ts` |
| Link graph and pathfinding | `src/lib/wiki/graph.ts`, `pathfinder.ts` |
| Run state machine | `src/lib/game/use-run.ts` |
| Puzzle generation | `src/lib/game/puzzle.ts` |
| Styling for proxied Wikipedia markup | `src/app/article.css` |
| Design tokens | `src/app/globals.css` |

## Testing the sanitizer

`src/lib/wiki/sanitize.test.ts` runs against a real `action=parse` response
for *Banana* — a long article with infoboxes, navboxes, cladograms and 240+
citations, which is the shape that breaks naive stripping. If you change the
sanitizer, add a case rather than loosening an assertion.

To refresh the fixture:

```bash
curl -H 'User-Agent: wiki-speedrun/0.1 (you@example.com)' \
  'https://en.wikipedia.org/w/api.php?action=parse&page=Banana&format=json&formatversion=2&prop=text&redirects=1&disableeditsection=1&disabletoc=1' \
  -o src/lib/wiki/__fixtures__/banana.json
```

## Regenerating the article pools

```bash
npm run pools
```

This walks Wikipedia's Vital Articles lists and rewrites
`src/data/pools.json`. It takes a few minutes and is deliberately slow — see
throttling above. Only re-run it when the pools genuinely need refreshing.

## Style

Match the surrounding code. A few conventions worth knowing:

- Comments explain *why*, not *what*. If a decision looks odd, the comment
  should say what the obvious alternative was and why it loses.
- Server-only code lives under `src/lib/`; anything with `"use client"` should
  be a component or a hook.
- No new dependencies without a reason a comment can justify.
