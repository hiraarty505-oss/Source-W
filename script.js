(function () {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const state = {
    url: "", html: "", css: "", js: "", resources: [], hasData: false,
    stats: { html: 0, css: 0, js: 0, res: 0, time: "0" },
    raw: { html: "", css: "", js: "" },
    fmt: { html: false, css: false, js: false },
  };

  const PROXIES = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  let animId = null, autoT = null;

  function toast(msg, err) {
    const t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.textContent = msg;
    $("toasts").appendChild(t);
    while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
    setTimeout(() => t.remove(), 3200);
  }
  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* Theme */
  const saved = localStorage.getItem("sw_theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  else document.documentElement.setAttribute("data-theme", "dark");
  $("themeBtn").textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀" : "🌙";
  $("themeBtn").addEventListener("click", () => {
    const n = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", n);
    localStorage.setItem("sw_theme", n);
    $("themeBtn").textContent = n === "dark" ? "☀" : "🌙";
  });

  /* Offline */
  function syncOnline() {
    const on = navigator.onLine;
    $("offlineBar").classList.toggle("hidden", on);
    $("extractBtn").disabled = !on;
  }
  addEventListener("online", syncOnline);
  addEventListener("offline", syncOnline);
  $("offlineX").addEventListener("click", () => $("offlineBar").classList.add("hidden"));
  syncOnline();

  /* Landing — canvas particle network + code fragments */
  function initHero() {
    const canvas = $("heroCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -1e3, y: -1e3 };
    let parts = [], frags = [];
    const labels = ["<div>", "</div>", "{", "}", "const", "=>", "class", "#id", ".cls", "() =>", "async", "html", "css", "js"];

    function resize() {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    }
    resize();
    addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

    const N = reduced ? 40 : Math.min(90, Math.floor((innerWidth * innerHeight) / 14000));
    for (let i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.4, o: Math.random() * 0.5 + 0.15,
      });
    }
    if (!reduced) {
      for (let i = 0; i < 12; i++) {
        frags.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          text: labels[i % labels.length], o: 0.12 + Math.random() * 0.2,
          size: 11 + Math.random() * 6,
        });
      }
    }

    (function loop() {
      if ($("landing").classList.contains("exit") || $("landing").style.display === "none") return;
      animId = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // parallax offset
      const px = (mouse.x / canvas.width - 0.5) * 20;
      const py = (mouse.y / canvas.height - 0.5) * 14;

      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 140 && d > 0) { const f = (140 - d) / 140; p.vx += (dx / d) * f * 0.35; p.vy += (dy / d) * f * 0.35; }
        p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x + px * 0.3, p.y + py * 0.3, p.r, 0, 6.28);
        ctx.fillStyle = `rgba(167,139,250,${p.o})`;
        ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x + px * 0.3, a.y + py * 0.3);
            ctx.lineTo(b.x + px * 0.3, b.y + py * 0.3);
            ctx.strokeStyle = `rgba(59,130,246,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      ctx.font = "12px ui-monospace, monospace";
      for (const f of frags) {
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0 || f.x > canvas.width) f.vx *= -1;
        if (f.y < 0 || f.y > canvas.height) f.vy *= -1;
        ctx.globalAlpha = f.o;
        ctx.fillStyle = "#94a3b8";
        ctx.font = `${f.size}px ui-monospace, monospace`;
        ctx.fillText(f.text, f.x + px * 0.5, f.y + py * 0.5);
        ctx.globalAlpha = 1;
      }
    })();

    // typewriter
    typeText($("heroTitle"), "Source W", 55);
    setTimeout(() => typeText($("heroSub"), "Extract · Preview · Download", 35, true), 600);

    $("enterBtn").addEventListener("click", enterApp);
    if (!reduced) autoT = setTimeout(() => { if (!$("landing").classList.contains("exit")) enterApp(); }, 5000);

    // magnetic button
    if (!reduced) {
      const btn = $("enterBtn");
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.2}px) scale(1.04)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    }
  }

  function typeText(el, text, speed, glow) {
    if (!el) return;
    el.textContent = "";
    if (reduced) {
      el.textContent = text;
      if (glow) el.innerHTML = text.split(" · ").map((s) => `<span class="glow">${s}</span>`).join(" · ");
      return;
    }
    let i = 0;
    (function tick() {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed);
      } else if (glow) {
        el.innerHTML = text.split(" · ").map((s) => `<span class="glow">${s}</span>`).join(" · ");
      }
    })();
  }

  function enterApp() {
    if ($("landing").classList.contains("exit")) return;
    if (autoT) clearTimeout(autoT);
    if (animId) cancelAnimationFrame(animId);
    $("landing").classList.add("exit");
    setTimeout(() => {
      $("landing").style.display = "none";
      $("mainApp").classList.remove("hidden");
      void $("mainApp").offsetWidth;
      $("mainApp").classList.add("visible");
      setTimeout(() => $("urlInput").focus(), 280);
    }, reduced ? 0 : 850);
  }

  /* Input validation + history */
  function normalize(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    return v;
  }
  const validate = debounce(() => {
    const v = $("urlInput").value.trim();
    const ok = v && /^https?:\/\/.+\..+/i.test(normalize(v));
    $("readyBadge").classList.toggle("hidden", !ok);
  }, 280);
  $("urlInput").addEventListener("input", validate);
  $("urlInput").addEventListener("focus", () => {
    renderHistory();
    $("historyPanel").classList.remove("hidden");
  });
  $("urlInput").addEventListener("blur", () => setTimeout(() => $("historyPanel").classList.add("hidden"), 180));

  function getHist() { try { return JSON.parse(localStorage.getItem("sw_hist") || "[]"); } catch { return []; } }
  function saveHist(url) {
    let h = getHist().filter((x) => x.url !== url);
    let domain = url;
    try { domain = new URL(url).hostname; } catch {}
    h.unshift({ url, domain, ts: Date.now() });
    localStorage.setItem("sw_hist", JSON.stringify(h.slice(0, 12)));
  }
  function ago(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function renderHistory() {
    const h = getHist();
    const p = $("historyPanel");
    if (!h.length) { p.innerHTML = ""; p.classList.add("hidden"); return; }
    p.innerHTML = h.map((x) =>
      `<button type="button" data-u="${x.url.replace(/"/g, "&quot;")}"><span class="h-dom">${x.domain}</span><span class="h-time">${ago(x.ts)}</span></button>`
    ).join("") + `<button type="button" class="h-clear" data-clear="1">Clear history</button>`;
    p.querySelectorAll("button").forEach((b) => {
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (b.dataset.clear) { localStorage.removeItem("sw_hist"); p.innerHTML = ""; return; }
        $("urlInput").value = b.dataset.u;
        validate();
        p.classList.add("hidden");
        extract();
      });
    });
  }

  /* Card tilt */
  function bindTilt() {
    if (reduced) return;
    $$(".tilt").forEach((el) => {
      if (el.dataset.t) return;
      el.dataset.t = "1";
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* Extract */
  function setLoad(on) {
    $("extractBtn").querySelector(".btn-label").classList.toggle("hidden", on);
    $("extractBtn").querySelector(".btn-loading").classList.toggle("hidden", !on);
    $("extractBtn").disabled = on || !navigator.onLine;
  }
  function showOv(on) {
    $("extractOv").classList.toggle("hidden", !on);
    if (on) { $("progressBar").style.width = "0%"; $("statusText").textContent = "Connecting…"; }
  }
  function setProg(p) { $("progressBar").style.width = p + "%"; }

  async function fetchHTML(url) {
    try {
      const r = await fetch(url, { mode: "cors", headers: { Accept: "text/html" }, signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const t = await r.text();
        if (t.length > 80 && /html|DOCTYPE|body/i.test(t)) return t;
      }
    } catch (_) {}
    for (const p of PROXIES) {
      try {
        const r = await fetch(p(url), { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const t = await r.text();
          if (t.length > 80 && /html|DOCTYPE|body/i.test(t)) return t;
        }
      } catch (_) {}
    }
    throw new Error("CORS");
  }

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

  function parse(raw, base) {
    state.html = raw; state.raw.html = raw;
    const styles = [], scripts = [];
    let m;
    const sr = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = sr.exec(raw)) !== null) styles.push(m[1].trim());
    state.css = styles.map((s, i) => `/* Style ${i + 1} */\n${s}`).join("\n\n") || "/* no inline styles */";
    state.raw.css = state.css;
    const jr = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = jr.exec(raw)) !== null) scripts.push(m[1].trim());
    state.js = scripts.map((s, i) => `/* Script ${i + 1} */\n${s}`).join("\n\n") || "/* no inline scripts */";
    state.raw.js = state.js;
    state.resources = [];
    const push = (type, url) => { if (url) state.resources.push({ type, url }); };
    const tm = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (tm) push("meta", "Title: " + tm[1].trim().slice(0, 100));
    const lr = /<link[^>]*href=["']([^"']+)["'][^>]*>/gi;
    while ((m = lr.exec(raw)) !== null) push("css", resolve(m[1], base));
    const er = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = er.exec(raw)) !== null) push("js", resolve(m[1], base));
    const ir = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((m = ir.exec(raw)) !== null) push("img", resolve(m[1], base));
    const seen = new Set();
    const ar = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    while ((m = ar.exec(raw)) !== null) {
      const h = m[1];
      if (!h.startsWith("http") && !h.startsWith("//")) continue;
      const abs = resolve(h, base);
      if (seen.has(abs)) continue;
      seen.add(abs); push("link", abs);
    }
    state.stats = {
      html: new Blob([state.html]).size,
      css: new Blob([state.css]).size,
      js: new Blob([state.js]).size,
      res: state.resources.length,
      time: state.stats.time,
    };
    state.fmt = { html: false, css: false, js: false };
  }

  function bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hiHTML(c) {
    c = esc(c);
    c = c.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-cmt">$1</span>');
    c = c.replace(/(&lt;\/?[a-zA-Z][\w\-]*)(.*?)(\/?&gt;)/g, (m, t, a, e) => {
      const ha = a.replace(/([\w\-:]+)=(&quot;.*?&quot;|&#39;.*?&#39;|"[^"]*"|'[^']*')/g, '<span class="tok-attr">$1</span>=<span class="tok-str">$2</span>');
      return `<span class="tok-tag">${t}</span>${ha}<span class="tok-tag">${e}</span>`;
    });
    return c;
  }
  function hiCSS(c) {
    c = esc(c);
    c = c.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cmt">$1</span>');
    c = c.replace(/([^{}/]+)(\{)/g, '<span class="tok-sel">$1</span>$2');
    return c.replace(/([a-zA-Z\-]+)\s*:\s*([^;{}]+);/g, '<span class="tok-prop">$1</span>: <span class="tok-val">$2</span>;');
  }
  function hiJS(c) {
    c = esc(c);
    c = c.replace(/(\/\/[^\n]*)/g, '<span class="tok-cmt">$1</span>');
    c = c.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cmt">$1</span>');
    c = c.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[^`]*`)/g, '<span class="tok-str">$1</span>');
    c = c.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|try|catch|throw)\b/g, '<span class="tok-kw">$1</span>');
    c = c.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="tok-fn">$1</span>(');
    return c.replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
  }

  function lines(codeId, gutId) {
    const n = Math.max(($(codeId).textContent || "").split("\n").length, 1);
    $(gutId).innerHTML = Array.from({ length: n }, (_, i) => i + 1).join("<br>");
  }

  function updateUI() {
    const max = 280000;
    const tr = (s) => (s.length > max ? s.slice(0, max) + "\n\n/* truncated */" : s);
    $("htmlCode").innerHTML = hiHTML(tr(state.html));
    $("cssCode").innerHTML = hiCSS(tr(state.css));
    $("jsCode").innerHTML = hiJS(tr(state.js));
    lines("htmlCode", "htmlGutter");
    lines("cssCode", "cssGutter");
    lines("jsCode", "jsGutter");
    $("htmlSize").textContent = bytes(state.stats.html);
    $("cssSize").textContent = bytes(state.stats.css);
    $("jsSize").textContent = bytes(state.stats.js);
    $("htmlLines").textContent = state.html.split("\n").length.toLocaleString() + " lines";
    $("cssLines").textContent = state.css.split("\n").length.toLocaleString() + " lines";
    $("jsLines").textContent = state.js.split("\n").length.toLocaleString() + " lines";

    $("stats").innerHTML = [
      ["📄", bytes(state.stats.html), "HTML"],
      ["🎨", bytes(state.stats.css), "CSS"],
      ["⚡", bytes(state.stats.js), "JS"],
      ["🔗", state.stats.res, "Resources"],
    ].map(([i, v, l]) => `<div class="stat"><span class="si">${i}</span><span class="sv">${v}</span><span class="sl">${l}</span></div>`).join("");

    $("timeVal").textContent = state.stats.time + "s";
    $("timePill").classList.remove("hidden");

    const list = $("resList");
    if (!state.resources.length) {
      list.innerHTML = '<p class="res-empty">No resources found.</p>';
    } else {
      const g = {};
      state.resources.forEach((r) => { (g[r.type] = g[r.type] || []).push(r); });
      list.innerHTML = Object.entries(g).map(([type, items]) =>
        `<details class="res-g" open><summary>${type.toUpperCase()} <span class="res-badge">${items.length}</span></summary>` +
        items.map((r) => r.url.startsWith("http")
          ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`
          : `<a style="pointer-events:none;opacity:.75">${esc(r.url)}</a>`
        ).join("") + "</details>"
      ).join("");
    }
    $("resCount").textContent = state.stats.res + " found";
  }

  function showResults() {
    $("emptyState").classList.add("hidden");
    $("results").classList.remove("hidden");
    updateUI();
    bindTilt();
  }

  async function extract() {
    if (!navigator.onLine) { toast("You are offline", true); return; }
    const url = normalize($("urlInput").value);
    if (!/^https?:\/\/.+\..+/i.test(url)) {
      toast("Enter a valid URL with http:// or https://", true);
      $("urlInput").focus();
      return;
    }
    state.url = url;
    $("urlInput").value = url;
    setLoad(true);
    showOv(true);
    const t0 = performance.now();
    try {
      setProg(15);
      $("statusText").textContent = "Fetching…";
      const raw = await fetchHTML(url);
      setProg(65);
      $("statusText").textContent = "Parsing…";
      await delay(reduced ? 0 : 200);
      parse(raw, url);
      state.stats.time = ((performance.now() - t0) / 1000).toFixed(1);
      state.hasData = true;
      saveHist(url);
      setProg(100);
      $("statusText").textContent = "Done";
      await delay(200);
      showOv(false);
      setLoad(false);
      showResults();
      toast("Extraction complete");
    } catch (e) {
      showOv(false);
      setLoad(false);
      if (e.message === "CORS") {
        toast("CORS blocked — try pasting source manually", true);
        openManual();
      } else toast("Extraction failed: " + (e.message || "error"), true);
    }
  }

  $("extractBtn").addEventListener("click", extract);
  $("urlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); extract(); }
  });

  /* Tabs */
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      $$(".tab").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on);
      });
      $$(".panel").forEach((p) => {
        const on = p.id === "panel-" + tab;
        p.classList.toggle("active", on);
        p.hidden = !on;
      });
      if (tab === "preview") loadPreview();
    });
  });

  function loadPreview() {
    if (!state.html) return;
    $("previewLoad").classList.remove("hidden");
    $("previewErr").classList.add("hidden");
    let html = state.html
      .replace(/<script[\s\S]*?<\/script>/gi, "<!-- removed -->")
      .replace(/javascript:[^"'>\s]*/gi, "#")
      .replace(/\son\w+=["'][^"']*["']/gi, "");
    if (state.url && !/<base[\s>]/i.test(html)) {
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${state.url}">`)
        : `<base href="${state.url}">` + html;
    }
    $("previewFrame").srcdoc = html;
    $("previewFrame").onload = () => $("previewLoad").classList.add("hidden");
    setTimeout(() => $("previewLoad").classList.add("hidden"), 4500);
  }

  $$(".dev").forEach((b) => {
    b.addEventListener("click", () => {
      $$(".dev").forEach((x) => x.classList.toggle("active", x === b));
      $("previewFrameWrap").dataset.device = b.dataset.dev;
    });
  });

  /* Search */
  $$(".find").forEach((inp) => {
    inp.addEventListener("input", debounce(() => {
      const k = inp.dataset.k;
      const code = $(k + "Code");
      let html = code.innerHTML.replace(/<span class="hit">([\s\S]*?)<\/span>/g, "$1");
      const q = inp.value.trim();
      if (!q) {
        code.innerHTML = k === "html" ? hiHTML(state.html) : k === "css" ? hiCSS(state.css) : hiJS(state.js);
        lines(k + "Code", k + "Gutter");
        return;
      }
      try {
        const re = new RegExp("(" + esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
        code.innerHTML = html.replace(re, '<span class="hit">$1</span>');
      } catch { code.innerHTML = html; }
    }, 180));
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { inp.value = ""; inp.dispatchEvent(new Event("input")); }
    });
  });

  /* Format */
  function beautify(code, type) {
    if (type === "html") {
      let out = "", ind = 0;
      code.replace(/>\s*</g, ">\n<").split("\n").forEach((line) => {
        line = line.trim(); if (!line) return;
        if (/^<\//.test(line)) ind = Math.max(0, ind - 1);
        out += "  ".repeat(ind) + line + "\n";
        if (/^<[^/!][^>]*[^/]>$/.test(line) && !/^<(meta|link|img|br|hr|input|source|area|base|col|embed|wbr)\b/i.test(line)) ind++;
      });
      return out;
    }
    return code.replace(/\s*\{\s*/g, " {\n  ").replace(/;\s*/g, ";\n  ").replace(/\s*\}\s*/g, "\n}\n");
  }
  $$("[data-fmt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.fmt;
      if (!state[k]) return;
      state.fmt[k] = !state.fmt[k];
      state[k] = state.fmt[k] ? beautify(state.raw[k], k) : state.raw[k];
      btn.textContent = state.fmt[k] ? "Minify" : "Format";
      updateUI();
    });
  });

  /* Copy / Download / Clear */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(state[this.dataset.copy] || "");
        const o = this.textContent; this.textContent = "Copied!"; this.classList.add("ok");
        toast("Copied");
        setTimeout(() => { this.textContent = o; this.classList.remove("ok"); }, 1600);
      } catch { toast("Copy failed", true); }
    });
  });

  function dl(content, name, mime) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content || ""], { type: mime }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  $$("[data-dl]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.hasData) return;
      const t = btn.dataset.dl;
      if (t === "all") {
        dl(state.html, "sourcew-source.html", "text/html");
        setTimeout(() => dl(state.css, "sourcew-style.css", "text/css"), 180);
        setTimeout(() => dl(state.js, "sourcew-script.js", "application/javascript"), 360);
        toast("Downloading all files…");
      } else {
        const map = { html: [state.html, "sourcew-source.html", "text/html"], css: [state.css, "sourcew-style.css", "text/css"], js: [state.js, "sourcew-script.js", "application/javascript"] };
        const [c, n, m] = map[t];
        dl(c, n, m);
        toast("Downloading " + t.toUpperCase());
      }
    });
  });

  $("clearBtn").addEventListener("click", () => {
    if (!state.hasData) return;
    Object.assign(state, {
      url: "", html: "", css: "", js: "", resources: [], hasData: false,
      stats: { html: 0, css: 0, js: 0, res: 0, time: "0" },
      raw: { html: "", css: "", js: "" }, fmt: { html: false, css: false, js: false },
    });
    $("urlInput").value = "";
    $("readyBadge").classList.add("hidden");
    $("results").classList.add("hidden");
    $("emptyState").classList.remove("hidden");
    $("timePill").classList.add("hidden");
    $("urlInput").focus();
    toast("Cleared");
  });

  /* Manual */
  function openManual() {
    $("manualModal").classList.remove("hidden");
    $("manualInput").focus();
  }
  $("manualLink").addEventListener("click", openManual);
  $("manualClose").addEventListener("click", () => $("manualModal").classList.add("hidden"));
  $("manualModal").addEventListener("click", (e) => { if (e.target === $("manualModal")) $("manualModal").classList.add("hidden"); });
  $("manualInput").addEventListener("input", () => {
    $("charCount").textContent = $("manualInput").value.length.toLocaleString() + " chars";
  });
  $("parseManual").addEventListener("click", () => {
    const code = $("manualInput").value.trim();
    if (code.length < 20) { toast("Paste more HTML", true); return; }
    state.url = state.url || normalize($("urlInput").value) || "https://pasted.local";
    parse(code, state.url);
    state.stats.time = "0";
    state.hasData = true;
    $("manualModal").classList.add("hidden");
    showResults();
    toast("Parsed pasted source");
  });

  /* Fullscreen */
  $$("[data-fs]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.fs;
      $("fsBody").innerHTML = "";
      $("fsBody").appendChild($("panel-" + k).querySelector(".editor").cloneNode(true));
      $("fsTitle").textContent = k.toUpperCase();
      $("fs").classList.remove("hidden");
    });
  });
  $("fsClose").addEventListener("click", () => $("fs").classList.add("hidden"));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("fs").classList.contains("hidden")) { $("fs").classList.add("hidden"); return; }
    if (!$("manualModal").classList.contains("hidden")) { $("manualModal").classList.add("hidden"); return; }
    if ($("landing").style.display !== "none" && !$("landing").classList.contains("exit")) enterApp();
  });

  document.addEventListener("DOMContentLoaded", () => {
    initHero();
    bindTilt();
  });
})();
