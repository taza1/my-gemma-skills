// Date/time formatting. Defaults: DD/MM/YYYY, 24-hour, Europe/Dublin. Inlined by scripts/build.js.

const HOME_TZ = 'Europe/Dublin';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-11-04T09:30" (already local to the place) -> "04/11/2026 09:30"
function formatLocalIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : cleanText(iso, 20);
}

// "2026-11-04" -> "Wed 04/11"
function formatDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return cleanText(iso, 12);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${DAY_NAMES[d.getUTCDay()]} ${m[3]}/${m[2]}`;
}

// Calendar date of an instant in Europe/Dublin -> { y, m (1-12), d }.
function dublinDate(ms) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: HOME_TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date(ms));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: g('year'), m: g('month'), d: g('day') };
}

// Epoch milliseconds -> "04/11/2026 09:42" in the given zone (default Europe/Dublin).
function formatInstant(ms, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || HOME_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(ms));
    const g = (t) => parts.find((p) => p.type === t).value;
    return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
  } catch (e) {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }
}
