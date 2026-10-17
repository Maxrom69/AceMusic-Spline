import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { saveSettings } from "../services/settings";
import { useStudio } from "../context/StudioContext";
import { useIsMobile } from "../hooks/useMedia";

export function SplitStudio({ left, right }: { left: ReactNode; right: ReactNode }) {
  const { settings, setSettings } = useStudio();
  const mobile = useIsMobile(900);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef(false);

  const apply = useCallback(
    (clientX: number, clientY: number) => {
      const box = wrap.current?.getBoundingClientRect();
      if (!box) return;
      const raw = mobile ? ((clientY - box.top) / box.height) * 100 : ((clientX - box.left) / box.width) * 100;
      const min = mobile ? 22 : 28;
      const max = mobile ? 62 : 72;
      const next = Math.min(max, Math.max(min, raw));
      setSettings((prev) => {
        const updated = mobile ? { ...prev, splitRatioMobile: next } : { ...prev, splitRatio: next };
        saveSettings(updated);
        return updated;
      });
    },
    [mobile, setSettings],
  );

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      apply(event.clientX, event.clientY);
    };
    const up = () => {
      if (!drag.current) return;
      drag.current = false;
      document.body.classList.remove("is-resizing");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [apply]);

  const ratio = mobile ? settings.splitRatioMobile : settings.splitRatio;

  return (
    <div
      ref={wrap}
      className={`split-studio${mobile ? " is-vertical" : ""}`}
      style={{ ["--split" as string]: `${ratio}%` }}
    >
      <div className="split-pane split-a">{left}</div>
      <button
        type="button"
        className="split-handle"
        aria-label={mobile ? "Resize robot and workspace height" : "Resize workspace and robot width"}
        title="Drag to resize. Double-click to reset."
        onPointerDown={(event) => {
          event.preventDefault();
          drag.current = true;
          document.body.classList.add("is-resizing");
        }}
        onDoubleClick={() => {
          setSettings((prev) => {
            const updated = mobile ? { ...prev, splitRatioMobile: 36 } : { ...prev, splitRatio: 54 };
            saveSettings(updated);
            return updated;
          });
        }}
        onKeyDown={(event) => {
          const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -3 : event.key === "ArrowRight" || event.key === "ArrowDown" ? 3 : 0;
          if (!delta) return;
          event.preventDefault();
          setSettings((prev) => {
            const current = mobile ? prev.splitRatioMobile : prev.splitRatio;
            const next = Math.min(mobile ? 62 : 72, Math.max(mobile ? 22 : 28, current + delta));
            const updated = mobile ? { ...prev, splitRatioMobile: next } : { ...prev, splitRatio: next };
            saveSettings(updated);
            return updated;
          });
        }}
      />
      <div className="split-pane split-b">{right}</div>
    </div>
  );
}
