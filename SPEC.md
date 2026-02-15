# JuiceMeter v0 — Build Spec

I’m going to build you a working prototype. React web app. Deployable immediately. Let’s do this.

-----

## What We’re Building Right Now

**3 mini-games → Brain Juice score → Recommended plays**

Games included in v0:

1. **Pong Reflex** (reaction time)
1. **Color Catch** (impulse control)
1. **Sequence Go** (task initiation)

That’s enough to generate a meaningful Brain Juice Index.

-----

## Technical Architecture

```
React + TypeScript
Tailwind CSS (Apple-quality polish)
Local Storage (no backend needed)
Deployed via Vercel/Netlify in <5 min
```

**Why this stack:**

- Fast to build
- Feels native-quality with good animation
- Works on desktop + mobile
- Zero infrastructure to maintain

-----

## The Games (Exact Implementation)

### Game 1: Pong Reflex (30s)

**Visual:**

- Black background
- White paddle (bottom, follows touch/mouse)
- White ball
- Minimal score counter top-right

**Mechanics:**

```typescript
interface PongMetrics {
  reactionTimes: number[];  // ms from ball direction change to paddle move
  misses: number;
  hits: number;
}

function calculatePongScore(metrics: PongMetrics): number {
  if (metrics.reactionTimes.length === 0) return 0;
  
  const avgReaction = average(metrics.reactionTimes);
  const variance = standardDeviation(metrics.reactionTimes);
  
  // 200ms avg = 100 score, 500ms = 0 score
  const speedScore = Math.max(0, Math.min(100, (500 - avgReaction) / 3));
  
  // Penalize inconsistency
  const consistencyPenalty = variance * 0.08;
  
  // Penalize misses
  const missPenalty = metrics.misses * 8;
  
  return Math.max(0, speedScore - consistencyPenalty - missPenalty);
}
```

**UX Details:**

- Ball speed: constant 300px/sec
- Paddle width: 80px
- Ball size: 12px
- Haptic feedback on hit (if mobile)
- No pause button

-----

### Game 2: Color Catch (30s)

**Visual:**

- Light gray background
- Shapes fall from top at random X positions
- Green circles = tap
- Red squares = DON’T tap
- Running score: “+1” appears on correct tap

**Mechanics:**

```typescript
interface ColorCatchMetrics {
  greenCaught: number;
  greenMissed: number;
  redTapped: number;  // The killer metric
  totalShapes: number;
}

function calculateColorCatchScore(metrics: ColorCatchMetrics): number {
  // Accuracy matters
  const accuracy = metrics.greenCaught / metrics.totalShapes;
  
  // But impulse control matters MORE
  const impulseFailureRate = metrics.redTapped / metrics.totalShapes;
  
  const baseScore = accuracy * 100;
  const impulsePenalty = impulseFailureRate * 150; // Harsh penalty
  
  return Math.max(0, baseScore - impulsePenalty);
}
```

**UX Details:**

- New shape every 1.2 seconds
- 60% green circles, 40% red squares
- Fall speed: 2.5 seconds from top to bottom
- Shape size: 60px
- Shapes fade out if not caught (not a “miss” unless green)

-----

### Game 3: Sequence Go (45s)

**Visual:**

- Clean white background
- Large problem in center (e.g., “7 + 3”)
- 4 answer buttons below
- Timer bar at top (draining)

**Mechanics:**

```typescript
interface SequenceGoMetrics {
  firstClickLatency: number;  // Time to first answer attempt
  problemsAttempted: number;
  problemsCorrect: number;
  totalProblems: number;
}

function calculateSequenceGoScore(metrics: SequenceGoMetrics): number {
  // Initiation latency is CRITICAL for ADHD assessment
  // 0-1s = excellent, 1-3s = normal, 3s+ = fog mode
  const initiationScore = Math.max(0, Math.min(100, (3000 - metrics.firstClickLatency) / 30));
  
  // Sustained focus = completion rate
  const completionRate = (metrics.problemsAttempted / metrics.totalProblems) * 100;
  
  // Accuracy bonus
  const accuracy = metrics.problemsCorrect / Math.max(1, metrics.problemsAttempted);
  const accuracyBonus = accuracy * 20;
  
  // Heavily weight initiation (this is the ADHD signal)
  return (initiationScore * 0.6) + (completionRate * 0.3) + accuracyBonus;
}
```

**Problem Types:**

```typescript
const problems = [
  { type: 'math', question: '7 + 3', answer: 10, distractors: [9, 11, 8] },
  { type: 'sequence', question: '← → ← ?', answer: '→', distractors: ['←', '↑', '↓'] },
  { type: 'math', question: '15 - 6', answer: 9, distractors: [8, 10, 11] },
  // ... 20 total problems, randomly selected
];
```

**UX Details:**

- 4 seconds per problem max
- Auto-advances if no answer
- New problem immediately after answer
- Correct answer = green flash + haptic
- Wrong answer = red flash, no penalty beyond accuracy

-----

## Brain Juice Calculation

```typescript
interface BrainJuiceResult {
  overall: number;
  state: 'Fog' | 'Scatter' | 'Balanced' | 'Overdrive';
  breakdown: {
    reaction: number;
    impulse: number;
    focus: number;
  };
  plays: string[];
}

function calculateBrainJuice(
  pongScore: number,
  colorScore: number,
  sequenceScore: number
): BrainJuiceResult {
  
  const reaction = pongScore;
  const impulse = colorScore;
  const focus = sequenceScore;
  
  // Weighted average
  const overall = (
    (focus * 0.40) +
    (impulse * 0.20) +
    (reaction * 0.20) +
    (focus * 0.20)  // Count focus twice in the formula (Pattern + Sequence)
  );
  
  const state = 
    overall < 40 ? 'Fog' :
    overall < 60 ? 'Scatter' :
    overall < 80 ? 'Balanced' : 'Overdrive';
  
  const plays = getPlaysForState(state);
  
  return { overall, state, breakdown: { reaction, impulse, focus }, plays };
}
```

-----

## Recommended Plays (State-Based)

```typescript
const PLAYS = {
  Fog: [
    "Body Double: 15-min cowork session with someone",
    "Easiest First: Pick the smallest possible win",
    "Movement Reset: 5-min walk or stretch break"
  ],
  Scatter: [
    "Arena Lock: Single task, 25 minutes, nothing else",
    "Timer Blitz: Work in 10-min sprints with breaks",
    "Anchor Tool: Close all tabs except one"
  ],
  Balanced: [
    "Deep Block: 90-min focus session on hard problem",
    "Flow Follow: Work on whatever feels interesting",
    "Maintenance Mode: Clear 5 small nagging tasks"
  ],
  Overdrive: [
    "Capture Sprint: Brain dump everything on your mind",
    "Physical Channel: Run, lift, or climb",
    "Ship Something: Finish and publish one thing today"
  ]
};
```

-----

## User Flow (Screens)

### Screen 1: Start

```
┌─────────────────────────┐
│                         │
│      🧠 JuiceMeter      │
│                         │
│   Daily Cognitive       │
│   Check-In              │
│                         │
│   [Start Assessment]    │
│                         │
│   3 min · 3 games       │
│                         │
└─────────────────────────┘
```

### Screen 2: Game Transition

```
┌─────────────────────────┐
│                         │
│   Game 1 of 3           │
│   ────────              │
│                         │
│   Pong Reflex           │
│   Measures reaction     │
│   time & consistency    │
│                         │
│   [Ready]               │
│                         │
└─────────────────────────┘
```

### Screen 3: Game Screen

(Full-screen game, minimal UI)

### Screen 4: Results

```
┌─────────────────────────┐
│                         │
│         🧠 67           │
│       Scatter           │
│                         │
│   Today's Plays         │
│   • Arena Lock          │
│   • Timer Blitz         │
│   • Anchor Tool         │
│                         │
│   [View Details]        │
│   [Done]                │
│                         │
└─────────────────────────┘
```

### Screen 5: Details (Optional)

```
┌─────────────────────────┐
│   Breakdown             │
│                         │
│   Focus        78 ████  │
│   Impulse      52 ███   │
│   Reaction     71 ███   │
│                         │
│   Last 7 Days           │
│   [Line graph]          │
│                         │
│   [Done]                │
└─────────────────────────┘
```

-----

## Data Storage (Local First)

```typescript
interface GameSession {
  id: string;
  timestamp: number;
  scores: {
    pong: number;
    colorCatch: number;
    sequenceGo: number;
  };
  brainJuice: BrainJuiceResult;
}

// Store in localStorage
const sessions: GameSession[] = JSON.parse(
  localStorage.getItem('juicemeter_sessions') || '[]'
);
```

-----

## Design System

```css
/* Colors */
--bg-primary: #000000
--bg-secondary: #1C1C1E
--text-primary: #FFFFFF
--text-secondary: #8E8E93
--accent: #007AFF
--success: #34C759
--warning: #FF9500
--danger: #FF3B30

/* Typography */
--font-display: SF Pro Display, -apple-system, sans-serif
--font-body: SF Pro Text, -apple-system, sans-serif

/* Spacing (8px base) */
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px

/* Timing */
--transition-fast: 150ms
--transition-normal: 250ms
--transition-slow: 400ms
```

-----

## Implementation Order

I’m going to build this in this sequence:

1. **Basic React app structure** (5 min)
1. **Game flow state machine** (10 min)
1. **Pong Reflex game** (20 min)
1. **Color Catch game** (15 min)
1. **Sequence Go game** (15 min)
1. **Brain Juice calculation** (10 min)
1. **Results screen** (10 min)
1. **Local storage** (5 min)
1. **Polish & animation** (15 min)

Total: ~2 hours of focused work.

-----

## Let’s Build

Starting with the core app structure and first game. Stand by…​​​​​​​​​​​​​​​​