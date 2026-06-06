// river — shared emit client for the session stream.
//
// Append-only writes to localStorage under `river:sessions:v1`. Apps include
// this with `<script src="../lib/river.js" defer></script>` and call:
//
//   window.river.emit({
//     app: 'ketchapp' | 'big' | ...,
//     kind: 'pom.work' | 'timer.down' | 'timer.up' | ...,
//     startedAt: <ms>,
//     endedAt:   <ms>,
//     durationMs: <ms>,
//     label: 'Acme client' | null,
//   });
//
// Fails silently — callers never see an error. Prunes entries older than 90
// days on every write.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var KEY = 'river:sessions:v1';
  var TTL_MS = 90 * 24 * 60 * 60 * 1000;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  }

  function save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (_) {}
  }

  function prune(arr) {
    var cutoff = Date.now() - TTL_MS;
    return arr.filter(function (s) { return (s.endedAt || s.startedAt || 0) >= cutoff; });
  }

  function emit(ev) {
    try {
      if (!ev || typeof ev !== 'object') return;
      var label = (typeof ev.label === 'string' && ev.label.trim()) ? ev.label.trim() : null;
      var entry = {
        id: 'ses_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
        app: String(ev.app || 'unknown'),
        kind: String(ev.kind || 'session'),
        startedAt: Number(ev.startedAt) || Date.now(),
        endedAt: Number(ev.endedAt) || Date.now(),
        durationMs: Math.max(0, Number(ev.durationMs) || 0),
        label: label,
      };
      var arr = prune(load());
      arr.push(entry);
      save(arr);
    } catch (_) {}
  }

  window.river = window.river || {};
  window.river.KEY = KEY;
  window.river.emit = emit;
})();
