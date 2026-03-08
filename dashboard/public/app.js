"use strict";

/* ═══════════════════════════════════════════════════
   archwes · media stack — v5
   ═══════════════════════════════════════════════════ */

/* ━━━ Services ━━━ */
const SERVICES = [
  { name: "Jellyfin",     description: "Servidor de mídia — assista filmes e séries",         port: 8096, category: "media",    icon: "icons/jellyfin.ico",     health: "/System/Info/Public", featured: true },
  { name: "Jellyseerr",   description: "Solicite filmes e séries para download",              port: 5055, category: "request",  icon: "icons/jellyseerr.ico",   health: "/api/v1/status",      featured: true },
  { name: "Sonarr",       description: "Gerenciamento e automação de séries de TV",           port: 8989, category: "manage",   icon: "icons/sonarr.svg",       health: "/ping",               featured: true },
  { name: "Radarr",       description: "Gerenciamento e automação de filmes",                 port: 7878, category: "manage",   icon: "icons/radarr.svg",       health: "/ping",               featured: true },
  { name: "Bazarr",       description: "Gerenciamento automático de legendas",                port: 6767, category: "subtitle", icon: "icons/bazarr.png",       health: "/api/system/status",   featured: false },
  { name: "Prowlarr",     description: "Gerenciador de indexadores para Sonarr e Radarr",     port: 9696, category: "indexer",  icon: "icons/prowlarr.svg",     health: "/ping",               featured: false },
  { name: "qBittorrent",  description: "Cliente de download de torrents",                     port: 8080, category: "download", icon: "icons/qbittorrent.svg",  health: "/api/v2/app/version", featured: false },
  { name: "FlareSolverr",description: "Proxy para bypass de proteção Cloudflare",            port: 8191, category: "tool",     icon: "icons/flaresolverr.svg", health: "/health",             featured: false },
];

const ARROW_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.33 8h9.34M8.67 4l4 4-4 4"/></svg>`;

/* ━━━ State ━━━ */
let authenticated = false;
let currentView = "dashboard";
let currentTab = "containers";
let canvasPaused = false;
let animFrameId = null;
let resumeCanvas = function() {};

/* ━━━ Helpers ━━━ */
function baseUrl(port) {
  return `${location.protocol}//${location.hostname}:${port}`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ━━━ API Helper ━━━ */
async function api(url, options = {}) {
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

/* ═══════════════════════════════════════
   AUTH
   ═══════════════════════════════════════ */
async function checkAuth() {
  try {
    const data = await api("/api/auth/check");
    authenticated = true;
    return data.user;
  } catch {
    authenticated = false;
    return null;
  }
}

async function login(username, password) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  authenticated = true;
  return data;
}

async function logout() {
  try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ok */ }
  authenticated = false;
  updateAuthUI();
  switchView("dashboard");
}

function showLogin() {
  canvasPaused = true;
  const overlay = document.getElementById("login-overlay");
  overlay.classList.add("visible");
  document.getElementById("login-user").focus();
}

function hideLogin() {
  const overlay = document.getElementById("login-overlay");
  overlay.classList.remove("visible");
  document.getElementById("login-form").reset();
  document.getElementById("login-error").textContent = "";
  canvasPaused = false;
  if (!animFrameId) resumeCanvas();
}

function updateAuthUI() {
  const userBtn = document.getElementById("user-btn");
  if (authenticated) {
    userBtn.classList.remove("hidden");
  } else {
    userBtn.classList.add("hidden");
  }
}

/* ═══════════════════════════════════════
   DASHBOARD — CARDS
   ═══════════════════════════════════════ */
function createCard(service) {
  const card = document.createElement("a");
  card.href = baseUrl(service.port);
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.className = service.featured ? "card featured" : "card";
  card.dataset.port = service.port;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <div class="card-icon ${service.category}"><img src="${service.icon}" alt="${service.name}" /></div>
        <span class="card-name">${service.name}</span>
      </div>
      <span class="card-badge checking">verificando</span>
    </div>
    <p class="card-description">${service.description}</p>
    <div class="card-footer">
      <span class="card-port">:${service.port}</span>
      <span class="card-arrow">${ARROW_SVG}</span>
    </div>
  `;

  /* 3D tilt on hover (RAF-throttled) */
  let tiltRAF = 0;
  card.addEventListener("mousemove", (e) => {
    if (tiltRAF) return;
    tiltRAF = requestAnimationFrame(() => {
      tiltRAF = 0;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      card.style.transform = `perspective(600px) rotateX(${(y - .5) * -6}deg) rotateY(${(x - .5) * 6}deg) scale3d(1.01,1.01,1.01)`;
      card.style.setProperty("--mouse-x", `${x * 100}%`);
      card.style.setProperty("--mouse-y", `${y * 100}%`);
    });
  });
  card.addEventListener("mouseleave", () => { cancelAnimationFrame(tiltRAF); tiltRAF = 0; card.style.transform = ""; });

  /* Ripple */
  card.addEventListener("mousedown", (e) => {
    const rect = card.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    card.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });

  return card;
}

/* ━━━ Health Check ━━━ */
async function updateStatus(service, card) {
  const badge = card.querySelector(".card-badge");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(baseUrl(service.port) + service.health, {
      mode: "no-cors", cache: "no-store", signal: controller.signal,
    });
    clearTimeout(timeout);
    badge.textContent = "online";
    badge.className = "card-badge online";
    return true;
  } catch {
    badge.textContent = "offline";
    badge.className = "card-badge offline";
    return false;
  }
}

async function updateAllStatuses() {
  const cards = document.querySelectorAll(".card[data-port]");
  const cardsByPort = {};
  cards.forEach((c) => { cardsByPort[c.dataset.port] = c; });

  const results = await Promise.all(
    SERVICES.map((s) => updateStatus(s, cardsByPort[s.port]))
  );

  const online = results.filter(Boolean).length;
  const dot = document.getElementById("global-status");
  const txt = document.getElementById("global-status-text");

  if (online === SERVICES.length) {
    dot.className = "status-dot online";
    txt.textContent = `${online}/${SERVICES.length} online`;
  } else if (online > 0) {
    dot.className = "status-dot partial";
    txt.textContent = `${online}/${SERVICES.length} online`;
  } else {
    dot.className = "status-dot offline";
    txt.textContent = "Todos offline";
  }
}

/* ═══════════════════════════════════════
   PANEL — CONTAINERS
   ═══════════════════════════════════════ */
async function loadContainers() {
  const grid = document.getElementById("container-grid");
  try {
    const containers = await api("/api/containers");
    grid.innerHTML = "";
    containers.forEach((ct) => {
      const card = document.createElement("div");
      card.className = "ct-card";
      card.innerHTML = `
        <div class="ct-header">
          <span class="ct-name">
            <span class="ct-dot ${ct.state}"></span>
            ${ct.name}
          </span>
          <span class="ct-id">${ct.id}</span>
        </div>
        <div class="ct-status">
          ${ct.status}<br>
          <span>${ct.image}</span>
        </div>
        <div class="ct-actions">
          <button class="ct-btn start" data-name="${ct.name}" data-action="start" ${ct.state === "running" ? "disabled" : ""}>Iniciar</button>
          <button class="ct-btn stop" data-name="${ct.name}" data-action="stop" ${ct.state !== "running" ? "disabled" : ""}>Parar</button>
          <button class="ct-btn restart" data-name="${ct.name}" data-action="restart" ${ct.state !== "running" ? "disabled" : ""}>Reiniciar</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.addEventListener("click", handleContainerAction);
  } catch (err) {
    grid.innerHTML = `<div class="loading-msg">Erro: ${err.message}</div>`;
  }
}

async function handleContainerAction(e) {
  const btn = e.target.closest(".ct-btn");
  if (!btn || btn.disabled) return;

  const { name, action } = btn.dataset;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "...";

  try {
    await api(`/api/containers/${name}/${action}`, { method: "POST" });
    await new Promise((r) => setTimeout(r, 1000));
    await loadContainers();
    updateAllStatuses();
  } catch (err) {
    btn.textContent = "Erro";
    setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 2000);
  }
}

/* ═══════════════════════════════════════
   PANEL — LOGS
   ═══════════════════════════════════════ */
function setupLogControls() {
  const select = document.getElementById("log-service");
  const CONTAINER_NAMES = [
    "jellyfin", "jellyseerr", "sonarr", "radarr",
    "bazarr", "prowlarr", "qbittorrent", "flaresolverr", "dashboard",
  ];
  select.innerHTML = '<option value="">Selecione um serviço...</option>';
  CONTAINER_NAMES.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  select.addEventListener("change", loadLogs);
  document.getElementById("log-lines").addEventListener("change", loadLogs);
  document.getElementById("log-refresh-btn").addEventListener("click", loadLogs);
}

async function loadLogs() {
  const name = document.getElementById("log-service").value;
  const tail = document.getElementById("log-lines").value;
  const viewer = document.getElementById("log-viewer");

  if (!name) {
    viewer.textContent = "Selecione um serviço para visualizar os logs.";
    return;
  }

  viewer.textContent = "Carregando logs...";

  try {
    const data = await api(`/api/containers/${name}/logs?tail=${tail}`);
    if (!data.logs || data.logs.length === 0) {
      viewer.textContent = "Nenhum log encontrado.";
      return;
    }

    viewer.innerHTML = "";
    data.logs.forEach((line) => {
      const span = document.createElement("span");
      span.className = "log-line";

      /* Highlight timestamp */
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s*(.*)/);
      if (tsMatch) {
        const ts = document.createElement("span");
        ts.className = "log-ts";
        ts.textContent = tsMatch[1] + " ";
        span.appendChild(ts);
        span.appendChild(document.createTextNode(tsMatch[2]));
      } else {
        span.textContent = line;
      }
      span.appendChild(document.createTextNode("\n"));
      viewer.appendChild(span);
    });

    viewer.scrollTop = viewer.scrollHeight;
  } catch (err) {
    viewer.textContent = `Erro ao carregar logs: ${err.message}`;
  }
}

/* ═══════════════════════════════════════
   PANEL — SYSTEM
   ═══════════════════════════════════════ */
async function loadSystem() {
  const grid = document.getElementById("stats-grid");
  try {
    const data = await api("/api/system");

    const memPercent = Math.round((data.memory.used / data.memory.total) * 100);
    const diskPercent = data.disk.percent || 0;

    const memBarClass = memPercent > 90 ? "danger" : memPercent > 70 ? "warning" : "";
    const diskBarClass = diskPercent > 90 ? "danger" : diskPercent > 70 ? "warning" : "";

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon cpu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <span class="stat-label">CPU</span>
        </div>
        <span class="stat-value">${data.cpu.cores} cores</span>
        <span class="stat-sub">Load: ${data.cpu.load.map((l) => l.toFixed(2)).join(" / ")}</span>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>
          </div>
          <span class="stat-label">Memória</span>
        </div>
        <span class="stat-value">${memPercent}%</span>
        <span class="stat-sub">${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}</span>
        <div class="stat-bar"><div class="stat-bar-fill ${memBarClass}" style="width:${memPercent}%"></div></div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon disk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
          </div>
          <span class="stat-label">Disco</span>
        </div>
        <span class="stat-value">${diskPercent}%</span>
        <span class="stat-sub">${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}</span>
        <div class="stat-bar"><div class="stat-bar-fill ${diskBarClass}" style="width:${diskPercent}%"></div></div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon uptime">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span class="stat-label">Uptime</span>
        </div>
        <span class="stat-value">${formatUptime(data.uptime)}</span>
        <span class="stat-sub">${data.hostname}</span>
      </div>
    `;
  } catch (err) {
    grid.innerHTML = `<div class="loading-msg">Erro: ${err.message}</div>`;
  }
}

/* ═══════════════════════════════════════
   PANEL — CONFIG
   ═══════════════════════════════════════ */
async function loadConfig() {
  const viewer = document.getElementById("config-viewer");
  try {
    const data = await api("/api/config");
    viewer.textContent = data.compose || "# Sem configuração";
  } catch (err) {
    viewer.textContent = `# Erro: ${err.message}`;
  }
}

/* ═══════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════ */
async function switchView(view) {
  if (view === "panel" && !authenticated) {
    showLogin();
    return;
  }

  currentView = view;

  /* Update nav buttons */
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  /* Show/hide views */
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === `view-${view}`);
  });

  if (view === "panel") {
    loadPanelTab(currentTab);
  }
}

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll(".panel-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-content").forEach((c) => {
    c.classList.toggle("active", c.id === `tab-${tab}`);
  });

  loadPanelTab(tab);
}

function loadPanelTab(tab) {
  switch (tab) {
    case "containers": loadContainers(); break;
    case "logs":       /* logs load on service select */ break;
    case "system":     loadSystem(); break;
    case "config":     loadConfig(); break;
  }
}

/* ═══════════════════════════════════════
   PARTICLE NETWORK
   ═══════════════════════════════════════ */
function initCanvas() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, particles, mouse;
  const COUNT = 60, CONN = 150, MDIST = 200;

  mouse = { x: -1000, y: -1000 };

  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }

  function create() {
    particles = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
        r: Math.random() * 1.5 + .5,
        color: Math.random() > .7 ? "rgba(88,166,255,.5)"
             : Math.random() > .5 ? "rgba(163,113,247,.4)"
             : "rgba(255,255,255,.2)",
      });
    }
  }

  function draw() {
    if (canvasPaused) {
      animFrameId = null;
      return;
    }

    ctx.clearRect(0, 0, w, h);

    const g1 = ctx.createRadialGradient(w * .3, h * .2, 0, w * .3, h * .2, w * .6);
    g1.addColorStop(0, "rgba(88,166,255,.03)"); g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * .8, h * .8, 0, w * .8, h * .8, w * .5);
    g2.addColorStop(0, "rgba(163,113,247,.025)"); g2.addColorStop(1, "transparent");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONN) {
          ctx.strokeStyle = `rgba(88,166,255,${(1 - d / CONN) * .15})`;
          ctx.lineWidth = .5;
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
        }
      }
      const dmx = particles[i].x - mouse.x, dmy = particles[i].y - mouse.y;
      const md = Math.sqrt(dmx * dmx + dmy * dmy);
      if (md < MDIST) {
        ctx.strokeStyle = `rgba(88,166,255,${(1 - md / MDIST) * .3})`;
        ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }

    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    animFrameId = requestAnimationFrame(draw);
  }

  resumeCanvas = function() {
    if (!canvasPaused && !animFrameId) {
      animFrameId = requestAnimationFrame(draw);
    }
  };

  window.addEventListener("resize", () => { resize(); create(); });
  document.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener("mouseleave", () => { mouse.x = -1000; mouse.y = -1000; });

  resize(); create(); draw();
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
async function init() {
  const featuredGrid = document.getElementById("featured-grid");
  const toolsGrid = document.getElementById("tools-grid");

  SERVICES.forEach((s) => {
    (s.featured ? featuredGrid : toolsGrid).appendChild(createCard(s));
  });

  /* ── Nav ── */
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  /* ── Panel tabs ── */
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  /* ── Refresh ── */
  const refreshBtn = document.getElementById("refresh-btn");
  refreshBtn.addEventListener("click", () => {
    refreshBtn.classList.add("spinning");
    updateAllStatuses().finally(() => {
      setTimeout(() => refreshBtn.classList.remove("spinning"), 800);
    });
    if (currentView === "panel") loadPanelTab(currentTab);
  });

  /* ── Logo → dashboard ── */
  document.getElementById("logo-home").addEventListener("click", () => switchView("dashboard"));

  /* ── Login form ── */
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("login-error");
    const btn = document.getElementById("login-btn");
    const user = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value;

    if (!user || !pass) {
      errorEl.textContent = "Preencha todos os campos.";
      return;
    }

    btn.disabled = true;
    errorEl.textContent = "";

    try {
      await login(user, pass);
      hideLogin();
      updateAuthUI();
      switchView("panel");
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ── Close login on overlay click ── */
  document.getElementById("login-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideLogin();
  });

  /* ── Logout ── */
  document.getElementById("user-btn").addEventListener("click", logout);

  /* ── Config copy ── */
  const copyBtn = document.getElementById("config-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = document.getElementById("config-viewer").textContent;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copiado!";
        setTimeout(() => { copyBtn.textContent = "Copiar"; }, 2000);
      });
    });
  }

  /* ── Log controls setup ── */
  setupLogControls();

  /* ── Check existing auth ── */
  const user = await checkAuth();
  updateAuthUI();

  /* ── Initial status check ── */
  updateAllStatuses();
  setInterval(updateAllStatuses, 30000);

  initCanvas();
}

document.addEventListener("DOMContentLoaded", init);
