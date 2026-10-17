import type { AppSettings, GenerateRequest } from "../types";

export const STORAGE_SETTINGS = "acemusic.spline.settings.v1";
export const STORAGE_TRACKS = "acemusic.spline.tracks.v1";
export const DB_NAME = "acemusic-spline";
export const DB_STORE = "audio-blobs";

export const DEFAULT_API_BASE = "https://api.acemusic.ai";
export const API_KEY_HELP_URL = "https://acemusic.ai/playground/api-key";
export const ACE_DOCS_COMPLETION =
  "https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/Openrouter_API_DOC.md";
export const ACE_DOCS_NATIVE =
  "https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md";

export const COMMUNITY_ROBOT = {
  title: "Happy robot button",
  creatorHandle: "victorgg",
  creatorProfile: "https://community.spline.design/@victorgg",
  page: "https://community.spline.design/file/9246a5ca-7437-4bc7-9f6e-58b84d4e932f",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: DEFAULT_API_BASE,
  apiKey: "",
  apiMode: "auto",
  model: "acemusic/acestep-v15-turbo",
  splineSceneUrl: import.meta.env.VITE_SPLINE_SCENE_URL?.trim() || "",
  reducedMotion: false,
  theme: "ion",
  splitRatio: 54,
  splitRatioMobile: 36,
  branding: {
    appName: "AceMusic AI",
    tagline: "Interactive Music Studio",
    logoUrl: "/brand-mark.png",
  },
};

export const DEFAULT_GENERATE: GenerateRequest = {
  prompt: "",
  lyrics: "",
  instrumental: false,
  sampleMode: false,
  model: "acemusic/acestep-v15-turbo",
  duration: 30,
  bpm: null,
  keyScale: "",
  timeSignature: "",
  vocalLanguage: "en",
  format: "mp3",
  thinking: true,
  seed: "",
  referenceAudio: null,
  taskType: "text2music",
};

export const MODELS = [
  { id: "acemusic/acestep-v15-turbo", label: "ACE-Step 1.5 Turbo" },
  { id: "acestep-v15-turbo", label: "ACE-Step 1.5 Turbo (native)" },
  { id: "acestep-v15-base", label: "ACE-Step 1.5 Base (native)" },
];

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "zh", label: "Chinese" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "pt", label: "Portuguese" },
];

export const KEYS = [
  "",
  "C major",
  "C minor",
  "C# major",
  "C# minor",
  "D major",
  "D minor",
  "Eb major",
  "Eb minor",
  "E major",
  "E minor",
  "F major",
  "F minor",
  "F# major",
  "F# minor",
  "G major",
  "G minor",
  "Ab major",
  "Ab minor",
  "A major",
  "A minor",
  "Bb major",
  "Bb minor",
  "B major",
  "B minor",
];

export const TIME_SIGNATURES = ["", "4/4", "3/4", "2/4", "6/8"];

export const GENRE_CHIPS = [
  "synthwave",
  "lo-fi hip hop",
  "cinematic orchestral",
  "dark electro",
  "jazz trio",
  "dream pop",
  "drum and bass",
  "acoustic folk",
];
