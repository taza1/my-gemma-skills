// Text hygiene for UNTRUSTED external text (API fields, headlines, place names).
// Inlined into skills by scripts/build.js. Output is plain text only, truncated, and
// wrapped in quotes by quoteData() so the model sees it as data, never as instructions.

function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function cleanText(value, max) {
  const t = String(value === undefined || value === null ? '' : value)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return truncate(t, max);
}

function quoteData(s) {
  return '“' + String(s).replace(/"/g, "'") + '”';
}
