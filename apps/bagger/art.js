// art.js — the packaging.
//
// Every item on the belt is a generic-brand package: the shape of the thing
// (a foam tray under plastic wrap, a gallon jug, a gable-top carton) and one
// plain word on the label, which is how you read a real lane too. Each one
// is built from a dozen shape families below and stamped into a single
// inline SVG sprite; the game draws an item with `<use href="#pk-milk">`.
//
// Everything is drawn on a 64×64 canvas, standing on the floor at y=60.

(function () {
  'use strict';

  var FONT = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  var WHITE = '#f6f6f3';
  var SILVER = '#cdd2d8';

  // --- Drawing helpers -----------------------------------------------------

  // Mix a hex color toward black (k < 0) or white (k > 0).
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = k < 0 ? 0 : 255, a = Math.abs(k);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // The silhouette stroke: a darker tone of the fill, so every package
  // reads against the belt and the bag, in light and dark alike.
  function edge(fill) {
    return ' stroke="' + shade(fill, -0.3) + '" stroke-width="1.5" stroke-linejoin="round"';
  }

  function rect(x, y, w, h, r, fill, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function path(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>';
  }
  function circle(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>';
  }

  // One word, or two on two lines (split on the space), centered at (x, y)
  // and sized to fit a band w wide. A long word gets condensed a touch
  // rather than shrunk to nothing.
  function word(text, x, y, w, ink, max) {
    var lines = String(text).split(' ');
    var longest = lines.reduce(function (n, l) { return Math.max(n, l.length); }, 1);
    var fit = (w - 3) / (0.68 * longest);
    var fs = Math.min(max || 9, Math.max(6.5, fit));
    var squeeze = fit < 6.5 ? ' textLength="' + (w - 3) + '" lengthAdjust="spacingAndGlyphs"' : '';
    var lh = fs * 1.02;
    var top = y - ((lines.length - 1) * lh) / 2;
    return lines.map(function (line, i) {
      var baseline = (top + i * lh + fs * 0.36).toFixed(1);
      var sq = line.length === longest ? squeeze : '';
      return '<text x="' + x + '" y="' + baseline + '" text-anchor="middle" font-family="' + FONT + '" font-weight="800" font-size="' + fs.toFixed(1) + '" letter-spacing="-0.02em" fill="' + ink + '"' + sq + '>' + line + '</text>';
    }).join('');
  }

  // A label band with the word on it.
  function band(x, y, w, h, fill, text, ink, max) {
    return rect(x, y, w, h, 2.5, fill) + word(text, x + w / 2, y + h / 2, w, ink, max);
  }

  // The freezer badge: two snowflakes on the corners.
  function flake(cx, cy, r) {
    var d = +(r * 0.7).toFixed(2);
    return circle(cx, cy, r + 2.5, '#7cc7ff', edge('#7cc7ff')) +
      path('M' + (cx - r) + ' ' + cy + ' H' + (cx + r) + ' M' + cx + ' ' + (cy - r) + ' V' + (cy + r) +
           ' M' + (cx - d) + ' ' + (cy - d) + ' L' + (cx + d) + ' ' + (cy + d) +
           ' M' + (cx + d) + ' ' + (cy - d) + ' L' + (cx - d) + ' ' + (cy + d),
           'none', ' stroke="#fff" stroke-width="1.6" stroke-linecap="round"');
  }
  function frost() { return flake(13, 15, 4.5) + flake(52, 51, 3.5); }

  // --- Shape families ------------------------------------------------------
  // Each takes { label, ink, band, ... } and returns one package's markup.

  // A gallon jug: cap on a neck, shoulders, a handle on the right.
  function jug(o) {
    var body = o.body, handle = 'M42 25 H49 Q53 25 53 29 V37 Q53 41 49 41 H42';
    return [
      path(handle, 'none', ' stroke="' + shade(body, -0.3) + '" stroke-width="7.5" stroke-linecap="round"'),
      path(handle, 'none', ' stroke="' + body + '" stroke-width="4.5" stroke-linecap="round"'),
      rect(22, 5, 16, 8, 2, o.cap, edge(o.cap)),
      rect(25, 12, 10, 7, 0, body),
      path('M11 25 Q11 18 18 18 H42 Q49 18 49 25 V53 Q49 60 42 60 H18 Q11 60 11 53 Z', body, edge(body)),
      rect(15, 23, 3, 28, 1.5, '#fff', ' opacity="0.5"'),
      o.wide ? band(12.5, 31, 35, 16, o.band, o.label, o.ink) : band(16, 32, 28, 15, o.band, o.label, o.ink),
      o.stripe ? rect(12.5, 49, 35, 4, 0, o.stripe) : '',
    ].join('');
  }

  // A gable-top carton.
  function carton(o) {
    var body = o.body;
    return [
      path('M16 25 L23 11 H41 L48 25 Z', shade(body, -0.16), edge(body)),
      rect(27, 7, 10, 5, 1.5, shade(body, -0.32)),
      rect(16, 25, 32, 34, 2, body, edge(body)),
      o.art || '',
      band(20, 37, 24, 14, o.band, o.label, o.ink),
    ].join('');
  }

  // A foam tray under plastic wrap with a label sticker: the meat counter.
  function tray(o) {
    var foam = o.foam || WHITE;
    return [
      rect(5, 15, 54, 38, 6, foam, edge(foam)),
      rect(9, 19, 46, 30, 4, o.meat, edge(o.meat)),
      o.art || '',
      path('M13 47 L41 19 H49 L21 47 Z', '#fff', ' opacity="0.3"'),
      band(24, 36, 30, 12, '#fff', o.label, o.ink, 7.5),
    ].join('');
  }

  // A box, face on, with its top and right side showing.
  function box(o) {
    var w = o.w, h = o.h, d = 6, x = 29 - w / 2, y = 60 - h, face = o.face;
    var right = x + w, up = y - d * 0.75;
    var at = o.bandAt == null ? 0.5 : o.bandAt;
    return [
      path('M' + right + ' ' + y + ' L' + (right + d) + ' ' + up + ' V' + (up + h) + ' L' + right + ' ' + (y + h) + ' Z', shade(face, -0.35), edge(face)),
      path('M' + x + ' ' + y + ' L' + (x + d) + ' ' + up + ' H' + (right + d) + ' L' + right + ' ' + y + ' Z', shade(face, 0.22), edge(face)),
      rect(x, y, w, h, 1.5, face, edge(face)),
      o.art || '',
      band(x + 2, y + h * at - 7, w - 4, 14, o.band, o.label, o.ink),
      o.frost ? frost() : '',
    ].join('');
  }

  // A pillow bag with crimped seals: chips, rice, frozen peas.
  function bag(o) {
    var body = o.body, puff = o.puff || 2, seal = shade(body, -0.22);
    return [
      path('M14 14 H50 Q' + (52 + puff) + ' 34 50 54 H14 Q' + (12 - puff) + ' 34 14 14 Z', body, edge(body)),
      rect(13, 8, 38, 6, 1, seal, edge(body)),
      rect(13, 54, 38, 5, 1, seal, edge(body)),
      o.art || '',
      band(18, 27, 28, 14, o.band, o.label, o.ink),
      o.frost ? frost() : '',
    ].join('');
  }

  // A paper sack with a folded-over top: flour, sugar.
  function sack(o) {
    var body = o.body;
    return [
      path('M14 18 H50 V56 Q50 60 46 60 H18 Q14 60 14 56 Z', body, edge(body)),
      rect(14, 12, 36, 9, 1.5, shade(body, -0.12), edge(body)),
      o.art || '',
      band(18, 32, 28, 15, o.band, o.label, o.ink),
    ].join('');
  }

  // A tin can: silver rims, a label wrapped round the middle.
  function can(o) {
    var h = o.h || 40, top = 56 - h, mid = top + h * 0.5, tall = h >= 30;
    var body = 'M16 ' + top + ' V54 Q32 61 48 54 V' + top + ' Z';
    return [
      path(body, '#fff'),
      rect(16, top, 32, tall ? h * 0.5 : h + 4, 0, o.band),
      path(body, 'none', edge('#dcdcdc')),
      path('M16 54 Q32 61 48 54', 'none', ' stroke="' + shade(SILVER, -0.25) + '" stroke-width="2.5"'),
      '<ellipse cx="32" cy="' + top + '" rx="16" ry="5" fill="' + SILVER + '"' + edge(SILVER) + '/>',
      '<ellipse cx="32" cy="' + top + '" rx="12.5" ry="3.4" fill="' + shade(SILVER, 0.45) + '"/>',
      tall ? rect(18, mid - 7, 28, 14, 7, '#fff', edge('#e8e8e8')) + word(o.label, 32, mid, 28, o.ink, 8)
           : word(o.label, 32, mid + 3, 30, o.ink, 8),
    ].join('');
  }

  // A jar with a lid.
  function jar(o) {
    var body = o.body;
    return [
      rect(18, 7, 28, 9, 2, o.lid, edge(o.lid)),
      path('M16 16 H48 V52 Q48 59 41 59 H23 Q16 59 16 52 Z', body, edge(body)),
      o.art || '',
      rect(20, 20, 3, 30, 1.5, '#fff', ' opacity="0.45"'),
      band(19, 31, 26, 15, o.band, o.label, o.ink),
    ].join('');
  }

  // A bottle: cap, neck, shoulders. `wide` for a squat one.
  function bottle(o) {
    var body = o.body, w = o.wide ? 34 : 28, x = 32 - w / 2, top = 20;
    var d = 'M' + x + ' ' + (top + 5) + ' Q' + x + ' ' + top + ' ' + (x + 5) + ' ' + top +
            ' H' + (x + w - 5) + ' Q' + (x + w) + ' ' + top + ' ' + (x + w) + ' ' + (top + 5) +
            ' V54 Q' + (x + w) + ' 60 ' + (x + w - 6) + ' 60 H' + (x + 6) + ' Q' + x + ' 60 ' + x + ' 54 Z';
    return [
      rect(27, 6, 10, 7, 2, o.cap, edge(o.cap)),
      rect(28.5, 12, 7, 10, 0, body, edge(body)),
      path(d, body, edge(body)),
      o.art || '',
      rect(x + 4, top + 5, 3, 24, 1.5, '#fff', ' opacity="0.45"'),
      band(x + 3, 33, w - 6, 15, o.band, o.label, o.ink),
    ].join('');
  }

  // A spray bottle: trigger head up top, the bottle below.
  function spray(o) {
    var body = o.body, head = o.head, trigger = 'M24 22 Q19 27 21 36';
    return [
      rect(21, 11, 22, 11, 3, head, edge(head)),
      rect(14, 13, 8, 5, 1, shade(head, -0.2), edge(head)),
      path(trigger, 'none', ' stroke="' + shade(head, -0.3) + '" stroke-width="4.5" stroke-linecap="round"'),
      path(trigger, 'none', ' stroke="' + head + '" stroke-width="2.5" stroke-linecap="round"'),
      rect(29, 21, 8, 8, 0, body),
      path('M20 29 H45 Q48 29 48 32 V55 Q48 60 43 60 H25 Q20 60 20 55 Z', body, edge(body)),
      rect(24, 33, 3, 20, 1.5, '#fff', ' opacity="0.45"'),
      band(22, 37, 24, 15, o.band, o.label, o.ink),
    ].join('');
  }

  // A tub with a lid: ice cream, yogurt.
  function tub(o) {
    var body = o.body, w = o.w || 40, x = 32 - w / 2, top = o.top || 12, taper = 3;
    var l = x + 1, r = x + w - 1;
    return [
      rect(x - 1, top - 2, w + 2, 8, 3, o.lid, edge(o.lid)),
      path('M' + l + ' ' + (top + 6) + ' H' + r + ' L' + (r - taper) + ' 57 Q' + (r - taper) + ' 60 ' + (r - taper - 3) + ' 60 H' + (l + taper + 3) + ' Q' + (l + taper) + ' 60 ' + (l + taper) + ' 57 Z', body, edge(body)),
      o.art || '',
      band(x + 5, top + 18, w - 10, 15, o.band, o.label, o.ink),
      o.frost ? frost() : '',
    ].join('');
  }

  // Rolls in plastic: paper towels (two tall), toilet paper (four short).
  function rolls(o) {
    var roll = WHITE, out = [];
    o.rolls.forEach(function (r) {
      var cx = r[0] + r[2] / 2;
      out.push(rect(r[0], r[1], r[2], r[3], 3, roll, edge(roll)));
      out.push('<ellipse cx="' + cx + '" cy="' + r[1] + '" rx="' + (r[2] / 2) + '" ry="3.5" fill="' + shade(roll, -0.05) + '"' + edge(roll) + '/>');
      out.push('<ellipse cx="' + cx + '" cy="' + r[1] + '" rx="3" ry="1.4" fill="' + shade(roll, -0.35) + '"/>');
    });
    out.push(band(6, o.bandY, 52, 18, o.band, o.label, o.ink));
    return out.join('');
  }

  // --- One-offs ------------------------------------------------------------

  // An egg carton: pulp lid with the row of bumps.
  function eggs() {
    var pulp = '#e2dccb', lid = 'M8 34 V25 Q8 22 11 22 H11.4';
    for (var i = 0; i < 6; i++) lid += ' a3.55 3.55 0 0 1 7.1 0';
    lid += ' H53 Q56 22 56 25 V34 Z';
    return [
      path(lid, shade(pulp, -0.06), edge(pulp)),
      rect(8, 33, 48, 21, 4, pulp, edge(pulp)),
      band(18, 37, 28, 13, '#fff', 'EGGS', '#7a5c2e'),
    ].join('');
  }

  // A sliced loaf in its bag: the twist tie gives it away.
  function loaf() {
    var crust = '#e0a85a';
    var shape = 'M8 50 Q8 30 16 26 Q24 14 33 24 Q42 14 52 28 Q56 32 56 50 V54 Q56 58 52 58 H12 Q8 58 8 54 Z';
    return [
      path(shape, crust, edge(crust)),
      path('M22 27 V56 M34 24 V56 M46 28 V56', 'none', ' stroke="' + shade(crust, -0.25) + '" stroke-width="1.2" opacity="0.7"'),
      path(shape, '#fff', ' opacity="0.25"'),
      circle(57, 26, 3.5, '#2f7de1', edge('#2f7de1')),
      band(18, 38, 28, 13, '#2f7de1', 'BREAD', '#fff'),
    ].join('');
  }

  // A bakery cake in a clamshell.
  function cake() {
    return [
      '<ellipse cx="32" cy="55" rx="27" ry="5" fill="#dfe3e8"' + edge('#dfe3e8') + '/>',
      rect(13, 44, 38, 11, 2, '#e8c88f', edge('#e8c88f')),
      rect(13, 33, 38, 12, 3, '#f7b7cc', edge('#f7b7cc')),
      circle(24, 31, 2.6, '#f7b7cc') + circle(32, 30, 2.6, '#f7b7cc') + circle(40, 31, 2.6, '#f7b7cc'),
      circle(32, 26.5, 2.6, '#d7262c'),
      path('M7 54 V34 Q7 12 32 12 Q57 12 57 34 V54', '#fff', ' opacity="0.28" stroke="#b7c3cf" stroke-width="1.5"'),
      band(34, 45, 20, 10, '#fff', 'CAKE', '#c2185b', 7),
    ].join('');
  }

  // A block of cheese.
  function cheese() {
    var c = '#f5b83d', hole = shade(c, -0.3);
    return [
      path('M10 32 L18 24 H54 L46 32 Z', shade(c, 0.28), edge(c)),
      path('M46 32 L54 24 V50 L46 58 Z', shade(c, -0.28), edge(c)),
      rect(10, 32, 36, 26, 1.5, c, edge(c)),
      circle(17, 39, 2.2, hole) + circle(40, 53, 2.6, hole) + circle(14, 53, 1.6, hole),
      band(15, 41, 26, 12, '#fff', 'CHEESE', '#b8860b', 7.5),
    ].join('');
  }

  // A pack of bacon with a window.
  function bacon() {
    var pack = '#8e1b1b', stripes = '';
    for (var i = 0; i < 4; i++) {
      var y = 33 + i * 4.6;
      stripes += path('M15 ' + y + ' Q22 ' + (y - 2.5) + ' 29 ' + y + ' T43 ' + y + ' T50 ' + y, 'none', ' stroke="#c0392b" stroke-width="2.2" stroke-linecap="round"');
    }
    return [
      rect(8, 18, 48, 36, 4, pack, edge(pack)),
      rect(13, 30, 38, 19, 2, '#f5c9b4', edge('#f5c9b4')),
      stripes,
      word('BACON', 32, 24, 40, '#fff', 8),
    ].join('');
  }

  // A pack of sponges.
  function sponges() {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var y = 14 + i * 14;
      out.push(rect(12, y, 40, 12, 2, '#f7d94c', edge('#f7d94c')));
      out.push(rect(12, y, 40, 4.5, 1.5, '#2e8b57', edge('#2e8b57')));
    }
    out.push(path('M10 12 H54 V58 H10 Z', '#fff', ' opacity="0.22" stroke="#9fb6c9" stroke-width="1.5"'));
    out.push(band(14, 31, 36, 13, '#1d3f8f', 'SPONGES', '#fff'));
    return out.join('');
  }

  // --- Small decorations ---------------------------------------------------

  var grind = [[15, 24], [23, 22], [31, 25], [40, 23], [48, 26], [17, 31], [26, 30], [36, 31], [46, 30], [14, 44], [21, 46]]
    .map(function (p, i) { return circle(p[0], p[1], 1.5, i % 3 ? '#8e1b1b' : '#e57368'); }).join('');
  var breasts = path('M12 24 Q24 18 33 26 Q28 36 13 34 Z', '#f9dccb') + path('M34 25 Q44 19 52 27 Q50 38 36 36 Z', '#f9dccb');
  var fatLines = path('M12 42 L27 21 M21 46 L37 21 M31 47 L47 21 M41 47 L52 30', 'none', ' stroke="#fff" stroke-width="1.6" opacity="0.6"');
  var peaPods = [[18, 20], [28, 18], [40, 21], [22, 47], [34, 49], [44, 45]]
    .map(function (p) { return circle(p[0], p[1], 3, '#7ed957', edge('#7ed957')); }).join('');
  var rings = [21, 29, 37].map(function (cx) { return circle(cx, 27, 4, 'none', ' stroke="#e08a1a" stroke-width="3"'); }).join('');
  var pastaWindow = rect(19, 23, 20, 13, 1.5, '#f6dc8b') +
    path('M22 25 V34 M25 25 V34 M28 25 V34 M31 25 V34 M34 25 V34 M37 25 V34', 'none', ' stroke="#d9b545" stroke-width="1.4"');
  var grains = [[18, 18], [26, 16], [35, 19], [43, 16], [47, 22], [22, 23], [31, 23], [40, 24], [17, 45], [25, 48], [34, 45], [42, 49], [47, 44], [30, 51]]
    .map(function (p) { return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="2.3" ry="1.1" transform="rotate(-30 ' + p[0] + ' ' + p[1] + ')" fill="#fff" stroke="#cfc4a6" stroke-width="0.6"/>'; }).join('');
  var pickleSlices = [[22, 23], [38, 22], [26, 52], [40, 51]]
    .map(function (p) { return circle(p[0], p[1], 3.8, '#c5e17a', ' stroke="#7cb342" stroke-width="1.4"'); }).join('');
  var orange = circle(32, 31, 4.5, '#ffd166', edge('#ffd166'));
  var bulb = circle(29, 37, 5.5, '#ffe27a', edge('#ffe27a')) + rect(26.5, 42, 5, 3.5, 1, '#9aa0a6');

  // --- The catalog ---------------------------------------------------------

  var PACKS = {
    // The dairy case, the meat counter, the freezer.
    milk:     jug({ body: WHITE, cap: '#d7262c', band: '#2f7de1', ink: '#fff', label: 'MILK' }),
    juice:    carton({ body: '#ff9f1a', band: '#fff', ink: '#e07b00', label: 'JUICE', art: orange }),
    eggs:     eggs(),
    beef:     tray({ meat: '#c0392b', ink: '#333', label: 'BEEF', art: grind }),
    chicken:  tray({ meat: '#f2c4ad', ink: '#333', label: 'CHICKEN', art: breasts }),
    salmon:   tray({ meat: '#f08a68', ink: '#333', label: 'SALMON', art: fatLines }),
    bacon:    bacon(),
    cheese:   cheese(),
    butter:   box({ w: 40, h: 20, face: '#f9e7a8', band: '#1d3f8f', ink: '#fff', label: 'BUTTER' }),
    yogurt:   tub({ w: 28, top: 22, lid: '#2f7de1', body: WHITE, band: '#2f7de1', ink: '#fff', label: 'YOGURT' }),
    icecream: tub({ lid: '#e91e63', body: '#fdf0f4', band: '#e91e63', ink: '#fff', label: 'ICE CREAM', frost: true }),
    pizza:    box({ w: 44, h: 26, face: '#d7262c', band: '#fff', ink: '#d7262c', label: 'PIZZA', frost: true }),
    peas:     bag({ body: '#2e8b57', band: '#fff', ink: '#2e8b57', label: 'PEAS', frost: true, art: peaPods }),
    cake:     cake(),

    // The pantry aisles.
    cereal:   box({ w: 32, h: 46, face: '#ffc933', band: '#d7262c', ink: '#fff', label: 'CEREAL', bandAt: 0.66, art: rings }),
    pasta:    box({ w: 30, h: 42, face: '#1f57c3', band: '#fff', ink: '#1f57c3', label: 'PASTA', bandAt: 0.72, art: pastaWindow }),
    rice:     bag({ body: '#e9e1cc', band: '#c8102e', ink: '#fff', label: 'RICE', art: grains }),
    chips:    bag({ body: '#ffd23f', puff: 6, band: '#d7262c', ink: '#fff', label: 'CHIPS' }),
    flour:    sack({ body: '#f4efe4', band: '#1d3f8f', ink: '#fff', label: 'FLOUR' }),
    coffee:   bag({ body: '#4a2c17', band: '#f4e4c1', ink: '#4a2c17', label: 'COFFEE' }),
    soup:     can({ band: '#d7262c', ink: '#d7262c', label: 'SOUP' }),
    beans:    can({ band: '#7a4b2a', ink: '#7a4b2a', label: 'BEANS' }),
    corn:     can({ band: '#f2b705', ink: '#6b5400', label: 'CORN' }),
    tuna:     can({ h: 22, band: '#1f57c3', ink: '#fff', label: 'TUNA' }),
    pb:       jar({ lid: '#c8102e', body: '#c68a4b', band: '#fff', ink: '#8b4513', label: 'PEANUT BUTTER' }),
    pickles:  jar({ lid: '#2e8b57', body: '#a4c639', band: '#fff', ink: '#2e7d32', label: 'PICKLES', art: pickleSlices }),
    sauce:    jar({ lid: '#333', body: '#b71c1c', band: '#fff', ink: '#b71c1c', label: 'SAUCE' }),
    soda:     bottle({ body: '#3b1f0e', cap: '#c8102e', band: '#c8102e', ink: '#fff', label: 'SODA' }),
    water:    bottle({ body: '#d6ecff', cap: '#1a8cff', band: '#1a8cff', ink: '#fff', label: 'WATER' }),
    ketchup:  bottle({ body: '#d7262c', cap: WHITE, band: '#fff', ink: '#d7262c', label: 'KETCHUP' }),
    bread:    loaf(),

    // Household: never with the food.
    laundry:  jug({ body: '#ff8c1a', cap: '#1d3f8f', band: '#1d3f8f', ink: '#fff', label: 'LAUNDRY' }),
    bleach:   jug({ body: WHITE, cap: '#1a5bc4', band: '#1a5bc4', ink: '#fff', label: 'BLEACH', wide: true, stripe: '#ffd60a' }),
    dish:     bottle({ wide: true, body: '#2ecc71', cap: WHITE, band: '#fff', ink: '#1e8449', label: 'DISH SOAP' }),
    spray:    spray({ body: '#3aa5ff', head: WHITE, band: '#fff', ink: '#1a5bc4', label: 'SPRAY' }),
    shampoo:  bottle({ wide: true, body: '#8e44ad', cap: WHITE, band: '#fff', ink: '#8e44ad', label: 'SHAMPOO' }),
    towels:   rolls({ rolls: [[8, 14, 22, 44], [34, 14, 22, 44]], bandY: 27, band: '#2f7de1', ink: '#fff', label: 'PAPER TOWELS' }),
    tp:       rolls({ rolls: [[8, 38, 22, 20], [34, 38, 22, 20], [8, 12, 22, 20], [34, 12, 22, 20]], bandY: 25, band: '#e91e63', ink: '#fff', label: 'TOILET PAPER' }),
    trash:    box({ w: 36, h: 28, face: '#2b2b2b', band: '#fff', ink: '#2b2b2b', label: 'TRASH BAGS' }),
    sponges:  sponges(),
    bulbs:    box({ w: 30, h: 30, face: WHITE, band: '#ffd60a', ink: '#3a3000', label: 'BULBS', bandAt: 0.74, art: bulb }),
  };

  // --- The sprite ----------------------------------------------------------

  var ids = Object.keys(PACKS);
  var sprite = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
    ids.map(function (id) { return '<symbol id="pk-' + id + '" viewBox="0 0 64 64">' + PACKS[id] + '</symbol>'; }).join('') +
    '</svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);

  window.BaggerArt = {
    ids: ids,
    // Markup for one package, sized by its container.
    html: function (id) {
      return '<svg class="art" viewBox="0 0 64 64" aria-hidden="true"><use href="#pk-' + id + '"/></svg>';
    },
  };
})();
