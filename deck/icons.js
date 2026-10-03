// Renders the icon set used by the architecture diagrams to base64 PNGs.
// react-icons -> SVG -> sharp raster at 256px, tinted to a given hex.
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');

const Fi = require('react-icons/fi');

const SET = {
  smartphone: Fi.FiSmartphone,
  phone: Fi.FiPhoneCall,
  grid: Fi.FiGrid,
  store: Fi.FiShoppingBag,
  monitor: Fi.FiMonitor,
  server: Fi.FiServer,
  shield: Fi.FiShield,
  cpu: Fi.FiCpu,
  database: Fi.FiDatabase,
  share: Fi.FiShare2,
  activity: Fi.FiActivity,
  clock: Fi.FiClock,
  users: Fi.FiUsers,
  alert: Fi.FiAlertTriangle,
  search: Fi.FiSearch,
  message: Fi.FiMessageSquare,
  layers: Fi.FiLayers,
  zap: Fi.FiZap,
  lock: Fi.FiLock,
  map: Fi.FiMapPin,
  trending: Fi.FiTrendingUp,
  gitBranch: Fi.FiGitBranch,
  barChart: Fi.FiBarChart2,
  eye: Fi.FiEye,
  checkCircle: Fi.FiCheckCircle,
  helpCircle: Fi.FiHelpCircle,
  xCircle: Fi.FiXCircle,
  fileText: Fi.FiFileText,
  refresh: Fi.FiRefreshCw,
  target: Fi.FiTarget,
  globe: Fi.FiGlobe,
  radio: Fi.FiRadio,
  sliders: Fi.FiSliders,
  send: Fi.FiSend,
  userCheck: Fi.FiUserCheck,
  key: Fi.FiKey,
};

const cache = new Map();

/** Returns a `image/png;base64,...` data string for pptxgenjs addImage({data}). */
async function icon(name, hex = '1E1E1E', px = 256) {
  const key = `${name}|${hex}|${px}`;
  if (cache.has(key)) return cache.get(key);
  const Cmp = SET[name];
  if (!Cmp) throw new Error(`icons.js: unknown icon "${name}"`);

  let svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Cmp, { color: `#${hex}`, size: px, strokeWidth: 2 })
  );
  // react-icons emits stroke="currentColor"/fill="currentColor"; pin them to the hex.
  svg = svg.replace(/currentColor/g, `#${hex}`);
  // Only add the namespace when react-icons didn't already emit one — a second
  // xmlns makes librsvg reject the buffer outright.
  if (!/<svg[^>]*\sxmlns=/.test(svg)) {
    svg = svg.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  const buf = await sharp(Buffer.from(svg), { density: 600 })
    .resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const out = 'image/png;base64,' + buf.toString('base64');
  cache.set(key, out);
  return out;
}

module.exports = { icon, SET };
