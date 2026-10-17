import { DEFAULT_SETTINGS, STORAGE_SETTINGS } from "../config/defaults";
import type { AppSettings } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS, branding: { ...DEFAULT_SETTINGS.branding } };
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return DEFAULT_SETTINGS;
    const branding = isRecord(parsed.branding) ? parsed.branding : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      branding: {
        ...DEFAULT_SETTINGS.branding,
        appName: typeof branding.appName === "string" ? branding.appName : DEFAULT_SETTINGS.branding.appName,
        tagline: typeof branding.tagline === "string" ? branding.tagline : DEFAULT_SETTINGS.branding.tagline,
        logoUrl: typeof branding.logoUrl === "string" ? branding.logoUrl : DEFAULT_SETTINGS.branding.logoUrl,
      },
      apiBaseUrl: typeof parsed.apiBaseUrl === "string" ? parsed.apiBaseUrl : DEFAULT_SETTINGS.apiBaseUrl,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      apiMode:
        parsed.apiMode === "completion" || parsed.apiMode === "native" || parsed.apiMode === "auto"
          ? parsed.apiMode
          : "auto",
      model: typeof parsed.model === "string" ? parsed.model : DEFAULT_SETTINGS.model,
      splineSceneUrl: typeof parsed.splineSceneUrl === "string" ? parsed.splineSceneUrl : DEFAULT_SETTINGS.splineSceneUrl,
      reducedMotion: Boolean(parsed.reducedMotion),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, branding: { ...DEFAULT_SETTINGS.branding } };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

export function resetSettings(): AppSettings {
  localStorage.removeItem(STORAGE_SETTINGS);
  return { ...DEFAULT_SETTINGS, branding: { ...DEFAULT_SETTINGS.branding } };
}

export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}
