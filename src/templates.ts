import type {
  ImageElement,
  JournalPage,
  LayoutDefinition,
  LayoutId,
  PageElement,
  ThemeDefinition,
  ThemeId,
} from "./types";

export const THEMES: ThemeDefinition[] = [
  {
    id: "japanese",
    name: "日系留白",
    paper: "#fbfaf5",
    ink: "#25231f",
    accent: "#b94836",
    soft: "#ded9cc",
    headingFont: '"Songti SC", "Noto Serif CJK SC", serif',
    bodyFont: '"PingFang SC", sans-serif',
    texture: "plain",
  },
  {
    id: "vintage",
    name: "复古拼贴",
    paper: "#e8d8bf",
    ink: "#34271d",
    accent: "#8e3f2e",
    soft: "#b9a080",
    headingFont: 'Georgia, "Songti SC", serif',
    bodyFont: '"Kaiti SC", "STKaiti", serif',
    texture: "fleck",
  },
  {
    id: "cute",
    name: "可爱贴纸",
    paper: "#fff4ef",
    ink: "#473437",
    accent: "#eb6c77",
    soft: "#f6cdd1",
    headingFont: '"Kaiti SC", "STKaiti", serif',
    bodyFont: '"PingFang SC", sans-serif',
    texture: "dots",
  },
  {
    id: "magazine",
    name: "杂志感",
    paper: "#f4f1ea",
    ink: "#111111",
    accent: "#2361d8",
    soft: "#c6c2b9",
    headingFont: 'Georgia, "Songti SC", serif',
    bodyFont: 'Arial, "PingFang SC", sans-serif',
    texture: "grid",
  },
  {
    id: "polaroid",
    name: "拍立得",
    paper: "#eee8dc",
    ink: "#27221c",
    accent: "#71805b",
    soft: "#c8bda8",
    headingFont: '"Kaiti SC", "STKaiti", serif',
    bodyFont: '"PingFang SC", sans-serif',
    texture: "photo",
  },
];

export const LAYOUTS: LayoutDefinition[] = [
  {
    id: "text",
    name: "纯文字",
    minImages: 0,
    maxImages: 0,
    note: "让文字成为页面主角",
  },
  {
    id: "hero",
    name: "单图主视觉",
    minImages: 1,
    maxImages: 1,
    note: "一张照片占据视觉中心",
  },
  {
    id: "story",
    name: "单图图文",
    minImages: 1,
    maxImages: 1,
    note: "照片与长文字平衡",
  },
  {
    id: "split",
    name: "双图分栏",
    minImages: 2,
    maxImages: 2,
    note: "两张照片并置叙事",
  },
  {
    id: "trio",
    name: "三图错落",
    minImages: 3,
    maxImages: 3,
    note: "大小错落更有呼吸感",
  },
  {
    id: "grid",
    name: "四图网格",
    minImages: 4,
    maxImages: 4,
    note: "克制整齐的四格记录",
  },
  {
    id: "collage",
    name: "拼贴",
    minImages: 5,
    maxImages: 6,
    note: "适合丰富的一天",
  },
  {
    id: "contact",
    name: "照片墙",
    minImages: 7,
    maxImages: 9,
    note: "旅行与活动的密集回忆",
  },
];

const uid = () => crypto.randomUUID();
const image = (
  assetId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
  frame: ImageElement["frame"] = "none",
  rotation = 0,
): ImageElement => ({
  id: uid(),
  kind: "image",
  assetId,
  x,
  y,
  width,
  height,
  rotation,
  zIndex,
  cropX: 0.5,
  cropY: 0.5,
  filter: "original",
  frame,
  shadow: 1,
});

const slotsFor = (
  layoutId: LayoutId,
  count: number,
): Array<[number, number, number, number, number]> => {
  if (!count) return [];
  if (layoutId === "hero") return [[0.08, 0.13, 0.84, 0.62, -1.2]];
  if (layoutId === "story") return [[0.08, 0.1, 0.84, 0.48, 0]];
  if (layoutId === "split")
    return [
      [0.07, 0.14, 0.4, 0.57, -1.4],
      [0.53, 0.2, 0.4, 0.57, 1.2],
    ];
  if (layoutId === "trio")
    return [
      [0.06, 0.1, 0.55, 0.44, -1],
      [0.58, 0.16, 0.34, 0.3, 2],
      [0.36, 0.54, 0.55, 0.3, -1.5],
    ];
  if (layoutId === "grid")
    return [
      [0.07, 0.12, 0.4, 0.3, 0],
      [0.53, 0.12, 0.4, 0.3, 0],
      [0.07, 0.48, 0.4, 0.3, 0],
      [0.53, 0.48, 0.4, 0.3, 0],
    ];
  if (layoutId === "collage")
    return Array.from({ length: count }, (_, i) => {
      const base: Array<[number, number, number, number, number]> = [
        [0.05, 0.12, 0.42, 0.3, -2],
        [0.5, 0.09, 0.44, 0.38, 1.5],
        [0.08, 0.47, 0.34, 0.3, 2],
        [0.45, 0.49, 0.48, 0.28, -1],
        [0.18, 0.77, 0.3, 0.16, -2],
        [0.56, 0.79, 0.3, 0.14, 2],
      ];
      return base[i];
    });
  const cols = 3;
  const rows = Math.ceil(count / cols);
  const gap = 0.025;
  const w = (0.86 - gap * (cols - 1)) / cols;
  const h = Math.min(0.2, (0.72 - gap * (rows - 1)) / rows);
  return Array.from({ length: count }, (_, i) => [
    0.07 + (i % cols) * (w + gap),
    0.16 + Math.floor(i / cols) * (h + gap),
    w,
    h,
    0,
  ]);
};

export function compatibleLayouts(imageCount: number) {
  return LAYOUTS.filter(
    (layout) =>
      imageCount >= layout.minImages && imageCount <= layout.maxImages,
  );
}

export function applyLayout(
  page: JournalPage,
  layoutId: LayoutId,
  themeId: ThemeId,
): PageElement[] {
  const theme = THEMES.find((item) => item.id === themeId)!;
  const images = page.elements
    .filter((element): element is ImageElement => element.kind === "image")
    .slice(0, 9);
  const slots = slotsFor(layoutId, images.length);
  const frame =
    themeId === "polaroid"
      ? "polaroid"
      : themeId === "cute"
        ? "rounded"
        : themeId === "vintage"
          ? "torn"
          : "none";
  const laidImages = images.map((item, index) => {
    const [x, y, width, height, rotation] = slots[index] ?? [
      0.1, 0.1, 0.8, 0.5, 0,
    ];
    return {
      ...image(item.assetId, x, y, width, height, index + 1, frame, rotation),
      filter: item.filter,
      cropX: item.cropX,
      cropY: item.cropY,
    };
  });
  const textOnly = layoutId === "text";
  const titleY = textOnly ? 0.18 : layoutId === "hero" ? 0.08 : 0.06;
  const bodyY = textOnly ? 0.32 : layoutId === "story" ? 0.64 : 0.84;
  const title = page.elements.find((item) => item.kind === "title");
  const body = page.elements.find((item) => item.kind === "body");
  return [
    ...laidImages,
    {
      id: title?.id ?? uid(),
      kind: "title",
      text: page.title,
      x: 0.08,
      y: titleY,
      width: 0.84,
      height: 0.1,
      rotation: 0,
      zIndex: 30,
      color: theme.ink,
      fontFamily: theme.headingFont,
      fontSize: textOnly ? 48 : 34,
      fontWeight: 600,
      align: themeId === "magazine" ? "left" : "center",
    },
    {
      id: body?.id ?? uid(),
      kind: "body",
      text: page.body,
      x: 0.09,
      y: bodyY,
      width: 0.82,
      height: textOnly ? 0.5 : 0.12,
      rotation: 0,
      zIndex: 31,
      color: theme.ink,
      fontFamily: theme.bodyFont,
      fontSize: textOnly ? 20 : 15,
      fontWeight: 400,
      align: "left",
    },
  ];
}
