import { useEffect, useState, type CSSProperties } from "react";
import { audioEngine } from "../services/audioEngine";
import { useStudio } from "../context/StudioContext";

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ChestPlayer() {
  const { player, togglePlay, seek, setVolume, downloadCurrent } = useStudio();
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 12 }, () => 0.08));
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setLevels(audioEngine.getLevels());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;

  return (
    <div className={`chest-player is-${player.state}`} role="region" aria-label="Robot chest audio player">
      <div className="chest-eq" aria-hidden="true">
        {levels.map((level, index) => (
          <span key={index} style={{ height: `${Math.round(level * 100)}%` }} />
        ))}
      </div>
      <div className="chest-meta">
        <p className="chest-kicker">{player.state === "idle" ? "Chest module idle" : player.state}</p>
        <h2>{player.title}</h2>
      </div>
      <div className="chest-controls">
        <button type="button" className="play-btn" onClick={() => void togglePlay()} disabled={!player.trackId && player.state === "idle"}>
          {player.playing ? "Pause" : "Play"}
        </button>
        <label className="timeline">
          <span className="sr-only">Seek</span>
          <input
            type="range"
            min={0}
            max={player.duration || 0}
            step={0.01}
            value={player.currentTime}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!player.duration}
            style={{ "--progress": `${progress * 100}%` } as CSSProperties}
          />
        </label>
        <span className="time">
          {formatTime(player.currentTime)} / {formatTime(player.duration)}
        </span>
      </div>
      <div className="chest-extra">
        <label className="volume">
          Vol
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          className="ghost-btn"
          disabled={!player.canDownload}
          onClick={() => {
            setDownloadError("");
            void downloadCurrent().catch((error: unknown) => {
              setDownloadError(error instanceof Error ? error.message : "Download failed.");
            });
          }}
        >
          Download
        </button>
      </div>
      {player.error && <p className="chest-error">{player.error}</p>}
      {downloadError && <p className="chest-error">{downloadError}</p>}
      {player.loading && <p className="chest-status">Loading audio…</p>}
    </div>
  );
}
