/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPLINE_SCENE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    "spline-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        url?: string;
        loading?: string;
        "events-target"?: string;
        hint?: string;
      },
      HTMLElement
    >;
  }
}
