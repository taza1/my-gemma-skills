'use strict';
// MANUAL live smoke test. NOT part of `npm test` (needs the internet, hits Wikipedia and Hacker News).
// Run:  npm run smoke:live
// Node's fetch does not enforce CORS; CORS/WebView behaviour (including the Api-User-Agent
// preflight) is only confirmed on the phone. Makes 3 Wikipedia and 2 Hacker News requests, one after another.
const { loadSkill } = require('../helpers');

(async () => {
  const run = loadSkill('news', { fetch: globalThis.fetch });
  for (const input of [{ topic: 'general' }, { topic: 'business', days: 1 }, { topic: 'technology' }, { topic: 'ai' }]) {
    console.log('\n>>>', JSON.stringify(input));
    const r = await run(input);
    console.log(r.result || `ERROR: ${r.error}`);
  }
})();
