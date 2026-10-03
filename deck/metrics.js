// Shared text metrics. Both the slide kit and the diagram primitives size
// their boxes from these, so nothing is laid out on a guess.
//
// Open Sauce and DM Sans run close to 0.52em average advance for mixed case and
// ~0.63em for ALL CAPS. The estimates are deliberately a touch pessimistic so
// boxes round up rather than clip.

function lines(text, widthIn, fontPt, { caps = false } = {}) {
  if (!text) return 0;
  const adv = (fontPt / 72) * (caps ? 0.63 : 0.52);
  const perLine = Math.max(1, Math.floor(widthIn / adv));
  return String(text)
    .split('\n')
    .reduce((n, seg) => n + Math.max(1, Math.ceil(seg.trim().length / perLine)), 0);
}

const lineH = (fontPt, mult = 1.18) => (fontPt / 72) * mult;

function textH(text, widthIn, fontPt, opts = {}) {
  return lines(text, widthIn, fontPt, opts) * lineH(fontPt, opts.mult || 1.18);
}

module.exports = { lines, lineH, textH };
