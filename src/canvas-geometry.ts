export const EXPORT_WIDTH = 1748;
export const EXPORT_HEIGHT = 2480;
export const PAGE_W = 700;
export const PAGE_H = (EXPORT_HEIGHT / EXPORT_WIDTH) * PAGE_W;

export function exportPixelRatio(displayScale: number) {
  return EXPORT_WIDTH / (PAGE_W * displayScale);
}
