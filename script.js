(function () {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const state = {
    url: "", html: "", css: "", js: "", resources: [], hasData: false,
    stats: { htmlSize: 0, cssSize: 0, jsSize: 0, htmlLines: 0, cssLines: 0, jsLines: 0, resourceCount: 0, time: "0" },
    raw: { html: "", css: "", js: "" },
    formatted: { html: false, css: false, js: false },
  };

  const PROXIES = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  let particleId = null, autoEnter = null, installPrompt = null;

  function toast(msg, type) {
    const t = document.createElement("div");
    t.className = "toast" + (type === "error" ? " error" : "");
    t.textContent = msg;
    $("toastContainer").appendChild(t);
    while ($("toastContainer").children.length > 3) $("toastContainer").firstChild.remove();
    setTimeout(() => t.remove(), 3000);
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* Landing */
  function initLanding() {
    initParticles();
    typewriter("extract · preview · download", 50);
    $("enterBtn").addEventListener("click", enterApp);
    if (!reduced) autoEnter = setTimeout(() => { if (!$("landing").classList.contains("exiting")) enterApp(); }, 5000);
  }

  function enterApp() {
    if ($("landing").classList.contains("exiting")) return;
    if (autoEnter) clearTimeout(autoEnter);
    if (particleId) cancelAnimationFrame(particleId);
    $("landing").classList.add("exiting");
    setTimeout(() => {
      $("landing").style.display = "none";
      $("mainApp").classList.remove("hidden");
      void $("mainApp").offsetWidth;
      $("mainApp").classList.add("visible");
      setTimeout(() => $("urlInput").focus(), 300);
    }, reduced ? 0 : 800);
  }

  function typewriter(text, speed) {
    const el = $("tagline");
    let i = 0;
    el.textContent = "";
    if (reduced) { el.textContent = text; return; }
    (function tick() {
      if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speed); }
      else { const c = document.createElement("span"); c.className = "cursor"; el.appendChild(c); }
    })();
  }

  function initParticles() {
    const canvas = $("particle-canvas");
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -1e3, y: -1e3 };
    let parts = [];
    const N = Math.min(150, Math.floor((innerWidth * innerHeight) / 10000));
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize();
    addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    for (let i = 0; i < N; i++) {
      parts.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, s: Math.random() * 2 + 0.4, o: Math.random() * 0.45 + 0.15 });
    }
    (function loop() {
      if ($("landing").classList.contains("exiting") || $("landing").style.display === "none") return;
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
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - d / 110)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
    })();
  }

  /* Tilt */
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
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform .4s ease";
        card.style.transform = "";
        setTimeout(() => { card.style.transition = ""; }, 400);
      });
    });
  }

  /* URL validation + history */
  const validateUrl = debounce(() => {
    const v = $("urlInput").value.trim();
    const inp = $("urlInput");
    const val = $("inputValidation");
    inp.classList.remove("valid", "invalid");
    if (!v) { val.textContent = ""; return; }
    const ok = /^https?:\/\/.+\..+/i.test(v.startsWith("http") ? v : "https://" + v);
    inp.classList.add(ok ? "valid" : "invalid");
    val.textContent = ok ? "✓ Ready" : "Invalid URL";
  }, 300);
  $("urlInput").addEventListener("input", validateUrl);
  $("urlInput").addEventListener("focus", () => { renderHistory(); $("historyDropdown").classList.remove("hidden"); });
  $("urlInput").addEventListener("blur", () => setTimeout(() => $("historyDropdown").classList.add("hidden"), 200));

  function getHistory() {
    try { return JSON.parse(localStorage.getItem("sw_history") || "[]"); } catch { return []; }
  }
  function saveHistory(url) {
    let h = getHistory().filter((x) => x.url !== url);
    let domain = url;
    try { domain = new URL(url).hostname; } catch {}
    h.unshift({ url, domain, ts: Date.now() });
    localStorage.setItem("sw_history", JSON.stringify(h.slice(0, 10)));
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
    const dd = $("historyDropdown");
    if (!h.length) { dd.innerHTML = ""; dd.classList.add("hidden"); return; }
    dd.innerHTML = h.map((x) =>
      `<button type="button" data-url="${x.url.replace(/"/g, "&quot;")}"><span class="h-dom">${x.domain}</span><span class="h-time">${timeAgo(x.ts)}</span></button>`
    ).join("") + `<button type="button" class="h-clear" data-clear="1">Clear history</button>`;
    dd.querySelectorAll("button").forEach((b) => {
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (b.dataset.clear) { localStorage.removeItem("sw_history"); dd.innerHTML = ""; return; }
        $("urlInput").value = b.dataset.url;
        validateUrl();
        dd.classList.add("hidden");
        handleExtract();
      });
    });
  }

  /* Extract */
  function setLoading(on) {
    $("extractBtn").querySelector(".btn-text").classList.toggle("hidden", on);
    $("extractBtn").querySelector(".btn-loader").classList.toggle("hidden", !on);
    $("extractBtn").disabled = on || !navigator.onLine;
  }
  function showExtract(on) {
    const ov = $("extractOverlay");
    ov.classList.toggle("hidden", !on);
    ov.classList.toggle("on", on);
    if (on) {
      const ds = $("dataStreams");
      ds.innerHTML = "";
      for (let i = 0; i < 10; i++) ds.appendChild(Object.assign(document.createElement("div"), { className: "stream" }));
      if (!reduced) $("inputCard").classList.add("deconstruct");
      setProgress(0);
    } else {
      $("inputCard").classList.remove("deconstruct");
      $("inputCard").style.transform = "";
    }
  }
  function setStatus(t) { $("statusText").textContent = t; }
  function setProgress(p) { $("progressFill").style.width = p + "%"; }

  function normalizeUrl(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    return v;
  }

  async function handleExtract() {
    if (!navigator.onLine) { toast("You are offline", "error"); return; }
    let url = normalizeUrl($("urlInput").value);
    if (!url || !/^https?:\/\/.+\..+/i.test(url)) {
      toast("Please enter a valid URL starting with http:// or https://", "error");
      $("urlInput").focus();
      return;
    }
    state.url = url;
    $("urlInput").value = url;
    setLoading(true);
    showExtract(true);
    setStatus("Connecting...");
    setProgress(10);
    const startTime = Date.now();
    try {
      let raw = "";
      try {
        const r = await fetch(url, { mode: "cors", headers: { Accept: "text/html" }, signal: AbortSignal.timeout(10000) });
        if (r.ok) raw = await r.text();
      } catch (_) {}
      setProgress(30);
      setStatus("Fetching...");
      if (!raw || raw.length < 100) {
        for (const p of PROXIES) {
          try {
            const r = await fetch(p(url), { signal: AbortSignal.timeout(8000) });
            if (r.ok) {
              const t = await r.text();
              if (t.length > 100 && (t.includes("<html") || t.includes("<!DOCTYPE") || t.includes("<HTML") || t.includes("<body"))) {
                raw = t;
                break;
              }
            }
          } catch (_) {}
        }
      }
      setProgress(60);
      setStatus("Parsing...");
      if (!raw || raw.length < 50) throw new Error("ALL_PROXIES_FAILED");
      parseCode(raw, url);
      if (!state.html || state.html.length < 50) throw new Error("PARSE");
      state.stats.time = ((Date.now() - startTime) / 1000).toFixed(1);
      state.hasData = true;
      saveHistory(url);
      setProgress(100);
      setStatus("Done!");
      await delay(300);
      showExtract(false);
      setLoading(false);
      showResults();
      toast("Extraction complete!", "success");
    } catch (err) {
      showExtract(false);
      setLoading(false);
      if (err.message === "ALL_PROXIES_FAILED") {
        toast("CORS blocked. Try manual paste.", "error");
        showManual();
      } else if (err.message === "PARSE") {
        toast("Failed to parse. Response may not be HTML.", "error");
      } else {
        toast("Failed: " + (err.message || "unknown"), "error");
      }
    }
  }

  $("extractBtn").addEventListener("click", handleExtract);
  $("urlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleExtract(); }
  });

  /* Parse */
  function resolve(rel, base) {
    if (!rel) return "";
    rel = rel.trim();
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith("//")) return "https:" + rel;
    if (/^(data:|blob:|javascript:|mailto:|tel:)/i.test(rel)) return rel;
    try { return new URL(rel, base).href; } catch {
      if (rel.startsWith("/")) {
        const o = base.match(/^https?:\/\/[^/]+/);
        return o ? o[0] + rel : rel;
      }
      return base.replace(/\/[^/]*$/, "/") + rel;
    }
  }

  function parseCode(raw, base) {
    state.html = raw;
    state.raw.html = raw;
    const styles = [], scripts = [];
    let m;
    const sRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = sRe.exec(raw)) !== null) styles.push(m[1].trim());
    state.css = styles.map((s, i) => `/* Style ${i + 1} */\n${s}`).join("\n\n") || "/* no inline styles */";
    state.raw.css = state.css;
    const jRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = jRe.exec(raw)) !== null) scripts.push(m[1].trim());
    state.js = scripts.map((s, i) => `/* Script ${i + 1} */\n${s}`).join("\n\n") || "/* no inline scripts */";
    state.raw.js = state.js;
    state.resources = [];
    const lRe = /<link[^>]*href=["']([^"']+)["'][^>]*>/gi;
    while ((m = lRe.exec(raw)) !== null) state.resources.push({ type: "css", url: resolve(m[1], base), orig: m[1] });
    const eRe = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = eRe.exec(raw)) !== null) state.resources.push({ type: "js", url: resolve(m[1], base), orig: m[1] });
    const iRe = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = iRe.exec(raw)) !== null) state.resources.push({ type: "img", url: resolve(m[1], base), orig: m[1] });
    const aRe = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    const seen = new Set();
    while ((m = aRe.exec(raw)) !== null) {
      const h = m[1];
      if ((h.startsWith("http") || h.startsWith("//")) && !seen.has(h)) {
        seen.add(h);
        state.resources.push({ type: "link", url: resolve(h, base), orig: h });
      }
    }
    const tm = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (tm) state.resources.unshift({ type: "meta", url: "Title: " + tm[1].trim(), orig: "" });
    state.stats = {
      htmlSize: new Blob([state.html]).size,
      cssSize: new Blob([state.css]).size,
      jsSize: new Blob([state.js]).size,
      htmlLines: state.html.split("\n").length,
      cssLines: state.css.split("\n").length,
      jsLines: state.js.split("\n").length,
      resourceCount: state.resources.length,
      time: state.stats.time || "0",
    };
    state.formatted = { html: false, css: false, js: false };
  }

  function fmtBytes(str) {
    const b = new Blob([str || ""]).size;
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightHTML(code) {
    code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
    code = code.replace(/(&lt;\/?[a-zA-Z][\w\-]*)(.*?)(\/?&gt;)/g, (m, tag, attrs, end) => {
      const ha = attrs.replace(/([\w\-:]+)=(&quot;.*?&quot;|&#39;.*?&#39;|"[^"]*"|'[^']*')/g, '<span class="token-attr">$1</span>=<span class="token-string">$2</span>');
      return `<span class="token-tag">${tag}</span>${ha}<span class="token-tag">${end}</span>`;
    });
    return code;
  }
  function highlightCSS(code) {
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    code = code.replace(/([^{}/]+)(\{)/g, '<span class="token-selector">$1</span>$2');
    return code.replace(/([a-zA-Z\-]+)\s*:\s*([^;{}]+);/g, '<span class="token-property">$1</span>: <span class="token-value">$2</span>;');
  }
  function highlightJS(code) {
    code = code.replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>');
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    code = code.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[^`]*`)/g, '<span class="token-string">$1</span>');
    code = code.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|try|catch|throw)\b/g, '<span class="token-keyword">$1</span>');
    code = code.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="token-function">$1</span>(');
    return code.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
  }

  function updateLines(codeId, lineId) {
    const lines = Math.max(($(codeId).textContent || "").split("\n").length, 1);
    $(lineId).innerHTML = Array.from({ length: lines }, (_, i) => `<span>${i + 1}</span>`).join("");
  }

  function updatePanels() {
    const max = 300000;
    const trunc = (s) => (s.length > max ? s.slice(0, max) + "\n\n/* truncated */" : s);
    $("htmlCode").innerHTML = highlightHTML(esc(trunc(state.html)));
    $("cssCode").innerHTML = highlightCSS(esc(trunc(state.css)));
    $("jsCode").innerHTML = highlightJS(esc(trunc(state.js)));
    updateLines("htmlCode", "htmlLineNumbers");
    updateLines("cssCode", "cssLineNumbers");
    updateLines("jsCode", "jsLineNumbers");
    $("htmlSize").textContent = fmtBytes(state.html);
    $("cssSize").textContent = fmtBytes(state.css);
    $("jsSize").textContent = fmtBytes(state.js);
    $("htmlLines").textContent = state.stats.htmlLines.toLocaleString() + " lines";
    $("cssLines").textContent = state.stats.cssLines.toLocaleString() + " lines";
    $("jsLines").textContent = state.stats.jsLines.toLocaleString() + " lines";
    $("statHtml").textContent = fmtBytes(state.html);
    $("statCss").textContent = fmtBytes(state.css);
    $("statJs").textContent = fmtBytes(state.js);
    $("statRes").textContent = state.stats.resourceCount;
    $("statTime").textContent = state.stats.time + "s";
    const rl = $("resourceList");
    if (state.resources.length) {
      const groups = {};
      state.resources.forEach((r) => { (groups[r.type] = groups[r.type] || []).push(r); });
      rl.innerHTML = Object.entries(groups).map(([type, items]) =>
        `<li class="resource-group"><div class="resource-group-title">${type.toUpperCase()} <span class="resource-group-count">${items.length}</span></div>` +
        items.map((r) => r.url.startsWith("http")
          ? `<li><span class="res-type">${r.type}</span><a href="${esc(r.url)}" target="_blank" rel="noopener" class="res-url">${esc(r.url)}</a></li>`
          : `<li><span class="res-type">${r.type}</span><span class="res-url">${esc(r.url)}</span></li>`
        ).join("") + "</li>"
      ).join("");
    } else {
      rl.innerHTML = '<li class="resource-empty">No resources found. Extract a URL to see external assets.</li>';
    }
    $("resCount").textContent = state.stats.resourceCount + " found";
  }

  function showResults() {
    $("actionBar").classList.remove("hidden");
    $("resultsSection").classList.remove("hidden");
    $("statsBar").classList.remove("hidden");
    $("emptyState").classList.add("hidden");
    updatePanels();
    $$(".tab-panel").forEach((p, i) => {
      p.classList.remove("fly-in");
      if (!reduced) setTimeout(() => { if (p.classList.contains("active")) p.classList.add("fly-in"); }, i * 120);
    });
    setTimeout(initTilt, 100);
  }

  /* Tabs */
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      $$(".tab-btn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on);
      });
      $$(".tab-panel").forEach((p) => {
        const on = p.id === "panel-" + tab;
        p.classList.toggle("active", on);
        p.hidden = !on;
        if (on && !reduced) {
          p.classList.remove("fly-in");
          void p.offsetWidth;
          p.classList.add("fly-in");
        }
      });
      if (tab === "preview") loadPreview();
    });
  });

  function loadPreview() {
    if (!state.html) return;
    $("previewLoader").classList.remove("hidden");
    $("previewError").classList.add("hidden");
    let html = state.html;
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "<!-- script removed -->");
    html = html.replace(/javascript:[^"'>\s]*/gi, "#");
    html = html.replace(/\son\w+=["'][^"']*["']/gi, "");
    html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "<!-- iframe removed -->");
    if (!/<base[\s>]/i.test(html) && state.url) {
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${state.url}">`)
        : `<base href="${state.url}">` + html;
    }
    $("previewFrame").srcdoc = html;
    $("previewFrame").onload = () => $("previewLoader").classList.add("hidden");
    setTimeout(() => $("previewLoader").classList.add("hidden"), 5000);
  }

  /* Search */
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  ["Html", "Css", "Js"].forEach((type) => {
    const key = type.toLowerCase();
    $(`search${type}`).addEventListener("input", debounce((e) => {
      const term = e.target.value.trim();
      const code = $(`${key}Code`);
      if (!term) {
        code.innerHTML = key === "html" ? highlightHTML(esc(state.html)) : key === "css" ? highlightCSS(esc(state.css)) : highlightJS(esc(state.js));
        updateLines(`${key}Code`, `${key}LineNumbers`);
        return;
      }
      let html = code.innerHTML.replace(/<span class="search-highlight">([\s\S]*?)<\/span>/g, "$1");
      try {
        const re = new RegExp("(" + escRegex(esc(term)) + ")", "gi");
        code.innerHTML = html.replace(re, '<span class="search-highlight">$1</span>');
      } catch { code.innerHTML = html; }
    }, 200));
    $(`search${type}`).addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.target.value = ""; e.target.dispatchEvent(new Event("input")); }
    });
  });

  /* Format */
  function beautify(code, type) {
    if (type === "html") {
      let out = "", indent = 0;
      code.replace(/>\s*</g, ">\n<").split("\n").forEach((line) => {
        line = line.trim();
        if (!line) return;
        if (/^<\//.test(line)) indent = Math.max(0, indent - 1);
        out += "  ".repeat(indent) + line + "\n";
        if (/^<[^/!][^>]*[^/]>$/.test(line) && !/^<(meta|link|img|br|hr|input|source|area|base|col|embed|wbr)\b/i.test(line)) indent++;
      });
      return out;
    }
    return code.replace(/\s*\{\s*/g, " {\n  ").replace(/;\s*/g, ";\n  ").replace(/\s*\}\s*/g, "\n}\n");
  }
  ["Html", "Css", "Js"].forEach((type) => {
    const key = type.toLowerCase();
    $(`format${type}`).addEventListener("click", function () {
      if (!state[key]) return;
      state.formatted[key] = !state.formatted[key];
      if (state.formatted[key]) {
        state[key] = beautify(state.raw[key], key);
        this.textContent = "⇄ Minify";
      } else {
        state[key] = state.raw[key];
        this.textContent = "{} Format";
      }
      updatePanels();
    });
  });

  /* Copy */
  $$(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const type = this.id.replace("copy", "").toLowerCase();
      try {
        await navigator.clipboard.writeText(state[type] || "");
        this.innerHTML = "✓ Copied!";
        this.classList.add("copied");
        toast("Copied to clipboard");
        setTimeout(() => { this.innerHTML = "📋 Copy"; this.classList.remove("copied"); }, 2000);
      } catch { toast("Copy failed", "error"); }
    });
  });

  /* Download */
  function download(content, filename, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content || ""], { type: mime }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  $$(".btn-download, .btn-download-all").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.hasData) return;
      const type = btn.dataset.type;
      if (type === "all") {
        download(state.html, "sourcew-source.html", "text/html");
        setTimeout(() => download(state.css, "sourcew-style.css", "text/css"), 200);
        setTimeout(() => download(state.js, "sourcew-script.js", "application/javascript"), 400);
        toast("Downloading all 3 files...");
      } else {
        const map = { html: [state.html, "sourcew-source.html", "text/html"], css: [state.css, "sourcew-style.css", "text/css"], js: [state.js, "sourcew-script.js", "application/javascript"] };
        const [c, n, m] = map[type];
        download(c, n, m);
        toast("Downloading " + type.toUpperCase() + "...");
      }
    });
  });

  /* Clear */
  $("clearBtn").addEventListener("click", () => {
    if (!state.hasData) return;
    $$(".tab-panel").forEach((p) => { p.style.transition = "all .3s"; p.style.opacity = "0"; p.style.transform = "translateZ(-200px)"; });
    setTimeout(() => {
      Object.assign(state, { url: "", html: "", css: "", js: "", resources: [], hasData: false, stats: { htmlSize: 0, cssSize: 0, jsSize: 0, htmlLines: 0, cssLines: 0, jsLines: 0, resourceCount: 0, time: "0" }, raw: { html: "", css: "", js: "" }, formatted: { html: false, css: false, js: false } });
      $("urlInput").value = "";
      $("inputValidation").textContent = "";
      $("urlInput").classList.remove("valid", "invalid");
      $("htmlCode").innerHTML = ""; $("cssCode").innerHTML = ""; $("jsCode").innerHTML = "";
      $("resourceList").innerHTML = '<li class="resource-empty">No resources found. Extract a URL to see external assets.</li>';
      ["html", "css", "js"].forEach((t) => {
        $(`${t}LineNumbers`).innerHTML = "<span>1</span>";
        $(`${t}Size`).textContent = "0 B";
        $(`${t}Lines`).textContent = "0 lines";
      });
      $("actionBar").classList.add("hidden");
      $("resultsSection").classList.add("hidden");
      $("statsBar").classList.add("hidden");
      $("emptyState").classList.remove("hidden");
      $$(".tab-panel").forEach((p) => { p.style.opacity = ""; p.style.transform = ""; p.classList.remove("fly-in"); });
      $$(".tab-btn").forEach((b) => { const on = b.dataset.tab === "html"; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
      $$(".tab-panel").forEach((p) => { const on = p.id === "panel-html"; p.classList.toggle("active", on); p.hidden = !on; });
      $("urlInput").focus();
      toast("All content cleared");
    }, 300);
  });

  /* Manual */
  function showManual() {
    $("manualModal").classList.remove("hidden");
    $("manualInput").focus();
  }
  $("openManual").addEventListener("click", showManual);
  $("closeManual").addEventListener("click", () => $("manualModal").classList.add("hidden"));
  $("parseManualBtn").addEventListener("click", () => {
    const code = $("manualInput").value.trim();
    if (!code || code.length < 20) { toast("Please paste HTML code first", "error"); return; }
    state.url = state.url || normalizeUrl($("urlInput").value) || "https://pasted.local";
    parseCode(code, state.url);
    state.stats.time = "0";
    state.hasData = true;
    $("manualModal").classList.add("hidden");
    showResults();
    toast("Source code parsed!", "success");
  });
  $("manualModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden"); });

  /* Fullscreen */
  $$(".btn-fullscreen").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;
      const content = $(`panel-${panel}`).querySelector(".code-container").cloneNode(true);
      $("fullscreenContent").innerHTML = "";
      $("fullscreenContent").appendChild(content);
      $("fullscreenTitle").textContent = panel.toUpperCase() + " Code";
      $("fullscreenOverlay").classList.remove("hidden");
    });
  });
  $("fullscreenClose").addEventListener("click", () => $("fullscreenOverlay").classList.add("hidden"));

  /* Theme */
  $("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sw_theme", next);
    $("themeToggle").textContent = next === "dark" ? "☀" : "🌙";
  });
  if (localStorage.getItem("sw_theme") === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    $("themeToggle").textContent = "☀";
  }

  /* Offline */
  function checkOnline() {
    if (!navigator.onLine) {
      $("offlineBanner").classList.remove("hidden");
      $("extractBtn").disabled = true;
    } else {
      $("offlineBanner").classList.add("hidden");
      $("extractBtn").disabled = false;
    }
  }
  addEventListener("online", checkOnline);
  addEventListener("offline", checkOnline);
  $("offlineClose").addEventListener("click", () => $("offlineBanner").classList.add("hidden"));
  checkOnline();

  /* PWA */
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    if (!localStorage.getItem("sw_install_dismissed")) $("installBanner").classList.remove("hidden");
  });
  $("installBtn").addEventListener("click", async () => {
    if (installPrompt) { installPrompt.prompt(); installPrompt = null; }
    $("installBanner").classList.add("hidden");
  });
  $("installDismiss").addEventListener("click", () => {
    localStorage.setItem("sw_install_dismissed", "1");
    $("installBanner").classList.add("hidden");
  });

  /* Keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("fullscreenOverlay").classList.contains("hidden")) { $("fullscreenOverlay").classList.add("hidden"); return; }
      if (!$("manualModal").classList.contains("hidden")) { $("manualModal").classList.add("hidden"); return; }
      if ($("landing").style.display !== "none" && !$("landing").classList.contains("exiting")) enterApp();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    initTilt();
  });
})();
