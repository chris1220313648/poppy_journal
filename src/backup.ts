import JSZip from "jszip";
import { db } from "./db";
import type { Asset, JournalPage, Notebook, PageElement } from "./types";
import { downloadBlob } from "./image-utils";

interface Manifest {
  format: "poppy-journal";
  schemaVersion: 1;
  exportedAt: string;
  notebook: Omit<Notebook, "id"> & { id: string };
  pages: JournalPage[];
  assets: Array<
    Omit<Asset, "blob" | "thumbnail"> & { blobPath: string; thumbPath: string }
  >;
}

const safeName = (name: string) =>
  name.replace(/[\\/:*?"<>|]/g, "-").trim() || "Poppy-Journal";

export async function exportNotebookPackage(notebook: Notebook) {
  const [pages, assets] = await Promise.all([
    db.pages.where("notebookId").equals(notebook.id).toArray(),
    db.assets.where("notebookId").equals(notebook.id).toArray(),
  ]);
  const zip = new JSZip();
  const packed = assets.map((asset) => {
    const ext = asset.mimeType.includes("png") ? "png" : "webp";
    const blobPath = `assets/${asset.id}.${ext}`;
    const thumbPath = `assets/${asset.id}.thumb.webp`;
    zip.file(blobPath, asset.blob);
    zip.file(thumbPath, asset.thumbnail);
    const { blob: _blob, thumbnail: _thumb, ...meta } = asset;
    return { ...meta, blobPath, thumbPath };
  });
  const manifest: Manifest = {
    format: "poppy-journal",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    notebook,
    pages,
    assets: packed,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  downloadBlob(
    await zip.generateAsync({ type: "blob", compression: "DEFLATE" }),
    `${safeName(notebook.name)}.poppyjournal`,
  );
}

export async function importNotebookPackage(file: File) {
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file("manifest.json");
  if (!entry) throw new Error("项目包缺少 manifest.json");
  const manifest = JSON.parse(await entry.async("string")) as Manifest;
  if (manifest.format !== "poppy-journal" || manifest.schemaVersion !== 1)
    throw new Error("不支持的项目包版本");
  if (
    !manifest.notebook ||
    !Array.isArray(manifest.pages) ||
    !Array.isArray(manifest.assets)
  )
    throw new Error("项目包结构损坏");
  const notebookId = crypto.randomUUID();
  const assetMap = new Map<string, string>();
  const pageMap = new Map<string, string>();
  manifest.assets.forEach((asset) =>
    assetMap.set(asset.id, crypto.randomUUID()),
  );
  manifest.pages.forEach((page) => pageMap.set(page.id, crypto.randomUUID()));
  const assets: Asset[] = [];
  for (const asset of manifest.assets) {
    const blobFile = zip.file(asset.blobPath);
    const thumbFile = zip.file(asset.thumbPath);
    if (!blobFile || !thumbFile) throw new Error(`缺少素材：${asset.name}`);
    const { blobPath: _bp, thumbPath: _tp, ...meta } = asset;
    assets.push({
      ...meta,
      id: assetMap.get(asset.id)!,
      notebookId,
      blob: await blobFile.async("blob"),
      thumbnail: await thumbFile.async("blob"),
    });
  }
  const remap = (element: PageElement): PageElement =>
    element.kind === "image"
      ? {
          ...element,
          id: crypto.randomUUID(),
          assetId: assetMap.get(element.assetId) ?? element.assetId,
        }
      : { ...element, id: crypto.randomUUID() };
  const pages: JournalPage[] = manifest.pages.map((page) => ({
    ...page,
    id: pageMap.get(page.id)!,
    notebookId,
    elements: page.elements.map(remap),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
  const notebook: Notebook = {
    ...manifest.notebook,
    id: notebookId,
    name: `${manifest.notebook.name} · 导入`,
    pageOrder: manifest.notebook.pageOrder
      .map((id) => pageMap.get(id)!)
      .filter(Boolean),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.transaction("rw", db.notebooks, db.pages, db.assets, async () => {
    await db.notebooks.add(notebook);
    await db.pages.bulkAdd(pages);
    if (assets.length) await db.assets.bulkAdd(assets);
  });
  return notebook;
}
