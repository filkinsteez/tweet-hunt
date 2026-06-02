import { useEffect, useState } from "react";

const SCREEN_FADE_MS = 220;

type Props = {
  visible: boolean;
  label?: string;
};

type Phase = "show" | "screen-out" | "done";

export function CanvasLoadingOverlay({ visible, label = "LOADING" }: Props) {
  const [phase, setPhase] = useState<Phase>(() => (visible ? "show" : "done"));

  useEffect(() => {
    if (visible) {
      setPhase("show");
      return;
    }

    setPhase((current) => (current === "done" ? "done" : "screen-out"));
    const toDone = window.setTimeout(() => setPhase("done"), SCREEN_FADE_MS);
    return () => {
      window.clearTimeout(toDone);
    };
  }, [visible]);

  if (phase === "done") return null;

  const phaseClass = phase === "screen-out" ? " is-screen-out" : "";

  return (
    <div className={`canvas-loading${phaseClass}`} role="status" aria-live="polite">
      <span className="canvas-loading-label">{label}</span>
    </div>
  );
}
