// dump — get it out of your head, then clarify, then bucket.
// The process is the point; the app stays out of the way.

(() => {
  'use strict';

  // ------------------------------------------------------------- settings
  const KEY = 'dump:v1';
  const DONE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // finished things fade out of the record after a month
  const SHOW_ROWS = 5;                           // rows a plate shows before "more"
  const DEFAULT_PLATES = ['Home', 'Work', 'Family', 'Money', 'Health', 'Faith'];

  const KINDS = {
    do:      { label: 'Do',          hint: 'Something I need to act on' },
    someday: { label: 'Someday',     hint: 'Not now. Not never.' },
    note:    { label: 'Just noting', hint: 'Nothing to do. Keep it.' },
    drop:    { label: 'Let it go',   hint: 'It doesn’t need me.' },
  };
  const KIND_NAMES = { do: 'To do', someday: 'Someday', note: 'Thought' };

  // GTD-style triggers, shown one at a time, only when you want one.
  const NUDGES = [
    'What about home?',
    'Anyone waiting on a reply from you?',
    'Something you promised someone?',
    'What are you avoiding?',
    'Money. A bill, a subscription, that one call.',
    'Your body. Sleep, a doctor, the thing that hurts.',
    'Work. The thing you keep re-opening.',
    'The kids. School, shoes, that form.',
    'Church. Someone to check on.',
    'The car, the yard, the house.',
    'A decision you keep putting off.',
    'Something you’re worried about.',
    'Someone you need to forgive.',
    'Something you want to say to someone.',
    'Something you borrowed. Something you lent.',
    'The browser tabs you keep open.',
    'What would make tomorrow easier?',
  ];

  const VERSES = [
    { text: 'Casting all your anxieties on him, because he cares for you.', ref: '1 Peter 5:7' },
    { text: 'Come to me, all who labor and are heavy laden, and I will give you rest.', ref: 'Matthew 11:28' },
    { text: 'Cast your burden on the Lord, and he will sustain you.', ref: 'Psalm 55:22' },
    { text: 'Sufficient for the day is its own trouble.', ref: 'Matthew 6:34' },
    { text: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.', ref: 'Philippians 4:6' },
  ];

  // -------------------------------------------------------------- helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function haptic() {
    if (navigator.vibrate) { try { navigator.vibrate(6); } catch (_) {} }
  }

  function autogrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // Run once, after the element's current animation ends (or a beat later, if it never does).
  function afterAnimation(node, ms, fn) {
    let done = false;
    const finish = () => { if (done) return; done = true; fn(); };
    node.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, ms + 40);
  }

  // ---------------------------------------------------------------- state
  const storage = window.sys ? sys.storage : {
    get: (k, f) => { try { const r = localStorage.getItem('sys:' + k); return r === null ? f : JSON.parse(r); } catch (_) { return f; } },
    set: (k, v) => { try { localStorage.setItem('sys:' + k, JSON.stringify(v)); } catch (_) {} },
  };

  function fresh() {
    return { items: [], plates: DEFAULT_PLATES.map((name) => ({ id: uid(), name })) };
  }

  function load() {
    const saved = storage.get(KEY, null);
    if (!saved || !Array.isArray(saved.items) || !Array.isArray(saved.plates)) return fresh();
    const cutoff = Date.now() - DONE_TTL_MS;
    saved.items = saved.items.filter((i) => !i.doneAt || i.doneAt > cutoff);
    return saved;
  }

  let state = load();
  const save = () => storage.set(KEY, state);

  // Item shape: { id, text, kind: 'raw' | 'do' | 'someday' | 'note', plate: plateId | null, createdAt, doneAt }
  const byId = (id) => state.items.find((i) => i.id === id) || null;
  const plateById = (id) => state.plates.find((p) => p.id === id) || null;
  const plateOf = (item) => (item.plate && plateById(item.plate)) ? item.plate : null;
  const isTask = (item) => item.kind === 'do' || item.kind === 'someday';

  const live = () => state.items.filter((i) => !i.doneAt);
  const raw = () => live().filter((i) => i.kind === 'raw');
  const unbucketed = () => live().filter((i) => isTask(i) && !plateOf(i));

  function removeItem(item) {
    const pos = state.items.indexOf(item);
    if (pos !== -1) state.items.splice(pos, 1);
    return pos;
  }
  function restoreItem(item, pos) {
    state.items.splice(Math.min(pos, state.items.length), 0, item);
  }

  // ---------------------------------------------------------------- toast
  const toastEl = $('#toast');
  const toastText = $('.toast-text', toastEl);
  const toastUndo = $('#toastUndo');
  let toastTimer = null;
  let toastAction = null;

  function toast(message, undo) {
    toastText.textContent = message;
    toastAction = undo || null;
    toastUndo.hidden = !undo;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 5000 : 2200);
  }
  function hideToast() {
    toastEl.classList.remove('show');
    toastAction = null;
  }
  toastUndo.addEventListener('click', () => {
    const fn = toastAction;
    hideToast();
    if (fn) fn();
  });

  // --------------------------------------------------------------- router
  const VIEWS = ['dump', 'clarify', 'bucket', 'map'];
  const viewFromHash = () => { const h = location.hash.slice(1); return VIEWS.includes(h) ? h : null; };
  const home = () => (live().length ? 'map' : 'dump');

  function go(view) {
    if (viewFromHash() === view) render(view);
    else location.hash = view;
  }

  let activeView = null;
  function render(view) {
    activeView = view;
    $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.view === view));
    renderChrome(view);
    ({ dump: renderDump, clarify: clarify.enter, bucket: bucket.enter, map: renderMap })[view]();
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', () => render(viewFromHash() || home()));
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-go]');
    if (link) go(link.dataset.go);
  });

  // --------------------------------------------------------------- chrome
  const stepsEl = $('#steps');
  const topAction = $('#topAction');

  function renderChrome(view) {
    const wizard = view !== 'map';
    stepsEl.hidden = !wizard;
    $$('.step', stepsEl).forEach((b) => {
      if (b.dataset.view === view) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    const counts = { clarify: raw().length, bucket: unbucketed().length };
    $$('.step', stepsEl).forEach((b) => {
      const badge = $('.badge', b);
      if (badge) badge.textContent = counts[b.dataset.view] ? String(counts[b.dataset.view]) : '';
    });

    if (wizard) {
      topAction.hidden = !live().length;
      topAction.textContent = 'Map';
      topAction.classList.remove('primary');
      topAction.dataset.go = 'map';
    } else {
      topAction.hidden = false;
      topAction.textContent = '+ Dump';
      topAction.classList.add('primary');
      topAction.dataset.go = 'dump';
    }
  }
  $$('.step', stepsEl).forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));

  // ------------------------------------------------------------- 1 · dump
  const captureForm = $('#capture');
  const thought = $('#thought');
  const pile = $('#pile');
  const pileCount = $('#pileCount');
  const nudge = $('#nudge');
  const dumpNext = $('#dumpNext');

  let nudgeIndex = Math.floor(Math.random() * NUDGES.length);
  let session = { added: 0, startedAt: 0 };

  function renderDump() {
    pile.replaceChildren(...raw().slice().reverse().map(pebble));
    renderPileCount(false);
    renderDumpFoot();
    showNudge(false);
    if (matchMedia('(hover: hover)').matches) thought.focus();
  }

  function pebble(item) {
    const node = el('span', 'pebble');
    node.dataset.id = item.id;
    node.append(el('span', null, item.text));
    const x = el('button', 'x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Remove');
    x.addEventListener('click', () => letGoPebble(item, node));
    node.append(x);
    return node;
  }

  function letGoPebble(item, node) {
    const pos = removeItem(item);
    save();
    node.classList.add('out');
    afterAnimation(node, 180, () => {
      node.remove();
      renderPileCount(false);
      renderDumpFoot();
    });
    toast('Let go', () => {
      restoreItem(item, pos);
      save();
      if (activeView === 'dump') renderDump();
    });
  }

  function addThought(text) {
    const clean = text.trim();
    if (!clean) return null;
    const item = { id: uid(), text: clean, kind: 'raw', plate: null, createdAt: Date.now(), doneAt: null };
    state.items.push(item);
    if (!session.startedAt) session.startedAt = Date.now();
    session.added++;
    return item;
  }

  function submitThought() {
    const value = thought.value;
    if (!value.trim()) return;
    thought.value = '';
    autogrow(thought);
    captureForm.classList.remove('has-text');
    const item = addThought(value);
    save();
    pile.prepend(pebble(item));
    renderPileCount(true);
    renderDumpFoot();
    haptic();
    thought.focus();
  }

  function renderPileCount(tick) {
    const n = raw().length;
    pileCount.textContent = n ? `${n} out of your head` : '';
    pileCount.classList.remove('tick');
    if (tick) { void pileCount.offsetWidth; pileCount.classList.add('tick'); }
  }

  function renderDumpFoot() {
    const waiting = raw().length;
    const anything = live().length;
    dumpNext.hidden = !anything;
    dumpNext.textContent = waiting ? 'That’s everything for now' : 'See the map';
  }

  function showNudge(advance) {
    if (advance) nudgeIndex = (nudgeIndex + 1) % NUDGES.length;
    $('.q', nudge).textContent = NUDGES[nudgeIndex];
    nudge.classList.remove('flip');
    void nudge.offsetWidth;
    nudge.classList.add('flip');
  }

  function closeSession() {
    if (session.added && window.river && river.emit) {
      river.emit({
        app: 'dump',
        kind: 'dump.emptied',
        startedAt: session.startedAt,
        endedAt: Date.now(),
        durationMs: Date.now() - session.startedAt,
        label: plural(session.added, 'thought'),
      });
    }
    session = { added: 0, startedAt: 0 };
  }

  captureForm.addEventListener('submit', (e) => { e.preventDefault(); submitThought(); });
  thought.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitThought(); }
  });
  thought.addEventListener('input', () => {
    autogrow(thought);
    captureForm.classList.toggle('has-text', !!thought.value.trim());
  });
  // A pasted list becomes many thoughts, one per line. Bullets and numbering are stripped.
  thought.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const unbullet = (line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
    const lines = text.split(/\r?\n/).map(unbullet).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const added = lines.map(addThought).filter(Boolean);
    save();
    added.forEach((item) => pile.prepend(pebble(item)));
    renderPileCount(true);
    renderDumpFoot();
  });
  nudge.addEventListener('click', () => { showNudge(true); thought.focus(); });
  dumpNext.addEventListener('click', () => {
    closeSession();
    go(raw().length ? 'clarify' : 'map');
  });

  // ------------------------------------------------- 2 + 3 · a card stack
  // One item at a time, one decision per card. Skip leaves it for next time;
  // Undo walks back through this pass. `pick` decides what's in the queue,
  // `decide` applies a choice and says which way the card should fly.
  function cardStack(cfg) {
    const view = $(`.view[data-view="${cfg.view}"]`);
    const work = $('.work', view);
    const finish = $('.finish', view);
    const card = $('.card.current', view);
    const cardText = $('.card-text', card);
    const cardMeta = $('.meta', card);
    const ghosts = [$('.g1', view), $('.g2', view)];
    const remaining = $('.remaining', view);
    const undoBtn = $('[data-act="undo"]', view);
    const skipBtn = $('[data-act="skip"]', view);

    let queue = [];
    let index = 0;
    let history = []; // { skip: true } | { id, snapshot, removed, pos }
    let busy = false;
    const tally = {};

    function enter() {
      queue = cfg.pick().map((i) => i.id);
      index = 0;
      history = [];
      busy = false;
      Object.keys(tally).forEach((k) => delete tally[k]);
      show();
    }

    function current() {
      while (index < queue.length && !byId(queue[index])) index++;
      return index < queue.length ? byId(queue[index]) : null;
    }

    function show() {
      const item = current();
      if (!item) return showFinish();
      work.hidden = false;
      finish.hidden = true;
      card.className = 'card current';
      void card.offsetWidth; // restart the rise-in
      cardText.textContent = item.text;
      const meta = cfg.meta ? cfg.meta(item) : '';
      cardMeta.hidden = !meta;
      cardMeta.textContent = meta;
      const left = queue.length - index;
      ghosts[0].classList.toggle('off', left < 2);
      ghosts[1].classList.toggle('off', left < 3);
      remaining.textContent = left === 1 ? 'last one' : `${left} left`;
      undoBtn.disabled = !history.length;
      cfg.renderChoices(item);
    }

    function showFinish() {
      work.hidden = true;
      finish.hidden = false;
      finish.replaceChildren(...cfg.finish(tally, history.length > 0));
      renderChrome(cfg.view);
    }

    function choose(choice) {
      const item = current();
      if (!item || busy) return;
      busy = true;
      const entry = { id: item.id, snapshot: { kind: item.kind, plate: item.plate }, removed: null, pos: -1 };
      const dir = cfg.decide(item, choice);
      if (dir === 'drop') { entry.removed = item; entry.pos = removeItem(item); }
      history.push(entry);
      tally[choice] = (tally[choice] || 0) + 1;
      save();
      haptic();
      index++;
      card.classList.add(dir === 'drop' ? 'fly-down' : 'fly-right');
      afterAnimation(card, 240, () => { busy = false; show(); });
    }

    function skip() {
      if (!current() || busy) return;
      history.push({ skip: true });
      index++;
      show();
    }

    function undo() {
      const entry = history.pop();
      if (!entry || busy) return;
      if (!entry.skip) {
        if (entry.removed) restoreItem(entry.removed, entry.pos);
        else Object.assign(byId(entry.id), entry.snapshot);
        save();
      }
      index = Math.max(0, index - 1);
      show();
    }

    undoBtn.addEventListener('click', undo);
    skipBtn.addEventListener('click', skip);

    return { enter, choose, skip, undo, current };
  }

  function finishPanel({ title, sub, primary, secondary }) {
    const nodes = [el('div', 'check', '✓'), el('h2', null, title)];
    if (sub) nodes.push(el('p', null, sub));
    const foot = el('div', 'foot');
    const main = el('button', 'btn primary', primary.label);
    main.type = 'button';
    main.dataset.go = primary.view;
    foot.append(main);
    if (secondary) {
      const alt = el('button', 'btn ghost', secondary.label);
      alt.type = 'button';
      alt.dataset.go = secondary.view;
      foot.append(alt);
    }
    nodes.push(foot);
    return nodes;
  }

  // 2 · clarify ----------------------------------------------------------
  const clarify = cardStack({
    view: 'clarify',
    pick: raw,
    decide(item, kind) {
      if (kind === 'drop') return 'drop';
      item.kind = kind;
      return 'next';
    },
    renderChoices() {
      const box = $('.view[data-view="clarify"] .choices');
      if (box.childElementCount) return; // the four choices never change
      Object.entries(KINDS).forEach(([kind, k], i) => {
        const b = el('button', 'choice' + (kind === 'drop' ? ' drop' : ''));
        b.type = 'button';
        b.append(el('b', null, k.label), el('span', null, k.hint), el('kbd', null, String(i + 1)));
        b.addEventListener('click', () => clarify.choose(kind));
        box.append(b);
      });
    },
    finish(tally, didWork) {
      if (!live().length) {
        return finishPanel({ title: 'Nothing here yet.', sub: 'Start by getting it out of your head.', primary: { label: 'Dump something', view: 'dump' } });
      }
      if (!didWork) {
        return finishPanel({ title: 'Nothing to clarify.', sub: 'Everything you’ve dumped has a name.', primary: { label: 'See the map', view: 'map' }, secondary: { label: 'Dump more', view: 'dump' } });
      }
      const parts = [];
      if (tally.do) parts.push(plural(tally.do, 'to do', 'to do'));
      if (tally.someday) parts.push(`${tally.someday} someday`);
      if (tally.note) parts.push(plural(tally.note, 'thought'));
      if (tally.drop) parts.push(`${tally.drop} let go`);
      const toBucket = unbucketed().length;
      return finishPanel({
        title: 'Clarified.',
        sub: parts.join(' · '),
        primary: toBucket ? { label: `Give ${toBucket === 1 ? 'it' : 'them'} a plate`, view: 'bucket' } : { label: 'See the map', view: 'map' },
        secondary: toBucket ? { label: 'See the map', view: 'map' } : { label: 'Dump more', view: 'dump' },
      });
    },
  });

  // 3 · bucket -----------------------------------------------------------
  const bucket = cardStack({
    view: 'bucket',
    pick: unbucketed,
    meta: (item) => KIND_NAMES[item.kind] || '',
    decide(item, plateId) {
      item.plate = plateId;
      return 'next';
    },
    renderChoices() {
      const box = $('.view[data-view="bucket"] .choices');
      box.replaceChildren(...state.plates.map((p) => {
        const chip = el('button', 'chip', p.name);
        chip.type = 'button';
        chip.addEventListener('click', () => bucket.choose(p.id));
        return chip;
      }), newPlateChip((plate) => bucket.choose(plate.id)));
    },
    finish(tally, didWork) {
      if (!didWork) {
        const why = raw().length ? 'Clarify first, then these get a plate.' : 'Everything that needs a plate has one.';
        return finishPanel({ title: 'Nothing to bucket.', sub: why, primary: raw().length ? { label: 'Clarify', view: 'clarify' } : { label: 'See the map', view: 'map' }, secondary: { label: 'Dump more', view: 'dump' } });
      }
      const n = Object.values(tally).reduce((a, b) => a + b, 0);
      return finishPanel({ title: 'Everything’s on a plate.', sub: `${plural(n, 'thing')} sorted.`, primary: { label: 'See the map', view: 'map' }, secondary: { label: 'Dump more', view: 'dump' } });
    },
  });

  // A dashed "+ New plate" chip that turns into an input in place.
  function newPlateChip(onAdd) {
    const chip = el('button', 'chip new', '+ New plate');
    chip.type = 'button';
    chip.addEventListener('click', () => {
      const input = el('input', 'chip-input');
      input.placeholder = 'Name it';
      input.setAttribute('aria-label', 'New plate name');
      input.autocomplete = 'off';
      const revert = () => input.replaceWith(chip);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); revert(); }
        if (e.key === 'Enter') {
          e.preventDefault();
          const plate = addPlate(input.value);
          if (plate) onAdd(plate); else revert();
        }
      });
      input.addEventListener('blur', () => { if (!input.value.trim()) revert(); });
      chip.replaceWith(input);
      input.focus();
    });
    return chip;
  }

  function addPlate(name) {
    const clean = name.trim();
    if (!clean) return null;
    const existing = state.plates.find((p) => p.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const plate = { id: uid(), name: clean };
    state.plates.push(plate);
    save();
    return plate;
  }

  // Keyboard: numbers pick, Backspace undoes, S or → skips. Only when not typing.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    if (typing || sheetOpen()) return;
    const stack = activeView === 'clarify' ? clarify : activeView === 'bucket' ? bucket : null;
    if (!stack) return;
    if (e.key === 'Backspace' || e.key === 'z') { e.preventDefault(); stack.undo(); return; }
    if (e.key === 's' || e.key === 'ArrowRight') { e.preventDefault(); stack.skip(); return; }
    const n = parseInt(e.key, 10);
    if (!n) return;
    if (activeView === 'clarify') {
      const kind = Object.keys(KINDS)[n - 1];
      if (kind) stack.choose(kind);
    } else {
      const plate = state.plates[n - 1];
      if (plate) stack.choose(plate.id);
    }
  });

  // ------------------------------------------------------------------ map
  const mapSummary = $('#mapSummary');
  const waitingEl = $('#waiting');
  const platesEl = $('#plates');
  const thoughtsEl = $('#thoughts');
  const mapEmpty = $('#mapEmpty');
  const verseEl = $('#verse');
  const expanded = new Set(); // plates showing every row this session

  function renderMap() {
    const items = live();
    const todo = items.filter((i) => i.kind === 'do');
    const someday = items.filter((i) => i.kind === 'someday');
    const notes = items.filter((i) => i.kind === 'note');

    mapEmpty.hidden = items.length > 0;
    mapSummary.hidden = items.length === 0;

    const platesInPlay = new Set(todo.map(plateOf).filter(Boolean)).size;
    const parts = [];
    if (todo.length) parts.push(plural(todo.length, 'to do', 'to do') + (platesInPlay > 1 ? ` across ${platesInPlay} plates` : ''));
    if (someday.length) parts.push(`${someday.length} someday`);
    if (notes.length) parts.push(plural(notes.length, 'thought'));
    mapSummary.textContent = parts.join(' · ');

    renderWaiting();
    renderPlates(todo, someday);
    renderThoughts(notes);
    renderVerse();
  }

  function renderWaiting() {
    const rows = [];
    const r = raw().length;
    const u = unbucketed().length;
    if (r) rows.push(waitRow(`${plural(r, 'thing')} still ${r === 1 ? 'needs' : 'need'} a name`, 'Clarify', 'clarify'));
    if (u) rows.push(waitRow(`${plural(u, 'thing')} without a plate`, 'Bucket', 'bucket'));
    waitingEl.replaceChildren(...rows);
  }

  function waitRow(text, label, view) {
    const row = el('div', 'wait');
    row.append(el('b', null, text));
    const b = el('button', 'btn small', label);
    b.type = 'button';
    b.dataset.go = view;
    row.append(b);
    return row;
  }

  function renderPlates(todo, someday) {
    const groups = state.plates
      .map((p) => ({ id: p.id, name: p.name, todo: todo.filter((i) => plateOf(i) === p.id), someday: someday.filter((i) => plateOf(i) === p.id) }))
      .filter((g) => g.todo.length || g.someday.length);
    const loose = { id: 'none', name: 'No plate yet', todo: todo.filter((i) => !plateOf(i)), someday: someday.filter((i) => !plateOf(i)) };
    if (loose.todo.length || loose.someday.length) groups.push(loose);
    platesEl.replaceChildren(...groups.map(plateCard));
  }

  function plateCard(group) {
    const card = el('section', 'plate');
    const head = el('h3', 'plate-head');
    head.append(el('span', null, group.name), el('span', 'n', String(group.todo.length + group.someday.length)));
    card.append(head);

    const rows = el('div', 'rows');
    const open = expanded.has(group.id);
    const limit = open ? Infinity : SHOW_ROWS;
    const shownTodo = group.todo.slice(0, limit);
    shownTodo.forEach((item) => rows.append(todoRow(item)));

    const somedayRoom = Math.max(0, limit - shownTodo.length);
    const shownSomeday = group.someday.slice(0, somedayRoom);
    if (shownSomeday.length) {
      rows.append(el('div', 'someday-label', 'Someday'));
      shownSomeday.forEach((item) => rows.append(somedayRow(item)));
    }

    const hidden = (group.todo.length - shownTodo.length) + (group.someday.length - shownSomeday.length);
    if (hidden > 0) {
      const more = el('button', 'more', `${hidden} more`);
      more.type = 'button';
      more.addEventListener('click', () => { expanded.add(group.id); renderMap(); });
      rows.append(more);
    }
    card.append(rows);
    return card;
  }

  function todoRow(item) {
    const row = el('div', 'row');
    const tick = el('button', 'tick');
    tick.type = 'button';
    tick.setAttribute('aria-label', 'Done');
    tick.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5l2.6 2.6L10 3.5"/></svg>';
    tick.addEventListener('click', () => complete(item, row));
    const text = el('button', 'text', item.text);
    text.type = 'button';
    text.addEventListener('click', () => openItem(item.id));
    row.append(tick, text);
    return row;
  }

  function somedayRow(item) {
    const row = el('div', 'row someday');
    const text = el('button', 'text', item.text);
    text.type = 'button';
    text.addEventListener('click', () => openItem(item.id));
    row.append(el('span', 'dot'), text);
    return row;
  }

  function complete(item, row) {
    if (row.classList.contains('done')) return;
    row.classList.add('done');
    haptic();
    setTimeout(() => {
      row.style.height = row.offsetHeight + 'px';
      void row.offsetHeight;
      row.classList.add('out');
      setTimeout(() => {
        item.doneAt = Date.now();
        save();
        renderMap();
        toast('Done', () => { item.doneAt = null; save(); renderMap(); });
      }, 280);
    }, 420);
  }

  function renderThoughts(notes) {
    if (!notes.length) { thoughtsEl.replaceChildren(); return; }
    const head = el('h3');
    head.append(el('span', null, 'Thoughts'), el('span', 'n', String(notes.length)));
    const rows = notes.map((item) => {
      const b = el('button', 'thought', item.text);
      b.type = 'button';
      b.addEventListener('click', () => openItem(item.id));
      return b;
    });
    thoughtsEl.replaceChildren(head, ...rows);
  }

  function renderVerse() {
    const day = Math.floor(Date.now() / 86400000);
    const v = VERSES[day % VERSES.length];
    verseEl.replaceChildren(document.createTextNode(v.text), el('span', 'ref', v.ref));
  }

  // --------------------------------------------------------------- sheets
  const backdrop = $('#backdrop');
  const itemSheet = $('#itemSheet');
  const sheetText = $('#sheetText');
  const sheetKind = $('#sheetKind');
  const sheetPlates = $('#sheetPlates');
  const sheetDone = $('#sheetDone');
  const platesSheet = $('#platesSheet');
  const plateList = $('#plateList');
  const plateAdd = $('#plateAdd');
  const plateName = $('#plateName');
  let editing = null; // item id open in the sheet

  const sheetOpen = () => itemSheet.classList.contains('open') || platesSheet.classList.contains('open');

  function openSheet(sheet) {
    backdrop.classList.add('open');
    sheet.classList.add('open');
  }
  function closeSheets() {
    if (editing) { editing = null; save(); if (activeView === 'map') renderMap(); }
    backdrop.classList.remove('open');
    itemSheet.classList.remove('open');
    platesSheet.classList.remove('open');
  }
  backdrop.addEventListener('click', closeSheets);
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen()) closeSheets(); });

  // Edit one thing. Every change applies as you make it; closing just closes.
  function openItem(id) {
    const item = byId(id);
    if (!item) return;
    editing = id;
    sheetText.value = item.text;
    renderSheetKind(item);
    renderSheetPlates(item);
    sheetDone.hidden = item.kind !== 'do';
    openSheet(itemSheet);
    setTimeout(() => autogrow(sheetText), 0);
  }

  function renderSheetKind(item) {
    sheetKind.replaceChildren(...Object.entries(KIND_NAMES).map(([kind, label]) => {
      const b = el('button', 'seg-btn' + (item.kind === kind ? ' on' : ''), label);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(item.kind === kind));
      b.addEventListener('click', () => {
        item.kind = kind;
        save();
        renderSheetKind(item);
        renderSheetPlates(item);
        sheetDone.hidden = kind !== 'do';
      });
      return b;
    }));
  }

  function renderSheetPlates(item) {
    sheetPlates.hidden = !isTask(item);
    if (!isTask(item)) return;
    sheetPlates.replaceChildren(...state.plates.map((p) => {
      const chip = el('button', 'chip' + (plateOf(item) === p.id ? ' on' : ''), p.name);
      chip.type = 'button';
      chip.addEventListener('click', () => { item.plate = p.id; save(); renderSheetPlates(item); });
      return chip;
    }), newPlateChip((plate) => { item.plate = plate.id; save(); renderSheetPlates(item); }));
  }

  sheetText.addEventListener('input', () => {
    autogrow(sheetText);
    const item = byId(editing);
    if (item && sheetText.value.trim()) { item.text = sheetText.value.trim(); save(); }
  });
  $('#sheetDrop').addEventListener('click', () => {
    const item = byId(editing);
    if (!item) return;
    const pos = removeItem(item);
    editing = null;
    save();
    closeSheets();
    renderMap();
    toast('Let go', () => { restoreItem(item, pos); save(); renderMap(); });
  });
  sheetDone.addEventListener('click', () => {
    const item = byId(editing);
    if (!item) return;
    item.doneAt = Date.now();
    editing = null;
    save();
    closeSheets();
    renderMap();
    haptic();
    toast('Done', () => { item.doneAt = null; save(); renderMap(); });
  });

  // Manage the plates themselves.
  function openPlates() {
    renderPlateList();
    openSheet(platesSheet);
  }

  function renderPlateList() {
    plateList.replaceChildren(...state.plates.map((p) => {
      const row = el('div', 'plate-row');
      const count = live().filter((i) => isTask(i) && plateOf(i) === p.id).length;
      row.append(el('span', null, p.name), el('span', 'n', count ? String(count) : ''));
      const x = el('button', 'x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', `Remove ${p.name}`);
      x.addEventListener('click', () => removePlate(p));
      row.append(x);
      return row;
    }));
  }

  function removePlate(plate) {
    const pos = state.plates.indexOf(plate);
    const orphans = live().filter((i) => i.plate === plate.id);
    state.plates.splice(pos, 1);
    orphans.forEach((i) => { i.plate = null; });
    save();
    renderPlateList();
    renderMap();
    toast(`Removed ${plate.name}`, () => {
      state.plates.splice(Math.min(pos, state.plates.length), 0, plate);
      orphans.forEach((i) => { i.plate = plate.id; });
      save();
      renderPlateList();
      renderMap();
    });
  }

  plateAdd.addEventListener('submit', (e) => {
    e.preventDefault();
    if (addPlate(plateName.value)) { plateName.value = ''; renderPlateList(); renderMap(); }
  });
  $('#editPlates').addEventListener('click', openPlates);

  // ---------------------------------------------------------------- theme
  function syncThemeColor() {
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
  }

  // ----------------------------------------------------------------- boot
  if (window.sys) {
    sys.theme.init();
    sys.bus.on('theme', () => setTimeout(syncThemeColor, 0));
  }
  syncThemeColor();
  window.addEventListener('pagehide', closeSession);
  render(viewFromHash() || home());
})();
