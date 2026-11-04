// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline-json data/mandarin.json MANDARIN

// Offline Mandarin lessons for a beginner. All Chinese content comes from data/mandarin.json
// (embedded at build time), never from the model's memory. Pinyin is stored with tone numbers and
// turned into tone marks here, so a tone mark cannot be mistyped in the data. No audio.
const TONE_MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
const TONE_NAMES = ['first tone (high, level)', 'second tone (rising)', 'third tone (dipping)', 'fourth tone (falling)'];
const HAN = /[一-鿿]/;
const TOPIC_IDS = Object.keys(MANDARIN.topics);
const FOOTER = 'Beginner content, not yet reviewed by a native speaker. This skill cannot play audio: for the sounds, listen to a native speaker or a dictionary app.';

const MODES = ['lesson', 'quiz', 'tones', 'mistakes', 'lookup'];
const MODE_ALIASES = {
  learn: 'lesson', teach: 'lesson', vocabulary: 'lesson', vocab: 'lesson', words: 'lesson', phrases: 'lesson',
  practice: 'quiz', test: 'quiz', exercise: 'quiz', exercises: 'quiz', questions: 'quiz',
  pronunciation: 'tones', tone: 'tones', mistake: 'mistakes', errors: 'mistakes',
  search: 'lookup', translate: 'lookup', find: 'lookup', word: 'lookup', dictionary: 'lookup',
};
const TOPIC_ALIASES = {
  greetings: 'introductions', greeting: 'introductions', introduction: 'introductions', intro: 'introductions', hello: 'introductions',
  number: 'numbers', counting: 'numbers', prices: 'numbers', price: 'numbers',
  shop: 'shopping', store: 'shopping', buying: 'shopping',
  food: 'restaurant', eating: 'restaurant', dining: 'restaurant', restaurants: 'restaurant',
  hotels: 'hotel', accommodation: 'hotel',
  direction: 'directions', travel: 'directions', transport: 'directions', navigation: 'directions',
  daily: 'everyday', conversation: 'everyday', chat: 'everyday', general: 'everyday',
};

// ---- Pinyin: tone numbers -> tone marks ----------------------------------------------------------

// "shui3" -> "shuǐ". Mark goes on a, else e, else the o of "ou", else the last vowel.
function markSyllable(body, tone) {
  const s = body.replace(/v/g, 'ü').replace(/V/g, 'Ü');
  if (tone === 5) return s;
  const lc = s.toLowerCase();
  let idx = lc.indexOf('a');
  if (idx < 0) idx = lc.indexOf('e');
  if (idx < 0 && lc.indexOf('ou') >= 0) idx = lc.indexOf('o');
  if (idx < 0) {
    for (let i = lc.length - 1; i >= 0; i--) {
      if ('aeiouü'.indexOf(lc[i]) >= 0) { idx = i; break; }
    }
  }
  if (idx < 0) return s;
  const marked = TONE_MARKS[lc[idx]][tone - 1];
  return s.slice(0, idx) + (s[idx] === lc[idx] ? marked : marked.toUpperCase()) + s.slice(idx + 1);
}

// "cai4dan1" -> "càidān", "xi1an1" -> "xī'ān". Punctuation and spaces pass through unchanged.
// With capitalize, the first letter of each sentence is upper-cased.
function toMarks(py, capitalize) {
  const out = String(py).replace(/([A-Za-z]+)([1-5])/g, (m, body, tone, offset, whole) => {
    const prev = offset > 0 ? whole[offset - 1] : '';
    const apostrophe = /[1-5]/.test(prev) && /^[aoeAOE]/.test(body) ? "'" : '';
    return apostrophe + markSyllable(body, Number(tone));
  });
  return capitalize ? out.replace(/(^|[.!?]\s+)(\S)/g, (m, lead, c) => lead + c.toUpperCase()) : out;
}

function syllables(py) {
  return String(py).match(/[A-Za-z]+[1-5]/g) || [];
}

// ---- Small deterministic random helpers (seeded, so tests can fix the clock) ---------------------

function rng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 4; i++) next();
  return next;
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// ---- Input ------------------------------------------------------------------------------------------

function pick(raw, list, aliases, field) {
  const t = cleanText(raw, 40).toLowerCase();
  const id = list.includes(t) ? t : aliases[t];
  if (!id) throw new SkillError(`Unknown ${field} '${cleanText(raw, 30)}'. Use one of: ${list.join(', ')}.`);
  return id;
}

function isGiven(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

// ---- Formatting ---------------------------------------------------------------------------------------

const fmtWord = (w) => `- ${w.hanzi} ${toMarks(w.py)} — ${w.en}`;
const fmtPhrase = (p) => `- ${p.hanzi} ${toMarks(p.py, true)} — ${p.en}`;

function lessonText(id) {
  const t = MANDARIN.topics[id];
  const lines = [`Mandarin for beginners: ${t.title}`, 'Words:'];
  t.words.forEach((w) => lines.push(fmtWord(w)));
  lines.push('Phrases:');
  t.phrases.forEach((p) => lines.push(fmtPhrase(p)));
  lines.push('Dialogue:');
  t.dialogue.forEach((d) => {
    lines.push(`${d.who}: ${d.hanzi}`);
    lines.push(`   ${toMarks(d.py, true)} — ${d.en}`);
  });
  lines.push(`Tip: ${t.tip}`);
  lines.push('Ask for "tones" for help with the tone marks, "quiz" to practise, or "mistakes" for common beginner errors.');
  lines.push(FOOTER);
  return lines.join('\n');
}

function quizText(topicId, nowMs) {
  const rand = rng(nowMs);
  const ids = topicId ? [topicId] : TOPIC_IDS;
  const words = [];
  const phrases = [];
  ids.forEach((id) => {
    MANDARIN.topics[id].words.forEach((w) => words.push(w));
    MANDARIN.topics[id].phrases.forEach((p) => phrases.push(p));
  });
  const w = shuffle(words, rand);
  const p = shuffle(phrases, rand);

  // Tone question: show one syllable with its mark and ask which tone it carries.
  let toneQ = null;
  for (let i = 2; i < w.length && !toneQ; i++) {
    const sylls = syllables(w[i].py).map((s, n) => ({ s, n })).filter((x) => !/5$/.test(x.s));
    if (sylls.length === 0) continue;
    const choice = sylls[Math.floor(rand() * sylls.length)];
    const body = choice.s.slice(0, -1);
    const tone = Number(choice.s.slice(-1));
    const ch = Array.from(w[i].hanzi)[choice.n];
    toneQ = {
      q: `Which tone is the syllable “${markSyllable(body, tone)}” (the character ${ch})?`,
      a: TONE_NAMES[tone - 1],
    };
  }

  const qs = [
    { q: `What does ${w[0].hanzi} (${toMarks(w[0].py)}) mean?`, a: w[0].en },
    { q: `How do you say “${w[1].en}” in Chinese? (characters or pinyin)`, a: `${w[1].hanzi} ${toMarks(w[1].py)}` },
    toneQ,
    { q: `What does this mean in English? ${p[0].hanzi}`, a: `${p[0].en} (${toMarks(p[0].py, true)})` },
    { q: `What does this mean in English? ${p[1].hanzi}`, a: `${p[1].en} (${toMarks(p[1].py, true)})` },
  ];
  const title = topicId ? MANDARIN.topics[topicId].title : 'all topics';
  const lines = [
    `Mandarin quiz: ${title} (5 questions)`,
    'For the tutor: ask one question at a time, wait for the learner to answer, then check it against the answers below. Do not show the answers first.',
  ];
  qs.forEach((x, i) => lines.push(`${i + 1}. ${x.q}`));
  lines.push('Answers (for checking only):');
  qs.forEach((x, i) => lines.push(`${i + 1}. ${x.a}`));
  lines.push(FOOTER);
  return lines.join('\n');
}

function tonesText() {
  const T = MANDARIN.tones;
  const lines = ['Mandarin tones: the four tones and the neutral tone, on the syllable ma:'];
  T.marks.forEach((m) => lines.push(`- ${toMarks(m.py)} ${m.hanzi} (${m.en}): ${m.name}, ${m.shape}`));
  lines.push('Tone changes in speech:');
  T.changes.forEach((c) => lines.push(`- ${c}`));
  lines.push('Practise these pairs (they differ only in tone):');
  T.pairs.forEach((x) => lines.push(`- ${x.a.hanzi} ${toMarks(x.a.py)} (${x.a.en}) / ${x.b.hanzi} ${toMarks(x.b.py)} (${x.b.en})`));
  lines.push('Sounds that trip up English speakers (approximate comparisons only):');
  T.sounds.forEach((s) => lines.push(`- ${s}`));
  lines.push(FOOTER);
  return lines.join('\n');
}

function mistakesText() {
  const lines = ['Common beginner mistakes in Mandarin:'];
  MANDARIN.mistakes.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.title}: ${m.explain}`);
    m.examples.forEach((e) => lines.push(`   ${e.hanzi} ${toMarks(e.py, true)} — ${e.en}`));
  });
  lines.push(FOOTER);
  return lines.join('\n');
}

// ---- Lookup -------------------------------------------------------------------------------------------

// Letters only, lower case, tone marks and numbers removed, ü -> v: "Cài dān", "cai4dan1", "caidan" all match.
function plain(s) {
  return String(s).normalize('NFD').replace(/ü/gi, 'v').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '').toLowerCase();
}

function allEntries() {
  const out = [];
  TOPIC_IDS.forEach((id) => {
    const t = MANDARIN.topics[id];
    t.words.forEach((w) => out.push({ kind: 'word', topic: t.title, hanzi: w.hanzi, py: toMarks(w.py), plain: plain(w.py), en: w.en }));
    t.phrases.forEach((p) => out.push({ kind: 'phrase', topic: t.title, hanzi: p.hanzi, py: toMarks(p.py, true), plain: plain(p.py), en: p.en }));
  });
  return out;
}

function lookupText(rawQuery) {
  const q = cleanText(rawQuery, 60).trim();
  if (q === '') throw new SkillError("Field 'query' is empty.");
  const entries = allEntries();
  const qLower = q.toLowerCase();
  const qPlain = plain(q);
  const wordRe = new RegExp('\\b' + qLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  const scored = [];
  entries.forEach((e) => {
    let s = 0;
    if (HAN.test(q)) {
      if (e.hanzi.replace(/[！？。，]/g, '') === q) s = 5;
      else if (e.hanzi.indexOf(q) >= 0) s = 3;
    } else {
      if (wordRe.test(e.en)) s = Math.max(s, 3);
      else if (e.en.toLowerCase().indexOf(qLower) >= 0) s = Math.max(s, 1);
      if (qPlain.length >= 2) {
        if (e.plain === qPlain) s = Math.max(s, 4);
        else if (e.plain.indexOf(qPlain) >= 0) s = Math.max(s, 2);
      }
    }
    if (s > 0) scored.push({ e, s });
  });
  scored.sort((a, b) => b.s - a.s || (a.e.kind === b.e.kind ? 0 : a.e.kind === 'word' ? -1 : 1) || a.e.hanzi.length - b.e.hanzi.length);
  if (scored.length === 0) {
    const nWords = entries.filter((e) => e.kind === 'word').length;
    return [
      `No entry for ${quoteData(q)} in this beginner list (${nWords} words and ${entries.length - nWords} phrases in ${TOPIC_IDS.length} topics).`,
      `I do not make up translations. Try another word, a topic lesson (${TOPIC_IDS.join(', ')}), or a dictionary app.`,
      FOOTER,
    ].join('\n');
  }
  const shown = scored.slice(0, 6);
  const lines = [`Mandarin lookup: ${quoteData(q)} (${scored.length} match${scored.length === 1 ? '' : 'es'})`];
  shown.forEach((x) => lines.push(`- ${x.e.hanzi} ${x.e.py} — ${x.e.en} [${x.e.topic}; ${x.e.kind}]`));
  if (scored.length > shown.length) lines.push(`(+${scored.length - shown.length} more)`);
  lines.push(FOOTER);
  return lines.join('\n');
}

// ---- Entry point ----------------------------------------------------------------------------------------

function mandarin(input) {
  const mode = isGiven(input.mode) ? pick(input.mode, MODES, MODE_ALIASES, 'mode') : (isGiven(input.query) ? 'lookup' : 'lesson');
  if (mode === 'lookup') {
    if (!isGiven(input.query)) throw new SkillError("Field 'query' is required for lookup: give an English word, pinyin or Chinese characters.");
    return lookupText(input.query);
  }
  if (mode === 'tones') return tonesText();
  if (mode === 'mistakes') return mistakesText();
  const topic = isGiven(input.topic) ? pick(input.topic, TOPIC_IDS, TOPIC_ALIASES, 'topic') : null;
  if (mode === 'quiz') return quizText(topic, Date.now());
  return lessonText(topic || 'introductions');
}

registerSkill(mandarin);
