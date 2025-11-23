import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import mammoth from "mammoth";
import { fileTypeFromBuffer } from "file-type";
import {
  DEFAULT_BUCKET,
  listIngestionFiles,
  downloadIngestionFile,
  removeLocalFile,
  uploadBufferToStorage,
} from "./storageService";
import type { StorageObjectRef, ExtractionAssets } from "../../shared/api";
import { convertDocument } from "./cloudConvertService";

// Guard for runtimes where import.meta.url is missing after bundling
const require =
  typeof import.meta?.url === "string"
    ? createRequire(import.meta.url)
    : createRequire(process.cwd() + "/");
const pdfParseModule = require("pdf-parse");
const pdfParse: typeof import("pdf-parse") =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : pdfParseModule.default ?? pdfParseModule;

export type ExtractionStrategy =
  | "pdf-digital"
  | "docx"
  | "plain-text"
  | "markdown"
  | "html"
  | "unsupported";

export interface DocumentExtractionResult {
  ingestionId: string;
  strategy: ExtractionStrategy;
  text: string;
  html?: string;
  wordCount: number;
  characterCount: number;
  pageCount?: number;
  warnings: string[];
  needsOcr: boolean;
  mimeType?: string;
  originalFileName: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  assets?: ExtractionAssets;
}

interface ExtractOptions {
  ingestionId: string;
  bucket?: string;
}

export async function extractDocument(
  options: ExtractOptions,
): Promise<DocumentExtractionResult> {
  const { ingestionId, bucket } = options;
  const resolvedBucket = bucket ?? DEFAULT_BUCKET;
  const files = await listIngestionFiles(ingestionId, resolvedBucket);

  if (!files.length) {
    throw new Error(
      `No stored files found for ingestion ${ingestionId} in bucket ${resolvedBucket}`,
    );
  }

  // For now, process the first file (uploads store a single file per ingestion)
  const file = files[0];

  const downloaded = await downloadIngestionFile({
    ingestionId,
    fileName: file.name,
    bucket: resolvedBucket,
  });

  if (!downloaded) {
    throw new Error(
      `Unable to download stored file ${file.name} for ingestion ${ingestionId}`,
    );
  }

  const buffer = await fs.readFile(downloaded.localPath);

  try {
    const detection = await detectDocumentType({
      fileName: file.name,
      explicitMime: downloaded.mimeType,
      buffer,
    });

    const extraction = await runExtractionStrategy({
      ingestionId,
      fileName: file.name,
      buffer,
      detection,
      bucket: resolvedBucket,
    });

    const text = extraction.text.trim();
    const wordCount = countWords(text);
    const characterCount = text.length;

    const warnings = [...extraction.warnings];

    if (wordCount < 40) {
      warnings.push(
        "Extracted text is very short (< 40 words). Document might be scanned or contain unsupported encoding.",
      );
    }

    return {
      ingestionId,
      strategy: extraction.strategy,
      text,
      html: extraction.html,
      wordCount,
      characterCount,
      pageCount: extraction.pageCount,
      warnings,
      needsOcr: extraction.needsOcr,
      mimeType: detection.mimeType,
      originalFileName: file.name,
      fileSize: downloaded.size,
      metadata: extraction.metadata,
      assets: extraction.assets,
    };
  } finally {
    await removeLocalFile(downloaded.localPath);
    const cacheDir = path.dirname(downloaded.localPath);
    // Best-effort cleanup of temporary folder when empty
    try {
      await fs.rmdir(cacheDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOTEMPTY") {
        console.warn("Failed to remove ingestion cache directory", {
          cacheDir,
          error,
        });
      }
    }
  }
}

interface DetectionResult {
  mimeType?: string;
  extension?: string;
}

async function detectDocumentType(params: {
  fileName: string;
  explicitMime?: string;
  buffer: Buffer;
}): Promise<DetectionResult> {
  const { fileName, explicitMime, buffer } = params;

  let mimeType = explicitMime;
  let extension = path.extname(fileName || "").toLowerCase().replace(".", "");

  if (!mimeType) {
    mimeType = inferMimeFromExtension(extension);
  }

  if (!mimeType) {
    const detected = await fileTypeFromBuffer(buffer);
    if (detected) {
      mimeType = detected.mime;
      extension = detected.ext;
    }
  }

  return { mimeType, extension };
}

function inferMimeFromExtension(ext?: string): string | undefined {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    case "html":
    case "htm":
      return "text/html";
    default:
      return undefined;
  }
}

interface StrategyResult {
  strategy: ExtractionStrategy;
  text: string;
  html?: string;
  warnings: string[];
  needsOcr: boolean;
  pageCount?: number;
  metadata?: Record<string, unknown>;
  assets?: ExtractionAssets;
}

async function runExtractionStrategy(params: {
  ingestionId: string;
  fileName: string;
  buffer: Buffer;
  detection: DetectionResult;
  bucket: string;
}): Promise<StrategyResult> {
  const { buffer, detection, fileName, ingestionId, bucket } = params;
  const mime = detection.mimeType ?? "";
  const normalizedMime = mime.toLowerCase();
  const rawStorageRef: StorageObjectRef = {
    bucket,
    path: path.posix.join("raw", ingestionId, fileName),
  };
  let docxTemplateRef: StorageObjectRef | null = null;
  let htmlPackageRef: StorageObjectRef | null = null;

  if (normalizedMime.includes("pdf")) {
    const docxBuffer = await convertPdfWithCloudConvert({
      buffer,
      fileName,
      ingestionId,
      bucket,
    });
    if (docxBuffer) {
      docxTemplateRef =
        (await uploadDocxTemplate({
          buffer: docxBuffer,
          ingestionId,
          bucket,
          fileName: `${path.parse(fileName).name || "document"}-normalized.docx`,
        })) ?? null;
      htmlPackageRef = await generateHtmlPackageFromDocx({
        buffer: docxBuffer,
        ingestionId,
        bucket,
        baseName: path.parse(fileName).name || "document",
      });
      const extraction = await extractDocx(docxBuffer);
      return attachAssets(extraction, docxTemplateRef, htmlPackageRef);
    }
    const fallback = await extractPdf(buffer);
    return attachAssets(fallback, docxTemplateRef, htmlPackageRef);
  }

  if (normalizedMime.includes("word") || normalizedMime.includes("docx")) {
    docxTemplateRef = rawStorageRef;
    const extraction = await extractDocx(buffer);
    htmlPackageRef = await generateHtmlPackageFromDocx({
      buffer,
      ingestionId,
      bucket,
      baseName: path.parse(fileName).name || "document",
    });
    return attachAssets(extraction, docxTemplateRef, htmlPackageRef);
  }

  if (normalizedMime === "text/plain" || normalizedMime.startsWith("text/")) {
    return extractText(buffer, normalizedMime);
  }

  // Fallback to extension detection when mime is ambiguous
  switch (detection.extension) {
    case "pdf":
      return attachAssets(await extractPdf(buffer), docxTemplateRef, htmlPackageRef);
    case "docx":
      docxTemplateRef = rawStorageRef;
      return attachAssets(await extractDocx(buffer), docxTemplateRef, htmlPackageRef);
    case "txt":
      return extractText(buffer, "text/plain");
    case "md":
      return extractText(buffer, "text/markdown");
    case "html":
    case "htm":
      return extractText(buffer, "text/html");
    default:
      return {
        strategy: "unsupported",
        text: "",
        warnings: [
          "Unsupported file type. OCR or additional handlers required for this document.",
        ],
        needsOcr: true,
      };
  }
}

async function extractPdf(buffer: Buffer): Promise<StrategyResult> {
  try {
    const pdf = await pdfParse(buffer);
    const text = pdf.text || "";

    const warnings: string[] = [];
    if (!text.trim()) {
      warnings.push(
        "No text extracted from PDF. The file may be scanned or use unsupported encoding.",
      );
    }

    return {
      strategy: "pdf-digital",
      text,
      html: textToHtml(text),
      warnings,
      needsOcr: text.trim().length === 0,
      pageCount: pdf.numpages,
      metadata: {
        info: pdf.info,
        metadata: pdf.metadata,
      },
    };
  } catch (error) {
    return {
      strategy: "pdf-digital",
      text: "",
      warnings: [
        `Failed to parse PDF content: ${error instanceof Error ? error.message : String(error)}`,
      ],
      needsOcr: true,
    };
  }
}

async function extractDocx(buffer: Buffer): Promise<StrategyResult> {
  try {
    const [rawText, htmlResult] = await Promise.all([
      mammoth.extractRawText({ buffer }).catch(() => ({ value: "" })),
      mammoth.convertToHtml({ buffer }).catch(() => ({ value: "" })),
    ]);
    const text = rawText.value || "";
    const html =
      sanitizeHtml(htmlResult.value) ?? textToHtml(text);

    return {
      strategy: "docx",
      text,
      html,
      warnings: [],
      needsOcr: text.trim().length === 0,
    };
  } catch (error) {
    return {
      strategy: "docx",
      text: "",
      warnings: [
        `Failed to extract DOCX content: ${error instanceof Error ? error.message : String(error)}`,
      ],
      needsOcr: true,
    };
  }
}

async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<StrategyResult> {
  const text = buffer.toString("utf8");
  return {
    strategy: mimeType === "text/markdown" ? "markdown" : "plain-text",
    text,
    html: textToHtml(text),
    warnings: [],
    needsOcr: false,
  };
}

function countWords(text: string): number {
  const tokens = text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  return tokens.length;
}

function textToHtml(text: string): string | undefined {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return undefined;
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => escapeHtml(line.trim()))
        .join("<br />");
      return `<p>${lines || "&nbsp;"}</p>`;
    });

  if (paragraphs.length === 0) {
    return undefined;
  }

  return `<div class="maigon-contract-body">${paragraphs.join("")}</div>`;
}

function sanitizeHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const trimmed = html.trim();
  if (!trimmed) return undefined;

  return trimmed
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "");
}

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ZIP_MIME = "application/zip";

async function convertPdfWithCloudConvert(params: {
  buffer: Buffer;
  fileName: string;
  ingestionId: string;
  bucket: string;
}): Promise<Buffer | null> {
  const { buffer, fileName } = params;
  if (!process.env.CLOUDCONVERT_API_KEY) {
    return null;
  }

  console.info("[ingestion] Using CloudConvert for PDF conversion", {
    fileName,
  });

  const converted = await convertDocument({
    buffer,
    fileName,
    inputFormat: "pdf",
    outputFormat: "docx",
  });
  return converted;
}

async function uploadDocxTemplate(options: {
  buffer: Buffer;
  ingestionId: string;
  bucket: string;
  fileName: string;
}): Promise<StorageObjectRef | null> {
  try {
    const uploaded = await uploadBufferToStorage({
      buffer: options.buffer,
      fileName: options.fileName,
      ingestionId: options.ingestionId,
      contentType: DOCX_MIME,
      bucket: options.bucket,
    });
    return { bucket: uploaded.bucket, path: uploaded.path };
  } catch (error) {
    console.error("[ingestion] Failed to upload normalized DOCX", error);
    return null;
  }
}

async function generateHtmlPackageFromDocx(options: {
  buffer: Buffer;
  ingestionId: string;
  bucket: string;
  baseName: string;
}): Promise<StorageObjectRef | null> {
  if (!process.env.CLOUDCONVERT_API_KEY) {
    return null;
  }

  try {
    const htmlBuffer = await convertDocument({
      buffer: options.buffer,
      fileName: `${options.baseName || "document"}.docx`,
      inputFormat: "docx",
      outputFormat: "html",
    });

    if (!htmlBuffer) return null;

    const uploaded = await uploadBufferToStorage({
      buffer: htmlBuffer,
      fileName: `${options.baseName || "document"}-html-package.zip`,
      ingestionId: options.ingestionId,
      contentType: ZIP_MIME,
      bucket: options.bucket,
    });

    return { bucket: uploaded.bucket, path: uploaded.path };
  } catch (error) {
    console.error("[ingestion] Failed to create HTML package", error);
    return null;
  }
}

function attachAssets(
  result: StrategyResult,
  docxTemplate: StorageObjectRef | null,
  htmlPackage: StorageObjectRef | null,
): StrategyResult {
  if (!docxTemplate && !htmlPackage) {
    return result;
  }

  return {
    ...result,
    assets: {
      docxTemplate: docxTemplate ?? result.assets?.docxTemplate ?? null,
      htmlPackage: htmlPackage ?? result.assets?.htmlPackage ?? null,
    },
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
