import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

// Avoid crashes when import.meta.url is undefined in certain bundles (e.g., Netlify funcs CJS)
const require =
  typeof import.meta?.url === "string"
    ? createRequire(import.meta.url)
    : createRequire(process.cwd() + "/");

type AdobeSdk = any;

let pdfSdkPromise: Promise<AdobeSdk | null> | null = null;
async function loadPdfSdk(): Promise<AdobeSdk | null> {
  if (!pdfSdkPromise) {
    pdfSdkPromise = Promise.resolve().then(() => {
      try {
        const pdfSdkModule = require("@adobe/pdfservices-node-sdk") as {
          default?: AdobeSdk;
        };
        return pdfSdkModule?.default ?? (pdfSdkModule as AdobeSdk);
      } catch (error) {
        console.error("[adobe] Failed to load PDF Services SDK", {
          message: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });
  }
  return pdfSdkPromise;
}

const clientId = process.env.ADOBE_CLIENT_ID;
const clientSecret = process.env.ADOBE_CLIENT_SECRET;

let cachedCredentials: any = null;

async function getCredentials(
  sdk: AdobeSdk | null,
): Promise<any> {
  if (!sdk || !clientId || !clientSecret) {
    return null;
  }
  const builder = sdk.Credentials?.servicePrincipalCredentialsBuilder;
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
  const sdk = await loadPdfSdk();
  const credentials = await getCredentials(sdk);
  if (!credentials) {
    return null;
  }

  const executionContext = sdk.ExecutionContext.create(credentials);
  const createPdfOperation = sdk.CreatePDF.Operation.createNew();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "adobe-create-pdf-"));
  const htmlPath = path.join(tempDir, `source-${randomUUID()}.html`);
  const outputPath = path.join(tempDir, `output-${randomUUID()}.pdf`);

  try {
    await fs.writeFile(htmlPath, html, "utf8");
    const input = sdk.FileRef.createFromLocalFile(
      htmlPath,
      sdk.CreatePDF.SupportedSourceFormat.html,
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
