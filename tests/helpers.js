'use strict';
// Test helpers. Tests run against the BUILT output in skills/, i.e. what the phone loads.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

function skillNames() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

function extractScript(name) {
  const html = fs.readFileSync(path.join(SKILLS_DIR, name, 'scripts', 'index.html'), 'utf8');
  const m = /<script>\n([\s\S]*)\n<\/script>/.exec(html);
  if (!m) throw new Error(`${name}: no inline <script> found in index.html`);
  return m[1];
}

// Load a built skill into a sandbox shaped like the app's WebView. Network is absent unless the
// test passes a mock fetch, so no test can reach the internet by accident.
// Options: fetch (mock), now (fixed clock, ms or ISO string), timeScale (divide setTimeout delays
// so timeout tests finish quickly).
function loadSkill(name, { fetch, now, timeScale, storage } = {}) {
  const window = {};
  const scaled = timeScale ? (fn, ms) => setTimeout(fn, ms / timeScale) : setTimeout;
  const sandbox = { window, console, setTimeout: scaled, clearTimeout, AbortController };
  if (fetch) { sandbox.fetch = fetch; window.fetch = fetch; }
  if (storage) { sandbox.localStorage = storage; window.localStorage = storage; }
  if (now !== undefined) {
    const fixed = typeof now === 'number' ? now : Date.parse(now);
    sandbox.Date = class FakeDate extends Date {
      constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
      static now() { return fixed; }
    };
  }
  vm.createContext(sandbox);
  new vm.Script(extractScript(name), { filename: `${name}/index.html` }).runInContext(sandbox);
  const fn = window['ai_edge_gallery_get_result'];
  if (typeof fn !== 'function') throw new Error(`${name}: ai_edge_gallery_get_result not defined`);
  const run = async (input) => JSON.parse(await fn(typeof input === 'string' ? input : JSON.stringify(input)));
  // The sandbox global: tests can call a skill's top-level functions (not its `const`s) directly.
  run.sandbox = sandbox;
  return run;
}

module.exports = { ROOT, SKILLS_DIR, skillNames, extractScript, loadSkill };
