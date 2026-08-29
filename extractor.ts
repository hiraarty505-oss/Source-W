import { parseHtml, buildStats } from "./parser";
import type { ExtractedSite, Resource } from "@/types";

const CLIENT_PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

function looksLikeHtml(text: string): boolean {
  return (
    text.length > 80 &&
    (/<!DOCTYPE/i.test(text) || /<html/i.test(text) || /<body/i.test(text) || /<head/i.test(text))
  );
}

export async function fetchHtmlServer(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; SourceW/2.0; +https://github.com/hiraarty505-oss/Source-W)",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!looksLikeHtml(text)) throw new Error("Not HTML");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextServer(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SourceW/2.0)" },
        redirect: "follow",
      });
      if (!res.ok) return null;
      const text = await res.text();
      if (text.length > 2_000_000) return text.slice(0, 2_000_000) + "\n/* truncated */";
      return text;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function fetchExternalAssets(
  cssUrls: string[],
  jsUrls: string[],
  limit = 8
): Promise<{ cssExtra: string; jsExtra: string; fetched: Resource[] }> {
  const cssSlice = cssUrls.slice(0, limit);
  const jsSlice = jsUrls.slice(0, limit);
  const fetched: Resource[] = [];
  const cssParts: string[] = [];
  const jsParts: string[] = [];

  await Promise.all([
    ...cssSlice.map(async (url) => {
      const text = await fetchTextServer(url);
      if (text) {
        cssParts.push(`/* External: ${url} */\n${text}`);
        fetched.push({ type: "css", url, content: text, size: text.length });
      }
    }),
    ...jsSlice.map(async (url) => {
      const text = await fetchTextServer(url);
      if (text) {
        jsParts.push(`/* External: ${url} */\n${text}`);
        fetched.push({ type: "js", url, content: text, size: text.length });
      }
    }),
  ]);

  return {
    cssExtra: cssParts.join("\n\n"),
    jsExtra: jsParts.join("\n\n"),
    fetched,
  };
}

export async function fetchHtmlClient(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      mode: "cors",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const t = await res.text();
      if (looksLikeHtml(t)) return t;
    }
  } catch {
    /* continue */
  }
  for (const proxy of CLIENT_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const t = await res.text();
      if (looksLikeHtml(t)) return t;
    } catch {
      /* next */
    }
  }
  throw new Error("ALL_PROXIES_FAILED");
}

export async function extractFromHtml(
  raw: string,
  baseUrl: string,
  timeMs: number,
  extras?: { cssExtra?: string; jsExtra?: string }
): Promise<ExtractedSite> {
  const parsed = parseHtml(raw, baseUrl);
  let css = parsed.css;
  let js = parsed.js;
  if (extras?.cssExtra) {
    css = (css === "/* no inline styles */" ? "" : css + "\n\n") + extras.cssExtra;
  }
  if (extras?.jsExtra) {
    js = (js === "/* no inline scripts */" ? "" : js + "\n\n") + extras.jsExtra;
  }
  const site = {
    url: baseUrl,
    html: parsed.html,
    css,
    js,
    resources: parsed.resources,
    meta: parsed.meta,
  };
  return { ...site, stats: buildStats(site, timeMs) };
}

export async function extractSite(url: string): Promise<ExtractedSite> {
  const t0 = performance.now();
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, fetchAssets: true }),
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.site) return data.site as ExtractedSite;
      if (data.html) {
        return extractFromHtml(data.html, url, data.timeMs ?? performance.now() - t0, {
          cssExtra: data.cssExtra,
          jsExtra: data.jsExtra,
        });
      }
    }
  } catch {
    /* fall through */
  }
  const raw = await fetchHtmlClient(url);
  return extractFromHtml(raw, url, performance.now() - t0);
}
