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
- **Folder = app. Single `.html` file = reference sheet.** Anything in `/apps/<slug>/` is a real app and ships as a PWA (see below). Anything sitting in `/apps/` as a bare `.html` file is just a reference sheet — not a PWA, not advertised. If a reference sheet earns its place, fold it into `/apps/<slug>/index.html`. There is no `/apps/` index page and no `apps.json` registry — the catalog is the directory listing on GitHub, and functional access is through the OS (install each app as a PWA, launch from the home screen).
- **Every folder app is a PWA.** That's the default, not an opt-in. New folder apps ship with these three lines in `<head>` and a `sw.js` next to `index.html`:

  ```html
  <meta name="theme-color" content="#xxxxxx" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <script src="../lib/pwa.js" defer></script>
  ```

  Copy `/apps/lib/sw-app.js` to `./sw.js` and edit `CACHE` (e.g. `app-<slug>-v1`) and `SHELL` (the precache list — `['./', './index.html', './manifest.webmanifest']` plus any app-specific files). Add a `manifest.webmanifest` modeled on `/apps/ketchapp/manifest.webmanifest`; reference `../icon.svg` for the icon unless the app ships its own (`./icon.svg`).
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