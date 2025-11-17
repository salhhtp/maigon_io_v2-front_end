import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfSdkModule = require("@adobe/pdfservices-node-sdk") as {
  default?: typeof import("@adobe/pdfservices-node-sdk");
};
const PDFServicesSdk: typeof import("@adobe/pdfservices-node-sdk") =
  pdfSdkModule?.default ?? (pdfSdkModule as typeof import("@adobe/pdfservices-node-sdk"));

const clientId = process.env.ADOBE_CLIENT_ID;
const clientSecret = process.env.ADOBE_CLIENT_SECRET;

let cachedCredentials: PDFServicesSdk.Credentials | null = null;

function getCredentials(): PDFServicesSdk.Credentials | null {
  if (!clientId || !clientSecret) {
    return null;
  }
  const builder = PDFServicesSdk?.Credentials
    ?.servicePrincipalCredentialsBuilder;
  if (!builder) {
    console.warn(
      "[adobe] SDK is unavailable in this environment; falling back to alternate PDF builders.",
    );
    return null;
  }
  if (!cachedCredentials) {
    cachedCredentials = builder()
      .withClientId(clientId)
      .withClientSecret(clientSecret)
      .build();
  }
  return cachedCredentials;
}

export async function generatePdfFromHtml(html: string): Promise<Buffer | null> {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);
  const createPdfOperation = PDFServicesSdk.CreatePDF.Operation.createNew();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "adobe-create-pdf-"));
  const htmlPath = path.join(tempDir, `source-${randomUUID()}.html`);
  const outputPath = path.join(tempDir, `output-${randomUUID()}.pdf`);

  try {
    await fs.writeFile(htmlPath, html, "utf8");
    const input = PDFServicesSdk.FileRef.createFromLocalFile(
      htmlPath,
      PDFServicesSdk.CreatePDF.SupportedSourceFormat.html,
    );
    createPdfOperation.setInput(input);

    const result = await createPdfOperation.execute(executionContext);
    await result.saveAsFile(outputPath);
    const buffer = await fs.readFile(outputPath);
    return buffer;
  } catch (error) {
    console.error("[adobe] PDF generation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    await Promise.allSettled([
      fs.rm(htmlPath, { force: true }),
      fs.rm(outputPath, { force: true }),
    ]);
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}
