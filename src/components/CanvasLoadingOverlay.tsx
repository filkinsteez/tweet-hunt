import { useEffect, useState } from "react";

// Debug helper: force the loader to stay visible for at least this many ms
// on the very first load so it can be inspected. Set to 0 to disable.
const FORCE_LOADING_MS = 800;

const TEXT_FADE_MS = 280;
const SCREEN_FADE_MS = 520;

// Module-level: the loader is a one-time intro for the whole session. Once the
// first overlay has finished, every later screen mount skips it entirely.
let hasShownInitialLoad = false;

type Props = {
  visible: boolean;
  label?: string;
};

type Phase = "show" | "text-out" | "screen-out" | "done";

export function CanvasLoadingOverlay({ visible, label = "LOADING" }: Props) {
  const [skip] = useState(hasShownInitialLoad);
  const [held, setHeld] = useState(!hasShownInitialLoad && FORCE_LOADING_MS > 0);
  const [phase, setPhase] = useState<Phase>("show");

  useEffect(() => {
    if (skip || FORCE_LOADING_MS <= 0) return;
    const timer = window.setTimeout(() => setHeld(false), FORCE_LOADING_MS);
    return () => window.clearTimeout(timer);
  }, [skip]);

  const active = !skip && (visible || held);

  useEffect(() => {
    if (skip) return;
    if (active) {
      setPhase("show");
      return;
    }
    setPhase("text-out");
    const toScreen = window.setTimeout(() => setPhase("screen-out"), TEXT_FADE_MS);
    const toDone = window.setTimeout(() => {
      hasShownInitialLoad = true;
      setPhase("done");
    }, TEXT_FADE_MS + SCREEN_FADE_MS);
    return () => {
      window.clearTimeout(toScreen);
      window.clearTimeout(toDone);
    };
  }, [active, skip]);

  if (skip || phase === "done") return null;

  const phaseClass =
    phase === "text-out" ? " is-text-out" : phase === "screen-out" ? " is-screen-out" : "";

  return (
    <div className={`canvas-loading${phaseClass}`} role="status" aria-live="polite">
      <span className="canvas-loading-label">{label}</span>
      <span className="canvas-loading-dots" aria-hidden="true" />
    </div>
  );
}
