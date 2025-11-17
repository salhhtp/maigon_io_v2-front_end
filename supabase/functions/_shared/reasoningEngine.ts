import { resolvePlaybook, type PlaybookKey } from "./playbooks.ts";
import {
  validateAnalysisReport,
  type AnalysisReport,
} from "./reviewSchema.ts";
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
  required: ["heading", "locationHint", "excerpt"],
  properties: {
    heading: shortText(120),
    locationHint: locationHintSchema,
    excerpt: shortText(180),
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
        maxItems: 2,
        items: playbookInsightItemSchema,
      },
      clauseExtractions: {
        type: "array",
        maxItems: 2,
        items: clauseExtractionItemSchema,
      },
      similarityAnalysis: {
        type: "array",
        maxItems: 2,
        items: similarityItemSchema,
      },
      deviationInsights: {
        type: "array",
        maxItems: 2,
        items: deviationInsightItemSchema,
      },
      actionItems: {
        type: "array",
        maxItems: 2,
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
      "clauseFindings",
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
        maxItems: 3,
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
        maxItems: 3,
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
      clauseFindings: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "clauseId",
            "title",
            "summary",
            "excerpt",
            "riskLevel",
            "recommendation",
          ],
          properties: {
            clauseId: { type: "string" },
            title: shortText(160),
            summary: shortText(220),
            excerpt: shortText(200),
            riskLevel: { type: "string", enum: severityEnum },
            recommendation: shortText(220),
          },
        },
      },
      proposedEdits: {
        type: "array",
        maxItems: 2,
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
            "previousText",
            "updatedText",
            "previewHtml",
            "applyByDefault",
          ],
          properties: {
            id: { type: "string" },
            clauseId: { type: "string" },
            anchorText: shortText(160),
            proposedText: shortText(220),
            intent: shortText(200),
            rationale: shortText(200),
            previousText: shortText(180),
            updatedText: shortText(180),
            previewHtml: previewHtmlSchema,
            applyByDefault: { type: "boolean" },
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
const DEFAULT_MAX_OUTPUT_TOKENS = 4000;
const MAX_ENHANCEMENT_OUTPUT_TOKENS = 1400;
const MAX_OUTPUT_TOKENS_ENV = Deno.env.get("OPENAI_REASONING_MAX_OUTPUT_TOKENS");
const parsedMaxOutput =
  MAX_OUTPUT_TOKENS_ENV === undefined
    ? DEFAULT_MAX_OUTPUT_TOKENS
    : Number(MAX_OUTPUT_TOKENS_ENV);
const MAX_OUTPUT_TOKENS =
  Number.isFinite(parsedMaxOutput) && parsedMaxOutput > 0
    ? parsedMaxOutput
    : null;

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

function truncateContent(content: string, maxTokens = 3000) {
  if (content.length <= maxTokens) {
    return content;
  }

  const head = content.slice(0, Math.floor(maxTokens * 0.7));
  const tail = content.slice(-Math.floor(maxTokens * 0.2));
  return `${head}\n\n--- CONTRACT CONTENT TRUNCATED ---\n\n${tail}`;
}

function buildSystemPrompt(playbookTitle: string, reviewType: string) {
  return [
    `You are Maigon Counsel, a senior technology contracts attorney tasked with generating a ${reviewType} review.`,
    "Think through each clause carefully before producing structured output.",
    "Use legal reasoning, cite regulatory frameworks, and flag negotiation levers.",
    `Apply the playbook for ${playbookTitle}.`,
    "Always respond with JSON that matches the requested schema.",
  ].join(" ");
}

function buildUserPrompt(
  context: ReasoningContext,
  playbook: ReturnType<typeof resolvePlaybook>,
) {
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

  const playbookSection = [
    `Playbook summary: ${playbook.description}`,
    `Regulatory focus: ${playbook.regulatoryFocus.join(", ")}`,
    `Critical clauses:`,
    ...playbook.criticalClauses.map(
      (clause, index) =>
        `${index + 1}. ${clause.title} | Must include: ${clause.mustInclude.join(", ")} | Red flags: ${clause.redFlags.join(", ")}`,
    ),
    `Negotiation guidance: ${playbook.negotiationGuidance.join("; ")}`,
  ].join("\n");

  return `${metadataSections}\n\n${playbookSection}\n\nContract excerpt:\n${truncateContent(context.content)}`;
}

function buildJsonSchemaDescription() {
  return `Return JSON with ONLY the following sections. Optional sections may be omitted entirely if token budget is tight and Maigon will synthesize them:
- version: "v3"
- generatedAt: ISO timestamp
- generalInformation: { complianceScore (0-100), selectedPerspective, reviewTimeSeconds, timeSavingsMinutes, reportExpiry }
- contractSummary: { contractName, filename, parties[], agreementDirection, purpose, verbalInformationCovered, contractPeriod, governingLaw, jurisdiction }
- issuesToAddress: 1-3 issues each with id, title, severity, recommendation, rationale (omit lengthy excerpts)
- clauseFindings: 1-3 clause summaries with clauseId, title, summary, riskLevel, recommendation
- optional fields you MAY include when concise: criteriaMet, proposedEdits, metadata, playbookInsights, clauseExtractions, similarityAnalysis, deviationInsights, actionItems, draftMetadata (set to [] if omitted)
- Keep every narrative string under 150 characters—focus on signal, omit fluff, prefer sentence fragments.
- Limit arrays to the highest priority content (issues ≤3, clauseFindings ≤3, optional arrays ≤2 items, proposedEdits ≤2).
- If a value is unknown, set it to a descriptive default like "Not specified", 0, false, or [] but never emit null unless specified.`;
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

  const output = payload.output;
  if (Array.isArray(output)) {
    for (const entry of output) {
      if (Array.isArray(entry?.content)) {
        for (const part of entry.content) {
          if (typeof part?.text === "string" && part.text.trim().length > 0) {
            return part.text;
          }
          if (
            typeof part?.content === "string" &&
            part.content.trim().length > 0
          ) {
            return part.content;
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

  if (Array.isArray(payload?.output_text) && payload.output_text[0]) {
    return payload.output_text[0];
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
) {
  const notes: string[] = [];
  if (report.issuesToAddress.length === 0) {
    notes.push("No issues returned; ensure clauses were evaluated.");
  }
  if (report.clauseFindings.length < 2) {
    notes.push("Clause findings sparse; add at least two clause-level insights.");
  }
  if (
    playbookKey === "data_processing_agreement" &&
    !report.issuesToAddress.some((issue) =>
      issue.title.toLowerCase().includes("security"),
    )
  ) {
    notes.push("DPA reviews must address security or breach handling.");
  }
  return notes;
}

function applyOptionalSectionDefaults(payload: Record<string, unknown>) {
  const ensureArray = (key: string) => {
    if (!Array.isArray(payload[key])) {
      payload[key] = [];
    }
  };
  ensureArray("playbookInsights");
  ensureArray("clauseExtractions");
  ensureArray("similarityAnalysis");
  ensureArray("deviationInsights");
  ensureArray("actionItems");

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

  const truncatedContract = truncateContent(context.content, 1200);

  return [
    summaryLines.join("\n"),
    issueLines.length
      ? `Top issues:\n${issueLines.join("\n")}`
      : "Top issues: none provided.",
    clauseLines.length
      ? `Clause findings:\n${clauseLines.join("\n")}`
      : "Clause findings: none provided.",
    "Contract snippet:",
    truncatedContract,
    "Return JSON with keys: playbookInsights, clauseExtractions, similarityAnalysis, deviationInsights, actionItems, draftMetadata. Each array must contain at most 2 entries. For any section lacking strong evidence, return an empty array. Keep every narrative string under 140 characters.",
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
        "You are Maigon Counsel enhancements engine. Produce concise supplemental sections for a contract review.",
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
  limit = 2,
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
  const playbookKey = normaliseSolutionKey(
    context.selectedSolution?.key ?? context.selectedSolution?.id,
    context.classification?.contractType,
  );
  const playbook = resolvePlaybook(playbookKey);

  const systemPrompt = buildSystemPrompt(playbook.displayName, context.reviewType);
  const userPrompt = `${buildUserPrompt(context, playbook)}\n\n${buildJsonSchemaDescription()}`;
  const responsesSupported = shouldUseResponsesApi(model);
  if (!responsesSupported) {
    throw new Error("Selected model does not support structured responses API.");
  }

  const buildRequestPayload = (
    limit: number | null,
    promptText: string,
  ) => ({
    model,
    reasoning: {
      effort: "medium",
    },
    input: buildResponsesInput(systemPrompt, promptText),
    text: {
      format: jsonSchemaFormat,
    },
    ...(limit ? { max_output_tokens: limit } : {}),
  });

  type AttemptConfig = {
    limit: number | null;
    compact: boolean;
  };
  const attemptConfigs: AttemptConfig[] = [];
  const baseLimit = MAX_OUTPUT_TOKENS ?? null;
  attemptConfigs.push({
    limit: baseLimit,
    compact: false,
  });
  attemptConfigs.push({
    limit: baseLimit,
    compact: true,
  });

  let lastError: unknown = null;
  let corePayload: unknown = null;
  let coreReport: AnalysisReport | null = null;

  for (let attemptIndex = 0; attemptIndex < attemptConfigs.length; attemptIndex += 1) {
    const { limit, compact } = attemptConfigs[attemptIndex];
    const isLastAttempt = attemptIndex === attemptConfigs.length - 1;
    const baselineHint =
      "\n\nOUTPUT BUDGET: Keep every narrative string under 150 characters. Arrays must respect the specified maximum counts and default to [] when signal is weak.";
    const compressionHint = compact
      ? "\n\nTOKEN BUDGET MODE: Return only the single most critical entry per array (issues, criteria, clauseFindings, proposedEdits, playbookInsights, clauseExtractions, similarityAnalysis, deviationInsights, actionItems). Omit optional metadata."
      : "";
    const attemptPrompt = `${userPrompt}${baselineHint}${compressionHint}`;
    const requestPayload = buildRequestPayload(limit, attemptPrompt);

    const response = await fetch(OPENAI_RESPONSES_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestPayload),
    });

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
      if (reason === "max_output_tokens" && !isLastAttempt) {
        lastError = new ReasoningIncompleteError(
          `OpenAI response incomplete: ${payload.status}${
            detail ? ` ${detail}` : ""
          }`,
          reason,
        );
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
      const tokenUsage = normaliseTokenUsage(payload, true);
      const critiqueNotes = runHeuristicCritique(report, playbookKey);
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
        },
      };
      coreReport = enrichedReport;
      corePayload = payload;
      break;
    } catch (error) {
      lastError = error;
      if (error instanceof ReasoningIncompleteError && !isLastAttempt) {
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
    const enhancementResult = await generateEnhancementSections(
      context,
      baseReport,
      baseReport.metadata?.model ?? model,
    );
    enhancementSections = enhancementResult.sections;
    enhancementRaw = enhancementResult.raw;
    enhancementSource = "ai";
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

  return {
    report: finalReport,
    raw: {
      stageOne: corePayload,
      stageTwo: enhancementRaw,
    },
    model,
    tier,
  };
}
