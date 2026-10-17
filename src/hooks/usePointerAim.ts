import { useEffect, useRef } from "react";

export interface AimPoint {
  x: number;
  y: number;
  active: boolean;
}

export function usePointerAim() {
  const aim = useRef<AimPoint>({ x: 0, y: 0, active: false });

  useEffect(() => {
    let leaveTimer = 0;
    const toNdc = (clientX: number, clientY: number) => {
      aim.current.x = (clientX / window.innerWidth) * 2 - 1;
      aim.current.y = (clientY / window.innerHeight) * 2 - 1;
      aim.current.active = true;
    };
    const onMove = (event: PointerEvent) => {
      window.clearTimeout(leaveTimer);
      toNdc(event.clientX, event.clientY);
    };
    const onLeave = () => {
      leaveTimer = window.setTimeout(() => {
        aim.current.active = false;
        aim.current.x = 0;
        aim.current.y = 0;
      }, 240);
    };
    const onVisibility = () => {
      if (document.hidden) {
        aim.current.active = false;
        aim.current.x = 0;
        aim.current.y = 0;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(leaveTimer);
    };
  }, []);

  return aim;
}
