import Konva from "konva";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Group,
  Image as KImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from "react-konva";
import type {
  Asset,
  ImageElement,
  JournalPage,
  PageElement,
  TextElement,
} from "./types";
import { THEMES } from "./templates";
import { exportPixelRatio, PAGE_H, PAGE_W } from "./canvas-geometry";

export { PAGE_H, PAGE_W } from "./canvas-geometry";

export interface CanvasHandle {
  exportImage(type: "png" | "jpeg"): string;
}

interface Props {
  page: JournalPage;
  assets: Asset[];
  selectedId: string | null;
  editable?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  onSelect(id: string | null): void;
  onChange(element: PageElement): void;
}

function useBlobImage(blob?: Blob) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!blob) {
      setImage(undefined);
      return;
    }
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return image;
}

function filterConfig(filter: ImageElement["filter"]) {
  if (filter === "warm")
    return {
      filters: [Konva.Filters.HSL, Konva.Filters.Contrast],
      hue: 8,
      saturation: 0.15,
      luminance: 0.04,
      contrast: 5,
    };
  if (filter === "faded")
    return {
      filters: [Konva.Filters.HSL, Konva.Filters.Contrast],
      saturation: -0.25,
      luminance: 0.08,
      contrast: -12,
    };
  if (filter === "cream")
    return {
      filters: [Konva.Filters.HSL],
      hue: 10,
      saturation: -0.12,
      luminance: 0.12,
    };
  if (filter === "mono")
    return {
      filters: [Konva.Filters.Grayscale, Konva.Filters.Contrast],
      contrast: 8,
    };
  if (filter === "cool")
    return {
      filters: [Konva.Filters.HSL],
      hue: 205,
      saturation: -0.08,
      luminance: 0.03,
    };
  return { filters: [] as Array<(imageData: ImageData) => void> };
}

function ImageNode({
  element,
  asset,
  selected,
  editable,
  onSelect,
  onChange,
}: {
  element: ImageElement;
  asset?: Asset;
  selected: boolean;
  editable: boolean;
  onSelect(): void;
  onChange(next: ImageElement): void;
}) {
  const image = useBlobImage(asset?.blob);
  const imageRef = useRef<Konva.Image>(null);
  const transformer = useRef<Konva.Transformer>(null);
  const x = element.x * PAGE_W;
  const y = element.y * PAGE_H;
  const width = element.width * PAGE_W;
  const height = element.height * PAGE_H;
  useEffect(() => {
    if (selected && editable && transformer.current && imageRef.current) {
      transformer.current.nodes([imageRef.current]);
      transformer.current.getLayer()?.batchDraw();
    }
  }, [selected, editable]);
  useEffect(() => {
    if (imageRef.current && element.filter !== "original")
      imageRef.current.cache();
    else imageRef.current?.clearCache();
  }, [image, element.filter, width, height]);
  if (!image)
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#ded9cc"
        opacity={0.7}
      />
    );
  const scale = Math.max(width / image.width, height / image.height);
  const cropW = width / scale;
  const cropH = height / scale;
  const cropX = Math.max(
    0,
    Math.min(image.width - cropW, (image.width - cropW) * element.cropX),
  );
  const cropY = Math.max(
    0,
    Math.min(image.height - cropH, (image.height - cropH) * element.cropY),
  );
  const pad =
    element.frame === "polaroid" ? 13 : element.frame === "torn" ? 7 : 0;
  const radius = element.frame === "rounded" ? 22 : 0;
  const shadowBlur = [0, 5, 12, 22][element.shadow];
  const shadowOpacity = [0, 0.12, 0.2, 0.28][element.shadow];
  const cfg = filterConfig(element.filter);
  const backingPoints = [
    0,
    -3,
    width * 0.16,
    2,
    width * 0.34,
    -2,
    width * 0.52,
    3,
    width * 0.72,
    -1,
    width,
    2,
    width + 2,
    height * 0.28,
    width - 2,
    height * 0.55,
    width + 3,
    height,
    width * 0.76,
    height - 2,
    width * 0.5,
    height + 3,
    width * 0.2,
    height - 2,
    0,
    height + 2,
    -2,
    height * 0.6,
    2,
    height * 0.3,
  ];
  return (
    <>
      <Group
        x={x}
        y={y}
        rotation={element.rotation}
        draggable={editable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({
            ...element,
            x: e.target.x() / PAGE_W,
            y: e.target.y() / PAGE_H,
          })
        }
      >
        {element.frame === "torn" && (
          <Line
            points={backingPoints}
            closed
            fill="#fffdf8"
            shadowColor="#33251c"
            shadowBlur={shadowBlur}
            shadowOpacity={shadowOpacity}
          />
        )}
        {element.frame === "polaroid" && (
          <Rect
            x={-pad}
            y={-pad}
            width={width + pad * 2}
            height={height + pad * 3.3}
            fill="#fffdf8"
            shadowColor="#33251c"
            shadowBlur={shadowBlur}
            shadowOpacity={shadowOpacity}
          />
        )}
        {element.frame !== "torn" &&
          element.frame !== "polaroid" &&
          element.shadow > 0 && (
            <Rect
              width={width}
              height={height}
              cornerRadius={radius}
              fill="#fff"
              shadowColor="#33251c"
              shadowBlur={shadowBlur}
              shadowOpacity={shadowOpacity}
            />
          )}
        <KImage
          ref={imageRef}
          image={image}
          width={width}
          height={height}
          crop={{ x: cropX, y: cropY, width: cropW, height: cropH }}
          cornerRadius={radius}
          {...cfg}
          onTransformEnd={() => {
            const node = imageRef.current!;
            const nextW = Math.max(50, node.width() * node.scaleX());
            const nextH = Math.max(50, node.height() * node.scaleY());
            node.scaleX(1);
            node.scaleY(1);
            onChange({
              ...element,
              width: nextW / PAGE_W,
              height: nextH / PAGE_H,
              rotation: node.getAbsoluteRotation(),
              x: node.getParent()!.x() / PAGE_W,
              y: node.getParent()!.y() / PAGE_H,
            });
          }}
        />
      </Group>
      {selected && editable && (
        <Transformer
          ref={transformer}
          rotateEnabled
          keepRatio
          borderStroke="#e35342"
          anchorStroke="#e35342"
          anchorFill="#fffaf2"
          anchorSize={12}
        />
      )}
    </>
  );
}

function TextNode({
  element,
  selected,
  editable,
  onSelect,
  onChange,
}: {
  element: TextElement;
  selected: boolean;
  editable: boolean;
  onSelect(): void;
  onChange(next: TextElement): void;
}) {
  const ref = useRef<Konva.Text>(null);
  const tr = useRef<Konva.Transformer>(null);
  useEffect(() => {
    if (selected && editable && ref.current && tr.current) {
      tr.current.nodes([ref.current]);
      tr.current.getLayer()?.batchDraw();
    }
  }, [selected, editable]);
  return (
    <>
      <Text
        ref={ref}
        x={element.x * PAGE_W}
        y={element.y * PAGE_H}
        width={element.width * PAGE_W}
        height={element.height * PAGE_H}
        text={element.text || (element.kind === "title" ? "标题" : "正文")}
        fill={element.color}
        fontFamily={element.fontFamily}
        fontSize={element.fontSize}
        fontStyle={element.fontWeight >= 600 ? "bold" : "normal"}
        align={element.align}
        lineHeight={element.kind === "body" ? 1.6 : 1.2}
        rotation={element.rotation}
        draggable={editable}
        opacity={element.text ? 1 : 0.35}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({
            ...element,
            x: e.target.x() / PAGE_W,
            y: e.target.y() / PAGE_H,
          })
        }
        onTransformEnd={() => {
          const node = ref.current!;
          const nextW = Math.max(80, node.width() * node.scaleX());
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...element,
            x: node.x() / PAGE_W,
            y: node.y() / PAGE_H,
            width: nextW / PAGE_W,
            rotation: node.rotation(),
            fontSize: Math.max(9, element.fontSize * scaleY),
          });
        }}
      />
      {selected && editable && (
        <Transformer
          ref={tr}
          enabledAnchors={["middle-left", "middle-right"]}
          borderStroke="#e35342"
          anchorStroke="#e35342"
          anchorFill="#fffaf2"
          anchorSize={12}
        />
      )}
    </>
  );
}

function StickerNode({
  element,
  selected,
  editable,
  onSelect,
  onChange,
}: {
  element: Extract<PageElement, { kind: "sticker" }>;
  selected: boolean;
  editable: boolean;
  onSelect(): void;
  onChange(next: Extract<PageElement, { kind: "sticker" }>): void;
}) {
  const ref = useRef<Konva.Text>(null);
  const tr = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selected && editable && ref.current && tr.current) {
      tr.current.nodes([ref.current]);
      tr.current.getLayer()?.batchDraw();
    }
  }, [selected, editable]);

  return (
    <>
      <Text
        ref={ref}
        text={element.text}
        x={element.x * PAGE_W}
        y={element.y * PAGE_H}
        width={element.width * PAGE_W}
        height={element.height * PAGE_H}
        fontSize={element.fontSize}
        rotation={element.rotation}
        draggable={editable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({
            ...element,
            x: e.target.x() / PAGE_W,
            y: e.target.y() / PAGE_H,
          })
        }
        onTransformEnd={() => {
          const node = ref.current!;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...element,
            x: node.x() / PAGE_W,
            y: node.y() / PAGE_H,
            width: Math.max(36, node.width() * scaleX) / PAGE_W,
            height: Math.max(36, node.height() * scaleY) / PAGE_H,
            rotation: node.rotation(),
            fontSize: Math.max(12, element.fontSize * scaleY),
          });
        }}
      />
      {selected && editable && (
        <Transformer
          ref={tr}
          borderStroke="#e35342"
          anchorStroke="#e35342"
          anchorFill="#fffaf2"
          anchorSize={12}
          keepRatio
        />
      )}
    </>
  );
}

export const JournalCanvas = forwardRef<CanvasHandle, Props>(
  function JournalCanvas(
    {
      page,
      assets,
      selectedId,
      editable = true,
      maxWidth = 760,
      maxHeight = 820,
      onSelect,
      onChange,
    },
    ref,
  ) {
    const stage = useRef<Konva.Stage>(null);
    const theme = THEMES.find((item) => item.id === page.themeId)!;
    const scale = Math.min(maxWidth / PAGE_W, maxHeight / PAGE_H);
    const assetMap = useMemo(
      () => new Map(assets.map((a) => [a.id, a])),
      [assets],
    );
    useImperativeHandle(ref, () => ({
      exportImage(type) {
        return stage.current!.toDataURL({
          mimeType: type === "png" ? "image/png" : "image/jpeg",
          quality: 0.92,
          pixelRatio: exportPixelRatio(scale),
        });
      },
    }));
    const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    return (
      <Stage
        ref={stage}
        width={PAGE_W * scale}
        height={PAGE_H * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
        onTouchStart={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
      >
        <Layer>
          <Rect
            width={PAGE_W}
            height={PAGE_H}
            fill={theme.paper}
            shadowColor="#1b130c"
            shadowBlur={editable ? 24 : 0}
            shadowOpacity={editable ? 0.16 : 0}
          />
          {theme.texture === "grid" &&
            Array.from({ length: 16 }, (_, i) => (
              <Line
                key={`v${i}`}
                points={[i * 50, 0, i * 50, PAGE_H]}
                stroke={theme.soft}
                opacity={0.16}
                strokeWidth={1}
              />
            ))}
          {theme.texture === "grid" &&
            Array.from({ length: 22 }, (_, i) => (
              <Line
                key={`h${i}`}
                points={[0, i * 50, PAGE_W, i * 50]}
                stroke={theme.soft}
                opacity={0.16}
                strokeWidth={1}
              />
            ))}
          {theme.texture === "dots" &&
            Array.from({ length: 90 }, (_, i) => (
              <Rect
                key={i}
                x={(i % 10) * 70 + 24}
                y={Math.floor(i / 10) * 110 + 28}
                width={3}
                height={3}
                fill={theme.soft}
                opacity={0.35}
                cornerRadius={2}
              />
            ))}
          {theme.texture === "fleck" &&
            Array.from({ length: 45 }, (_, i) => (
              <Rect
                key={i}
                x={(i * 83) % PAGE_W}
                y={(i * 137) % PAGE_H}
                width={(i % 3) + 1}
                height={(i % 2) + 1}
                fill={theme.ink}
                opacity={0.06}
                rotation={i * 17}
              />
            ))}
          <Text
            text={`${page.date.replaceAll("-", " / ")}  ·  ${String(page.dayIndex).padStart(2, "0")}`}
            x={38}
            y={34}
            width={PAGE_W - 76}
            fontFamily="monospace"
            fontSize={11}
            fill={theme.ink}
            opacity={0.55}
            letterSpacing={1.5}
          />
          {sorted.map((element) =>
            element.kind === "image" ? (
              <ImageNode
                key={element.id}
                element={element}
                asset={assetMap.get(element.assetId)}
                selected={selectedId === element.id}
                editable={editable}
                onSelect={() => onSelect(element.id)}
                onChange={onChange}
              />
            ) : element.kind === "sticker" ? (
              <StickerNode
                key={element.id}
                element={element}
                selected={selectedId === element.id}
                editable={editable}
                onSelect={() => onSelect(element.id)}
                onChange={onChange}
              />
            ) : (
              <TextNode
                key={element.id}
                element={element}
                selected={selectedId === element.id}
                editable={editable}
                onSelect={() => onSelect(element.id)}
                onChange={onChange}
              />
            ),
          )}
          <Text
            text="POPPY JOURNAL"
            x={38}
            y={PAGE_H - 34}
            width={PAGE_W - 76}
            align="right"
            fontFamily="monospace"
            fontSize={9}
            fill={theme.ink}
            opacity={0.38}
            letterSpacing={2}
          />
        </Layer>
      </Stage>
    );
  },
);
