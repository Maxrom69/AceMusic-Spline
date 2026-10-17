import { useEffect, useState } from "react";
import { GENRE_CHIPS, KEYS, LANGUAGES, MODELS, TIME_SIGNATURES } from "../config/defaults";
import { isSupportedAudioFile } from "../services/apiClient";
import { useStudio } from "../context/StudioContext";
import { RobotStage } from "./RobotStage";
import { SplitStudio } from "./SplitStudio";

export function MusicStudio() {
  const { form, setForm, generate, generating, generationStatus, generationDetail, lastContent, settings } = useStudio();
  const [referenceUrl, setReferenceUrl] = useState<string>("");

  useEffect(() => {
    if (!form.referenceAudio) {
      setReferenceUrl("");
      return;
    }
    const url = URL.createObjectURL(form.referenceAudio);
    setReferenceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.referenceAudio]);

  return (
    <SplitStudio
      left={
        <section className="workspace glass-panel">
          <div className="panel-heading">
            <p className="kicker">Creation workspace</p>
            <h1>Compose with Ace</h1>
          </div>

          <label className="field compact">
            <span>Music description</span>
            <textarea
              rows={4}
              value={form.prompt}
              placeholder="Neon synthwave, fluorescent bass, rainy midnight city, analog drums"
              onChange={(event) => setForm({ ...form, prompt: event.target.value })}
            />
          </label>
          <div className="chip-row">
            {GENRE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="chip"
                onClick={() =>
                  setForm({
                    ...form,
                    prompt: form.prompt ? `${form.prompt.replace(/[,\s]+$/, "")}, ${chip}` : chip,
                  })
                }
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={form.instrumental}
                onChange={(event) => setForm({ ...form, instrumental: event.target.checked })}
              />
              Instrumental
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.sampleMode}
                onChange={(event) => setForm({ ...form, sampleMode: event.target.checked })}
              />
              Sample mode
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.thinking}
                onChange={(event) => setForm({ ...form, thinking: event.target.checked })}
              />
              Thinking
            </label>
          </div>

          <details className="studio-fold">
            <summary>
              Lyrics
              {form.instrumental ? <em>off</em> : form.lyrics.trim() ? <em>added</em> : <em>optional</em>}
            </summary>
            <label className="field compact">
              <span className="sr-only">Lyrics</span>
              <textarea
                rows={5}
                value={form.lyrics}
                disabled={form.instrumental}
                placeholder={"[Verse]\nCyan lights on wet steel\n\n[Chorus]\nAce, keep the signal real"}
                onChange={(event) => setForm({ ...form, lyrics: event.target.value })}
              />
            </label>
            <p className="hint">Typed lyrics are sent as-is. Sample mode lets ACE-Step write lyrics.</p>
          </details>

          <details className="studio-fold">
            <summary>
              Arrangement
              <em>
                {form.format.toUpperCase()}
                {form.duration ? ` · ${form.duration}s` : ""}
                {form.bpm ? ` · ${form.bpm} BPM` : ""}
              </em>
            </summary>
            <div className="grid-2 tight">
              <label className="field compact">
                <span>Model</span>
                <select value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })}>
                  {[form.model, settings.model, ...MODELS.map((model) => model.id)]
                    .filter((id, index, arr) => arr.indexOf(id) === index)
                    .map((id) => (
                      <option key={id} value={id}>
                        {MODELS.find((model) => model.id === id)?.label || id}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field compact">
                <span>Format</span>
                <select
                  value={form.format}
                  onChange={(event) => setForm({ ...form, format: event.target.value as typeof form.format })}
                >
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                </select>
              </label>
              <label className="field compact">
                <span>Duration (sec)</span>
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={form.duration ?? ""}
                  placeholder="auto"
                  onChange={(event) =>
                    setForm({ ...form, duration: event.target.value ? Number(event.target.value) : null })
                  }
                />
              </label>
              <label className="field compact">
                <span>BPM</span>
                <input
                  type="number"
                  min={30}
                  max={300}
                  value={form.bpm ?? ""}
                  placeholder="auto"
                  onChange={(event) => setForm({ ...form, bpm: event.target.value ? Number(event.target.value) : null })}
                />
              </label>
              <label className="field compact">
                <span>Key</span>
                <select value={form.keyScale} onChange={(event) => setForm({ ...form, keyScale: event.target.value })}>
                  {KEYS.map((key) => (
                    <option key={key || "auto"} value={key}>
                      {key || "Auto"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Time signature</span>
                <select
                  value={form.timeSignature}
                  onChange={(event) => setForm({ ...form, timeSignature: event.target.value })}
                >
                  {TIME_SIGNATURES.map((value) => (
                    <option key={value || "auto"} value={value}>
                      {value || "Auto"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Vocal language</span>
                <select
                  value={form.vocalLanguage}
                  onChange={(event) => setForm({ ...form, vocalLanguage: event.target.value })}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Seed</span>
                <input
                  value={form.seed}
                  placeholder="optional"
                  onChange={(event) => setForm({ ...form, seed: event.target.value })}
                />
              </label>
            </div>
          </details>

          <details className="studio-fold">
            <summary>
              Reference audio
              <em>{form.referenceAudio ? form.referenceAudio.name : "none"}</em>
            </summary>
            <div className="reference-box">
              <p>Optional WAV or MP3 style reference.</p>
              <input
                type="file"
                accept="audio/wav,audio/x-wav,audio/mpeg,.wav,.mp3"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && !isSupportedAudioFile(file)) return;
                  setForm({ ...form, referenceAudio: file, taskType: file ? "cover" : "text2music" });
                }}
              />
              {form.referenceAudio && (
                <div className="reference-preview">
                  {referenceUrl && <audio controls src={referenceUrl} />}
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setForm({ ...form, referenceAudio: null, taskType: "text2music" })}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </details>

          <div className="workspace-actions">
            <button type="button" className="generate-btn" onClick={() => void generate()} disabled={generating}>
              {generating ? "Generating…" : "Generate Music"}
            </button>
            <p className={`gen-status is-${generationStatus}`}>{generationDetail}</p>
            {lastContent && (
              <details className="lm-output">
                <summary>Last LM metadata</summary>
                <pre>{lastContent}</pre>
              </details>
            )}
          </div>
        </section>
      }
      right={<RobotStage />}
    />
  );
}
