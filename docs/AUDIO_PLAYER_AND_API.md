# Audio player and API

## Player

The chest module is a real `HTMLAudioElement` (`src/services/audioEngine.ts`), not a mock inside the 3D scene.

| Control | Behavior |
| --- | --- |
| Play / Pause | `element.play()` / `pause()` |
| Timeline | `currentTime` seek |
| Time labels | `currentTime` and `duration` when metadata is available |
| Volume | element volume + Web Audio gain |
| Equalizer | Web Audio `AnalyserNode` on the media element (real playback energy, not a fake CSS loop) |
| Download | fetches the current source and saves a file |
| Formats | WAV (`audio/wav`) and MP3 (`audio/mpeg`), remote URL or Blob |

Object URLs created from generated Blobs are tracked per track id and revoked on delete. The player reports loading, decode errors, and missing files.

Glow on the robot chest follows playback state: idle pulse, magenta while loading, stronger cyan while playing.

## Track library

- Metadata: `localStorage` key `acemusic.spline.tracks.v1`
- Audio bytes: IndexedDB `acemusic-spline` / `audio-blobs`
- Empty state sends the user to Music Studio
- The library is not seeded with fake songs

Expired blobs (cleared storage) are marked `expired` instead of pretending to play.

## ACE Music contract

The browser never calls the ACE origin directly. It calls `/api/ace/...`. `server/ace-proxy.mjs` forwards to the Base URL from `X-Ace-Base-Url`.

### Completion mode (default for `https://api.acemusic.ai` and port 8002)

Documented in [Openrouter_API_DOC.md](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/Openrouter_API_DOC.md).

```
POST /v1/chat/completions
Authorization: Bearer <key>
```

Body includes `messages`, `stream: true`, `thinking`, `sample_mode`, `lyrics`, `task_type`, and `audio_config` (`duration`, `bpm`, `vocal_language`, `instrumental`, `format`, `key_scale`, `time_signature`). Audio is read from SSE/JSON `choices[0].message.audio[].audio_url.url` data URLs. No audio payload is invented on failure.

### Native mode (default for other local bases, typically port 8001)

Documented in [API.md](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md).

1. `POST /release_task`
2. Poll `POST /query_result` with `task_id_list` until `status` is `1` or `2`
3. Download `GET /v1/audio?path=...`

Reference files are sent as `multipart/form-data` (`reference_audio` or `src_audio`).

### Connection test

`GET /health` then `GET /v1/models`. Failures are shown verbatim enough to debug (no fake “connected” state).

## What this app does not pretend to do

- It does not generate music without a reachable ACE API.
- It does not add undocumented endpoints.
- Lyrics-generation is only ACE-Step **sample mode** (`sample_mode: true`), labeled as such in the form.
- Cover/repaint beyond a single reference upload is limited to the documented `task_type` field actually sent.

## WAV and MP3

Choose **Format** in the studio (`audio_config.format` / `audio_format`). The player accepts whichever MIME the API returns. Audio Tools can also load a local `.wav` or `.mp3` to verify the chest player without calling the API.
