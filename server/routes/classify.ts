import express from "express";
import {
  ClassificationResult,
  generateFallbackClassification,
} from "../services/classificationFallback";
import { classifyContractWithAI } from "../services/classificationAI";

interface ClassificationRequestBody {
  content: string;
  fileName?: string;
  solutionHint?: string | null;
}

export const classifyRouter = express.Router();

type SolutionKey = "nda" | "dpa" | "eula" | "ppc" | "psa" | "ca" | "rda";

const SOLUTION_KEY_DISPLAY_NAMES: Record<SolutionKey, string> = {
  nda: "Non-Disclosure Agreement",
  dpa: "Data Processing Agreement",
  eula: "End User License Agreement",
  ppc: "Privacy Policy Compliance",
  psa: "Product Supply Agreement",
  ca: "Consultancy Agreement",
  rda: "Research & Development Agreement",
};

const CONTRACT_TYPE_TO_SOLUTION_KEY: Record<string, SolutionKey> = {
  non_disclosure_agreement: "nda",
  data_processing_agreement: "dpa",
  end_user_license_agreement: "eula",
  privacy_policy_document: "ppc",
  product_supply_agreement: "psa",
  consultancy_agreement: "ca",
  research_development_agreement: "rda",
};

function deriveConfidenceBand(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}

function normalizeClassificationPayload(
  payload: any,
  options: {
    defaultModel?: string;
    defaultSource?: string;
    fallbackReason?: string;
  } = {},
): ClassificationResult {
  const nowIso = new Date().toISOString();
  const contractType =
    typeof payload?.contractType === "string" && payload.contractType.trim().length > 0
      ? payload.contractType.trim()
      : "general_commercial";
  const confidenceRaw =
    typeof payload?.confidence === "number" && Number.isFinite(payload.confidence)
      ? payload.confidence
      : 0.5;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));
  const fallbackUsed = Boolean(payload?.fallback_used ?? payload?.fallbackUsed ?? false);
  const fallbackReason =
    typeof payload?.fallback_reason === "string"
      ? payload.fallback_reason
      : typeof payload?.fallbackReason === "string"
        ? payload.fallbackReason
        : options.fallbackReason;
  const confidenceBand =
    typeof payload?.confidence_band === "string"
      ? (payload.confidence_band as ClassificationResult["confidence_band"])
      : deriveConfidenceBand(confidence);
  const generatedAt =
    typeof payload?.generated_at === "string"
      ? payload.generated_at
      : typeof payload?.generatedAt === "string"
        ? payload.generatedAt
        : nowIso;
  const source =
    typeof payload?.source === "string"
      ? payload.source
      : options.defaultSource ??
        (fallbackUsed ? "edge-fallback" : "edge-ai");
  const modelUsed =
    typeof payload?.model_used === "string"
      ? payload.model_used
      : typeof payload?.modelUsed === "string"
        ? payload.modelUsed
        : options.defaultModel ??
          (fallbackUsed ? "classification-fallback-v1" : "openai-gpt-4");

  const characteristics =
    Array.isArray(payload?.characteristics) && payload.characteristics.length > 0
      ? payload.characteristics
      : ["Commercial agreement requiring detailed analysis"];
  const suggestedSolutions =
    Array.isArray(payload?.suggestedSolutions) &&
    payload.suggestedSolutions.length > 0
      ? payload.suggestedSolutions
      : ["full_summary", "risk_assessment"];
  const keyTerms = Array.isArray(payload?.keyTerms) ? payload.keyTerms : [];

  const party1 =
    typeof payload?.partyRoles?.party1 === "string" && payload.partyRoles.party1.trim().length > 0
      ? payload.partyRoles.party1.trim()
      : "Not specified";
  const party2 =
    typeof payload?.partyRoles?.party2 === "string" && payload.partyRoles.party2.trim().length > 0
      ? payload.partyRoles.party2.trim()
      : "Not specified";

  let recommendedSolutionKey =
    typeof payload?.recommendedSolutionKey === "string" &&
    payload.recommendedSolutionKey.trim().length > 0
      ? (payload.recommendedSolutionKey.trim() as SolutionKey)
      : CONTRACT_TYPE_TO_SOLUTION_KEY[contractType];

  let recommendedSolutionTitle =
    typeof payload?.recommendedSolutionTitle === "string" &&
    payload.recommendedSolutionTitle.trim().length > 0
      ? payload.recommendedSolutionTitle.trim()
      : undefined;

  if (recommendedSolutionKey && !recommendedSolutionTitle) {
    recommendedSolutionTitle =
      SOLUTION_KEY_DISPLAY_NAMES[recommendedSolutionKey];
  }

  return {
    contractType,
    confidence,
    subType:
      typeof payload?.subType === "string" && payload.subType.trim().length > 0
        ? payload.subType.trim()
        : null,
    characteristics,
    reasoning:
      typeof payload?.reasoning === "string" && payload.reasoning.trim().length > 0
        ? payload.reasoning.trim()
        : "AI-powered classification based on content analysis",
    suggestedSolutions,
    keyTerms,
    jurisdiction:
      typeof payload?.jurisdiction === "string" && payload.jurisdiction.trim().length > 0
        ? payload.jurisdiction.trim()
        : "Not specified",
    partyRoles: {
      party1,
      party2,
    },
    fallback_used: fallbackUsed,
    fallback_reason: fallbackReason,
    confidence_band: confidenceBand,
    generated_at: generatedAt,
    source,
    model_used: modelUsed,
    recommendedSolutionKey,
    recommendedSolutionTitle,
  };
}

classifyRouter.post("/", async (req, res) => {
  const { content, fileName, solutionHint } =
    req.body as ClassificationRequestBody;

  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const aiResult = await classifyContractWithAI(content, {
      fileName,
      solutionHint,
    });

    const normalized = normalizeClassificationPayload(aiResult, {
      defaultModel: aiResult.model_used,
      defaultSource: aiResult.source ?? "openai",
    });

    if (normalized.fallback_used) {
      console.warn("[classify] AI classification returned fallback metadata", {
        fallbackReason: normalized.fallback_reason,
        confidence: normalized.confidence,
        contractType: normalized.contractType,
      });
    }

    res.json(normalized);
  } catch (error) {
    console.error("[classify] Unexpected proxy error", error);
    const fallback = normalizeClassificationPayload(
      generateFallbackClassification(
        content,
        fileName,
        `Classification error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        solutionHint,
      ),
      {
        fallbackReason:
          error instanceof Error ? error.message : String(error),
      },
    );
    res.json(fallback);
  }
});
