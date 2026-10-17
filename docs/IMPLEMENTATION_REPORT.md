# Implementation report

Date: 2026-10-17  
Branch: `arena/5fa2273f-acemusic-spline`

## Repository starting point

The working tree contained only:

```
README.md  →  # AceMusic-Spline
```

There was no existing framework, API client, WordPress integration, or Spline scene file to preserve. The standalone studio was built from the public ACE-Step 1.5 API documents and the Spline community listing named in the brief.

## What was built

Original Vite + React + TypeScript application:

- Default route `/` is Music Studio (not Settings)
- Header: branding, Music Studio, My Tracks, Audio Tools, Settings, API chip
- Two-column desktop layout: creation workspace + robot stage
- Central CSS custom properties for the cyan / electric-blue / magenta / navy palette
- Same-origin proxy for ACE Music (`server/ace-proxy.mjs`) used in `npm run dev` and `npm start`
- Chest-integrated HTML audio player (WAV/MP3, seek, volume, download, AnalyserNode equalizer)
- My Tracks via localStorage + IndexedDB
- Settings for API Base URL, key, mode, connection test, branding, Spline URL, reduced motion

## Spline robot

**Blocker:** [Happy robot button](https://community.spline.design/file/9246a5ca-7437-4bc7-9f6e-58b84d4e932f) by victorgg (CC BY 4.0 on the source page) is a Community File page. It is not a `scene.splinecode` export. Remix + Export in the Spline editor requires an account this environment does not have. No export URL was fabricated.

**Fallback in use:** original Ace Robot (Three.js) with:

- Fluorescent cyan / electric-blue emissive eyes
- Magenta / purple trim
- Luminous chest panel coordinated with playback
- Head tracking with slower easing than the eyes
- Global `pointermove` (not per-control handlers)
- Idle sway when the pointer leaves or on touch-only use
- Reduced-motion freeze
- CSS robot if WebGL fails
- Spline Viewer path ready for a real `.splinecode` URL (`events-target="global"`)

Attribution is in the footer and `docs/SPLINE_ROBOT_SETUP.md`.

## API honesty

Generation calls the documented contracts only:

- Completion: `POST /v1/chat/completions` with `audio_config` and SSE audio data URLs
- Native: `/release_task`, `/query_result`, `/v1/audio`

Failures surface as errors. The UI never injects a fake track.

## Verification log

| Check | Result |
| --- | --- |
| `npm install` | Succeeded (158 packages) |
| `tsc --noEmit` | Succeeded after fixing EffectComposer and API typing |
| `npm run build` | Succeeded. Vite 5.4.21 wrote `dist/` in ~25s |
| Dev server | `npm run dev` binds `0.0.0.0:5173`. `/` title is “AceMusic AI — Music Studio” |
| Default view | `index.html` + React Router `/` render Music Studio, not Settings |
| WAV fixture | `public/fixtures/ace-tone.wav` served as `audio/wav` (PCM beep) |
| MP3 fixture | `public/fixtures/ace-tone.mp3` served as `audio/mpeg` (LAME-encoded beep) |
| Audio Tools | “Play sample WAV/MP3” loads those files into the chest `HTMLAudioElement` |
| Proxy without key / no upstream | `POST /api/ace/v1/chat/completions` returned JSON `{ error, code: 502 }` — no fake track |
| Settings route | `/settings` served as the SPA shell |
| Spline URL missing | Form and Ace Robot remain available; community page URLs are rejected |
| Cursor tracking | Implemented in `usePointerAim` + Ace Robot `useFrame` (eyes lead, head lags). Visual confirmation is in the running preview; this sandbox cannot drive a real pointer |
| Production `npm start` | `server/proxy.mjs` implemented; build output exists |

Live ACE Music generation with a real cloud key was **not** executed here: the sandbox cannot reach `api.acemusic.ai`, and no key was supplied or committed. The client does not invent audio when the proxy fails.

## Known limitations

1. Without a Spline export URL, the community 3D file itself is not rendered.
2. Shared-secret hosting needs `ACE_MUSIC_API_KEY` on the Node proxy; a static-only host cannot hide a team key.
3. Cloudflare 504s on long cloud generations are an upstream issue; the client uses streaming to reduce the risk but cannot eliminate it.
4. Cover/repaint beyond one reference file is not a full DAW.
