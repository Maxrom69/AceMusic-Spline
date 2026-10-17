# Installation

## Requirements

- Node.js 18 or newer (developed on Node 22)
- npm 10+
- A modern Chromium, Firefox, or Safari browser with WebGL
- Optional: an ACE Music API key and/or a local ACE-Step 1.5 server

## Development

```bash
cd AceMusic-Spline
npm install
npm run dev
```

Vite listens on `0.0.0.0:5173` so the app is reachable from the host machine and from preview proxies. Requests to `/api/ace/*` are forwarded to the Base URL configured in Settings (`X-Ace-Base-Url`), with the browser-supplied `Authorization` header when a key is saved.

## Production build

```bash
npm run build
npm start
```

`npm run build` typechecks and writes a static bundle to `dist/`.
`npm start` runs `server/proxy.mjs`, which:

- Serves `dist/`
- Proxies `/api/ace/*`
- Falls back to `index.html` for client routes (`/tracks`, `/tools`, `/settings`)

Environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `ACE_API_BASE_URL` | Fallback API origin if the client omits `X-Ace-Base-Url` |
| `ACE_MUSIC_API_KEY` | Optional server-side key injected only when the request has no `Authorization` header |
| `HOST` | Bind address (`0.0.0.0` by default) |
| `PORT` | Listen port (`4173` by default) |
| `VITE_SPLINE_SCENE_URL` | Optional Viewer export URL baked in at build time |

Never put a live API key in frontend source or in git.

## Local ACE-Step

1. Run ACE-Step 1.5 according to its own docs.
2. Native async API: `http://127.0.0.1:8001` → Settings API mode **native** or **auto**.
3. OpenRouter-compatible API: `http://127.0.0.1:8002` → mode **completion**.
4. Test connection. CORS is not required because the browser only talks to this app’s proxy.

## Static hosting without the Node proxy

A pure static host cannot hide a shared API key and may hit CORS on `api.acemusic.ai`. Put a reverse proxy in front of `/api/ace` or use `npm start`. The UI still works for browsing, robot interaction, and local WAV/MP3 playback if the proxy is missing; generation will fail with a clear error.

## Branding

Settings → App name / tagline. Logo file: `public/brand-mark.png` (replace if you have an official mark). The default mark is original to this studio.
