(() => {
  'use strict';

  const STORAGE_KEY = 'anchor_v1';
  const DAY_START_MIN = 5 * 60;
  const DAY_END_MIN = 23 * 60 + 30;
  const SNAP_MIN = 15;
  const DEFAULT_DURATION = 30;

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

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, blocks: {}, prefs: { lastCategory: 'soul' } };
      const parsed = JSON.parse(raw);
      if (!parsed.blocks) parsed.blocks = {};
      if (!parsed.prefs) parsed.prefs = { lastCategory: 'soul' };
      return parsed;
    } catch (_) {
      return { version: 1, blocks: {}, prefs: { lastCategory: 'soul' } };
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  let state = loadState();
  let viewDate = todayISO();
  let editingId = null;
  let selectedCategory = state.prefs.lastCategory || 'soul';
  let selectedStatus = 'planned';

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
  function toMin(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  function toHHMM(min) {
    min = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
    return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  }
  function fmt12(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const period = h >= 12 ? 'pm' : 'am';
    const h12 = ((h + 11) % 12) + 1;
    return m === 0 ? `${h12} ${period}` : `${h12}:${pad(m)} ${period}`;
  }
  function snap(min, step) {
    return Math.round(min / step) * step;
  }
  function uid() {
    return 'b_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function formatDateHeader(iso) {
    const d = parseISO(iso);
    const today = todayISO();
    const tomorrow = shiftDay(today, 1);
    const yesterday = shiftDay(today, -1);
    const wk = d.toLocaleDateString(undefined, { weekday: 'long' });
    const md = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    let label = wk.toUpperCase();
    if (iso === today) label = 'TODAY';
    else if (iso === tomorrow) label = 'TOMORROW';
    else if (iso === yesterday) label = 'YESTERDAY';
    return { label, date: md };
  }

  // ---------- Block CRUD ----------

  function getBlocks(iso) {
    const arr = state.blocks[iso] || [];
    return [...arr].sort((a, b) => toMin(a.start) - toMin(b.start));
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

  // ---------- Overlap packing ----------

  // Greedy column assignment. Returns blocks decorated with { _col, _cols } where
  // _cols is the column count for that block's overlap cluster.
  function packBlocks(blocks) {
    const items = blocks.map(b => ({
      ...b,
      _start: toMin(b.start),
      _end: toMin(b.end)
    })).sort((a, b) => a._start - b._start || a._end - b._end);

    let cluster = [];
    let clusterEnd = -1;
    const out = [];

    function flushCluster() {
      if (cluster.length === 0) return;
      const cols = [];
      for (const item of cluster) {
        let placed = false;
        for (let c = 0; c < cols.length; c++) {
          const last = cols[c][cols[c].length - 1];
          if (last._end <= item._start) {
            item._col = c;
            cols[c].push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          item._col = cols.length;
          cols.push([item]);
        }
      }
      const colCount = cols.length;
      for (const item of cluster) {
        item._cols = colCount;
        out.push(item);
      }
      cluster = [];
      clusterEnd = -1;
    }

    for (const it of items) {
      if (cluster.length === 0 || it._start < clusterEnd) {
        cluster.push(it);
        clusterEnd = Math.max(clusterEnd, it._end);
      } else {
        flushCluster();
        cluster.push(it);
        clusterEnd = it._end;
      }
    }
    flushCluster();
    return out;
  }

  // ---------- Render ----------

  const els = {
    weekday: document.getElementById('weekday'),
    date: document.getElementById('date'),
    summaryText: document.getElementById('summary-text'),
    todayBtn: document.getElementById('today-btn'),
    timeline: document.getElementById('timeline'),
    timelineWrap: document.getElementById('timeline-wrap'),
    emptyState: document.getElementById('empty-state'),
    fab: document.getElementById('fab'),
    sheet: document.getElementById('sheet'),
    backdrop: document.getElementById('sheet-backdrop'),
    sheetTitle: document.getElementById('sheet-title'),
    form: document.getElementById('sheet-form'),
    fTitle: document.getElementById('f-title'),
    fStart: document.getElementById('f-start'),
    fEnd: document.getElementById('f-end'),
    fNotes: document.getElementById('f-notes'),
    catGrid: document.getElementById('cat-grid'),
    statusField: document.getElementById('status-field'),
    statusSeg: document.getElementById('status-seg'),
    deleteBtn: document.getElementById('delete-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    error: document.getElementById('sheet-error')
  };

  function render() {
    renderHeader();
    renderTimeline();
  }

  function renderHeader() {
    const { label, date } = formatDateHeader(viewDate);
    els.weekday.textContent = label;
    els.date.textContent = date;
    const isToday = viewDate === todayISO();
    els.todayBtn.hidden = isToday;

    const blocks = getBlocks(viewDate);
    if (blocks.length === 0) {
      els.summaryText.textContent = 'No blocks yet';
    } else {
      const totalMin = blocks.reduce((s, b) => s + (toMin(b.end) - toMin(b.start)), 0);
      const doneMin = blocks.filter(b => b.status === 'done').reduce((s, b) => s + (toMin(b.end) - toMin(b.start)), 0);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
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
    const totalPx = `calc(${totalMins} * var(--px-per-min))`;
    tl.style.height = totalPx;
    tl.style.position = 'relative';

    // Hour rows + tap zones
    for (let h = Math.floor(DAY_START_MIN / 60); h <= Math.floor(DAY_END_MIN / 60); h++) {
      const row = document.createElement('div');
      row.className = 'hour-row';
      row.style.top = `calc(${h * 60 - DAY_START_MIN} * var(--px-per-min))`;
      row.style.position = 'absolute';
      row.style.left = '0';
      row.style.right = '0';
      // Last row shouldn't render past the timeline
      if (h * 60 >= DAY_END_MIN) row.style.height = '0';

      const lbl = document.createElement('div');
      lbl.className = 'hour-label';
      lbl.textContent = fmt12(h * 60).replace(' ', '');
      row.appendChild(lbl);

      if (h * 60 < DAY_END_MIN) {
        const half = document.createElement('div');
        half.className = 'half-tick';
        row.appendChild(half);

        const tap = document.createElement('div');
        tap.className = 'tap-zone';
        tap.dataset.hour = h;
        tap.addEventListener('click', onTapZoneClick);
        row.appendChild(tap);
      }

      tl.appendChild(row);
    }

    // Now line (only on today)
    if (viewDate === todayISO()) {
      const nm = nowMinutes();
      if (nm >= DAY_START_MIN && nm <= DAY_END_MIN) {
        const line = document.createElement('div');
        line.className = 'now-line';
        line.id = 'now-line';
        line.style.top = `calc(${nm - DAY_START_MIN} * var(--px-per-min))`;
        tl.appendChild(line);
      }
    }

    // Blocks
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
      meta.innerHTML = `<span class="dot" style="background:${cat.color}"></span><span class="cat-name">${cat.label}</span><span>&middot;</span><span>${fmt12(toMin(b.start))} – ${fmt12(toMin(b.end))}</span>`;
      el.appendChild(meta);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openSheet(b);
      });

      tl.appendChild(el);
    }
  }

  function updateNowLine() {
    const line = document.getElementById('now-line');
    if (!line) {
      if (viewDate === todayISO()) renderTimeline();
      return;
    }
    const nm = nowMinutes();
    if (nm < DAY_START_MIN || nm > DAY_END_MIN) {
      line.remove();
      return;
    }
    line.style.top = `calc(${nm - DAY_START_MIN} * var(--px-per-min))`;
  }

  function scrollToNowOrStart() {
    const wrap = els.timelineWrap;
    if (viewDate === todayISO()) {
      const nm = nowMinutes();
      if (nm >= DAY_START_MIN && nm <= DAY_END_MIN) {
        const px = (nm - DAY_START_MIN) * 1.1;
        wrap.scrollTop = Math.max(0, px - wrap.clientHeight * 0.35);
        return;
      }
    }
    const blocks = getBlocks(viewDate);
    if (blocks.length > 0) {
      const first = toMin(blocks[0].start);
      const px = (first - DAY_START_MIN) * 1.1;
      wrap.scrollTop = Math.max(0, px - 40);
    } else {
      // Default to 7am
      wrap.scrollTop = Math.max(0, (7 * 60 - DAY_START_MIN) * 1.1 - 40);
    }
  }

  // ---------- Sheet ----------

  function buildCategoryGrid() {
    els.catGrid.innerHTML = '';
    for (const c of CATEGORIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-btn';
      btn.dataset.cat = c.id;
      btn.setAttribute('role', 'radio');
      btn.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.label}`;
      btn.addEventListener('click', () => {
        selectedCategory = c.id;
        syncCategoryButtons();
      });
      els.catGrid.appendChild(btn);
    }
  }
  function syncCategoryButtons() {
    for (const btn of els.catGrid.querySelectorAll('.cat-btn')) {
      btn.classList.toggle('active', btn.dataset.cat === selectedCategory);
      btn.setAttribute('aria-checked', btn.dataset.cat === selectedCategory ? 'true' : 'false');
    }
  }
  function syncStatusSeg() {
    for (const btn of els.statusSeg.querySelectorAll('.seg-btn')) {
      btn.classList.toggle('active', btn.dataset.status === selectedStatus);
      btn.setAttribute('aria-checked', btn.dataset.status === selectedStatus ? 'true' : 'false');
    }
  }

  function openSheet(block) {
    els.error.hidden = true;
    els.error.textContent = '';

    if (block && block.id) {
      editingId = block.id;
      els.sheetTitle.textContent = 'Edit block';
      els.fTitle.value = block.title;
      els.fStart.value = block.start;
      els.fEnd.value = block.end;
      els.fNotes.value = block.notes || '';
      selectedCategory = block.category;
      selectedStatus = block.status || 'planned';
      els.statusField.hidden = false;
      els.deleteBtn.hidden = false;
    } else {
      editingId = null;
      els.sheetTitle.textContent = 'New block';
      els.fTitle.value = '';
      const startMin = (block && block.start) ? toMin(block.start) : snap(nowMinutes(), SNAP_MIN);
      const endMin = startMin + DEFAULT_DURATION;
      els.fStart.value = toHHMM(startMin);
      els.fEnd.value = toHHMM(endMin);
      els.fNotes.value = '';
      selectedCategory = state.prefs.lastCategory || 'soul';
      selectedStatus = 'planned';
      els.statusField.hidden = true;
      els.deleteBtn.hidden = true;
    }
    syncCategoryButtons();
    syncStatusSeg();

    els.backdrop.hidden = false;
    els.sheet.hidden = false;
    // Force reflow then animate
    requestAnimationFrame(() => {
      els.backdrop.classList.add('show');
      els.sheet.classList.add('show');
    });
  }

  function closeSheet() {
    els.backdrop.classList.remove('show');
    els.sheet.classList.remove('show');
    setTimeout(() => {
      els.backdrop.hidden = true;
      els.sheet.hidden = true;
    }, 240);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = els.fTitle.value.trim();
    const start = els.fStart.value;
    const end = els.fEnd.value;
    const notes = els.fNotes.value.trim();

    if (!title) return showError('Give it a name.');
    if (!start || !end) return showError('Pick a start and end time.');
    const sMin = toMin(start);
    const eMin = toMin(end);
    if (eMin <= sMin) return showError('End time must be after start time.');

    const block = {
      id: editingId || uid(),
      date: viewDate,
      title,
      start,
      end,
      category: selectedCategory,
      notes,
      status: editingId ? selectedStatus : 'planned'
    };
    upsertBlock(block);
    state.prefs.lastCategory = selectedCategory;
    saveState();
    closeSheet();
    render();
  }

  function showError(msg) {
    els.error.textContent = msg;
    els.error.hidden = false;
  }

  function handleDelete() {
    if (!editingId) return;
    if (!confirm('Delete this block?')) return;
    removeBlock(viewDate, editingId);
    closeSheet();
    render();
  }

  // ---------- Tap empty hour ----------

  function onTapZoneClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const yWithin = e.clientY - rect.top;
    const hour = Number(e.currentTarget.dataset.hour);
    const minInHour = Math.max(0, Math.min(59, Math.round(yWithin / 1.1)));
    const startMin = snap(hour * 60 + minInHour, SNAP_MIN);
    openSheet({ start: toHHMM(startMin) });
  }

  // ---------- Day nav ----------

  function changeDay(delta) {
    viewDate = shiftDay(viewDate, delta);
    render();
    scrollToNowOrStart();
  }
  function goToday() {
    viewDate = todayISO();
    render();
    scrollToNowOrStart();
  }

  // ---------- Wire up ----------

  function init() {
    buildCategoryGrid();

    document.getElementById('prev-day').addEventListener('click', () => changeDay(-1));
    document.getElementById('next-day').addEventListener('click', () => changeDay(1));
    document.getElementById('today-btn').addEventListener('click', goToday);
    document.getElementById('date-wrap').addEventListener('click', goToday);

    els.fab.addEventListener('click', () => openSheet(null));
    els.cancelBtn.addEventListener('click', closeSheet);
    els.backdrop.addEventListener('click', closeSheet);
    els.deleteBtn.addEventListener('click', handleDelete);
    els.form.addEventListener('submit', handleSubmit);

    els.statusSeg.addEventListener('click', (e) => {
      const t = e.target.closest('.seg-btn');
      if (!t) return;
      selectedStatus = t.dataset.status;
      syncStatusSeg();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.sheet.hidden) closeSheet();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const newToday = todayISO();
        // If user keeps the app open across midnight on today's view, follow along.
        if (viewDate !== newToday && viewDate === shiftDay(newToday, -1)) {
          viewDate = newToday;
        }
        render();
      }
    });

    setInterval(updateNowLine, 30 * 1000);
    setInterval(() => { if (viewDate === todayISO()) renderHeader(); }, 60 * 1000);

    render();
    scrollToNowOrStart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
