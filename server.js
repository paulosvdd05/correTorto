"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";
const root = __dirname;
const publicRoot = path.join(root, "public");
const dataRoot =
  process.env.PULA_TORTO_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(root, "data");
const leaderboardFile = path.join(dataRoot, "leaderboard.json");
const MAX_BODY_BYTES = 2048;
const MAX_SCORE = 999999;
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;
const submissionHistory = new Map();
let writeQueue = Promise.resolve();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function getSiteOrigin(request) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const rawHost =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || request.headers.host;
  const cleanHost = String(rawHost || "localhost").split(",")[0].trim();
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(cleanHost) ? cleanHost : "localhost";
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  return `${forwardedProto === "https" ? "https" : "http"}://${safeHost}`;
}

function send(response, status, type, content, method = "GET", cache = "no-cache") {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'",
  });
  response.end(method === "HEAD" ? undefined : content);
}

function sendJson(response, status, payload, method = "GET") {
  send(response, status, mimeTypes[".json"], JSON.stringify(payload), method, "no-store");
}

function sanitizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} ._-]/gu, "")
    .slice(0, 16);
}

function normalizeEntries(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry.name === "string" &&
        Number.isInteger(Number(entry.score)) &&
        Number(entry.score) >= 0 &&
        Number(entry.score) <= MAX_SCORE,
    )
    .map((entry) => ({
      name: sanitizeName(entry.name) || "ANÔNIMO",
      score: Math.floor(Number(entry.score)),
      createdAt: Number(entry.createdAt) || 0,
    }))
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt);
}

async function readLeaderboard() {
  try {
    return normalizeEntries(JSON.parse(await fs.promises.readFile(leaderboardFile, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeLeaderboard(entries) {
  await fs.promises.mkdir(dataRoot, { recursive: true });
  const temporary = `${leaderboardFile}.${process.pid}.tmp`;
  await fs.promises.writeFile(temporary, JSON.stringify(entries, null, 2), "utf8");
  await fs.promises.rename(temporary, leaderboardFile);
}

function queueScore(entry) {
  const operation = writeQueue.then(async () => {
    const entries = await readLeaderboard();
    const key = entry.name.toLocaleLowerCase("pt-BR");
    const existing = entries.findIndex(
      (item) => item.name.toLocaleLowerCase("pt-BR") === key,
    );
    if (existing >= 0) {
      if (entry.score > entries[existing].score) entries[existing] = entry;
    } else {
      entries.push(entry);
    }
    const ranked = normalizeEntries(entries);
    await writeLeaderboard(ranked);
    return ranked;
  });
  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

function isRateLimited(request) {
  const address =
    String(request.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    request.socket.remoteAddress ||
    "unknown";
  const now = Date.now();
  const recent = (submissionHistory.get(address) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    submissionHistory.set(address, recent);
    return true;
  }
  recent.push(now);
  submissionHistory.set(address, recent);
  return false;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes <= MAX_BODY_BYTES) body += chunk.toString("utf8");
    });
    request.on("end", () => {
      if (bytes > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload muito grande"), { statusCode: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(Object.assign(new Error("JSON inválido"), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

async function handleRanking(request, response) {
  const method = request.method || "GET";
  if (method === "GET" || method === "HEAD") {
    const entries = await readLeaderboard();
    sendJson(
      response,
      200,
      { entries, persistent: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH) },
      method,
    );
    return;
  }
  if (method !== "POST") {
    response.setHeader("Allow", "GET, HEAD, POST");
    sendJson(response, 405, { error: "Método não permitido" }, method);
    return;
  }
  if (!String(request.headers["content-type"] || "").includes("application/json")) {
    sendJson(response, 415, { error: "Envie os dados como JSON" }, method);
    return;
  }
  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Muitas tentativas. Aguarde um minuto." }, method);
    return;
  }
  const body = await readJsonBody(request);
  const name = sanitizeName(body.name);
  const score = Number(body.score);
  if (!name) {
    sendJson(response, 400, { error: "Digite um nome válido" }, method);
    return;
  }
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
    sendJson(response, 400, { error: "Pontuação inválida" }, method);
    return;
  }
  const entries = await queueScore({ name, score, createdAt: Date.now() });
  sendJson(response, 201, { entries, saved: true }, method);
}

function sendIndex(request, response) {
  fs.readFile(path.join(root, "index.html"), (error, content) => {
    if (error) {
      send(response, 404, "text/plain; charset=utf-8", "Página não encontrada", request.method);
      return;
    }
    const html = content.toString().replaceAll("__SITE_URL__", getSiteOrigin(request));
    send(response, 200, mimeTypes[".html"], html, request.method);
  });
}

const server = http.createServer(async (request, response) => {
  const method = request.method || "GET";
  let requestPath;
  try {
    requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
  } catch {
    send(response, 400, "text/plain; charset=utf-8", "URL inválida", method);
    return;
  }

  if (requestPath === "/api/ranking") {
    try {
      await handleRanking(request, response);
    } catch (error) {
      console.error("Erro no ranking:", error);
      sendJson(
        response,
        Number(error.statusCode) || 500,
        { error: Number(error.statusCode) ? error.message : "Não foi possível salvar o placar" },
        method,
      );
    }
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    send(response, 405, "text/plain; charset=utf-8", "Método não permitido", method);
    return;
  }

  if (requestPath === "/health") {
    sendJson(
      response,
      200,
      {
        status: "ok",
        service: "pula-torto",
        rankingStorage: process.env.RAILWAY_VOLUME_MOUNT_PATH ? "volume" : "local",
      },
      method,
    );
    return;
  }

  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  if (!relative || relative.startsWith(".")) {
    send(response, 403, "text/plain; charset=utf-8", "Acesso negado", method);
    return;
  }

  const rootFile = path.resolve(root, relative);
  const publicFile = path.resolve(publicRoot, relative);
  if (!isInside(root, rootFile) || !isInside(publicRoot, publicFile)) {
    send(response, 403, "text/plain; charset=utf-8", "Acesso negado", method);
    return;
  }

  const filePath = fs.existsSync(rootFile) ? rootFile : publicFile;
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendIndex(request, response);
      return;
    }
    const extension = path.extname(filePath).toLowerCase();
    const cache =
      extension === ".html"
        ? "no-cache"
        : [".png", ".jpg", ".jpeg", ".webp"].includes(extension)
          ? "public, max-age=86400"
          : "public, max-age=3600";
    fs.readFile(filePath, (readError, content) => {
      if (readError) {
        send(response, 500, "text/plain; charset=utf-8", "Erro ao carregar o arquivo", method);
        return;
      }
      const rendered =
        extension === ".html"
          ? content.toString().replaceAll("__SITE_URL__", getSiteOrigin(request))
          : content;
      send(
        response,
        200,
        mimeTypes[extension] || "application/octet-stream",
        rendered,
        method,
        cache,
      );
    });
  });
});

server.listen(port, host, () => {
  console.log(`PULA TORTO disponível na porta ${port}`);
  console.log(`Ranking em ${leaderboardFile}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
