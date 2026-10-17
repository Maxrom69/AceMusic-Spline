import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { DEFAULT_GENERATE } from "../config/defaults";
import { generateMusic, testConnection, validateGenerate } from "../services/apiClient";
import { audioEngine } from "../services/audioEngine";
import { loadSettings, resetSettings, saveSettings } from "../services/settings";
import { getAudioBlob, loadTrackIndex, removeTrack, saveTrackIndex } from "../services/tracksStore";
import type {
  AppSettings,
  ConnectionStatus,
  GenerateRequest,
  GenerationStatus,
  PlaybackState,
  TrackRecord,
} from "../types";

interface StudioContextValue {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  persistSettings: () => void;
  restoreSettings: () => void;
  connection: ConnectionStatus;
  connectionDetail: string;
  checkConnection: () => Promise<void>;
  form: GenerateRequest;
  setForm: (next: GenerateRequest) => void;
  generating: boolean;
  generationStatus: GenerationStatus;
  generationDetail: string;
  lastContent: string;
  generate: () => Promise<void>;
  tracks: TrackRecord[];
  selectedId: string | null;
  playTrack: (id: string, autoplay?: boolean) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  loadLocalFile: (file: File, autoplay?: boolean) => Promise<void>;
  player: {
    title: string;
    playing: boolean;
    loading: boolean;
    error: string | null;
    currentTime: number;
    duration: number;
    volume: number;
    state: PlaybackState;
    energy: number;
    trackId: string | null;
    canDownload: boolean;
  };
  togglePlay: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  downloadCurrent: () => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [connection, setConnection] = useState<ConnectionStatus>("unknown");
  const [connectionDetail, setConnectionDetail] = useState("Not tested yet.");
  const [form, setForm] = useState<GenerateRequest>({ ...DEFAULT_GENERATE, model: loadSettings().model });
  const [tracks, setTracks] = useState<TrackRecord[]>(() => loadTrackIndex());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [generationDetail, setGenerationDetail] = useState("Ready to generate.");
  const [lastContent, setLastContent] = useState("");
  const [playerTick, setPlayerTick] = useState(0);
  const objectUrls = useRef<Map<string, string>>(new Map());

  useEffect(() => audioEngine.subscribe(() => setPlayerTick((value) => value + 1)), []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const persistSettings = useCallback(() => {
    saveSettings(settings);
  }, [settings]);

  const restoreSettings = useCallback(() => {
    const next = resetSettings();
    setSettings(next);
    setForm((prev) => ({ ...prev, model: next.model }));
  }, []);

  const checkConnection = useCallback(async () => {
    saveSettings(settings);
    setConnection("checking");
    setConnectionDetail("Contacting the ACE Music API…");
    const result = await testConnection(settings);
    setConnection(result.status);
    setConnectionDetail(result.detail);
  }, [settings]);

  const playTrack = useCallback(
    async (id: string, autoplay = true) => {
      const record = tracks.find((track) => track.id === id);
      if (!record) return;
      let url = objectUrls.current.get(id);
      if (!url) {
        const blob = await getAudioBlob(id);
        if (!blob) {
          record.status = "expired";
          saveTrackIndex([...tracks]);
          setTracks([...tracks]);
          throw new Error("This track’s audio is no longer in local storage.");
        }
        url = URL.createObjectURL(blob);
        objectUrls.current.set(id, url);
      }
      setSelectedId(id);
      await audioEngine.load({
        url,
        title: record.title,
        trackId: id,
        downloadName: `${record.title.replace(/[^\w.-]+/g, "_")}.${record.format || "mp3"}`,
        revokePrevious: false,
        autoplay,
      });
    },
    [tracks],
  );

  const generate = useCallback(async () => {
    if (generating) return;
    const error = validateGenerate(form, settings);
    if (error) {
      setGenerationStatus("error");
      setGenerationDetail(error);
      return;
    }
    setGenerating(true);
    setGenerationStatus("validating");
    setGenerationDetail("Inputs look valid. Contacting ACE Music…");
    try {
      const result = await generateMusic(form, settings, (update) => {
        if (update.status === "queued") setGenerationStatus("queued");
        else if (update.status === "decoding") setGenerationStatus("decoding");
        else setGenerationStatus("generating");
        if (update.detail) setGenerationDetail(update.detail);
      });
      objectUrls.current.set(result.track.id, result.objectUrl);
      const next = [result.track, ...loadTrackIndex()];
      saveTrackIndex(next);
      setTracks(next);
      setSelectedId(result.track.id);
      setLastContent(result.content);
      await audioEngine.load({
        url: result.objectUrl,
        title: result.track.title,
        trackId: result.track.id,
        downloadName: `${result.track.title.replace(/[^\w.-]+/g, "_")}.${result.track.format}`,
        revokePrevious: false,
        autoplay: true,
      });
      setGenerationStatus("ready");
      setGenerationDetail("Generation complete. Playing on the chest module.");
    } catch (err) {
      setGenerationStatus("error");
      setGenerationDetail(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }, [form, generating, settings]);

  const deleteTrack = useCallback(
    async (id: string) => {
      const url = objectUrls.current.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(id);
      }
      if (audioEngine.trackId === id) {
        audioEngine.pause();
        audioEngine.element.removeAttribute("src");
      }
      const next = await removeTrack(id);
      setTracks(next);
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const loadLocalFile = useCallback(async (file: File, autoplay = true) => {
    const url = URL.createObjectURL(file);
    const id = `local-${crypto.randomUUID()}`;
    objectUrls.current.set(id, url);
    setSelectedId(id);
    await audioEngine.load({
      url,
      title: file.name.replace(/\.[^.]+$/, ""),
      trackId: id,
      downloadName: file.name,
      revokePrevious: false,
      autoplay,
    });
  }, []);

  const playerState: PlaybackState = audioEngine.error
    ? "error"
    : audioEngine.loading
      ? "loading"
      : audioEngine.playing
        ? "playing"
        : audioEngine.element.ended
          ? "ended"
          : audioEngine.element.src
            ? "paused"
            : "idle";

  const value = useMemo<StudioContextValue>(
    () => ({
      settings,
      setSettings,
      persistSettings,
      restoreSettings,
      connection,
      connectionDetail,
      checkConnection,
      form,
      setForm,
      generating,
      generationStatus,
      generationDetail,
      lastContent,
      generate,
      tracks,
      selectedId,
      playTrack,
      deleteTrack,
      loadLocalFile,
      player: {
        title: audioEngine.title,
        playing: audioEngine.playing,
        loading: audioEngine.loading,
        error: audioEngine.error,
        currentTime: audioEngine.currentTime,
        duration: audioEngine.duration,
        volume: audioEngine.volume,
        state: playerState,
        energy: audioEngine.getEnergy(),
        trackId: audioEngine.trackId,
        canDownload: audioEngine.canDownload,
      },
      togglePlay: () => audioEngine.toggle(),
      seek: (time) => audioEngine.seek(time),
      setVolume: (volume) => audioEngine.setVolume(volume),
      downloadCurrent: () => audioEngine.download(),
    }),
    [
      settings,
      persistSettings,
      restoreSettings,
      connection,
      connectionDetail,
      checkConnection,
      form,
      generating,
      generationStatus,
      generationDetail,
      lastContent,
      generate,
      tracks,
      selectedId,
      playTrack,
      deleteTrack,
      loadLocalFile,
      playerTick,
      playerState,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}
