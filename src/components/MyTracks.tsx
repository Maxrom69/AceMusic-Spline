import { Link } from "react-router-dom";
import { useStudio } from "../context/StudioContext";

function formatWhen(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function MyTracks() {
  const { tracks, selectedId, playTrack, deleteTrack, player } = useStudio();

  if (!tracks.length) {
    return (
      <section className="page-panel glass-panel">
        <p className="kicker">Library</p>
        <h1>My Tracks</h1>
        <p className="empty-state">
          No generated tracks yet. Open the <Link to="/">Music Studio</Link> and generate a song. This library is never
          prefilled with fake audio.
        </p>
      </section>
    );
  }

  return (
    <section className="page-panel glass-panel">
      <p className="kicker">Library</p>
      <h1>My Tracks</h1>
      <p className="lede">Selecting a track loads it into the robot’s chest player.</p>
      <ul className="track-list">
        {tracks.map((track) => (
          <li key={track.id} className={selectedId === track.id ? "is-selected" : ""}>
            <button type="button" className="track-main" onClick={() => void playTrack(track.id)}>
              <strong>{track.title}</strong>
              <span>
                {track.format.toUpperCase()} · {track.duration ? `${Math.round(track.duration)}s` : "duration unknown"} ·{" "}
                {formatWhen(track.createdAt)}
              </span>
              <em>{track.status === "expired" ? "Audio missing" : track.status}</em>
            </button>
            <div className="track-actions">
              <button type="button" onClick={() => void playTrack(track.id, true)}>
                {player.trackId === track.id && player.playing ? "Playing" : "Play"}
              </button>
              <button type="button" onClick={() => void deleteTrack(track.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
