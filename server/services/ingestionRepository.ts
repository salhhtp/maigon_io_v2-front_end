import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import type { DocumentExtractionResult } from "./documentExtractionService";

export interface CreateIngestionRecordOptions {
  ingestionId: string;
  storageBucket: string;
  storagePath: string;
  originalName: string;
  mimeType?: string;
  fileSize?: number;
  userId?: string;
}

export interface SaveExtractionOptions {
  ingestionId: string;
  extraction: DocumentExtractionResult;
  statusOverride?: string;
}

export async function getIngestionRecord(ingestionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_ingestions")
    .select("*")
    .eq("id", ingestionId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createIngestionRecord(
  options: CreateIngestionRecordOptions,
) {
  const supabase = getSupabaseAdminClient();
  const {
    ingestionId,
    storageBucket,
    storagePath,
    originalName,
    mimeType,
    fileSize,
    userId,
  } = options;

  const { data, error } = await supabase
    .from("contract_ingestions")
    .upsert(
      {
        id: ingestionId,
        user_id: userId ?? null,
        status: "uploaded",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        original_name: originalName,
        mime_type: mimeType ?? null,
        file_size: fileSize ?? null,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveExtractionResult(options: SaveExtractionOptions) {
  const supabase = getSupabaseAdminClient();
  const { ingestionId, extraction, statusOverride } = options;

  const status = statusOverride
    ? statusOverride
    : extraction.needsOcr
    ? "needs_ocr"
    : "extracted";

  const { data, error } = await supabase
    .from("contract_ingestions")
    .update({
      status,
      strategy: extraction.strategy,
      word_count: extraction.wordCount,
      character_count: extraction.characterCount,
      page_count: extraction.pageCount ?? null,
      warnings: extraction.warnings,
      needs_ocr: extraction.needsOcr,
      extracted_text: extraction.text,
      extracted_html: extraction.html ?? null,
      metadata: {
        ...(extraction.metadata ?? {}),
        assets: extraction.assets ?? (extraction.metadata as any)?.assets,
      },
      mime_type: extraction.mimeType ?? null,
      extracted_at: new Date().toISOString(),
    })
    .eq("id", ingestionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
