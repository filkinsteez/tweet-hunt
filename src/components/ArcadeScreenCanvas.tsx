"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import crtAsset from "../../Assets/CRT/crt_edited.png";
import { CrtRenderer } from "@/game/crtRenderer";
import { drawCrosshair } from "@/game/draw";
import { LANDSCAPE_LAYOUT, type GameplayLayoutProfile } from "@/game/layout";

type ArcadeScreenDrawParams = {
  ctx: CanvasRenderingContext2D;
  images: Record<string, HTMLImageElement>;
  timeMs: number;
};

type Props = {
  ariaLabel: string;
  className?: string;
  presentation?: "crt" | "crisp";
  layout?: GameplayLayoutProfile;
  images: Record<string, string>;
  drawFrame: (params: ArcadeScreenDrawParams) => void;
  children?: ReactNode;
};

export function ArcadeScreenCanvas({ ariaLabel, className = "", presentation = "crt", layout = LANDSCAPE_LAYOUT, images, drawFrame, children }: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const crtCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const crtRendererRef = useRef<CrtRenderer | null>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: layout.width / 2, y: layout.height / 2 });
  const [assetReady, setAssetReady] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [crtUnavailable, setCrtUnavailable] = useState(false);
  const useCrt = presentation === "crt";

  useEffect(() => {
    mouseRef.current = { x: layout.width / 2, y: layout.height / 2 };
  }, [layout.height, layout.width]);

  useEffect(() => {
    if (!useCrt) {
      crtRendererRef.current?.dispose();
      crtRendererRef.current = null;
      setCrtUnavailable(false);
      return undefined;
    }

    const canvas = crtCanvasRef.current;
    if (!canvas) return undefined;

    try {
      const renderer = new CrtRenderer(canvas);
      crtRendererRef.current = renderer;
      setCrtUnavailable(false);
      return () => {
        renderer.dispose();
        if (crtRendererRef.current === renderer) crtRendererRef.current = null;
      };
    } catch (error) {
      console.warn("CRT renderer unavailable; falling back to the source canvas.", error);
      setCrtUnavailable(true);
      return undefined;
    }
  }, [useCrt]);

  useEffect(() => {
    let cancelled = false;

    if (!("fonts" in document)) {
      setFontReady(true);
      return undefined;
    }

    document.fonts
      .load("16px 'Press Start 2P'")
      .then(() => document.fonts.ready)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFontReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const entries = Object.entries(images);
    imagesRef.current = {};
    setAssetReady(entries.length === 0);

    if (entries.length === 0) return undefined;

    let loaded = 0;
    let cancelled = false;
    const imageElements = entries.map(([key, src]) => {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        imagesRef.current[key] = image;
        loaded += 1;
        if (loaded === entries.length) setAssetReady(true);
      };
      image.onerror = () => {
        if (cancelled) return;
        loaded += 1;
        if (loaded === entries.length) setAssetReady(true);
      };
      image.src = src;
      return image;
    });

    return () => {
      cancelled = true;
      for (const image of imageElements) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [images]);

  useEffect(() => {
    if (!assetReady || !fontReady) return undefined;

    const tick = (timeMs: number) => {
      const canvas = sourceCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      drawFrame({ ctx, images: imagesRef.current, timeMs });
      drawCrosshair(ctx, mouseRef.current.x, mouseRef.current.y);
      if (useCrt) crtRendererRef.current?.render(canvas, timeMs);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [assetReady, fontReady, drawFrame, layout.height, layout.width, useCrt]);

  const directSource = !useCrt || crtUnavailable;

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * layout.width,
      y: ((event.clientY - rect.top) / rect.height) * layout.height
    };
  }

  return (
    <div
      className={`canvas-wrap crt-cabinet arcade-screen-canvas ${layout.className}${directSource ? " crt-fallback" : ""}${!useCrt ? " crt-crisp-screen" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--crt-art": `url(${crtAsset.src})` } as CSSProperties}
      aria-label={ariaLabel}
    >
      <div className="crt-screen" onMouseMove={handleMouseMove}>
        <canvas
          ref={sourceCanvasRef}
          className="game-canvas game-source-canvas"
          width={layout.width}
          height={layout.height}
        />
        <canvas
          ref={crtCanvasRef}
          className="game-canvas game-crt-canvas"
          width={layout.width}
          height={layout.height}
          aria-hidden={crtUnavailable}
        />
        {children}
      </div>
    </div>
  );
}
