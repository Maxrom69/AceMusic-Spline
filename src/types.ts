export type AppRoute = "studio" | "tracks" | "tools" | "settings";

export type ApiMode = "auto" | "completion" | "native";

export type ConnectionStatus = "unknown" | "checking" | "connected" | "error" | "unconfigured";

export type GenerationStatus =
  | "idle"
  | "validating"
  | "submitting"
  | "queued"
  | "generating"
  | "decoding"
  | "ready"
  | "error";

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type AudioFormat = "mp3" | "wav" | "flac" | "opus" | "aac";

export type ThemeId = "ion" | "violet" | "ember" | "aurora" | "ivory";

export interface Branding {
  appName: string;
  tagline: string;
  logoUrl: string;
}

export interface AppSettings {
  apiBaseUrl: string;
  apiKey: string;
  apiMode: ApiMode;
  model: string;
  splineSceneUrl: string;
  reducedMotion: boolean;
  theme: ThemeId;
  splitRatio: number;
  splitRatioMobile: number;
  branding: Branding;
}

export interface GenerateRequest {
  prompt: string;
  lyrics: string;
  instrumental: boolean;
  sampleMode: boolean;
  model: string;
  duration: number | null;
  bpm: number | null;
  keyScale: string;
  timeSignature: string;
  vocalLanguage: string;
  format: AudioFormat;
  thinking: boolean;
  seed: string;
  referenceAudio: File | null;
  taskType: "text2music" | "cover";
}

export interface TrackRecord {
  id: string;
  title: string;
  prompt: string;
  lyrics: string;
  createdAt: number;
  duration: number | null;
  format: string;
  mimeType: string;
  status: "ready" | "error" | "expired";
  model?: string;
  bpm?: number | null;
  keyScale?: string;
  seed?: string;
  remoteUrl?: string;
  error?: string;
}

export interface PlayerTrack {
  id: string;
  title: string;
  sourceUrl: string;
  mimeType: string;
  duration: number | null;
  revokeOnReplace: boolean;
}

export interface GenerationResult {
  track: TrackRecord;
  objectUrl: string;
  content: string;
}
