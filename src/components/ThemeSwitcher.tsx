import { THEMES, type ThemeId } from "../config/themes";
import { saveSettings } from "../services/settings";
import { useStudio } from "../context/StudioContext";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { settings, setSettings } = useStudio();

  const choose = (theme: ThemeId) => {
    setSettings((prev) => {
      const next = { ...prev, theme };
      saveSettings(next);
      return next;
    });
  };

  return (
    <div className={`theme-switcher${compact ? " is-compact" : ""}`} role="group" aria-label="Theme">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={`theme-swatch${settings.theme === theme.id ? " is-active" : ""}`}
          title={`${theme.label} — ${theme.hint}`}
          aria-pressed={settings.theme === theme.id}
          onClick={() => choose(theme.id)}
        >
          <i style={{ background: `linear-gradient(135deg, ${theme.swatches[0]}, ${theme.swatches[1]})` }} />
          {!compact && (
            <span>
              {theme.label}
              <em>{theme.hint}</em>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
