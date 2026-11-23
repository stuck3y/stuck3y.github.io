// S-lang playground: an editor, a Run button, a console and a stage.
// The compiler lives in slang.js; this file is only the room it runs in.

(() => {
  'use strict';

  const EXAMPLES = [
    { id: 'pang', name: 'Pang' },
    { id: 'tour', name: 'The tour' },
    { id: 'fizzbuzz', name: 'FizzBuzz' },
  ];
  const DRAFT = 'slang.draft';       // { id, code, dirty } in sys.storage
  const MAX_LINES = 500;             // console keeps the newest lines
  const MAX_DT = 1 / 30;             // a frame never jumps further than this

  const $ = (id) => document.getElementById(id);
  const src = $('src'), paint = $('paint'), picker = $('examples'), runBtn = $('run');
  const log = $('log'), errors = $('errors'), empty = $('empty');
  const canvas = $('stage'), stageWrap = $('stageWrap');
  const ctx = canvas.getContext('2d');

  sys.theme.init();

  // --- Views (phones show one pane at a time) --------------------------------

  function show(view) {
    document.body.dataset.view = view;
    document.querySelectorAll('.views button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.show === view));
    });
  }
  document.querySelectorAll('.views button').forEach((b) => {
    b.addEventListener('click', () => show(b.dataset.show));
  });

  // --- Editor ----------------------------------------------------------------

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const CLASS = { kw: 'kw', str: 'str', num: 'num', com: 'com', bad: 'bad' };

  // Repaint the colored copy of the code that sits under the textarea.
  function repaint() {
    const code = src.value;
    let html = '', at = 0;
    for (const tok of Slang.tokenize(code, true)) {
      const cls = CLASS[tok.t] || (tok.t === 'id' && tok.v in Slang.BUILTINS ? 'fn' : '');
      const text = escapeHtml(code.slice(tok.start, tok.end));
      html += escapeHtml(code.slice(at, tok.start)) + (cls ? '<span class="' + cls + '">' + text + '</span>' : text);
      at = tok.end;
    }
    paint.innerHTML = html + escapeHtml(code.slice(at)) + '\n';
    syncScroll();
  }

  function syncScroll() {
    paint.scrollTop = src.scrollTop;
    paint.scrollLeft = src.scrollLeft;
  }

  // Replace the selection, keeping the browser's undo history where it can.
  function insert(text) {
    if (!document.execCommand('insertText', false, text)) {
      src.setRangeText(text, src.selectionStart, src.selectionEnd, 'end');
      edited();
    }
  }

  let draft = { id: EXAMPLES[0].id, code: '', dirty: false };
  let saveTimer = 0;

  function edited() {
    // iOS swaps in curly quotes as you type. Same length, so the caret stays put.
    const straight = src.value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    if (straight !== src.value) {
      const [a, b] = [src.selectionStart, src.selectionEnd];
      src.value = straight;
      src.setSelectionRange(a, b);
    }
    draft.code = src.value;
    draft.dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => sys.storage.set(DRAFT, draft), 300);
    repaint();
  }

  src.addEventListener('input', edited);
  src.addEventListener('scroll', syncScroll);
  src.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); return; }
    if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      insert('    ');
    } else if (e.key === 'Enter' && !e.isComposing) {
      // Carry the current line's indent down; one level deeper after a `{`.
      const before = src.value.slice(0, src.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      const indent = /^[ \t]*/.exec(line)[0] + (/\{\s*$/.test(line) ? '    ' : '');
      if (indent) { e.preventDefault(); insert('\n' + indent); }
    }
  });

  function jumpTo(line) {
    const lines = src.value.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    show('code');
    src.focus();
    src.setSelectionRange(start, start + (lines[line - 1] || '').length);
    const lineHeight = parseFloat(getComputedStyle(src).lineHeight);
    src.scrollTop = Math.max(0, (line - 1) * lineHeight - src.clientHeight / 3);
    syncScroll();
  }

  // --- Examples ----------------------------------------------------------------

  EXAMPLES.forEach((ex) => picker.add(new Option(ex.name, ex.id)));

  function setCode(id, code, dirty) {
    draft = { id, code, dirty };
    picker.value = id;
    src.value = code;
    src.scrollTop = 0;
    sys.storage.set(DRAFT, draft);
    repaint();
  }

  async function loadExample(id) {
    const res = await fetch('./examples/' + id + '.slang');
    if (!res.ok) throw new Error('Could not load ' + id);
    stop();
    clearOutput();
    setCode(id, await res.text(), false);
  }

  picker.addEventListener('change', () => {
    const name = picker.options[picker.selectedIndex].text;
    if (draft.dirty && !confirm('Open ' + name + '? Your edits here will be tossed.')) {
      picker.value = draft.id;
      return;
    }
    loadExample(picker.value).catch(() => { picker.value = draft.id; });
  });

  // --- Console -----------------------------------------------------------------

  let lines = [], logQueued = false;

  function spit(text) {
    lines.push(text);
    if (lines.length > MAX_LINES * 2) lines = lines.slice(-MAX_LINES);
    if (logQueued) return;
    logQueued = true;
    requestAnimationFrame(flushLog);
  }

  function flushLog() {
    logQueued = false;
    const box = log.parentElement;
    const pinned = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    const quiet = lines.length === 0 && errors.childElementCount === 0;
    log.textContent = lines.slice(-MAX_LINES).join('\n');
    empty.hidden = !quiet;
    box.hidden = quiet && !stageWrap.hidden;   // a game with nothing to say gets the room
    if (pinned) box.scrollTop = box.scrollHeight;
  }

  function clearOutput() {
    lines = [];
    errors.textContent = '';
    stageWrap.hidden = true;
    flushLog();
  }

  function showError(e) {
    const problems = e instanceof Slang.SlangError ? e.problems : [{ line: 0, msg: String(e && e.message || e) }];
    problems.forEach((p) => {
      const row = document.createElement('button');
      row.type = 'button';
      if (p.line) {
        row.appendChild(document.createElement('b')).textContent = 'Line ' + p.line;
        row.addEventListener('click', () => jumpTo(p.line));
      }
      row.append(p.msg);
      errors.appendChild(row);
    });
    flushLog();
    show('out');
  }

  // --- Stage: the canvas, keys, touch and sound S-lang programs can use ---------

  const size = { w: 0, h: 0 };
  const keys = new Set();
  const finger = { down: false, x: 0, y: 0 };

  // A quick tap can start and end between two frames. So a release is held
  // back until the program has had one frame to see the press.
  const lifted = { keys: new Set(), finger: false };
  function settleInput() {
    lifted.keys.forEach((k) => keys.delete(k));
    lifted.keys.clear();
    if (lifted.finger) finger.down = false;
    lifted.finger = false;
  }
  function dropInput() {
    keys.clear();
    finger.down = false;
    settleInput();
  }
  let audio = null;

  function setStage(w, h) {
    size.w = Math.max(1, Math.min(4000, Math.round(w)));
    size.h = Math.max(1, Math.min(4000, Math.round(h)));
    const scale = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size.w * scale;
    canvas.height = size.h * scale;
    canvas.style.aspectRatio = size.w + ' / ' + size.h;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    stageWrap.hidden = false;
    flushLog();
  }

  // Drawing before `stage(w, h)` gets a sensible default instead of nothing.
  const ready = () => { if (stageWrap.hidden) setStage(800, 500); };

  const stage = {
    stage: setStage,
    wipe(color) { ready(); ctx.fillStyle = color; ctx.fillRect(0, 0, size.w, size.h); },
    box(x, y, w, h, color) { ready(); ctx.fillStyle = color; ctx.fillRect(x, y, w, h); },
    dot(x, y, r, color) {
      ready();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
      ctx.fill();
    },
    tag(text, x, y, px, color) {
      ready();
      ctx.fillStyle = color;
      ctx.font = '700 ' + px + 'px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Slang.show(text), x, y);
    },
    pressed: (key) => keys.has(key),
    fingerX: () => (finger.down ? finger.x : null),
    fingerY: () => (finger.down ? finger.y : null),
    beep(hz, ms) {
      if (!audio || audio.state !== 'running') return;
      const osc = audio.createOscillator(), gain = audio.createGain();
      const end = audio.currentTime + Math.min(Math.max(ms, 0), 2000) / 1000;
      osc.type = 'square';
      osc.frequency.value = Math.min(Math.max(hz, 20), 8000);
      gain.gain.setValueAtTime(0.05, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(end);
    },
  };

  // Browsers only allow sound after a tap or click, which Run always is.
  function unlockAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audio = audio || new Audio();
      if (audio.state === 'suspended') audio.resume();
    } catch (_) { audio = null; }
  }

  function track(e) {
    const box = canvas.getBoundingClientRect();
    finger.x = (e.clientX - box.left) * size.w / box.width;
    finger.y = (e.clientY - box.top) * size.h / box.height;
  }
  canvas.addEventListener('pointerdown', (e) => {
    finger.down = true;
    lifted.finger = false;
    track(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', (e) => { if (finger.down) track(e); });
  ['pointerup', 'pointercancel'].forEach((type) => {
    canvas.addEventListener(type, () => { lifted.finger = true; });
  });

  // Keys reach the program while it runs, unless you're typing in the editor.
  const KEY_NAMES = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'space', Enter: 'enter' };
  const keyName = (e) => KEY_NAMES[e.key] || (e.key.length === 1 ? e.key.toLowerCase() : null);

  window.addEventListener('keydown', (e) => {
    const name = keyName(e);
    if (!running || !name || e.target === src || e.target === picker || e.metaKey || e.ctrlKey) return;
    keys.add(name);
    lifted.keys.delete(name);
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { lifted.keys.add(keyName(e)); });
  window.addEventListener('blur', dropInput);

  // --- Run / Stop ----------------------------------------------------------------

  let running = false, frameId = 0;

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
    dropInput();
    runBtn.textContent = 'Run';
    runBtn.classList.remove('running');
  }

  function run() {
    stop();
    clearOutput();
    unlockAudio();

    let program;
    try {
      program = Slang.run(src.value, { spit, stage, gimme: (ask) => prompt(ask) });
    } catch (e) {
      return showError(e);
    }
    show('out');
    if (!program.frame) return;

    running = true;
    runBtn.textContent = 'Stop';
    runBtn.classList.add('running');
    canvas.focus({ preventScroll: true });   // so space plays the game, not the button

    let last = performance.now();
    const tick = (now) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;
      try {
        program.frame(dt);
        settleInput();
      } catch (e) {
        stop();
        return showError(e);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
  }

  runBtn.addEventListener('click', () => (running ? stop() : run()));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target !== src) { e.preventDefault(); run(); }
  });

  // --- Start: your last draft, or Pang ---------------------------------------------

  const saved = sys.storage.get(DRAFT);
  if (saved && typeof saved.code === 'string' && EXAMPLES.some((ex) => ex.id === saved.id)) {
    setCode(saved.id, saved.code, !!saved.dirty);
  } else {
    loadExample(EXAMPLES[0].id).catch(showError);
  }
})();
