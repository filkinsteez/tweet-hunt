"use client";

import { useEffect, useState } from "react";
import { LANDSCAPE_LAYOUT, PORTRAIT_LAYOUT, type GameplayLayoutProfile } from "@/game/layout";

export function useGameplayLayout() {
  const [layout, setLayout] = useState<GameplayLayoutProfile>(LANDSCAPE_LAYOUT);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const touchPortraitQuery = window.matchMedia("(orientation: portrait) and (pointer: coarse) and (hover: none)");
    const narrowPortraitQuery = window.matchMedia("(max-width: 760px) and (orientation: portrait)");

    function syncLayout() {
      const usePortrait = touchPortraitQuery.matches || narrowPortraitQuery.matches;
      const nextLayout = usePortrait ? PORTRAIT_LAYOUT : LANDSCAPE_LAYOUT;
      setLayout((current) => (current.id === nextLayout.id ? current : nextLayout));
    }

    syncLayout();
    touchPortraitQuery.addEventListener("change", syncLayout);
    narrowPortraitQuery.addEventListener("change", syncLayout);
    return () => {
      touchPortraitQuery.removeEventListener("change", syncLayout);
      narrowPortraitQuery.removeEventListener("change", syncLayout);
    };
  }, []);

  return layout;
}
