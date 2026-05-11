(() => {
    'use strict';

    const EXERCISES = {
        gastroc: {
            name: 'Gastroc Calf Stretch',
            cue: 'Stand on the board, knees straight. Hips stacked over heels. Lean slightly forward until you feel a long stretch through the upper calf.',
            focus: 'Calf · ankle mobility',
            duration: 60,
        },
        soleus: {
            name: 'Soleus Calf Stretch',
            cue: 'Same stance, soften the knees a few degrees and sit back. Stretch should drop into the lower calf, just above the heel.',
            focus: 'Soleus · tarsal tunnel',
            duration: 60,
        },
        ankleMobility: {
            name: 'Ankle Mobility',
            cue: 'Off the board. Slow circles each direction, then trace the alphabet with each foot. Big, deliberate ranges.',
            focus: 'Ankle · nerve glide',
            duration: 60,
            sides: ['Right foot', 'Left foot'],
        },
        tibialis: {
            name: 'Tibialis Raises',
            cue: 'Heels on the floor (or board edge), lift the toes and balls of feet as high as possible. Slow up, slow down.',
            focus: 'Shin · ankle balance',
            duration: 60,
        },
        calfRaises: {
            name: 'Slow Calf Raises',
            cue: 'Heels flat to start. Press up tall onto the balls of your feet over 3 seconds, lower over 3 seconds. Controlled.',
            focus: 'Calf strength',
            duration: 60,
        },
        heelDrops: {
            name: 'Eccentric Heel Drops',
            cue: 'Balls of feet on the board edge. Press up with both, then slowly lower the heels below board level over 3-4 seconds.',
            focus: 'Achilles · calf eccentric',
            duration: 60,
        },
        spanishSquat: {
            name: 'Spanish Squat Hold',
            cue: 'Feet on board, loop a band or strap behind your knees anchored in front. Sit back into a quarter-squat and hold. Shins vertical.',
            focus: 'Patellar tendon iso',
            duration: 60,
        },
        declineSquat: {
            name: 'Slow Decline Squats',
            cue: 'Both feet on the board, toes down. Squat down over 3 seconds, up over 3. Let knees travel forward over toes. Stay pain-free.',
            focus: 'Patellar tendon (Stanish)',
            duration: 60,
        },
        singleLeg: {
            name: 'Single-Leg Balance + Short Foot',
            cue: 'Barefoot, off the board. Stand on one leg. Spread toes, draw the ball of your foot toward the heel to lift the arch. Switch at the halfway beep.',
            focus: 'Foot intrinsics · tibialis posterior',
            duration: 60,
            sides: ['Right leg', 'Left leg'],
        },
        finalStretch: {
            name: 'Gastroc + Nerve Glide',
            cue: 'Back on the board, knees straight. Slowly point and flex the toes while holding the stretch. Long exhales.',
            focus: 'Calf · posterior tibial nerve',
            duration: 60,
        },
        hamstring: {
            name: 'Hamstring Forward Fold',
            cue: 'Heels on the board, toes up. Hinge from the hips, soft knees, reach toward your shins. Breathe into the back of the legs.',
            focus: 'Posterior chain',
            duration: 60,
        },
        reverseLunge: {
            name: 'Slow Reverse Lunge',
            cue: 'Step back into a lunge, front knee tracks over the toes. Slow tempo, drive through the front heel to stand. Switch at halfway.',
            focus: 'Quad · glute · knee control',
            duration: 60,
            sides: ['Right leg forward', 'Left leg forward'],
        },
    };

    const ROUTINES = {
        quick: {
            label: '5 min · Quick',
            keys: ['gastroc', 'soleus', 'calfRaises', 'spanishSquat', 'declineSquat'],
        },
        standard: {
            label: '10 min · Standard',
            keys: [
                'gastroc', 'soleus', 'ankleMobility', 'tibialis', 'calfRaises',
                'heelDrops', 'spanishSquat', 'declineSquat', 'singleLeg', 'finalStretch',
            ],
        },
        extended: {
            label: '12 min · Extended',
            keys: [
                'gastroc', 'soleus', 'ankleMobility', 'tibialis', 'calfRaises',
                'heelDrops', 'spanishSquat', 'declineSquat', 'singleLeg',
                'hamstring', 'reverseLunge', 'finalStretch',
            ],
        },
    };

    const STORAGE_KEY = 'slantboard.routine';

    const $ = (sel) => document.querySelector(sel);

    const setupEl = $('#setup');
    const workoutEl = $('#workout');
    const doneEl = $('#done');
    const previewList = $('#preview-list');
    const startBtn = $('#start-btn');
    const exitBtn = $('#exit-btn');
    const playBtn = $('#play-btn');
    const playIcon = $('#play-icon');
    const prevBtn = $('#prev-btn');
    const nextBtn = $('#next-btn');
    const stepIndicator = $('#step-indicator');
    const progressFill = $('#progress-fill');
    const ringFg = $('#ring-fg');
    const timeRemainingEl = $('#time-remaining');
    const sideLabel = $('#side-label');
    const exerciseNameEl = $('#exercise-name');
    const exerciseCueEl = $('#exercise-cue');
    const exerciseFocusEl = $('#exercise-focus');
    const nextNameEl = $('#next-name');
    const doneSummary = $('#done-summary');
    const againBtn = $('#again-btn');
    const homeBtn = $('#home-btn');

    const RING_CIRCUMFERENCE = 2 * Math.PI * 100; // matches r=100 in SVG

    let selectedRoutine = localStorage.getItem(STORAGE_KEY) || 'standard';
    if (!ROUTINES[selectedRoutine]) selectedRoutine = 'standard';

    let session = null;
    let tickInterval = null;
    let audioCtx = null;
    let wakeLock = null;

    function initSetup() {
        document.querySelectorAll('.routine-card').forEach((btn) => {
            const isSelected = btn.dataset.routine === selectedRoutine;
            btn.classList.toggle('selected', isSelected);
            btn.setAttribute('aria-checked', String(isSelected));
            btn.addEventListener('click', () => {
                selectedRoutine = btn.dataset.routine;
                localStorage.setItem(STORAGE_KEY, selectedRoutine);
                document.querySelectorAll('.routine-card').forEach((b) => {
                    const sel = b.dataset.routine === selectedRoutine;
                    b.classList.toggle('selected', sel);
                    b.setAttribute('aria-checked', String(sel));
                });
                renderPreview();
            });
        });
        renderPreview();
        startBtn.addEventListener('click', startWorkout);
    }

    function renderPreview() {
        const keys = ROUTINES[selectedRoutine].keys;
        previewList.innerHTML = '';
        keys.forEach((k) => {
            const ex = EXERCISES[k];
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.textContent = ex.name;
            const focus = document.createElement('span');
            focus.className = 'px-focus';
            focus.textContent = ex.focus;
            li.appendChild(name);
            li.appendChild(focus);
            previewList.appendChild(li);
        });
    }

    function showScreen(screen) {
        for (const el of [setupEl, workoutEl, doneEl]) el.classList.add('hidden');
        screen.classList.remove('hidden');
    }

    function startWorkout() {
        const keys = ROUTINES[selectedRoutine].keys;
        session = {
            keys,
            index: 0,
            elapsed: 0,
            running: true,
            startedAt: Date.now(),
        };
        ensureAudio();
        requestWakeLock();
        showScreen(workoutEl);
        loadExercise();
        startTicker();
        updatePlayIcon();
    }

    function loadExercise() {
        const key = session.keys[session.index];
        const ex = EXERCISES[key];
        session.duration = ex.duration;
        session.elapsed = 0;

        exerciseNameEl.textContent = ex.name;
        exerciseCueEl.textContent = ex.cue;
        exerciseFocusEl.textContent = ex.focus;

        stepIndicator.textContent = `${session.index + 1} / ${session.keys.length}`;
        const overallPct = (session.index / session.keys.length) * 100;
        progressFill.style.width = `${overallPct}%`;

        const nextKey = session.keys[session.index + 1];
        nextNameEl.textContent = nextKey ? EXERCISES[nextKey].name : 'Done';

        updateTimerDisplay();
        updateSideLabel();
    }

    function updateTimerDisplay() {
        const remaining = Math.max(0, session.duration - session.elapsed);
        timeRemainingEl.textContent = String(remaining);

        const pct = session.elapsed / session.duration;
        const offset = RING_CIRCUMFERENCE * pct;
        ringFg.style.strokeDashoffset = offset;

        ringFg.classList.remove('warn', 'hot');
        if (remaining <= 3) ringFg.classList.add('hot');
        else if (remaining <= 10) ringFg.classList.add('warn');
    }

    function updateSideLabel() {
        const ex = EXERCISES[session.keys[session.index]];
        if (!ex.sides) {
            sideLabel.textContent = '';
            return;
        }
        const half = session.duration / 2;
        const idx = session.elapsed < half ? 0 : 1;
        sideLabel.textContent = ex.sides[idx];
    }

    function startTicker() {
        clearInterval(tickInterval);
        let lastTick = Date.now();
        tickInterval = setInterval(() => {
            if (!session || !session.running) return;
            const now = Date.now();
            const delta = (now - lastTick) / 1000;
            lastTick = now;
            session.elapsed += delta;

            const ex = EXERCISES[session.keys[session.index]];
            // Halfway beep for two-sided exercises
            if (ex.sides) {
                const half = session.duration / 2;
                if (session.elapsed >= half && session.elapsed - delta < half) {
                    beep(660, 0.12);
                }
            }

            // Final 3-2-1 beeps
            const remaining = session.duration - session.elapsed;
            const lastSecond = Math.ceil(session.duration - (session.elapsed - delta));
            const thisSecond = Math.ceil(remaining);
            if (lastSecond !== thisSecond && thisSecond >= 1 && thisSecond <= 3) {
                beep(880, 0.08);
            }

            if (session.elapsed >= session.duration) {
                beep(1320, 0.25);
                advance();
                return;
            }

            updateTimerDisplay();
            updateSideLabel();
        }, 100);
    }

    function advance() {
        session.index += 1;
        if (session.index >= session.keys.length) {
            finishWorkout();
            return;
        }
        loadExercise();
    }

    function finishWorkout() {
        clearInterval(tickInterval);
        tickInterval = null;
        const seconds = Math.round((Date.now() - session.startedAt) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        doneSummary.textContent = `${ROUTINES[selectedRoutine].label} · ${mins}m ${secs}s`;
        releaseWakeLock();
        showScreen(doneEl);
    }

    function togglePlay() {
        if (!session) return;
        session.running = !session.running;
        if (session.running) {
            ensureAudio();
            requestWakeLock();
            startTicker();
        }
        updatePlayIcon();
    }

    function updatePlayIcon() {
        playIcon.innerHTML = session && session.running ? '&#10074;&#10074;' : '&#9658;';
    }

    function exitWorkout() {
        if (!confirm('Exit workout?')) return;
        clearInterval(tickInterval);
        tickInterval = null;
        session = null;
        releaseWakeLock();
        showScreen(setupEl);
    }

    function ensureAudio() {
        if (audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return;
        }
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
    }

    function beep(freq, duration) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration + 0.02);
    }

    async function requestWakeLock() {
        if (!('wakeLock' in navigator)) return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (_) { /* ignore */ }
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().catch(() => {});
            wakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && session && session.running) {
            requestWakeLock();
        }
    });

    // Wire up workout controls
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', () => {
        if (!session) return;
        if (session.elapsed > 2 || session.index === 0) {
            session.elapsed = 0;
            updateTimerDisplay();
            updateSideLabel();
        } else {
            session.index -= 1;
            loadExercise();
        }
    });
    nextBtn.addEventListener('click', () => {
        if (!session) return;
        advance();
    });
    exitBtn.addEventListener('click', exitWorkout);
    againBtn.addEventListener('click', startWorkout);
    homeBtn.addEventListener('click', () => showScreen(setupEl));

    // Keyboard: space to play/pause, arrows to skip
    document.addEventListener('keydown', (e) => {
        if (workoutEl.classList.contains('hidden')) return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'ArrowRight') nextBtn.click();
        else if (e.code === 'ArrowLeft') prevBtn.click();
    });

    initSetup();
})();
