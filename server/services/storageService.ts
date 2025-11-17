import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import type { StorageObjectRef } from "../../shared/api";

export const DEFAULT_BUCKET =
  process.env.SUPABASE_STORAGE_INGEST_BUCKET ?? "contracts";

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function uploadToStorage(options: {
  localFilePath: string;
  originalName: string;
  ingestionId: string;
  contentType?: string;
  bucket?: string;
}) {
  const { localFilePath, originalName, ingestionId, contentType, bucket } =
    options;

  const resolvedBucket = bucket ?? DEFAULT_BUCKET;
  if (!resolvedBucket) {
    throw new Error("No Supabase storage bucket configured for ingestion");
  }

  const supabase = getSupabaseAdminClient();

  const safeName = sanitizeFileName(originalName) || "file";
  const storagePath = path.posix.join("raw", ingestionId, safeName);

  const fileStats = await fs.stat(localFilePath);
  const fileStream = createReadStream(localFilePath);

  const uploadOptions: Record<string, unknown> = {
    contentType,
  };

  // Node fetch requires the duplex hint when streaming request bodies
  (uploadOptions as any).duplex = "half";
  (uploadOptions as any).metadata = {
    originalName,
    ingestionId,
  };

  const uploadResult = await supabase.storage
    .from(resolvedBucket)
    .upload(storagePath, fileStream as any, uploadOptions as any);

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  return {
    bucket: resolvedBucket,
    path: storagePath,
    size: fileStats.size,
    contentType: contentType ?? "application/octet-stream",
  };
}

export async function uploadBufferToStorage(options: {
  buffer: Buffer;
  fileName: string;
  ingestionId: string;
  contentType?: string;
  bucket?: string;
  prefix?: string;
}): Promise<{ bucket: string; path: string; contentType: string }> {
  const { buffer, fileName, ingestionId, contentType, bucket, prefix } = options;
  const resolvedBucket = bucket ?? DEFAULT_BUCKET;
  const supabase = getSupabaseAdminClient();

  const safeName = sanitizeFileName(fileName) || "file";
  const basePath = prefix ?? "derived";
  const storagePath = path.posix.join(basePath, ingestionId, safeName);

  const uploadOptions: Record<string, unknown> = {
    contentType,
    upsert: true,
  };

  const { error } = await supabase.storage
    .from(resolvedBucket)
    .upload(storagePath, buffer, uploadOptions);

  if (error) {
    throw error;
  }

  return {
    bucket: resolvedBucket,
    path: storagePath,
    contentType: contentType ?? "application/octet-stream",
  };
}

export async function removeLocalFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn("Failed to cleanup local upload file", { filePath, error });
  }
}

export async function listIngestionFiles(
  ingestionId: string,
  bucket?: string,
) {
  const resolvedBucket = bucket ?? DEFAULT_BUCKET;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.storage
    .from(resolvedBucket)
    .list(path.posix.join("raw", ingestionId), {
      limit: 10,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function downloadIngestionFile(options: {
  ingestionId: string;
  fileName: string;
  bucket?: string;
}): Promise<{ localPath: string; mimeType?: string; size?: number } | null> {
  const { ingestionId, fileName, bucket } = options;
  const resolvedBucket = bucket ?? DEFAULT_BUCKET;
  const supabase = getSupabaseAdminClient();

  const storagePath = path.posix.join("raw", ingestionId, fileName);
  const { data, error } = await supabase.storage
    .from(resolvedBucket)
    .download(storagePath);

  if (error) {
    if (error.name === "StorageApiError" && (error as any).statusCode === 404) {
      return null;
    }
    throw error;
  }

  const tmpDir = path.join(process.cwd(), "tmp", "ingestion-cache", ingestionId);
  await fs.mkdir(tmpDir, { recursive: true });

  const localPath = path.join(tmpDir, fileName);
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(localPath, buffer);

  return {
    localPath,
    mimeType: data.type,
    size: buffer.length,
  };
}

export async function downloadStorageObject(
  ref: StorageObjectRef,
): Promise<{ buffer: Buffer; contentType: string | null } | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .download(ref.path);

  if (error) {
    if (error.name === "StorageApiError" && (error as any).statusCode === 404) {
      return null;
    }
    throw error;
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: data.type ?? null,
  };
}

export async function uploadDraftAsset(options: {
  contractId: string;
  buffer: Buffer;
  fileName: string;
  bucket?: string;
}): Promise<StorageObjectRef> {
  const uploaded = await uploadBufferToStorage({
    buffer: options.buffer,
    fileName: options.fileName,
    ingestionId: options.contractId,
    bucket: options.bucket,
    prefix: "drafts",
  });

  return {
    bucket: uploaded.bucket,
    path: uploaded.path,
  };
}
