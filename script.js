/* ==========================================================================
   SOURCE W — application logic
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     STATE
     --------------------------------------------------------------------- */
  let state = null; // { html, css, js, resources, url }
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     ELEMENTS
     --------------------------------------------------------------------- */
  const landing = document.getElementById("landing");
  const enterBtn = document.getElementById("enterBtn");
  const app = document.getElementById("app");
  const canvas = document.getElementById("particle-canvas");

  const extractForm = document.getElementById("extractForm");
  const urlInput = document.getElementById("urlInput");
  const extractBtn = document.getElementById("extractBtn");
  const scannerOverlay = document.getElementById("scannerOverlay");

  const actionBar = document.getElementById("actionBar");
  const dlHtmlBtn = document.getElementById("dlHtml");
  const dlCssBtn = document.getElementById("dlCss");
  const dlJsBtn = document.getElementById("dlJs");
  const dlAllBtn = document.getElementById("dlAll");
  const clearBtn = document.getElementById("clearAll");

  const emptyState = document.getElementById("emptyState");
  const resultsSection = document.getElementById("results");

  const toastContainer = document.getElementById("toastContainer");

  const codeHtmlEl = document.getElementById("code-html");
  const codeCssEl = document.getElementById("code-css");
  const codeJsEl = document.getElementById("code-js");
  const resourceList = document.getElementById("resourceList");

  const previewFrame = document.getElementById("previewFrame");
  const previewSpinner = document.getElementById("previewSpinner");
  const previewError = document.getElementById("previewError");

  /* =======================================================================
     LANDING SEQUENCE
     ======================================================================= */

  function enterApp() {
    if (landing.classList.contains("exit")) return;
    landing.classList.add("exit");
    landing.setAttribute("aria-hidden", "true");
    app.removeAttribute("aria-hidden");
    app.classList.add("visible");
    setTimeout(() => {
      landing.style.display = "none";
      urlInput.focus();
    }, reducedMotion ? 0 : 900);
  }

  enterBtn.addEventListener("click", enterApp);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !landing.classList.contains("exit")) {
      enterApp();
    }
  });

  if (!reducedMotion) {
    setTimeout(enterApp, 9000); // gentle auto-advance safety net, well after the sequence finishes
  }

  /* =======================================================================
     PARTICLE SYSTEM (Canvas 2D, monochrome)
     ======================================================================= */

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animId = null;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initParticles() {
    resizeCanvas();
    const count = window.innerWidth < 640 ? 34 : 70;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random(), // depth 0..1, affects size + opacity
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }));
  }

  function stepParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    }

    // connective lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // dots
    for (const p of particles) {
      const radius = 0.6 + p.z * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${200 + p.z * 55}, ${200 + p.z * 55}, ${200 + p.z * 55}, ${0.25 + p.z * 0.5})`;
      ctx.fill();
    }

    animId = requestAnimationFrame(stepParticles);
  }

  function startParticles() {
    initParticles();
    if (!reducedMotion) {
      animId = requestAnimationFrame(stepParticles);
    } else {
      stepParticles(); // draw a single static frame
      cancelAnimationFrame(animId);
    }
  }

  window.addEventListener("resize", () => {
    if (landing.style.display !== "none") initParticles();
  });

  document.addEventListener("DOMContentLoaded", startParticles);
  // In case DOMContentLoaded already fired by the time this script runs:
  if (document.readyState !== "loading") startParticles();

  /* =======================================================================
     3D MOUSE TRACKING FOR CARDS
     ======================================================================= */

  function attachTilt(el) {
    let raf = null;
    const maxTilt = 8;

    el.addEventListener("mousemove", (e) => {
      if (reducedMotion) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rotateY = px * maxTilt * 2;
        const rotateX = -py * maxTilt * 2;
        el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
      });
    });

    el.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "rotateX(2deg) rotateY(0deg)";
    });
  }

  function attachTiltToAllCards() {
    document.querySelectorAll(".card-3d").forEach(attachTilt);
  }
  attachTiltToAllCards();

  /* =======================================================================
     3D TOUCH BUTTON — RIPPLE FEEDBACK
     ======================================================================= */

  function attachRipple(btn) {
    btn.addEventListener("click", (e) => {
      if (btn.disabled) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 1.4;
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }
  document.querySelectorAll(".btn-3d").forEach(attachRipple);

  /* =======================================================================
     TOASTS
     ======================================================================= */

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 320);
    }, 2400);
  }

  /* =======================================================================
     URL SUBMISSION + EXTRACTION
     ======================================================================= */

  function isValidUrl(value) {
    return /^https?:\/\/.+/i.test(value.trim());
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
    if (e.key === "Enter" && e.ctrlKey) {
      extractForm.requestSubmit();
    }
  });

  async function runExtraction(url) {
    setExtractLoading(true);
    scannerOverlay.classList.add("active");

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const rawHtml = await response.text();

      const parsed = parseSource(rawHtml, url);
      state = { ...parsed, url };

      populateResults(state);
      revealResults();
      showToast("Source extracted");
    } catch (err) {
      console.error(err);
      showToast("Couldn't fetch that URL — likely blocked by CORS. Try a CORS proxy or run it from a local server.");
    } finally {
      setExtractLoading(false);
      scannerOverlay.classList.remove("active");
    }
  }

  function setExtractLoading(isLoading) {
    extractBtn.classList.toggle("is-loading", isLoading);
    extractBtn.disabled = isLoading;
  }

  /* =======================================================================
     PARSING
     ======================================================================= */

  function parseSource(rawHtml, baseUrl) {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");

    // CSS: combine all <style> tag contents
    const css = Array.from(doc.querySelectorAll("style"))
      .map((s) => s.textContent)
      .join("\n\n");

    // JS: combine all inline <script> tag contents (skip external ones)
    const js = Array.from(doc.querySelectorAll("script"))
      .filter((s) => !s.src)
      .map((s) => s.textContent)
      .join("\n\n");

    // Resources: external references
    const resources = [];
    const addRes = (type, url) => {
      if (url) resources.push({ type, url });
    };
    doc.querySelectorAll("link[href]").forEach((el) => addRes(el.rel || "link", el.getAttribute("href")));
    doc.querySelectorAll("script[src]").forEach((el) => addRes("script", el.getAttribute("src")));
    doc.querySelectorAll("img[src]").forEach((el) => addRes("img", el.getAttribute("src")));
    doc.querySelectorAll("a[href]").forEach((el) => addRes("a", el.getAttribute("href")));

    return { html: rawHtml, css, js, resources };
  }

  /* =======================================================================
     SYNTAX HIGHLIGHTING (vanilla, monochrome)
     ======================================================================= */

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlightHTML(code) {
    let escaped = escapeHtml(code);
    // comments
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tk-comment">$1</span>');
    // tags + attributes
    escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9-]+)([^&]*?)(\/?&gt;)/g, (match, open, attrs, close) => {
      const attrHtml = attrs.replace(
        /([a-zA-Z-:]+)(=)("[^"]*"|'[^']*')/g,
        '<span class="tk-attr">$1</span>$2<span class="tk-string">$3</span>'
      );
      return `<span class="tk-tag">${open}</span>${attrHtml}<span class="tk-tag">${close}</span>`;
    });
    return escaped;
  }

  function highlightCSS(code) {
    let escaped = escapeHtml(code);
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tk-comment">$1</span>');
    escaped = escaped.replace(/([.#]?[a-zA-Z0-9_-]+)(\s*\{)/g, '<span class="tk-selector">$1</span>$2');
    escaped = escaped.replace(
      /([a-zA-Z-]+)(\s*:\s*)([^;{}\n]+)(;?)/g,
      '<span class="tk-property">$1</span>$2<span class="tk-value">$3</span>$4'
    );
    return escaped;
  }

  const JS_KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|extends|new|this|import|export|default|from|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|void|yield|static|get|set)\b/g;

  function highlightJS(code) {
    let escaped = escapeHtml(code);
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="tk-comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tk-comment">$1</span>');
    escaped = escaped.replace(/(&#39;[^&]*?&#39;|"[^"]*?"|`[^`]*?`)/g, '<span class="tk-string">$1</span>');
    escaped = escaped.replace(JS_KEYWORDS, '<span class="tk-keyword">$1</span>');
    escaped = escaped.replace(/\b([a-zA-Z_$][\w$]*)(?=\()/g, '<span class="tk-func">$1</span>');
    escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tk-number">$1</span>');
    return escaped;
  }

  /* =======================================================================
     RENDER RESULTS
     ======================================================================= */

  function populateResults(s) {
    codeHtmlEl.innerHTML = s.html ? highlightHTML(s.html) : "";
    codeCssEl.innerHTML = s.css ? highlightCSS(s.css) : "/* no <style> blocks found */";
    codeJsEl.innerHTML = s.js ? highlightJS(s.js) : "// no inline scripts found";

    resourceList.innerHTML = "";
    if (!s.resources.length) {
      resourceList.innerHTML = '<li class="resource-empty">No external resources found.</li>';
    } else {
      s.resources.forEach((r) => {
        const li = document.createElement("li");
        const typeSpan = document.createElement("span");
        typeSpan.className = "res-type";
        typeSpan.textContent = r.type;
        const urlSpan = document.createElement("span");
        urlSpan.className = "res-url";
        urlSpan.textContent = r.url;
        li.appendChild(typeSpan);
        li.appendChild(urlSpan);
        resourceList.appendChild(li);
      });
    }

    // reset preview until the tab is opened
    previewFrame.removeAttribute("srcdoc");
    previewError.hidden = true;
  }

  function revealResults() {
    emptyState.hidden = true;
    resultsSection.hidden = false;
    actionBar.querySelectorAll(".btn-3d").forEach((b) => (b.disabled = false));

    // staggered fly-in for the active panel; re-trigger animation
    const activePanel = document.querySelector(".panel.active");
    if (activePanel) {
      activePanel.style.animation = "none";
      // force reflow
      void activePanel.offsetWidth;
      activePanel.style.animation = "";
    }
  }

  /* =======================================================================
     TAB SWITCHING
     ======================================================================= */

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

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
      }
    });

    if (name === "preview" && state) {
      renderPreview();
    }
  }

  function renderPreview() {
    if (!state || !state.html) {
      previewError.hidden = false;
      return;
    }
    previewError.hidden = true;
    previewSpinner.classList.add("active");

    let htmlWithBase = state.html;
    if (!/<base[\s>]/i.test(htmlWithBase)) {
      const baseTag = `<base href="${state.url}">`;
      if (/<head[^>]*>/i.test(htmlWithBase)) {
        htmlWithBase = htmlWithBase.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
      } else {
        htmlWithBase = baseTag + htmlWithBase;
      }
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
     COPY TO CLIPBOARD
     ======================================================================= */

  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!state) return;
      const key = btn.dataset.copy;
      const text = state[key] || "";
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = "Copied!";
        showToast("Copied to clipboard!");
        setTimeout(() => (btn.textContent = original), 1200);
      } catch (err) {
        showToast("Couldn't copy — your browser blocked clipboard access.");
      }
    });
  });

  /* =======================================================================
     DOWNLOADS
     ======================================================================= */

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
    if (!state) return;
    createDownloadFile(state.html, `sourcew-${timestamp()}-source.html`, "text/html");
  }
  function downloadCSS() {
    if (!state) return;
    createDownloadFile(state.css, `sourcew-${timestamp()}-style.css`, "text/css");
  }
  function downloadJS() {
    if (!state) return;
    createDownloadFile(state.js, `sourcew-${timestamp()}-script.js`, "application/javascript");
  }

  dlHtmlBtn.addEventListener("click", () => {
    downloadHTML();
    showToast("Download started");
  });
  dlCssBtn.addEventListener("click", () => {
    downloadCSS();
    showToast("Download started");
  });
  dlJsBtn.addEventListener("click", () => {
    downloadJS();
    showToast("Download started");
  });
  dlAllBtn.addEventListener("click", () => {
    if (!state) return;
    downloadHTML();
    setTimeout(downloadCSS, 200);
    setTimeout(downloadJS, 400);
    showToast("3 files downloaded");
  });

  /* =======================================================================
     CLEAR ALL
     ======================================================================= */

  clearBtn.addEventListener("click", () => {
    if (!state) return;

    const panels = document.querySelectorAll(".panel");
    if (!reducedMotion) {
      panels.forEach((p) => {
        p.style.transition = "opacity .3s var(--ease), transform .3s var(--ease)";
        p.style.opacity = "0";
        p.style.transform = "translateY(-20px)";
      });
    }

    const finish = () => {
      codeHtmlEl.innerHTML = "";
      codeCssEl.innerHTML = "";
      codeJsEl.innerHTML = "";
      resourceList.innerHTML = "";
      previewFrame.removeAttribute("srcdoc");
      previewFrame.onload = null;

      urlInput.value = "";
      urlInput.focus();

      state = null;
      resultsSection.hidden = true;
      emptyState.hidden = false;

      actionBar.querySelectorAll(".btn-3d").forEach((b) => (b.disabled = true));

      panels.forEach((p) => {
        p.style.transition = "";
        p.style.opacity = "";
        p.style.transform = "";
      });

      switchTab("html");

      const original = clearBtn.textContent;
      clearBtn.textContent = "Cleared!";
      setTimeout(() => (clearBtn.textContent = original), 1000);

      showToast("All content cleared");
    };

    if (reducedMotion) {
      finish();
    } else {
      setTimeout(finish, 300);
    }
  });

})();
