import express from "express";
import { Document, Packer, Paragraph } from "docx";
import PDFDocument from "pdfkit";
import { createRequire } from "node:module";
import { generatePdfFromHtml } from "../services/adobePdfService";
import { convertDocument } from "../services/cloudConvertService";
import type { StorageObjectRef } from "../../shared/api";
import { getDraftSnapshotById } from "../services/draftSnapshotsRepository";
import { downloadStorageObject } from "../services/storageService";
import { htmlToPlainText } from "../utils/htmlTransforms";

const require = createRequire(import.meta.url);
const htmlDocx: {
  asBlob: (html: string, options?: Record<string, unknown>) => Blob | Buffer;
} = require("html-docx-js");
const htmlPdf: {
  generatePdf: (
    file: { content: string },
    options: Record<string, unknown>,
  ) => Promise<Buffer>;
} = require("html-pdf-node");

export const exportRouter = express.Router();

const jsonParser = express.json({ limit: "5mb" });

const BASE_STYLES = `
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #111; }
  h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 0.6em 0 0.3em; }
  p { margin: 0 0 0.8em; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #555; padding: 6px; vertical-align: top; }
  ul, ol { margin: 0 0 0.8em 1.2em; }
`;

interface ExportRequestPayload {
  draftId: string | null;
  assetRef: StorageObjectRef | null;
  html: string | null;
  text: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseStorageRefCandidate(value: unknown): StorageObjectRef | null {
  const record = asRecord(value);
  if (!record) return null;
  const bucket =
    typeof record.bucket === "string" ? record.bucket : null;
  const path =
    typeof record.path === "string" ? record.path : null;
  if (!bucket || !path) return null;
  return { bucket, path };
}

function parseExportRequest(body: unknown): ExportRequestPayload {
  const record = asRecord(body) ?? {};
  const draftId =
    typeof record.draftId === "string" && record.draftId.trim().length > 0
      ? record.draftId.trim()
      : null;
  const html =
    typeof record.html === "string" && record.html.trim().length > 0
      ? record.html.trim()
      : null;
  const text =
    typeof record.text === "string" && record.text.trim().length > 0
      ? record.text
      : null;
  const assetRef =
    parseStorageRefCandidate(record.assetRef) ??
    parseStorageRefCandidate(record.asset);

  return { draftId, html, text, assetRef };
}

async function resolveDraftSnapshotPayload(draftId: string) {
  const snapshot = await getDraftSnapshotById(draftId);
  if (!snapshot) {
    return null;
  }
  return {
    html: snapshot.html ?? null,
    text: snapshot.plainText ?? null,
    assetRef: snapshot.assetRef ?? null,
  };
}

function sanitizeTextInput(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildHtmlFromText(text: string): string {
  const paragraphs = text
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) =>
          line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;"),
        )
        .join("<br />"),
    )
    .map((html) => `<p>${html}</p>`)
    .join("");
  return paragraphs || "<p>&nbsp;</p>";
}

function wrapHtmlDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>${BASE_STYLES}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

async function convertBlobToBuffer(blob: Blob | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(blob)) {
    return blob;
  }
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildDocxFromHtml(html: string): Promise<Buffer | null> {
  const wrapped = wrapHtmlDocument(html);
  const htmlBuffer = Buffer.from(wrapped, "utf8");

  if (process.env.CLOUDCONVERT_API_KEY) {
    const converted = await convertDocument({
      buffer: htmlBuffer,
      fileName: `draft-${Date.now()}.html`,
      inputFormat: "html",
      outputFormat: "docx",
    });
    if (converted) {
      return converted;
    }
  }

  try {
    const blob = htmlDocx.asBlob(wrapped, {
      orientation: "portrait",
      margins: {
        top: 720,
        right: 720,
        bottom: 720,
        left: 720,
      },
    });
    return await convertBlobToBuffer(blob);
  } catch (error) {
    console.error("[export] html-docx conversion failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

function buildDocxFromText(text: string) {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => new Paragraph(line || " "));
  return Packer.toBuffer(
    new Document({
      sections: [
        {
          properties: {},
          children: paragraphs.length > 0 ? paragraphs : [new Paragraph(" ")],
        },
      ],
    }),
  );
}

function buildPdfFromText(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ margin: 48 });
      const chunks: Buffer[] = [];
      pdf.on("data", (chunk) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", (error) => reject(error));

      const paragraphs = text.split(/\r?\n\r?\n/);
      paragraphs.forEach((paragraph, index) => {
        pdf.font("Times-Roman").fontSize(12).text(paragraph || " ", {
          align: "left",
        });
        if (index < paragraphs.length - 1) {
          pdf.moveDown();
        }
      });

      pdf.end();
    } catch (error) {
      reject(error);
    }
  });
}

exportRouter.post("/docx", jsonParser, async (req, res) => {
  const payload = parseExportRequest(req.body);
  let resolvedHtml = payload.html;
  let resolvedText = sanitizeTextInput(payload.text);
  let assetRef = payload.assetRef;

  if (payload.draftId) {
    const snapshot = await resolveDraftSnapshotPayload(payload.draftId);
    if (!snapshot) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    resolvedHtml = snapshot.html ?? resolvedHtml;
    resolvedText = sanitizeTextInput(snapshot.text) ?? resolvedText;
    assetRef = snapshot.assetRef ?? assetRef;
  }

  if (!resolvedHtml && !resolvedText && !assetRef) {
    res.status(400).json({
      error: "Provide html, text, asset, or draftId for DOCX export.",
    });
    return;
  }

  const htmlSource =
    resolvedHtml ??
    (resolvedText ? buildHtmlFromText(resolvedText) : null);

  try {
    let buffer: Buffer | null = null;

    if (assetRef && process.env.CLOUDCONVERT_API_KEY) {
      try {
        const downloaded = await downloadStorageObject(assetRef);
        if (downloaded) {
          buffer = await convertDocument({
            buffer: downloaded.buffer,
            fileName: `draft-${payload.draftId ?? Date.now()}.zip`,
            inputFormat: "zip",
            outputFormat: "docx",
          });
        }
      } catch (assetError) {
        console.warn("[export] Failed to convert HTML package to DOCX", {
          error:
            assetError instanceof Error
              ? assetError.message
              : String(assetError),
        });
      }
    }

    if (!buffer && htmlSource) {
      buffer = await buildDocxFromHtml(htmlSource);
    }

    if (!buffer && resolvedText) {
      buffer = await buildDocxFromText(resolvedText);
    }

    if (buffer) {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="contract.docx"',
      );
      res.status(200).send(buffer);
      return;
    }

    res.status(500).json({ error: "Failed to generate DOCX document." });
  } catch (error) {
    console.error("[export] DOCX generation failed", error);
    res.status(500).json({ error: "Failed to generate DOCX document." });
  }
});

exportRouter.post("/pdf", jsonParser, async (req, res) => {
  const payload = parseExportRequest(req.body);
  let resolvedHtml = payload.html;
  let resolvedText = sanitizeTextInput(payload.text);

  if (payload.draftId) {
    const snapshot = await resolveDraftSnapshotPayload(payload.draftId);
    if (!snapshot) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    resolvedHtml = snapshot.html ?? resolvedHtml;
    resolvedText = sanitizeTextInput(snapshot.text) ?? resolvedText;
  }

  if (!resolvedHtml && !resolvedText) {
    res
      .status(400)
      .json({ error: "Provide html, text, or draftId for PDF export." });
    return;
  }

  const effectiveHtml = resolvedHtml
    ? wrapHtmlDocument(resolvedHtml)
    : resolvedText
    ? wrapHtmlDocument(buildHtmlFromText(resolvedText))
    : null;

  try {
    if (effectiveHtml) {
      const adobeBuffer = await generatePdfFromHtml(effectiveHtml);
      if (adobeBuffer) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="contract.pdf"',
        );
        res.status(200).send(adobeBuffer);
        return;
      }

      try {
        const buffer = await htmlPdf.generatePdf(
          { content: effectiveHtml },
          {
            format: "A4",
            margin: {
              top: "15mm",
              right: "12mm",
              bottom: "18mm",
              left: "12mm",
            },
          },
        );
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="contract.pdf"',
        );
        res.status(200).send(buffer);
        return;
      } catch (htmlPdfError) {
        console.error("[export] html-pdf fallback failed", htmlPdfError);
      }
    }

    const fallbackText =
      resolvedText ??
      (resolvedHtml ? htmlToPlainText(resolvedHtml) ?? null : null);

    if (fallbackText) {
      const buffer = await buildPdfFromText(fallbackText);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="contract.pdf"');
      res.status(200).send(buffer);
      return;
    }

    res.status(500).json({ error: "Failed to generate PDF document." });
  } catch (error) {
    console.error("[export] PDF generation failed", error);
    res.status(500).json({ error: "Failed to generate PDF document." });
  }
});
