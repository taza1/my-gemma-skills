// fetch with timeout, status handling and JSON parsing. Inlined by scripts/build.js.
// Sends NO custom headers unless opts.headers is given: a plain GET stays a CORS "simple request"
// (no preflight), which Met Éireann's endpoint requires (its OPTIONS reply is 405).
// Needs SkillError and cleanText.

async function fetchJson(url, opts) {
  const timeoutMs = (opts && opts.timeoutMs) || 10000;
  const label = (opts && opts.label) || 'service';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res;
    let text;
    try {
      const init = { signal: ctrl.signal };
      // Only add headers when a provider asks for them (it makes the request non-simple).
      if (opts && opts.headers) init.headers = opts.headers;
      res = await fetch(url, init);
      text = await res.text();
    } catch (e) {
      if (ctrl.signal.aborted) {
        throw new SkillError(`${label} did not respond within ${Math.round(timeoutMs / 1000)} s.`);
      }
      throw new SkillError(`Could not reach ${label}. Check the internet connection.`);
    }
    let body = null;
    try { body = JSON.parse(text); } catch (e) { body = null; }
    // Provider-specific hook (e.g. read rate-limit headers, or throw a SkillError of its own).
    if (opts && typeof opts.onResponse === 'function') opts.onResponse(res, body);
    // Statuses the caller treats as "nothing there" (e.g. 404 for a repo without releases).
    if (opts && Array.isArray(opts.okStatuses) && opts.okStatuses.includes(res.status)) return null;
    if (!res.ok) {
      if (res.status === 429) {
        const after = res.headers && res.headers.get ? res.headers.get('retry-after') : null;
        const secs = Number(after);
        throw new SkillError(`${label} rate limit reached. Try again ` +
          (Number.isFinite(secs) && secs > 0
            ? `in about ${Math.ceil(secs)} s.`
            : ((opts && opts.retryHint) || 'in a minute.')));
      }
      // Open-Meteo errors use "reason", GitHub uses "message".
      const why = body && (typeof body.reason === 'string' ? body.reason : body.message);
      const reason = typeof why === 'string' ? cleanText(why, 120) : '';
      throw new SkillError(reason
        ? `${label} rejected the request: ${reason}`
        : `${label} returned HTTP ${res.status}.`);
    }
    if (body === null) throw new SkillError(`${label} returned an unreadable response.`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}
