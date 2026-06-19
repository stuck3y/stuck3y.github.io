# The system

This folder is not just a pile of apps — it's a small **system**: a shell, a
shared SDK, and a set of conventions that make ~30 independent static apps feel
like one cohesive thing. No build step, no framework, no backend. Cohesion comes
from shared *services*, not from chrome wrapped around the apps.

> The mechanical conventions (folder = app, PWA defaults, branch/PR flow) live in
> the repo root [`CLAUDE.md`](../CLAUDE.md). This document is the deeper reference
> for the **system** itself — its architecture, APIs, and event vocabulary.

---

## Why it works: one origin

The whole suite ships to one GitHub Pages origin (`www.jonsdata.com`). Same
origin means every app already shares, for free:

- **`localStorage` / IndexedDB / OPFS** — one storage space, shared between apps
- **`BroadcastChannel`** — live cross-app messaging (change the theme in one app,
  every open app updates instantly)
- **Service workers** — offline support

The SDK is a thin, deliberate layer over exactly these primitives. That's the
entire trick. There is no virtual file system, no window manager, no process
model — the browser already is the OS. See the project's app philosophy:
radically minimal, single-focus, question every convention.

---

## The two files

The SDK is **two files, zero dependencies, framework-agnostic**, in `lib/`:

### `lib/sys.js` → `window.sys`

| Surface | What it is |
| --- | --- |
| `sys.apps` | The app registry (array). One line per app. The launcher + ⌘K palette render from it. |
| `sys.app(id)` | Look up one registry entry, or `null`. |
| `sys.launch(id)` | Navigate to an app. Inside the installed shell this stays in the standalone window, so storage + bus stay shared. |
| `sys.bus.emit(type, detail)` | Broadcast an event to every open app **and locally** (BroadcastChannel never delivers to the sender, so `emit` also dispatches in-process). |
| `sys.bus.on(type, fn)` | Subscribe. Returns its own `unsubscribe` function. `on('*', fn)` hears everything as `{ type, detail }`. |
| `sys.storage.get(k, fallback)` / `.set(k, v)` / `.remove(k)` / `.key(k)` | Typed JSON over `localStorage`, namespaced under `sys:`. Deliberately not IndexedDB — ~5MB covers state/settings; an app that outgrows it reaches for IndexedDB itself. |
| `sys.theme.get()` / `.set(v)` / `.init()` / `.THEMES` | Theme is `'auto' \| 'light' \| 'dark'`. `set` persists + announces over the bus; `init` applies the stored value and subscribes so a change in one app updates every open app at once. |

### `lib/tokens.css`

The shared design language: SF system stack, 4px spacing rhythm, real Apple
blues, status colors, radii, shadows, motion easings. Light/dark **follows the OS
by default** and is forced per-device via `data-theme` on `<html>`. Reduced motion
is respected (transitions collapse to 0ms).

`tokens.css` is opt-in. Apps with their own strong visual identity (e.g. `big`,
`river`, `floor` — warm paper/ink, serif) **do not** import it; instead they
honor the theme *signal* while keeping their own palette (see below).

---

## The shell

`apps/index.html` is the launcher — a Springboard grid + a ⌘K (Ctrl-K) command
palette. It reads `sys.apps` and renders monogram tiles colored by each app's
`color`. It also:

- hosts the **theme toggle** (Auto → Light → Dark), the driver for `sys.theme`;
- is a **bus consumer**: a tile live-pulses while its app reports an active
  session (see the event vocabulary).

The shell is the **one** PWA meant to be installed (manifest scope `/apps/`).
Installing it puts a single "Apps" icon on the home screen; every app launched
from it stays inside that one standalone container, so storage and the bus stay
shared. Per-app manifests still exist and are harmless, but **installing apps
individually re-creates iOS's sealed per-app storage containers and breaks
cohesion** — install the shell instead.

`sw.js` precaches only the shell (launcher + SDK). Each sub-app owns its own
caching through its own service worker.

---

## The theme model (important)

`sys.theme` is a **signal**, not a stylesheet. It only sets `data-theme` on
`<html>` and broadcasts the change. Each app maps that signal to *its own*
colors. Two integration styles:

**A — app uses `tokens.css`:** just include it and call `sys.theme.init()`. Done.

**B — app has its own palette:** keep your `:root` light vars and your
`@media (prefers-color-scheme: dark)` block, but make the dark block also fire on
the forced signal, and add an explicit forced-dark block:

```css
:root { /* light vars */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark vars */ }
}
:root[data-theme="dark"] { /* dark vars (same) */ }
```

Then include `sys.js` and, after load, `sys.theme.init()`. Result: default still
follows the OS; the shell's Auto/Light/Dark choice is respected and propagates
live across open apps, all without losing the app's character. `big` and `river`
are the reference implementations.

---

## The bus: event vocabulary

Events are plain `(type, detail)` over `sys.bus`. Conventions that exist today:

| Event | Emitted by | Detail | Consumed by |
| --- | --- | --- | --- |
| `theme` | `sys.theme.set` | `'auto' \| 'light' \| 'dark'` | every app via `sys.theme.init`; shell toggle |
| `session.start` | apps with an active timed session (e.g. `ketchapp`) | `{ app, kind, label }` | shell (live-pulses the tile) |
| `session.end` | same | `{ app, kind, label }` | shell (clears the pulse) |

Keep `detail.app` set to the registry `id` so consumers can route by app. A
one-shot action (not an ongoing session) should **not** use `session.*` — it
belongs in the river instead.

---

## The river: the activity stream

`lib/river.js` (`window.river.emit`) is an **append-only log** in `localStorage`
under `river:sessions:v1`, pruned to 90 days. It's how apps record "I did a
thing" for later review. The `river` app reads the log and shows it grouped by
day, with a filterable label chip per entry.

Emit shape:

```js
window.river.emit({
  app: 'floor',            // registry id
  kind: 'workout.legs',    // free-form '<domain>.<verb>'
  startedAt: <ms>,
  endedAt:   <ms>,
  durationMs:<ms>,
  label: 'Legs',           // the filterable chip — keep it short
});
```

`river.js` fails silently and never throws into the caller. Producers today:
`ketchapp` (`pom.work`), `big`, `floor` (`workout.*`), `horsemen` (`prompt.built`).

**Bus vs. river:** the bus is *live and ephemeral* (react now, in another open
app). The river is *durable history* (review later). Many apps emit to both.

---

## Adding an app

1. Create `apps/<id>/index.html` (self-contained: `index.html` [+ optional
   `styles.css`/`app.js`]). No build step.
2. Make it a PWA: the three `<head>` lines + a `sw.js` (copy `lib/sw-app.js`,
   edit `CACHE`/`SHELL`) + a `manifest.webmanifest` scoped to `/apps/<id>/`.
   See `CLAUDE.md` for the exact snippet.
3. Register it: **one line** in the `APPS` array in `lib/sys.js`
   (`{ id, name, color, desc? }`). It now appears in the launcher + ⌘K palette.
4. Wire into the system as it fits — and only as it fits:
   - theme: include `sys.js`, call `sys.theme.init()` (style A or B above);
   - shared state/settings: `sys.storage`;
   - live coordination: `sys.bus`;
   - "I did a thing" history: `window.river.emit`.

Not every app needs every service. Wire what genuinely fits; ignore the rest.

---

## Shared components: deliberately absent

There is no component library yet, on purpose. Wait until a pattern repeats
**three times** across apps, then extract it — premature component libraries are
where cohesion calcifies. `tokens.css` (values) and `sys.js` (behavior) are the
only shared layers until then.
