import Dexie, { type EntityTable } from "dexie";
import type { Asset, JournalPage, Notebook } from "./types";

class JournalDB extends Dexie {
  notebooks!: EntityTable<Notebook, "id">;
  pages!: EntityTable<JournalPage, "id">;
  assets!: EntityTable<Asset, "id">;

  constructor() {
    super("poppy-journal");
    this.version(1).stores({
      notebooks: "id, updatedAt, createdAt",
      pages: "id, notebookId, date, updatedAt, [notebookId+date]",
      assets: "id, notebookId, kind, createdAt",
    });
  }
}

export const db = new JournalDB();

export const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export function blankPage(notebookId: string, dayIndex = 1): JournalPage {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    notebookId,
    date: today(),
    dayIndex,
    title: "今天，想记住什么？",
    body: "写下此刻的心情，或从素材库放入一张照片。",
    themeId: "japanese",
    layoutId: "text",
    elements: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function ensureSeed() {
  const now = Date.now();
  const notebook: Notebook = {
    id: crypto.randomUUID(),
    name: "日常碎片",
    color: "#e35342",
    pageOrder: [],
    createdAt: now,
    updatedAt: now,
  };
  const page = blankPage(notebook.id);
  notebook.pageOrder = [page.id];
  await db.transaction("rw", db.notebooks, db.pages, async () => {
    if (await db.notebooks.count()) return;
    await db.notebooks.add(notebook);
    await db.pages.add(page);
  });
}

export async function createNotebook(name: string, color = "#e35342") {
  const now = Date.now();
  const notebook: Notebook = {
    id: crypto.randomUUID(),
    name,
    color,
    pageOrder: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.notebooks.add(notebook);
  return notebook;
}

export async function createPage(notebook: Notebook) {
  const count = await db.pages
    .where("[notebookId+date]")
    .equals([notebook.id, today()])
    .count();
  const page = blankPage(notebook.id, count + 1);
  const next = {
    ...notebook,
    pageOrder: [...notebook.pageOrder, page.id],
    updatedAt: Date.now(),
  };
  await db.transaction("rw", db.notebooks, db.pages, async () => {
    await db.pages.add(page);
    await db.notebooks.put(next);
  });
  return page;
}

export async function deletePage(page: JournalPage) {
  const notebook = await db.notebooks.get(page.notebookId);
  await db.transaction("rw", db.notebooks, db.pages, async () => {
    await db.pages.delete(page.id);
    if (notebook)
      await db.notebooks.put({
        ...notebook,
        pageOrder: notebook.pageOrder.filter((id) => id !== page.id),
        updatedAt: Date.now(),
      });
  });
}

export async function duplicatePage(page: JournalPage) {
  const notebook = await db.notebooks.get(page.notebookId);
  if (!notebook) return;
  const copy: JournalPage = {
    ...structuredClone(page),
    id: crypto.randomUUID(),
    dayIndex: page.dayIndex + 1,
    elements: page.elements.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const index = notebook.pageOrder.indexOf(page.id);
  const order = [...notebook.pageOrder];
  order.splice(index + 1, 0, copy.id);
  await db.transaction("rw", db.notebooks, db.pages, async () => {
    await db.pages.add(copy);
    await db.notebooks.put({
      ...notebook,
      pageOrder: order,
      updatedAt: Date.now(),
    });
  });
  return copy;
}

export async function deleteNotebook(notebook: Notebook) {
  await db.transaction("rw", db.notebooks, db.pages, db.assets, async () => {
    await db.pages.where("notebookId").equals(notebook.id).delete();
    await db.assets.where("notebookId").equals(notebook.id).delete();
    await db.notebooks.delete(notebook.id);
  });
}
