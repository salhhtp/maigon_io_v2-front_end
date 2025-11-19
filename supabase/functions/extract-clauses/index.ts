import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  type SupabaseClient,
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import type { ClauseExtraction } from "../_shared/reviewSchema.ts";
import { extractClausesWithAI } from "../_shared/aiClauseExtractor.ts";

interface ClauseExtractionRequest {
  ingestionId?: string;
  content?: string;
  contractType?: string;
  filename?: string;
  forceRefresh?: boolean;
  maxClauses?: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractIngestionRecord {
  id: string;
  extracted_text?: string | null;
  metadata?: Record<string, unknown> | null;
  original_name?: string | null;
}

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase service credentials not configured.");
  }
  supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdmin;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let request: ClauseExtractionRequest | null = null;

  try {
    try {
      request = await req.json();
    } catch (error) {
      return jsonError("Invalid JSON in request body", 400, error);
    }

    if (!request || (!request.content && !request.ingestionId)) {
      return jsonError(
        "Provide either raw contract content or an ingestionId.",
        400,
      );
    }

    let ingestionRecord: ContractIngestionRecord | null = null;
    if (request.ingestionId) {
      ingestionRecord = await loadIngestionRecord(request.ingestionId);
    }

    const cachedClauses = readStoredClauses(ingestionRecord);
    if (
      cachedClauses.length > 0 &&
      !request.forceRefresh &&
      !request.content
    ) {
      return new Response(
        JSON.stringify({
          source: "cache",
          clauses: cachedClauses,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const content =
      request.content ??
      ingestionRecord?.extracted_text ??
      "";
    if (!content.trim()) {
      return jsonError(
        "No contract text available for clause extraction.",
        400,
      );
    }

    const contractType =
      request.contractType ??
      (ingestionRecord?.metadata as Record<string, unknown>)?.["contractType"] ??
      "contract";
    const filename = request.filename ?? ingestionRecord?.original_name ?? null;

    let source: "segment-parser" | "fallback" = "segment-parser";
    let clauses: ClauseExtraction[] = [];
    let rawPayload: unknown = null;

    try {
      const aiResult = await extractClausesWithAI({
        content,
        contractType,
        filename,
        maxClauses: request.maxClauses ?? 15,
      });
      clauses = aiResult.clauses;
      rawPayload = aiResult.raw;
      source = aiResult.source;
    } catch (error) {
      console.error("❌ GPT clause extraction failed, using fallback snippet parser", {
        error: error instanceof Error ? error.message : String(error),
      });
      source = "fallback";
      clauses = buildFallbackClauses(content, contractType, request.maxClauses ?? 15);
    }

    if (!clauses.length) {
      return jsonError("Clause extraction produced no results.", 422);
    }

    if (ingestionRecord) {
      await persistClauses(ingestionRecord, clauses);
    }

    return new Response(
      JSON.stringify({
        source,
        clauses,
        raw: rawPayload,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unexpected error",
      500,
      error,
    );
  }
});

async function loadIngestionRecord(id: string): Promise<ContractIngestionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_ingestions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (!data) throw new Error("Ingestion record not found.");
  return data as ContractIngestionRecord;
}

function readStoredClauses(
  record: ContractIngestionRecord | null,
): ClauseExtraction[] {
  if (!record?.metadata) return [];
  const meta = record.metadata as Record<string, unknown>;
  const clauses = meta["clauseExtractions"];
  if (!Array.isArray(clauses)) {
    return [];
  }
  return clauses.filter(
    (entry): entry is ClauseExtraction =>
      entry && typeof entry === "object" && typeof entry.id === "string",
  );
}

async function persistClauses(
  record: ContractIngestionRecord,
  clauses: ClauseExtraction[],
) {
  try {
    const supabase = getSupabaseAdminClient();
    const currentMeta = (record.metadata ?? {}) as Record<string, unknown>;
    currentMeta.clauseExtractions = clauses;
    const { error } = await supabase
      .from("contract_ingestions")
      .update({ metadata: currentMeta })
      .eq("id", record.id);
    if (error) {
      console.warn("⚠️ Failed to persist clause extractions:", error);
    }
  } catch (error) {
    console.warn("⚠️ Unable to persist clause extractions:", error);
  }
}

function jsonError(message: string, status: number, error?: unknown) {
  if (error) {
    console.error("Clause extraction error:", {
      status,
      message,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildFallbackClauses(
  content: string,
  contractType: string,
  limit: number,
): ClauseExtraction[] {
  if (!content || content.trim().length === 0) {
    return [];
  }
  const lines = content.split(/\r?\n/);
  const clauses: ClauseExtraction[] = [];
  let currentTitle = "";
  let buffer: string[] = [];
  const pushClause = () => {
    if (!currentTitle || buffer.length === 0) return;
    const snippet = buffer.join(" ").slice(0, 420);
    clauses.push({
      id: `fallback-${clauses.length + 1}`,
      clauseId: currentTitle
        ? currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64)
        : `fallback-${clauses.length + 1}`,
      title: currentTitle,
      originalText: snippet,
      normalizedText: snippet,
      category: inferFallbackCategory(currentTitle),
      importance: inferFallbackImportance(currentTitle),
      location: {
        page: null,
        paragraph: null,
        section: currentTitle,
        clauseNumber: null,
      },
      references: [],
      metadata: {
        source: "fallback-parser",
        contractType,
      },
    });
    buffer = [];
  };

  const headingRegex =
    /^(section\s+\d+|article\s+\d+|\d+(\.\d+)*\.?|[A-Z][A-Z\s-]+)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (headingRegex.test(line) && line.length <= 140) {
      pushClause();
      currentTitle = line.replace(/[:.-\s]+$/, "").slice(0, 160);
      continue;
    }
    if (!currentTitle) {
      currentTitle = "Preamble";
    }
    buffer.push(line);
    if (buffer.join(" ").length > 500) {
      pushClause();
    }
  }
  pushClause();

  if (!clauses.length) {
    clauses.push({
      id: "fallback-1",
      clauseId: "overview",
      title: `${contractType || "contract"} overview`,
      originalText: content.slice(0, 420),
      normalizedText: content.slice(0, 420),
      category: "general",
      importance: "medium",
      location: {
        page: null,
        paragraph: null,
        section: "overview",
        clauseNumber: null,
      },
      references: [],
      metadata: {
        source: "fallback-parser",
        contractType,
      },
    });
  }

  return clauses.slice(0, limit);
}

function inferFallbackCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("confidential")) return "confidential_information";
  if (lower.includes("term") || lower.includes("termination"))
    return "term_and_termination";
  if (lower.includes("liability") || lower.includes("indemn"))
    return "liability";
  if (lower.includes("remed") || lower.includes("performance"))
    return "remedies";
  if (lower.includes("law") || lower.includes("dispute"))
    return "governing_law";
  return "general";
}

function inferFallbackImportance(title: string): ClauseExtraction["importance"] {
  const lower = title.toLowerCase();
  if (lower.includes("liability") || lower.includes("indemn")) return "critical";
  if (lower.includes("term") || lower.includes("termination")) return "high";
  if (lower.includes("confidential")) return "high";
  if (lower.includes("remed") || lower.includes("dispute")) return "medium";
  return "low";
}
