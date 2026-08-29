import { NextRequest, NextResponse } from "next/server";
import { fetchHtmlServer, fetchExternalAssets } from "@/lib/extractor";
import { parseHtml, buildStats } from "@/lib/parser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const fetchAssets = body?.fetchAssets !== false;

    if (!url || !/^https?:\/\/.+\..+/i.test(url)) {
      return NextResponse.json(
        { error: "Invalid URL. Must start with http:// or https://" },
        { status: 400 }
      );
    }

    try {
      const host = new URL(url).hostname.toLowerCase();
      if (
        host === "localhost" ||
        host.endsWith(".local") ||
        /^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)
      ) {
        return NextResponse.json(
          { error: "Private network URLs are not allowed" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const html = await fetchHtmlServer(url, 20000);
    const parsed = parseHtml(html, url);

    let css = parsed.css;
    let js = parsed.js;
    let cssExtra = "";
    let jsExtra = "";

    if (fetchAssets) {
      const assets = await fetchExternalAssets(
        parsed.externalCss || [],
        parsed.externalJs || [],
        8
      );
      cssExtra = assets.cssExtra;
      jsExtra = assets.jsExtra;
      if (cssExtra) {
        css =
          (css === "/* no inline styles */" ? "" : css + "\n\n") + cssExtra;
      }
      if (jsExtra) {
        js = (js === "/* no inline scripts */" ? "" : js + "\n\n") + jsExtra;
      }
    }

    const site = {
      url,
      html,
      css,
      js,
      resources: parsed.resources,
      meta: parsed.meta,
      stats: buildStats({ html, css, js, resources: parsed.resources }, Date.now() - t0),
    };

    return NextResponse.json({
      site,
      html,
      cssExtra,
      jsExtra,
      timeMs: Date.now() - t0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extract failed";
    const status =
      message.includes("aborted") || message.includes("Timeout") ? 504 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
