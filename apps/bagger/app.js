// bagger — bag groceries, keep up with the belt.
//
// One input: tap a bag. The item nearest the end of the belt goes in. A bag
// takes the category of its first item and won't take anything else; a bag
// that's full, or has something fragile on top, is done — tap it to hand it
// off. Wrong bag or an item on the floor is a strike; three and you're
// clocked out. Score is customers served. The belt speeds up with each one.

(function () {
  'use strict';

  // --- Catalog -------------------------------------------------------------

  var CATS = {
    cold: { label: 'Cold' },
    dry:  { label: 'Dry' },
    home: { label: 'Household' },
  };

  var ITEMS = [
    // Cold: dairy, meat, frozen.
    { e: '🥛', cat: 'cold' }, { e: '🧀', cat: 'cold' }, { e: '🧈', cat: 'cold' }, { e: '🍦', cat: 'cold' },
    { e: '🥩', cat: 'cold' }, { e: '🍗', cat: 'cold' }, { e: '🥓', cat: 'cold' }, { e: '🐟', cat: 'cold' },
    { e: '🥚', cat: 'cold', fragile: true },
    // Dry: pantry and produce.
    { e: '🥫', cat: 'dry' }, { e: '🍝', cat: 'dry' }, { e: '🍚', cat: 'dry' }, { e: '🥣', cat: 'dry' },
    { e: '🍪', cat: 'dry' }, { e: '🫙', cat: 'dry' }, { e: '🍯', cat: 'dry' }, { e: '🍫', cat: 'dry' },
    { e: '🍎', cat: 'dry' }, { e: '🥑', cat: 'dry' }, { e: '🍅', cat: 'dry' }, { e: '🥕', cat: 'dry' },
    { e: '🍞', cat: 'dry', fragile: true }, { e: '🥐', cat: 'dry', fragile: true },
    { e: '🍌', cat: 'dry', fragile: true }, { e: '🍿', cat: 'dry', fragile: true },
    // Household: never with the food.
    { e: '🧴', cat: 'home' }, { e: '🧼', cat: 'home' }, { e: '🧽', cat: 'home' }, { e: '🫧', cat: 'home' },
    { e: '🧻', cat: 'home' }, { e: '🪥', cat: 'home' }, { e: '🕯️', cat: 'home' },
    { e: '💡', cat: 'home', fragile: true },
  ];

  // --- Tuning --------------------------------------------------------------

  var BAG_COUNT = 3;
  var BAG_CAP = 4;          // items per bag; the 4th, or anything fragile, finishes it
  var MAX_STRIKES = 3;

  // Belt positions run 0 (left edge) to 1 (the end of the belt).
  var SPAWN_P = -0.1;       // items appear just off the left edge
  var REACH_P = 0.42;       // from here on, the front item is in your hand
  var DROP_P = 1.06;        // past the end: it's on the floor
  var GAP_P = 0.21;         // spacing between items, in belt widths

  // Seconds for an item to ride the whole belt. 5.5 for the first customer,
  // 9% quicker with each one served, never faster than 2.0.
  function travelSeconds(customer) {
    return Math.max(2.0, 5.5 * Math.pow(0.91, customer - 1));
  }
  function itemsFor(customer) {
    return Math.min(10, 4 + customer);
  }

  // Rules arrive one customer at a time: cold and dry first, then fragile,
  // then household. Nothing to read — you learn it from the belt.
  function buildOrder(customer) {
    var cats = customer >= 3 ? ['cold', 'dry', 'home'] : ['cold', 'dry'];
    var weights = customer >= 3 ? [0.4, 0.42, 0.18] : [0.5, 0.5];
    var fragileChance = customer >= 2 ? 0.2 : 0;
    var order = [];
    for (var i = 0, n = itemsFor(customer); i < n; i++) {
      var cat = weightedPick(cats, weights);
      var fragile = Math.random() < fragileChance;
      var pool = ITEMS.filter(function (it) { return it.cat === cat && Boolean(it.fragile) === fragile; });
      order.push(Object.assign({ customer: customer }, pick(pool)));
    }
    order.push({ divider: true, customer: customer });
    return order;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function weightedPick(values, weights) {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < values.length; i++) {
      acc += weights[i];
      if (r < acc) return values[i];
    }
    return values[values.length - 1];
  }

  // --- State ---------------------------------------------------------------

  var state = {
    playing: false,
    paused: false,
    customer: 1,      // the customer whose items are at the front of the belt
    built: 0,         // the last customer whose items have been queued
    served: 0,
    strikes: 0,
    order: [],        // queued for the belt: items, and a divider between customers
    belt: [],         // items on the belt; belt[0] is nearest the end
    dividers: [],
    tail: null,       // the last thing spawned — spacing is measured from it
    bags: [],
    frontEl: null,
    beltW: 360,
    itemW: 56,
    beltOffset: 0,
    lastT: 0,
    raf: 0,
  };

  function newBag() { return { cat: null, items: [], done: false }; }

  // --- DOM -----------------------------------------------------------------

  function $(sel) { return document.querySelector(sel); }
  var dom = {
    home: $('#home'), play: $('#play'),
    homeBest: $('#home-best'), homeBestN: $('#home-best-n'),
    start: $('#btn-start'), pause: $('#btn-pause'),
    served: $('#hud-served'), strikes: $('#hud-strikes'), caption: $('#caption'),
    belt: $('#belt'), beltItems: $('#belt-items'), bags: $('#bags'), toast: $('#toast'),
    pauseOverlay: $('#pause-overlay'), resume: $('#btn-resume'), quit: $('#btn-quit'),
    overOverlay: $('#over-overlay'), overN: $('#over-n'), overSub: $('#over-sub'),
    again: $('#btn-again'), overHome: $('#btn-over-home'),
  };
  var bagEls = [];

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ms(n) { return reduceMotion ? 0 : n; }

  var BEST_KEY = 'bagger.best';
  var store = {
    best: function () {
      if (window.sys) return Number(sys.storage.get(BEST_KEY, 0)) || 0;
      try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (_) { return 0; }
    },
    setBest: function (n) {
      if (window.sys) { sys.storage.set(BEST_KEY, n); return; }
      try { localStorage.setItem(BEST_KEY, String(n)); } catch (_) {}
    },
  };

  // --- Run lifecycle -------------------------------------------------------

  function startRun() {
    cancelAnimationFrame(state.raf);
    state.playing = true;
    state.paused = false;
    state.customer = 1;
    state.built = 0;
    state.served = 0;
    state.strikes = 0;
    state.order = [];
    state.belt = [];
    state.dividers = [];
    state.tail = null;
    state.frontEl = null;
    state.beltOffset = 0;
    state.bags = [];
    for (var i = 0; i < BAG_COUNT; i++) state.bags.push(newBag());

    dom.beltItems.textContent = '';
    dom.toast.classList.remove('show');
    renderServed(false);
    renderStrikes();
    renderCaption();
    state.bags.forEach(function (_, i) { renderBag(i); });

    showScreen('play');
    dom.overOverlay.hidden = true;
    dom.pauseOverlay.hidden = true;
    measure();

    if (window.sys) sys.bus.emit('session.start', { app: 'bagger', kind: 'game.run', label: null });

    state.lastT = performance.now();
    state.raf = requestAnimationFrame(tick);
  }

  // how: 'over' (three strikes) or 'quit' (from the pause card)
  function endRun(how) {
    state.playing = false;
    state.paused = false;
    cancelAnimationFrame(state.raf);

    var best = store.best();
    var isBest = state.served > best;
    if (isBest) store.setBest(state.served);

    if (window.sys) sys.bus.emit('session.end', { app: 'bagger', kind: 'game.run', label: null });

    if (how === 'quit') { showHome(); return; }
    setTimeout(function () { showOver(isBest, Math.max(best, state.served)); }, 650);
  }

  function pause() {
    if (!state.playing || state.paused) return;
    state.paused = true;
    cancelAnimationFrame(state.raf);
    dom.pauseOverlay.hidden = false;
    dom.resume.focus();
  }

  function resume() {
    if (!state.playing || !state.paused) return;
    state.paused = false;
    dom.pauseOverlay.hidden = true;
    state.lastT = performance.now();
    state.raf = requestAnimationFrame(tick);
  }

  function showScreen(id) {
    dom.home.classList.toggle('is-active', id === 'home');
    dom.play.classList.toggle('is-active', id === 'play');
  }

  function showHome() {
    dom.pauseOverlay.hidden = true;
    dom.overOverlay.hidden = true;
    var best = store.best();
    dom.homeBest.hidden = best <= 0;
    dom.homeBestN.textContent = String(best);
    showScreen('home');
  }

  function showOver(isBest, best) {
    dom.overN.textContent = String(state.served);
    dom.overSub.textContent = isBest && state.served > 0 ? 'New best.' : (best > 0 ? 'Best ' + best : '');
    dom.overOverlay.hidden = false;
    dom.again.focus();
  }

  // --- The loop ------------------------------------------------------------

  function tick(now) {
    var dt = Math.min(0.05, (now - state.lastT) / 1000);
    state.lastT = now;

    var step = dt / travelSeconds(state.customer);
    state.belt.forEach(function (it) { it.p += step; });
    state.dividers.forEach(function (d) { d.p += step; });
    state.beltOffset = (state.beltOffset + step * state.beltW) % 48;

    // Keep the belt fed. The next customer's order queues up as soon as the
    // last one's is all on the belt — like a real lane, it never goes idle.
    if (!state.order.length) { state.order = buildOrder(++state.built); renderCaption(); }
    var gap = state.tail && state.tail.divider ? GAP_P * 0.7 : GAP_P;
    if (!state.tail || state.tail.p - SPAWN_P >= gap) spawn(state.order.shift());

    while (state.belt.length && state.belt[0].p >= DROP_P) drop(state.belt.shift());
    if (!state.playing) return;   // that drop may have been the third strike

    while (state.dividers.length && state.dividers[0].p >= DROP_P) {
      state.dividers.shift().el.remove();
    }

    renderBelt();
    state.raf = requestAnimationFrame(tick);
  }

  function spawn(def) {
    var el = document.createElement('div');
    el.className = def.divider ? 'divider' : 'item';
    if (!def.divider) el.textContent = def.e;
    dom.beltItems.appendChild(el);

    var thing = Object.assign({}, def, { p: SPAWN_P, el: el });
    (def.divider ? state.dividers : state.belt).push(thing);
    state.tail = thing;
  }

  function measure() {
    state.beltW = dom.belt.clientWidth || 360;
    state.itemW = Math.round(Math.min(60, Math.max(44, state.beltW * 0.15)));
    dom.belt.style.setProperty('--item', state.itemW + 'px');
    dom.belt.style.setProperty('--reach', (REACH_P * 100) + '%');
  }

  // --- Actions -------------------------------------------------------------

  function tapBag(i) {
    if (!state.playing || state.paused) return;
    var bag = state.bags[i];
    if (bag.done) { handOff(i); return; }

    var front = state.belt[0];
    if (!front || front.p < REACH_P) return;   // nothing in reach yet

    if (bag.cat && bag.cat !== front.cat) {
      strike(wrongBagMessage(front.cat, bag.cat), i);
      return;
    }

    state.belt.shift();
    if (state.frontEl === front.el) state.frontEl = null;
    var from = front.el.getBoundingClientRect();
    front.el.remove();

    bag.items.push(front);
    bag.cat = front.cat;
    bag.done = Boolean(front.fragile) || bag.items.length >= BAG_CAP;

    if (isLastOfCustomer(front)) {
      // The item that finishes a customer goes straight to the cart with the bags.
      flyAway(front.e, from);
      serveCustomer();
      return;
    }

    renderBag(i, true);
    var target = bagEls[i].querySelector('.landing');
    flyTo(front.e, from, target.getBoundingClientRect(), function () {
      target.classList.remove('landing');
    });
    renderCaption();
  }

  function handOff(i) {
    var bag = state.bags[i];
    var el = bagEls[i];
    var body = el.querySelector('.bag-body');
    var perfect = bag.items.length >= BAG_CAP;

    liftAway(body);
    if (perfect) floatLabel(el, 'Perfect');

    state.bags[i] = newBag();
    renderBag(i);
    el.classList.remove('is-fresh');
    void el.offsetWidth;
    el.classList.add('is-fresh');
  }

  function drop(item) {
    if (state.frontEl === item.el) state.frontEl = null;
    var from = item.el.getBoundingClientRect();
    item.el.remove();
    fall(item.e, from);
    strike('That one hit the floor.', null);
    if (!state.playing) return;
    if (isLastOfCustomer(item)) serveCustomer(); else renderCaption();
  }

  function isLastOfCustomer(item) {
    var c = item.customer;
    var onBelt = state.belt.some(function (it) { return it.customer === c; });
    var queued = state.order.some(function (it) { return !it.divider && it.customer === c; });
    return !onBelt && !queued;
  }

  function serveCustomer() {
    state.bags.forEach(function (bag, i) { if (bag.items.length) handOff(i); });
    state.served += 1;
    state.customer += 1;
    renderServed(true);
    renderCaption();
  }

  function strike(message, bagIndex) {
    state.strikes += 1;
    renderStrikes();
    toast(message);
    dom.play.classList.remove('flash');
    void dom.play.offsetWidth;
    dom.play.classList.add('flash');
    if (bagIndex !== null) {
      var el = bagEls[bagIndex];
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    }
    if (state.strikes >= MAX_STRIKES) endRun('over');
  }

  function wrongBagMessage(itemCat, bagCat) {
    if (itemCat === 'home' || bagCat === 'home') return 'Household stays apart.';
    return 'Cold with cold.';
  }

  // --- Rendering -----------------------------------------------------------

  function renderBelt() {
    var w = state.beltW, half = state.itemW / 2;
    dom.belt.style.backgroundPositionX = state.beltOffset + 'px';
    state.belt.forEach(function (it) {
      it.el.style.transform = 'translateX(' + (it.p * w - half) + 'px)';
    });
    state.dividers.forEach(function (d) {
      d.el.style.transform = 'translateX(' + (d.p * w - 4) + 'px)';
    });

    var front = state.belt[0];
    var frontEl = front && front.p >= REACH_P ? front.el : null;
    if (frontEl !== state.frontEl) {
      if (state.frontEl) state.frontEl.classList.remove('is-front');
      if (frontEl) frontEl.classList.add('is-front');
      state.frontEl = frontEl;
    }
  }

  // Regular items fill the bag from the bottom row up; a fragile one rides
  // the rim. That's the rule, drawn.
  var SLOTS = ['2 / 1', '2 / 2', '1 / 1', '1 / 2'];

  function renderBag(i, landing) {
    var bag = state.bags[i], el = bagEls[i];
    var grid = el.querySelector('.bag-body');
    var lid = el.querySelector('.bag-lid');
    var label = el.querySelector('.bag-label');

    if (bag.cat) el.dataset.cat = bag.cat; else delete el.dataset.cat;
    el.classList.toggle('is-empty', bag.items.length === 0);
    el.classList.toggle('is-done', bag.done);
    label.textContent = bag.done ? 'Hand off' : (bag.cat ? CATS[bag.cat].label : 'Empty');

    Array.prototype.slice.call(grid.querySelectorAll('.bag-item')).forEach(function (n) { n.remove(); });
    lid.textContent = '';
    lid.classList.remove('landing');

    var slot = 0;
    bag.items.forEach(function (it) {
      if (it.fragile) { lid.textContent = it.e; return; }
      var s = document.createElement('span');
      s.className = 'bag-item';
      s.textContent = it.e;
      s.style.gridArea = SLOTS[slot++];
      grid.appendChild(s);
    });

    if (landing) {
      var newest = bag.items[bag.items.length - 1];
      var target = newest.fragile ? lid : grid.lastElementChild;
      target.classList.add('landing');
    }
  }

  function renderServed(bump) {
    dom.served.textContent = String(state.served);
    if (!bump) return;
    dom.served.classList.remove('bump');
    void dom.served.offsetWidth;
    dom.served.classList.add('bump');
  }

  function renderStrikes() {
    Array.prototype.forEach.call(dom.strikes.children, function (dot, k) {
      dot.classList.toggle('hit', k < state.strikes);
    });
  }

  function renderCaption() {
    var c = state.customer;
    var left = state.belt.filter(function (it) { return it.customer === c; }).length +
               state.order.filter(function (it) { return !it.divider && it.customer === c; }).length;
    dom.caption.textContent = 'Customer ' + c + (left ? ' · ' + left + ' left' : '');
  }

  var toastTimer = 0;
  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { dom.toast.classList.remove('show'); }, 1400);
  }

  function floatLabel(bagEl, text) {
    var f = document.createElement('span');
    f.className = 'float';
    f.textContent = text;
    bagEl.appendChild(f);
    setTimeout(function () { f.remove(); }, 1000);
  }

  // --- Flight --------------------------------------------------------------
  // Fixed-position clones carry the motion, so the real DOM can update
  // immediately and the game never waits on an animation.

  function flyTo(emoji, from, to, onLand) {
    var dur = ms(320);
    if (!dur) { onLand(); return; }
    var c = makeFlyer(emoji, from);
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    var scale = Math.max(0.4, to.height / from.height);
    var anim = c.animate(
      [{ transform: 'translate(0, 0) scale(1)' }, { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')' }],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' }
    );
    anim.onfinish = function () { c.remove(); onLand(); };
  }

  function flyAway(emoji, from) {
    var dur = ms(420);
    if (!dur) return;
    var c = makeFlyer(emoji, from);
    var anim = c.animate(
      [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-90px) scale(0.7)', opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' }
    );
    anim.onfinish = function () { c.remove(); };
  }

  function fall(emoji, from) {
    var dur = ms(480);
    if (!dur) return;
    var c = makeFlyer(emoji, from);
    var anim = c.animate(
      [{ transform: 'translate(0, 0) rotate(0deg)', opacity: 1 }, { transform: 'translate(28px, 120px) rotate(40deg)', opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    );
    anim.onfinish = function () { c.remove(); };
  }

  function liftAway(body) {
    var dur = ms(420);
    if (!dur) return;
    var from = body.getBoundingClientRect();
    var cs = getComputedStyle(body);
    var c = body.cloneNode(true);
    c.className = 'bag-body fly-bag';
    c.style.left = from.left + 'px';
    c.style.top = from.top + 'px';
    c.style.width = from.width + 'px';
    c.style.height = from.height + 'px';
    c.style.borderColor = cs.borderColor;
    c.style.transform = 'none';
    Array.prototype.forEach.call(c.querySelectorAll('.landing'), function (n) { n.classList.remove('landing'); });
    document.body.appendChild(c);
    var anim = c.animate(
      [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-140px) scale(0.92)', opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' }
    );
    anim.onfinish = function () { c.remove(); };
  }

  function makeFlyer(emoji, from) {
    var c = document.createElement('div');
    c.className = 'fly';
    c.textContent = emoji;
    c.style.left = from.left + 'px';
    c.style.top = from.top + 'px';
    c.style.width = from.width + 'px';
    c.style.height = from.height + 'px';
    c.style.fontSize = Math.round(from.height * 0.72) + 'px';
    document.body.appendChild(c);
    return c;
  }

  // --- Setup ---------------------------------------------------------------

  function buildBags() {
    dom.bags.textContent = '';
    bagEls = [];
    for (var i = 0; i < BAG_COUNT; i++) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'bag is-empty';
      el.setAttribute('aria-label', 'Bag ' + (i + 1));
      el.innerHTML = '<div class="bag-body"><div class="bag-lid"></div></div><span class="bag-label">Empty</span>';
      bindBag(el, i);
      dom.bags.appendChild(el);
      bagEls.push(el);
    }
  }

  function bindBag(el, i) {
    // pointerdown, not click: the tap should land the moment the thumb does.
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      tapBag(i);
    });
    // Keyboard activation still arrives as a click with no pointer behind it.
    el.addEventListener('click', function (e) { if (e.detail === 0) tapBag(i); });
  }

  function bind() {
    dom.start.addEventListener('click', startRun);
    dom.again.addEventListener('click', startRun);
    dom.overHome.addEventListener('click', showHome);
    dom.pause.addEventListener('click', pause);
    dom.resume.addEventListener('click', resume);
    dom.quit.addEventListener('click', function () { endRun('quit'); });

    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    window.addEventListener('pagehide', pause);
    window.addEventListener('resize', function () { if (state.playing) measure(); });

    // Desktop niceties: 1/2/3 are the bags, Space/P/Esc is the pause. A
    // focused button keeps its own Space and Enter.
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
      if (state.playing && !state.paused && /^[123]$/.test(e.key)) {
        e.preventDefault();
        tapBag(Number(e.key) - 1);
      } else if (state.playing && (e.key === 'p' || e.key === 'Escape' || (e.key === ' ' && !onButton))) {
        e.preventDefault();
        if (state.paused) resume(); else pause();
      }
    });
  }

  function init() {
    if (window.sys) sys.theme.init();
    buildBags();
    bind();
    showHome();
  }

  init();
})();
