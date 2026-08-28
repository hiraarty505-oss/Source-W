(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { url: "", html: "", css: "", js: "", resources: [], hasData: false };

  const landing = document.getElementById("landing");
  const mainApp = document.getElementById("mainApp");
  const enterBtn = document.getElementById("enterBtn");
  const tagline = document.getElementById("tagline");
  const urlInput = document.getElementById("urlInput");
  const extractBtn = document.getElementById("extractBtn");
  const inputCard = document.getElementById("inputCard");
  const actionBar = document.getElementById("actionBar");
  const emptyState = document.getElementById("emptyState");
  const resultsSection = document.getElementById("resultsSection");
  const extractOverlay = document.getElementById("extractOverlay");
  const statusText = document.getElementById("statusText");
  const dataMatrix = document.getElementById("dataMatrix");
  const burstCanvas = document.getElementById("burstCanvas");
  const toastContainer = document.getElementById("toastContainer");
  const previewFrame = document.getElementById("previewFrame");
  const previewLoader = document.getElementById("previewLoader");
  const previewError = document.getElementById("previewError");

  let particleAnimId = null;
  let autoEnterTimer = null;
  let cursorBlink = null;

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* ---- Landing ---- */
  function initLanding() {
    initParticles();
    typewriterEffect("extract · preview · download", 60);
    enterBtn.addEventListener("click", enterApp);
    if (!reducedMotion) {
      autoEnterTimer = setTimeout(() => {
        if (!landing.classList.contains("exiting") && landing.style.display !== "none") enterApp();
      }, 5000);
    }
  }

  function enterApp() {
    if (landing.classList.contains("exiting")) return;
    if (autoEnterTimer) clearTimeout(autoEnterTimer);
    if (particleAnimId) cancelAnimationFrame(particleAnimId);
    if (cursorBlink) clearInterval(cursorBlink);
    landing.classList.add("exiting");
    setTimeout(() => {
      landing.style.display = "none";
      mainApp.classList.remove("hidden");
      void mainApp.offsetWidth;
      mainApp.classList.add("visible");
      setTimeout(() => urlInput && urlInput.focus(), 350);
    }, reducedMotion ? 0 : 800);
  }

  function typewriterEffect(text, speed) {
    let i = 0;
    tagline.textContent = "";
    if (reducedMotion) {
      tagline.textContent = text;
      return;
    }
    const tick = () => {
      if (i < text.length) {
        tagline.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      } else {
        const cur = document.createElement("span");
        cur.className = "cursor";
        tagline.appendChild(cur);
      }
    };
    setTimeout(tick, 200);
  }

  function initParticles() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -1000, y: -1000 };
    let particles = [];
    const COUNT = Math.min(150, Math.floor((window.innerWidth * window.innerHeight) / 10000));

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener("mouseleave", () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        size: Math.random() * 2.2 + 0.4,
        baseOp: Math.random() * 0.45 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let t = 0;
    function animate() {
      if (landing.classList.contains("exiting") || landing.style.display === "none") return;
      particleAnimId = requestAnimationFrame(animate);
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120;
          p.vx += (dx / dist) * force * 0.55;
          p.vy += (dy / dist) * force * 0.55;
        }
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        const op = p.baseOp * (0.7 + 0.3 * Math.sin(t * 2 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.14 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }
    animate();
  }

  /* ---- 3D tilt ---- */
  function init3DTilt() {
    if (reducedMotion) return;
    document.querySelectorAll(".card-3d").forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "1";
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotX = Math.max(-12, Math.min(12, ((cy - y) / cy) * 12));
        const rotY = Math.max(-12, Math.min(12, ((x - cx) / cx) * 12));
        card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform 0.5s ease";
        card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
        setTimeout(() => { card.style.transition = ""; }, 500);
      });
    });
  }

  /* ---- Toast ---- */
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
  }

  /* ---- Extract ---- */
  function setLoading(on) {
    extractBtn.querySelector(".btn-text").classList.toggle("hidden", on);
    extractBtn.querySelector(".btn-loader").classList.toggle("hidden", !on);
    extractBtn.disabled = on;
  }

  function buildMatrix() {
    dataMatrix.innerHTML = "";
    for (let c = 0; c < 3; c++) {
      const col = document.createElement("div");
      col.className = "matrix-col";
      for (let i = 0; i < 12; i++) {
        const s = document.createElement("span");
        s.style.height = 12 + Math.random() * 28 + "px";
        s.style.opacity = String(0.08 + Math.random() * 0.2);
        col.appendChild(s);
      }
      dataMatrix.appendChild(col);
    }
  }

  function particleBurst() {
    if (reducedMotion || !burstCanvas) return;
    const ctx = burstCanvas.getContext("2d");
    burstCanvas.width = window.innerWidth;
    burstCanvas.height = window.innerHeight;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dots = [];
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      const sp = 2.5 + Math.random() * 5;
      dots.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
    let frames = 0;
    function frame() {
      frames++;
      ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
      let alive = false;
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        d.life -= 0.03;
        if (d.life > 0) {
          alive = true;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,0,0,${d.life * 0.7})`;
          ctx.fill();
        }
      });
      if (alive && frames < 50) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
    }
    requestAnimationFrame(frame);
  }

  function showExtractOverlay(show) {
    if (show) {
      extractOverlay.classList.remove("hidden");
      extractOverlay.setAttribute("aria-hidden", "false");
      extractOverlay.classList.remove("scanning", "streaming");
      buildMatrix();
      void extractOverlay.offsetWidth;
      extractOverlay.classList.add("scanning", "streaming");
      if (!reducedMotion) inputCard.classList.add("deconstruct");
      statusText.textContent = "Connecting…";
    } else {
      extractOverlay.classList.remove("scanning", "streaming");
      extractOverlay.classList.add("hidden");
      extractOverlay.setAttribute("aria-hidden", "true");
      inputCard.classList.remove("deconstruct");
      inputCard.style.transform = "";
    }
  }

  async function handleExtract() {
    const url = urlInput.value.trim();
    if (!url || !/^https?:\/\/.+/i.test(url)) {
      showToast("Enter a valid URL starting with http:// or https://");
      urlInput.focus();
      return;
    }
    state.url = url;
    setLoading(true);
    showExtractOverlay(true);

    try {
      await delay(reducedMotion ? 0 : 400);
      statusText.textContent = "Fetching…";
      let rawHTML = "";
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) rawHTML = await res.text();
      } catch (_) {}

      if (!rawHTML) {
        statusText.textContent = "Trying proxy…";
        try {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          if (res.ok) rawHTML = await res.text();
        } catch (_) {
          throw new Error("CORS_BLOCKED");
        }
      }
      if (!rawHTML) throw new Error("EMPTY_RESPONSE");

      statusText.textContent = "Parsing…";
      await delay(reducedMotion ? 0 : 300);
      parseSourceCode(rawHTML, url);
      state.hasData = true;
      particleBurst();
      await delay(reducedMotion ? 0 : 250);
      showExtractOverlay(false);
      setLoading(false);
      showResults();
      showToast("Source code extracted successfully!");
    } catch (err) {
      showExtractOverlay(false);
      setLoading(false);
      if (err.message === "CORS_BLOCKED") {
        showToast("CORS blocked. Try a CORS extension or another URL.");
      } else {
        showToast("Failed to fetch. Check the URL and try again.");
      }
    }
  }

  extractBtn.addEventListener("click", handleExtract);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExtract();
    }
  });

  /* ---- Parse ---- */
  function resolveURL(rel, base) {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith("//")) return "https:" + rel;
    try { return new URL(rel, base).href; } catch { return rel; }
  }

  function formatBytes(str) {
    const bytes = new Blob([str || ""]).size;
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function countLines(str) {
    return Math.max((str || "").split("\n").length, 1);
  }

  function parseSourceCode(rawHTML, baseUrl) {
    state.html = rawHTML;

    const styles = rawHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    state.css = styles.map((m, i) => {
      const c = m.replace(/<\/?style[^>]*>/gi, "");
      return `/* Inline style block ${i + 1} */\n${c}`;
    }).join("\n\n") || "/* no inline stylesheets found */";

    const scripts = rawHTML.match(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    state.js = scripts.map((m, i) => {
      const c = m.replace(/<\/?script[^>]*>/gi, "");
      return `// Inline script ${i + 1}\n${c}`;
    }).join("\n\n") || "// no inline scripts found";

    state.resources = [];
    const title = rawHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title) state.resources.push({ type: "meta", url: "Title: " + title[1].trim().slice(0, 120) });

    (rawHTML.match(/<link[^>]*>/gi) || []).forEach((m) => {
      const href = (m.match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href) return;
      const rel = ((m.match(/rel=["']([^"']+)["']/i) || [])[1] || "").toLowerCase();
      const type = rel.includes("stylesheet") ? "css" : rel.includes("icon") ? "icon" : "link";
      state.resources.push({ type, url: resolveURL(href, baseUrl) });
    });
    (rawHTML.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi) || []).forEach((m) => {
      const src = (m.match(/src=["']([^"']+)["']/i) || [])[1];
      if (src) state.resources.push({ type: "js", url: resolveURL(src, baseUrl) });
    });
    (rawHTML.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi) || []).forEach((m) => {
      const src = (m.match(/src=["']([^"']+)["']/i) || [])[1];
      if (src) state.resources.push({ type: "img", url: resolveURL(src, baseUrl) });
    });
    const seen = new Set();
    (rawHTML.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) || []).forEach((m) => {
      const href = (m.match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      const abs = resolveURL(href, baseUrl);
      if (!abs.startsWith("http") || seen.has(abs)) return;
      seen.add(abs);
      state.resources.push({ type: "link", url: abs });
    });

    updatePanels();
  }

  /* ---- Highlight ---- */
  function escapeHTML(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightHTML(code) {
    let e = escapeHTML(code);
    e = e.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(&lt;\/?[a-zA-Z][\w\-]*)(.*?)(\/?&gt;)/g, (m, tag, attrs, end) => {
      const ha = attrs.replace(
        /([\w\-:]+)=(&quot;.*?&quot;|&#39;.*?&#39;|"[^"]*"|'[^']*')/g,
        '<span class="token-attr">$1</span>=<span class="token-string">$2</span>'
      );
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
    e = e.replace(
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|try|catch|throw|typeof|instanceof|in|of|break|continue|switch|case)\b/g,
      '<span class="token-keyword">$1</span>'
    );
    e = e.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="token-function">$1</span>(');
    e = e.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    return e;
  }

  function updateLineNumbers(codeId, lineId) {
    const text = document.getElementById(codeId).textContent || "";
    const lines = Math.max(text.split("\n").length, 1);
    document.getElementById(lineId).innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
  }

  function updatePanels() {
    const max = 350000;
    const trunc = (s, note) => (s.length > max ? s.slice(0, max) + "\n\n" + note : s);

    document.getElementById("htmlCode").innerHTML = highlightHTML(trunc(state.html, "/* … truncated … */"));
    document.getElementById("htmlFileSize").textContent = formatBytes(state.html);
    document.getElementById("htmlLines").textContent = countLines(state.html) + " lines";
    updateLineNumbers("htmlCode", "htmlLineNumbers");

    document.getElementById("cssCode").innerHTML = highlightCSS(trunc(state.css, "/* … truncated … */"));
    document.getElementById("cssFileSize").textContent = formatBytes(state.css);
    document.getElementById("cssLines").textContent = countLines(state.css) + " lines";
    updateLineNumbers("cssCode", "cssLineNumbers");

    document.getElementById("jsCode").innerHTML = highlightJS(trunc(state.js, "// … truncated …"));
    document.getElementById("jsFileSize").textContent = formatBytes(state.js);
    document.getElementById("jsLines").textContent = countLines(state.js) + " lines";
    updateLineNumbers("jsCode", "jsLineNumbers");

    const list = document.getElementById("resourceList");
    if (!state.resources.length) {
      list.innerHTML = '<li class="empty">No external resources found.</li>';
    } else {
      list.innerHTML = state.resources
        .map((r) => `<li><span class="res-type">${escapeHTML(r.type)}</span> ${escapeHTML(r.url)}</li>`)
        .join("");
    }
    document.getElementById("resourceCount").textContent = state.resources.length + " found";
  }

  function showResults() {
    emptyState.classList.add("hidden");
    actionBar.classList.remove("hidden");
    resultsSection.classList.remove("hidden");
    document.querySelectorAll(".tab-panel").forEach((p, i) => {
      p.classList.remove("fly-in");
      if (reducedMotion) return;
      setTimeout(() => {
        if (p.classList.contains("active") || !p.hidden) p.classList.add("fly-in");
      }, i * 150);
    });
    setTimeout(init3DTilt, 100);
  }

  /* ---- Tabs ---- */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => {
        const on = p.id === "panel-" + tab;
        p.classList.toggle("active", on);
        p.hidden = !on;
        if (on && !reducedMotion) {
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
    previewError.classList.add("hidden");
    previewLoader.classList.remove("hidden");
    let html = state.html;
    if (!/<base[\s>]/i.test(html)) {
      const base = `<base href="${state.url}">`;
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${base}`) : base + html;
    }
    previewFrame.onload = () => previewLoader.classList.add("hidden");
    previewFrame.onerror = () => {
      previewLoader.classList.add("hidden");
      previewError.classList.remove("hidden");
    };
    try {
      previewFrame.srcdoc = html;
    } catch {
      previewLoader.classList.add("hidden");
      previewError.classList.remove("hidden");
    }
    setTimeout(() => previewLoader.classList.add("hidden"), 5000);
  }

  /* ---- Copy / Download / Clear ---- */
  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const text = state[this.dataset.copy] || "";
      try {
        await navigator.clipboard.writeText(text);
        const orig = this.textContent;
        this.textContent = "Copied!";
        this.classList.add("copied");
        showToast("Copied to clipboard");
        setTimeout(() => {
          this.textContent = orig;
          this.classList.remove("copied");
        }, 2000);
      } catch {
        showToast("Copy failed");
      }
    });
  });

  function timestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content || ""], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll(".btn-download").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.hasData) return;
      const type = btn.dataset.type;
      const ts = timestamp();
      if (type === "all") {
        downloadFile(state.html, `sourcew-${ts}-source.html`, "text/html");
        setTimeout(() => downloadFile(state.css, `sourcew-${ts}-style.css`, "text/css"), 200);
        setTimeout(() => downloadFile(state.js, `sourcew-${ts}-script.js`, "application/javascript"), 400);
        showToast("Downloading all 3 files…");
      } else {
        const map = {
          html: [state.html, "text/html", "html"],
          css: [state.css, "text/css", "css"],
          js: [state.js, "application/javascript", "js"],
        };
        const [content, mime, ext] = map[type];
        downloadFile(content, `sourcew-${ts}-${type}.${ext}`, mime);
        showToast(`Downloading ${type.toUpperCase()}…`);
      }
    });
  });

  document.getElementById("clearBtn").addEventListener("click", clearAll);

  function clearAll() {
    if (!state.hasData) return;
    const panels = document.querySelectorAll(".tab-panel");
    if (!reducedMotion) {
      panels.forEach((p) => {
        p.style.transition = "opacity .3s ease, transform .3s ease";
        p.style.opacity = "0";
        p.style.transform = "translateZ(-200px) translateY(-20px)";
      });
    }
    setTimeout(() => {
      state.url = "";
      state.html = "";
      state.css = "";
      state.js = "";
      state.resources = [];
      state.hasData = false;
      urlInput.value = "";
      ["htmlCode", "cssCode", "jsCode"].forEach((id) => { document.getElementById(id).innerHTML = ""; });
      ["htmlLineNumbers", "cssLineNumbers", "jsLineNumbers"].forEach((id) => { document.getElementById(id).innerHTML = "1"; });
      document.getElementById("htmlFileSize").textContent = "0 B";
      document.getElementById("cssFileSize").textContent = "0 B";
      document.getElementById("jsFileSize").textContent = "0 B";
      document.getElementById("htmlLines").textContent = "0 lines";
      document.getElementById("cssLines").textContent = "0 lines";
      document.getElementById("jsLines").textContent = "0 lines";
      document.getElementById("resourceList").innerHTML = "";
      document.getElementById("resourceCount").textContent = "0 found";
      previewFrame.removeAttribute("srcdoc");
      actionBar.classList.add("hidden");
      resultsSection.classList.add("hidden");
      emptyState.classList.remove("hidden");
      panels.forEach((p) => {
        p.style.opacity = "";
        p.style.transform = "";
        p.style.transition = "";
        p.classList.remove("fly-in");
      });
      document.querySelectorAll(".tab-btn").forEach((b) => {
        const on = b.dataset.tab === "html";
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => {
        const on = p.id === "panel-html";
        p.classList.toggle("active", on);
        p.hidden = !on;
      });
      urlInput.focus();
      showToast("All content cleared");
    }, reducedMotion ? 0 : 300);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && landing.style.display !== "none" && !landing.classList.contains("exiting")) {
      e.preventDefault();
      enterApp();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    initLanding();
    init3DTilt();
  });
})();
