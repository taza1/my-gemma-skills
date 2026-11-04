// @inline shared/skill-runtime.js
// @inline shared/text.js
// @inline shared/time.js
// @inline shared/fetch.js

// Providers (docs/API-CATALOGUE.md, research/api-candidates.md):
//  - Open-Meteo geocoding + forecast: keyless, CORS *, personal non-commercial use, CC BY 4.0.
//  - Met Éireann warnings (warning_ALL.json): keyless, CORS * for a plain GET, licence requires
//    acknowledgement and that warning wording is not materially altered.
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const WARNINGS_URL = 'https://www.met.ie/Open_Data/json/warning_ALL.json';
const TIMEOUT_MS = 10000;
const MAX_WARNINGS_SHOWN = 5;

const CURRENT_VARS = 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,' +
  'wind_gusts_10m,precipitation,weather_code';
const DAILY_VARS = 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,' +
  'wind_speed_10m_max,weather_code';

const COUNTRY_NAMES = {
  ireland: 'IE', eire: 'IE', 'republic of ireland': 'IE',
  uk: 'GB', 'united kingdom': 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
  'northern ireland': 'GB', usa: 'US', 'united states': 'US', 'united states of america': 'US',
};

const WMO = {
  0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm, hail',
  99: 'Thunderstorm, heavy hail',
};

const LEVEL_RANK = { red: 0, orange: 1, yellow: 2 };

function countryFromText(raw) {
  const t = String(raw).trim();
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return COUNTRY_NAMES[t.toLowerCase()] || null;
}

function parseWeatherInput(input) {
  const raw = cleanText(requireString(input, 'place'), 200);
  if (raw.length > 80) throw new SkillError("Field 'place' is too long (80 characters max).");
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) throw new SkillError("Field 'place' is empty.");
  const name = parts[0];

  let cc = null;
  let qualifier = null;
  const countryField = input.country;
  if (countryField !== undefined && countryField !== null && String(countryField).trim() !== '') {
    cc = countryFromText(countryField);
    if (!cc) {
      throw new SkillError(`Unknown country '${cleanText(countryField, 30)}'. ` +
        'Use a 2-letter code such as IE, GB or US.');
    }
  } else if (parts.length > 1) {
    const rest = parts.slice(1).join(', ');
    cc = countryFromText(rest);
    if (!cc) qualifier = rest;
  }

  let days = 2;
  if (input.days !== undefined && input.days !== null && String(input.days).trim() !== '') {
    days = Number(input.days);
    if (!Number.isInteger(days) || days < 1 || days > 3) {
      throw new SkillError("Field 'days' must be a whole number from 1 to 3.");
    }
  }
  return { name, cc, qualifier, days };
}

async function geocode(name, cc, qualifier) {
  const url = `${GEO_URL}?name=${encodeURIComponent(name)}&count=${qualifier ? 10 : 3}` +
    `&language=en&format=json${cc ? `&countryCode=${cc}` : ''}`;
  const data = await fetchJson(url, { timeoutMs: TIMEOUT_MS, label: 'Open-Meteo geocoding' });
  let results = data && Array.isArray(data.results) ? data.results : [];
  // Open-Meteo answers HTTP 200 with no "results" key when nothing matches.
  if (results.length === 0) {
    throw new SkillError(`Place not found: '${cleanText(name, 60)}'` +
      `${cc ? ` (country ${cc})` : ''}. Check the spelling or add a country, e.g. "Cork, IE".`);
  }
  results = results.filter((r) => r && typeof r.name === 'string' &&
    Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  if (results.length === 0) throw new SkillError('Open-Meteo geocoding returned an unreadable place.');
  if (qualifier) {
    const q = qualifier.toLowerCase();
    results = results.filter((r) => [r.admin1, r.admin2, r.admin3, r.country]
      .some((x) => typeof x === 'string' && x.toLowerCase().includes(q)));
    if (results.length === 0) {
      throw new SkillError(`Place not found: '${cleanText(name, 40)}, ${cleanText(qualifier, 30)}'.`);
    }
  }
  return results;
}

function describePlace(r) {
  const seen = [];
  for (const part of [r.name, r.admin1, r.country]) {
    const t = typeof part === 'string' ? cleanText(part, 40) : '';
    if (t && !seen.includes(t)) seen.push(t);
  }
  return seen.join(', ');
}

async function fetchForecast(place, days) {
  const url = `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=${CURRENT_VARS}&daily=${DAILY_VARS}&timezone=auto&wind_speed_unit=kmh` +
    `&temperature_unit=celsius&precipitation_unit=mm&forecast_days=${days}`;
  const data = await fetchJson(url, { timeoutMs: TIMEOUT_MS, label: 'Open-Meteo forecast' });
  if (!data || typeof data.current !== 'object' || data.current === null ||
      typeof data.current.time !== 'string') {
    throw new SkillError('Open-Meteo returned an unexpected response (no current conditions).');
  }
  return data;
}

function num(v, unit, digits) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'n/a';
  return String(Number(v.toFixed(digits === undefined ? 1 : digits))) + unit;
}

function conditions(code) {
  return typeof code === 'number' && WMO[code] ? WMO[code] : 'conditions n/a';
}

function currentLine(data) {
  const c = data.current;
  const tz = typeof data.timezone === 'string' ? ' ' + cleanText(data.timezone, 40) : '';
  return `Now (${formatLocalIso(c.time)}${tz}): ${num(c.temperature_2m, '°C')}, feels like ` +
    `${num(c.apparent_temperature, '°C')}, humidity ${num(c.relative_humidity_2m, '%', 0)}, wind ` +
    `${num(c.wind_speed_10m, ' km/h')} (gusts ${num(c.wind_gusts_10m, ' km/h')}), rain ` +
    `${num(c.precipitation, ' mm')}, ${conditions(c.weather_code)}`;
}

function dailyLines(data, days) {
  const d = data.daily;
  if (!d || !Array.isArray(d.time) || d.time.length === 0) return ['Forecast: unavailable'];
  const at = (key, i) => (Array.isArray(d[key]) ? d[key][i] : undefined);
  const lines = [];
  for (let i = 0; i < Math.min(days, d.time.length); i++) {
    lines.push(`- ${formatDay(d.time[i])}: ${num(at('temperature_2m_min', i), '', 1)} to ` +
      `${num(at('temperature_2m_max', i), '°C')}, rain chance ` +
      `${num(at('precipitation_probability_max', i), '%', 0)}, wind up to ` +
      `${num(at('wind_speed_10m_max', i), ' km/h')}, ${conditions(at('weather_code', i))}`);
  }
  return ['Forecast:'].concat(lines);
}

async function loadWarnings(nowMs) {
  try {
    const data = await fetchJson(WARNINGS_URL, { timeoutMs: TIMEOUT_MS, label: 'Met Éireann' });
    if (!Array.isArray(data)) return { error: 'Met Éireann returned an unexpected format.' };
    const active = [];
    let invalid = 0;
    let updatedMs = 0;
    for (const w of data) {
      const exp = w && typeof w === 'object' ? Date.parse(w.expiry) : NaN;
      if (!w || typeof w !== 'object' || typeof w.headline !== 'string' || !Number.isFinite(exp)) {
        invalid++;
        continue;
      }
      if (exp <= nowMs) continue; // expired warnings must not be shown (licence)
      const upd = Date.parse(w.updated);
      if (Number.isFinite(upd) && upd > updatedMs) updatedMs = upd;
      active.push(w);
    }
    active.sort((a, b) => (LEVEL_RANK[String(a.level).toLowerCase()] ?? 9) -
      (LEVEL_RANK[String(b.level).toLowerCase()] ?? 9) || Date.parse(a.onset) - Date.parse(b.onset));
    return { active, invalid, updatedMs };
  } catch (e) {
    return { error: e instanceof SkillError ? e.message : 'Met Éireann warnings could not be read.' };
  }
}

function areaNeedles(place) {
  const clean = (s) => (typeof s === 'string'
    ? cleanText(s, 60).replace(/^county\s+/i, '').replace(/^city of\s+/i, '').replace(/\s+city$/i, '')
    : '');
  const list = [clean(place.name), clean(place.admin2), clean(place.admin3)]
    .filter((s) => s.length >= 3);
  return list.filter((s, i) => list.findIndex((o) => o.toLowerCase() === s.toLowerCase()) === i);
}

function headlineMentions(headline, needles) {
  return needles.some((n) =>
    new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(headline));
}

function warningLine(w, nowMs, withDetail) {
  const level = cleanText(w.level, 10).toUpperCase() || '?';
  const type = cleanText(w.type, 24) || 'warning';
  const onset = Date.parse(w.onset);
  const exp = Date.parse(w.expiry);
  const when = Number.isFinite(onset) && onset > nowMs
    ? `from ${formatInstant(onset)} to ${formatInstant(exp)}`
    : `until ${formatInstant(exp)}`;
  let line = `- [${level}] ${type}: ${quoteData(cleanText(w.headline, 160))}, ${when}`;
  if (withDetail) {
    const detail = cleanText(w.description, 200).replace(/\n/g, ' ');
    if (detail) line += `. Details: ${quoteData(detail)}`;
  }
  return line;
}

function warningLines(result, place, nowMs) {
  if (result.skipped) {
    return ['Warnings: only Met Éireann (Republic of Ireland) warnings are supported, so none were ' +
      'checked for this place. See your national weather service.'];
  }
  if (result.error) return [`Warnings: unavailable (${result.error}). Check met.ie.`];

  const head = result.updatedMs
    ? `Warnings (Met Éireann, feed updated ${formatInstant(result.updatedMs)}):`
    : 'Warnings (Met Éireann):';
  const out = [];
  if (result.active.length === 0) {
    out.push('Warnings (Met Éireann): none listed in the feed right now. This does not mean ' +
      'there is no weather risk.');
  } else {
    const needles = areaNeedles(place);
    const mine = result.active.filter((w) => headlineMentions(w.headline, needles));
    const others = result.active.filter((w) => !mine.includes(w));
    out.push(head);
    if (mine.length > 0) {
      out.push(`For ${cleanText(place.name, 40)}:`);
      mine.slice(0, MAX_WARNINGS_SHOWN).forEach((w) => out.push(warningLine(w, nowMs, true)));
      if (mine.length > MAX_WARNINGS_SHOWN) out.push(`(+${mine.length - MAX_WARNINGS_SHOWN} more)`);
    }
    if (others.length > 0) {
      out.push(mine.length > 0 ? 'Elsewhere in Ireland:' : 'None name your area. Elsewhere in Ireland:');
      others.slice(0, MAX_WARNINGS_SHOWN).forEach((w) => out.push(warningLine(w, nowMs, false)));
      if (others.length > MAX_WARNINGS_SHOWN) out.push(`(+${others.length - MAX_WARNINGS_SHOWN} more)`);
    }
    out.push('Area match is by place name in the headline only; check met.ie for official warnings.');
  }
  if (result.invalid > 0) out.push(`(${result.invalid} warning entr${result.invalid === 1 ? 'y' : 'ies'} could not be read.)`);
  return out;
}

async function weather(input) {
  const { name, cc, qualifier, days } = parseWeatherInput(input);
  const nowMs = Date.now();
  const matches = await geocode(name, cc, qualifier);
  const place = matches[0];
  const isIreland = place.country_code === 'IE';

  const [forecast, warnings] = await Promise.all([
    fetchForecast(place, days),
    isIreland ? loadWarnings(nowMs) : Promise.resolve({ skipped: true }),
  ]);

  const lines = [`Weather for ${describePlace(place)}`, currentLine(forecast)];
  if (!cc && !qualifier) {
    const first = describePlace(place);
    const others = matches.slice(1).map(describePlace).filter((d) => d !== first).slice(0, 2);
    if (others.length > 0) {
      lines.push(`(Other matches: ${others.join('; ')}. Add a country to choose, e.g. "${cleanText(name, 30)}, US".)`);
    }
  }
  lines.push(...dailyLines(forecast, days));
  lines.push(...warningLines(warnings, place, nowMs));
  lines.push('Sources: weather data by Open-Meteo.com (CC BY 4.0)' +
    (isIreland && !warnings.error ? '; warnings by Met Éireann' : '') +
    `. Retrieved ${formatInstant(nowMs)} (${HOME_TZ}).`);
  return lines.join('\n');
}

registerSkill(weather);
