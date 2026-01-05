import express from "express";
import { createRequire } from "node:module";
import { generatePdfFromHtml } from "../services/adobePdfService";
import { convertDocument } from "../services/cloudConvertService";
import type { StorageObjectRef } from "../../shared/api";
import { getDraftSnapshotById } from "../services/draftSnapshotsRepository";
import { downloadStorageObject } from "../services/storageService";
import { htmlToPlainText } from "../utils/htmlTransforms";

// Guard for runtimes where import.meta.url is missing after bundling
const require =
  typeof import.meta?.url === "string"
    ? createRequire(import.meta.url)
    : createRequire(process.cwd() + "/");

type HtmlDocxModule = {
  asBlob: (html: string, options?: Record<string, unknown>) => Blob | Buffer;
};

type HtmlPdfModule = {
  generatePdf: (
    file: { content: string },
    options: Record<string, unknown>,
  ) => Promise<Buffer>;
};

let htmlDocxModule: HtmlDocxModule | null = null;
function loadHtmlDocx(): HtmlDocxModule {
  if (!htmlDocxModule) {
    htmlDocxModule = require("html-docx-js") as HtmlDocxModule;
  }
  return htmlDocxModule;
}

let htmlPdfModulePromise: Promise<HtmlPdfModule> | null = null;
async function loadHtmlPdf(): Promise<HtmlPdfModule> {
  if (!htmlPdfModulePromise) {
    htmlPdfModulePromise = Promise.resolve(
      require("html-pdf-node") as HtmlPdfModule,
    );
  }
  return htmlPdfModulePromise;
}

let docxModulePromise: Promise<typeof import("docx")> | null = null;
async function loadDocx() {
  if (!docxModulePromise) {
    docxModulePromise = import("docx");
  }
  return docxModulePromise;
}

type PdfKitModule = typeof import("pdfkit");
let pdfKitModulePromise: Promise<any> | null = null;
async function loadPdfKit(): Promise<any> {
  if (!pdfKitModulePromise) {
    pdfKitModulePromise = import("pdfkit").then(
      (mod) => (mod as { default?: PdfKitModule }).default ?? mod,
    );
  }
  return pdfKitModulePromise;
}

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

interface RedlineEntry {
  id: string;
  anchorText: string;
  proposedText: string;
  intent?: string;
  rationale?: string;
  clauseTitle?: string;
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
    const htmlDocx = loadHtmlDocx();
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

async function buildDocxFromText(text: string) {
  const { Document, Packer, Paragraph } = await loadDocx();
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

async function buildPdfFromText(text: string): Promise<Buffer> {
  const PDFDocument = await loadPdfKit();
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseRedlinePayload(body: unknown) {
  const record = asRecord(body) ?? {};
  const contractName =
    typeof record.contractName === "string" && record.contractName.trim().length > 0
      ? record.contractName.trim()
      : "Contract";
  const rawEdits = Array.isArray(record.proposedEdits)
    ? record.proposedEdits
    : Array.isArray(record.edits)
      ? record.edits
      : [];
  const edits: RedlineEntry[] = rawEdits
    .map((candidate, index) => {
      const entry = asRecord(candidate);
      if (!entry) return null;
      const anchor =
        typeof entry.anchorText === "string" ? entry.anchorText.trim() : "";
      const proposed =
        typeof entry.proposedText === "string"
          ? entry.proposedText.trim()
          : "";
      if (!anchor && !proposed) {
        return null;
      }
      return {
        id:
          typeof entry.id === "string" && entry.id.trim().length > 0
            ? entry.id
            : `edit-${index + 1}`,
        anchorText: anchor || "Existing clause",
        proposedText: proposed || anchor || "Updated clause",
        intent:
          typeof entry.intent === "string" && entry.intent.trim().length > 0
            ? entry.intent.trim()
            : undefined,
        rationale:
          typeof entry.rationale === "string" &&
          entry.rationale.trim().length > 0
            ? entry.rationale.trim()
            : undefined,
        clauseTitle:
          typeof entry.clauseTitle === "string" &&
          entry.clauseTitle.trim().length > 0
            ? entry.clauseTitle.trim()
            : typeof entry.clauseId === "string" &&
                entry.clauseId.trim().length > 0
              ? entry.clauseId.trim()
              : undefined,
      } as RedlineEntry;
    })
    .filter((entry): entry is RedlineEntry => Boolean(entry));

  return { contractName, edits };
}

function buildSmartRedlineHtml(
  contractName: string,
  edits: RedlineEntry[],
): string {
  const styleBlock = `
    <style>
      .redline-header { margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #E8DDDD; }
      .redline-card { border: 1px solid #E8DDDD; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; background: #FEFBFB; }
      .redline-card h4 { margin: 0 0 6px 0; font-size: 13pt; color: #271D1D; }
      .redline-label { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.05em; color: #6B4F4F; }
      .redline-removed { text-decoration: line-through; color: #a23434; }
      .redline-added { color: #0f6c3f; font-weight: bold; }
      .redline-meta { font-size: 10pt; color: #5c4a4a; margin-top: 6px; }
    </style>
  `;
  const blocks = edits
    .map((edit, index) => {
      const displayTitle =
        edit.clauseTitle || edit.intent || `Clause ${index + 1}`;
      return `
        <div class="redline-card">
          <h4>${escapeHtml(displayTitle)}</h4>
          <p class="redline-label">Current language</p>
          <p class="redline-removed">${escapeHtml(edit.anchorText)}</p>
          <p class="redline-label" style="margin-top:8px;">Proposed language</p>
          <p class="redline-added">${escapeHtml(edit.proposedText)}</p>
          ${
            edit.rationale
              ? `<p class="redline-meta">Rationale: ${escapeHtml(edit.rationale)}</p>`
              : ""
          }
        </div>
      `;
    })
    .join("");
  return `
    ${styleBlock}
    <div class="redline-header">
      <h2>Smart Redline Draft</h2>
      <p><strong>Contract:</strong> ${escapeHtml(contractName)}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>
    ${blocks || "<p>No edits were available.</p>"}
  `;
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

      if (process.env.CLOUDCONVERT_API_KEY) {
        const converted = await convertDocument({
          buffer: Buffer.from(effectiveHtml, "utf8"),
          fileName: `draft-${Date.now()}.html`,
          inputFormat: "html",
          outputFormat: "pdf",
        });
        if (converted) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="contract.pdf"',
          );
          res.status(200).send(converted);
          return;
        }
      }

      try {
        const htmlPdf = await loadHtmlPdf();
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

exportRouter.post("/redline", jsonParser, async (req, res) => {
  const payload = parseRedlinePayload(req.body);
  if (payload.edits.length === 0) {
    res.status(400).json({
      error: "Provide at least one proposed edit to generate a redline.",
    });
    return;
  }

  try {
    const html = buildSmartRedlineHtml(payload.contractName, payload.edits);
    const buffer = await buildDocxFromHtml(html);
    if (!buffer) {
      res.status(500).json({ error: "Failed to build smart redline document." });
      return;
    }

    const safeTitle = payload.contractName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "contract";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}-maigon-redline.docx"`,
    );
    res.status(200).send(buffer);
  } catch (error) {
    console.error("[export] Smart redline generation failed", error);
    res.status(500).json({ error: "Failed to generate smart redline document." });
  }
});
