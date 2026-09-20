/* Matchday — a spoiler-safe Premier League companion.
 *
 * Man City everything, Haaland, the title race, and how to actually catch each
 * match. No build, no backend. Data comes from ESPN's public JSON (keyless,
 * CORS-open) and, best-effort, a few City feeds through a public CORS proxy.
 * Everything paints from a cached copy first, then hydrates. Spoilers stay
 * hidden until you flip No-spoil off, or reveal one match at a time.
 *
 * Sibling of ../saturday (college football). Same shape, different sport.
 */
(() => {
'use strict';

/* ── who we are ─────────────────────────────────────────────────────────── */
const SEASON_FALLBACK = 2026;               // ESPN names a season by its opening year
const CITY = { id: '382', abbr: 'MNC', name: 'Man City', full: 'Manchester City' };
const RIVALS = { '360': 'Man United', '364': 'Liverpool', '359': 'Arsenal' };
const BIG_SIX = new Set(['359', '363', '364', '382', '360', '367']);
const WORTH_IT = 40;                        // heat threshold for the "Worth it" slate

const LEAGUE = 'eng.1';
const ESPN = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/`;
const STANDINGS_URL = `https://site.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings`;
const LOGO = (id) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
const GAMECAST = (id) => `https://www.espn.com/soccer/match/_/gameId/${id}`;
const YT = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const RSOCCER = 'https://www.reddit.com/r/soccer/';
const rSearch = (q) => RSOCCER + 'search/?q=' + encodeURIComponent(q) + '&restrict_sr=1&sort=new';
const rRss = (q, t) => RSOCCER + 'search.rss?q=' + encodeURIComponent(q) + '&restrict_sr=1&sort=new&t=' + t;
const GAME_MS = 2 * 3600e3;                 // kickoff to full time, stoppage included
const HL_MS = 15 * 60e3;                    // one NBC extended-highlights block
const HL_LAG = 40 * 60e3;                   // uploads usually land about this long after the whistle

/* ── your bundle: Peacock Premium ─────────────────────────────────────────
 * NBC's Premier League split since the Versant spin-off: Peacock carries its
 * exclusives plus every NBC broadcast; USA Network matches are cable-only and
 * no longer stream on Peacock. */
const BUNDLE = 'Peacock';
function network(raw) {
  const n = String(raw || '').trim();
  if (!n) return null;
  const t = n.toLowerCase().replace(/\s+/g, ' ');
  const yes = (name, note) => ({ name, ok: true, note: note || '' });
  const no = (name, note) => ({ name, ok: false, note: note || '' });
  if (/peacock/.test(t)) return yes('Peacock');
  if (/^nbc$/.test(t)) return yes('NBC', 'simulcast on Peacock');
  if (/telemundo/.test(t)) return yes('Telemundo', 'Spanish call, also on Peacock');
  if (/^usa( net(work)?)?$/.test(t)) return no('USA Network', 'cable only — not on Peacock');
  if (/universo/.test(t)) return no('Universo', 'cable, Spanish');
  if (/cnbc/.test(t)) return no('CNBC', 'cable');
  if (/sky|tnt|bt sport|bbc|premier sports/.test(t)) return no(n, 'UK feed');
  return no(n);                              // unknown network: assume you can't
}
function watchPlan(g) {
  const nets = uniq(g.nets || []).map(network).filter(Boolean);
  const inBundle = nets.filter((x) => x.ok);
  if (!nets.length) return { kind: 'tba', nets, label: 'TV TBA', detail: 'US listings land a week or two out.' };
  if (inBundle.length) return { kind: 'bundle', nets, label: inBundle[0].name, detail: `In your bundle${inBundle[0].note ? ' — ' + inBundle[0].note : ''}.` };
  const first = nets[0];
  return { kind: 'record', nets, label: first.name + ' · record', detail: `Not in your bundle${first.note ? ' — ' + first.note : ''}. Record it, or catch highlights.` };
}

/* ── sources: "City everything" ─────────────────────────────────────────── */
const SOURCES = [
  { id: 'espn',   name: 'ESPN FC',                    kind: 'espn',    city: true,  url: ESPN + 'news?limit=50', home: 'https://www.espn.com/soccer/team/_/id/382/manchester-city' },
  { id: 'bbc',    name: 'BBC Sport',                  kind: 'rss',     city: true,  url: 'https://feeds.bbci.co.uk/sport/football/teams/manchester-city/rss.xml', home: 'https://www.bbc.com/sport/football/teams/manchester-city' },
  { id: 'gdn',    name: 'The Guardian',               kind: 'rss',     city: true,  url: 'https://www.theguardian.com/football/manchestercity/rss', home: 'https://www.theguardian.com/football/manchestercity' },
  { id: 'men',    name: 'Manchester Evening News',    kind: 'rss',     city: true,  url: 'https://www.manchestereveningnews.co.uk/all-about/manchester-city-fc?service=rss', home: 'https://www.manchestereveningnews.co.uk/all-about/manchester-city-fc' },
  { id: 'nbcyt',  name: 'NBC Sports · YouTube',       kind: 'youtube', city: false, url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqZQlzSHbVJrwrn5XvzrzcA', home: 'https://www.youtube.com/@NBCSports' },
  { id: 'mcfcyt', name: 'Man City · YouTube',         kind: 'youtube', city: true,  url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkzCjdRMrW2vXLx8mvPVLdQ', home: 'https://www.youtube.com/@ManCity' },
  { id: 'sky',    name: 'Sky Sports',                 kind: 'link',    home: 'https://www.skysports.com/manchester-city' },
  { id: 'athl',   name: 'The Athletic',               kind: 'link',    paywall: 'yes', home: 'https://www.nytimes.com/athletic/football/team/manchester-city/' },
  { id: 'mcfc',   name: 'mancity.com',                kind: 'link',    home: 'https://www.mancity.com/' },
  { id: 'rmcfc',  name: 'r/MCFC',                     kind: 'link',    home: 'https://www.reddit.com/r/MCFC/' },
];
const SOURCE = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
const PROXIES = [
  (u) => ({ url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(u), shape: 'rss2json' }),
  (u) => ({ url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(u), shape: 'allorigins' }),
];
const CITY_WORDS = /man(chester)?\s*city|\bcity\b.*\b(maresca|etihad)|haaland|maresca|etihad|\bmcfc\b/i;

/* ── the league, 2026–27 ─────────────────────────────────────────────────── */
const PL_TEAMS = [
  ['359', 'ARS', 'Arsenal', 'Arsenal'], ['362', 'AVL', 'Aston Villa', 'Aston Villa'], ['349', 'BOU', 'Bournemouth', 'AFC Bournemouth'],
  ['337', 'BRE', 'Brentford', 'Brentford'], ['331', 'BHA', 'Brighton', 'Brighton & Hove Albion'], ['363', 'CHE', 'Chelsea', 'Chelsea'],
  ['388', 'COV', 'Coventry', 'Coventry City'], ['384', 'CRY', 'Crystal Palace', 'Crystal Palace'], ['368', 'EVE', 'Everton', 'Everton'],
  ['370', 'FUL', 'Fulham', 'Fulham'], ['306', 'HUL', 'Hull City', 'Hull City'], ['373', 'IPS', 'Ipswich', 'Ipswich Town'],
  ['357', 'LEE', 'Leeds', 'Leeds United'], ['364', 'LIV', 'Liverpool', 'Liverpool'], ['382', 'MNC', 'Man City', 'Manchester City'],
  ['360', 'MAN', 'Man United', 'Manchester United'], ['361', 'NEW', 'Newcastle', 'Newcastle United'], ['393', 'NFO', 'Nottm Forest', 'Nottingham Forest'],
  ['366', 'SUN', 'Sunderland', 'Sunderland'], ['367', 'TOT', 'Tottenham', 'Tottenham Hotspur'],
];
const ALIASES = {
  '382': ['Manchester City', 'Man City', 'MCFC'], '360': ['Manchester United', 'Man United', 'Man Utd', 'derby'],
  '367': ['Tottenham', 'Spurs'], '393': ['Nottingham Forest', 'Forest'], '331': ['Brighton'], '349': ['Bournemouth'],
  '361': ['Newcastle'], '384': ['Crystal Palace', 'Palace'], '362': ['Aston Villa', 'Villa'], '373': ['Ipswich'], '306': ['Hull'],
};
const T = (id, abbr, name, full) => ({ id, abbr, name, full: full || name, logo: id ? LOGO(id) : '', rank: null, record: null, score: null, winner: false });
const teamRow = (id) => { const r = PL_TEAMS.find((t) => t[0] === id); return r ? T(r[0], r[1], r[2], r[3]) : T('', '', 'TBC', 'TBC'); };
// City's 2026–27 league fixtures, as announced; kickoff times land with the TV picks. Live data replaces this on first load.
const BAKED_CITY = [
  { week: 1,  ts: '2026-08-23T15:00Z', opp: '349', at: 'home' },
  { week: 2,  ts: '2026-08-28T19:00Z', opp: '384', at: 'away', tba: true },
  { week: 3,  ts: '2026-09-05T14:00Z', opp: '388', at: 'home', tba: true },
  { week: 4,  ts: '2026-09-13T15:30Z', opp: '360', at: 'away', note: 'Manchester derby' },
  { week: 5,  ts: '2026-09-20T13:00Z', opp: '366', at: 'home', tba: true },
  { week: 6,  ts: '2026-10-11T15:30Z', opp: '364', at: 'away', tba: true },
  { week: 7,  ts: '2026-10-17T13:00Z', opp: '373', at: 'home' },
  { week: 8,  ts: '2026-10-24T10:30Z', opp: '362', at: 'away' },
  { week: 9,  ts: '2026-10-31T15:00Z', opp: '331', at: 'home', tba: true },
  { week: 12, ts: '2026-11-28T15:00Z', opp: '359', at: 'away', tba: true },
  { week: 13, ts: '2026-12-02T20:00Z', opp: '357', at: 'home', tba: true },
  { week: 14, ts: '2026-12-05T15:00Z', opp: '337', at: 'away', tba: true },
  { week: 15, ts: '2026-12-12T15:00Z', opp: '363', at: 'home', tba: true },
  { week: 17, ts: '2026-12-26T15:00Z', opp: '361', at: 'away', tba: true },
  { week: 18, ts: '2026-12-29T20:00Z', opp: '368', at: 'away', tba: true },
  { week: 19, ts: '2027-01-03T15:00Z', opp: '367', at: 'home', tba: true },
  { week: 21, ts: '2027-01-16T15:00Z', opp: '393', at: 'home', tba: true },
  { week: 22, ts: '2027-01-23T15:00Z', opp: '331', at: 'away', tba: true },
  { week: 24, ts: '2027-02-06T15:00Z', opp: '370', at: 'away', tba: true },
  { week: 25, ts: '2027-02-10T20:00Z', opp: '367', at: 'away', tba: true },
  { week: 26, ts: '2027-02-20T15:00Z', opp: '361', at: 'home', tba: true },
  { week: 27, ts: '2027-02-27T15:00Z', opp: '306', at: 'home', tba: true },
  { week: 28, ts: '2027-03-03T20:00Z', opp: '368', at: 'home', tba: true },
  { week: null, ts: '2027-04-10T14:00Z', opp: '349', at: 'away', tba: true },
  { week: null, ts: '2027-04-17T14:00Z', opp: '384', at: 'home', tba: true },
  { week: null, ts: '2027-04-24T14:00Z', opp: '363', at: 'away', tba: true },
  { week: 36, ts: '2027-05-15T14:00Z', opp: '373', at: 'away', tba: true },
  { week: 37, ts: '2027-05-23T14:00Z', opp: '362', at: 'home', tba: true },
  { week: 38, ts: '2027-05-30T15:00Z', opp: '366', at: 'away', tba: true },
];
const SEED_PLAYERS = [
  { id: 'p-haaland', name: 'Erling Haaland', pos: 'FW', teamId: '382', team: 'Man City', teamAbbr: 'MNC', from: 'Norway' },
];

/* ── storage (sys.storage, namespaced) ──────────────────────────────────── */
const store = {
  get(k, fb) { return window.sys ? sys.storage.get('matchday.' + k, fb) : fb; },
  set(k, v) { if (window.sys) sys.storage.set('matchday.' + k, v); },
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
  season: SEASON_FALLBACK,
  calendar: null,                      // { 'YYYYMMDD': true } — days with matches, from ESPN
  view: null,                          // window start (ms) on screen
  windows: {},                         // key -> { games, at }
  city: { games: [], at: 0, live: false },
  table: { rows: [], at: 0 },          // league table
  news: { items: [], at: 0, status: {} },
  pundits: { at: 0, links: [] },
  threads: { at: 0, items: [] },
  box: {},
  settings: { nospoil: true, filter: 'worth', tab: 'week', sortBy: {} },
  revealed: {}, plan: {}, watched: {},
  players: [],
  online: null,
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
const isNum = (id) => /^\d+$/.test(String(id));
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtDow = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const fmtMD = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 4)] || 'th');
const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function ymd(ts) { const d = new Date(ts); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; }
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

/* ── the viewing window: Tuesday to Monday, so a round never splits ──────── */
function winStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 5) % 7)); return d.getTime(); }
function winEnd(start) { const d = new Date(start); d.setDate(d.getDate() + 7); return d.getTime(); }
function winShift(start, dir) { const d = new Date(start); d.setDate(d.getDate() + 7 * dir); return winStart(d.getTime()); }
function winDays(start) { const out = []; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); out.push(ymd(d.getTime())); } return out; }
const winKey = (start) => ymd(start);
const curWin = () => winStart(Date.now());
function inWin(ts, start) { return ts >= start && ts < winEnd(start); }

/* ── ESPN → our match shape ─────────────────────────────────────────────── */
function normTeam(c) {
  const t = c.team || {};
  const id = String(t.id || '');
  const recs = c.records || c.record;
  let record = null;
  if (Array.isArray(recs)) { const o = recs.find((r) => r.type === 'total' || r.name === 'overall') || recs[0]; record = o ? (o.summary || o.displayValue || null) : null; }
  if (!record && typeof c.form === 'string' && c.form) record = c.form;
  return {
    id, abbr: t.abbreviation || '', name: t.shortDisplayName || t.displayName || t.name || '', full: t.displayName || t.name || '',
    logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || (id ? LOGO(id) : ''),
    rank: null, record, score: num(c.score), winner: !!c.winner,
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
  if (/POSTPONED|CANCEL|SUSPENDED|ABANDON|FORFEIT/.test(name)) return { status: 'off', detail: t.shortDetail || t.description || 'Off', period: 0, clock: '', ot: false };
  if (s === 'in' || /IN_PROGRESS|HALFTIME|END_PERIOD/.test(name)) {
    const p = Number(st.period) || 0;
    const detail = /HALFTIME/.test(name) ? 'HT' : (st.displayClock || (p ? (p === 1 ? '1st half' : p === 2 ? '2nd half' : 'ET') : 'Live'));
    return { status: 'in', detail, period: p, clock: st.displayClock || '', ot: p > 2 };
  }
  if (s === 'post' || t.completed || /FULL_TIME|FINAL/.test(name)) return { status: 'post', detail: /PEN/.test(name) ? 'Pens' : /AET|ET/.test(name) ? 'AET' : 'FT', period: Number(st.period) || 0, clock: '', ot: /AET|PEN/.test(name) };
  return { status: 'pre', detail: '', period: 0, clock: '', ot: false };
}
function normGoals(comp) {
  const out = [];
  for (const d of comp.details || []) {
    const isGoal = d.scoringPlay || /goal/i.test((d.type && d.type.text) || '');
    if (!isGoal || d.shootout) continue;
    const who = d.athletesInvolved && d.athletesInvolved[0];
    out.push({ min: (d.clock && d.clock.displayValue) || '', teamId: String((d.team && d.team.id) || ''), name: who ? (who.displayName || who.fullName || '') : '', own: !!d.ownGoal, pen: !!d.penaltyKick });
  }
  return out;
}
function normEvent(e) {
  const comp = (e.competitions && e.competitions[0]) || {};
  const cs = comp.competitors || [];
  const home = cs.find((c) => c.homeAway === 'home') || cs[0];
  const away = cs.find((c) => c.homeAway === 'away') || cs[1];
  if (!home || !away) return null;
  const st = normStatus(comp.status || e.status);
  const ts = Date.parse(e.date || comp.date || '') || 0;
  const league = e.league || {};
  const compName = league.slug && league.slug !== LEAGUE ? (league.abbreviation || league.name || '') : null;
  return {
    id: String(e.id || comp.id || ''), ts, tba: !!(e.timeValid === false || comp.timeValid === false),
    week: e.week && e.week.number != null ? Number(e.week.number) : null,
    comp: compName,
    status: st.status, detail: st.detail, period: st.period, ot: st.ot,
    neutral: !!comp.neutralSite,
    venue: comp.venue && comp.venue.fullName ? comp.venue.fullName : null,
    city: comp.venue && comp.venue.address ? [comp.venue.address.city, comp.venue.address.country].filter(Boolean).join(', ') : null,
    home: normTeam(home), away: normTeam(away),
    nets: broadcastNames(comp), goals: normGoals(comp),
    note: (comp.notes && comp.notes[0] && comp.notes[0].headline) ? String(comp.notes[0].headline) : null,
  };
}
function bakedCity() {
  return BAKED_CITY.map((b, i) => {
    const me = T(CITY.id, CITY.abbr, CITY.name, CITY.full);
    const opp = teamRow(b.opp);
    const home = b.at === 'away' ? opp : me, away = b.at === 'away' ? me : opp;
    return { id: 'mnc-' + (b.week || 'x' + i), ts: Date.parse(b.ts), tba: !!b.tba, week: b.week, comp: null, status: 'pre', detail: '', period: 0, ot: false,
      neutral: false, venue: b.at === 'home' ? 'Etihad Stadium' : null, city: b.at === 'home' ? 'Manchester, England' : null,
      home, away, nets: [], goals: [], note: b.note || null };
  });
}
function applyCalendar(sb) {
  const L = sb && sb.leagues && sb.leagues[0];
  if (!L || !Array.isArray(L.calendar) || !L.calendar.length || typeof L.calendar[0] !== 'string') return;
  const days = {};
  for (const s of L.calendar) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) days[m[1] + m[2] + m[3]] = true; }
  if (Object.keys(days).length) { state.calendar = days; store.set('calendar', { season: state.season, days }); }
}

/* ── network ────────────────────────────────────────────────────────────── */
async function getJSON(url, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout || 9000);
  try { const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' }); if (!res.ok) return null; return await res.json(); }
  catch (_) { return null; }
  finally { clearTimeout(t); }
}
async function fetchDay(day) {
  const sb = await getJSON(`${ESPN}scoreboard?dates=${day}&limit=100`);
  if (!sb || !Array.isArray(sb.events)) return null;
  if (sb.season && sb.season.year) state.season = Number(sb.season.year);
  else if (sb.leagues && sb.leagues[0] && sb.leagues[0].season && sb.leagues[0].season.year) state.season = Number(sb.leagues[0].season.year);
  applyCalendar(sb);
  return sb.events.map(normEvent).filter(Boolean);
}
// The scoreboard serves one date per call, so a window is up to seven calls —
// fewer once ESPN's calendar tells us which days actually have matches.
async function fetchWindow(start) {
  const days = winDays(start).filter((d) => !state.calendar || state.calendar[d]);
  if (!days.length) return { games: [], at: Date.now(), empty: true };
  const results = await Promise.all(days.map(fetchDay));
  if (results.every((r) => r === null)) return null;
  const seen = new Set(), games = [];
  for (const r of results) for (const g of r || []) if (g.id && !seen.has(g.id) && inWin(g.ts, start)) { seen.add(g.id); games.push(g); }
  games.sort((a, b) => a.ts - b.ts);
  return { games, at: Date.now() };
}
async function fetchCity() {
  const d = await getJSON(`${ESPN}teams/${CITY.id}/schedule`);
  if (!d || !Array.isArray(d.events)) return null;
  const games = d.events.map(normEvent).filter(Boolean).sort((a, b) => a.ts - b.ts);
  return games.length ? { games, at: Date.now(), live: true } : null;
}
async function fetchStandings() {
  const d = await getJSON(STANDINGS_URL);
  if (!d) return null;
  const block = (d.children && d.children[0] && d.children[0].standings) || d.standings || null;
  const entries = block && Array.isArray(block.entries) ? block.entries : [];
  const rows = entries.map((e) => {
    const stat = (name, abbr) => { const s = (e.stats || []).find((x) => x.name === name || (abbr && x.abbreviation === abbr)); return s ? num(s.value != null ? s.value : s.displayValue) : null; };
    const t = e.team || {};
    return { id: String(t.id || ''), name: t.shortDisplayName || t.displayName || '', full: t.displayName || '', logo: (t.logos && t.logos[0] && t.logos[0].href) || (t.id ? LOGO(t.id) : ''),
      pos: stat('rank', 'R'), pts: stat('points', 'P'), p: stat('gamesPlayed', 'GP'), w: stat('wins', 'W'), d: stat('ties', 'D'), l: stat('losses', 'L'), gd: stat('pointDifferential', 'GD') };
  }).filter((r) => r.id);
  rows.sort((a, b) => (a.pos || 99) - (b.pos || 99));
  rows.forEach((r, i) => { if (r.pos == null) r.pos = i + 1; });
  return rows.length ? { rows, at: Date.now() } : null;
}

/* ── loading orchestration ──────────────────────────────────────────────── */
function winAge(w) { return w ? Date.now() - w.at : Infinity; }
function hasLive(w) { return !!(w && w.games.some((g) => g.status === 'in')); }
function staleFor(key) {
  const w = state.windows[key]; if (!w) return true;
  if (hasLive(w)) return winAge(w) > 45e3;
  const allDone = w.games.length && w.games.every((g) => g.status === 'post' || g.status === 'off');
  const kickoffSoon = w.games.some((g) => g.status === 'pre' && g.ts - Date.now() < 3600e3 && g.ts - Date.now() > -3 * 3600e3);
  if (kickoffSoon) return winAge(w) > 2 * 60e3;
  return winAge(w) > (allDone ? 6 * 3600e3 : 10 * 60e3);
}
async function loadWindow(start, force) {
  const key = winKey(start);
  const cached = cache.get('win.' + key);
  if (cached && !state.windows[key]) state.windows[key] = cached.data;
  if (!force && !staleFor(key)) { render(); return; }
  state.loading = true; renderStatus();
  const fresh = await fetchWindow(start);
  state.loading = false;
  if (fresh) { state.online = true; state.windows[key] = fresh; cache.set('win.' + key, fresh); }
  else if (state.online == null) state.online = false;
  render();
}
async function boot() {
  const savedCal = store.get('calendar');
  if (savedCal && savedCal.days) { state.calendar = savedCal.days; if (savedCal.season) state.season = savedCal.season; }
  const savedCity = cache.get('city');
  state.city = savedCity ? savedCity.data : { games: bakedCity(), at: 0, live: false };
  const savedTable = cache.get('table');
  if (savedTable) state.table = savedTable.data;
  state.view = curWin();
  try {                                                      // warm every cached window (cheap, keeps Plan working offline)
    for (const k of Object.keys(localStorage)) {
      const m = k.match(/^sys:matchday\.cache\.win\.(.+)$/); if (!m) continue;
      const c = cache.get('win.' + m[1]); if (c) state.windows[m[1]] = c.data;
    }
  } catch (_) {}
  render();
  await loadWindow(state.view, false);
  refreshCity(false); loadStandings(false);
  loadPundits(false); loadThreads(false);
  startTicking();
}
async function refreshCity(force) {
  if (!force && state.city.live && Date.now() - state.city.at < 10 * 60e3) return;
  const c = await fetchCity();
  if (c) { state.city = c; cache.set('city', c); state.online = true; render(); }
}
async function loadStandings(force) {
  if (!force && state.table.at && Date.now() - state.table.at < 30 * 60e3) return;
  const t = await fetchStandings();
  if (t) { state.table = t; cache.set('table', t); render(); }
}
function startTicking() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (document.hidden) return;
    const key = winKey(state.view);
    if (staleFor(key)) loadWindow(state.view, true);
    else if (state.windows[key] && state.windows[key].games.some((g) => g.status === 'pre' && g.ts - Date.now() < 86400e3)) render();
  }, 20e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadWindow(state.view, false); });
}

/* ── merged views over the data ─────────────────────────────────────────── */
function involves(g, id) { return g.home.id === id || g.away.id === id; }
function allWindowGames() { const out = []; for (const k of Object.keys(state.windows)) out.push(...state.windows[k].games); return out; }
function cityGames() {
  const base = state.city.games.slice();
  const fresh = allWindowGames().filter((g) => involves(g, CITY.id));
  const oppOf = (x) => (x.home.id === CITY.id ? x.away.id : x.home.id);
  for (const g of fresh) {
    let i = base.findIndex((b) => b.id === g.id);
    if (i < 0) i = base.findIndex((b) => oppOf(b) === oppOf(g) && (b.home.id === g.home.id) && Math.abs(b.ts - g.ts) < 21 * 86400e3);
    if (i >= 0) { const w = state.windows[winKey(winStart(g.ts))]; if (!state.city.live || !w || w.at >= state.city.at) base[i] = g; }
    else base.push(g);
  }
  return base.sort((a, b) => a.ts - b.ts);
}
function allKnownGames() {
  const m = new Map();
  for (const g of allWindowGames()) m.set(g.id, g);
  for (const g of cityGames()) if (!m.has(g.id)) m.set(g.id, g);
  return Array.from(m.values());
}
function gameById(id) { return allKnownGames().find((g) => g.id === id) || null; }
function nextCity() { const gs = cityGames(); return gs.find((g) => g.status === 'in') || gs.find((g) => g.status === 'pre' && g.ts > Date.now() - 3 * 3600e3) || gs.find((g) => g.status === 'pre') || null; }
function tableRow(id) { return (state.table.rows || []).find((r) => r.id === id) || null; }
function posOf(id) { const r = tableRow(id); return r ? r.pos : null; }
function buildContext() {
  const slate = new Map();
  const gs = cityGames(); const nxt = nextCity();
  for (const g of gs) { const opp = g.home.id === CITY.id ? g.away : g.home; if (!slate.has(opp.id) || g.status !== 'post') slate.set(opp.id, { week: g.week, ts: g.ts, played: g.status === 'post', next: !!(nxt && nxt.id === g.id) }); }
  const tracked = new Map();
  for (const p of state.players) { if (!p.teamId) continue; if (!tracked.has(p.teamId)) tracked.set(p.teamId, []); tracked.get(p.teamId).push(p.name); }
  return { slate, tracked };
}

/* ── the heat index ──────────────────────────────────────────────────────────
 * City is always 100. Everything else combines reasons with diminishing
 * returns — each factor is "how much this alone would pull you in" (0–1), and
 * they stack as 1 − Π(1 − w). Closeness counts, but never who's ahead. */
function heat(g, ctx) {
  const teams = [g.home, g.away];
  const mine = involves(g, CITY.id);
  const parts = [];
  const add = (w, text) => parts.push({ w, text });
  const rivals = teams.filter((t) => RIVALS[t.id]);
  if (mine) { add(1, 'Man City'); if (involves(g, '360')) add(0.5, 'Manchester derby'); else if (rivals.length) add(0.35, 'Rival · ' + rivals[0].name); }
  else {
    if (rivals.length === 2) add(0.5, 'Rivals collide');
    else if (rivals.length === 1) add(0.35, 'Rival · ' + rivals[0].name);
    const six = teams.filter((t) => BIG_SIX.has(t.id)).length;
    if (six === 2) add(0.35, 'Big-six clash'); else if (six === 1) add(0.12, 'Big six');
    const pos = teams.map((t) => posOf(t.id));
    if (pos.every((p) => p && p <= 4)) add(0.4, 'Top-four clash');
    else if (pos.every((p) => p && p <= 6)) add(0.3, 'Top-six clash');
    else if (pos.some((p) => p && p <= 4)) { const i = pos.findIndex((p) => p && p <= 4); add(0.1, `${ordinal(pos[i])} · ${teams[i].name}`); }
    if (pos.every((p) => p && p >= 17)) add(0.15, 'Relegation scrap');
    const cityPts = (tableRow(CITY.id) || {}).pts;
    for (let i = 0; i < 2; i++) { const r = tableRow(teams[i].id); if (r && cityPts != null && r.pos <= 5 && Math.abs(r.pts - cityPts) <= 6 && !RIVALS[teams[i].id]) add(0.25, 'Title race · ' + teams[i].name); }
    for (const t of teams) {
      const meet = ctx.slate.get(t.id); if (!meet) continue;
      if (meet.next) add(0.25, `Scout · City plays ${t.name} next`);
      else if (!meet.played) add(0.1, `City plays ${t.name} ${meet.week ? 'in MW ' + meet.week : fmtMD.format(new Date(meet.ts))}`);
      else add(0.05, `City played ${t.name}${meet.week ? ' in MW ' + meet.week : ''}`);
    }
    for (const t of teams) { const names = ctx.tracked.get(t.id); if (names) add(0.3, `${names.join(' & ')}${names.length > 1 ? "'" : "'s"} ${t.name}`); }
  }
  const hs = g.home.score, as = g.away.score;
  if (hs != null && as != null) {
    const m = Math.abs(hs - as), total = hs + as;
    if (g.status === 'in' && g.period >= 2 && m <= 1) add(0.4, 'Tight in the 2nd half');
    if (g.status === 'post') { if (m <= 1) add(0.25, 'Tight finish'); if (total >= 5) add(0.2, 'Goal fest'); }
  }
  parts.sort((a, b) => b.w - a.w);
  const miss = parts.reduce((acc, x) => acc * (1 - x.w), 1);
  const h = mine ? 100 : Math.min(99, Math.round(100 * (1 - miss)));
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
  const names = uniq([t.name, t.full].concat(ALIASES[t.id] || []));
  for (const n of names) if (n && s.includes(' ' + n.toLowerCase())) return true;
  if (t.abbr && t.abbr.length >= 3 && new RegExp('\\b' + t.abbr + '\\b').test(String(text || ''))) return true;
  return false;
}
const RESULT_WORDS = /\b(beat|beats|defeat|defeats|thrash|thrashe[sd]|hammer|hammers|stun|stuns|upset|upsets|edge|edges|held|hold on|draw|drew|stalemate|wins?\b|won|loses?|lost|victory|late winner|equalis|equaliz|comeback|brace|hat[- ]?trick|clean sheet|sent off|red card|penalty|player ratings|match report|talking points|five things|what we learned|reaction|verdict|as it happened|recap|analysis)/i;
function spoilRiskFor(item) {
  if (!state.settings.nospoil) return null;
  const src = SOURCE[item.src] || {};
  const started = allKnownGames().filter((g) => (g.status === 'in' || g.status === 'post') && !state.revealed[g.id]);
  for (const g of started) {
    if (item.ts && item.ts < g.ts - 30 * 60e3) continue;              // written before kickoff: safe
    const text = item.title || '';
    const cityGame = involves(g, CITY.id);
    if (src.city && cityGame && item.ts) {
      const opp = g.home.id === CITY.id ? g.away : g.home;
      if (item.ts <= g.ts + 36 * 3600e3) return g;                                                      // the reaction window: reports, ratings, pressers
      if (item.ts <= g.ts + 7 * 86400e3 && (RESULT_WORDS.test(text) || mentions(text, opp))) return g;  // after that, only if it talks results
    }
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
    return d.articles.map((a) => ({
      id: 'espn:' + (a.id || (a.links && a.links.web && a.links.web.href) || a.headline),
      title: a.headline || '', url: safeUrl(a.links && a.links.web ? a.links.web.href : ''),
      ts: Date.parse(a.published || a.lastModified || '') || 0, src: 'espn', premium: !!a.premium,
      thumb: safeUrl(a.images && a.images[0] ? a.images[0].url : ''),
      city: (a.categories || []).some((c) => String(c.teamId || (c.team && c.team.id) || '') === CITY.id) || CITY_WORDS.test((a.headline || '') + ' ' + (a.description || '')),
    })).filter((i) => i.title && i.url && i.city);            // league-wide feed; keep the City stories
  }
  const items = await fetchFeed(src);
  if (items && src.kind === 'youtube' && !src.city) return items.filter((i) => /premier league|\bPL\b/i.test(i.title));   // NBC posts everything; keep the league
  return items;
}
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
  if (cached && !state.news.at) state.news = cached.data;
  if (!force && state.news.at && Date.now() - state.news.at < 20 * 60e3) return;
  if (!force && Date.now() - newsTriedAt < 5 * 60e3) return;
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

/* ── pundits' predictions ────────────────────────────────────────────────────
 * Sutton (BBC) and Merson (Sky) post before every round. Found in their feeds
 * when the proxy comes through; the search links always stand on their own. */
let punditsTriedAt = 0;
async function loadPundits(force) {
  const cached = cache.get('pundits');
  if (cached && !state.pundits.at) state.pundits = cached.data;
  if (!force && state.pundits.at && Date.now() - state.pundits.at < 6 * 3600e3) return;
  if (!force && Date.now() - punditsTriedAt < 5 * 60e3) return;
  punditsTriedAt = Date.now();
  const [bbc, sky] = await Promise.all([
    fetchFeed({ id: 'bbc-fb', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' }),
    fetchFeed({ id: 'sky-fb', url: 'https://www.skysports.com/rss/12040' }),
  ]);
  const links = [];
  const pick = (items, re, label) => { const it = (items || []).find((i) => re.test(i.title)); if (it) links.push({ label: label + ' · ' + it.title, href: it.url }); };
  pick(bbc, /sutton|predictions?/i, 'BBC');
  pick(sky, /merson|predictions?/i, 'Sky Sports');
  state.pundits = { at: Date.now(), links, tried: true };
  cache.set('pundits', state.pundits);
  render();
}

/* ── r/soccer match threads ──────────────────────────────────────────────────
 * Every card links to an r/soccer search that lands on the thread. When the
 * flair feed comes through, the link upgrades to the thread itself. Post-match
 * threads carry the score in the title, so they are never surfaced. */
let threadsTriedAt = 0;
async function loadThreads(force) {
  const cached = cache.get('threads');
  if (cached && !state.threads.at) state.threads = cached.data;
  if (!force && state.threads.at && Date.now() - state.threads.at < 15 * 60e3) return;
  if (!force && Date.now() - threadsTriedAt < 5 * 60e3) return;
  threadsTriedAt = Date.now();
  const items = await fetchFeed({ id: 'rsoccer', url: rRss('flair:"Match Thread"', 'day') });
  if (!items) return;
  state.threads = { at: Date.now(), items: items.filter((i) => /^match thread/i.test(i.title.trim()) && !/post[- ]?match|pre[- ]?match/i.test(i.title)).map((i) => ({ title: i.title, url: i.url })) };
  cache.set('threads', state.threads);
  render();
}
function threadFor(g) { return (state.threads.items || []).find((i) => mentions(i.title, g.home) && mentions(i.title, g.away)) || null; }

/* ── the plan ──────────────────────────────────────────────────────────────
 * plan[id] = { mode: 'watch' | 'hl' | 'off' }. City matches are in as a full
 * watch unless you took them out (finished ones drop off after three days). Full watches sit on the kickoff; replays and
 * highlight blocks float to the first free slot after the whistle (and the
 * upload), never on top of something you're watching. */
const AUTO_REPLAY_MS = 3 * 86400e3;       // a finished City match stays auto-planned as a replay this long, then it's on you
function planMode(g) {
  const p = state.plan[g.id];
  if (p) return p.mode === 'off' ? null : p.mode;
  if (!involves(g, CITY.id)) return null;
  return g.status !== 'post' || Date.now() - g.ts < AUTO_REPLAY_MS ? 'watch' : null;
}
function setPlan(id, mode) {
  const g = gameById(id); if (!g) return;
  if (planMode(g) === mode) { if (involves(g, CITY.id)) state.plan[id] = { mode: 'off', at: Date.now() }; else delete state.plan[id]; }
  else state.plan[id] = { mode, at: Date.now() };
  store.set('plan', state.plan);
  render();
}
function gameEnd(g) {
  if (g.status === 'in') return g.period >= 2 ? Date.now() + 30 * 60e3 : Math.max(Date.now() + 30 * 60e3, g.ts + GAME_MS);
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
    if (f.done) { f.start = f.avail; f.end = f.avail + f.len; continue; }
    let t = morningRoll(Math.max(f.avail, now));
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
  const lines = [];
  for (const t of (d && d.boxscore && d.boxscore.players) || []) for (const cat of t.statistics || []) for (const a of cat.athletes || []) {
    lines.push({ teamId: String((t.team && t.team.id) || ''), name: (a.athlete && a.athlete.displayName) || '', labels: cat.labels || cat.keys || [], stats: a.stats || [] });
  }
  for (const r of (d && d.rosters) || []) for (const p of r.roster || []) {                 // soccer summaries list stats per player on the roster
    if (!Array.isArray(p.stats) || !p.stats.length) continue;
    lines.push({ teamId: String((r.team && r.team.id) || ''), name: (p.athlete && p.athlete.displayName) || '', labels: p.stats.map((s) => s.abbreviation || s.shortDisplayName || s.name || ''), stats: p.stats.map((s) => s.displayValue != null ? s.displayValue : s.value) });
  }
  state.box[gameId] = lines;
  if (lines.length) cache.set('box.' + gameId, lines);
  render();
}
const PREFERRED = [['G', 'goals'], ['A', 'assists'], ['SH', 'shots'], ['ST', 'on target'], ['FC', 'fouls'], ['YC', 'yellow']];
function playerLines(p, lines) {
  const mine = lines.filter((l) => l.teamId === p.teamId && l.name.toLowerCase() === p.name.trim().toLowerCase());
  return mine.map((l) => {
    const idx = (lab) => l.labels.findIndex((x) => String(x).toUpperCase() === lab);
    const picks = PREFERRED.map(([lab, word]) => { const i = idx(lab); return i >= 0 ? `${l.stats[i] != null ? l.stats[i] : '–'} ${word}` : null; }).filter(Boolean);
    const text = picks.length ? picks.slice(0, 4).join(' · ') : l.labels.slice(0, 4).map((lab, i) => `${l.stats[i] != null ? l.stats[i] : '–'} ${lab}`).join(' · ');
    return { text };
  });
}
function goalsFor(g, p) { return (g.goals || []).filter((x) => x.teamId === p.teamId && x.name && x.name.toLowerCase() === p.name.trim().toLowerCase()); }

/* ── render: pieces ─────────────────────────────────────────────────────── */
function netChip(plan) {
  const cls = plan.kind === 'bundle' ? 'ok' : plan.kind === 'record' ? 'no' : 'tba';
  return `<span class="net ${cls}" title="${esc(plan.detail)}">${esc(plan.label)}</span>`;
}
function sideHTML(t, isWin) {
  const mine = t.id === CITY.id;
  const pos = !state.settings.nospoil ? posOf(t.id) : null;
  const rec = !state.settings.nospoil && t.record ? `<span class="rec">${esc(t.record)}</span>` : '';
  return `<div class="side${isWin ? ' win' : ''}${mine ? ' mine' : ''}">
    <img class="logo" src="${esc(t.logo)}" alt="" loading="lazy" decoding="async" />
    <span class="rank">${pos ? ordinal(pos) : ''}</span>
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
  const tag = live ? `<span class="tag live">${esc(g.detail || 'Live')}</span>` : `<span class="tag">${esc(g.detail || 'FT')}</span>`;
  if (!shown) return `<button class="score-col" data-peek="${esc(g.id)}" aria-label="Reveal score">${tag}<span class="dots">•••</span><span class="hint">tap to see</span></button>`;
  const sc = `<span class="sc">${g.home.score != null ? g.home.score : '–'}–${g.away.score != null ? g.away.score : '–'}</span>`;
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
  const q = `${g.home.full || g.home.name} v. ${g.away.full || g.away.name} Premier League highlights`;
  const links = [{ label: 'NBC Sports', href: YT('NBC Sports ' + q) }];
  if (involves(g, CITY.id)) links.push({ label: 'Man City', href: YT('Man City ' + q) });
  return links;
}
function goalsLine(g) {
  if (!g.goals || !g.goals.length) return '';
  const side = (id) => g.goals.filter((x) => x.teamId === id).map((x) => `${esc(x.name || '?')}${x.own ? ' (og)' : ''}${x.pen ? ' (p)' : ''} ${esc(x.min)}`).join(', ');
  return `<div class="row"><span class="k">Goals</span><span class="v">${[[g.home, side(g.home.id)], [g.away, side(g.away.id)]].filter((x) => x[1]).map((x) => `<b>${esc(x[0].abbr || x[0].name)}</b> ${x[1]}`).join(' · ') || '—'}</span></div>`;
}
function extraHTML(g, H, plan, shown) {
  const rows = [];
  const where = [g.venue, g.city].filter(Boolean).join(' · ');
  if (where) rows.push(`<div class="row"><span class="k">Where</span><span class="v">${esc(where)}</span></div>`);
  rows.push(`<div class="row"><span class="k">Watch</span><span class="v">${esc(plan.detail)}${plan.nets.length > 1 ? ' Also listed: ' + esc(plan.nets.map((n) => n.name).join(', ')) + '.' : ''}</span></div>`);
  rows.push(`<div class="row"><span class="k">Heat</span><span class="v">${H.h} · ${esc(H.why.join(' · ') || 'Just a match')}</span></div>`);
  if (shown && g.status !== 'pre') rows.push(goalsLine(g));
  const links = [];
  if (g.status !== 'pre') for (const l of highlightLinks(g)) links.push(`<a href="${esc(l.href)}" target="_blank" rel="noopener">▶ ${esc(l.label)}</a>`);
  const eye = state.settings.nospoil && !shown && g.status !== 'pre' ? ' 🙈' : '';
  if (isNum(g.id)) links.push(`<a href="${esc(GAMECAST(g.id))}" target="_blank" rel="noopener">ESPN match page${eye}</a>`);
  const th = threadFor(g);
  links.push(`<a href="${esc(th ? th.url : rSearch(`flair:"Match Thread" ${g.home.full || g.home.name} ${g.away.full || g.away.name}`))}" target="_blank" rel="noopener">r/soccer ${th ? 'match thread' : 'thread'}${eye}</a>`);
  rows.push(`<div class="row links"><span class="k">${g.status === 'pre' ? 'Links' : 'Highlights'}</span>${links.join('')}</div>`);
  const tracked = state.players.filter((p) => involves(g, p.teamId));
  if (tracked.length && g.status !== 'pre') {
    if (shown) {
      const lines = state.box[g.id];
      if (!lines) { if (isNum(g.id)) loadBox(g.id); }
      rows.push(...tracked.map((p) => {
        const goals = goalsFor(g, p);
        const ls = lines ? playerLines(p, lines) : [];
        const bits = [];
        if (goals.length) bits.push(`⚽ ${goals.map((x) => x.min).join(', ')}`);
        if (ls.length) bits.push(ls.map((l) => l.text).join(' · '));
        else if (!lines && g.status === 'post') bits.push('loading the stat line…');
        return `<div class="row pl"><span class="k">${esc(p.name.split(' ').slice(-1)[0])}</span><span class="v">${bits.length ? bits.join(' · ') : 'no goals, stats pending'}</span></div>`;
      }));
    } else rows.push(`<div class="row"><span class="k">Players</span><span class="v">${esc(tracked.map((p) => p.name).join(', '))} — reveal the score to see the line</span></div>`);
  }
  return `<div class="extra">${rows.join('')}</div>`;
}
function cornerText(g, o) {
  const bits = [];
  if (g.comp) bits.push(g.comp);
  else if (o.week && g.week) bits.push('MW ' + g.week);
  if (o.showDay || o.week) bits.push(fmtMD.format(new Date(g.ts)) + (o.showDay ? ' · ' + fmtDow.format(new Date(g.ts)) : ''));
  if (o.week && involves(g, CITY.id)) bits.push(g.neutral ? 'Neutral' : g.home.id === CITY.id ? 'Home' : 'Away');
  return bits.join(' · ');
}
function gameCard(g, ctx, o) {
  o = o || {};
  const H = heat(g, ctx), plan = watchPlan(g);
  const shown = isRevealed(g);
  const win = shown ? winnerOf(g) : null;
  const open = expanded.has(g.id);
  const mine = involves(g, CITY.id);
  const why = H.why.filter((w) => !(o.week && mine && w === 'Man City')).slice(0, 2).join(' · ');
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
      <button class="teams" data-open="${esc(g.id)}" aria-expanded="${open}">${sideHTML(g.home, win === 'home')}${sideHTML(g.away, win === 'away')}</button>
      ${scoreCol(g, shown)}
    </div>
    <div class="foot"><span class="why">${esc(why)}</span><span class="acts">${actions(g)}</span></div>
    ${open ? extraHTML(g, H, plan, shown) : ''}
  </article>`;
}
function sectionH(title, count, side, live) {
  return `<div class="section-h"><h2 class="${live ? 'live' : ''}">${esc(title)}${count != null ? `<span class="count">${count}</span>` : ''}</h2>${side ? `<span class="side">${side}</span>` : ''}</div>`;
}
const SORT_DEFAULT = { worth: 'heat', six: 'time', plan: 'time', all: 'time' };
function sortFor(filter) { const s = (state.settings.sortBy || {})[filter]; return s === 'heat' || s === 'time' ? s : (SORT_DEFAULT[filter] || 'time'); }
function sortHTML(filter) {
  const cur = sortFor(filter);
  return `<span class="sort" role="group" aria-label="Sort">${[['heat', 'Heat'], ['time', 'Time']].map(([id, lbl]) => `<button class="${cur === id ? 'on' : ''}" data-sort="${id}" aria-pressed="${cur === id}">${lbl}</button>`).join('')}</span>`;
}

/* ── render: Matchweek ──────────────────────────────────────────────────── */
function matchweekOf(start) {
  const w = state.windows[winKey(start)];
  const counts = {};
  for (const g of (w ? w.games : [])) if (g.week) counts[g.week] = (counts[g.week] || 0) + 1;
  let weeks = Object.keys(counts).map(Number).sort((a, b) => a - b);
  if (!weeks.length) weeks = cityGames().filter((g) => inWin(g.ts, start) && g.week && !g.comp).map((g) => g.week);
  if (!weeks.length) return '';
  const rounds = weeks.filter((w) => (counts[w] || 1) >= 3);          // a lone rescheduled match doesn't make it a double round
  if (rounds.length >= 2) return `Matchweeks ${rounds[0]}–${rounds[rounds.length - 1]}`;
  const mode = weeks.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];
  return `Matchweek ${mode}`;
}
function weekLabel(start) {
  const range = `${fmtMD.format(new Date(start))} – ${fmtMD.format(new Date(winEnd(start) - 864e5))}`;
  const mw = matchweekOf(start);
  const cur = curWin();
  const flag = start === cur ? ' · <em>this week</em>' : start === winShift(cur, 1) ? ' · <em>up next</em>' : '';
  return { title: mw || range, sub: (mw ? range : '') + flag };
}
function weekNavHTML() {
  const lbl = weekLabel(state.view);
  return `<div class="weeknav">
    <button class="arrow" data-wk="prev" aria-label="Previous week">‹</button>
    <button class="wk" data-wk="now" title="Jump to this week"><b>${esc(lbl.title)}</b><span>${lbl.sub}</span></button>
    <button class="arrow" data-wk="next" aria-label="Next week">›</button>
  </div>`;
}
function punditsHTML() {
  const pd = state.pundits;
  const mw = matchweekOf(state.view);
  const fallback = [
    { label: 'BBC · Sutton\'s predictions', href: 'https://www.bbc.com/sport/football/premier-league/scores-fixtures' },
    { label: 'Sky · Merson\'s predictions', href: 'https://www.skysports.com/football/news/11095' },
    { label: '▶ Predictions on YouTube', href: YT(`Premier League predictions ${mw || ''} ${seasonLabel(state.season)}`) },
  ];
  const found = (pd.links || []);
  const links = found.concat(fallback.filter((f) => !found.some((l) => l.label.split(' · ')[0] === f.label.split(' · ')[0])));
  const note = found.length ? '' : (pd.at ? 'Nothing found in the feeds yet — the columns post before the round.' : (state.online === false ? 'Offline.' : 'Looking for this round\'s predictions…'));
  return `<div class="gameday"><div class="gd-h"><b>Pundits’ verdicts</b><span>${esc(mw || 'this round')}</span></div>${note ? `<div class="muted">${esc(note)}</div>` : ''}<div class="linkrow">${links.map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label.length > 64 ? l.label.slice(0, 62) + '…' : l.label)}</a>`).join('')}</div></div>`;
}
function renderWeek() {
  const root = $('view-week');
  const ctx = buildContext();
  const key = winKey(state.view);
  const wk = state.windows[key];
  const filter = state.settings.filter;
  const lbl = weekLabel(state.view);
  let html = weekNavHTML();
  const games = wk ? wk.games : [];
  const heats = new Map(games.map((g) => [g.id, heat(g, ctx).h]));
  const isSix = (g) => BIG_SIX.has(g.home.id) || BIG_SIX.has(g.away.id);
  const counts = { worth: games.filter((g) => heats.get(g.id) >= WORTH_IT).length, six: games.filter(isSix).length, plan: games.filter(planMode).length, all: games.length };
  const chips = [['worth', 'Worth it'], ['six', 'Big six'], ['plan', 'Planned'], ['all', 'Everything']];
  html += `<div class="chips">${chips.map(([id, name]) => `<button class="chip${filter === id ? ' on' : ''}" data-filter="${id}">${name}<span class="n">${counts[id]}</span></button>`).join('')}</div>`;
  if (state.view === curWin()) html += punditsHTML();

  let list;
  if (filter === 'plan') list = games.filter(planMode).sort((a, b) => a.ts - b.ts);
  else if (filter === 'six') list = games.filter(isSix);
  else if (filter === 'worth') list = games.filter((g) => heats.get(g.id) >= WORTH_IT);
  else list = games.slice();

  if (!list.length) {
    let msg;
    if (filter === 'plan') msg = 'Nothing planned this week. Tap <b>Watch</b> or <b>Highlights</b> on any match.';
    else if (!wk && state.online === false) msg = 'You\'re offline and this week isn\'t cached yet. It loads the next time you\'re online.';
    else if (!wk) msg = state.loading ? 'Loading the round…' : `Nothing loaded for <b>${esc(lbl.title)}</b> yet.`;
    else if (wk.empty || !games.length) msg = 'No Premier League this week — international break, or a cup round.';
    else if (filter === 'worth') msg = 'Nothing clears the bar this week. Try <b>Big six</b> or <b>Everything</b>.';
    else msg = 'No matches match.';
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
      if (k !== day) { day = k; html += sectionH(fmtLong.format(new Date(g.ts)), null, g.week ? `MW ${g.week}` : null); }
      html += gameCard(g, ctx, {});
    }
  }
  root.innerHTML = html;
}

/* ── render: Plan ───────────────────────────────────────────────────────── */
function fmtDur(ms) { const m = Math.round(ms / 60e3); return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : `${m}m`; }
function slotHTML(b) {
  const g = b.g, now = Date.now();
  const title = `${g.home.name} v ${g.away.name}`;
  const plan = watchPlan(g);
  const live = g.status === 'in';
  const timeCol = b.tba ? `<b>TBA</b><span>${esc(fmtDow.format(new Date(g.ts)))}</span>` : `<b>${esc(fmtTime.format(new Date(b.start)))}</b><span>– ${esc(fmtTime.format(new Date(b.end)))}</span>`;
  let sub;
  if (b.mode === 'watch') sub = `${netChip(plan)}<span>${esc(plan.detail)}</span>${live ? `<span class="live-tag">${esc(g.detail)}</span>` : ''}`;
  else if (b.mode === 'replay') sub = `<span>Replay · ${fmtDur(b.len)}</span>${netChip(plan)}<span>${plan.kind === 'bundle' ? 'full replay on Peacock' : 'from your recording'}</span>`;
  else {
    const ready = b.tba ? 'after the match' : (b.avail <= now ? 'ready now' : `ready after ~${fmtTime.format(new Date(b.avail))}`);
    sub = `<span>Highlights · ${fmtDur(HL_MS)} · ${esc(ready)}</span>${highlightLinks(g).map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">▶ ${esc(l.label)}</a>`).join('')}`;
  }
  const warn = b.conflicts && b.conflicts.length
    ? `<div class="warn">Overlaps ${esc(b.conflicts.map((c) => `${c.home.name}–${c.away.name}`).join(', '))} · <button data-plan="${esc(g.id)}" data-mode="hl">switch this one to highlights</button></div>` : '';
  const icon = b.mode === 'hl' ? '▶' : involves(g, CITY.id) ? '🔥' : '';
  return `<div class="slot ${b.mode} st-${g.status}${b.done ? ' done' : ''}${b.conflicts && b.conflicts.length ? ' conflict' : ''}" data-id="${esc(g.id)}">
    <div class="time">${timeCol}</div>
    <div class="what"><div class="ttl">${icon ? icon + ' ' : ''}${esc(title)}</div><div class="sub">${sub}</div>${warn}</div>
    <div class="ctl"><button class="${b.done ? 'on' : ''}" data-watched="${esc(g.id)}" aria-label="Mark watched" title="Watched">✓</button><button data-plan="${esc(g.id)}" data-mode="${b.mode === 'replay' ? 'watch' : b.mode}" aria-label="Remove from plan" title="Remove">×</button></div>
  </div>`;
}
function renderPlan() {
  const root = $('view-plan');
  const blocks = planBlocks().filter((b) => inWin(b.start, state.view));
  let html = weekNavHTML();
  if (!blocks.length) { root.innerHTML = html + `<div class="empty">Nothing planned this week. Tap <b>Watch</b> or <b>Highlights</b> on any match — City lands here on its own.</div>`; return; }
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
  html += `<div class="bundle-line">Full matches sit on kickoff. Highlights and replays float to the first free slot after the whistle, about two hours plus upload time.</div>`;
  root.innerHTML = html;
}

/* ── render: City ───────────────────────────────────────────────────────── */
function heroHTML(g) {
  if (!g) return `<div class="hero"><div class="eyebrow">Man City</div><div class="matchup">Season's over</div><div class="when">See you in August.</div></div>`;
  const opp = g.home.id === CITY.id ? g.away : g.home;
  const vs = g.home.id === CITY.id ? 'v' : 'at';
  const plan = watchPlan(g);
  const shown = isRevealed(g);
  const live = g.status === 'in';
  const when = live ? `<b>${esc(g.detail || 'Live')}</b>` : g.tba ? `<b>${esc(fmtLong.format(new Date(g.ts)))}</b> · time TBA` : `<b>${esc(fmtLong.format(new Date(g.ts)))}</b> · ${esc(fmtTime.format(new Date(g.ts)))}${untilText(g.ts) ? ' · ' + esc(untilText(g.ts)) : ''}`;
  let score = '';
  if (g.status !== 'pre') {
    if (shown) score = `<div class="score-line">${esc(g.home.abbr)} ${g.home.score != null ? g.home.score : '–'} · ${esc(g.away.abbr)} ${g.away.score != null ? g.away.score : '–'}<small>${live ? esc(g.detail) : esc(g.detail || 'FT')}</small></div>`;
    else score = `<button class="peek" data-peek="${esc(g.id)}">Score hidden · tap to reveal this match</button>`;
  }
  const row = tableRow(CITY.id);
  const standing = state.settings.nospoil ? `<div class="record">Table position hidden while No-spoil is on.</div>` : (row ? `<div class="record">City are ${ordinal(row.pos)}${row.pts != null ? ` on ${row.pts} pts` : ''}${row.p != null ? ` after ${row.p}` : ''}.</div>` : '');
  const oppPos = !state.settings.nospoil ? posOf(opp.id) : null;
  return `<div class="hero" data-id="${esc(g.id)}">
    <div class="eyebrow">${live ? '<span class="live-tag">Live</span>' : (g.status === 'post' ? 'Last match' : 'Next up')}${g.note ? ' · ' + esc(g.note) : ''}${g.comp ? ' · ' + esc(g.comp) : g.week ? ` · Matchweek ${g.week}` : ''}</div>
    <div class="matchup">Man City <small>${vs}</small> ${oppPos ? ordinal(oppPos) + ' ' : ''}${esc(opp.name)}</div>
    <div class="when">${when}</div>
    ${score}
    <div class="plan">${netChip(plan)}<span class="muted">${esc(plan.detail)}</span></div>
    ${standing}
    <div class="hero-acts">${actions(g)}</div>
  </div>`;
}
function tableHTML() {
  const rows = state.table.rows || [];
  if (state.settings.nospoil) return `<div class="empty">Table hidden while No-spoil is on — it moves with results you haven't watched.</div>`;
  if (!rows.length) return `<div class="empty">${state.online === false ? 'Offline — no table cached.' : 'Loading the table…'}</div>`;
  const top = rows.slice(0, 6);
  const me = rows.find((r) => r.id === CITY.id);
  const show = me && !top.includes(me) ? top.concat([{ gap: true }, me]) : top;
  const tr = (r) => r.gap ? `<tr class="gap"><td colspan="8">…</td></tr>` :
    `<tr class="${r.id === CITY.id ? 'mine' : ''}"><td class="pos">${r.pos}</td><td class="tm"><img src="${esc(r.logo)}" alt="" loading="lazy" />${esc(r.name)}</td><td>${r.p != null ? r.p : ''}</td><td>${r.w != null ? r.w : ''}</td><td>${r.d != null ? r.d : ''}</td><td>${r.l != null ? r.l : ''}</td><td>${r.gd != null ? (r.gd > 0 ? '+' : '') + r.gd : ''}</td><td class="pts">${r.pts != null ? r.pts : ''}</td></tr>`;
  return `<div class="ltable"><table><thead><tr><th>#</th><th class="tm">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${show.map(tr).join('')}</tbody></table></div>`;
}
function newsItemHTML(it) {
  const src = SOURCE[it.src] || { name: it.src };
  const risk = shownNews.has(it.id) ? null : spoilRiskFor(it);
  const isVideo = src.kind === 'youtube';
  const paywall = src.paywall === 'yes' ? '<span class="pw">paywall</span>' : (it.premium ? '<span class="plus">ESPN+</span>' : (src.paywall === 'some' ? '<span class="pw">some paywalled</span>' : ''));
  const meta = `<div class="src">${esc(src.name)}${paywall ? ' · ' + paywall : ''}${it.ts ? ' · ' + esc(relTime(it.ts)) : ''}</div>`;
  const thumb = it.thumb ? (risk && isVideo ? '<span class="thumb hidden" title="Thumbnail hidden — could spoil">🙈</span>' : `<img class="thumb" src="${esc(it.thumb)}" alt="" loading="lazy" />`) : '';
  if (risk && !isVideo) {
    const label = involves(risk, CITY.id) ? `City–${(risk.home.id === CITY.id ? risk.away : risk.home).name}` : `${risk.home.name}–${risk.away.name}`;
    return `<li><button class="item risk" data-news="${esc(it.id)}"><div class="body"><div class="title">${esc(it.title)}</div>${meta}</div><div class="veil">🙈 May spoil <b>${esc(label)}</b> · tap to show</div></button></li>`;
  }
  return `<li><a class="item" href="${esc(it.url)}" target="_blank" rel="noopener">${thumb}<div class="body"><div class="title">${esc(it.title)}</div>${meta}</div></a></li>`;
}
function renderCity() {
  const root = $('view-city');
  const ctx = buildContext();
  const games = cityGames();
  const hero = nextCity() || games[games.length - 1] || null;
  let html = heroHTML(hero);

  html += sectionH('Season', games.length, state.city.live ? '' : 'baked fixtures · kickoffs TBA until ESPN loads');
  html += games.map((g) => gameCard(g, ctx, { compact: true, week: true })).join('');

  html += sectionH('Table', null, state.table.at && !state.settings.nospoil ? `updated ${esc(relTime(state.table.at))}` : null);
  html += tableHTML();

  const news = state.news.items || [];
  const articles = news.filter((i) => (SOURCE[i.src] || {}).kind !== 'youtube');
  const videos = news.filter((i) => (SOURCE[i.src] || {}).kind === 'youtube');
  html += sectionH('City everything', articles.length || null, state.news.at ? `updated ${esc(relTime(state.news.at))} · <button data-news-refresh>refresh</button>` : (state.online === false ? 'offline' : 'loading…'));
  if (articles.length) html += `<ul class="news">${articles.slice(0, 40).map(newsItemHTML).join('')}</ul>`;
  else html += `<div class="empty">${state.online === false ? 'Offline. The source links below work once you\'re back on.' : state.news.at ? 'No stories came through. Feeds ride on a free proxy; the source links below always work.' : 'Pulling the latest…'}</div>`;

  html += sectionH('Highlights', videos.length || null, 'NBC Sports · Man City');
  const last = games.slice().reverse().find((g) => g.status !== 'pre');
  if (last) { const opp = last.home.id === CITY.id ? last.away : last.home; html += `<div class="linkrow">${highlightLinks(last).map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">▶ ${esc(l.label)} · City v ${esc(opp.name)}</a>`).join('')}</div>`; }
  html += `<div class="linkrow"><a href="${esc(YT('NBC Sports Manchester City Premier League highlights ' + seasonLabel(state.season)))}" target="_blank" rel="noopener">▶ NBC Sports · all City</a><a href="${esc(YT('Erling Haaland goals ' + seasonLabel(state.season)))}" target="_blank" rel="noopener">▶ Haaland goals</a></div>`;
  if (videos.length) html += `<ul class="news">${videos.slice(0, 8).map(newsItemHTML).join('')}</ul>`;

  const statusBits = SOURCES.filter((s) => s.kind !== 'link').map((s) => { const st = (state.news.status || {})[s.id]; return st ? (st.ok ? `${s.name} ✓` : `${s.name} ✗`) : null; }).filter(Boolean);
  html += sectionH('Sources', null, statusBits.length ? esc(statusBits.join(' · ')) : null);
  html += `<div class="sources">${SOURCES.map((s) => {
    const st = (state.news.status || {})[s.id];
    const stTxt = s.kind === 'link' ? 'link only' : (st ? (st.ok ? `${st.n} loaded` : 'feed unreachable — open the site') : '');
    return `<div class="source"><div><span class="nm">${esc(s.name)}</span>${s.paywall === 'yes' ? '<span class="pw">paywall</span>' : ''}<div class="st${st ? (st.ok ? ' good' : ' bad') : ''}">${esc(stTxt)}</div></div><a href="${esc(s.home)}" target="_blank" rel="noopener">Open →</a></div>`;
  }).join('')}</div>`;
  root.innerHTML = html;
}

/* ── render: Players ────────────────────────────────────────────────────── */
function teamPool() {
  const m = new Map();
  for (const [id, abbr, name] of PL_TEAMS) m.set(id, { id, abbr, name, logo: LOGO(id) });
  for (const g of allKnownGames()) for (const t of [g.home, g.away]) if (t.id && !m.has(t.id)) m.set(t.id, { id: t.id, abbr: t.abbr, name: t.name, logo: t.logo });
  return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
}
function playerStatHTML(p, g) {
  if (!isRevealed(g)) return `<div class="line muted">Line hidden until you reveal ${esc(g.home.name)}–${esc(g.away.name)}.</div>`;
  const goals = goalsFor(g, p);
  const lines = state.box[g.id];
  if (!lines && isNum(g.id)) loadBox(g.id);
  const ls = lines ? playerLines(p, lines) : [];
  let html = '';
  if (goals.length) html += `<div class="line"><span class="cat">Goals</span>⚽ ${esc(goals.map((x) => x.min + (x.pen ? ' (p)' : '')).join(', '))}</div>`;
  if (ls.length) html += ls.map((l) => `<div class="line"><span class="cat">Line</span>${esc(l.text)}</div>`).join('');
  else if (!lines) html += `<div class="line muted">${g.status === 'in' ? 'Stats fill in at full time.' : 'Loading the stat line…'}</div>`;
  else if (!goals.length) html += `<div class="line muted">No goals, no stat line recorded for ${esc(p.name)} in this one.</div>`;
  return html;
}
function renderPlayers() {
  const root = $('view-players');
  const ctx = buildContext();
  const pool = (state.windows[winKey(state.view)] || { games: [] }).games.concat(cityGames().filter((g) => inWin(g.ts, state.view)));
  let html = '';
  if (!state.players.length) html += `<div class="empty">Nobody tracked yet. Add a player and their team's matches light up here and on the Matchweek slate.</div>`;
  for (const p of state.players) {
    const gs = uniq(pool.filter((x) => involves(x, p.teamId)).map((x) => x.id)).map((id) => pool.find((x) => x.id === id)).sort((a, b) => a.ts - b.ts);
    html += `<div class="player" data-pid="${esc(p.id)}">
      <div class="ph"><img class="logo" src="${esc(LOGO(p.teamId))}" alt="" loading="lazy" /><div class="who"><div class="nm">${esc(p.name)}${p.pos ? ` <span class="path">· ${esc(p.pos)}</span>` : ''}</div><div class="path">${p.from ? esc(p.from) + ' → ' : ''}<b>${esc(p.team)}</b></div></div><button class="rm" data-remove="${esc(p.id)}" aria-label="Stop tracking ${esc(p.name)}">×</button></div>
      <div class="pg"><div class="k">${state.view === curWin() ? 'This week' : esc(weekLabel(state.view).title)}</div>
        ${gs.length ? gs.map((g) => gameCard(g, ctx, { compact: true, showDay: true }) + (g.status !== 'pre' ? playerStatHTML(p, g) : '')).join('') : `<div class="line muted">${esc(p.team)} ${state.windows[winKey(state.view)] ? 'have no league match this week.' : '— slate not loaded yet.'}</div>`}
      </div>
    </div>`;
  }
  html += `<div class="addp"><h3>Track another player</h3>
    <div class="fields">
      <input id="pn" type="text" placeholder="Name (as ESPN lists it)" autocomplete="off" autocapitalize="words" />
      <input id="pp" type="text" placeholder="Pos" autocomplete="off" maxlength="4" />
      <div class="team-in"><input id="pt" type="text" placeholder="Club" autocomplete="off" /><ul class="sugg" id="pt-sugg"></ul></div>
      <div class="picked" id="pt-picked">Pick a club from the list.</div>
      <button class="go" id="padd" disabled>Add</button>
    </div></div>`;
  root.innerHTML = html;
  wireAddPlayer();
}
function wireAddPlayer() {
  const pn = $('pn'), pp = $('pp'), pt = $('pt'), sugg = $('pt-sugg'), picked = $('pt-picked'), go = $('padd');
  if (!pn) return;
  let team = null;
  const pool = teamPool();
  const ready = () => { go.disabled = !(pn.value.trim() && team); };
  pt.addEventListener('input', () => {
    team = null; picked.textContent = 'Pick a club from the list.'; ready();
    const q = pt.value.trim().toLowerCase();
    if (!q) { sugg.innerHTML = ''; return; }
    const hits = pool.filter((t) => t.name.toLowerCase().includes(q) || t.abbr.toLowerCase() === q).slice(0, 8);
    sugg.innerHTML = hits.map((t) => `<li data-tid="${esc(t.id)}"><img src="${esc(t.logo)}" alt="" />${esc(t.name)} <span style="opacity:.6">${esc(t.abbr)}</span></li>`).join('');
  });
  sugg.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-tid]'); if (!li) return;
    team = pool.find((t) => t.id === li.dataset.tid) || null;
    pt.value = team ? team.name : ''; sugg.innerHTML = '';
    picked.innerHTML = team ? `Tracking with <b>${esc(team.name)}</b>.` : 'Pick a club from the list.';
    ready();
  });
  pn.addEventListener('input', ready);
  go.addEventListener('click', () => {
    if (!team || !pn.value.trim()) return;
    state.players.push({ id: 'p-' + Date.now().toString(36), name: pn.value.trim(), pos: pp.value.trim().toUpperCase(), teamId: team.id, team: team.name, teamAbbr: team.abbr, from: '' });
    store.set('players', state.players);
    render();
  });
}

/* ── render: chrome ─────────────────────────────────────────────────────── */
function renderStatus() {
  const el = $('status'), txt = $('statusText');
  const wk = state.windows[winKey(state.view)];
  if (state.loading && !wk) { el.classList.remove('live'); txt.textContent = 'loading the round…'; return; }
  if (state.online) {
    el.classList.add('live');
    txt.innerHTML = `${hasLive(wk) ? 'Live · auto-refreshing' : 'Live'}${wk ? ' · updated ' + esc(relTime(wk.at)) : ''} · <button class="refresh" data-refresh>refresh</button>`;
  } else {
    el.classList.remove('live');
    txt.innerHTML = `${state.online === false ? 'Offline' : 'Connecting'}${wk ? ' · showing ' + esc(relTime(wk.at)) : ' · nothing cached'} · <button class="refresh" data-refresh>${state.online === false ? 'try again' : 'refresh'}</button>`;
  }
}
function render() {
  const tab = state.settings.tab;
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('view-week').hidden = tab !== 'week';
  $('view-plan').hidden = tab !== 'plan';
  $('view-city').hidden = tab !== 'city';
  $('view-players').hidden = tab !== 'players';
  const ns = $('nospoil'); ns.classList.toggle('on', state.settings.nospoil); ns.setAttribute('aria-checked', String(state.settings.nospoil));
  $('sub').textContent = `${seasonLabel(state.season)} · ${weekLabel(state.view).title}`;
  if (tab === 'week') { renderWeek(); loadPundits(false); loadThreads(false); }
  else if (tab === 'plan') renderPlan();
  else if (tab === 'city') { renderCity(); loadNews(false); loadStandings(false); }
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
      window.river.emit({ app: 'matchday', kind: 'match.watched', startedAt: Date.now(), endedAt: Date.now(), durationMs: 0, label: `${g.home.name} v ${g.away.name}` });
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
    state.view = wk.dataset.wk === 'now' ? curWin() : winShift(state.view, wk.dataset.wk === 'next' ? 1 : -1);
    render(); loadWindow(state.view, false);
    return;
  }
  if (t.closest('[data-refresh]')) { loadWindow(state.view, true); refreshCity(true); loadStandings(true); loadNews(true); loadPundits(true); loadThreads(true); return; }
  if (t.closest('[data-news-refresh]')) { loadNews(true); render(); return; }
  const open = t.closest('[data-open]'); if (open) { const id = open.dataset.open; if (expanded.has(id)) expanded.delete(id); else expanded.add(id); render(); return; }
  const peek = t.closest('[data-peek]'); if (peek) { togglePeek(peek.dataset.peek); return; }
  const pl = t.closest('[data-plan]'); if (pl) { setPlan(pl.dataset.plan, pl.dataset.mode); return; }
  const watched = t.closest('[data-watched]'); if (watched) { toggleWatched(watched.dataset.watched); return; }
  const news = t.closest('[data-news]'); if (news) { shownNews.add(news.dataset.news); render(); return; }
  const rm = t.closest('[data-remove]'); if (rm) { state.players = state.players.filter((p) => p.id !== rm.dataset.remove); store.set('players', state.players); render(); return; }
});
$('nospoil').addEventListener('click', () => { setSetting('nospoil', !state.settings.nospoil); render(); });
document.addEventListener('error', (e) => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('broken'); }, true);   // offline crests: vanish, don't glyph

/* ── init ───────────────────────────────────────────────────────────────── */
function init() {
  if (window.sys) sys.theme.init();
  const s = store.get('settings');
  if (s) state.settings = Object.assign(state.settings, s);
  state.revealed = store.get('revealed', {}) || {};
  state.plan = store.get('plan', {}) || {};
  state.watched = store.get('watched', {}) || {};
  const players = store.get('players');
  state.players = Array.isArray(players) ? players : SEED_PLAYERS.slice();
  if (!Array.isArray(players)) store.set('players', state.players);
  $('note').innerHTML = `Spoiler-safe by default: scores, the table and result headlines stay hidden until you flip <b>No-spoil</b> off or reveal a match. ` +
    `Heat: City is always 100; rivals, the big six, the table, tracked players and tight finishes add up for everyone else. ` +
    `<b>Watch</b> or <b>Highlights</b> puts a match on your Plan; City is there automatically. ` +
    `Watch verdicts assume <b>${esc(BUNDLE)}</b> — USA Network matches aren't on it. Fixtures, scores and TV come from ESPN's public JSON; feeds, predictions and r/soccer threads ride a free proxy and fall back to links.`;
  boot();
}
init();
})();
