# Source Code W — Component & Animation Documentation

## Component Breakdown

### Landing Scene
- **Canvas**: Three.js WebGL full-viewport.
- **Objects**: Star field (Points), EdgesGeometry cube + octahedron, CanvasTexture sprites for `{}` `</>` etc.
- **Camera**: Perspective, slow orbital path (disabled on mobile / reduced-motion).
- **Title**: Individual `.letter` spans animated with GSAP from `translateZ(-400)` + `rotateY(90°)`.
- **Exit**: Opacity fade of entire `#landing`, then dispose renderer.

### Main Card (`.main-card.glass-card`)
- Glassmorphism: `backdrop-filter: blur(24px)`, semi-transparent white border.
- Parallax: `mousemove` → `rotateX/Y` limited to ±6°.
- Input slot: physical extrusion via box-shadow; focus raises `translateZ(18px)` and intensifies glow.
- Button: CSS 3D (translateY + box-shadow layers) + JS press class + ripple element.

### Transfer Overlay
- Pure DOM + GSAP timeline (no Three.js) for performance.
- Tunnel: height grow + opacity.
- Packets: absolute divs with colored backgrounds, tweened downward.
- Dock + file icons: staggered entrance.
- Crystal: CSS clip-path diamond, scale/opacity explosion.

### Results Panel
- Max-height + opacity + translateY transition for drawer effect.
- Prism.js for highlighting; line-numbers plugin.
- Minimap: tiny font preview of first ~4 k characters.
- Split view: `srcdoc` iframe (sandboxed).

### Error Box
- Appears with GSAP fade/slide; 3D Retry button re-triggers fetch.

---

## Animation Timeline (Desktop, normal motion)

### Landing (≈ 4.5 s)
| t (s) | Action |
|-------|--------|
| 0.00  | Canvas + stars appear |
| 0.15–1.10 | Letters rotate in sequentially |
| 1.40  | Tagline fade-in |
| 0–4.2 | Continuous wireframe rotation + camera orbit |
| 4.20  | Fade out landing → fade in main card |

### Submit sequence (≈ 3.5 s)
| t (s) | Action |
|-------|--------|
| 0.00  | Input scan-line animation (0.6 s) |
| 0.40  | Tunnel height expand |
| 0.70–2.0 | Packets travel (staggered) |
| 1.20  | Receiving dock rises |
| 1.20–2.5 | Progress % counter |
| 1.80–2.3 | File icons stack |
| 2.80  | Crystal forms from icons |
| 3.20  | Crystal rises & explodes |
| 3.50  | Overlay hidden, results panel opens |

Mobile / `prefers-reduced-motion`: landing ≤ 2 s static, transfer reduced to progress text only.

---

## Proxy Strategy
1. `api.allorigins.win/raw?url=`
2. `corsproxy.io/?`
3. `api.codetabs.com/v1/proxy?quest=`

First successful response wins. 18 s abort timeout per attempt.

---

## Performance Notes
- Particle count lowered on mobile.
- Landing renderer disposed after transition.
- No continuous RAF after landing.
- Prism runs only on tab change.
- CSS `will-change` and `transform-style: preserve-3d` used sparingly.
