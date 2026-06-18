// sys.js — the system SDK for the apps suite.
//
// One file, zero dependencies, framework-agnostic. Every app on the origin
// shares the same file system, message bus, and theme through here. Include
// it with:
//
//   <script src="../lib/sys.js" defer></script>
//
// and reach for `window.sys`:
//
//   sys.launch('ketchapp')                       // go to an app
//   sys.bus.on('theme', (t) => ...)              // listen across apps
//   sys.bus.emit('focus.start', { app: 'big' })  // tell every open app
//   sys.storage.set('draft', { text: 'hi' })     // shared, namespaced
//   sys.theme.init()                             // apply + follow theme live
//
// Same origin means all of this is shared for free — no backend, no iframes.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  // --- Registry ------------------------------------------------------------
  // The catalog the launcher and ⌘K palette render from. New app = one line.
  // `path` is derived from `id` (an app lives at /apps/<id>/). Give a `color`
  // (its theme color) so its tile and monogram render; `desc` feeds search.
  var APPS = [
    { id: 'act',        name: 'Act',                 color: '#f6f3ec' },
    { id: 'adhd',       name: 'The ADHD Playbook',   color: '#f5f0eb' },
    { id: 'ai',         name: 'AI Command Center',   color: '#f5f1eb', desc: 'Prompt well. Context well. Build well.' },
    { id: 'anchor',     name: 'Anchor',              color: '#0f0c0a' },
    { id: 'bd',         name: 'Brain Dumper',        color: '#0b0b0c', desc: 'Empty your head, minimal UI.' },
    { id: 'big',        name: 'big',                 color: '#f5efe6', desc: 'The one big thing.' },
    { id: 'billy',      name: 'billy',               color: '#f6f3ec' },
    { id: 'breath',     name: 'Wim Hof Method',      color: '#0a0a0a', desc: 'Guided breathing.' },
    { id: 'celebration',name: 'Celebration',         color: '#f4ede0', desc: '31-day devotional on security in Christ.' },
    { id: 'clean',      name: 'Cleaning Checklist',  color: '#f5f5f7', desc: 'Home cleaning checklist.' },
    { id: 'floor',      name: 'floor',               color: '#1a1715', desc: 'Brutally simple PPL workout.' },
    { id: 'food',       name: 'What to Eat?',        color: '#fff7ed', desc: 'Food decision helper.' },
    { id: 'foundation', name: 'Foundation 12',       color: '#0b1020', desc: 'Foundation timer.' },
    { id: 'hn',         name: 'Hacker News Plus',    color: '#f7f7f7' },
    { id: 'hn-feed',    name: 'HN Feed Builder',     color: '#0e0e0e' },
    { id: 'ketchapp',   name: 'Ketchapp',            color: '#c92a2a', desc: 'The dumbest pomodoro. 25/5.' },
    { id: 'not-to-do',  name: 'Not-Todo List',       color: '#f5f5f5', desc: 'What not to do.' },
    { id: 'rest',       name: 'rest.',               color: '#141210', desc: 'Rest timer.' },
    { id: 'river',      name: 'river',               color: '#f5efe6', desc: 'Your stream of meaningful activity.' },
    { id: 'sam',        name: 'sam',                 color: '#f6f3ec' },
    { id: 'schooling',  name: 'Schooling One-Pager', color: '#faf8f4', desc: 'Schooling decision one-pager.' },
    { id: 'slantboard', name: 'Slant Board Timer',   color: '#0b1020' },
    { id: 'spark',      name: 'Build Brief',         color: '#fafaf8', desc: 'Spark a build brief.' },
    { id: 'time',       name: 'you have time',       color: '#f6f3ec' },
    { id: 'wellread',   name: 'Well Read',           color: '#f5f0eb' },
    { id: 'zen',        name: 'Zen Reader',          color: '#f5efe6' },
    { id: 'zen-code',   name: 'Zen Code Reader',     color: '#f5efe6' },
  ];

  APPS.forEach(function (a) {
    a.path = './' + a.id + '/';
  });

  var byId = {};
  APPS.forEach(function (a) { byId[a.id] = a; });

  // Navigate to an app. Inside the installed shell (scope /apps/) this stays
  // in the standalone window, so storage and the bus stay shared.
  function launch(id) {
    var app = byId[id];
    if (!app) { console.warn('sys.launch: unknown app "' + id + '"'); return false; }
    window.location.href = app.path;
    return true;
  }

  // --- Bus -----------------------------------------------------------------
  // One BroadcastChannel for the origin. BroadcastChannel never delivers to
  // the sender, so emit() also dispatches locally — subscribers never have to
  // care where an event came from. on() returns its own unsubscribe.
  var CHANNEL = 'sys:bus';
  var listeners = {}; // type -> Set of fns
  var channel = null;
  try { channel = new BroadcastChannel(CHANNEL); } catch (_) { channel = null; }

  function dispatch(type, detail) {
    var set = listeners[type];
    if (set) set.forEach(function (fn) { try { fn(detail); } catch (e) { console.error(e); } });
    var all = listeners['*'];
    if (all) all.forEach(function (fn) { try { fn({ type: type, detail: detail }); } catch (e) { console.error(e); } });
  }

  if (channel) {
    channel.onmessage = function (e) {
      var msg = e.data || {};
      dispatch(msg.type, msg.detail);
    };
  }

  var bus = {
    emit: function (type, detail) {
      if (channel) { try { channel.postMessage({ type: type, detail: detail }); } catch (_) {} }
      dispatch(type, detail); // local delivery, since BroadcastChannel skips the sender
    },
    on: function (type, fn) {
      if (!listeners[type]) listeners[type] = new Set();
      listeners[type].add(fn);
      return function off() {
        if (listeners[type]) listeners[type].delete(fn);
      };
    },
  };

  // --- Storage -------------------------------------------------------------
  // Typed JSON over namespaced localStorage. Deliberately not IndexedDB:
  // ~5MB covers state and settings. An app that outgrows this reaches for
  // IndexedDB itself rather than everyone paying for the abstraction.
  var NS = 'sys:';
  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(NS + key);
        return raw === null ? (fallback === undefined ? null : fallback) : JSON.parse(raw);
      } catch (_) { return fallback === undefined ? null : fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
      catch (_) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem(NS + key); } catch (_) {}
    },
    key: function (key) { return NS + key; },
  };

  // --- Theme ---------------------------------------------------------------
  // set() persists and announces over the bus; init() applies the stored
  // value and subscribes, so a theme change in one app updates every open app
  // at once. Values live in tokens.css.
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_KEY = 'theme';

  function applyTheme(value) {
    var v = THEMES.indexOf(value) === -1 ? 'auto' : value;
    document.documentElement.setAttribute('data-theme', v);
  }

  var theme = {
    THEMES: THEMES,
    get: function () {
      var v = storage.get(THEME_KEY, 'auto');
      return THEMES.indexOf(v) === -1 ? 'auto' : v;
    },
    set: function (value) {
      var v = THEMES.indexOf(value) === -1 ? 'auto' : value;
      storage.set(THEME_KEY, v);
      applyTheme(v);
      bus.emit('theme', v);
    },
    // Apply now and keep this document in sync with changes from other apps.
    init: function () {
      applyTheme(theme.get());
      bus.on('theme', function (v) { applyTheme(v); });
    },
  };

  // --- Export --------------------------------------------------------------
  window.sys = {
    apps: APPS,
    app: function (id) { return byId[id] || null; },
    launch: launch,
    bus: bus,
    storage: storage,
    theme: theme,
  };
})();
