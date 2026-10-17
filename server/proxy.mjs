import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAceProxy } from "./ace-proxy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-store" : "public, max-age=86400",
  });
  fs.createReadStream(filePath).pipe(res);
}

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const target = path.normalize(path.join(base, decoded));
  if (!target.startsWith(base)) return null;
  return target;
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  if (url.startsWith("/api/ace")) {
    await handleAceProxy(req, res);
    return;
  }

  if (!fs.existsSync(dist)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Build output missing. Run npm run build first.");
    return;
  }

  const filePath = safeJoin(dist, url === "/" ? "/index.html" : url);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  sendFile(res, path.join(dist, "index.html"));
});

server.listen(port, host, () => {
  console.log(`AceMusic AI studio listening on http://${host}:${port}`);
});
