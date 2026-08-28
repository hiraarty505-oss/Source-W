/* ==========================================================================
   SOURCE W — application logic
   ========================================================================== */

(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    url: "",
    html: "",
    css: "",
    js: "",
    resources: [],
    hasData: false,
    counts: { styles: 0, scripts: 0, resources: 0 },
  };

  /* =======================================================================
     LANDING — particles, typewriter, enter
     ======================================================================= */

  const landing = document.getElementById("landing");
  const mainApp = document.getElementById("mainApp");
  const particleCanvas = document.getElementById("particle-canvas");
  const taglineEl = document.getElementById("tagline");
  const enterBtn = document.getElementById("enterBtn");

  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let particleAnimId = null;
  let particleCtx = null;

  function initParticles() {
    if (!particleCanvas || reducedMotion) return;
    particleCtx = particleCanvas.getContext("2d");
    resizeParticles();
    const count = Math.min(150, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.6 + 0.4,
        o: Math.random() * 0.5 + 0.25,
      });
    }
    window.addEventListener("mousemove", onParticleMouse);
    window.addEventListener("resize", resizeParticles);
    animateParticles();
  }

  function resizeParticles() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }

  function onParticleMouse(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function animateParticles() {
    particleAnimId = requestAnimationFrame(animateParticles);
    const ctx = particleCtx;
    const w = particleCanvas.width;
    const h = particleCanvas.height;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150 && dist > 0) {
        const force = (150 - dist) / 150;
        p.vx += (dx / dist) * force * 0.35;
        p.vy += (dy / dist) * force * 0.35;
      }
      p.vx *= 0.99;
      p.vy *= 0.99;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.o})`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - d / 100)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function typewriterEffect() {
    const text = "Extract · Preview · Download";
    let i = 0;
    taglineEl.innerHTML = '<span class="cursor"></span>';
    if (reducedMotion) {
      taglineEl.textContent = text;
      return;
    }
    const tick = () => {
      if (i <= text.length) {
        taglineEl.innerHTML = text.slice(0, i) + '<span class="cursor"></span>';
        i++;
        setTimeout(tick, 50);
      } else {
        taglineEl.textContent = text;
      }
    };
    setTimeout(tick, 400);
  }

  function enterApp() {
    if (landing.classList.contains("landing-exit")) return;
    landing.classList.add("landing-exit");
    setTimeout(() => {
      landing.hidden = true;
      landing.setAttribute("aria-hidden", "true");
      if (particleAnimId) cancelAnimationFrame(particleAnimId);
      mainApp.hidden = false;
      mainApp.removeAttribute("hidden");
      requestAnimationFrame(() => {
        mainApp.classList.add("main-app-enter");
      });
      const input = document.getElementById("urlInput");
      if (input) setTimeout(() => input.focus(), 400);
    }, reducedMotion ? 0 : 750);
  }

  enterBtn.addEventListener("click", enterApp);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !landing.hidden) {
      e.preventDefault();
      enterApp();
    }
  });

  initParticles();
  typewriterEffect();

  /* =======================================================================
     3D CARD TILT
     ======================================================================= */

  function setupCardTilt() {
    document.querySelectorAll(".card-3d").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        if (reducedMotion) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotY = Math.max(-15, Math.min(15, (x - cx) / 20));
        const rotX = Math.max(-15, Math.min(15, (cy - y) / 20));
        card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform 0.5s var(--ease)";
        card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
        setTimeout(() => { card.style.transition = ""; }, 500);
      });
    });
  }

  /* =======================================================================
     TOASTS
     ======================================================================= */

  const toastContainer = document.getElementById("toastContainer");
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 320);
    }, 2600);
  }

  /* =======================================================================
     URL + EXTRACTION
     ======================================================================= */

  const extractForm = document.getElementById("extractForm");
  const extractBtn = document.getElementById("extractBtn");
  const urlInput = document.getElementById("urlInput");
  const urlCard = document.getElementById("urlCard");
  const extractOverlay = document.getElementById("extractOverlay");
  const scannerLine = document.getElementById("scannerLine");
  const dataStreams = document.getElementById("dataStreams");
  const extractStatus = document.getElementById("extractStatus");
  const burstCanvas = document.getElementById("burstCanvas");

  const actionBar = document.getElementById("actionBar");
  const statsBar = document.getElementById("statsBar");
  const emptyState = document.getElementById("emptyState");
  const resultsPanel = document.getElementById("resultsPanel");

  function isValidUrl(value) {
    return /^https?:\/\/.+\..+/i.test(value.trim());
  }

  extractForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!isValidUrl(url)) {
      showToast("Enter a valid URL starting with http:// or https://");
      urlInput.focus();
      return;
    }
    await runExtraction(url);
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) extractForm.requestSubmit();
  });

  function showOverlay(status) {
    extractOverlay.hidden = false;
    extractOverlay.setAttribute("aria-hidden", "false");
    extractStatus.textContent = status || "Extracting…";
    extractOverlay.classList.remove("scanning", "streaming");
    void extractOverlay.offsetWidth;
    extractOverlay.classList.add("scanning");

    dataStreams.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const line = document.createElement("div");
      line.className = "data-stream";
      line.style.top = `${8 + i * 7.5}%`;
      line.style.animationDelay = `${0.15 + i * 0.08}s`;
      dataStreams.appendChild(line);
    }
    setTimeout(() => extractOverlay.classList.add("streaming"), 200);

    if (!reducedMotion) {
      urlCard.classList.add("deconstruct");
    }
  }

  function hideOverlay() {
    extractOverlay.classList.remove("scanning", "streaming");
    extractOverlay.hidden = true;
    extractOverlay.setAttribute("aria-hidden", "true");
    urlCard.classList.remove("deconstruct");
    urlCard.style.transform = "";
  }

  function particleBurst() {
    if (reducedMotion || !burstCanvas) return;
    const ctx = burstCanvas.getContext("2d");
    burstCanvas.width = window.innerWidth;
    burstCanvas.height = window.innerHeight;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dots = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.4;
      const speed = 3 + Math.random() * 5;
      dots.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
    let frames = 0;
    function frame() {
      frames++;
      ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
      let alive = false;
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.life -= 0.025;
        if (d.life > 0) {
          alive = true;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${d.life})`;
          ctx.fill();
        }
      });
      if (alive && frames < 60) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
    }
    requestAnimationFrame(frame);
  }

  async function fetchWithCors(url) {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      if (!res.ok) throw new Error(`Proxy failed: ${res.status}`);
      return await res.text();
    }
  }

  function resolveUrl(href, base) {
    try {
      return new URL(href, base).href;
    } catch (e) {
      return href || "";
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function parseSource(rawHtml, baseUrl) {
    const resources = [];
    let css = "";
    let js = "";
    let styleCount = 0;
    let scriptCount = 0;

    // Meta / title
    try {
      const doc = new DOMParser().parseFromString(rawHtml, "text/html");
      const title = doc.querySelector("title");
      if (title) {
        resources.push({ type: "meta", url: "title", status: "ok", note: title.textContent.trim().slice(0, 80) });
      }
      doc.querySelectorAll("meta[charset], meta[name], meta[property]").forEach((m) => {
        const key = m.getAttribute("charset") || m.getAttribute("name") || m.getAttribute("property") || "meta";
        const val = m.getAttribute("content") || m.getAttribute("charset") || "";
        resources.push({ type: "meta", url: key, status: "ok", note: String(val).slice(0, 100) });
      });

      // Inline styles
      doc.querySelectorAll("style").forEach((s) => {
        styleCount++;
        css += `\n\n/* Source: inline style block ${styleCount} */\n${s.textContent}`;
      });

      // Linked stylesheets
      doc.querySelectorAll('link[rel="stylesheet"][href]').forEach((link) => {
        const abs = resolveUrl(link.getAttribute("href"), baseUrl);
        resources.push({ type: "css", url: abs, status: "linked" });
      });

      // Inline scripts (no src)
      doc.querySelectorAll("script").forEach((s) => {
        if (!s.src) {
          scriptCount++;
          js += `\n\n// Source: inline script ${scriptCount}\n${s.textContent}`;
        } else {
          const abs = resolveUrl(s.getAttribute("src"), baseUrl);
          resources.push({ type: "js", url: abs, status: "linked" });
        }
      });

      // Images
      doc.querySelectorAll("img[src]").forEach((img) => {
        resources.push({ type: "img", url: resolveUrl(img.getAttribute("src"), baseUrl), status: "linked" });
      });

      // Icons / fonts
      doc.querySelectorAll('link[rel*="icon"][href]').forEach((l) => {
        resources.push({ type: "icon", url: resolveUrl(l.getAttribute("href"), baseUrl), status: "linked" });
      });
      doc.querySelectorAll('link[href$=".woff2"], link[href$=".woff"], link[rel="preload"][as="font"]').forEach((l) => {
        resources.push({ type: "font", url: resolveUrl(l.getAttribute("href"), baseUrl), status: "linked" });
      });

      // Unique anchors
      const seen = new Set();
      doc.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
        const abs = resolveUrl(href, baseUrl);
        if (seen.has(abs)) return;
        seen.add(abs);
        resources.push({ type: "link", url: abs, status: "linked" });
      });
    } catch (err) {
      // Fallback regex if DOMParser fails on broken HTML
      const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      let m;
      while ((m = styleRe.exec(rawHtml)) !== null) {
        styleCount++;
        css += `\n\n/* Source: inline style block ${styleCount} */\n${m[1]}`;
      }
      const scriptRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
      while ((m = scriptRe.exec(rawHtml)) !== null) {
        scriptCount++;
        js += `\n\n// Source: inline script ${scriptCount}\n${m[1]}`;
      }
    }

    resources.unshift({ type: "html", url: baseUrl, status: "ok" });

    return {
      html: rawHtml,
      css: css.trim() || "/* no stylesheets found */",
      js: js.trim() || "// no scripts found",
      resources,
      counts: {
        styles: styleCount,
        scripts: scriptCount,
        resources: resources.filter((r) => r.type !== "html" && r.type !== "meta").length,
      },
    };
  }

  async function enrichLinkedCss(parsed, baseUrl) {
    const cssLinks = parsed.resources.filter((r) => r.type === "css" && r.status === "linked");
    let fetched = parsed.css;
    for (const item of cssLinks.slice(0, 8)) {
      try {
        const text = await fetchWithCors(item.url);
        fetched += `\n\n/* Source: ${item.url} */\n${text}`;
        item.status = "ok";
      } catch (e) {
        item.status = "fail";
      }
    }
    parsed.css = fetched;
    return parsed;
  }

  async function runExtraction(url) {
    extractBtn.classList.add("is-loading");
    extractBtn.disabled = true;
    showOverlay("Fetching page…");

    try {
      await delay(reducedMotion ? 0 : 600);
      extractStatus.textContent = "Fetching page…";
      const rawHtml = await fetchWithCors(url);

      extractStatus.textContent = "Parsing HTML, CSS & scripts…";
      await delay(reducedMotion ? 0 : 400);
      let parsed = parseSource(rawHtml, url);

      extractStatus.textContent = "Fetching linked stylesheets…";
      parsed = await enrichLinkedCss(parsed, url);

      state.url = url;
      state.html = parsed.html;
      state.css = parsed.css;
      state.js = parsed.js;
      state.resources = parsed.resources;
      state.counts = parsed.counts;
      state.hasData = true;

      particleBurst();
      await delay(reducedMotion ? 0 : 500);
      hideOverlay();

      populateResults();
      revealResults();
      showToast("Source extracted");
    } catch (err) {
      console.error(err);
      hideOverlay();
      showToast("CORS blocked. Try a CORS extension, or paste code manually.");
    } finally {
      extractBtn.classList.remove("is-loading");
      extractBtn.disabled = false;
    }
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* =======================================================================
     SYNTAX HIGHLIGHTING
     ======================================================================= */

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightHTML(code) {
    let e = escapeHtml(code);
    e = e.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(&lt;\/?[a-zA-Z0-9-]+)([^&]*?)(\/?&gt;)/g, (match, open, attrs, close) => {
      const attrHtml = attrs.replace(
        /([a-zA-Z-:]+)(=)("[^"]*"|'[^']*')/g,
        '<span class="token-attr">$1</span>$2<span class="token-string">$3</span>'
      );
      return `<span class="token-tag">${open}</span>${attrHtml}<span class="token-tag">${close}</span>`;
    });
    return e;
  }

  function highlightCSS(code) {
    let e = escapeHtml(code);
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/([.#]?[a-zA-Z0-9_-]+)(\s*\{)/g, '<span class="token-selector">$1</span>$2');
    e = e.replace(
      /([a-zA-Z-]+)(\s*:\s*)([^;{}\n]+)(;?)/g,
      '<span class="token-property">$1</span>$2<span class="token-value">$3</span>$4'
    );
    return e;
  }

  const JS_KEYWORDS =
    /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|extends|new|this|import|export|default|from|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|void|yield|static|get|set)\b/g;

  function highlightJS(code) {
    let e = escapeHtml(code);
    e = e.replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(&#39;[^&]*?&#39;|"[^"]*?"|`[^`]*?`)/g, '<span class="token-string">$1</span>');
    e = e.replace(JS_KEYWORDS, '<span class="token-keyword">$1</span>');
    e = e.replace(/\b([a-zA-Z_$][\w$]*)(?=\()/g, '<span class="token-func">$1</span>');
    e = e.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    return e;
  }

  /* =======================================================================
     RENDER RESULTS
     ======================================================================= */

  const codeHtmlEl = document.getElementById("code-html");
  const codeCssEl = document.getElementById("code-css");
  const codeJsEl = document.getElementById("code-js");
  const fileTreeEl = document.getElementById("fileTree");
  const previewFrame = document.getElementById("previewFrame");
  const previewSpinner = document.getElementById("previewSpinner");
  const previewError = document.getElementById("previewError");

  function populateResults() {
    const htmlBytes = new Blob([state.html]).size;
    const cssBytes = new Blob([state.css]).size;
    const jsBytes = new Blob([state.js]).size;

    document.getElementById("size-html").textContent = `(${formatBytes(htmlBytes)})`;
    document.getElementById("size-css").textContent = `(${formatBytes(cssBytes)})`;
    document.getElementById("size-js").textContent = `(${formatBytes(jsBytes)})`;

    document.getElementById("statStyles").textContent = `${state.counts.styles} style blocks`;
    document.getElementById("statScripts").textContent = `${state.counts.scripts} script blocks`;
    document.getElementById("statResources").textContent = `${state.counts.resources} external resources`;

    // Cap display size for huge pages
    const maxDisplay = 400000;
    const htmlShow = state.html.length > maxDisplay ? state.html.slice(0, maxDisplay) + "\n\n/* … truncated for display … */" : state.html;
    const cssShow = state.css.length > maxDisplay ? state.css.slice(0, maxDisplay) + "\n\n/* … truncated … */" : state.css;
    const jsShow = state.js.length > maxDisplay ? state.js.slice(0, maxDisplay) + "\n\n// … truncated …" : state.js;

    codeHtmlEl.innerHTML = highlightHTML(htmlShow);
    codeCssEl.innerHTML = highlightCSS(cssShow);
    codeJsEl.innerHTML = highlightJS(jsShow);

    fileTreeEl.innerHTML = "";
    if (!state.resources.length) {
      fileTreeEl.innerHTML = '<li class="tree-empty">No assets found.</li>';
    } else {
      state.resources.forEach((item) => {
        const li = document.createElement("li");
        const typeSpan = document.createElement("span");
        typeSpan.className = "tree-type";
        typeSpan.textContent = item.type;
        const statusSpan = document.createElement("span");
        statusSpan.className = `tree-status ${item.status === "ok" ? "ok" : item.status === "fail" ? "fail" : ""}`;
        statusSpan.textContent =
          item.status === "ok" ? "fetched" : item.status === "fail" ? "blocked" : item.status === "linked" ? "linked" : item.status;
        const urlSpan = document.createElement("span");
        urlSpan.className = "tree-url";
        urlSpan.textContent = item.url;
        li.appendChild(typeSpan);
        li.appendChild(statusSpan);
        li.appendChild(urlSpan);
        if (item.note) {
          const note = document.createElement("span");
          note.className = "tree-meta";
          note.textContent = item.note;
          li.appendChild(note);
        }
        fileTreeEl.appendChild(li);
      });
    }

    previewFrame.removeAttribute("srcdoc");
    previewError.hidden = true;
  }

  function revealResults() {
    emptyState.hidden = true;
    resultsPanel.hidden = false;
    actionBar.hidden = false;
    statsBar.hidden = false;
    actionBar.querySelectorAll("button").forEach((b) => (b.disabled = false));

    // Staggered 3D fly-in
    const panels = resultsPanel.querySelectorAll(".panel");
    panels.forEach((p, i) => {
      p.classList.remove("fly-in");
      if (reducedMotion) return;
      setTimeout(() => {
        if (!p.hidden) {
          p.classList.add("fly-in");
        }
      }, i * 150);
    });

    setupCardTilt();
  }

  /* =======================================================================
     TABS
     ======================================================================= */

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

  function switchTab(name) {
    tabs.forEach((t) => {
      const isActive = t.dataset.tab === name;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", String(isActive));
    });
    document.querySelectorAll(".panel").forEach((p) => {
      const isActive = p.id === `panel-${name}`;
      p.hidden = !isActive;
      p.classList.toggle("active", isActive);
      if (isActive && !reducedMotion) {
        p.style.animation = "none";
        void p.offsetWidth;
        p.style.animation = "";
        p.classList.add("fly-in");
      }
    });
    if (name === "preview" && state.hasData) renderPreview();
  }

  function renderPreview() {
    if (!state.html) {
      previewError.hidden = false;
      return;
    }
    previewError.hidden = true;
    previewSpinner.classList.add("active");

    let htmlWithBase = state.html;
    if (!/<base[\s>]/i.test(htmlWithBase)) {
      const baseTag = `<base href="${state.url}">`;
      htmlWithBase = /<head[^>]*>/i.test(htmlWithBase)
        ? htmlWithBase.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
        : baseTag + htmlWithBase;
    }

    previewFrame.onload = () => previewSpinner.classList.remove("active");
    previewFrame.onerror = () => {
      previewSpinner.classList.remove("active");
      previewError.hidden = false;
    };

    try {
      previewFrame.srcdoc = htmlWithBase;
    } catch (err) {
      previewSpinner.classList.remove("active");
      previewError.hidden = false;
    }
  }

  /* =======================================================================
     COPY / DOWNLOAD / CLEAR
     ======================================================================= */

  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!state.hasData) return;
      const key = btn.dataset.copy;
      const text = state[key] || "";
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = "Copied!";
        showToast("Copied to clipboard");
        setTimeout(() => (btn.textContent = original), 1200);
      } catch (err) {
        showToast("Clipboard blocked by browser");
      }
    });
  });

  function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function createDownloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadHTML() {
    if (state.hasData) createDownloadFile(state.html, `sourcew-${timestamp()}-source.html`, "text/html");
  }
  function downloadCSS() {
    if (state.hasData) createDownloadFile(state.css, `sourcew-${timestamp()}-style.css`, "text/css");
  }
  function downloadJS() {
    if (state.hasData) createDownloadFile(state.js, `sourcew-${timestamp()}-script.js`, "application/javascript");
  }

  document.getElementById("dlHtml").addEventListener("click", () => {
    downloadHTML();
    showToast("Download started");
  });
  document.getElementById("dlCss").addEventListener("click", () => {
    downloadCSS();
    showToast("Download started");
  });
  document.getElementById("dlJs").addEventListener("click", () => {
    downloadJS();
    showToast("Download started");
  });
  document.getElementById("dlAll").addEventListener("click", () => {
    if (!state.hasData) return;
    downloadHTML();
    setTimeout(downloadCSS, 200);
    setTimeout(downloadJS, 400);
    showToast("3 files downloaded");
  });

  document.getElementById("clearAll").addEventListener("click", () => {
    if (!state.hasData) return;
    const panels = document.querySelectorAll(".panel");
    if (!reducedMotion) {
      panels.forEach((p) => {
        p.style.transition = "opacity 0.3s var(--ease), transform 0.3s var(--ease)";
        p.style.opacity = "0";
        p.style.transform = "translateZ(-200px)";
      });
    }
    const finish = () => {
      codeHtmlEl.innerHTML = "";
      codeCssEl.innerHTML = "";
      codeJsEl.innerHTML = "";
      fileTreeEl.innerHTML = "";
      previewFrame.removeAttribute("srcdoc");
      previewFrame.onload = null;

      urlInput.value = "";
      urlInput.focus();

      state.url = "";
      state.html = "";
      state.css = "";
      state.js = "";
      state.resources = [];
      state.hasData = false;
      state.counts = { styles: 0, scripts: 0, resources: 0 };

      resultsPanel.hidden = true;
      emptyState.hidden = false;
      actionBar.hidden = true;
      statsBar.hidden = true;
      actionBar.querySelectorAll("button").forEach((b) => (b.disabled = true));

      panels.forEach((p) => {
        p.style.transition = "";
        p.style.opacity = "";
        p.style.transform = "";
      });
      switchTab("html");
      showToast("Cleared");
    };
    reducedMotion ? finish() : setTimeout(finish, 300);
  });

})();
