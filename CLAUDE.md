# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a GitHub Pages static website repository (stuck3y.github.io) hosting Jon's Data Company website and several web applications. The site is accessible at www.jonsdata.com (configured via CNAME).

## Architecture

The repository follows a simple static website structure:
- **Root level**: Main landing page (`index.html`)
- **`/apps/`**: Contains individual web applications
  - `/food/`: Food decision helper app (HTML, CSS, JS)
  - `/merrychat/`: Chat application
  - `/not-to-do/`: Task management app
  - `/pac/`, `/pac_pixi/`, `/pac_simple/`: Various Pac-Man game implementations
- **`/closet/`**: Gaming closet project tracker (SPA with local storage)

## Key Technologies

- Pure HTML/CSS/JavaScript (no build process)
- External libraries loaded via CDN:
  - Lucide icons (`https://cdn.jsdelivr.net/npm/lucide@latest`)
  - Pixi.js v8 for game development (`https://cdn.jsdelivr.net/npm/pixi.js@8.x`)
- Local storage for data persistence
- GitHub Pages for hosting

## Development Commands

This is a static site with no build process. To develop locally:

```bash
# Start a local server (using Python)
python3 -m http.server 8000

# Or using Node.js http-server
npx http-server
```

## Deployment

Changes are automatically deployed via GitHub Pages when pushed to the main branch.

## Conventions

- **New apps go in `/apps/<slug>/`** as self-contained static folders (typically `index.html` + `styles.css` + `app.js`). No build step.
- **Folder = app. Single `.html` file = reference sheet.** Anything in `/apps/<slug>/` is a real app and ships as a PWA (see below). Anything sitting in `/apps/` as a bare `.html` file is just a reference sheet — not a PWA, not advertised. If a reference sheet earns its place, fold it into `/apps/<slug>/index.html`.
- **The shell lives at `/apps/`.** `/apps/index.html` is the launcher (Springboard grid + ⌘K palette); it reads the registry in `/apps/lib/sys.js`. Adding an app to the launcher is one line in the `APPS` array there. The shell is the **one** PWA meant to be installed (scope `/apps/`), so every app you launch from it stays in a single shared container — shared storage, live bus, one home-screen icon. Per-app manifests still exist and are harmless, but installing apps individually re-creates iOS's sealed-storage containers and breaks cohesion; install the shell instead.
- **The system SDK is `/apps/lib/sys.js` + `/apps/lib/tokens.css`.** Two files, zero dependencies, framework-agnostic. `sys.js` exposes `window.sys`: the app registry + `sys.launch(id)`, `sys.bus` (one origin-wide `BroadcastChannel` that also delivers locally to the sender), `sys.storage` (typed JSON over namespaced `localStorage`), and `sys.theme` (`set`/`init`, propagates live across open apps). `tokens.css` is the shared design language — SF stack, 4px rhythm, Apple blues, light/dark following the OS by default (`data-theme` to force), reduced-motion respected. Apps opt in by including both and calling `sys.theme.init()`. Shared **components** are deliberately absent until a pattern repeats three times — extract then, not before.
- **Every folder app is a PWA.** That's the default, not an opt-in. New folder apps ship with these three lines in `<head>` and a `sw.js` next to `index.html`:

  ```html
  <meta name="theme-color" content="#xxxxxx" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <script src="../lib/pwa.js" defer></script>
  ```

  Copy `/apps/lib/sw-app.js` to `./sw.js` and edit `CACHE` (e.g. `app-<slug>-v1`) and `SHELL` (the precache list — `['./', './index.html', './manifest.webmanifest']` plus any app-specific files). Add a `manifest.webmanifest` modeled on `/apps/ketchapp/manifest.webmanifest`; reference `../icon.svg` for the icon unless the app ships its own (`./icon.svg`).
- **Branch off `main` by default.** When starting new work, branch off the latest `main` rather than stacking on top of an unmerged feature branch. After a branch merges, return to `main`, pull, then cut a fresh branch for the next change.
- **PR + auto-merge is the default flow.** Always open a PR (the trail is useful for retroactively reviewing what shipped), then merge it straight into `main` without pausing to confirm — for the personal apps in this repo, that's pre-authorized. Skip this only if the change is risky or destructive, in which case open the PR and wait.

## Application-Specific Notes

### Food App (`/apps/food/`)
- Decision tree based food recommendation system
- Uses Tailwind-style utility classes (loaded via CSS)
- Integrates with external food delivery services

### Closet App (`/closet/`)
- Single Page Application for tracking gaming closet components
- Data stored in browser's localStorage
- No external dependencies

### Pac Games (`/apps/pac*/`)
- Multiple implementations showcasing different approaches
- pac_pixi uses Pixi.js v8 with ESM modules
- Theme switching functionality in pac_pixi