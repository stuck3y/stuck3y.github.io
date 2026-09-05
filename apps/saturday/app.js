/* Saturday — a spoiler-safe college football companion.
 *
 * Auburn everything, the SEC around it, and how to actually catch each game.
 * No build, no backend. Data comes from ESPN's public JSON (keyless, CORS-open)
 * and, best-effort, a few Auburn feeds through a public CORS proxy. Everything
 * paints from a cached copy first, then hydrates. Spoilers stay hidden until
 * you flip No-spoil off, or reveal one game at a time.
 */
(() => {
'use strict';

/* ── who we are ─────────────────────────────────────────────────────────── */
const SEASON_FALLBACK = 2026;
const AUBURN = { id: '2', abbr: 'AUB', name: 'Auburn', full: 'Auburn Tigers' };
const SEC = '8';                         // ESPN conference id
const FBS = '80';                        // ESPN group id for all of FBS
const RIVALS = { '333': 'Alabama', '61': 'Georgia', '57': 'Florida', '99': 'LSU' };
const WORTH_IT = 40;                     // heat threshold for the "Worth it" slate

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/';
const LOGO = (id) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
const GAMECAST = (id) => `https://www.espn.com/college-football/game/_/gameId/${id}`;
const YT = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const RCFB = 'https://www.reddit.com/r/CFB/';
const rcfbSearch = (q) => RCFB + 'search/?q=' + encodeURIComponent(q) + '&restrict_sr=1&sort=new';
const rcfbRss = (q, t) => RCFB + 'search.rss?q=' + encodeURIComponent(q) + '&restrict_sr=1&sort=new&t=' + t;
const GAME_MS = 3.5 * 3600e3;            // kickoff to final, give or take
const HL_MS = 20 * 60e3;                 // one highlights block
const HL_LAG = 45 * 60e3;                // uploads usually land about this long after the final

/* ── your bundle: ESPN Unlimited + Disney+ ──────────────────────────────────
 * Anything ESPN produces streams in the ESPN app, ABC simulcasts included.
 * Everything else needs an antenna, another service, or a recording. */
const BUNDLE = 'ESPN Unlimited + Disney+';
function network(raw) {
  const n = String(raw || '').trim();
  if (!n) return null;
  const t = n.toLowerCase().replace(/\s+/g, ' ');
  const yes = (name, note) => ({ name, ok: true, note: note || '' });
  const no = (name, note) => ({ name, ok: false, note: note || '' });
  if (/^(espn3|espn\+|espn plus)$/.test(t)) return yes('ESPN+');
  if (/^(sec network ?\+|secn\+|sec\+)$/.test(t)) return yes('SECN+');
  if (/^(sec network|secn|sec net)$/.test(t)) return yes('SEC Network');
  if (/^(acc network ?x|accnx|acc network extra)$/.test(t)) return yes('ACCNX');
  if (/^(acc network|accn)$/.test(t)) return yes('ACC Network');
  if (/^espnews$/.test(t)) return yes('ESPNEWS');
  if (/^espnu$/.test(t)) return yes('ESPNU');
  if (/^espn2$/.test(t)) return yes('ESPN2');
  if (/^espn deportes$/.test(t)) return yes('ESPN Deportes');
  if (/^espn$/.test(t)) return yes('ESPN');
  if (/^abc$/.test(t)) return yes('ABC', 'streams in the ESPN app');
  if (/^cbs$/.test(t)) return no('CBS', 'antenna or Paramount+');
  if (/cbs sports network|cbssn/.test(t)) return no('CBSSN');
  if (/paramount/.test(t)) return no('Paramount+');
  if (/^fox$/.test(t)) return no('FOX', 'antenna or Fox One');
  if (/^(fs1|fs2)$|fox sports/.test(t)) return no(n.toUpperCase());
  if (/^nbc$/.test(t)) return no('NBC', 'antenna or Peacock');
  if (/peacock/.test(t)) return no('Peacock');
  if (/big ten network|^btn$/.test(t)) return no('BTN');
  if (/^(the cw|cw network|cw)$/.test(t)) return no('The CW', 'antenna');
  if (/^(tnt|tbs|trutv|max)$|hbo/.test(t)) return no(n.toUpperCase(), 'Max');
  if (/prime|amazon/.test(t)) return no('Prime Video');
  return no(n);   // unknown network: assume you can't
}
function watchPlan(g) {
  const nets = uniq(g.nets || []).map(network).filter(Boolean);
  const inBundle = nets.filter((x) => x.ok);
  if (!nets.length) return { kind: 'tba', nets, label: 'TV TBA', detail: 'Networks land 6–12 days out.' };
  if (inBundle.length) return { kind: 'bundle', nets, label: inBundle[0].name, detail: `In your bundle${inBundle[0].note ? ' — ' + inBundle[0].note : ''}.` };
  const first = nets[0];
  return { kind: 'record', nets, label: first.name + ' · record', detail: `Not in your bundle${first.note ? ' — ' + first.note : ''}. Record it, or catch highlights.` };
}

/* ── sources: "Auburn everything" ───────────────────────────────────────── */
const SOURCES = [
  { id: 'espn',    name: 'ESPN',                   kind: 'espn',    auburn: true,  url: ESPN + 'news?team=2&limit=25', home: 'https://www.espn.com/college-football/team/_/id/2/auburn-tigers' },
  { id: 'sds',     name: 'Saturday Down South',    kind: 'rss',     auburn: true,  url: 'https://www.saturdaydownsouth.com/auburn-football/feed/', home: 'https://www.saturdaydownsouth.com/auburn-football/' },
  { id: 'on3',     name: 'AuburnSports · On3',     kind: 'rss',     auburn: true,  paywall: 'some', url: 'https://www.on3.com/teams/auburn-tigers/feed/', home: 'https://www.on3.com/teams/auburn-tigers/' },
  { id: 'al',      name: 'AL.com',                 kind: 'rss',     auburn: true,  url: 'https://www.al.com/arc/outboundfeeds/rss/category/auburnfootball/?outputType=xml', home: 'https://www.al.com/auburnfootball/' },
  { id: 'tet',     name: "Track 'Em Tigers",       kind: 'rss',     auburn: true,  url: 'https://www.trackemtigers.com/rss/index.xml', home: 'https://www.trackemtigers.com/' },
  { id: 'aut',     name: 'AuburnTigers.com',       kind: 'rss',     auburn: true,  url: 'https://auburntigers.com/rss?path=football', home: 'https://auburntigers.com/sports/football' },
  { id: 'wheels',  name: 'Wheels',                 kind: 'youtube', auburn: false, url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCi-INxdmFSrTrT95xU0sBpg', home: 'https://www.youtube.com/@WheelsYT' },
  { id: '247',     name: 'Auburn Undercover · 247', kind: 'link',   paywall: 'yes', home: 'https://247sports.com/college/auburn/' },
  { id: 'athl',    name: 'The Athletic',           kind: 'link',    paywall: 'yes', home: 'https://www.nytimes.com/athletic/college-football/team/auburn-tigers/' },
  { id: 'espncfb', name: 'ESPN CFB · YouTube',     kind: 'link',    home: 'https://www.youtube.com/@espncfb' },
];
const SOURCE = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
const PROXIES = [
  (u) => ({ url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(u), shape: 'rss2json' }),
  (u) => ({ url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(u), shape: 'allorigins' }),
];

/* ── baked fallback: Auburn's 2026 slate, so the app is never blank ──────── */
const SEC_TEAMS = [
  ['333', 'ALA', 'Alabama'], ['8', 'ARK', 'Arkansas'], ['2', 'AUB', 'Auburn'], ['57', 'FLA', 'Florida'],
  ['61', 'UGA', 'Georgia'], ['96', 'UK', 'Kentucky'], ['99', 'LSU', 'LSU'], ['344', 'MSST', 'Mississippi State'],
  ['142', 'MIZ', 'Missouri'], ['201', 'OU', 'Oklahoma'], ['145', 'MISS', 'Ole Miss'], ['2579', 'SC', 'South Carolina'],
  ['2633', 'TENN', 'Tennessee'], ['251', 'TEX', 'Texas'], ['245', 'TA&M', 'Texas A&M'], ['238', 'VAN', 'Vanderbilt'],
];
const T = (id, abbr, name, conf) => ({ id, abbr, name, full: name, conf: conf || null, logo: LOGO(id), rank: null, record: null, score: null, winner: false });
const BAKED_AUBURN = [
  { week: 1,  ts: '2026-09-05T19:30Z', opp: T('239', 'BAY', 'Baylor', '4'),               at: 'neutral', venue: 'Mercedes-Benz Stadium', city: 'Atlanta, GA',      nets: ['ABC'], note: 'Aflac Kickoff Game' },
  { week: 2,  ts: '2026-09-12T23:30Z', opp: T('2572', 'USM', 'Southern Miss', '37'),      at: 'home',    nets: ['ESPNU', 'SEC Network'] },
  { week: 3,  ts: '2026-09-19T23:00Z', opp: T('57', 'FLA', 'Florida', SEC),               at: 'home',    nets: ['ESPN'] },
  { week: 4,  ts: '2026-09-26T17:00Z', opp: T('238', 'VAN', 'Vanderbilt', SEC),           at: 'home',    tba: true },
  { week: 5,  ts: '2026-10-03T17:00Z', opp: T('2633', 'TENN', 'Tennessee', SEC),          at: 'away',    venue: 'Neyland Stadium', city: 'Knoxville, TN', tba: true },
  { week: 7,  ts: '2026-10-17T17:00Z', opp: T('61', 'UGA', 'Georgia', SEC),               at: 'away',    venue: 'Sanford Stadium', city: 'Athens, GA', tba: true },
  { week: 8,  ts: '2026-10-24T16:00Z', opp: T('99', 'LSU', 'LSU', SEC),                   at: 'home',    nets: ['ABC', 'ESPN'] },
  { week: 9,  ts: '2026-10-31T17:00Z', opp: T('145', 'MISS', 'Ole Miss', SEC),            at: 'away',    venue: 'Vaught-Hemingway Stadium', city: 'Oxford, MS', tba: true },
  { week: 10, ts: '2026-11-07T17:00Z', opp: T('8', 'ARK', 'Arkansas', SEC),               at: 'home',    tba: true },
  { week: 11, ts: '2026-11-14T17:00Z', opp: T('344', 'MSST', 'Mississippi State', SEC),   at: 'away',    venue: 'Davis Wade Stadium', city: 'Starkville, MS', tba: true },
  { week: 12, ts: '2026-11-21T17:00Z', opp: T('2535', 'SAM', 'Samford', null),            at: 'home',    tba: true },
  { week: 13, ts: '2026-11-28T17:00Z', opp: T('333', 'ALA', 'Alabama', SEC),              at: 'away',    venue: 'Bryant-Denny Stadium', city: 'Tuscaloosa, AL', tba: true, note: 'Iron Bowl' },
];
const SEED_PLAYERS = [
  { id: 'p-coleman', name: 'Cam Coleman', pos: 'WR', teamId: '251', team: 'Texas', teamAbbr: 'TEX', from: 'Auburn' },
  { id: 'p-knight',  name: 'Deuce Knight', pos: 'QB', teamId: '145', team: 'Ole Miss', teamAbbr: 'MISS', from: 'Auburn' },
];

/* ── storage (sys.storage, namespaced) ──────────────────────────────────── */
const store = {
  get(k, fb) { return window.sys ? sys.storage.get('saturday.' + k, fb) : fb; },
  set(k, v) { if (window.sys) sys.storage.set('saturday.' + k, v); },
};
const cache = {
  get(k, maxAge) {
    const c = store.get('cache.' + k);
    if (!c || !c.at) return null;
    if (maxAge != null && Date.now() - c.at > maxAge) return null;
    return c;
  },
  set(k, data) { store.set('cache.' + k, { at: Date.now(), data }); },
};

/* ── state ──────────────────────────────────────────────────────────────── */
const state = {
  season: SEASON_FALLBACK, curType: 2, curWeek: null,
  calendar: null,                      // [{ type, week, label, detail, start, end }]
  view: { type: 2, week: null },       // the week on screen
  weeks: {},                           // key -> { games, at }
  auburn: { games: [], at: 0, live: false, record: null },
  news: { items: [], at: 0, status: {} },
  box: {},                             // gameId -> box score lines
  settings: { nospoil: true, filter: 'worth', tab: 'weekend', sortBy: {} },
  revealed: {}, plan: {}, watched: {},
  gameday: { at: 0, week: null, picks: null, links: [] },
  rcfb: { at: 0, items: [] },
  players: [],
  online: null,                        // null (unknown), true, false
  loading: false,
};
const expanded = new Set();
const shownNews = new Set();
let tickTimer = null;

/* ── tiny helpers ───────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uniq = (a) => Array.from(new Set(a.filter(Boolean)));
const num = (v) => { if (v == null || v === '') return null; if (typeof v === 'object') v = v.value != null ? v.value : v.displayValue; const n = Number(v); return Number.isFinite(n) ? n : null; };
const wkKey = (type, week) => `${state.season}.${type}.${week}`;
const isNum = (id) => /^\d+$/.test(String(id));
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtDow = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const fmtMD = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60e3) return 'just now';
  const m = Math.floor(diff / 60e3); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}
function untilText(ts) {
  const d = ts - Date.now(); if (d <= 0) return '';
  const h = Math.floor(d / 3600e3), days = Math.floor(h / 24), m = Math.floor((d % 3600e3) / 60e3);
  if (days >= 1) return `in ${days}d ${h % 24}h`;
  if (h >= 1) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}
function periodLabel(p) { if (!p) return ''; if (p <= 4) return ['1st', '2nd', '3rd', '4th'][p - 1]; return p === 5 ? 'OT' : (p - 4) + 'OT'; }

/* ── ESPN → our game shape ──────────────────────────────────────────────── */
function normTeam(c) {
  const t = c.team || {};
  const id = String(t.id || '');
  const rank = c.curatedRank && c.curatedRank.current != null ? Number(c.curatedRank.current) : null;
  const recs = c.records || c.record;
  let record = null;
  if (Array.isArray(recs)) { const o = recs.find((r) => r.type === 'total' || r.name === 'overall') || recs[0]; record = o ? (o.summary || o.displayValue || null) : null; }
  return {
    id, abbr: t.abbreviation || '', name: t.shortDisplayName || t.location || t.displayName || '', full: t.displayName || '',
    conf: t.conferenceId != null ? String(t.conferenceId) : null,
    logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || (id ? LOGO(id) : ''),
    rank: rank && rank <= 25 ? rank : null, record,
    score: num(c.score), winner: !!c.winner,
  };
}
function broadcastNames(comp) {
  const out = [];
  for (const b of comp.broadcasts || []) { if (Array.isArray(b.names)) out.push(...b.names); else if (b.media && b.media.shortName) out.push(b.media.shortName); }
  for (const g of comp.geoBroadcasts || []) { if (g.media && g.media.shortName && (!g.market || /national/i.test(g.market.type || ''))) out.push(g.media.shortName); }
  return uniq(out.map((s) => String(s).trim()));
}
function normStatus(st) {
  const t = (st && st.type) || {};
  const name = t.name || '', s = t.state || '';
  if (/POSTPONED|CANCELED|CANCELLED|SUSPENDED|FORFEIT/.test(name)) return { status: 'off', detail: t.shortDetail || t.description || 'Off', period: 0, clock: '', ot: false };
  if (s === 'in' || /IN_PROGRESS|HALFTIME|END_PERIOD/.test(name)) {
    const p = Number(st.period) || 0;
    const detail = /HALFTIME/.test(name) ? 'Half' : (periodLabel(p) + (st.displayClock ? ' ' + st.displayClock : '')).trim();
    return { status: 'in', detail: detail || 'Live', period: p, clock: st.displayClock || '', ot: p > 4 };
  }
  if (s === 'post' || t.completed || /FINAL/.test(name)) return { status: 'post', detail: 'Final', period: Number(st.period) || 0, clock: '', ot: (Number(st.period) || 0) > 4 || /OT/i.test(t.detail || '') };
  return { status: 'pre', detail: '', period: 0, clock: '', ot: false };
}
function normEvent(e) {
  const comp = (e.competitions && e.competitions[0]) || {};
  const cs = comp.competitors || [];
  const home = cs.find((c) => c.homeAway === 'home') || cs[0];
  const away = cs.find((c) => c.homeAway === 'away') || cs[1];
  if (!home || !away) return null;
  const st = normStatus(comp.status || e.status);
  const odd = (comp.odds && comp.odds[0]) || null;
  let odds = null;
  if (odd && st.status === 'pre') {
    let spread = num(odd.spread);
    if (spread == null && odd.details) { const m = String(odd.details).match(/-?\d+(\.\d+)?/); spread = m ? Number(m[0]) : null; }
    odds = { details: odd.details || '', spread, ou: num(odd.overUnder) };
  }
  const note = comp.notes && comp.notes[0] && comp.notes[0].headline ? String(comp.notes[0].headline) : null;
  const ts = Date.parse(e.date || comp.date || '') || 0;
  return {
    id: String(e.id || comp.id || ''), ts, tba: !!(e.timeValid === false || comp.timeValid === false),
    week: e.week && e.week.number != null ? Number(e.week.number) : null,
    type: e.season && e.season.type != null ? Number(e.season.type) : (e.seasonType && e.seasonType.type != null ? Number(e.seasonType.type) : null),
    status: st.status, detail: st.detail, period: st.period, ot: st.ot,
    neutral: !!comp.neutralSite,
    venue: comp.venue && comp.venue.fullName ? comp.venue.fullName : null,
    city: comp.venue && comp.venue.address ? [comp.venue.address.city, comp.venue.address.state].filter(Boolean).join(', ') : null,
    home: normTeam(home), away: normTeam(away),
    nets: broadcastNames(comp), odds, note,
  };
}
function bakedAuburn() {
  return BAKED_AUBURN.map((b) => {
    const me = T(AUBURN.id, AUBURN.abbr, AUBURN.name, SEC);
    const home = b.at === 'away' ? b.opp : me, away = b.at === 'away' ? me : b.opp;
    return { id: 'aub-w' + b.week, ts: Date.parse(b.ts), tba: !!b.tba, week: b.week, type: 2, status: 'pre', detail: '', period: 0, ot: false,
      neutral: b.at === 'neutral', venue: b.venue || (b.at === 'home' ? 'Jordan-Hare Stadium' : null), city: b.city || (b.at === 'home' ? 'Auburn, AL' : null),
      home, away, nets: b.nets || [], odds: null, note: b.note || null };
  });
}
function parseCalendar(sb) {
  const L = sb && sb.leagues && sb.leagues[0];
  if (!L || !Array.isArray(L.calendar)) return null;
  const out = [];
  for (const sec of L.calendar) {
    if (typeof sec !== 'object' || !sec) continue;
    const type = Number(sec.value) || 2;
    if (Array.isArray(sec.entries)) {
      for (const en of sec.entries) out.push({ type, week: Number(en.value) || out.length + 1, label: en.label || ('Week ' + en.value), detail: en.detail || '', start: Date.parse(en.startDate) || 0, end: Date.parse(en.endDate) || 0 });
    } else if (sec.startDate) {
      out.push({ type, week: 1, label: sec.label || 'Season', detail: '', start: Date.parse(sec.startDate) || 0, end: Date.parse(sec.endDate) || 0 });
    }
  }
  return out.length ? out : null;
}
function bakedCalendar(season) {
  const out = [];
  const w1 = Date.UTC(season, 7, 25, 7);                         // Tue Aug 25 — ESPN's week 1 holds week 0 too
  out.push({ type: 2, week: 1, label: 'Week 1', detail: '', start: w1, end: w1 + 14 * 864e5 - 60e3 });
  for (let w = 2; w <= 15; w++) { const s = w1 + (14 + (w - 2) * 7) * 864e5; out.push({ type: 2, week: w, label: 'Week ' + w, detail: '', start: s, end: s + 7 * 864e5 - 60e3 }); }
  return out;
}

/* ── network ────────────────────────────────────────────────────────────── */
async function getJSON(url, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout || 9000);
  try { const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' }); if (!res.ok) return null; return await res.json(); }
  catch (_) { return null; }
  finally { clearTimeout(t); }
}
function scoreboardUrl(type, week) {
  const u = new URL(ESPN + 'scoreboard');
  u.searchParams.set('groups', FBS); u.searchParams.set('limit', '400');
  if (week != null) { u.searchParams.set('dates', String(state.season)); u.searchParams.set('seasontype', String(type)); u.searchParams.set('week', String(week)); }
  return u.toString();
}
async function fetchWeek(type, week) {
  const sb = await getJSON(scoreboardUrl(type, week));
  if (!sb || !Array.isArray(sb.events)) return null;
  if (sb.season && sb.season.year) state.season = Number(sb.season.year);
  if (week == null) {
    if (sb.week && sb.week.number != null) state.curWeek = Number(sb.week.number);
    if (sb.season && sb.season.type != null) state.curType = Number(sb.season.type);
    const cal = parseCalendar(sb); if (cal) { state.calendar = cal; store.set('calendar', { season: state.season, cal }); }
  }
  const games = sb.events.map(normEvent).filter(Boolean);
  const inferredWeek = week != null ? week : (state.curWeek != null ? state.curWeek : (games[0] && games[0].week));
  const inferredType = week != null ? type : state.curType;
  return { games, at: Date.now(), week: inferredWeek, type: inferredType };
}
async function fetchAuburn() {
  const d = await getJSON(`${ESPN}teams/${AUBURN.id}/schedule?season=${state.season}`);
  if (!d || !Array.isArray(d.events)) return null;
  const games = d.events.map(normEvent).filter(Boolean).sort((a, b) => a.ts - b.ts);
  const record = d.team && (d.team.recordSummary || null);
  return games.length ? { games, at: Date.now(), live: true, record } : null;
}

/* ── loading orchestration ──────────────────────────────────────────────── */
function weekAge(w) { return w ? Date.now() - w.at : Infinity; }
function hasLive(w) { return !!(w && w.games.some((g) => g.status === 'in')); }
function staleFor(key) {
  const w = state.weeks[key]; if (!w) return true;
  if (hasLive(w)) return weekAge(w) > 45e3;
  const allDone = w.games.length && w.games.every((g) => g.status === 'post' || g.status === 'off');
  const kickoffSoon = w.games.some((g) => g.status === 'pre' && g.ts - Date.now() < 3600e3 && g.ts - Date.now() > -4 * 3600e3);
  if (kickoffSoon) return weekAge(w) > 2 * 60e3;
  return weekAge(w) > (allDone ? 6 * 3600e3 : 10 * 60e3);
}
async function loadWeek(type, week, force) {
  const key = wkKey(type, week);
  const cached = cache.get('week.' + key);
  if (cached && !state.weeks[key]) state.weeks[key] = cached.data;
  if (!force && !staleFor(key)) { render(); return; }
  state.loading = true; renderStatus();
  const fresh = await fetchWeek(type, week);
  state.loading = false;
  if (fresh) { state.online = true; state.weeks[key] = fresh; cache.set('week.' + key, fresh); }
  else if (state.online == null) state.online = false;
  render();
}
async function boot() {
  const savedCal = store.get('calendar');
  if (savedCal && savedCal.cal && savedCal.season) { state.season = savedCal.season; state.calendar = savedCal.cal; }
  const savedAub = cache.get('auburn');
  state.auburn = savedAub ? savedAub.data : { games: bakedAuburn(), at: 0, live: false, record: null };
  // paint whatever we have for the last-known current week
  const lastCur = store.get('cur');
  if (lastCur && lastCur.season === state.season) { state.curWeek = lastCur.week; state.curType = lastCur.type; }
  if (state.curWeek == null) state.curWeek = guessWeek();
  state.view = { type: state.curType, week: state.curWeek };
  try {                                                      // warm every cached week (cheap, keeps Saved working offline)
    for (const k of Object.keys(localStorage)) {
      const m = k.match(/^sys:saturday\.cache\.week\.(.+)$/); if (!m) continue;
      const c = cache.get('week.' + m[1]); if (c) state.weeks[m[1]] = c.data;
    }
  } catch (_) {}
  render();

  state.loading = true; renderStatus();
  const cur = await fetchWeek(state.curType, null);        // no week param → ESPN tells us what "now" is
  state.loading = false;
  if (cur) {
    state.online = true;
    const key = wkKey(cur.type, cur.week);
    state.weeks[key] = cur; cache.set('week.' + key, cur);
    state.curType = cur.type; state.curWeek = cur.week;
    store.set('cur', { season: state.season, type: cur.type, week: cur.week });
    state.view = { type: cur.type, week: cur.week };
    const allDone = cur.games.length && cur.games.every((g) => g.status === 'post' || g.status === 'off');
    if (allDone) { const nxt = calNeighbor(1); if (nxt) state.view = { type: nxt.type, week: nxt.week }; }
  } else if (state.online == null) state.online = false;
  render();
  if (state.view.week !== state.curWeek || state.view.type !== state.curType) loadWeek(state.view.type, state.view.week, false);
  refreshAuburn(false);
  loadGameDay(false); loadRcfb(false);
  startTicking();
}
async function refreshAuburn(force) {
  if (!force && state.auburn.live && Date.now() - state.auburn.at < 10 * 60e3) return;
  const a = await fetchAuburn();
  if (a) { state.auburn = a; cache.set('auburn', a); render(); }
}
function startTicking() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (document.hidden) return;
    const key = wkKey(state.view.type, state.view.week);
    if (staleFor(key)) loadWeek(state.view.type, state.view.week, true);
    else if (state.weeks[key] && state.weeks[key].games.some((g) => g.status === 'pre' && g.ts - Date.now() < 86400e3)) renderIfCheap();
  }, 20e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadWeek(state.view.type, state.view.week, false); });
}
function renderIfCheap() { if (state.settings.tab === 'weekend' || state.settings.tab === 'auburn') render(); }
function guessWeek() {
  const cal = state.calendar || bakedCalendar(state.season);
  const now = Date.now();
  const hit = cal.find((c) => now >= c.start && now <= c.end);
  if (hit) return hit.week;
  return now < cal[0].start ? cal[0].week : cal[cal.length - 1].week;
}
function calendar() { return state.calendar || bakedCalendar(state.season); }
function calIndex(type, week) { return calendar().findIndex((c) => c.type === type && c.week === week); }
function calNeighbor(dir) { const cal = calendar(); const i = calIndex(state.view.type, state.view.week); const j = i < 0 ? -1 : i + dir; return j >= 0 && j < cal.length ? cal[j] : null; }
function calEntry(type, week) { return calendar()[calIndex(type, week)] || null; }

/* ── merged views over the data ─────────────────────────────────────────── */
function involves(g, id) { return g.home.id === id || g.away.id === id; }
function allWeekGames() { const out = []; for (const k of Object.keys(state.weeks)) out.push(...state.weeks[k].games); return out; }
function auburnGames() {
  const base = state.auburn.games.slice();
  const fresh = allWeekGames().filter((g) => involves(g, AUBURN.id));
  for (const g of fresh) {
    const oppOf = (x) => (x.home.id === AUBURN.id ? x.away.id : x.home.id);
    let i = base.findIndex((b) => b.id === g.id);
    if (i < 0) i = base.findIndex((b) => b.week === g.week && oppOf(b) === oppOf(g));
    if (i >= 0) { const wk = state.weeks[wkKey(g.type != null ? g.type : state.curType, g.week)]; if (!state.auburn.live || !wk || wk.at >= state.auburn.at) base[i] = g; }
    else base.push(g);
  }
  return base.sort((a, b) => a.ts - b.ts);
}
function allKnownGames() {
  const m = new Map();
  for (const g of allWeekGames()) m.set(g.id, g);
  for (const g of auburnGames()) if (!m.has(g.id)) m.set(g.id, g);
  return Array.from(m.values());
}
function gameById(id) { return allKnownGames().find((g) => g.id === id) || null; }
function nextAuburn() { const gs = auburnGames(); return gs.find((g) => g.status === 'in') || gs.find((g) => g.status === 'pre' && g.ts > Date.now() - 4 * 3600e3) || gs.find((g) => g.status === 'pre') || null; }
function buildContext() {
  const slate = new Map();
  const gs = auburnGames(); const nxt = nextAuburn();
  for (const g of gs) { const opp = g.home.id === AUBURN.id ? g.away : g.home; slate.set(opp.id, { week: g.week, played: g.status === 'post', next: !!(nxt && nxt.id === g.id) }); }
  const tracked = new Map();
  for (const p of state.players) { if (!p.teamId) continue; if (!tracked.has(p.teamId)) tracked.set(p.teamId, []); tracked.get(p.teamId).push(p.name); }
  return { slate, tracked };
}

/* ── the heat index ──────────────────────────────────────────────────────────
 * Auburn is always 100. Everything else combines reasons with diminishing
 * returns — each factor is "how much this alone would pull you in" (0–1), and
 * they stack as 1 − Π(1 − w), so a monster game climbs toward 100 without
 * flattening the scale. Closeness counts, but never who's ahead. */
function heat(g, ctx) {
  const teams = [g.away, g.home];
  const auburn = involves(g, AUBURN.id);
  const parts = [];                                    // { w, text }
  const add = (w, text) => parts.push({ w, text });
  const rivals = teams.filter((t) => RIVALS[t.id]);
  if (auburn) add(1, 'Auburn');
  if (rivals.length === 2) add(0.5, 'Rivals collide');
  else if (rivals.length === 1) add(0.35, 'Rival · ' + rivals[0].name);
  if (!auburn) {
    const sec = teams.filter((t) => t.conf === SEC).length;
    if (sec === 2) add(0.4, 'SEC showdown'); else if (sec === 1) add(0.15, 'SEC');
    for (const t of teams) {
      const meet = ctx.slate.get(t.id); if (!meet) continue;
      if (meet.next) add(0.25, `Scout · Auburn plays ${t.name} next`);
      else if (!meet.played) add(0.1, `Auburn plays ${t.name} in Wk ${meet.week}`);
      else add(0.05, `Auburn played ${t.name} in Wk ${meet.week}`);
    }
    const ranked = teams.filter((t) => t.rank);
    if (ranked.length === 2) { const top10 = ranked.every((t) => t.rank <= 10); add(top10 ? 0.45 : 0.3, top10 ? 'Top-10 showdown' : 'Ranked matchup'); }
    else if (ranked.length === 1) add(0.1, `#${ranked[0].rank} ${ranked[0].name}`);
    for (const t of teams) { const names = ctx.tracked.get(t.id); if (names) add(0.3, `${names.join(' & ')}${names.length > 1 ? "'" : "'s"} ${t.name}`); }
    if (g.status === 'pre' && g.odds && g.odds.spread != null) { const sp = Math.abs(g.odds.spread); if (sp <= 3) add(0.15, 'Toss-up'); else if (sp <= 7) add(0.08, 'Tight spread'); }
  }
  const hs = g.home.score, as = g.away.score;
  if (hs != null && as != null) {
    const m = Math.abs(hs - as);
    if (g.status === 'in') { if (g.period >= 4 && m <= 8) add(0.4, 'Tight in the 4th'); else if (g.period >= 3 && m <= 7) add(0.2, 'Close late'); }
    if (g.status === 'post') { if (g.ot) add(0.35, 'Overtime'); else if (m <= 3) add(0.3, 'Went to the wire'); else if (m <= 8) add(0.15, 'One-score finish'); }
  }
  parts.sort((a, b) => b.w - a.w);
  const miss = parts.reduce((acc, x) => acc * (1 - x.w), 1);
  const h = auburn ? 100 : Math.min(99, Math.round(100 * (1 - miss)));
  return { h, why: parts.map((x) => x.text) };
}
function heatTier(h) { return h >= 100 ? 'heat-100' : h >= 70 ? 'heat-hot' : h >= WORTH_IT ? 'heat-warm' : h >= 20 ? 'heat-mild' : 'heat-cool'; }

/* ── spoiler model ───────────────────────────────────────────────────────── */
function isRevealed(g) { return !state.settings.nospoil || !!state.revealed[g.id]; }
function winnerOf(g) {
  if (g.status !== 'post' || g.home.score == null || g.away.score == null) return null;
  if (g.home.score > g.away.score) return 'home'; if (g.away.score > g.home.score) return 'away'; return 'tie';
}
function mentions(text, t) {
  const s = ' ' + String(text || '').toLowerCase() + ' ';
  if (t.name && s.includes(' ' + t.name.toLowerCase())) return true;
  if (t.abbr && new RegExp('\\b' + t.abbr.replace(/[^A-Za-z&]/g, '') + '\\b').test(String(text || ''))) return true;
  return false;
}
const RESULT_WORDS = /\b(beat|beats|defeat|defeats|upset|upsets|stun|stuns|rout|routs|escape|escapes|surviv|edge|edges|fall|falls|loses|lost|wins?\b|victory|blowout|blank|topple|takeaways?|grades?|recap|instant analysis|what we learned|final score|snap counts?)/i;
function spoilRiskFor(item) {
  if (!state.settings.nospoil) return null;
  const src = SOURCE[item.src] || {};
  const started = allKnownGames().filter((g) => (g.status === 'in' || g.status === 'post') && !state.revealed[g.id]);
  for (const g of started) {
    if (item.ts && item.ts < g.ts - 30 * 60e3) continue;              // written before kickoff: safe
    const text = item.title || '';
    const auburnGame = involves(g, AUBURN.id);
    if (src.auburn && auburnGame && item.ts && item.ts <= g.ts + 7 * 86400e3) return g;
    const both = mentions(text, g.home) && mentions(text, g.away);
    const one = mentions(text, g.home) || mentions(text, g.away);
    if (both || (one && RESULT_WORDS.test(text))) return g;
  }
  return null;
}

/* ── news + highlights feeds ─────────────────────────────────────────────── */
function parseXmlFeed(xml, src) {
  let doc; try { doc = new DOMParser().parseFromString(xml, 'text/xml'); } catch (_) { return null; }
  if (!doc || doc.querySelector('parsererror')) return null;
  const txt = (el, tag) => { const n = el.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ''; };
  const items = [];
  Array.from(doc.getElementsByTagName('item')).forEach((it) => items.push({ title: txt(it, 'title'), url: txt(it, 'link') || txt(it, 'guid'), ts: Date.parse(txt(it, 'pubDate') || txt(it, 'dc:date')) || 0, thumb: '', content: txt(it, 'content:encoded') || txt(it, 'description') }));
  Array.from(doc.getElementsByTagName('entry')).forEach((en) => {
    const link = en.getElementsByTagName('link')[0];
    const thumb = en.getElementsByTagNameNS('*', 'thumbnail')[0];
    items.push({ title: txt(en, 'title'), url: link ? (link.getAttribute('href') || '') : '', ts: Date.parse(txt(en, 'published') || txt(en, 'updated')) || 0, thumb: thumb ? (thumb.getAttribute('url') || '') : '', content: txt(en, 'content') || txt(en, 'summary') });
  });
  return items.map((i) => ({ ...i, url: safeUrl(i.url), thumb: safeUrl(i.thumb) })).filter((i) => i.title && i.url).map((i) => ({ ...i, id: src.id + ':' + i.url, src: src.id }));
}
async function fetchSource(src) {
  if (src.kind === 'espn') {
    const d = await getJSON(src.url);
    if (!d || !Array.isArray(d.articles)) return null;
    const all = d.articles.map((a) => ({
      id: 'espn:' + (a.id || (a.links && a.links.web && a.links.web.href) || a.headline),
      title: a.headline || '', url: safeUrl(a.links && a.links.web ? a.links.web.href : ''),
      ts: Date.parse(a.published || a.lastModified || '') || 0, src: 'espn', premium: !!a.premium,
      thumb: safeUrl(a.images && a.images[0] ? a.images[0].url : ''),
      auburn: (a.categories || []).some((c) => String(c.teamId || (c.team && c.team.id) || '') === AUBURN.id) || /auburn/i.test((a.headline || '') + ' ' + (a.description || '')),
    })).filter((i) => i.title && i.url);
    return all.filter((i) => i.auburn);               // the team filter is unofficial; enforce it ourselves
  }
  return fetchFeed(src);
}
// Any RSS/Atom feed through the proxies; null when none of them come through.
async function fetchFeed(src) {
  for (const via of PROXIES) {
    const p = via(src.url);
    const d = await getJSON(p.url, 10000);
    if (!d) continue;
    if (p.shape === 'rss2json' && d.status === 'ok' && Array.isArray(d.items)) {
      return d.items.map((i) => ({ id: src.id + ':' + i.link, title: i.title || '', url: safeUrl(i.link), ts: Date.parse(i.pubDate || '') || 0, src: src.id, thumb: safeUrl(i.thumbnail), content: i.content || i.description || '' })).filter((i) => i.title && i.url);
    }
    if (p.shape === 'allorigins' && typeof d.contents === 'string') { const items = parseXmlFeed(d.contents, src); if (items) return items; }
  }
  return null;
}
let newsInFlight = null, newsTriedAt = 0;
async function loadNews(force) {
  const cached = cache.get('news');
  if (cached && !state.news.at) { state.news = cached.data; }
  if (!force && state.news.at && Date.now() - state.news.at < 20 * 60e3) return;
  if (!force && Date.now() - newsTriedAt < 5 * 60e3) return;      // every feed failed a moment ago: don't hammer
  if (newsInFlight) return newsInFlight;
  newsTriedAt = Date.now();
  newsInFlight = (async () => {
    const status = {};
    const feeds = SOURCES.filter((s) => s.kind !== 'link');
    const results = await Promise.all(feeds.map(async (s) => { const items = await fetchSource(s); status[s.id] = items ? { ok: true, n: items.length } : { ok: false }; return items || []; }));
    const merged = [].concat(...results).sort((a, b) => b.ts - a.ts).slice(0, 80);
    if (merged.length) { state.news = { items: merged, at: Date.now(), status }; cache.set('news', state.news); }
    else state.news = { items: state.news.items || [], at: state.news.at || 0, status };
    newsInFlight = null;
    render();
  })();
  return newsInFlight;
}

/* ── College GameDay verdicts ──────────────────────────────────────────────
 * There is no structured feed for the panel's picks. Best effort: find ESPN's
 * weekly picks story and r/CFB's picks thread, and parse a picks table when
 * one comes through. The links always stand on their own. */
let gamedayTriedAt = 0;
function parsePicksTable(html) {
  if (!html) return null;
  let doc; try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (_) { return null; }
  const tables = Array.from(doc.querySelectorAll('table'));
  for (const t of tables) {
    const rows = Array.from(t.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('th,td')).map((c) => c.textContent.trim().replace(/\s+/g, ' ')));
    const body = rows.filter((r) => r.some(Boolean));
    if (body.length < 2 || body[0].length < 2) continue;
    return { head: body[0].slice(0, 8), rows: body.slice(1, 16).map((r) => r.slice(0, 8)) };
  }
  return null;
}
async function loadGameDay(force) {
  const wk = state.curWeek;
  const cached = cache.get('gameday');
  if (cached && !state.gameday.at && cached.data.week === wk) state.gameday = cached.data;
  if (!force && state.gameday.at && state.gameday.week === wk && Date.now() - state.gameday.at < 6 * 3600e3) return;
  if (!force && Date.now() - gamedayTriedAt < 5 * 60e3) return;
  gamedayTriedAt = Date.now();
  const [espn, reddit] = await Promise.all([
    getJSON(ESPN + 'news?limit=50'),
    fetchFeed({ id: 'rcfb-gd', url: rcfbRss('gameday picks', 'week') }),
  ]);
  const links = [];
  let picks = null;
  const isPicks = (t) => /gameday/i.test(t || '') && /pick/i.test(t || '');
  const art = espn && Array.isArray(espn.articles) ? espn.articles.find((a) => isPicks(a.headline)) : null;
  if (art && art.links && art.links.web && safeUrl(art.links.web.href)) links.push({ label: 'ESPN · ' + art.headline, href: art.links.web.href });
  const post = reddit ? reddit.find((i) => isPicks(i.title)) : null;
  if (post) { links.push({ label: 'r/CFB · ' + post.title, href: post.url }); picks = parsePicksTable(post.content); if (picks) picks.from = 'r/CFB'; }
  state.gameday = { at: Date.now(), week: wk, picks, links, tried: true };
  cache.set('gameday', state.gameday);
  render();
}

/* ── r/CFB game threads ─────────────────────────────────────────────────────
 * Every card links to an r/CFB search that lands on the thread. When the
 * flair feed comes through, the link upgrades to the thread itself. Postgame
 * threads carry the result in the title, so they are never surfaced. */
let rcfbTriedAt = 0;
async function loadRcfb(force) {
  const cached = cache.get('rcfb');
  if (cached && !state.rcfb.at) state.rcfb = cached.data;
  if (!force && state.rcfb.at && Date.now() - state.rcfb.at < 15 * 60e3) return;
  if (!force && Date.now() - rcfbTriedAt < 5 * 60e3) return;
  rcfbTriedAt = Date.now();
  const items = await fetchFeed({ id: 'rcfb', url: rcfbRss('flair:"Game Thread"', 'day') });
  if (!items) return;
  state.rcfb = { at: Date.now(), items: items.filter((i) => /game thread/i.test(i.title) && !/postgame/i.test(i.title)).map((i) => ({ title: i.title, url: i.url })) };
  cache.set('rcfb', state.rcfb);
  render();
}
function rcfbThread(g) { return (state.rcfb.items || []).find((i) => mentions(i.title, g.home) && mentions(i.title, g.away)) || null; }

/* ── the plan ──────────────────────────────────────────────────────────────
 * plan[id] = { mode: 'watch' | 'hl' | 'off' }. Auburn games are in as a full
 * watch unless you took them out. Full watches sit on the kickoff; replays and
 * 20-minute highlight blocks float to the first free slot after the game
 * should be over (and uploaded), never on top of something you're watching. */
function planMode(g) {
  const p = state.plan[g.id];
  if (p) return p.mode === 'off' ? null : p.mode;
  return involves(g, AUBURN.id) ? 'watch' : null;
}
function setPlan(id, mode) {
  const g = gameById(id); if (!g) return;
  if (planMode(g) === mode) { if (involves(g, AUBURN.id)) state.plan[id] = { mode: 'off', at: Date.now() }; else delete state.plan[id]; }
  else state.plan[id] = { mode, at: Date.now() };
  store.set('plan', state.plan);
  render();
}
function gameEnd(g) {
  if (g.status === 'in') return g.period >= 4 ? Date.now() + 30 * 60e3 : Math.max(Date.now() + 30 * 60e3, g.ts + GAME_MS);
  return g.ts + GAME_MS;
}
function morningRoll(t) {                 // nothing gets planned between 11:30pm and 7am
  const d = new Date(t);
  const h = d.getHours(), m = d.getMinutes();
  if ((h === 23 && m >= 30) || h < 7) { if (h === 23) d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.getTime(); }
  return t;
}
function planBlocks() {
  const now = Date.now();
  const picked = allKnownGames().map((g) => ({ g, mode: planMode(g) })).filter((x) => x.mode);
  const fixed = [], floating = [];
  for (const { g, mode } of picked) {
    const done = !!state.watched[g.id];
    if (mode === 'watch' && g.status !== 'post') fixed.push({ g, mode, done, tba: !!g.tba, start: g.ts, end: gameEnd(g) });
    else if (mode === 'watch') floating.push({ g, mode: 'replay', done, tba: false, len: GAME_MS, avail: g.ts + GAME_MS });
    else floating.push({ g, mode: 'hl', done, tba: !!g.tba, len: HL_MS, avail: gameEnd(g) + HL_LAG });
  }
  fixed.sort((a, b) => a.start - b.start);
  for (const w of fixed) w.conflicts = fixed.filter((o) => o !== w && !o.tba && !w.tba && o.start < w.end && w.start < o.end).map((o) => o.g);
  const busy = fixed.filter((w) => !w.tba).map((w) => [w.start, w.end]);
  floating.sort((a, b) => a.avail - b.avail);
  for (const f of floating) {
    f.conflicts = [];
    if (f.done) { f.start = f.avail; f.end = f.avail + f.len; continue; }   // history doesn't move
    let t = morningRoll(Math.max(f.avail, now));                            // overdue → it's next
    for (let guard = 0; guard < 60; guard++) { const hit = busy.find(([s, e]) => s < t + f.len && t < e); if (!hit) break; t = morningRoll(hit[1]); }
    f.start = t; f.end = t + f.len;
    busy.push([f.start, f.end]);
  }
  return fixed.concat(floating).sort((a, b) => a.start - b.start);
}

/* ── box scores for tracked players ─────────────────────────────────────── */
const boxInFlight = new Set();
async function loadBox(gameId) {
  if (state.box[gameId] || boxInFlight.has(gameId)) return;
  const cached = cache.get('box.' + gameId);
  if (cached) { state.box[gameId] = cached.data; return; }
  boxInFlight.add(gameId);
  const d = await getJSON(ESPN + 'summary?event=' + gameId);
  boxInFlight.delete(gameId);
  const teams = (d && d.boxscore && d.boxscore.players) || [];
  const lines = [];
  for (const t of teams) for (const cat of t.statistics || []) for (const a of cat.athletes || []) {
    lines.push({ teamId: String(t.team && t.team.id || ''), name: a.athlete && a.athlete.displayName || '', cat: cat.name || cat.text || '', labels: cat.labels || [], stats: a.stats || [] });
  }
  state.box[gameId] = lines;
  if (lines.length) cache.set('box.' + gameId, lines);
  render();
}
function playerLines(p, lines) {
  const mine = lines.filter((l) => l.teamId === p.teamId && l.name.toLowerCase() === p.name.trim().toLowerCase());
  return mine.map((l) => ({ cat: l.cat, text: l.labels.slice(0, 4).map((lab, i) => `${l.stats[i] != null ? l.stats[i] : '–'} ${lab}`).join(' · ') }));
}

/* ── render: pieces ─────────────────────────────────────────────────────── */
function netChip(plan) {
  const cls = plan.kind === 'bundle' ? 'ok' : plan.kind === 'record' ? 'no' : 'tba';
  const extra = plan.nets.length > 1 && plan.kind === 'bundle' ? '' : '';
  return `<span class="net ${cls}" title="${esc(plan.detail)}">${esc(plan.label)}${extra}</span>`;
}
function sideHTML(t, isWin, g) {
  const mine = t.id === AUBURN.id;
  const rec = !state.settings.nospoil && t.record ? `<span class="rec">${esc(t.record)}</span>` : '';
  return `<div class="side${isWin ? ' win' : ''}${mine ? ' mine' : ''}">
    <img class="logo" src="${esc(t.logo)}" alt="" loading="lazy" decoding="async" />
    <span class="rank">${t.rank ? '#' + t.rank : ''}</span>
    <span class="name">${esc(t.name)}</span>${rec}
  </div>`;
}
function scoreCol(g, shown) {
  if (g.status === 'off') return `<div class="score-col"><span class="tag">${esc(g.detail)}</span></div>`;
  if (g.status === 'pre') {
    const when = g.tba ? 'TBA' : fmtTime.format(new Date(g.ts));
    const sub = !g.tba && g.ts - Date.now() < 86400e3 && g.ts > Date.now() ? untilText(g.ts) : fmtDow.format(new Date(g.ts));
    return `<div class="score-col"><span class="when${g.tba ? ' tba' : ''}">${esc(when)}</span><span class="tag">${esc(sub)}</span></div>`;
  }
  const live = g.status === 'in';
  const tag = live ? `<span class="tag live">${esc(g.detail || 'Live')}</span>` : `<span class="tag">Final${g.ot && shown ? '/OT' : ''}</span>`;
  if (!shown) return `<button class="score-col" data-peek="${esc(g.id)}" aria-label="Reveal score">${tag}<span class="dots">•••</span><span class="hint">tap to see</span></button>`;
  const sc = `<span class="sc">${g.away.score != null ? g.away.score : '–'}–${g.home.score != null ? g.home.score : '–'}</span>`;
  if (state.settings.nospoil) return `<button class="score-col" data-peek="${esc(g.id)}" aria-label="Hide score">${tag}${sc}<span class="hint">hide</span></button>`;
  return `<div class="score-col">${tag}${sc}</div>`;
}
function actions(g) {
  const mode = planMode(g), watched = !!state.watched[g.id];
  const btn = (m, label) => `<button class="act${mode === m ? ' on' : ''}" data-plan="${esc(g.id)}" data-mode="${m}" aria-pressed="${mode === m}">${label}${mode === m ? ' ✓' : ''}</button>`;
  let h = btn('watch', g.status === 'post' ? 'Replay' : 'Watch') + btn('hl', 'Highlights');
  if (g.status !== 'pre') h += `<button class="act${watched ? ' on' : ''}" data-watched="${esc(g.id)}">${watched ? 'Watched ✓' : 'Watched'}</button>`;
  return h;
}
function highlightLinks(g) {
  const q = `${g.away.name} vs ${g.home.name} highlights ${state.season}`;
  return [{ label: 'Wheels', href: YT('Wheels ' + q) }, { label: 'ESPN CFB', href: YT('ESPN College Football ' + q) }];
}
function extraHTML(g, H, plan, shown) {
  const rows = [];
  const where = [g.venue, g.city].filter(Boolean).join(' · ');
  if (where || g.neutral) rows.push(`<div class="row"><span class="k">Where</span><span class="v">${esc(where || 'Neutral site')}${g.neutral && where ? ' · neutral' : ''}</span></div>`);
  rows.push(`<div class="row"><span class="k">Watch</span><span class="v">${esc(plan.detail)}${plan.nets.length > 1 ? ' Also listed: ' + esc(plan.nets.map((n) => n.name).join(', ')) + '.' : ''}</span></div>`);
  if (g.status === 'pre' && g.odds && (g.odds.details || g.odds.ou != null)) rows.push(`<div class="row"><span class="k">Line</span><span class="v">${esc(g.odds.details || '')}${g.odds.ou != null ? ` · O/U ${g.odds.ou}` : ''}</span></div>`);
  rows.push(`<div class="row"><span class="k">Heat</span><span class="v">${H.h} · ${esc(H.why.join(' · ') || 'Just a game')}</span></div>`);
  const links = [];
  if (g.status !== 'pre') for (const l of highlightLinks(g)) links.push(`<a href="${esc(l.href)}" target="_blank" rel="noopener">▶ ${esc(l.label)}</a>`);
  const eye = state.settings.nospoil && !shown && g.status !== 'pre' ? ' 🙈' : '';
  if (isNum(g.id)) links.push(`<a href="${esc(GAMECAST(g.id))}" target="_blank" rel="noopener">ESPN gamecast${eye}</a>`);
  const th = rcfbThread(g);
  links.push(`<a href="${esc(th ? th.url : rcfbSearch(`flair:"Game Thread" ${g.away.name} ${g.home.name}`))}" target="_blank" rel="noopener">r/CFB ${th ? 'game thread' : 'thread'}${eye}</a>`);
  if (links.length) rows.push(`<div class="row links"><span class="k">${g.status === 'pre' ? 'Links' : 'Highlights'}</span>${links.join('')}</div>`);
  const tracked = state.players.filter((p) => involves(g, p.teamId));
  if (tracked.length && g.status === 'post') {
    if (shown) {
      const lines = state.box[g.id];
      if (!lines) { if (isNum(g.id)) loadBox(g.id); rows.push(`<div class="row"><span class="k">Players</span><span class="v">loading box score…</span></div>`); }
      else rows.push(...tracked.map((p) => { const ls = playerLines(p, lines); return `<div class="row pl"><span class="k">${esc(p.name.split(' ').slice(-1)[0])}</span><span class="v">${ls.length ? ls.map((l) => `<b>${esc(l.cat)}</b> ${esc(l.text)}`).join(' · ') : 'no stats recorded'}</span></div>`; }));
    } else rows.push(`<div class="row"><span class="k">Players</span><span class="v">${esc(tracked.map((p) => p.name).join(', '))} — reveal the score to see the stat line</span></div>`);
  }
  return `<div class="extra">${rows.join('')}</div>`;
}
function gameCard(g, ctx, o) {
  o = o || {};
  const H = heat(g, ctx), plan = watchPlan(g);
  const shown = isRevealed(g);
  const win = shown ? winnerOf(g) : null;
  const open = expanded.has(g.id);
  const mine = involves(g, AUBURN.id);
  const why = H.why.filter((w) => !(o.week && mine && w === 'Auburn')).slice(0, 2).join(' · ');
  return `<article class="game ${heatTier(H.h)} st-${g.status}${open ? ' open' : ''}${o.compact ? ' compact' : ''}" data-id="${esc(g.id)}">
    <div class="meta">
      ${o.week && mine ? '' : `<span class="heat" title="Heat index">${H.h === 100 ? '🔥 ' : ''}${H.h}</span>`}
      ${netChip(plan)}
      ${g.note ? `<span class="tag-note">${esc(g.note)}</span>` : ''}
      ${g.status === 'in' ? '<span class="live-tag">Live</span>' : ''}
      <span class="spacer"></span>
      <span class="day">${esc(cornerText(g, o))}</span>
    </div>
    <div class="main">
      <button class="teams" data-open="${esc(g.id)}" aria-expanded="${open}">${sideHTML(g.away, win === 'away', g)}${sideHTML(g.home, win === 'home', g)}</button>
      ${scoreCol(g, shown)}
    </div>
    <div class="foot"><span class="why">${esc(why)}</span><span class="acts">${actions(g)}</span></div>
    ${open ? extraHTML(g, H, plan, shown) : ''}
  </article>`;
}
function cornerText(g, o) {
  const bits = [];
  if (o.week && g.week) bits.push('Wk ' + g.week);
  if (o.showDay || o.week) bits.push(fmtMD.format(new Date(g.ts)) + (o.showDay ? ' · ' + fmtDow.format(new Date(g.ts)) : ''));
  if (o.week && involves(g, AUBURN.id)) bits.push(g.neutral ? 'Neutral' : g.home.id === AUBURN.id ? 'Home' : 'Away');
  return bits.join(' · ');
}
function sectionH(title, count, side, live) {
  return `<div class="section-h"><h2 class="${live ? 'live' : ''}">${esc(title)}${count != null ? `<span class="count">${count}</span>` : ''}</h2>${side ? `<span class="side">${side}</span>` : ''}</div>`;
}

/* ── render: Weekend ────────────────────────────────────────────────────── */
function weekLabel(entry) {
  if (!entry) return { title: `Week ${state.view.week}`, sub: '' };
  const range = entry.detail || (entry.start ? `${fmtMD.format(new Date(entry.start))} – ${fmtMD.format(new Date(entry.end - 864e5))}` : '');
  const isCur = entry.type === state.curType && entry.week === state.curWeek;
  const nxt = calNeighbor(-1); const isNext = nxt && nxt.type === state.curType && nxt.week === state.curWeek;
  return { title: entry.label, sub: range + (isCur ? ' · <em>this week</em>' : isNext ? ' · <em>up next</em>' : '') };
}
const SORT_DEFAULT = { worth: 'heat', sec: 'time', plan: 'time', all: 'time' };
function sortFor(filter) { const s = (state.settings.sortBy || {})[filter]; return s === 'heat' || s === 'time' ? s : (SORT_DEFAULT[filter] || 'time'); }
function sortHTML(filter) {
  const cur = sortFor(filter);
  return `<span class="sort" role="group" aria-label="Sort">${[['heat', 'Heat'], ['time', 'Time']].map(([id, lbl]) => `<button class="${cur === id ? 'on' : ''}" data-sort="${id}" aria-pressed="${cur === id}">${lbl}</button>`).join('')}</span>`;
}
function weekNavHTML() {
  const lbl = weekLabel(calEntry(state.view.type, state.view.week));
  const prev = calNeighbor(-1), next = calNeighbor(1);
  return `<div class="weeknav">
    <button class="arrow" data-wk="prev" aria-label="Previous week" ${prev ? '' : 'disabled'}>‹</button>
    <button class="wk" data-wk="now" title="Jump to this week"><b>${esc(lbl.title)}</b><span>${lbl.sub}</span></button>
    <button class="arrow" data-wk="next" aria-label="Next week" ${next ? '' : 'disabled'}>›</button>
  </div>`;
}
function viewWindow() {                   // the viewing week's span, for anything that follows the week nav
  const e = calEntry(state.view.type, state.view.week);
  return e && e.start && e.end ? [e.start, e.end] : [Date.now() - 7 * 864e5, Date.now() + 7 * 864e5];
}
function renderWeekend() {
  const root = $('view-weekend');
  const ctx = buildContext();
  const key = wkKey(state.view.type, state.view.week);
  const wk = state.weeks[key];
  const filter = state.settings.filter;
  const lbl = weekLabel(calEntry(state.view.type, state.view.week));
  let html = weekNavHTML();
  const games = wk ? wk.games : [];
  const heats = new Map(games.map((g) => [g.id, heat(g, ctx).h]));
  const counts = { worth: games.filter((g) => heats.get(g.id) >= WORTH_IT).length, sec: games.filter((g) => g.home.conf === SEC || g.away.conf === SEC).length, plan: games.filter(planMode).length, all: games.length };
  const chips = [['worth', 'Worth it'], ['sec', 'SEC'], ['plan', 'Planned'], ['all', 'Everything']];
  html += `<div class="chips">${chips.map(([id, name]) => `<button class="chip${filter === id ? ' on' : ''}" data-filter="${id}">${name}<span class="n">${counts[id]}</span></button>`).join('')}</div>`;
  if (state.view.type === state.curType && state.view.week === state.curWeek) html += gamedayHTML();

  let list;
  if (filter === 'plan') list = games.filter(planMode).sort((a, b) => a.ts - b.ts);
  else if (filter === 'sec') list = games.filter((g) => g.home.conf === SEC || g.away.conf === SEC);
  else if (filter === 'worth') list = games.filter((g) => heats.get(g.id) >= WORTH_IT);
  else list = games.slice();

  if (!list.length) {
    let msg;
    if (filter === 'plan') msg = 'Nothing planned yet. Tap <b>Watch</b> or <b>Highlights</b> on any game.';
    else if (!wk && state.online === false) msg = 'You\'re offline and this week isn\'t cached yet. The slate loads the next time you\'re online.';
    else if (!wk) msg = state.loading ? 'Loading the slate…' : `Nothing loaded for <b>${esc(lbl.title)}</b> yet. Times and TV usually land 6–12 days out.`;
    else if (filter === 'worth') msg = 'Nothing clears the bar this week. Try <b>SEC</b> or <b>Everything</b>.';
    else msg = 'No games match.';
    root.innerHTML = html + `<div class="empty">${msg}</div>`;
    return;
  }
  const sort = sortFor(filter);
  if (sort === 'heat') {
    const ranked = list.slice().sort((a, b) => (heats.get(b.id) - heats.get(a.id)) || (a.ts - b.ts));
    html += sectionH('Ranked by heat', ranked.length, sortHTML(filter));
    html += ranked.map((g) => gameCard(g, ctx, { showDay: true })).join('');
  } else {
    html += sectionH('By kickoff', list.length, sortHTML(filter));
    const live = list.filter((g) => g.status === 'in');
    if (live.length) { html += sectionH('Live now', live.length, null, true); html += live.map((g) => gameCard(g, ctx, {})).join(''); }
    const rest = list.filter((g) => g.status !== 'in').sort((a, b) => a.ts - b.ts);
    let day = null;
    for (const g of rest) {
      const k = dayKey(g.ts);
      if (k !== day) { day = k; html += sectionH(fmtLong.format(new Date(g.ts)), null, filter === 'plan' && g.week ? `Wk ${g.week}` : null); }
      html += gameCard(g, ctx, {});
    }
  }
  root.innerHTML = html;
}

function gamedayHTML() {
  const gd = state.gameday;
  const wk = state.curWeek;
  const fallback = [
    { label: '▶ GameDay picks on YouTube', href: YT(`College GameDay picks Week ${wk} ${state.season}`) },
    { label: 'r/CFB picks thread', href: rcfbSearch('college gameday picks') },
    { label: 'ESPN', href: 'https://www.espn.com/college-football/' },
  ];
  const links = (gd.links || []).concat(fallback);
  let body;
  if (gd.picks && gd.picks.rows && gd.picks.rows.length) {
    body = `<div class="tbl"><table><thead><tr>${gd.picks.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${gd.picks.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="muted">Picks as posted on ${esc(gd.picks.from || 'r/CFB')}.</div>`;
  } else if (gd.at) body = `<div class="muted">${gd.links && gd.links.length ? 'Found this week\'s picks story — no table came through, so open it below.' : 'No picks story found yet. They land Saturday morning during the show.'}</div>`;
  else body = `<div class="muted">${state.online === false ? 'Offline.' : 'Looking for this week\'s picks…'}</div>`;
  return `<div class="gameday"><div class="gd-h"><b>College GameDay</b><span>Week ${wk} verdicts</span></div>${body}<div class="linkrow">${links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label.length > 60 ? l.label.slice(0, 58) + '…' : l.label)}</a>`).join('')}</div></div>`;
}

/* ── render: Plan ───────────────────────────────────────────────────────── */
function fmtDur(ms) { const m = Math.round(ms / 60e3); return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : `${m}m`; }
function slotHTML(b) {
  const g = b.g, now = Date.now();
  const title = `${g.away.name} ${g.neutral ? 'vs' : 'at'} ${g.home.name}`;
  const plan = watchPlan(g);
  const live = g.status === 'in';
  const timeCol = b.tba ? `<b>TBA</b><span>${esc(fmtDow.format(new Date(g.ts)))}</span>` : `<b>${esc(fmtTime.format(new Date(b.start)))}</b><span>– ${esc(fmtTime.format(new Date(b.end)))}</span>`;
  let sub;
  if (b.mode === 'watch') sub = `${netChip(plan)}<span>${esc(plan.detail)}</span>${live ? `<span class="live-tag">${esc(g.detail)}</span>` : ''}`;
  else if (b.mode === 'replay') sub = `<span>Replay · ${fmtDur(b.len)}</span>${netChip(plan)}<span>${plan.kind === 'bundle' ? 'in the ESPN app' : 'from your recording'}</span>`;
  else {
    const ready = b.tba ? 'after the game' : (b.avail <= now ? 'ready now' : `ready after ~${fmtTime.format(new Date(b.avail))}`);
    sub = `<span>Highlights · 20 min · ${esc(ready)}</span>${highlightLinks(g).map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">▶ ${esc(l.label)}</a>`).join('')}`;
  }
  const warn = b.conflicts && b.conflicts.length
    ? `<div class="warn">Overlaps ${esc(b.conflicts.map((c) => `${c.away.name}–${c.home.name}`).join(', '))} · <button data-plan="${esc(g.id)}" data-mode="hl">switch this one to highlights</button></div>` : '';
  const icon = b.mode === 'hl' ? '▶' : involves(g, AUBURN.id) ? '🔥' : '';
  return `<div class="slot ${b.mode} st-${g.status}${b.done ? ' done' : ''}${b.conflicts && b.conflicts.length ? ' conflict' : ''}" data-id="${esc(g.id)}">
    <div class="time">${timeCol}</div>
    <div class="what"><div class="ttl">${icon ? icon + ' ' : ''}${esc(title)}</div><div class="sub">${sub}</div>${warn}</div>
    <div class="ctl"><button class="${b.done ? 'on' : ''}" data-watched="${esc(g.id)}" aria-label="Mark watched" title="Watched">✓</button><button data-plan="${esc(g.id)}" data-mode="${b.mode === 'replay' ? 'watch' : b.mode}" aria-label="Remove from plan" title="Remove">×</button></div>
  </div>`;
}
function renderPlan() {
  const root = $('view-plan');
  const [ws, we] = viewWindow();
  const blocks = planBlocks().filter((b) => b.start >= ws && b.start <= we);
  let html = weekNavHTML();
  if (!blocks.length) { root.innerHTML = html + `<div class="empty">Nothing planned this week. Tap <b>Watch</b> or <b>Highlights</b> on any game — Auburn games land here on their own.</div>`; return; }
  let day = null, dayItems = [];
  const flush = () => {
    if (!dayItems.length) return;
    const total = dayItems.filter((b) => !b.done).reduce((acc, b) => acc + (b.end - b.start), 0);
    html += sectionH(fmtLong.format(new Date(dayItems[0].start)), null, total ? `${fmtDur(total)} to watch` : 'all watched');
    html += dayItems.map(slotHTML).join('');
    dayItems = [];
  };
  for (const b of blocks) { const k = dayKey(b.start); if (k !== day) { flush(); day = k; } dayItems.push(b); }
  flush();
  html += `<div class="bundle-line">Full games sit on kickoff. Highlights and replays float to the first free slot after the game should be over, about 3½ hours plus upload time.</div>`;
  root.innerHTML = html;
}

/* ── render: Auburn ─────────────────────────────────────────────────────── */
function heroHTML(g, ctx) {
  if (!g) return `<div class="hero"><div class="eyebrow">Auburn</div><div class="matchup">Season's over</div><div class="when">War Eagle. See you in the fall.</div></div>`;
  const opp = g.home.id === AUBURN.id ? g.away : g.home;
  const vs = g.neutral ? 'vs' : (g.home.id === AUBURN.id ? 'vs' : 'at');
  const plan = watchPlan(g);
  const shown = isRevealed(g);
  const live = g.status === 'in';
  const when = live ? `<b>${esc(g.detail || 'Live')}</b>` : g.tba ? `<b>${esc(fmtLong.format(new Date(g.ts)))}</b> · time TBA` : `<b>${esc(fmtLong.format(new Date(g.ts)))}</b> · ${esc(fmtTime.format(new Date(g.ts)))}${untilText(g.ts) ? ' · ' + esc(untilText(g.ts)) : ''}`;
  let score = '';
  if (g.status !== 'pre') {
    if (shown) score = `<div class="score-line">${esc(g.away.abbr)} ${g.away.score != null ? g.away.score : '–'} · ${esc(g.home.abbr)} ${g.home.score != null ? g.home.score : '–'}<small>${live ? esc(g.detail) : 'Final' + (g.ot ? '/OT' : '')}</small></div>`;
    else score = `<button class="peek" data-peek="${esc(g.id)}">Score hidden · tap to reveal this game</button>`;
  }
  const record = state.settings.nospoil ? `<div class="record">Record hidden while No-spoil is on.</div>` : (state.auburn.record ? `<div class="record">Auburn is ${esc(state.auburn.record)}.</div>` : '');
  return `<div class="hero" data-id="${esc(g.id)}">
    <div class="eyebrow">${live ? '<span class="live-tag">Live</span>' : (g.status === 'post' ? 'Last game' : 'Next up')}${g.note ? ' · ' + esc(g.note) : ''}${g.week ? ` · Week ${g.week}` : ''}</div>
    <div class="matchup">Auburn <small>${vs}</small> ${opp.rank ? '#' + opp.rank + ' ' : ''}${esc(opp.name)}</div>
    <div class="when">${when}</div>
    ${score}
    <div class="plan">${netChip(plan)}<span class="muted">${esc(plan.detail)}</span></div>
    ${record}
    <div class="hero-acts">${actions(g)}</div>
  </div>`;
}
function newsItemHTML(it) {
  const src = SOURCE[it.src] || { name: it.src };
  const risk = shownNews.has(it.id) ? null : spoilRiskFor(it);
  const isVideo = src.kind === 'youtube';
  const paywall = src.paywall === 'yes' ? '<span class="pw">paywall</span>' : (it.premium ? '<span class="plus">ESPN+</span>' : (src.paywall === 'some' ? '<span class="pw">some paywalled</span>' : ''));
  const meta = `<div class="src">${esc(src.name)}${paywall ? ' · ' + paywall : ''}${it.ts ? ' · ' + esc(relTime(it.ts)) : ''}</div>`;
  const thumb = it.thumb ? (risk && isVideo ? '<span class="thumb hidden" title="Thumbnail hidden — could spoil">🙈</span>' : `<img class="thumb" src="${esc(it.thumb)}" alt="" loading="lazy" />`) : '';
  if (risk && !isVideo) {
    const opp = risk.home.id === AUBURN.id ? risk.away : risk.home;
    const label = involves(risk, AUBURN.id) ? `Auburn–${opp.name}` : `${risk.away.name}–${risk.home.name}`;
    return `<li><button class="item risk" data-news="${esc(it.id)}"><div class="body"><div class="title">${esc(it.title)}</div>${meta}</div><div class="veil">🙈 May spoil <b>${esc(label)}</b> · tap to show</div></button></li>`;
  }
  return `<li><a class="item" href="${esc(it.url)}" target="_blank" rel="noopener">${thumb}<div class="body"><div class="title">${esc(it.title)}</div>${meta}</div></a></li>`;
}
function renderAuburn() {
  const root = $('view-auburn');
  const ctx = buildContext();
  const games = auburnGames();
  const hero = nextAuburn() || games[games.length - 1] || null;
  let html = heroHTML(hero, ctx);

  html += sectionH('Season', games.length, state.auburn.live ? '' : 'baked schedule · times TBA until ESPN loads');
  html += games.map((g) => gameCard(g, ctx, { compact: true, week: true })).join('');

  const news = state.news.items || [];
  const articles = news.filter((i) => (SOURCE[i.src] || {}).kind !== 'youtube');
  const videos = news.filter((i) => (SOURCE[i.src] || {}).kind === 'youtube');
  const statusBits = SOURCES.filter((s) => s.kind !== 'link').map((s) => { const st = (state.news.status || {})[s.id]; return st ? (st.ok ? `${s.name} ✓` : `${s.name} ✗`) : null; }).filter(Boolean);
  html += sectionH('Auburn everything', articles.length || null, state.news.at ? `updated ${esc(relTime(state.news.at))} · <button data-news-refresh>refresh</button>` : (state.online === false ? 'offline' : 'loading…'));
  if (articles.length) html += `<ul class="news">${articles.slice(0, 40).map(newsItemHTML).join('')}</ul>`;
  else html += `<div class="empty">${state.online === false ? 'Offline. The source links below work once you\'re back on.' : state.news.at ? 'No stories came through. Feeds ride on a free proxy; the source links below always work.' : 'Pulling the latest…'}</div>`;

  html += sectionH('Highlights', videos.length || null, 'Wheels · ESPN CFB');
  const last = games.slice().reverse().find((g) => g.status !== 'pre');
  if (last) { const opp = last.home.id === AUBURN.id ? last.away : last.home; html += `<div class="linkrow">${highlightLinks(last).map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">▶ ${esc(l.label)} · Auburn vs ${esc(opp.name)}</a>`).join('')}</div>`; }
  html += `<div class="linkrow"><a href="${esc(YT('Wheels Auburn highlights ' + state.season))}" target="_blank" rel="noopener">▶ Wheels · all Auburn</a><a href="${esc(YT('ESPN College Football Auburn Tigers ' + state.season))}" target="_blank" rel="noopener">▶ ESPN CFB · all Auburn</a></div>`;
  if (videos.length) html += `<ul class="news">${videos.slice(0, 8).map(newsItemHTML).join('')}</ul>`;

  html += sectionH('Sources', null, statusBits.length ? esc(statusBits.join(' · ')) : null);
  html += `<div class="sources">${SOURCES.map((s) => {
    const st = (state.news.status || {})[s.id];
    const stTxt = s.kind === 'link' ? 'link only' : (st ? (st.ok ? `${st.n} loaded` : 'feed unreachable — open the site') : '');
    return `<div class="source"><div><span class="nm">${esc(s.name)}</span>${s.paywall === 'yes' ? '<span class="pw">paywall</span>' : s.paywall === 'some' ? '<span class="pw">some paywalled</span>' : ''}<div class="st${st ? (st.ok ? ' good' : ' bad') : ''}">${esc(stTxt)}</div></div><a href="${esc(s.home)}" target="_blank" rel="noopener">Open →</a></div>`;
  }).join('')}</div>`;
  root.innerHTML = html;
}

/* ── render: Players ────────────────────────────────────────────────────── */
function teamPool() {
  const m = new Map();
  for (const [id, abbr, name] of SEC_TEAMS) m.set(id, { id, abbr, name, logo: LOGO(id) });
  for (const g of allKnownGames()) for (const t of [g.home, g.away]) if (t.id && !m.has(t.id)) m.set(t.id, { id: t.id, abbr: t.abbr, name: t.name, logo: t.logo });
  return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
}
function renderPlayers() {
  const root = $('view-players');
  const ctx = buildContext();
  const curKey = wkKey(state.curType, state.curWeek);
  const viewKey = wkKey(state.view.type, state.view.week);
  const pool = (state.weeks[viewKey] || state.weeks[curKey] || { games: [] }).games;
  let html = '';
  if (!state.players.length) html += `<div class="empty">Nobody tracked yet. Add a player who left the Plains and their new team's games light up here and on the Weekend slate.</div>`;
  for (const p of state.players) {
    const g = pool.find((x) => involves(x, p.teamId)) || null;
    html += `<div class="player" data-pid="${esc(p.id)}">
      <div class="ph"><img class="logo" src="${esc(LOGO(p.teamId))}" alt="" loading="lazy" /><div class="who"><div class="nm">${esc(p.name)}${p.pos ? ` <span class="path">· ${esc(p.pos)}</span>` : ''}</div><div class="path">${esc(p.from || 'Auburn')} → <b>${esc(p.team)}</b></div></div><button class="rm" data-remove="${esc(p.id)}" aria-label="Stop tracking ${esc(p.name)}">×</button></div>
      <div class="pg"><div class="k">${g ? (state.view.week === state.curWeek ? 'This week' : `Week ${state.view.week}`) : 'This week'}</div>
        ${g ? gameCard(g, ctx, { compact: true, showDay: true }) : `<div class="line muted">${esc(p.team)} ${state.weeks[viewKey] ? 'is off this week (bye).' : '— slate not loaded yet.'}</div>`}
        ${g && g.status === 'post' ? playerStatHTML(p, g) : ''}
      </div>
    </div>`;
  }
  html += `<div class="addp"><h3>Track another player</h3>
    <div class="fields">
      <input id="pn" type="text" placeholder="Name (as ESPN lists it)" autocomplete="off" autocapitalize="words" />
      <input id="pp" type="text" placeholder="Pos" autocomplete="off" maxlength="4" />
      <div class="team-in"><input id="pt" type="text" placeholder="New team" autocomplete="off" /><ul class="sugg" id="pt-sugg"></ul></div>
      <div class="picked" id="pt-picked">Pick a team from the list.</div>
      <button class="go" id="padd" disabled>Add</button>
    </div></div>`;
  root.innerHTML = html;
  wireAddPlayer();
}
function playerStatHTML(p, g) {
  if (!isRevealed(g)) return `<div class="line muted">Stat line hidden until you reveal ${esc(g.away.name)}–${esc(g.home.name)}.</div>`;
  const lines = state.box[g.id];
  if (!lines) { if (isNum(g.id)) loadBox(g.id); return `<div class="line muted">Loading the box score…</div>`; }
  const ls = playerLines(p, lines);
  if (!ls.length) return `<div class="line muted">No stats recorded for ${esc(p.name)} in this one.</div>`;
  return ls.map((l) => `<div class="line"><span class="cat">${esc(l.cat)}</span>${esc(l.text)}</div>`).join('');
}
function wireAddPlayer() {
  const pn = $('pn'), pp = $('pp'), pt = $('pt'), sugg = $('pt-sugg'), picked = $('pt-picked'), go = $('padd');
  if (!pn) return;
  let team = null;
  const pool = teamPool();
  const ready = () => { go.disabled = !(pn.value.trim() && team); };
  pt.addEventListener('input', () => {
    team = null; picked.textContent = 'Pick a team from the list.'; ready();
    const q = pt.value.trim().toLowerCase();
    if (!q) { sugg.innerHTML = ''; return; }
    const hits = pool.filter((t) => t.name.toLowerCase().includes(q) || t.abbr.toLowerCase() === q).slice(0, 8);
    sugg.innerHTML = hits.map((t) => `<li data-tid="${esc(t.id)}"><img src="${esc(t.logo)}" alt="" />${esc(t.name)} <span style="opacity:.6">${esc(t.abbr)}</span></li>`).join('');
  });
  sugg.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-tid]'); if (!li) return;
    team = pool.find((t) => t.id === li.dataset.tid) || null;
    pt.value = team ? team.name : ''; sugg.innerHTML = '';
    picked.innerHTML = team ? `Tracking with <b>${esc(team.name)}</b>.` : 'Pick a team from the list.';
    ready();
  });
  pn.addEventListener('input', ready);
  go.addEventListener('click', () => {
    if (!team || !pn.value.trim()) return;
    state.players.push({ id: 'p-' + Date.now().toString(36), name: pn.value.trim(), pos: pp.value.trim().toUpperCase(), teamId: team.id, team: team.name, teamAbbr: team.abbr, from: 'Auburn' });
    store.set('players', state.players);
    render();
  });
}

/* ── render: chrome ─────────────────────────────────────────────────────── */
function renderStatus() {
  const el = $('status'), txt = $('statusText');
  const key = wkKey(state.view.type, state.view.week);
  const wk = state.weeks[key];
  if (state.loading && !wk) { el.classList.remove('live'); txt.textContent = 'loading the slate…'; return; }
  if (state.online) {
    el.classList.add('live');
    const live = hasLive(wk);
    txt.innerHTML = `${live ? 'Live · auto-refreshing' : 'Live'}${wk ? ' · updated ' + esc(relTime(wk.at)) : ''} · <button class="refresh" data-refresh>refresh</button>`;
  } else {
    el.classList.remove('live');
    txt.innerHTML = `${state.online === false ? 'Offline' : 'Connecting'}${wk ? ' · showing ' + esc(relTime(wk.at)) : ' · nothing cached'} · <button class="refresh" data-refresh>${state.online === false ? 'try again' : 'refresh'}</button>`;
  }
}
function render() {
  const tab = state.settings.tab;
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('view-weekend').hidden = tab !== 'weekend';
  $('view-plan').hidden = tab !== 'plan';
  $('view-auburn').hidden = tab !== 'auburn';
  $('view-players').hidden = tab !== 'players';
  const ns = $('nospoil'); ns.classList.toggle('on', state.settings.nospoil); ns.setAttribute('aria-checked', String(state.settings.nospoil));
  $('sub').textContent = `${state.season} · ${(calEntry(state.view.type, state.view.week) || {}).label || 'Week ' + state.view.week}`;
  if (tab === 'weekend') { renderWeekend(); loadGameDay(false); loadRcfb(false); }
  else if (tab === 'plan') renderPlan();
  else if (tab === 'auburn') { renderAuburn(); loadNews(false); }
  else renderPlayers();
  renderStatus();
}

/* ── interactions ───────────────────────────────────────────────────────── */
function setSetting(k, v) { state.settings[k] = v; store.set('settings', state.settings); }
function togglePeek(id) {
  if (!state.settings.nospoil) return;
  if (state.revealed[id]) delete state.revealed[id]; else state.revealed[id] = Date.now();
  store.set('revealed', state.revealed);
  render();
}
function toggleWatched(id) {
  const g = gameById(id);
  if (state.watched[id]) { delete state.watched[id]; }
  else {
    state.watched[id] = Date.now();
    state.revealed[id] = Date.now();
    if (g && window.river && window.river.emit) {
      window.river.emit({ app: 'saturday', kind: 'game.watched', startedAt: Date.now(), endedAt: Date.now(), durationMs: 0, label: `${g.away.name} vs ${g.home.name}` });
    }
  }
  store.set('watched', state.watched); store.set('revealed', state.revealed);
  render();
}
document.addEventListener('click', (e) => {
  const t = e.target;
  const tab = t.closest('[data-tab]'); if (tab) { setSetting('tab', tab.dataset.tab); render(); return; }
  const ch = t.closest('[data-filter]'); if (ch) { setSetting('filter', ch.dataset.filter); render(); return; }
  const so = t.closest('[data-sort]'); if (so) { const by = Object.assign({}, state.settings.sortBy || {}); by[state.settings.filter] = so.dataset.sort; setSetting('sortBy', by); render(); return; }
  const wk = t.closest('[data-wk]');
  if (wk) {
    let target = null;
    if (wk.dataset.wk === 'now') target = { type: state.curType, week: state.curWeek };
    else target = calNeighbor(wk.dataset.wk === 'next' ? 1 : -1);
    if (target) { state.view = { type: target.type, week: target.week }; render(); loadWeek(target.type, target.week, false); }
    return;
  }
  if (t.closest('[data-refresh]')) { loadWeek(state.view.type, state.view.week, true); refreshAuburn(true); loadNews(true); loadGameDay(true); loadRcfb(true); return; }
  if (t.closest('[data-news-refresh]')) { loadNews(true); render(); return; }
  const open = t.closest('[data-open]'); if (open) { const id = open.dataset.open; if (expanded.has(id)) expanded.delete(id); else expanded.add(id); render(); return; }
  const peek = t.closest('[data-peek]'); if (peek) { togglePeek(peek.dataset.peek); return; }
  const pl = t.closest('[data-plan]'); if (pl) { setPlan(pl.dataset.plan, pl.dataset.mode); return; }
  const watched = t.closest('[data-watched]'); if (watched) { toggleWatched(watched.dataset.watched); return; }
  const news = t.closest('[data-news]'); if (news) { shownNews.add(news.dataset.news); render(); return; }
  const rm = t.closest('[data-remove]'); if (rm) { state.players = state.players.filter((p) => p.id !== rm.dataset.remove); store.set('players', state.players); render(); return; }
});
$('nospoil').addEventListener('click', () => { setSetting('nospoil', !state.settings.nospoil); render(); });
document.addEventListener('error', (e) => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('broken'); }, true);   // offline logos: vanish, don't glyph

/* ── init ───────────────────────────────────────────────────────────────── */
function init() {
  if (window.sys) sys.theme.init();
  const s = store.get('settings');
  if (s) state.settings = Object.assign(state.settings, s);
  state.revealed = store.get('revealed', {}) || {};
  state.plan = store.get('plan', {}) || {};
  state.watched = store.get('watched', {}) || {};
  const oldQueue = store.get('queue');                       // v1 "Save" queue → full watches
  if (oldQueue) { for (const id of Object.keys(oldQueue)) if (!state.plan[id]) state.plan[id] = { mode: 'watch', at: oldQueue[id] }; store.set('plan', state.plan); if (window.sys) sys.storage.remove('saturday.queue'); }
  if (state.settings.filter === 'saved') state.settings.filter = 'plan';
  const players = store.get('players');
  state.players = Array.isArray(players) ? players : SEED_PLAYERS.slice();
  if (!Array.isArray(players)) store.set('players', state.players);
  $('note').innerHTML = `Spoiler-safe by default: scores, records and result headlines stay hidden until you flip <b>No-spoil</b> off or reveal a game. ` +
    `Heat: Auburn is always 100; rivals, SEC stakes, rankings, tracked players and tight finishes add up for everyone else. ` +
    `<b>Watch</b> or <b>Highlights</b> puts a game on your Plan; Auburn is there automatically. ` +
    `Watch verdicts assume <b>${esc(BUNDLE)}</b>. Slate, scores and TV come from ESPN's public JSON; feeds, GameDay picks and r/CFB threads ride a free proxy and fall back to links.`;
  boot();
}
init();
})();
