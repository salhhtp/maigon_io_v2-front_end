import { supabase } from "@/lib/supabase";
import logger from "@/utils/logger";
import { logError, safeStringify } from "@/utils/errorLogger";
import nativeFetch from "@/lib/nativeFetch";
import {
  deriveSolutionKey,
  mapClassificationToSolutionKey,
  SOLUTION_DISPLAY_NAMES,
  solutionKeyToDisplayName,
} from "@/utils/solutionMapping";
import type { SolutionKey } from "@/utils/solutionMapping";

const EDGE_CLASSIFICATION_CONTENT_LIMIT = 8000;
interface SolutionProfile {
  key: SolutionKey;
  contractType: ContractClassificationResult["contractType"];
  displayName: string;
  confidence: number;
  characteristics: string[];
  suggestedSolutions: string[];
  partyRoles: ContractClassificationResult["partyRoles"];
  reasoning: string;
  keywords: string[];
}

const SOLUTION_PROFILES: Record<SolutionKey, SolutionProfile> = {
  dpa: {
    key: "dpa",
    contractType: "data_processing_agreement",
    displayName: SOLUTION_DISPLAY_NAMES.dpa,
    confidence: 0.93,
    characteristics: [
      "GDPR compliance focused",
      "Data processing roles defined",
      "EDPB guidance referenced",
      "Security safeguards outlined",
    ],
    suggestedSolutions: ["compliance_score", "perspective_review"],
    partyRoles: { party1: "Data Controller", party2: "Data Processor" },
    reasoning:
      "Document references GDPR terminology, controller/processor roles, and privacy safeguards consistent with a DPA.",
    keywords: [
      "data processing",
      "personal data",
      "gdpr",
      "controller",
      "processor",
      "data subject",
      "privacy",
      "edpb",
    ],
  },
  nda: {
    key: "nda",
    contractType: "non_disclosure_agreement",
    displayName: SOLUTION_DISPLAY_NAMES.nda,
    confidence: 0.92,
    characteristics: [
      "Confidentiality protections",
      "Mutual disclosure limits",
      "Trade secret safeguards",
      "Remedy and penalty clauses",
    ],
    suggestedSolutions: ["risk_assessment", "compliance_score"],
    partyRoles: { party1: "Disclosing Party", party2: "Receiving Party" },
    reasoning:
      "Language centers on disclosure obligations, confidential information, and protective remedies typical of NDAs.",
    keywords: [
      "non-disclosure",
      "confidentiality",
      "trade secret",
      "proprietary information",
      "nda",
      "non disclosure",
    ],
  },
  ppc: {
    key: "ppc",
    contractType: "privacy_policy_document",
    displayName: SOLUTION_DISPLAY_NAMES.ppc,
    confidence: 0.9,
    characteristics: [
      "Data collection transparency",
      "User rights explained",
      "Cookie and tracking disclosure",
      "Contact and grievance process",
    ],
    suggestedSolutions: ["compliance_score", "perspective_review"],
    partyRoles: { party1: "Service Provider", party2: "End User" },
    reasoning:
      "Document structure mirrors a privacy notice: user rights, data practices, cookie disclosures, and contact channels.",
    keywords: [
      "privacy policy",
      "privacy notice",
      "privacy statement",
      "data collection",
      "cookies",
      "personal information",
      "user data",
    ],
  },
  ca: {
    key: "ca",
    contractType: "consultancy_agreement",
    displayName: SOLUTION_DISPLAY_NAMES.ca,
    confidence: 0.9,
    characteristics: [
      "Professional service scope",
      "Deliverables and milestones",
      "Service fees and expenses",
      "IP & confidentiality for consultants",
    ],
    suggestedSolutions: [
      "risk_assessment",
      "full_summary",
      "perspective_review",
    ],
    partyRoles: { party1: "Client", party2: "Consultant" },
    reasoning:
      "Scope of services, consultant obligations, and fee structures align with a consultancy agreement.",
    keywords: [
      "consultancy",
      "consulting",
      "advisory services",
      "statement of work",
      "consultant",
      "service provider",
    ],
  },
  rda: {
    key: "rda",
    contractType: "research_development_agreement",
    displayName: SOLUTION_DISPLAY_NAMES.rda,
    confidence: 0.85,
    characteristics: [
      "Joint development obligations",
      "IP ownership and licensing",
      "Milestone research phases",
      "Confidential data sharing",
    ],
    suggestedSolutions: ["risk_assessment", "perspective_review"],
    partyRoles: { party1: "Research Partner", party2: "Development Partner" },
    reasoning:
      "The agreement references joint research, prototypes, and IP licensing typical of R&D collaborations.",
    keywords: [
      "research and development",
      "r&d",
      "prototype",
      "collaboration",
      "joint development",
      "technology transfer",
    ],
  },
  eula: {
    key: "eula",
    contractType: "end_user_license_agreement",
    displayName: SOLUTION_DISPLAY_NAMES.eula,
    confidence: 0.88,
    characteristics: [
      "Software licensing terms",
      "restrictions on use",
      "warranty disclaimers",
      "liability limitations",
    ],
    suggestedSolutions: ["risk_assessment", "full_summary"],
    partyRoles: { party1: "Licensor", party2: "End User" },
    reasoning:
      "Contract covers licensing, installation, and use limitations expected in software/end-user licenses.",
    keywords: [
      "end user license",
      "software license",
      "licensor",
      "licensee",
      "eula",
      "subscription terms",
    ],
  },
  psa: {
    key: "psa",
    contractType: "product_supply_agreement",
    displayName: SOLUTION_DISPLAY_NAMES.psa,
    confidence: 0.86,
    characteristics: [
      "Supply quantities & forecasts",
      "Delivery and logistics",
      "Product quality standards",
      "Commercial terms and remedies",
    ],
    suggestedSolutions: ["risk_assessment", "full_summary"],
    partyRoles: { party1: "Supplier", party2: "Purchaser" },
    reasoning:
      "Terms revolve around product supply, delivery schedules, warranties, and remedies characteristic of PSAs.",
    keywords: [
      "product supply",
      "supply agreement",
      "purchase order",
      "buyer",
      "seller",
      "logistics",
      "inventory",
    ],
  },
};

export interface ContractClassificationResult {
  contractType: string;
  confidence: number;
  subType?: string;
  characteristics: string[];
  reasoning: string;
  suggestedSolutions: string[];
  keyTerms: string[];
  jurisdiction: string;
  partyRoles: {
    party1: string;
    party2: string;
  };
  confidenceBand: "high" | "medium" | "low";
  fallbackUsed?: boolean;
  fallbackReason?: string;
  source?: string;
  modelUsed?: string;
  generatedAt?: string;
  recommendedSolutionKey?: SolutionKey | null;
  recommendedSolutionTitle?: string | null;
  evidence?: string[];
}

export class ContractClassificationService {
  private static instance: ContractClassificationService;

  static getInstance(): ContractClassificationService {
    if (!ContractClassificationService.instance) {
      ContractClassificationService.instance =
        new ContractClassificationService();
    }
    return ContractClassificationService.instance;
  }

  /**
   * Analyze contract content to automatically determine its type
   */
  async classifyContract(
    content: string,
    fileName?: string,
    options: { solutionKey?: string | null } = {},
  ): Promise<ContractClassificationResult> {
    const normalizedSolutionKey = this.normalizeSolutionKey(
      options.solutionKey,
      fileName,
    );
    const solutionProfile = normalizedSolutionKey
      ? SOLUTION_PROFILES[normalizedSolutionKey]
      : undefined;

    try {
      console.log("🤖 Starting intelligent contract classification...", {
        contentLength: content.length,
        fileName: fileName || "unknown",
        hasContent: content.length > 0,
      });

      // Validate input
      if (!content || content.trim().length === 0) {
        console.warn("⚠️ Empty content provided, using general classification");
        return {
          contractType: "general_commercial",
          confidence: 0.3,
          confidenceBand: "low",
          characteristics: ["No content available for classification"],
          reasoning: "Empty or invalid content provided",
          suggestedSolutions: ["full_summary"],
          keyTerms: [],
          jurisdiction: "Not specified",
          partyRoles: {
            party1: "Primary Party",
            party2: "Counterparty",
          },
          fallbackUsed: true,
          fallbackReason: "No analyzable content found in document",
          source: "client-precheck",
          modelUsed: "content-validation",
          generatedAt: new Date().toISOString(),
        };
      }

      // Call Supabase Edge Function for AI-powered classification with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

      let classificationResult: ContractClassificationResult;

      try {
        const { data, error } = await this.invokeClassificationEdge(
          content,
          fileName,
          controller,
          normalizedSolutionKey ?? options.solutionKey ?? null,
        );

        clearTimeout(timeoutId);

        if (error) {
          const serialized = safeStringify(error);
          const isFunctionsError =
            typeof error === "object" &&
            error !== null &&
            ((error as any).name === "FunctionsFetchError" ||
              ((error as any).message || "")
                .toString()
                .includes("Failed to send a request to the Edge Function"));

          if (isFunctionsError) {
            console.warn(
              "⚠️ Classification edge function unreachable. Using deterministic fallback.",
              serialized,
            );
          } else {
            logError(
              "⚠️ AI classification API error, using fallback rules",
              error,
              {
                fileName: fileName || "unknown",
                contentLength: content.length,
              },
            );
          }
          const fallbackReason = isFunctionsError
            ? "Classification edge function unreachable"
            : `AI classification error: ${serialized?.slice?.(0, 160) || serialized}`;
          const fallbackResult = this.fallbackClassification(
            content,
            fileName,
            fallbackReason,
            options.solutionKey,
          );
          return this.applySolutionGuidance(
            fallbackResult,
            solutionProfile,
            normalizedSolutionKey,
          );
        }

        if (!data) {
          console.warn("⚠️ No classification data returned, using fallback");
          const fallbackResult = this.fallbackClassification(
            content,
            fileName,
            "Edge classification returned no data",
            options.solutionKey,
          );
          return this.applySolutionGuidance(
            fallbackResult,
            solutionProfile,
            normalizedSolutionKey,
          );
        }

        // Validate the classification result
        const validatedData = this.validateClassificationResult(data);
        console.log("✅ AI contract classification completed:", {
          contractType: validatedData.contractType,
          confidence: validatedData.confidence,
          confidenceBand: validatedData.confidenceBand,
          characteristicsCount: validatedData.characteristics.length,
          fallbackUsed: validatedData.fallbackUsed ?? false,
          source: validatedData.source,
          model: validatedData.modelUsed,
        });

        classificationResult = validatedData;
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        if (timeoutError.name === "AbortError") {
          console.warn("⚠️ Classification timed out, using fallback");
        } else {
          logError(
            "⚠️ Classification request failed, using fallback",
            timeoutError,
            {
              fileName: fileName || "unknown",
              contentLength: content.length,
            },
          );
        }
        const failureReason =
          timeoutError.name === "AbortError"
            ? "Classification request timed out"
            : `Classification request failed: ${
                timeoutError instanceof Error
                  ? timeoutError.message
                  : String(timeoutError)
              }`;
        const fallbackResult = this.fallbackClassification(
          content,
          fileName,
          failureReason,
          options.solutionKey,
        );
        return this.applySolutionGuidance(
          fallbackResult,
          solutionProfile,
          normalizedSolutionKey,
        );
      }

      const preparedResult = this.assignRecommendation(
        classificationResult,
        normalizedSolutionKey,
      );
      return this.applySolutionGuidance(
        preparedResult,
        solutionProfile,
        normalizedSolutionKey,
      );
    } catch (error) {
      logError("⚠️ Classification error, using fallback", error, {
        fileName: fileName || "unknown",
        contentLength: content.length,
      });
      const fallbackReason =
        error instanceof Error ? error.message : String(error);
      const fallbackResult = this.fallbackClassification(
        content,
        fileName,
        `Classification workflow error: ${fallbackReason}`,
        options.solutionKey,
      );
      return this.applySolutionGuidance(
        fallbackResult,
        solutionProfile,
        normalizedSolutionKey,
      );
    }
  }

  private async invokeClassificationEdge(
    content: string,
    fileName: string | undefined,
    controller: AbortController,
    solutionHint?: string | null,
  ) {
    const proxyController = new AbortController();
    const timeoutId = setTimeout(() => proxyController.abort(), 90000);
    try {
      const response = await nativeFetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: proxyController.signal,
        body: JSON.stringify({
          content: content.substring(0, EDGE_CLASSIFICATION_CONTENT_LIMIT),
          fileName: fileName || "unknown",
          solutionHint: solutionHint ?? undefined,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const payload = await response.text();
        return {
          data: null,
          error: new Error(payload || "Classification proxy error"),
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      clearTimeout(timeoutId);
      logError("Classification proxy request failed", error, {
        endpoint: "/api/classify",
      });
      return { data: null, error };
    }
  }

  /**
   * Validate and sanitize classification result from AI
   */
  private validateClassificationResult(
    data: any,
  ): ContractClassificationResult {
    const validTypes = [
      "data_processing_agreement",
      "non_disclosure_agreement",
      "privacy_policy_document",
      "consultancy_agreement",
      "research_development_agreement",
      "end_user_license_agreement",
      "product_supply_agreement",
      "general_commercial",
    ];

    const contractType =
      typeof data?.contractType === "string" &&
      validTypes.includes(data.contractType)
        ? data.contractType
        : "general_commercial";

    const confidenceValue =
      typeof data?.confidence === "number" && Number.isFinite(data.confidence)
        ? data.confidence
        : 0.5;
    const confidence = Math.max(0, Math.min(1, confidenceValue));

    const normalizedArray = (
      value: unknown,
      fallback: string[],
    ): string[] => {
      if (!Array.isArray(value)) return fallback;
      const entries = (value as unknown[])
        .map((item) =>
          typeof item === "string" ? item.trim() : String(item ?? ""),
        )
        .filter((entry): entry is string => entry.length > 0);
      return entries.length > 0 ? entries : fallback;
    };

    const characteristics = normalizedArray(data?.characteristics, [
      "Commercial agreement",
    ]);
    const suggestedSolutions = normalizedArray(data?.suggestedSolutions, [
      "full_summary",
      "risk_assessment",
    ]);

    const keyTermsRaw: string[] = Array.isArray(data?.keyTerms)
      ? (data.keyTerms as unknown[])
          .map((item: unknown) =>
            typeof item === "string" ? item.trim() : "",
          )
          .filter((item: string) => item.length > 0)
      : [];
    const keyTerms: string[] = Array.from(new Set(keyTermsRaw)).slice(0, 10);

    const partyRoles = {
      party1:
        typeof data?.partyRoles?.party1 === "string" &&
        data.partyRoles.party1.trim().length > 0
          ? data.partyRoles.party1.trim()
          : "Primary Party",
      party2:
        typeof data?.partyRoles?.party2 === "string" &&
        data.partyRoles.party2.trim().length > 0
          ? data.partyRoles.party2.trim()
          : "Counterparty",
    };

    const fallbackUsed = Boolean(
      data?.fallback_used ?? data?.fallbackUsed ?? false,
    );
    const fallbackReason =
      typeof data?.fallback_reason === "string"
        ? data.fallback_reason
        : typeof data?.fallbackReason === "string"
          ? data.fallbackReason
          : undefined;

    const confidenceBand =
      typeof data?.confidence_band === "string" &&
      ["high", "medium", "low"].includes(data.confidence_band)
        ? (data.confidence_band as ContractClassificationResult["confidenceBand"])
        : this.deriveConfidenceBand(confidence);

    const source =
      typeof data?.source === "string"
        ? data.source
        : fallbackUsed
          ? "edge-fallback"
          : "edge-ai";

    const modelUsed =
      typeof data?.model_used === "string"
        ? data.model_used
        : typeof data?.modelUsed === "string"
          ? data.modelUsed
          : undefined;

    const generatedAt =
      typeof data?.generated_at === "string"
        ? data.generated_at
        : typeof data?.generatedAt === "string"
          ? data.generatedAt
          : new Date().toISOString();

    return {
      contractType,
      confidence,
      subType:
        typeof data?.subType === "string" && data.subType.trim().length > 0
          ? data.subType.trim()
          : undefined,
      characteristics,
      reasoning:
        typeof data?.reasoning === "string" && data.reasoning.trim().length > 0
          ? data.reasoning.trim()
          : "AI-powered classification",
      suggestedSolutions,
      keyTerms,
      jurisdiction:
        typeof data?.jurisdiction === "string" &&
        data.jurisdiction.trim().length > 0
          ? data.jurisdiction.trim()
          : "Not specified",
      partyRoles,
      confidenceBand,
      fallbackUsed,
      fallbackReason,
      source,
      modelUsed,
      generatedAt,
    };
  }

  private deriveConfidenceBand(
    confidence: number,
  ): ContractClassificationResult["confidenceBand"] {
    if (confidence >= 0.85) return "high";
    if (confidence >= 0.65) return "medium";
    return "low";
  }

  /**
   * Fallback rule-based classification when AI is unavailable
   */
  private fallbackClassification(
    content: string,
    fileName?: string,
    reason?: string,
    solutionHint?: string | null,
  ): ContractClassificationResult {
    const contentLower = content.toLowerCase();
    const fileNameLower = (fileName || "").toLowerCase();
    const normalizedSolutionHint = this.normalizeSolutionKey(
      solutionHint,
      fileName,
    );
    const hintedProfile = normalizedSolutionHint
      ? SOLUTION_PROFILES[normalizedSolutionHint]
      : undefined;

    if (hintedProfile) {
      return this.buildProfileClassification(hintedProfile, {
        reason:
          reason ||
          `Classification guided by selected solution (${hintedProfile.displayName}).`,
        source: "solution-hint",
      });
    }

    const detectedProfile = this.detectProfileByContent(
      contentLower,
      fileNameLower,
    );
    if (detectedProfile) {
      return this.buildProfileClassification(detectedProfile, {
        reason:
          reason ||
          `Detected strong keyword overlap with ${detectedProfile.displayName}.`,
        source: "rule-engine",
      });
    }

    return this.assignRecommendation({
      contractType: "general_commercial",
      confidence: 0.6,
      confidenceBand: "medium",
      subType: null,
      characteristics: [
        "Commercial agreement with broad subject matter",
        "Insufficient context for precise classification",
      ],
      reasoning:
        reason ||
        "Unable to confidently determine contract type due to ambiguous or generic content.",
      suggestedSolutions: ["full_summary", "risk_assessment"],
      keyTerms: [],
      jurisdiction: "Not specified",
      partyRoles: {
        party1: "Primary Party",
        party2: "Counterparty",
      },
      fallbackUsed: true,
      fallbackReason: reason,
      source: "rule-engine",
      modelUsed: "rule-engine",
      generatedAt: new Date().toISOString(),
    });
  }

  private assignRecommendation(
    result: ContractClassificationResult,
    fallbackKey?: SolutionKey,
  ): ContractClassificationResult {
    let recommendedKey = result.recommendedSolutionKey ?? undefined;
    if (!recommendedKey && fallbackKey) {
      recommendedKey = fallbackKey;
    }
    if (!recommendedKey) {
      recommendedKey = mapClassificationToSolutionKey(result.contractType);
    }

    if (!recommendedKey) {
      if (!result.recommendedSolutionTitle) {
        return result;
      }
      return {
        ...result,
        recommendedSolutionTitle: result.recommendedSolutionTitle,
      };
    }

    const title = solutionKeyToDisplayName(recommendedKey);

    if (
      result.recommendedSolutionKey === recommendedKey &&
      result.recommendedSolutionTitle === title
    ) {
      return result;
    }

    return {
      ...result,
      recommendedSolutionKey: recommendedKey,
      recommendedSolutionTitle: title,
    };
  }

  /**
   * Get contract type display name
   */
  static getContractTypeDisplayName(contractType: string): string {
    const displayNames: Record<string, string> = {
      data_processing_agreement: "Data Processing Agreement",
      non_disclosure_agreement: "Non-Disclosure Agreement",
      privacy_policy_document: "Privacy Policy Document",
      consultancy_agreement: "Consultancy Agreement",
      research_development_agreement: "R&D Agreement",
      end_user_license_agreement: "End User License Agreement",
      product_supply_agreement: "Product Supply Agreement",
      general_commercial: "General Commercial Agreement",
    };

    return displayNames[contractType] || "Commercial Agreement";
  }

  /**
   * Get recommended analysis solutions based on contract type
   */
  static getRecommendedSolutions(contractType: string): string[] {
    const recommendations: Record<string, string[]> = {
      data_processing_agreement: ["compliance_score", "perspective_review"],
      non_disclosure_agreement: ["compliance_score", "risk_assessment"],
      privacy_policy_document: ["compliance_score", "perspective_review"],
      consultancy_agreement: [
        "risk_assessment",
        "full_summary",
        "perspective_review",
      ],
      research_development_agreement: [
        "compliance_score",
        "risk_assessment",
        "perspective_review",
      ],
      end_user_license_agreement: ["compliance_score", "risk_assessment"],
      product_supply_agreement: [
        "risk_assessment",
        "full_summary",
        "perspective_review",
      ],
      general_commercial: ["full_summary", "risk_assessment"],
    };

    return recommendations[contractType] || ["full_summary", "risk_assessment"];
  }

  private normalizeSolutionKey(
    solutionHint?: string | null,
    fileName?: string,
  ): SolutionKey | undefined {
    const primary = typeof solutionHint === "string" ? solutionHint : undefined;
    return deriveSolutionKey(primary, fileName);
  }

  private buildProfileClassification(
    profile: SolutionProfile,
    options?: { reason?: string; source?: string },
  ): ContractClassificationResult {
    const confidence = Math.min(0.99, Math.max(0.75, profile.confidence));
    const result: ContractClassificationResult = {
      contractType: profile.contractType,
      confidence,
      confidenceBand: this.deriveConfidenceBand(confidence),
      subType: null,
      characteristics: profile.characteristics,
      reasoning:
        options?.reason ?? profile.reasoning ?? "Solution-guided classification.",
      suggestedSolutions: profile.suggestedSolutions,
      keyTerms: profile.keywords.slice(0, 8),
      jurisdiction: "Not specified",
      partyRoles: profile.partyRoles,
      fallbackUsed: true,
      fallbackReason: options?.reason,
      source: options?.source ?? "solution-guidance",
      modelUsed: "solution-guidance",
      generatedAt: new Date().toISOString(),
    };
    return this.assignRecommendation(result, profile.key);
  }

  private detectProfileByContent(
    contentLower: string,
    fileNameLower: string,
  ): SolutionProfile | undefined {
    let bestProfile: SolutionProfile | undefined;
    let bestScore = 0;
    Object.values(SOLUTION_PROFILES).forEach((profile) => {
      const score = profile.keywords.reduce((acc, keyword) => {
        const normalized = keyword.toLowerCase();
        if (
          contentLower.includes(normalized) ||
          fileNameLower.includes(normalized.replace(/\s+/g, "_"))
        ) {
          return acc + 1;
        }
        return acc;
      }, 0);
      if (score > bestScore && score >= 2) {
        bestProfile = profile;
        bestScore = score;
      }
    });
    return bestProfile;
  }

  private applySolutionGuidance(
    result: ContractClassificationResult,
    profile: SolutionProfile | undefined,
    solutionKey?: SolutionKey,
  ): ContractClassificationResult {
    if (!profile) {
      return this.assignRecommendation(result, solutionKey);
    }

    const needsGuidance =
      result.contractType === "general_commercial" ||
      result.confidence < profile.confidence - 0.05 ||
      (solutionKey && result.contractType !== profile.contractType);

    if (!needsGuidance) {
      return this.assignRecommendation(result, solutionKey ?? profile.key);
    }

    const boostedConfidence = Math.max(result.confidence, profile.confidence);
    return this.assignRecommendation({
      ...result,
      contractType: profile.contractType,
      confidence: boostedConfidence,
      confidenceBand: this.deriveConfidenceBand(boostedConfidence),
      characteristics: profile.characteristics,
      suggestedSolutions: profile.suggestedSolutions,
      partyRoles: profile.partyRoles,
      reasoning: `${result.reasoning ?? ""}\nSolution-guided alignment: ${
        profile.reasoning
      }`.trim(),
      fallbackUsed: true,
      fallbackReason: `Solution guidance applied${
        solutionKey ? ` (${solutionKey})` : ""
      }.`,
      source: result.source ?? "solution-guidance",
      modelUsed: result.modelUsed ?? "solution-guidance",
    }, solutionKey ?? profile.key);
  }
}

export const contractClassificationService =
  ContractClassificationService.getInstance();
export default contractClassificationService;
