(() => {
    'use strict';

    // ---------- Constants ----------

    const STORAGE_KEY = 'clay.state.v1';
    const CM_PER_IN = 2.54;
    const KG_PER_LB = 0.45359237;

    // Field definitions. All values stored internally in cm and kg.
    // `kind` controls how the value is used in the figure:
    //   - "length" = a linear dimension (height, shoulder width)
    //   - "circ"   = circumference, converted to silhouette width via /π
    //   - "mass"   = body mass (kg / lb)
    const FIELDS = [
        { key: 'height',   label: 'Height',     kind: 'length', default: 175 },
        { key: 'weight',   label: 'Weight',     kind: 'mass',   default: 75 },
        { key: 'shoulder', label: 'Shoulders',  kind: 'length', default: 46 },
        { key: 'chest',    label: 'Chest',      kind: 'circ',   default: 100 },
        { key: 'waist',    label: 'Waist',      kind: 'circ',   default: 85 },
        { key: 'hip',      label: 'Hips',       kind: 'circ',   default: 95 },
        { key: 'neck',     label: 'Neck',       kind: 'circ',   default: 38 },
        { key: 'bicep',    label: 'Biceps',     kind: 'circ',   default: 33 },
        { key: 'thigh',    label: 'Thighs',     kind: 'circ',   default: 56 },
        { key: 'calf',     label: 'Calves',     kind: 'circ',   default: 38 }
    ];

    const FIELD_MAP = Object.fromEntries(FIELDS.map(f => [f.key, f]));

    // ---------- State ----------

    function defaultMeasurements() {
        const m = {};
        for (const f of FIELDS) m[f.key] = f.default;
        return m;
    }

    function defaultGoal() {
        // Goal seeded with a leaner profile by default.
        const m = defaultMeasurements();
        m.waist = 78;
        m.chest = 104;
        m.shoulder = 48;
        m.bicep = 36;
        m.hip = 93;
        return m;
    }

    const state = {
        units: 'cm',
        mode: 'current',
        current: defaultMeasurements(),
        goal: defaultGoal(),
        history: [] // [{id, date, measurements}]
    };

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved.units === 'in' || saved.units === 'cm') state.units = saved.units;
            if (saved.current) Object.assign(state.current, saved.current);
            if (saved.goal) Object.assign(state.goal, saved.goal);
            if (Array.isArray(saved.history)) state.history = saved.history;
        } catch (e) {
            // Ignore corrupt storage, fall back to defaults.
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                units: state.units,
                current: state.current,
                goal: state.goal,
                history: state.history
            }));
        } catch (e) {
            // Storage full or disabled — silent.
        }
    }

    // ---------- Unit helpers ----------

    function toDisplay(value, kind) {
        if (state.units === 'in' && (kind === 'length' || kind === 'circ')) {
            return value / CM_PER_IN;
        }
        if (state.units === 'in' && kind === 'mass') {
            return value / KG_PER_LB;
        }
        return value;
    }

    function fromDisplay(value, kind) {
        if (state.units === 'in' && (kind === 'length' || kind === 'circ')) {
            return value * CM_PER_IN;
        }
        if (state.units === 'in' && kind === 'mass') {
            return value * KG_PER_LB;
        }
        return value;
    }

    function unitLabel(kind) {
        if (kind === 'mass') return state.units === 'in' ? 'lb' : 'kg';
        return state.units === 'in' ? 'in' : 'cm';
    }

    function fmt(value, kind) {
        const v = toDisplay(value, kind);
        return Number.isFinite(v) ? (Math.round(v * 10) / 10).toString() : '';
    }

    // ---------- Figure geometry ----------
    //
    // We treat each measurement in cm and map directly to SVG units.
    // The figure stands on a floor line at y = FLOOR. We use eight-head
    // classical proportions: total height = 8 * headHeight.

    const FLOOR = 370;
    const CENTER_X = 0;
    const SCALE = 1.9; // cm -> SVG unit. Makes a ~175cm figure fill the canvas.

    function buildSilhouette(m) {
        const cm = Math.max(120, Math.min(230, m.height));
        const h = cm * SCALE;
        const headH = h / 8;
        const halfHeadW = headH * 0.32;

        // Vertical anchors, measured from top of head (y = topHead).
        const topHead = FLOOR - h;
        const chin = topHead + headH;
        const neckBot = topHead + headH * 1.35;
        const shoulderY = neckBot;
        const chestY = topHead + headH * 2.3;
        const waistY = topHead + headH * 3.4;
        const hipY = topHead + headH * 4.0;
        const kneeY = topHead + headH * 6.0;
        const ankleY = FLOOR;

        // Half-widths from center axis, scaled to SVG units.
        const neckHalf = ((m.neck / Math.PI) / 2) * SCALE;
        const shoulderHalf = (m.shoulder / 2) * SCALE;
        const chestHalf = ((m.chest / Math.PI) / 2) * SCALE;
        const waistHalf = ((m.waist / Math.PI) / 2) * SCALE;
        const hipHalf = ((m.hip / Math.PI) / 2) * SCALE;
        const bicepHalf = ((m.bicep / Math.PI) / 2) * SCALE;
        const thighHalf = ((m.thigh / Math.PI) / 2) * SCALE;
        const calfHalf = ((m.calf / Math.PI) / 2) * SCALE;

        // Mass nudges the soft-tissue thickness very slightly so weight
        // shows up even when other measures haven't been updated.
        const massScale = 1 + ((m.weight - 75) / 75) * 0.03;
        const soft = (v) => v * massScale;

        const torso = buildTorso({
            neckTop: neckBot,
            shoulderY,
            chestY,
            waistY,
            hipY,
            neckHalf: soft(neckHalf),
            shoulderHalf,
            chestHalf: soft(chestHalf),
            waistHalf: soft(waistHalf),
            hipHalf: soft(hipHalf)
        });

        const arms = buildArms({
            shoulderY,
            shoulderHalf,
            hipY,
            bicepHalf: soft(bicepHalf)
        });

        const legs = buildLegs({
            hipY,
            kneeY,
            ankleY,
            hipHalf: soft(hipHalf),
            thighHalf: soft(thighHalf),
            calfHalf: soft(calfHalf)
        });

        const head = { cx: CENTER_X, cy: topHead + headH * 0.55, rx: halfHeadW, ry: headH * 0.55 };

        return { head, torso, arms, legs };
    }

    function buildTorso({ neckTop, shoulderY, chestY, waistY, hipY,
                          neckHalf, shoulderHalf, chestHalf, waistHalf, hipHalf }) {
        // Right side from top of neck down to hip crotch, then mirror back up.
        const x = (v) => v;
        const y = (v) => v;
        const r = shoulderHalf;
        const c = chestHalf;
        const w = waistHalf;
        const hp = hipHalf;
        const n = neckHalf;

        // Trapezoidal smooth path
        const d = [
            `M ${-n} ${neckTop}`,
            // shoulder left
            `C ${-n} ${shoulderY - 4} ${-r * 0.85} ${shoulderY - 6} ${-r} ${shoulderY}`,
            // shoulder line to chest
            `C ${-r} ${shoulderY + 8} ${-c} ${chestY - 12} ${-c} ${chestY}`,
            // chest to waist
            `C ${-c} ${chestY + 14} ${-w} ${waistY - 18} ${-w} ${waistY}`,
            // waist to hip
            `C ${-w} ${waistY + 14} ${-hp} ${hipY - 18} ${-hp} ${hipY}`,
            // crotch
            `L ${hp} ${hipY}`,
            // hip back up to waist (right)
            `C ${hp} ${hipY - 18} ${w} ${waistY + 14} ${w} ${waistY}`,
            // waist to chest
            `C ${w} ${waistY - 18} ${c} ${chestY + 14} ${c} ${chestY}`,
            // chest to shoulder
            `C ${c} ${chestY - 12} ${r} ${shoulderY + 8} ${r} ${shoulderY}`,
            // shoulder to neck
            `C ${r * 0.85} ${shoulderY - 6} ${n} ${shoulderY - 4} ${n} ${neckTop}`,
            // neck top
            `L ${-n} ${neckTop}`,
            'Z'
        ].join(' ');
        return d;
    }

    function buildArms({ shoulderY, shoulderHalf, hipY, bicepHalf }) {
        // Arm hangs from shoulder down past hip. The right arm path uses
        // positive x; the left is rendered via scale(-1, 1).
        const armLen = (hipY - shoulderY) * 1.15;
        const armBotY = shoulderY + armLen;
        const bicepY = shoulderY + armLen * 0.28;
        const elbowY = shoulderY + armLen * 0.58;
        const wristHalf = bicepHalf * 0.5;

        // X coordinates for outer and inner edges at each level.
        const shoulderOuter = shoulderHalf + 1;
        const bicepOuter = shoulderHalf + bicepHalf;
        const elbowOuter = shoulderHalf + bicepHalf * 0.55;
        const wristOuter = shoulderHalf + wristHalf;
        const shoulderInner = shoulderHalf - bicepHalf * 0.2;
        const bicepInner = shoulderHalf - bicepHalf * 0.35;
        const elbowInner = shoulderHalf - bicepHalf * 0.05;
        const wristInner = shoulderHalf - wristHalf * 0.5;

        const right =
            // Start at shoulder seam (top outer).
            `M ${shoulderOuter} ${shoulderY} ` +
            // Outer edge: shoulder -> bicep -> elbow -> wrist.
            `C ${bicepOuter} ${shoulderY + 8} ${bicepOuter + 1} ${bicepY - 4} ${bicepOuter} ${bicepY} ` +
            `C ${bicepOuter - 1} ${bicepY + 10} ${elbowOuter + 1} ${elbowY - 8} ${elbowOuter} ${elbowY} ` +
            `C ${elbowOuter - 1} ${elbowY + 12} ${wristOuter} ${armBotY - 8} ${wristOuter} ${armBotY} ` +
            // Wrist cap.
            `L ${wristInner} ${armBotY} ` +
            // Inner edge back up: wrist -> elbow -> bicep -> shoulder.
            `C ${wristInner} ${armBotY - 8} ${elbowInner} ${elbowY + 8} ${elbowInner} ${elbowY} ` +
            `C ${elbowInner - 1} ${elbowY - 10} ${bicepInner + 1} ${bicepY + 6} ${bicepInner} ${bicepY} ` +
            `C ${bicepInner - 1} ${bicepY - 8} ${shoulderInner} ${shoulderY + 6} ${shoulderInner} ${shoulderY + 2} ` +
            'Z';

        return { right };
    }

    function buildLegs({ hipY, kneeY, ankleY, hipHalf, thighHalf, calfHalf }) {
        // Each leg as a path from hip down to ankle, with thigh and calf widths.
        const gap = 2; // gap between legs at crotch
        const innerTop = gap;
        const outerTop = hipHalf;
        const thighOuter = thighHalf + (hipHalf - thighHalf) * 0.0;
        const calfOuter = calfHalf;
        const ankleHalf = calfHalf * 0.45;

        // Right leg
        const right =
            `M ${innerTop} ${hipY} ` +
            // outer line down to ankle
            `L ${outerTop} ${hipY} ` +
            `C ${outerTop + 2} ${hipY + 20} ${thighOuter + 2} ${(hipY + kneeY) / 2} ${thighOuter} ${kneeY - 6} ` +
            `C ${thighOuter - 4} ${kneeY + 6} ${calfOuter + 2} ${(kneeY + ankleY) / 2} ${calfOuter} ${ankleY - 10} ` +
            `C ${calfOuter} ${ankleY - 4} ${ankleHalf + 4} ${ankleY} ${ankleHalf} ${ankleY} ` +
            // inner line back up
            `L ${innerTop * 0.6} ${ankleY} ` +
            `C ${innerTop} ${(kneeY + ankleY) / 2} ${innerTop} ${kneeY} ${innerTop} ${kneeY - 4} ` +
            `C ${innerTop} ${(hipY + kneeY) / 2} ${innerTop} ${hipY + 6} ${innerTop} ${hipY} Z`;

        return { right };
    }

    // ---------- SVG rendering ----------

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function el(name, attrs) {
        const e = document.createElementNS(SVG_NS, name);
        if (attrs) {
            for (const k in attrs) e.setAttribute(k, attrs[k]);
        }
        return e;
    }

    function renderFigure(svg, options) {
        const { current, goal, small } = options;
        svg.setAttribute('viewBox', '-100 0 200 380');
        svg.innerHTML = '';

        // Subtle floor line.
        const floor = el('line', {
            x1: -70, y1: FLOOR + 4, x2: 70, y2: FLOOR + 4,
            stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1.2
        });
        svg.appendChild(floor);

        if (current) drawSilhouette(svg, current, { fill: true, gradient: !small });
        if (goal) drawSilhouette(svg, goal, { fill: false, stroke: '#8cc6e3', dash: '5 4', opacity: 1, strokeWidth: 2.2 });
    }

    function drawSilhouette(svg, m, opts) {
        const shape = buildSilhouette(m);
        const group = el('g', {});
        if (opts.fill) {
            group.setAttribute('fill', opts.gradient ? 'url(#clay-grad)' : '#d99860');
            group.setAttribute('stroke', '#7a4e23');
            group.setAttribute('stroke-width', '1');
            group.setAttribute('stroke-linejoin', 'round');
        } else {
            group.setAttribute('fill', 'none');
            group.setAttribute('stroke', opts.stroke);
            group.setAttribute('stroke-width', String(opts.strokeWidth ?? 1.6));
            group.setAttribute('stroke-dasharray', opts.dash || '');
            group.setAttribute('stroke-linejoin', 'round');
            group.setAttribute('opacity', opts.opacity ?? 1);
        }

        if (opts.gradient && !svg.querySelector('#clay-grad')) {
            const defs = el('defs');
            const grad = el('linearGradient', {
                id: 'clay-grad', x1: '0', y1: '0', x2: '1', y2: '1'
            });
            const s1 = el('stop', { offset: '0%', 'stop-color': '#e6a872' });
            const s2 = el('stop', { offset: '60%', 'stop-color': '#c97a3a' });
            const s3 = el('stop', { offset: '100%', 'stop-color': '#8a4e1f' });
            grad.appendChild(s1); grad.appendChild(s2); grad.appendChild(s3);
            defs.appendChild(grad);
            svg.appendChild(defs);
        }

        // Legs
        group.appendChild(el('path', { d: shape.legs.right }));
        group.appendChild(el('path', { d: shape.legs.right, transform: 'scale(-1,1)' }));

        // Torso
        group.appendChild(el('path', { d: shape.torso }));

        // Arms (drawn after torso so they sit on top at the shoulder seam)
        group.appendChild(el('path', { d: shape.arms.right }));
        group.appendChild(el('path', { d: shape.arms.right, transform: 'scale(-1,1)' }));

        // Head
        group.appendChild(el('ellipse', {
            cx: shape.head.cx, cy: shape.head.cy,
            rx: shape.head.rx, ry: shape.head.ry
        }));

        svg.appendChild(group);
    }

    // ---------- DOM wiring ----------

    const figureSvg = document.getElementById('figure');
    const fieldsEl = document.getElementById('fields');
    const historyListEl = document.getElementById('history-list');
    const historyEmptyEl = document.getElementById('history-empty');
    const historyCountEl = document.getElementById('history-count');
    const readoutBmi = document.getElementById('readout-bmi');
    const readoutWhr = document.getElementById('readout-whr');
    const readoutSwr = document.getElementById('readout-swr');

    function buildFields() {
        fieldsEl.innerHTML = '';
        for (const f of FIELDS) {
            const wrap = document.createElement('label');
            wrap.className = 'field';
            wrap.setAttribute('for', `f-${f.key}`);
            wrap.innerHTML = `
                <label for="f-${f.key}">${f.label}<span class="unit" data-unit="${f.key}">${unitLabel(f.kind)}</span></label>
                <input id="f-${f.key}" data-key="${f.key}" type="number" inputmode="decimal" step="0.1" min="0" />
            `;
            const input = wrap.querySelector('input');
            input.addEventListener('input', () => {
                const raw = parseFloat(input.value);
                if (!Number.isFinite(raw) || raw < 0) return;
                const cm = fromDisplay(raw, f.kind);
                state[state.mode][f.key] = cm;
                save();
                renderAll();
            });
            fieldsEl.appendChild(wrap);
        }
    }

    function syncFieldValues() {
        const m = state[state.mode];
        for (const f of FIELDS) {
            const input = fieldsEl.querySelector(`input[data-key="${f.key}"]`);
            if (!input) continue;
            const display = fmt(m[f.key], f.kind);
            if (document.activeElement !== input) input.value = display;
            const unitEl = fieldsEl.querySelector(`[data-unit="${f.key}"]`);
            if (unitEl) unitEl.textContent = unitLabel(f.kind);
        }
    }

    function renderReadouts() {
        const m = state.current;
        // BMI = kg / (m^2)
        const heightM = m.height / 100;
        const bmi = heightM > 0 ? m.weight / (heightM * heightM) : 0;
        readoutBmi.textContent = bmi > 0 ? bmi.toFixed(1) : '—';

        const whr = m.hip > 0 ? (m.waist / m.hip) : 0;
        readoutWhr.textContent = whr > 0 ? whr.toFixed(2) : '—';

        const swr = m.waist > 0 ? (m.shoulder / (m.waist / Math.PI)) : 0;
        readoutSwr.textContent = swr > 0 ? swr.toFixed(2) : '—';
    }

    function renderHistory() {
        historyListEl.innerHTML = '';
        const has = state.history.length > 0;
        historyEmptyEl.classList.toggle('hidden', has);
        historyListEl.classList.toggle('hidden', !has);
        historyCountEl.textContent = `${state.history.length} snapshot${state.history.length === 1 ? '' : 's'}`;

        // Newest first
        const sorted = [...state.history].sort((a, b) => b.date.localeCompare(a.date));
        for (const snap of sorted) {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.title = 'Load into editor';

            const miniSvg = document.createElementNS(SVG_NS, 'svg');
            miniSvg.setAttribute('viewBox', '-100 0 200 380');
            renderFigure(miniSvg, { current: snap.measurements, small: true });
            card.appendChild(miniSvg);

            const date = document.createElement('div');
            date.className = 'date';
            date.textContent = formatDate(snap.date);
            card.appendChild(date);

            const del = document.createElement('button');
            del.className = 'delete';
            del.setAttribute('aria-label', 'Delete snapshot');
            del.textContent = '×';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                state.history = state.history.filter(s => s.id !== snap.id);
                save();
                renderHistory();
            });
            card.appendChild(del);

            card.addEventListener('click', () => {
                state[state.mode] = { ...snap.measurements };
                save();
                renderAll();
            });

            historyListEl.appendChild(card);
        }
    }

    function formatDate(iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderAll() {
        renderFigure(figureSvg, { current: state.current, goal: state.goal });
        renderReadouts();
        syncFieldValues();
    }

    // ---------- Mode + units toggles ----------

    document.querySelectorAll('.seg-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            if (mode === state.mode) return;
            state.mode = mode;
            document.querySelectorAll('.seg-btn[data-mode]').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === mode);
            });
            document.body.classList.toggle('mode-goal', mode === 'goal');
            syncFieldValues();
        });
    });

    document.querySelectorAll('.seg-btn[data-units]').forEach(btn => {
        btn.addEventListener('click', () => {
            const units = btn.dataset.units;
            if (units === state.units) return;
            state.units = units;
            document.querySelectorAll('.seg-btn[data-units]').forEach(b => {
                b.classList.toggle('active', b.dataset.units === units);
            });
            save();
            syncFieldValues();
        });
    });

    document.getElementById('snapshot-btn').addEventListener('click', () => {
        const snap = {
            id: `s${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            date: new Date().toISOString(),
            measurements: { ...state.current }
        };
        state.history.push(snap);
        save();
        renderHistory();
    });

    document.getElementById('copy-goal-btn').addEventListener('click', () => {
        state.goal = { ...state.current };
        save();
        renderAll();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (state.mode === 'goal') {
            state.goal = defaultGoal();
        } else {
            state.current = defaultMeasurements();
        }
        save();
        renderAll();
    });

    // ---------- Init ----------

    load();
    buildFields();
    renderAll();
    renderHistory();
})();
