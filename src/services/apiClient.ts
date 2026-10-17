import { DEFAULT_API_BASE } from "../config/defaults";
import type { AppSettings, ConnectionStatus, GenerateRequest, TrackRecord } from "../types";
import { putAudioBlob } from "./tracksStore";

export interface StatusUpdate {
  status: string;
  detail?: string;
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function looksLikeCloud(url: string): boolean {
  return /api\.acemusic\.ai/i.test(url);
}

function resolveMode(settings: AppSettings): "completion" | "native" {
  if (settings.apiMode === "completion" || settings.apiMode === "native") return settings.apiMode;
  const base = normalizeBase(settings.apiBaseUrl || DEFAULT_API_BASE);
  if (looksLikeCloud(base) || /:8002\b/.test(base)) return "completion";
  return "native";
}

function proxyHeaders(settings: AppSettings, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("X-Ace-Base-Url", normalizeBase(settings.apiBaseUrl || DEFAULT_API_BASE));
  if (settings.apiKey.trim()) {
    headers.set("Authorization", `Bearer ${settings.apiKey.trim()}`);
  }
  return headers;
}

function proxyUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/api/ace${clean}`;
}

function isHtmlBody(text: string, contentType?: string | null): boolean {
  if (contentType?.toLowerCase().includes("text/html")) return true;
  const head = text.trimStart().slice(0, 280).toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.includes("<!--[if lt ie") ||
    (head.includes("cloudflare") && head.includes("<html"))
  );
}

function htmlTitle(text: string): string | undefined {
  return text.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
}

function isLoopbackBase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

function gatewayMessage(status: number, text: string, contentType?: string | null): string | null {
  if (!isHtmlBody(text, contentType)) return null;
  const title = htmlTitle(text);
  if (/attention required|cloudflare|just a moment/i.test(`${title || ""} ${text.slice(0, 400)}`)) {
    return `The API gateway returned an HTML block page (HTTP ${status}${title ? `: ${title}` : ""}). This preview proxy cannot always reach api.acemusic.ai; the studio will retry from your browser.`;
  }
  return `The server returned a web page instead of API JSON (HTTP ${status}${title ? `: ${title}` : ""}). Check the API Base URL — it must be the API origin, not a website.`;
}

async function aceFetch(path: string, settings: AppSettings, init: RequestInit = {}): Promise<Response> {
  const proxyHeadersInit = proxyHeaders(settings, init.headers);
  proxyHeadersInit.set("Accept", "application/json, text/event-stream, */*");

  let proxyResponse: Response | null = null;
  let proxyFailure: string | null = null;
  try {
    proxyResponse = await fetch(proxyUrl(path), { ...init, headers: proxyHeadersInit });
    const contentType = proxyResponse.headers.get("content-type");
    if (contentType?.toLowerCase().includes("text/html") || (!proxyResponse.ok && proxyResponse.status >= 500)) {
      const preview = await proxyResponse.clone().text();
      const htmlError = gatewayMessage(proxyResponse.status, preview, contentType);
      if (htmlError || preview.includes("fetch failed") || proxyResponse.status >= 500) {
        proxyFailure = htmlError || parseHttpError(proxyResponse.status, preview);
      }
    }
  } catch (error) {
    proxyFailure = error instanceof Error ? error.message : "Proxy request failed.";
  }

  const canDirect = Boolean(proxyFailure) && !isLoopbackBase(settings.apiBaseUrl || DEFAULT_API_BASE);
  if (!canDirect) {
    if (proxyResponse) return proxyResponse;
    throw new Error(proxyFailure || "API request failed.");
  }

  const base = normalizeBase(settings.apiBaseUrl || DEFAULT_API_BASE);
  const directUrl = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const directHeaders = new Headers(init.headers);
  directHeaders.delete("X-Ace-Base-Url");
  directHeaders.set("Accept", "application/json, text/event-stream, */*");
  if (settings.apiKey.trim()) {
    directHeaders.set("Authorization", `Bearer ${settings.apiKey.trim()}`);
  }
  try {
    return await fetch(directUrl, { ...init, headers: directHeaders, mode: "cors", credentials: "omit" });
  } catch {
    throw new Error(
      proxyFailure ||
        `Could not reach ${base}. If this is the cloud API, confirm the Base URL and key. Local ACE-Step URLs must be proxied.`,
    );
  }
}

function titleFromPrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!compact) return "Untitled generation";
  return compact.length > 48 ? `${compact.slice(0, 45)}…` : compact;
}

function mimeForFormat(format: string, fallback = "audio/mpeg"): string {
  const key = format.toLowerCase();
  if (key.includes("wav")) return "audio/wav";
  if (key.includes("flac")) return "audio/flac";
  if (key.includes("opus")) return "audio/opus";
  if (key.includes("aac")) return "audio/aac";
  if (key.includes("mp3") || key.includes("mpeg")) return "audio/mpeg";
  return fallback;
}

function extensionForMime(mime: string): string {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("opus")) return "opus";
  if (mime.includes("aac")) return "aac";
  return "mp3";
}

function parseMetadata(content: string): { bpm?: number; keyScale?: string; duration?: number; title?: string } {
  const bpm = content.match(/\*\*BPM:\*\*\s*([0-9]+)/i)?.[1];
  const key = content.match(/\*\*Key:\*\*\s*([^\n*]+)/i)?.[1];
  const duration = content.match(/\*\*Duration:\*\*\s*([0-9.]+)/i)?.[1];
  const caption = content.match(/\*\*Caption:\*\*\s*([^\n]+)/i)?.[1];
  return {
    bpm: bpm ? Number(bpm) : undefined,
    keyScale: key?.trim(),
    duration: duration ? Number(duration) : undefined,
    title: caption?.trim(),
  };
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [header, data] = dataUrl.split(",", 2);
  if (!data) throw new Error("The API returned an empty audio payload.");
  const mime = header.match(/data:([^;]+)/)?.[1] || "audio/mpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

async function readSseCompletion(
  response: Response,
  onStatus: (update: StatusUpdate) => void,
): Promise<{ content: string; audioUrl: string | null }> {
  if (!response.body) {
    const json = (await response.json()) as Record<string, unknown>;
    return extractCompletionPayload(json);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let audioUrl: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data) as {
          error?: { message?: string };
          choices?: Array<{ delta?: { content?: string; audio?: Array<{ audio_url?: { url?: string } }> } }>;
        };
        if (chunk.error?.message) throw new Error(chunk.error.message);
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          if (delta.content !== ".") onStatus({ status: "generating", detail: "Model is writing metadata…" });
        }
        const url = delta?.audio?.[0]?.audio_url?.url;
        if (url) {
          audioUrl = url;
          onStatus({ status: "decoding", detail: "Receiving audio…" });
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }

  return { content, audioUrl };
}

function extractCompletionPayload(json: Record<string, unknown>): { content: string; audioUrl: string | null } {
  if (typeof json.error === "string") throw new Error(json.error);
  const errObj = json.error as { message?: string } | undefined;
  if (errObj?.message) throw new Error(errObj.message);
  const choices = json.choices as Array<{ message?: { content?: string; audio?: Array<{ audio_url?: { url?: string } }> } }> | undefined;
  const message = choices?.[0]?.message;
  const content = message?.content || "";
  const audioUrl = message?.audio?.[0]?.audio_url?.url || null;
  return { content, audioUrl };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",", 2)[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildTaggedContent(request: GenerateRequest): string {
  if (request.sampleMode) return request.prompt.trim();
  const prompt = request.prompt.trim();
  const lyrics = request.instrumental ? "" : request.lyrics.trim();
  if (lyrics) {
    return `<prompt>${prompt}</prompt>\n<lyrics>${lyrics}</lyrics>`;
  }
  return `<prompt>${prompt}</prompt>`;
}

async function generateCompletion(
  request: GenerateRequest,
  settings: AppSettings,
  onStatus: (update: StatusUpdate) => void,
): Promise<{ content: string; blob: Blob; mime: string }> {
  onStatus({ status: "submitting", detail: "Sending completion request…" });
  const audioConfig: Record<string, unknown> = {
    format: request.format,
    vocal_language: request.vocalLanguage,
    instrumental: request.instrumental,
  };
  if (request.duration) audioConfig.duration = request.duration;
  if (request.bpm) audioConfig.bpm = request.bpm;
  if (request.keyScale) audioConfig.key_scale = request.keyScale;
  if (request.timeSignature) audioConfig.time_signature = request.timeSignature;

  const contentParts: Array<Record<string, unknown>> = [{ type: "text", text: buildTaggedContent(request) }];
  if (request.referenceAudio) {
    const data = await fileToBase64(request.referenceAudio);
    const format = request.referenceAudio.name.toLowerCase().endsWith(".wav") ? "wav" : "mp3";
    contentParts.push({
      type: "input_audio",
      input_audio: { data, format },
    });
  }

  const body: Record<string, unknown> = {
    model: request.model || settings.model,
    messages: [
      {
        role: "user",
        content: request.referenceAudio ? contentParts : buildTaggedContent(request),
      },
    ],
    stream: true,
    thinking: request.thinking,
    sample_mode: request.sampleMode,
    audio_config: audioConfig,
    task_type: request.taskType,
  };
  if (!request.sampleMode && !request.instrumental && request.lyrics.trim()) {
    body.lyrics = request.lyrics.trim();
  }
  if (request.seed.trim()) body.seed = request.seed.trim();

  const response = await aceFetch("/v1/chat/completions", settings, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseHttpError(response.status, text, response.headers.get("content-type")));
  }

  const contentType = response.headers.get("content-type") || "";
  let content = "";
  let audioUrl: string | null = null;
  if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
    const streamed = await readSseCompletion(response, onStatus);
    content = streamed.content;
    audioUrl = streamed.audioUrl;
  } else {
    const json = (await response.json()) as Record<string, unknown>;
    const extracted = extractCompletionPayload(json);
    content = extracted.content;
    audioUrl = extracted.audioUrl;
  }

  if (!audioUrl) {
    throw new Error(
      content
        ? `The API returned text but no audio. ${content.slice(0, 240)}`
        : "The API did not return audio. Check the key, model, and base URL.",
    );
  }

  onStatus({ status: "decoding", detail: "Decoding audio payload…" });
  return { content, ...dataUrlToBlob(audioUrl) };
}

function parseHttpError(status: number, text: string, contentType?: string | null): string {
  const htmlError = gatewayMessage(status, text, contentType);
  if (htmlError) return htmlError;
  try {
    const json = JSON.parse(text) as { error?: string | { message?: string }; message?: string };
    const message =
      (typeof json.error === "string" ? json.error : json.error?.message) || json.message;
    if (message) return message;
  } catch {
    /* plain text */
  }
  if (status === 401 || status === 403) return "Authentication failed. Check the API key in Settings.";
  if (status === 404) return "Endpoint not found. The API Base URL or mode may be wrong.";
  if (status === 504) return "The upstream API timed out (HTTP 504). Try a shorter duration or disable thinking.";
  const compact = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!compact || compact.startsWith("<")) return `Request failed (HTTP ${status}).`;
  return compact.slice(0, 220) || `Request failed (${status}).`;
}

function unwrapNative<T>(json: Record<string, unknown>): T {
  if (typeof json.error === "string" && json.error) throw new Error(json.error);
  if (json.code && json.code !== 200 && json.error) throw new Error(String(json.error));
  return (json.data as T) ?? (json as unknown as T);
}

async function generateNative(
  request: GenerateRequest,
  settings: AppSettings,
  onStatus: (update: StatusUpdate) => void,
): Promise<{ content: string; blob: Blob; mime: string; remoteUrl?: string }> {
  onStatus({ status: "submitting", detail: "Submitting native generation task…" });
  const payload: Record<string, unknown> = {
    prompt: request.prompt.trim(),
    caption: request.prompt.trim(),
    lyrics: request.instrumental ? "" : request.lyrics.trim(),
    thinking: request.thinking,
    vocal_language: request.vocalLanguage,
    audio_format: request.format,
    sample_mode: request.sampleMode,
    model: request.model || settings.model,
    task_type: request.taskType,
    batch_size: 1,
  };
  if (request.sampleMode) payload.sample_query = request.prompt.trim();
  if (request.duration) payload.audio_duration = request.duration;
  if (request.bpm) payload.bpm = request.bpm;
  if (request.keyScale) payload.key_scale = request.keyScale;
  if (request.timeSignature) payload.time_signature = request.timeSignature;
  if (request.seed.trim()) {
    payload.use_random_seed = false;
    payload.seed = Number(request.seed.trim()) || request.seed.trim();
  }

  let response: Response;
  if (request.referenceAudio) {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
    form.append(request.taskType === "cover" ? "src_audio" : "reference_audio", request.referenceAudio);
    response = await aceFetch("/release_task", settings, {
      method: "POST",
      body: form,
    });
  } else {
    response = await aceFetch("/release_task", settings, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    throw new Error(parseHttpError(response.status, await response.text(), response.headers.get("content-type")));
  }
  const created = unwrapNative<{ task_id?: string; status?: string }>(
    (await response.json()) as Record<string, unknown>,
  );
  const taskId = created.task_id;
  if (!taskId) throw new Error("The native API did not return a task_id.");

  onStatus({ status: "queued", detail: `Task ${taskId} queued…` });
  const started = Date.now();
  while (Date.now() - started < 8 * 60 * 1000) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll = await aceFetch("/query_result", settings, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id_list: [taskId] }),
    });
    if (!poll.ok) {
      throw new Error(parseHttpError(poll.status, await poll.text(), poll.headers.get("content-type")));
    }
    const data = unwrapNative<Array<{ status: number | string; result?: string; error?: string }>>(
      (await poll.json()) as Record<string, unknown>,
    );
    const item = Array.isArray(data) ? data[0] : undefined;
    if (!item) continue;
    const statusCode = Number(item.status);
    if (statusCode === 0) {
      onStatus({ status: "generating", detail: "Native job is running…" });
      continue;
    }
    if (statusCode === 2) throw new Error(item.error || "Native generation failed.");
    if (statusCode === 1) {
      const parsed = JSON.parse(item.result || "[]") as Array<{
        file?: string;
        prompt?: string;
        lyrics?: string;
        metas?: { bpm?: number; duration?: number; keyscale?: string };
      }>;
      const first = parsed[0];
      if (!first?.file) throw new Error("Native job succeeded but no audio path was returned.");
      onStatus({ status: "decoding", detail: "Downloading generated audio…" });
      const audioPath = first.file.startsWith("http")
        ? `/v1/audio?path=${encodeURIComponent(first.file)}`
        : first.file.startsWith("/")
          ? first.file
          : `/v1/audio?path=${encodeURIComponent(first.file)}`;
      const audioRes = await aceFetch(audioPath, settings);
      if (!audioRes.ok) {
        throw new Error(parseHttpError(audioRes.status, await audioRes.text(), audioRes.headers.get("content-type")));
      }
      const blob = await audioRes.blob();
      const mime = blob.type || mimeForFormat(request.format);
      const content = [first.prompt, first.lyrics].filter(Boolean).join("\n");
      return { content, blob, mime, remoteUrl: first.file };
    }
  }
  throw new Error("Timed out waiting for the native generation job.");
}

export function validateGenerate(request: GenerateRequest, settings: AppSettings): string | null {
  if (!normalizeBase(settings.apiBaseUrl)) return "Set an API Base URL in Settings.";
  if (looksLikeCloud(settings.apiBaseUrl) && !settings.apiKey.trim() && !hasServerKeyHint()) {
    return "The official ACE Music cloud API requires an API key. Add one in Settings.";
  }
  if (!request.prompt.trim()) {
    return request.sampleMode
      ? "Describe the song you want the model to write."
      : "Enter a music description before generating.";
  }
  if (request.duration != null && (request.duration < 10 || request.duration > 600)) {
    return "Duration must be between 10 and 600 seconds when specified.";
  }
  if (request.bpm != null && (request.bpm < 30 || request.bpm > 300)) {
    return "BPM must be between 30 and 300 when specified.";
  }
  if (request.referenceAudio && !isSupportedAudioFile(request.referenceAudio)) {
    return "Reference audio must be a WAV or MP3 file.";
  }
  return null;
}

function hasServerKeyHint(): boolean {
  return false;
}

export function isSupportedAudioFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    type.includes("audio/mpeg") ||
    type.includes("audio/mp3") ||
    type.includes("audio/wav") ||
    type.includes("audio/x-wav") ||
    type.includes("audio/wave") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav")
  );
}

export async function generateMusic(
  request: GenerateRequest,
  settings: AppSettings,
  onStatus: (update: StatusUpdate) => void,
): Promise<{ track: TrackRecord; objectUrl: string; content: string }> {
  const mode = resolveMode(settings);
  const generated =
    mode === "native"
      ? await generateNative(request, settings, onStatus)
      : await generateCompletion(request, settings, onStatus);

  const id = crypto.randomUUID();
  const meta = parseMetadata(generated.content);
  const format = extensionForMime(generated.mime);
  await putAudioBlob(id, generated.blob);
  const objectUrl = URL.createObjectURL(generated.blob);
  const track: TrackRecord = {
    id,
    title: meta.title || titleFromPrompt(request.prompt),
    prompt: request.prompt.trim(),
    lyrics: request.instrumental ? "" : request.lyrics.trim(),
    createdAt: Date.now(),
    duration: meta.duration ?? request.duration,
    format,
    mimeType: generated.mime,
    status: "ready",
    model: request.model || settings.model,
    bpm: meta.bpm ?? request.bpm,
    keyScale: meta.keyScale || request.keyScale,
    seed: request.seed.trim() || undefined,
    remoteUrl: "remoteUrl" in generated ? (generated as { remoteUrl?: string }).remoteUrl : undefined,
  };
  return { track, objectUrl, content: generated.content };
}

function extractModels(text: string): string[] | undefined {
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const data = json.data;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { models?: unknown }).models)
        ? (data as { models: unknown[] }).models
        : Array.isArray(json.data)
          ? json.data
          : null;
    if (!Array.isArray(list)) return undefined;
    return list
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const rec = item as { id?: unknown; name?: unknown };
        return String(rec.id || rec.name || "");
      })
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

export async function testConnection(
  settings: AppSettings,
): Promise<{ status: ConnectionStatus; detail: string; models?: string[] }> {
  if (!normalizeBase(settings.apiBaseUrl)) {
    return { status: "unconfigured", detail: "API Base URL is empty." };
  }
  const mode = resolveMode(settings);
  const attempts = mode === "native" ? ["/health", "/v1/models"] : ["/v1/models", "/health"];
  let lastError = "No response.";
  for (const path of attempts) {
    try {
      const response = await aceFetch(path, settings, { method: "GET" });
      const contentType = response.headers.get("content-type");
      const text = await response.text();
      if (isHtmlBody(text, contentType)) {
        lastError = parseHttpError(response.status, text, contentType);
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        return {
          status: settings.apiKey.trim() ? "error" : "unconfigured",
          detail: settings.apiKey.trim()
            ? `Reached ${path}, but the API key was rejected.`
            : `Reached ${path}. Paste an API key from acemusic.ai/playground/api-key, then test again.`,
        };
      }
      if (!response.ok) {
        lastError = parseHttpError(response.status, text, contentType);
        continue;
      }
      const models = extractModels(text);
      const okJson = text.trim().startsWith("{") || text.trim().startsWith("[");
      if (!okJson && !/ok|healthy|status/i.test(text)) {
        lastError = `Unexpected response from ${path}.`;
        continue;
      }
      return {
        status: "connected",
        detail: models?.length
          ? `Connected via ${path} (${mode}). Models: ${models.slice(0, 4).join(", ")}`
          : `Connected via ${path} (${mode} mode).`,
        models,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Network error.";
    }
  }
  return { status: "error", detail: lastError };
}
