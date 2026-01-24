import { supabase } from "@/lib/supabase";
import { generateFallbackAnalysis } from "./fallbackAnalysis";
import logger from "@/utils/logger";
import { errorHandler } from "@/utils/errorHandler";
import {
  logError,
  createUserFriendlyMessage,
  extractErrorDetails,
  safeStringify,
} from "@/utils/errorLogger";
import type { CustomSolution } from "@shared/api";
import type { AnalysisReport } from "@shared/ai/reviewSchema";

// Enhanced AI Model Configuration for Advanced Contract Analysis
export enum AIModel {
  OPENAI_GPT35 = "openai-gpt-3.5-turbo",
  OPENAI_GPT4 = "openai-gpt-4",
  OPENAI_GPT4O = "openai-gpt-4o",
  OPENAI_GPT5_PRO = "openai-gpt-5-pro",
  OPENAI_GPT5 = "openai-gpt-5",
  OPENAI_GPT5_MINI = "openai-gpt-5-mini",
  OPENAI_GPT5_NANO = "openai-gpt-5-nano",
  ANTHROPIC_CLAUDE = "anthropic-claude-3",
  ANTHROPIC_CLAUDE_OPUS = "anthropic-claude-3-opus",
  GOOGLE_GEMINI = "google-gemini-pro",
}

export const ensureGpt5Model = (
  model?: string | null,
  options: { defaultTier?: "mini" | "standard" | "pro" | "nano" } = {},
): AIModel => {
  const normalized = typeof model === "string" ? model.toLowerCase() : "";
  if (normalized.includes("gpt-5") && normalized.includes("mini")) {
    return AIModel.OPENAI_GPT5_MINI;
  }
  if (normalized.includes("gpt-5") && normalized.includes("pro")) {
    return AIModel.OPENAI_GPT5_PRO;
  }
  if (normalized.includes("gpt-5") && normalized.includes("nano")) {
    return AIModel.OPENAI_GPT5_NANO;
  }
  if (normalized.includes("gpt-5")) {
    return AIModel.OPENAI_GPT5;
  }
  switch (options.defaultTier ?? "standard") {
    case "mini":
      return AIModel.OPENAI_GPT5_MINI;
    case "pro":
      return AIModel.OPENAI_GPT5_PRO;
    case "nano":
      return AIModel.OPENAI_GPT5_NANO;
    default:
      return AIModel.OPENAI_GPT5;
  }
};

export interface ContractAnalysisRequest {
  content: string;
  reviewType: string;
  contractType?: string;
  perspective?: string;
  perspectiveLabel?: string;
  customSolution?: CustomSolution;
  model?: AIModel;
  userId: string;
  filename?: string;
  fileType?: string;
  fileName?: string;
  documentFormat?: string;
  ingestionId?: string;
  ingestionWarnings?: unknown;
  classification?: any;
  async?: boolean;
  responseId?: string;
  selectedSolution?: {
    id?: string;
    key?: string;
    title?: string;
  };
}

export interface AnalysisResult {
  timestamp: string;
  pages: number;
  processing_time: number;
  score: number;
  confidence: number;
  model_used: AIModel;
  custom_solution_id?: string;

  // Risk Assessment specific
  risks?: Array<{
    type: "financial" | "legal" | "operational" | "compliance";
    level: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation?: string;
    impact_score?: number;
  }>;

  // Compliance specific
  compliance_areas?: {
    gdpr?: number;
    financial_regulations?: number;
    industry_standards?: number;
    data_protection?: number;
    employment_law?: number;
    [key: string]: number | undefined;
  };
  violations?: Array<{
    framework: string;
    severity: "low" | "medium" | "high";
    description: string;
    recommendation: string;
  }>;

  // Perspective Review specific
  perspectives?: {
    buyer?: { score: number; concerns: string[]; advantages: string[] };
    seller?: { score: number; concerns: string[]; advantages: string[] };
    legal?: { score: number; concerns: string[]; advantages: string[] };
    individual?: { score: number; concerns: string[]; advantages: string[] };
  };

  // Full Summary specific
  summary?: string;
  key_points?: string[];
  critical_clauses?: Array<{
    clause?: string;
    clause_title?: string;
    clause_number?: string;
    clause_text?: string;
    importance?: "critical" | "high" | "medium" | "low";
    recommendation?: string;
    page_reference?: string | null;
    evidence_excerpt?: string;
    negotiation_priority?: "must_have" | "should_have" | "nice_to_have";
  }>;

  // Common fields
  recommendations?: Array<RecommendationEntry>;
  strategic_recommendations?: Array<RecommendationEntry>;
  action_items?: Array<RecommendationEntry>;
  extracted_terms?: Record<string, any>;
  confidence_breakdown?: {
    content_clarity: number;
    legal_complexity: number;
    risk_identification: number;
    compliance_assessment: number;
  };
  structured_report?: AnalysisReport;
}

export interface RecommendationEntry {
  id: string;
  description: string;
  severity?: "critical" | "high" | "medium" | "low" | string;
  department?: string;
  owner?: string;
  due_timeline?: string;
  category?: string;
  duplicate_of?: string | null;
  next_step?: string;
}

const isFunctionsFetchError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as { name?: unknown; message?: unknown };
  const name = typeof err.name === "string" ? err.name : "";
  const message = typeof err.message === "string" ? err.message : "";
  return (
    name === "FunctionsFetchError" ||
    message.includes("Failed to send a request to the Edge Function")
  );
};

const supabaseFunctionsUrl =
  typeof import.meta !== "undefined" &&
  typeof (import.meta as any)?.env?.VITE_SUPABASE_URL === "string"
    ? ((import.meta as any).env.VITE_SUPABASE_URL as string)
    : undefined;

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class AIService {
  private static instance: AIService;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Main contract analysis method with enhanced reliability
  async analyzeContract(
    request: ContractAnalysisRequest,
  ): Promise<AnalysisResult> {
    const startTime = performance.now();
    let lastError: Error | null = null;
    const maxRetries = 1; // avoid multiple long-running attempts
    const enforcedModel = ensureGpt5Model(request.model, {
      defaultTier: "pro",
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.contractAction("AI analysis started", undefined, {
          reviewType: request.reviewType,
          model: enforcedModel,
          userId: request.userId,
          hasCustomSolution: !!request.customSolution,
          attempt,
        });

        // Ensure ingestion artifacts are ready (text/digest) when an ingestionId is provided
        if (request.ingestionId) {
          await this.measureAsync(
            "ai.ingestion_ready",
            () => this.ensureIngestionReady(request.ingestionId),
            {
              context: { ingestionId: request.ingestionId },
              warnMs: 20000,
            },
          );
        }

        // Get or create custom solution if provided
        let customSolution = request.customSolution;
        if (!customSolution && request.reviewType !== "ai_integration") {
          customSolution = await this.getDefaultSolution(
            request.reviewType,
            request.contractType,
          );
        }

        // Call the appropriate AI service with retries for different models
        const result = await this.measureAsync(
          "ai.call_service",
          () =>
            this.callAIService(
              { ...request, model: enforcedModel },
              customSolution,
            ),
          {
            context: {
              reviewType: request.reviewType,
              contractType: request.contractType,
              model: enforcedModel,
              ingestionId: request.ingestionId,
            },
            warnMs: 45000,
          },
        );

        const processingTime = (performance.now() - startTime) / 1000;

        const structuredScore =
          (result as any)?.structured_report?.generalInformation?.complianceScore;
        const parsedScore =
          typeof result.score === "number"
            ? result.score
            : Number(result.score);
        const finalScore = Number.isFinite(parsedScore)
          ? parsedScore
          : typeof structuredScore === "number"
            ? structuredScore
            : NaN;
        if (!Number.isFinite(finalScore)) {
          throw new Error("Invalid AI response: missing or invalid score");
        }

        const structuredConfidence =
          (result as any)?.structured_report?.metadata?.classification?.confidence;
        const parsedConfidence =
          typeof result.confidence === "number"
            ? result.confidence
            : Number(result.confidence);
        const finalConfidence = Number.isFinite(parsedConfidence)
          ? parsedConfidence
          : typeof structuredConfidence === "number"
            ? structuredConfidence
            : 0.75;

        const analysisResult: AnalysisResult = {
          ...result,
          processing_time: processingTime,
          timestamp: new Date().toISOString(),
          model_used: enforcedModel,
          custom_solution_id: customSolution?.id,
          pages: result.pages || 1,
          confidence: finalConfidence,
          score: finalScore,
        };

        logger.contractAction("AI analysis completed", undefined, {
          reviewType: request.reviewType,
          processingTime,
          score: finalScore,
          confidence: finalConfidence,
          userId: request.userId,
          attempt,
          contractType: request.contractType,
          model: analysisResult.model_used,
          fallbackUsed: Boolean((result as any)?.fallback_used),
        });

        return analysisResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        logError(`AI analysis attempt ${attempt} failed`, error, {
          reviewType: request.reviewType,
          userId: request.userId,
          attempt,
          model: request.model,
        });

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
          console.log(
            `⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed - provide detailed error message
    const finalErrorMessage = lastError?.message || "Unknown error occurred";
    logger.contractAction("AI analysis failed", undefined, {
      reviewType: request.reviewType,
      userId: request.userId,
      contractType: request.contractType,
      attempts: maxRetries,
      error: finalErrorMessage,
    });
    const errorDetails = {
      attempts: maxRetries,
      reviewType: request.reviewType,
      userId: request.userId,
      lastError: finalErrorMessage,
      timestamp: new Date().toISOString(),
    };

    logError(
      "❌ All AI analysis attempts failed",
      new Error(finalErrorMessage),
      {
        attempts: maxRetries,
        reviewType: request.reviewType,
        userId: request.userId,
        errorDetails,
      },
    );
    throw new Error(
      `Contract analysis failed after ${maxRetries} attempts: ${finalErrorMessage}`,
    );
  }

  // Call AI service with enhanced error handling and validation
  private async callAIService(
    request: ContractAnalysisRequest,
    customSolution?: CustomSolution,
  ): Promise<Partial<AnalysisResult>> {
    const requestedModel =
      request.model ||
      customSolution?.modelSettings?.reasoningModel ||
      customSolution?.aiModel ||
      AIModel.OPENAI_GPT5_PRO;
    const model = ensureGpt5Model(requestedModel, { defaultTier: "pro" });
    const originalContent =
      typeof request.content === "string" ? request.content : "";
    const contentLengthForRouting = originalContent.trim().length;
    const requestContent = request.ingestionId ? "" : originalContent;
    const asyncThreshold =
      Number(import.meta.env.VITE_AI_ASYNC_MIN_CHARS) || 20000;
    const defaultAsync =
      contentLengthForRouting === 0
        ? true
        : contentLengthForRouting >= asyncThreshold;

    // Validate request before sending: allow empty content if ingestionId is provided
    const hasContent = requestContent.trim().length > 0;
    if (!hasContent && !request.ingestionId) {
      throw new Error("Cannot analyze empty contract content");
    }

    if (!request.reviewType) {
      throw new Error("Review type is required for analysis");
    }

    const buildFallbackResult = (reason: string) =>
      generateFallbackAnalysis(request.reviewType, request.classification, {
        fallbackReason: reason,
        contractContent: request.content,
        contractType: request.contractType,
      });

    try {
      console.log("🔗 Calling Supabase Edge Function for AI analysis...", {
        model,
        reviewType: request.reviewType,
        contractType: request.contractType,
        contentLength: requestContent.length,
        ingestionId: request.ingestionId,
        hasClassification: !!(request as any).classification,
      });

      // Prepare the request body with all necessary data
      // First, ensure all properties are serializable
      const useAsync = typeof request.async === "boolean"
        ? request.async
        : defaultAsync;
      const requestBody: any = {
        content: requestContent,
        reviewType: request.reviewType,
        model,
        customSolution,
        contractType: request.contractType,
        perspective: request.perspective,
        perspectiveLabel: request.perspectiveLabel,
        fileType: request.fileType,
        fileName: request.fileName,
        filename: request.filename,
        documentFormat: request.documentFormat,
        classification: request.classification,
        ingestionId: request.ingestionId,
        ingestionWarnings: request.ingestionWarnings,
        selectedSolution: request.selectedSolution,
        async: useAsync,
      };

      // Log the full request body for debugging (with content truncated)
      console.log("📦 Request body prepared:", {
        ...requestBody,
        content: `${requestBody.content?.substring(0, 100)}... (${requestBody.content?.length} chars)`,
        customSolutionKeys: customSolution ? Object.keys(customSolution) : null,
        classificationKeys: requestBody.classification
          ? Object.keys(requestBody.classification)
          : null,
        selectedSolution: requestBody.selectedSolution,
        contentLengthForRouting,
        asyncThreshold,
      });

      // Validate that the request body is JSON-serializable
      try {
        const testSerialization = JSON.stringify(requestBody);
        console.log(
          "✅ Request body is JSON-serializable, size:",
          testSerialization.length,
          "bytes",
        );
      } catch (serError) {
        console.error("❌ Request body is NOT JSON-serializable:", serError);
        throw new Error(
          `Request body serialization failed: ${serError instanceof Error ? serError.message : String(serError)}`,
        );
      }

      // Check authentication state before calling Edge Function
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("❌ Authentication issue:", {
          hasSession: !!session,
          sessionError,
        });
        throw new Error("Authentication required. Please sign in again.");
      }
      console.log(
        "✅ Authentication valid, session expires:",
        new Date(session.expires_at! * 1000).toISOString(),
      );

      let { data, error } = await this.measureAsync(
        "ai.edge.invoke",
        () =>
          this.invokeEdgeFunctionWithRetry(
            requestBody,
            request.reviewType,
            session.access_token ?? null,
          ),
        {
          context: {
            reviewType: request.reviewType,
            model,
            async: useAsync,
            ingestionId: request.ingestionId,
            contentLength: requestContent.length,
          },
          warnMs: 45000,
        },
      );

      console.log("📥 Edge Function response:", {
        hasData: !!data,
        hasError: !!error,
        dataType: typeof data,
        errorType: typeof error,
      });

      if (error) {
        const serializedError = safeStringify(error);
        const errorMessage = this.formatEdgeErrorMessage(error);

        logError(
          isFunctionsFetchError(error)
            ? "Supabase Edge Function unreachable after retries"
            : "❌ Supabase Edge Function returned error",
          error instanceof Error ? error : new Error(String(error)),
          {
            reviewType: request.reviewType,
            originalError: serializedError,
          },
        );

        throw new Error(
          errorMessage ||
            "Edge Function error. The request was retried but still failed.",
        );
      }

      if (!data) {
        const errorMsg = "No data returned from Edge Function";
        console.error("❌", errorMsg);
        throw new Error("No data returned from AI service");
      }

      if (
        useAsync &&
        typeof (data as any).responseId === "string" &&
        typeof (data as any).status === "string" &&
        (data as any).status !== "completed"
      ) {
        const pollAfterMs =
          typeof (data as any).pollAfterMs === "number"
            ? (data as any).pollAfterMs
            : null;
        logger.warn("AI analysis running async", {
          reviewType: request.reviewType,
          responseId: (data as any).responseId as string,
          status: (data as any).status,
          pollAfterMs,
        });
        const responseId = (data as any).responseId as string;
        const maxPollMs = requestBody.ingestionId ? 6 * 60 * 1000 : 10 * 60 * 1000;
        try {
          data = await this.measureAsync(
            "ai.edge.poll",
            () =>
              this.pollAsyncAnalysis(
                requestBody,
                responseId,
                session.access_token ?? null,
                request.reviewType,
                maxPollMs,
              ),
            {
              context: {
                reviewType: request.reviewType,
                responseId,
                maxPollMs,
              },
              warnMs: 60000,
            },
          );
        } catch (pollError) {
          const message =
            pollError instanceof Error ? pollError.message : String(pollError);
          if (message.toLowerCase().includes("timed out")) {
            logger.warn("Async analysis timed out, returning fallback", {
              reviewType: request.reviewType,
              responseId,
              maxPollMs,
            });
            const fallback = buildFallbackResult(
              `Async analysis timed out (responseId=${responseId}).`,
            );
            return {
              ...fallback,
              async_status: "pending",
              async_response_id: responseId,
              async_last_checked_at: new Date().toISOString(),
              async_timeout_at: new Date().toISOString(),
              async_meta: {
                responseId,
                reviewType: request.reviewType,
                ingestionId: request.ingestionId,
                model,
                contractType: request.contractType,
                classification: request.classification ?? null,
                selectedSolution: request.selectedSolution ?? null,
                perspective: request.perspective ?? null,
                perspectiveLabel: request.perspectiveLabel ?? null,
                fileName: request.fileName ?? request.filename ?? null,
                fileType: request.fileType ?? null,
                documentFormat: request.documentFormat ?? null,
                ingestionWarnings: request.ingestionWarnings ?? null,
              },
            };
          }
          throw pollError;
        }
      }

      // Validate the response structure
      if (typeof data !== "object") {
        throw new Error("Invalid response format from AI service");
      }

      if (!data.score && data.score !== 0) {
        console.warn("⚠️ Response missing score, using default");
        data.score = 75; // Default score
      }

      if (!data.confidence && data.confidence !== 0) {
        console.warn("⚠️ Response missing confidence, using default");
        data.confidence = 0.8; // Default confidence
      }

      console.log("✅ Edge Function call successful:", {
        hasData: !!data,
        score: data.score,
        confidence: data.confidence,
        hasRecommendations: !!(
          data.recommendations && data.recommendations.length > 0
        ),
      });

      return data;
    } catch (error) {
      const errorInfo = extractErrorDetails(error, {
        model,
        reviewType: request.reviewType,
        contractType: request.contractType,
        contentLength: requestContent.length,
      });

      console.error(
        "❌ AI service call failed:",
        JSON.stringify(errorInfo, null, 2),
      );

      // Check if this is a user-facing error that should be shown (not a generic API failure)
      const errorMessage = errorInfo.message || "";
      const isUserFacingError =
        errorMessage.toLowerCase().includes("pdf") ||
        errorMessage.toLowerCase().includes("scanned") ||
        errorMessage.toLowerCase().includes("docx") ||
        errorMessage.toLowerCase().includes("file") ||
        errorMessage.toLowerCase().includes("text") ||
        errorMessage.toLowerCase().includes("extract") ||
        errorMessage.toLowerCase().includes("document") ||
        errorMessage.toLowerCase().includes("convert");

      // If this is a specific user error (like file format issue), throw it so user sees it
      if (isUserFacingError && error instanceof Error) {
        throw error;
      }

      // For all other errors, propagate so callers can notify the user.
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(errorInfo.message || "AI provider error");
    }
  }

  async checkAsyncAnalysis(meta: {
    responseId: string;
    reviewType: string;
    ingestionId?: string | null;
    model?: string | null;
    contractType?: string | null;
    classification?: any;
    selectedSolution?: any;
    perspective?: string | null;
    perspectiveLabel?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    documentFormat?: string | null;
    ingestionWarnings?: unknown;
  }): Promise<{ status: string; responseId: string; result?: any }> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error("Authentication required to resume analysis.");
    }

    const model = ensureGpt5Model(meta.model ?? undefined, {
      defaultTier: "pro",
    });
    const requestBody = {
      content: "",
      reviewType: meta.reviewType,
      model,
      contractType: meta.contractType ?? undefined,
      perspective: meta.perspective ?? undefined,
      perspectiveLabel: meta.perspectiveLabel ?? undefined,
      fileType: meta.fileType ?? undefined,
      fileName: meta.fileName ?? undefined,
      filename: meta.fileName ?? undefined,
      documentFormat: meta.documentFormat ?? undefined,
      classification: meta.classification ?? undefined,
      ingestionId: meta.ingestionId ?? undefined,
      ingestionWarnings: meta.ingestionWarnings,
      selectedSolution: meta.selectedSolution ?? undefined,
      async: true,
      responseId: meta.responseId,
    };

    const { data, error } = await this.invokeEdgeFunctionWithRetry(
      requestBody,
      meta.reviewType,
      session.access_token ?? null,
    );
    if (error) {
      const message = this.formatEdgeErrorMessage(error);
      throw new Error(message || "Async analysis check failed.");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Async analysis check returned empty response.");
    }

    const status =
      typeof (data as any).status === "string"
        ? (data as any).status
        : "completed";
    if (status !== "completed") {
      return { status, responseId: meta.responseId };
    }

    return { status: "completed", responseId: meta.responseId, result: data };
  }

  private formatEdgeErrorMessage(error: unknown): string {
    if (!error) {
      return "Unknown error";
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (typeof error === "object") {
      const errObj = error as Record<string, unknown> & {
        name?: unknown;
        details?: unknown;
      };

      const possibleKeys: string[] = ["message", "error", "msg"];

      for (const key of possibleKeys) {
        const value = errObj[key];
        if (typeof value === "string" && value.trim().length > 0) {
          const name =
            typeof errObj.name === "string" && errObj.name.trim().length > 0
              ? errObj.name
              : null;
          return name ? `${name}: ${value}` : value;
        }
      }

      if (errObj.details !== undefined) {
        try {
          return JSON.stringify(errObj.details);
        } catch {
          // ignore JSON errors and fall through
        }
      }

      try {
        return JSON.stringify(errObj);
      } catch {
        return Object.prototype.toString.call(error);
      }
    }

    return String(error);
  }

  /**
   * Invoke the Supabase Edge Function with retries for transient network failures.
   * Falls back to a direct HTTP call if the Supabase client cannot reach the function.
   */
  private async invokeEdgeFunctionWithRetry(
    requestBody: any,
    reviewType: string,
    accessToken: string | null,
  ) {
    const maxAttempts = 1; // avoid overlapping long-running calls
    const timeoutMs = 150000; // allow up to edge limit to avoid client aborts
    const baseBackoffMs = 1500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = this.getNowMs();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await supabase.functions.invoke("analyze-contract", {
          body: requestBody,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        logger.performance(
          "ai.edge.invoke_attempt",
          Math.round(this.getNowMs() - attemptStart),
          {
            reviewType,
            attempt,
            via: "supabase",
            timedOut: false,
          },
        );
        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        const isAbort = (error as any)?.name === "AbortError";
        const transient = isAbort || isFunctionsFetchError(error);
        const attemptInfo = { attempt, maxAttempts, reviewType };
        logger.performance(
          "ai.edge.invoke_attempt",
          Math.round(this.getNowMs() - attemptStart),
          {
            reviewType,
            attempt,
            via: "supabase",
            timedOut: isAbort,
          },
        );

        if (isAbort) {
          logger.warn("Edge Function invocation timed out", {
            reviewType,
            attempt,
            timeoutMs,
          });
        }
        logError(
          transient
            ? "Transient Edge Function invocation failure"
            : "Edge Function invocation failed",
          error instanceof Error ? error : new Error(String(error)),
          attemptInfo,
        );

        const isLastAttempt = attempt === maxAttempts;

        if (transient && isLastAttempt && supabaseFunctionsUrl) {
          logger.warn("Edge Function fallback to direct HTTP", {
            reviewType,
            attempt,
            timeoutMs,
          });
          try {
            return await this.manualInvokeEdgeFunction(
              requestBody,
              accessToken,
              timeoutMs,
            );
          } catch (manualError) {
            logError(
              "Direct Edge Function call failed after client retries",
              manualError instanceof Error
                ? manualError
                : new Error(String(manualError)),
              attemptInfo,
            );
            throw manualError;
          }
        }

        if (!transient || isLastAttempt) {
          throw error;
        }

        const waitMs = baseBackoffMs * attempt;
        console.warn(
          `Edge Function fetch failed (attempt ${attempt}/${maxAttempts}). Retrying in ${waitMs}ms...`,
        );
        await wait(waitMs);
      }
    }

    throw new Error("Edge Function invocation exhausted retries");
  }

  private async pollAsyncAnalysis(
    requestBody: any,
    responseId: string,
    accessToken: string | null,
    reviewType: string,
    maxWaitMsOverride?: number,
  ) {
    const maxWaitMs =
      typeof maxWaitMsOverride === "number" && maxWaitMsOverride > 0
        ? maxWaitMsOverride
        : 10 * 60 * 1000;
    const startedAt = Date.now();
    let waitMs = 3000;
    let attempt = 0;
    let lastWarnAt = 0;
    const warnEveryMs = 120000;
    logger.contractAction("AI analysis async polling started", undefined, {
      reviewType,
      responseId,
      maxWaitMs,
    });

    while (Date.now() - startedAt < maxWaitMs) {
      attempt += 1;
      await wait(waitMs);
      const pollBody = {
        ...requestBody,
        responseId,
        async: true,
      };
      const { data, error } = await this.measureAsync(
        "ai.edge.poll_attempt",
        () => this.invokeEdgeFunctionWithRetry(pollBody, reviewType, accessToken),
        {
          context: { reviewType, responseId, attempt },
          warnMs: 15000,
        },
      );

      if (error) {
        const message = this.formatEdgeErrorMessage(error);
        throw new Error(
          message || "Async analysis poll failed with Edge Function error.",
        );
      }

      if (!data || typeof data !== "object") {
        throw new Error("Async analysis poll returned empty response.");
      }

      const status =
        typeof (data as any).status === "string"
          ? (data as any).status
          : "completed";
      if (status === "completed") {
        return data;
      }
      if (status === "failed" || status === "incomplete") {
        throw new Error(`Async analysis failed with status ${status}.`);
      }
      const pollAfterMs =
        typeof (data as any).pollAfterMs === "number"
          ? (data as any).pollAfterMs
          : null;
      waitMs = Math.min(
        Math.max(pollAfterMs ?? waitMs + 1000, 2000),
        10000,
      );

      const elapsedMs = Date.now() - startedAt;
      logger.contractAction("AI analysis polling", undefined, {
        reviewType,
        attempt,
        waitMs,
        status,
        responseId,
        elapsedMs,
      });

      if (
        elapsedMs >= warnEveryMs &&
        (lastWarnAt === 0 || elapsedMs - lastWarnAt >= warnEveryMs)
      ) {
        logger.warn("AI analysis still processing", {
          reviewType,
          responseId,
          attempt,
          status,
          elapsedMs,
          waitMs,
        });
        lastWarnAt = elapsedMs;
      }
    }

    logger.warn("AI analysis polling timed out", {
      reviewType,
      responseId,
      maxWaitMs,
      elapsedMs: Date.now() - startedAt,
    });
    throw new Error("Async analysis timed out while waiting for completion.");
  }

  private async manualInvokeEdgeFunction(
    requestBody: any,
    accessToken: string | null,
    timeoutMs: number,
  ) {
    if (!supabaseFunctionsUrl) {
      throw new Error("Supabase URL unavailable for direct function call");
    }

    const endpoint = `${supabaseFunctionsUrl}/functions/v1/analyze-contract`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const start = this.getNowMs();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Edge function HTTP ${response.status}: ${errorText.slice(0, 400)}`,
        );
      }

      const data = await response.json();
      return { data, error: null as any };
    } finally {
      logger.performance(
        "ai.edge.manual_invoke",
        Math.round(this.getNowMs() - start),
        { timeoutMs },
      );
      clearTimeout(timeoutId);
    }
  }

  // Ensure ingestion is precomputed (text + digest/clauses) before analysis
  private async ensureIngestionReady(ingestionId: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s guard
      const startedAt = this.getNowMs();
      const { error } = await supabase.functions.invoke("ingest-contract", {
        body: { ingestionId },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      logger.performance(
        "ai.ingestion_invoke",
        Math.round(this.getNowMs() - startedAt),
        { ingestionId },
      );
      if (error) {
        logError(
          "Ingestion warmup failed",
          error instanceof Error ? error : new Error(String(error)),
          { ingestionId },
        );
      }
    } catch (error) {
      logError(
        "Ingestion warmup threw",
        error instanceof Error ? error : new Error(String(error)),
        { ingestionId },
      );
    }
  }

  private getNowMs(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  private async measureAsync<T>(
    label: string,
    task: () => Promise<T>,
    options?: { context?: Record<string, unknown>; warnMs?: number },
  ): Promise<T> {
    const start = this.getNowMs();
    let status: "success" | "error" = "success";

    try {
      return await task();
    } catch (error) {
      status = "error";
      throw error;
    } finally {
      const durationMs = Math.round(this.getNowMs() - start);
      logger.performance(label, durationMs, { ...options?.context, status });

      if (options?.warnMs && durationMs >= options.warnMs) {
        logger.warn(`Slow step: ${label}`, {
          ...options?.context,
          durationMs,
          thresholdMs: options.warnMs,
        });
      }
    }
  }

  // Get default solution for review type
  private async getDefaultSolution(
    reviewType: string,
    contractType?: string,
  ): Promise<CustomSolution> {
    const defaultSolutions: Record<string, CustomSolution> = {
      risk_assessment: {
        name: "Advanced Risk Assessment",
        description:
          "Comprehensive multi-dimensional risk analysis with scenario planning and interconnection analysis",
        contractType: contractType || "general",
        complianceFramework: [
          "general-legal",
          "commercial-law",
          "regulatory-compliance",
        ],
        riskLevel: "medium",
        customRules:
          "Conduct comprehensive risk assessment including financial, legal, operational, compliance, reputational, and strategic risks. Analyze risk interconnections, cascading effects, and scenario planning.",
        analysisDepth: "comprehensive",
        reportFormat: "detailed",
        aiModel: AIModel.OPENAI_GPT4O,
        prompts: {
          systemPrompt:
            "You are a senior contract risk analyst with expertise in commercial law, regulatory compliance, and enterprise risk management. You have 15+ years of experience reviewing complex commercial agreements across multiple industries.",
          analysisPrompt:
            "Conduct a comprehensive risk assessment examining financial, legal, operational, compliance, reputational, and strategic risks. Analyze risk interconnections, provide scenario planning, and deliver strategic recommendations.",
          riskPrompt:
            "Focus on multi-dimensional risk analysis including cascading effects, hidden dependencies, and long-term implications. Consider contract lifecycle risks, performance risks, and market condition impacts.",
        },
      },
      compliance_score: {
        name: "Advanced Regulatory Compliance Assessment",
        description:
          "Comprehensive multi-jurisdictional compliance analysis with regulatory trend assessment",
        contractType: contractType || "data-processing",
        complianceFramework: [
          "gdpr",
          "ccpa",
          "data-protection",
          "financial-regulations",
          "industry-standards",
          "cross-border-compliance",
        ],
        riskLevel: "high",
        customRules:
          "Conduct comprehensive regulatory compliance assessment across multiple jurisdictions. Analyze current and emerging regulations, cross-framework impacts, and enforcement risks. Provide detailed remediation roadmap.",
        analysisDepth: "comprehensive",
        reportFormat: "detailed",
        aiModel: AIModel.ANTHROPIC_CLAUDE_OPUS,
        prompts: {
          systemPrompt:
            "You are a leading compliance expert and regulatory attorney with deep expertise in GDPR, CCPA, HIPAA, SOX, PCI-DSS, international data protection laws, financial regulations, and industry-specific compliance frameworks.",
          analysisPrompt:
            "Conduct comprehensive regulatory compliance assessment using multi-jurisdictional analysis, regulatory evolution consideration, cross-framework impact analysis, and enforcement risk evaluation.",
          compliancePrompt:
            "Provide detailed compliance scoring with regulatory-specific analysis, gap identification, remediation roadmap, and regulatory landscape assessment.",
        },
      },
      perspective_review: {
        name: "Advanced Stakeholder Analysis",
        description:
          "Sophisticated multi-stakeholder analysis with power dynamics, strategic implications, and negotiation opportunities",
        contractType: contractType || "commercial",
        complianceFramework: [
          "commercial-law",
          "contract-law",
          "negotiation-strategy",
        ],
        riskLevel: "medium",
        customRules:
          "Conduct sophisticated multi-stakeholder analysis including stakeholder mapping, power dynamics, strategic implications, risk allocation, and relationship dynamics. Identify negotiation opportunities and stakeholder conflicts.",
        analysisDepth: "comprehensive",
        reportFormat: "detailed",
        aiModel: AIModel.OPENAI_GPT4O,
        prompts: {
          systemPrompt:
            "You are a senior contract strategist with expertise in multi-stakeholder analysis, commercial negotiations, and stakeholder management. You have extensive experience representing different parties in complex commercial transactions.",
          analysisPrompt:
            "Conduct sophisticated multi-stakeholder analysis using stakeholder mapping, power dynamics analysis, strategic implications assessment, and relationship dynamics evaluation.",
        },
      },
      full_summary: {
        name: "Executive Strategic Analysis",
        description:
          "Executive-level comprehensive analysis with business intelligence, strategic context, and decision support",
        contractType: contractType || "general",
        complianceFramework: [
          "general-legal",
          "business-strategy",
          "commercial-intelligence",
        ],
        riskLevel: "medium",
        customRules:
          "Provide executive-level contract analysis combining legal expertise with business acumen and strategic insight. Include strategic context, commercial intelligence, risk-reward analysis, and implementation roadmap.",
        analysisDepth: "comprehensive",
        reportFormat: "executive",
        aiModel: AIModel.ANTHROPIC_CLAUDE_OPUS,
        prompts: {
          systemPrompt:
            "You are a distinguished senior partner and contract strategist with 20+ years of experience in complex commercial transactions, M&A, and strategic partnerships. You provide executive-level analysis that combines legal expertise with business acumen.",
          analysisPrompt:
            "Provide comprehensive executive-level contract analysis using strategic context, commercial intelligence, risk-reward analysis, competitive positioning, and operational impact assessment.",
        },
      },
    };

    return defaultSolutions[reviewType] || defaultSolutions.full_summary;
  }

  // Custom solution management
  async saveCustomSolution(
    solution: CustomSolution,
    userId: string,
    organizationId: string,
  ): Promise<string> {
    const { data, error } = await supabase
      .from("custom_solutions")
      .insert({
        name: solution.name,
        description: solution.description,
        contract_type: solution.contractType,
        compliance_framework: solution.complianceFramework,
        risk_level: solution.riskLevel,
        custom_rules: solution.customRules,
        analysis_depth: solution.analysisDepth,
        report_format: solution.reportFormat,
        ai_model: solution.aiModel,
        prompts: solution.prompts,
        organization_id: organizationId,
        section_layout: solution.sectionLayout ?? null,
        clause_library: solution.clauseLibrary ?? [],
        deviation_rules: solution.deviationRules ?? [],
        similarity_benchmarks: solution.similarityBenchmarks ?? [],
        model_settings: solution.modelSettings ?? null,
        drafting_settings: solution.draftingSettings ?? null,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to save custom solution: ${error.message}`);
    }

    logger.userAction("Custom solution created", {
      solutionName: solution.name,
      userId,
      organizationId,
    });

    return data.id;
  }

  async getCustomSolutions(
    userId: string,
    organizationId?: string | null,
  ): Promise<CustomSolution[]> {
    const filters: string[] = [];

    // Always allow creators to fetch their own custom solutions
    if (userId) {
      filters.push(`created_by.eq.${userId}`);
    }

    // Allow org-scoped solutions for the user's organization
    if (organizationId) {
      filters.push(`organization_id.eq.${organizationId}`);
    }

    // Public solutions remain visible
    filters.push("is_public.eq.true");

    const { data, error } = await supabase
      .from("custom_solutions")
      .select("*")
      .or(filters.join(","))
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch custom solutions: ${error.message}`);
    }

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      contractType: item.contract_type,
      complianceFramework: item.compliance_framework ?? [],
      riskLevel: (item.risk_level as CustomSolution["riskLevel"]) ?? "medium",
      customRules: item.custom_rules ?? "",
      analysisDepth:
        (item.analysis_depth as CustomSolution["analysisDepth"]) ?? "standard",
      reportFormat:
        (item.report_format as CustomSolution["reportFormat"]) ?? "detailed",
      aiModel: (item.ai_model as AIModel) ?? AIModel.OPENAI_GPT4O,
      prompts: (item.prompts as CustomSolution["prompts"]) ?? {
        systemPrompt: "",
        analysisPrompt: "",
      },
      organizationId: item.organization_id ?? null,
      sectionLayout:
        (item.section_layout as CustomSolution["sectionLayout"]) ?? [],
      clauseLibrary:
        (item.clause_library as CustomSolution["clauseLibrary"]) ?? [],
      deviationRules:
        (item.deviation_rules as CustomSolution["deviationRules"]) ?? [],
      similarityBenchmarks:
        (item.similarity_benchmarks as CustomSolution["similarityBenchmarks"]) ??
        [],
      modelSettings:
        (item.model_settings as CustomSolution["modelSettings"]) ?? undefined,
      draftingSettings:
        (item.drafting_settings as CustomSolution["draftingSettings"]) ??
        undefined,
      isActive:
        typeof (item as Record<string, unknown>).is_active === "boolean"
          ? Boolean((item as Record<string, unknown>).is_active)
          : true,
      createdBy:
        typeof (item as Record<string, unknown>).created_by === "string"
          ? String((item as Record<string, unknown>).created_by)
          : undefined,
      isPublic:
        typeof (item as Record<string, unknown>).is_public === "boolean"
          ? Boolean((item as Record<string, unknown>).is_public)
          : undefined,
    }));
  }
}

export const aiService = AIService.getInstance();
export default aiService;
