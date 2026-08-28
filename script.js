(function () {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { url: "", html: "", css: "", js: "", resources: [], hasData: false, extractMs: 0, beautified: { html: false, css: false, js: false }, raw: { html: "", css: "", js: "" }, rendered: { html: false, css: false, js: false } };
  const HISTORY_KEY = "sourcew_history";
  const THEME_KEY = "sourcew_theme";
  const INSTALL_KEY = "sourcew_install_dismissed";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const landing = $("#landing"), mainApp = $("#mainApp"), enterBtn = $("#enterBtn"), tagline = $("#tagline");
  const urlInput = $("#urlInput"), extractBtn = $("#extractBtn"), inputCard = $("#inputCard"), inputRow = $(".input-row");
  const urlStatus = $("#urlStatus"), urlPrefix = $("#urlPrefix"), dropZone = $("#dropZone"), dropHint = $("#dropHint");
  const historyDropdown = $("#historyDropdown"), actionBar = $("#actionBar"), emptyState = $("#emptyState");
  const resultsSection = $("#resultsSection"), statsBar = $("#statsBar"), extractOverlay = $("#extractOverlay");
  const statusText = $("#statusText"), progressFill = $("#progressFill"), progressPct = $("#progressPct");
  const toastContainer = $("#toastContainer"), srLive = $("#srLive"), offlineBanner = $("#offlineBanner");
  const previewFrame = $("#previewFrame"), previewLoader = $("#previewLoader"), previewError = $("#previewError");
  const themeBtn = $("#themeBtn"), compareBtn = $("#compareBtn"), compareMode = $("#compareMode");
  const fsOverlay = $("#fsOverlay"), installBanner = $("#installBanner");
  let particleId = null, autoEnter = null, progressTimer = null, deferredPrompt = null, lastTab = "html";

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function throttle(fn) { let scheduled = false, lastArgs; return (...a) => { lastArgs = a; if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; fn(...lastArgs); }); }; }

  function showToast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    toastContainer.appendChild(t);
    while (toastContainer.children.length > 3) toastContainer.firstChild.remove();
    setTimeout(() => t.remove(), 3000);
  }
  function announce(msg) { srLive.textContent = msg; }

  /* Theme */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeBtn.textContent = t === "dark" ? "☀" : "🌙";
    themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    localStorage.setItem(THEME_KEY, t);
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  themeBtn.addEventListener("click", () => applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));

  /* Offline */
  function updateOnline() {
    const on = navigator.onLine;
    offlineBanner.classList.toggle("hidden", on);
    extractBtn.disabled = !on;
    if (on) announce("Back online");
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  /* Landing */
  function initLanding() {
    initParticles();
    typewriter("extract · preview · download", 55);
    enterBtn.addEventListener("click", enterApp);
    if (!reduced) autoEnter = setTimeout(() => { if (!landing.classList.contains("exiting")) enterApp(); }, 5000);
    initLogoTilt();
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
      else { const c = document.createElement("span"); c.className = "cursor"; tagline.appendChild(c); }
    })();
  }
  function initLogoTilt() {
    if (reduced) return;
    const logo = $("#logo3d"), box = $("#logoContainer");
    if (!logo || !box) return;
    const onMove = throttle((e) => {
      const r = box.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      logo.style.animation = "none";
      logo.style.transform = `rotateY(${x * 30}deg) rotateX(${-y * 20}deg)`;
    });
    box.addEventListener("mousemove", onMove);
    box.addEventListener("mouseleave", () => { logo.style.animation = ""; logo.style.transform = ""; });
  }

  function initParticles() {
    const canvas = $("#particle-canvas");
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -1e3, y: -1e3 };
    let parts = [];
    const N = Math.min(140, Math.floor((innerWidth * innerHeight) / 11000));
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize();
    addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    for (let i = 0; i < N; i++) parts.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, s: Math.random() * 2 + 0.4, o: Math.random() * 0.45 + 0.15, ph: Math.random() * 6.28 });
    let t = 0;
    (function loop() {
      if (landing.classList.contains("exiting") || landing.style.display === "none") return;
      particleId = requestAnimationFrame(loop);
      t += 0.016; ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 120 && d > 0) { const f = (120 - d) / 120; p.vx += (dx / d) * f * 0.5; p.vy += (dy / d) * f * 0.5; }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy *= 0.98;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.28);
        ctx.fillStyle = `rgba(255,255,255,${p.o * (0.7 + 0.3 * Math.sin(t * 2 + p.ph))})`; ctx.fill();
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
    inputRow.classList.remove("valid", "invalid", "checking");
    if (!raw) { urlStatus.textContent = ""; return; }
    inputRow.classList.add("checking"); urlStatus.textContent = "Checking…";
    setTimeout(() => {
      const full = normalizeUrl(raw);
      const ok = /^https?:\/\/.+\..+/i.test(full);
      inputRow.classList.remove("checking");
      inputRow.classList.add(ok ? "valid" : "invalid");
      urlStatus.textContent = ok ? "✓ Valid" : "Invalid URL";
    }, 50);
  }, 300);
  urlInput.addEventListener("input", validateUrl);
  urlInput.addEventListener("focus", () => { renderHistory(); historyDropdown.classList.remove("hidden"); });
  urlInput.addEventListener("blur", () => setTimeout(() => historyDropdown.classList.add("hidden"), 180));

  function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; } }
  function saveHistory(url) {
    let h = getHistory().filter((x) => x.url !== url);
    h.unshift({ url, ts: Date.now() });
    h = h.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
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
    if (!h.length) { historyDropdown.innerHTML = ""; historyDropdown.classList.add("hidden"); return; }
    historyDropdown.innerHTML = h.map((x) => {
      let domain = x.url;
      try { domain = new URL(x.url).hostname; } catch {}
      return `<button type="button" role="option" data-url="${x.url.replace(/"/g, "&quot;")}"><span class="hist-domain">${domain}</span><span class="hist-time">${timeAgo(x.ts)}</span></button>`;
    }).join("") + `<button type="button" class="hist-clear" data-clear="1">Clear history</button>`;
    historyDropdown.querySelectorAll("button").forEach((b) => {
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (b.dataset.clear) { localStorage.removeItem(HISTORY_KEY); historyDropdown.innerHTML = ""; return; }
        urlInput.value = b.dataset.url.replace(/^https?:\/\//i, "");
        validateUrl();
        historyDropdown.classList.add("hidden");
        handleExtract();
      });
    });
  }

  ["dragenter", "dragover"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); inputRow.classList.add("drag-over"); dropHint.classList.remove("hidden"); });
  });
  ["dragleave", "drop"].forEach((ev) => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); inputRow.classList.remove("drag-over"); dropHint.classList.add("hidden"); });
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    let url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || "";
    const html = e.dataTransfer.getData("text/html");
    if (html) { const m = html.match(/href=["']([^"']+)["']/i); if (m) url = m[1]; }
    url = (url || "").trim().split("\n")[0];
    if (url) {
      urlInput.value = url.replace(/^https?:\/\//i, "");
      validateUrl();
      handleExtract();
    }
  });

  /* 3D tilt cards */
  function init3DTilt() {
    if (reduced) return;
    $$(".card-3d").forEach((card) => {
      if (card.dataset.tilt) return;
      card.dataset.tilt = "1";
      card.addEventListener("mousemove", throttle((e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const rx = Math.max(-12, Math.min(12, ((r.height / 2 - y) / (r.height / 2)) * 12));
        const ry = Math.max(-12, Math.min(12, ((x - r.width / 2) / (r.width / 2)) * 12));
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      }));
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform .45s ease";
        card.style.transform = "";
        setTimeout(() => { card.style.transition = ""; }, 450);
      });
    });
  }

  /* Extract */
  function setLoading(on) {
    extractBtn.querySelector(".btn-text").classList.toggle("hidden", on);
    extractBtn.querySelector(".btn-loader").classList.toggle("hidden", !on);
    extractBtn.disabled = on || !navigator.onLine;
  }
  function buildMatrix() {
    const dm = $("#dataMatrix"); dm.innerHTML = "";
    for (let c = 0; c < 3; c++) {
      const col = document.createElement("div"); col.className = "matrix-col";
      for (let i = 0; i < 10; i++) { const s = document.createElement("span"); s.style.height = 10 + Math.random() * 26 + "px"; col.appendChild(s); }
      dm.appendChild(col);
    }
  }
  function startProgress() {
    let p = 0; progressFill.style.width = "0%"; progressPct.textContent = "0%";
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      p = Math.min(92, p + (p < 40 ? 4 : p < 70 ? 2 : 0.8));
      progressFill.style.width = p + "%"; progressPct.textContent = Math.floor(p) + "%";
    }, 120);
  }
  function finishProgress() {
    clearInterval(progressTimer);
    progressFill.style.width = "100%"; progressPct.textContent = "100%";
  }
  function showOverlay(show) {
    if (show) {
      extractOverlay.classList.remove("hidden");
      extractOverlay.setAttribute("aria-hidden", "false");
      extractOverlay.classList.remove("scanning", "streaming");
      buildMatrix(); void extractOverlay.offsetWidth;
      extractOverlay.classList.add("scanning", "streaming");
      if (!reduced) inputCard.classList.add("deconstruct");
      statusText.textContent = "Connecting…"; startProgress();
      announce("Extracting source code");
    } else {
      extractOverlay.classList.add("hidden");
      extractOverlay.setAttribute("aria-hidden", "true");
      extractOverlay.classList.remove("scanning", "streaming");
      inputCard.classList.remove("deconstruct"); inputCard.style.transform = "";
      clearInterval(progressTimer);
    }
  }

  async function handleExtract() {
    if (!navigator.onLine) { showToast("You are offline"); return; }
    let url = normalizeUrl(urlInput.value);
    if (!/^https?:\/\/.+\..+/i.test(url)) {
      showToast("Enter a valid URL"); urlInput.focus(); inputRow.classList.add("invalid"); return;
    }
    state.url = url;
    urlInput.value = url.replace(/^https?:\/\//i, "");
    setLoading(true); showOverlay(true);
    const t0 = performance.now();
    try {
      await delay(reduced ? 0 : 350);
      statusText.textContent = "Fetching…";
      let raw = "";
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) {
          if (res.body && res.body.getReader) {
            const reader = res.body.getReader();
            const chunks = []; let received = 0;
            const len = +res.headers.get("content-length") || 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value); received += value.length;
              if (len) {
                const pct = Math.min(90, Math.floor((received / len) * 90));
                progressFill.style.width = pct + "%"; progressPct.textContent = pct + "%";
              }
            }
            raw = new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
          } else raw = await res.text();
        }
      } catch (_) {}
      if (!raw) {
        statusText.textContent = "Proxy…";
        try {
          const res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
          if (res.ok) raw = await res.text();
        } catch (_) { throw new Error("CORS"); }
      }
      if (!raw) throw new Error("EMPTY");
      statusText.textContent = "Parsing…";
      await delay(reduced ? 0 : 200);
      parseSource(raw, url);
      state.extractMs = performance.now() - t0;
      state.hasData = true;
      saveHistory(url);
      finishProgress();
      await delay(reduced ? 0 : 200);
      showOverlay(false); setLoading(false);
      showResults(); showToast("Extracted successfully!"); announce("Extraction complete");
    } catch (err) {
      showOverlay(false); setLoading(false);
      showToast(err.message === "CORS" ? "CORS blocked — try another URL" : "Fetch failed — check the URL");
    }
  }
  extractBtn.addEventListener("click", handleExtract);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleExtract(); }
  });

  /* Parse + utils */
  function resolveURL(rel, base) {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith("//")) return "https:" + rel;
    try { return new URL(rel, base).href; } catch { return rel; }
  }
  function formatBytes(str) {
    const n = new Blob([str || ""]).size;
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }
  function countLines(s) { return Math.max((s || "").split("\n").length, 1); }
  function escapeHTML(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function parseSource(raw, base) {
    state.html = raw; state.raw.html = raw;
    const styles = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    state.css = styles.map((m, i) => "/* block " + (i + 1) + " */\n" + m.replace(/<\/?style[^>]*>/gi, "")).join("\n\n") || "/* none */";
    state.raw.css = state.css;
    const scripts = raw.match(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    state.js = scripts.map((m, i) => "// script " + (i + 1) + "\n" + m.replace(/<\/?script[^>]*>/gi, "")).join("\n\n") || "// none";
    state.raw.js = state.js;
    state.resources = [];
    const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title) state.resources.push({ type: "meta", url: "Title: " + title[1].trim().slice(0, 100) });
    (raw.match(/<link[^>]*>/gi) || []).forEach((m) => {
      const href = (m.match(/href=["']([^"']+)["']/i) || [])[1]; if (!href) return;
      const rel = ((m.match(/rel=["']([^"']+)["']/i) || [])[1] || "").toLowerCase();
      state.resources.push({ type: rel.includes("stylesheet") ? "css" : rel.includes("icon") ? "icon" : "link", url: resolveURL(href, base) });
    });
    (raw.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi) || []).forEach((m) => {
      const src = (m.match(/src=["']([^"']+)["']/i) || [])[1]; if (src) state.resources.push({ type: "js", url: resolveURL(src, base) });
    });
    (raw.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi) || []).forEach((m) => {
      const src = (m.match(/src=["']([^"']+)["']/i) || [])[1]; if (src) state.resources.push({ type: "img", url: resolveURL(src, base) });
    });
    const seen = new Set();
    (raw.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || []).forEach((m) => {
      const href = (m.match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      const abs = resolveURL(href, base);
      if (!abs.startsWith("http") || seen.has(abs)) return;
      seen.add(abs); state.resources.push({ type: "link", url: abs });
    });
    state.beautified = { html: false, css: false, js: false };
    state.rendered = { html: false, css: false, js: false };
  }

  function highlightHTML(code) {
    let e = escapeHTML(code);
    e = e.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(&lt;\/?[a-zA-Z][\w\-]*)(.*?)(\/?&gt;)/g, (m, tag, attrs, end) => {
      const ha = attrs.replace(/([\w\-:]+)=(&quot;.*?&quot;|&#39;.*?&#39;|"[^"]*"|'[^']*')/g, '<span class="token-attr">$1</span>=<span class="token-string">$2</span>');
      return `<span class="token-tag">${tag}</span>${ha}<span class="token-tag">${end}</span>`;
    });
    return e;
  }
  function highlightCSS(code) {
    let e = escapeHTML(code);
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/([^{}/]+)(\{)/g, '<span class="token-selector">$1</span>$2');
    e = e.replace(/([a-zA-Z\-]+)\s*:\s*([^;{}]+);/g, '<span class="token-property">$1</span>: <span class="token-value">$2</span>;');
    return e;
  }
  function highlightJS(code) {
    let e = escapeHTML(code);
    e = e.replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[^`]*`)/g, '<span class="token-string">$1</span>');
    e = e.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|try|catch|throw|typeof|instanceof|in|of|break|continue|switch|case)\b/g, '<span class="token-keyword">$1</span>');
    e = e.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="token-function">$1</span>(');
    e = e.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    return e;
  }

  function renderCodePanel(key) {
    if (state.rendered[key]) return;
    const max = 280000;
    let src = state[key] || "";
    if (src.length > max) src = src.slice(0, max) + "\n\n/* truncated */";
    const hi = key === "html" ? highlightHTML : key === "css" ? highlightCSS : highlightJS;
    $("#" + key + "Code").innerHTML = hi(src);
    $("#" + key + "FileSize").textContent = formatBytes(state[key]);
    $("#" + key + "Lines").textContent = countLines(state[key]) + " lines";
    const lines = Math.max(countLines(src), 1);
    $("#" + key + "LineNumbers").innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
    state.rendered[key] = true;
  }

  function updateResources() {
    const list = $("#resourceList");
    const groups = { css: [], js: [], img: [], link: [], meta: [], icon: [] };
    state.resources.forEach((r) => { (groups[r.type] || groups.link).push(r); });
    const labels = { css: "CSS", js: "JavaScript", img: "Images", link: "Links", meta: "Meta", icon: "Icons" };
    let html = "";
    Object.keys(labels).forEach((k) => {
      if (!groups[k].length) return;
      html += `<details class="res-group" open><summary>${labels[k]} <span class="res-badge">${groups[k].length}</span></summary>`;
      groups[k].forEach((r) => {
        if (r.url.startsWith("http")) html += `<a href="${escapeHTML(r.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(r.url)}">${escapeHTML(r.url)}</a>`;
        else html += `<a as="span" style="pointer-events:none">${escapeHTML(r.url)}</a>`;
      });
      html += "</details>";
    });
    list.innerHTML = html || '<p class="res-empty">No external resources found.</p>';
    $("#resourceCount").textContent = state.resources.length + " found";
  }

  function updateStats() {
    const total = new Blob([state.html, state.css, state.js]).size;
    const ms = state.extractMs;
    const time = ms < 1000 ? Math.round(ms) + "ms" : (ms / 1000).toFixed(1) + "s";
    statsBar.innerHTML = [
      ["📄", formatBytes(state.html), "HTML"],
      ["🎨", formatBytes(state.css), "CSS"],
      ["⚡", formatBytes(state.js), "JS"],
      ["🔗", state.resources.length, "Resources"],
      ["⏱", time, "Time"],
      ["Σ", formatBytes(String.fromCharCode(...new Array(0))) || formatBytes("x".repeat(0)), "Total"],
    ].map(([icon, num, label], i) => {
      const n = i === 5 ? formatBytes(state.html + state.css + state.js) : num;
      return `<div class="stat-card"><div class="stat-icon">${icon}</div><div class="stat-num">${n}</div><div class="stat-label">${label}</div></div>`;
    }).join("");
  }

  function showResults() {
    emptyState.classList.add("hidden");
    actionBar.classList.remove("hidden");
    resultsSection.classList.remove("hidden");
    statsBar.classList.remove("hidden");
    updateStats(); updateResources();
    state.rendered = { html: false, css: false, js: false };
    renderCodePanel("html");
    $$(".tab-panel").forEach((p, i) => {
      p.classList.remove("fly-in");
      if (!reduced) setTimeout(() => { if (p.classList.contains("active")) p.classList.add("fly-in"); }, i * 100);
    });
    setTimeout(init3DTilt, 80);
  }

  /* Tabs */
  $$(".tab-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      const dir = ["html", "css", "js", "resources", "preview"].indexOf(tab) >= ["html", "css", "js", "resources", "preview"].indexOf(lastTab) ? "slide-left" : "slide-right";
      lastTab = tab;
      $$(".tab-btn[data-tab]").forEach((b) => { const on = b === btn; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
      $$(".tab-panel").forEach((p) => {
        const on = p.id === "panel-" + tab;
        p.classList.toggle("active", on); p.hidden = !on;
        p.classList.remove("slide-left", "slide-right", "fly-in");
        if (on) { void p.offsetWidth; p.classList.add(dir); }
      });
      if (tab === "html" || tab === "css" || tab === "js") renderCodePanel(tab);
      if (tab === "preview") loadPreview();
    });
  });

  /* Sanitize + preview */
  function sanitizeHTML(html) {
    let s = html;
    s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
    s = s.replace(/<object[\s\S]*?<\/object>/gi, "");
    s = s.replace(/<embed[^>]*>/gi, "");
    s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    s = s.replace(/javascript\s*:/gi, "blocked:");
    s = s.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "");
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: https:; script-src \'none\'; object-src \'none\';">';
    if (/<head[^>]*>/i.test(s)) s = s.replace(/<head([^>]*)>/i, "<head$1>" + csp);
    else s = csp + s;
    return s;
  }
  function loadPreview() {
    if (!state.html) return;
    previewError.classList.add("hidden");
    previewLoader.classList.remove("hidden");
    let html = sanitizeHTML(state.html);
    if (!/<base[\s>]/i.test(html)) {
      const base = `<base href="${state.url}">`;
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${base}`) : base + html;
    }
    if (/<script/i.test(state.html) || /\son\w+=/i.test(state.html)) showToast("Dangerous content sanitized for preview");
    previewFrame.onload = () => previewLoader.classList.add("hidden");
    try { previewFrame.srcdoc = html; } catch { previewLoader.classList.add("hidden"); previewError.classList.remove("hidden"); }
    setTimeout(() => previewLoader.classList.add("hidden"), 4500);
  }

  /* Search */
  const searchState = { html: { q: "", idx: 0, total: 0 }, css: { q: "", idx: 0, total: 0 }, js: { q: "", idx: 0, total: 0 } };
  function applySearch(panel, q) {
    const code = $("#" + panel + "Code");
    if (!code) return;
    renderCodePanel(panel);
    let html = code.innerHTML;
    html = html.replace(/<mark class="search-hit">([\s\S]*?)<\/mark>/g, "$1");
    searchState[panel].q = q;
    if (!q) { code.innerHTML = html; $("#" + panel + "Match").textContent = ""; searchState[panel].total = 0; return; }
    const plain = code.textContent;
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let count = 0;
    const parts = [];
    let last = 0, m;
    const text = plain;
    while ((m = re.exec(text)) && count < 200) {
      count++;
    }
    searchState[panel].total = count;
    searchState[panel].idx = count ? 1 : 0;
    $("#" + panel + "Match").textContent = count ? `1/${count}` : "0";
    if (!count) { code.innerHTML = html; return; }
    // highlight in current HTML (best-effort on text nodes via simple replace on escaped form)
    const escQ = escapeHTML(q);
    try {
      const re2 = new RegExp("(" + escQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      code.innerHTML = html.replace(re2, '<mark class="search-hit">$1</mark>');
    } catch { code.innerHTML = html; }
  }
  $$(".code-search").forEach((inp) => {
    inp.addEventListener("input", debounce(() => applySearch(inp.dataset.panel, inp.value.trim()), 200));
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { inp.value = ""; applySearch(inp.dataset.panel, ""); }
      if (e.key === "Enter") {
        e.preventDefault();
        const p = inp.dataset.panel; const st = searchState[p];
        if (!st.total) return;
        st.idx = e.shiftKey ? (st.idx <= 1 ? st.total : st.idx - 1) : (st.idx >= st.total ? 1 : st.idx + 1);
        $("#" + p + "Match").textContent = st.idx + "/" + st.total;
        const marks = $$("mark.search-hit", $("#" + p + "Code"));
        if (marks[st.idx - 1]) marks[st.idx - 1].scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  });

  /* Beautify / minify */
  function beautify(code, type) {
    if (type === "html") {
      let out = "", indent = 0;
      code.replace(/>\s*</g, ">\n<").split("\n").forEach((line) => {
        line = line.trim(); if (!line) return;
        if (/^<\//.test(line)) indent = Math.max(0, indent - 1);
        out += "  ".repeat(indent) + line + "\n";
        if (/^<[^/!][^>]*[^/]>$/.test(line) && !/^<(meta|link|img|br|hr|input|source|area|base|col|embed|wbr)\b/i.test(line)) indent++;
      });
      return out;
    }
    if (type === "css") {
      return code.replace(/\s*\{\s*/g, " {\n  ").replace(/;\s*/g, ";\n  ").replace(/\s*\}\s*/g, "\n}\n").replace(/\n\s*\n/g, "\n");
    }
    return code.replace(/;\s*/g, ";\n").replace(/\{\s*/g, " {\n  ").replace(/\}\s*/g, "\n}\n");
  }
  function minify(code) {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").replace(/\s*([{}:;,])\s*/g, "$1").trim();
  }
  $$("[data-beautify]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.beautify;
      if (!state[key]) return;
      state.beautified[key] = !state.beautified[key];
      if (state.beautified[key]) {
        state[key] = beautify(state.raw[key], key);
        btn.textContent = "⇄ Minify";
      } else {
        state[key] = state.raw[key];
        btn.textContent = "{} Beautify";
      }
      state.rendered[key] = false;
      renderCodePanel(key);
    });
  });

  /* Fullscreen */
  $$("[data-fullscreen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.fullscreen;
      renderCodePanel(key);
      $("#fsCode").innerHTML = $("#" + key + "Code").innerHTML;
      $("#fsLines").innerHTML = $("#" + key + "LineNumbers").innerHTML;
      fsOverlay.classList.remove("hidden");
      $("#fsClose").focus();
    });
  });
  function closeFs() { fsOverlay.classList.add("hidden"); }
  $("#fsClose").addEventListener("click", closeFs);

  /* Copy / download / clear */
  $$(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(state[this.dataset.copy] || "");
        const o = this.textContent; this.textContent = "✓"; this.classList.add("copied");
        showToast("Copied"); setTimeout(() => { this.textContent = o; this.classList.remove("copied"); }, 1600);
      } catch { showToast("Copy failed"); }
    });
  });
  function ts() {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }
  function downloadFile(content, name, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content || ""], { type: mime }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function singleFile() {
    return `<!DOCTYPE html>\n<!-- SOURCE W EXTRACTED from ${state.url} -->\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Source W Extract</title>\n<style>\n/* ===== CSS ===== */\n${state.css}\n</style>\n</head>\n<body>\n<!-- ===== HTML BODY (full document preserved below if available) ===== */\n` +
      (state.html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, state.html])[1] +
      `\n<script>\n/* ===== JS ===== */\n${state.js}\n<\/script>\n</body>\n</html>`;
  }
  $$(".btn-download").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.hasData) return;
      const type = btn.dataset.type, t = ts();
      btn.style.setProperty("--dl", "0%"); btn.classList.add("dl-progress");
      let w = 0; const iv = setInterval(() => { w = Math.min(100, w + 20); btn.style.setProperty("--dl", w + "%"); if (w >= 100) clearInterval(iv); }, 40);
      setTimeout(() => {
        if (type === "all") {
          downloadFile(state.html, `sourcew-${t}-source.html`, "text/html");
          setTimeout(() => downloadFile(state.css, `sourcew-${t}-style.css`, "text/css"), 150);
          setTimeout(() => downloadFile(state.js, `sourcew-${t}-script.js`, "application/javascript"), 300);
          showToast("Downloading 3 files…");
        } else if (type === "single") {
          downloadFile(singleFile(), `sourcew-${t}-bundle.html`, "text/html");
          showToast("Single HTML downloaded");
        } else {
          const map = { html: [state.html, "text/html", "html"], css: [state.css, "text/css", "css"], js: [state.js, "application/javascript", "js"] };
          const [c, m, e] = map[type];
          downloadFile(c, `sourcew-${t}-${type}.${e}`, m);
          showToast("Downloading " + type.toUpperCase());
        }
        setTimeout(() => { btn.classList.remove("dl-progress"); btn.style.setProperty("--dl", "0%"); }, 400);
      }, 100);
    });
  });

  $("#clearBtn").addEventListener("click", () => {
    if (!state.hasData) return;
    $$(".tab-panel").forEach((p) => { p.style.transition = "all .3s"; p.style.opacity = "0"; p.style.transform = "scale(.92)"; });
    setTimeout(() => {
      Object.assign(state, { url: "", html: "", css: "", js: "", resources: [], hasData: false, extractMs: 0, raw: { html: "", css: "", js: "" }, rendered: { html: false, css: false, js: false }, beautified: { html: false, css: false, js: false } });
      urlInput.value = ""; inputRow.classList.remove("valid", "invalid"); urlStatus.textContent = "";
      ["html", "css", "js"].forEach((k) => { $("#" + k + "Code").innerHTML = ""; $("#" + k + "LineNumbers").innerHTML = "1"; $("#" + k + "FileSize").textContent = "0 B"; $("#" + k + "Lines").textContent = "0 lines"; $("#" + k + "Match").textContent = ""; });
      $("#resourceList").innerHTML = ""; $("#resourceCount").textContent = "0 found";
      previewFrame.removeAttribute("srcdoc");
      actionBar.classList.add("hidden"); resultsSection.classList.add("hidden"); statsBar.classList.add("hidden"); emptyState.classList.remove("hidden");
      $$(".tab-panel").forEach((p) => { p.style.opacity = ""; p.style.transform = ""; p.style.transition = ""; });
      $$(".tab-btn[data-tab]").forEach((b) => { const on = b.dataset.tab === "html"; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
      $$(".tab-panel").forEach((p) => { const on = p.id === "panel-html"; p.classList.toggle("active", on); p.hidden = !on; });
      urlInput.focus(); showToast("Cleared");
    }, reduced ? 0 : 280);
  });

  /* Compare / diff */
  let compareData = { a: null, b: null };
  compareBtn.addEventListener("click", () => { compareMode.classList.remove("hidden"); $("#compareA").focus(); });
  $("#compareClose").addEventListener("click", () => compareMode.classList.add("hidden"));
  async function fetchPage(url) {
    url = normalizeUrl(url);
    let raw = "";
    try { const r = await fetch(url, { mode: "cors" }); if (r.ok) raw = await r.text(); } catch {}
    if (!raw) { try { const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url)); if (r.ok) raw = await r.text(); } catch {} }
    if (!raw) throw new Error("fail");
    const css = (raw.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).map((m) => m.replace(/<\/?style[^>]*>/gi, "")).join("\n");
    const js = (raw.match(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || []).map((m) => m.replace(/<\/?script[^>]*>/gi, "")).join("\n");
    return { html: raw, css, js };
  }
  function lineDiff(a, b) {
    const la = (a || "").split("\n"), lb = (b || "").split("\n");
    const max = Math.max(la.length, lb.length);
    let left = "", right = "";
    for (let i = 0; i < max; i++) {
      const x = la[i] ?? "", y = lb[i] ?? "";
      if (x === y) { left += escapeHTML(x) + "\n"; right += escapeHTML(y) + "\n"; }
      else {
        if (x) left += `<span class="diff-del">${escapeHTML(x)}</span>\n`;
        if (y) right += `<span class="diff-add">${escapeHTML(y)}</span>\n`;
        if (!x && y) left += "\n";
        if (x && !y) right += "\n";
      }
    }
    return { left, right };
  }
  $("#compareRun").addEventListener("click", async () => {
    const ua = $("#compareA").value.trim(), ub = $("#compareB").value.trim();
    if (!ua || !ub) { showToast("Enter two URLs"); return; }
    $("#compareRun").disabled = true; $("#compareRun").textContent = "…";
    try {
      compareData.a = await fetchPage(ua);
      compareData.b = await fetchPage(ub);
      renderDiff("html");
      showToast("Compare ready");
    } catch { showToast("Compare fetch failed"); }
    $("#compareRun").disabled = false; $("#compareRun").textContent = "Compare";
  });
  function renderDiff(kind) {
    if (!compareData.a || !compareData.b) return;
    const d = lineDiff(compareData.a[kind], compareData.b[kind]);
    $("#diffLeft").innerHTML = d.left;
    $("#diffRight").innerHTML = d.right;
  }
  $$("[data-ctab]").forEach((b) => {
    b.addEventListener("click", () => {
      $$("[data-ctab]").forEach((x) => x.classList.toggle("active", x === b));
      renderDiff(b.dataset.ctab);
    });
  });

  /* PWA install */
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferredPrompt = e;
    if (!localStorage.getItem(INSTALL_KEY)) installBanner.classList.remove("hidden");
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.classList.add("hidden");
    localStorage.setItem(INSTALL_KEY, "1");
  });
  $("#installDismiss").addEventListener("click", () => {
    installBanner.classList.add("hidden");
    localStorage.setItem(INSTALL_KEY, "1");
  });

  /* Keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!fsOverlay.classList.contains("hidden")) { closeFs(); return; }
      if (!compareMode.classList.contains("hidden")) { compareMode.classList.add("hidden"); return; }
      if (landing.style.display !== "none" && !landing.classList.contains("exiting")) { e.preventDefault(); enterApp(); }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    init3DTilt();
  });
})();
