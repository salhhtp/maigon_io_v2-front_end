export interface IngestionUploadResponse {
  ingestionId: string;
  status: string;
  file: {
    originalName: string;
    mimeType: string;
    size: number;
  };
  storage: {
    bucket: string;
    path: string;
    size: number;
    contentType: string;
  };
  record?: {
    id: string;
    status: string;
    storage_bucket: string;
    storage_path: string;
    original_name: string;
    mime_type?: string;
    file_size?: number;
    created_at?: string;
    updated_at?: string;
  } | null;
}

import type { ExtractionAssets } from "@shared/api";

export interface ExtractionResult {
  ingestionId: string;
  status: string;
  result: {
    text: string;
    html?: string;
    strategy: string;
    wordCount: number;
    characterCount: number;
    pageCount?: number;
    warnings: string[];
    needsOcr: boolean;
    metadata?: Record<string, unknown>;
    mimeType?: string;
    originalFileName: string;
    fileSize?: number;
    assets?: ExtractionAssets;
  };
  record?: Record<string, unknown> | null;
}

function createError(message: string, details?: unknown) {
  const error = new Error(message);
  (error as any).details = details;
  return error;
}

export async function uploadDocument(
  file: File,
  options?: { userId?: string; userProfileId?: string },
): Promise<IngestionUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.userId) {
    formData.append("userId", options.userId);
  }
  if (options?.userProfileId) {
    formData.append("userProfileId", options.userProfileId);
  }

  const response = await fetch("/api/ingest", {
    method: "POST",
    body: formData,
  });

  const payload = await safeParseJson(response);

  if (!response.ok) {
    throw createError(
      payload?.error || "Failed to upload document for ingestion",
      payload,
    );
  }

  return payload as IngestionUploadResponse;
}

export async function extractDocument(
  ingestionId: string,
): Promise<ExtractionResult> {
  const response = await fetch(`/api/ingest/${ingestionId}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = await safeParseJson(response);

  if (!response.ok) {
    throw createError(
      payload?.error || "Failed to extract document",
      payload,
    );
  }

  return payload as ExtractionResult;
}

async function safeParseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}
