'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSkill } = require('./helpers');

const run = loadSkill('unit-converter');
const ok = async (input) => {
  const r = await run(input);
  assert.deepEqual(Object.keys(r), ['result'], `expected only {result}, got ${JSON.stringify(r)}`);
  return r.result;
};
const err = async (input) => {
  const r = await run(input);
  assert.deepEqual(Object.keys(r), ['error'], `expected only {error}, got ${JSON.stringify(r)}`);
  return r.error;
};

test('common conversions', async () => {
  assert.equal(await ok({ value: 10, from: 'mi', to: 'km' }), '10 mi = 16.09344 km');
  assert.equal(await ok({ value: 5, from: 'kg', to: 'lb' }), '5 kg = 11.02311 lb');
  assert.equal(await ok({ value: 1, from: 'gal', to: 'L' }), '1 US gal = 3.785412 L');
  assert.equal(await ok({ value: 100, from: 'km/h', to: 'mph' }), '100 km/h = 62.13712 mph');
  assert.equal(await ok({ value: 2, from: 'h', to: 'min' }), '2 h = 120 min');
  assert.equal(await ok({ value: 1, from: 'ha', to: 'm2' }), '1 ha = 10000 m2');
  assert.equal(await ok({ value: 1, from: 'ft', to: 'in' }), '1 ft = 12 in');
});

test('temperature', async () => {
  assert.equal(await ok({ value: 70, from: 'F', to: 'C' }), '70 °F = 21.11111 °C');
  assert.equal(await ok({ value: 100, from: 'C', to: 'F' }), '100 °C = 212 °F');
  assert.equal(await ok({ value: 0, from: 'C', to: 'K' }), '0 °C = 273.15 K');
  assert.equal(await ok({ value: -40, from: 'C', to: 'F' }), '-40 °C = -40 °F');
});

test('absolute zero is allowed, below it is refused', async () => {
  assert.equal(await ok({ value: -273.15, from: 'C', to: 'K' }), '-273.15 °C = 0 K');
  assert.equal(await ok({ value: -459.67, from: 'F', to: 'K' }), '-459.67 °F = 0 K');
  assert.equal(await ok({ value: 0, from: 'K', to: 'C' }), '0 K = -273.15 °C');
  assert.match(await err({ value: -300, from: 'C', to: 'F' }), /below absolute zero/);
  assert.match(await err({ value: -1, from: 'K', to: 'C' }), /below absolute zero/);
});

test('data sizes state decimal vs binary', async () => {
  const dec = await ok({ value: 1, from: 'KB', to: 'B' });
  assert.match(dec, /^1 KB = 1000 B/);
  const bin = await ok({ value: 1, from: 'KiB', to: 'B' });
  assert.match(bin, /^1 KiB = 1024 B/);
  assert.match(bin, /1000-based/);
  assert.match(await ok({ value: 1, from: 'GiB', to: 'MiB' }), /^1 GiB = 1024 MiB/);
  assert.match(await ok({ value: 8, from: 'bit', to: 'B' }), /^8 bit = 1 B/);
});

test('aliases, case, spacing, plurals and numeric text', async () => {
  assert.equal(await ok({ value: '10', from: ' Miles ', to: 'KILOMETERS' }), '10 mi = 16.09344 km');
  assert.equal(await ok({ value: 3, from: 'inches', to: 'cm' }), '3 in = 7.62 cm');
  assert.equal(await ok({ value: 50, from: 'kph', to: 'km/h' }), '50 km/h = 50 km/h');
  assert.equal(await ok({ value: 20, from: '°C', to: 'degF' }), '20 °C = 68 °F');
  assert.equal(await ok({ value: 2, from: 'm²', to: 'cm2' }), '2 m2 = 20000 cm2');
});

test('zero, negative, tiny and very large values', async () => {
  assert.equal(await ok({ value: 0, from: 'km', to: 'm' }), '0 km = 0 m');
  assert.equal(await ok({ value: -5, from: 'km', to: 'm' }), '-5 km = -5000 m');
  assert.equal(await ok({ value: 1e-9, from: 'm', to: 'km' }), '1e-9 m = 1e-12 km');
  assert.equal(await ok({ value: 1e12, from: 'km', to: 'mm' }), '1000000000000 km = 1e18 mm');
  assert.equal(await ok({ value: 1e15, from: 'm', to: 'm' }), '1e15 m = 1e15 m');
  assert.match(await err({ value: 1e308, from: 'km', to: 'mm' }), /too large/);
});

test('mismatched categories are refused and name both', async () => {
  const e = await err({ value: 5, from: 'kg', to: 'km' });
  assert.match(e, /kg \(mass\)/);
  assert.match(e, /km \(length\)/);
  assert.match(await err({ value: 1, from: 'GB', to: 'h' }), /data.*time/);
});

test('unknown units name the field', async () => {
  assert.match(await err({ value: 1, from: 'parsec', to: 'km' }), /Unknown unit 'parsec' in 'from'/);
  assert.match(await err({ value: 1, from: 'km', to: 'smoot' }), /Unknown unit 'smoot' in 'to'/);
});

test('missing, empty or bad fields name the field', async () => {
  assert.match(await err({ from: 'km', to: 'm' }), /Missing field 'value'/);
  assert.match(await err({ value: 1, to: 'm' }), /Missing field 'from'/);
  assert.match(await err({ value: 1, from: 'km' }), /Missing field 'to'/);
  assert.match(await err({ value: '', from: 'km', to: 'm' }), /'value' is empty/);
  assert.match(await err({ value: 'ten', from: 'km', to: 'm' }), /'value' must be a finite number/);
  assert.match(await err({ value: null, from: 'km', to: 'm' }), /Missing field 'value'/);
  assert.match(await err({ value: 1, from: '  ', to: 'm' }), /'from' is empty/);
  assert.match(await err({ value: 1, from: {}, to: 'm' }), /'from' must be text/);
});

test('non-finite numbers are refused', async () => {
  assert.match(await err({ value: 'Infinity', from: 'km', to: 'm' }), /finite number/);
  assert.match(await err({ value: 'NaN', from: 'km', to: 'm' }), /finite number/);
});

test('malformed input is refused cleanly', async () => {
  assert.match(await err('not json'), /not valid JSON/);
  assert.match(await err(''), /No input/);
  assert.match(await err('[1,2]'), /must be a JSON object/);
  assert.match(await err('null'), /must be a JSON object/);
});

test('no network is attempted (offline skill)', async () => {
  // loadSkill() gives the sandbox no fetch; a successful run proves none is used.
  assert.ok(await ok({ value: 1, from: 'm', to: 'cm' }));
});
