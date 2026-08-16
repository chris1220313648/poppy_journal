import { useLiveQuery } from "dexie-react-hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "./db";
import { dataUrlToBlob, downloadBlob, prepareAsset } from "./image-utils";
import { JournalCanvas, type CanvasHandle } from "./JournalCanvas";
import { applyLayout, compatibleLayouts, LAYOUTS, THEMES } from "./templates";
import type {
  ImageElement,
  JournalPage,
  Notebook,
  PageElement,
  StickerElement,
  TextElement,
} from "./types";

interface Props {
  notebook: Notebook;
  page: JournalPage;
  onBack(): void;
}
const BUILTIN_STICKERS = [
  "✿",
  "☻",
  "♡",
  "★",
  "☁",
  "☕",
  "♫",
  "☺",
  "❀",
  "→",
  "GOOD DAY",
  "记住今天",
];
const FILTERS: ImageElement["filter"][] = [
  "original",
  "warm",
  "faded",
  "cream",
  "mono",
  "cool",
];
const FILTER_NAMES = ["原图", "暖调", "褪色", "奶油", "黑白", "冷调"];
const FRAMES: ImageElement["frame"][] = ["none", "rounded", "torn", "polaroid"];
const FRAME_NAMES = ["无边框", "圆角", "撕纸", "拍立得"];

export default function Editor({ notebook, page: initial, onBack }: Props) {
  const assets = useLiveQuery(
    () => db.assets.where("notebookId").equals(notebook.id).toArray(),
    [notebook.id],
    [],
  );
  const [page, setPage] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"assets" | "templates" | "text" | "stickers">(
    "assets",
  );
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [canvasLimit, setCanvasLimit] = useState({ width: 760, height: 820 });
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);
  const past = useRef<JournalPage[]>([]);
  const future = useRef<JournalPage[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const stickerInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const imageCount = page.elements.filter(
    (item) => item.kind === "image",
  ).length;
  const selected = page.elements.find((item) => item.id === selectedId);

  useEffect(() => {
    const timer = setTimeout(
      () => db.pages.put({ ...page, updatedAt: Date.now() }),
      500,
    );
    return () => clearTimeout(timer);
  }, [page]);
  useEffect(() => {
    const measure = () =>
      setCanvasLimit({
        width: Math.max(
          300,
          Math.min(
            760,
            window.innerWidth < 700
              ? window.innerWidth - 24
              : window.innerWidth - 560,
          ),
        ),
        height: Math.max(
          460,
          window.innerHeight - (window.innerWidth < 700 ? 150 : 130),
        ),
      });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  useEffect(() => {
    const flush = () => db.pages.put({ ...page, updatedAt: Date.now() });
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [page]);
  const commit = (next: JournalPage) => {
    past.current = [...past.current.slice(-49), structuredClone(page)];
    future.current = [];
    setPage(next);
  };
  const updateElement = (element: PageElement) =>
    setPage((current) => ({
      ...current,
      elements: current.elements.map((item) =>
        item.id === element.id ? element : item,
      ),
      updatedAt: Date.now(),
    }));
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(structuredClone(page));
    setPage(prev);
    setSelectedId(null);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(structuredClone(page));
    setPage(next);
    setSelectedId(null);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        duplicateSelected();
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selected &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const syncText = (kind: "title" | "body", text: string) => {
    const next = {
      ...page,
      [kind]: text,
      elements: page.elements.map((item) =>
        item.kind === kind ? { ...item, text } : item,
      ),
    };
    commit(next);
  };
  const chooseTheme = (themeId: JournalPage["themeId"]) =>
    commit({
      ...page,
      themeId,
      elements: applyLayout(page, page.layoutId, themeId),
    });
  const chooseLayout = (layoutId: JournalPage["layoutId"]) =>
    commit({
      ...page,
      layoutId,
      elements: applyLayout(page, layoutId, page.themeId),
    });
  const addSticker = (text: string) => {
    const element: StickerElement = {
      id: crypto.randomUUID(),
      kind: "sticker",
      text,
      x: 0.72,
      y: 0.12,
      width: 0.18,
      height: 0.1,
      rotation: -5,
      zIndex: 60,
      fontSize: text.length > 3 ? 18 : 42,
    };
    commit({ ...page, elements: [...page.elements, element] });
    setSelectedId(element.id);
  };
  const addAssetToPage = (assetId: string) => {
    if (imageCount >= 9) {
      setNotice("一页最多放 9 张照片");
      return;
    }
    const img: ImageElement = {
      id: crypto.randomUUID(),
      kind: "image",
      assetId,
      x: 0.1,
      y: 0.15,
      width: 0.8,
      height: 0.5,
      rotation: 0,
      zIndex: imageCount + 1,
      cropX: 0.5,
      cropY: 0.5,
      filter: "original",
      frame: "none",
      shadow: 1,
    };
    const withImg = { ...page, elements: [...page.elements, img] };
    const count = imageCount + 1;
    const layout = compatibleLayouts(count)[0]?.id ?? "contact";
    commit({
      ...withImg,
      layoutId: layout,
      elements: applyLayout(withImg, layout, page.themeId),
    });
  };
  const upload = async (
    files: FileList | null,
    kind: "photo" | "sticker" = "photo",
  ) => {
    if (!files) return;
    try {
      const created = [];
      for (const file of Array.from(files)) {
        const asset = await prepareAsset(file, notebook.id, kind);
        await db.assets.add(asset);
        created.push(asset);
      }
      if (kind === "photo" && created.length) {
        const room = Math.max(0, 9 - imageCount);
        const additions = created
          .slice(0, room)
          .map((asset, index): ImageElement => ({
            id: crypto.randomUUID(),
            kind: "image",
            assetId: asset.id,
            x: 0.1,
            y: 0.15,
            width: 0.8,
            height: 0.5,
            rotation: 0,
            zIndex: imageCount + index + 1,
            cropX: 0.5,
            cropY: 0.5,
            filter: "original",
            frame: "none",
            shadow: 1,
          }));
        const withImages = {
          ...page,
          elements: [...page.elements, ...additions],
        };
        const count = imageCount + additions.length;
        const layout = compatibleLayouts(count)[0]?.id ?? "contact";
        commit({
          ...withImages,
          layoutId: layout,
          elements: applyLayout(withImages, layout, page.themeId),
        });
        if (created.length > room)
          setNotice("这一页已放满 9 张，其余照片仍保存在素材库");
      }
      setNotice("素材已保存在当前设备");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "图片导入失败");
    }
  };
  const replaceSelected = async (file?: File) => {
    if (!file || selected?.kind !== "image") return;
    try {
      const asset = await prepareAsset(file, notebook.id, "photo");
      await db.assets.add(asset);
      updateElement({ ...selected, assetId: asset.id });
      setNotice("图片已替换，原素材仍保留在素材库");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "替换失败");
    }
  };
  const deleteSelected = () => {
    if (!selected) return;
    commit({
      ...page,
      elements: page.elements.filter((item) => item.id !== selected.id),
    });
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy = {
      ...selected,
      id: crypto.randomUUID(),
      x: Math.min(0.88, selected.x + 0.035),
      y: Math.min(0.9, selected.y + 0.035),
      zIndex: Math.max(...page.elements.map((i) => i.zIndex), 0) + 1,
    };
    commit({ ...page, elements: [...page.elements, copy] });
    setSelectedId(copy.id);
  };
  const layer = (dir: number) => {
    if (!selected) return;
    updateElement({
      ...selected,
      zIndex: selected.zIndex + dir,
    } as PageElement);
  };
  const exportImage = (type: "png" | "jpeg") => {
    const data = canvasRef.current?.exportImage(type);
    if (!data) return;
    downloadBlob(
      dataUrlToBlob(data),
      `${notebook.name}_${page.date}_${String(page.dayIndex).padStart(2, "0")}.${type === "png" ? "png" : "jpg"}`,
    );
    setNotice(`${type === "png" ? "PNG" : "JPG"} 已生成并开始下载`);
  };
  const layoutOptions = compatibleLayouts(imageCount);
  const textElements = useMemo(
    () =>
      page.elements.filter(
        (e): e is TextElement => e.kind === "title" || e.kind === "body",
      ),
    [page.elements],
  );

  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <button
          className="icon-button"
          onClick={onBack}
          aria-label="返回工作台"
        >
          ←
        </button>
        <div>
          <span className="eyebrow">{notebook.name}</span>
          <strong>
            {page.date} · PAGE {String(page.dayIndex).padStart(2, "0")}
          </strong>
        </div>
        <div className="top-actions">
          <button onClick={undo} disabled={!past.current.length}>
            撤销
          </button>
          <button onClick={redo} disabled={!future.current.length}>
            重做
          </button>
          <button onClick={() => setPreviewOpen(true)}>预览</button>
          <button onClick={() => exportImage("png")} className="primary-small">
            PNG
          </button>
          <button onClick={() => exportImage("jpeg")} className="primary-small">
            JPG
          </button>
        </div>
      </header>
      <main className="editor-grid">
        <aside
          className={`editor-panel left-panel ${mobilePanelOpen ? "mobile-open" : ""}`}
        >
          <button
            className="mobile-panel-close"
            onClick={() => setMobilePanelOpen(false)}
            aria-label="收起面板"
          >
            ×
          </button>
          <nav className="tool-tabs">
            {(
              [
                ["assets", "素材"],
                ["templates", "排版"],
                ["text", "文字"],
                ["stickers", "贴纸"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="panel-scroll">
            {tab === "assets" && (
              <>
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">ASSET LIBRARY</span>
                    <h2>本本素材</h2>
                  </div>
                  <button
                    className="plus-button"
                    onClick={() => fileInput.current?.click()}
                  >
                    ＋
                  </button>
                </div>
                <input
                  ref={fileInput}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => upload(e.target.files)}
                />
                <input
                  ref={replaceInput}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    replaceSelected(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {selected?.kind === "image" && (
                  <div className="mobile-image-controls">
                    <button
                      className="secondary full"
                      onClick={() => replaceInput.current?.click()}
                    >
                      替换选中图片
                    </button>
                    <ImageControls
                      element={selected}
                      onChange={updateElement}
                    />
                  </div>
                )}
                <div className="asset-grid">
                  {assets
                    .filter((a) => a.kind === "photo")
                    .map((asset) => (
                      <AssetThumb
                        key={asset.id}
                        asset={asset}
                        onClick={() => addAssetToPage(asset.id)}
                      />
                    ))}
                  {!assets.length && (
                    <button
                      className="empty-asset"
                      onClick={() => fileInput.current?.click()}
                    >
                      放进第一张照片
                    </button>
                  )}
                </div>
              </>
            )}
            {tab === "templates" && (
              <>
                <span className="eyebrow">01 · CHOOSE A MOOD</span>
                <div className="theme-list">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      className={page.themeId === theme.id ? "selected" : ""}
                      style={
                        {
                          "--swatch": theme.paper,
                          "--accent": theme.accent,
                        } as React.CSSProperties
                      }
                      onClick={() => chooseTheme(theme.id)}
                    >
                      <i />
                      {theme.name}
                    </button>
                  ))}
                </div>
                <span className="eyebrow section-label">
                  02 · CHOOSE A LAYOUT
                </span>
                <div className="layout-list">
                  {layoutOptions.map((layout) => (
                    <button
                      key={layout.id}
                      className={page.layoutId === layout.id ? "selected" : ""}
                      onClick={() => chooseLayout(layout.id)}
                    >
                      <b>{layout.name}</b>
                      <small>{layout.note}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            {tab === "text" && (
              <>
                <label className="field-label">
                  标题
                  <textarea
                    value={page.title}
                    onChange={(e) => syncText("title", e.target.value)}
                    rows={2}
                  />
                </label>
                <label className="field-label">
                  正文
                  <textarea
                    value={page.body}
                    onChange={(e) => syncText("body", e.target.value)}
                    rows={8}
                  />
                </label>
                <p className="panel-hint">
                  电脑端可以直接拖动标题和正文，调整它们在纸上的位置。
                </p>
              </>
            )}
            {tab === "stickers" && (
              <>
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">STICKER DRAWER</span>
                    <h2>一点小心情</h2>
                  </div>
                  <button
                    className="plus-button"
                    onClick={() => stickerInput.current?.click()}
                  >
                    ＋
                  </button>
                </div>
                <input
                  ref={stickerInput}
                  hidden
                  type="file"
                  accept="image/png,image/webp"
                  onChange={async (e) => {
                    await upload(e.target.files, "sticker");
                    e.target.value = "";
                  }}
                />
                <div className="sticker-grid">
                  {BUILTIN_STICKERS.map((s) => (
                    <button key={s} onClick={() => addSticker(s)}>
                      {s}
                    </button>
                  ))}
                  {assets
                    .filter((a) => a.kind === "sticker")
                    .map((a) => (
                      <AssetThumb
                        key={a.id}
                        asset={a}
                        onClick={() => addAssetToPage(a.id)}
                      />
                    ))}
                </div>
              </>
            )}
          </div>
        </aside>
        <section className="canvas-workspace">
          <div className="canvas-stage">
            <JournalCanvas
              ref={canvasRef}
              page={page}
              assets={assets}
              selectedId={selectedId}
              maxWidth={canvasLimit.width}
              maxHeight={canvasLimit.height}
              onSelect={setSelectedId}
              onChange={updateElement}
            />
          </div>
          <div className="mobile-tools">
            <button
              onClick={() => {
                setTab("assets");
                setMobilePanelOpen(true);
              }}
            >
              照片
            </button>
            <button
              onClick={() => {
                setTab("text");
                setMobilePanelOpen(true);
              }}
            >
              文字
            </button>
            <button
              onClick={() => {
                setTab("templates");
                setMobilePanelOpen(true);
              }}
            >
              排版
            </button>
            <button
              onClick={() => {
                setTab("stickers");
                setMobilePanelOpen(true);
              }}
            >
              贴纸
            </button>
          </div>
        </section>
        <aside className="editor-panel right-panel">
          <span className="eyebrow">DETAILS</span>
          <h2>
            {selected
              ? selected.kind === "image"
                ? "图片设置"
                : selected.kind === "sticker"
                  ? "贴纸设置"
                  : "文字设置"
              : "选择一个元素"}
          </h2>
          {!selected && (
            <p className="panel-hint">
              点一下画布里的图片、文字或贴纸，在这里做精细调整。
            </p>
          )}
          {selected?.kind === "image" && (
            <ImageControls element={selected} onChange={updateElement} />
          )}{" "}
          {(selected?.kind === "title" || selected?.kind === "body") && (
            <TextControls element={selected} onChange={updateElement} />
          )}{" "}
          {selected && (
            <div className="object-actions">
              <button onClick={duplicateSelected}>复制</button>
              <button onClick={() => layer(-1)}>下移</button>
              <button onClick={() => layer(1)}>上移</button>
              <button className="danger" onClick={deleteSelected}>
                删除
              </button>
            </div>
          )}
          <div className="save-mark">
            <i />
            只保存在这台设备
            <br />
            <small>所有改动都会自动保存</small>
          </div>
        </aside>
      </main>
      {notice && (
        <button className="toast" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}
      {previewOpen && (
        <div className="preview-backdrop" onClick={() => setPreviewOpen(false)}>
          <button
            className="preview-close"
            onClick={() => setPreviewOpen(false)}
            aria-label="关闭预览"
          >
            ×
          </button>
          <div
            className="preview-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <JournalCanvas
              page={page}
              assets={assets}
              selectedId={null}
              editable={false}
              maxWidth={760}
              maxHeight={820}
              onSelect={() => undefined}
              onChange={() => undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssetThumb({
  asset,
  onClick,
}: {
  asset: import("./types").Asset;
  onClick(): void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(asset.thumbnail);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [asset]);
  return (
    <button className="asset-thumb" onClick={onClick}>
      {url && <img src={url} alt={asset.name} />}
      <span>＋</span>
    </button>
  );
}
function ImageControls({
  element,
  onChange,
}: {
  element: ImageElement;
  onChange(e: PageElement): void;
}) {
  return (
    <div className="control-stack">
      <label>
        滤镜
        <select
          value={element.filter}
          onChange={(e) =>
            onChange({
              ...element,
              filter: e.target.value as ImageElement["filter"],
            })
          }
        >
          {FILTERS.map((f, i) => (
            <option key={f} value={f}>
              {FILTER_NAMES[i]}
            </option>
          ))}
        </select>
      </label>
      <label>
        边框
        <select
          value={element.frame}
          onChange={(e) =>
            onChange({
              ...element,
              frame: e.target.value as ImageElement["frame"],
            })
          }
        >
          {FRAMES.map((f, i) => (
            <option key={f} value={f}>
              {FRAME_NAMES[i]}
            </option>
          ))}
        </select>
      </label>
      <label>
        阴影
        <input
          type="range"
          min="0"
          max="3"
          value={element.shadow}
          onChange={(e) =>
            onChange({
              ...element,
              shadow: Number(e.target.value) as 0 | 1 | 2 | 3,
            })
          }
        />
      </label>
      <label>
        水平焦点
        <input
          type="range"
          min="0"
          max="1"
          step=".01"
          value={element.cropX}
          onChange={(e) =>
            onChange({ ...element, cropX: Number(e.target.value) })
          }
        />
      </label>
      <label>
        垂直焦点
        <input
          type="range"
          min="0"
          max="1"
          step=".01"
          value={element.cropY}
          onChange={(e) =>
            onChange({ ...element, cropY: Number(e.target.value) })
          }
        />
      </label>
    </div>
  );
}
function TextControls({
  element,
  onChange,
}: {
  element: TextElement;
  onChange(e: PageElement): void;
}) {
  return (
    <div className="control-stack">
      <label>
        字号
        <input
          type="range"
          min="10"
          max="72"
          value={element.fontSize}
          onChange={(e) =>
            onChange({ ...element, fontSize: Number(e.target.value) })
          }
        />
      </label>
      <label>
        颜色
        <input
          type="color"
          value={element.color}
          onChange={(e) => onChange({ ...element, color: e.target.value })}
        />
      </label>
      <label>
        对齐
        <select
          value={element.align}
          onChange={(e) =>
            onChange({
              ...element,
              align: e.target.value as TextElement["align"],
            })
          }
        >
          <option value="left">左对齐</option>
          <option value="center">居中</option>
          <option value="right">右对齐</option>
        </select>
      </label>
    </div>
  );
}
