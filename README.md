# AceMusic AI — Interactive Spline Robot Music Studio

Standalone web application for ACE-Step / ACE Music generation. The default screen is the **Music Studio**, not a settings form. A cursor-tracking robot is the visual centerpiece; its glowing chest hosts a real HTML audio player for generated WAV and MP3 files.

This repository started empty (`# AceMusic-Spline`). The studio is an original interface around the documented ACE-Step API. It is not a WordPress plugin, not an Electron shell, and not a clone of another GitHub music UI.

## What you get

- Music Studio with description, lyrics, instrumental/sample modes, model, duration, BPM, key, language, format, seed, and optional reference audio
- Real generation through a same-origin proxy: completion mode (`POST /v1/chat/completions`) or native mode (`POST /release_task` + `POST /query_result`)
- Robot stage with fluorescent cyan / electric-blue eyes, magenta highlights, and a holographic chest player
- My Tracks library persisted in this browser (IndexedDB audio + metadata)
- Audio Tools for loading local WAV/MP3 into the same player
- Settings for API Base URL, API key, connection test, branding, and Spline scene URL

## Quick start

```bash
npm install
npm run dev
```

The Vite dev server binds `0.0.0.0:5173` and proxies `/api/ace/*` to the API Base URL from Settings (default `https://api.acemusic.ai`).

Production:

```bash
npm run build
npm start
```

`npm start` serves `dist/` and the same API proxy on `0.0.0.0:4173`.

## Configure ACE Music

1. Open **Settings** (the studio still loads first).
2. Set **API Base URL**:
   - Cloud: `https://api.acemusic.ai`
   - Local native API: `http://127.0.0.1:8001`
   - Local OpenRouter-compatible API: `http://127.0.0.1:8002`
3. Paste an API key from [acemusic.ai/playground/api-key](https://acemusic.ai/playground/api-key) when the server requires one.
4. Use **Test connection**.
5. Return to **Music Studio** and generate.

Keys are stored in `localStorage` on this machine. Do not commit `.env` files. For hosted deployments, set `ACE_MUSIC_API_KEY` on the server instead of baking a key into frontend code.

## Spline robot

The requested community file is [Happy robot button](https://community.spline.design/file/9246a5ca-7437-4bc7-9f6e-58b84d4e932f) by [victorgg](https://community.spline.design/@victorgg), CC BY 4.0.

That page is **not** a Viewer export URL. This project does not fabricate a `scene.splinecode` link. Until you export one from the Spline editor, the app uses an original Ace Robot (Three.js) whose eyes and head follow the cursor across the whole page. Paste a real export URL in Settings to switch to Spline Viewer with `events-target="global"`.

See [docs/SPLINE_ROBOT_SETUP.md](docs/SPLINE_ROBOT_SETUP.md).

## Docs

- [docs/INSTALLATION.md](docs/INSTALLATION.md)
- [docs/SPLINE_ROBOT_SETUP.md](docs/SPLINE_ROBOT_SETUP.md)
- [docs/AUDIO_PLAYER_AND_API.md](docs/AUDIO_PLAYER_AND_API.md)
- [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md)

## Attribution

Happy robot button by victorgg, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Music generation is provided by the ACE-Step / ACE Music API you configure.
