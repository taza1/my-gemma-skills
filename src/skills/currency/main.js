// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline shared/format.js
// @inline shared/time.js
// @inline shared/fetch.js

// Provider (research/api-candidates.md): ExchangeRate-API open endpoint. Keyless, CORS *,
// updated once a day, rate limited (HTTP 429, lifts after 20 min), attribution required,
// rates are informational only. Only the base currency code leaves the phone.
const RATES_URL = 'https://open.er-api.com/v6/latest/';
const ATTRIBUTION = 'Rates By Exchange Rate API (https://www.exchangerate-api.com)';
const TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 60 * 60 * 1000; // provider asks for at most ~1 request per hour per IP
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;
const DEFAULT_CURRENCY = 'EUR';

const NAMES = {
  euro: 'EUR', euros: 'EUR', '€': 'EUR',
  dollar: 'USD', dollars: 'USD', 'us dollar': 'USD', 'us dollars': 'USD', 'american dollar': 'USD', $: 'USD',
  pound: 'GBP', pounds: 'GBP', sterling: 'GBP', 'pound sterling': 'GBP', 'british pound': 'GBP', '£': 'GBP',
  yen: 'JPY', '¥': 'JPY', 'japanese yen': 'JPY',
  yuan: 'CNY', renminbi: 'CNY', rmb: 'CNY',
  franc: 'CHF', francs: 'CHF', 'swiss franc': 'CHF', 'swiss francs': 'CHF',
  'canadian dollar': 'CAD', 'canadian dollars': 'CAD',
  'australian dollar': 'AUD', 'australian dollars': 'AUD',
  'new zealand dollar': 'NZD', 'nz dollar': 'NZD',
  zloty: 'PLN', rupee: 'INR', rupees: 'INR', 'indian rupee': 'INR',
  won: 'KRW', rand: 'ZAR', baht: 'THB', lira: 'TRY', 'turkish lira': 'TRY', real: 'BRL', reais: 'BRL',
  'norwegian krone': 'NOK', 'swedish krona': 'SEK', 'danish krone': 'DKK',
};

// Currencies normally shown without decimals.
const ZERO_DECIMALS = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'PYG', 'XAF', 'XOF', 'XPF', 'RWF', 'KMF', 'GNF', 'DJF'];

function toCode(raw, field) {
  const t = cleanText(raw, 40).trim();
  if (t === '') throw new SkillError(`Field '${field}' is empty.`);
  const named = NAMES[t.toLowerCase()];
  if (named) return named;
  if (/^[A-Za-z]{3}$/.test(t)) return t.toUpperCase();
  throw new SkillError(`Unknown currency '${t}' in '${field}'. Use a 3-letter code such as EUR, USD or GBP.`);
}

function isGiven(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function parseCurrencyInput(input) {
  let amount = 1;
  if (isGiven(input.amount)) {
    amount = requireNumber(input, 'amount');
    if (amount < 0) throw new SkillError("Field 'amount' must be 0 or more.");
  }
  const hasFrom = isGiven(input.from);
  const hasTo = isGiven(input.to);
  if (!hasFrom && !hasTo) {
    throw new SkillError(`Say which currencies: give 'from' and/or 'to' (a missing one defaults to ${DEFAULT_CURRENCY}).`);
  }
  const from = hasFrom ? toCode(input.from, 'from') : DEFAULT_CURRENCY;
  const to = hasTo ? toCode(input.to, 'to') : DEFAULT_CURRENCY;
  return { amount, from, to };
}

function groupDigits(intPart) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function money(v, code) {
  if (Math.abs(v) >= 1e15) return `${formatNumber(v)} ${code}`;
  if (v !== 0 && Math.abs(v) < 0.01 && !ZERO_DECIMALS.includes(code)) {
    return `${String(Number(v.toPrecision(3)))} ${code}`;
  }
  const digits = ZERO_DECIMALS.includes(code) ? 0 : 2;
  const [i, d] = Math.abs(v).toFixed(digits).split('.');
  return `${v < 0 ? '-' : ''}${groupDigits(i)}${d ? '.' + d : ''} ${code}`;
}

function validateRates(data, from) {
  if (!data || typeof data !== 'object') throw new SkillError('ExchangeRate-API returned an unexpected response.');
  if (data.result === 'error') {
    const type = cleanText(data['error-type'], 40);
    if (type === 'unsupported-code') {
      throw new SkillError(`Currency '${from}' is not supported by the rate provider.`);
    }
    if (type === 'quota-reached') {
      throw new SkillError('ExchangeRate-API rate limit reached. Try again in about 20 minutes.');
    }
    throw new SkillError(`ExchangeRate-API error: ${type || 'unknown'}.`);
  }
  if (data.result !== 'success' || typeof data.rates !== 'object' || data.rates === null ||
      !Number.isFinite(data.time_last_update_unix)) {
    throw new SkillError('ExchangeRate-API returned an unexpected response.');
  }
  return data;
}

function readCache(from, nowMs) {
  try {
    const e = JSON.parse(localStorage.getItem('fx:' + from));
    const age = e && typeof e.fetchedAt === 'number' ? nowMs - e.fetchedAt : -1;
    if (age >= 0 && age < CACHE_TTL_MS) return { data: validateRates(e.data, from), fetchedAt: e.fetchedAt, cached: true };
  } catch (e) { /* no storage, empty, corrupt or invalid: fall through to the network */ }
  return null;
}

function writeCache(from, data, nowMs) {
  try { localStorage.setItem('fx:' + from, JSON.stringify({ fetchedAt: nowMs, data })); } catch (e) { /* optional */ }
}

async function getRates(from, nowMs) {
  const hit = readCache(from, nowMs);
  if (hit) return hit;
  const data = validateRates(await fetchJson(RATES_URL + from, {
    timeoutMs: TIMEOUT_MS, label: 'ExchangeRate-API', retryHint: 'in about 20 minutes.',
  }), from);
  writeCache(from, data, nowMs);
  return { data, fetchedAt: nowMs, cached: false };
}

async function convertCurrency(input) {
  const { amount, from, to } = parseCurrencyInput(input);
  const nowMs = Date.now();
  if (from === to) {
    return `${money(amount, from)} = ${money(amount, to)} (same currency, no conversion needed)`;
  }
  const { data, fetchedAt, cached } = await getRates(from, nowMs);
  const rate = data.rates[to];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new SkillError(`Currency '${to}' is not supported by the rate provider.`);
  }
  const result = amount * rate;
  if (!Number.isFinite(result)) throw new SkillError('Result is too large to represent.');

  const updatedMs = data.time_last_update_unix * 1000;
  const lines = [
    `${money(amount, from)} = ${money(result, to)}`,
    `Rate: 1 ${from} = ${formatNumber(rate)} ${to}`,
  ];
  let info = `Rates updated ${formatInstant(updatedMs)} (${HOME_TZ})`;
  if (Number.isFinite(data.time_next_update_unix)) {
    info += `; next update about ${formatInstant(data.time_next_update_unix * 1000)}`;
  }
  lines.push(info + '. Rates are indicative only and not suitable for actual transactions.');
  if (nowMs - updatedMs > STALE_AFTER_MS) {
    lines.push(`Warning: these rates are ${Math.floor((nowMs - updatedMs) / 86400000)} days old.`);
  }
  lines.push(`Source: ${ATTRIBUTION}. ${cached ? 'Cached' : 'Fetched'} ${formatInstant(fetchedAt)} (${HOME_TZ}).`);
  return lines.join('\n');
}

registerSkill(convertCurrency);
