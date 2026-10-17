export type ThemeId = "ion" | "violet" | "ember" | "aurora" | "ivory";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  hint: string;
  swatches: [string, string, string];
}

export const THEMES: ThemeOption[] = [
  { id: "ion", label: "Ion", hint: "Cyan / magenta night", swatches: ["#00f0ff", "#ff2bd6", "#05070d"] },
  { id: "violet", label: "Violet", hint: "Purple neon", swatches: ["#c9a7ff", "#ff4ad8", "#0a0614"] },
  { id: "ember", label: "Ember", hint: "Amber heat", swatches: ["#ffb14a", "#ff5a36", "#120806"] },
  { id: "aurora", label: "Aurora", hint: "Teal northern lights", swatches: ["#5dffc8", "#4ad6ff", "#04110d"] },
  { id: "ivory", label: "Ivory", hint: "Light studio", swatches: ["#007a86", "#7a3dff", "#f3f1ea"] },
];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
