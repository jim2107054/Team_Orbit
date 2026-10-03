// ───────────────────────────────────────────────────────────────────────────
// kit.js — the design system lifted from Untitled_design.pptx.
//
// Every constant here was measured from the reference deck: colours from its
// slide XML, type sizes and coordinates from its shape geometry, and the
// decorative graphics (asterisk, glows, gradient circles) are the reference's
// own media parts, reused byte-for-byte so the two decks are visually identical.
// ───────────────────────────────────────────────────────────────────────────
const path = require('path');
const { textH } = require('./metrics.js');

const ASSETS = path.join(__dirname, 'assets');

// Canvas — the reference is a 20" x 11.25" Canva export, not LAYOUT_16x9.
const W = 20;
const H = 11.25;

// Palette (exact hex values from ppt/slides/*.xml)
const C = {
  black: '000000',   // dark-slide background
  ink: '1E1E1E',     // dark cards, dark-slide-on-light text
  light: 'E4E4E4',   // light-slide background, light text
  white: 'FFFFFF',
  orange: 'FF751F',  // the single accent
  // support tones for diagrams only, derived to sit with the palette
  grey: '8A8A8A',
  rule: 'C9C9C9',
  deep: '141414',
};

// Fonts — same families the reference declares. Not installed here, so both
// decks substitute identically; install Open Sauce + DM Sans for an exact match.
const F = {
  head: 'Open Sauce Bold',
  display: 'Open Sauce',
  body: 'DM Sans',
};

// Type scale (pt), measured from the reference
const T = {
  hero: 200,
  section: 120,
  statement: 80,
  diagramTitle: 62,
  rowLabel: 50,
  stat: 96,
  cardHead: 28,
  statLabel: 28,
  brand: 21,
  pill: 18,
  body: 20,
  foot: 18,
  node: 14,
  nodeSm: 12,
  edge: 11,
};

// Layout
const L = {
  margin: 1.12,
  headerY: 0.70,
  pillW: 2.92,
  pillH: 0.40,
  pillY: 0.68,
  get pillX() { return W - this.margin - this.pillW; },
  contentRight: W - 1.12,
};

const img = (n) => path.join(ASSETS, `image${n}.png`);
const ART = {
  heroAsterisk: img(1),   // big asterisk, orange gradient on dark
  glowTitle: img(3),      // soft radial glow
  circles: img(5),        // stacked orange gradient circles (light slides)
  asteriskOrange: img(7), // solid orange asterisk
  glowDark: img(9),       // soft radial glow for dark slides
  asteriskBlack: img(13), // solid black asterisk
  asteriskLight: img(17), // light asterisk with orange gradient (light slides)
};

// ── Slide shells ───────────────────────────────────────────────────────────

/** Dark slide: black field with the reference's corner glows. */
function darkSlide(pres, deck, { glows = 'both', sectionTitle } = {}) {
  const s = deck.addSlide(sectionTitle ? { sectionTitle } : undefined);
  s.background = { color: C.black };
  if (glows === 'both' || glows === 'left') {
    s.addImage({ path: ART.glowDark, x: -7.63, y: -2.01, w: 15.27, h: 15.27, objectName: 'glow-left' });
  }
  if (glows === 'both' || glows === 'right') {
    s.addImage({ path: ART.glowDark, x: 12.37, y: -2.01, w: 15.27, h: 15.27, objectName: 'glow-right' });
  }
  if (glows === 'bottom') {
    s.addImage({ path: ART.glowDark, x: -7.63, y: 3.62, w: 15.27, h: 15.27, objectName: 'glow-bl' });
    s.addImage({ path: ART.glowDark, x: 12.37, y: -7.63, w: 15.27, h: 15.27, objectName: 'glow-tr' });
  }
  return s;
}

/** Light slide: the reference's E4E4E4 field. */
function lightSlide(pres, deck, { sectionTitle } = {}) {
  const s = deck.addSlide(sectionTitle ? { sectionTitle } : undefined);
  s.background = { color: C.light };
  return s;
}

/** Brand label + date pill, identical on every slide. */
function header(pres, s, { dark = true, brand = 'UPAY SHIELD', tag = 'TEAM ORBIT' } = {}) {
  s.addText(brand, {
    x: L.margin, y: L.headerY, w: 7, h: 0.36,
    fontFace: F.display, fontSize: T.brand,
    color: dark ? C.light : C.ink,
    align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    objectName: 'brand',
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: L.pillX, y: L.pillY, w: L.pillW, h: L.pillH,
    rectRadius: 0.2,
    fill: { color: dark ? C.white : C.ink },
    line: { color: dark ? C.white : C.ink, width: 0.75 },
    objectName: 'date-pill',
  });
  s.addText(tag, {
    x: L.pillX, y: L.pillY, w: L.pillW, h: L.pillH,
    fontFace: F.display, fontSize: T.pill,
    color: dark ? C.ink : C.light,
    align: 'center', valign: 'middle', margin: 0, isTextBox: true,
    objectName: 'date-pill-text',
  });
}

/** The big 120pt section title. Orange on dark, ink on light. */
function sectionTitle(s, text, { y = 5.1, dark = true, w = 14.5, size = T.section, color } = {}) {
  s.addText(text, {
    x: L.margin, y, w, h: size / 72 * 1.18,
    fontFace: F.display, fontSize: size,
    color: color || (dark ? C.orange : C.ink),
    align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    lineSpacingMultiple: 0.92,
    objectName: 'section-title',
  });
}

/**
 * Dark content card: 1E1E1E fill, hairline light border, orange heading.
 * The heading and body are measured, so a two-line heading pushes the body down
 * instead of landing on top of it, and the card grows if the text needs it.
 */
function card(pres, s, { x, y, w = 5.73, h = 3.15, head, body, name, headSize = T.cardHead, bodySize = T.body }) {
  const padX = 0.52;
  const tw = w - padX * 2;
  const hh = textH(head, tw, headSize, { caps: true, mult: 1.1 });
  const bh = textH(body, tw, bodySize, { mult: 1.22 });
  const H = Math.max(h, 0.4 + hh + 0.22 + bh + 0.38);

  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h: H,
    rectRadius: 0.05,
    fill: { color: C.ink },
    line: { color: C.light, width: 0.75 },
    objectName: name || 'card',
  });
  s.addText(head, {
    x: x + padX, y: y + 0.4, w: tw, h: hh,
    fontFace: F.display, fontSize: headSize, color: C.orange,
    align: 'left', valign: 'top', margin: 0, isTextBox: true,
    lineSpacingMultiple: 0.98,
  });
  s.addText(body, {
    x: x + padX, y: y + 0.4 + hh + 0.22, w: tw, h: bh,
    fontFace: F.body, fontSize: bodySize, color: C.light,
    align: 'left', valign: 'top', margin: 0, isTextBox: true,
    lineSpacingMultiple: 1.2,
  });
  return { x, y, w, h: H };
}

/**
 * The reference's signature row: a white rounded pill with a circular
 * asterisk badge overlapping its left edge.
 */
function pillRow(pres, s, { x, y, w = 7.93, h = 1.02, text, size = T.rowLabel, light = true }) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.5,
    fill: { color: C.white },
    line: { color: C.ink, width: 1 },
    objectName: 'pill',
  });
  // badge: black disc + orange asterisk, overlapping the pill's left end
  const bd = 0.81;
  const bx = x + 0.16;
  const by = y + (h - bd) / 2;
  s.addShape(pres.ShapeType.ellipse, {
    x: bx, y: by, w: bd, h: bd,
    fill: { color: C.ink }, line: { color: C.ink, width: 0 },
    objectName: 'badge-disc',
  });
  s.addImage({ path: ART.asteriskOrange, x: bx + 0.13, y: by + 0.13, w: bd - 0.26, h: bd - 0.26, objectName: 'badge-asterisk' });
  s.addText(text, {
    x: x + 1.36, y, w: w - 1.6, h,
    fontFace: F.display, fontSize: size, color: C.ink,
    align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    lineSpacingMultiple: 0.9,
  });
}

/** Orange disc with a big number, as on the reference's experience slide. */
function statCircle(pres, s, { cx, y, d = 3.38, value, label, valueSize = T.stat }) {
  s.addShape(pres.ShapeType.ellipse, {
    x: cx - d / 2, y, w: d, h: d,
    fill: { color: C.orange }, line: { color: C.orange, width: 0 },
    objectName: 'stat-disc',
  });
  s.addText(value, {
    x: cx - d / 2, y, w: d, h: d,
    fontFace: F.head, fontSize: valueSize, color: C.ink,
    align: 'center', valign: 'middle', margin: 0, isTextBox: true,
  });
  s.addText(label, {
    x: cx - 1.8, y: y + d + 0.42, w: 3.6, h: 1.25,
    fontFace: F.display, fontSize: T.statLabel, color: C.light,
    align: 'center', valign: 'top', margin: 0, isTextBox: true,
    lineSpacingMultiple: 0.98,
  });
}

/** White disc + black asterisk — the reference's divider motif on dark slides. */
function asteriskBadge(pres, s, { x, y, d = 1.57, invert = false }) {
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: d, h: d,
    fill: { color: invert ? C.ink : C.light },
    line: { color: invert ? C.ink : C.light, width: 0 },
    objectName: 'motif-disc',
  });
  s.addImage({
    path: invert ? ART.asteriskOrange : ART.asteriskBlack,
    x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56,
    objectName: 'motif-asterisk',
  });
}

module.exports = { W, H, C, F, T, L, ART, darkSlide, lightSlide, header, sectionTitle, card, pillRow, statCircle, asteriskBadge };
