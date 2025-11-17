import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import PDFServicesSdk from "@adobe/pdfservices-node-sdk";

const clientId = process.env.ADOBE_CLIENT_ID;
const clientSecret = process.env.ADOBE_CLIENT_SECRET;

let cachedCredentials: PDFServicesSdk.Credentials | null = null;

function getCredentials(): PDFServicesSdk.Credentials | null {
  if (!clientId || !clientSecret) {
    return null;
  }
  if (!cachedCredentials) {
    cachedCredentials = PDFServicesSdk.Credentials.servicePrincipalCredentialsBuilder()
      .withClientId(clientId)
      .withClientSecret(clientSecret)
      .build();
  }
  return cachedCredentials;
}

export interface DocumentGenerationInput {
  templatePath: string;
  data: Record<string, unknown>;
  outputType: "pdf" | "docx";
}

export async function generateDocumentWithAdobe(
  input: DocumentGenerationInput,
): Promise<Buffer | null> {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);
  const documentMergeOperation = PDFServicesSdk.DocumentMerge.Operation.createNew();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "adobe-docgen-"));
  const dataPath = path.join(tempDir, `data-${randomUUID()}.json`);
  const resultPath = path.join(
    tempDir,
    `result-${randomUUID()}.${input.outputType === "pdf" ? "pdf" : "docx"}`,
  );

  try {
    await fs.writeFile(dataPath, JSON.stringify(input.data), "utf8");

    const templateFileRef = PDFServicesSdk.FileRef.createFromLocalFile(
      input.templatePath,
      PDFServicesSdk.DocumentMerge.SupportedSourceFormat.docx,
    );
    documentMergeOperation.setInput(templateFileRef);
    documentMergeOperation.setDataFile(
      PDFServicesSdk.FileRef.createFromLocalFile(dataPath),
    );
    documentMergeOperation.setOutputFormat(
      input.outputType === "pdf"
        ? PDFServicesSdk.DocumentMerge.SupportedDocumentFormat.pdf
        : PDFServicesSdk.DocumentMerge.SupportedDocumentFormat.docx,
    );

    const result = await documentMergeOperation.execute(executionContext);
    await result.saveAsFile(resultPath);
    const buffer = await fs.readFile(resultPath);
    return buffer;
  } catch (error) {
    console.error("[adobe] Document generation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    await Promise.allSettled([
      fs.rm(dataPath, { force: true }),
      fs.rm(resultPath, { force: true }),
    ]);
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}
