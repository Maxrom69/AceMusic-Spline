import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { AceRobotScene } from "../robot/AceRobotScene";
import { useStudio } from "../context/StudioContext";
import { usePrefersReducedMotion } from "../hooks/useMedia";
import { isValidSplineSceneUrl } from "../config/spline";
import { CssRobot } from "./CssRobot";
import { SplineRobot } from "./SplineRobot";
import { ChestPlayer } from "./ChestPlayer";

const LazySpline = lazy(async () => ({ default: SplineRobot }));

class WebGlBoundary extends Component<{ children: ReactNode; onError: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

export function RobotStage() {
  const { settings, player } = useStudio();
  const reducedMotion = usePrefersReducedMotion(settings.reducedMotion);
  const [webglFailed, setWebglFailed] = useState(false);
  const [splineFailed, setSplineFailed] = useState("");
  const [splineReady, setSplineReady] = useState(false);
  const splineUrl = settings.splineSceneUrl.trim();
  const useSpline = isValidSplineSceneUrl(splineUrl) && !splineFailed;

  const onSplineFail = useCallback((reason: string) => {
    setSplineFailed(reason);
  }, []);

  return (
    <section className="robot-stage" aria-label="Robot stage">
      <div className="robot-canvas-wrap">
        {useSpline ? (
          <Suspense fallback={<div className="robot-loading">Loading Spline scene…</div>}>
            <LazySpline url={splineUrl} onFail={onSplineFail} onReady={() => setSplineReady(true)} />
          </Suspense>
        ) : webglFailed ? (
          <CssRobot reducedMotion={reducedMotion} playback={player.state} />
        ) : (
          <WebGlBoundary onError={() => setWebglFailed(true)}>
            <Canvas
              camera={{ position: [0, 0.35, 4.6], fov: 32 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              style={{ pointerEvents: "none" }}
              frameloop={reducedMotion ? "demand" : "always"}
            >
              <color attach="background" args={["#05070d"]} />
              <ambientLight intensity={0.45} />
              <hemisphereLight args={["#9fd9ff", "#120818", 0.55]} />
              <spotLight position={[4, 6, 6]} intensity={22} angle={0.38} color="#7cf6ff" />
              <pointLight position={[-3, 2, 2]} intensity={10} color="#ff2bd6" />
              <pointLight position={[2, -1, 3]} intensity={6} color="#3d7bff" />
              <Suspense fallback={null}>
                <AceRobotScene reducedMotion={reducedMotion} playback={player.state} energy={player.energy} />
              </Suspense>
              <ContactShadows opacity={0.45} scale={8} blur={2.4} far={4} />
              {!reducedMotion && (
                <EffectComposer>
                  <Bloom intensity={0.85} luminanceThreshold={0.2} mipmapBlur />
                </EffectComposer>
              )}
            </Canvas>
          </WebGlBoundary>
        )}
        {!useSpline && !webglFailed && <div className="robot-loading-hint">Ace is listening</div>}
        <ChestPlayer />
      </div>
      <p className="robot-note">
        {useSpline && splineReady
          ? "Spline Viewer is active with global mouse events. If Look At / Follow were exported on the head and eyes, they track across the whole page."
          : splineFailed
            ? `Spline scene failed (${splineFailed}). Showing the Ace Robot fallback.`
            : webglFailed
              ? "WebGL was unavailable. A CSS robot still tracks the cursor."
              : "Ace Robot fallback is active: eyes and head track the cursor across the page. A Spline .splinecode export can be added in Settings."}
      </p>
    </section>
  );
}
