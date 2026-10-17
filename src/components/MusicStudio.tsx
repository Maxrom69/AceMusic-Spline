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
          <p className="lede">
            Describe genre, mood, instruments, tempo, and vocal style. Generation uses the real ACE-Step contract
            through your configured API — nothing is simulated.
          </p>
        </div>

        <label className="field">
          <span>Music description</span>
          <textarea
            rows={6}
            value={form.prompt}
            placeholder="Neon synthwave anthem, fluorescent bass, rainy midnight city, confident male vocal, analog drums, 1988 production sheen"
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

        <label className="field">
          <span>Lyrics {form.instrumental ? "(ignored in instrumental mode)" : ""}</span>
          <textarea
            rows={7}
            value={form.lyrics}
            disabled={form.instrumental}
            placeholder={"[Verse]\nCyan lights on wet steel\n\n[Chorus]\nAce, keep the signal real"}
            onChange={(event) => setForm({ ...form, lyrics: event.target.value })}
          />
        </label>
        <p className="hint">
          Lyrics you type are sent as provided lyrics. This app does not invent a separate lyrics-generation API —
          sample mode asks ACE-Step’s LM to write both caption and lyrics.
        </p>

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
            Sample mode (LM writes the song)
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.thinking}
              onChange={(event) => setForm({ ...form, thinking: event.target.checked })}
            />
            Thinking (5Hz LM)
          </label>
        </div>

        <div className="grid-2">
          <label className="field">
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
          <label className="field">
            <span>Format</span>
            <select
              value={form.format}
              onChange={(event) => setForm({ ...form, format: event.target.value as typeof form.format })}
            >
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
            </select>
          </label>
          <label className="field">
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
          <label className="field">
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
          <label className="field">
            <span>Key</span>
            <select value={form.keyScale} onChange={(event) => setForm({ ...form, keyScale: event.target.value })}>
              {KEYS.map((key) => (
                <option key={key || "auto"} value={key}>
                  {key || "Auto"}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
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
          <label className="field">
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
          <label className="field">
            <span>Seed</span>
            <input
              value={form.seed}
              placeholder="optional"
              onChange={(event) => setForm({ ...form, seed: event.target.value })}
            />
          </label>
        </div>

        <div className="reference-box">
          <div>
            <span>Reference audio</span>
            <p>Optional style reference. WAV or MP3. Used as `reference_audio` / multimodal `input_audio`.</p>
          </div>
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
              <button type="button" className="ghost-btn" onClick={() => setForm({ ...form, referenceAudio: null, taskType: "text2music" })}>
                Remove
              </button>
            </div>
          )}
        </div>

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
      </section>
      }
      right={<RobotStage />}
    />
  );
}
