/** TV glass bounds in crt_cold.jpg, normalized 0–1. Tuned for the square source art. */
export const CRT_TV_BOUNDS = {
  left: 0.122,
  top: 0.168,
  width: 0.756,
  height: 0.554
} as const;

export const CRT_IMAGE_ASPECT = 1;

export type CrtScreenRect = {
  left: string;
  top: string;
  width: string;
  height: string;
};

export function computeCrtScreenRect(containerWidth: number, containerHeight: number, imageAspect = CRT_IMAGE_ASPECT): CrtScreenRect {
  const fallback = {
    left: `${CRT_TV_BOUNDS.left * 100}%`,
    top: `${CRT_TV_BOUNDS.top * 100}%`,
    width: `${CRT_TV_BOUNDS.width * 100}%`,
    height: `${CRT_TV_BOUNDS.height * 100}%`
  };

  if (containerWidth <= 0 || containerHeight <= 0) return fallback;

  const scale = Math.max(containerWidth / imageAspect, containerHeight);
  const renderWidth = scale * imageAspect;
  const renderHeight = scale;
  const offsetX = (containerWidth - renderWidth) / 2;
  const offsetY = (containerHeight - renderHeight) / 2;

  const left = offsetX + CRT_TV_BOUNDS.left * renderWidth;
  const top = offsetY + CRT_TV_BOUNDS.top * renderHeight;
  const width = CRT_TV_BOUNDS.width * renderWidth;
  const height = CRT_TV_BOUNDS.height * renderHeight;

  return {
    left: `${(left / containerWidth) * 100}%`,
    top: `${(top / containerHeight) * 100}%`,
    width: `${(width / containerWidth) * 100}%`,
    height: `${(height / containerHeight) * 100}%`
  };
}
