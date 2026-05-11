(() => {
    'use strict';

    // Sub-steps of the Original 12-Minute sequence. Cues are short
    // movement reminders, not the spoken script from the video.
    const STEPS = [
        // 1. The Founder
        { phase: 'The Founder', name: 'Set & raise arms', cue: 'Wide stance, soft knees, hips back, chest tall. Arms reach behind, then slowly sweep up in front.', duration: 15 },
        { phase: 'The Founder', name: '15 Good Mornings', cue: 'Arms crossed at the chest. 15 slow forward hinges from the hips. Back stays braced.', duration: 45 },
        { phase: 'The Founder', name: 'Arms back', cue: 'Push your arms straight back behind you.', duration: 5 },
        { phase: 'The Founder', name: 'Arms forward, lift high', cue: 'Arms straight out front, lift them high. Hold as tight as you can.', duration: 10 },
        { phase: 'The Founder', name: 'Thumbs down, higher', cue: 'Rotate thumbs down. Lift the arms even higher. Squeeze.', duration: 5 },

        // 2. Forward Fold
        { phase: 'Forward Fold', name: 'Deep stretch', cue: 'Knees bent. Walk hands forward 6–12 in. Weight in the heels, hips pull back. Long breaths.', duration: 35 },

        // 3. Half-Lift / Extension
        { phase: 'Half-Lift', name: 'Brace & arms back', cue: 'Hands to shins. Brace, arch the lower spine. Push arms straight back.', duration: 8 },
        { phase: 'Half-Lift', name: 'Arms slowly up', cue: 'Bring arms up without lifting the chest. Hold tight.', duration: 10 },
        { phase: 'Half-Lift', name: 'Stand up', cue: 'Stand all the way up.', duration: 5 },

        // 4. Decompression Lunge — Right forward
        { phase: 'Lunge · Right forward', name: 'Setup & side-bend', cue: 'Right leg forward, left back. Arms straight up, extend back, side-bend right. Stretch the left hip flexor.', duration: 12 },
        { phase: 'Lunge · Right forward', name: '10 back-foot calf raises', cue: 'Keep posture stable. Press up onto the toes of the back foot. 10 reps.', duration: 25 },

        // 5. Woodpecker — Right
        { phase: 'Woodpecker · Right', name: 'Arms back, thumbs out', cue: 'Drop the arms, open the chest, press torso forward over the right hip. Arms back, thumbs out, shoulder blades down. Hold.', duration: 12 },
        { phase: 'Woodpecker · Right', name: 'Arms forward & high', cue: 'Bring arms all the way forward and lift them high.', duration: 8 },
        { phase: 'Woodpecker · Right', name: 'Rotate right · hold or reps', cue: 'Lower arms about 6 in. Rotate torso out to the right. Static hold or 10–15 small lifts.', duration: 30 },
        { phase: 'Woodpecker · Right', name: '10 forward hinges, stand', cue: 'Return to center. Arms crossed at chest. 10 forward hinges, then stand all the way up.', duration: 28 },

        // 6. Decompression Lunge — Left forward
        { phase: 'Lunge · Left forward', name: 'Setup & side-bend', cue: 'Switch: left leg forward, right back. Arms up, extend back, side-bend left.', duration: 12 },
        { phase: 'Lunge · Left forward', name: '~10 back-foot calf raises', cue: 'Press up onto the toes of the back foot. About 10 reps.', duration: 25 },

        // 7. Woodpecker — Left
        { phase: 'Woodpecker · Left', name: 'Chest forward, arms out', cue: 'Press the chest forward over the left hip. Reach arms straight out ahead.', duration: 12 },
        { phase: 'Woodpecker · Left', name: 'Rotate left · hold or reps', cue: 'Lower the arms. Rotate torso out to the left. Static hold or 10 reps.', duration: 30 },
        { phase: 'Woodpecker · Left', name: '10 forward hinges, stand', cue: 'Return to center. Arms crossed at chest. 10 forward hinges, then stand.', duration: 28 },

        // 8. Wide Stance Founder
        { phase: 'Wide Stance Founder', name: 'Setup', cue: 'Extremely wide stance. Knees bent, back braced, arms reaching back.', duration: 6 },
        { phase: 'Wide Stance Founder', name: 'Arms forward, hold', cue: 'Bring arms straight out in front. Hold tight.', duration: 12 },
        { phase: 'Wide Stance Founder', name: '10 slow Good Mornings', cue: 'Arms crossed at chest. 10 slow Good Mornings.', duration: 32 },
        { phase: 'Wide Stance Founder', name: 'Arms back, then high', cue: 'Push arms straight back, then lift them high without raising the chest.', duration: 12 },

        // 9. Wide Stance Forward Fold & Rotations
        { phase: 'Wide Fold + Rotations', name: 'Fold & set hands', cue: 'Stretch all the way down. Walk hands forward a few inches, hips pull back.', duration: 8 },
        { phase: 'Wide Fold + Rotations', name: '10 rotations · left arm up', cue: 'Right hand planted. Left arm rotates up toward the sky, full range. 10 reps.', duration: 28 },
        { phase: 'Wide Fold + Rotations', name: '10 rotations · right arm up', cue: 'Switch. Left hand planted. Right arm rotates up. 10 reps.', duration: 28 },

        // 10. Half-Lift & 90° Forearm Presses
        { phase: 'Half-Lift + 90° Press', name: 'Brace & arms back', cue: 'Hands to shins. Arch the lower back hard. Push arms straight back.', duration: 6 },
        { phase: 'Half-Lift + 90° Press', name: '10 Good Mornings', cue: 'Arms crossed at chest. 10 forward hinges.', duration: 25 },
        { phase: 'Half-Lift + 90° Press', name: '90° presses · 10–15 lifts', cue: 'Arms out front. Elbows, palms, and fingers pressed together at 90°. 10–15 upward lifts — forearms stay glued.', duration: 28 },
        { phase: 'Half-Lift + 90° Press', name: 'Arms back, then up', cue: 'Push arms straight back. Then slowly lift them as high as possible.', duration: 12 },
        { phase: 'Half-Lift + 90° Press', name: '90° presses · set 2', cue: 'Elbows back together at 90°. 10 more upward lifts.', duration: 22 },
        { phase: 'Half-Lift + 90° Press', name: 'Arms back, stand', cue: 'Push arms behind you, then stand all the way up.', duration: 8 },

        // 11. Finishing Lunge Stretch
        { phase: 'Finishing Lunge', name: 'Right side, one breath', cue: 'Right leg forward. Arms up, extend back, side-bend right. One deep breath.', duration: 8 },
        { phase: 'Finishing Lunge', name: 'Left side, one breath', cue: 'Switch. Left leg forward. Arms up, extend back, side-bend left. One deep breath.', duration: 8 },
        { phase: 'Finishing Lunge', name: 'Stand & shake out', cue: 'Arms drop. Stand up. Shake it out.', duration: 6 },
    ];

    const $ = (sel) => document.querySelector(sel);

    const setupEl = $('#setup');
    const workoutEl = $('#workout');
    const doneEl = $('#done');
    const previewList = $('#preview-list');
    const totalTimeEl = $('#total-time');
    const totalStepsEl = $('#total-steps');
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
    const phaseStepEl = $('#phase-step');
    const phaseTag = $('#phase-tag');
    const exerciseNameEl = $('#exercise-name');
    const exerciseCueEl = $('#exercise-cue');
    const nextNameEl = $('#next-name');
    const doneSummary = $('#done-summary');
    const againBtn = $('#again-btn');
    const homeBtn = $('#home-btn');

    const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

    let session = null;
    let tickInterval = null;
    let audioCtx = null;
    let wakeLock = null;

    const phaseGroups = (() => {
        const groups = [];
        for (const step of STEPS) {
            const last = groups[groups.length - 1];
            if (last && last.phase === step.phase) {
                last.steps += 1;
                last.duration += step.duration;
            } else {
                groups.push({ phase: step.phase, steps: 1, duration: step.duration });
            }
        }
        return groups;
    })();

    function fmtTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s === 0 ? `${m}m` : `${m}m ${s}s`;
    }

    function initSetup() {
        previewList.innerHTML = '';
        for (const g of phaseGroups) {
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.textContent = g.phase;
            const info = document.createElement('span');
            info.className = 'px-info';
            info.textContent = `${g.steps} step${g.steps > 1 ? 's' : ''} · ${fmtTime(g.duration)}`;
            li.appendChild(name);
            li.appendChild(info);
            previewList.appendChild(li);
        }
        const total = STEPS.reduce((a, s) => a + s.duration, 0);
        totalTimeEl.textContent = `~${Math.round(total / 60)} min`;
        totalStepsEl.textContent = `${STEPS.length} steps`;
        startBtn.addEventListener('click', startWorkout);
    }

    function showScreen(screen) {
        for (const el of [setupEl, workoutEl, doneEl]) el.classList.add('hidden');
        screen.classList.remove('hidden');
    }

    function startWorkout() {
        session = {
            index: 0,
            elapsed: 0,
            running: true,
            startedAt: Date.now(),
        };
        ensureAudio();
        requestWakeLock();
        showScreen(workoutEl);
        loadStep();
        startTicker();
        updatePlayIcon();
    }

    function phasePosition(index) {
        const target = STEPS[index].phase;
        let inPhaseIndex = 0;
        let phaseLen = 0;
        for (let i = 0; i < STEPS.length; i++) {
            if (STEPS[i].phase === target) {
                phaseLen += 1;
                if (i < index) inPhaseIndex += 1;
            }
        }
        return { inPhaseIndex: inPhaseIndex + 1, phaseLen };
    }

    function loadStep() {
        const step = STEPS[session.index];
        session.duration = step.duration;
        session.elapsed = 0;

        phaseTag.textContent = step.phase;
        exerciseNameEl.textContent = step.name;
        exerciseCueEl.textContent = step.cue;

        const pos = phasePosition(session.index);
        phaseStepEl.textContent = `${pos.inPhaseIndex} of ${pos.phaseLen}`;

        stepIndicator.textContent = `${session.index + 1} / ${STEPS.length}`;
        const overallPct = (session.index / STEPS.length) * 100;
        progressFill.style.width = `${overallPct}%`;

        const nextStep = STEPS[session.index + 1];
        nextNameEl.textContent = nextStep ? `${nextStep.phase} — ${nextStep.name}` : 'Done';

        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const remaining = Math.max(0, Math.ceil(session.duration - session.elapsed));
        timeRemainingEl.textContent = String(remaining);
        const pct = session.elapsed / session.duration;
        ringFg.style.strokeDashoffset = RING_CIRCUMFERENCE * pct;
        ringFg.classList.remove('warn', 'hot');
        if (remaining <= 3) ringFg.classList.add('hot');
        else if (remaining <= 10) ringFg.classList.add('warn');
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

            const remaining = session.duration - session.elapsed;
            const lastSecond = Math.ceil(session.duration - (session.elapsed - delta));
            const thisSecond = Math.ceil(remaining);
            if (lastSecond !== thisSecond && thisSecond >= 1 && thisSecond <= 3) {
                beep(880, 0.08);
            }

            if (session.elapsed >= session.duration) {
                beep(1320, 0.22);
                advance();
                return;
            }
            updateTimerDisplay();
        }, 100);
    }

    function advance() {
        session.index += 1;
        if (session.index >= STEPS.length) {
            finishWorkout();
            return;
        }
        loadStep();
    }

    function finishWorkout() {
        clearInterval(tickInterval);
        tickInterval = null;
        const seconds = Math.round((Date.now() - session.startedAt) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        doneSummary.textContent = `Original 12-min sequence · ${mins}m ${secs}s`;
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
        try { wakeLock = await navigator.wakeLock.request('screen'); }
        catch (_) { /* ignore */ }
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

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', () => {
        if (!session) return;
        if (session.elapsed > 2 || session.index === 0) {
            session.elapsed = 0;
            updateTimerDisplay();
        } else {
            session.index -= 1;
            loadStep();
        }
    });
    nextBtn.addEventListener('click', () => { if (session) advance(); });
    exitBtn.addEventListener('click', exitWorkout);
    againBtn.addEventListener('click', startWorkout);
    homeBtn.addEventListener('click', () => showScreen(setupEl));

    document.addEventListener('keydown', (e) => {
        if (workoutEl.classList.contains('hidden')) return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'ArrowRight') nextBtn.click();
        else if (e.code === 'ArrowLeft') prevBtn.click();
    });

    initSetup();
})();
