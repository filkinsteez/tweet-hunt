"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tweet-hunt:debug";

function readPersistedDebug(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePersistedDebug(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export function useDebugMode() {
  const [debug, setDebug] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const param = params.get("debug");
    let next = readPersistedDebug();

    if (param === "1" || param === "true") {
      next = true;
      writePersistedDebug(true);
    } else if (param === "0" || param === "false") {
      next = false;
      writePersistedDebug(false);
    }

    if (param !== null) {
      const url = new URL(window.location.href);
      url.searchParams.delete("debug");
      window.history.replaceState({}, "", url.toString());
    }

    setDebug(next);

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setDebug(event.newValue === "1");
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return debug;
}
