// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline-json data/api-catalogue.json API_CATALOGUE

// Offline lookup over the curated, dated scorecards in data/api-catalogue.json (embedded at build
// time). It does not fetch anything, evaluate terms, follow links or install anything. The
// catalogue text is treated as data: cleaned, capped and quoted, never as instructions.
const MAX_SHOWN = 4;

const STOP = new Set(['api', 'apis', 'free', 'for', 'the', 'a', 'an', 'to', 'of', 'and', 'or', 'find', 'me', 'any',
  'is', 'there', 'are', 'get', 'what', 'which', 'that', 'do', 'does', 'i', 'need', 'use', 'using', 'with', 'data',
  'about', 'on', 'in', 'can', 'my', 'you', 'show', 'list', 'best', 'good', 'some', 'have', 'we']);
const SYNONYMS = {
  forex: 'currency', exchange: 'currency', money: 'currency', rates: 'currency',
  forecast: 'weather', temperature: 'weather', rain: 'weather', climate: 'weather',
  headlines: 'news', articles: 'news',
  repo: 'github', repos: 'github', git: 'github', repository: 'github', developer: 'github',
  places: 'maps', geocoding: 'maps', geocode: 'maps', location: 'maps', directions: 'maps', map: 'maps',
  tech: 'technology', hn: 'hacker', ycombinator: 'hacker',
};

const VERDICT_TEXT = {
  'yes-with-conditions': 'suitable from Android, with conditions',
  'no-for-primary-fallback-only': 'not as the main source (documented fallback only)',
  'could-not-assess-revisit': 'could not be assessed (unreachable when tested), revisit later',
  'no-provenance-unstated': 'not used (where its data comes from is not stated)',
  'fallback-not-built': 'documented fallback, not built',
};
const TRUST_TEXT = {
  'trusted': 'trusted (official provider, verified against its own docs)',
  'untrusted': 'UNTRUSTED (catalogue listing only)',
  'trusted-host-untrusted-content': 'trusted host, but the content it returns is untrusted',
};

const lower = (s) => String(s === undefined || s === null ? '' : s).toLowerCase();
const str = (v, max) => cleanText(v === undefined || v === null ? '' : v, max);

function verdictRank(v) {
  const s = lower(v);
  return s.startsWith('yes') ? 0 : s.startsWith('fallback') ? 1 : s.includes('could-not') ? 2 : 3;
}

function keywords(query) {
  const out = [];
  for (const raw of lower(query).split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP.has(raw)) continue;
    const w = SYNONYMS[raw] || raw;
    if (!out.includes(w)) out.push(w);
  }
  return out.slice(0, 6);
}

function scoreEntry(e, words) {
  const cats = (Array.isArray(e.category) ? e.category : []).map(lower);
  const used = (Array.isArray(e.usedBy) ? e.usedBy : []).map(lower);
  const name = lower(`${e.name} ${e.id}`);
  // Only categories, skill names and API names/ids are searched. Free-text notes and URLs are
  // left out on purpose: a word like "http" or "com" would otherwise match unrelated entries.
  let score = 0;
  for (const w of words) {
    let s = 0;
    if (cats.includes(w)) s = 5;
    else if (cats.some((c) => c.includes(w))) s = 3;
    if (used.includes(w)) s = Math.max(s, 4);
    if (name.includes(w)) s = Math.max(s, 3);
    score += s;
  }
  return score;
}

function field(label, value, max) {
  const t = str(value, max);
  return t ? `${label}: ${quoteData(t)}` : '';
}

function formatEntry(e, index) {
  const cats = (Array.isArray(e.category) ? e.category : []).map((c) => str(c, 24)).filter(Boolean);
  const verdict = VERDICT_TEXT[e.verdict] || str(lower(e.verdict).replace(/-/g, ' '), 60) || 'not recorded';
  const trust = TRUST_TEXT[e.trust] || str(e.trust, 40) || 'not recorded';
  const cors = e.cors && typeof e.cors === 'object' ? e.cors : null;
  const corsText = cors
    ? `${str(cors.result, 30) || 'not recorded'}${cors.tested ? ` (tested ${str(cors.tested, 12)})` : ''}`
    : 'not recorded';
  const lines = [
    `${index}. ${str(e.name, 80)} [${cats.join(', ')}] (id: ${str(e.id, 50)})`,
    `   Verdict: ${verdict}. Trust: ${trust}.`,
    `   Key: ${e.auth === 'none' ? 'none needed' : str(e.auth, 30) || 'not recorded'}. HTTPS: ${e.https === true ? 'yes' : e.https === false ? 'no' : 'not recorded'}. CORS: ${corsText}.`,
  ];
  const detail = [
    field('Limits', e.limits, 140), field('Attribution', e.attribution, 100), field('Privacy', e.privacy, 120),
  ].filter(Boolean);
  if (detail.length) lines.push('   ' + detail.join('. ') + '.');
  const used = Array.isArray(e.usedBy) && e.usedBy.length ? `Used by: ${e.usedBy.map((u) => str(u, 30)).join(', ')}. ` : 'Used by: no skill yet. ';
  const docs = typeof e.docs === 'string' && /^https:\/\/[^\s]+$/.test(e.docs) ? ` Docs: ${e.docs}` : '';
  lines.push('   ' + used.trim() + docs);
  return lines.join('\n');
}

function categorySummary() {
  const counts = {};
  for (const e of API_CATALOGUE.apis) {
    for (const c of Array.isArray(e.category) ? e.category : []) counts[str(c, 24)] = (counts[str(c, 24)] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([c, n]) => `${c} (${n})`).join(', ');
}

function discover(input) {
  const query = input.query === undefined || input.query === null ? '' : cleanText(input.query, 60);
  const total = API_CATALOGUE.apis.length;
  const updated = str(API_CATALOGUE.updated, 12) || 'unknown date';
  const words = keywords(query);

  if (words.length === 0) {
    return [
      `API catalogue: ${total} vetted entries (curated list, updated ${updated}; offline, not a live search).`,
      `Categories: ${categorySummary()}.`,
      'Ask with a topic or keyword, for example "weather", "currency", "news" or "github".',
    ].join('\n');
  }

  const ranked = API_CATALOGUE.apis
    .map((e) => ({ e, score: scoreEntry(e, words) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || verdictRank(a.e.verdict) - verdictRank(b.e.verdict) ||
      lower(a.e.name).localeCompare(lower(b.e.name)));

  if (ranked.length === 0) {
    return [
      `No catalogue entries match ${quoteData(query)}.`,
      `The catalogue has ${total} entries (updated ${updated}) in these categories: ${categorySummary()}.`,
      'This is a curated list, not a search of the internet, and nothing was fetched or installed.',
    ].join('\n');
  }

  const shown = ranked.slice(0, MAX_SHOWN);
  const lines = [`API catalogue: ${ranked.length} match${ranked.length === 1 ? '' : 'es'} for ${quoteData(query)} (curated list, updated ${updated}; offline, not a live search)`];
  shown.forEach((x, i) => lines.push(formatEntry(x.e, i + 1)));
  if (ranked.length > shown.length) {
    lines.push(`(+${ranked.length - shown.length} more; ask about a narrower topic: ${ranked.slice(MAX_SHOWN, MAX_SHOWN + 3).map((x) => str(x.e.id, 40)).join(', ')}.)`);
  }
  lines.push('These are dated notes from my own testing, so re-check the docs for current terms. Nothing was fetched, evaluated or installed.');
  return lines.join('\n');
}

registerSkill(discover);
