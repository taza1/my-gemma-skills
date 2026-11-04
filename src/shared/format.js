// Number formatting for phone-sized output. Inlined into skills by scripts/build.js.
// Policy: 7 significant digits, plain notation for 1e-6 <= |n| < 1e15, otherwise scientific.

function formatNumber(n) {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-6) {
    return n.toExponential(4).replace(/\.?0+e/, 'e').replace('e+', 'e');
  }
  return String(Number(n.toPrecision(7)));
}
