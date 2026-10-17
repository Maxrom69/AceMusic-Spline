export type EngineListener = () => void;

export class AudioEngine {
  readonly element: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private objectUrl: string | null = null;
  private listeners = new Set<EngineListener>();
  private freq = new Uint8Array(32);
  playing = false;
  loading = false;
  error: string | null = null;
  currentTime = 0;
  duration = 0;
  volume = 0.9;
  title = "No track loaded";
  trackId: string | null = null;
  downloadName = "track.mp3";
  canDownload = false;

  constructor() {
    this.element = new Audio();
    this.element.preload = "metadata";
    this.element.crossOrigin = "anonymous";
    this.element.addEventListener("play", () => {
      this.playing = true;
      this.loading = false;
      void this.ensureGraph();
      this.emit();
    });
    this.element.addEventListener("pause", () => {
      this.playing = false;
      this.emit();
    });
    this.element.addEventListener("ended", () => {
      this.playing = false;
      this.emit();
    });
    this.element.addEventListener("timeupdate", () => {
      this.currentTime = this.element.currentTime || 0;
      this.duration = Number.isFinite(this.element.duration) ? this.element.duration : this.duration;
      this.emit();
    });
    this.element.addEventListener("loadedmetadata", () => {
      this.duration = Number.isFinite(this.element.duration) ? this.element.duration : 0;
      this.loading = false;
      this.emit();
    });
    this.element.addEventListener("waiting", () => {
      this.loading = true;
      this.emit();
    });
    this.element.addEventListener("canplay", () => {
      this.loading = false;
      this.emit();
    });
    this.element.addEventListener("error", () => {
      this.loading = false;
      this.playing = false;
      this.error = "The audio file could not be decoded or fetched.";
      this.emit();
    });
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private async ensureGraph() {
    if (this.analyser) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyser.smoothingTimeConstant = 0.72;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = this.volume;
    this.source = this.ctx.createMediaElementSource(this.element);
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  getLevels(): number[] {
    if (!this.analyser || !this.playing) {
      return Array.from({ length: 12 }, () => 0.08);
    }
    this.analyser.getByteFrequencyData(this.freq);
    const bars = 12;
    const bucket = Math.max(1, Math.floor(this.freq.length / bars));
    const values: number[] = [];
    for (let i = 0; i < bars; i += 1) {
      let sum = 0;
      for (let j = 0; j < bucket; j += 1) sum += this.freq[i * bucket + j] || 0;
      values.push(Math.max(0.08, sum / bucket / 255));
    }
    return values;
  }

  getEnergy(): number {
    const levels = this.getLevels();
    return levels.reduce((a, b) => a + b, 0) / levels.length;
  }

  async load(options: {
    url: string;
    title: string;
    trackId: string;
    downloadName?: string;
    revokePrevious?: boolean;
    autoplay?: boolean;
  }): Promise<void> {
    this.error = null;
    this.loading = true;
    this.title = options.title;
    this.trackId = options.trackId;
    this.downloadName = options.downloadName || "track.mp3";
    this.canDownload = true;
    if (this.objectUrl && options.revokePrevious !== false) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    if (options.url.startsWith("blob:")) this.objectUrl = options.url;
    this.element.src = options.url;
    this.element.load();
    this.emit();
    if (options.autoplay) {
      try {
        await this.play();
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Playback was blocked.";
        this.emit();
      }
    }
  }

  async play() {
    this.error = null;
    await this.ensureGraph();
    await this.element.play();
  }

  pause() {
    this.element.pause();
  }

  async toggle() {
    if (this.playing) this.pause();
    else await this.play();
  }

  seek(time: number) {
    if (!Number.isFinite(time)) return;
    this.element.currentTime = Math.max(0, time);
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value));
    this.element.volume = this.volume;
    if (this.gain) this.gain.gain.value = this.volume;
    this.emit();
  }

  async download() {
    if (!this.element.src) throw new Error("No audio is loaded.");
    const response = await fetch(this.element.src);
    if (!response.ok) throw new Error("Download failed.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = this.downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  dispose() {
    this.pause();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.element.removeAttribute("src");
  }
}

export const audioEngine = new AudioEngine();
