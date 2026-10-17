import { useState } from "react";
import { isSupportedAudioFile } from "../services/apiClient";
import { useStudio } from "../context/StudioContext";

export function AudioTools() {
  const { loadLocalFile, player } = useStudio();
  const [message, setMessage] = useState("Drop or choose a local WAV or MP3 to audition on the chest player.");

  const handleFiles = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedAudioFile(file)) {
      setMessage("Only WAV and MP3 files are accepted here.");
      return;
    }
    try {
      await loadLocalFile(file, true);
      setMessage(`Loaded ${file.name} into the chest player.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load that file.");
    }
  };

  return (
    <section className="page-panel glass-panel">
      <p className="kicker">Utilities</p>
      <h1>Audio Tools</h1>
      <p className="lede">
        This is not a fake converter. It validates WAV/MP3 files and loads them into the same HTML audio engine used
        for generated tracks.
      </p>
      <div className="inline-actions">
        <button
          type="button"
          className="ghost-btn"
          onClick={async () => {
            const res = await fetch("/fixtures/ace-tone.wav");
            const blob = await res.blob();
            const file = new File([blob], "ace-tone.wav", { type: "audio/wav" });
            await handleFiles(file);
          }}
        >
          Play sample WAV
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={async () => {
            const res = await fetch("/fixtures/ace-tone.mp3");
            const blob = await res.blob();
            const file = new File([blob], "ace-tone.mp3", { type: "audio/mpeg" });
            await handleFiles(file);
          }}
        >
          Play sample MP3
        </button>
      </div>
      <label
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFiles(event.dataTransfer.files[0]);
        }}
      >
        <input
          type="file"
          accept="audio/wav,audio/x-wav,audio/mpeg,.wav,.mp3"
          onChange={(event) => void handleFiles(event.target.files?.[0])}
        />
        <strong>Load local WAV / MP3</strong>
        <span>{message}</span>
      </label>
      <p className="hint">Current player: {player.title} ({player.state})</p>
    </section>
  );
}
