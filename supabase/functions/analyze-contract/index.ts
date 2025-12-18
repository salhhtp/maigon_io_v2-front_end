import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  validateExtractedText,
} from "../_shared/pdf-parser.ts";
import {
  generateFallbackAnalysis,
  type FallbackAnalysisContext,
} from "../_shared/fallback-analysis.ts";
import { runReasoningAnalysis } from "../_shared/reasoningEngine.ts";
import type { AnalysisReport, ClauseExtraction } from "../_shared/reviewSchema.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// Advanced AI Model configurations for sophisticated contract analysis
const AI_CONFIGS = {
  "openai-gpt-5": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-5",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
  "openai-gpt-5-pro": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-5-pro",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
  "openai-gpt-5-mini": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-5-mini",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
};

interface AnalysisRequest {
  content?: string;
  ingestionId?: string;
  reviewType: string;
  model: string;
  perspective?: string;
  perspectiveLabel?: string;
  customSolution?: any;
  contractType?: string;
  fileType?: string;
  fileName?: string;
  documentFormat?: string;
  filename?: string;
  classification?: {
    contractType: string;
    confidence: number;
    characteristics: string[];
    reasoning: string;
    suggestedSolutions: string[];
  };
  ingestionWarnings?: unknown;
  selectedSolution?: {
    id?: string;
    key?: string;
    title?: string;
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractIngestionRecord {
  id: string;
  status: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string;
  mime_type?: string;
  file_size?: number;
  strategy?: string;
  word_count?: number;
  character_count?: number;
  page_count?: number;
  warnings?: unknown;
  needs_ocr: boolean;
  extracted_text?: string;
  extracted_html?: string;
  metadata?: Record<string, unknown> | null;
}

type ClauseDigestSummary = {
  summary: string;
  total: number;
  categoryCounts?: Record<string, number>;
};

type AnalysisSeedMetadata = {
  contentHash: string;
  clauseDigest?: ClauseDigestSummary;
  anchorSummary?: string;
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

function readCachedClauseDigest(
  ingestionRecord: ContractIngestionRecord | null,
  contentHash: string,
): ClauseDigestSummary | null {
  const metadata = ingestionRecord?.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const seed = (metadata as Record<string, unknown>).analysisSeed;
  if (!seed || typeof seed !== "object") return null;
  const record = seed as AnalysisSeedMetadata;
  if (!record.contentHash || record.contentHash !== contentHash) return null;
  if (
    record.clauseDigest &&
    typeof record.clauseDigest.summary === "string" &&
    typeof record.clauseDigest.total === "number"
  ) {
    return record.clauseDigest;
  }
  return null;
}

function readCachedAnchorSummary(
  ingestionRecord: ContractIngestionRecord | null,
  contentHash: string,
): string | null {
  const metadata = ingestionRecord?.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const seed = (metadata as Record<string, unknown>).analysisSeed;
  if (!seed || typeof seed !== "object") return null;
  const record = seed as AnalysisSeedMetadata;
  if (!record.contentHash || record.contentHash !== contentHash) return null;
  if (record.anchorSummary && typeof record.anchorSummary === "string") {
    return record.anchorSummary;
  }
  return null;
}

async function persistClauseDigestIfMissing(
  ingestionRecord: ContractIngestionRecord,
  clauseDigest: ClauseDigestSummary,
  contentHash: string,
) {
  const existing = readCachedClauseDigest(ingestionRecord, contentHash);
  if (existing) return;
  try {
    const supabase = getSupabaseAdminClient();
    const currentMetadata = ingestionRecord.metadata ?? {};
    const nextMetadata = {
      ...currentMetadata,
      analysisSeed: {
        ...(currentMetadata as Record<string, unknown>).analysisSeed,
        contentHash,
        clauseDigest,
      },
    };
    const { error } = await supabase
      .from("contract_ingestions")
      .update({ metadata: nextMetadata })
      .eq("id", ingestionRecord.id);
    if (error) throw error;
    ingestionRecord.metadata = nextMetadata;
  } catch (error) {
    console.warn("⚠️ Unable to persist clause digest", {
      ingestionId: ingestionRecord.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function persistAnchorSummaryIfMissing(
  ingestionRecord: ContractIngestionRecord,
  anchorSummary: string,
  contentHash: string,
) {
  const existing = readCachedAnchorSummary(ingestionRecord, contentHash);
  if (existing) return;
  try {
    const supabase = getSupabaseAdminClient();
    const currentMetadata = ingestionRecord.metadata ?? {};
    const nextMetadata = {
      ...currentMetadata,
      analysisSeed: {
        ...(currentMetadata as Record<string, unknown>).analysisSeed,
        contentHash,
        anchorSummary,
      },
    };
    const { error } = await supabase
      .from("contract_ingestions")
      .update({ metadata: nextMetadata })
      .eq("id", ingestionRecord.id);
    if (error) throw error;
    ingestionRecord.metadata = nextMetadata;
  } catch (error) {
    console.warn("⚠️ Unable to persist anchor summary", {
      ingestionId: ingestionRecord.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildAnchorSummary({
  extractedText,
  clauseDigest,
  wordCount,
}: {
  extractedText: string;
  clauseDigest?: ClauseDigestSummary | null;
  wordCount: number;
}): string {
  const parts: string[] = [];
  if (clauseDigest?.total) {
    parts.push(
      `Clause digest (${clauseDigest.total} segments): ${clauseDigest.summary}`,
    );
  }
  parts.push(`Document stats: words ${wordCount}, chars ${extractedText.length}`);
  const cleaned = extractedText.replace(/\s+/g, " ").trim();
  if (cleaned) {
    parts.push(`Intro excerpt: ${cleaned.slice(0, 900)}`);
  }
  const summary = parts.join("\n\n");
  return summary.length > 2000 ? summary.slice(0, 2000) : summary;
}

const CONTRACT_PATTERNS: Record<string, RegExp[]> = {
  nda: [
    /non[-\s]?disclosure agreement/i,
    /confidential information/i,
    /disclosing party/i,
  ],
  dpa: [/data processing agreement/i, /processor/i, /controller/i, /gdpr/i],
  eula: [/end[-\s]?user license/i, /software license/i, /licensor/i],
  ppc: [/purchase and sale contract/i, /purchase price/i, /buyer/i, /seller/i],
  rda: [
    /research and development/i,
    /collaboration/i,
    /intellectual property rights/i,
  ],
  ca: [/consulting agreement/i, /services? provider/i, /consultant/i],
  psa: [
    /professional services agreement/i,
    /statement of work/i,
    /service levels?/i,
  ],
};

function buildPerspectiveContext(request: AnalysisRequest): string {
  const perspective = (request.perspective || "").toLowerCase().trim();
  const perspectiveLabel = request.perspectiveLabel || request.perspective;
  if (!perspective && !perspectiveLabel) return "";

  const solutionKey =
    (request.selectedSolution?.key ||
      request.contractType ||
      request.selectedSolution?.title ||
      "")!
      .toString()
      .toLowerCase();

  const mapping: Record<
    string,
    Record<
      string,
      { primary: string; counterpart: string; guidance?: string }
    >
  > = {
    ppc: {
      "data-subject": {
        primary: "Data Subject",
        counterpart: "Organization",
        guidance:
          "Focus on individual privacy rights, transparency, and lawful basis.",
      },
      organization: {
        primary: "Organization",
        counterpart: "Data Subjects",
        guidance:
          "Emphasize compliance obligations, disclosures, and risk/liability posture.",
      },
    },
    privacy_policy_document: {
      "data-subject": {
        primary: "Data Subject",
        counterpart: "Organization",
        guidance:
          "Focus on individual privacy rights, transparency, and lawful basis.",
      },
      organization: {
        primary: "Organization",
        counterpart: "Data Subjects",
        guidance:
          "Emphasize compliance obligations, disclosures, and risk/liability posture.",
      },
    },
    dpa: {
      "data-controller": {
        primary: "Data Controller",
        counterpart: "Data Processor",
        guidance:
          "Ensure processor commitments, sub-processor controls, and data subject support meet controller standards.",
      },
      "data-processor": {
        primary: "Data Processor",
        counterpart: "Data Controller",
        guidance:
          "Assess scope of instructions, liability, audit exposure, and operational feasibility for the processor.",
      },
    },
    data_processing_agreement: {
      "data-controller": {
        primary: "Data Controller",
        counterpart: "Data Processor",
        guidance:
          "Ensure processor commitments, sub-processor controls, and data subject support meet controller standards.",
      },
      "data-processor": {
        primary: "Data Processor",
        counterpart: "Data Controller",
        guidance:
          "Assess scope of instructions, liability, audit exposure, and operational feasibility for the processor.",
      },
    },
    nda: {
      "disclosing-party": {
        primary: "Disclosing Party",
        counterpart: "Receiving Party",
        guidance:
          "Protect confidential information, limit use, and secure remedies.",
      },
      "receiving-party": {
        primary: "Receiving Party",
        counterpart: "Disclosing Party",
        guidance:
          "Ensure obligations are feasible, exclusions reasonable, and liability proportionate.",
      },
    },
    non_disclosure_agreement: {
      "disclosing-party": {
        primary: "Disclosing Party",
        counterpart: "Receiving Party",
        guidance:
          "Protect confidential information, limit use, and secure remedies.",
      },
      "receiving-party": {
        primary: "Receiving Party",
        counterpart: "Disclosing Party",
        guidance:
          "Ensure obligations are feasible, exclusions reasonable, and liability proportionate.",
      },
    },
    ca: {
      supplier: {
        primary: "Supplier",
        counterpart: "Client",
        guidance:
          "Check scope clarity, payment triggers, IP ownership, and liability caps.",
      },
      client: {
        primary: "Client",
        counterpart: "Supplier",
        guidance:
          "Validate deliverable quality, acceptance rights, and remedies for delays/defects.",
      },
    },
    consultancy_agreement: {
      supplier: {
        primary: "Supplier",
        counterpart: "Client",
        guidance:
          "Check scope clarity, payment triggers, IP ownership, and liability caps.",
      },
      client: {
        primary: "Client",
        counterpart: "Supplier",
        guidance:
          "Validate deliverable quality, acceptance rights, and remedies for delays/defects.",
      },
    },
    psa: {
      supplier: {
        primary: "Supplier",
        counterpart: "Customer",
        guidance:
          "Assess supply commitments, forecasts, warranties, and liability limits.",
      },
      customer: {
        primary: "Customer",
        counterpart: "Supplier",
        guidance:
          "Check reliability, quality protections, and commercial remedies for non-conformance.",
      },
    },
    product_supply_agreement: {
      supplier: {
        primary: "Supplier",
        counterpart: "Customer",
        guidance:
          "Assess supply commitments, forecasts, warranties, and liability limits.",
      },
      customer: {
        primary: "Customer",
        counterpart: "Supplier",
        guidance:
          "Check reliability, quality protections, and commercial remedies for non-conformance.",
      },
    },
    rda: {
      contractor: {
        primary: "Contractor",
        counterpart: "Customer",
        guidance:
          "Clarify research scope, IP ownership, and risk allocation for delivery.",
      },
      customer: {
        primary: "Customer",
        counterpart: "Contractor",
        guidance:
          "Protect investment with clear milestones, ownership, and remedies.",
      },
    },
    research_development_agreement: {
      contractor: {
        primary: "Contractor",
        counterpart: "Customer",
        guidance:
          "Clarify research scope, IP ownership, and risk allocation for delivery.",
      },
      customer: {
        primary: "Customer",
        counterpart: "Contractor",
        guidance:
          "Protect investment with clear milestones, ownership, and remedies.",
      },
    },
    eula: {
      supplier: {
        primary: "Supplier",
        counterpart: "End User",
        guidance:
          "Review licensing scope, restrictions, and liability to protect the publisher.",
      },
      "end-user": {
        primary: "End User",
        counterpart: "Supplier",
        guidance:
          "Validate license rights, acceptable use, and available remedies.",
      },
    },
    end_user_license_agreement: {
      supplier: {
        primary: "Supplier",
        counterpart: "End User",
        guidance:
          "Review licensing scope, restrictions, and liability to protect the publisher.",
      },
      "end-user": {
        primary: "End User",
        counterpart: "Supplier",
        guidance:
          "Validate license rights, acceptable use, and available remedies.",
      },
    },
  };

  const roles = mapping[solutionKey]?.[perspective];
  const primary = roles?.primary || perspectiveLabel || "Selected party";
  const counterpart = roles?.counterpart || "Counterparty";
  const extraGuidance = roles?.guidance
    ? `Guidance: ${roles.guidance}`
    : "";

  return `

USER-SELECTED PERSPECTIVE:
- Primary party: ${primary}
- Counterparty: ${counterpart}
- Instruction: Align "buyer" perspective to ${primary} and "seller" to ${counterpart}. Avoid generic or "mutual" framing; tailor all findings, scores, and recommendations to ${primary}'s interests. ${extraGuidance}`;
}

const SOLUTION_ANALYSIS_GUIDANCE: Record<
  string,
  {
    title: string;
    keywords: string[];
    focus: string[];
    scoring: string[];
    mustHave: string[];
    watchouts: string[];
  }
> = {
  nda: {
    title: "Non-Disclosure Agreement",
    keywords: ["nda", "non-disclosure", "non disclosure"],
    focus: [
      "Assess the definition and scope of Confidential Information, including exclusions and residual knowledge carve-outs.",
      "Evaluate obligations on the receiving party: permitted disclosures, use restrictions, security measures, and notice obligations.",
      "Review duration, survival clauses, remedies (including injunctive relief), and processes for return/destroy mechanics.",
    ],
    scoring: [
      "Confidentiality scope and exclusions should drive ~40% of the score.",
      "Safeguards, remedies, and breach handling contribute ~30%.",
      "Survival, termination, and dispute resolution make up the remaining 30%.",
    ],
    mustHave: [
      "Clear definition of Confidential Information with standard exclusions.",
      "Return or destruction obligations upon termination or request.",
      "Remedies or injunctive relief plus survival period for confidentiality obligations.",
    ],
    watchouts: [
      "No survival term for confidentiality obligations.",
      "Exclusions so broad they undermine protection.",
      "Lack of liability allocation or remedy for breaches.",
    ],
  },
  dpa: {
    title: "Data Processing Agreement",
    keywords: ["dpa", "data processing"],
    focus: [
      "Verify lawful basis and clearly defined processing instructions from the controller.",
      "Assess security measures, breach response, audit rights, and sub-processor governance.",
      "Review cross-border transfer mechanisms, DPIA support, and data subject rights handling.",
    ],
    scoring: [
      "Article 28/controller-processor clauses and instructions ~45% of the score.",
      "Security measures, breach notification, and audit rights ~35%.",
      "Transfers, DPIA cooperation, and data subject facilitation ~20%.",
    ],
    mustHave: [
      "Documented processing instructions and purpose limitations.",
      "Security measures with breach notification timelines.",
      "Sub-processor approval, transfer safeguards, and data subject cooperation clauses.",
    ],
    watchouts: [
      "No SLA for breach notification or incident cooperation.",
      "Missing obligations or approvals for sub-processors.",
      "Silence on cross-border transfers despite global operations.",
    ],
  },
  eula: {
    title: "End User License Agreement",
    keywords: ["eula", "end user license", "software license"],
    focus: [
      "Clarify licence scope, permitted/forbidden uses, transfer rights, and geographic limitations.",
      "Assess warranty disclaimers, liability caps, termination triggers, and remedies.",
      "Review update, maintenance, and support commitments, including SLAs if applicable.",
    ],
    scoring: [
      "License scope and restrictions ~40% of the score.",
      "Liability, indemnity, and dispute mechanisms ~30%.",
      "Maintenance, updates, and termination obligations ~30%.",
    ],
    mustHave: [
      "Specific permitted/prohibited uses, assignment, and transfer terms.",
      "Termination rights for breach with post-termination obligations.",
      "Warranty disclaimers and limitation of liability aligned with risk appetite.",
    ],
    watchouts: [
      "License scope overly broad or silent on assignment.",
      "No provisions for software updates or support expectations.",
      "Missing limitation of liability or dispute resolution mechanism.",
    ],
  },
  ppc: {
    title: "Privacy Policy Compliance",
    keywords: ["ppc", "privacy policy", "privacy notice"],
    focus: [
      "Ensure transparency across data categories, purpose, legal bases, and contact details.",
      "Confirm user rights, opt-out processes, consent mechanisms, and parent/child protections.",
      "Assess cookie disclosures, analytics tracking, data sharing, and cross-border transfer statements.",
    ],
    scoring: [
      "Transparency, data categories, and purposes ~35% of the score.",
      "Rights handling, consent/opt-out, and contact details ~35%.",
      "Transfer disclosures, security statements, and retention policies ~30%.",
    ],
    mustHave: [
      "List of personal data collected with processing purposes and legal bases.",
      "Instructions for exercising rights plus contact or DPO information.",
      "Cookie/advertising disclosures and transfer safeguards.",
    ],
    watchouts: [
      "No process for data subject rights or timelines.",
      "Missing disclosure on cross-border transfers when applicable.",
      "Cookies or trackers referenced but not explained.",
    ],
  },
  ca: {
    title: "Consultancy Agreement",
    keywords: ["ca", "consultancy", "consulting"],
    focus: [
      "Clarify scope of services, deliverables, acceptance criteria, change control, and performance standards.",
      "Review fee structure, invoicing cadence, expenses, milestones, and termination rights.",
      "Assess IP ownership, confidentiality, non-solicitation, and liability/indemnity terms.",
    ],
    scoring: [
      "Scope, deliverables, and acceptance ~35% of score.",
      "Commercial terms, milestones, and change control ~30%.",
      "IP ownership, confidentiality, and liability ~35%.",
    ],
    mustHave: [
      "Detailed statement of work with milestones or deliverables.",
      "Ownership/assignment of work product and pre-existing IP.",
      "Termination rights, liability, and insurance/indemnity settings.",
    ],
    watchouts: [
      "Scope vague or missing acceptance criteria.",
      "No liability caps or indemnity provisions.",
      "Key personnel or substitution rights absent.",
    ],
  },
  rda: {
    title: "Research & Development Agreement",
    keywords: ["rda", "research", "development"],
    focus: [
      "Confirm research objectives, collaboration structure, governance, milestones, and contribution responsibilities.",
      "Examine ownership of background and foreground IP, licensing rights, commercialisation terms, and joint inventions.",
      "Evaluate publication rights, confidentiality, data sharing, ethical/regulatory compliance, and exit/termination mechanics.",
    ],
    scoring: [
      "Ownership/licensing of background and foreground IP ~40% of score.",
      "Governance, milestones, and funding controls ~35%.",
      "Compliance, publication, and exit strategy ~25%.",
    ],
    mustHave: [
      "Definition of background vs. new IP and ownership/outcome.",
      "Governance mechanism (steering committee, reporting cadence).",
      "Publication approval process and regulatory compliance covenants.",
    ],
    watchouts: [
      "No dispute resolution around jointly developed IP.",
      "Milestones and success criteria undefined.",
      "No exit or wind-down mechanism if project halts early.",
    ],
  },
  psa: {
    title: "Product Supply Agreement",
    keywords: ["psa", "product supply", "supply agreement", "purchase"],
    focus: [
      "Analyse product specifications, quality standards, inspection/acceptance procedures, and logistics responsibilities.",
      "Review delivery schedules, forecasting, penalties, and change management mechanisms.",
      "Assess warranty, liability, indemnities, force majeure, and continuity/resilience planning.",
    ],
    scoring: [
      "Specifications, quality, and acceptance ~35% of scoring.",
      "Logistics, delivery, and change control ~30%.",
      "Warranty, liability, indemnity, and contingency planning ~35%.",
    ],
    mustHave: [
      "Quality/inspection rights with acceptance criteria.",
      "Forecasting, ordering cadence, and remedies for delays.",
      "Risk allocation for defective goods and force majeure provisions.",
    ],
    watchouts: [
      "No remedy for non-conforming goods.",
      "Delivery lead times or penalties undefined.",
      "Continuity or contingency obligations absent.",
    ],
  },
};

function getSolutionGuidance(
  selected: AnalysisRequest["selectedSolution"],
  fallbackContractType?: string,
) {
  const baseCandidates = [
    selected?.key,
    selected?.id,
    selected?.title,
    fallbackContractType,
  ]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  const candidates = baseCandidates.flatMap((value) => {
    if (value.includes("_") || value.includes("-")) {
      return [value, value.replace(/[_-]+/g, " ")];
    }
    return [value];
  });

  for (const candidate of candidates) {
    for (const [key, config] of Object.entries(SOLUTION_ANALYSIS_GUIDANCE)) {
      if (
        candidate === key ||
        candidate.includes(key) ||
        config.keywords.some((keyword) => candidate.includes(keyword))
      ) {
        return { key, ...config };
      }
    }
  }

  return null;
}

function inferDocumentFormat(
  filename?: string,
  providedFormat?: string,
  mimeType?: string | null,
) {
  if (providedFormat) return providedFormat.toLowerCase();

  if (mimeType) {
    const lower = mimeType.toLowerCase();
    if (lower.includes("pdf")) return "pdf";
    if (lower.includes("word") || lower.includes("doc")) return "docx";
    if (lower.includes("markdown")) return "md";
    if (lower.includes("html")) return "html";
    if (lower.includes("plain")) return "txt";
  }

  if (!filename) return undefined;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;
  if (ext === "doc") return "docx";
  return ext;
}

function detectContractType(
  content: string,
  filename?: string,
  provided?: string,
) {
  if (provided) return provided;
  const shortContent = content.slice(0, 4000);
  let bestMatch: { type: string; score: number } | null = null;
  for (const [type, patterns] of Object.entries(CONTRACT_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(shortContent)) {
        score += 1;
      }
    }
    if (filename && filename.toLowerCase().includes(type)) {
      score += 1.5;
    }
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { type, score };
    }
  }

  return bestMatch && bestMatch.score >= 1 ? bestMatch.type : "general";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isClauseImportance(
  value: unknown,
): value is ClauseExtraction["importance"] {
  return (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "info"
  );
}

function toNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function toPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStoredClauseEntry(
  entry: unknown,
  index: number,
  contractType: string,
): ClauseExtraction | null {
  if (!isPlainObject(entry)) {
    return null;
  }

  const title =
    toNonEmptyString(entry.title) ??
    toNonEmptyString(entry.clause_title) ??
    toNonEmptyString(entry.heading) ??
    toNonEmptyString(entry.section) ??
    "";
  const snippet =
    toNonEmptyString(entry.originalText) ??
    toNonEmptyString(entry.clause_text) ??
    toNonEmptyString(entry.excerpt) ??
    toNonEmptyString(entry.text) ??
    "";

  if (!title && !snippet) {
    return null;
  }

  const normalizedText =
    toNonEmptyString(entry.normalizedText) ?? snippet ?? title;
  const baseSlug = title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64)
    : null;
  const clauseId =
    toNonEmptyString(entry.clauseId) ??
    toNonEmptyString(entry.clause_id) ??
    toNonEmptyString(entry.clause_number) ??
    baseSlug ??
    `stored-clause-${index + 1}`;
  const importance = isClauseImportance(entry.importance)
    ? entry.importance
    : "medium";
  const references = Array.isArray(entry.references)
    ? entry.references
        .map((ref) => toNonEmptyString(ref))
        .filter((ref): ref is string => Boolean(ref))
    : [];
  const locationSource = isPlainObject(entry.location)
    ? (entry.location as Record<string, unknown>)
    : undefined;

  const baseMetadata = isPlainObject(entry.metadata)
    ? { ...(entry.metadata as Record<string, unknown>) }
    : {};
  if (typeof baseMetadata.source !== "string") {
    baseMetadata.source = "ingestion-cache";
  }
  baseMetadata.contractType = contractType;

  return {
    id: toNonEmptyString(entry.id) ?? clauseId ?? `stored-clause-${index + 1}`,
    clauseId: clauseId ?? `stored-clause-${index + 1}`,
    title: title || `Clause ${index + 1}`,
    category:
      toNonEmptyString(entry.category) ??
      toNonEmptyString(entry.clause_type) ??
      undefined,
    originalText: snippet || normalizedText || title,
    normalizedText: normalizedText || snippet || title,
    importance,
    location: {
      page: toPositiveNumber(entry.page) ?? toPositiveNumber(locationSource?.page),
      paragraph:
        toPositiveNumber(entry.paragraph) ??
        toPositiveNumber(locationSource?.paragraph),
      section:
        toNonEmptyString(entry.section) ??
        toNonEmptyString(entry.clause_title) ??
        toNonEmptyString(entry.heading) ??
        toNonEmptyString(locationSource?.section) ??
        null,
      clauseNumber:
        toNonEmptyString(entry.clause_number) ??
        toNonEmptyString(entry.clauseId) ??
        toNonEmptyString(locationSource?.clauseNumber) ??
        null,
    },
    references,
    metadata: baseMetadata,
  };
}

function normalizeClauseCollection(
  value: unknown,
  contractType: string,
): ClauseExtraction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeStoredClauseEntry(entry, index, contractType))
    .filter((clause): clause is ClauseExtraction => Boolean(clause));
}

function readStoredClauseExtractions(
  ingestionRecord: ContractIngestionRecord | null,
  contractType: string,
): ClauseExtraction[] {
  if (!ingestionRecord?.metadata) {
    return [];
  }

  const metadata = ingestionRecord.metadata as Record<string, unknown>;
  const candidateSets: ClauseExtraction[][] = [];
  candidateSets.push(
    normalizeClauseCollection(metadata["clauseExtractions"], contractType),
    normalizeClauseCollection(metadata["clause_extractions"], contractType),
    normalizeClauseCollection(metadata["critical_clauses"], contractType),
  );

  const analysis = metadata["analysis"];
  if (isPlainObject(analysis)) {
    const analysisRecord = analysis as Record<string, unknown>;
    candidateSets.push(
      normalizeClauseCollection(analysisRecord["clauseExtractions"], contractType),
      normalizeClauseCollection(analysisRecord["clause_extractions"], contractType),
      normalizeClauseCollection(analysisRecord["critical_clauses"], contractType),
    );
  }

  for (const set of candidateSets) {
    if (set.length > 0) {
      return set;
    }
  }

  return [];
}

function mergeClauseCollections(
  ...collections: Array<ClauseExtraction[] | null | undefined>
): ClauseExtraction[] {
  const merged: ClauseExtraction[] = [];
  const seen = new Set<string>();

  for (const collection of collections) {
    if (!collection?.length) continue;
    for (const clause of collection) {
      if (!clause) continue;
      const key =
        clause.clauseId ??
        clause.id ??
        (clause.title ? clause.title.toLowerCase() : null);
      if (key && seen.has(key)) {
        continue;
      }
      if (key) {
        seen.add(key);
      }
      merged.push(clause);
    }
  }

  return merged;
}

function buildClauseDigestForPrompt(
  clauses: ClauseExtraction[],
) {
  if (!clauses.length) {
    return null;
  }
  const lines: string[] = [];
  clauses.forEach((clause, index) => {
    const identifier =
      clause.clauseId ||
      clause.id ||
      `clause-${index + 1}`;
    const title = clause.title || identifier;
    const excerpt = (clause.normalizedText || clause.originalText || "")
      .replace(/\s+/g, " ")
      .slice(0, 200);
    const category = clause.category || "general";
    lines.push(
      `${index + 1}. [${identifier} | ${category}] ${title} → ${excerpt}`,
    );
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

function isClauseSetWeak(clauses: ClauseExtraction[]): boolean {
  if (!clauses.length) return true;
  let aiSourced = 0;
  let shortExcerpts = 0;
  const seenIds = new Set<string>();

  for (const clause of clauses) {
    if (!clause) continue;
    const source =
      typeof clause.metadata?.source === "string"
        ? clause.metadata.source
        : "";
    if (source === "gpt-clause-extractor") {
      aiSourced += 1;
    }
    if (
      typeof clause.originalText !== "string" ||
      clause.originalText.trim().length < 40
    ) {
      shortExcerpts += 1;
    }
    if (clause.clauseId) {
      if (seenIds.has(clause.clauseId)) {
        return true;
      }
      seenIds.add(clause.clauseId);
    }
  }

  if (aiSourced >= Math.max(3, clauses.length * 0.4)) {
    return false;
  }
  if (shortExcerpts >= Math.max(2, clauses.length * 0.5)) {
    return true;
  }
  const uniqueHeadings = new Set(
    clauses
      .map((clause) => clause.title?.toLowerCase()?.trim())
      .filter(Boolean),
  );
  if (uniqueHeadings.size <= Math.ceil(clauses.length * 0.3)) {
    return true;
  }
  return aiSourced === 0;
}

async function persistClauseExtractionsIfMissing(
  ingestionRecord: ContractIngestionRecord,
  clauses: ClauseExtraction[],
  existingClauses: ClauseExtraction[],
) {
  if (!clauses.length || existingClauses.length) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const nextMetadata: Record<string, unknown> = {
      ...(ingestionRecord.metadata ?? {}),
      clauseExtractions: clauses,
    };

    const { error } = await supabase
      .from("contract_ingestions")
      .update({ metadata: nextMetadata })
      .eq("id", ingestionRecord.id);

    if (error) {
      throw error;
    }

    ingestionRecord.metadata = nextMetadata;
  } catch (error) {
    console.warn("⚠️ Unable to persist clause extractions", {
      ingestionId: ingestionRecord.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function buildKpis(
  result: any,
  contractType: string,
  clauseCount: number,
  timeSavedLabel?: string,
) {
  const base = {
    contract_type: contractType,
    clauses_mapped: clauseCount,
  } as Record<string, any>;

  if (typeof result.score === "number") {
    base.score = result.score;
  }

  if (Array.isArray(result.violations)) {
    base.high_risk_findings = result.violations.filter(
      (item: any) =>
        typeof item?.severity === "string" &&
        item.severity.toLowerCase() === "high",
    ).length;
  }

  if (Array.isArray(result.risks)) {
    base.risk_count = result.risks.length;
  }

  if (Array.isArray(result.recommendations)) {
    base.recommendation_count = result.recommendations.length;
  }

  if (timeSavedLabel) {
    base.time_savings = timeSavedLabel;
  }

  return base;
}

type ModelTier = "default" | "premium" | "intensive";

function parseTierEnv(key: string): ModelTier | null {
  const value = Deno.env.get(key);
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "default" || normalized === "premium" || normalized === "intensive") {
    return normalized;
  }
  return null;
}

const FORCED_MODEL_TIER = parseTierEnv("OPENAI_REASONING_FORCE_TIER");
const DEFAULT_MODEL_TIER =
  FORCED_MODEL_TIER ?? parseTierEnv("OPENAI_REASONING_DEFAULT_TIER") ?? "intensive";

function resolveModelTier(model?: string | null, reviewType?: string): ModelTier {
  if (FORCED_MODEL_TIER) {
    return FORCED_MODEL_TIER;
  }
  const value = model?.toLowerCase() ?? "";
  if (value.includes("intensive") || value.includes("pro")) {
    return "intensive";
  }
  if (value.includes("premium") || value.includes("gpt-5") || reviewType === "risk_assessment") {
    return "premium";
  }
  return DEFAULT_MODEL_TIER;
}

function buildLegacyResponse(
  report: AnalysisReport,
  context: {
    classification?: AnalysisRequest["classification"];
    contractType: string;
    reviewType: string;
    modelTier: ModelTier;
  },
) {
  const summary =
    report.contractSummary.purpose ||
    `Structured ${context.reviewType} analysis generated.`;
  const keyPoints =
    report.issuesToAddress.length > 0
      ? report.issuesToAddress
          .map((issue) => issue.recommendation)
          .filter(Boolean)
          .slice(0, 5)
      : report.clauseFindings.map((clause) => clause.summary).slice(0, 5);

  const recommendations = report.issuesToAddress.map((issue) => ({
    id: issue.id,
    description: issue.recommendation,
    severity: issue.severity,
    department: "legal",
    owner: "Legal",
    due_timeline: "Before execution",
    category: issue.title,
  }));

  const actionItems = report.proposedEdits.map((edit) => ({
    id: edit.id,
    description: edit.intent || edit.proposedText.slice(0, 120),
    severity: edit.applyByDefault ? "high" : "medium",
    department: "legal",
    owner: "Legal",
    due_timeline: "Drafting phase",
    category: "drafting",
  }));

  return {
    model_used: report.metadata?.model,
    model_tier: context.modelTier,
    fallback_used: false,
    generated_at: report.generatedAt,
    contract_type: context.contractType,
    classification_context: context.classification || null,
    structured_report: report,
    general_information: report.generalInformation,
    contract_summary: report.contractSummary,
    issues: report.issuesToAddress,
    clause_findings: report.clauseFindings,
    proposed_edits: report.proposedEdits,
    score: report.generalInformation.complianceScore,
    confidence:
      context.classification?.confidence ??
      report.metadata?.classification?.confidence ??
      0.82,
    summary,
    key_points: keyPoints,
    recommendations,
    action_items: actionItems,
    token_usage: report.metadata?.tokenUsage ?? null,
  };
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let request: AnalysisRequest | null = null;
  let processedContent = "";
  let fallbackContext: FallbackAnalysisContext | null = null;
  let ingestionRecord: ContractIngestionRecord | null = null;

  try {
    console.log("🚀 Starting contract analysis request...");

    // Parse request body with error handling
    try {
      request = await req.json();
    } catch (parseError) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : String(parseError);
      console.error("❌ Failed to parse request JSON:", {
        error: errorMessage,
        type: parseError instanceof Error ? parseError.name : typeof parseError,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate request
    if (
      !request ||
      (!request.content && !request.ingestionId) ||
      !request.reviewType
    ) {
      console.error("❌ Missing required fields in request:", {
        hasContent: !!request?.content,
        hasIngestionId: !!request?.ingestionId,
        hasReviewType: !!request?.reviewType,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: Provide either ingestionId or content along with reviewType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("✅ Request validation passed:", {
      reviewType: request.reviewType,
      model: request.model,
      contentLength: request.content?.length,
      ingestionId: request.ingestionId,
      fileType: request.fileType,
      fileName: request.fileName,
    });

    processedContent = request.content ?? "";

    if (request.ingestionId) {
      try {
        ingestionRecord = await loadIngestionRecord(request.ingestionId);
        processedContent = ingestionRecord.extracted_text ?? "";

        if (!processedContent || processedContent.trim().length === 0) {
          const retryReason = ingestionRecord.needs_ocr
            ? "Extraction requires OCR"
            : "Extraction incomplete";
          console.warn("⚠️ Ingestion missing extracted text", {
            ingestionId: request.ingestionId,
            status: ingestionRecord.status,
            needsOcr: ingestionRecord.needs_ocr,
            retryReason,
          });
          return new Response(
            JSON.stringify({
              error: ingestionRecord.needs_ocr
                ? "Document requires OCR processing before AI analysis."
                : "Document extraction not complete. Please retry shortly.",
              ingestionStatus: ingestionRecord.status,
              needsOcr: ingestionRecord.needs_ocr,
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (ingestionError) {
        const errorMessage =
          ingestionError instanceof Error
            ? ingestionError.message
            : String(ingestionError);
        console.error("❌ Failed to load ingestion record:", {
          ingestionId: request.ingestionId,
          error: errorMessage,
        });
        return new Response(
          JSON.stringify({
            error: "Failed to load ingestion record",
            details: errorMessage,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (
      processedContent &&
      (processedContent.startsWith("PDF_FILE_BASE64:") ||
        processedContent.startsWith("DOCX_FILE_BASE64:"))
    ) {
      try {
        console.log("📄 Starting file text extraction...");
        processedContent = await extractTextFromFile(
          processedContent,
          request.fileType || ingestionRecord?.mime_type || "",
        );
        console.log(
          "✅ File text extraction completed, content length:",
          processedContent.length,
        );

        if (!processedContent || processedContent.trim().length === 0) {
          return new Response(
            JSON.stringify({
              error:
                "No text content could be extracted from the file. Please ensure the file contains readable text or try converting to a text file.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (extractError) {
        const errorMessage =
          extractError instanceof Error
            ? extractError.message
            : String(extractError);
        console.error("❌ File extraction failed:", {
          error: errorMessage,
          type:
            extractError instanceof Error
              ? extractError.name
              : typeof extractError,
          timestamp: new Date().toISOString(),
        });

        let userMessage = errorMessage;
        if (
          errorMessage.toLowerCase().includes("scanned") ||
          errorMessage.toLowerCase().includes("no text extracted")
        ) {
          userMessage =
            "This PDF appears to be scanned (image-based) or uses unsupported encoding. Please try: 1) Converting the PDF to text using a PDF reader, 2) Using a text-based PDF instead, or 3) Uploading as a TXT or DOCX file.";
        } else if (
          errorMessage.toLowerCase().includes("too short") ||
          errorMessage.toLowerCase().includes("not enough")
        ) {
          userMessage =
            "Unable to extract sufficient text from this document. The file may be empty, corrupted, or use unsupported formatting. Please try a different file format (TXT or DOCX).";
        }

        return new Response(
          JSON.stringify({
            error: userMessage,
            technical_details: errorMessage,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const filename =
      request.fileName ||
      request.filename ||
      ingestionRecord?.original_name;
    const contentHash = await hashText(processedContent);
    const resolvedContractType =
      request.contractType ||
      request.classification?.contractType ||
      detectContractType(processedContent, filename);
    const resolvedDocumentFormat = inferDocumentFormat(
      filename,
      request.documentFormat,
      request.fileType || ingestionRecord?.mime_type,
    );

    fallbackContext = {
      reviewType: request.reviewType,
      contractContent: processedContent,
      contractType: resolvedContractType,
      classification: request.classification,
      documentFormat: resolvedDocumentFormat,
      fileName: filename,
    };

    if (
      ingestionRecord?.warnings &&
      Array.isArray(ingestionRecord.warnings) &&
      ingestionRecord.warnings.length > 0
    ) {
      console.warn("⚠️ Ingestion warnings detected", {
        ingestionId: ingestionRecord.id,
        warnings: ingestionRecord.warnings,
      });
    }

    const modelTier = resolveModelTier(request.model, request.reviewType);

    const storedClauses = readStoredClauseExtractions(
      ingestionRecord,
      resolvedContractType,
    );

    const cachedDigest = readCachedClauseDigest(ingestionRecord, contentHash);
    const cachedAnchorSummary = readCachedAnchorSummary(
      ingestionRecord,
      contentHash,
    );
    const clauseSeed = mergeClauseCollections(storedClauses);
    const clauseDigest = cachedDigest ?? buildClauseDigestForPrompt(clauseSeed);
    const anchorSummary =
      cachedAnchorSummary ??
      buildAnchorSummary({
        extractedText: processedContent,
        clauseDigest,
        wordCount: ingestionRecord?.word_count ?? wordCount(processedContent),
      });

    if (ingestionRecord && !cachedDigest && clauseDigest) {
      await persistClauseDigestIfMissing(
        ingestionRecord,
        clauseDigest,
        contentHash,
      );
    }
    if (ingestionRecord && !cachedAnchorSummary && anchorSummary) {
      await persistAnchorSummaryIfMissing(
        ingestionRecord,
        anchorSummary,
        contentHash,
      );
    }

    try {
      const reasoningResult = await runReasoningAnalysis({
        content: processedContent,
        reviewType: request.reviewType,
        classification: request.classification,
        selectedSolution: request.selectedSolution,
        filename,
        documentFormat: resolvedDocumentFormat,
        ingestionWarnings: ingestionRecord?.warnings,
        ingestionId: request.ingestionId,
        modelTier,
        clauseDigest,
        anchorSummary,
      });

      const responsePayload = buildLegacyResponse(reasoningResult.report, {
        classification: request.classification,
        contractType: resolvedContractType,
        reviewType: request.reviewType,
        modelTier,
      });

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (analysisError) {
      const errorMessage =
        analysisError instanceof Error
          ? analysisError.message
          : String(analysisError);

      console.error("❌ AI provider failed, using fallback analysis:", {
        message: errorMessage,
        modelTier,
        timestamp: new Date().toISOString(),
      });

      const fallbackResponse = generateFallbackAnalysis({
        ...fallbackContext!,
        fallbackReason: `Primary AI provider error: ${errorMessage}`,
      });

      return new Response(JSON.stringify(fallbackResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }

    const errorDetails = {
      message: errorMessage,
      type: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    console.error("❌ Analysis error:", errorDetails);

    if (!fallbackContext) {
      const filename =
        request?.fileName ||
        request?.filename ||
        ingestionRecord?.original_name;
      const inferredFormat = inferDocumentFormat(
        filename,
        request?.documentFormat,
        request?.fileType || ingestionRecord?.mime_type,
      );
      const contentForFallback = processedContent || request?.content || "";
      const inferredContractType =
        request?.contractType ||
        request?.classification?.contractType ||
        detectContractType(contentForFallback, filename);

      fallbackContext = {
        reviewType: request?.reviewType || "full_summary",
        contractContent: contentForFallback,
        contractType: inferredContractType,
        classification: request?.classification,
        documentFormat: inferredFormat,
        fileName: filename,
      };
    }

    const fallbackResponse = generateFallbackAnalysis({
      ...fallbackContext,
      fallbackReason: `Edge function error: ${errorMessage}`,
    });

    return new Response(
      JSON.stringify({
        ...fallbackResponse,
        fallback_error_details: errorDetails,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Extract text from PDF or DOCX files
async function extractTextFromFile(
  content: string,
  fileType: string,
): Promise<string> {
  if (content.startsWith("PDF_FILE_BASE64:")) {
    const base64Data = content.replace("PDF_FILE_BASE64:", "");

    console.log("📄 Processing PDF file for text extraction...");
    console.log(
      `📊 Base64 data length: ${Math.round(base64Data.length / 1024)}KB`,
    );

    try {
      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error("Invalid PDF data received");
      }

      // For development/testing, decode base64 to validate file
      let binaryData: string;
      try {
        binaryData = atob(base64Data);
      } catch (decodeError) {
        throw new Error("Invalid base64 PDF data");
      }

      const estimatedPages = Math.ceil(binaryData.length / 2000); // Rough estimation
      const fileSizeKB = Math.round(binaryData.length / 1024);

      console.log(
        `📄 PDF file stats: ~${estimatedPages} pages, ${fileSizeKB}KB`,
      );

      // Extract text from PDF using real extraction
      console.log("📄 Extracting text from PDF file...");
      const extractedText = await extractTextFromPDF(base64Data);

      // Validate extracted text
      const validation = validateExtractedText(extractedText);
      if (!validation.valid) {
        throw new Error(validation.error || "PDF text extraction failed");
      }

      console.log(
        `✅ Successfully extracted ${extractedText.length} characters from PDF`,
      );
      console.log(
        `📊 Estimated pages: ~${estimatedPages}, File size: ${fileSizeKB}KB`,
      );

      return extractedText;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ PDF processing error:", {
        error: errorMessage,
        type: error instanceof Error ? error.name : typeof error,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to process PDF file: ${errorMessage}`);
    }
  }

  if (content.startsWith("DOCX_FILE_BASE64:")) {
    const base64Data = content.replace("DOCX_FILE_BASE64:", "");

    console.log("📄 Processing DOCX file for text extraction...");
    console.log(
      `📊 Base64 data length: ${Math.round(base64Data.length / 1024)}KB`,
    );

    try {
      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error("Invalid DOCX data received");
      }

      // For development/testing, decode base64 to validate file
      let binaryData: string;
      try {
        binaryData = atob(base64Data);
      } catch (decodeError) {
        throw new Error("Invalid base64 DOCX data");
      }

      const fileSizeKB = Math.round(binaryData.length / 1024);
      console.log(`📄 DOCX file processed: ${fileSizeKB}KB`);

      // Extract text from DOCX using real extraction
      console.log("📄 Extracting text from DOCX file...");
      const extractedText = await extractTextFromDOCX(base64Data);

      // Validate extracted text
      const validation = validateExtractedText(extractedText);
      if (!validation.valid) {
        throw new Error(validation.error || "DOCX text extraction failed");
      }

      console.log(
        `✅ Successfully extracted ${extractedText.length} characters from DOCX`,
      );
      console.log(`📊 File size: ${fileSizeKB}KB`);

      return extractedText;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ DOCX processing error:", {
        error: errorMessage,
        type: error instanceof Error ? error.name : typeof error,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to process DOCX file: ${errorMessage}`);
    }
  }

  return content;
}

async function loadIngestionRecord(
  ingestionId: string,
): Promise<ContractIngestionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contract_ingestions")
    .select("*")
    .eq("id", ingestionId)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Ingestion record not found");
  }

  return data as ContractIngestionRecord;
}

async function analyzeWithAI(request: AnalysisRequest, apiKey: string) {
  const modelConfig = AI_CONFIGS[request.model as keyof typeof AI_CONFIGS];
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${request.model}`);
  }

  // Build prompt based on review type and custom solution
  const prompt = buildAnalysisPrompt(request);

  const apiRequest = {
    method: "POST",
    headers: modelConfig.headers(apiKey),
    body: JSON.stringify({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt,
        },
        {
          role: "user",
          content: `${prompt.analysisPrompt}\n\nContract Content:\n${request.content}`,
        },
      ],
      temperature: modelConfig.temperature || 0.1,
      max_completion_tokens: modelConfig.maxTokens || 4000,
      response_format: { type: "json_object" },
    }),
  };

  // Make API call
  const response = await fetch(modelConfig.baseUrl, apiRequest);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API Error:", {
      status: response.status,
      errorText: errorText,
      model: modelConfig.model,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content || "";

  // Parse AI response into structured format
  return parseAIResponse(aiResponse, request.reviewType);
}

function buildAnalysisPrompt(request: AnalysisRequest) {
  const customSolution = request.customSolution;
  const classification = request.classification;
  const perspectiveContext = buildPerspectiveContext(request);

  const solutionGuidance = getSolutionGuidance(
    request.selectedSolution,
    request.contractType ?? classification?.contractType,
  );

  const solutionFocusText = solutionGuidance
    ? `**SELECTED SOLUTION FOCUS (${solutionGuidance.title.toUpperCase()})**:
${solutionGuidance.focus.map((item) => `- ${item}`).join("\n")}

**SCORING & RISK PRIORITIES (${solutionGuidance.title})**:
${solutionGuidance.scoring.map((item) => `- ${item}`).join("\n")}

**MUST-HAVE CONTROLS TO VERIFY**:
${solutionGuidance.mustHave.map((item) => `- ${item}`).join("\n")}

**COMMON GAPS TO FLAG**:
${solutionGuidance.watchouts.map((item) => `- ${item}`).join("\n")}

Return a \"solution_alignment\" object in the JSON payload capturing these priorities.`
    : "";

  // Build classification context for enhanced AI analysis
  let classificationContext = "";
  if (classification) {
    classificationContext = `

DOCUMENT CLASSIFICATION CONTEXT:
Contract Type: ${classification.contractType}
Classification Confidence: ${Math.round(classification.confidence * 100)}%
Key Characteristics: ${classification.characteristics.join(", ")}
Classification Reasoning: ${classification.reasoning}

Use this classification context to provide more targeted and accurate analysis specific to this contract type.`;
  }

  // Enhanced base prompts with advanced legal analysis capabilities
  const basePrompts = {
    risk_assessment: {
      systemPrompt: `You are a senior contract risk analyst with expertise in commercial law, regulatory compliance, and enterprise risk management. You have 15+ years of experience reviewing complex commercial agreements across multiple industries. You excel at identifying subtle risks, assessing interconnected risk factors, and providing strategic recommendations. Always respond in valid JSON format with comprehensive analysis.${classificationContext}`,
      analysisPrompt: `Conduct a comprehensive risk assessment of this contract with the following advanced analysis framework:

1. **Multi-dimensional Risk Analysis**: Examine financial, legal, operational, compliance, reputational, and strategic risks
2. **Risk Interconnection**: Identify how different risks compound or mitigate each other
3. **Scenario Planning**: Consider best-case, worst-case, and most-likely scenarios
4. **Industry Context**: Apply industry-specific risk considerations
5. **Regulatory Landscape**: Assess compliance with current and anticipated regulations
6. **Quantitative Risk Scoring**: Provide precise impact and probability assessments

Analyze risk cascading effects, hidden dependencies, and long-term implications. Consider contract lifecycle risks, performance risks, and market condition impacts.

${solutionFocusText}

**DEDUPLICATION RULES**:
- Merge overlapping recommendations/action items and flag secondary entries with "duplicate_of" referencing the primary "id".
- Do not create duplicate entries with the same description/owner.

**CLAUSE EXTRACTION REQUIREMENT**: Extract and analyze specific contract clauses, identifying:
- Clause titles and sections
- Page or location references (e.g., "Page 4, Section 7.2")
- Risk-bearing provisions
- Limitation of liability clauses
- Indemnification terms
- Termination conditions
- Payment and penalty terms
- Force majeure provisions
- Dispute resolution mechanisms

Return JSON in this exact format:
{
  "score": number (60-100),
  "confidence": number (0.7-1.0),
  "pages": number,
  "critical_clauses": [
    {
      "clause_number": "string (e.g., 'Section 7.2' or 'Article 4(a)')",
      "clause_title": "string",
      "clause_text": "string (key excerpt, 100-300 chars)",
      "page_reference": "string | null",
      "evidence_excerpt": "string",
      "clause_type": "liability|indemnification|termination|payment|warranty|confidentiality|ip_rights|compliance|other",
      "importance": "critical|high|medium|low",
      "risk_level": "high|medium|low",
      "interpretation": "string (legal interpretation and implications)",
      "recommendation": "string (specific actionable advice)"
    }
  ],
  "risks": [
    {
      "type": "financial|legal|operational|compliance|reputational|strategic",
      "level": "low|medium|high|critical",
      "description": "string (detailed risk description with context)",
      "recommendation": "string (specific actionable recommendation)",
      "impact_score": number (1-10),
      "probability": number (0.1-1.0),
      "mitigation_complexity": "simple|moderate|complex",
      "timeline": "immediate|short_term|medium_term|long_term",
      "cascading_effects": ["string"]
    }
  ],
  "risk_interactions": [
    {
      "risk_combination": ["string"],
      "compound_effect": "amplified|mitigated|neutral",
      "description": "string"
    }
  ],
  "recommendations": [
    {
      "id": "string",
      "description": "string",
      "severity": "critical|high|medium|low",
      "department": "legal|privacy|security|operations|finance|executive|product|commercial|other",
      "owner": "legal|operations|security|finance|privacy|executive|product|commercial|other",
      "due_timeline": "string",
      "category": "legal_obligation|risk_mitigation|commercial|operational|strategic|governance",
      "duplicate_of": "string | null",
      "next_step": "string"
    }
  ],
  "action_items": [
    {
      "id": "string",
      "description": "string",
      "severity": "critical|high|medium|low",
      "department": "legal|privacy|security|operations|finance|executive|product|commercial|other",
      "owner": "legal|operations|security|finance|privacy|executive|product|commercial|other",
      "due_timeline": "string",
      "category": "legal_obligation|risk_mitigation|commercial|operational|strategic|governance",
      "duplicate_of": "string | null",
      "next_step": "string"
    }
  ],
  "scenario_analysis": {
    "best_case": "string",
    "worst_case": "string",
    "most_likely": "string"
  },
  "solution_alignment": {
    "solution_key": "string | null",
    "solution_title": "string | null",
    "confidence": number (0.5-1.0),
    "priorities": ["string"],
    "recommended_controls": ["string"],
    "gaps": ["string"],
    "notes": ["string"]
  }
}`,
    },
    compliance_score: {
      systemPrompt: `You are a leading compliance expert and regulatory attorney with deep expertise in GDPR, CCPA, HIPAA, SOX, PCI-DSS, international data protection laws, financial regulations, and industry-specific compliance frameworks. You have extensive experience with cross-border regulatory requirements, emerging privacy laws, and regulatory enforcement trends. You excel at identifying subtle compliance gaps and providing strategic compliance guidance. Always respond in valid JSON format.${classificationContext}`,
      analysisPrompt: `Conduct a comprehensive regulatory compliance assessment using this advanced framework:

1. **Multi-Jurisdictional Analysis**: Assess compliance across relevant jurisdictions
2. **Regulatory Evolution**: Consider upcoming regulatory changes and trends
3. **Cross-Framework Impact**: Analyze how different regulations interact
4. **Enforcement Risk**: Evaluate likelihood and severity of regulatory enforcement
5. **Industry Standards**: Apply relevant industry-specific compliance requirements
6. **Data Flow Analysis**: Map data processing activities and cross-border transfers
7. **Rights Management**: Assess individual rights and consent mechanisms
8. **Breach Preparedness**: Evaluate incident response and notification requirements

Provide detailed compliance scoring with regulatory-specific analysis, gap identification, and remediation roadmap.

${solutionFocusText}

**DEDUPLICATION RULES**:
- Merge overlapping recommendations/action items and flag secondary entries with "duplicate_of" referencing the primary "id".
- Avoid duplicate entries with equivalent descriptions, even if phrased differently.

**CLAUSE EXTRACTION REQUIREMENT**: Extract and analyze compliance-related clauses:
- Data protection and privacy provisions
- Security and encryption requirements
- Breach notification obligations
- Audit rights and compliance reporting
- Cross-border transfer mechanisms
- Consent and legal basis provisions
- Data retention and deletion terms
- Subject rights implementation
- Include page or section references and cite the evidence excerpt.

Return JSON in this exact format:
{
  "score": number (70-100),
  "confidence": number (0.8-1.0),
  "pages": number,
  "critical_clauses": [
    {
      "clause_number": "string",
      "clause_title": "string",
      "clause_text": "string (key excerpt)",
      "page_reference": "string | null",
      "evidence_excerpt": "string",
      "compliance_framework": "GDPR|CCPA|HIPAA|SOX|PCI-DSS|Industry Standard",
      "compliance_status": "compliant|partially_compliant|non_compliant|unclear",
      "gap_description": "string (if non-compliant)",
      "regulatory_risk": "low|medium|high|critical",
      "remediation": "string (specific steps to achieve compliance)"
    }
  ],
  "compliance_areas": {
    "gdpr": number (0-100),
    "ccpa": number (0-100),
    "data_protection": number (0-100),
    "financial_regulations": number (0-100),
    "industry_standards": number (0-100),
    "cross_border_transfers": number (0-100),
    "consent_management": number (0-100),
    "breach_response": number (0-100)
  },
  "violations": [
    {
      "framework": "string",
      "severity": "low|medium|high|critical",
      "description": "string (detailed violation description)",
      "recommendation": "string (specific remediation steps)",
      "regulatory_risk": "low|medium|high",
      "enforcement_likelihood": number (0.1-1.0),
      "potential_penalty": "string"
    }
  ],
  "compliance_gaps": [
    {
      "area": "string",
      "gap_description": "string",
      "remediation_steps": ["string"],
      "priority": "low|medium|high|critical",
      "timeline": "immediate|30_days|90_days|6_months"
    }
  ],
  "regulatory_landscape": {
    "upcoming_changes": ["string"],
    "enforcement_trends": ["string"],
    "best_practices": ["string"]
  },
  "recommendations": [
    {
      "id": "string",
      "description": "string",
      "severity": "critical|high|medium|low",
      "department": "legal|privacy|security|operations|finance|executive|product|commercial|other",
      "owner": "legal|operations|security|finance|privacy|executive|product|commercial|other",
      "due_timeline": "string",
      "category": "legal_obligation|risk_mitigation|commercial|operational|strategic|governance",
      "duplicate_of": "string | null",
      "next_step": "string"
    }
  ],
  "remediation_roadmap": [
    {
      "phase": "string",
      "actions": ["string"],
      "timeline": "string",
      "priority": "string"
    }
  ],
  "solution_alignment": {
    "solution_key": "string | null",
    "solution_title": "string | null",
    "confidence": number (0.5-1.0),
    "priorities": ["string"],
    "recommended_controls": ["string"],
    "gaps": ["string"],
    "notes": ["string"]
  }
}`,
    },
    perspective_review: {
      systemPrompt: `You are a senior contract strategist with expertise in multi-stakeholder analysis, commercial negotiations, and stakeholder management. You have extensive experience representing different parties in complex commercial transactions and understand the nuanced interests, priorities, and concerns of various stakeholders. You excel at identifying hidden motivations, power dynamics, and strategic implications from each perspective. Always respond in valid JSON format.${classificationContext}${perspectiveContext}`,
      analysisPrompt: `Conduct a sophisticated multi-stakeholder analysis using this advanced framework:

1. **Stakeholder Mapping**: Identify all relevant parties and their interests
2. **Power Dynamics**: Analyze negotiating positions and leverage
3. **Strategic Implications**: Assess long-term impacts for each party
4. **Risk Allocation**: Evaluate how risks and rewards are distributed
5. **Market Context**: Consider industry dynamics and market conditions
6. **Operational Impact**: Assess day-to-day operational implications
7. **Financial Analysis**: Examine financial implications and cash flow impacts
8. **Relationship Dynamics**: Consider ongoing relationship management

Provide detailed perspective analysis with strategic insights, negotiation opportunities, and relationship implications.

${solutionFocusText}

**DEDUPLICATION RULES**:
- Provide unique recommendations/action items. If overlap exists, consolidate or reference the primary "id" via "duplicate_of".

Return JSON in this exact format:
{
  "score": number (50-100),
  "confidence": number (0.6-1.0),
  "pages": number,
  "perspectives": {
    "buyer": {
      "score": number (0-100),
      "concerns": ["string (detailed concerns with impact analysis)"],
      "advantages": ["string (specific advantages with value quantification)"],
      "strategic_priorities": ["string"],
      "negotiation_leverage": "low|medium|high",
      "risk_tolerance": "conservative|moderate|aggressive"
    },
    "seller": {
      "score": number (0-100),
      "concerns": ["string (detailed concerns with impact analysis)"],
      "advantages": ["string (specific advantages with value quantification)"],
      "strategic_priorities": ["string"],
      "negotiation_leverage": "low|medium|high",
      "risk_tolerance": "conservative|moderate|aggressive"
    },
    "legal": {
      "score": number (0-100),
      "concerns": ["string (legal risks and liability exposures)"],
      "advantages": ["string (protective mechanisms and safeguards)"],
      "enforcement_issues": ["string"],
      "regulatory_considerations": ["string"]
    },
    "individual": {
      "score": number (0-100),
      "concerns": ["string (privacy and data protection concerns)"],
      "advantages": ["string (individual rights and protections)"],
      "privacy_impact": "low|medium|high",
      "rights_protection": "weak|adequate|strong"
    }
  },
  "stakeholder_conflicts": [
    {
      "conflicting_interests": ["string"],
      "impact": "string",
      "resolution_strategies": ["string"]
    }
  ],
  "negotiation_opportunities": [
    {
      "area": "string",
      "potential_improvements": ["string"],
      "stakeholder_benefits": ["string"]
    }
  ],
  "recommendations": [
    {
      "id": "string",
      "description": "string",
      "severity": "critical|high|medium|low",
      "department": "legal|privacy|security|operations|finance|executive|product|commercial|other",
      "owner": "legal|operations|security|finance|privacy|executive|product|commercial|other",
      "due_timeline": "string",
      "category": "legal_obligation|risk_mitigation|commercial|operational|strategic|governance",
      "duplicate_of": "string | null",
      "next_step": "string"
    }
  ],
  "solution_alignment": {
    "solution_key": "string | null",
    "solution_title": "string | null",
    "confidence": number (0.5-1.0),
    "priorities": ["string"],
    "recommended_controls": ["string"],
    "gaps": ["string"],
    "notes": ["string"]
  }
}`,
    },
    full_summary: {
      systemPrompt: `You are a distinguished senior partner and contract strategist with 20+ years of experience in complex commercial transactions, M&A, and strategic partnerships. You provide executive-level analysis that combines legal expertise with business acumen and strategic insight. You excel at distilling complex agreements into actionable intelligence for C-level executives and board members. Your analysis influences major business decisions and strategic direction. Always respond in valid JSON format.${classificationContext}`,
      analysisPrompt: `Provide a comprehensive executive-level contract analysis using this advanced framework:

1. **Strategic Context**: Analyze the contract within broader business strategy
2. **Commercial Intelligence**: Extract key commercial terms and their implications
3. **Risk-Reward Analysis**: Balance risk exposure against business value
4. **Competitive Positioning**: Assess competitive advantages and disadvantages
5. **Operational Impact**: Evaluate implementation and management requirements
6. **Financial Modeling**: Analyze financial implications and cash flow impacts
7. **Performance Metrics**: Identify KPIs and success measures
8. **Exit Strategies**: Assess termination and transition mechanisms
9. **Relationship Management**: Consider long-term partnership dynamics
10. **Market Intelligence**: Apply industry knowledge and benchmarking

Provide executive summary suitable for board presentation with strategic recommendations and decision support.

${solutionFocusText}

**DEDUPLICATION RULES**:
- Ensure recommendations/action items are unique. If similar, merge or flag with "duplicate_of" referencing the primary "id".

**CLAUSE EXTRACTION REQUIREMENT**: Extract and categorize all major contract clauses:
- Obligations and deliverables
- Payment terms and pricing
- Performance metrics and SLAs
- Intellectual property provisions
- Confidentiality and non-disclosure
- Warranties and representations
- Limitation of liability
- Termination and renewal terms
- Governing law and jurisdiction
- Include the page or location reference for each clause and the supporting evidence excerpt.

Return JSON in this exact format:
{
  "score": number (60-100),
  "confidence": number (0.7-1.0),
  "pages": number,
  "critical_clauses": [
    {
      "clause_number": "string",
      "clause_title": "string",
      "clause_text": "string (key excerpt)",
      "category": "obligations|financial|ip|liability|termination|governance|other",
      "business_impact": "high|medium|low",
      "summary": "string (business implications in plain language)"
    }
  ],
  "executive_summary": "string (concise strategic overview for executives)",
  "business_impact": {
    "revenue_implications": "string",
    "cost_structure": "string",
    "operational_changes": "string",
    "strategic_value": "string"
  },
  "key_commercial_terms": [
    {
      "term": "string",
      "value": "string",
      "business_impact": "string",
      "benchmark": "favorable|market|unfavorable"
    }
  ],
  "critical_clauses": [
    {
      "clause": "string",
      "importance": "critical|high|medium|low",
      "business_impact": "string",
      "recommendation": "string",
      "page_reference": "string | null",
      "evidence_excerpt": "string",
      "negotiation_priority": "must_have|should_have|nice_to_have"
    }
  ],
  "risk_summary": {
    "overall_risk_level": "low|medium|high|critical",
    "key_risks": ["string"],
    "mitigation_strategies": ["string"],
    "risk_tolerance_required": "conservative|moderate|aggressive"
  },
  "commercial_analysis": {
    "deal_structure": "string",
    "value_proposition": "string",
    "competitive_position": "strong|neutral|weak",
    "market_conditions": "string"
  },
  "performance_framework": {
    "success_metrics": ["string"],
    "performance_standards": ["string"],
    "monitoring_requirements": ["string"]
  },
  "strategic_recommendations": [
    {
      "id": "string",
      "description": "string",
      "rationale": "string",
      "severity": "critical|high|medium|low",
      "department": "legal|privacy|security|operations|finance|executive|product|commercial|other",
      "owner": "legal|operations|security|finance|privacy|executive|product|commercial|other",
      "due_timeline": "immediate|30_days|90_days|ongoing|custom",
      "category": "strategic|commercial|operational|legal_obligation|risk_mitigation",
      "duplicate_of": "string | null",
      "next_step": "string"
    }
  ],
  "action_items": [
    {
      "id": "string",
      "description": "string",
      "severity": "critical|high|medium|low",
      "department": "legal|privacy|security|operations|finance|executive|product|commercial|other",
      "owner": "legal|operations|security|finance|privacy|executive|product|commercial|other",
      "due_timeline": "string",
      "category": "legal_obligation|risk_mitigation|commercial|operational|strategic|governance",
      "duplicate_of": "string | null",
      "next_step": "string"
    }
  ],
  "extracted_terms": {
    "contract_value": "string",
    "duration": "string",
    "payment_terms": "string",
    "governing_law": "string",
    "key_milestones": ["string"],
    "performance_metrics": ["string"],
    "termination_triggers": ["string"]
  },
  "implementation_roadmap": [
    {
      "phase": "string",
      "activities": ["string"],
      "timeline": "string",
      "resources_required": ["string"]
    }
  ],
  "solution_alignment": {
    "solution_key": "string | null",
    "solution_title": "string | null",
    "confidence": number (0.5-1.0),
    "priorities": ["string"],
    "recommended_controls": ["string"],
    "gaps": ["string"],
    "notes": ["string"]
  }
}`,
    },
  };

  // Use custom solution prompts if available, otherwise use base prompts
  if (customSolution?.prompts) {
    const customAnalysisPrompt = [
      customSolution.prompts.analysisPrompt ?? "",
      solutionFocusText.trim().length > 0 ? solutionFocusText.trim() : "",
    ]
      .filter((section) => section.length > 0)
      .join("\n\n");

    return {
      systemPrompt:
        (customSolution.prompts.systemPrompt ?? "") +
        classificationContext +
        " Always respond in valid JSON format.",
      analysisPrompt: customAnalysisPrompt,
    };
  }

  return (
    basePrompts[request.reviewType as keyof typeof basePrompts] ||
    basePrompts.full_summary
  );
}

function parseAIResponse(aiResponse: string, reviewType: string) {
  try {
    // Try to parse as JSON first
    return JSON.parse(aiResponse);
  } catch (error) {
    console.warn(
      "Failed to parse AI response as JSON, attempting to extract JSON",
    );

    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to extract valid JSON from AI response");
      }
    }

    // Throw error instead of falling back to mock response
    console.error("AI Response that failed to parse:", aiResponse);
    throw new Error(
      `AI response could not be parsed as JSON. This may indicate an issue with the AI model or prompt. Review type: ${reviewType}`,
    );
  }
}
