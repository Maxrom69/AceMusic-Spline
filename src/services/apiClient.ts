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

  const response = await fetch(proxyUrl("/v1/chat/completions"), {
    method: "POST",
    headers: proxyHeaders(settings, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseHttpError(response.status, text));
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

function parseHttpError(status: number, text: string): string {
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
  return text.slice(0, 280) || `Request failed (${status}).`;
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
    response = await fetch(proxyUrl("/release_task"), {
      method: "POST",
      headers: proxyHeaders(settings),
      body: form,
    });
  } else {
    response = await fetch(proxyUrl("/release_task"), {
      method: "POST",
      headers: proxyHeaders(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) throw new Error(parseHttpError(response.status, await response.text()));
  const created = unwrapNative<{ task_id?: string; status?: string }>(
    (await response.json()) as Record<string, unknown>,
  );
  const taskId = created.task_id;
  if (!taskId) throw new Error("The native API did not return a task_id.");

  onStatus({ status: "queued", detail: `Task ${taskId} queued…` });
  const started = Date.now();
  while (Date.now() - started < 8 * 60 * 1000) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const poll = await fetch(proxyUrl("/query_result"), {
      method: "POST",
      headers: proxyHeaders(settings, { "Content-Type": "application/json" }),
      body: JSON.stringify({ task_id_list: [taskId] }),
    });
    if (!poll.ok) throw new Error(parseHttpError(poll.status, await poll.text()));
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
      const filePath = first.file.startsWith("http")
        ? first.file
        : proxyUrl(first.file.startsWith("/") ? first.file : `/v1/audio?path=${encodeURIComponent(first.file)}`);
      const audioRes = first.file.startsWith("http")
        ? await fetch(proxyUrl(`/v1/audio?path=${encodeURIComponent(first.file)}`), {
            headers: proxyHeaders(settings),
          })
        : await fetch(filePath, { headers: proxyHeaders(settings) });
      if (!audioRes.ok) throw new Error(parseHttpError(audioRes.status, await audioRes.text()));
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

export async function testConnection(
  settings: AppSettings,
): Promise<{ status: ConnectionStatus; detail: string; models?: string[] }> {
  if (!normalizeBase(settings.apiBaseUrl)) {
    return { status: "unconfigured", detail: "API Base URL is empty." };
  }
  const mode = resolveMode(settings);
  const attempts = mode === "native" ? ["/health", "/v1/models"] : ["/health", "/v1/models"];
  let lastError = "No response.";
  for (const path of attempts) {
    try {
      const response = await fetch(proxyUrl(path), {
        headers: proxyHeaders(settings),
      });
      const text = await response.text();
      if (!response.ok) {
        lastError = parseHttpError(response.status, text);
        continue;
      }
      let models: string[] | undefined;
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
        if (Array.isArray(list)) {
          models = list
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              const rec = item as { id?: unknown; name?: unknown };
              return String(rec.id || rec.name || "");
            })
            .filter(Boolean);
        }
      } catch {
        /* health may be plain */
      }
      return {
        status: "connected",
        detail: `Reached ${path} (${mode} mode).`,
        models,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Network error.";
    }
  }
  return { status: "error", detail: lastError };
}
