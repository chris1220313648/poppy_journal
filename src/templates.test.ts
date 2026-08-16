import { describe, expect, it } from "vitest";
import { applyLayout, compatibleLayouts, THEMES } from "./templates";
import { blankPage } from "./db";
import type { ImageElement } from "./types";

const image = (n: number): ImageElement => ({
  id: `image-${n}`,
  kind: "image",
  assetId: `asset-${n}`,
  x: 0,
  y: 0,
  width: 0.5,
  height: 0.5,
  rotation: 0,
  zIndex: n,
  cropX: 0.5,
  cropY: 0.5,
  filter: "original",
  frame: "none",
  shadow: 1,
});

describe("template system", () => {
  it.each([
    [0, "text"],
    [1, "hero"],
    [2, "split"],
    [3, "trio"],
    [4, "grid"],
    [5, "collage"],
    [6, "collage"],
    [7, "contact"],
    [9, "contact"],
  ] as const)("maps %i images to a compatible layout", (count, layoutId) => {
    expect(compatibleLayouts(count).map((layout) => layout.id)).toContain(
      layoutId,
    );
  });

  it("preserves image references and text while changing theme and layout", () => {
    const page = blankPage("book");
    page.title = "春日散步";
    page.body = "风里有一点花香。";
    page.elements = [image(1), image(2), image(3)];
    const elements = applyLayout(page, "trio", "vintage");
    expect(
      elements
        .filter((item) => item.kind === "image")
        .map((item) => item.kind === "image" && item.assetId),
    ).toEqual(["asset-1", "asset-2", "asset-3"]);
    expect(
      elements.find(
        (item) => item.kind === "title" && item.text === "春日散步",
      ),
    ).toBeTruthy();
    expect(
      elements.find(
        (item) => item.kind === "body" && item.text === "风里有一点花香。",
      ),
    ).toBeTruthy();
  });

  it("provides forty theme/layout combinations", () => {
    expect(THEMES.length * 8).toBe(40);
  });
});
