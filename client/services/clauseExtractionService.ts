import { supabase } from "@/lib/supabase";
import { logError } from "@/utils/errorLogger";
import type { ClauseExtraction } from "@shared/ai/reviewSchema";

interface ClauseExtractionResponse {
  source: string;
  clauses: ClauseExtraction[];
}

interface ClauseExtractionRequestBody {
  ingestionId?: string;
  content?: string;
  contractType?: string;
  filename?: string | null;
  forceRefresh?: boolean;
}

class ClauseExtractionService {
  async ensureClauses(
    body: ClauseExtractionRequestBody,
  ): Promise<ClauseExtractionResponse> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Authentication required to extract clauses.");
    }

    if (!body.ingestionId && !body.content) {
      throw new Error("Provide ingestionId or raw content for clause extraction.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const { data, error } = await supabase.functions.invoke<
      ClauseExtractionResponse
    >("extract-clauses", {
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!error && data) {
      return data;
    }

    const serializedError =
      error instanceof Error ? error.message : JSON.stringify(error);

    logError(
      "Clause extraction failed",
      new Error(
        serializedError || "Edge Function error during clause extraction",
      ),
      {
        ingestionId: body.ingestionId,
      },
    );

    throw new Error(
      (error as { message?: string })?.message ??
        "Clause extraction failed. Please retry.",
    );
  }
}

export const clauseExtractionService = new ClauseExtractionService();
export default clauseExtractionService;
