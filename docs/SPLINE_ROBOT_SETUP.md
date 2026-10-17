# Spline robot setup

## Requested asset

| Field | Value |
| --- | --- |
| Title | Happy robot button |
| Community page | https://community.spline.design/file/9246a5ca-7437-4bc7-9f6e-58b84d4e932f |
| Creator profile | https://community.spline.design/@victorgg |
| Handle shown on the source page | victorgg |
| License on the source page | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Notes on the listing | “Cute friendly robot with a call to action button”. Remix is offered on the page. |

The community listing is **not** a Spline Viewer or Code export. Do not paste that URL into `<spline-viewer>`.

## Scene-access blocker

Verified 2026-10-17:

1. The community file URL identifies a Community Platform page (canvas preview, remix, comments).
2. Viewer/runtime playback requires a `https://prod.spline.design/<id>/scene.splinecode` URL produced by **Export → Viewer** or **Export → Code** in the Spline editor.
3. Remixing the file to add Look At / Follow events, fluorescent materials, and a Viewer export requires a Spline account.
4. This environment cannot sign in to Spline. Guessed export URLs were not used.

Until a real export URL is supplied, the application uses an **original Ace Robot** built with Three.js. It is not a silent drop of cursor tracking: eyes and head follow the pointer across the whole document, with independent easing, anatomical limits, idle motion on touch/no-pointer, and a reduced-motion path.

## How to attach the community robot later

1. Open the community file and choose **Remix**.
2. Keep the recognizable character. Adjust materials:
   - Eyes: emissive fluorescent cyan / electric blue (not a flat sticker color)
   - Secondary trim: magenta / purple
   - Chest: luminous panel
   - Body: dark metal / gloss if the original topology allows it
3. Add **Look At** on the head and **Follow** (or Look At) on each eye. In export Play Settings set mouse events to **Global**.
4. Export → **Viewer**. Copy the `scene.splinecode` URL.
5. Paste it into **Settings → Spline scene URL** (or set `VITE_SPLINE_SCENE_URL` at build time).
6. Reload. The app loads `@splinetool/viewer` with `events-target="global"` so tracking is not limited to the 3D canvas.
7. Keep the HTML chest player overlay. The 3D scene is visual only; it is not an audio decoder.

If the scene fails to load, the Ace Robot fallback returns automatically. Music controls stay usable either way.

## Configuration location

- Runtime field: Settings → Spline scene URL (`localStorage`)
- Build-time: `VITE_SPLINE_SCENE_URL`
- Source comments: `src/config/spline.ts`

Valid URLs must end in `.splinecode`. Community pages are rejected.

## Accessibility

- `prefers-reduced-motion: reduce` and Settings → Low-motion mode freeze tracking at a forward pose and skip bloom.
- The 3D canvas uses `pointer-events: none` so it cannot steal clicks from the form or player.
- Touch: when no pointer is active, the fallback robot uses a slow idle head sway instead of snapping.

## Attribution

The footer credits “Happy robot button” by victorgg under CC BY 4.0, as stated on the community page. No extra biographical claims are made.
