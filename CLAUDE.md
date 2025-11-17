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