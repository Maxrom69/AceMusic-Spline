import { COMMUNITY_ROBOT } from "./defaults";

/**
 * Spline scene URL configuration.
 *
 * IMPORTANT: Do not put a community page URL here. The Spline Viewer and
 * @splinetool/runtime require a Code/Viewer export of the form:
 *
 *   https://prod.spline.design/<export-id>/scene.splinecode
 *
 * Scene-access blocker (verified 2026-10-17)
 * ------------------------------------------
 * The requested character is the community file “Happy robot button”:
 *   https://community.spline.design/file/9246a5ca-7437-4bc7-9f6e-58b84d4e932f
 * Creator profile: https://community.spline.design/@victorgg
 * License stated on the source page: CC BY 4.0
 *
 * That page is a Community File listing (remix / like / comments). It is not
 * a Viewer or Code export. Obtaining a .splinecode URL requires:
 *   1. A Spline account
 *   2. Remix of the community file in the Spline editor
 *   3. Material / Look At / Follow event edits
 *   4. Export → Viewer (events: Global) or Export → Code
 *
 * This environment cannot sign in to Spline, so no export URL was obtained
 * and none was fabricated. The application therefore:
 *   • Ships an original Ace Robot (Three.js) with verified cursor-tracked
 *     eyes/head, fluorescent emissive eyes, and a luminous chest.
 *   • Wires Spline Viewer with events-target="global" for any valid
 *     scene.splinecode URL entered in Settings or VITE_SPLINE_SCENE_URL.
 *   • Falls back to the Ace Robot if the Spline scene fails to load.
 *
 * Attribution for the requested community character is preserved in the UI
 * footer and in docs/SPLINE_ROBOT_SETUP.md.
 */
export const SPLINE_EXPORT_PATTERN = /https?:\/\/prod\.spline\.design\/[A-Za-z0-9_-]+\/scene\.splinecode/i;

export function isValidSplineSceneUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("community.spline.design")) return false;
  return SPLINE_EXPORT_PATTERN.test(trimmed) || trimmed.endsWith(".splinecode");
}

export function splineBlockerSummary(): string {
  return [
    `Community asset “${COMMUNITY_ROBOT.title}” (${COMMUNITY_ROBOT.page})`,
    "is not a Viewer export URL. Remix + Export in the Spline editor is required",
    "to obtain a scene.splinecode link. No export URL was fabricated.",
  ].join(" ");
}
