'use strict';
// MANUAL live smoke test. NOT part of `npm test` (needs the internet, hits the real API).
// Run:  npm run smoke:live
// Node's fetch does not enforce CORS; CORS/WebView behaviour is only confirmed on the phone.
// No localStorage is given, so every call fetches (be polite: this makes 3 requests).
const { loadSkill } = require('../helpers');

(async () => {
  const run = loadSkill('currency', { fetch: globalThis.fetch });
  for (const input of [{ amount: 100, from: 'USD', to: 'EUR' }, { amount: 50, from: 'GBP' }, { amount: 100, from: 'XXX', to: 'EUR' }]) {
    console.log('\n>>>', JSON.stringify(input));
    const r = await run(input);
    console.log(r.result || `ERROR: ${r.error}`);
  }
})();
