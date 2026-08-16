import { describe, expect, it } from "vitest";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  exportPixelRatio,
  PAGE_H,
  PAGE_W,
} from "./canvas-geometry";

describe("A5 export geometry", () => {
  it.each([0.42, 0.75, 1])(
    "exports the same pixels at display scale %s",
    (displayScale) => {
      const ratio = exportPixelRatio(displayScale);
      expect(Math.round(PAGE_W * displayScale * ratio)).toBe(EXPORT_WIDTH);
      expect(Math.round(PAGE_H * displayScale * ratio)).toBe(EXPORT_HEIGHT);
    },
  );
});
