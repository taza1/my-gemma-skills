'use strict';
// Fails if anything resembling a key, token or private key is committed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./helpers');

const SKIP_DIRS = new Set(['.git', 'node_modules']);
const TEXT_EXT = new Set(['.js', '.json', '.md', '.html', '.txt', '.yml', '.yaml', '.css', '.env', '']);

const PATTERNS = [
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{30,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['OpenAI/Anthropic style key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Bearer token literal', /Bearer\s+[A-Za-z0-9._-]{30,}/],
  ['Assigned secret literal', /\b(api[_-]?key|secret|token|passwd|password)\b\s*[:=]\s*['"][A-Za-z0-9_\-+/=]{20,}['"]/i],
];

function scan(text) {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name)); }
    else if (TEXT_EXT.has(path.extname(e.name).toLowerCase())) yield path.join(dir, e.name);
  }
}

test('detector flags sample secrets (guards against a silently broken scanner)', () => {
  // Built from fragments so this file never contains a literal match itself.
  const samples = [
    ['ghp' + '_' + 'a'.repeat(36), 'GitHub token'],
    ['AI' + 'za' + 'B'.repeat(35), 'Google API key'],
    ['AK' + 'IA' + 'A'.repeat(16), 'AWS access key id'],
    ['-----BEGIN RSA PRIV' + 'ATE KEY-----', 'Private key block'],
    ['api_key = "' + 'x'.repeat(24) + '"', 'Assigned secret literal'],
  ];
  for (const [text, label] of samples) assert.ok(scan(text).includes(label), `missed: ${label}`);
});

test('detector does not flag ordinary text', () => {
  assert.deepEqual(scan('const token = parseToken(input); // no secret here'), []);
});

test('no secrets or tokens in the repository', () => {
  const hits = [];
  for (const file of walk(ROOT)) {
    const found = scan(fs.readFileSync(file, 'utf8'));
    if (found.length) hits.push(`${path.relative(ROOT, file)}: ${found.join(', ')}`);
  }
  assert.deepEqual(hits, []);
});
