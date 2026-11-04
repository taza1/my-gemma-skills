'use strict';
// Structure and metadata validation of BUILT skills, mirroring how the Gallery app parses them
// (SkillManager.convertSkillMdToProto: split on '---', line-based name/description/metadata).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ROOT, SKILLS_DIR, skillNames, extractScript } = require('./helpers');

function parseLikeApp(md) {
  const parts = md.split('---');
  if (parts.length < 3) return { errors: ['fewer than two --- separators'] };
  const out = { name: null, description: null, secret: false, errors: [], keys: [] };
  let meta = false;
  for (const raw of parts[1].trim().split(/\r?\n/)) {
    const line = raw.trim();
    if (line === 'metadata:') { meta = true; continue; }
    if (!meta && line.startsWith('name:')) out.name = line.slice(5).trim();
    else if (!meta && line.startsWith('description:')) out.description = line.slice(12).trim();
    else if (meta && line.startsWith('require-secret:')) out.secret = line.slice(15).trim() === 'true';
    if (line) out.keys.push(line);
  }
  if (!out.name) out.errors.push('missing name');
  if (!out.description) out.errors.push('missing description');
  out.body = parts.slice(2).join('---').trim();
  return out;
}

test('at least one skill is built', () => {
  assert.ok(skillNames().length >= 1);
});

for (const name of skillNames()) {
  test(`${name}: SKILL.md parses like the app and matches folder`, () => {
    const p = parseLikeApp(fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8'));
    assert.deepEqual(p.errors, []);
    assert.equal(p.name, name);
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'folder must be kebab-case');
    assert.ok(p.description.length <= 160, 'description should stay short for a small model');
    assert.ok(p.body.length > 0);
  });

  test(`${name}: frontmatter only uses keys the app reads`, () => {
    const p = parseLikeApp(fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8'));
    const allowed = /^(name|description|metadata|require-secret|require-secret-description|homepage):/;
    for (const k of p.keys) assert.match(k, allowed, `unrecognised frontmatter line: ${k}`);
  });

  test(`${name}: SKILL.md tells the model to call run_js with index.html`, () => {
    const md = fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
    assert.match(md, /`run_js`/);
    assert.match(md, /index\.html/);
  });

  test(`${name}: no secret declared (keyless policy, see SECURITY.md)`, () => {
    const p = parseLikeApp(fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8'));
    assert.equal(p.secret, false);
  });

  test(`${name}: index.html script compiles and exposes the entry point`, () => {
    const js = extractScript(name);
    assert.doesNotThrow(() => new vm.Script(js));
    assert.match(js, /window\['ai_edge_gallery_get_result'\]/);
  });

  test(`${name}: one inline script, no external script or stylesheet (supply chain)`, () => {
    const html = fs.readFileSync(path.join(SKILLS_DIR, name, 'scripts', 'index.html'), 'utf8');
    assert.equal((html.match(/<script/gi) || []).length, 1, 'exactly one <script> element');
    assert.doesNotMatch(html, /<script[^>]*\bsrc\s*=/i, 'no <script src=...>');
    assert.doesNotMatch(html, /<link[^>]*\bhref\s*=/i, 'no <link href=...>');
    assert.doesNotMatch(html, /\bimport\s*\(|\bimportScripts\b/, 'no dynamic code loading');
  });

  test(`${name}: README exists and CATALOG.md lists it`, () => {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, name, 'README.md')));
    const cat = fs.readFileSync(path.join(ROOT, 'CATALOG.md'), 'utf8');
    assert.ok(cat.includes(`| ${name} |`));
  });
}

test('repo has the files GitHub Pages hosting needs', () => {
  assert.ok(fs.existsSync(path.join(ROOT, '.nojekyll')), '.nojekyll is required so SKILL.md is served raw');
  assert.ok(fs.existsSync(path.join(ROOT, 'LICENSE')));
});
