# Source Code W v2 — Smart Source Inspector

Educational HTML inspector. Safely peeks at the **initial document only** of public websites.

## Key changes from v1

| Aspect | Implementation |
|--------|----------------|
| Landing animation | **Canvas 2D** particle network (nodes + connections). No Three.js. |
| Rate limiting | In-memory (5 req / IP / min). Swap for **Vercel KV** or **Upstash Redis** in production. |
| HTML fetch | Edge Function `fetch()` with `redirect: 'manual'`, 10 s timeout, Cheerio parse. |
| Source maps | `productionBrowserSourceMaps: false` in `next.config.js`. |
| Watermark | CSS `::before` + overlay: “Source Code W — Preview Only”. |
| Scope | First HTML ≤ 500 KB, preview truncated to 200 lines. Resources listed, never fetched. |

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (GitHub-dark inspired palette)
- Cheerio (server-side HTML parse)
- Edge Runtime API route
- Framer Motion ready (optional micro-interactions)

## Security

- Strict URL validation (http/https only, max 2048 chars)
- Private IP / localhost / file:// blocked
- Domain blocklist (gov, banking, etc.)
- CSRF token (issued on GET `/api/inspect`, required on POST)
- Honeypot field
- Rate limit → HTTP 429 + `Retry-After`
- Transparent bot User-Agent (no browser spoofing)
- CSP + security headers
- Generic 500 responses (no stack traces)
- No production browser source maps

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production notes

1. Replace in-memory rate limit & CSRF store with **Vercel KV** or **Upstash Redis**.
2. Deploy to Vercel — Edge route is ready.
3. Keep `productionBrowserSourceMaps: false`.
4. Never commit `.env` files.

## Prohibited (by design)

- Recursive CSS/JS/image fetching  
- Full-site ZIP download  
- Client-side CORS proxy tricks  
- Heavy 3D scenes  

---

© Source Code W · Educational use only · Respect robots.txt
