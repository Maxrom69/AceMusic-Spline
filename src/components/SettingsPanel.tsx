import { useState } from "react";
import { ACE_DOCS_COMPLETION, ACE_DOCS_NATIVE, API_KEY_HELP_URL, DEFAULT_API_BASE } from "../config/defaults";
import { isValidSplineSceneUrl, splineBlockerSummary } from "../config/spline";
import { maskKey } from "../services/settings";
import { useStudio } from "../context/StudioContext";

export function SettingsPanel() {
  const { settings, setSettings, persistSettings, restoreSettings, checkConnection, connection, connectionDetail } =
    useStudio();
  const [saved, setSaved] = useState("");

  return (
    <section className="page-panel glass-panel settings-panel">
      <p className="kicker">Configuration</p>
      <h1>Settings</h1>
      <p className="lede">
        The studio opens on the music workspace. API credentials stay in this browser unless you host with
        ACE_MUSIC_API_KEY on the server proxy.
      </p>

      <label className="field">
        <span>API Base URL</span>
        <input
          value={settings.apiBaseUrl}
          placeholder={DEFAULT_API_BASE}
          onChange={(event) => setSettings({ ...settings, apiBaseUrl: event.target.value })}
        />
      </label>
      <label className="field">
        <span>API key</span>
        <input
          type="password"
          autoComplete="off"
          value={settings.apiKey}
          placeholder="Stored locally, never committed"
          onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
        />
        <small>{settings.apiKey ? `Saved as ${maskKey(settings.apiKey)}` : "No key stored."}</small>
      </label>
      <p className="hint">
        Cloud keys: <a href={API_KEY_HELP_URL} target="_blank" rel="noreferrer">{API_KEY_HELP_URL}</a>
      </p>

      <div className="grid-2">
        <label className="field">
          <span>API mode</span>
          <select
            value={settings.apiMode}
            onChange={(event) => setSettings({ ...settings, apiMode: event.target.value as typeof settings.apiMode })}
          >
            <option value="auto">Auto (cloud → completion, local → native)</option>
            <option value="completion">Completion — POST /v1/chat/completions</option>
            <option value="native">Native — /release_task + /query_result</option>
          </select>
        </label>
        <label className="field">
          <span>Default model</span>
          <input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} />
        </label>
      </div>

      <div className="inline-actions">
        <button type="button" className="ghost-btn" onClick={() => void checkConnection()}>
          {connection === "checking" ? "Testing…" : "Test connection"}
        </button>
        <span className={`gen-status is-${connection === "connected" ? "ready" : connection === "error" ? "error" : "idle"}`}>
          {connectionDetail}
        </span>
      </div>

      <label className="field">
        <span>Spline scene URL</span>
        <input
          value={settings.splineSceneUrl}
          placeholder="https://prod.spline.design/…/scene.splinecode"
          onChange={(event) => setSettings({ ...settings, splineSceneUrl: event.target.value })}
        />
        <small>
          {settings.splineSceneUrl
            ? isValidSplineSceneUrl(settings.splineSceneUrl)
              ? "Viewer-compatible export URL detected."
              : "This does not look like a .splinecode export. Community pages are rejected."
            : splineBlockerSummary()}
        </small>
      </label>

      <label className="field">
        <span>App name</span>
        <input
          value={settings.branding.appName}
          onChange={(event) =>
            setSettings({ ...settings, branding: { ...settings.branding, appName: event.target.value } })
          }
        />
      </label>
      <label className="field">
        <span>Tagline</span>
        <input
          value={settings.branding.tagline}
          onChange={(event) =>
            setSettings({ ...settings, branding: { ...settings.branding, tagline: event.target.value } })
          }
        />
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          onChange={(event) => setSettings({ ...settings, reducedMotion: event.target.checked })}
        />
        Low-motion mode (also honors prefers-reduced-motion)
      </label>

      <div className="inline-actions">
        <button
          type="button"
          className="generate-btn compact"
          onClick={() => {
            persistSettings();
            setSaved("Settings saved in this browser.");
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            restoreSettings();
            setSaved("Restored defaults.");
          }}
        >
          Reset
        </button>
        {saved && <span className="hint">{saved}</span>}
      </div>

      <p className="hint">
        Contract docs:{" "}
        <a href={ACE_DOCS_COMPLETION} target="_blank" rel="noreferrer">
          completion
        </a>{" "}
        ·{" "}
        <a href={ACE_DOCS_NATIVE} target="_blank" rel="noreferrer">
          native
        </a>
      </p>
    </section>
  );
}
