'use strict';
// MANUAL live smoke test. NOT part of `npm test` (needs the internet, hits the real APIs).
// Run:  npm run smoke:live
// Node's fetch does not enforce CORS, so this checks the integration and response shapes only.
// CORS and WebView behaviour can only be confirmed on the phone (docs/ON-DEVICE-CHECKLIST.md).
const { loadSkill } = require('../helpers');

(async () => {
  const run = loadSkill('weather', { fetch: globalThis.fetch });
  for (const input of [{ place: 'Dublin' }, { place: 'Galway', days: 3 }, { place: 'Dublin, Ohio' }, { place: 'Zzqxqxqx' }]) {
    console.log('\n>>>', JSON.stringify(input));
    const r = await run(input);
    console.log(r.result || `ERROR: ${r.error}`);
  }
})();
