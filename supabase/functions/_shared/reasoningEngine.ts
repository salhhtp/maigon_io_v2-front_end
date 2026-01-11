import {
  resolvePlaybook,
  type PlaybookKey,
  type ContractPlaybook,
  CONTRACT_PLAYBOOKS,
} from "./playbooks.ts";
import {
  validateAnalysisReport,
  type AnalysisReport,
  type ClauseExtraction,
} from "./reviewSchema.ts";
import { enhanceReportWithClauses } from "./clauseExtraction.ts";
import {
  bindProposedEditsToClauses,
  buildRetrievedClauseContext,
  dedupeIssues,
  dedupeProposedEdits,
  evaluatePlaybookCoverageFromContent,
  normaliseReportExpiry,
} from "../../../shared/ai/reliability.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_BASE =
  Deno.env.get("OPENAI_API_BASE") ?? "https://api.openai.com/v1/chat/completions";
const OPENAI_RESPONSES_API_BASE =
  Deno.env.get("OPENAI_RESPONSES_API_BASE") ??
  "https://api.openai.com/v1/responses";

const MODEL_CATALOG: Record<
  "default" | "premium" | "intensive",
  { envKey: string; fallback: string }
> = {
  default: {
    envKey: "OPENAI_REASONING_MODEL_DEFAULT",
    fallback: "gpt-5-mini",
  },
  premium: {
    envKey: "OPENAI_REASONING_MODEL_PREMIUM",
    fallback: "gpt-5",
  },
  intensive: {
    envKey: "OPENAI_REASONING_MODEL_INTENSIVE",
    fallback: "gpt-5-pro",
  },
};

type ModelTier = "default" | "premium" | "intensive";

function parseTierFromEnv(key: string): ModelTier | null {
  const value = Deno.env.get(key);
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "default" || normalized === "premium" || normalized === "intensive") {
    return normalized;
  }
  return null;
}

const severityEnum = ["critical", "high", "medium", "low", "info"] as const;
const priorityEnum = ["urgent", "high", "medium", "low"] as const;
const statusEnum = ["open", "in_progress", "resolved", "dismissed"] as const;

function normaliseSeverityValue(
  value?: string | null,
): (typeof severityEnum)[number] {
  const lower = typeof value === "string" ? value.toLowerCase() : "";
  return severityEnum.includes(lower as (typeof severityEnum)[number])
    ? (lower as (typeof severityEnum)[number])
    : "medium";
}

function normalisePriorityValue(
  value?: string | null,
): (typeof priorityEnum)[number] {
  const lower = typeof value === "string" ? value.toLowerCase() : "";
  return priorityEnum.includes(lower as (typeof priorityEnum)[number])
    ? (lower as (typeof priorityEnum)[number])
    : "high";
}

function normaliseWorkflowStatus(
  value?: string | null,
): (typeof statusEnum)[number] {
  const lower = typeof value === "string" ? value.toLowerCase() : "";
  return statusEnum.includes(lower as (typeof statusEnum)[number])
    ? (lower as (typeof statusEnum)[number])
    : "open";
}

const shortText = (maxLength = 220) => ({
  type: "string",
  maxLength,
});

const clauseText = (maxLength = 2000) => ({
  type: "string",
  maxLength,
});

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
  minItems: 0,
} as const;

const limitedStringArraySchema = (maxItems: number) =>
  ({
    type: "array",
    items: { type: "string" },
    minItems: 0,
    maxItems,
  }) as const;

const nullableNumberSchema = (options: Record<string, number> = {}) => ({
  type: ["number", "null"] as const,
  ...options,
});

const locationHintSchema = {
  type: ["object", "null"] as const,
  additionalProperties: false,
  required: ["page", "paragraph", "section", "clauseNumber"],
  properties: {
    page: nullableNumberSchema({ minimum: 1 }),
    paragraph: nullableNumberSchema({ minimum: 1 }),
    section: { type: ["string", "null"] as const },
    clauseNumber: { type: ["string", "null"] as const },
  },
} as const;

const clauseReferenceJsonSchema = {
  type: ["object", "null"] as const,
  additionalProperties: false,
  required: ["clauseId", "heading", "locationHint", "excerpt"],
  properties: {
    clauseId: shortText(120),
    heading: shortText(120),
    locationHint: locationHintSchema,
    excerpt: shortText(320),
  },
} as const;

const legalBasisEntrySchema = {
  type: "object",
  additionalProperties: false,
  required: ["authority", "cite", "summary"],
  properties: {
    authority: shortText(140),
    cite: shortText(80),
    summary: shortText(200),
  },
} as const;

const previewHtmlSchema = {
  type: "object",
  additionalProperties: false,
  required: ["previous", "updated", "diff"],
  properties: {
    previous: { type: "string" },
    updated: { type: "string" },
    diff: { type: "string" },
  },
} as const;

const tokenUsageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["input", "output", "totalCostUsd"],
  properties: {
    input: { type: "number", minimum: 0 },
    output: { type: "number", minimum: 0 },
    totalCostUsd: { type: "number", minimum: 0 },
  },
} as const;

const classificationMetadataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["contractType", "confidence"],
  properties: {
    contractType: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;

const playbookInsightItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "summary",
    "severity",
    "status",
    "recommendation",
    "guidance",
    "relatedClauseIds",
  ],
  properties: {
    id: { type: "string" },
    title: shortText(160),
    summary: shortText(220),
    severity: { type: "string", enum: severityEnum },
    status: { type: "string", enum: ["met", "missing", "attention"] },
    recommendation: shortText(220),
    guidance: limitedStringArraySchema(4),
    relatedClauseIds: limitedStringArraySchema(4),
  },
} as const;

const clauseExtractionItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "clauseId",
    "title",
    "category",
    "originalText",
    "normalizedText",
    "importance",
    "location",
    "references",
  ],
  properties: {
    id: { type: "string" },
    clauseId: { type: "string" },
    title: shortText(160),
    category: shortText(140),
    originalText: shortText(220),
    normalizedText: shortText(220),
    importance: { type: "string", enum: severityEnum },
    location: locationHintSchema,
    references: limitedStringArraySchema(4),
  },
} as const;

const similarityItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "referenceId",
    "sourceTitle",
    "similarityScore",
    "excerpt",
    "rationale",
    "tags",
  ],
  properties: {
    id: { type: "string" },
    referenceId: { type: "string" },
    sourceTitle: shortText(160),
    similarityScore: { type: "number", minimum: 0, maximum: 1 },
    excerpt: shortText(220),
    rationale: shortText(200),
    tags: limitedStringArraySchema(6),
  },
} as const;

const deviationInsightItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "deviationType",
    "severity",
    "description",
    "expectedStandard",
    "observedLanguage",
    "recommendation",
    "clauseId",
    "status",
  ],
  properties: {
    id: { type: "string" },
    title: shortText(160),
    deviationType: shortText(140),
    severity: { type: "string", enum: severityEnum },
    description: shortText(220),
    expectedStandard: shortText(200),
    observedLanguage: shortText(200),
    recommendation: shortText(220),
    clauseId: { type: "string" },
    status: { type: "string", enum: statusEnum },
  },
} as const;

const actionItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "description",
    "owner",
    "department",
    "dueDate",
    "priority",
    "status",
    "relatedClauseId",
  ],
  properties: {
    id: { type: "string" },
    title: shortText(160),
    description: shortText(220),
    owner: shortText(80),
    department: shortText(80),
    dueDate: shortText(80),
    priority: { type: "string", enum: priorityEnum },
    status: { type: "string", enum: statusEnum },
    relatedClauseId: { type: "string" },
  },
} as const;

const draftMetadataSchema = {
  type: ["object", "null"] as const,
  additionalProperties: false,
  required: ["previewAvailable", "selectedEditIds"],
  properties: {
    sourceDocumentId: { type: ["string", "null"] as const },
    baseVersionLabel: { type: ["string", "null"] as const },
    htmlSource: { type: ["string", "null"] as const },
    previewAvailable: { type: "boolean" },
    selectedEditIds: stringArraySchema,
    previousHtml: { type: ["string", "null"] as const },
    updatedHtml: { type: ["string", "null"] as const },
    diffHtml: { type: ["string", "null"] as const },
    lastUpdated: { type: ["string", "null"] as const },
  },
} as const;

const enhancementsJsonSchema = {
  type: "json_schema",
  name: "analysis_enhancements",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "playbookInsights",
      "clauseExtractions",
      "similarityAnalysis",
      "deviationInsights",
      "actionItems",
      "draftMetadata",
    ],
    properties: {
      playbookInsights: {
        type: "array",
        items: playbookInsightItemSchema,
      },
      clauseExtractions: {
        type: "array",
        items: clauseExtractionItemSchema,
      },
      similarityAnalysis: {
        type: "array",
        items: similarityItemSchema,
      },
      deviationInsights: {
        type: "array",
        items: deviationInsightItemSchema,
      },
      actionItems: {
        type: "array",
        items: actionItemSchema,
      },
      draftMetadata: draftMetadataSchema,
    },
  },
} as const;

const jsonSchemaFormat = {
  type: "json_schema",
  name: "analysis_report",
  strict: true,
  schema: {
    title: "analysis_report",
    type: "object",
    additionalProperties: false,
    required: [
      "version",
      "generatedAt",
      "generalInformation",
      "contractSummary",
      "issuesToAddress",
      "criteriaMet",
      "proposedEdits",
      "metadata",
    ],
    properties: {
      version: { type: "string", enum: ["v3"] },
      generatedAt: { type: "string" },
      generalInformation: {
        type: "object",
        additionalProperties: false,
        required: [
          "complianceScore",
          "selectedPerspective",
          "reviewTimeSeconds",
          "timeSavingsMinutes",
          "reportExpiry",
        ],
        properties: {
          complianceScore: { type: "number", minimum: 0, maximum: 100 },
          selectedPerspective: { type: "string" },
          reviewTimeSeconds: { type: "number", minimum: 0 },
          timeSavingsMinutes: { type: "number", minimum: 0 },
          reportExpiry: { type: "string" },
        },
      },
      contractSummary: {
        type: "object",
        additionalProperties: false,
        required: [
          "contractName",
          "filename",
          "parties",
          "agreementDirection",
          "purpose",
          "verbalInformationCovered",
          "contractPeriod",
          "governingLaw",
          "jurisdiction",
        ],
        properties: {
          contractName: shortText(160),
          filename: shortText(160),
          parties: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          agreementDirection: shortText(180),
          purpose: shortText(220),
          verbalInformationCovered: { type: "boolean" },
          contractPeriod: shortText(160),
          governingLaw: shortText(120),
          jurisdiction: shortText(120),
        },
      },
      issuesToAddress: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "title",
            "severity",
            "category",
            "tags",
            "clauseReference",
            "legalBasis",
            "recommendation",
            "rationale",
          ],
          properties: {
            id: { type: "string" },
            title: shortText(160),
            severity: { type: "string", enum: severityEnum },
            category: shortText(140),
            tags: limitedStringArraySchema(6),
            clauseReference: clauseReferenceJsonSchema,
            legalBasis: {
              type: "array",
              minItems: 0,
              maxItems: 3,
              items: legalBasisEntrySchema,
            },
            recommendation: shortText(220),
            rationale: shortText(220),
          },
        },
      },
      criteriaMet: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "description", "met", "evidence"],
          properties: {
            id: { type: "string" },
            title: shortText(160),
            description: shortText(220),
            met: { type: "boolean" },
            evidence: shortText(200),
          },
        },
      },
      proposedEdits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "clauseId",
            "anchorText",
            "proposedText",
            "intent",
            "rationale",
          ],
          properties: {
            id: { type: "string" },
            clauseId: { type: "string" },
            anchorText: shortText(160),
            proposedText: clauseText(),
            intent: shortText(200),
            rationale: shortText(200),
          },
        },
      },
      metadata: {
        type: "object",
        additionalProperties: false,
        required: [
          "model",
          "modelCategory",
          "playbookKey",
          "classification",
          "tokenUsage",
          "critiqueNotes",
        ],
        properties: {
          model: { type: "string" },
          modelCategory: {
            type: "string",
            enum: ["default", "premium", "intensive"],
          },
          playbookKey: { type: "string" },
          classification: classificationMetadataSchema,
          tokenUsage: tokenUsageSchema,
          critiqueNotes: stringArraySchema,
        },
      },
    },
  },
} as const;

const COMPACT_MAX_ISSUES = 40;
const COMPACT_MAX_CRITERIA = 40;
const COMPACT_MAX_EDITS = 20;
const ULTRA_MAX_ISSUES = 25;
const ULTRA_MAX_CRITERIA = 25;
const ULTRA_MAX_EDITS = 10;

const baseSchema = jsonSchemaFormat.schema;
const baseProposedEdits = baseSchema.properties.proposedEdits;
const baseProposedEditsItems = baseProposedEdits.items;

const jsonSchemaFormatCompact = {
  ...jsonSchemaFormat,
  name: "analysis_report_compact",
  schema: {
    ...baseSchema,
    title: "analysis_report_compact",
    properties: {
      ...baseSchema.properties,
      issuesToAddress: {
        ...baseSchema.properties.issuesToAddress,
        maxItems: COMPACT_MAX_ISSUES,
      },
      criteriaMet: {
        ...baseSchema.properties.criteriaMet,
        maxItems: COMPACT_MAX_CRITERIA,
      },
      proposedEdits: {
        ...baseProposedEdits,
        maxItems: COMPACT_MAX_EDITS,
        items: {
          ...baseProposedEditsItems,
          properties: {
            ...baseProposedEditsItems.properties,
            anchorText: shortText(140),
            proposedText: clauseText(1200),
            intent: shortText(160),
            rationale: shortText(160),
          },
        },
      },
    },
  },
} as const;

const jsonSchemaFormatUltra = {
  ...jsonSchemaFormat,
  name: "analysis_report_ultra",
  schema: {
    ...baseSchema,
    title: "analysis_report_ultra",
    properties: {
      ...baseSchema.properties,
      issuesToAddress: {
        ...baseSchema.properties.issuesToAddress,
        maxItems: ULTRA_MAX_ISSUES,
      },
      criteriaMet: {
        ...baseSchema.properties.criteriaMet,
        maxItems: ULTRA_MAX_CRITERIA,
      },
      proposedEdits: {
        ...baseProposedEdits,
        maxItems: ULTRA_MAX_EDITS,
        items: {
          ...baseProposedEditsItems,
          properties: {
            ...baseProposedEditsItems.properties,
            anchorText: shortText(120),
            proposedText: clauseText(900),
            intent: shortText(140),
            rationale: shortText(140),
          },
        },
      },
    },
  },
} as const;

type EnhancementSections = Pick<
  AnalysisReport,
  | "playbookInsights"
  | "clauseExtractions"
  | "similarityAnalysis"
  | "deviationInsights"
  | "actionItems"
  | "draftMetadata"
>;

const FORCED_MODEL_TIER = parseTierFromEnv("OPENAI_REASONING_FORCE_TIER");
const DEFAULT_MODEL_TIER =
  FORCED_MODEL_TIER ?? parseTierFromEnv("OPENAI_REASONING_DEFAULT_TIER") ?? "premium";
const DEFAULT_MAX_OUTPUT_TOKENS = 10000;
const MAX_ENHANCEMENT_OUTPUT_TOKENS = 10000;
const MAX_OUTPUT_TOKENS_ENV = Deno.env.get("OPENAI_REASONING_MAX_OUTPUT_TOKENS");
const parsedMaxOutput =
  MAX_OUTPUT_TOKENS_ENV === undefined
    ? DEFAULT_MAX_OUTPUT_TOKENS
    : Number(MAX_OUTPUT_TOKENS_ENV);
const MAX_OUTPUT_TOKENS =
  Number.isFinite(parsedMaxOutput) && parsedMaxOutput > 0
    ? parsedMaxOutput
    : null;
const DEFAULT_REQUEST_TIMEOUT_MS = 120000;
const parsedTimeout = Number(Deno.env.get("OPENAI_REASONING_TIMEOUT_MS"));
const REQUEST_TIMEOUT_MS =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0
    ? parsedTimeout
    : DEFAULT_REQUEST_TIMEOUT_MS;
const DEBUG_REVIEW = (() => {
  const raw = (Deno.env.get("MAIGON_REVIEW_DEBUG") ?? "1").toLowerCase().trim();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
})();
const SKIP_ENHANCEMENTS = (() => {
  const raw = (Deno.env.get("OPENAI_REASONING_SKIP_ENHANCEMENTS") ?? "1")
    .toLowerCase()
    .trim();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
})();

interface ReasoningContext {
  content: string;
  reviewType: string;
  classification?: {
    contractType?: string;
    confidence?: number;
    characteristics?: string[];
    suggestedSolutions?: string[];
    reasoning?: string;
  } | null;
  selectedSolution?: {
    id?: string;
    key?: string;
    title?: string;
  } | null;
  filename?: string | null;
  documentFormat?: string | null;
  ingestionWarnings?: unknown;
  ingestionId?: string | null;
  modelTier?: ModelTier;
  clauseDigest?: {
    summary: string;
    total: number;
    categoryCounts?: Record<string, number>;
  } | null;
  clauseExtractions?: ClauseExtraction[] | null;
  clauseSetWeak?: boolean;
}

interface ReasoningResult {
  report: AnalysisReport;
  raw: unknown;
  model: string;
  tier: ModelTier;
}

function createDefaultDraftMetadata() {
  return {
    sourceDocumentId: null,
    baseVersionLabel: null,
    htmlSource: null,
    previewAvailable: false,
    selectedEditIds: [],
    previousHtml: null,
    updatedHtml: null,
    diffHtml: null,
    lastUpdated: null,
  };
}

class ReasoningIncompleteError extends Error {
  constructor(message: string, public reason?: string) {
    super(message);
    this.name = "ReasoningIncompleteError";
  }
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error) {
    return /aborted|abort/i.test(error.message);
  }
  return false;
}

function resolveModelId(tier: ModelTier) {
  const entry = MODEL_CATALOG[tier];
  const envValue = Deno.env.get(entry.envKey);
  return envValue && envValue.trim().length > 0
    ? envValue.trim()
    : entry.fallback;
}

function normaliseSolutionKey(
  key?: string | null,
  fallback?: string | null,
): PlaybookKey {
  const basis =
    key?.toLowerCase() ??
    fallback?.toLowerCase() ??
    "non_disclosure_agreement";
  switch (basis) {
    case "dpa":
    case "data_processing_agreement":
      return "data_processing_agreement";
    case "nda":
    case "non_disclosure_agreement":
      return "non_disclosure_agreement";
    case "privacy_policy":
    case "privacy_policy_document":
      return "privacy_policy_document";
    case "consultancy":
    case "consultancy_agreement":
      return "consultancy_agreement";
    case "r&d":
    case "research_and_development":
    case "research_development_agreement":
      return "research_development_agreement";
    case "eula":
    case "end_user_license_agreement":
      return "end_user_license_agreement";
    case "psa":
    case "professional_services_agreement":
    case "product_supply_agreement":
      return "professional_services_agreement";
    default:
      return (
        (basis as PlaybookKey) ?? ("non_disclosure_agreement" as PlaybookKey)
      );
  }
}

function buildSystemPrompt(
  playbookTitle: string,
  reviewType: string,
  options?: { compact?: boolean },
) {
  const compact = Boolean(options?.compact);
  const enumerationInstruction = compact
    ? "Prioritize critical/high/medium issues; include low/info only if space allows."
    : "Enumerate every issue across all severities (critical, high, medium, low, info); do not prune minor gaps.";

  return [
    `You are Maigon Counsel, a senior technology contracts attorney tasked with generating a ${reviewType} review.`,
    "Emulate a professional legal memo: be objective, concise, and grounded in industry-standard compliance criteria.",
    "Use precise legal verbs (shall/must/may/is entitled to/shall not); avoid hedging.",
    "Think through each clause carefully before producing structured output.",
    enumerationInstruction,
    "Use legal reasoning, cite regulatory frameworks, and flag negotiation levers.",
    "Ground every observation in the retrieved excerpts or clause digest provided. Do not infer missing language from general knowledge.",
    "If a clause is not present in the provided excerpts, mark it as \"Not present in contract\" and propose language only when clearly missing.",
    "For each checklist/anchor item in the playbook, emit a finding (met/missing/attention) and include an issue for anything missing or ambiguous.",
    compact
      ? "If output length is constrained, group similar findings and keep each item concise."
      : null,
    `Apply the playbook for ${playbookTitle}.`,
    "Always respond with JSON that matches the requested schema.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildUserPrompt(
  context: ReasoningContext,
  playbook: ReturnType<typeof resolvePlaybook>,
  options?: { compact?: boolean; maxChars?: number },
) {
  const compact = Boolean(options?.compact);

  const metadataSections = [
    context.filename ? `Filename: ${context.filename}` : null,
    context.documentFormat
      ? `Document format: ${context.documentFormat}`
      : null,
    context.classification?.contractType
      ? `Classification: ${context.classification.contractType} (confidence ${context.classification.confidence ?? "n/a"})`
      : null,
    context.selectedSolution?.title
      ? `Selected solution: ${context.selectedSolution.title}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const playbookSection = compact
    ? [
        `Playbook summary: ${playbook.description}`,
        `Regulatory focus: ${playbook.regulatoryFocus.join(", ")}`,
        `Critical clauses: ${playbook.criticalClauses
          .map((clause) => clause.title)
          .join("; ")}`,
        `Clause anchors: ${playbook.clauseAnchors.join("; ")}`,
      ].join("\n")
    : [
        `Playbook summary: ${playbook.description}`,
        `Regulatory focus: ${playbook.regulatoryFocus.join(", ")}`,
        `Critical clauses:`,
        ...playbook.criticalClauses.map(
          (clause, index) =>
            `${index + 1}. ${clause.title} | Must include: ${clause.mustInclude.join(", ")} | Red flags: ${clause.redFlags.join(", ")}`,
        ),
        `Negotiation guidance: ${playbook.negotiationGuidance.join("; ")}`,
      ].join("\n");

  const clauseDigestSection = (() => {
    if (context.clauseDigest?.summary) {
      const digestSummary = context.clauseDigest.summary;
      const categoryCounts = context.clauseDigest.categoryCounts;
      const categoryLine = categoryCounts
        ? `Category coverage: ${Object.entries(categoryCounts)
            .map(([key, count]) => `${key}:${count}`)
        .join(", ")}`
        : null;
      return [
        `Clause digest (${context.clauseDigest.total} segments):`,
        digestSummary,
        categoryLine,
      ]
        .filter(Boolean)
        .join("\n");
    }
    return "Clause digest unavailable. Base findings only on retrieved clause excerpts.";
  })();

  const extractionNotice = (() => {
    const clauseExtractions = context.clauseExtractions ?? [];
    if (!clauseExtractions.length && !context.clauseDigest?.summary) {
      return "No clause extractions available. Mark items as missing unless explicitly supported by retrieved excerpts.";
    }
    return null;
  })();

  const clauseContextSection = (() => {
    const clauseExtractions = context.clauseExtractions ?? [];
    if (!clauseExtractions.length) {
      return null;
    }
    if (context.clauseSetWeak) {
      return "Clause extraction quality is weak; rely on available excerpts and treat uncertain items as missing.";
    }
    const retrieved = buildRetrievedClauseContext({
      playbook,
      clauses: clauseExtractions,
      maxPerAnchor: compact ? 1 : 2,
      maxTotal: compact ? 8 : 14,
      excerptLength: compact ? 220 : 320,
    });
    if (!retrieved.summary) {
      return null;
    }
    return `Retrieved clause excerpts (matched to playbook anchors):\n${retrieved.summary}`;
  })();

  return [
    metadataSections,
    playbookSection,
    clauseDigestSection,
    extractionNotice,
    clauseContextSection,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildJsonSchemaDescription(
  options?: { compact?: boolean; mode?: "full" | "compact" | "ultra" },
) {
  const mode = options?.mode ?? (options?.compact ? "compact" : "full");
  const compact = mode !== "full";
  return [
    "Return JSON with the required sections below. Keep language precise and avoid duplicating the same text across fields.",
    "- version: \"v3\"",
    "- generatedAt: ISO timestamp",
    "- generalInformation: { complianceScore (0-100), selectedPerspective, reviewTimeSeconds, timeSavingsMinutes, reportExpiry }",
    "- contractSummary: { contractName, filename, parties[], agreementDirection, purpose, verbalInformationCovered, contractPeriod, governingLaw, jurisdiction }",
    "- issuesToAddress: Issues with id, title, severity, recommendation, rationale, clauseReference { clauseId, heading, excerpt, locationHint }. Excerpt must quote or paraphrase the retrieved clause excerpts or clause digest. If a clause is missing, state \"Not present in contract\" in excerpt and location.",
    "- criteriaMet: Checklist items with id, title, description, met, evidence.",
    "- proposedEdits: Each edit with id, clauseId, anchorText, proposedText, intent, rationale. Anchor text must be an exact excerpt from the extracted clause text provided. Proposed text = fully rewritten clause or paragraph ready to paste into the contract. Intent must be insert|replace|remove.",
    "- metadata: model + classification + token usage + critique notes.",
    "Do not include previewHtml/previousText/updatedText/applyByDefault; these are derived later.",
    "Optional sections (playbookInsights, clauseExtractions, similarityAnalysis, deviationInsights, actionItems, draftMetadata) should be omitted unless explicitly requested.",
    "Always evaluate the document against the playbook/checklist and call out missing clauses before generic risks.",
    "If a value is unknown, set a descriptive default like \"Not specified\", 0, false, or []. Do not emit null unless the schema allows it.",
    compact && mode === "compact"
      ? `Compact mode: prioritize critical/high/medium issues, group similar findings, and keep outputs concise. Limit to ${COMPACT_MAX_ISSUES} issues, ${COMPACT_MAX_CRITERIA} criteria, and ${COMPACT_MAX_EDITS} proposed edits.`
      : null,
    compact && mode === "ultra"
      ? `Ultra-compact mode: return only the most material findings. Limit to ${ULTRA_MAX_ISSUES} issues, ${ULTRA_MAX_CRITERIA} criteria, and ${ULTRA_MAX_EDITS} proposed edits.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function shouldUseResponsesApi(model: string) {
  return /(gpt-5|o1|o3|reasoning|deepseek)/i.test(model);
}

function buildResponsesInput(systemPrompt: string, userPrompt: string) {
  return [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    {
      role: "user",
      content: [{ type: "input_text", text: userPrompt }],
    },
  ];
}

function extractResponsesContent(payload: any): string {
  if (!payload) {
    throw new Error("Model returned empty response");
  }

  const coerceText = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value : null;
  const coerceJson = (value: unknown) =>
    value && typeof value === "object" ? JSON.stringify(value) : null;

  const output = payload.output;
  if (Array.isArray(output)) {
    for (const entry of output) {
      const entryText = coerceText(entry?.text) ?? coerceText(entry?.content);
      if (entryText) {
        return entryText;
      }
      if (entry?.json) {
        const entryJson = coerceJson(entry.json);
        if (entryJson) {
          return entryJson;
        }
      }
      if (Array.isArray(entry?.content)) {
        for (const part of entry.content) {
          const partText = coerceText(part?.text) ?? coerceText(part?.content);
          if (partText) {
            return partText;
          }
          if (part?.json) {
            const partJson = coerceJson(part.json);
            if (partJson) {
              return partJson;
            }
          }
        }
      }
    }
  }

  if (
    Array.isArray(payload?.choices) &&
    typeof payload.choices[0]?.message?.content === "string"
  ) {
    return payload.choices[0].message.content;
  }

  if (typeof payload?.output_text === "string") {
    const outputText = coerceText(payload.output_text);
    if (outputText) {
      return outputText;
    }
  }
  if (Array.isArray(payload?.output_text)) {
    const outputText = coerceText(payload.output_text[0]);
    if (outputText) {
      return outputText;
    }
  }

  console.error("📭 Responses payload missing textual content", {
    payloadPreview: (() => {
      try {
        return JSON.stringify(payload).slice(0, 2000);
      } catch {
        return "[unserializable payload]";
      }
    })(),
  });

  throw new Error("Model returned empty response");
}

function normaliseTokenUsage(payload: any, viaResponses: boolean) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const usage = payload.usage;
  if (!usage || typeof usage !== "object") {
    return undefined;
  }
  if (viaResponses) {
    return {
      input: usage.input_tokens ?? usage.prompt_tokens,
      output: usage.output_tokens ?? usage.completion_tokens,
      totalCostUsd:
        usage.total_cost_usd ?? usage.total_cost ?? usage.totalCostUsd,
    };
  }
  return {
    input: usage.prompt_tokens ?? usage.input_tokens,
    output: usage.completion_tokens ?? usage.output_tokens,
    totalCostUsd:
      usage.total_cost_usd ?? usage.total_cost ?? usage.totalCostUsd,
  };
}

function runHeuristicCritique(
  report: AnalysisReport,
  playbookKey: PlaybookKey,
  coverageContext?: {
    content?: string | null;
    clauses?: ClauseExtraction[] | null;
  },
): {
  notes: string[];
  coverage: PlaybookCoverageSummary | null;
  diagnostics: {
    content: PlaybookCoverageSummary | null;
    model: PlaybookCoverageSummary | null;
  };
} {
  const notes: string[] = [];
  let coverage: PlaybookCoverageSummary | null = null;
  let contentCoverage: PlaybookCoverageSummary | null = null;
  let modelCoverage: PlaybookCoverageSummary | null = null;
  let playbook: ContractPlaybook | null = null;

  try {
    playbook = resolvePlaybook(playbookKey);
  } catch {
    playbook = null;
  }

  if (playbook) {
    contentCoverage = evaluatePlaybookCoverageFromContent(playbook, {
      content: coverageContext?.content ?? "",
      clauses: coverageContext?.clauses ?? [],
    });
    modelCoverage = evaluatePlaybookCoverageFromReport(report, playbook);
    coverage = contentCoverage ?? modelCoverage;
    coverage.criticalClauses.forEach((clause) => {
      if (!clause.met) {
        notes.push(
          `Critical clause "${clause.title}" missing required language.`,
        );
        if (clause.missingMustInclude.length > 0) {
          notes.push(
            `Missing elements: ${clause.missingMustInclude.join(", ")}`,
          );
        }
      }
    });
    coverage.anchorCoverage.forEach((anchor) => {
      if (!anchor.met) {
        notes.push(`No coverage found for "${anchor.anchor}" requirement.`);
      }
    });
    if (coverage.coverageScore < 0.85) {
      notes.push(
        `Playbook coverage at ${Math.round(coverage.coverageScore * 100)}%. Reinforce missing anchors.`,
      );
    }
    const expectedMinimumIssues = Math.min(
      Math.max(5, (playbook.clauseAnchors?.length ?? 0) / 2),
      20,
    );
    if (report.issuesToAddress.length < expectedMinimumIssues) {
      notes.push(
        `Issue count (${report.issuesToAddress.length}) below expected for ${playbook.displayName}; ensure each checklist item is evaluated.`,
      );
    }
  } else {
    notes.push("Playbook configuration missing for this solution.");
  }

  if (report.issuesToAddress.length === 0) {
    notes.push("No issues returned; ensure clauses were evaluated.");
  }
  if (
    playbookKey === "data_processing_agreement" &&
    !report.issuesToAddress.some((issue) =>
      issue.title.toLowerCase().includes("security") ||
      issue.recommendation.toLowerCase().includes("breach"),
    )
  ) {
    notes.push("DPA reviews must address security or breach handling.");
  }
  if (DEBUG_REVIEW && playbook && contentCoverage && modelCoverage) {
    const missingAnchors = contentCoverage.anchorCoverage
      .filter((anchor) => !anchor.met)
      .map((anchor) => anchor.anchor);
    console.info("📊 Playbook coverage diagnostics", {
      playbook: playbook.displayName,
      contentScore: contentCoverage.coverageScore,
      modelScore: modelCoverage.coverageScore,
      missingAnchors,
    });
  }
  return {
    notes,
    coverage,
    diagnostics: {
      content: contentCoverage,
      model: modelCoverage,
    },
  };
}

function applyOptionalSectionDefaults(payload: Record<string, unknown>) {
  const ensureArray = (key: string) => {
    if (!Array.isArray(payload[key])) {
      payload[key] = [];
    }
  };
  ensureArray("clauseFindings");
  ensureArray("playbookInsights");
  ensureArray("clauseExtractions");
  ensureArray("similarityAnalysis");
  ensureArray("deviationInsights");
  ensureArray("actionItems");
  enforceClauseReferenceSeeds(payload);
  enforceProposedEditClauseBindings(payload);
  normaliseProposedEditContent(payload);

  if (!payload.metadata || typeof payload.metadata !== "object") {
    payload.metadata = {};
  }

  if (!payload.draftMetadata || typeof payload.draftMetadata !== "object") {
    payload.draftMetadata = createDefaultDraftMetadata();
  } else {
    const draft = payload.draftMetadata as Record<string, unknown>;
    if (typeof draft.previewAvailable !== "boolean") {
      draft.previewAvailable = false;
    }
    if (!Array.isArray(draft.selectedEditIds)) {
      draft.selectedEditIds = [];
    }
    draft.sourceDocumentId ??= null;
    draft.baseVersionLabel ??= null;
    draft.htmlSource ??= null;
    draft.previousHtml ??= null;
    draft.updatedHtml ??= null;
    draft.diffHtml ??= null;
    draft.lastUpdated ??= null;
  }
}

function enforceClauseReferenceSeeds(payload: Record<string, unknown>) {
  const normalizeClauseId = (value: unknown, fallback: string) => {
    return typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : fallback;
  };

  const issues = Array.isArray(payload.issuesToAddress)
    ? payload.issuesToAddress
    : [];
  issues.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const issueRecord = item as Record<string, unknown>;
    if (!Array.isArray(issueRecord.legalBasis)) {
      issueRecord.legalBasis = [];
    }
    const fallbackId = `issue-clause-${index + 1}`;
    const referenceCandidate =
      issueRecord.clauseReference && typeof issueRecord.clauseReference === "object"
        ? (issueRecord.clauseReference as Record<string, unknown>)
        : {};
    const clauseId = normalizeClauseId(referenceCandidate.clauseId, fallbackId);
    referenceCandidate.clauseId = clauseId;
    if (
      typeof referenceCandidate.heading !== "string" ||
      referenceCandidate.heading.trim().length === 0
    ) {
      const headingSource =
        typeof issueRecord.title === "string" ? issueRecord.title : undefined;
      if (headingSource) {
        referenceCandidate.heading = headingSource;
      }
    }
    if (
      typeof referenceCandidate.excerpt !== "string" ||
      referenceCandidate.excerpt.trim().length === 0
    ) {
      referenceCandidate.excerpt = "Evidence not found";
    }
    if (
      !referenceCandidate.locationHint ||
      typeof referenceCandidate.locationHint !== "object"
    ) {
      referenceCandidate.locationHint = {
        page: null,
        paragraph: null,
        section: null,
        clauseNumber: null,
      };
    }
    issueRecord.clauseReference = referenceCandidate;
  });

  const clauseFindings = Array.isArray(payload.clauseFindings)
    ? payload.clauseFindings
    : [];
  clauseFindings.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const clauseRecord = item as Record<string, unknown>;
    clauseRecord.clauseId = normalizeClauseId(
      clauseRecord.clauseId,
      `clause-finding-${index + 1}`,
    );
  });
  payload.clauseFindings = clauseFindings;

  const clauseExtractions = Array.isArray(payload.clauseExtractions)
    ? payload.clauseExtractions
    : [];
  clauseExtractions.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const clauseRecord = item as Record<string, unknown>;
    clauseRecord.clauseId = normalizeClauseId(
      clauseRecord.clauseId ?? clauseRecord.id,
      `clause-extraction-${index + 1}`,
    );
  });
}

function enforceProposedEditClauseBindings(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.proposedEdits)) {
    return;
  }
  const clauseCandidates = Array.isArray(payload.clauseExtractions)
    ? (payload.clauseExtractions as Array<Record<string, unknown>>)
    : [];
  const issues = Array.isArray(payload.issuesToAddress)
    ? (payload.issuesToAddress as Array<Record<string, unknown>>)
    : [];

  payload.proposedEdits = bindProposedEditsToClauses({
    proposedEdits: payload.proposedEdits as Array<Record<string, unknown>>,
    issues: issues as Array<Record<string, unknown>>,
    clauses: clauseCandidates as Array<Record<string, unknown>>,
  });
}

function normaliseProposedEditContent(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.proposedEdits)) return;
  payload.proposedEdits = payload.proposedEdits.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const record = entry as Record<string, unknown>;
    const proposedText =
      typeof record.proposedText === "string" ? record.proposedText : "";
    const previousText =
      typeof record.previousText === "string" ? record.previousText : "";

    const needsRewrite = (value: unknown) =>
      typeof value !== "string" ||
      value.trim().length === 0 ||
      /as in proposed text/i.test(value) ||
      /see proposedtext/i.test(value);

    if (typeof record.anchorText === "string") {
      const rawAnchor = record.anchorText;
      const arrowIndex = rawAnchor.lastIndexOf("->");
      const unicodeArrowIndex = rawAnchor.lastIndexOf("→");
      const cutIndex = Math.max(arrowIndex, unicodeArrowIndex);
      if (cutIndex >= 0) {
        const trimmed = rawAnchor.slice(cutIndex + 2).trim();
        if (trimmed) {
          record.anchorText = trimmed;
        }
      }
    }

    if (needsRewrite(record.updatedText)) {
      record.updatedText = proposedText;
    }

    if (record.previewHtml && typeof record.previewHtml === "object") {
      const preview = record.previewHtml as Record<string, unknown>;
      if (needsRewrite(preview.updated)) {
        preview.updated = proposedText;
      }
      if (
        (typeof preview.previous !== "string" ||
          preview.previous.trim().length === 0) &&
        previousText
      ) {
        preview.previous = previousText;
      }
    }
    return record;
  });
}

type PlaybookCoverageSummary = {
  coverageScore: number;
  criticalClauses: Array<{
    title: string;
    met: boolean;
    evidence?: string;
    missingMustInclude: string[];
  }>;
  anchorCoverage: Array<{
    anchor: string;
    met: boolean;
    evidence?: string;
  }>;
};

type EvidenceSource = { label: string; text: string };

function normaliseTextCandidate(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.toLowerCase()
    : "";
}

function buildEvidenceSources(report: AnalysisReport): EvidenceSource[] {
  const sources: EvidenceSource[] = [];
  report.clauseFindings.forEach((clause) => {
    sources.push({
      label: clause.title
        ? `Clause: ${clause.title}`
        : `Clause finding ${clause.clauseId ?? ""}`.trim(),
      text: [
        clause.title,
        clause.summary,
        clause.recommendation,
        clause.originalText,
      ]
        .filter(Boolean)
        .map((value) => value?.toString() ?? "")
        .join(" ")
        .toLowerCase(),
    });
  });
  report.issuesToAddress.forEach((issue) => {
    sources.push({
      label: issue.title ? `Issue: ${issue.title}` : "Issue",
      text: [
        issue.title,
        issue.summary,
        issue.recommendation,
        issue.clauseReference?.excerpt,
        issue.clauseReference?.heading,
      ]
        .filter(Boolean)
        .map((value) => value?.toString() ?? "")
        .join(" ")
        .toLowerCase(),
    });
  });
  report.playbookInsights?.forEach((insight) => {
    sources.push({
      label: insight.title ? `Insight: ${insight.title}` : "Insight",
      text: [
        insight.title,
        insight.summary,
        insight.recommendation,
        insight.guidance?.join(" "),
      ]
        .filter(Boolean)
        .map((value) => value?.toString() ?? "")
        .join(" ")
        .toLowerCase(),
    });
  });
  return sources;
}

function findEvidenceForKeywords(
  keywords: string[],
  sources: EvidenceSource[],
): { met: boolean; evidence?: string } {
  for (const source of sources) {
    const match = keywords.some((keyword) =>
      source.text.includes(normaliseTextCandidate(keyword)),
    );
    if (match) {
      return { met: true, evidence: source.label };
    }
  }
  return { met: false };
}

function evaluatePlaybookCoverageFromReport(
  report: AnalysisReport,
  playbook: ContractPlaybook,
): PlaybookCoverageSummary {
  const sources = buildEvidenceSources(report);
  const criticalClauses = (playbook.criticalClauses ?? []).map((clause) => {
    const normalizedKeywords = [
      clause.title,
      ...(clause.mustInclude ?? []),
    ].filter(Boolean) as string[];
    const { met, evidence } = findEvidenceForKeywords(
      normalizedKeywords,
      sources,
    );
    const missingMustInclude =
      clause.mustInclude?.filter((item) => {
        const token = normaliseTextCandidate(item);
        return token.length > 0
          ? !sources.some((source) => source.text.includes(token))
          : false;
      }) ?? [];
    return {
      title: clause.title,
      met: met && missingMustInclude.length === 0,
      evidence,
      missingMustInclude,
    };
  });

  const anchorCoverage = (playbook.clauseAnchors ?? []).map((anchor) => {
    const result = findEvidenceForKeywords([anchor], sources);
    return {
      anchor,
      met: result.met,
      evidence: result.evidence,
    };
  });

  const totalChecks =
    criticalClauses.length + anchorCoverage.length || 1;
  const metChecks =
    criticalClauses.filter((clause) => clause.met).length +
    anchorCoverage.filter((anchor) => anchor.met).length;

  return {
    coverageScore: Number(Math.max(0, metChecks / totalChecks).toFixed(2)),
    criticalClauses,
    anchorCoverage,
  };
}

type ScoreBreakdown = {
  issuePenalty: number;
  criteriaPenalty: number;
  coveragePenalty: number;
  issuesBySeverity: Record<string, number>;
};

function computeRuleBasedScore(
  report: AnalysisReport,
  playbook: ContractPlaybook | null,
  coverageContext?: {
    content?: string | null;
    clauses?: ClauseExtraction[] | null;
  },
): {
  score: number;
  coverage: PlaybookCoverageSummary | null;
  breakdown: ScoreBreakdown;
} {
  const severityWeights: Record<string, number> = {
    critical: 12,
    high: 7,
    medium: 4,
    low: 2,
    info: 1,
  };

  const issuesBySeverity: Record<string, number> = {};
  report.issuesToAddress.forEach((issue) => {
    const severity = issue.severity?.toLowerCase() ?? "medium";
    issuesBySeverity[severity] = (issuesBySeverity[severity] ?? 0) + 1;
  });
  const issuePenaltyRaw = Object.entries(issuesBySeverity).reduce(
    (sum, [severity, count]) => {
      const weight = severityWeights[severity] ?? 4;
      const scaled = weight * Math.log2(1 + count);
      return sum + scaled;
    },
    0,
  );
  const issuePenalty = Math.min(60, Math.round(issuePenaltyRaw));
  const criteriaPenalty = 0;

  let coveragePenalty = 0;
  let coverage: PlaybookCoverageSummary | null = null;
  if (playbook) {
    coverage = evaluatePlaybookCoverageFromContent(playbook, {
      content: coverageContext?.content ?? "",
      clauses: coverageContext?.clauses ?? [],
    });
    coveragePenalty = Math.round((1 - coverage.coverageScore) * 25);
  }

  const rawScore = 100 - issuePenalty - criteriaPenalty - coveragePenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    coverage,
    breakdown: {
      issuePenalty,
      criteriaPenalty,
      coveragePenalty,
      issuesBySeverity,
    },
  };
}

function buildEnhancementPrompt(
  context: ReasoningContext,
  report: AnalysisReport,
) {
  const summaryLines = [
    `Contract: ${report.contractSummary.contractName}`,
    `Score: ${report.generalInformation.complianceScore}`,
    `Perspective: ${report.generalInformation.selectedPerspective}`,
    `Governing law: ${report.contractSummary.governingLaw}`,
  ];

  const issueLines = report.issuesToAddress.slice(0, 2).map((issue, index) => {
    const clause =
      issue.clauseReference?.heading ||
      issue.clauseReference?.excerpt ||
      "Unspecified clause";
    return `${index + 1}. ${issue.title} | Severity: ${issue.severity} | Clause: ${clause} | Recommendation: ${issue.recommendation}`;
  });

  const clauseLines = report.clauseFindings.slice(0, 2).map((clause, index) =>
    `${index + 1}. ${clause.title} | Risk: ${clause.riskLevel} | Summary: ${clause.summary}`,
  );

  const contractContent = context.content;

  return [
    summaryLines.join("\n"),
    issueLines.length
      ? `Top issues:\n${issueLines.join("\n")}`
      : "Top issues: none provided.",
    clauseLines.length
      ? `Clause findings:\n${clauseLines.join("\n")}`
      : "Clause findings: none provided.",
    "Contract content (full):",
    contractContent,
    "Return JSON with keys: playbookInsights, clauseExtractions, similarityAnalysis, deviationInsights, actionItems, draftMetadata. Include every relevant entry you can support with evidence. For any section lacking strong evidence, return an empty array. Keep every narrative string under 140 characters.",
  ].join("\n\n");
}

async function generateEnhancementSections(
  context: ReasoningContext,
  report: AnalysisReport,
  model: string,
) {
  const prompt = buildEnhancementPrompt(context, report);
  const response = await fetch(OPENAI_RESPONSES_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: buildResponsesInput(
        "You are Maigon Counsel enhancements engine. Produce concise supplemental legal sections for a legal compliance review for legal contracts.",
        prompt,
      ),
      text: {
        format: enhancementsJsonSchema,
      },
      max_output_tokens: MAX_ENHANCEMENT_OUTPUT_TOKENS,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Enhancement generation failed (${model}): ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  const payload = await response.json();
  const content = extractResponsesContent(payload);
  const parsed = JSON.parse(content);
  const sections = normaliseEnhancementSections(parsed);
  return { sections, raw: payload };
}

function buildEnhancementFallback(
  report: AnalysisReport,
  reason?: unknown,
): EnhancementSections {
  const playbookFallback =
    report.issuesToAddress.slice(0, 2).map((issue, index) => ({
      id: issue.id ?? `fallback-playbook-${index + 1}`,
      title: issue.title,
      summary: issue.rationale,
      severity: normaliseSeverityValue(issue.severity),
      status: "attention" as const,
      recommendation: issue.recommendation,
      guidance: issue.tags?.slice(0, 2) ?? [],
      relatedClauseIds: issue.clauseReference?.heading
        ? [issue.clauseReference.heading]
        : [],
    })) as EnhancementSections["playbookInsights"];

  const clauseFallback =
    report.clauseFindings.slice(0, 2).map((clause, index) => ({
      id: clause.clauseId ?? `fallback-clause-${index + 1}`,
      clauseId: clause.clauseId ?? `fallback-clause-${index + 1}`,
      title: clause.title,
      category: clause.riskLevel,
      originalText: clause.summary,
      normalizedText: clause.recommendation,
      importance: normaliseSeverityValue(clause.riskLevel),
      location: null,
      references: [],
    })) as EnhancementSections["clauseExtractions"];

  const actionFallback =
    report.proposedEdits.slice(0, 2).map((edit, index) => ({
      id: edit.id ?? `fallback-action-${index + 1}`,
      title: edit.intent ?? `Update clause ${edit.clauseId ?? index + 1}`,
      description: edit.rationale ?? edit.proposedText,
      owner: "Legal",
      department: "legal",
      dueDate: "Before execution",
      priority: "high" as const,
      status: "open" as const,
      relatedClauseId: edit.clauseId ?? undefined,
    })) as EnhancementSections["actionItems"];

  return {
    playbookInsights: playbookFallback,
    clauseExtractions: clauseFallback,
    similarityAnalysis: [] as EnhancementSections["similarityAnalysis"],
    deviationInsights: playbookFallback.map((item, index) => ({
      id: `fallback-deviation-${index + 1}`,
      title: item.title,
      deviationType: "contract_comparison",
      severity: normaliseSeverityValue(item.severity),
      description: item.summary ?? "Playbook deviation noted.",
      expectedStandard: item.guidance?.[0] ?? "Follow playbook requirement.",
      observedLanguage: item.summary ?? "Not provided.",
      recommendation: item.recommendation ?? "Review clause with legal counsel.",
      clauseId: item.relatedClauseIds?.[0] ?? undefined,
      status: "open" as const,
    })) as EnhancementSections["deviationInsights"],
    actionItems: actionFallback,
    draftMetadata: report.draftMetadata ?? createDefaultDraftMetadata(),
  };
}

function mergeEnhancements(
  report: AnalysisReport,
  enhancements: EnhancementSections,
  options: { source: "ai" | "fallback"; reason?: string },
) {
  const metadata = report.metadata
    ? { ...report.metadata }
    : undefined;

  if (metadata) {
    const notes = Array.isArray(metadata.critiqueNotes)
      ? [...metadata.critiqueNotes]
      : [];
    if (options.source === "fallback" && options.reason) {
      notes.push(`Enhancements fallback: ${options.reason}`);
    } else if (options.source === "ai") {
      notes.push("Enhancements generated via GPT-5.");
    }
    metadata.critiqueNotes = notes;
  }

  return {
    ...report,
    playbookInsights: enhancements.playbookInsights ?? report.playbookInsights ?? [],
    clauseExtractions:
      enhancements.clauseExtractions ?? report.clauseExtractions ?? [],
    similarityAnalysis:
      enhancements.similarityAnalysis ?? report.similarityAnalysis ?? [],
    deviationInsights:
      enhancements.deviationInsights ?? report.deviationInsights ?? [],
    actionItems: enhancements.actionItems ?? report.actionItems ?? [],
    draftMetadata:
      enhancements.draftMetadata ?? report.draftMetadata ?? createDefaultDraftMetadata(),
    metadata,
  };
}

function normaliseEnhancementSections(payload: unknown): EnhancementSections {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const playbookInsights = coerceArray(
    data.playbookInsights,
    (item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id = coerceString(record.id, `enhancement-playbook-${index + 1}`);
      const title = coerceString(record.title, "Playbook insight");
      const summary = coerceString(record.summary, "Insight summary unavailable.");
      const severity = normaliseSeverityValue(
        typeof record.severity === "string" ? record.severity : "medium",
      );
      const status = coercePlaybookStatus(
        typeof record.status === "string" ? record.status : null,
      );
      const recommendation = record.recommendation
        ? coerceString(record.recommendation, "Review with counsel.")
        : "Review with counsel.";
      const guidance = Array.isArray(record.guidance)
        ? record.guidance
            .filter((entry): entry is string => typeof entry === "string")
            .slice(0, 4)
        : [];
      const relatedIds = Array.isArray(record.relatedClauseIds)
        ? record.relatedClauseIds
            .filter((entry): entry is string => typeof entry === "string")
            .slice(0, 4)
        : [];
      return {
        id,
        title,
        summary,
        severity,
        status,
        recommendation,
        guidance,
        relatedClauseIds: relatedIds,
      };
    },
  );

  const clauseExtractions = coerceArray(
    data.clauseExtractions,
    (item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = coerceString(record.title, "Clause insight");
      const originalText = coerceString(
        record.originalText,
        "Clause text unavailable.",
      );
      return {
        id: coerceString(record.id, `enhancement-clause-${index + 1}`),
        clauseId: typeof record.clauseId === "string"
          ? record.clauseId
          : `enhancement-clause-${index + 1}`,
        title,
        category:
          typeof record.category === "string" ? record.category : "general",
        originalText,
        normalizedText: coerceString(
          record.normalizedText,
          coerceString(record.recommendation, originalText),
        ),
        importance: normaliseSeverityValue(
          typeof record.importance === "string"
            ? record.importance
            : "medium",
        ),
        location:
          typeof record.location === "object" && record.location !== null
            ? {
                page:
                  typeof (record.location as Record<string, unknown>).page ===
                    "number"
                    ? (record.location as Record<string, number>).page
                    : null,
                paragraph:
                  typeof (record.location as Record<string, unknown>)
                      .paragraph === "number"
                    ? (record.location as Record<string, number>).paragraph
                    : null,
                section:
                  typeof (record.location as Record<string, unknown>).section ===
                      "string"
                    ? (record.location as Record<string, string>).section
                    : null,
                clauseNumber:
                  typeof (record.location as Record<string, unknown>)
                      .clauseNumber === "string"
                    ? (record.location as Record<string, string>).clauseNumber
                    : null,
              }
            : null,
        references: Array.isArray(record.references)
          ? record.references
              .filter((entry): entry is string => typeof entry === "string")
              .slice(0, 4)
          : [],
      };
    },
  );

  const similarityAnalysis = coerceArray(
    data.similarityAnalysis,
    (item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        id: coerceString(record.id, `enhancement-similarity-${index + 1}`),
        referenceId:
          typeof record.referenceId === "string" ? record.referenceId : undefined,
        sourceTitle: coerceString(
          record.sourceTitle,
          "Comparable agreement",
        ),
        similarityScore:
          typeof record.similarityScore === "number"
            ? Math.min(1, Math.max(0, record.similarityScore))
            : 0.7,
        excerpt: record.excerpt
          ? coerceString(record.excerpt, "")
          : undefined,
        rationale: record.rationale
          ? coerceString(record.rationale, "")
          : undefined,
        tags: Array.isArray(record.tags)
          ? record.tags
              .filter((entry): entry is string => typeof entry === "string")
              .slice(0, 4)
          : [],
      };
    },
  );

  const deviationInsights = coerceArray(
    data.deviationInsights,
    (item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        id: coerceString(record.id, `enhancement-deviation-${index + 1}`),
        title: coerceString(record.title, "Deviation insight"),
        deviationType:
          typeof record.deviationType === "string"
            ? record.deviationType
            : "contract_comparison",
        severity: normaliseSeverityValue(
          typeof record.severity === "string" ? record.severity : "medium",
        ),
        description: coerceString(
          record.description,
          "Deviation description unavailable.",
        ),
        expectedStandard: record.expectedStandard
          ? coerceString(record.expectedStandard, "")
          : undefined,
        observedLanguage: record.observedLanguage
          ? coerceString(record.observedLanguage, "")
          : undefined,
        recommendation: coerceString(
          record.recommendation,
          "Escalate with counsel.",
        ),
        clauseId:
          typeof record.clauseId === "string" ? record.clauseId : undefined,
        status: normaliseWorkflowStatus(
          typeof record.status === "string" ? record.status : null,
        ),
      };
    },
  );

  const actionItems = coerceArray(
    data.actionItems,
    (item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        id: coerceString(record.id, `enhancement-action-${index + 1}`),
        title: coerceString(record.title, "Remediation action"),
        description: coerceString(
          record.description,
          "Action description unavailable.",
        ),
        owner:
          typeof record.owner === "string" ? record.owner : "Legal",
        department:
          typeof record.department === "string"
            ? record.department
            : "legal",
        dueDate:
          typeof record.dueDate === "string" ? record.dueDate : "Before execution",
        priority: normalisePriorityValue(
          typeof record.priority === "string" ? record.priority : null,
        ),
        status: normaliseWorkflowStatus(
          typeof record.status === "string" ? record.status : null,
        ),
        relatedClauseId:
          typeof record.relatedClauseId === "string"
            ? record.relatedClauseId
            : undefined,
      };
    },
  );

  const draftMetadata = normaliseDraftMetadataPayload(data.draftMetadata);

  return {
    playbookInsights,
    clauseExtractions,
    similarityAnalysis,
    deviationInsights,
    actionItems,
    draftMetadata,
  };
}

function coerceArray<T>(
  value: unknown,
  mapper: (value: unknown, index: number) => T | null,
  limit = 50,
): T[] {
  if (!Array.isArray(value)) return [];
  const results: T[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const mapped = mapper(value[i], i);
    if (mapped) {
      results.push(mapped);
    }
    if (results.length >= limit) {
      break;
    }
  }
  return results;
}

function coerceString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function coercePlaybookStatus(
  value: string | null,
): "met" | "missing" | "attention" {
  const allowed = ["met", "missing", "attention"];
  const lower = value ? value.toLowerCase() : "";
  return allowed.includes(lower as "met" | "missing" | "attention")
    ? (lower as "met" | "missing" | "attention")
    : "attention";
}

function normaliseDraftMetadataPayload(
  value: unknown,
): NonNullable<AnalysisReport["draftMetadata"]> {
  if (!value || typeof value !== "object") {
    return createDefaultDraftMetadata();
  }
  const record = value as Record<string, unknown>;
  return {
    sourceDocumentId:
      typeof record.sourceDocumentId === "string"
        ? record.sourceDocumentId
        : null,
    baseVersionLabel:
      typeof record.baseVersionLabel === "string"
        ? record.baseVersionLabel
        : null,
    htmlSource:
      typeof record.htmlSource === "string" ? record.htmlSource : null,
    previewAvailable:
      typeof record.previewAvailable === "boolean"
        ? record.previewAvailable
        : false,
    selectedEditIds: Array.isArray(record.selectedEditIds)
      ? record.selectedEditIds.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    previousHtml:
      typeof record.previousHtml === "string" ? record.previousHtml : null,
    updatedHtml:
      typeof record.updatedHtml === "string" ? record.updatedHtml : null,
    diffHtml:
      typeof record.diffHtml === "string" ? record.diffHtml : null,
    lastUpdated:
      typeof record.lastUpdated === "string" ? record.lastUpdated : null,
  };
}

export async function runReasoningAnalysis(
  context: ReasoningContext,
): Promise<ReasoningResult> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const tier = FORCED_MODEL_TIER ?? context.modelTier ?? DEFAULT_MODEL_TIER;
  const model = resolveModelId(tier);
  const normalizedSolutionKey =
    (context.selectedSolution?.key ?? context.selectedSolution?.id ?? "")
      .toString()
      .toLowerCase();
  const playbookKey = normaliseSolutionKey(
    normalizedSolutionKey || context.classification?.contractType,
    context.classification?.contractType,
  );
  const playbook = resolvePlaybook(playbookKey);
  const matchesKnownPlaybook = Object.values(CONTRACT_PLAYBOOKS).some(
    (candidate) =>
      candidate.key === normalizedSolutionKey ||
      candidate.displayName.toLowerCase() === normalizedSolutionKey ||
      candidate.key === playbookKey,
  );
  const hasCustomSolution = Boolean(
    context.selectedSolution?.id && !matchesKnownPlaybook,
  );
  const usePlaybookCoverage = !hasCustomSolution;

  const responsesSupported = shouldUseResponsesApi(model);
  if (!responsesSupported) {
    throw new Error("Selected model does not support structured responses API.");
  }

  const buildPrompts = (mode: "full" | "compact" | "ultra") => {
    const compact = mode !== "full";
    const systemPrompt = buildSystemPrompt(
      playbook.displayName,
      context.reviewType,
      { compact },
    );
    const userPrompt = `${buildUserPrompt(context, playbook, {
      compact,
      maxChars: mode === "ultra" ? 2200 : mode === "compact" ? 3500 : 6000,
    })}\n\n${buildJsonSchemaDescription({ mode })}`;
    return { systemPrompt, userPrompt };
  };

  const buildRequestPayload = (
    systemPrompt: string,
    promptText: string,
    format:
      | typeof jsonSchemaFormat
      | typeof jsonSchemaFormatCompact
      | typeof jsonSchemaFormatUltra,
    options?: { effort?: "low" | "medium" | "high"; maxTokens?: number | null },
  ) => ({
    model,
    reasoning: {
      effort: options?.effort ?? "medium",
    },
    input: buildResponsesInput(systemPrompt, promptText),
    text: {
      format,
    },
    max_output_tokens: options?.maxTokens ?? MAX_OUTPUT_TOKENS ?? undefined,
  });

  let lastError: unknown = null;
  let corePayload: unknown = null;
  let coreReport: AnalysisReport | null = null;

  const isTightTimeout = REQUEST_TIMEOUT_MS <= 45000;
  const maxAttempts = 3;
  let mode: "full" | "compact" | "ultra" = isTightTimeout ? "compact" : "full";

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const isLastAttempt = attemptIndex === maxAttempts - 1;
    const { systemPrompt, userPrompt } = buildPrompts(mode);
    const compactMaxTokens =
      MAX_OUTPUT_TOKENS !== null && MAX_OUTPUT_TOKENS !== undefined
        ? Math.min(MAX_OUTPUT_TOKENS, 6000)
        : 6000;
    const ultraMaxTokens =
      MAX_OUTPUT_TOKENS !== null && MAX_OUTPUT_TOKENS !== undefined
        ? Math.min(MAX_OUTPUT_TOKENS, 3000)
        : 3000;
    const format =
      mode === "ultra"
        ? jsonSchemaFormatUltra
        : mode === "compact"
          ? jsonSchemaFormatCompact
          : jsonSchemaFormat;
    const effort =
      mode === "full" ? "medium" : "low";
    const maxTokens =
      mode === "ultra"
        ? ultraMaxTokens
        : mode === "compact"
          ? compactMaxTokens
          : MAX_OUTPUT_TOKENS ?? undefined;
    const requestPayload = buildRequestPayload(
      systemPrompt,
      userPrompt,
      format,
      {
        effort,
        maxTokens,
      },
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(OPENAI_RESPONSES_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error;
      if (isAbortError(error) && !isLastAttempt && mode !== "ultra") {
        console.warn(
          "⚠️ Reasoning request aborted; retrying with smaller prompt",
          { model, mode },
        );
        mode = mode === "full" ? "compact" : "ultra";
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI reasoning error (${model}): ${response.status} ${response.statusText} ${errorBody}`,
      );
    }

    const payload = await response.json();
    if (payload?.status && payload.status !== "completed") {
      const detailsCandidate =
        payload?.status_details ?? payload?.incomplete_details ?? payload?.last_error;
      const detail =
        typeof detailsCandidate === "object"
          ? JSON.stringify(detailsCandidate)
          : detailsCandidate ?? "";
      const reason =
        typeof detailsCandidate === "object" &&
        typeof (detailsCandidate as Record<string, unknown>).reason === "string"
          ? (detailsCandidate as Record<string, string>).reason
          : undefined;
      console.error("⚠️ Responses API returned non-completed status", {
        status: payload.status,
        details: detailsCandidate ?? null,
        reason: reason ?? null,
      });
      if (reason === "max_output_tokens" && !isLastAttempt && mode !== "ultra") {
        lastError = new ReasoningIncompleteError(
          `OpenAI response incomplete: ${payload.status}${
            detail ? ` ${detail}` : ""
          }`,
          reason,
        );
        console.warn(
          "⚠️ Retrying reasoning with compact schema due to max_output_tokens",
          { model, mode },
        );
        mode = mode === "full" ? "compact" : "ultra";
        continue;
      }
      throw new ReasoningIncompleteError(
        `OpenAI response incomplete: ${payload.status}${
          detail ? ` ${detail}` : ""
        }`,
        reason,
      );
    }

    try {
      const content = extractResponsesContent(payload);
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        applyOptionalSectionDefaults(parsed as Record<string, unknown>);
      }
      const report = validateAnalysisReport(parsed);
      report.generalInformation.reportExpiry = normaliseReportExpiry(
        report.generalInformation.reportExpiry,
      );
      const tokenUsage = normaliseTokenUsage(payload, true);
      const { notes: critiqueNotes, coverage, diagnostics } = runHeuristicCritique(
        report,
        playbookKey,
        {
          content: context.content,
          clauses: context.clauseExtractions ?? null,
        },
      );
      const enrichedReport: AnalysisReport = {
        ...report,
        metadata: {
          ...report.metadata,
          model,
          modelCategory: tier,
          playbookKey,
          classification: {
            contractType:
              context.classification?.contractType ??
              report.metadata?.classification?.contractType,
            confidence:
              context.classification?.confidence ??
              report.metadata?.classification?.confidence,
          },
          tokenUsage: tokenUsage ?? report.metadata?.tokenUsage,
          critiqueNotes,
          playbookCoverage: coverage ?? report.metadata?.playbookCoverage,
          playbookCoverageContent: diagnostics.content ?? undefined,
          playbookCoverageModel: diagnostics.model ?? undefined,
        },
      };
      coreReport = enrichedReport;
      corePayload = payload;
      break;
    } catch (error) {
      lastError = error;
      if (error instanceof ReasoningIncompleteError && !isLastAttempt && mode !== "ultra") {
        mode = mode === "full" ? "compact" : "ultra";
        continue;
      }
      throw error;
    }
  }

  if (!coreReport) {
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error("Failed to generate core analysis report.");
  }

  const baseReport = coreReport;
  let enhancementSections: EnhancementSections | null = null;
  let enhancementRaw: unknown = null;
  let enhancementSource: "ai" | "fallback" = "fallback";
  let enhancementReason: string | undefined;

  try {
    if (SKIP_ENHANCEMENTS) {
      enhancementSections = buildEnhancementFallback(baseReport);
      enhancementSource = "fallback";
    } else {
      const enhancementResult = await generateEnhancementSections(
        context,
        baseReport,
        baseReport.metadata?.model ?? model,
      );
      enhancementSections = enhancementResult.sections;
      enhancementRaw = enhancementResult.raw;
      enhancementSource = "ai";
    }
  } catch (error) {
    enhancementReason =
      error instanceof Error ? error.message : String(error);
    enhancementSections = buildEnhancementFallback(baseReport);
  }

  const appliedEnhancements =
    enhancementSections ?? buildEnhancementFallback(baseReport);

  const finalReport = mergeEnhancements(baseReport, appliedEnhancements, {
    source: enhancementSource,
    reason: enhancementReason,
  });
  const clauseAlignedReport = enhanceReportWithClauses(finalReport, {
    clauses: context.clauseExtractions ?? null,
    content: context.content,
    playbook,
  });
  const boundEdits = bindProposedEditsToClauses({
    proposedEdits: clauseAlignedReport.proposedEdits,
    issues: clauseAlignedReport.issuesToAddress,
    clauses:
      context.clauseExtractions ??
      clauseAlignedReport.clauseExtractions ??
      [],
  });
  const clauseAlignedReportWithEdits: AnalysisReport = {
    ...clauseAlignedReport,
    proposedEdits: boundEdits,
  };
  const dedupedReport: AnalysisReport = {
    ...clauseAlignedReportWithEdits,
    issuesToAddress: dedupeIssues(clauseAlignedReportWithEdits.issuesToAddress),
    proposedEdits: dedupeProposedEdits(clauseAlignedReportWithEdits.proposedEdits),
  };

  const scoringResult = computeRuleBasedScore(
    dedupedReport,
    usePlaybookCoverage ? playbook : null,
    {
      content: context.content,
      clauses:
        context.clauseExtractions ?? clauseAlignedReport.clauseExtractions,
    },
  );
  const scoredReport: AnalysisReport = {
    ...dedupedReport,
    generalInformation: {
      ...dedupedReport.generalInformation,
      complianceScore: scoringResult.score,
    },
    metadata: {
      ...dedupedReport.metadata,
      playbookCoverage:
        scoringResult.coverage ??
        dedupedReport.metadata?.playbookCoverage,
      scoreSource: "rule_based",
      scoreBreakdown: scoringResult.breakdown,
    } as AnalysisReport["metadata"],
  };

  return {
    report: scoredReport,
    raw: {
      stageOne: corePayload,
      stageTwo: enhancementRaw,
    },
    model,
    tier,
  };
}
