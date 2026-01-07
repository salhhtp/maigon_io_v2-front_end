import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  validateExtractedText,
} from "../_shared/pdf-parser.ts";
import { extractClausesWithAI } from "../_shared/aiClauseExtractor.ts";
import type { ClauseExtraction } from "../_shared/reviewSchema.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

interface IngestRequest {
  ingestionId?: string;
  content?: string; // may be plain text or base64 with PDF/DOCX prefix
  fileType?: string;
  fileName?: string;
  documentFormat?: string;
  contractType?: string;
  forceRefresh?: boolean;
}

interface ContractIngestionRecord {
  id: string;
  status: string;
  extracted_text?: string | null;
  extracted_html?: string | null;
  metadata?: Record<string, unknown> | null;
  original_name?: string | null;
  mime_type?: string | null;
  word_count?: number | null;
  character_count?: number | null;
}

type ClauseDigestSummary = {
  summary: string;
  total: number;
  categoryCounts?: Record<string, number>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRole) {
    throw new Error("Supabase service credentials are not configured");
  }

  supabaseAdmin = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let request: IngestRequest | null = null;

  try {
    try {
      request = await req.json();
    } catch (parseError) {
      return jsonError("Invalid JSON in request body", 400, parseError);
    }

    if (!request || (!request.ingestionId && !request.content)) {
      return jsonError(
        "Provide ingestionId or content to ingest.",
        400,
      );
    }

    let ingestionRecord: ContractIngestionRecord | null = null;
    if (request.ingestionId) {
      try {
        ingestionRecord = await loadIngestionRecord(request.ingestionId);
      } catch (error) {
        return jsonError("Ingestion record not found", 404, error);
      }
    }

    // If we already have extracted text and seed, return early unless forceRefresh
    if (
      ingestionRecord &&
      ingestionRecord.extracted_text &&
      !request.forceRefresh
    ) {
      return jsonResponse({
        ingestionId: ingestionRecord.id,
        status: ingestionRecord.status,
        cached: true,
      });
    }

    const rawContent =
      request.content ?? ingestionRecord?.extracted_text ?? "";
    const fileType = request.fileType ?? ingestionRecord?.mime_type ?? "";
    const fileName = request.fileName ?? ingestionRecord?.original_name ?? "";

    if (!rawContent || rawContent.trim().length === 0) {
      return jsonError("No content provided for ingestion.", 400);
    }

    let extractedText = rawContent;
    if (
      rawContent.startsWith("PDF_FILE_BASE64:") ||
      rawContent.startsWith("DOCX_FILE_BASE64:")
    ) {
      extractedText = await extractTextFromFile(rawContent, fileType);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return jsonError("No text could be extracted from the file.", 422);
    }

    const contentHash = await hashText(extractedText);
    const clausesJob = await extractClausesWithAI({
      content: extractedText,
      contractType: request.contractType,
      filename: fileName,
      maxClauses: 20,
    }).catch((error) => {
      console.warn("⚠️ Clause extraction failed, continuing", error);
      return { clauses: [] as ClauseExtraction[], source: "fallback" as const, raw: null };
    });

    const clauseDigest = buildClauseDigestForPrompt(clausesJob.clauses ?? []);

    // Persist into ingestion record if available
    if (ingestionRecord) {
      const supabase = getSupabaseAdminClient();
      const metadata: Record<string, unknown> = {
        ...(ingestionRecord.metadata ?? {}),
        clauseExtractions: clausesJob.clauses ?? [],
        analysisSeed: {
          contentHash,
          clauseDigest,
        },
      };

      const { error } = await supabase
        .from("contract_ingestions")
        .update({
          extracted_text: extractedText,
          word_count: wordCount(extractedText),
          character_count: extractedText.length,
          metadata,
          status: "ready",
        })
        .eq("id", ingestionRecord.id);

      if (error) {
        console.error("❌ Failed to persist ingestion record", error);
        return jsonError("Failed to persist ingestion data", 500, error);
      }

      return jsonResponse({
        ingestionId: ingestionRecord.id,
        status: "ready",
        cached: false,
        clausesCached: (clausesJob.clauses ?? []).length,
      });
    }

    // No ingestion record provided; return processed artifacts directly
    return jsonResponse({
      ingestionId: null,
      status: "ready",
      extractedText,
      wordCount: wordCount(extractedText),
      characterCount: extractedText.length,
      clauseDigest,
      clauses: clausesJob.clauses ?? [],
      contentHash,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unexpected error",
      500,
      error,
    );
  }
});

async function loadIngestionRecord(
  ingestionId: string,
): Promise<ContractIngestionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_ingestions")
    .select("*")
    .eq("id", ingestionId)
    .single();
  if (error) throw error;
  if (!data) {
    throw new Error("Ingestion record not found");
  }
  return data as ContractIngestionRecord;
}

async function extractTextFromFile(content: string, fileType: string) {
  if (content.startsWith("PDF_FILE_BASE64:")) {
    const base64Data = content.replace("PDF_FILE_BASE64:", "");
    const extractedText = await extractTextFromPDF(base64Data);
    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      throw new Error(validation.error || "PDF text extraction failed");
    }
    return extractedText;
  }

  if (content.startsWith("DOCX_FILE_BASE64:")) {
    const base64Data = content.replace("DOCX_FILE_BASE64:", "");
    const extractedText = await extractTextFromDOCX(base64Data);
    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      throw new Error(validation.error || "DOCX text extraction failed");
    }
    return extractedText;
  }

  return content;
}

async function hashText(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildClauseDigestForPrompt(clauses: ClauseExtraction[]): ClauseDigestSummary {
  if (!clauses.length) {
    return { summary: "Clause digest unavailable.", total: 0 };
  }
  const lines = clauses.map((clause) => {
    const heading = clause.title || clause.clauseId || "Clause";
    const category = clause.category ? clause.category : "general";
    const snippetSource = clause.originalText || clause.normalizedText || "";
    const snippet = snippetSource.replace(/\s+/g, " ").slice(0, 320);
    const locationHint =
      clause.location?.section ||
      clause.location?.clauseNumber ||
      null;
    return `[${clause.clauseId || heading} | ${category}] ${heading}${
      locationHint ? ` (${locationHint})` : ""
    } -> ${snippet}`;
  });
  const categoryCounts = clauses.reduce((acc, clause) => {
    const key = (clause.category || "general").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    summary: lines.join("\n"),
    total: clauses.length,
    categoryCounts,
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number, error?: unknown) {
  if (error) {
    console.error("Ingest error:", {
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
