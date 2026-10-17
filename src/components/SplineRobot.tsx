import { useEffect, useState } from "react";
import { isValidSplineSceneUrl } from "../config/spline";

interface SplineRobotProps {
  url: string;
  onFail: (reason: string) => void;
  onReady: () => void;
}

export function SplineRobot({ url, onFail, onReady }: SplineRobotProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isValidSplineSceneUrl(url)) {
      onFail("Scene URL is not a .splinecode export.");
      setFailed(true);
      return;
    }
    let cancelled = false;
    import("@splinetool/viewer")
      .then(() => {
        if (!cancelled) onReady();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Spline viewer failed to load.";
        onFail(message);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url, onFail, onReady]);

  if (failed) return null;

  return (
    <spline-viewer
      className="spline-viewer"
      url={url}
      events-target="global"
      hint="false"
      style={{ width: "100%", height: "100%", background: "transparent" }}
    />
  );
}
