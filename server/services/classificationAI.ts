import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import fetch from "node-fetch";
import type { ClassificationResult } from "./classificationFallback";

interface ClassificationAIOptions {
  fileName?: string;
  solutionHint?: string | null;
  signal?: AbortSignal;
}

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

const OPENAI_BASE_URL =
  process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL =
  process.env.OPENAI_CLASSIFICATION_MODEL ?? "gpt-5-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[classificationAI] OPENAI_API_KEY is not set. Classification requests will fail.",
  );
}

function buildSystemPrompt(solutionHint?: string | null): string {
  const solutionContext = solutionHint
    ? `\nThe user selected solution hint: ${solutionHint}. Use this as a strong prior but override it if the evidence clearly indicates a different contract type.`
    : "";

  return `You are a senior contract analyst. Classify the provided contract into one of the supported categories and justify your decision with concrete evidence.

Supported categories:
1. data_processing_agreement
2. non_disclosure_agreement
3. privacy_policy_document
4. consultancy_agreement
5. research_development_agreement
6. end_user_license_agreement
7. product_supply_agreement
8. general_commercial

Always respond with valid JSON following the requested schema.${solutionContext}`;
}

function buildUserPrompt(
  content: string,
  fileName?: string,
  solutionHint?: string | null,
): string {
  const fileLine = fileName ? `File name: ${fileName}\n` : "";
  const hintLine = solutionHint
    ? `Declared solution hint: ${solutionHint}\n`
    : "";

  return `${fileLine}${hintLine}Contract content (full):\n${content}`;
}

export async function classifyContractWithAI(
  content: string,
  { fileName, solutionHint, signal }: ClassificationAIOptions = {},
): Promise<ClassificationResult> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const requestBody: Record<string, unknown> = {
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(solutionHint),
        },
        {
          role: "user",
          content: buildUserPrompt(content, fileName, solutionHint),
        },
      ],
    };

    // GPT-5 classification models currently only support default temperature
    if (!OPENAI_MODEL.toLowerCase().includes("gpt-5")) {
      requestBody.temperature = 0.1;
    }

    const response = await fetch(OPENAI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI classification error: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent =
      data?.choices?.[0]?.message?.content ??
      (() => {
        throw new Error("OpenAI classification response missing content");
      })();

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      throw new Error(
        `Failed to parse OpenAI classification JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const contractType =
      typeof parsed.contractType === "string"
        ? parsed.contractType.trim()
        : "general_commercial";

    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.6;

    const normalizeStringArray = (value: unknown, fallback: string[]) => {
      if (!Array.isArray(value)) return fallback;
      const items = value
        .map((item) =>
          typeof item === "string" ? item.trim() : String(item ?? ""),
        )
        .filter((item) => item.length > 0);
      return items.length ? items : fallback;
    };

    const characteristics = normalizeStringArray(
      parsed.characteristics,
      ["Distinctive clauses or obligations identified"],
    );
    const suggestedSolutions = normalizeStringArray(
      parsed.suggestedSolutions,
      ["full_summary", "risk_assessment"],
    );
    const keyTerms = normalizeStringArray(parsed.keyTerms, []).slice(0, 10);

    let recommendedSolutionKey: SolutionKey | undefined =
      typeof parsed.recommendedSolutionKey === "string" &&
      parsed.recommendedSolutionKey.trim().length > 0
        ? (parsed.recommendedSolutionKey.trim() as SolutionKey)
        : CONTRACT_TYPE_TO_SOLUTION_KEY[contractType];

    let recommendedSolutionTitle =
      typeof parsed.recommendedSolutionTitle === "string" &&
      parsed.recommendedSolutionTitle.trim().length > 0
        ? parsed.recommendedSolutionTitle.trim()
        : undefined;

    if (recommendedSolutionKey && !recommendedSolutionTitle) {
      recommendedSolutionTitle =
        SOLUTION_KEY_DISPLAY_NAMES[recommendedSolutionKey];
    }

    return {
      contractType,
      confidence,
      subType:
        typeof parsed.subType === "string" && parsed.subType.trim().length > 0
          ? parsed.subType.trim()
          : null,
      characteristics,
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
          ? parsed.reasoning.trim()
          : "AI-powered classification based on contract content.",
      suggestedSolutions,
      keyTerms,
      jurisdiction:
        typeof parsed.jurisdiction === "string" &&
        parsed.jurisdiction.trim().length > 0
          ? parsed.jurisdiction.trim()
          : "Not specified",
      partyRoles: {
        party1:
          typeof parsed.partyRoles?.party1 === "string" &&
          parsed.partyRoles.party1.trim().length > 0
            ? parsed.partyRoles.party1.trim()
            : "Primary Party",
        party2:
          typeof parsed.partyRoles?.party2 === "string" &&
          parsed.partyRoles.party2.trim().length > 0
            ? parsed.partyRoles.party2.trim()
            : "Counterparty",
      },
      fallback_used: false,
      source: "openai",
      model_used: OPENAI_MODEL,
      generated_at: new Date().toISOString(),
      recommendedSolutionKey,
      recommendedSolutionTitle,
    };
  } finally {
    clearTimeout(timeout);
  }
}
