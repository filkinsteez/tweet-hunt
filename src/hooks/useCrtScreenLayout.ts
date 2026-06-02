"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { computeCrtScreenRect } from "@/game/crtScreenLayout";

export function useCrtScreenLayout(cabinetRef: RefObject<HTMLElement | null>, enabled: boolean): CSSProperties | undefined {
  const [screenStyle, setScreenStyle] = useState<CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    if (!enabled) {
      setScreenStyle(undefined);
      return undefined;
    }

    const cabinet = cabinetRef.current;
    if (!cabinet) return undefined;

    function sync() {
      const node = cabinetRef.current;
      if (!node) return;
      setScreenStyle(computeCrtScreenRect(node.clientWidth, node.clientHeight));
    }

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(cabinet);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [cabinetRef, enabled]);

  return enabled ? screenStyle : undefined;
}
