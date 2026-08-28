/* ==========================================================================
   SOURCE W — pure vanilla ES6+
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
  };

  const landing = document.getElementById("landing");
  const mainApp = document.getElementById("mainApp");
  const enterBtn = document.getElementById("enterBtn");
  const tagline = document.getElementById("tagline");
  const urlInput = document.getElementById("urlInput");
  const extractBtn = document.getElementById("extractBtn");
  const inputCard = document.getElementById("inputCard");
  const actionBar = document.getElementById("actionBar");
  const resultsSection = document.getElementById("resultsSection");
  const extractOverlay = document.getElementById("extractOverlay");
  const extractText = document.getElementById("extractText");
  const toastContainer = document.getElementById("toastContainer");
  const previewFrame = document.getElementById("previewFrame");
  const previewLoader = document.getElementById("previewLoader");

  /* ---------- Landing ---------- */
  function enterApp() {
    if (landing.classList.contains("exiting")) return;
    landing.classList.add("exiting");
    setTimeout(() => {
      landing.style.display = "none";
      mainApp.classList.remove("hidden");
      void mainApp.offsetWidth;
      mainApp.classList.add("visible");
      setTimeout(() => urlInput && urlInput.focus(), 400);
    }, reducedMotion ? 0 : 700);
  }

  enterBtn.addEventListener("click", enterApp);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && landing.style.display !== "none" && !landing.classList.contains("exiting")) {
      e.preventDefault();
      enterApp();
    }
  });

  function typewriterEffect(text, speed) {
    let i = 0;
    tagline.textContent = "";
    if (reducedMotion) {
      tagline.textContent = text;
      return;
    }
    const interval = setInterval(() => {
      tagline.textContent += text.charAt(i);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
  }

  /* ---------- Particles ---------- */
  let particleAnimId = null;
  function initParticles() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext("2d");
    let particles = [];
    const PARTICLE_COUNT = Math.min(120, Math.floor((window.innerWidth * window.innerHeight) / 12000));
    const mouse = { x: -1000, y: -1000 };

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

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    function animate() {
      particleAnimId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150;
          p.vx += (dx / dist) * force * 0.45;
          p.vy += (dy / dist) * force * 0.45;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }
    animate();
  }

  /* ---------- 3D tilt ---------- */
  function init3DTilt() {
    if (reducedMotion) return;
    document.querySelectorAll(".card-3d").forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "1";
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = Math.max(-12, Math.min(12, ((centerY - y) / centerY) * -10));
        const rotateY = Math.max(-12, Math.min(12, ((x - centerX) / centerX) * 10));
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transition = "transform 0.5s ease";
        card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
        setTimeout(() => {
          card.style.transition = "";
        }, 500);
      });
    });
  }

  /* ---------- Toast ---------- */
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  /* ---------- Extract ---------- */
  extractBtn.addEventListener("click", handleExtract);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExtract();
    }
  });

  function setLoading(isLoading) {
    extractBtn.querySelector(".btn-text").classList.toggle("hidden", isLoading);
    extractBtn.querySelector(".btn-loader").classList.toggle("hidden", !isLoading);
    extractBtn.disabled = isLoading;
  }

  function showExtractAnimation(show) {
    if (show) {
      extractOverlay.classList.remove("hidden");
      extractOverlay.setAttribute("aria-hidden", "false");
      extractOverlay.classList.remove("scanning", "streaming");
      void extractOverlay.offsetWidth;
      extractOverlay.classList.add("scanning", "streaming");
      if (!reducedMotion) inputCard.classList.add("deconstruct");
      extractText.textContent = "Extracting source code…";
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
      showToast("Please enter a valid URL starting with http:// or https://");
      urlInput.focus();
      return;
    }

    state.url = url;
    setLoading(true);
    showExtractAnimation(true);

    try {
      await delay(reducedMotion ? 0 : 500);
      extractText.textContent = "Fetching page…";

      let rawHTML = "";
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) rawHTML = await res.text();
      } catch (_) {}

      if (!rawHTML) {
        extractText.textContent = "Trying CORS proxy…";
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) rawHTML = await res.text();
        } catch (_) {
          throw new Error("CORS_BLOCKED");
        }
      }

      if (!rawHTML) throw new Error("EMPTY_RESPONSE");

      extractText.textContent = "Parsing HTML, CSS & scripts…";
      await delay(reducedMotion ? 0 : 350);
      parseSourceCode(rawHTML, url);
      state.hasData = true;

      showExtractAnimation(false);
      setLoading(false);
      showResults();
      showToast("Source code extracted successfully!");
    } catch (err) {
      showExtractAnimation(false);
      setLoading(false);
      if (err.message === "CORS_BLOCKED") {
        showToast("CORS blocked. Try a CORS extension or paste code manually.");
      } else {
        showToast("Failed to fetch. Check URL and try again.");
      }
    }
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* ---------- Parser ---------- */
  function parseSourceCode(rawHTML, baseUrl) {
    state.html = rawHTML;

    const styleMatches = rawHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    state.css = styleMatches
      .map((m, i) => {
        const content = m.replace(/<\/?style[^>]*>/gi, "");
        return `/* Inline style block ${i + 1} */\n${content}`;
      })
      .join("\n\n");

    const scriptMatches = rawHTML.match(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || [];
    state.js = scriptMatches
      .map((m, i) => {
        const content = m.replace(/<\/?script[^>]*>/gi, "");
        return `// Inline script ${i + 1}\n${content}`;
      })
      .join("\n\n");

    if (!state.css) state.css = "/* no inline stylesheets found */";
    if (!state.js) state.js = "// no inline scripts found";

    state.resources = [];

    const titleMatch = rawHTML.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      state.resources.push({ type: "meta", url: `Title: ${titleMatch[1].trim().slice(0, 120)}` });
    }

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
      if (seen.has(abs)) return;
      seen.add(abs);
      if (abs.startsWith("http")) state.resources.push({ type: "link", url: abs });
    });

    updatePanels();
  }

  function resolveURL(rel, base) {
    if (!rel) return "";
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith("//")) return "https:" + rel;
    try {
      return new URL(rel, base).href;
    } catch {
      return rel;
    }
  }

  function formatBytes(str) {
    const bytes = new Blob([str || ""]).size;
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  /* ---------- Highlight ---------- */
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
    e = e.replace(
      /([a-zA-Z\-]+)\s*:\s*([^;{}]+);/g,
      '<span class="token-property">$1</span>: <span class="token-value">$2</span>;'
    );
    return e;
  }

  function highlightJS(code) {
    let e = escapeHTML(code);
    e = e.replace(/(\/\/[^\n]*)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    e = e.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[^`]*`)/g, '<span class="token-string">$1</span>');
    e = e.replace(
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|try|catch|throw|typeof|instanceof|null|undefined|true|false)\b/g,
      '<span class="token-keyword">$1</span>'
    );
    e = e.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span class="token-function">$1</span>(');
    e = e.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token-number">$1</span>');
    return e;
  }

  /* ---------- Panels ---------- */
  function updatePanels() {
    const max = 350000;
    const htmlShow = state.html.length > max ? state.html.slice(0, max) + "\n\n/* … truncated for display … */" : state.html;
    const cssShow = state.css.length > max ? state.css.slice(0, max) + "\n\n/* … truncated … */" : state.css;
    const jsShow = state.js.length > max ? state.js.slice(0, max) + "\n\n// … truncated …" : state.js;

    document.getElementById("htmlCode").innerHTML = highlightHTML(htmlShow);
    document.getElementById("htmlFileSize").textContent = formatBytes(state.html);
    updateLineNumbers("htmlCode", "htmlLineNumbers");

    document.getElementById("cssCode").innerHTML = highlightCSS(cssShow);
    document.getElementById("cssFileSize").textContent = formatBytes(state.css);
    updateLineNumbers("cssCode", "cssLineNumbers");

    document.getElementById("jsCode").innerHTML = highlightJS(jsShow);
    document.getElementById("jsFileSize").textContent = formatBytes(state.js);
    updateLineNumbers("jsCode", "jsLineNumbers");

    const rList = document.getElementById("resourceList");
    if (!state.resources.length) {
      rList.innerHTML = '<li class="empty">No external resources found.</li>';
    } else {
      rList.innerHTML = state.resources
        .map((r) => `<li><span class="res-type">${escapeHTML(r.type)}</span> ${escapeHTML(r.url)}</li>`)
        .join("");
    }
    document.getElementById("resourceCount").textContent = `${state.resources.length} found`;
  }

  function updateLineNumbers(codeId, lineId) {
    const code = document.getElementById(codeId);
    const lines = Math.max((code.textContent || "").split("\n").length, 1);
    document.getElementById(lineId).innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join("<br>");
  }

  function showResults() {
    actionBar.classList.remove("hidden");
    resultsSection.classList.remove("hidden");

    document.querySelectorAll(".tab-panel").forEach((panel, i) => {
      panel.classList.remove("fly-in");
      if (reducedMotion) return;
      setTimeout(() => {
        if (panel.classList.contains("active") || !panel.hidden) {
          panel.classList.add("fly-in");
        }
      }, i * 120);
    });

    setTimeout(init3DTilt, 100);
  }

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => {
        const isActive = p.id === `panel-${tab}`;
        p.classList.toggle("active", isActive);
        p.hidden = !isActive;
        if (isActive && !reducedMotion) {
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
    previewLoader.classList.remove("hidden");
    let html = state.html;
    if (!/<base[\s>]/i.test(html)) {
      const base = `<base href="${state.url}">`;
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1>${base}`)
        : base + html;
    }
    previewFrame.onload = () => previewLoader.classList.add("hidden");
    previewFrame.onerror = () => previewLoader.classList.add("hidden");
    try {
      previewFrame.srcdoc = html;
    } catch {
      previewLoader.classList.add("hidden");
    }
    setTimeout(() => previewLoader.classList.add("hidden"), 4000);
  }

  /* ---------- Copy ---------- */
  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const key = this.dataset.copy;
      const text = state[key] || "";
      try {
        await navigator.clipboard.writeText(text);
        const original = this.textContent;
        this.textContent = "Copied!";
        this.classList.add("copied");
        showToast("Copied to clipboard");
        setTimeout(() => {
          this.textContent = original;
          this.classList.remove("copied");
        }, 2000);
      } catch {
        showToast("Copy failed");
      }
    });
  });

  /* ---------- Download ---------- */
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
        const content = type === "html" ? state.html : type === "css" ? state.css : state.js;
        const mime = type === "html" ? "text/html" : type === "css" ? "text/css" : "application/javascript";
        const ext = type === "html" ? "html" : type === "css" ? "css" : "js";
        downloadFile(content, `sourcew-${ts}-${type}.${ext}`, mime);
        showToast(`Downloading ${type.toUpperCase()}…`);
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

  /* ---------- Clear ---------- */
  document.getElementById("clearBtn").addEventListener("click", clearAll);

  function clearAll() {
    if (!state.hasData) return;
    const panels = document.querySelectorAll(".tab-panel");
    if (!reducedMotion) {
      panels.forEach((p) => {
        p.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        p.style.opacity = "0";
        p.style.transform = "translateZ(-200px) translateY(-16px)";
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
      document.getElementById("htmlCode").innerHTML = "";
      document.getElementById("cssCode").innerHTML = "";
      document.getElementById("jsCode").innerHTML = "";
      document.getElementById("resourceList").innerHTML = "";
      document.getElementById("htmlLineNumbers").innerHTML = "1";
      document.getElementById("cssLineNumbers").innerHTML = "1";
      document.getElementById("jsLineNumbers").innerHTML = "1";
      document.getElementById("htmlFileSize").textContent = "0 KB";
      document.getElementById("cssFileSize").textContent = "0 KB";
      document.getElementById("jsFileSize").textContent = "0 KB";
      document.getElementById("resourceCount").textContent = "0 found";
      previewFrame.removeAttribute("srcdoc");

      actionBar.classList.add("hidden");
      resultsSection.classList.add("hidden");

      panels.forEach((p) => {
        p.style.opacity = "";
        p.style.transform = "";
        p.style.transition = "";
        p.classList.remove("fly-in");
      });

      // reset to HTML tab
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

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    typewriterEffect("extract · preview · download", 45);
    init3DTilt();
  });
})();
