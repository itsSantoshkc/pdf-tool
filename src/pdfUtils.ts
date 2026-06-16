import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export async function loadPdfDocument(bytes: Uint8Array) {
  const cloned = new Uint8Array(bytes);
  return pdfjsLib.getDocument({ data: cloned }).promise;
}

export async function renderPageToDataUrl(
  bytes: Uint8Array,
  pageNumber: number,
  scale = 0.5,
): Promise<string> {
  const pdf = await loadPdfDocument(bytes);
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  await page.render({ canvasContext: ctx, viewport } as any).promise;
  return canvas.toDataURL("image/png");
}

export async function renderPageToCanvas(
  bytes: Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.5,
) {
  const pdf = await loadPdfDocument(bytes);
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  await page.render({ canvasContext: ctx, viewport } as any).promise;
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const pdf = await loadPdfDocument(bytes);
  return pdf.numPages;
}

export async function extractPages(
  bytes: Uint8Array,
  fileName: string,
  pageNumbers: number[],
) {
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(
    srcDoc,
    pageNumbers.map((n) => n - 1),
  );
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfData = await newDoc.save();
  const blob = new Blob([pdfData as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/\.pdf$/i, "")}_selected.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function mergePdfs(
  files: { bytes: Uint8Array; fileName: string }[],
  outputName: string,
) {
  const mergedBytes = await mergePdfsToBytes(files);
  const blob = new Blob([mergedBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = outputName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function mergePdfsToBytes(
  files: { bytes: Uint8Array; fileName: string }[],
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.bytes);
    const copiedPages = await mergedDoc.copyPages(
      srcDoc,
      srcDoc.getPageIndices(),
    );
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  return mergedDoc.save();
}

export async function rearrangeAndSave(
  bytes: Uint8Array,
  fileName: string,
  keptPages: number[],
) {
  const srcDoc = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();

  const copiedPages = await newDoc.copyPages(
    srcDoc,
    keptPages.map((n) => n - 1),
  );
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfData = await newDoc.save();
  const blob = new Blob([pdfData as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/\.pdf$/i, "")}_edited.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
