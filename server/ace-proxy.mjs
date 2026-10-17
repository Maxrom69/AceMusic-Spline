/**
 * Shared ACE Music reverse proxy.
 * Forwards /api/ace/* to the user-configured ACE API base URL.
 * Streams SSE responses so long-running generations are not buffered.
 * Never logs Authorization headers or API keys.
 */

const DEFAULT_BASE = "https://api.acemusic.ai";
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export function resolveAceBase(headerValue) {
  const raw = String(headerValue || process.env.ACE_API_BASE_URL || DEFAULT_BASE).trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid API Base URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API Base URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("API Base URL must not include credentials.");
  }
  return url.origin + (url.pathname.replace(/\/$/, "") || "");
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function pickForwardHeaders(reqHeaders, baseOrigin) {
  const headers = {};
  for (const [key, value] of Object.entries(reqHeaders)) {
    if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (key.toLowerCase().startsWith("x-ace-")) continue;
    if (key.toLowerCase() === "origin" || key.toLowerCase() === "referer") continue;
    headers[key] = value;
  }
  if (!headers.authorization && !headers.Authorization && process.env.ACE_MUSIC_API_KEY) {
    headers.authorization = `Bearer ${process.env.ACE_MUSIC_API_KEY}`;
  }
  headers.accept = reqHeaders.accept || "*/*";
  try {
    headers.origin = new URL(baseOrigin).origin;
  } catch {
    /* ignore */
  }
  return headers;
}

export async function handleAceProxy(req, res) {
  try {
    const incomingUrl = new URL(req.url || "/", "http://localhost");
    if (!incomingUrl.pathname.startsWith("/api/ace")) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const base = resolveAceBase(req.headers["x-ace-base-url"]);
    const restPath = incomingUrl.pathname.replace(/^\/api\/ace/, "") || "/";
    const target = new URL(restPath.replace(/^\/*/, "/"), base.endsWith("/") ? base : `${base}/`);
    target.search = incomingUrl.search;

    const method = (req.method || "GET").toUpperCase();
    const headers = pickForwardHeaders(req.headers, base);
    const init = { method, headers };

    if (method !== "GET" && method !== "HEAD") {
      const body = await collectBody(req);
      if (body.length) init.body = body;
    }

    const upstream = await fetch(target, init);
    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      if (key.toLowerCase() === "content-encoding") return;
      outHeaders[key] = value;
    });
    outHeaders["cache-control"] = outHeaders["cache-control"] || "no-store";
    res.writeHead(upstream.status, outHeaders);

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    };
    req.on("close", () => {
      try {
        reader.cancel();
      } catch {
        /* ignore */
      }
    });
    await pump();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy failure";
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ error: message, code: 502 }));
  }
}
