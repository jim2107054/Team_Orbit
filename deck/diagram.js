// ───────────────────────────────────────────────────────────────────────────
// diagram.js — primitives for the architecture diagrams.
//
// Same visual grammar as the reference competition diagrams (grouped layers,
// rounded nodes with icons, labelled arrows, cylinder data stores), drawn in
// the deck's own palette so the diagram slides sit inside the design system
// rather than beside it.
//
// Every text block is measured before it is placed: `lines()` estimates the
// wrapped line count so a node's label and its sub-label can never land on top
// of each other, and a node can grow to fit rather than overflow.
// ───────────────────────────────────────────────────────────────────────────
const { C, F, T, L } = require('./kit.js');
const { icon } = require('./icons.js');
const { lines, lineH, textH } = require('./metrics.js');

// Node tones. `fill` is the body, `fg` the title, `sub` the secondary line.
const TONE = {
  plain:  { fill: 'FFFFFF', fg: C.ink,    sub: '5F5F5F', ic: C.ink,    line: C.ink,    lw: 1 },
  accent: { fill: C.orange, fg: 'FFFFFF', sub: 'FFE8D8', ic: 'FFFFFF', line: C.orange, lw: 1 },
  dark:   { fill: C.ink,    fg: C.light,  sub: 'ADADAD', ic: C.orange, line: C.ink,    lw: 1 },
  muted:  { fill: 'F2F2F2', fg: '3A3A3A', sub: '6E6E6E', ic: '6E6E6E', line: 'B9B9B9', lw: 0.75 },
};

const EDGE = '5A5A5A';

// ── slide furniture ────────────────────────────────────────────────────────

/** Diagram slide title — same position and size on every diagram slide. */
function title(s, text, sub) {
  s.addText(text, {
    x: L.margin, y: 1.30, w: 17.0, h: 0.95,
    fontFace: F.display, fontSize: T.diagramTitle, color: C.ink,
    align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    objectName: 'diagram-title',
  });
  if (sub) {
    s.addText(sub, {
      x: L.margin, y: 2.28, w: 17.0, h: 0.4,
      fontFace: F.body, fontSize: 19, color: '555555',
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
      objectName: 'diagram-sub',
    });
  }
}

/** Footnote pinned to the bottom margin. */
function note(s, text, { y = 10.42, w = 17.75 } = {}) {
  s.addText(text, {
    x: L.margin, y, w, h: 0.42,
    fontFace: F.body, fontSize: 15.5, color: '434343',
    align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    objectName: 'diagram-note',
  });
}

/** A dashed container that groups a band of nodes into one labelled layer. */
function band(pres, s, { x, y, w, h, label, sublabel, labelW = 2.2 }) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.03,
    fill: { color: 'FFFFFF', transparency: 58 },
    line: { color: 'B4B4B4', width: 0.75, dashType: 'dash' },
    objectName: 'band',
  });
  if (label) {
    s.addText(label, {
      x: x + 0.26, y: y + 0.16, w: labelW, h: 0.4,
      fontFace: F.display, fontSize: 17, color: C.ink,
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    if (sublabel) {
      s.addText(sublabel, {
        x: x + 0.26, y: y + 0.58, w: labelW, h: textH(sublabel, labelW, 13) + 0.08,
        fontFace: F.body, fontSize: 13, color: '636363',
        align: 'left', valign: 'top', margin: 0, isTextBox: true,
        lineSpacingMultiple: 1.05,
      });
    }
  }
}

// ── nodes ──────────────────────────────────────────────────────────────────

/**
 * A diagram node: icon, title, optional sub-line, optional body block.
 *
 * Heights are computed from the measured text, so `h` acts as a MINIMUM. The
 * returned object carries the node's final box plus its four edge ports.
 */
async function node(pres, s, o) {
  const {
    x, y, w = 3.1, h = 1.1, tone = 'plain', label, sub, body, ic,
    radius = 0.07, fontSize = T.node, subSize = T.nodeSm, align = 'left',
    name, caps = false, iconTop = false,
  } = o;
  const t = TONE[tone] || TONE.plain;

  const padX = 0.22;
  const padY = 0.18;
  const icD = ic ? Math.min(0.42, 0.42) : 0;
  const icGap = ic ? 0.2 : 0;

  const tx = x + padX + (ic && !iconTop ? icD + icGap : 0);
  const tw = w - (tx - x) - padX;

  const lh = textH(label, tw, fontSize, { caps });
  const sh = sub ? textH(sub, tw, subSize) : 0;
  const bh = body ? textH(body, w - padX * 2, subSize, { mult: 1.3 }) : 0;

  const needed = padY * 2 + lh + (sub ? sh + 0.06 : 0) + (body ? bh + 0.18 : 0);
  const H = Math.max(h, needed);

  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h: H,
    rectRadius: radius,
    fill: { color: t.fill },
    line: { color: t.line, width: t.lw },
    objectName: name || 'node',
  });

  // Icon: vertically centred on the title block (or top-left when a body exists).
  if (ic) {
    const iy = iconTop || body ? y + padY : y + (H - icD) / 2;
    await addIcon(s, ic, t.ic, x + padX, iy, icD);
  }

  let cy = y + padY;
  s.addText(label, {
    x: tx, y: cy, w: tw, h: lh,
    fontFace: F.display, fontSize, color: t.fg,
    align, valign: 'top', margin: 0, isTextBox: true,
    lineSpacingMultiple: 1.0,
  });
  cy += lh;

  if (sub) {
    cy += 0.04;
    s.addText(sub, {
      x: tx, y: cy, w: tw, h: sh,
      fontFace: F.body, fontSize: subSize, color: t.sub,
      align, valign: 'top', margin: 0, isTextBox: true,
      lineSpacingMultiple: 1.04,
    });
    cy += sh;
  }

  if (body) {
    cy += 0.14;
    s.addText(body, {
      x: x + padX, y: cy, w: w - padX * 2, h: bh,
      fontFace: F.body, fontSize: subSize, color: t.sub,
      align: 'left', valign: 'top', margin: 0, isTextBox: true,
      lineSpacingMultiple: 1.28,
    });
  }

  return ports({ x, y, w, h: H });
}

/** A data store drawn as a vertical cylinder. */
async function store(pres, s, o) {
  const { x, y, w = 2.4, h = 1.65, label, sub, ic = 'database', name } = o;
  s.addShape(pres.ShapeType.can, {
    x, y, w, h,
    fill: { color: 'FFFFFF' },
    line: { color: C.ink, width: 1 },
    objectName: name || 'store',
  });
  const d = 0.34;
  await addIcon(s, ic, C.orange, x + w / 2 - d / 2, y + 0.30, d);
  const lw = w - 0.3;
  const lh2 = textH(label, lw, 13.5);
  s.addText(label, {
    x: x + 0.15, y: y + 0.70, w: lw, h: lh2,
    fontFace: F.display, fontSize: 13.5, color: C.ink,
    align: 'center', valign: 'top', margin: 0, isTextBox: true,
    lineSpacingMultiple: 1.0,
  });
  if (sub) {
    s.addText(sub, {
      x: x + 0.12, y: y + 0.72 + lh2, w: w - 0.24, h: textH(sub, w - 0.24, 10.5),
      fontFace: F.body, fontSize: 10.5, color: '5F5F5F',
      align: 'center', valign: 'top', margin: 0, isTextBox: true,
      lineSpacingMultiple: 1.04,
    });
  }
  return ports({ x, y, w, h });
}

/** A decision diamond. */
async function decision(pres, s, { x, y, w = 3.3, h = 1.8, label, name, fontSize = 15 }) {
  s.addShape(pres.ShapeType.diamond, {
    x, y, w, h,
    fill: { color: 'FFF0E6' },
    line: { color: C.orange, width: 1.25 },
    objectName: name || 'decision',
  });
  s.addText(label, {
    x: x + w * 0.14, y, w: w * 0.72, h,
    fontFace: F.display, fontSize, color: C.ink,
    align: 'center', valign: 'middle', margin: 0, isTextBox: true,
    lineSpacingMultiple: 0.95,
  });
  return ports({ x, y, w, h });
}

/** A titled panel for a block of prose or code inside a diagram. */
async function panel(pres, s, o) {
  const {
    x, y, w, h, tone = 'dark', label, ic, body, mono, name,
    labelSize = 20, bodySize = 13,
  } = o;
  const t = TONE[tone] || TONE.dark;
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: t.fill }, line: { color: t.line, width: t.lw },
    objectName: name || 'panel',
  });
  let cy = y + 0.26;
  const icD = 0.4;
  if (ic) await addIcon(s, ic, t.ic, x + 0.28, cy, icD);
  s.addText(label, {
    x: x + 0.28 + (ic ? icD + 0.18 : 0), y: cy, w: w - 0.56 - (ic ? icD + 0.18 : 0), h: icD,
    fontFace: F.display, fontSize: labelSize, color: t.fg,
    align: 'left', valign: 'middle', margin: 0, isTextBox: true,
  });
  cy += icD + 0.22;
  if (mono) {
    const mh = textH(mono, w - 0.56, 14, { mult: 1.35 });
    s.addText(mono, {
      x: x + 0.28, y: cy, w: w - 0.56, h: mh,
      fontFace: 'Courier New', fontSize: 14, color: C.orange, bold: true,
      align: 'left', valign: 'top', margin: 0, isTextBox: true,
      lineSpacingMultiple: 1.3,
    });
    cy += mh + 0.16;
  }
  if (body) {
    s.addText(body, {
      x: x + 0.28, y: cy, w: w - 0.56, h: y + h - cy - 0.2,
      fontFace: F.body, fontSize: bodySize, color: t.sub,
      align: 'left', valign: 'top', margin: 0, isTextBox: true,
      lineSpacingMultiple: 1.3,
    });
  }
  return ports({ x, y, w, h });
}

function ports({ x, y, w, h }) {
  return {
    x, y, w, h,
    l: { x, y: y + h / 2 },
    r: { x: x + w, y: y + h / 2 },
    t: { x: x + w / 2, y },
    b: { x: x + w / 2, y: y + h },
    c: { x: x + w / 2, y: y + h / 2 },
    lAt: (f) => ({ x, y: y + h * f }),
    rAt: (f) => ({ x: x + w, y: y + h * f }),
    tAt: (f) => ({ x: x + w * f, y }),
    bAt: (f) => ({ x: x + w * f, y: y + h }),
  };
}

// ── connectors ─────────────────────────────────────────────────────────────

/** Straight connector with an arrowhead and an optional label beside the run. */
function edge(pres, s, from, to, o = {}) {
  const { color = EDGE, width = 1.25, dash, arrow = 'triangle' } = o;
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  s.addShape(pres.ShapeType.line, {
    x, y, w, h,
    flipH: to.x < from.x,
    flipV: to.y < from.y,
    line: { color, width, dashType: dash || 'solid', endArrowType: arrow },
    objectName: 'edge',
  });
  if (o.label) edgeLabel(s, from, to, o);
}

/** Label placed on a connector; `at` slides it along the run (0..1). */
function edgeLabel(s, from, to, o = {}) {
  const { label, labelW = 2.0, labelDx = 0, labelDy = 0, at = 0.5, color = '4A4A4A' } = o;
  const mx = from.x + (to.x - from.x) * at;
  const my = from.y + (to.y - from.y) * at;
  const h = textH(label, labelW, T.edge) + 0.06;
  s.addText(label, {
    x: mx - labelW / 2 + labelDx, y: my - h / 2 + labelDy, w: labelW, h,
    fontFace: F.body, fontSize: T.edge, color,
    align: 'center', valign: 'middle', margin: 0, isTextBox: true,
    fill: { color: C.light },
    objectName: 'edge-label',
  });
}

/**
 * Right-angle connector. `axis: 'v'` leaves `from` vertically then turns;
 * `'h'` leaves horizontally. `mid` overrides where the turn happens.
 */
function elbow(pres, s, from, to, o = {}) {
  const { axis = 'v', color = EDGE, width = 1.25, dash, mid } = o;
  let corner;
  if (mid !== undefined) {
    corner = axis === 'v' ? { x: from.x, y: mid } : { x: mid, y: from.y };
    const corner2 = axis === 'v' ? { x: to.x, y: mid } : { x: mid, y: to.y };
    edge(pres, s, from, corner, { color, width, dash, arrow: 'none' });
    edge(pres, s, corner, corner2, { color, width, dash, arrow: 'none' });
    edge(pres, s, corner2, to, { color, width, dash });
  } else {
    corner = axis === 'v' ? { x: from.x, y: to.y } : { x: to.x, y: from.y };
    edge(pres, s, from, corner, { color, width, dash, arrow: 'none' });
    edge(pres, s, corner, to, { color, width, dash });
  }
  if (o.label) edgeLabel(s, from, to, o);
}

async function addIcon(s, name, color, x, y, d) {
  s.addImage({ data: await icon(name, color), x, y, w: d, h: d, objectName: `icon-${name}` });
}

/** Key/legend chip row. */
function legend(pres, s, x, y, items) {
  let cx = x;
  for (const it of items) {
    s.addShape(pres.ShapeType.ellipse, {
      x: cx, y: y + 0.08, w: 0.16, h: 0.16,
      fill: { color: it.color }, line: { color: it.color, width: 0 },
      objectName: 'legend-dot',
    });
    s.addText(it.text, {
      x: cx + 0.26, y, w: it.w || 2.4, h: 0.32,
      fontFace: F.body, fontSize: 12.5, color: '4A4A4A',
      align: 'left', valign: 'middle', margin: 0, isTextBox: true,
    });
    cx += 0.26 + (it.w || 2.4) + 0.34;
  }
}

module.exports = {
  title, note, band, node, store, decision, panel,
  edge, elbow, edgeLabel, legend, addIcon, ports,
  lines, textH, lineH, TONE, EDGE,
};
