# Source Code W

**Peek under the hood** — a visually stunning, interactive web application that retrieves the complete source code of any website via URL and presents it inside an immersive 3D experience.

Built with **vanilla HTML5, CSS3, and JavaScript (ES6+)**. No React, Vue, or other heavy frameworks.

---

## Features

- **URL → full source retrieval** using a chain of public CORS proxies
- **Syntax-highlighted code preview** (Prism.js) with tabs for HTML / CSS / JS / RAW
- **3D landing animation** (Three.js) — rotating wireframe, letter-by-letter title reveal, orbital camera
- **Holographic glass UI** with mouse parallax tilt, 3D extruded input, and tactile button physics
- **“File transfer” sequence** — data tunnel, color-coded packets, receiving dock, crystal explosion into the results panel
- **Metadata** — size, line count, load time, content type
- **Copy to clipboard**, pretty-print toggle, split-view (raw + live iframe preview)
- **Simple file tree** for extracted inline CSS / JS
- **Monochrome design** (black / white / gray) with thin status accents only
- **Responsive** + `prefers-reduced-motion` fallbacks
- **Skip intro** button

---

## Quick Start

1. Clone or download this folder.
2. Open `index.html` in a modern browser **or** serve it with any static server:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

3. Visit `http://localhost:8080`.

No build step. All dependencies load from CDNs.

---

## Dependencies (CDN)

| Library       | Purpose                          | CDN |
|---------------|----------------------------------|-----|
| Three.js r128 | Landing 3D scene                 | cdnjs |
| GSAP 3.12     | Timeline & spring-like animations| cdnjs |
| Prism.js 1.29 | Syntax highlighting + line numbers | cdnjs |
| Google Fonts  | Inter, Space Grotesk, JetBrains Mono | fonts.googleapis.com |

---

## File Structure

```
source-code-w/
├── index.html          # Markup + CDN includes
├── styles.css          # Full design system, 3D UI, animations
├── app.js              # Landing, fetch, transfer sequence, code panel
└── README.md           # This file
```

---

## Component Breakdown

### 1. Landing (`#landing`)
- Full-screen Three.js canvas with star field, rotating wireframe cube + octahedron, floating code-symbol sprites.
- Title letters animate from Z-depth with GSAP.
- After ~4–5 s (or Skip), camera transition fades into main UI.

### 2. Main Card (`.main-card`)
- Glassmorphism surface with subtle parallax tilt (desktop).
- 3D extruded URL input (lifts on focus + scan-line on submit).
- Pill-shaped “RETRIEVE SOURCE” button with press, ripple, and idle pulse.

### 3. Transfer Overlay
- Timeline-driven sequence:
  1. Input scan line
  2. Transparent data tunnel grows downward
  3. Color-coded packets (HTML orange / CSS blue / JS yellow) travel into tunnel
  4. Receiving dock + file icons stack
  5. Progress counter → crystal forms → rises and explodes into results panel

### 4. Results Panel
- Drawer that slides open after animation.
- Tabs, search field, Copy All, Close.
- Line-numbered Prism output, optional minimap, pretty-print, split view (iframe).
- Sidebar file tree when inline CSS/JS is detected.

### 5. Error handling
- Friendly message + Retry button with 3D press feedback.
- Proxy fallback chain (allorigins → corsproxy.io → codetabs).

---

## Animation Timeline (approximate)

| Time     | Event |
|----------|-------|
| 0.0 s    | Landing starts, stars + wireframe rotate |
| 0.2–1.2 s| Title letters rotate into place |
| 1.4 s    | Tagline fades in |
| 4.2 s    | Zoom / fade → main UI appears |
| Submit   | Scan line → tunnel → packets (≈0.7–2.0 s) |
| 1.2 s    | Dock appears, progress counts |
| 1.8–2.4 s| File icons stack |
| 2.8–3.5 s| Crystal forms, rises, explodes → results open |

(Mobile / reduced-motion shortens or disables camera orbit and heavy 3D.)

---

## CORS & Limitations

Browsers cannot freely read other origins. The app uses public CORS proxies. Some sites:

- Block known proxies
- Require authentication / cookies
- Return large or binary payloads

In those cases a clear error is shown. For production use, replace the proxy chain with your own backend or Cloudflare Worker.

---

## Accessibility

- `prefers-reduced-motion` disables continuous camera movement and long sequences.
- Skip intro control.
- Semantic form, roles, and ARIA where appropriate.
- Keyboard-focusable controls.

---

## Design System

**Colors** (strict monochrome + thin status)

- Background: `#000000` / `#0a0a0a`
- Surfaces: white / light grays
- Text: white on dark, black on light buttons
- Accents: `#22c55e` (success), `#ef4444` (error) only

**Typography**

- UI: Inter / Space Grotesk
- Code: JetBrains Mono

**Effects**

- Global 4 % noise texture
- Soft vignette
- Glass blur + border glow
- 3D button depth via box-shadow + translateZ

---

## Optional Deployment

- **GitHub Pages**: push the folder and enable Pages on the root /docs.
- **Netlify / Vercel**: drag-and-drop the folder or connect the repo (static site, no build).

---

## License

MIT — free to use, modify, and redistribute.
