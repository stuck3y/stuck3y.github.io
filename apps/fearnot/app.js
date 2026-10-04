// fearnot — open it, read today's "do not be afraid."
(() => {
  const VERSES = window.VERSES || [];
  const COUNT = VERSES.length;
  const MS_DAY = 86400000;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  const $ = (id) => document.getElementById(id);
  const el = { date: $('date'), verse: $('verse'), ref: $('ref'), prev: $('prev'), next: $('next'), today: $('today') };
  const reading = el.verse.parentElement;

  // --- Calendar -------------------------------------------------------------
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInYear = (y) => (isLeap(y) ? 366 : 365);
  const dayOfYear = (d) =>
    Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / MS_DAY) + 1;
  const dateKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // Day → verse. The year walks the whole list in Bible order and wraps around,
  // so every verse comes up two or three times a year. Christmas always gets
  // the angel's word to the shepherds.
  function verseFor(date) {
    if (date.getMonth() === 11 && date.getDate() === 25) {
      return VERSES.find((v) => v.ref === 'Luke 2:10') || VERSES[0];
    }
    return VERSES[(dayOfYear(date) - 1) % COUNT];
  }

  // --- Rendering ------------------------------------------------------------
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // "LORD" / "GOD" in all caps is the divine name; set it in small caps like a printed Bible.
  const typeset = (text) => escapeHtml(text).replace(/\b(LORD|GOD)\b/g, (m) => `<span class="lord">${m[0] + m.slice(1).toLowerCase()}</span>`);
  const esvUrl = (ref) => `https://www.esv.org/${ref.replace(/ /g, '+')}/`;

  let offset = 0;           // days away from today while browsing
  let renderedDay = '';     // dateKey of the day currently on screen

  function paint(date) {
    const v = verseFor(date);
    el.date.innerHTML = `${MONTHS[date.getMonth()]} ${date.getDate()} <span class="day">· Day ${dayOfYear(date)} of ${daysInYear(date.getFullYear())}</span>`;
    el.verse.innerHTML = typeset(v.text);
    el.verse.classList.toggle('long', v.text.length > 240);
    el.ref.textContent = v.ref;
    el.ref.href = esvUrl(v.ref);
    el.today.hidden = offset === 0;
    renderedDay = dateKey(new Date());
  }

  function render({ animate = false } = {}) {
    const date = addDays(new Date(), offset);
    if (!animate || !getComputedStyle(reading).transitionDuration) return paint(date);
    reading.classList.add('turning');
    const ms = parseFloat(getComputedStyle(el.verse).transitionDuration) * 1000 || 0;
    setTimeout(() => { paint(date); reading.classList.remove('turning'); }, ms);
  }

  const go = (n) => { offset += n; render({ animate: true }); };
  const home = () => { offset = 0; render({ animate: true }); };

  // --- Wiring ---------------------------------------------------------------
  el.prev.addEventListener('click', () => go(-1));
  el.next.addEventListener('click', () => go(1));
  el.today.addEventListener('click', home);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'Home' || e.key === 't') home();
  });

  let touchX = null;
  document.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  // A new day arrives while the app is open or asleep: snap back to today.
  const dayTurned = () => renderedDay && renderedDay !== dateKey(new Date());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && dayTurned()) home(); });
  (function armMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    setTimeout(() => { if (dayTurned()) home(); armMidnight(); }, midnight - now);
  })();

  // Status bar matches the paper, in either theme.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const syncThemeColor = () => { themeMeta.content = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);
  if (window.sys) {
    sys.theme.init();
    sys.bus.on('theme', () => requestAnimationFrame(syncThemeColor));
  }

  if (!COUNT) { el.verse.textContent = 'No verses loaded.'; return; }
  render();
  syncThemeColor();
})();
