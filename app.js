/**
 * Source Code W
 * Vanilla JS + Three.js landing + GSAP timelines
 */

(function () {
  "use strict";

  // ---------- State ----------
  const state = {
    sourceHtml: "",
    sourceCss: "",
    sourceJs: "",
    raw: "",
    meta: { size: 0, lines: 0, time: 0, type: "" },
    currentTab: "html",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    isMobile: window.matchMedia("(max-width: 768px)").matches,
  };

  // ---------- DOM ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const landing = $("#landing");
  const landingCanvas = $("#landing-canvas");
  const landingTitle = $("#landing-title");
  const landingTagline = $("#landing-tagline");
  const skipBtn = $("#skip-landing");
  const app = $("#app");
  const mainCard = $("#main-card");
  const urlForm = $("#url-form");
  const urlInput = $("#url-input");
  const inputSlot = $("#input-slot");
  const retrieveBtn = $("#retrieve-btn");
  const errorBox = $("#error-box");
  const errorMessage = $("#error-message");
  const retryBtn = $("#retry-btn");
  const metaBar = $("#meta-bar");
  const transferOverlay = $("#transfer-overlay");
  const resultsPanel = $("#results-panel");
  const codeContent = $("#code-content");
  const codeSearch = $("#code-search");
  const copyBtn = $("#copy-btn");
  const closeResults = $("#close-results");
  const prettyPrint = $("#pretty-print");
  const splitView = $("#split-view");
  const splitPreview = $("#split-preview");
  const previewIframe = $("#preview-iframe");
  const fileSidebar = $("#file-sidebar");
  const fileTree = $("#file-tree");
  const minimap = $("#minimap");
  const bgParticles = $("#bg-particles");

  // ---------- CORS Proxies (fallback chain) ----------
  const PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  // ---------- 3D Button helpers ----------
  function setupBtn3d(btn) {
    if (!btn) return;
    btn.addEventListener("pointerdown", (e) => {
      btn.classList.add("pressed");
      const rect = btn.getBoundingClientRect();
      const ripple = btn.querySelector(".btn-ripple") || document.createElement("span");
      if (!btn.querySelector(".btn-ripple")) {
        ripple.className = "btn-ripple";
        btn.appendChild(ripple);
      }
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.classList.remove("rippling");
      void btn.offsetWidth;
      btn.classList.add("rippling");
    });
    btn.addEventListener("pointerup", () => btn.classList.remove("pressed"));
    btn.addEventListener("pointerleave", () => btn.classList.remove("pressed"));
  }

  $$(".btn-3d").forEach(setupBtn3d);

  // ---------- Parallax tilt on main card ----------
  function initParallax() {
    if (state.isMobile || state.reducedMotion) return;
    const maxTilt = 6;
    document.addEventListener("mousemove", (e) => {
      if (!mainCard || resultsPanel.classList.contains("open")) return;
      const rect = mainCard.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotY = Math.max(-maxTilt, Math.min(maxTilt, dx * maxTilt));
      const rotX = Math.max(-maxTilt, Math.min(maxTilt, -dy * maxTilt));
      mainCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });
    mainCard?.addEventListener("mouseleave", () => {
      mainCard.style.transform = "rotateX(0) rotateY(0)";
    });
  }

  // ---------- Background floating symbols ----------
  function spawnParticles() {
    if (!bgParticles || state.reducedMotion) return;
    const symbols = ["<", ">", "{", "}", "/", "=", ";", "(", ")", "[", "]", "*"];
    const count = state.isMobile ? 12 : 28;
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      span.style.left = `${Math.random() * 100}%`;
      span.style.animationDuration = `${12 + Math.random() * 20}s`;
      span.style.animationDelay = `${Math.random() * 15}s`;
      span.style.fontSize = `${0.7 + Math.random() * 0.8}rem`;
      bgParticles.appendChild(span);
    }
  }

  // ---------- Landing Three.js scene ----------
  let landingRenderer, landingScene, landingCamera, landingAnimId;
  let wireframeGroup;

  function initLanding3D() {
    if (!landingCanvas || typeof THREE === "undefined") {
      playLandingCSSOnly();
      return;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    landingRenderer = new THREE.WebGLRenderer({
      canvas: landingCanvas,
      antialias: true,
      alpha: true,
    });
    landingRenderer.setSize(w, h);
    landingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    landingRenderer.setClearColor(0x000000, 1);

    landingScene = new THREE.Scene();
    landingCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    landingCamera.position.set(0, 0, 8);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starCount = state.isMobile ? 400 : 1200;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 60;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
    });
    landingScene.add(new THREE.Points(starGeo, starMat));

    // Wireframe cube made of brackets feel (simple cube + octahedron)
    wireframeGroup = new THREE.Group();
    const cubeGeo = new THREE.BoxGeometry(2.4, 2.4, 2.4);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeo);
    const cubeLine = new THREE.LineSegments(
      cubeEdges,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
    );
    wireframeGroup.add(cubeLine);

    const octa = new THREE.OctahedronGeometry(1.6, 0);
    const octaEdges = new THREE.EdgesGeometry(octa);
    const octaLine = new THREE.LineSegments(
      octaEdges,
      new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.35 })
    );
    wireframeGroup.add(octaLine);

    // Floating code symbols as sprites (simple planes)
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const symbols = ["{}", "</>", "<>", "[]", "()"];
    symbols.forEach((sym, i) => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = "#ffffff";
      ctx.font = "28px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sym, 32, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.6, 0.6, 1);
      const angle = (i / symbols.length) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * 2.8, Math.sin(angle * 1.3) * 1.2, Math.sin(angle) * 2.8);
      wireframeGroup.add(sprite);
    });

    landingScene.add(wireframeGroup);

    // Ambient light (subtle)
    landingScene.add(new THREE.AmbientLight(0xffffff, 0.4));

    let start = performance.now();
    const duration = state.reducedMotion || state.isMobile ? 1800 : 4800;

    function animate(now) {
      landingAnimId = requestAnimationFrame(animate);
      const t = (now - start) / 1000;
      if (wireframeGroup) {
        wireframeGroup.rotation.y = t * 0.35;
        wireframeGroup.rotation.x = Math.sin(t * 0.4) * 0.15;
      }
      // Camera orbit
      if (!state.reducedMotion && !state.isMobile) {
        const radius = 8;
        landingCamera.position.x = Math.sin(t * 0.25) * radius * 0.4;
        landingCamera.position.z = Math.cos(t * 0.25) * radius;
        landingCamera.lookAt(0, 0, 0);
      }
      landingRenderer.render(landingScene, landingCamera);
    }
    animate(performance.now());

    // Title letter animation
    const letters = $$(".letter", landingTitle);
    letters.forEach((el, i) => {
      if (el.classList.contains("space")) {
        el.style.opacity = "1";
        return;
      }
      gsap.fromTo(
        el,
        { opacity: 0, z: -400, rotationY: 90 },
        {
          opacity: 1,
          z: 0,
          rotationY: 0,
          duration: 0.7,
          delay: 0.15 + i * 0.07,
          ease: "back.out(1.4)",
        }
      );
    });

    gsap.to(landingTagline, {
      opacity: 1,
      duration: 0.8,
      delay: 1.4,
      ease: "power2.out",
    });

    // Transition out
    const transitionDelay = state.reducedMotion || state.isMobile ? 1600 : 4200;
    gsap.delayedCall(transitionDelay / 1000, () => {
      transitionToApp();
    });

    window.addEventListener("resize", onLandingResize);
  }

  function onLandingResize() {
    if (!landingCamera || !landingRenderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    landingCamera.aspect = w / h;
    landingCamera.updateProjectionMatrix();
    landingRenderer.setSize(w, h);
  }

  function playLandingCSSOnly() {
    const letters = $$(".letter", landingTitle);
    letters.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    landingTagline.style.opacity = "1";
    setTimeout(transitionToApp, state.reducedMotion ? 400 : 2000);
  }

  function transitionToApp() {
    if (landingAnimId) cancelAnimationFrame(landingAnimId);
    gsap.to(landing, {
      opacity: 0,
      duration: 0.7,
      ease: "power2.inOut",
      onComplete: () => {
        landing.classList.add("hidden");
        landing.style.display = "none";
        if (landingRenderer) {
          landingRenderer.dispose();
        }
        app.classList.remove("hidden");
        app.setAttribute("aria-hidden", "false");
        gsap.fromTo(
          mainCard,
          { opacity: 0, y: 40, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }
        );
        spawnParticles();
        initParallax();
      },
    });
  }

  skipBtn?.addEventListener("click", () => {
    gsap.killTweensOf("*");
    transitionToApp();
  });

  // ---------- Fetch source ----------
  async function fetchWithProxy(targetUrl) {
    let lastError;
    for (const build of PROXIES) {
      try {
        const proxyUrl = build(targetUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 18000);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text || text.length < 20) throw new Error("Empty response");
        // Detect if proxy returned an error page
        if (text.includes("corsproxy") && text.length < 500 && text.toLowerCase().includes("error")) {
          throw new Error("Proxy error");
        }
        return text;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("All proxies failed");
  }

  function extractResources(html, baseUrl) {
    const css = [];
    const js = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      // Inline styles
      doc.querySelectorAll("style").forEach((el) => {
        if (el.textContent.trim()) css.push({ name: "inline-style", content: el.textContent });
      });
      // Inline scripts
      doc.querySelectorAll("script:not([src])").forEach((el, i) => {
        if (el.textContent.trim()) js.push({ name: `inline-script-${i + 1}`, content: el.textContent });
      });
    } catch (_) {}
    return { css, js };
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function countLines(str) {
    if (!str) return 0;
    return str.split(/\r\n|\r|\n/).length;
  }

  function prettyHtml(html) {
    // Lightweight pretty-print (not perfect, but readable)
    try {
      let formatted = html
        .replace(/></g, ">\n<")
        .replace(/(<\/?(?:div|section|header|footer|nav|main|article|aside|ul|ol|li|table|thead|tbody|tr|form|head|body|html)[^>]*>)/gi, "\n$1\n");
      const lines = formatted.split("\n").map((l) => l.trim()).filter(Boolean);
      let indent = 0;
      const out = [];
      for (const line of lines) {
        if (/^<\//.test(line)) indent = Math.max(0, indent - 1);
        out.push("  ".repeat(indent) + line);
        if (/^<[^/!][^>]*[^/]>$/.test(line) && !/^<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)\b/i.test(line)) {
          indent++;
        }
      }
      return out.join("\n");
    } catch {
      return html;
    }
  }

  // ---------- Transfer animation ----------
  function playTransferAnimation() {
    return new Promise((resolve) => {
      if (state.reducedMotion) {
        resolve();
        return;
      }

      transferOverlay.classList.remove("hidden");
      const tunnel = $("#tunnel");
      const packetsEl = $("#packets");
      const dock = $("#receiving-dock");
      const piles = $("#file-piles");
      const progressText = $("#progress-text");
      const crystal = $("#crystal");

      packetsEl.innerHTML = "";
      piles.innerHTML = "";

      // Phase 1: scan
      inputSlot.classList.add("scanning");
      setTimeout(() => inputSlot.classList.remove("scanning"), 600);

      // Phase 2: tunnel
      gsap.fromTo(
        tunnel,
        { height: 0, opacity: 0 },
        { height: "45vh", opacity: 1, duration: 0.8, ease: "power2.out", delay: 0.4 }
      );

      // Packets
      const types = ["html", "css", "js", "html", "css", "js", "html"];
      types.forEach((type, i) => {
        const p = document.createElement("div");
        p.className = `packet ${type}`;
        packetsEl.appendChild(p);
        gsap.fromTo(
          p,
          { x: 0, y: 0, opacity: 0, scale: 0.5 },
          {
            x: (Math.random() - 0.5) * 30,
            y: window.innerHeight * 0.4,
            opacity: 1,
            scale: 1,
            duration: 1.1,
            delay: 0.7 + i * 0.18,
            ease: "power2.in",
            onComplete: () => {
              gsap.to(p, { opacity: 0, scale: 0.3, duration: 0.2 });
            },
          }
        );
      });

      // Dock appear
      gsap.to(dock, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: 1.2,
        ease: "back.out(1.2)",
      });

      // Progress
      let prog = 0;
      const progInterval = setInterval(() => {
        prog = Math.min(100, prog + Math.floor(Math.random() * 18) + 5);
        progressText.textContent = prog >= 100 ? "Complete" : `Retrieving… ${prog}%`;
        if (prog >= 100) clearInterval(progInterval);
      }, 220);

      // File icons stack
      ["html", "css", "js"].forEach((type, i) => {
        const icon = document.createElement("div");
        icon.className = `file-icon ${type}`;
        piles.appendChild(icon);
        gsap.to(icon, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          delay: 1.8 + i * 0.15,
          ease: "back.out(1.6)",
        });
      });

      // Crystal
      gsap.delayedCall(2.8, () => {
        gsap.to(piles.children, { opacity: 0.3, scale: 0.7, duration: 0.3 });
        gsap.fromTo(
          crystal,
          { opacity: 0, scale: 0, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }
        );
        gsap.to(crystal, {
          y: -120,
          scale: 1.4,
          duration: 0.6,
          delay: 0.4,
          ease: "power2.in",
          onComplete: () => {
            gsap.to(crystal, {
              scale: 3,
              opacity: 0,
              duration: 0.35,
              ease: "power2.out",
            });
            gsap.to(tunnel, { opacity: 0, height: 0, duration: 0.4 });
            gsap.to(dock, { opacity: 0, y: 40, duration: 0.4 });
            setTimeout(() => {
              transferOverlay.classList.add("hidden");
              resolve();
            }, 400);
          },
        });
      });
    });
  }

  // ---------- Display results ----------
  function showResults() {
    resultsPanel.classList.remove("hidden");
    requestAnimationFrame(() => resultsPanel.classList.add("open"));
    metaBar.classList.remove("hidden");
    $("#meta-size").textContent = formatBytes(state.meta.size);
    $("#meta-size").setAttribute("data-label", "Size:");
    $("#meta-lines").textContent = `${state.meta.lines} lines`;
    $("#meta-lines").setAttribute("data-label", "Lines:");
    $("#meta-time").textContent = `${state.meta.time} ms`;
    $("#meta-time").setAttribute("data-label", "Load:");
    $("#meta-type").textContent = state.meta.type || "text/html";
    $("#meta-type").setAttribute("data-label", "Type:");

    renderTab("html");
    buildFileTree();
  }

  function buildFileTree() {
    fileTree.innerHTML = "";
    const items = [{ id: "main", name: "index.html", type: "html" }];
    if (state.sourceCss) items.push({ id: "css", name: "styles (extracted)", type: "css" });
    if (state.sourceJs) items.push({ id: "js", name: "scripts (extracted)", type: "js" });
    items.forEach((item, i) => {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.dataset.tab = item.type;
      if (i === 0) li.classList.add("active");
      li.addEventListener("click", () => {
        $$(".file-tree li").forEach((el) => el.classList.remove("active"));
        li.classList.add("active");
        switchTab(item.type);
      });
      fileTree.appendChild(li);
    });
    if (items.length > 1) fileSidebar.classList.add("has-files");
    else fileSidebar.classList.remove("has-files");
  }

  function getTabContent(tab) {
    switch (tab) {
      case "css":
        return state.sourceCss || "/* No external or inline CSS extracted */";
      case "js":
        return state.sourceJs || "// No inline scripts extracted";
      case "raw":
        return state.raw;
      default:
        return prettyPrint.checked ? prettyHtml(state.sourceHtml) : state.sourceHtml;
    }
  }

  function langForTab(tab) {
    if (tab === "css") return "css";
    if (tab === "js") return "javascript";
    return "html";
  }

  function renderTab(tab) {
    state.currentTab = tab;
    const content = getTabContent(tab);
    codeContent.className = `language-${langForTab(tab)}`;
    codeContent.textContent = content;
    if (window.Prism) {
      Prism.highlightElement(codeContent);
    }
    updateMinimap(content);
    if (splitView.checked && tab === "html") {
      try {
        previewIframe.srcdoc = state.sourceHtml;
      } catch (_) {}
    }
  }

  function updateMinimap(text) {
    if (!minimap) return;
    const snippet = text.slice(0, 4000);
    minimap.innerHTML = `<div class="minimap-content">${escapeHtml(snippet)}</div>`;
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function switchTab(tab) {
    $$(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tab);
      t.setAttribute("aria-selected", t.dataset.tab === tab);
    });
    renderTab(tab);
  }

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  prettyPrint?.addEventListener("change", () => {
    if (state.currentTab === "html" || state.currentTab === "raw") renderTab(state.currentTab);
  });

  splitView?.addEventListener("change", () => {
    const area = $(".code-area");
    if (splitView.checked) {
      area.classList.add("split-active");
      splitPreview.classList.remove("hidden");
      if (state.currentTab === "html") {
        try {
          previewIframe.srcdoc = state.sourceHtml;
        } catch (_) {}
      }
    } else {
      area.classList.remove("split-active");
      splitPreview.classList.add("hidden");
    }
  });

  // Search
  codeSearch?.addEventListener("input", () => {
    const q = codeSearch.value.trim().toLowerCase();
    // Simple: re-render and rely on browser find, or highlight via marks
    // For performance we just keep the text; user can Ctrl+F
    if (!q) return;
  });

  // Copy
  copyBtn?.addEventListener("click", async () => {
    const text = getTabContent(state.currentTab);
    try {
      await navigator.clipboard.writeText(text);
      const label = copyBtn.querySelector(".btn-label") || copyBtn;
      const prev = label.textContent;
      label.textContent = "Copied!";
      setTimeout(() => (label.textContent = prev || "Copy All"), 1600);
    } catch {
      alert("Copy failed — select the code manually.");
    }
  });

  closeResults?.addEventListener("click", () => {
    resultsPanel.classList.remove("open");
    setTimeout(() => resultsPanel.classList.add("hidden"), 500);
  });

  // ---------- Form submit ----------
  async function handleRetrieve(url) {
    errorBox.classList.add("hidden");
    resultsPanel.classList.remove("open");
    resultsPanel.classList.add("hidden");
    metaBar.classList.add("hidden");

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      showError("Invalid URL. Please enter a full website address.");
      return;
    }

    retrieveBtn.disabled = true;
    const start = performance.now();

    // Run animation in parallel with fetch
    const animPromise = playTransferAnimation();

    try {
      const html = await fetchWithProxy(finalUrl);
      await animPromise;

      const elapsed = Math.round(performance.now() - start);
      state.raw = html;
      state.sourceHtml = html;
      state.meta = {
        size: new Blob([html]).size,
        lines: countLines(html),
        time: elapsed,
        type: "text/html",
      };

      const resources = extractResources(html, finalUrl);
      state.sourceCss = resources.css.map((c) => `/* ${c.name} */\n${c.content}`).join("\n\n") || "";
      state.sourceJs = resources.js.map((j) => `// ${j.name}\n${j.content}`).join("\n\n") || "";

      showResults();
    } catch (err) {
      await animPromise.catch(() => {});
      transferOverlay.classList.add("hidden");
      console.error(err);
      showError(
        err.name === "AbortError"
          ? "Request timed out. The site may be slow or blocking proxies."
          : "Could not retrieve source. The site may block proxies, be offline, or require authentication."
      );
    } finally {
      retrieveBtn.disabled = false;
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove("hidden");
    gsap.fromTo(errorBox, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35 });
  }

  urlForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleRetrieve(urlInput.value);
  });

  retryBtn?.addEventListener("click", () => {
    handleRetrieve(urlInput.value);
  });

  // ---------- Boot ----------
  function boot() {
    if (typeof gsap === "undefined") {
      // Fallback without GSAP
      playLandingCSSOnly();
      return;
    }
    initLanding3D();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
