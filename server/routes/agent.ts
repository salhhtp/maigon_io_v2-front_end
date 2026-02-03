import crypto from "node:crypto";
import express from "express";
import fetch from "node-fetch";
import { getSupabaseAdminClient } from "../lib/supabaseAdmin";
import {
  buildPatchedHtmlDraft,
  buildPatchedHtmlFromString,
} from "../services/htmlDraftService";
import {
  getDraftSnapshotByKey,
  upsertDraftSnapshot,
} from "../services/draftSnapshotsRepository";
import type { DraftSnapshot } from "../services/draftSnapshotsRepository";
import {
  htmlToPlainText,
  stripDangerousHtml,
  textToHtml,
} from "../utils/htmlTransforms";
import type {
  AgentDraftRequest,
  AgentDraftResponse,
  AgentDraftSuggestion,
  AgentDraftEdit,
  AgentDraftJobStartResponse,
  AgentDraftJobStatusResponse,
  ClauseEditJobStartRequest,
  ClauseEditJobStartResponse,
  ClauseEditJobStatusResponse,
  StorageObjectRef,
} from "../../shared/api";
import { LEGAL_LANGUAGE_PROMPT_BLOCK } from "../../shared/legalLanguage";
import {
  createDraftJob,
  getDraftJobById,
  markDraftJobFailed,
  markDraftJobRunning,
  markDraftJobSucceeded,
} from "../services/draftJobsRepository";
import {
  createClauseEditJob,
  getClauseEditJobById,
  markClauseEditJobFailed,
  markClauseEditJobRunning,
  markClauseEditJobSucceeded,
  type ClauseEditPayload,
} from "../services/clauseEditJobsRepository";

interface ClientChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatRequest {
  contractId?: string | null;
  messages: ClientChatMessage[];
  model?: string | null;
  mode?: "clause_edit" | "general";
  context?: AgentContextPayload;
}

interface AgentContextPayload {
  contract?: {
    id?: string | null;
    title?: string | null;
    contractType?: string | null;
    classificationFallback?: boolean;
  };
  severitySnapshot?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    total?: number;
  };
  topDepartments?: Array<{ key: string; label: string; count: number }>;
  missingInformation?: string[];
  clauseEvidence?: ClauseEvidence[];
  recommendations?: SuggestionItem[];
  actionItems?: SuggestionItem[];
}

interface ClauseEvidence {
  clause?: string;
  clause_title?: string;
  clause_number?: string;
  clause_text?: string;
  evidence_excerpt?: string;
  page_reference?: string;
  recommendation?: string;
  importance?: string;
}

interface SuggestionItem {
  id: string;
  description: string;
  severity: string;
  department: string;
  owner?: string;
  dueTimeline?: string;
}

interface ProposedEdit {
  id: string;
  clauseReference?: string;
  changeType?: "modify" | "insert" | "remove" | string;
  originalText?: string | null;
  suggestedText: string;
  rationale: string;
  severity?: string;
  references?: string[];
}

interface AgentApiResponse {
  message: {
    role: "assistant";
    content: string;
  };
  proposedEdits: ProposedEdit[];
  provider: "openai" | "anthropic" | "heuristic";
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

class ProviderError extends Error {
  constructor(
    public provider: "openai" | "anthropic",
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
  }
}

class ComposeDraftError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

interface ComposeDraftOptions {
  requestId?: string;
  draftKeyOverride?: string | null;
  jobId?: string | null;
  allowCache?: boolean;
}

interface ComposeDraftResult {
  response: AgentDraftResponse;
  draftKey: string | null;
  snapshotId: string | null;
  provider: string | null;
  model: string | null;
}

export const agentRouter = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_AGENT_MODEL =
  process.env.OPENAI_AGENT_MODEL ?? "gpt-5";
const GPT5_FALLBACK_MODEL = "gpt-5";
const ANTHROPIC_AGENT_MODEL =
  process.env.ANTHROPIC_AGENT_MODEL ?? "claude-3-5-sonnet-20241022";
const FORCE_OPENAI_ONLY =
  (process.env.AGENT_FORCE_OPENAI_ONLY ?? "true").toLowerCase() === "true";
const ALLOW_ANTHROPIC =
  !FORCE_OPENAI_ONLY &&
  (process.env.AGENT_ALLOW_ANTHROPIC ?? "").toLowerCase() === "true";
const AI_TIMEOUT_MS = (() => {
  const value = Number(process.env.AI_PROVIDER_TIMEOUT_MS);
  if (Number.isFinite(value) && value > 0) return value;
  // Default to a generous timeout so background functions can finish
  return 120_000;
})();
const BACKGROUND_FUNCTION_NAME = "draft-compose-background";
const CLAUSE_EDIT_BACKGROUND_FUNCTION_NAME = "clause-edit-background";
const DEFAULT_FUNCTION_BASE =
  process.env.DEPLOY_URL ??
  process.env.URL ??
  process.env.SITE_URL ??
  process.env.PUBLIC_BASE_URL ??
  null;

const MAX_PROPOSED_EDITS = 5;
const CONTEXT_SNIPPET_RADIUS = 350;
const MAX_CONTRACT_TEXT_LENGTH = 120_000;
const MAX_CONTRACT_HTML_LENGTH = 180_000;
const CLAUSE_KEYWORDS = [
  "clause",
  "section",
  "article",
  "paragraph",
  "schedule",
  "annex",
  "provision",
  "term",
];

const isGpt5Model = (value: string) =>
  value.toLowerCase().includes("gpt-5");

const resolveOpenAiModel = (options?: {
  preferred?: string | null;
  forceGpt5?: boolean;
}) => {
  const preferred =
    typeof options?.preferred === "string" ? options.preferred.trim() : "";
  const forceGpt5 = options?.forceGpt5 === true;
  if (preferred && (!forceGpt5 || isGpt5Model(preferred))) {
    return preferred;
  }
  if (forceGpt5) {
    return isGpt5Model(OPENAI_AGENT_MODEL)
      ? OPENAI_AGENT_MODEL
      : GPT5_FALLBACK_MODEL;
  }
  return OPENAI_AGENT_MODEL;
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractClauseSnippets(
  contractContent: string | null,
  clauses?: ClauseEvidence[],
): Array<{ reference: string; snippet: string }> {
  if (!contractContent || !clauses || clauses.length === 0) {
    return [];
  }

  const lowerContent = contractContent.toLowerCase();
  const snippets: Array<{ reference: string; snippet: string }> = [];

  for (const clause of clauses) {
    const reference =
      clause.clause_title ||
      clause.clause ||
      clause.clause_number ||
      "Relevant clause";

    let snippet: string | null = null;

    if (clause.clause_text) {
      const target = clause.clause_text.trim();
      const index = lowerContent.indexOf(target.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - CONTEXT_SNIPPET_RADIUS);
        const end = Math.min(
          contractContent.length,
          index + target.length + CONTEXT_SNIPPET_RADIUS,
        );
        snippet = contractContent.slice(start, end).trim();
      }
    }

    if (!snippet && clause.clause_number) {
      const pattern = new RegExp(
        `(^|\\n)\\s*${escapeRegExp(clause.clause_number)}[^\\n]*`,
        "i",
      );
      const match = contractContent.match(pattern);
      if (match) {
        const idx = match.index ?? 0;
        const start = Math.max(0, idx - CONTEXT_SNIPPET_RADIUS);
        const end = Math.min(
          contractContent.length,
          idx + match[0].length + CONTEXT_SNIPPET_RADIUS,
        );
        snippet = contractContent.slice(start, end).trim();
      }
    }

    if (!snippet && clause.evidence_excerpt) {
      const target = clause.evidence_excerpt.trim();
      const index = lowerContent.indexOf(target.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - CONTEXT_SNIPPET_RADIUS);
        const end = Math.min(
          contractContent.length,
          index + target.length + CONTEXT_SNIPPET_RADIUS,
        );
        snippet = contractContent.slice(start, end).trim();
      }
    }

    if (snippet) {
      snippets.push({
        reference,
        snippet,
      });
    }

    if (snippets.length >= 8) {
      break;
    }
  }

  return snippets;
}

function truncateInput(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n<!-- truncated -->`;
}

function sanitizeTripleQuotes(value: string): string {
  return value.replace(/"""/g, '\\"""');
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseStorageObjectRef(value: unknown): StorageObjectRef | null {
  const record = toRecord(value);
  if (!record) return null;

  const bucket =
    typeof record.bucket === "string" ? record.bucket : null;
  const path = typeof record.path === "string" ? record.path : null;

  if (!bucket || !path) {
    return null;
  }

  return { bucket, path };
}

function hashText(value: string | null | undefined): string {
  return crypto.createHash("sha1").update(value ?? "").digest("hex");
}

function computeDraftKey(
  contractId: string,
  version: string | null,
  suggestions: AgentDraftSuggestion[],
  agentEdits: AgentDraftEdit[],
): string {
  const normalizedSuggestions = [...suggestions]
    .map((item) => item.id)
    .sort();

  const normalizedEdits = [...agentEdits]
    .map((edit) => ({
      id: edit.id ?? null,
      clauseReference: edit.clauseReference ?? null,
      changeType: edit.changeType ?? null,
      suggestedTextHash: hashText(edit.suggestedText),
      originalTextHash: hashText(edit.originalText),
    }))
    .sort((a, b) => {
      const left = a.id ?? a.clauseReference ?? "";
      const right = b.id ?? b.clauseReference ?? "";
      return left.localeCompare(right);
    });

  const payload = {
    contractId,
    version,
    suggestions: normalizedSuggestions,
    agentEdits: normalizedEdits,
  };

  return crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

function dedupeDraftEdits(edits: AgentDraftEdit[]): AgentDraftEdit[] {
  const seen = new Set<string>();
  const deduped: AgentDraftEdit[] = [];
  edits.forEach((edit) => {
    const key = JSON.stringify({
      clauseReference: (edit.clauseReference ?? "").toLowerCase(),
      changeType: (edit.changeType ?? "modify").toLowerCase(),
      originalText: (edit.originalText ?? "").trim(),
      suggestedText: (edit.suggestedText ?? "").trim(),
    });
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(edit);
  });
  return deduped;
}

function buildResponseFromSnapshot(
  snapshot: DraftSnapshot,
  context: { contractContent: string; contractHtml: string | undefined },
): AgentDraftResponse {
  const appliedChanges =
    snapshot.appliedChanges && snapshot.appliedChanges.length > 0
      ? snapshot.appliedChanges
      : undefined;

  const metadata = snapshot.metadata as Record<string, unknown>;
  const cacheSourceValue =
    metadata && typeof metadata.cacheSource === "string"
      ? metadata.cacheSource
      : undefined;
  const htmlSource =
    (cacheSourceValue as AgentDraftResponse["htmlSource"] | undefined) ??
    "cached";

  return {
    updatedContract: snapshot.plainText ?? context.contractContent,
    updatedHtml: snapshot.html ?? context.contractHtml ?? undefined,
    summary: snapshot.summary ?? undefined,
    appliedChanges,
    provider: snapshot.provider ?? null,
    model: snapshot.model ?? null,
    originalContract: context.contractContent,
    originalHtml: context.contractHtml ?? undefined,
    draftId: snapshot.id,
    assetRef: snapshot.assetRef ?? null,
    htmlSource,
    cacheStatus: "hit",
  };
}

function buildContextSummary(
  context: AgentContextPayload,
  clauseSnippets: Array<{ reference: string; snippet: string }>,
): string {
  const lines: string[] = [];

  if (context.contract?.contractType) {
    lines.push(
      `Contract type: ${context.contract.contractType.replace(/_/g, " ")}`,
    );
  }

  if (context.contract?.classificationFallback) {
    lines.push(
      "Classification fallback was used; ensure edits align with the intended template.",
    );
  }

  const snapshot = context.severitySnapshot;
  if (snapshot && typeof snapshot.total === "number" && snapshot.total > 0) {
    const parts: string[] = [];
    if (snapshot.critical) parts.push(`${snapshot.critical} critical`);
    if (snapshot.high) parts.push(`${snapshot.high} high`);
    if (snapshot.medium) parts.push(`${snapshot.medium} medium`);
    if (snapshot.low) parts.push(`${snapshot.low} low`);
    if (parts.length) {
      lines.push(`Priority findings: ${parts.join(", ")}`);
    }
  }

  if (context.topDepartments?.length) {
    const departments = context.topDepartments
      .map((dept) => `${dept.label} (${dept.count})`)
      .join(", ");
    lines.push(`Departments impacted: ${departments}`);
  }

  if (context.missingInformation?.length) {
    lines.push(
      `Missing information to address: ${context.missingInformation
        .slice(0, 5)
        .join(", ")}`,
    );
  }

  if (context.recommendations?.length || context.actionItems?.length) {
    const combined = [
      ...(context.recommendations ?? []),
      ...(context.actionItems ?? []),
    ]
      .slice(0, 6)
      .map((item) => `${item.description} [${item.severity}]`);
    if (combined.length) {
      lines.push(
        `Priority follow-ups: ${combined.join("; ")}`,
      );
    }
  }

  if (clauseSnippets.length) {
    lines.push("Relevant clause excerpts for reference:");
    clauseSnippets.slice(0, 6).forEach((clause, index) => {
      lines.push(
        `Clause ${index + 1}: ${clause.reference}\n${clause.snippet
          .replace(/\s+/g, " ")
          .slice(0, 600)}...`,
      );
    });
  }

  return lines.join("\n");
}

function buildJsonInstruction(): string {
  return `Respond ONLY with valid JSON using this schema:
{
  "message": {
    "role": "assistant",
    "content": "Plain language guidance for the user (no markdown code fences)"
  },
  "proposedEdits": [
    {
      "id": "string identifier",
      "clauseReference": "clause number or title",
      "changeType": "modify | insert | remove",
      "originalText": "existing text (if modifying/removing)",
      "suggestedText": "replacement or new text ready to paste",
      "rationale": "why this change matters",
      "severity": "critical | high | medium | low | info",
      "references": ["optional array of supporting sources or clause ids"]
    }
  ]
}
Rules:
- For MODIFY or REMOVE, copy the precise original language from the provided clause excerpt into originalText.
- For INSERT, set originalText to null and provide the full clause in suggestedText.
- Draft suggestedText as final contractual language (no placeholders).
- Limit proposedEdits to the most relevant ${MAX_PROPOSED_EDITS} changes.
Ensure proposedEdits is an array (empty if none).`;
}

function includesKnownReference(
  message: string,
  clauseSnippets: Array<{ reference: string; snippet: string }> = [],
  context?: AgentContextPayload,
): boolean {
  const lower = message.toLowerCase();
  if (CLAUSE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return true;
  }
  if (/\d/.test(lower)) {
    return true;
  }
  for (const clause of clauseSnippets) {
    const ref = clause.reference.toLowerCase();
    if (ref && lower.includes(ref)) {
      return true;
    }
  }
  if (context?.missingInformation) {
    for (const item of context.missingInformation) {
      if (lower.includes(item.toLowerCase())) {
        return true;
      }
    }
  }
  return false;
}

function isAmbiguousInstruction(
  message: string | undefined,
  clauseSnippets: Array<{ reference: string; snippet: string }> = [],
  context?: AgentContextPayload,
): boolean {
  if (!message) return true;
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return true;
  if (includesKnownReference(lower, clauseSnippets, context)) {
    return false;
  }
  if (lower.length >= 45) {
    // Longer instructions are likely meaningful even without explicit clause references
    return false;
  }
  return true;
}

function buildQuickSuggestions(
  context: AgentContextPayload,
  clauseSnippets: Array<{ reference: string; snippet: string }> = [],
): string[] {
  const suggestions: string[] = [];
  clauseSnippets.slice(0, 3).forEach((clause) => {
    suggestions.push(`Ask me to revise ${clause.reference}.`);
  });
  context.missingInformation?.slice(0, 3).forEach((item) => {
    suggestions.push(`Request an inserted clause covering "${item}".`);
  });
  const combined = [
    ...(context.recommendations ?? []),
    ...(context.actionItems ?? []),
  ]
    .slice(0, 3)
    .map((item) => item.description);
  combined.forEach((desc) => {
    suggestions.push(`Draft updates addressing: ${desc}.`);
  });
  return suggestions.slice(0, 5);
}

function normalizeAssistantOutput(raw: string): {
  content: string;
  proposedEdits: ProposedEdit[];
} {
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const messageContent =
      parsed?.message?.content && typeof parsed.message.content === "string"
        ? parsed.message.content
        : trimmed;

    const edits = Array.isArray(parsed?.proposedEdits)
      ? (parsed.proposedEdits as ProposedEdit[]).slice(0, MAX_PROPOSED_EDITS)
      : [];

    const sanitizedEdits = edits
      .filter(
        (edit) =>
          edit &&
          typeof edit === "object" &&
          typeof edit.suggestedText === "string" &&
          typeof edit.rationale === "string",
      )
      .map((edit, index) => ({
        id: edit.id || `edit-${index + 1}`,
        clauseReference: edit.clauseReference ?? null,
        changeType: edit.changeType ?? "modify",
        originalText: edit.originalText ?? null,
        suggestedText: edit.suggestedText,
        rationale: edit.rationale,
        severity: edit.severity ?? "info",
        references: Array.isArray(edit.references) ? edit.references : undefined,
      }));

    return {
      content: messageContent,
      proposedEdits: sanitizedEdits,
    };
  } catch {
    return {
      content: trimmed,
      proposedEdits: [],
    };
  }
}

function normalizeDraftResponse(
  raw: string,
  fallbackHtml?: string,
  fallbackText?: string,
): AgentDraftResponse {
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const candidateHtml =
      typeof parsed?.updatedHtml === "string"
        ? stripDangerousHtml(parsed.updatedHtml)
        : undefined;
    const updatedHtml =
      candidateHtml ?? stripDangerousHtml(fallbackHtml ?? undefined);

    const summary =
      typeof parsed?.summary === "string" ? parsed.summary : undefined;
    const appliedChanges = Array.isArray(parsed?.appliedChanges)
      ? parsed.appliedChanges.filter((item: unknown): item is string =>
          typeof item === "string" && item.trim().length > 0,
        )
      : undefined;

    const candidateText =
      typeof parsed?.updatedContract === "string"
        ? parsed.updatedContract
        : undefined;
    const fallbackPlain =
      updatedHtml
        ? htmlToPlainText(updatedHtml)
        : htmlToPlainText(fallbackHtml) ?? fallbackText ?? trimmed;
    const updatedContract =
      candidateText && candidateText.trim().length > 0
        ? candidateText
        : fallbackPlain ?? trimmed;

    return {
      updatedContract,
      updatedHtml,
      summary,
      appliedChanges,
    };
  } catch {
    return {
      updatedContract:
        htmlToPlainText(fallbackHtml) ?? fallbackText ?? trimmed,
      updatedHtml: stripDangerousHtml(fallbackHtml ?? undefined),
    };
  }
}

function isMissingPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "not present" ||
    normalized === "missing" ||
    normalized === "n/a" ||
    /\bnot\s+present\b/.test(normalized) ||
    /\bmissing\b/.test(normalized) ||
    /\bnot\s+found\b/.test(normalized)
  );
}

function stripBoundaryEllipses(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/^\s*(?:\.{3}|\u2026)\s*/g, "")
    .replace(/\s*(?:\.{3}|\u2026)\s*$/g, "")
    .trim();
}

function inferSuggestionChangeType(options: {
  proposedText?: string | null;
  previousText?: string | null;
  anchorText?: string | null;
  intent?: string | null;
}) {
  const proposedText = (options.proposedText ?? "").trim();
  const previousText = (options.previousText ?? "").trim();
  const anchorText = (options.anchorText ?? "").trim();
  const intent = (options.intent ?? "").toLowerCase();

  if (!proposedText) {
    return "remove";
  }

  if (intent.includes("remove") || intent.includes("delete")) {
    return "remove";
  }

  if (
    intent.includes("insert") ||
    intent.includes("add") ||
    intent.includes("include")
  ) {
    return "insert";
  }

  if (isMissingPlaceholder(previousText) || isMissingPlaceholder(anchorText)) {
    return "insert";
  }

  return "modify";
}

// Patterns that indicate signature blocks - insertions should go BEFORE these
const SIGNATURE_BLOCK_PATTERNS = [
  /^company\s*\d*\s*$/i,
  /^party\s*\d*\s*$/i,
  /^signature[s]?\s*[:.]?\s*$/i,
  /^in\s+witness\s+whereof/i,
  /^executed\s+as\s+of/i,
  /^by\s*:\s*_+/i,
  /^name\s*:\s*_+/i,
  /^title\s*:\s*_+/i,
  /^date\s*:\s*_+/i,
  /^authorized\s+signatory/i,
  /^\[?signature\]?$/i,
  /^_{5,}\s*$/,  // Signature lines
  /^for\s+and\s+on\s+behalf\s+of/i,
  /^duly\s+authorized/i,
];

// Comprehensive mapping of clause keywords to target sections
const CLAUSE_TO_SECTION_MAP: Array<{
  keywords: string[];
  targetSections: string[];
}> = [
  // Confidentiality-related clauses
  {
    keywords: ["marking", "notice", "marking and notice", "written notice"],
    targetSections: ["Confidential Information", "Definition", "1."],
  },
  {
    keywords: ["residual knowledge", "residual information", "residuals"],
    targetSections: ["Confidential Information", "Exceptions", "4."],
  },
  {
    keywords: ["use limitation", "need-to-know", "need to know", "permitted use"],
    targetSections: ["Confidentiality Undertakings", "Receiving Party", "3."],
  },
  {
    keywords: ["compelled disclosure", "required disclosure", "legal requirement"],
    targetSections: ["Exceptions", "4."],
  },
  // Remedies and enforcement
  {
    keywords: ["remedies", "injunctive relief", "specific performance", "equitable relief"],
    targetSections: ["Confidentiality Undertakings", "MISCELLANEOUS", "3."],
  },
  // Term and termination
  {
    keywords: ["term", "survival", "duration", "termination", "expiration"],
    targetSections: ["term and termination", "7.", "Term"],
  },
  // Liability
  {
    keywords: ["limitation of liability", "liability", "damages", "indemnification", "indemnify"],
    targetSections: ["MISCELLANEOUS", "9.", "Liability"],
  },
  // IP-related
  {
    keywords: ["intellectual property", "ip rights", "ownership", "no license", "patent", "copyright", "trademark"],
    targetSections: ["Intellectual Property", "No Binding Commitments", "2.", "5."],
  },
  // Export and compliance
  {
    keywords: ["export control", "export", "compliance", "regulatory"],
    targetSections: ["Export", "6.", "MISCELLANEOUS"],
  },
  // General/Miscellaneous
  {
    keywords: ["entire agreement", "amendment", "waiver", "severability", "assignment", "notices"],
    targetSections: ["MISCELLANEOUS", "9.", "General"],
  },
  // Dispute resolution
  {
    keywords: ["governing law", "dispute", "jurisdiction", "arbitration", "venue"],
    targetSections: ["GOVERNING LAW", "DISPUTES", "8."],
  },
];

function inferInsertionReference(options: {
  proposedText?: string | null;
  clauseId?: string | null;
  clauseTitle?: string | null;
  anchorText?: string | null;
}): string | null {
  if (options.clauseTitle && options.clauseTitle.trim()) {
    return options.clauseTitle.trim();
  }
  if (options.clauseId && options.clauseId.trim()) {
    return options.clauseId.trim();
  }
  const proposedText = (options.proposedText ?? "").trim();
  if (!proposedText) return null;

  const headingMatch = proposedText.match(/^([A-Za-z0-9 &/()-]{3,80})[:.]/);
  const heading = headingMatch?.[1]?.trim().toLowerCase() ?? "";
  const normalized = proposedText.toLowerCase();

  // Check against comprehensive clause-to-section mapping
  for (const mapping of CLAUSE_TO_SECTION_MAP) {
    const matches = mapping.keywords.some(
      (keyword) => heading.includes(keyword) || normalized.includes(keyword),
    );
    if (matches && mapping.targetSections.length > 0) {
      return mapping.targetSections[0];
    }
  }

  const anchorText = (options.anchorText ?? "").trim();
  if (anchorText && !isMissingPlaceholder(anchorText)) {
    return anchorText;
  }

  return null;
}

function isSignatureBlockLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return SIGNATURE_BLOCK_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function findSignatureBlockStart(lines: string[]): number {
  // Look for signature block indicators from the end of the document
  // We want to find where the main content ends and signatures begin
  let signatureStart = lines.length;

  // First pass: look for explicit signature markers
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i] ?? "";
    if (isSignatureBlockLine(line)) {
      signatureStart = i;
    } else if (signatureStart < lines.length) {
      // We found signature content and now hit non-signature content
      // Check if this might be a section heading before signatures
      const trimmed = line.trim();
      if (trimmed && !trimmed.match(/^\d+\.\s*$/)) {
        break;
      }
    }
  }

  // If we didn't find an explicit signature block, look for common patterns
  // like table structures at the end (often used for signature blocks)
  if (signatureStart === lines.length) {
    // Look for "Company 1" / "Company 2" style blocks at the end
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      const line = (lines[i] ?? "").trim().toLowerCase();
      if (
        line.match(/^company\s*[12]?\s*$/) ||
        line.match(/^party\s*[a-z]?\s*$/) ||
        line.match(/^_{10,}$/) ||  // Long underscores often for signature lines
        line === ""
      ) {
        // Check if we have multiple such lines in succession
        let consecutiveSignatureLines = 0;
        for (let j = i; j < Math.min(lines.length, i + 5); j++) {
          const checkLine = (lines[j] ?? "").trim();
          if (!checkLine || isSignatureBlockLine(checkLine) || checkLine.match(/^_{3,}$/)) {
            consecutiveSignatureLines++;
          }
        }
        if (consecutiveSignatureLines >= 2) {
          signatureStart = i;
          break;
        }
      }
    }
  }

  return signatureStart;
}

function applyEditsToPlainText(
  original: string,
  edits: AgentDraftEdit[],
): string {
  const normalizeDraftText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const isHeadingLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.length > 80) return false;
    if (/[.;:]$/.test(trimmed)) return false;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (!words.length) return false;
    const uppercase = words.filter((word) => word === word.toUpperCase());
    const titleCase = words.filter(
      (word) => word[0] && word[0] === word[0].toUpperCase(),
    );
    if (uppercase.length === words.length) return true;
    return titleCase.length / words.length >= 0.6;
  };
  const insertAfterParagraph = (
    text: string,
    matchIndex: number,
    matchLength: number,
    insertion: string,
  ) => {
    const afterMatch = text.slice(matchIndex + matchLength);
    const paragraphBreak = afterMatch.match(/\n\s*\n/);
    const insertPos = paragraphBreak?.index !== undefined
      ? matchIndex + matchLength + paragraphBreak.index + paragraphBreak[0].length
      : matchIndex + matchLength;
    return (
      text.slice(0, insertPos).replace(/\s*$/, "\n\n") +
      insertion +
      text.slice(insertPos)
    ).replace(/\n{3,}/g, "\n\n");
  };
  const insertAfterSection = (
    text: string,
    reference: string,
    insertion: string,
  ) => {
    const lines = text.split(/\r?\n/);
    const normalizedRef = normalizeDraftText(reference);
    if (!normalizedRef) return null;

    // Find the signature block start to avoid inserting after it
    const signatureStart = findSignatureBlockStart(lines);

    let headingIndex = -1;
    for (let i = 0; i < signatureStart; i += 1) {
      const lineText = normalizeDraftText(lines[i] ?? "");
      if (lineText && lineText.includes(normalizedRef)) {
        headingIndex = i;
        break;
      }
    }
    if (headingIndex < 0) return null;

    // Find end of section (next heading or signature block, whichever comes first)
    let endIndex = signatureStart;
    for (let i = headingIndex + 1; i < signatureStart; i += 1) {
      if (isHeadingLine(lines[i] ?? "")) {
        endIndex = i;
        break;
      }
    }
    const insertionLines = insertion.split(/\r?\n/);
    const updated = [
      ...lines.slice(0, endIndex),
      "",
      ...insertionLines,
      "",
      ...lines.slice(endIndex),
    ]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
    return updated;
  };

  // Try multiple target sections for a clause type
  const tryInsertWithFallbackSections = (
    text: string,
    clauseText: string,
    insertion: string,
  ): string | null => {
    const normalized = clauseText.toLowerCase();
    const headingMatch = clauseText.match(/^([A-Za-z0-9 &/()-]{3,80})[:.]/);
    const heading = headingMatch?.[1]?.trim().toLowerCase() ?? "";

    // Find matching clause type and try all its target sections
    for (const mapping of CLAUSE_TO_SECTION_MAP) {
      const matches = mapping.keywords.some(
        (keyword) => heading.includes(keyword) || normalized.includes(keyword),
      );
      if (matches) {
        for (const targetSection of mapping.targetSections) {
          const result = insertAfterSection(text, targetSection, insertion);
          if (result) return result;
        }
      }
    }
    return null;
  };

  // Insert before signature blocks as a last resort
  const insertBeforeSignatures = (text: string, insertion: string): string => {
    const lines = text.split(/\r?\n/);
    const signatureStart = findSignatureBlockStart(lines);
    const insertionLines = insertion.split(/\r?\n/);

    if (signatureStart < lines.length) {
      // Insert before the signature block
      const updated = [
        ...lines.slice(0, signatureStart),
        "",
        ...insertionLines,
        "",
        ...lines.slice(signatureStart),
      ]
        .join("\n")
        .replace(/\n{3,}/g, "\n\n");
      return updated;
    }

    // No signature block found, append at end
    return `${text.trim()}\n\n${insertion}`;
  };

  const sortPriority = (edit: AgentDraftEdit) => {
    const type = (edit.changeType ?? "modify").toLowerCase();
    if (type === "modify") return 0;
    if (type === "remove") return 1;
    if (type === "insert") return 2;
    return 3;
  };
  const sortedEdits = [...edits].sort((a, b) => {
    const priorityDelta = sortPriority(a) - sortPriority(b);
    if (priorityDelta !== 0) return priorityDelta;
    const lengthA = (a.originalText ?? "").length;
    const lengthB = (b.originalText ?? "").length;
    return lengthB - lengthA;
  });

  let output = original;

  for (const edit of sortedEdits) {
    const changeType = (edit.changeType || "modify").toLowerCase();
    const suggestion = (edit.suggestedText || "").trim();
    const originalText = (edit.originalText || "").trim();
    const escaped = originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flexibleWhitespace = escaped.replace(/\s+/g, "\\s+");
    const pattern = flexibleWhitespace
      ? new RegExp(flexibleWhitespace, "i")
      : null;

    if (changeType === "insert") {
      if (!suggestion) continue;
      if (normalizeDraftText(output).includes(normalizeDraftText(suggestion))) {
        continue;
      }
      if (pattern && pattern.test(output)) {
        const match = pattern.exec(output);
        if (match) {
          output = insertAfterParagraph(output, match.index, match[0].length, suggestion);
        }
        continue;
      }
      // Try explicit clause reference first
      if (edit.clauseReference) {
        const updated = insertAfterSection(output, edit.clauseReference, suggestion);
        if (updated) {
          output = updated;
          continue;
        }
      }
      // Try to infer target section from clause content
      const inferredResult = tryInsertWithFallbackSections(output, suggestion, suggestion);
      if (inferredResult) {
        output = inferredResult;
        continue;
      }
      // Last resort: insert before signature blocks instead of at the very end
      output = insertBeforeSignatures(output, suggestion);
      continue;
    }

    if (changeType === "remove") {
      if (!pattern || !originalText) continue;
      if (pattern.test(output)) {
        output = output.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
      }
      continue;
    }

    if (!suggestion || !originalText || !pattern) {
      continue;
    }

    if (pattern.test(output)) {
      output = output.replace(pattern, suggestion);
    }
  }

  return output;
}

function summarizeHeuristicResponse(
  context: AgentContextPayload,
  latestUserMessage: string | undefined,
  clauseSnippets: Array<{ reference: string; snippet: string }> = [],
): AgentApiResponse {
  const severity = context.severitySnapshot;
  const severityParts: string[] = [];
  if (severity?.critical) severityParts.push(`${severity.critical} critical`);
  if (severity?.high) severityParts.push(`${severity.high} high`);
  if (severity?.medium) severityParts.push(`${severity.medium} medium`);
  if (severity?.low) severityParts.push(`${severity.low} low`);

  const sections: string[] = [];
  sections.push(
    `I'll help you refine this ${
      context.contract?.contractType?.replace(/_/g, " ") ?? "contract"
    }.`,
  );
  if (context.contract?.classificationFallback) {
    sections.push(
      "Classification relied on heuristics, so we should double-check template alignment while editing.",
    );
  }
  if (severityParts.length) {
    sections.push(`Current risk profile: ${severityParts.join(", ")}.`);
  }
  if (context.topDepartments?.length) {
    sections.push(
      `Departments most impacted: ${context.topDepartments
        .map((dept) => `${dept.label} (${dept.count})`)
        .join(", ")}.`,
    );
  }
  if (context.missingInformation?.length) {
    sections.push(
      `Missing information to address: ${context.missingInformation.join(", ")}.`,
      );
  }
  if (latestUserMessage) {
    sections.push(
      `I will focus on your request: “${latestUserMessage}”. Provide clause numbers or text to get a tailored draft.`,
    );
  } else {
    sections.push(
      "Tell me which clause you’d like to revise or the provision you need to insert, and I'll craft the updated text.",
    );
  }

  const quickSuggestions = buildQuickSuggestions(context, clauseSnippets);
  if (quickSuggestions.length) {
    sections.push(
      `You can try:
${quickSuggestions.map((item) => `• ${item}`).join("\n")}`,
    );
  }

  return {
    message: {
      role: "assistant",
      content: sections.join("\n\n"),
    },
    proposedEdits: [],
    provider: "heuristic",
    model: "contextual-heuristic-v1",
  };
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms: number | null = AI_TIMEOUT_MS,
) {
  const resolvedTimeout =
    Number.isFinite(ms) && (ms as number) > 0 ? (ms as number) : null;
  if (!resolvedTimeout) {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), resolvedTimeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function callOpenAI(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  context?: { requestId?: string; route?: string; contractId?: string; draftKey?: string },
  modelOverride?: string,
  timeoutMs?: number | null,
): Promise<{
  output: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  if (!OPENAI_API_KEY) {
    throw new ProviderError(
      "openai",
      "OpenAI API key not configured",
      undefined,
      "missing_api_key",
    );
  }

  let response: Response;
  try {
    const logCtx = {
      requestId: context?.requestId,
      route: context?.route,
      contractId: context?.contractId,
      draftKey: context?.draftKey,
    };
    const resolvedModel = modelOverride ?? OPENAI_AGENT_MODEL;
    const resolvedTimeoutMs =
      timeoutMs === null ? null : timeoutMs ?? AI_TIMEOUT_MS;
    console.info("[agent] openai start", {
      ...logCtx,
      model: resolvedModel,
      timeoutMs: resolvedTimeoutMs,
      messages: messages.length,
    });
    const start = Date.now();
    response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          // Use provider default temperature to avoid unsupported overrides on newer models
          // temperature omitted,
          response_format: { type: "json_object" },
          max_completion_tokens: 2048,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        }),
      },
      resolvedTimeoutMs,
    );
    console.info("[agent] openai response", {
      ...logCtx,
      status: response.status,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      throw new ProviderError("openai", "OpenAI request timed out", 504);
    }
    console.error("[agent] openai error", {
      requestId: context?.requestId,
      route: context?.route,
      contractId: context?.contractId,
      draftKey: context?.draftKey,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const body = (await response.json()) as any;

  if (!response.ok) {
    const errorMessage =
      body?.error?.message ||
      `OpenAI request failed with status ${response.status}`;
    throw new ProviderError(
      "openai",
      errorMessage,
      response.status,
      body?.error?.code,
    );
  }

  const output =
    body?.choices?.[0]?.message?.content ??
    (() => {
      throw new ProviderError(
        "openai",
        "OpenAI response missing content",
        response.status,
      );
    })();

  return {
    output,
    model: body?.model ?? modelOverride ?? OPENAI_AGENT_MODEL,
    usage: body?.usage
      ? {
          inputTokens: body.usage.prompt_tokens,
          outputTokens: body.usage.completion_tokens,
        }
      : undefined,
  };
}

async function callAnthropic(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  context?: { requestId?: string; route?: string; contractId?: string; draftKey?: string },
): Promise<{
  output: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}> {
  if (!ANTHROPIC_API_KEY) {
    throw new ProviderError(
      "anthropic",
      "Anthropic API key not configured",
      undefined,
      "missing_api_key",
    );
  }

  const anthropicMessages = messages.map((message) => ({
    role: message.role,
    content: [{ type: "text", text: message.content }],
  }));

  let response: Response;
  try {
    const logCtx = {
      requestId: context?.requestId,
      route: context?.route,
      contractId: context?.contractId,
      draftKey: context?.draftKey,
    };
    console.info("[agent] anthropic start", {
      ...logCtx,
      model: ANTHROPIC_AGENT_MODEL,
      timeoutMs: AI_TIMEOUT_MS,
      messages: messages.length,
    });
    const start = Date.now();
    response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ANTHROPIC_AGENT_MODEL,
          max_tokens: 2048,
          max_completion_tokens: 2048,
          system: systemPrompt,
          messages: anthropicMessages,
        }),
      },
    );
    console.info("[agent] anthropic response", {
      ...logCtx,
      status: response.status,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      throw new ProviderError("anthropic", "Anthropic request timed out", 504);
    }
    console.error("[agent] anthropic error", {
      requestId: context?.requestId,
      route: context?.route,
      contractId: context?.contractId,
      draftKey: context?.draftKey,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const body = (await response.json()) as any;

  if (!response.ok) {
    const errorMessage =
      body?.error?.message ||
      `Anthropic request failed with status ${response.status}`;
    throw new ProviderError(
      "anthropic",
      errorMessage,
      response.status,
      body?.error?.type,
    );
  }

  const textOutput =
    body?.content?.[0]?.text ??
    (() => {
      throw new ProviderError(
        "anthropic",
        "Anthropic response missing content",
        response.status,
      );
    })();

  return {
    output: textOutput,
    model: body?.model ?? ANTHROPIC_AGENT_MODEL,
    usage: body?.usage
      ? {
          inputTokens: body.usage.input_tokens,
          outputTokens: body.usage.output_tokens,
        }
      : undefined,
  };
}

function shouldFallbackToAnthropic(error: unknown): boolean {
  if (!ALLOW_ANTHROPIC || !ANTHROPIC_API_KEY) {
    return false;
  }
  if (!(error instanceof ProviderError)) return false;
  if (error.provider !== "openai") return false;
  if (error.status === 504) return true;
  if (error.status === 429) return true;
  if (error.code === "insufficient_quota" || error.code === "rate_limit_exceeded")
    return true;
  return false;
}

function resolveFunctionBaseUrl(): string | null {
  if (DEFAULT_FUNCTION_BASE) {
    return DEFAULT_FUNCTION_BASE.replace(/\/$/, "");
  }
  if (process.env.NETLIFY_LOCAL === "true") {
    return "http://localhost:8888";
  }
  return null;
}

async function triggerBackgroundCompose(jobId: string): Promise<void> {
  const baseUrl = resolveFunctionBaseUrl();
  if (!baseUrl) {
    console.warn("[agent] Background compose trigger skipped (no base URL)", {
      jobId,
    });
    return;
  }
  const url = `${baseUrl}/.netlify/functions/${BACKGROUND_FUNCTION_NAME}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
  } catch (error) {
    console.warn("[agent] Failed to trigger background compose", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

agentRouter.post("/chat", async (req, res) => {
  const body = req.body as AgentChatRequest;
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const context = body.context ?? {};
  const latestUserMessage = [...messages]
    .reverse()
    .find((msg) => msg.role === "user")?.content;

  const supabase = getSupabaseAdminClient();
  let contractContent: string | null = null;
  let contractTitle: string | null = context.contract?.title ?? null;

  if (body.contractId) {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("content, title")
        .eq("id", body.contractId)
        .single();
      if (error) {
        console.warn("[agent] Failed to fetch contract content", error);
      } else {
        contractContent = data?.content ?? null;
        if (!contractTitle && data?.title) {
          contractTitle = data.title;
        }
      }
    } catch (error) {
      console.warn("[agent] Unexpected contract fetch error", error);
    }
  }

  const clauseSnippets = extractClauseSnippets(
    contractContent,
    context.clauseEvidence,
  );
  const contextSummary = buildContextSummary(context, clauseSnippets);

  if (
    latestUserMessage &&
    isAmbiguousInstruction(latestUserMessage, clauseSnippets, context)
  ) {
    const suggestions = buildQuickSuggestions(context, clauseSnippets);
    const suggestionBlock = suggestions.length
      ? `Here are some prompts you can try:\n${suggestions
          .map((item) => `• ${item}`)
          .join("\n")}`
      :
        "For example: \"Update clause 5.2 to extend the notice period to 45 days.\"";

    res.json({
      message: {
        role: "assistant",
        content: `To draft precise edits, I need a clause or section reference, or the exact text you'd like changed.\n\n${suggestionBlock}`,
      },
      proposedEdits: [],
      provider: "heuristic",
      model: "guardrail-heuristic-v1",
    } satisfies AgentApiResponse);
    return;
  }

  const systemPrompt = `You are Maigon's contract editing copilot. You assist lawyers and compliance officers in preparing precise contract edits based on analytical findings. Follow these principles:
- Reference the contract context provided below.
- Use the supplied clause excerpts and recommendations when crafting edits.
- Align changes with the contract type and severity indicators.
- If the user requests an edit that lacks context, ask clarifying questions.
- ${LEGAL_LANGUAGE_PROMPT_BLOCK}
- ${buildJsonInstruction()}

Contract Context:
${contextSummary || "No additional context provided."}

Contract title: ${contractTitle ?? context.contract?.title ?? "Unknown"}.`;

  const instructions = buildJsonInstruction();

  const conversationMessages = messages
    .filter((msg): msg is ClientChatMessage => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  // Ensure the final user message carries the JSON instruction and context hints.
  const lastUserIndex = (() => {
    for (let i = conversationMessages.length - 1; i >= 0; i -= 1) {
      if (conversationMessages[i].role === "user") return i;
    }
    return -1;
  })();

  if (lastUserIndex !== -1) {
    const baseContent = conversationMessages[lastUserIndex].content;
    const clauseSummary = clauseSnippets
      .slice(0, 6)
      .map(
        (clause, idx) =>
          `Clause ${idx + 1}: ${clause.reference}\n${clause.snippet}`,
      )
      .join("\n\n");

    const appendedContext = [
      baseContent,
      "",
      clauseSummary ? `Relevant clause excerpts:\n${clauseSummary}` : "",
      instructions,
    ]
      .filter(Boolean)
      .join("\n\n");

    conversationMessages[lastUserIndex] = {
      role: "user",
      content: appendedContext,
    };
  } else {
    conversationMessages.push({
      role: "user",
      content: `${latestUserMessage ?? "Provide contract editing guidance."}\n\n${instructions}`,
    });
  }

  const forceGpt5 = body?.mode === "clause_edit";
  const openAiModel = resolveOpenAiModel({
    preferred: body?.model ?? null,
    forceGpt5,
  });
  const openAiTimeoutMs = forceGpt5 ? null : AI_TIMEOUT_MS;

  try {
    let provider: AgentApiResponse["provider"] = "openai";
    let model = openAiModel;
    let usage: AgentApiResponse["usage"] | undefined;

    let aiOutput: string;
    try {
      const result = await callOpenAI(
        systemPrompt,
        conversationMessages,
        undefined,
        openAiModel,
        openAiTimeoutMs,
      );
      aiOutput = result.output;
      model = result.model;
      usage = result.usage;
    } catch (error) {
      if (
        !forceGpt5 &&
        ALLOW_ANTHROPIC &&
        !!ANTHROPIC_API_KEY &&
        shouldFallbackToAnthropic(error)
      ) {
        console.warn(
          "[agent] Falling back to Anthropic due to OpenAI error:",
          (error as Error).message,
        );
        provider = "anthropic";
        const result = await callAnthropic(systemPrompt, conversationMessages);
        aiOutput = result.output;
        model = result.model;
        usage = result.usage;
      } else {
        throw error;
      }
    }

    const normalized = normalizeAssistantOutput(aiOutput);
    res.json({
      message: {
        role: "assistant",
        content: normalized.content,
      },
      proposedEdits: normalized.proposedEdits,
      provider,
      model,
      usage,
    } satisfies AgentApiResponse);
  } catch (error) {
    if (forceGpt5) {
      const message =
        error instanceof Error ? error.message : "AI edit failed.";
      res.status(502).json({ error: message });
      return;
    }
    console.error("[agent] AI failure, using heuristic response", error);
    const fallback = summarizeHeuristicResponse(
      context,
      latestUserMessage,
      clauseSnippets,
    );
    res.json(fallback satisfies AgentApiResponse);
  }
});

async function composeDraft(
  body: AgentDraftRequest,
  options: ComposeDraftOptions = {},
): Promise<ComposeDraftResult> {
  if (!body?.contractId) {
    throw new ComposeDraftError("contractId is required", 400);
  }

  const suggestions = Array.isArray(body.suggestions)
    ? body.suggestions.filter(
        (item): item is AgentDraftSuggestion =>
          item !== null && typeof item === "object" && typeof item.id === "string",
      )
    : [];

  const agentEdits = Array.isArray(body.agentEdits)
    ? body.agentEdits.filter(
        (item): item is AgentDraftEdit =>
          item !== null && typeof item === "object" && typeof item.suggestedText === "string",
      )
    : [];

  const suggestionEdits: AgentDraftEdit[] = suggestions
    .map((item) => {
      const proposed = item.proposedEdit;
      if (!proposed) return null;
      const suggestedText = stripBoundaryEllipses(
        proposed.updatedText ??
          proposed.proposedText ??
          proposed.anchorText ??
          "",
      );
      if (!suggestedText.trim()) {
        return null;
      }
      const changeType = inferSuggestionChangeType({
        proposedText: proposed.updatedText ?? proposed.proposedText ?? null,
        previousText: proposed.previousText ?? null,
        anchorText: proposed.anchorText ?? null,
      });
      const inferredInsertionReference =
        changeType === "insert"
          ? inferInsertionReference({
              proposedText: proposed.updatedText ?? proposed.proposedText ?? null,
              clauseId: proposed.clauseId ?? null,
              clauseTitle: proposed.clauseTitle ?? null,
              anchorText: proposed.anchorText ?? null,
            })
          : null;
      const anchorIsPlaceholder = isMissingPlaceholder(
        proposed.previousText ?? proposed.anchorText ?? "",
      );
      const clauseReference =
        changeType === "insert"
          ? proposed.clauseTitle ??
            proposed.clauseId ??
            inferredInsertionReference ??
            (anchorIsPlaceholder ? null : proposed.anchorText) ??
            null
          : proposed.clauseTitle ??
            proposed.clauseId ??
            proposed.anchorText ??
            null;
      const originalText =
        changeType === "insert" && anchorIsPlaceholder
          ? null
          : stripBoundaryEllipses(
              proposed.previousText ?? proposed.anchorText ?? null,
            ) || null;
      return {
        id: item.id,
        clauseReference,
        changeType,
        originalText,
        suggestedText,
        rationale: item.description,
      } satisfies AgentDraftEdit;
    })
    .filter((edit): edit is AgentDraftEdit => Boolean(edit));

  const combinedEdits = [...agentEdits, ...suggestionEdits];
  const draftEdits = dedupeDraftEdits(combinedEdits);
  const supabase = getSupabaseAdminClient();

  console.info("[agent] compose request", {
    contractId: body.contractId,
    suggestions: suggestions.length,
    agentEdits: agentEdits.length,
    jobId: options.jobId,
  });

  const { data, error } = await supabase
    .from("contracts")
    .select("content, content_html, title, metadata, updated_at")
    .eq("id", body.contractId)
    .single();

  if (error) {
    throw new ComposeDraftError("Contract not found", 404);
  }

  const contractContent =
    typeof data?.content === "string" ? data.content : null;
  if (!contractContent) {
    throw new ComposeDraftError("Contract content unavailable", 404);
  }

  const contractHtmlRaw =
    typeof data?.content_html === "string" ? data.content_html : null;
  const contractHtml = stripDangerousHtml(contractHtmlRaw);
  const contractTitle = data?.title ?? null;
  const metadataRecord = toRecord(data?.metadata);
  const ingestionAssets = metadataRecord
    ? toRecord(
        metadataRecord.ingestionAssets ??
          (metadataRecord as Record<string, unknown>).ingestion_assets,
      )
    : null;
  const htmlPackageRef = ingestionAssets
    ? parseStorageObjectRef(
        ingestionAssets.htmlPackage ?? ingestionAssets.html_package,
      )
    : null;
  const contractUpdatedAt =
    typeof data?.updated_at === "string" ? data.updated_at : null;
  const draftKey =
    options.draftKeyOverride ??
    computeDraftKey(body.contractId, contractUpdatedAt, suggestions, agentEdits);

  const cachedDraft =
    options.allowCache === false
      ? null
      : await getDraftSnapshotByKey(body.contractId, draftKey);
  const cachedMatchCount = Array.isArray(cachedDraft?.metadata?.matchedEdits)
    ? cachedDraft?.metadata?.matchedEdits.length
    : 0;
  const shouldBypassCache =
    !!cachedDraft && combinedEdits.length > 0 && cachedMatchCount === 0;

  if (cachedDraft && !shouldBypassCache) {
    const cachedResponse = buildResponseFromSnapshot(cachedDraft, {
      contractContent,
      contractHtml: contractHtml ?? undefined,
    });
    return {
      response: cachedResponse,
      draftKey,
      snapshotId: cachedDraft.id,
      provider: cachedResponse.provider ?? null,
      model: cachedResponse.model ?? null,
    };
  }

  const trimmedContract =
    contractContent.length > MAX_CONTRACT_TEXT_LENGTH
      ? contractContent.slice(0, MAX_CONTRACT_TEXT_LENGTH)
      : contractContent;
  const baseHtml = contractHtml ?? textToHtml(contractContent);
  const trimmedHtml = baseHtml
    ? truncateInput(baseHtml, MAX_CONTRACT_HTML_LENGTH)
    : null;

  const htmlContext = trimmedHtml
    ? `Base contract HTML template (modify this markup directly; preserve all structure, numbering, and styling):\n<contract_html>\n${trimmedHtml}\n</contract_html>`
    : "";

  const textContext = trimmedContract
    ? `Plain text reference for clause lookup (do not reformat this; it is only for context):\n<contract_text>\n${trimmedContract}\n</contract_text>`
    : "";

  const suggestionBlock = suggestions.length
    ? suggestions
        .map((item, index) => {
          const parts: string[] = [`${index + 1}. ${item.description}`];
          if (item.severity) {
            parts.push(`Severity: ${item.severity}`);
          }
          if (item.department) {
            parts.push(`Department: ${item.department}`);
          }
          if (item.owner) {
            parts.push(`Owner: ${item.owner}`);
          }
          if (item.dueTimeline && item.dueTimeline !== "TBD") {
            parts.push(`Timeline: ${item.dueTimeline}`);
          }
          if (item.proposedEdit?.anchorText && item.proposedEdit?.proposedText) {
            if (item.proposedEdit.clauseTitle) {
              parts.push(`Clause: ${item.proposedEdit.clauseTitle}`);
            }
            if (item.proposedEdit.clauseId) {
              parts.push(`Clause ID: ${item.proposedEdit.clauseId}`);
            }
            const originalClause = sanitizeTripleQuotes(
              truncateInput(
                stripBoundaryEllipses(
                  item.proposedEdit.previousText ??
                    item.proposedEdit.anchorText,
                ),
                2_000,
              ),
            );
            const updatedClause = sanitizeTripleQuotes(
              truncateInput(
                stripBoundaryEllipses(
                  item.proposedEdit.updatedText ??
                    item.proposedEdit.proposedText,
                ),
                2_000,
              ),
            );
            parts.push(`Original clause snippet:\n"""${originalClause}"""`);
            parts.push(`Updated clause text:\n"""${updatedClause}"""`);
          }
          return parts.join(" | ");
        })
        .join("\n")
    : "None selected. Focus on the explicit clause edits.";

  const editsBlock = agentEdits.length
    ? agentEdits
        .map((edit, index) => {
          const lines = [
            `${index + 1}. Clause reference: ${edit.clauseReference ?? "Unspecified"}`,
            `Change type: ${edit.changeType ?? "modify"}`,
            edit.originalText
              ? `Original text: ${edit.originalText}`
              : "Original text not provided.",
            `Replacement text: ${edit.suggestedText}`,
          ];
          if (edit.rationale) {
            lines.push(`Rationale: ${edit.rationale}`);
          }
          return lines.join("\n");
        })
        .join("\n\n")
    : "No direct agent edits provided.";

  const systemPrompt =
    `You are Maigon's contract rewriting assistant. Integrate the provided review directives into the base contract while preserving every numbering sequence, heading, table, and styling cue.` +
    ` Use the supplied HTML template as the source of truth—edit only the clauses that require changes and reuse all existing markup for unchanged sections.` +
    ` When multiple edits target the same clause, merge them into a single coherent clause update and keep all unrelated text intact.` +
    ` Only introduce new clauses when explicitly required by a suggestion. ${LEGAL_LANGUAGE_PROMPT_BLOCK} Always return valid JSON matching the provided schema.`;

  const promptSections = [
    `Document title: "${contractTitle ?? "Contract"}"`,
    htmlContext,
    textContext,
    "Apply these review suggestions:",
    suggestionBlock,
    "Explicit agent edits to merge verbatim:",
    editsBlock,
    `Return ONLY JSON using this schema:
{
  "updatedHtml": "full updated contract HTML template matching the original structure",
  "updatedContract": "same contract content rendered as plain text (no HTML tags)",
  "summary": "3-4 sentence overview of the applied changes",
  "appliedChanges": ["bullet items summarising each change"]
}`,
  ];

  const userPrompt = promptSections
    .filter((section) => typeof section === "string" && section.trim().length > 0)
    .join("\n\n");

  const messages = [{ role: "user" as const, content: userPrompt }];
  console.info("[agent] compose prompt sizes", {
    promptChars: userPrompt.length,
    contractTextChars: trimmedContract?.length ?? 0,
    contractHtmlChars: trimmedHtml?.length ?? 0,
  });

  const requestId = options.requestId ?? crypto.randomUUID();
  const logCtx = {
    requestId,
    contractId: body.contractId,
    draftKey,
    jobId: options.jobId,
  };
  const allowAnthropic = ALLOW_ANTHROPIC && !!ANTHROPIC_API_KEY;
  console.info("[agent] compose provider selection", {
    ...logCtx,
    forceOpenAI: FORCE_OPENAI_ONLY,
    allowAnthropic,
  });

  let provider: AgentDraftResponse["provider"] = "openai";
  let model = OPENAI_AGENT_MODEL;
  let output: string;

  try {
    const result = await callOpenAI(systemPrompt, messages, {
      ...logCtx,
      route: "compose",
    });
    output = result.output;
    model = result.model;
  } catch (error) {
    if (allowAnthropic && shouldFallbackToAnthropic(error)) {
      provider = "anthropic";
      const result = await callAnthropic(systemPrompt, messages, {
        ...logCtx,
        route: "compose",
      });
      output = result.output;
      model = result.model;
    } else {
      throw error;
    }
  }

  const normalized = normalizeDraftResponse(
    output,
    baseHtml ?? undefined,
    contractContent,
  );

  const syntheticPlainText =
    normalized.updatedContract && normalized.updatedContract.trim().length > 0
      ? normalized.updatedContract
      : contractContent;

  const updatedPlainText =
    syntheticPlainText === contractContent && draftEdits.length > 0
      ? applyEditsToPlainText(contractContent, draftEdits)
      : syntheticPlainText;

  let htmlSource: AgentDraftResponse["htmlSource"] | undefined =
    normalized.updatedHtml
      ? "llm"
      : baseHtml
        ? "original"
        : undefined;
  let patchedResult: Awaited<ReturnType<typeof buildPatchedHtmlDraft>> | null =
    null;
  let shouldUsePatched = false;
  const totalDraftEdits = draftEdits.length;
  const hasLlmOutput = Boolean(normalized.updatedHtml || normalized.updatedContract);
  const normalizedOriginal = contractContent.replace(/\s+/g, " ").trim();
  const normalizedLlm = (normalized.updatedContract ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const llmChanged = normalizedLlm.length > 0 && normalizedLlm !== normalizedOriginal;

  if (htmlPackageRef && (combinedEdits.length > 0 || updatedPlainText)) {
    try {
      patchedResult = await buildPatchedHtmlDraft({
        contractId: body.contractId,
        draftKey,
        htmlPackage: htmlPackageRef,
        agentEdits: draftEdits,
        updatedPlainText,
      });
    } catch (patchError) {
      console.warn("[agent] Failed to patch HTML package", {
        contractId: body.contractId,
        error:
          patchError instanceof Error ? patchError.message : String(patchError),
      });
    }
  }

  if (
    !patchedResult &&
    baseHtml &&
    (draftEdits.length > 0 || updatedPlainText)
  ) {
    const inMemoryPatch = buildPatchedHtmlFromString(
      baseHtml,
      draftEdits,
      updatedPlainText,
    );
    if (inMemoryPatch) {
      patchedResult = inMemoryPatch;
    }
  }

  if (patchedResult) {
    const normalizedPatched = (patchedResult.plainText ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const patchedHasMatches = (patchedResult.matchedEdits ?? []).length > 0;
    const patchedHasChanges =
      normalizedPatched.length > 0 && normalizedPatched !== normalizedOriginal;
    const matchedCount = patchedResult.matchedEdits?.length ?? 0;
    const allEditsMatched =
      totalDraftEdits > 0 && matchedCount >= totalDraftEdits;
    shouldUsePatched =
      allEditsMatched ||
      ((!hasLlmOutput || !llmChanged) && (patchedHasMatches || patchedHasChanges));
    if (shouldUsePatched) {
      htmlSource = "patched";
    }
  }

  const updatedHtml =
    (shouldUsePatched ? patchedResult?.html : null) ??
    normalized.updatedHtml ??
    baseHtml ??
    undefined;
  const updatedContractText =
    (shouldUsePatched ? patchedResult?.plainText : null) ??
    updatedPlainText ??
    contractContent;

  const snapshot = await upsertDraftSnapshot({
    contractId: body.contractId,
    draftKey,
    html: updatedHtml ?? null,
    plainText: updatedContractText ?? null,
    summary: normalized.summary ?? null,
    appliedChanges: normalized.appliedChanges ?? [],
    assetRef: shouldUsePatched ? patchedResult?.assetRef ?? null : null,
    provider,
    model,
    metadata: {
      suggestionIds: suggestions.map((item) => item.id),
      cacheSource: htmlSource ?? "fallback",
      matchedEdits: shouldUsePatched ? patchedResult?.matchedEdits ?? [] : [],
      unmatchedEdits: shouldUsePatched ? patchedResult?.unmatchedEdits ?? [] : [],
    },
  });

  const response: AgentDraftResponse = {
    updatedContract: updatedContractText ?? contractContent,
    updatedHtml: updatedHtml ?? undefined,
    summary: normalized.summary,
    appliedChanges:
      normalized.appliedChanges && normalized.appliedChanges.length > 0
        ? normalized.appliedChanges
        : undefined,
    provider,
    model,
    originalContract: contractContent,
    originalHtml: baseHtml ?? undefined,
    draftId: snapshot?.id ?? null,
    assetRef:
      snapshot?.assetRef ??
      (shouldUsePatched ? patchedResult?.assetRef ?? null : null),
    htmlSource,
    cacheStatus: "miss",
  };

  return {
    response,
    draftKey,
    snapshotId: snapshot?.id ?? null,
    provider,
    model,
  };
}

agentRouter.post("/compose", async (req, res) => {
  const body = req.body as AgentDraftRequest;
  try {
    const result = await composeDraft(body, { requestId: crypto.randomUUID() });
    res.json(result.response);
  } catch (error) {
    console.error("[agent] Compose endpoint error", error);
    res.status(
      error instanceof ComposeDraftError && error.status ? error.status : 500,
    ).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to prepare contract draft",
    });
  }
});

agentRouter.post("/compose/start", async (req, res) => {
  const body = req.body as AgentDraftRequest;
  if (!body?.contractId) {
    res.status(400).json({ error: "contractId is required" });
    return;
  }

  try {
    const job = await createDraftJob({
      contractId: body.contractId,
      payload: body,
      metadata: {
        suggestionCount: Array.isArray(body.suggestions)
          ? body.suggestions.length
          : 0,
        agentEditCount: Array.isArray(body.agentEdits)
          ? body.agentEdits.length
          : 0,
      },
    });

    const hasBackgroundBase = resolveFunctionBaseUrl();
    if (hasBackgroundBase) {
      triggerBackgroundCompose(job.id).catch(() => {
        // Fire-and-forget; errors are logged inside triggerBackgroundCompose
      });
    } else {
      processDraftJob(job.id).catch((error) => {
        console.error("[agent] Inline compose job failed", {
          jobId: job.id,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    const response: AgentDraftJobStartResponse = {
      jobId: job.id,
      status: job.status,
      draftKey: job.draftKey,
      contractId: job.contractId,
    };

    res.status(202).json(response);
  } catch (error) {
    console.error("[agent] Failed to start compose job", error);
    res.status(500).json({ error: "Failed to queue draft generation" });
  }
});

agentRouter.get("/compose/status/:jobId", async (req, res) => {
  const jobId = req.params.jobId;
  if (!jobId) {
    res.status(400).json({ error: "jobId is required" });
    return;
  }

  try {
    const job = await getDraftJobById(jobId);
    if (!job) {
      res.status(404).json({ error: "Draft job not found" });
      return;
    }

    const payload: AgentDraftJobStatusResponse = {
      jobId: job.id,
      status: job.status,
      draftKey: job.draftKey,
      contractId: job.contractId,
      result: job.result ?? undefined,
      updatedAt: job.updatedAt,
    };

    if (job.status === "failed") {
      payload.error = job.error ?? "Draft generation failed";
    }

    res.json(payload);
  } catch (error) {
    console.error("[agent] Failed to fetch compose job status", error);
    res.status(500).json({ error: "Unable to fetch job status" });
  }
});

export async function processDraftJob(jobId: string): Promise<void> {
  const job = await getDraftJobById(jobId);
  if (!job) {
    throw new Error("Draft job not found");
  }

  if (job.status === "running") {
    return;
  }

  if (job.status === "succeeded" || job.status === "failed") {
    return;
  }

  if (!job.payload) {
    await markDraftJobFailed(job.id, "Job payload missing");
    throw new Error("Draft job payload missing");
  }

  await markDraftJobRunning(job.id);

  try {
    const result = await composeDraft(job.payload, {
      requestId: job.id,
      draftKeyOverride: job.draftKey,
      jobId: job.id,
    });

    await markDraftJobSucceeded({
      id: job.id,
      draftKey: result.draftKey,
      resultSnapshotId: result.snapshotId,
      result: result.response,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markDraftJobFailed(job.id, message);
    throw error;
  }
}

async function triggerBackgroundClauseEdit(jobId: string): Promise<void> {
  const baseUrl = resolveFunctionBaseUrl();
  if (!baseUrl) {
    console.warn("[agent] Background clause edit trigger skipped (no base URL)", {
      jobId,
    });
    return;
  }
  const url = `${baseUrl}/.netlify/functions/${CLAUSE_EDIT_BACKGROUND_FUNCTION_NAME}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
  } catch (error) {
    console.warn("[agent] Failed to trigger background clause edit", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function processClauseEditJob(jobId: string): Promise<void> {
  const job = await getClauseEditJobById(jobId);
  if (!job) {
    throw new Error("Clause edit job not found");
  }

  if (job.status === "running") {
    return;
  }

  if (job.status === "succeeded" || job.status === "failed") {
    return;
  }

  if (!job.payload) {
    await markClauseEditJobFailed(job.id, "Job payload missing");
    throw new Error("Clause edit job payload missing");
  }

  await markClauseEditJobRunning(job.id);

  try {
    const payload = job.payload;

    const supabase = getSupabaseAdminClient();
    let contractContent: string | null = null;
    let contractTitle: string | null = payload.context.contract.title;

    if (payload.contractId) {
      try {
        const { data, error } = await supabase
          .from("contracts")
          .select("content, title")
          .eq("id", payload.contractId)
          .single();
        if (error) {
          console.warn("[agent] Failed to fetch contract content for clause edit", error);
        } else {
          contractContent = data?.content ?? null;
          if (!contractTitle && data?.title) {
            contractTitle = data.title;
          }
        }
      } catch (error) {
        console.warn("[agent] Unexpected contract fetch error", error);
      }
    }

    const clauseSnippets = extractClauseSnippets(contractContent, payload.clauseEvidence);

    const instructions = [
      "Rewrite the updated clause below based on the reviewer instruction.",
      "Return a single proposed edit with suggestedText containing the full revised clause.",
      "Use final contractual language only (no analysis or commentary).",
    ].join(" ");

    const userContent = [
      instructions,
      `Reviewer instruction: ${payload.prompt}`,
      payload.clauseTitle ? `Clause title: ${payload.clauseTitle}` : null,
      "Current updated clause:",
      payload.updatedText,
      payload.originalText ? "Original clause excerpt:" : null,
      payload.originalText || null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const clauseSummary = clauseSnippets
      .slice(0, 6)
      .map(
        (clause, idx) =>
          `Clause ${idx + 1}: ${clause.reference}\n${clause.snippet}`,
      )
      .join("\n\n");

    const jsonInstruction = buildJsonInstruction();

    const fullUserContent = [
      userContent,
      "",
      clauseSummary ? `Relevant clause excerpts:\n${clauseSummary}` : "",
      jsonInstruction,
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `You are Maigon's contract editing copilot. You assist lawyers and compliance officers in preparing precise contract edits based on analytical findings. Follow these principles:
- Reference the contract context provided below.
- Use the supplied clause excerpts and recommendations when crafting edits.
- Align changes with the contract type and severity indicators.
- If the user requests an edit that lacks context, ask clarifying questions.
- ${LEGAL_LANGUAGE_PROMPT_BLOCK}
- ${jsonInstruction}

Contract title: ${contractTitle ?? "Unknown"}.`;

    const conversationMessages = [
      { role: "user" as const, content: fullUserContent },
    ];

    const openAiModel = resolveOpenAiModel({
      preferred: "gpt-5",
      forceGpt5: true,
    });

    const result = await callOpenAI(
      systemPrompt,
      conversationMessages,
      { requestId: job.id, contractId: payload.contractId },
      openAiModel,
      null, // No timeout - background function has extended timeout
    );

    const normalized = normalizeAssistantOutput(result.output);
    const suggestedText =
      normalized.proposedEdits.find(
        (edit) => typeof edit.suggestedText === "string",
      )?.suggestedText ?? null;

    if (!suggestedText || !suggestedText.trim()) {
      const fallbackMessage = normalized.content?.trim();
      throw new Error(fallbackMessage || "AI did not return a revised clause.");
    }

    await markClauseEditJobSucceeded({
      id: job.id,
      result: {
        suggestedText: suggestedText.trim(),
        prompt: payload.prompt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markClauseEditJobFailed(job.id, message);
    throw error;
  }
}

agentRouter.post("/clause-edit/start", async (req, res) => {
  const body = req.body as ClauseEditJobStartRequest;
  if (!body?.contractId) {
    res.status(400).json({ error: "contractId is required" });
    return;
  }
  if (!body?.itemId) {
    res.status(400).json({ error: "itemId is required" });
    return;
  }
  if (!body?.prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const payload: ClauseEditPayload = {
      jobType: "clause_edit",
      contractId: body.contractId,
      itemId: body.itemId,
      prompt: body.prompt.trim(),
      updatedText: body.updatedText ?? "",
      originalText: body.originalText ?? "",
      clauseTitle: body.clauseTitle ?? null,
      clauseEvidence: body.clauseEvidence ?? [],
      context: body.context ?? {
        contract: {
          id: body.contractId,
          title: null,
          contractType: null,
          classificationFallback: false,
        },
      },
    };

    const job = await createClauseEditJob({
      contractId: body.contractId,
      payload,
      metadata: {
        itemId: body.itemId,
      },
    });

    const hasBackgroundBase = resolveFunctionBaseUrl();
    if (hasBackgroundBase) {
      triggerBackgroundClauseEdit(job.id).catch(() => {
        // Fire-and-forget; errors are logged inside triggerBackgroundClauseEdit
      });
    } else {
      processClauseEditJob(job.id).catch((error) => {
        console.error("[agent] Inline clause edit job failed", {
          jobId: job.id,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }

    const response: ClauseEditJobStartResponse = {
      jobId: job.id,
      status: job.status,
      contractId: job.contractId,
      itemId: body.itemId,
    };

    res.status(202).json(response);
  } catch (error) {
    console.error("[agent] Failed to start clause edit job", error);
    res.status(500).json({ error: "Failed to queue clause edit" });
  }
});

agentRouter.get("/clause-edit/status/:jobId", async (req, res) => {
  const jobId = req.params.jobId;
  if (!jobId) {
    res.status(400).json({ error: "jobId is required" });
    return;
  }

  try {
    const job = await getClauseEditJobById(jobId);
    if (!job) {
      res.status(404).json({ error: "Clause edit job not found" });
      return;
    }

    const itemId = (job.metadata?.itemId as string) ?? (job.payload?.itemId ?? "");

    const payload: ClauseEditJobStatusResponse = {
      jobId: job.id,
      status: job.status,
      contractId: job.contractId,
      itemId,
      result: job.result ?? undefined,
      updatedAt: job.updatedAt,
    };

    if (job.status === "failed") {
      payload.error = job.error ?? "Clause edit failed";
    }

    res.json(payload);
  } catch (error) {
    console.error("[agent] Failed to fetch clause edit job status", error);
    res.status(500).json({ error: "Unable to fetch job status" });
  }
});
