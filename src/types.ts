export type ThemeId = "japanese" | "vintage" | "cute" | "magazine" | "polaroid";
export type LayoutId =
  "text" | "hero" | "story" | "split" | "trio" | "grid" | "collage" | "contact";
export type ElementKind = "image" | "title" | "body" | "sticker";
export type ImageFilter =
  "original" | "warm" | "faded" | "cream" | "mono" | "cool";
export type ImageFrame = "none" | "rounded" | "torn" | "polaroid";

export interface Notebook {
  id: string;
  name: string;
  color: string;
  pageOrder: string[];
  createdAt: number;
  updatedAt: number;
}

export interface JournalPage {
  id: string;
  notebookId: string;
  date: string;
  dayIndex: number;
  title: string;
  body: string;
  themeId: ThemeId;
  layoutId: LayoutId;
  elements: PageElement[];
  createdAt: number;
  updatedAt: number;
}

export interface BaseElement {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  assetId: string;
  cropX: number;
  cropY: number;
  filter: ImageFilter;
  frame: ImageFrame;
  shadow: 0 | 1 | 2 | 3;
}

export interface TextElement extends BaseElement {
  kind: "title" | "body";
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center" | "right";
}

export interface StickerElement extends BaseElement {
  kind: "sticker";
  text: string;
  fontSize: number;
}

export type PageElement = ImageElement | TextElement | StickerElement;

export interface Asset {
  id: string;
  notebookId: string;
  kind: "photo" | "sticker";
  name: string;
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  mimeType: string;
  createdAt: number;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  headingFont: string;
  bodyFont: string;
  texture: "plain" | "grid" | "fleck" | "dots" | "photo";
}

export interface LayoutDefinition {
  id: LayoutId;
  name: string;
  minImages: number;
  maxImages: number;
  note: string;
}

export interface JournalDraftInput {
  date: string;
  imageCount: number;
  notes?: string;
}
export interface JournalDraft {
  title: string;
  body: string;
}
export interface RewriteInput {
  text: string;
  tone: string;
}
export interface LayoutSuggestionInput {
  imageCount: number;
  orientations: Array<"portrait" | "landscape" | "square">;
}
export interface LayoutSuggestion {
  layoutId: LayoutId;
  reason: string;
}

export interface AiProvider {
  generateDraft(input: JournalDraftInput): Promise<JournalDraft>;
  rewrite(input: RewriteInput): Promise<string>;
  suggestLayout(input: LayoutSuggestionInput): Promise<LayoutSuggestion[]>;
}

export interface BackgroundRemovalProvider {
  removeBackground(image: Blob): Promise<Blob>;
}
