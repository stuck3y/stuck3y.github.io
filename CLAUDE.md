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
- **Register every app in `apps/apps.json`.** This manifest is the source of truth for `/apps/`. Each entry: `{ slug, name, description, path, featured }`. The `/apps/` index ("Bench") renders a **Featured** shelf (the `featured: true` entries) and an **All** section (everything else), with a type-to-filter input. `/apps/manage/` provides a UI to curate the list (toggle featured, edit, reorder, discover new apps via the GitHub API). When you create a new app, append an entry to `apps.json` — set `featured: true` only if it belongs on the curated top shelf. The homepage links to `/apps/` but does not list apps directly.
- **Bench is a PWA.** `/apps/` itself is installable. `/apps/manifest.webmanifest` + `/apps/sw.js` ship the launcher shell; `/apps/icon.svg` is the icon; `/apps/lib/pwa.js` + `/apps/lib/sw-app.js` are the shared opt-in helpers for individual apps. Bump `launcher-v1` in `sw.js` when you ship a meaningful change so caches refresh on next visit.
- **Per-app PWA opt-in (folder apps only).** To make a folder app installable + offline, drop these three lines in its `<head>` and add a `sw.js` next to its `index.html`:

  ```html
  <meta name="theme-color" content="#xxxxxx" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <script src="../lib/pwa.js" defer></script>
  ```

  Copy `/apps/lib/sw-app.js` to `./sw.js` and edit `CACHE` (e.g. `app-<slug>-v1`) and `SHELL` (the precache list). Add a `manifest.webmanifest` modeled on `/apps/big/manifest.webmanifest`. Opt apps in organically — only when they earn it through repeated use. **Single-file apps** (e.g. `pom.html`, `bd.html`) cannot opt in until they're folder-ified first; don't speculatively convert.
- **Branch off `main` by default.** When starting new work, branch off the latest `main` rather than stacking on top of an unmerged feature branch. After a branch merges, return to `main`, pull, then cut a fresh branch for the next change.

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