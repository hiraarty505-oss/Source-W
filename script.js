/* ==========================================================================
   SOURCE W — application logic
   ========================================================================== */

(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let state = null; // { html, css, js, tree, url }

  /* =======================================================================
     NAV — hamburger + smooth scroll CTAs
     ======================================================================= */

  const nav = document.getElementById("nav");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  hamburger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("menu-open");
    hamburger.classList.toggle("open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("menu-open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
    })
  );

  function scrollToExtract() {
    document.getElementById("extract").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    setTimeout(() => document.getElementById("urlInput").focus(), reducedMotion ? 0 : 500);
  }
  document.getElementById("navExtractBtn").addEventListener("click", scrollToExtract);
  document.getElementById("heroExtractBtn").addEventListener("click", scrollToExtract);
  document.getElementById("scrollCue").addEventListener("click", scrollToExtract);

  /* =======================================================================
     THREE.JS — HERO SCENE
     ======================================================================= */

  const heroCanvas = document.getElementById("hero-canvas");
  let heroRenderer, heroScene, heroCamera, heroShapes = [], heroParticles;
  let mouseX = 0, mouseY = 0;

  function initHeroScene() {
    heroRenderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true });
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    heroRenderer.setSize(window.innerWidth, window.innerHeight);

    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    heroCamera.position.z = 9;

    const colors = [0x8b5cf6, 0x6366f1, 0x22d3ee];
    const geos = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.TorusGeometry(0.7, 0.24, 8, 24),
      new THREE.TetrahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(0.6, 0),
    ];

    for (let i = 0; i < geos.length; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geos[i], material);
      const angle = (i / geos.length) * Math.PI * 2;
      const radius = 3.6;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.5, (Math.random() - 0.5) * 3);
      mesh.userData.spin = { x: (Math.random() - 0.5) * 0.004, y: (Math.random() - 0.5) * 0.006 };
      mesh.userData.floatOffset = Math.random() * Math.PI * 2;
      heroScene.add(mesh);
      heroShapes.push(mesh);
    }

    // particle field
    const particleCount = window.innerWidth < 640 ? 250 : 600;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.5 });
    heroParticles = new THREE.Points(particleGeo, particleMat);
    heroScene.add(heroParticles);

    window.addEventListener("mousemove", (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener("resize", onHeroResize);
    animateHero();
  }

  function onHeroResize() {
    heroCamera.aspect = window.innerWidth / window.innerHeight;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  const clock = new THREE.Clock();
  function animateHero() {
    requestAnimationFrame(animateHero);
    const t = clock.getElapsedTime();

    heroShapes.forEach((mesh) => {
      mesh.rotation.x += mesh.userData.spin.x;
      mesh.rotation.y += mesh.userData.spin.y;
      mesh.position.y += Math.sin(t * 0.6 + mesh.userData.floatOffset) * 0.0015;
    });

    heroParticles.rotation.y = t * 0.02;

    // parallax: camera eases toward mouse position
    heroCamera.position.x += (mouseX * 1.2 - heroCamera.position.x) * 0.03;
    heroCamera.position.y += (-mouseY * 0.8 - heroCamera.position.y) * 0.03;
    heroCamera.lookAt(0, 0, 0);

    heroRenderer.render(heroScene, heroCamera);
  }

  if (window.THREE) initHeroScene();

  /* =======================================================================
     THREE.JS — MODAL 3D PREVIEW (drag to rotate)
     ======================================================================= */

  const modal = document.getElementById("previewModal");
  const modalCanvas = document.getElementById("modal-canvas");
  const modalClose = document.getElementById("modalClose");
  const modalBackdrop = document.getElementById("modalBackdrop");
  let modalRenderer, modalScene, modalCamera, modalGroup, modalAnimId;
  let isDragging = false, lastX = 0, lastY = 0;

  function initModalScene() {
    if (modalRenderer) return; // already built

    modalRenderer = new THREE.WebGLRenderer({ canvas: modalCanvas, antialias: true, alpha: true });
    modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    modalScene = new THREE.Scene();
    modalCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    modalCamera.position.z = 5;

    modalGroup = new THREE.Group();
    const colors = [0x8b5cf6, 0x6366f1, 0x22d3ee];
    const geos = [
      new THREE.TorusKnotGeometry(0.9, 0.28, 100, 16),
      new THREE.IcosahedronGeometry(1.7, 0),
    ];
    geos.forEach((geo, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i], wireframe: true, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      modalGroup.add(mesh);
    });
    modalScene.add(modalGroup);

    resizeModalCanvas();

    const startDrag = (x, y) => { isDragging = true; lastX = x; lastY = y; };
    const moveDrag = (x, y) => {
      if (!isDragging) return;
      modalGroup.rotation.y += (x - lastX) * 0.008;
      modalGroup.rotation.x += (y - lastY) * 0.008;
      lastX = x; lastY = y;
    };
    const endDrag = () => { isDragging = false; };

    modalCanvas.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);
    modalCanvas.addEventListener("touchstart", (e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: true });
    modalCanvas.addEventListener("touchmove", (e) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }, { passive: true });
    modalCanvas.addEventListener("touchend", endDrag);

    animateModal();
  }

  function resizeModalCanvas() {
    const rect = modalCanvas.parentElement.getBoundingClientRect();
    modalCamera.aspect = rect.width / rect.height;
    modalCamera.updateProjectionMatrix();
    modalRenderer.setSize(rect.width, rect.height);
  }

  function animateModal() {
    modalAnimId = requestAnimationFrame(animateModal);
    if (!isDragging && !reducedMotion) {
      modalGroup.rotation.y += 0.003;
    }
    modalRenderer.render(modalScene, modalCamera);
  }

  function openModal() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    if (window.THREE) {
      initModalScene();
      requestAnimationFrame(resizeModalCanvas);
    }
  }
  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  document.getElementById("preview3dBtn").addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  window.addEventListener("resize", () => { if (modalRenderer) resizeModalCanvas(); });

  /* =======================================================================
     GSAP SCROLL REVEALS (falls back to IntersectionObserver)
     ======================================================================= */

  const revealEls = document.querySelectorAll(".reveal");
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    revealEls.forEach((el) => {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* =======================================================================
     BUTTON RIPPLE
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
      btn.style.position = btn.style.position || "relative";
      btn.style.overflow = "hidden";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  }
  document.querySelectorAll(".btn-glow, .btn-chip").forEach(attachRipple);

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
     URL VALIDATION
     ======================================================================= */

  const urlInput = document.getElementById("urlInput");
  const urlCheck = document.getElementById("urlCheck");

  function isValidUrl(value) {
    return /^https?:\/\/.+\..+/i.test(value.trim());
  }
  urlInput.addEventListener("input", () => {
    urlCheck.classList.toggle("visible", isValidUrl(urlInput.value));
  });

  /* =======================================================================
     EXTRACTION
     ======================================================================= */

  const extractForm = document.getElementById("extractForm");
  const extractBtn = document.getElementById("extractBtn");
  const progressPanel = document.getElementById("progressPanel");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");

  const actionBar = document.getElementById("actionBar");
  const dlHtmlBtn = document.getElementById("dlHtml");
  const dlCssBtn = document.getElementById("dlCss");
  const dlJsBtn = document.getElementById("dlJs");
  const dlAllBtn = document.getElementById("dlAll");
  const clearBtn = document.getElementById("clearAll");

  const emptyState = document.getElementById("emptyState");
  const resultsPanel = document.getElementById("resultsPanel");

  const codeHtmlEl = document.getElementById("code-html");
  const codeCssEl = document.getElementById("code-css");
  const codeJsEl = document.getElementById("code-js");
  const fileTreeEl = document.getElementById("fileTree");

  const previewFrame = document.getElementById("previewFrame");
  const previewSpinner = document.getElementById("previewSpinner");
  const previewError = document.getElementById("previewError");

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

  function setProgress(pct, label) {
    progressPanel.hidden = false;
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = label;
  }

  async function runExtraction(url) {
    extractBtn.classList.add("is-loading");
    extractBtn.disabled = true;
    setProgress(8, "Fetching page…");

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const rawHtml = await response.text();

      setProgress(35, "Parsing HTML, CSS & inline scripts…");
      const doc = new DOMParser().parseFromString(rawHtml, "text/html");

      const inlineCss = Array.from(doc.querySelectorAll("style")).map((s) => s.textContent).join("\n\n");
      const inlineJs = Array.from(doc.querySelectorAll("script")).filter((s) => !s.src).map((s) => s.textContent).join("\n\n");

      const linkedCssEls = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));
      const linkedJsEls = Array.from(doc.querySelectorAll("script[src]"));
      const otherAssets = [];
      doc.querySelectorAll("img[src]").forEach((el) => otherAssets.push({ type: "img", url: el.getAttribute("src") }));
      doc.querySelectorAll('link[rel*="icon"][href]').forEach((el) => otherAssets.push({ type: "icon", url: el.getAttribute("href") }));
      doc.querySelectorAll("source[src], video[src]").forEach((el) => otherAssets.push({ type: "media", url: el.getAttribute("src") }));
      doc.querySelectorAll('link[rel="preload"][as="font"][href], link[href$=".woff2"], link[href$=".woff"]').forEach((el) =>
        otherAssets.push({ type: "font", url: el.getAttribute("href") })
      );

      const tree = [];
      tree.push({ type: "html", url: url, status: "ok" });

      let fetchedCss = inlineCss;
      let fetchedJs = inlineJs;

      const linkedFiles = [
        ...linkedCssEls.map((el) => ({ kind: "css", url: resolveUrl(el.getAttribute("href"), url) })),
        ...linkedJsEls.map((el) => ({ kind: "js", url: resolveUrl(el.getAttribute("src"), url) })),
      ];

      const total = linkedFiles.length || 1;
      let done = 0;

      for (const file of linkedFiles) {
        setProgress(40 + Math.round((done / total) * 45), `Fetching linked assets… (${done + 1}/${total})`);
        try {
          const res = await fetch(file.url, { mode: "cors" });
          if (!res.ok) throw new Error(String(res.status));
          const text = await res.text();
          if (file.kind === "css") fetchedCss += `\n\n/* ${file.url} */\n${text}`;
          else fetchedJs += `\n\n// ${file.url}\n${text}`;
          tree.push({ type: file.kind, url: file.url, status: "ok" });
        } catch (err) {
          tree.push({ type: file.kind, url: file.url, status: "fail" });
        }
        done++;
      }

      otherAssets.forEach((a) => tree.push({ type: a.type, url: resolveUrl(a.url, url), status: "listed" }));

      setProgress(95, "Building file tree & preview…");
      state = { html: rawHtml, css: fetchedCss, js: fetchedJs, tree, url };

      populateResults(state);
      revealResults();
      setProgress(100, "Done");
      showToast("Source extracted");
    } catch (err) {
      console.error(err);
      showToast("Couldn't fetch that URL — likely blocked by CORS. Try a CORS proxy or run it from a local server.");
    } finally {
      extractBtn.classList.remove("is-loading");
      extractBtn.disabled = false;
      setTimeout(() => { progressPanel.hidden = true; progressFill.style.width = "0%"; }, 900);
    }
  }

  function resolveUrl(href, base) {
    try { return new URL(href, base).href; } catch (e) { return href; }
  }

  /* =======================================================================
     SYNTAX HIGHLIGHTING (vanilla, monochrome-agnostic — themed via CSS)
     ======================================================================= */

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightHTML(code) {
    let escaped = escapeHtml(code);
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tk-comment">$1</span>');
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
    codeCssEl.innerHTML = s.css ? highlightCSS(s.css) : "/* no stylesheets found */";
    codeJsEl.innerHTML = s.js ? highlightJS(s.js) : "// no scripts found";

    fileTreeEl.innerHTML = "";
    if (!s.tree.length) {
      fileTreeEl.innerHTML = '<li class="tree-empty">No assets found.</li>';
    } else {
      s.tree.forEach((item) => {
        const li = document.createElement("li");
        const typeSpan = document.createElement("span");
        typeSpan.className = "tree-type";
        typeSpan.textContent = item.type;
        const statusSpan = document.createElement("span");
        statusSpan.className = `tree-status ${item.status === "ok" ? "ok" : item.status === "fail" ? "fail" : ""}`;
        statusSpan.textContent = item.status === "ok" ? "fetched" : item.status === "fail" ? "blocked" : "linked";
        const urlSpan = document.createElement("span");
        urlSpan.className = "tree-url";
        urlSpan.textContent = item.url;
        li.appendChild(typeSpan);
        li.appendChild(statusSpan);
        li.appendChild(urlSpan);
        fileTreeEl.appendChild(li);
      });
    }

    previewFrame.removeAttribute("srcdoc");
    previewError.hidden = true;
  }

  function revealResults() {
    emptyState.hidden = true;
    resultsPanel.hidden = false;
    actionBar.querySelectorAll("button").forEach((b) => (b.disabled = false));
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
      }
    });
    if (name === "preview" && state) renderPreview();
  }

  function renderPreview() {
    if (!state || !state.html) { previewError.hidden = false; return; }
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
    previewFrame.onerror = () => { previewSpinner.classList.remove("active"); previewError.hidden = false; };

    try {
      previewFrame.srcdoc = htmlWithBase;
    } catch (err) {
      previewSpinner.classList.remove("active");
      previewError.hidden = false;
    }
  }

  /* =======================================================================
     COPY
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

  function downloadHTML() { if (state) createDownloadFile(state.html, `sourcew-${timestamp()}-source.html`, "text/html"); }
  function downloadCSS() { if (state) createDownloadFile(state.css, `sourcew-${timestamp()}-style.css`, "text/css"); }
  function downloadJS() { if (state) createDownloadFile(state.js, `sourcew-${timestamp()}-script.js`, "application/javascript"); }

  dlHtmlBtn.addEventListener("click", () => { downloadHTML(); showToast("Download started"); });
  dlCssBtn.addEventListener("click", () => { downloadCSS(); showToast("Download started"); });
  dlJsBtn.addEventListener("click", () => { downloadJS(); showToast("Download started"); });
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
        p.style.transform = "translateY(-16px)";
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
      urlCheck.classList.remove("visible");
      urlInput.focus();

      state = null;
      resultsPanel.hidden = true;
      emptyState.hidden = false;

      actionBar.querySelectorAll("button").forEach((b) => (b.disabled = true));

      panels.forEach((p) => { p.style.transition = ""; p.style.opacity = ""; p.style.transform = ""; });
      switchTab("html");

      const original = clearBtn.textContent;
      clearBtn.textContent = "Cleared!";
      setTimeout(() => (clearBtn.textContent = original), 1000);
      showToast("All content cleared");
    };
    reducedMotion ? finish() : setTimeout(finish, 300);
  });

})();
