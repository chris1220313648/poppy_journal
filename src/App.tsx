import { useLiveQuery } from "dexie-react-hooks";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { exportNotebookPackage, importNotebookPackage } from "./backup";
import {
  createNotebook,
  createPage,
  db,
  deleteNotebook,
  deletePage,
  duplicatePage,
  ensureSeed,
} from "./db";
import { applyLayout } from "./templates";
import type { Asset, JournalPage, Notebook } from "./types";

const Editor = lazy(() => import("./Editor"));

type View =
  | { name: "home" }
  | { name: "notebook"; notebookId: string }
  | { name: "editor"; notebookId: string; pageId: string };
const COLORS = ["#e35342", "#83b918", "#2164ff", "#d69522", "#8a5d9e"];

export default function App() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>({ name: "home" });
  const [dialog, setDialog] = useState<"new" | "settings" | null>(null);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ensureSeed()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);
  const notebooks =
    useLiveQuery(
      () => db.notebooks.orderBy("updatedAt").reverse().toArray(),
      [ready],
      [],
    ) ?? [];
  const allPages =
    useLiveQuery(
      () => db.pages.orderBy("updatedAt").reverse().toArray(),
      [ready],
      [],
    ) ?? [];
  const allAssets = useLiveQuery(() => db.assets.toArray(), [ready], []) ?? [];
  const notebook =
    view.name !== "home"
      ? notebooks.find((n) => n.id === view.notebookId)
      : undefined;
  const currentPage =
    view.name === "editor"
      ? allPages.find((p) => p.id === view.pageId)
      : undefined;
  const openPage = async (page: JournalPage) => {
    let next = page;
    if (!page.elements.length) {
      next = {
        ...page,
        elements: applyLayout(page, page.layoutId, page.themeId),
      };
      await db.pages.put(next);
    }
    setView({ name: "editor", notebookId: page.notebookId, pageId: page.id });
  };
  const importProject = async (file?: File) => {
    if (!file) return;
    try {
      const book = await importNotebookPackage(file);
      setNotice("手帐本已安全导入");
      setView({ name: "notebook", notebookId: book.id });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "项目包导入失败");
    }
  };
  if (!ready)
    return (
      <div className="loading-screen">
        <span>POPPY JOURNAL</span>
        <div className="loading-paper" />
        <p>正在铺开纸张…</p>
      </div>
    );
  if (view.name === "editor" && notebook && currentPage)
    return (
      <Suspense
        fallback={
          <div className="loading-screen">
            <span>POPPY JOURNAL</span>
            <div className="loading-paper" />
            <p>正在铺开编辑画布…</p>
          </div>
        }
      >
        <Editor
          notebook={notebook}
          page={currentPage}
          onBack={() => setView({ name: "notebook", notebookId: notebook.id })}
        />
      </Suspense>
    );
  return (
    <div className="app-shell">
      <Header
        onHome={() => setView({ name: "home" })}
        onImport={() => importRef.current?.click()}
        onSettings={() => setDialog("settings")}
      />
      <input
        ref={importRef}
        type="file"
        hidden
        accept=".poppyjournal,application/zip"
        onChange={(e) => {
          importProject(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {view.name === "home" ? (
        <Home
          notebooks={notebooks}
          pages={allPages}
          assets={allAssets}
          onOpenBook={(id) => setView({ name: "notebook", notebookId: id })}
          onOpenPage={openPage}
          onNew={() => setDialog("new")}
        />
      ) : notebook ? (
        <NotebookView
          notebook={notebook}
          pages={allPages.filter((p) => p.notebookId === notebook.id)}
          assets={allAssets}
          onBack={() => setView({ name: "home" })}
          onOpen={openPage}
          onNotice={setNotice}
        />
      ) : null}
      {dialog === "new" && (
        <NewNotebookDialog
          onClose={() => setDialog(null)}
          onCreate={async (name, color) => {
            const book = await createNotebook(name, color);
            setDialog(null);
            setView({ name: "notebook", notebookId: book.id });
          }}
        />
      )}
      {dialog === "settings" && (
        <SettingsDialog
          notebooks={notebooks}
          pages={allPages}
          assets={allAssets}
          onClose={() => setDialog(null)}
        />
      )}{" "}
      {notice && (
        <button className="toast" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}
    </div>
  );
}

function Header({
  onHome,
  onImport,
  onSettings,
}: {
  onHome(): void;
  onImport(): void;
  onSettings(): void;
}) {
  const now = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onHome}>
        <span>Poppy</span>
        <b>Journal</b>
      </button>
      <div className="date-stamp">
        <i />
        TODAY
        <br />
        <strong>{now}</strong>
      </div>
      <nav>
        <button onClick={onImport}>导入手帐</button>
        <button onClick={onSettings}>设置</button>
      </nav>
    </header>
  );
}

function Home({
  notebooks,
  pages,
  assets,
  onOpenBook,
  onOpenPage,
  onNew,
}: {
  notebooks: Notebook[];
  pages: JournalPage[];
  assets: Asset[];
  onOpenBook(id: string): void;
  onOpenPage(page: JournalPage): void;
  onNew(): void;
}) {
  const recent = pages.slice(0, 5);
  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">YOUR DAYS, ON PAPER · 本地保存</span>
          <h1>
            把普通的日子，<em>轻轻贴进纸里。</em>
          </h1>
          <p>
            照片、文字、贴纸和一点点留白。这里没有公开动态，只有属于你的日常。
          </p>
          <button className="primary-cta" onClick={onNew}>
            新建一本手帐 <span>↗</span>
          </button>
        </div>
        <div className="hero-collage" aria-hidden="true">
          <div className="paper-note red-note">
            MAKE
            <br />
            MEMORIES<span>✿</span>
          </div>
          <div className="paper-note cream-note">
            <b>{new Date().getDate()}</b>
            <small>
              {new Date()
                .toLocaleString("en", { month: "short" })
                .toUpperCase()}
            </small>
            <i />
          </div>
          <div className="paper-note green-note">
            PRIVATE
            <br />
            BY DEFAULT
          </div>
        </div>
      </section>
      <section className="recent-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">01 · RECENT PAGES</span>
            <h2>最近留下的页面</h2>
          </div>
          <span className="hand-note">just for you ↘</span>
        </div>
        {recent.length ? (
          <div className="recent-grid">
            {recent.map((page, index) => (
              <PageCard
                key={page.id}
                page={page}
                asset={firstAsset(page, assets)}
                index={index}
                onClick={() => onOpenPage(page)}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock text="还没有页面，先从一本手帐开始。" />
        )}
      </section>
      <section className="notebooks-section">
        <div className="section-title">
          <div>
            <span className="eyebrow">02 · NOTEBOOKS</span>
            <h2>我的手帐本</h2>
          </div>
          <button className="text-link" onClick={onNew}>
            ＋ 新建手帐本
          </button>
        </div>
        <div className="notebook-grid">
          {notebooks.map((book, index) => (
            <button
              className="notebook-card"
              key={book.id}
              onClick={() => onOpenBook(book.id)}
              style={
                {
                  "--book": book.color,
                  "--tilt": `${index % 2 ? 1.2 : -1.2}deg`,
                } as React.CSSProperties
              }
            >
              <span className="book-index">
                NO. {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{book.name}</h3>
              <p>{book.pageOrder.length} 页记录</p>
              <i />
              <b>打开手帐 →</b>
            </button>
          ))}
          <button className="new-notebook-card" onClick={onNew}>
            <span>＋</span>
            <b>新建一本</b>
            <small>给下一段日子留个位置</small>
          </button>
        </div>
      </section>
      <footer>
        <span>POPPY JOURNAL © 2026</span>
        <p>你的内容只留在当前设备。</p>
      </footer>
    </main>
  );
}

function NotebookView({
  notebook,
  pages,
  assets,
  onBack,
  onOpen,
  onNotice,
}: {
  notebook: Notebook;
  pages: JournalPage[];
  assets: Asset[];
  onBack(): void;
  onOpen(p: JournalPage): void;
  onNotice(s: string): void;
}) {
  const sorted = notebook.pageOrder
    .map((id) => pages.find((p) => p.id === id))
    .filter(Boolean) as JournalPage[];
  const drag = useRef<string | undefined>(undefined);
  const add = async () => onOpen(await createPage(notebook));
  const rename = async () => {
    const name = prompt("新的手帐本名称", notebook.name)?.trim();
    if (name)
      await db.notebooks.put({ ...notebook, name, updatedAt: Date.now() });
  };
  const removeBook = async () => {
    if (confirm(`删除「${notebook.name}」及其中所有页面？此操作无法撤销。`)) {
      await deleteNotebook(notebook);
      onBack();
    }
  };
  const reorder = async (target: string) => {
    if (!drag.current || drag.current === target) return;
    const order = [...notebook.pageOrder];
    const from = order.indexOf(drag.current),
      to = order.indexOf(target);
    order.splice(to, 0, ...order.splice(from, 1));
    await db.notebooks.put({
      ...notebook,
      pageOrder: order,
      updatedAt: Date.now(),
    });
  };
  return (
    <main className="notebook-page">
      <button className="back-link" onClick={onBack}>
        ← 返回工作台
      </button>
      <section
        className="notebook-hero"
        style={{ "--book": notebook.color } as React.CSSProperties}
      >
        <div>
          <span className="eyebrow">
            NOTEBOOK · {notebook.pageOrder.length} PAGES
          </span>
          <h1>{notebook.name}</h1>
          <p>一页一页，收好这段日子。</p>
        </div>
        <div className="book-actions">
          <button onClick={rename}>重命名</button>
          <button onClick={() => exportNotebookPackage(notebook)}>
            备份整本
          </button>
          <button className="danger-link" onClick={removeBook}>
            删除
          </button>
          <button className="primary-cta" onClick={add}>
            ＋ 新建页面
          </button>
        </div>
      </section>
      <section className="page-collection">
        {sorted.map((page, index) => (
          <article
            draggable
            onDragStart={() => (drag.current = page.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => reorder(page.id)}
            className="collection-item"
            key={page.id}
          >
            <PageCard
              page={page}
              asset={firstAsset(page, assets)}
              index={index}
              onClick={() => onOpen(page)}
            />
            <div className="card-actions">
              <span>
                {page.date} · {String(page.dayIndex).padStart(2, "0")}
              </span>
              <button
                onClick={async () => {
                  const copy = await duplicatePage(page);
                  if (copy) onNotice("页面副本已创建");
                }}
              >
                复制
              </button>
              <button
                onClick={async () => {
                  if (confirm("删除这一页？此操作无法撤销。"))
                    await deletePage(page);
                }}
              >
                删除
              </button>
            </div>
          </article>
        ))}
        <button className="add-page-sheet" onClick={add}>
          <span>＋</span>
          <b>新的一页</b>
          <small>今天还想记些什么？</small>
        </button>
      </section>
    </main>
  );
}

function PageCard({
  page,
  asset,
  index,
  onClick,
}: {
  page: JournalPage;
  asset?: Asset;
  index: number;
  onClick(): void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!asset) return;
    const u = URL.createObjectURL(asset.thumbnail);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [asset]);
  return (
    <button className={`page-card page-card-${index % 5}`} onClick={onClick}>
      <div className={`page-preview theme-${page.themeId}`}>
        {url && <img src={url} alt="" />}
        <span className="preview-date">
          {page.date.slice(5).replace("-", " / ")}
        </span>
        <h3>{page.title}</h3>
        <p>{page.body}</p>
        <i className="tape" />
      </div>
      <span className="page-card-meta">
        PAGE {String(page.dayIndex).padStart(2, "0")} <b>打开 ↗</b>
      </span>
    </button>
  );
}
function firstAsset(page: JournalPage, assets: Asset[]) {
  const image = page.elements.find((e) => e.kind === "image");
  return image && image.kind === "image"
    ? assets.find((a) => a.id === image.assetId)
    : undefined;
}
function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="empty-block">
      <span>＋</span>
      <p>{text}</p>
    </div>
  );
}

function NewNotebookDialog({
  onClose,
  onCreate,
}: {
  onClose(): void;
  onCreate(name: string, color: string): void;
}) {
  const [name, setName] = useState("我的新手帐");
  const [color, setColor] = useState(COLORS[0]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>
          ×
        </button>
        <span className="eyebrow">NEW NOTEBOOK</span>
        <h2>给这段日子取个名字</h2>
        <label>
          手帐本名称
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          封面标记色
          <div className="color-row">
            {COLORS.map((c) => (
              <button
                key={c}
                className={color === c ? "selected" : ""}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <button
          className="primary-cta full"
          onClick={() => name.trim() && onCreate(name.trim(), color)}
        >
          创建手帐本
        </button>
      </section>
    </div>
  );
}
function SettingsDialog({
  notebooks,
  pages,
  assets,
  onClose,
}: {
  notebooks: Notebook[];
  pages: JournalPage[];
  assets: Asset[];
  onClose(): void;
}) {
  const size = useMemo(
    () => assets.reduce((n, a) => n + a.blob.size + a.thumbnail.size, 0),
    [assets],
  );
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>
          ×
        </button>
        <span className="eyebrow">LOCAL & PRIVATE</span>
        <h2>关于这台设备</h2>
        <div className="stats">
          <div>
            <b>{notebooks.length}</b>
            <span>手帐本</span>
          </div>
          <div>
            <b>{pages.length}</b>
            <span>页面</span>
          </div>
          <div>
            <b>{(size / 1024 / 1024).toFixed(1)} MB</b>
            <span>本地素材</span>
          </div>
        </div>
        <p className="privacy-note">
          Poppy Journal
          不会上传你的照片和文字。清理浏览器网站数据可能删除手帐，请定期使用“备份整本”。
        </p>
        <button className="secondary full" onClick={onClose}>
          知道了
        </button>
      </section>
    </div>
  );
}
