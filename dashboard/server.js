"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Docker = require("dockerode");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

/* ── Config ── */
const PORT = parseInt(process.env.PORT, 10) || 3000;
const DASHBOARD_USER = process.env.DASHBOARD_USER || "admin";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "admin";
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRY = "24h";

const STACK_CONTAINERS = new Set([
  "jellyfin",
  "jellyseerr",
  "sonarr",
  "radarr",
  "bazarr",
  "prowlarr",
  "qbittorrent",
  "flaresolverr",
  "navidrome",
  "lidarr",
  "dashboard",
]);

/* ── Password ── */
const PASSWORD_SALT = crypto.randomBytes(32);
const passwordHash = crypto.createHmac("sha256", PASSWORD_SALT)
  .update(DASHBOARD_PASSWORD).digest();

/* ── Middleware ── */
app.use(
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })
);
app.use(express.json({ limit: "1kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Auth Middleware ── */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    return res.status(401).json({ error: "Sessão expirada" });
  }
}

/* ━━━ Auth Routes ━━━ */
app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  const userOk = username === DASHBOARD_USER;
  const inputHash = crypto.createHmac("sha256", PASSWORD_SALT)
    .update(password).digest();
  const passOk = crypto.timingSafeEqual(inputHash, passwordHash);

  if (!userOk || !passOk) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const token = jwt.sign({ user: username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 86400000,
    path: "/",
  });
  res.json({ ok: true, user: username });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  res.json({ ok: true });
});

app.get("/api/auth/check", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user.user });
});

/* ━━━ Containers ━━━ */
app.get("/api/containers", requireAuth, async (_req, res) => {
  try {
    const list = await docker.listContainers({ all: true });
    const containers = list
      .filter((c) =>
        c.Names.some((n) => STACK_CONTAINERS.has(n.replace("/", "")))
      )
      .map((c) => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace("/", "") || "",
        image: c.Image.split(":")[0].split("/").pop(),
        state: c.State,
        status: c.Status,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json(containers);
  } catch {
    res.status(500).json({ error: "Erro ao listar containers" });
  }
});

app.post("/api/containers/:name/:action", requireAuth, async (req, res) => {
  const { name, action } = req.params;
  if (!STACK_CONTAINERS.has(name)) {
    return res.status(404).json({ error: "Container não encontrado" });
  }
  if (!["start", "stop", "restart"].includes(action)) {
    return res.status(400).json({ error: "Ação inválida" });
  }
  try {
    const container = docker.getContainer(name);
    await container[action]();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Log Parsing ── */
function parseLogs(buffer) {
  const buf = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer, "binary");
  if (buf.length === 0) return [];

  if (
    buf.length >= 8 &&
    buf[0] <= 2 &&
    buf[1] === 0 &&
    buf[2] === 0 &&
    buf[3] === 0
  ) {
    const lines = [];
    let pos = 0;
    while (pos + 8 <= buf.length) {
      const size = buf.readUInt32BE(pos + 4);
      pos += 8;
      if (size === 0 || pos + size > buf.length) break;
      buf
        .toString("utf8", pos, pos + size)
        .split("\n")
        .forEach((l) => {
          if (l.trim()) lines.push(l);
        });
      pos += size;
    }
    if (lines.length > 0) return lines;
  }

  return buf
    .toString("utf8")
    .split("\n")
    .filter((l) => l.trim());
}

app.get("/api/containers/:name/logs", requireAuth, async (req, res) => {
  const { name } = req.params;
  if (!STACK_CONTAINERS.has(name)) {
    return res.status(404).json({ error: "Container não encontrado" });
  }
  const tail = Math.min(
    Math.max(parseInt(req.query.tail, 10) || 100, 1),
    500
  );
  try {
    const container = docker.getContainer(name);
    const buffer = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    res.json({ logs: parseLogs(buffer) });
  } catch {
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
});

/* ━━━ System Stats ━━━ */
app.get("/api/system", requireAuth, (_req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    let disk = { total: 0, used: 0, free: 0, percent: 0 };
    try {
      const parts = execSync("df -B1 / | tail -1", { encoding: "utf8" })
        .trim()
        .split(/\s+/);
      disk = {
        total: +parts[1],
        used: +parts[2],
        free: +parts[3],
        percent: parseInt(parts[4], 10),
      };
    } catch {
      /* ignore */
    }

    res.json({
      memory: { total: totalMem, used: totalMem - freeMem, free: freeMem },
      disk,
      cpu: { cores: os.cpus().length, load: os.loadavg() },
      uptime: os.uptime(),
      hostname: os.hostname(),
    });
  } catch {
    res.status(500).json({ error: "Erro ao obter informações" });
  }
});

/* ━━━ Config ━━━ */
app.get("/api/config", requireAuth, (_req, res) => {
  try {
    const p = "/compose/docker-compose.yml";
    const compose = fs.existsSync(p)
      ? fs.readFileSync(p, "utf8")
      : "# Arquivo não encontrado";
    res.json({ compose });
  } catch {
    res.status(500).json({ error: "Erro ao ler configuração" });
  }
});

/* ── SPA Fallback ── */
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ━━━ Start ━━━ */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`archwes dashboard → :${PORT}`);
});
