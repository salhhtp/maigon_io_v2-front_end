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
  StorageObjectRef,
} from "../../shared/api";

interface ClientChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatRequest {
  contractId?: string | null;
  messages: ClientChatMessage[];
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

export const agentRouter = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_AGENT_MODEL =
  process.env.OPENAI_AGENT_MODEL ?? "gpt-5";
const ANTHROPIC_AGENT_MODEL =
  process.env.ANTHROPIC_AGENT_MODEL ?? "claude-3-5-sonnet-20241022";
const FORCE_OPENAI_ONLY =
  (process.env.AGENT_FORCE_OPENAI_ONLY ?? "true").toLowerCase() === "true";
const ALLOW_ANTHROPIC =
  !FORCE_OPENAI_ONLY &&
  (process.env.AGENT_ALLOW_ANTHROPIC ?? "").toLowerCase() === "true";

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

function applyEditsToPlainText(
  original: string,
  edits: AgentDraftEdit[],
): string {
  let output = original;

  for (const edit of edits) {
    const suggestion = (edit.suggestedText || "").trim();
    const originalText = (edit.originalText || "").trim();
    if (!suggestion || !originalText) {
      continue;
    }

    const escaped = originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flexibleWhitespace = escaped.replace(/\s+/g, "\\s+");
    const pattern = new RegExp(flexibleWhitespace, "i");

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

async function callOpenAI(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_AGENT_MODEL,
      // Use provider default temperature to avoid unsupported overrides on newer models
      // temperature omitted,
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

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
    model: body?.model ?? OPENAI_AGENT_MODEL,
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_AGENT_MODEL,
      max_completion_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

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
  if (error.status === 429) return true;
  if (error.code === "insufficient_quota" || error.code === "rate_limit_exceeded")
    return true;
  return false;
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

    try {
      let provider: AgentApiResponse["provider"] = "openai";
      let model = OPENAI_AGENT_MODEL;
      let usage: AgentApiResponse["usage"] | undefined;

    let aiOutput: string;
      try {
        const result = await callOpenAI(systemPrompt, conversationMessages);
        aiOutput = result.output;
        model = result.model;
        usage = result.usage;
      } catch (error) {
        if (
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
    console.error("[agent] AI failure, using heuristic response", error);
    const fallback = summarizeHeuristicResponse(
      context,
      latestUserMessage,
      clauseSnippets,
    );
    res.json(fallback satisfies AgentApiResponse);
  }
});

agentRouter.post("/compose", async (req, res) => {
  const body = req.body as AgentDraftRequest;
  if (!body?.contractId) {
    res.status(400).json({ error: "contractId is required" });
    return;
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
      const suggestedText =
        proposed.updatedText ??
        proposed.proposedText ??
        proposed.anchorText ??
        "";
      if (!suggestedText.trim()) {
        return null;
      }
      return {
        id: item.id,
        clauseReference:
          proposed.clauseTitle ??
          proposed.clauseId ??
          proposed.anchorText ??
          null,
        changeType: "modify",
        originalText: proposed.previousText ?? proposed.anchorText ?? null,
        suggestedText,
        rationale: item.description,
      } satisfies AgentDraftEdit;
    })
    .filter((edit): edit is AgentDraftEdit => Boolean(edit));

  const combinedEdits = [...agentEdits, ...suggestionEdits];

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("content, content_html, title, metadata, updated_at")
      .eq("id", body.contractId)
      .single();

    if (error) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    const contractContent =
      typeof data?.content === "string" ? data.content : null;
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
    const draftKey = computeDraftKey(
      body.contractId,
      contractUpdatedAt,
      suggestions,
      agentEdits,
    );

    if (!contractContent) {
      res.status(404).json({ error: "Contract content unavailable" });
      return;
    }

    const cachedDraft = await getDraftSnapshotByKey(
      body.contractId,
      draftKey,
    );
    const cachedMatchCount = Array.isArray(
      cachedDraft?.metadata?.matchedEdits,
    )
      ? cachedDraft?.metadata?.matchedEdits.length
      : 0;
    const shouldBypassCache =
      !!cachedDraft &&
      combinedEdits.length > 0 &&
      cachedMatchCount === 0;

    if (cachedDraft && !shouldBypassCache) {
      const cachedResponse = buildResponseFromSnapshot(cachedDraft, {
        contractContent,
        contractHtml: contractHtml ?? undefined,
      });
      res.json(cachedResponse);
      return;
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
      ? `Base contract HTML template (modify this markup directly; preserve all structure, numbering, and styling):
<contract_html>
${trimmedHtml}
</contract_html>`
      : "";

    const textContext = trimmedContract
      ? `Plain text reference for clause lookup (do not reformat this; it is only for context):
<contract_text>
${trimmedContract}
</contract_text>`
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
                item.proposedEdit.previousText ??
                  item.proposedEdit.anchorText,
                2_000,
              ),
            );
            const updatedClause = sanitizeTripleQuotes(
              truncateInput(
                item.proposedEdit.updatedText ??
                  item.proposedEdit.proposedText,
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
      ` Only introduce new clauses when explicitly required by a suggestion. Always return valid JSON matching the provided schema.`;

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

    try {
      let provider: AgentDraftResponse["provider"] = "openai";
      let model = OPENAI_AGENT_MODEL;
      let output: string;

      try {
        const result = await callOpenAI(systemPrompt, messages);
        output = result.output;
        model = result.model;
      } catch (error) {
        if (
          ALLOW_ANTHROPIC &&
          !!ANTHROPIC_API_KEY &&
          shouldFallbackToAnthropic(error)
        ) {
          provider = "anthropic";
          const result = await callAnthropic(systemPrompt, messages);
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
        normalized.updatedContract &&
        normalized.updatedContract.trim().length > 0
          ? normalized.updatedContract
          : contractContent;

      const updatedPlainText =
        syntheticPlainText === contractContent && combinedEdits.length > 0
          ? applyEditsToPlainText(contractContent, combinedEdits)
          : syntheticPlainText;

      let htmlSource: AgentDraftResponse["htmlSource"] | undefined =
        normalized.updatedHtml
          ? "llm"
          : baseHtml
            ? "original"
            : undefined;
      let patchedResult: Awaited<
        ReturnType<typeof buildPatchedHtmlDraft>
      > | null = null;

      if (
        htmlPackageRef &&
        (combinedEdits.length > 0 || updatedPlainText)
      ) {
        try {
          patchedResult = await buildPatchedHtmlDraft({
            contractId: body.contractId,
            draftKey,
            htmlPackage: htmlPackageRef,
            agentEdits: combinedEdits,
            updatedPlainText,
          });
          if (patchedResult?.html) {
            htmlSource = "patched";
          }
        } catch (patchError) {
          console.warn("[agent] Failed to patch HTML package", {
            contractId: body.contractId,
            error:
              patchError instanceof Error
                ? patchError.message
              : String(patchError),
          });
        }
      }

      if (
        !patchedResult &&
        baseHtml &&
        (combinedEdits.length > 0 || updatedPlainText)
      ) {
        const inMemoryPatch = buildPatchedHtmlFromString(
          baseHtml,
          combinedEdits,
          updatedPlainText,
        );
        if (inMemoryPatch) {
          patchedResult = inMemoryPatch;
          if (inMemoryPatch.matchedEdits.length > 0) {
            htmlSource = "patched";
          }
        }
      }

      const updatedHtml =
        patchedResult?.html ??
        normalized.updatedHtml ??
        baseHtml ??
        undefined;
      const updatedContractText =
        patchedResult?.plainText ??
        updatedPlainText ??
        contractContent;

      const snapshot = await upsertDraftSnapshot({
        contractId: body.contractId,
        draftKey,
        html: updatedHtml ?? null,
        plainText: updatedContractText ?? null,
        summary: normalized.summary ?? null,
        appliedChanges: normalized.appliedChanges ?? [],
        assetRef: patchedResult?.assetRef ?? null,
        provider,
        model,
        metadata: {
          suggestionIds: suggestions.map((item) => item.id),
          cacheSource: htmlSource ?? "fallback",
          matchedEdits: patchedResult?.matchedEdits ?? [],
          unmatchedEdits: patchedResult?.unmatchedEdits ?? [],
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
        assetRef: snapshot?.assetRef ?? patchedResult?.assetRef ?? null,
        htmlSource,
        cacheStatus: "miss",
      };

      res.json(response);
    } catch (error) {
      console.error("[agent] Draft generation failed", error);
      const fallbackChanges = [
        ...suggestions.map((item) => item.description),
        ...agentEdits.map((edit) =>
          edit.clauseReference
            ? `Clause ${edit.clauseReference}: ${edit.suggestedText}`
            : edit.suggestedText,
        ),
      ];
      const fallback: AgentDraftResponse = {
        updatedContract: contractContent,
        updatedHtml: baseHtml ?? undefined,
        summary:
          "We couldn't automatically generate a revised draft. Review the suggestions manually and apply them to the original contract.",
        appliedChanges: fallbackChanges.length ? fallbackChanges : undefined,
        provider: "heuristic",
        model: "compose-fallback",
        originalContract: contractContent,
        originalHtml: baseHtml ?? undefined,
        draftId: null,
        assetRef: null,
        htmlSource: baseHtml ? "original" : undefined,
        cacheStatus: "miss",
      };
      res.json(fallback);
    }
  } catch (error) {
    console.error("[agent] Compose endpoint error", error);
    res.status(500).json({ error: "Failed to prepare contract draft" });
  }
});
