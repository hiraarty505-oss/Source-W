(function () {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const state = {
    url: "", html: "", css: "", js: "", resources: [], hasData: false,
    stats: { htmlSize: 0, cssSize: 0, jsSize: 0, htmlLines: 0, cssLines: 0, jsLines: 0, resourceCount: 0, extractTime: 0 },
  };

  const PROXY_LIST = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  ];

  const HIST_KEY = "sourcew_history";
  const THEME_KEY = "sourcew_theme";
  const INSTALL_KEY = "sourcew_install_dismissed";

  const landing = $("#landing"), mainApp = $("#mainApp"), enterBtn = $("#enterBtn"), tagline = $("#tagline");
  const urlInput = $("#urlInput"), extractBtn = $("#extractBtn"), inputCard = $("#inputCard"), inputRow = $(".input-row");
  const urlStatus = $("#urlStatus"), dropZone = $("#dropZone"), dropOverlay = $("#dropOverlay"), historyDd = $("#historyDd");
  const actionBar = $("#actionBar"), emptyState = $("#emptyState"), results = $("#results");
  const statsBar = $("#statsBar"), domainBar = $("#domainBar"), extractOv = $("#extractOv");
  const statusText = $("#statusText"), progFill = $("#progFill"), progPct = $("#progPct");
  const toasts = $("#toasts"), srLive = $("#srLive"), offlineBanner = $("#offlineBanner");
  const previewFrame = $("#previewFrame"), previewLoad = $("#previewLoad"), previewErr = $("#previewErr");
  const themeBtn = $("#themeBtn"), manualModal = $("#manualModal"), installBar = $("#installBar");

  let particleId = null, autoEnter = null, progTimer = null, deferredPrompt = null;

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    toasts.appendChild(t);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    setTimeout(() => t.remove(), 3000);
  }
  function announce(m) { srLive.textContent = m; }

  /* Theme */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeBtn.textContent = t === "dark" ? "☀" : "🌙";
    localStorage.setItem(THEME_KEY, t);
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  themeBtn.addEventListener("click", () => applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));

  /* Offline */
  function updateOnline() {
    const on = navigator.onLine;
    offlineBanner.classList.toggle("hidden", on);
    extractBtn.disabled = !on;
  }
  addEventListener("online", updateOnline);
  addEventListener("offline", updateOnline);
  updateOnline();

  /* Landing */
  function initLanding() {
    initParticles();
    typewriter("extract · preview · download", 50);
    enterBtn.addEventListener("click", enterApp);
    if (!reduced) autoEnter = setTimeout(() => { if (!landing.classList.contains("exiting")) enterApp(); }, 5000);
  }
  function enterApp() {
    if (landing.classList.contains("exiting")) return;
    if (autoEnter) clearTimeout(autoEnter);
    if (particleId) cancelAnimationFrame(particleId);
    landing.classList.add("exiting");
    setTimeout(() => {
      landing.style.display = "none";
      mainApp.classList.remove("hidden");
      void mainApp.offsetWidth;
      mainApp.classList.add("visible");
      setTimeout(() => urlInput.focus(), 300);
    }, reduced ? 0 : 800);
  }
  function typewriter(text, speed) {
    let i = 0; tagline.textContent = "";
    if (reduced) { tagline.textContent = text; return; }
    (function tick() {
      if (i < text.length) { tagline.textContent += text[i++]; setTimeout(tick, speed); }
      else { const c = document.createElement("span"); c.className = "cur"; tagline.appendChild(c); }
    })();
  }
  function initParticles() {
    const canvas = $("#particle-canvas");
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -1e3, y: -1e3 };
    let parts = [];
    const N = Math.min(150, Math.floor((innerWidth * innerHeight) / 10000));
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize();
    addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    for (let i = 0; i < N; i++) parts.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, s: Math.random() * 2 + 0.4, o: Math.random() * 0.45 + 0.15 });
    (function loop() {
      if (landing.classList.contains("exiting") || landing.style.display === "none") return;
      particleId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 120 && d > 0) { const f = (120 - d) / 120; p.vx += (dx / d) * f * 0.5; p.vy += (dy / d) * f * 0.5; }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy *= 0.98;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`; ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - d / 110)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
      }
    })();
  }

  /* URL validation + history + drag */
  function normalizeUrl(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    return v;
  }
  const validateUrl = debounce(() => {
    const raw = urlInput.value.trim();
    inputRow.classList.remove("valid", "invalid");
    if (!raw) { urlStatus.textContent = ""; return; }
    const full = normalizeUrl(raw);
    const ok = /^https?:\/\/.+\..+/i.test(full);
    inputRow.classList.add(ok ? "valid" : "invalid");
    urlStatus.textContent = ok ? "✓ Ready to extract" : "Please enter a valid URL";
  }, 300);
  urlInput.addEventListener("input", validateUrl);
  urlInput.addEventListener("focus", () => { renderHistory(); historyDd.classList.remove("hidden"); });
  urlInput.addEventListener("blur", () => setTimeout(() => historyDd.classList.add("hidden"), 200));

  function getHistory() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; } }
  function saveHistory(url) {
    let h = getHistory().filter((x) => x.url !== url);
    let domain = url;
    try { domain = new URL(url).hostname; } catch {}
    h.unshift({ url, domain, timestamp: Date.now() });
    localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 10)));
  }
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function renderHistory() {
    const h = getHistory();
    if (!h.length) { historyDd.innerHTML = ""; historyDd.classList.add("hidden"); return; }
    historyDd.innerHTML = h.map((x) =>
      `<button type="button" role="option" data-url="${x.url.replace(/"/g, "&quot;")}"><span class="h-dom">${x.domain || x.url}</span><span class="h-time">${timeAgo(x.timestamp)}</span></button>`
    ).join("") + `<button type="button" class="h-clear" data-clear="1">Clear history</button>`;
    historyDd.querySelectorAll("button").forEach((b) => {
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (b.dataset.clear) { localStorage.removeItem(HIST_KEY); historyDd.innerHTML = ""; return; }
        urlInput.value = b.dataset.url;
        validateUrl();
        historyDd.classList.add("hidden");
        handleExtract();
      });
    });
  }

  ["dragenter", "dragover"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); inputRow.classList.add("drag"); dropOverlay.classList.remove("hidden"); });
  });
  ["dragleave", "drop"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); inputRow.classList.remove("drag"); dropOverlay.classList.add("hidden"); });
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    let url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || "";
    const html = e.dataTransfer.getData("text/html");
    if (html) { const m = html.match(/href=["']([^"']+)["']/i); if (m) url = m[1]; }
    url = (url || "").trim().split("\n")[0];
    if (url) { urlInput.value = url; validateUrl(); handleExtract(); }
  });

  /* Card tilt */
  function initTilt() {
    if (reduced) return;
    $$(".card-3d").forEach((card) => {
      if (card.dataset.t) return;
      card.dataset.t = "1";
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const rx = Math.max(-10, Math.min(10, ((r.height / 2 - y) / (r.height / 2)) * 10));
        const ry = Math.max(-10, Math.min(10, ((x - r.width / 2) / (r.width / 2)) * 10));
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transition = "transform .4s ease"; card.style.transform = ""; setTimeout(() => { card.style.transition = ""; }, 400); });
    });
  }

  /* Multi-proxy fetch */
  async function fetchWithProxy(url, onProgress) {
    try {
      const res = await fetch(url, { mode: "cors", headers: { Accept: "text/html" }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        if (res.body && res.body.getReader && onProgress) {
          const reader = res.body.getReader();
          const chunks = []; let received = 0;
          const len = +res.headers.get("content-length") || 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value); received += value.length;
            if (len) onProgress(Math.min(90, Math.floor((received / len) * 90)));
          }
          const buf = new Uint8Array(received);
          let pos = 0;
          for (const c of chunks) { buf.set(c, pos); pos += c.length; }
          const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
          if (text.length > 100 && (text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("<HTML"))) return text;
        } else {
          const text = await res.text();
          if (text.length > 100 && (text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("<HTML"))) return text;
        }
      }
    } catch (_) {}

    for (const proxyFn of PROXY_LIST) {
      try {
        const res = await fetch(proxyFn(url), { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const text = await res.text();
          if (text.length > 100 && (text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("<HTML") || text.includes("<body"))) return text;
        }
      } catch (_) { continue; }
    }
    throw new Error("ALL_PROXIES_FAILED");
  }

  /* Parse everything */
  function resolveURL(rel, base) {
    if (!rel || typeof rel !== "string") return "";
    rel = rel.trim();
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith("//")) return "https:" + rel;
    if (rel.startsWith("data:") || rel.startsWith("blob:") || rel.startsWith("javascript:") || rel.startsWith("mailto:") || rel.startsWith("tel:")) return rel;
    if (rel.startsWith("#")) return base + rel;
    try { return new URL(rel, base).href; } catch {
      if (rel.startsWith("/")) {
        const o = base.match(/^https?:\/\/[^/]+/);
        return o ? o[0] + rel : rel;
      }
      return base.replace(/\/[^/]*$/, "/") + rel;
    }
  }

  function parseSourceCode(rawHTML, baseUrl) {
    state.html = rawHTML;
    const styles = [];
    let m;
    const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = styleRe.exec(rawHTML)) !== null) styles.push(m[1].trim());
    state.css = styles.map((s, i) => `/* Inline Style Block ${i + 1} */\n${s}`).join("\n\n") || "/* no inline styles */";

    const scripts = [];
    const scriptRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = scriptRe.exec(rawHTML)) !== null) scripts.push(m[1].trim());
    state.js = scripts.map((s, i) => `/* Inline Script Block ${i + 1} */\n${s}`).join("\n\n") || "/* no inline scripts */";

    state.resources = [];
    const push = (type, url, original, tag) => { if (url) state.resources.push({ type, url, original: original || url, tag: tag || type }); };

    const title = rawHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title) push("meta", "Title: " + title[1].trim().slice(0, 120), "", "title");
    const charset = rawHTML.match(/charset=["']?([^"'>\s]+)/i);
    if (charset) push("meta", "Charset: " + charset[1], "", "meta");
    const desc = rawHTML.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (desc) push("meta", "Description: " + desc[1].slice(0, 80), "", "meta");

    const linkRe = /<link[^>]*>/gi;
    while ((m = linkRe.exec(rawHTML)) !== null) {
      const tag = m[0];
      const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href) continue;
      const rel = ((tag.match(/rel=["']([^"']+)["']/i) || [])[1] || "").toLowerCase();
      if (rel.includes("stylesheet") || href.endsWith(".css")) push("css", resolveURL(href, baseUrl), href, "link");
      else if (rel.includes("icon")) push("icon", resolveURL(href, baseUrl), href, "link");
      else push("link", resolveURL(href, baseUrl), href, "link");
    }
    const extScriptRe = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = extScriptRe.exec(rawHTML)) !== null) push("js", resolveURL(m[1], baseUrl), m[1], "script");
    const imgRe = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = imgRe.exec(rawHTML)) !== null) push("img", resolveURL(m[1], baseUrl), m[1], "img");
    const bgRe = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    while ((m = bgRe.exec(rawHTML)) !== null) push("bg-img", resolveURL(m[1], baseUrl), m[1], "style");
    let svgCount = 0;
    const svgRe = /<svg[\s>]/gi;
    while (svgRe.exec(rawHTML) !== null) svgCount++;
    if (svgCount) push("meta", svgCount + " inline SVG element(s)", "", "svg");
    const seen = new Set();
    const aRe = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    while ((m = aRe.exec(rawHTML)) !== null) {
      const href = m[1];
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
      const abs = resolveURL(href, baseUrl);
      if (!abs.startsWith("http") || seen.has(abs)) continue;
      seen.add(abs); push("link", abs, href, "a");
    }
    const fontRe = /@font-face\s*\{[^}]*src\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    while ((m = fontRe.exec(rawHTML)) !== null) push("font", resolveURL(m[1], baseUrl), m[1], "font-face");
    const videoRe = /<(?:video|source)[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = videoRe.exec(rawHTML)) !== null) push("video", resolveURL(m[1], baseUrl), m[1], "video");
    const audioRe = /<(?:audio|source)[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = audioRe.exec(rawHTML)) !== null) push("audio", resolveURL(m[1], baseUrl), m[1], "audio");
    const iframeRe = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = iframeRe.exec(rawHTML)) !== null) push("iframe", resolveURL(m[1], baseUrl), m[1], "iframe");

    state.stats = {
      htmlSize: new Blob([state.html]).size,
      cssSize: new Blob([state.css]).size,
      jsSize: new Blob([state.js]).size,
      htmlLines: state.html.split("\n").length,
      cssLines: state.css.split("\n").length,
      jsLines: state.js.split("\n").length,
      resourceCount: state.resources.length,
      extractTime: 0,
    };
  }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }
  function escapeHTML(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* Highlight */
  function hiHTML(code) {
    let e = escapeHTML(code);
    e = e.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-cmt">$1</span>');
    e = e.replace(/(&lt;\/?[a-zA-Z][\w\-]*)(.*?)(\/?&gt;)/g, (m, tag, attrs, end) => {
      const ha = attrs.replace(/([\w\-:]+)=(&quot;.*?&quot;|&#39;.*?&#39;|"[^"]*"|'[^']*')/g, '<span class="tok-attr">$1</span>=<span class="tok-str">$2</span>');
      return `<span class="tok-tag">${tag}</span>${ha}<span class="tok-tag">${end}</span>`;
    });
    return e;
  }
  function hiCSS(code) {
    let e = escapeHTML(code);
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cmt">$1</span>');
    e = e.replace(/([^{}/]+)(\{)/g, '<span class="tok-sel">$1</span>$2');
    e = e.replace(/([a-zA-Z\-]+)\s*:\s*([^;{}]+);/g, '<span class="tok-prop">$1</span>: <span class="tok-val">$2</span>;');
    return e;
  }
  function hiJS(code) {
    let e = escapeHTML(code);
    e = e.replace(/(\/\/[^\n]*)/g, '<span class="tok-cmt">$1</span>');
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cmt">$1</span>');
    e = e.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[^`]*`)/g, '<span class="tok-str">$1</span>');
    e = e.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|try|catch|throw|typeof|instanceof)\b/g, '<span class="tok-kw">$1</span>');
    e = e.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="tok-fn">$1</span>(');
    e = e.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    return e;
  }

  function setLines(codeId, lnId) {
    const n = Math.max(($(codeId).textContent || "").split("\n").length, 1);
    $(lnId).innerHTML = Array.from({ length: n }, (_, i) => i + 1).join("<br>");
  }

  function updatePanels() {
    const max = 300000;
    const trunc = (s) => (s.length > max ? s.slice(0, max) + "\n\n/* truncated for display */" : s);
    $("#htmlCode").innerHTML = hiHTML(trunc(state.html));
    $("#htmlSize").textContent = formatBytes(state.stats.htmlSize);
    $("#htmlLines").textContent = state.stats.htmlLines.toLocaleString() + " lines";
    setLines("#htmlCode", "#htmlLns");

    $("#cssCode").innerHTML = hiCSS(trunc(state.css));
    $("#cssSize").textContent = formatBytes(state.stats.cssSize);
    $("#cssLines").textContent = state.stats.cssLines.toLocaleString() + " lines";
    setLines("#cssCode", "#cssLns");

    $("#jsCode").innerHTML = hiJS(trunc(state.js));
    $("#jsSize").textContent = formatBytes(state.stats.jsSize);
    $("#jsLines").textContent = state.stats.jsLines.toLocaleString() + " lines";
    setLines("#jsCode", "#jsLns");

    updateResources();
  }

  function updateResources() {
    const body = $("#resBody");
    const groups = {};
    state.resources.forEach((r) => { (groups[r.type] = groups[r.type] || []).push(r); });
    const labels = { meta: "Meta", css: "CSS", js: "JavaScript", img: "Images", "bg-img": "Background Images", icon: "Icons", link: "Links", font: "Fonts", video: "Video", audio: "Audio", iframe: "Iframes" };
    let html = "";
    Object.keys(labels).forEach((k) => {
      if (!groups[k] || !groups[k].length) return;
      html += `<details class="res-g" open><summary>${labels[k]} <span class="res-badge">${groups[k].length}</span></summary>`;
      groups[k].forEach((r) => {
        if (r.url.startsWith("http")) html += `<a href="${escapeHTML(r.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(r.url)}</a>`;
        else html += `<a style="pointer-events:none;opacity:.8">${escapeHTML(r.url)}</a>`;
      });
      html += "</details>";
    });
    body.innerHTML = html || '<p class="res-empty">No resources found. Extract a URL to see external assets.</p>';
    $("#resCount").textContent = state.stats.resourceCount + " found";
  }

  function updateStats() {
    const t = state.stats.extractTime;
    const time = t < 1000 ? Math.round(t) + "ms" : (t / 1000).toFixed(1) + "s";
    statsBar.innerHTML = [
      ["📄 HTML", formatBytes(state.stats.htmlSize) + " · " + state.stats.htmlLines.toLocaleString() + " lines"],
      ["🎨 CSS", formatBytes(state.stats.cssSize) + " · " + state.stats.cssLines.toLocaleString() + " lines"],
      ["⚡ JS", formatBytes(state.stats.jsSize) + " · " + state.stats.jsLines.toLocaleString() + " lines"],
      ["🔗 Resources", state.stats.resourceCount + " found"],
      ["⏱ Time", time],
    ].map(([label, val]) => `<div class="stat"><span>${label}</span><strong>${val}</strong></div>`).join("");
  }

  function showResults() {
    emptyState.classList.add("hidden");
    actionBar.classList.remove("hidden");
    results.classList.remove("hidden");
    statsBar.classList.remove("hidden");
    domainBar.classList.remove("hidden");
    let host = state.url;
    try { host = new URL(state.url).hostname; } catch {}
    domainBar.textContent = "Extracted from " + host;
    updatePanels();
    updateStats();
    setTimeout(initTilt, 100);
  }

  /* Extract flow */
  function setLoading(on) {
    extractBtn.querySelector(".btn-label").classList.toggle("hidden", on);
    extractBtn.querySelector(".btn-dots").classList.toggle("hidden", !on);
    extractBtn.disabled = on || !navigator.onLine;
  }
  function buildStreams() {
    const s = $("#streams"); s.innerHTML = "";
    for (let c = 0; c < 3; c++) {
      const col = document.createElement("div"); col.className = "stream-col";
      for (let i = 0; i < 12; i++) { const sp = document.createElement("span"); sp.style.height = 10 + Math.random() * 24 + "px"; col.appendChild(sp); }
      s.appendChild(col);
    }
  }
  function startProg() {
    let p = 0; progFill.style.width = "0%"; progPct.textContent = "0%";
    clearInterval(progTimer);
    progTimer = setInterval(() => {
      p = Math.min(90, p + (p < 40 ? 3.5 : p < 70 ? 1.5 : 0.6));
      progFill.style.width = p + "%"; progPct.textContent = Math.floor(p) + "%";
    }, 100);
  }
  function finishProg() {
    clearInterval(progTimer);
    progFill.style.width = "100%"; progPct.textContent = "100%";
  }
  function showOverlay(show) {
    if (show) {
      extractOv.classList.remove("hidden");
      extractOv.setAttribute("aria-hidden", "false");
      extractOv.classList.add("on");
      buildStreams();
      if (!reduced) inputCard.classList.add("break");
      statusText.textContent = "Connecting…";
      startProg();
      announce("Extracting");
    } else {
      extractOv.classList.add("hidden");
      extractOv.setAttribute("aria-hidden", "true");
      extractOv.classList.remove("on");
      inputCard.classList.remove("break");
      inputCard.style.transform = "";
      clearInterval(progTimer);
    }
  }

  async function handleExtract() {
    if (!navigator.onLine) { showToast("You are offline"); return; }
    let url = normalizeUrl(urlInput.value);
    if (!/^https?:\/\/.+\..+/i.test(url)) {
      showToast("URL must start with http:// or https://");
      urlInput.focus(); inputRow.classList.add("invalid"); return;
    }
    state.url = url;
    urlInput.value = url;
    setLoading(true);
    showOverlay(true);
    const t0 = performance.now();
    try {
      await delay(reduced ? 0 : 300);
      statusText.textContent = "Fetching website…";
      const raw = await fetchWithProxy(url, (pct) => {
        progFill.style.width = pct + "%"; progPct.textContent = pct + "%";
      });
      if (!raw || raw.length < 50) throw new Error("EMPTY_RESPONSE");
      if (raw.length > 2 * 1024 * 1024) showToast("Large page (>2MB) — still extracting");
      statusText.textContent = "Parsing source code…";
      await delay(reduced ? 0 : 200);
      parseSourceCode(raw, url);
      state.stats.extractTime = performance.now() - t0;
      state.hasData = true;
      saveHistory(url);
      statusText.textContent = "Done!";
      finishProg();
      await delay(reduced ? 0 : 250);
      showOverlay(false);
      setLoading(false);
      showResults();
      let host = url;
      try { host = new URL(url).hostname; } catch {}
      showToast(`Extracted ${formatBytes(state.stats.htmlSize)} from ${host}`);
      announce("Extraction complete");
    } catch (err) {
      showOverlay(false);
      setLoading(false);
      if (err.message === "ALL_PROXIES_FAILED" || err.name === "TypeError") {
        showToast("CORS blocked. Try manual paste.");
        showManualFallback();
      } else if (err.message === "EMPTY_RESPONSE") {
        showToast("Empty response. Try another URL.");
      } else if (err.name === "AbortError" || err.name === "TimeoutError") {
        showToast("Request timed out. Site may be slow or large.");
      } else {
        showToast("Failed: " + (err.message || "unknown error"));
      }
    }
  }
  extractBtn.addEventListener("click", handleExtract);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleExtract(); }
  });

  /* Manual fallback */
  function showManualFallback() {
    manualModal.classList.remove("hidden");
    $("#manualInput").focus();
  }
  $("#manualBtn").addEventListener("click", showManualFallback);
  $("#manualClose").addEventListener("click", () => manualModal.classList.add("hidden"));
  manualModal.addEventListener("click", (e) => { if (e.target === manualModal) manualModal.classList.add("hidden"); });
  $("#parseManual").addEventListener("click", () => {
    const code = $("#manualInput").value.trim();
    if (!code || code.length < 20) { showToast("Please paste HTML source code"); return; }
    state.url = state.url || normalizeUrl(urlInput.value) || "https://pasted.local";
    parseSourceCode(code, state.url);
    state.stats.extractTime = 0;
    state.hasData = true;
    manualModal.classList.add("hidden");
    showResults();
    showToast("Source code parsed successfully!");
  });

  /* Tabs */
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      $$(".tab").forEach((b) => { const on = b === btn; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
      $$(".panel").forEach((p) => {
        const on = p.id === "panel-" + tab;
        p.classList.toggle("active", on);
        p.hidden = !on;
      });
      if (tab === "preview") loadPreview();
    });
  });

  function sanitizeForPreview(html) {
    let s = html;
    s = s.replace(/<script[\s\S]*?<\/script>/gi, "<!-- script removed -->");
    s = s.replace(/javascript:[^"'>\s]*/gi, "#");
    s = s.replace(/\son\w+=["'][^"']*["']/gi, "");
    s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "<!-- iframe removed -->");
    s = s.replace(/<(object|embed)[\s\S]*?<\/\1>/gi, "<!-- removed -->");
    s = s.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, "");
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: https:; script-src \'none\'; object-src \'none\';">';
    if (/<head[^>]*>/i.test(s)) s = s.replace(/<head([^>]*)>/i, "<head$1>" + csp);
    else s = csp + s;
    if (state.url && !/<base[\s>]/i.test(s)) {
      const base = `<base href="${state.url}">`;
      s = /<head[^>]*>/i.test(s) ? s.replace(/<head([^>]*)>/i, `<head$1>${base}`) : base + s;
    }
    return s;
  }
  function loadPreview() {
    if (!state.html) return;
    previewErr.classList.add("hidden");
    previewLoad.classList.remove("hidden");
    try {
      previewFrame.srcdoc = sanitizeForPreview(state.html);
      previewFrame.onload = () => previewLoad.classList.add("hidden");
    } catch {
      previewLoad.classList.add("hidden");
      previewErr.classList.remove("hidden");
    }
    setTimeout(() => previewLoad.classList.add("hidden"), 5000);
  }

  /* Search */
  $$(".find").forEach((inp) => {
    inp.addEventListener("input", debounce(() => {
      const panel = inp.dataset.panel;
      const code = $("#" + panel + "Code");
      if (!code) return;
      let html = code.innerHTML.replace(/<mark class="hit">([\s\S]*?)<\/mark>/g, "$1");
      const q = inp.value.trim();
      const matchEl = $("#" + panel + "Matches");
      if (!q) { code.innerHTML = html; matchEl.textContent = ""; return; }
      try {
        const re = new RegExp("(" + escapeHTML(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
        let count = 0;
        code.innerHTML = html.replace(re, (m) => { count++; return '<mark class="hit">' + m + "</mark>"; });
        matchEl.textContent = count ? count + " matches" : "0";
      } catch { code.innerHTML = html; matchEl.textContent = ""; }
    }, 200));
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { inp.value = ""; inp.dispatchEvent(new Event("input")); }
    });
  });

  /* Copy / Download / Clear */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(state[this.dataset.copy] || "");
        const o = this.textContent; this.textContent = "Copied!"; this.classList.add("copied");
        showToast("Copied to clipboard");
        setTimeout(() => { this.textContent = o; this.classList.remove("copied"); }, 2000);
      } catch { showToast("Copy failed"); }
    });
  });

  function downloadFile(content, name, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content || ""], { type: mime }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function singleFile() {
    return `<!DOCTYPE html>\n<!-- SOURCE W EXTRACTED from ${state.url} -->\n<html><head><meta charset="UTF-8"><title>Source W Extract</title>\n<style>\n${state.css}\n</style></head><body>\n` +
      ((state.html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, state.html])[1] || "") +
      `\n<script>\n${state.js}\n<\/script></body></html>`;
  }
  $$("[data-dl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.hasData) return;
      const type = btn.dataset.dl;
      if (type === "all") {
        downloadFile(state.html, "sourcew-source.html", "text/html");
        setTimeout(() => downloadFile(state.css, "sourcew-style.css", "text/css"), 200);
        setTimeout(() => downloadFile(state.js, "sourcew-script.js", "application/javascript"), 400);
        showToast("Downloading all files…");
      } else if (type === "single") {
        downloadFile(singleFile(), "sourcew-bundle.html", "text/html");
        showToast("Downloading single HTML…");
      } else {
        const map = { html: [state.html, "sourcew-source.html", "text/html"], css: [state.css, "sourcew-style.css", "text/css"], js: [state.js, "sourcew-script.js", "application/javascript"] };
        const [c, n, m] = map[type];
        downloadFile(c, n, m);
        showToast("Downloading " + type.toUpperCase() + "…");
      }
    });
  });

  $("#clearBtn").addEventListener("click", () => {
    if (!state.hasData) return;
    $$(".panel").forEach((p) => { p.style.transition = "all .3s"; p.style.opacity = "0"; p.style.transform = "translateZ(-200px)"; });
    setTimeout(() => {
      Object.assign(state, { url: "", html: "", css: "", js: "", resources: [], hasData: false, stats: { htmlSize: 0, cssSize: 0, jsSize: 0, htmlLines: 0, cssLines: 0, jsLines: 0, resourceCount: 0, extractTime: 0 } });
      urlInput.value = ""; inputRow.classList.remove("valid", "invalid"); urlStatus.textContent = "";
      ["html", "css", "js"].forEach((k) => { $("#" + k + "Code").innerHTML = ""; $("#" + k + "Lns").innerHTML = "1"; $("#" + k + "Size").textContent = "0 B"; $("#" + k + "Lines").textContent = "0 lines"; $("#" + k + "Matches").textContent = ""; });
      $("#resBody").innerHTML = ""; $("#resCount").textContent = "0 found";
      previewFrame.removeAttribute("srcdoc");
      actionBar.classList.add("hidden"); results.classList.add("hidden"); statsBar.classList.add("hidden"); domainBar.classList.add("hidden"); emptyState.classList.remove("hidden");
      $$(".panel").forEach((p) => { p.style.opacity = ""; p.style.transform = ""; p.style.transition = ""; });
      $$(".tab").forEach((b) => { const on = b.dataset.tab === "html"; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
      $$(".panel").forEach((p) => { const on = p.id === "panel-html"; p.classList.toggle("active", on); p.hidden = !on; });
      urlInput.focus();
      showToast("All content cleared");
    }, reduced ? 0 : 300);
  });

  /* PWA */
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem(INSTALL_KEY)) installBar.classList.remove("hidden");
  });
  $("#installGo").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBar.classList.add("hidden");
    localStorage.setItem(INSTALL_KEY, "1");
  });
  $("#installX").addEventListener("click", () => {
    installBar.classList.add("hidden");
    localStorage.setItem(INSTALL_KEY, "1");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!manualModal.classList.contains("hidden")) { manualModal.classList.add("hidden"); return; }
      if (landing.style.display !== "none" && !landing.classList.contains("exiting")) { e.preventDefault(); enterApp(); }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    initTilt();
  });
})();
