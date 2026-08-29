"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtractedSite } from "@/types";
import { extractSite, extractFromHtml } from "@/lib/extractor";
import {
  getHistory,
  saveHistory,
  clearHistory,
  timeAgo,
  getTheme,
  setTheme,
} from "@/lib/storage";
import { downloadBlob, downloadSingle, downloadZip } from "@/lib/download";
import { idbSaveSite, idbSaveHistory } from "@/lib/idb";
import CodeEditor from "@/components/editor/CodeEditor";
import InstallBanner from "@/components/ui/InstallBanner";

type Tab = "html" | "css" | "js" | "resources" | "preview";

function bytes(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(2) + " MB";
}

function normalize(v: string) {
  v = v.trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
  return v;
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [site, setSite] = useState<ExtractedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState<Tab>("html");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [toast, setToast] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(getHistory());
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [offline, setOffline] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [useMonaco, setUseMonaco] = useState(true);

  useEffect(() => {
    const t = getTheme();
    setThemeState(t);
    setTheme(t);
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const runExtract = useCallback(
    async (target?: string) => {
      if (!navigator.onLine) {
        showToast("You are offline");
        return;
      }
      const u = normalize(target ?? url);
      if (!/^https?:\/\/.+\..+/i.test(u)) {
        showToast("Enter a valid URL (http/https)");
        return;
      }
      setUrl(u);
      setLoading(true);
      setProgress(15);
      setStatus("Connecting…");
      try {
        setProgress(35);
        setStatus("Fetching (server + assets)…");
        const result = await extractSite(u);
        setProgress(95);
        setStatus("Done");
        setSite(result);
        saveHistory(u, result.meta.title);
        setHistory(getHistory());
        idbSaveSite(result);
        idbSaveHistory({
          id: crypto.randomUUID(),
          url: u,
          domain: new URL(u).hostname,
          title: result.meta.title,
          timestamp: Date.now(),
          size: result.stats.htmlSize,
        });
        showToast(`Extracted ${bytes(result.stats.htmlSize)}`);
        setTab("html");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed";
        if (msg === "ALL_PROXIES_FAILED") {
          showToast("CORS blocked — try manual paste");
          setManualOpen(true);
        } else {
          showToast("Failed: " + msg);
        }
      } finally {
        setLoading(false);
        setProgress(0);
        setStatus("");
      }
    },
    [url]
  );

  const parsePaste = async () => {
    if (manualCode.trim().length < 20) {
      showToast("Paste more HTML");
      return;
    }
    const u = normalize(url) || "https://pasted.local";
    const s = await extractFromHtml(manualCode, u, 0);
    setSite(s);
    setManualOpen(false);
    showToast("Parsed pasted source");
  };

  const codeFor = (k: Tab) => {
    if (!site) return "";
    if (k === "html") return site.html;
    if (k === "css") return site.css;
    if (k === "js") return site.js;
    return "";
  };

  const langFor = (k: Tab): "html" | "css" | "javascript" =>
    k === "js" ? "javascript" : (k as "html" | "css");

  const previewSrcDoc = () => {
    if (!site) return "";
    let html = site.html
      .replace(/<script[\s\S]*?<\/script>/gi, "<!-- removed -->")
      .replace(/javascript:[^"'>\s]*/gi, "#")
      .replace(/\son\w+=["'][^"']*["']/gi, "");
    if (site.url && !/<base[\s>]/i.test(html)) {
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${site.url}">`)
        : `<base href="${site.url}">` + html;
    }
    return html;
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    let dropped =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain") ||
      "";
    const html = e.dataTransfer.getData("text/html");
    if (html) {
      const m = html.match(/href=["']([^"']+)["']/i);
      if (m) dropped = m[1];
    }
    dropped = dropped.trim().split("\n")[0];
    if (dropped) {
      setUrl(dropped);
      runExtract(dropped);
    }
  };

  const imgResources = site?.resources.filter((r) => r.type === "img" && r.url.startsWith("http")) || [];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {offline && (
        <div className="flex items-center justify-center gap-3 bg-[var(--fg)] px-4 py-2 text-sm font-semibold text-[var(--bg)]">
          You are offline — extraction needs a connection
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 font-mono text-sm font-bold text-white shadow-lg shadow-blue-500/30">
              {"{W}"}
            </div>
            <div>
              <div className="font-bold">Source W</div>
              <div className="text-xs text-[var(--muted)]">extract · preview · download</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost h-9 px-2 text-xs"
              onClick={() => setUseMonaco((v) => !v)}
              title="Toggle Monaco"
            >
              {useMonaco ? "Monaco" : "Plain"}
            </button>
            <button
              type="button"
              className="btn-ghost flex h-10 w-10 items-center justify-center p-0"
              onClick={() => {
                const n = theme === "dark" ? "light" : "dark";
                setThemeState(n);
                setTheme(n);
              }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div
          className={`glass relative mb-8 rounded-2xl p-6 shadow-glass transition ${
            dragOver ? "ring-2 ring-[var(--accent)]" : ""
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[var(--bg)]/90 text-sm font-semibold">
              Drop URL here
            </div>
          )}
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Website URL
          </label>
          <div className="relative mb-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setHistoryOpen(true)}
              onBlur={() => setTimeout(() => setHistoryOpen(false), 180)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  runExtract();
                }
              }}
              placeholder="https://example.com"
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              autoComplete="off"
              spellCheck={false}
            />
            {historyOpen && history.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-left text-sm hover:bg-[var(--bg)]"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setUrl(h.url);
                      runExtract(h.url);
                    }}
                  >
                    <span className="flex-1 truncate font-medium">{h.domain}</span>
                    <span className="text-xs text-[var(--muted)]">{timeAgo(h.timestamp)}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full py-2 text-center text-sm font-semibold text-[var(--muted)]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    clearHistory();
                    setHistory([]);
                  }}
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={loading || offline}
            onClick={() => runExtract()}
          >
            {loading ? status || "Extracting…" : "Extract Source Code"}
          </button>
          {loading && (
            <div className="mt-3 h-1 overflow-hidden rounded bg-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <p className="mt-3 text-sm text-[var(--muted)]">
            Drag-drop URL ·{" "}
            <kbd className="rounded border border-[var(--border)] px-1 font-mono text-xs">Ctrl</kbd>+
            <kbd className="rounded border border-[var(--border)] px-1 font-mono text-xs">Enter</kbd> ·{" "}
            <button type="button" className="text-[var(--accent)] underline" onClick={() => setManualOpen(true)}>
              paste code manually
            </button>
          </p>
        </div>

        {!site && (
          <div className="py-16 text-center text-[var(--muted)]">
            <div className="animate-float mb-4 text-4xl opacity-50">⌕</div>
            <p>Enter a website URL above to extract its complete source code</p>
          </div>
        )}

        {site && (
          <>
            {site.meta.title && (
              <p className="mb-3 text-sm text-[var(--muted)]">
                Extracted from <strong className="text-[var(--fg)]">{new URL(site.url).hostname}</strong>
                {site.meta.title ? ` — ${site.meta.title}` : ""}
              </p>
            )}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["📄", bytes(site.stats.htmlSize), "HTML"],
                ["🎨", bytes(site.stats.cssSize), "CSS"],
                ["⚡", bytes(site.stats.jsSize), "JS"],
                ["🔗", site.stats.resourceCount, "Resources"],
              ].map(([icon, val, label]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center"
                >
                  <div className="mb-1 text-lg">{icon}</div>
                  <div className="font-mono text-sm font-bold">{val}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</div>
                </div>
              ))}
            </div>
            <div className="mb-4 flex justify-center">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold">
                ⏱ {(site.stats.timeMs / 1000).toFixed(1)}s · CSS/JS external fetched server-side
              </span>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" className="btn-primary text-sm" onClick={() => downloadBlob(site.html, "sourcew-source.html", "text/html")}>
                📄 HTML
              </button>
              <button type="button" className="btn-primary text-sm" onClick={() => downloadBlob(site.css, "sourcew-style.css", "text/css")}>
                🎨 CSS
              </button>
              <button type="button" className="btn-primary text-sm" onClick={() => downloadBlob(site.js, "sourcew-script.js", "application/javascript")}>
                ⚡ JS
              </button>
              <button
                type="button"
                className="btn-primary bg-gradient-to-r from-blue-500 to-violet-500 text-sm text-white"
                onClick={() => downloadZip(site).then(() => showToast("ZIP ready"))}
              >
                📦 ZIP
              </button>
              <button type="button" className="btn-ghost col-span-2 text-sm" onClick={() => { downloadSingle(site); showToast("Bundle downloaded"); }}>
                Single HTML file
              </button>
              <button type="button" className="btn-ghost col-span-2 text-sm text-[var(--muted)]" onClick={() => { setSite(null); setUrl(""); showToast("Cleared"); }}>
                ✕ Clear All
              </button>
            </div>

            <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
              {([
                ["html", "</> HTML"],
                ["css", "# CSS"],
                ["js", "{ } JS"],
                ["resources", "🔗 Resources"],
                ["preview", "👁 Preview"],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === id ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--muted)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              {(["html", "css", "js"] as Tab[]).includes(tab) && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                    <div className="flex gap-2 font-mono text-xs">
                      <span className="font-semibold">
                        {tab === "html" ? "source.html" : tab === "css" ? "styles.css" : "script.js"}
                      </span>
                      <span className="text-[var(--muted)]">
                        {bytes(tab === "html" ? site.stats.htmlSize : tab === "css" ? site.stats.cssSize : site.stats.jsSize)}
                      </span>
                      <span className="text-[var(--muted)]">
                        {codeFor(tab).split("\n").length.toLocaleString()} lines
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost h-8 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(codeFor(tab));
                          showToast("Copied");
                        } catch {
                          showToast("Copy failed");
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  {useMonaco ? (
                    <CodeEditor value={codeFor(tab)} language={langFor(tab)} theme={theme} height="440px" />
                  ) : (
                    <pre className="max-h-[440px] overflow-auto p-4 font-mono text-xs leading-relaxed">
                      {codeFor(tab).slice(0, 300000)}
                    </pre>
                  )}
                </>
              )}

              {tab === "resources" && (
                <div className="max-h-[480px] overflow-auto p-3">
                  {imgResources.length > 0 && (
                    <div className="mb-4">
                      <h3 className="mb-2 text-sm font-bold">Images</h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {imgResources.slice(0, 24).map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.url} alt="" className="h-24 w-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div className="truncate px-2 py-1 text-[10px] text-[var(--muted)]">{r.url}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {site.resources.length === 0 ? (
                    <p className="p-8 text-center text-[var(--muted)]">No resources found</p>
                  ) : (
                    Object.entries(
                      site.resources.reduce<Record<string, typeof site.resources>>((acc, r) => {
                        (acc[r.type] ||= []).push(r);
                        return acc;
                      }, {})
                    ).map(([type, items]) => (
                      <details key={type} open className="border-b border-[var(--border)]">
                        <summary className="cursor-pointer px-2 py-2 text-sm font-bold">
                          {type.toUpperCase()}{" "}
                          <span className="ml-1 rounded bg-[var(--bg)] px-1.5 text-[10px] text-[var(--muted)]">{items.length}</span>
                        </summary>
                        {items.map((r, i) =>
                          r.url.startsWith("http") ? (
                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block break-all border-t border-[var(--border)] px-3 py-2 text-sm hover:text-[var(--accent)]">
                              {r.url}
                            </a>
                          ) : (
                            <div key={i} className="break-all border-t border-[var(--border)] px-3 py-2 text-sm opacity-80">
                              {r.url}
                            </div>
                          )
                        )}
                      </details>
                    ))
                  )}
                </div>
              )}

              {tab === "preview" && (
                <div>
                  <div className="flex gap-1 border-b border-[var(--border)] px-3 py-2">
                    {(["desktop", "tablet", "mobile"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDevice(d)}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${device === d ? "bg-[var(--bg)]" : "text-[var(--muted)]"}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="border-b border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-mono text-xs text-[var(--muted)]">
                    {site.url}
                  </div>
                  <div
                    className={`mx-auto bg-white transition-all ${
                      device === "mobile"
                        ? "max-w-[390px] rounded-[24px] border-8 border-zinc-800"
                        : device === "tablet"
                          ? "max-w-[768px] border-x border-[var(--border)]"
                          : "w-full"
                    }`}
                  >
                    <iframe
                      title="Preview"
                      sandbox="allow-same-origin"
                      srcDoc={previewSrcDoc()}
                      className={`w-full border-0 ${device === "mobile" ? "min-h-[620px]" : "min-h-[400px] h-[50vh]"}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {manualOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setManualOpen(false);
          }}
        >
          <div className="glass max-h-[85vh] w-full max-w-xl overflow-auto rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Paste source code</h2>
              <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => setManualOpen(false)}>
                ×
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Right-click page → View Page Source → Select All → Copy → Paste
            </p>
            <textarea
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="mb-3 h-56 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Paste HTML here…"
            />
            <button type="button" className="btn-primary w-full" onClick={parsePaste}>
              Extract from Paste
            </button>
          </div>
        </div>
      )}

      <InstallBanner />
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
