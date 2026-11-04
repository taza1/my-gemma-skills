// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline shared/format.js
// @inline shared/time.js
// @inline shared/fetch.js

// Publisher RSS feeds cannot be read from the WebView (no CORS), so this skill uses the two
// sources that can (research/api-candidates.md, "news"):
//  - Wikipedia "Portal:Current events" day pages (MediaWiki Action API): volunteer-written
//    summaries that cite the outlet. Text is CC BY-SA 4.0. Dated by the day of the event.
//  - Hacker News via the Algolia HN Search API: technology and AI, exact submission times.
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_PAGE_URL = 'https://en.wikipedia.org/wiki/Portal:Current_events';
const CC_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';
const HN_API = 'https://hn.algolia.com/api/v1/search';
// Wikimedia asks every client for a meaningful User-Agent; browsers send Api-User-Agent instead.
const API_USER_AGENT = 'my-gemma-skills/0.1 (personal AI Edge Gallery skills; __REPO_URL__)';
const TIMEOUT_MS = 10000;

const MAX_WIKI_ITEMS = 8;
const MAX_HN_ITEMS = 5;
const MAX_AI_ITEMS = 6;
const MIN_AI_POINTS = 20;
const MAX_TEXT = 220;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

const TOPICS = {
  general: { label: 'general', wiki: { exclude: ['sport', 'art and culture'], perCategory: 2 } },
  world: { label: 'world', wiki: { include: ['armed conflict', 'international relations', 'politic', 'disaster'], perCategory: 4 } },
  business: { label: 'business', wiki: { include: ['business'], perCategory: 6 } },
  technology: { label: 'technology', wiki: { include: ['science and technology'], perCategory: 4, max: 4 }, hn: 'front_page' },
  ai: { label: 'AI', hn: 'ai' },
};
const TOPIC_ALIASES = {
  international: 'world', global: 'world', politics: 'world',
  finance: 'business', economy: 'business', markets: 'business',
  tech: 'technology', science: 'technology',
  'artificial intelligence': 'ai', 'a.i.': 'ai', llm: 'ai',
  top: 'general', latest: 'general', headlines: 'general', news: 'general',
};
const AI_WORDS = /\b(AI|A\.I\.|LLMs?|GPT\w*|OpenAI|Anthropic|Claude|Gemini|Gemma|Qwen|Llama|DeepSeek|Mistral|neural|machine learning|artificial intelligence|chatbots?|agents?)\b/i;

function parseNewsInput(input) {
  let topic = 'general';
  if (input.topic !== undefined && input.topic !== null && String(input.topic).trim() !== '') {
    const t = cleanText(input.topic, 40).toLowerCase();
    topic = TOPICS[t] ? t : TOPIC_ALIASES[t];
    if (!topic) {
      throw new SkillError(`Unknown topic '${cleanText(input.topic, 30)}'. Use one of: general, world, business, technology, ai.`);
    }
  }
  let days = 2;
  if (input.days !== undefined && input.days !== null && String(input.days).trim() !== '') {
    days = Number(input.days);
    if (days !== 1 && days !== 2) throw new SkillError("Field 'days' must be 1 or 2.");
  }
  return { topic, days };
}

// ---- Wikipedia "Current events" wikitext -> items -------------------------------------------

const SOURCE_LINK = /\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g;

function cleanWiki(s) {
  let t = String(s);
  for (let i = 0; i < 3; i++) t = t.replace(/\{\{[^{}]*\}\}/g, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<ref[^>]*\/>/gi, '')
    .replace(/\[\[(?:File|Image|Category):[^\]]*\]\]/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'{2,3}/g, '');
  return cleanText(t, 400).replace(/\s+([.,;:])/g, '$1');
}

function extractSources(body) {
  const out = [];
  body.replace(SOURCE_LINK, (m, url, label) => {
    const host = /^https?:\/\/(?:www\.)?([^/?#:]+)/i.exec(url);
    const name = cleanWiki(label).replace(/^\(/, '').replace(/\)$/, '').trim();
    if (host && name) out.push({ label: cleanText(name, 50), host: cleanText(host[1], 40) });
    return m;
  });
  return out;
}

// -> { categories: [{ name, items: [{ text, topic, sources }], uncited }] }
// A bullet without a cited source is a topic LABEL when bullets nested under it follow (e.g.
// "2026 Strait of Hormuz crisis"); a sentence-like bullet with no source and nothing below it is
// an uncited claim, which is skipped and counted.
function parseCurrentEvents(wikitext) {
  const categories = [];
  let current = null;
  for (const raw of String(wikitext).split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = /^'''(.+?)'''\s*$/.exec(line);
    if (heading) {
      current = { name: cleanWiki(heading[1]), items: [], uncited: 0, entries: [] };
      categories.push(current);
      continue;
    }
    const bullet = /^(\*+)\s*(.*)$/.exec(line);
    if (!bullet || !current) continue;
    const body = bullet[2];
    current.entries.push({
      depth: bullet[1].length,
      text: cleanWiki(body.replace(SOURCE_LINK, '')),
      sources: extractSources(body),
    });
  }
  for (const cat of categories) {
    const ancestors = [];
    cat.entries.forEach((e, i) => {
      ancestors.length = e.depth - 1;
      const next = cat.entries[i + 1];
      if (e.sources.length === 0) {
        if (next && next.depth > e.depth) ancestors[e.depth - 1] = e.text;
        else if (e.text.length > 40) cat.uncited++;
        return;
      }
      ancestors[e.depth - 1] = '';
      if (!e.text) return;
      cat.items.push({ text: e.text, topic: ancestors.filter(Boolean).pop() || '', sources: e.sources });
    });
    delete cat.entries;
  }
  return { categories };
}

function pageKey(y, m, d) { return `${y}_${MONTHS[m - 1]}_${d}`; }

async function loadWikipedia(nowMs, days, cfg) {
  try {
    const today = dublinDate(nowMs);
    const base = Date.UTC(today.y, today.m - 1, today.d);
    const dates = [];
    for (let i = 0; i <= days; i++) {
      const dt = new Date(base - i * 86400000);
      dates.push({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
    }
    const titles = dates.map((x) => 'Portal:Current_events/' + pageKey(x.y, x.m, x.d));
    const url = `${WIKI_API}?action=query&prop=revisions&rvprop=content&rvslots=main&format=json` +
      `&formatversion=2&origin=*&titles=${encodeURIComponent(titles.join('|'))}`;
    const data = await fetchJson(url, {
      timeoutMs: TIMEOUT_MS, label: 'Wikipedia', headers: { 'Api-User-Agent': API_USER_AGENT },
    });
    if (!data || !data.query || !Array.isArray(data.query.pages)) {
      return { error: 'Wikipedia returned an unexpected response.' };
    }
    const byKey = {};
    for (const p of data.query.pages) {
      const m = p && typeof p.title === 'string' ? /(\d{4}) ([A-Za-z]+) (\d{1,2})$/.exec(p.title) : null;
      if (!m) continue;
      const rev = Array.isArray(p.revisions) && p.revisions[0];
      const content = rev && rev.slots && rev.slots.main ? rev.slots.main.content : '';
      byKey[`${m[1]}_${m[2]}_${m[3]}`] = typeof content === 'string' ? content : '';
    }

    const include = cfg.include || null;
    const exclude = cfg.exclude || [];
    const matches = (name, list) => list.some((w) => name.toLowerCase().includes(w));
    const emptyDays = [];
    let uncited = 0;
    const picked = [];
    for (const x of dates) {
      const label = String(x.d).padStart(2, '0') + '/' + String(x.m).padStart(2, '0');
      const parsed = parseCurrentEvents(byKey[pageKey(x.y, x.m, x.d)] || '');
      for (const cat of parsed.categories) {
        if (include && !matches(cat.name, include)) continue;
        if (matches(cat.name, exclude)) continue;
        uncited += cat.uncited; // only count what this topic would have shown
        for (const item of cat.items.slice(0, cfg.perCategory)) picked.push({ date: label, ...item });
      }
      if (parsed.categories.every((c) => c.items.length === 0)) emptyDays.push(label);
    }
    return { items: picked.slice(0, cfg.max || MAX_WIKI_ITEMS), emptyDays, uncited };
  } catch (e) {
    return { error: e instanceof SkillError ? e.message : 'Wikipedia could not be read.' };
  }
}

// ---- Hacker News ------------------------------------------------------------------------------

function hostOf(url, objectId) {
  const m = typeof url === 'string' ? /^https?:\/\/(?:www\.)?([^/?#:]+)/i.exec(url) : null;
  return m ? cleanText(m[1], 40) : 'news.ycombinator.com';
}

function withCommas(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function loadHn(kind, nowMs, days) {
  try {
    const cutoff = Math.floor(nowMs / 1000) - days * 86400;
    const url = kind === 'ai'
      ? `${HN_API}?query=AI&tags=story&hitsPerPage=30&numericFilters=${encodeURIComponent(`created_at_i>${cutoff},points>${MIN_AI_POINTS}`)}`
      : `${HN_API}?tags=front_page&hitsPerPage=30`;
    const data = await fetchJson(url, { timeoutMs: TIMEOUT_MS, label: 'Hacker News search' });
    if (!data || !Array.isArray(data.hits)) return { error: 'Hacker News search returned an unexpected response.' };
    let tooOld = 0;
    let items = [];
    for (const h of data.hits) {
      if (!h || typeof h.title !== 'string' || !Number.isFinite(h.created_at_i)) continue;
      if (h.created_at_i < cutoff) { tooOld++; continue; }
      items.push({
        title: cleanText(h.title, 140), host: hostOf(h.url), ms: h.created_at_i * 1000,
        points: Number.isFinite(h.points) ? h.points : 0,
        comments: Number.isFinite(h.num_comments) ? h.num_comments : 0,
      });
    }
    if (kind === 'ai') {
      items = items.filter((i) => AI_WORDS.test(i.title)).sort((a, b) => b.points - a.points);
    }
    return { items: items.slice(0, kind === 'ai' ? MAX_AI_ITEMS : MAX_HN_ITEMS), tooOld };
  } catch (e) {
    return { error: e instanceof SkillError ? e.message : 'Hacker News search could not be read.' };
  }
}

// ---- Output -------------------------------------------------------------------------------------

function wikiLines(res, cfg, hours) {
  if (res.error) return [`Wikipedia: unavailable (${res.error})`];
  const lines = [];
  if (res.items.length === 0) {
    lines.push(`Wikipedia: no matching items found for the last ${hours} h.`);
  } else {
    for (const it of res.items) {
      const srcs = it.sources.slice(0, 2).map((s) => `${s.label} (${s.host})`).join('; ');
      const topic = it.topic ? `[${cleanText(it.topic, 40)}] ` : '';
      lines.push(`- ${it.date} ${topic}${quoteData(truncate(it.text, MAX_TEXT))} — ${srcs}`);
    }
  }
  if (res.emptyDays.length > 0) lines.push(`(No entries yet on Wikipedia for: ${res.emptyDays.join(', ')}.)`);
  if (res.uncited > 0) {
    lines.push(`(${res.uncited} entr${res.uncited === 1 ? 'y' : 'ies'} without a cited source skipped.)`);
  }
  return lines;
}

function hnLines(res, kind, hours) {
  if (res.error) return [`Hacker News: unavailable (${res.error})`];
  const lines = [kind === 'ai' ? 'Hacker News (AI stories, by points):' : 'Hacker News front page:'];
  if (res.items.length === 0) {
    lines.push(`- none found in the last ${hours} h.`);
  } else {
    for (const it of res.items) {
      lines.push(`- ${formatInstant(it.ms)} ${quoteData(it.title)} — ${it.host}, ${withCommas(it.points)} points, ${withCommas(it.comments)} comments`);
    }
  }
  if (res.tooOld > 0) lines.push(`(${res.tooOld} older than ${hours} h skipped.)`);
  return lines;
}

async function news(input) {
  const { topic, days } = parseNewsInput(input);
  const cfg = TOPICS[topic];
  const nowMs = Date.now();
  const hours = days * 24;

  const [wiki, hn] = await Promise.all([
    cfg.wiki ? loadWikipedia(nowMs, days, cfg.wiki) : Promise.resolve(null),
    cfg.hn ? loadHn(cfg.hn, nowMs, days) : Promise.resolve(null),
  ]);
  const parts = [wiki, hn].filter(Boolean);
  if (parts.every((p) => p.error)) {
    throw new SkillError(parts.map((p) => p.error).join(' '));
  }

  const lines = [`News: ${cfg.label} (last ${hours} h)`];
  if (wiki) lines.push(...wikiLines(wiki, cfg, hours));
  if (hn) lines.push(...hnLines(hn, cfg.hn, hours));

  const notes = [];
  if (wiki && !wiki.error) {
    notes.push('Wikipedia items are volunteer-written summaries citing the outlet shown and are dated by the day of the event, not the outlet\'s own headline or publication time.' +
      (topic === 'general' ? ' Sports and arts are not included.' : ''));
  }
  if (hn && !hn.error) notes.push('Hacker News titles are chosen by whoever submitted the story.');
  lines.push(...notes);
  const credits = [];
  if (wiki && !wiki.error) {
    credits.push(`Wikipedia contributors, "Portal:Current events" (${WIKI_PAGE_URL}), CC BY-SA 4.0 (${CC_URL}); text shortened`);
  }
  if (hn && !hn.error) credits.push('Hacker News via Algolia HN Search');
  lines.push(`Sources: ${credits.join('; ')}. Retrieved ${formatInstant(nowMs)} (${HOME_TZ}).`);
  return lines.join('\n');
}

registerSkill(news);
