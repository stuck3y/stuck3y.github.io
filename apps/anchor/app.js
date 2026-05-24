(() => {
  'use strict';

  const STORAGE_KEY = 'anchor_v1';
  const DAY_START_MIN = 5 * 60;
  const DAY_END_MIN = 23 * 60 + 30;
  const SNAP_MIN = 15;
  const DEFAULT_DURATION = 30;
  const PX = 1.1; // keep in sync with --px-per-min

  const CATEGORIES = [
    { id: 'soul',   label: 'Soul',   color: 'var(--cat-soul)'   },
    { id: 'body',   label: 'Body',   color: 'var(--cat-body)'   },
    { id: 'mind',   label: 'Mind',   color: 'var(--cat-mind)'   },
    { id: 'family', label: 'Family', color: 'var(--cat-family)' },
    { id: 'work',   label: 'Work',   color: 'var(--cat-work)'   },
    { id: 'rest',   label: 'Rest',   color: 'var(--cat-rest)'   }
  ];
  const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

  // ---------- State ----------

  function defaultState() {
    return {
      version: 2,
      blocks: {},
      prefs: { lastCategory: 'soul' },
      prayers: [],
      blessings: [],
      bible: {},   // { "YYYY-MM-DD": { passage, note } }
      body: { weights: [], workouts: {} } // weights: [{date,value}]; workouts: { "YYYY-MM-DD": { note } }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const d = defaultState();
      return {
        version: 2,
        blocks: parsed.blocks || d.blocks,
        prefs: parsed.prefs || d.prefs,
        prayers: Array.isArray(parsed.prayers) ? parsed.prayers : d.prayers,
        blessings: Array.isArray(parsed.blessings) ? parsed.blessings : d.blessings,
        bible: parsed.bible || d.bible,
        body: {
          weights: (parsed.body && Array.isArray(parsed.body.weights)) ? parsed.body.weights : [],
          workouts: (parsed.body && parsed.body.workouts) ? parsed.body.workouts : {}
        }
      };
    } catch (_) {
      return defaultState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  let state = loadState();
  let viewDate = todayISO();
  let activeTab = 'day';
  let editingId = null;
  let selectedCategory = state.prefs.lastCategory || 'soul';
  let selectedStatus = 'planned';
  let rememberIndex = 0;

  // ---------- Date + time helpers ----------

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayISO(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function shiftDay(iso, delta) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + delta);
    return todayISO(d);
  }
  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
  function toHHMM(min) {
    min = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
    return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  }
  function fmt12(min) {
    const h = Math.floor(min / 60), m = min % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const h12 = ((h + 11) % 12) + 1;
    return m === 0 ? `${h12} ${period}` : `${h12}:${pad(m)} ${period}`;
  }
  function snap(min, step) { return Math.round(min / step) * step; }
  function uid() { return 'x_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function shortDate(iso) {
    return parseISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function relativeDay(iso) {
    const today = todayISO();
    if (iso === today) return 'Today';
    if (iso === shiftDay(today, -1)) return 'Yesterday';
    return shortDate(iso);
  }

  function formatDateHeader(iso) {
    const d = parseISO(iso);
    const today = todayISO();
    const wk = d.toLocaleDateString(undefined, { weekday: 'long' });
    const md = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    let label = wk.toUpperCase();
    if (iso === today) label = 'TODAY';
    else if (iso === shiftDay(today, 1)) label = 'TOMORROW';
    else if (iso === shiftDay(today, -1)) label = 'YESTERDAY';
    return { label, date: md };
  }

  // streak of consecutive days ending today (or yesterday if today not yet logged)
  function computeStreak(dateSet) {
    if (dateSet.size === 0) return 0;
    let cursor = todayISO();
    if (!dateSet.has(cursor)) {
      cursor = shiftDay(cursor, -1);
      if (!dateSet.has(cursor)) return 0;
    }
    let n = 0;
    while (dateSet.has(cursor)) { n++; cursor = shiftDay(cursor, -1); }
    return n;
  }

  // ---------- Element refs ----------

  const $ = (id) => document.getElementById(id);
  const els = {
    weekday: $('weekday'), date: $('date'), summaryText: $('summary-text'), todayBtn: $('today-btn'),
    timeline: $('timeline'), timelineWrap: $('timeline-wrap'), emptyState: $('empty-state'), fab: $('fab'),
    sheet: $('sheet'), backdrop: $('sheet-backdrop'), sheetTitle: $('sheet-title'), form: $('sheet-form'),
    fTitle: $('f-title'), fStart: $('f-start'), fEnd: $('f-end'), fNotes: $('f-notes'),
    catGrid: $('cat-grid'), statusField: $('status-field'), statusSeg: $('status-seg'),
    deleteBtn: $('delete-btn'), cancelBtn: $('cancel-btn'), error: $('sheet-error'),
    tabBar: $('tab-bar'),
    rememberCard: $('remember-card'), bibleCard: $('bible-card'), prayersCard: $('prayers-card'), blessingsCard: $('blessings-card'),
    weightCard: $('weight-card'), workoutCard: $('workout-card'),
    gsheet: $('gsheet'), gTitle: $('g-title'), gFields: $('g-fields'), gError: $('g-error'),
    gDelete: $('g-delete'), gCancel: $('g-cancel'), gSave: $('g-save')
  };

  // ============================================================
  //  TAB NAVIGATION
  // ============================================================

  function setTab(tab) {
    activeTab = tab;
    for (const s of document.querySelectorAll('.screen')) {
      s.classList.toggle('active', s.id === `screen-${tab}`);
    }
    for (const b of els.tabBar.querySelectorAll('.tab-btn')) {
      b.classList.toggle('active', b.dataset.tab === tab);
    }
    els.fab.style.display = tab === 'day' ? '' : 'none';
    renderActive();
  }

  function renderActive() {
    if (activeTab === 'day') renderDay();
    else if (activeTab === 'soul') renderSoul();
    else if (activeTab === 'body') renderBody();
  }

  // ============================================================
  //  DAY (planner)
  // ============================================================

  function getBlocks(iso) {
    return [...(state.blocks[iso] || [])].sort((a, b) => toMin(a.start) - toMin(b.start));
  }
  function upsertBlock(b) {
    if (!state.blocks[b.date]) state.blocks[b.date] = [];
    const list = state.blocks[b.date];
    const idx = list.findIndex(x => x.id === b.id);
    if (idx >= 0) list[idx] = b; else list.push(b);
    saveState();
  }
  function removeBlock(date, id) {
    if (!state.blocks[date]) return;
    state.blocks[date] = state.blocks[date].filter(x => x.id !== id);
    if (state.blocks[date].length === 0) delete state.blocks[date];
    saveState();
  }

  function packBlocks(blocks) {
    const items = blocks.map(b => ({ ...b, _start: toMin(b.start), _end: toMin(b.end) }))
      .sort((a, b) => a._start - b._start || a._end - b._end);
    let cluster = [], clusterEnd = -1;
    const out = [];
    function flush() {
      if (cluster.length === 0) return;
      const cols = [];
      for (const item of cluster) {
        let placed = false;
        for (let c = 0; c < cols.length; c++) {
          if (cols[c][cols[c].length - 1]._end <= item._start) { item._col = c; cols[c].push(item); placed = true; break; }
        }
        if (!placed) { item._col = cols.length; cols.push([item]); }
      }
      const cc = cols.length;
      for (const item of cluster) { item._cols = cc; out.push(item); }
      cluster = []; clusterEnd = -1;
    }
    for (const it of items) {
      if (cluster.length === 0 || it._start < clusterEnd) { cluster.push(it); clusterEnd = Math.max(clusterEnd, it._end); }
      else { flush(); cluster.push(it); clusterEnd = it._end; }
    }
    flush();
    return out;
  }

  function renderDay() {
    renderDayHeader();
    renderTimeline();
  }

  function renderDayHeader() {
    const { label, date } = formatDateHeader(viewDate);
    els.weekday.textContent = label;
    els.date.textContent = date;
    els.todayBtn.hidden = viewDate === todayISO();

    const blocks = getBlocks(viewDate);
    if (blocks.length === 0) {
      els.summaryText.textContent = 'No blocks yet';
    } else {
      const totalMin = blocks.reduce((s, b) => s + (toMin(b.end) - toMin(b.start)), 0);
      const doneMin = blocks.filter(b => b.status === 'done').reduce((s, b) => s + (toMin(b.end) - toMin(b.start)), 0);
      const h = Math.floor(totalMin / 60), m = totalMin % 60;
      const dur = h > 0 ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
      const donePart = doneMin > 0 ? ` · ${Math.round(100 * doneMin / totalMin)}% done` : '';
      els.summaryText.textContent = `${blocks.length} block${blocks.length === 1 ? '' : 's'} · ${dur} planned${donePart}`;
    }
  }

  function renderTimeline() {
    const blocks = getBlocks(viewDate);
    els.emptyState.hidden = blocks.length > 0;
    const tl = els.timeline;
    tl.innerHTML = '';
    const totalMins = DAY_END_MIN - DAY_START_MIN;
    tl.style.height = `calc(${totalMins} * var(--px-per-min))`;

    for (let h = Math.floor(DAY_START_MIN / 60); h <= Math.floor(DAY_END_MIN / 60); h++) {
      const row = document.createElement('div');
      row.className = 'hour-row';
      row.style.top = `calc(${h * 60 - DAY_START_MIN} * var(--px-per-min))`;
      row.style.position = 'absolute';
      row.style.left = '0';
      row.style.right = '0';
      if (h * 60 >= DAY_END_MIN) row.style.height = '0';
      const lbl = document.createElement('div');
      lbl.className = 'hour-label';
      lbl.textContent = fmt12(h * 60).replace(' ', '');
      row.appendChild(lbl);
      if (h * 60 < DAY_END_MIN) {
        const half = document.createElement('div'); half.className = 'half-tick'; row.appendChild(half);
        const tap = document.createElement('div'); tap.className = 'tap-zone'; tap.dataset.hour = h;
        tap.addEventListener('click', onTapZoneClick); row.appendChild(tap);
      }
      tl.appendChild(row);
    }

    if (viewDate === todayISO()) {
      const nm = nowMinutes();
      if (nm >= DAY_START_MIN && nm <= DAY_END_MIN) {
        const line = document.createElement('div');
        line.className = 'now-line'; line.id = 'now-line';
        line.style.top = `calc(${nm - DAY_START_MIN} * var(--px-per-min))`;
        tl.appendChild(line);
      }
    }

    const packed = packBlocks(blocks);
    const now = nowMinutes();
    const today = todayISO();
    for (const b of packed) {
      const startVis = Math.max(b._start, DAY_START_MIN);
      const endVis = Math.min(b._end, DAY_END_MIN);
      if (endVis <= DAY_START_MIN || startVis >= DAY_END_MIN) continue;
      const el = document.createElement('div');
      el.className = `block cat-${b.category}`;
      if (b.status === 'done') el.classList.add('done');
      if (b.status === 'skipped') el.classList.add('skipped');
      if (viewDate === today && b._end <= now) el.classList.add('past');
      const heightMin = endVis - startVis;
      if (heightMin < 32) el.classList.add('short');
      el.style.top = `calc(${startVis - DAY_START_MIN} * var(--px-per-min))`;
      el.style.height = `calc(${heightMin} * var(--px-per-min) - 4px)`;
      const widthPct = 100 / b._cols;
      el.style.width = `calc(${widthPct}% - 4px)`;
      el.style.left = `${b._col * widthPct}%`;

      const title = document.createElement('div');
      title.className = 'block-title';
      title.textContent = b.title;
      el.appendChild(title);
      const meta = document.createElement('div');
      meta.className = 'block-meta';
      const cat = CAT_BY_ID[b.category] || CAT_BY_ID.soul;
      meta.innerHTML = `<span class="dot" style="background:${cat.color}"></span><span class="cat-name">${esc(cat.label)}</span><span>&middot;</span><span>${fmt12(toMin(b.start))} – ${fmt12(toMin(b.end))}</span>`;
      el.appendChild(meta);
      el.addEventListener('click', (e) => { e.stopPropagation(); openBlockSheet(b); });
      tl.appendChild(el);
    }
  }

  function updateNowLine() {
    if (activeTab !== 'day') return;
    const line = $('now-line');
    if (!line) { if (viewDate === todayISO()) renderTimeline(); return; }
    const nm = nowMinutes();
    if (nm < DAY_START_MIN || nm > DAY_END_MIN) { line.remove(); return; }
    line.style.top = `calc(${nm - DAY_START_MIN} * var(--px-per-min))`;
  }

  function scrollToNowOrStart() {
    const wrap = els.timelineWrap;
    if (viewDate === todayISO()) {
      const nm = nowMinutes();
      if (nm >= DAY_START_MIN && nm <= DAY_END_MIN) {
        wrap.scrollTop = Math.max(0, (nm - DAY_START_MIN) * PX - wrap.clientHeight * 0.35);
        return;
      }
    }
    const blocks = getBlocks(viewDate);
    const startMin = blocks.length > 0 ? toMin(blocks[0].start) : 7 * 60;
    wrap.scrollTop = Math.max(0, (startMin - DAY_START_MIN) * PX - 40);
  }

  // block sheet
  function buildCategoryGrid() {
    els.catGrid.innerHTML = '';
    for (const c of CATEGORIES) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'cat-btn'; btn.dataset.cat = c.id;
      btn.setAttribute('role', 'radio');
      btn.innerHTML = `<span class="dot" style="background:${c.color}"></span>${esc(c.label)}`;
      btn.addEventListener('click', () => { selectedCategory = c.id; syncCategoryButtons(); });
      els.catGrid.appendChild(btn);
    }
  }
  function syncCategoryButtons() {
    for (const btn of els.catGrid.querySelectorAll('.cat-btn')) {
      const on = btn.dataset.cat === selectedCategory;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }
  function syncStatusSeg() {
    for (const btn of els.statusSeg.querySelectorAll('.seg-btn')) {
      const on = btn.dataset.status === selectedStatus;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    }
  }
  function openBlockSheet(block) {
    els.error.hidden = true; els.error.textContent = '';
    if (block && block.id) {
      editingId = block.id;
      els.sheetTitle.textContent = 'Edit block';
      els.fTitle.value = block.title; els.fStart.value = block.start; els.fEnd.value = block.end;
      els.fNotes.value = block.notes || '';
      selectedCategory = block.category; selectedStatus = block.status || 'planned';
      els.statusField.hidden = false; els.deleteBtn.hidden = false;
    } else {
      editingId = null;
      els.sheetTitle.textContent = 'New block';
      els.fTitle.value = '';
      const startMin = (block && block.start) ? toMin(block.start) : snap(nowMinutes(), SNAP_MIN);
      els.fStart.value = toHHMM(startMin); els.fEnd.value = toHHMM(startMin + DEFAULT_DURATION);
      els.fNotes.value = '';
      selectedCategory = state.prefs.lastCategory || 'soul'; selectedStatus = 'planned';
      els.statusField.hidden = true; els.deleteBtn.hidden = true;
    }
    syncCategoryButtons(); syncStatusSeg();
    showSheet(els.sheet);
  }
  function handleBlockSubmit(e) {
    e.preventDefault();
    const title = els.fTitle.value.trim();
    const start = els.fStart.value, end = els.fEnd.value;
    if (!title) return showErr(els.error, 'Give it a name.');
    if (!start || !end) return showErr(els.error, 'Pick a start and end time.');
    if (toMin(end) <= toMin(start)) return showErr(els.error, 'End time must be after start time.');
    upsertBlock({
      id: editingId || uid(), date: viewDate, title, start, end,
      category: selectedCategory, notes: els.fNotes.value.trim(),
      status: editingId ? selectedStatus : 'planned'
    });
    state.prefs.lastCategory = selectedCategory; saveState();
    closeSheet(); renderDay();
  }
  function handleBlockDelete() {
    if (!editingId) return;
    if (!confirm('Delete this block?')) return;
    removeBlock(viewDate, editingId); closeSheet(); renderDay();
  }
  function onTapZoneClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const hour = Number(e.currentTarget.dataset.hour);
    const minInHour = Math.max(0, Math.min(59, Math.round((e.clientY - rect.top) / PX)));
    openBlockSheet({ start: toHHMM(snap(hour * 60 + minInHour, SNAP_MIN)) });
  }

  function changeDay(delta) { viewDate = shiftDay(viewDate, delta); renderDay(); scrollToNowOrStart(); }
  function goToday() { viewDate = todayISO(); renderDay(); scrollToNowOrStart(); }

  // ============================================================
  //  SOUL
  // ============================================================

  function renderSoul() {
    renderRemember();
    renderBible();
    renderPrayers();
    renderBlessings();
  }

  function rememberItems() {
    const out = [];
    for (const p of state.prayers) {
      if (p.answered) out.push({ kind: 'Answered prayer', text: p.text, sub: p.answerNote || '', date: p.answeredAt });
    }
    for (const b of state.blessings) out.push({ kind: 'Blessing', text: b.text, sub: '', date: b.date });
    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  function renderRemember() {
    const items = rememberItems();
    if (items.length === 0) { els.rememberCard.innerHTML = ''; return; }
    if (rememberIndex >= items.length) rememberIndex = 0;
    const it = items[rememberIndex];
    els.rememberCard.innerHTML = `
      <div class="card remember">
        <div class="remember-head">
          <span class="kicker">Remember</span>
          <button class="icon-btn" id="remember-next" aria-label="Show another">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
        <p class="remember-text">${esc(it.text)}</p>
        ${it.sub ? `<p class="remember-sub">${esc(it.sub)}</p>` : ''}
        <p class="remember-meta">${esc(it.kind)}${it.date ? ' · ' + shortDate(it.date) : ''}</p>
      </div>`;
    $('remember-next').addEventListener('click', () => {
      rememberIndex = (rememberIndex + 1) % items.length;
      renderRemember();
    });
  }

  function renderBible() {
    const today = todayISO();
    const entry = state.bible[today];
    const dates = new Set(Object.keys(state.bible));
    const streak = computeStreak(dates);
    const streakLabel = streak > 0 ? `${streak}-day streak` : 'Start a streak today';

    let body;
    if (entry) {
      body = `
        <div class="bible-done">
          <div class="check-row">
            <span class="check on" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span>Read today${entry.passage ? ' · ' + esc(entry.passage) : ''}</span>
          </div>
          ${entry.note ? `<p class="bible-note">${esc(entry.note)}</p>` : ''}
          <div class="row-actions">
            <button class="text-btn" id="bible-edit">Edit</button>
            <a class="text-btn link" href="../wellread/">Study in Well Read &rsaquo;</a>
          </div>
        </div>`;
    } else {
      body = `
        <p class="muted">Haven't logged today's reading yet.</p>
        <div class="row-actions">
          <button class="pill-btn primary" id="bible-mark">Mark as read</button>
          <a class="text-btn link" href="../wellread/">Open Well Read &rsaquo;</a>
        </div>`;
    }

    els.bibleCard.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Daily reading</h2>
          <span class="streak">${esc(streakLabel)}</span>
        </div>
        ${body}
      </div>`;

    if (entry) {
      $('bible-edit').addEventListener('click', () => openBibleSheet(entry));
    } else {
      $('bible-mark').addEventListener('click', () => openBibleSheet(null));
    }
  }

  function openBibleSheet(entry) {
    openGenericSheet({
      title: entry ? 'Edit today’s reading' : 'Today’s reading',
      fields: [
        { key: 'passage', label: 'Passage (optional)', type: 'text', value: entry ? entry.passage : '', placeholder: 'e.g., John 1 or Psalm 23' },
        { key: 'note', label: 'A line on what it stirred (optional)', type: 'textarea', value: entry ? entry.note : '', placeholder: 'What stood out…', maxlength: 500 }
      ],
      onDelete: entry ? () => { delete state.bible[todayISO()]; saveState(); } : null,
      onSave: (v) => {
        state.bible[todayISO()] = { passage: v.passage, note: v.note };
        saveState();
      }
    });
  }

  function renderPrayers() {
    const active = state.prayers.filter(p => !p.answered);
    const answered = state.prayers.filter(p => p.answered).sort((a, b) => (b.answeredAt || '').localeCompare(a.answeredAt || ''));

    const activeHtml = active.length
      ? active.map(p => `
        <div class="list-item" data-id="${p.id}" data-act="open-prayer">
          <span class="li-text">${esc(p.text)}</span>
          <button class="li-action" data-id="${p.id}" data-act="answer" aria-label="Mark answered">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>`).join('')
      : `<p class="muted">No open prayers. Add what's on your heart.</p>`;

    const answeredHtml = answered.length
      ? `<details class="answered-wrap">
           <summary>Answered &amp; remembered (${answered.length})</summary>
           <div class="answered-list">
             ${answered.map(p => `
               <div class="answered-item" data-id="${p.id}" data-act="open-prayer">
                 <span class="li-text">${esc(p.text)}</span>
                 ${p.answerNote ? `<span class="answered-note">${esc(p.answerNote)}</span>` : ''}
                 ${p.answeredAt ? `<span class="answered-date">${esc(shortDate(p.answeredAt))}</span>` : ''}
               </div>`).join('')}
           </div>
         </details>`
      : '';

    els.prayersCard.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Prayers</h2>
          <button class="add-btn" id="prayer-add" aria-label="Add prayer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div class="list">${activeHtml}</div>
        ${answeredHtml}
      </div>`;

    $('prayer-add').addEventListener('click', () => openPrayerSheet(null));
    els.prayersCard.querySelectorAll('[data-act="answer"]').forEach(b =>
      b.addEventListener('click', (e) => { e.stopPropagation(); answerPrayer(b.dataset.id); }));
    els.prayersCard.querySelectorAll('[data-act="open-prayer"]').forEach(b =>
      b.addEventListener('click', () => openPrayerSheet(findPrayer(b.dataset.id))));
  }

  function findPrayer(id) { return state.prayers.find(p => p.id === id); }

  function openPrayerSheet(prayer) {
    const editing = !!prayer;
    openGenericSheet({
      title: editing ? 'Prayer' : 'New prayer',
      fields: [
        { key: 'text', label: 'On your heart', type: 'textarea', value: editing ? prayer.text : '', placeholder: 'What are you praying for?', maxlength: 500 },
        ...(editing && prayer.answered ? [{ key: 'answerNote', label: 'How it was answered', type: 'textarea', value: prayer.answerNote || '', placeholder: 'What God did…', maxlength: 500 }] : [])
      ],
      onDelete: editing ? () => { state.prayers = state.prayers.filter(p => p.id !== prayer.id); saveState(); } : null,
      onSave: (v) => {
        if (!v.text) return 'Write a few words first.';
        if (editing) {
          prayer.text = v.text;
          if (prayer.answered) prayer.answerNote = v.answerNote || '';
        } else {
          state.prayers.push({ id: uid(), text: v.text, createdAt: todayISO(), answered: false });
        }
        saveState();
      }
    });
  }

  function answerPrayer(id) {
    const p = findPrayer(id);
    if (!p) return;
    openGenericSheet({
      title: 'Answered prayer',
      fields: [
        { key: 'note', label: 'How did God answer? (optional)', type: 'textarea', value: '', placeholder: 'Mark the moment…', maxlength: 500 }
      ],
      onSave: (v) => {
        p.answered = true; p.answeredAt = todayISO(); p.answerNote = v.note || '';
        saveState();
      }
    });
  }

  function renderBlessings() {
    const items = [...state.blessings].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 50);
    const list = items.length
      ? items.map(b => `
        <div class="list-item" data-id="${b.id}" data-act="open-blessing">
          <span class="li-text">${esc(b.text)}</span>
          <span class="li-date">${esc(relativeDay(b.date))}</span>
        </div>`).join('')
      : `<p class="muted">Name a blessing — something He brought you through.</p>`;

    els.blessingsCard.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Blessings</h2>
          <button class="add-btn" id="blessing-add" aria-label="Add blessing">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div class="list">${list}</div>
      </div>`;

    $('blessing-add').addEventListener('click', () => openBlessingSheet(null));
    els.blessingsCard.querySelectorAll('[data-act="open-blessing"]').forEach(b =>
      b.addEventListener('click', () => openBlessingSheet(state.blessings.find(x => x.id === b.dataset.id))));
  }

  function openBlessingSheet(blessing) {
    const editing = !!blessing;
    openGenericSheet({
      title: editing ? 'Blessing' : 'New blessing',
      fields: [
        { key: 'text', label: 'A gift, an answer, a mercy', type: 'textarea', value: editing ? blessing.text : '', placeholder: 'What are you grateful for?', maxlength: 500 }
      ],
      onDelete: editing ? () => { state.blessings = state.blessings.filter(x => x.id !== blessing.id); saveState(); } : null,
      onSave: (v) => {
        if (!v.text) return 'Write a few words first.';
        if (editing) blessing.text = v.text;
        else state.blessings.push({ id: uid(), text: v.text, date: todayISO() });
        saveState();
      }
    });
  }

  // ============================================================
  //  BODY
  // ============================================================

  function sortedWeights() {
    return [...state.body.weights].sort((a, b) => a.date.localeCompare(b.date));
  }

  function sparkline(values, w, h) {
    if (values.length < 2) return '';
    const min = Math.min(...values), max = Math.max(...values);
    const range = (max - min) || 1;
    const padX = 4, padY = 6;
    const pts = values.map((v, i) => {
      const x = padX + (i / (values.length - 1)) * (w - 2 * padX);
      const y = padY + (1 - (v - min) / range) * (h - 2 * padY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = pts[pts.length - 1].split(',');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="${h}">
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--cat-body)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="var(--cat-body)"/>
    </svg>`;
  }

  function fmtDelta(n, unit) {
    const r = Math.round(n * 10) / 10;
    if (r === 0) return `±0 ${unit}`;
    return `${r > 0 ? '+' : ''}${r} ${unit}`;
  }

  function renderWeight() {
    const ws = sortedWeights();
    let body;
    if (ws.length === 0) {
      body = `<p class="muted">No entries yet. Log your weight to start the trend.</p>
        <button class="pill-btn primary" id="weight-add">Log weight</button>`;
    } else {
      const latest = ws[ws.length - 1];
      const first = ws[0];
      const prev = ws.length > 1 ? ws[ws.length - 2] : null;
      const sinceStart = latest.value - first.value;
      const sincePrev = prev ? latest.value - prev.value : 0;
      const spark = sparkline(ws.map(x => x.value), 280, 60);
      body = `
        <div class="weight-top">
          <div class="weight-now">
            <span class="weight-val">${latest.value}</span>
            <span class="weight-unit">lb</span>
          </div>
          <div class="weight-deltas">
            ${prev ? `<span class="delta ${sincePrev <= 0 ? 'down' : 'up'}">${fmtDelta(sincePrev, 'lb')} <small>last</small></span>` : ''}
            <span class="delta ${sinceStart <= 0 ? 'down' : 'up'}">${fmtDelta(sinceStart, 'lb')} <small>all</small></span>
          </div>
        </div>
        ${spark ? `<div class="spark-wrap">${spark}</div>` : ''}
        <div class="row-actions">
          <button class="pill-btn primary" id="weight-add">Log weight</button>
          <span class="muted small">Last: ${esc(relativeDay(latest.date))}</span>
        </div>`;
    }
    els.weightCard.innerHTML = `
      <div class="card">
        <div class="card-head"><h2 class="card-title">Weight</h2></div>
        ${body}
      </div>`;
    $('weight-add').addEventListener('click', openWeightSheet);
  }

  function openWeightSheet() {
    const ws = sortedWeights();
    const last = ws.length ? ws[ws.length - 1].value : '';
    openGenericSheet({
      title: 'Log weight',
      fields: [
        { key: 'value', label: 'Weight (lb)', type: 'number', value: '', placeholder: last ? String(last) : 'e.g., 185', step: '0.1' },
        { key: 'date', label: 'Date', type: 'date', value: todayISO() }
      ],
      onSave: (v) => {
        const val = parseFloat(v.value);
        if (!isFinite(val) || val <= 0) return 'Enter a valid weight.';
        const date = v.date || todayISO();
        const existing = state.body.weights.find(w => w.date === date);
        if (existing) existing.value = val;
        else state.body.weights.push({ date, value: val });
        saveState();
      }
    });
  }

  function renderWorkout() {
    const today = todayISO();
    const dates = new Set(Object.keys(state.body.workouts));
    const streak = computeStreak(dates);
    const doneToday = dates.has(today);
    const todayEntry = state.body.workouts[today];

    // last 7 days dots
    let dots = '';
    for (let i = 6; i >= 0; i--) {
      const iso = shiftDay(today, -i);
      const on = dates.has(iso);
      const dow = parseISO(iso).toLocaleDateString(undefined, { weekday: 'narrow' });
      dots += `<div class="dot-day"><span class="wdot ${on ? 'on' : ''}"></span><span class="dot-lbl">${esc(dow)}</span></div>`;
    }

    els.workoutCard.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2 class="card-title">Movement</h2>
          <span class="streak">${streak > 0 ? esc(streak + '-day streak') : 'No streak yet'}</span>
        </div>
        <button class="big-toggle ${doneToday ? 'on' : ''}" id="workout-toggle">
          <span class="check ${doneToday ? 'on' : ''}" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span>${doneToday ? 'Moved today' : 'Did you move today?'}</span>
        </button>
        ${doneToday && todayEntry && todayEntry.note ? `<p class="bible-note">${esc(todayEntry.note)}</p>` : ''}
        ${doneToday ? `<button class="text-btn" id="workout-note">${todayEntry && todayEntry.note ? 'Edit note' : 'Add a note'}</button>` : ''}
        <div class="week-dots">${dots}</div>
      </div>`;

    $('workout-toggle').addEventListener('click', () => {
      if (dates.has(today)) delete state.body.workouts[today];
      else state.body.workouts[today] = { note: '' };
      saveState(); renderWorkout();
    });
    const noteBtn = $('workout-note');
    if (noteBtn) noteBtn.addEventListener('click', openWorkoutNoteSheet);
  }

  function openWorkoutNoteSheet() {
    const today = todayISO();
    const entry = state.body.workouts[today] || { note: '' };
    openGenericSheet({
      title: 'Today’s movement',
      fields: [
        { key: 'note', label: 'What did you do? (optional)', type: 'textarea', value: entry.note || '', placeholder: 'Run, lift, walk, stretch…', maxlength: 300 }
      ],
      onSave: (v) => { state.body.workouts[today] = { note: v.note || '' }; saveState(); }
    });
  }

  function renderBody() { renderWeight(); renderWorkout(); }

  // ============================================================
  //  SHEETS (shared)
  // ============================================================

  function showErr(elError, msg) { elError.textContent = msg; elError.hidden = false; }

  function showSheet(sheetEl) {
    els.backdrop.hidden = false;
    sheetEl.hidden = false;
    requestAnimationFrame(() => { els.backdrop.classList.add('show'); sheetEl.classList.add('show'); });
  }
  function closeSheet() {
    els.backdrop.classList.remove('show');
    els.sheet.classList.remove('show');
    els.gsheet.classList.remove('show');
    setTimeout(() => {
      els.backdrop.hidden = true;
      els.sheet.hidden = true;
      els.gsheet.hidden = true;
    }, 240);
  }

  let gOnSave = null, gOnDelete = null, gInputs = {};

  function openGenericSheet(cfg) {
    gOnSave = cfg.onSave; gOnDelete = cfg.onDelete || null; gInputs = {};
    els.gTitle.textContent = cfg.title;
    els.gError.hidden = true; els.gError.textContent = '';
    els.gFields.innerHTML = '';
    for (const f of cfg.fields) {
      const wrap = document.createElement('label');
      wrap.className = 'field';
      const lbl = document.createElement('span');
      lbl.className = 'field-label'; lbl.textContent = f.label;
      wrap.appendChild(lbl);
      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea'); input.rows = f.rows || 3;
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        if (f.type === 'number') { input.inputMode = 'decimal'; input.step = f.step || 'any'; }
      }
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.value != null) input.value = f.value;
      if (f.maxlength) input.maxLength = f.maxlength;
      gInputs[f.key] = input;
      wrap.appendChild(input);
      els.gFields.appendChild(wrap);
    }
    els.gDelete.hidden = !gOnDelete;
    showSheet(els.gsheet);
    setTimeout(() => { const first = els.gFields.querySelector('input,textarea'); if (first) first.focus(); }, 260);
  }

  function gSave() {
    const values = {};
    for (const k in gInputs) values[k] = gInputs[k].value.trim();
    const err = gOnSave ? gOnSave(values) : null;
    if (err) return showErr(els.gError, err);
    closeSheet();
    renderActive();
  }
  function gDelete() {
    if (!gOnDelete) return;
    if (!confirm('Delete this?')) return;
    gOnDelete();
    closeSheet();
    renderActive();
  }

  // ============================================================
  //  INIT
  // ============================================================

  function init() {
    buildCategoryGrid();

    $('prev-day').addEventListener('click', () => changeDay(-1));
    $('next-day').addEventListener('click', () => changeDay(1));
    els.todayBtn.addEventListener('click', goToday);
    $('date-wrap').addEventListener('click', goToday);
    els.fab.addEventListener('click', () => openBlockSheet(null));
    els.cancelBtn.addEventListener('click', closeSheet);
    els.backdrop.addEventListener('click', closeSheet);
    els.deleteBtn.addEventListener('click', handleBlockDelete);
    els.form.addEventListener('submit', handleBlockSubmit);
    els.statusSeg.addEventListener('click', (e) => {
      const t = e.target.closest('.seg-btn'); if (!t) return;
      selectedStatus = t.dataset.status; syncStatusSeg();
    });

    els.gSave.addEventListener('click', gSave);
    els.gCancel.addEventListener('click', closeSheet);
    els.gDelete.addEventListener('click', gDelete);

    els.tabBar.addEventListener('click', (e) => {
      const b = e.target.closest('.tab-btn'); if (!b) return;
      setTab(b.dataset.tab);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (!els.sheet.hidden || !els.gsheet.hidden)) closeSheet();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const t = todayISO();
        if (viewDate !== t && viewDate === shiftDay(t, -1)) viewDate = t;
        renderActive();
      }
    });

    setInterval(updateNowLine, 30 * 1000);
    setInterval(() => { if (activeTab === 'day' && viewDate === todayISO()) renderDayHeader(); }, 60 * 1000);

    setTab('day');
    scrollToNowOrStart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
