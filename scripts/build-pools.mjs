/**
 * Regenerates src/data/pools.json — the curated article pools the puzzle
 * generator draws from.
 *
 * Why a build step rather than a runtime fetch: `list=random` is unusable as a
 * puzzle source (it overwhelmingly returns stubs like school articles and
 * individual sporting events, which have almost no outgoing links and are
 * therefore unwinnable). Wikipedia's own Vital Articles project is a
 * hand-curated list of the subjects an encyclopedia should cover, ranked by
 * importance — exactly the "broadly known and well connected" property a good
 * puzzle needs. Baking it in also keeps game start instant and offline-safe.
 *
 * Usage: node scripts/build-pools.mjs
 */
import { writeFileSync } from "node:fs";

const UA = "wiki-speedrun/0.1 (https://github.com/jaiamin/wiki-speedrun)";
const API = "https://en.wikipedia.org/w/api.php";

/** Delay between requests. Keeps this well under Wikimedia's rate limits. */
const THROTTLE_MS = 120;

/** Level 3 is ~1,000 articles; Level 4 is ~10,000 across topic subpages. */
const SOURCES = {
  core: ["Wikipedia:Vital articles/Level 3"],
  broad: [
    "Wikipedia:Vital articles/Level 4/People",
    "Wikipedia:Vital articles/Level 4/History",
    "Wikipedia:Vital articles/Level 4/Geography",
    "Wikipedia:Vital articles/Level 4/Arts",
    "Wikipedia:Vital articles/Level 4/Philosophy and religion",
    "Wikipedia:Vital articles/Level 4/Everyday life",
    "Wikipedia:Vital articles/Level 4/Society and social sciences",
    "Wikipedia:Vital articles/Level 4/Biology and health sciences",
    "Wikipedia:Vital articles/Level 4/Physical sciences",
    "Wikipedia:Vital articles/Level 4/Technology",
    "Wikipedia:Vital articles/Level 4/Mathematics",
  ],
};

/**
 * Titles that are legal articles but poor puzzle endpoints: navigational list
 * pages, bare years, and the maintenance links the vital-article pages carry
 * alongside their actual content.
 */
const REJECT =
  /^(list of|lists of|index of|outline of|glossary of|timeline of|bibliography of)\b|^\d{1,4}(s| BC)?$|\(disambiguation\)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wikimedia expects bulk readers to go serially and back off when asked.
 * This script issues thousands of requests, so it paces itself and retries
 * 429s with exponential backoff rather than hammering through them.
 */
async function api(params, attempt = 0) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({
    format: "json",
    formatversion: 2,
    ...params,
  })) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, { headers: { "User-Agent": UA } });

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 6) throw new Error(`${res.status} after ${attempt} retries`);
    const wait = Math.min(60_000, 2000 * 2 ** attempt);
    process.stdout.write(`\n  rate limited, waiting ${wait / 1000}s...\n`);
    await sleep(wait);
    return api(params, attempt + 1);
  }

  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await sleep(THROTTLE_MS);
  return res.json();
}

async function linksOn(title) {
  const found = new Set();
  let cont;
  do {
    const body = await api({
      action: "query",
      titles: title,
      prop: "links",
      plnamespace: 0,
      pllimit: "max",
      ...cont,
    });
    const page = body.query?.pages?.[0];
    if (!page || page.missing) {
      console.warn(`  ! missing: ${title}`);
      return [];
    }
    for (const l of page.links ?? []) found.add(l.title);
    cont = body.continue;
  } while (cont);
  return [...found];
}

/**
 * Keep only titles that are real, in the main namespace, and not redirects —
 * a redirect endpoint would make win detection ambiguous.
 */
async function verify(titles) {
  const good = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const body = await api({
      action: "query",
      titles: batch.join("|"),
      prop: "info",
    });
    for (const page of body.query?.pages ?? []) {
      if (page.missing || page.redirect || page.ns !== 0) continue;
      good.push(page.title);
    }
    process.stdout.write(`\r  verified ${Math.min(i + 50, titles.length)}/${titles.length}`);
  }
  process.stdout.write("\n");
  return good;
}

async function collect(pages) {
  const all = new Set();
  for (const page of pages) {
    const links = await linksOn(page);
    console.log(`  ${page}: ${links.length}`);
    for (const l of links) if (!REJECT.test(l)) all.add(l);
  }
  return [...all];
}

console.log("Collecting core pool (Vital Level 3)...");
const coreRaw = await collect(SOURCES.core);
console.log("Collecting broad pool (Vital Level 4)...");
const broadRaw = await collect(SOURCES.broad);

console.log("Verifying core...");
const core = (await verify(coreRaw)).sort();
console.log("Verifying broad...");
const coreSet = new Set(core);
const broad = (await verify(broadRaw)).filter((t) => !coreSet.has(t)).sort();

const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: "Wikipedia:Vital articles (CC BY-SA 4.0)",
  core,
  broad,
};

writeFileSync("src/data/pools.json", JSON.stringify(output, null, 2) + "\n");
console.log(`\nWrote src/data/pools.json — core=${core.length} broad=${broad.length}`);
