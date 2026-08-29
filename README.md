# Source W v2 — World-Class Extractor

Next.js 14 + TypeScript + Tailwind + Monaco + Three.js (R3F) + server extract API.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 → Enter → `/dashboard`

Deploy: `npx vercel` (API route needs Node runtime).

## Implemented

### Extraction
- **Server** `POST /api/extract` — fetch HTML without browser CORS
- **External CSS/JS** — up to 8 stylesheets + 8 scripts fetched server-side and merged into tabs
- Cheerio DOM parse (meta, link, script, img, srcset, fonts, video, audio, iframe, SVG count)
- Client fallback: allorigins → corsproxy → codetabs
- Manual paste modal

### UI
- Landing: Three.js wireframe boxes + stars (WebGL) with canvas 2D fallback
- Monaco editor (toggle Plain mode)
- Stats, ZIP + single-file + per-type download
- Image gallery in Resources
- Device frames + address bar in Preview
- Drag-drop URL, history, theme, offline banner
- PWA: manifest + service worker (`/sw.js`) + install banner
- IndexedDB: cache last extractions + history

### Not included (needs dedicated infra)
- Puppeteer/Playwright full SPA render (requires chromium serverless layer)
- Full offline extract (needs network)

## Structure

```
app/api/extract/route.ts   # server fetch + external assets
app/dashboard/page.tsx
app/page.tsx               # landing
components/landing/        # Hero + Scene3D
components/dashboard/      # main UI
components/editor/         # Monaco wrapper
components/ui/             # SW register, install banner
lib/                       # extractor, parser, download, storage, idb
public/sw.js
```

## License

MIT
