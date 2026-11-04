'use strict';
// MANUAL live smoke test. NOT part of `npm test` (needs the internet, hits the real GitHub API).
// Run:  npm run smoke:live
// GitHub allows only 60 unauthenticated requests per hour per IP; this makes 8 of them.
// Node's fetch does not enforce CORS; CORS/WebView behaviour is only confirmed on the phone.
const { loadSkill } = require('../helpers');

(async () => {
  const run = loadSkill('github-status', { fetch: globalThis.fetch });
  for (const input of [
    { repo: 'google-ai-edge/gallery' },
    { repo: 'https://github.com/octocat/Hello-World', show: 'release' },
    { repo: 'octocat/this-repo-does-not-exist-xyz' },
  ]) {
    console.log('\n>>>', JSON.stringify(input));
    const r = await run(input);
    console.log(r.result || `ERROR: ${r.error}`);
  }
})();
