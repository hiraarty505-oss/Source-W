# Source W

**Extract · Preview · Download** — any website’s HTML, CSS, JavaScript and assets from a single URL.

Runs entirely in your browser. Nothing you extract is uploaded to a server (except optional public CORS proxies when a site blocks direct fetch).

## Quick start

```bash
# Option A — open the file
open index.html   # macOS
# or double-click index.html

# Option B — local server (recommended; avoids some file:// quirks)
npm start
# then open http://localhost:3000
```

## Features

- Immersive black/white landing (particles, 3D prism logo, typewriter)
- Real CSS 3D (perspective, card tilt, button depth)
- Mobile-first layout (48px touch targets, no iOS input zoom)
- Extraction with CORS fallback (`allorigins` → clear error if blocked)
- Tabs: HTML · CSS · JS · Resources · live Preview
- Syntax highlighting, file sizes, copy & download
- Dramatic extract overlay (scanner, data streams, particle burst)
- `prefers-reduced-motion` respected

## Keyboard

| Key | Action |
|-----|--------|
| `Esc` | Skip landing |
| `Ctrl` + `Enter` | Start extract (from URL field) |

## CORS note

Many sites block browser `fetch` from other origins. Source W tries:

1. Direct `fetch`
2. Public proxy (`api.allorigins.win`)

If both fail, you’ll see a toast. For reliable use, run your own proxy (e.g. a Cloudflare Worker) and point the app at it.

## Browser support

- Modern Chromium, Firefox, Safari
- WebGL not required (Canvas 2D + CSS 3D only)
- WebGPU not required

## Project files

| File | Role |
|------|------|
| `index.html` | Structure, landing + app shell |
| `style.css` | Monochrome design system + 3D + motion |
| `script.js` | Particles, extract, parse, highlight, download |
| `favicon.svg` | Tab icon |
| `manifest.webmanifest` | Installable / theme color |
| `robots.txt` | Crawlers (if hosted publicly) |

## License

Use and modify freely for personal or commercial projects.
