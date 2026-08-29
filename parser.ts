import * as cheerio from "cheerio";
import type { ExtractedSite, Resource, ResourceType } from "@/types";

export function resolveUrl(base: string, relative: string): string {
  if (!relative) return "";
  const rel = relative.trim();
  if (/^https?:\/\//i.test(rel)) return rel;
  if (rel.startsWith("//")) return "https:" + rel;
  if (/^(data:|blob:|javascript:|mailto:|tel:)/i.test(rel)) return rel;
  try {
    return new URL(rel, base).href;
  } catch {
    if (rel.startsWith("/")) {
      const origin = base.match(/^https?:\/\/[^/]+/);
      return origin ? origin[0] + rel : rel;
    }
    return base.replace(/\/[^/]*$/, "/") + rel;
  }
}

function push(list: Resource[], type: ResourceType, url: string, original?: string) {
  if (!url) return;
  if (list.some((r) => r.url === url && r.type === type)) return;
  list.push({ type, url, original: original || url });
}

export function parseHtml(raw: string, baseUrl: string) {
  const $ = cheerio.load(raw, { xml: false });
  const resources: Resource[] = [];
  const externalCss: string[] = [];
  const externalJs: string[] = [];

  const title = $("title").first().text().trim() || "";
  const description = $('meta[name="description"]').attr("content")?.trim() || "";
  const favicon =
    $('link[rel="icon"]').attr("href") ||
    $('link[rel="shortcut icon"]').attr("href") ||
    "";

  if (title) push(resources, "meta", `Title: ${title.slice(0, 120)}`);
  if (description) push(resources, "meta", `Description: ${description.slice(0, 100)}`);
  if (favicon) push(resources, "icon", resolveUrl(baseUrl, favicon), favicon);

  const inlineStyles: string[] = [];
  $("style").each((_, el) => {
    const t = $(el).html()?.trim();
    if (t) inlineStyles.push(t);
  });

  $('link[rel="stylesheet"], link[href$=".css"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const abs = resolveUrl(baseUrl, href);
      push(resources, "css", abs, href);
      externalCss.push(abs);
    }
  });

  const inlineScripts: string[] = [];
  $("script").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      const abs = resolveUrl(baseUrl, src);
      push(resources, "js", abs, src);
      externalJs.push(abs);
    } else {
      const t = $(el).html()?.trim();
      if (t) inlineScripts.push(t);
    }
  });

  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src && !src.startsWith("data:")) push(resources, "img", resolveUrl(baseUrl, src), src);
  });
  $("img[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset") || "";
    srcset.split(",").forEach((part) => {
      const u = part.trim().split(/\s+/)[0];
      if (u && !u.startsWith("data:")) push(resources, "img", resolveUrl(baseUrl, u), u);
    });
  });

  const styleBlob =
    inlineStyles.join("\n") +
    " " +
    $("[style]")
      .map((_, el) => $(el).attr("style") || "")
      .get()
      .join(" ");
  const bgRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = bgRe.exec(styleBlob)) !== null) {
    if (!m[1].startsWith("data:")) push(resources, "img", resolveUrl(baseUrl, m[1]), m[1]);
  }
  const fontRe = /@font-face[^}]*src:\s*url\(\s*['"]?([^'")]+)['"]?/gi;
  while ((m = fontRe.exec(styleBlob)) !== null) {
    push(resources, "font", resolveUrl(baseUrl, m[1]), m[1]);
  }

  $("video[src], audio[src], source[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (!src) return;
    const tag = ((el as { name?: string }).name || "video").toLowerCase();
    push(resources, tag === "audio" ? "audio" : "video", resolveUrl(baseUrl, src), src);
  });

  $("iframe[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) push(resources, "other", resolveUrl(baseUrl, src), src);
  });

  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.startsWith("http") && !href.startsWith("//")) return;
    const abs = resolveUrl(baseUrl, href);
    if (seen.has(abs)) return;
    seen.add(abs);
    push(resources, "link", abs, href);
  });

  const svgCount = $("svg").length;
  if (svgCount) push(resources, "svg", `${svgCount} inline SVG element(s)`);

  return {
    url: baseUrl,
    html: raw,
    css:
      inlineStyles.map((s, i) => `/* Inline Style ${i + 1} */\n${s}`).join("\n\n") ||
      "/* no inline styles */",
    js:
      inlineScripts.map((s, i) => `/* Inline Script ${i + 1} */\n${s}`).join("\n\n") ||
      "/* no inline scripts */",
    resources,
    meta: { title, description, favicon: favicon ? resolveUrl(baseUrl, favicon) : "" },
    externalCss,
    externalJs,
  };
}

export function buildStats(
  site: { html: string; css: string; js: string; resources: Resource[] },
  timeMs: number
): ExtractedSite["stats"] {
  return {
    htmlSize: new TextEncoder().encode(site.html).length,
    cssSize: new TextEncoder().encode(site.css).length,
    jsSize: new TextEncoder().encode(site.js).length,
    resourceCount: site.resources.length,
    htmlLines: site.html.split("\n").length,
    cssLines: site.css.split("\n").length,
    jsLines: site.js.split("\n").length,
    timeMs,
  };
}
