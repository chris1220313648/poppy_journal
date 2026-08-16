import type { Asset } from "./types";

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片处理失败"))),
      type,
      quality,
    ),
  );
}

async function resize(file: Blob, maxEdge: number, quality: number) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return {
    blob: await canvasToBlob(canvas, "image/webp", quality),
    width,
    height,
  };
}

export async function prepareAsset(
  file: File,
  notebookId: string,
  kind: Asset["kind"] = "photo",
): Promise<Asset> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("只支持 JPG、PNG 和 WebP");
  if (file.size > 30 * 1024 * 1024) throw new Error("单张图片不能超过 30MB");
  const main =
    file.type === "image/png" && kind === "sticker"
      ? { blob: file, ...(await dimensions(file)) }
      : await resize(file, 3000, 0.9);
  const thumb = await resize(file, 480, 0.78);
  return {
    id: crypto.randomUUID(),
    notebookId,
    kind,
    name: file.name,
    blob: main.blob,
    thumbnail: thumb.blob,
    width: main.width,
    height: main.height,
    mimeType: main.blob.type,
    createdAt: Date.now(),
  };
}

async function dimensions(file: Blob) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const result = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return result;
}

export function objectUrl(blob?: Blob) {
  return blob ? URL.createObjectURL(blob) : "";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function dataUrlToBlob(dataUrl: string) {
  const [header, payload] = dataUrl.split(",");
  const mimeType =
    header.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}
