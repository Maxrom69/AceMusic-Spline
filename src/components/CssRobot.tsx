import { useEffect, useRef } from "react";
import type { PlaybackState } from "../types";
import { usePointerAim } from "../hooks/usePointerAim";

export function CssRobot({
  reducedMotion,
  playback,
}: {
  reducedMotion: boolean;
  playback: PlaybackState;
}) {
  const head = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLSpanElement>(null);
  const right = useRef<HTMLSpanElement>(null);
  const aim = usePointerAim();

  useEffect(() => {
    let frame = 0;
    let hy = 0;
    let hx = 0;
    let ey = 0;
    let ex = 0;
    const tick = (now: number) => {
      const t = now / 1000;
      const pointer = aim.current;
      const idle = !pointer.active && !reducedMotion;
      const targetHeadY = reducedMotion ? 0 : idle ? Math.sin(t * 0.6) * 10 : pointer.x * 16;
      const targetHeadX = reducedMotion ? 0 : idle ? Math.sin(t * 0.4) * 4 : -pointer.y * 10;
      const targetEyeY = reducedMotion ? 0 : idle ? Math.sin(t * 0.6 + 0.2) * 7 : pointer.x * 9;
      const targetEyeX = reducedMotion ? 0 : idle ? Math.sin(t * 0.4 + 0.2) * 4 : -pointer.y * 6;
      hy += (targetHeadY - hy) * 0.08;
      hx += (targetHeadX - hx) * 0.08;
      ey += (targetEyeY - ey) * 0.16;
      ex += (targetEyeX - ex) * 0.16;
      if (head.current) head.current.style.transform = `rotateY(${hy}deg) rotateX(${hx}deg)`;
      if (left.current) left.current.style.transform = `translate(${ey}px, ${ex}px)`;
      if (right.current) right.current.style.transform = `translate(${ey}px, ${ex}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [aim, reducedMotion]);

  return (
    <div className={`css-robot is-${playback}`} aria-hidden="true">
      <div className="css-robot-head" ref={head}>
        <span className="css-antenna" />
        <span className="css-ear left" />
        <span className="css-ear right" />
        <span className="css-eye left">
          <span ref={left} />
        </span>
        <span className="css-eye right">
          <span ref={right} />
        </span>
        <span className="css-smile" />
      </div>
      <div className="css-robot-body">
        <span className="css-chest" />
      </div>
    </div>
  );
}
