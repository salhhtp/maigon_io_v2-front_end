import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronDown,
  User,
  Download,
  ArrowLeft,
  Printer,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { logError, createUserFriendlyMessage } from "@/utils/errorLogger";
import AnalyticsEventsService from "@/services/analyticsEventsService";
import AgentInteractionsService from "@/services/agentInteractionsService";
import AgentEditApprovalsService from "@/services/agentEditApprovalsService";
import type {
  ContractReviewPayload,
  AgentDraftResponse,
  AgentDraftSuggestion,
  AgentDraftEdit,
  AgentDraftJobStatus,
  AgentDraftJobStartResponse,
  AgentDraftJobStatusResponse,
} from "@shared/api";
import type {
  AnalysisReport,
  Issue,
  ClauseFinding,
  ProposedEdit,
  PlaybookInsight,
  ClauseExtraction,
  SimilarityMatch,
  DeviationInsight,
} from "@shared/ai/reviewSchema";
import AgentChat, {
  AgentChatContext,
  AgentChatHandle,
  AgentProposedEdit,
  AgentInteractionMeta,
} from "@/components/AgentChat";
import DOMPurify from "dompurify";
import {
  solutionKeyToDisplayName,
  type SolutionKey,
} from "@/utils/solutionMapping";

interface ContractData {
  id: string;
  title: string;
  content_html?: string | null;
  content?: string | null;
  file_name: string;
  file_size: number;
  status: string;
  created_at: string;
  updated_at: string;
  contract_type?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ReviewData {
  id: string;
  review_type: string;
  results: any;
  score: number;
  confidence_level: number;
  created_at: string;
  contract_id?: string;
}

type NormalizedDecision = {
  id: string;
  description: string;
  severity: string;
  department: string;
  owner: string;
  dueTimeline: string;
  category: string;
  duplicateOf: string | null;
  nextStep?: string;
  proposedEdit?: ProposedEditPreview | null;
};

type DecisionGroup = {
  id: string;
  title: string;
  clauseId?: string | null;
  clause?: ClauseExtraction | null;
  items: NormalizedDecision[];
};

type ProposedEditPreview = {
  id: string;
  clauseId?: string | null;
  clauseTitle?: string | null;
  anchorText: string;
  proposedText: string;
  intent?: string | null;
  applyByDefault?: boolean;
  previousText?: string | null;
  updatedText?: string | null;
  previewHtml?: {
    previous?: string;
    updated?: string;
    diff?: string;
  } | null;
};

type AgentEditWithStatus = AgentProposedEdit & {
  internalId: string;
  status: "pending" | "accepted" | "rejected";
  provider?: string;
  model?: string;
  createdAt: string;
  interactionId?: string | null;
};

type ContractReviewLocationState = Partial<ContractReviewPayload> & {
  selectedFile?: File | null;
  perspective?: string;
  solutionTitle?: string;
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  default: 4,
};

const SEVERITY_DISPLAY_ORDER = Object.keys(SEVERITY_ORDER).sort(
  (a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b],
);

const HTML_SOURCE_LABELS: Record<
  NonNullable<AgentDraftResponse["htmlSource"]>,
  string
> = {
  patched: "Patched original layout",
  llm: "AI-generated layout",
  original: "Original contract HTML",
  cached: "Cached layout",
  fallback: "Text-only fallback",
};

const SEVERITY_STYLES: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  critical: {
    label: "Critical",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  low: {
    label: "Low",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  default: {
    label: "General",
    badge: "bg-gray-200 text-gray-700",
    dot: "bg-gray-400",
  },
};

const DEPARTMENT_STYLES: Record<string, { label: string; badge: string }> = {
  legal: { label: "Legal", badge: "bg-indigo-100 text-indigo-700" },
  privacy: { label: "Privacy", badge: "bg-purple-100 text-purple-700" },
  security: { label: "Security", badge: "bg-slate-100 text-slate-700" },
  operations: { label: "Operations", badge: "bg-emerald-100 text-emerald-700" },
  finance: { label: "Finance", badge: "bg-amber-100 text-amber-700" },
  executive: { label: "Executive", badge: "bg-cyan-100 text-cyan-700" },
  product: { label: "Product", badge: "bg-blue-100 text-blue-700" },
  commercial: { label: "Commercial", badge: "bg-pink-100 text-pink-700" },
  risk: { label: "Risk", badge: "bg-rose-100 text-rose-700" },
  general: { label: "General", badge: "bg-gray-200 text-gray-700" },
};

const EDIT_STATUS_STYLES: Record<
  "pending" | "accepted" | "rejected",
  { label: string; className: string }
> = {
  pending: {
    label: "Pending review",
    className: "bg-gray-100 text-gray-700",
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
};

const FALLBACK_MISSING_INFO = [
  "Potential gaps cannot be confirmed without deeper AI review.",
  "This area requires additional AI review.",
];

function shouldHideFallbackMessage(value: string) {
  const normalized = value.toLowerCase();
  return FALLBACK_MISSING_INFO.some((fallback) =>
    normalized.includes(fallback.toLowerCase()),
  );
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  data_processing_agreement: "Data Processing Agreement",
  non_disclosure_agreement: "Non-Disclosure Agreement",
  privacy_policy_document: "Privacy Policy Document",
  consultancy_agreement: "Consultancy Agreement",
  research_development_agreement: "R&D Agreement",
  end_user_license_agreement: "End User License Agreement",
  product_supply_agreement: "Product Supply Agreement",
  general_commercial: "General Commercial Agreement",
};

const SEVERITY_CARD_STYLES: Record<
  string,
  { container: string; accent: string }
> = {
  critical: {
    container: "bg-red-50 border-red-200 text-red-800",
    accent: "bg-red-500",
  },
  high: {
    container: "bg-orange-50 border-orange-200 text-orange-800",
    accent: "bg-orange-500",
  },
  medium: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    accent: "bg-yellow-500",
  },
  low: {
    container: "bg-green-50 border-green-200 text-green-800",
    accent: "bg-green-500",
  },
  default: {
    container: "bg-gray-50 border-gray-200 text-gray-700",
    accent: "bg-gray-400",
  },
};

const HTML_SANITIZE_OPTIONS = {
  USE_PROFILES: { html: true } as const,
  ADD_ATTR: ["style"],
};

function sanitizeContractHtml(html?: string | null): string | null {
  if (!html) return null;
  const sanitized = DOMPurify.sanitize(html, HTML_SANITIZE_OPTIONS);
  return sanitized.trim().length > 0 ? sanitized : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtmlFragment(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => escapeHtml(line.trim()))
        .join("<br />");
      return `<p>${lines || "&nbsp;"}</p>`;
    })
    .join("");
}

function formatReviewDuration(seconds?: number | null) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "—";
  }
  const roundedSeconds = Math.round(seconds);
  if (roundedSeconds < 60) {
    const bucket = Math.max(5, Math.round(roundedSeconds / 5) * 5);
    return `${bucket}s`;
  }
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  return remainingSeconds
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

function htmlStringToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");

  return withoutTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function readString(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readBoolean(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): boolean | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
  }
  return null;
}

function buildPreviewHtmlFromText(
  previous?: string | null,
  updated?: string | null,
) {
  if (!previous && !updated) {
    return null;
  }
  const safePrevious = escapeHtml(
    (previous ?? "Original clause excerpt not available.").slice(0, 800),
  );
  const safeUpdated = escapeHtml(
    (
      updated ??
      "Insert revised clause language here so the draft reflects this recommendation."
    ).slice(0, 800),
  );
  return {
    previous: `<p>${safePrevious}</p>`,
    updated: `<p>${safeUpdated}</p>`,
  };
}

function extractProposedEditPreview(
  source: Record<string, unknown>,
  prefix: string,
  index: number,
): ProposedEditPreview | null {
  const directCandidate = (
    source["proposedEdit"] ?? source["proposed_edit"]
  ) as Record<string, unknown> | undefined;
  const baseRecord =
    directCandidate && typeof directCandidate === "object"
      ? directCandidate
      : null;
  const anchorText =
    readString(baseRecord, "anchorText", "anchor_text", "previousText") ??
    readString(source, "anchorText", "anchor_text", "original_text") ??
    null;
  const proposedText =
    readString(baseRecord, "proposedText", "proposed_text", "updatedText") ??
    readString(source, "proposedText", "proposed_text", "updated_text", "suggested_text") ??
    null;
  const previousText =
    readString(baseRecord, "previousText", "previous_text", "original_text") ??
    anchorText;
  const updatedText =
    readString(baseRecord, "updatedText", "updated_text", "proposed_text") ??
    proposedText;
  if (!anchorText && !proposedText && !previousText && !updatedText) {
    return null;
  }

  const previewHtml =
    (baseRecord?.previewHtml as ProposedEditPreview["previewHtml"] | undefined) ??
    buildPreviewHtmlFromText(previousText, updatedText);

  return {
    id:
      readString(baseRecord, "id") ??
      readString(source, "id") ??
      `${prefix}-preview-${index + 1}`,
    clauseId:
      readString(baseRecord, "clauseId", "clause_id") ??
      readString(source, "clauseId", "clause_id") ??
      null,
    clauseTitle:
      readString(baseRecord, "clauseTitle", "clause_title") ??
      readString(source, "clauseTitle", "clause_title") ??
      null,
    anchorText:
      anchorText ??
      previousText ??
      "Current clause text",
    proposedText:
      proposedText ??
      updatedText ??
      "Updated clause will be generated by Maigon.",
    intent: readString(baseRecord, "intent") ?? readString(source, "intent"),
    applyByDefault: readBoolean(baseRecord, "applyByDefault") ?? undefined,
    previousText: previousText ?? null,
    updatedText: updatedText ?? null,
    previewHtml,
  };
}

function normalizeDecisionEntries(
  items: unknown[],
  prefix: string,
  defaultSeverity: string,
): NormalizedDecision[] {
  return (items || [])
    .map((item, index) => {
      const data =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : { description: String(item ?? "") };
      const description =
        (typeof data.description === "string" && data.description) ||
        (typeof data.recommendation === "string" && data.recommendation) ||
        (typeof data.action === "string" && data.action) ||
        "";
      const trimmedDescription = description.trim();
      if (!trimmedDescription) {
        return null;
      }
      const severityRaw =
        (typeof data.severity === "string" && data.severity) || defaultSeverity;
      const severity = severityRaw.toLowerCase();
      const departmentRaw =
        (typeof data.department === "string" && data.department) || "general";
      const department = departmentRaw.toLowerCase();
      const owner =
        (typeof data.owner === "string" && data.owner) ||
        formatLabel(department);
      const dueTimeline =
        (typeof data.due_timeline === "string" && data.due_timeline) ||
        (typeof data.timeline === "string" && data.timeline) ||
        "TBD";
      const category =
        (typeof data.category === "string" && data.category) || "general";
      const duplicateOf =
        (typeof data.duplicate_of === "string" && data.duplicate_of) ||
        (typeof data.duplicateOf === "string" && data.duplicateOf) ||
        null;
      const nextStep =
        (typeof data.next_step === "string" && data.next_step) ||
        (typeof data.nextStep === "string" && data.nextStep) ||
        "";
      const proposedEditPreview = extractProposedEditPreview(
        data,
        prefix,
        index,
      );

      return {
        id:
          (typeof data.id === "string" && data.id) ||
          `${prefix}-${index + 1}`,
        description: trimmedDescription,
        severity,
        department,
        owner,
        dueTimeline,
        category,
        duplicateOf,
        nextStep,
        proposedEdit: proposedEditPreview,
      } as NormalizedDecision;
    })
    .filter((entry): entry is NormalizedDecision => Boolean(entry));
}

function dedupeDecisions(entries: NormalizedDecision[]): NormalizedDecision[] {
  const bySignature = new Map<string, NormalizedDecision>();

  entries.forEach((entry) => {
    if (entry.duplicateOf) return;
    const signature = entry.proposedEdit?.id
      ? `edit-${entry.proposedEdit.id.toLowerCase()}`
      : `${entry.description}|${entry.owner}`.toLowerCase();
    const existing = bySignature.get(signature);
    if (!existing) {
      bySignature.set(signature, entry);
      return;
    }
    // Prefer entries that have a concrete proposedEdit (rewritten clause)
    const existingHasEdit = Boolean(existing.proposedEdit);
    const currentHasEdit = Boolean(entry.proposedEdit);
    if (!existingHasEdit && currentHasEdit) {
      bySignature.set(signature, entry);
    }
  });

  return Array.from(bySignature.values()).sort((a, b) => {
    const orderA = SEVERITY_ORDER[a.severity] ?? SEVERITY_ORDER.default;
    const orderB = SEVERITY_ORDER[b.severity] ?? SEVERITY_ORDER.default;
    if (orderA !== orderB) return orderA - orderB;
    return a.description.localeCompare(b.description);
  });
}

function getSeverityStyle(severity: string) {
  return SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.default;
}

function getDepartmentStyle(department: string) {
  return (
    DEPARTMENT_STYLES[department] ?? {
      label: formatLabel(department || "General"),
      badge: "bg-gray-200 text-gray-700",
    }
  );
}

function getInsightStatusStyle(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "met":
      return {
        label: "Met",
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      };
    case "missing":
      return {
        label: "Missing",
        badge: "bg-red-50 text-red-700 border border-red-200",
      };
    case "attention":
    default:
      return {
        label: status ? formatLabel(status) : "Attention",
        badge: "bg-amber-50 text-amber-700 border border-amber-200",
      };
  }
}

function getImportanceBadge(level?: string | null) {
  switch ((level || "").toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

type DiffChunk = {
  type: "equal" | "added" | "removed";
  lines: string[];
};

type TokenDiff = {
  type: "equal" | "added" | "removed";
  token: string;
};

function computeLineDiff(original: string, updated: string): DiffChunk[] {
  const oldLines = original.split(/\r?\n/);
  const newLines = updated.split(/\r?\n/);
  const m = oldLines.length;
  const n = newLines.length;

  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const chunks: DiffChunk[] = [];
  let i = 0;
  let j = 0;

  const pushChunk = (type: DiffChunk["type"], line: string) => {
    if (!chunks.length || chunks[chunks.length - 1].type !== type) {
      chunks.push({ type, lines: [line] });
    } else {
      chunks[chunks.length - 1].lines.push(line);
    }
  };

  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      pushChunk("equal", oldLines[i]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      pushChunk("removed", oldLines[i]);
      i += 1;
    } else {
      pushChunk("added", newLines[j]);
      j += 1;
    }
  }

  while (i < m) {
    pushChunk("removed", oldLines[i]);
    i += 1;
  }

  while (j < n) {
    pushChunk("added", newLines[j]);
    j += 1;
  }

  return chunks;
}

function tokenizeText(value: string): string[] {
  return value.split(/(\s+)/).filter((token) => token.length > 0);
}

function computeTokenDiff(original: string, updated: string): TokenDiff[] {
  const oldTokens = tokenizeText(original);
  const newTokens = tokenizeText(updated);
  const m = oldTokens.length;
  const n = newTokens.length;

  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (oldTokens[i] === newTokens[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
  }

  const tokens: TokenDiff[] = [];
  let i = 0;
  let j = 0;

  const pushToken = (type: TokenDiff["type"], token: string) => {
    if (!tokens.length || tokens[tokens.length - 1].type !== type) {
      tokens.push({ type, token });
    } else {
      tokens[tokens.length - 1].token += token;
    }
  };

  while (i < m && j < n) {
    if (oldTokens[i] === newTokens[j]) {
      pushToken("equal", oldTokens[i]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      pushToken("removed", oldTokens[i]);
      i += 1;
    } else {
      pushToken("added", newTokens[j]);
      j += 1;
    }
  }

  while (i < m) {
    pushToken("removed", oldTokens[i]);
    i += 1;
  }

  while (j < n) {
    pushToken("added", newTokens[j]);
    j += 1;
  }

  return tokens;
}

function renderTokenDiff(
  tokens: TokenDiff[],
  variant: "original" | "updated",
  keyPrefix: string,
) {
  return tokens
    .map((token, index) => {
      if (variant === "original" && token.type === "added") return null;
      if (variant === "updated" && token.type === "removed") return null;
      const className =
        token.type === "added"
          ? "bg-emerald-100/80 text-emerald-900 underline decoration-emerald-600 decoration-2 rounded-sm px-0.5"
          : token.type === "removed"
            ? "bg-red-100/80 text-red-700 line-through decoration-red-600 decoration-2 rounded-sm px-0.5"
            : "";
      return (
        <span key={`${keyPrefix}-${index}`} className={className}>
          {token.token || "\u00A0"}
        </span>
      );
    })
    .filter(Boolean);
}

function renderTrackedDiffChunks(chunks: DiffChunk[]) {
  const rows: React.ReactNode[] = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const nextChunk = chunks[i + 1];

    if (chunk.type === "removed" && nextChunk?.type === "added") {
      const maxLines = Math.max(
        chunk.lines.length,
        nextChunk.lines.length,
      );
      for (let lineIndex = 0; lineIndex < maxLines; lineIndex += 1) {
        const removedLine = chunk.lines[lineIndex] ?? "";
        const addedLine = nextChunk.lines[lineIndex] ?? "";
        const tokenDiff = computeTokenDiff(removedLine, addedLine);
        const removedTokens = renderTokenDiff(
          tokenDiff,
          "original",
          `tracked-rm-${i}-${lineIndex}`,
        );
        const addedTokens = renderTokenDiff(
          tokenDiff,
          "updated",
          `tracked-add-${i}-${lineIndex}`,
        );
        rows.push(
          <div
            key={`tracked-pair-${i}-${lineIndex}`}
            className="space-y-1"
          >
            <div className="whitespace-pre-wrap break-words text-red-700">
              {removedTokens.length ? removedTokens : "\u00A0"}
            </div>
            <div className="whitespace-pre-wrap break-words text-emerald-800">
              {addedTokens.length ? addedTokens : "\u00A0"}
            </div>
          </div>,
        );
      }
      i += 1;
      continue;
    }

    const chunkClass =
      chunk.type === "added"
        ? "bg-emerald-50 text-emerald-800 underline decoration-emerald-600 decoration-2 rounded px-1"
        : chunk.type === "removed"
          ? "bg-red-50 text-red-700 line-through decoration-red-600 decoration-2 rounded px-1"
          : "";
    chunk.lines.forEach((line, lineIndex) => {
      rows.push(
        <div
          key={`tracked-${chunk.type}-${i}-${lineIndex}`}
          className={`whitespace-pre-wrap break-words ${chunkClass}`}
        >
          {line || "\u00A0"}
        </div>,
      );
    });
  }

  return rows;
}

function normalizeLegacyProposedEdit(value: unknown): ProposedEdit | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : null;
  const anchorText =
    typeof data.anchorText === "string"
      ? data.anchorText
      : typeof data.originalText === "string"
        ? data.originalText
        : null;
  const proposedText =
    typeof data.proposedText === "string"
      ? data.proposedText
      : typeof data.suggestedText === "string"
        ? data.suggestedText
        : null;
  if (!id || !anchorText || !proposedText) {
    return null;
  }
  return {
    id,
    clauseId: typeof data.clauseId === "string" ? data.clauseId : undefined,
    anchorText,
    proposedText,
    intent:
      typeof data.intent === "string"
        ? data.intent
        : typeof data.description === "string"
          ? data.description
          : "Update contract clause",
    applyByDefault: Boolean(data.applyByDefault),
  };
}

function convertProposedEditToDecision(
  edit: ProposedEdit,
  clauseTitle?: string | null,
): NormalizedDecision {
  const normalizeField = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const previewPreviousRaw =
    typeof edit.previewHtml?.previous === "string"
      ? edit.previewHtml.previous
      : null;
  const previewUpdatedRaw =
    typeof edit.previewHtml?.updated === "string"
      ? edit.previewHtml.updated
      : null;

  const previewPrevious = normalizeField(
    previewPreviousRaw ? htmlStringToPlainText(previewPreviousRaw) : null,
  );
  const previewUpdated = normalizeField(
    previewUpdatedRaw ? htmlStringToPlainText(previewUpdatedRaw) : null,
  );

  const normalizedPrevious = normalizeField(edit.previousText);
  const normalizedUpdated = normalizeField(edit.updatedText);
  const normalizedProposed = normalizeField(edit.proposedText);
  const normalizedAnchor =
    normalizeField(edit.anchorText) ?? "Original text not provided.";

  const chosenPrevious =
    normalizedPrevious ?? previewPrevious ?? normalizedAnchor;
  const chosenUpdated =
    normalizedUpdated ??
    normalizedProposed ??
    previewUpdated ??
    normalizedAnchor;

  const applyFlag = Boolean(edit.applyByDefault);
  const baseDescription =
    edit.intent?.trim() ||
    (clauseTitle
      ? `Update clause: ${clauseTitle}`
      : "Apply proposed contract change");
  return {
    id: edit.id,
    description: baseDescription,
    severity: applyFlag ? "high" : "medium",
    department: "legal",
    owner: "Legal",
    dueTimeline: "Drafting",
    category: "draft_update",
    duplicateOf: null,
    nextStep: "Insert the updated clause text",
    proposedEdit: {
      id: edit.id,
      clauseId: edit.clauseId ?? null,
      clauseTitle: clauseTitle ?? null,
      anchorText: normalizedAnchor,
      proposedText: chosenUpdated ?? normalizedAnchor,
      intent: edit.intent,
      applyByDefault: applyFlag,
      previousText: chosenPrevious,
      updatedText: chosenUpdated,
      // Prefer API-provided previewHtml (can include full updated clause) and only
      // generate a simple preview if missing.
      previewHtml:
        (previewPreviousRaw || previewUpdatedRaw
          ? {
              previous: previewPreviousRaw ?? undefined,
              updated: previewUpdatedRaw ?? undefined,
              diff: edit.previewHtml?.diff,
            }
          : undefined) ??
        buildPreviewHtmlFromText(
          chosenPrevious ?? undefined,
          chosenUpdated ?? undefined,
        ),
    },
  };
}

function matchClauseForDecision(
  decision: NormalizedDecision,
  clauses: ClauseExtraction[],
): ClauseExtraction | null {
  if (!clauses.length) {
    return null;
  }

  const idLower = decision.id.toLowerCase();
  const categoryLower = decision.category?.toLowerCase() ?? "";
  const descriptionLower = decision.description.toLowerCase();

  const directIdMatch = clauses.find((clause) => {
    const clauseId = clause.clauseId ?? clause.id;
    return clauseId
      ? idLower.includes(clauseId.toLowerCase())
      : false;
  });
  if (directIdMatch) {
    return directIdMatch;
  }

  const categoryMatch = clauses.find((clause) => {
    if (!clause.category) return false;
    return categoryLower.includes(clause.category.toLowerCase());
  });
  if (categoryMatch) {
    return categoryMatch;
  }

  const titleMatch = clauses.find((clause) => {
    if (!clause.title) return false;
    return descriptionLower.includes(clause.title.toLowerCase());
  });
  if (titleMatch) {
    return titleMatch;
  }

  return clauses[0];
}

function attachFallbackClausePreviews(
  entries: NormalizedDecision[],
  clauses: ClauseExtraction[],
): NormalizedDecision[] {
  return entries.map((entry, index) => {
    if (entry.proposedEdit) {
      return entry;
    }
    const clause = clauses.length ? matchClauseForDecision(entry, clauses) : null;
    const fallbackTitle =
      clause?.title ??
      (entry.category ? formatLabel(entry.category) : null);
    const anchor =
      clause?.originalText ||
      clause?.normalizedText ||
      clause?.title ||
      "Original language not captured yet.";
    const proposed = entry.description || entry.nextStep || "Apply Maigon's recommended revision.";
    const preview: ProposedEditPreview = {
      id: `${entry.id}-auto-preview`,
      clauseId: clause?.clauseId ?? clause?.id ?? `synthetic-clause-${index + 1}`,
      clauseTitle: fallbackTitle,
      anchorText: anchor,
      proposedText: proposed,
      intent: entry.nextStep || entry.description || "Apply recommendation",
      applyByDefault: false,
      previousText: anchor,
      updatedText: proposed,
      previewHtml: buildPreviewHtmlFromText(anchor, proposed),
    };
    return {
      ...entry,
      proposedEdit: preview,
    };
  });
}

function resolveClauseEvidenceText(
  reference: Issue["clauseReference"] | null | undefined,
  clauses: ClauseExtraction[],
): string | null {
  if (!reference || !clauses.length) return null;
  const referenceClauseId = reference.clauseId ?? null;
  const normalizedHeading = reference.heading
    ? normalizeSearchText(reference.heading)
    : null;
  const normalizedExcerpt = reference.excerpt
    ? normalizeSearchText(reference.excerpt)
    : null;

  const clauseById = referenceClauseId
    ? clauses.find((clause) => {
        const clauseId = clause.clauseId ?? clause.id;
        return clauseId && referenceClauseId
          ? clauseId.toLowerCase() === referenceClauseId.toLowerCase()
          : false;
      })
    : null;
  if (clauseById) {
    return clauseById.normalizedText ?? clauseById.originalText ?? null;
  }

  const clauseByHeading = normalizedHeading
    ? clauses.find((clause) => {
        if (!clause.title) return false;
        const clauseTitle = normalizeSearchText(clause.title);
        return (
          clauseTitle === normalizedHeading ||
          clauseTitle.includes(normalizedHeading) ||
          normalizedHeading.includes(clauseTitle)
        );
      })
    : null;
  if (clauseByHeading) {
    return clauseByHeading.normalizedText ?? clauseByHeading.originalText ?? null;
  }

  const clauseByExcerpt = normalizedExcerpt
    ? clauses.find((clause) => {
        const clauseText = clause.normalizedText ?? clause.originalText ?? "";
        if (!clauseText) return false;
        return normalizeSearchText(clauseText).includes(normalizedExcerpt);
      })
    : null;

  return clauseByExcerpt?.normalizedText ?? clauseByExcerpt?.originalText ?? null;
}

function resolveClauseEvidenceFromSnippet(
  snippet: string | null | undefined,
  clauses: ClauseExtraction[],
): string | null {
  if (!snippet || !clauses.length) return null;
  const normalizedSnippet = normalizeSearchText(snippet);
  const clauseMatch = clauses.find((clause) => {
    const clauseText = clause.normalizedText ?? clause.originalText ?? "";
    return clauseText
      ? normalizeSearchText(clauseText).includes(normalizedSnippet)
      : false;
  });
  return clauseMatch?.normalizedText ?? clauseMatch?.originalText ?? null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveClauseEvidenceFromDocument(
  reference: Issue["clauseReference"] | null | undefined,
  documentText: string | null,
): string | null {
  if (!reference || !documentText) return null;
  const normalized = documentText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const clauseNumber = reference.locationHint?.clauseNumber ?? null;
  const heading = reference.heading ?? null;
  const excerpt = reference.excerpt ?? null;

  const numberPattern = clauseNumber
    ? new RegExp(
        `^\\s*(?:clause\\s+)?${escapeRegex(clauseNumber)}(?=\\s|\\.|:|$)`,
        "i",
      )
    : null;
  const headingPattern =
    heading && heading.trim().length > 2
      ? normalizeSearchText(heading)
      : null;

  let startIndex = -1;
  if (numberPattern) {
    startIndex = lines.findIndex((line) => numberPattern.test(line.trim()));
  }
  if (startIndex < 0 && headingPattern) {
    startIndex = lines.findIndex((line) =>
      normalizeSearchText(line).includes(headingPattern),
    );
  }

  if (startIndex >= 0) {
    const headingLinePattern = /^(\d+(\.\d+)*)(?:\.)?\s+/;
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) continue;
      if (
        headingLinePattern.test(line) ||
        /^[A-Z][A-Z\s\d\W]{3,}$/.test(line)
      ) {
        endIndex = i;
        break;
      }
    }
    const block = lines.slice(startIndex, endIndex).join("\n").trim();
    if (block.length > 0) {
      return block;
    }
  }

  if (excerpt) {
    const blocks = normalized
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
    const normalizedExcerpt = normalizeSearchText(excerpt);
    const matchedBlock = blocks.find((block) =>
      normalizeSearchText(block).includes(normalizedExcerpt),
    );
    if (matchedBlock) {
      return matchedBlock;
    }
  }

  return null;
}

function groupDecisionsByClause(
  decisions: NormalizedDecision[],
  clauses: ClauseExtraction[],
): DecisionGroup[] {
  const groups = new Map<string, DecisionGroup>();
  const order: string[] = [];

  decisions.forEach((decision) => {
    const clauseId = decision.proposedEdit?.clauseId ?? null;
    const clauseTitle = decision.proposedEdit?.clauseTitle ?? null;
    const clauseMatch = clauseId
      ? clauses.find((clause) => {
          const clauseKey = clause.clauseId ?? clause.id;
          return clauseKey && clauseId
            ? clauseKey.toLowerCase() === clauseId.toLowerCase()
            : false;
        })
      : clauseTitle
        ? clauses.find((clause) =>
            clause.title
              ? normalizeSearchText(clause.title) ===
                normalizeSearchText(clauseTitle)
              : false,
          )
        : null;
    const groupKey = clauseId
      ? `clause:${clauseId}`
      : clauseTitle
        ? `title:${clauseTitle.toLowerCase()}`
        : `item:${decision.id}`;
    if (!groups.has(groupKey)) {
      const fallbackTitle =
        clauseMatch?.title ??
        clauseTitle ??
        truncateText(
          decision.proposedEdit?.anchorText ??
            decision.description ??
            decision.id,
          80,
        );
      groups.set(groupKey, {
        id: groupKey,
        title: fallbackTitle,
        clauseId,
        clause: clauseMatch ?? null,
        items: [],
      });
      order.push(groupKey);
    }
    groups.get(groupKey)!.items.push(decision);
  });

  return order.map((key) => groups.get(key)!);
}

function ClauseEvidenceBlock({
  reference,
  fullText,
  label = "Clause evidence",
  tone = "primary",
}: {
  reference?: Issue["clauseReference"] | null;
  fullText?: string | null;
  label?: string;
  tone?: "primary" | "neutral";
}) {
  if (!reference) return null;
  const [isOpen, setIsOpen] = useState(false);
  const toneStyles =
    tone === "neutral"
      ? {
          container: "border-[#E8DDDD] bg-[#FEFBFB]",
          label: "text-[#6B4F4F]",
          location: "text-[#9A7C7C]",
          body: "text-[#271D1D]",
          link: "text-[#725A5A]",
          modal: "bg-[#FDFBFB] border-[#E8DDDD]",
        }
      : {
          container: "border-[#DAD7FF] bg-[#F6F5FF]",
          label: "text-[#4B3F9A]",
          location: "text-[#6B5FB8]",
          body: "text-[#241B5B]",
          link: "text-[#4B3F9A]",
          modal: "bg-[#FBFAFF] border-[#E6E0FF]",
        };
  const locationParts: string[] = [];
  if (reference.locationHint?.section) {
    locationParts.push(`Section ${reference.locationHint.section}`);
  }
  if (reference.locationHint?.clauseNumber) {
    locationParts.push(`Clause ${reference.locationHint.clauseNumber}`);
  }
  if (reference.locationHint?.page) {
    locationParts.push(`Page ${reference.locationHint.page}`);
  }
  const locationLabel = locationParts.join(" · ");
  const modalText = fullText ?? reference.excerpt ?? "";
  const previewText = reference.excerpt ?? fullText ?? "";

  return (
    <div
      className={`mt-3 rounded-md border px-3 py-2 ${toneStyles.container}`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${toneStyles.label}`}
      >
        {label} {reference.heading ? `· ${reference.heading}` : ""}
      </p>
      {locationLabel && (
        <p className={`text-[11px] mb-1 ${toneStyles.location}`}>
          {locationLabel}
        </p>
      )}
      {previewText ? (
        <p className={`text-sm whitespace-pre-line ${toneStyles.body}`}>
          {previewText}
        </p>
      ) : null}
      {modalText ? (
        <>
          <button
            type="button"
            className={`mt-2 text-xs underline ${toneStyles.link}`}
            onClick={() => setIsOpen(true)}
          >
            View full clause
          </button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {label}
                  {reference.heading ? ` · ${reference.heading}` : ""}
                </DialogTitle>
                {locationLabel && (
                  <DialogDescription>{locationLabel}</DialogDescription>
                )}
              </DialogHeader>
              <pre
                className={`whitespace-pre-wrap break-words text-sm text-[#271D1D] rounded-md p-4 border ${toneStyles.modal}`}
              >
                {modalText}
              </pre>
              <DialogFooter>
                <Button type="button" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

function inferClauseImportance(
  text: string,
): ClauseExtraction["importance"] {
  const lowered = text.toLowerCase();
  if (/(liability|indemn|termination|governing law|confidential)/.test(lowered)) {
    return "high";
  }
  if (/(payment|fees|obligation|responsibility|audit)/.test(lowered)) {
    return "medium";
  }
  return "low";
}

function deriveClauseExtractionsFromContent(
  content?: string | null,
  limit = 8,
  options?: {
    excerptLength?: number;
    normalizedLength?: number;
    includeFullText?: boolean;
  },
): ClauseExtraction[] {
  if (!content) return [];
  const normalized = content.replace(/\r\n/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 80);

  const excerptLength = options?.excerptLength ?? 420;
  const normalizedLength =
    options?.includeFullText === true
      ? null
      : options?.normalizedLength ?? 800;

  const clauses: ClauseExtraction[] = [];
  for (const block of blocks) {
    if (clauses.length >= limit) break;
    const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;

    let heading = "";
    let bodyLines = lines;
    const firstLine = lines[0];
    if (/^(\d+(\.\d+)*\.?)\s+/.test(firstLine) || /^[A-Z][A-Z\s]{3,}$/.test(firstLine)) {
      heading = firstLine;
      bodyLines = lines.slice(1);
    }

    const body = bodyLines.join(" ").trim();
    if (body.length < 60) continue;
    const excerpt = body.slice(0, excerptLength).trim();
    const normalizedText =
      normalizedLength === null ? body : body.slice(0, normalizedLength);
    const clauseNumberMatch = heading.match(/^(\d+(\.\d+)*)(?:\.)?\s*/);
    const clauseNumber = clauseNumberMatch ? clauseNumberMatch[1] : null;

    clauses.push({
      id: `parsed-clause-${clauses.length + 1}`,
      clauseId: clauseNumber ? `parsed-${clauseNumber}` : `parsed-${clauses.length + 1}`,
      title: heading || `Clause ${clauses.length + 1}`,
      category: undefined,
      originalText: excerpt,
      normalizedText,
      importance: inferClauseImportance(excerpt),
      location: null,
      references: [],
    });
  }

  return clauses;
}

function ClausePreview({
  clauseTitle,
  anchorText,
  proposedText,
  previousText,
  updatedText,
  previewHtml,
  isActive = true,
}: {
  clauseTitle?: string | null;
  anchorText: string;
  proposedText: string;
  previousText?: string | null;
  updatedText?: string | null;
  previewHtml?: {
    previous?: string;
    updated?: string;
    diff?: string;
  } | null;
  isActive?: boolean;
}) {
  const [activeModal, setActiveModal] = useState<"original" | "updated" | null>(
    null,
  );

  const resolvedPreviousText =
    previousText ?? anchorText ?? "Not provided yet.";
  const resolvedUpdatedText = updatedText ?? proposedText;

  const previousFromHtml = previewHtml?.previous
    ? htmlStringToPlainText(previewHtml.previous)
    : null;
  const updatedFromHtml = previewHtml?.updated
    ? htmlStringToPlainText(previewHtml.updated)
    : null;
  const previousTextForDiff =
    previousFromHtml && previousFromHtml.length >= resolvedPreviousText.length
      ? previousFromHtml
      : resolvedPreviousText;
  const updatedTextForDiff =
    updatedFromHtml && updatedFromHtml.length >= resolvedUpdatedText.length
      ? updatedFromHtml
      : resolvedUpdatedText;
  const diffTokens = useMemo(() => {
    if (!previousTextForDiff || !updatedTextForDiff) return null;
    if (previousTextForDiff === updatedTextForDiff) return null;
    return computeTokenDiff(previousTextForDiff, updatedTextForDiff);
  }, [previousTextForDiff, updatedTextForDiff]);

  const renderDiffColumn = (variant: "original" | "updated") => {
    if (!diffTokens) {
      const fallbackText =
        variant === "original" ? previousTextForDiff : updatedTextForDiff;
      return (
        <pre className="whitespace-pre-wrap break-words rounded bg-[#FDFBFB] p-3 text-sm text-[#271D1D]">
          {fallbackText}
        </pre>
      );
    }
    return (
      <pre className="whitespace-pre-wrap break-words rounded bg-[#FDFBFB] p-3 text-sm text-[#271D1D]">
        {renderTokenDiff(diffTokens, variant, `preview-${variant}`)}
      </pre>
    );
  };

  return (
    <div
      className={`mt-4 rounded-lg border border-[#E8DDDD] bg-white transition-opacity ${
        isActive ? "opacity-100" : "opacity-60"
      }`}
    >
      <div className="border-b border-[#F1E6E6] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#725A5A] flex items-center justify-between">
        <span>Clause Preview {clauseTitle ? `· ${clauseTitle}` : ""}</span>
        {!isActive && (
          <span className="text-[10px] font-medium text-[#9A7C7C] uppercase">
            Not applied
          </span>
        )}
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-[#F1E6E6] px-4 py-3 text-sm text-[#725A5A] md:border-b-0 md:border-r">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#A07F7F]">
              Original clause
            </p>
            <button
              type="button"
              className="text-[11px] text-[#725A5A] underline"
              onClick={() => setActiveModal("original")}
            >
              View full
            </button>
          </div>
          {renderDiffColumn("original")}
        </div>
        <div className="px-4 py-3 text-sm text-[#725A5A]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2C5C4F]">
              Updated clause
            </p>
            <button
              type="button"
              className="text-[11px] text-[#725A5A] underline"
              onClick={() => setActiveModal("updated")}
            >
              View full
            </button>
          </div>
          {renderDiffColumn("updated")}
        </div>
      </div>
      <Dialog
        open={activeModal !== null}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeModal === "original" ? "Original clause" : "Updated clause"}
              {clauseTitle ? ` · ${clauseTitle}` : ""}
            </DialogTitle>
            <DialogDescription>
              Review the full clause text below.
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-words text-sm text-[#271D1D] bg-[#FDFBFB] border border-[#E8DDDD] rounded-md p-4">
            {activeModal === "original"
              ? previousTextForDiff
              : updatedTextForDiff}
          </pre>
          <DialogFooter>
            <Button type="button" onClick={() => setActiveModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ContractReview() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const organizationMetadata = (user?.organization?.metadata ??
    {}) as Record<string, unknown>;
  const organizationLogoUrl =
    typeof organizationMetadata.logoUrl === "string"
      ? organizationMetadata.logoUrl
      : null;
  const storedPayload = useMemo<ContractReviewPayload | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("maigon:lastReview");
      return raw ? (JSON.parse(raw) as ContractReviewPayload) : null;
    } catch (error) {
      console.warn("[ContractReview] Failed to parse cached review payload", error);
      return null;
    }
  }, []);
  // Get contract data from navigation state (from upload page)
  const locationState =
    (location.state || {}) as ContractReviewLocationState;
  const classificationFromState = locationState.classification;

  const perspectiveKey =
    (typeof locationState.perspective === "string" && locationState.perspective) ||
    (typeof locationState.metadata?.perspective === "string"
      ? locationState.metadata.perspective
      : undefined) ||
    (storedPayload?.metadata?.perspective ?? undefined);

  const initialContract =
    (locationState.contract as ContractData | null | undefined) ??
    (storedPayload?.contract as ContractData | null | undefined) ??
    null;
  const initialReview =
    (locationState.review as ReviewData | null | undefined) ??
    (storedPayload?.review as ReviewData | null | undefined) ??
    null;

  const [contractData, setContractData] = useState<ContractData | null>(
    initialContract,
  );
  const [reviewData, setReviewData] = useState<ReviewData | null>(
    initialReview,
  );
  const [isLoading, setIsLoading] = useState(
    !initialContract || !initialReview,
  );
  const agentChatRef = useRef<AgentChatHandle>(null);
  const [agentEdits, setAgentEdits] = useState<AgentEditWithStatus[]>([]);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    actions: true,
    missing: true,
  });
  const [suggestionSelection, setSuggestionSelection] = useState<Record<string, boolean>>({});
  const [includeAcceptedAgentEdits, setIncludeAcceptedAgentEdits] = useState(true);
  const [hasManuallyToggledIncludeEdits, setHasManuallyToggledIncludeEdits] = useState(false);
  const [activeSimilarityMatch, setActiveSimilarityMatch] =
    useState<SimilarityMatch | null>(null);
  const [activeDeviationInsight, setActiveDeviationInsight] =
    useState<DeviationInsight | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftJobId, setDraftJobId] = useState<string | null>(null);
  const [draftJobStatus, setDraftJobStatus] =
    useState<AgentDraftJobStatus | null>(null);
  const [draftResult, setDraftResult] = useState<AgentDraftResponse | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftViewMode, setDraftViewMode] = useState<"preview" | "diff">(
    "preview",
  );

  const originalHtml = useMemo(() => {
    if (draftResult?.originalHtml) {
      return sanitizeContractHtml(draftResult.originalHtml);
    }
    if (contractData?.content_html) {
      return sanitizeContractHtml(contractData.content_html);
    }
    return null;
  }, [draftResult?.originalHtml, contractData?.content_html]);

  const previewUpdatedHtml = useMemo(() => {
    if (draftResult?.updatedHtml) {
      return sanitizeContractHtml(draftResult.updatedHtml);
    }
    if (draftResult?.updatedContract) {
      const fragment = textToHtmlFragment(draftResult.updatedContract);
      return fragment ? sanitizeContractHtml(`<div>${fragment}</div>`) : null;
    }
    return null;
  }, [draftResult?.updatedHtml, draftResult?.updatedContract]);

  const originalPlainText = useMemo(() => {
    if (originalHtml) {
      return htmlStringToPlainText(originalHtml);
    }
    if (draftResult?.originalContract) {
      return draftResult.originalContract;
    }
    return "";
  }, [originalHtml, draftResult?.originalContract]);

const updatedPlainText = useMemo(() => {
  if (previewUpdatedHtml) {
    return htmlStringToPlainText(previewUpdatedHtml);
  }
  if (draftResult?.updatedContract) {
    return draftResult.updatedContract;
  }
  return "";
}, [previewUpdatedHtml, draftResult?.updatedContract]);

  const exportHtml = useMemo(() => {
    if (previewUpdatedHtml) {
      return previewUpdatedHtml;
    }
    if (originalHtml) {
      return originalHtml;
    }
    return null;
  }, [previewUpdatedHtml, originalHtml]);

  const exportPlainText = useMemo(() => {
    if (!updatedPlainText) return null;
    const normalized = updatedPlainText.trim();
    return normalized.length > 0 ? normalized : null;
  }, [updatedPlainText]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSuggestionSelection = useCallback((id: string, value: boolean) => {
    setSuggestionSelection((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const results = reviewData.results || {};
  const resultsRecord = results as Record<string, unknown>;
  const resultsMetadata =
    typeof resultsRecord.metadata === "object" &&
    resultsRecord.metadata !== null
      ? (resultsRecord.metadata as Record<string, unknown>)
      : null;

  const classification = useMemo(() => {
    const stateValue =
      (classificationFromState as Record<string, unknown> | null | undefined) ??
      null;
    const reviewValue =
      reviewData?.results &&
      typeof (reviewData.results as Record<string, unknown>).classification ===
        "object"
        ? ((reviewData.results as Record<string, unknown>)
            .classification as Record<string, unknown>)
        : null;
    const contractValue =
      contractData &&
      contractData.metadata &&
      typeof (contractData.metadata as Record<string, unknown>).classification ===
        "object"
        ? ((contractData.metadata as Record<string, unknown>)
            .classification as Record<string, unknown>)
        : null;
    const cachedValue =
      storedPayload &&
      storedPayload.classification &&
      typeof storedPayload.classification === "object"
        ? (storedPayload.classification as Record<string, unknown>)
        : null;

    return stateValue || reviewValue || contractValue || cachedValue || null;
  }, [classificationFromState, contractData, reviewData, storedPayload]);

  const classificationContractType =
    readString(
      classification,
      "contractType",
      "contract_type",
      "type",
    ) ||
    readString(results as Record<string, unknown>, "contract_type") ||
    readString(contractData?.metadata as Record<string, unknown> | null, "contract_type") ||
    readString((contractData as unknown as Record<string, unknown>) ?? null, "contract_type") ||
    "general_commercial";

  const classificationLabel =
    CONTRACT_TYPE_LABELS[classificationContractType] ||
    formatLabel(classificationContractType);

  const classificationSubType = readString(
    classification,
    "subType",
    "sub_type",
  );

  const classificationSourceRaw = readString(classification, "source");

  const classificationFallbackUsed =
    readBoolean(classification, "fallbackUsed", "fallback_used") ??
    Boolean(
      classificationSourceRaw &&
        classificationSourceRaw.toLowerCase().includes("fallback"),
    );

  const classificationFallbackReason = readString(
    classification,
    "fallback_reason",
    "fallbackReason",
  );
  const classificationRecommendedKeyRaw = readString(
    classification,
    "recommendedSolutionKey",
    "recommended_solution_key",
  );
  const classificationRecommendedKey = classificationRecommendedKeyRaw
    ? (classificationRecommendedKeyRaw as SolutionKey)
    : null;
  const classificationRecommendedTitle =
    readString(
      classification,
      "recommendedSolutionTitle",
      "recommended_solution_title",
    ) ??
    (classificationRecommendedKey
      ? solutionKeyToDisplayName(classificationRecommendedKey)
      : null);

  const classificationSourceDisplay = classificationSourceRaw
    ? formatLabel(classificationSourceRaw)
    : "Maigon AI classifier";


  // If no data provided, redirect back
  useEffect(() => {
    if (!contractData && !reviewData && !isLoading) {
      toast({
        title: "No contract data",
        description: "Please upload a contract first.",
        variant: "destructive",
      });
      navigate("/user-solutions");
    }
  }, [contractData, reviewData, isLoading, navigate, toast]);

  // Format score for display
  const formatScore = (score: number): string => {
    return score ? score.toFixed(0) : "0";
  };

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Get score background color
  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  // Get review type display name
  const getReviewTypeDisplay = (type: string): string => {
    const types: { [key: string]: string } = {
      risk_assessment: "Risk Assessment",
      compliance_score: "Compliance Review",
      perspective_review: "Perspective Analysis",
      full_summary: "Full Summary",
      ai_integration: "AI Integration Review",
    };
    return (
      types[type] ||
      type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Get perspective display name
  const getPerspectiveDisplay = (perspectiveValue: string): string => {
    const perspectives: { [key: string]: string } = {
      risk: "Risk Analysis",
      compliance: "Compliance Focus",
      perspective: "Multi-Perspective",
      summary: "Summary Analysis",
      ai: "AI Integration",
      "data-subject": "Data Subject",
      organization: "Organization",
      "data-controller": "Data Controller",
      "data-processor": "Data Processor",
      "disclosing-party": "Disclosing Party",
      "receiving-party": "Receiving Party",
      supplier: "Supplier",
      client: "Client",
      customer: "Customer",
      contractor: "Contractor",
      "end-user": "End User",
      mutual: "Mutual",
    };
    return perspectives[perspectiveValue] || perspectiveValue;
  };

  // Export contract data
  const buildExportPayload = () => {
    const exportSeveritySnapshot = {
      critical: severitySummary.critical ?? 0,
      high: severitySummary.high ?? 0,
      medium: severitySummary.medium ?? 0,
      low: severitySummary.low ?? 0,
      total: totalPriorityItems,
    };

    return {
      contract: {
        id: contractData.id,
        title: contractData.title,
        file_name: contractData.file_name,
        file_size: contractData.file_size,
        generated_at: reviewData.created_at,
        perspective: perspectiveKey,
        contract_type: classificationContractType,
        classification_label: classificationLabel,
        classification_sub_type: classificationSubType ?? null,
        classification_source: classificationSourceDisplay,
      },
      summary: {
        score,
        review_type: reviewData.review_type,
        solution: selectedSolution,
        solution_alignment: solutionAlignment,
        next_steps: topNextSteps,
        missing_information: missingInformation,
        overview: results.summary,
        analysis_mode: getReviewTypeDisplay(reviewData.review_type),
        severity_snapshot: exportSeveritySnapshot,
        dominant_departments: topDepartments.map(([dept, count]) => ({
          key: dept,
          label: getDepartmentStyle(dept).label,
          count,
        })),
        classification: {
          contractType: classificationContractType,
          label: classificationLabel,
          subType: classificationSubType ?? null,
          source: classificationSourceDisplay,
        },
      },
      clauses: resolvedClauseExtractions,
      recommendations: normalizedRecommendations,
      action_items: normalizedActionItems,
      agent_edits: acceptedAgentEdits.map((edit) => ({
        id: edit.id,
        clause_reference: edit.clauseReference ?? null,
        change_type: edit.changeType ?? null,
        original_text: edit.originalText ?? null,
        suggested_text: edit.suggestedText,
        rationale: edit.rationale,
        severity: edit.severity ?? null,
        provider: edit.provider ?? null,
        model: edit.model ?? null,
        created_at: edit.createdAt,
        references: edit.references ?? null,
      })),
      raw_results: results,
    };
  };

  const exportAsJson = async () => {
    const payload = buildExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contract-analysis-${contractData?.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsDocx = async () => {
    const payload = buildExportPayload();
    const severitySnapshot = payload.summary.severity_snapshot;
    const severityList = severitySnapshot && severitySnapshot.total
      ? ["critical", "high", "medium", "low"]
          .filter((level) => (severitySnapshot as any)[level] > 0)
          .map(
            (level) =>
              `<li>${formatLabel(level)} issues: ${(severitySnapshot as any)[level]}</li>`,
          )
          .join("")
      : "";

    const dominantDepartments = payload.summary.dominant_departments || [];
    const agentEditsHtml = payload.agent_edits && payload.agent_edits.length
      ? `<h2>Approved Agent Edits</h2>${payload.agent_edits
          .map(
            (edit: any) => `
        <div style="margin-bottom:12px;">
          <h4>${edit.clause_reference || edit.id || "Clause"}</h4>
          <p><strong>Change:</strong> ${formatLabel(edit.change_type || "modify")}</p>
          ${edit.original_text ? `<p><strong>Original:</strong> ${edit.original_text}</p>` : ""}
          <p><strong>Suggested:</strong> ${edit.suggested_text}</p>
          <p><strong>Rationale:</strong> ${edit.rationale}</p>
          <p><strong>Severity:</strong> ${formatLabel(edit.severity || "info")}</p>
        </div>
      `,
          )
          .join("")}
      `
      : "";

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Maigon Contract Analysis</title></head><body>
      <h1>Contract Analysis Report</h1>
      <p><strong>Document:</strong> ${payload.contract.file_name || "Untitled"}</p>
      <p><strong>Contract Type:</strong> ${payload.contract.classification_label || "Not specified"}${payload.contract.classification_sub_type ? ` (${payload.contract.classification_sub_type})` : ""}</p>
      <p><strong>Classification Source:</strong> ${payload.contract.classification_source || "Maigon AI classifier"}</p>
      <p><strong>Perspective:</strong> ${getPerspectiveDisplay(perspectiveKey || "general")}</p>
      <p><strong>Generated:</strong> ${new Date(payload.contract.generated_at).toLocaleString()}</p>
      <h2>Executive Summary</h2>
      <p><strong>Score:</strong> ${payload.summary.score}%</p>
      <p><strong>Analysis Mode:</strong> ${payload.summary.analysis_mode}</p>
      ${payload.summary.solution ? `<p><strong>Solution:</strong> ${payload.summary.solution.title || payload.summary.solution.key || payload.summary.solution.id}</p>` : ""}
      <p>${payload.summary.overview || ""}</p>
      ${
        severitySnapshot && severitySnapshot.total
          ? `<h3>Priority Snapshot</h3><ul>${severityList}</ul>`
          : ""
      }
      ${
        dominantDepartments.length
          ? `<p><strong>Key Departments:</strong> ${dominantDepartments
              .map(
                (dept: any) =>
                  `${dept.label} (${dept.count})`,
              )
              .join(", ")}</p>`
          : ""
      }
      ${
        payload.summary.next_steps.length
          ? `<h3>Immediate Next Steps</h3><ol>${payload.summary.next_steps
              .map(
                (step: any) =>
                  `<li>${step.description} (Owner: ${formatLabel(step.owner)}, Due: ${step.dueTimeline})</li>`,
              )
              .join("")}</ol>`
          : ""
      }
      ${
        payload.summary.missing_information.length
          ? `<h3>Missing or Unconfirmed Information</h3><ul>${payload.summary.missing_information
              .map((item: string) => `<li>${item}</li>`)
              .join("")}</ul>`
          : ""
      }
      ${
        payload.recommendations.length
          ? `<h2>Recommendations</h2><ul>${payload.recommendations
              .map(
                (rec: any) =>
                  `<li><strong>${formatLabel(rec.severity)}</strong> - ${rec.description} (Owner: ${formatLabel(rec.owner)}, Due: ${rec.dueTimeline})</li>`,
              )
              .join("")}</ul>`
          : ""
      }
      ${
        payload.action_items.length
          ? `<h2>Action Items</h2><ul>${payload.action_items
              .map(
                (item: any) =>
                  `<li><strong>${formatLabel(item.severity)}</strong> - ${item.description} (Owner: ${formatLabel(item.owner)}, Due: ${item.dueTimeline})</li>`,
              )
              .join("")}</ul>`
          : ""
      }
      ${agentEditsHtml}
    </body></html>`;

    const blob = new Blob([htmlContent], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contract-analysis-${contractData?.id}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: "json" | "doc") => {
    if (!user || !contractData) return;

    try {
      if (format === "json") {
        await exportAsJson();
      } else {
        await exportAsDocx();
      }

      toast({
        title: "Export ready",
        description: format === "json" ? "Downloaded analysis JSON." : "Word document generated.",
      });
    } catch (error) {
      logError("❌ Export error", error, {
        contractId: reviewData?.contract_id ?? null,
        reviewId: reviewData?.id ?? null,
      });

      toast({
        title: "Export failed",
        description: createUserFriendlyMessage(
          error,
          "We couldn't prepare the export file.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const payload = buildExportPayload();
    const summaryText = `Maigon Contract Analysis
Document: ${payload.contract.file_name ?? "Untitled"}
Contract Type: ${payload.contract.classification_label ?? "Not specified"}
Score: ${payload.summary.score}%
Mode: ${payload.summary.analysis_mode}
Next step: ${
      payload.summary.next_steps[0]?.description ??
      "Review recommendations"
    }`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Maigon Contract Analysis",
          text: summaryText,
        });
        toast({ title: "Share sent" });
      } else {
        await navigator.clipboard.writeText(summaryText);
        toast({
          title: "Summary copied",
          description: "Analysis summary copied to clipboard for sharing.",
        });
      }
    } catch (error) {
      toast({
        title: "Share unavailable",
        description: createUserFriendlyMessage(
          error,
          "Unable to share automatically. Please copy details manually.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleBackToSolutions = () => {
    navigate("/user-solutions");
  };

  const handleNewReview = () => {
    navigate("/perspective-selection");
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-[#9A7C7C] mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-lora text-[#271D1D] mb-2">
            Loading Contract Analysis
          </h2>
          <p className="text-[#271D1D]/70">
            Please wait while we prepare your results...
          </p>
        </div>
      </div>
    );
  }

  if (!contractData || !reviewData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-lora text-[#271D1D] mb-2">
            No Contract Data
          </h2>
          <p className="text-[#271D1D]/70 mb-4">
            Please upload a contract first.
          </p>
          <Button onClick={() => navigate("/user-solutions")}>
            Back to Solutions
          </Button>
        </div>
      </div>
    );
  }

  const structuredReport = useMemo<AnalysisReport | null>(() => {
    if (!results || typeof results !== "object") {
      return null;
    }
    const raw = (results as Record<string, unknown>).structured_report;
    if (raw && typeof raw === "object") {
      return raw as AnalysisReport;
    }
    return null;
  }, [results]);

  const generalInformation = structuredReport?.generalInformation;
  const contractSummaryReport = structuredReport?.contractSummary;
  const resolvedPerspectiveLabel = useMemo(() => {
    if (contractSummaryReport?.agreementDirection) {
      return contractSummaryReport.agreementDirection;
    }
    if (generalInformation?.selectedPerspective) {
      return generalInformation.selectedPerspective;
    }
    return getPerspectiveDisplay(perspectiveKey || "general");
  }, [
    contractSummaryReport?.agreementDirection,
    generalInformation?.selectedPerspective,
    perspectiveKey,
  ]);
  const structuredIssues = structuredReport?.issuesToAddress ?? [];
  const structuredCriteria = structuredReport?.criteriaMet ?? [];
  const structuredPlaybookInsights = structuredReport?.playbookInsights ?? [];
  const structuredClauseExtractions = structuredReport?.clauseExtractions ?? [];
  const structuredSimilarityAnalysis =
    structuredReport?.similarityAnalysis ?? [];
  const structuredDeviationInsights =
    structuredReport?.deviationInsights ?? [];
  const structuredReportActionItems = structuredReport?.actionItems ?? [];
  const playbookCoverage = structuredReport?.metadata?.playbookCoverage ?? null;
  const coveragePercent =
    typeof playbookCoverage?.coverageScore === "number"
      ? Math.round(playbookCoverage.coverageScore * 100)
      : null;
  const uncoveredCriticalClauses =
    playbookCoverage?.criticalClauses?.filter((clause) => !clause.met) ?? [];
  const uncoveredAnchors =
    playbookCoverage?.anchorCoverage?.filter((anchor) => !anchor.met) ?? [];
  const locationTimings =
    locationState.timings ??
    storedPayload?.timings ??
    null;
  const derivedTimingSeconds = locationTimings?.analysisMs
    ? locationTimings.analysisMs / 1000
    : locationTimings?.workflowMs
      ? locationTimings.workflowMs / 1000
      : null;
  const persistedTimingSeconds =
    typeof resultsRecord.processing_time === "number"
      ? (resultsRecord.processing_time as number)
      : typeof resultsMetadata?.["workflowLatencyMs"] === "number"
        ? ((resultsMetadata["workflowLatencyMs"] as number) / 1000)
        : typeof resultsMetadata?.["latency_ms"] === "number"
          ? ((resultsMetadata["latency_ms"] as number) / 1000)
          : null;
  const reviewDurationSeconds =
    derivedTimingSeconds ?? persistedTimingSeconds ?? null;
  const formattedReviewTime = formatReviewDuration(reviewDurationSeconds);
  const contractMetadata = (contractData?.metadata ?? null) as
    | Record<string, unknown>
    | null;
  const summaryContractName =
    contractData?.file_name ||
    contractData?.title ||
    contractSummaryReport?.contractName ||
    "n/a";
  const summaryParties =
    contractSummaryReport?.parties?.length
      ? contractSummaryReport.parties
      : (() => {
          const partiesValue = contractMetadata
            ? (contractMetadata["parties"] as unknown)
            : undefined;
          if (Array.isArray(partiesValue)) {
            return partiesValue.map((value) => String(value));
          }
          if (typeof partiesValue === "string") {
            return partiesValue
              .split(/[,;]+/)
              .map((entry) => entry.trim())
              .filter(Boolean);
          }
          return null;
        })();
  const summaryPurpose =
    contractSummaryReport?.purpose ||
    readString(contractMetadata, "purpose", "contractPurpose") ||
    "n/a";
  const summaryGoverningLaw =
    contractSummaryReport?.governingLaw ||
    readString(contractMetadata, "governingLaw", "governing_law") ||
    "Not specified";
  const summaryJurisdiction =
    contractSummaryReport?.jurisdiction ||
    readString(contractMetadata, "jurisdiction", "jurisdiction_clause") ||
    "Not specified";
  const summaryContractPeriod =
    contractSummaryReport?.contractPeriod || "Not specified";
  const summaryVerbalInfo =
    contractSummaryReport?.verbalInformationCovered === undefined ||
    contractSummaryReport?.verbalInformationCovered === null
      ? "Not specified"
      : contractSummaryReport.verbalInformationCovered
        ? "Yes"
        : "No";

  const clauseTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    (structuredReport?.clauseFindings ?? []).forEach((clause: ClauseFinding) => {
      if (clause.clauseId) {
        map.set(clause.clauseId, clause.title);
      }
    });
    return map;
  }, [structuredReport]);

  const fullDocumentText = useMemo(() => {
    if (typeof contractData?.content === "string" && contractData.content.trim()) {
      return contractData.content;
    }
    if (typeof contractData?.content_html === "string" && contractData.content_html.trim()) {
      return htmlStringToPlainText(contractData.content_html);
    }
    return null;
  }, [contractData?.content, contractData?.content_html]);
  const parsedClauseExtractions = useMemo(
    () => deriveClauseExtractionsFromContent(contractData?.content ?? null),
    [contractData?.content],
  );
  const fullDocumentClauseExtractions = useMemo(
    () =>
      deriveClauseExtractionsFromContent(fullDocumentText, 120, {
        includeFullText: true,
      }),
    [fullDocumentText],
  );
  const resolvedClauseExtractions = structuredClauseExtractions.length
    ? structuredClauseExtractions
    : parsedClauseExtractions.length
      ? parsedClauseExtractions
      : (structuredReport?.clauseFindings ?? []).map((clause, index) => ({
          id: clause.clauseId ?? `clause-fallback-${index + 1}`,
          clauseId: clause.clauseId ?? null,
          title: clause.title,
          category: clause.riskLevel ?? "clause",
          originalText:
            clause.summary || clause.recommendation || "Clause summary unavailable",
          importance: clause.riskLevel as ClauseExtraction["importance"],
          location: null,
          references:
            typeof (clause as Record<string, unknown>)?.page_reference === "string"
              ? [(clause as Record<string, string>).page_reference]
              : [],
        }));
  const clauseEvidenceSources = fullDocumentClauseExtractions.length
    ? fullDocumentClauseExtractions
    : resolvedClauseExtractions;
  const resolvedPlaybookInsights: PlaybookInsight[] =
    structuredPlaybookInsights.length
      ? structuredPlaybookInsights
      : structuredIssues.map((issue, index) => ({
          id: issue.id ?? `playbook-${index + 1}`,
          title: issue.title,
          summary: issue.rationale,
          severity: issue.severity,
          status: issue.severity === "low" ? "met" : "attention",
          recommendation: issue.recommendation,
          guidance:
            issue.legalBasis?.map((basis) => basis.summary) ?? [],
          relatedClauseIds: issue.clauseReference?.heading
            ? [issue.clauseReference.heading]
            : [],
        }));
  const resolvedDeviationInsights: DeviationInsight[] =
    structuredDeviationInsights.length
      ? structuredDeviationInsights
      : structuredIssues.map((issue, index) => ({
          id: issue.id ?? `deviation-${index + 1}`,
          title: issue.title,
          deviationType: issue.category ?? "clause",
          severity: issue.severity,
          description: issue.rationale,
          expectedStandard:
            issue.legalBasis?.[0]?.summary ??
            "Align with Maigon playbook expectations.",
          observedLanguage:
            issue.clauseReference?.excerpt ?? issue.recommendation,
          recommendation: issue.recommendation,
          clauseId: issue.clauseReference?.heading ?? undefined,
          status: "open",
        }));
  const resolvedSimilarityAnalysis: SimilarityMatch[] =
    structuredSimilarityAnalysis.length
      ? structuredSimilarityAnalysis
      : resolvedClauseExtractions.map((clause, index) => {
          const fallbackScore = Math.max(0.35, 0.75 - index * 0.1);
          return {
            id: clause.id ?? `similarity-${index + 1}`,
            referenceId: clause.clauseId ?? undefined,
            sourceTitle: `${classificationLabel} benchmark`,
            similarityScore: Number(fallbackScore.toFixed(2)),
            excerpt:
              typeof clause.originalText === "string"
                ? clause.originalText
                : "",
            rationale: `Compared with Maigon's ${classificationLabel} standard clauses.`,
            tags: clause.references ?? [],
          };
        });

  const structuredProposedEdits = useMemo<ProposedEdit[]>(() => {
    const merged = new Map<string, ProposedEdit>();
    const push = (edit: ProposedEdit | null | undefined) => {
      if (!edit || typeof edit.id !== "string" || !edit.id.trim()) return;
      merged.set(edit.id.toLowerCase(), edit);
    };

    if (Array.isArray(structuredReport?.proposedEdits)) {
      structuredReport!.proposedEdits.forEach(push);
    }

    const legacy = (results as Record<string, unknown>).proposed_edits;
    if (Array.isArray(legacy)) {
      legacy
        .map((item) => normalizeLegacyProposedEdit(item))
        .filter((edit): edit is ProposedEdit => Boolean(edit))
        .forEach((edit) => {
          // If legacy has more edits than structured, prefer the longer list
          if (!merged.has(edit.id.toLowerCase())) {
            push(edit);
          }
        });
    }

    return Array.from(merged.values());
  }, [structuredReport, results]);

  const severityBuckets = useMemo<Record<string, Issue[]>>(() => {
    const buckets: Record<string, Issue[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      default: [],
    };
    structuredIssues.forEach((issue) => {
      const key =
        issue.severity && buckets[issue.severity]
          ? issue.severity
          : "default";
      buckets[key].push(issue);
    });
    return buckets;
  }, [structuredIssues]);

  const [expandedSeverities, setExpandedSeverities] = useState<
    Record<string, boolean>
  >({
    critical: true,
    high: true,
    medium: false,
    low: false,
    default: false,
  });

  useEffect(() => {
    setExpandedSeverities({
      critical: true,
      high: true,
      medium: structuredIssues.length <= 5,
      low: false,
      default: false,
    });
  }, [reviewData?.id, structuredIssues.length]);

  const toggleSeveritySection = useCallback((severity: string) => {
    setExpandedSeverities((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  }, []);

  const structuredActionItems = useMemo<NormalizedDecision[]>(() => {
    if (!structuredProposedEdits.length) {
      return [];
    }
    return structuredProposedEdits.map((edit) =>
      convertProposedEditToDecision(
        edit,
        edit.clauseId ? clauseTitleMap.get(edit.clauseId) ?? null : null,
      ),
    );
  }, [structuredProposedEdits, clauseTitleMap]);
  const proposedEditLookup = useMemo(() => {
    const lookup = new Map<string, ProposedEdit>();
    structuredProposedEdits.forEach((edit) => {
      if (typeof edit.id === "string" && edit.id.trim().length > 0) {
        lookup.set(edit.id.toLowerCase(), edit);
      }
      if (typeof edit.clauseId === "string" && edit.clauseId.trim().length > 0) {
        lookup.set(edit.clauseId.toLowerCase(), edit);
      }
      if (typeof edit.anchorText === "string" && edit.anchorText.trim().length > 0) {
        lookup.set(edit.anchorText.toLowerCase(), edit);
      }
    });
    return lookup;
  }, [structuredProposedEdits]);
  const score =
    (typeof reviewData.score === "number"
      ? reviewData.score
      : typeof results.score === "number"
        ? results.score
        : 0) || 0;
  const contractMetadataRecord = contractData?.metadata
    ? (contractData.metadata as Record<string, unknown>)
    : null;
  const contractRecord = contractData
    ? (contractData as unknown as Record<string, unknown>)
    : null;

  const solutionAlignment =
    results.solution_alignment || results.solutionAlignment || null;
  const selectedSolution = results.selected_solution || null;

  const rawRecommendations = [
    ...(Array.isArray(results.recommendations)
      ? (results.recommendations as unknown[])
      : []),
    ...(Array.isArray(results.strategic_recommendations)
      ? (results.strategic_recommendations as unknown[])
      : []),
  ];
  const normalizedRecommendations = dedupeDecisions(
    normalizeDecisionEntries(rawRecommendations, "rec", "medium"),
  );

  const rawActionItems: unknown[] =
    structuredProposedEdits.length > 0
      ? // If we have proposed edits, ignore legacy/freeform action items and rely solely on the structured edits.
        []
      : [
          ...(Array.isArray(results.action_items)
            ? (results.action_items as unknown[])
            : []),
          ...structuredReportActionItems,
        ];

  const normalizedActionItems = dedupeDecisions([
    ...normalizeDecisionEntries(rawActionItems, "act", "high"),
    ...structuredActionItems,
  ]).map((entry) => {
    // Ensure the action items derived from proposed edits always carry the rewritten clause
    if (entry.proposedEdit) {
      const previousText =
        entry.proposedEdit.previousText ??
        entry.proposedEdit.anchorText ??
        null;
      const updatedText =
        entry.proposedEdit.updatedText ??
        entry.proposedEdit.proposedText ??
        entry.proposedEdit.anchorText ??
        null;
      return {
        ...entry,
        proposedEdit: {
          ...entry.proposedEdit,
          previousText,
          updatedText,
          proposedText: updatedText ?? entry.proposedEdit.proposedText,
          previewHtml: buildPreviewHtmlFromText(previousText ?? undefined, updatedText ?? undefined),
        },
      };
    }
    return entry;
  });
const recommendationEntries = useMemo(
  () =>
    attachFallbackClausePreviews(
      normalizedRecommendations,
      resolvedClauseExtractions,
    ),
  [normalizedRecommendations, resolvedClauseExtractions],
);
const actionItemEntries = useMemo(
  () =>
    attachFallbackClausePreviews(
      normalizedActionItems,
      resolvedClauseExtractions,
    ),
  [normalizedActionItems, resolvedClauseExtractions],
);
  const missingInformation: string[] = Array.isArray(results.missing_information)
    ? (results.missing_information as string[])
    : Array.isArray(results.missing_clauses)
      ? (results.missing_clauses as string[])
      : Array.isArray(results.missing_clauses_details)
        ? (results.missing_clauses_details as string[])
        : Array.isArray(results.gaps)
          ? (results.gaps as string[])
          : Array.isArray(solutionAlignment?.gaps)
            ? (solutionAlignment?.gaps as string[])
            : [];
  const displayMissingInformation = missingInformation.filter((item) => {
    if (typeof item !== "string") return false;
    const normalized = item.trim();
    if (!normalized) return false;
    return !shouldHideFallbackMessage(normalized);
  });

  const combinedDecisions = useMemo(() => {
    // When we have structured proposed edits, prefer those action items
    // so the UI shows rewritten clauses rather than high-level recommendations.
    if (structuredProposedEdits.length > 0) {
      return actionItemEntries;
    }
    return [...recommendationEntries, ...actionItemEntries];
  }, [recommendationEntries, actionItemEntries, structuredProposedEdits.length]);
  const topNextSteps = combinedDecisions;

  const severitySummary = useMemo(() => {
    const base: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      default: 0,
    };
    combinedDecisions.forEach((item) => {
      const level = SEVERITY_ORDER[item.severity] !== undefined
        ? item.severity
        : "default";
      base[level] = (base[level] ?? 0) + 1;
    });
    return base;
  }, [combinedDecisions]);

  const totalPriorityItems = combinedDecisions.length;

  useEffect(() => {
    setSuggestionSelection((prev) => {
      const next = { ...prev };
      let changed = false;

      combinedDecisions.forEach((item) => {
        if (!(item.id in next)) {
          next[item.id] = true;
          changed = true;
        }
      });

      Object.keys(next).forEach((id) => {
        if (!combinedDecisions.some((item) => item.id === id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [combinedDecisions]);

  const handleSelectAllSuggestions = useCallback(() => {
    setSuggestionSelection((prev) => {
      const next = { ...prev };
      combinedDecisions.forEach((item) => {
        if (next[item.id] !== true) {
          next[item.id] = true;
        }
      });
      return next;
    });
  }, [combinedDecisions]);

  const handleClearAllSuggestions = useCallback(() => {
    setSuggestionSelection((prev) => {
      const next = { ...prev };
      combinedDecisions.forEach((item) => {
        if (next[item.id] !== false) {
          next[item.id] = false;
        }
      });
      return next;
    });
  }, [combinedDecisions]);

  const selectedSuggestions = useMemo(
    () =>
      combinedDecisions.filter((item) => suggestionSelection[item.id] !== false),
    [combinedDecisions, suggestionSelection],
  );

  const selectedSuggestionCount = selectedSuggestions.length;
  const visibleDecisions = useMemo(
    () =>
      expandedSections.actions
        ? combinedDecisions
        : combinedDecisions.slice(0, 3),
    [combinedDecisions, expandedSections.actions],
  );
  const groupedDecisionEntries = useMemo(
    () => groupDecisionsByClause(visibleDecisions, resolvedClauseExtractions),
    [visibleDecisions, resolvedClauseExtractions],
  );

  const topDepartments = useMemo(() => {
    const counts = new Map<string, number>();
    combinedDecisions.forEach((item) => {
      const dept = item.department || "general";
      counts.set(dept, (counts.get(dept) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [combinedDecisions]);

  const hasSeverityBreakdown = useMemo(
    () =>
      SEVERITY_DISPLAY_ORDER.some(
        (level) =>
          level !== "default" &&
          (severitySummary as Record<string, number>)[level] > 0,
      ),
    [severitySummary],
  );

  const severitySnapshot = useMemo(
    () => ({
      critical: severitySummary.critical ?? 0,
      high: severitySummary.high ?? 0,
      medium: severitySummary.medium ?? 0,
      low: severitySummary.low ?? 0,
      total: totalPriorityItems,
    }),
    [severitySummary, totalPriorityItems],
  );

  const metadataSolutionKey = useMemo(() => {
    const meta = contractData?.metadata as
      | (Record<string, unknown> & {
          selected_solution_key?: string;
          selected_solution_id?: string;
        })
      | null
      | undefined;
    if (!meta) return null;
    if (typeof meta.selected_solution_key === "string") {
      return meta.selected_solution_key;
    }
    if (typeof meta.selected_solution_id === "string") {
      return meta.selected_solution_id;
    }
    return null;
  }, [contractData?.metadata]);

  const agentContext = useMemo<AgentChatContext>(
    () => ({
      contract: {
        id: contractData?.id ?? null,
        title: contractData?.title ?? null,
        contractType: classificationContractType,
        classificationFallback: classificationFallbackUsed,
      },
      severitySnapshot,
      topDepartments: topDepartments.map(([key, count]) => ({
        key,
        label: getDepartmentStyle(key).label,
        count,
      })),
      missingInformation: displayMissingInformation,
      recommendations: recommendationEntries.map((item) => ({
        id: item.id,
        description: item.description,
        severity: item.severity,
        department: item.department,
        owner: item.owner,
        dueTimeline: item.dueTimeline,
      })),
      actionItems: combinedDecisions.map((item) => ({
        id: item.id,
        description: item.description,
        severity: item.severity,
        department: item.department,
        owner: item.owner,
        dueTimeline: item.dueTimeline,
      })),
    }),
    [
      contractData?.id,
      contractData?.title,
      classificationContractType,
      classificationFallbackUsed,
      severitySnapshot,
      topDepartments,
      displayMissingInformation,
      recommendationEntries,
      combinedDecisions,
    ],
  );

  const acceptedAgentEdits = useMemo(
    () => agentEdits.filter((edit) => edit.status === "accepted"),
    [agentEdits],
  );

  useEffect(() => {
    if (acceptedAgentEdits.length === 0) {
      if (includeAcceptedAgentEdits) {
        setIncludeAcceptedAgentEdits(false);
      }
      if (hasManuallyToggledIncludeEdits) {
        setHasManuallyToggledIncludeEdits(false);
      }
      return;
    }

    if (!hasManuallyToggledIncludeEdits && !includeAcceptedAgentEdits) {
      setIncludeAcceptedAgentEdits(true);
    }
  }, [
    acceptedAgentEdits.length,
    hasManuallyToggledIncludeEdits,
    includeAcceptedAgentEdits,
  ]);

  const handleAgentEdits = useCallback(
    (
      edits: AgentProposedEdit[],
      meta: AgentInteractionMeta,
    ) => {
      const timestamp = new Date().toISOString();
      const fallbackUsed = meta.provider ? meta.provider !== "openai" : false;

      const nextEntries = (edits ?? []).map((edit, index) => ({
        ...edit,
        internalId: `${timestamp}-${index}-${edit.id}`,
        status: "pending" as const,
        provider: meta.provider,
        model: meta.model,
        createdAt: timestamp,
        interactionId: null,
      }));

      if (nextEntries.length > 0) {
        setAgentEdits((prev) => [...nextEntries, ...prev]);
      }

      if (user?.profileId) {
        const solutionKeyForAnalytics =
          (selectedSolution &&
            (selectedSolution.key || selectedSolution.id || null)) ||
          metadataSolutionKey;

        void AnalyticsEventsService.recordMetric({
          user_id: user.profileId,
          contract_id: contractData?.id ?? null,
          review_id: reviewData?.id ?? null,
          ingestion_id: null,
          model_used: meta.model ?? null,
          review_type: reviewData?.review_type ?? "agent_interaction",
          contract_type: classificationContractType,
          solution_key: solutionKeyForAnalytics,
          fallback_used: fallbackUsed,
          retry_count: 0,
          latency_ms: meta.latencyMs ?? null,
          metadata: {
            event: "agent_interaction",
            provider: meta.provider ?? null,
            model: meta.model ?? null,
            editCount: edits?.length ?? 0,
          },
        });

        const interactionPayload: Parameters<
          typeof AgentInteractionsService.logInteraction
        >[0] = {
          user_id: user.profileId,
          contract_id: contractData?.id ?? null,
          review_id: reviewData?.id ?? null,
          provider: meta.provider ?? null,
          model: meta.model ?? null,
          edit_count: edits?.length ?? 0,
          fallback_used: fallbackUsed,
          latency_ms: meta.latencyMs ?? null,
          metadata: {
            event: "agent_interaction",
            reviewType: reviewData?.review_type ?? null,
          } as Parameters<
            typeof AgentInteractionsService.logInteraction
          >[0]["metadata"],
        };

        if (nextEntries.length > 0) {
          const affectedInternalIds = nextEntries.map((entry) => entry.internalId);
          void AgentInteractionsService.logInteraction(interactionPayload).then(
            (interaction) => {
              if (!interaction) return;
              setAgentEdits((prev) =>
                prev.map((entry) =>
                  affectedInternalIds.includes(entry.internalId)
                    ? { ...entry, interactionId: interaction.id }
                    : entry,
                ),
              );
            },
          );
        } else {
          void AgentInteractionsService.logInteraction(interactionPayload);
        }
      }
    },
    [
      user?.profileId,
      contractData?.id,
      reviewData?.id,
      reviewData?.review_type,
      classificationContractType,
      selectedSolution,
      metadataSolutionKey,
    ],
  );

  const updateAgentEditStatus = useCallback(
    (internalId: string, status: AgentEditWithStatus["status"]) => {
      let approvalPayload: Parameters<
        typeof AgentEditApprovalsService.recordApproval
      >[0] | null = null;

      setAgentEdits((prev) =>
        prev.map((edit) => {
          if (edit.internalId !== internalId) {
            return edit;
          }

          const nextEdit = { ...edit, status };

          if (
            status === "accepted" &&
            user?.profileId
          ) {
            approvalPayload = {
              user_id: user.profileId,
              contract_id: contractData?.id ?? null,
              review_id: reviewData?.id ?? null,
              interaction_id: edit.interactionId ?? null,
              proposed_edit_id: edit.id ?? null,
              clause_reference: edit.clauseReference ?? null,
              change_type: edit.changeType ?? null,
              suggested_text: edit.suggestedText ?? null,
              rationale: edit.rationale ?? null,
              metadata: {
                provider: edit.provider ?? null,
                model: edit.model ?? null,
              } as Parameters<
                typeof AgentEditApprovalsService.recordApproval
              >[0]["metadata"],
            };
          }

          return nextEdit;
        }),
      );

      if (approvalPayload) {
        void AgentEditApprovalsService.recordApproval(approvalPayload);
      }
    },
    [user?.profileId, contractData?.id, reviewData?.id],
  );

  const resetAgentEditStatus = useCallback((internalId: string) => {
    setAgentEdits((prev) =>
      prev.map((edit) =>
        edit.internalId === internalId ? { ...edit, status: "pending" } : edit,
      ),
    );
  }, []);

  const hasSelectedDraftInputs = useMemo(
    () =>
      selectedSuggestionCount > 0 ||
      (includeAcceptedAgentEdits && acceptedAgentEdits.length > 0),
    [
      selectedSuggestionCount,
      includeAcceptedAgentEdits,
      acceptedAgentEdits.length,
    ],
  );

  const handleGenerateDraft = useCallback(async () => {
    if (!contractData?.id) {
      toast({
        title: "Contract not available",
        description: "We couldn't find the contract needed to build a draft.",
        variant: "destructive",
      });
      return;
    }

    const suggestionsPayload: AgentDraftSuggestion[] = selectedSuggestions.map(
      (item) => ({
        id: item.id,
        description: item.description,
        severity: item.severity,
        department: item.department,
        owner: item.owner,
        dueTimeline: item.dueTimeline,
        proposedEdit: item.proposedEdit
          ? {
              id: item.proposedEdit.id,
              clauseId: item.proposedEdit.clauseId ?? null,
              clauseTitle: item.proposedEdit.clauseTitle ?? null,
              anchorText: item.proposedEdit.anchorText,
              proposedText: item.proposedEdit.updatedText ?? item.proposedEdit.proposedText,
              previousText: item.proposedEdit.previousText ?? item.proposedEdit.anchorText ?? null,
              updatedText: item.proposedEdit.updatedText ?? item.proposedEdit.proposedText ?? null,
              previewHtml: item.proposedEdit.previewHtml,
            }
          : undefined,
      }),
    );

    const editsPayload: AgentDraftEdit[] = includeAcceptedAgentEdits
      ? acceptedAgentEdits.map((edit) => ({
          id: edit.id || edit.internalId,
          clauseReference: edit.clauseReference ?? null,
          changeType: edit.changeType ?? null,
          originalText: edit.originalText ?? null,
          suggestedText: edit.suggestedText,
          rationale: edit.rationale,
        }))
      : [];

    if (suggestionsPayload.length === 0 && editsPayload.length === 0) {
      toast({
        title: "Nothing selected",
        description: "Choose at least one recommendation or accepted agent edit to apply.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingDraft(true);
      setDraftResult(null);
      setDraftJobId(null);
      setDraftJobStatus(null);

      const startResponse = await fetch("/api/agent/compose/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: contractData.id,
          suggestions: suggestionsPayload,
          agentEdits: editsPayload.length > 0 ? editsPayload : undefined,
        }),
      });

      if (!startResponse.ok) {
        const payload = await startResponse.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : `Draft generation failed (${startResponse.status})`,
        );
      }

      const startData = (await startResponse.json()) as AgentDraftJobStartResponse;
      setDraftJobId(startData.jobId);
      setDraftJobStatus(startData.status);

      const pollJob = async (jobId: string): Promise<AgentDraftResponse> => {
        const maxAttempts = 120; // ~6 minutes at 3s interval
        const delayMs = 3000;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const statusResponse = await fetch(`/api/agent/compose/status/${jobId}`);
          if (!statusResponse.ok) {
            const payload = await statusResponse.json().catch(() => ({}));
            throw new Error(
              typeof payload.error === "string"
                ? payload.error
                : `Status check failed (${statusResponse.status})`,
            );
          }

          const status = (await statusResponse.json()) as AgentDraftJobStatusResponse;
          setDraftJobStatus(status.status);

          if (status.status === "succeeded") {
            if (!status.result) {
              throw new Error("Draft completed but no result was returned.");
            }
            return status.result;
          }

          if (status.status === "failed") {
            throw new Error(status.error ?? "Draft generation failed.");
          }

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        throw new Error("Draft generation is taking longer than expected. Please try again.");
      };

      const result = await pollJob(startData.jobId);

      setDraftResult(result);
      setDraftViewMode("preview");
      setShowDraftDialog(true);
      toast({
        title: "Draft ready",
        description: "Review the updated contract draft generated by Maigon.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate an updated contract.";
      toast({
        title: "Draft generation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDraft(false);
      setDraftJobId(null);
      setDraftJobStatus(null);
    }
  }, [
    contractData?.id,
    selectedSuggestions,
    includeAcceptedAgentEdits,
    acceptedAgentEdits,
    toast,
  ]);

  const handleCopyDraft = useCallback(async () => {
    if (!updatedPlainText) return;
    try {
      await navigator.clipboard.writeText(updatedPlainText);
      toast({
        title: "Copied",
        description: "The generated contract has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description:
          error instanceof Error ? error.message : "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  }, [updatedPlainText, toast]);

  const handleCopyProposedEdit = useCallback(
    async (edit: ProposedEdit) => {
      try {
        await navigator.clipboard.writeText(edit.proposedText);
        toast({
          title: "Proposed language copied",
          description: "Paste directly into your contract or redline.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description:
            error instanceof Error
              ? error.message
              : "Your browser blocked clipboard access.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleDownloadTxt = useCallback(() => {
    if (!updatedPlainText) return;
    const safeTitle = contractData?.file_name
      ? contractData.file_name.replace(/\.[^.]+$/, "")
      : "contract";
    const fileName = `${safeTitle}-maigon-draft.txt`;
    const blob = new Blob([updatedPlainText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [updatedPlainText, contractData?.file_name]);

  const getExportPayload = useCallback(() => {
    if (draftResult?.draftId) {
      return { draftId: draftResult.draftId };
    }
    if (draftResult?.assetRef) {
      return { assetRef: draftResult.assetRef };
    }
    if (!exportHtml && !exportPlainText) {
      return null;
    }
    return {
      html: exportHtml ?? undefined,
      text: exportPlainText ?? undefined,
    };
  }, [draftResult?.draftId, draftResult?.assetRef, exportHtml, exportPlainText]);

  const handleDownloadDocx = useCallback(async () => {
    const payload = getExportPayload();
    if (!payload) {
      toast({
        title: "Draft unavailable",
        description: "Generate an updated draft before exporting to DOCX.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : `DOCX export failed (${response.status})`,
        );
      }

      const blob = await response.blob();
      const safeTitle = contractData?.file_name
        ? contractData.file_name.replace(/\.[^.]+$/, "")
        : "contract";
      const fileName = `${safeTitle}-maigon-draft.docx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "We couldn't generate the DOCX file.",
        variant: "destructive",
      });
    }
  }, [getExportPayload, contractData?.file_name, toast]);

  const handleDownloadPdf = useCallback(async () => {
    const payload = getExportPayload();
    if (!payload) {
      toast({
        title: "Draft unavailable",
        description: "Generate an updated draft before exporting to PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : `PDF export failed (${response.status})`,
        );
      }

      const blob = await response.blob();
      const safeTitle = contractData?.file_name
        ? contractData.file_name.replace(/\.[^.]+$/, "")
        : "contract";
      const fileName = `${safeTitle}-maigon-draft.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "We couldn't generate the PDF file.",
        variant: "destructive",
      });
    }
  }, [getExportPayload, contractData?.file_name, toast]);

  const handleDownloadRedlines = useCallback(async () => {
    if (!structuredProposedEdits.length) {
      toast({
        title: "No smart edits available",
        description: "Generate a report with proposed edits before exporting redlines.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/export/redline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractName: summaryContractName,
          proposedEdits: structuredProposedEdits,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : `Redline export failed (${response.status})`,
        );
      }

      const blob = await response.blob();
      const safeTitle = contractData?.file_name
        ? contractData.file_name.replace(/\.[^.]+$/, "")
        : "contract";
      const fileName = `${safeTitle}-maigon-redline.docx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Redline export failed",
        description:
          error instanceof Error
            ? error.message
            : "We couldn't generate the smart redline document.",
        variant: "destructive",
      });
    }
  }, [
    structuredProposedEdits,
    summaryContractName,
    contractData?.file_name,
    toast,
  ]);

  const draftDiffChunks = useMemo(() => {
    if (!originalPlainText && !updatedPlainText) {
      return [] as DiffChunk[];
    }
    return computeLineDiff(originalPlainText, updatedPlainText);
  }, [originalPlainText, updatedPlainText]);
  const trackedDiffNodes = useMemo(
    () => renderTrackedDiffChunks(draftDiffChunks),
    [draftDiffChunks],
  );

const handleDraftMissingClause = useCallback((item: string) => {
  setIsAgentOpen(true);
  setTimeout(() => {
    agentChatRef.current?.sendPrompt(
      `Draft an insertable clause that resolves the following gap: ${item}. Provide clause text ready to paste, and label it appropriately.`,
    );
  }, 150);
}, []);

const scrollToSection = useCallback((sectionId: string) => {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, []);

const showPlaybookSections = false;
const showSimilaritySection = false;
const showDeviationSection = false;
const showPrioritySnapshot = false;

const heroFileName =
  contractSummaryReport?.contractName ??
  contractData?.title ??
  contractData?.file_name ??
  (locationState.metadata?.fileName as string | undefined) ??
  storedPayload?.metadata?.fileName ??
  "Contract";
const heroNavItems: { id: string; label: string }[] = [
  { id: "issues-section", label: "Issues" },
  { id: "criteria-section", label: "Criteria Met" },
  { id: "draft-section", label: "Draft Generation" },
  ...(showPlaybookSections
    ? [{ id: "playbook-section", label: "Playbook" }]
    : []),
  ...(showSimilaritySection
    ? [{ id: "similarity-section", label: "Similarity" }]
    : []),
  ...(showDeviationSection
    ? [{ id: "deviation-section", label: "Deviations" }]
    : []),
];

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Minimal Header Bar - Hidden when printed */}
        <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToSolutions}
              className="flex items-center gap-2 text-[#9A7C7C] hover:text-[#725A5A] transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Solutions
            </button>
            <div className="text-gray-300">|</div>
            {organizationLogoUrl ? (
              <img
                src={organizationLogoUrl}
                alt={`${user?.organization?.name ?? "Organization"} logo`}
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <Logo />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleNewReview}
              variant="outline"
              size="sm"
              className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C] hover:text-white"
            >
              New Review
            </Button>
            <div className="relative">
              <Button
                onClick={() => setShowExportMenu((prev) => !prev)}
                variant="outline"
                size="sm"
                className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C] hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#E8DDDD] bg-white shadow-sm z-10">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExport("json");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-[#271D1D] hover:bg-[#F9F8F8]"
                  >
                    Download JSON
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExport("doc");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-[#271D1D] hover:bg-[#F9F8F8]"
                  >
                    Download Word (.doc)
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handlePrint();
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-[#271D1D] hover:bg-[#F9F8F8]"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              )}
            </div>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-[#9A7C7C] hover:bg-[#725A5A] text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
            <Button
              onClick={handleShare}
              size="sm"
              className="bg-[#D6CECE] text-[#271D1D] hover:bg-[#C4B5B5]"
            >
              Share
            </Button>
          </div>
        </div>

        {/* Report Content */}
        <div className="max-w-5xl mx-auto px-6 py-8 print:px-8 print:py-6">
          {structuredReport && (
            <section className="mb-10 rounded-3xl bg-gradient-to-br from-[#0B1223] via-[#161F35] to-[#0A0E19] px-6 py-8 text-white shadow-2xl print:hidden">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/80">
                    <span>Maigon AI review</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                      Reviewing
                    </p>
                    <h1 className="text-2xl font-semibold text-white font-lora">
                      {heroFileName}
                    </h1>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/60">
                      Quick insights
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-white/80">
                      <li>
                        • {structuredIssues.length} issue
                        {structuredIssues.length === 1 ? "" : "s"} flagged
                      </li>
                      <li>
                        • {combinedDecisions.length} action item
                        {combinedDecisions.length === 1 ? "" : "s"} ready
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {heroNavItems.map((item) => (
                      <Button
                        key={item.id}
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToSection(item.id)}
                        className="border-white/30 bg-transparent text-white hover:bg-white/10"
                      >
                        {item.label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      className="bg-white text-[#0B1223] hover:bg-white/90"
                      onClick={() => setIsAgentOpen(true)}
                    >
                      Ask Maigon Copilot
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Report Header */}
          {!structuredReport && (
          <div className="mb-8 pb-6 border-b border-gray-200 print:mb-6 print:pb-4">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-medium text-[#271D1D] font-lora mb-3 print:text-xl">
                  Contract Analysis Report
                </h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Document:</span>{" "}
                    {contractData.file_name}
                  </div>
                  <div>
                    <span className="font-medium">Perspective:</span>{" "}
                    {resolvedPerspectiveLabel}
                  </div>
                  <div>
                    <span className="font-medium">Generated:</span>{" "}
                    {new Date(reviewData.created_at).toLocaleDateString()} at{" "}
                    {new Date(reviewData.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                {organizationLogoUrl ? (
                  <img
                    src={organizationLogoUrl}
                    alt={`${user?.organization?.name ?? "Organization"} logo`}
                    className="h-12 w-12 object-contain rounded-lg border border-[#E8DDDD] bg-white"
                  />
                ) : (
                  <div className="text-[#725A5A] font-lora text-xl font-medium">
                    {user?.organization?.name ?? "MAIGON"}
                  </div>
                )}
                <div className="text-xs text-gray-500 text-right">
                  AI-Powered Contract Analysis
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Executive Summary */}
          <div className="mb-8 print:mb-6">
            <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
              Executive Summary
            </h2>

            {/* Score bar */}
            <div className="mb-4 rounded-lg border border-[#E8DDDD] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm text-[#6B4F4F]">
                <span className="font-semibold uppercase tracking-wide">
                  Score
                </span>
                <span className="font-semibold text-[#271D1D]">
                  {generalInformation?.complianceScore ?? "–"}/100
                </span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-[#F3E9E9] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9A7C7C] via-[#BBAAAA] to-[#D6CECE] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, generalInformation?.complianceScore ?? 0),
                    )}%`,
                  }}
                />
              </div>
            </div>

          {structuredReport && (
            <div className="mb-6 space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="bg-white border border-[#E8DDDD] rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide mb-3">
                    General Information
                  </h3>
                  <dl className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <dt className="text-xs uppercase text-gray-500">Score</dt>
                      <dd className="text-2xl font-semibold text-[#271D1D]">
                        {generalInformation?.complianceScore ?? "–"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-gray-500">
                        Perspective
                      </dt>
                      <dd className="font-medium">
                        {resolvedPerspectiveLabel ?? "n/a"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-gray-500">
                        Review Time
                      </dt>
                      <dd>{formattedReviewTime}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-gray-500">
                        Time Savings
                      </dt>
                      <dd>
                        {generalInformation
                          ? `${generalInformation.timeSavingsMinutes} min`
                          : "n/a"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase text-gray-500">
                        Report expires
                      </dt>
                      <dd>
                        {generalInformation?.reportExpiry
                          ? new Date(
                              generalInformation.reportExpiry,
                            ).toLocaleDateString()
                          : "n/a"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="bg-white border border-[#E8DDDD] rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide mb-3">
                    Contract Summary
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Name:
                      </span>{" "}
                      {summaryContractName}
                    </p>
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Parties:
                      </span>{" "}
                      {summaryParties?.length
                        ? summaryParties.join(" vs ")
                        : "n/a"}
                    </p>
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Purpose:
                      </span>{" "}
                      {summaryPurpose}
                    </p>
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Contract period:
                      </span>{" "}
                      {summaryContractPeriod}
                    </p>
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Verbal information covered:
                      </span>{" "}
                      {summaryVerbalInfo}
                    </p>
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Governing law:
                      </span>{" "}
                      {summaryGoverningLaw}
                    </p>
                    <p>
                      <span className="font-semibold text-[#271D1D]">
                        Jurisdiction:
                      </span>{" "}
                      {summaryJurisdiction}
                    </p>
                  </div>
                </div>
              </div>
              {showPlaybookSections && playbookCoverage && (
                <div className="bg-white border border-[#E8DDDD] rounded-lg p-6 shadow-sm mb-6">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B4F4F]">
                        Playbook coverage
                      </p>
                      <p className="text-3xl font-semibold text-[#271D1D]">
                        {coveragePercent ?? "--"}%
                      </p>
                      <p className="text-sm text-[#271D1D]/70">
                        {uncoveredCriticalClauses.length || uncoveredAnchors.length
                          ? "Review missing anchors below."
                          : "All required anchors satisfied."}
                      </p>
                    </div>
                    <div className="w-full md:w-48 h-2 bg-[#F3E9E9] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9A7C7C] transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, coveragePercent ?? 0),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  {(uncoveredCriticalClauses.length > 0 ||
                    uncoveredAnchors.length > 0) && (
                    <div className="mt-4 grid gap-2">
                      {uncoveredCriticalClauses.map((clause) => (
                        <div
                          key={clause.title}
                          className="rounded-md bg-[#FEFBFB] border border-[#F3E9E9] px-3 py-2 text-sm text-[#271D1D]/80"
                        >
                          <p className="font-semibold">{clause.title}</p>
                          {clause.missingMustInclude.length > 0 && (
                            <p className="text-xs text-[#6B4F4F]">
                              Missing: {clause.missingMustInclude.join(", ")}
                            </p>
                          )}
                        </div>
                      ))}
                      {uncoveredAnchors.map((anchor) => (
                        <div
                          key={anchor.anchor}
                          className="rounded-md bg-[#FFF8F1] border border-[#F3E9E9] px-3 py-2 text-sm text-[#6B4F4F]"
                        >
                          Anchor not satisfied: {anchor.anchor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {structuredIssues.length > 0 && (
                <div id="issues-section">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide">
                      Issues to be addressed
                    </h3>
                    <p className="text-xs text-gray-500">
                      {structuredIssues.length} findings
                    </p>
                  </div>
                  <div className="space-y-4">
                    {SEVERITY_DISPLAY_ORDER.map((severity) => {
                      const bucket = severityBuckets[severity];
                      if (!bucket || bucket.length === 0) {
                        return null;
                      }
                      const style =
                        SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.default;
                      const expanded = expandedSeverities[severity];
                      return (
                        <div
                          key={severity}
                          className="border border-[#E8DDDD] rounded-lg bg-white shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSeveritySection(severity)}
                            className="w-full flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                              />
                              <p className="text-sm font-semibold text-[#271D1D]">
                                {style.label}
                              </p>
                              <Badge
                                className={style.badge}
                              >{`${bucket.length} issue${bucket.length === 1 ? "" : "s"}`}</Badge>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-[#6B4F4F] transition-transform ${
                                expanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {expanded && (
                            <div className="px-4 pb-4 space-y-3">
                              {bucket.map((issue) => {
                                const issueEvidenceText =
                                  resolveClauseEvidenceFromDocument(
                                    issue.clauseReference,
                                    fullDocumentText,
                                  ) ??
                                  resolveClauseEvidenceText(
                                    issue.clauseReference,
                                    clauseEvidenceSources,
                                  );
                                const clauseKey =
                                  issue.clauseReference?.heading?.toLowerCase() ??
                                  issue.id?.toLowerCase() ??
                                  null;
                                const excerptKey =
                                  issue.clauseReference?.excerpt?.toLowerCase() ??
                                  null;
                                const matchingEdit =
                                  (clauseKey &&
                                    proposedEditLookup.get(clauseKey)) ||
                                  (excerptKey &&
                                    proposedEditLookup.get(excerptKey)) ||
                                  (issue.id &&
                                    proposedEditLookup.get(
                                      issue.id.toLowerCase(),
                                    )) ||
                                  null;
                                return (
                  <div
                    key={issue.id}
                    className="border border-[#F5D1C5] rounded-lg p-5 bg-[#FFF8F4] shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-[#271D1D]">
                          {issue.title}
                        </p>
                                        <span
                                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}
                                        >
                                          {style.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {issue.recommendation}
                      </p>
                      <ClauseEvidenceBlock
                        reference={issue.clauseReference}
                        fullText={issueEvidenceText}
                      />
                  </div>
                </div>
              );
            })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {structuredCriteria.length > 0 && (
                <div
                  id="criteria-section"
                  className="bg-[#F6FCF8] border border-[#CDE9D8] rounded-lg p-6 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide mb-4">
                    Criteria Met
                  </h3>
                  <div className="space-y-3">
                    {structuredCriteria.map((criterion) => {
                      const criteriaReference = criterion.evidence
                        ? ({ excerpt: criterion.evidence } as Issue["clauseReference"])
                        : null;
                      const criteriaEvidenceText =
                        resolveClauseEvidenceFromDocument(
                          criteriaReference,
                          fullDocumentText,
                        ) ??
                        resolveClauseEvidenceFromSnippet(
                          criterion.evidence,
                          clauseEvidenceSources,
                        );
                      return (
                        <div
                          key={criterion.id}
                          className="flex items-start gap-3 text-sm text-gray-800 bg-white/70 border border-[#D9F0E4] rounded-md p-3"
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="font-semibold text-[#271D1D]">
                              {criterion.title}
                            </p>
                            <p className="text-gray-600">
                              {criterion.description}
                            </p>
                            {criteriaReference && (
                              <ClauseEvidenceBlock
                                reference={criteriaReference}
                                fullText={criteriaEvidenceText}
                                tone="neutral"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {showPlaybookSections && structuredReport && (
                <div
                  id="playbook-section"
                  className="bg-white border border-[#E8DDDD] rounded-lg p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide">
                      Playbook: deviations and tools
                    </h3>
                    <p className="text-xs text-gray-500">
                      {resolvedPlaybookInsights.length > 0
                        ? `${resolvedPlaybookInsights.length} guidance item${resolvedPlaybookInsights.length === 1 ? "" : "s"}`
                        : "No playbook insights surfaced"}
                    </p>
                  </div>
                  {resolvedPlaybookInsights.length > 0 ? (
                    <div className="space-y-4">
                      {resolvedPlaybookInsights.map((insight) => {
                        const statusStyle = getInsightStatusStyle(
                          insight.status,
                        );
                        const severityStyle = insight.severity
                          ? getSeverityStyle(insight.severity)
                          : null;
                        return (
                          <div
                            key={insight.id}
                            className="rounded-lg border border-[#F3E9E9] bg-[#FEFBFB] p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-[#271D1D]">
                                {insight.title}
                              </p>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.badge}`}
                              >
                                {statusStyle.label}
                              </span>
                              {severityStyle ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyle.badge}`}
                                >
                                  {severityStyle.label}
                                </span>
                              ) : null}
                            </div>
                            {insight.summary && (
                              <p className="mt-2 text-sm text-gray-700">
                                {insight.summary}
                              </p>
                            )}
                            {insight.recommendation && (
                              <p className="mt-2 text-xs text-[#725A5A]">
                                Recommendation: {insight.recommendation}
                              </p>
                            )}
                            {insight.guidance?.length ? (
                              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                                {insight.guidance.map((line, index) => (
                                  <li key={index} className="flex gap-2">
                                    <span className="text-[#9A7C7C]">•</span>
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No playbook deviations were detected for this contract.
                    </p>
                  )}
                </div>
              )}
              {showSimilaritySection && structuredReport && (
                <div
                  id="similarity-section"
                  className="bg-white border border-[#E8DDDD] rounded-lg p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide">
                      Similarity analysis
                    </h3>
                    <p className="text-xs text-gray-500">
                      {resolvedSimilarityAnalysis.length > 0
                        ? `Highest match: ${Math.round(
                            (resolvedSimilarityAnalysis[0].similarityScore ||
                              0) * 100,
                          )}%`
                        : "No close document matches"}
                    </p>
                  </div>
                  {resolvedSimilarityAnalysis.length > 0 ? (
                    <div className="space-y-3">
                      {resolvedSimilarityAnalysis.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-lg border border-[#EDE1E1] p-4 bg-white"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#271D1D]">
                                {match.sourceTitle}
                              </p>
                              {match.tags?.length ? (
                                <p className="text-xs text-gray-500">
                                  {match.tags.join(", ")}
                                </p>
                              ) : null}
                            </div>
                            <span className="text-sm font-semibold text-[#271D1D]">
                              {Math.round((match.similarityScore || 0) * 100)}%
                            </span>
                          </div>
                          {match.excerpt && (
                            <p className="mt-2 text-sm text-gray-700">
                              “{match.excerpt.trim()}”
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#9A7C7C]/40 text-[#9A7C7C]"
                              onClick={() => setActiveSimilarityMatch(match)}
                            >
                              View section guide
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No near-duplicate agreements were highlighted for this review.
                    </p>
                  )}
                </div>
              )}
              {showDeviationSection && structuredReport && (
                <div
                  id="deviation-section"
                  className="bg-white border border-[#E8DDDD] rounded-lg p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide">
                      Deviation analysis
                    </h3>
                    <p className="text-xs text-gray-500">
                      {resolvedDeviationInsights.length > 0
                        ? `${resolvedDeviationInsights.length} flagged item${resolvedDeviationInsights.length === 1 ? "" : "s"}`
                        : "No deviations flagged"}
                    </p>
                  </div>
                  {resolvedDeviationInsights.length > 0 ? (
                    <div className="space-y-3">
                      {resolvedDeviationInsights.map((deviation) => {
                        const severityStyle = getSeverityStyle(
                          deviation.severity,
                        );
                        return (
                          <div
                            key={deviation.id}
                            className="rounded-lg border border-[#F1E6E6] bg-white p-4"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyle.badge}`}
                              >
                                {severityStyle.label}
                              </span>
                              {deviation.deviationType && (
                                <span className="text-xs text-gray-500 uppercase tracking-wide">
                                  {formatLabel(deviation.deviationType)}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm font-semibold text-[#271D1D]">
                              {deviation.title}
                            </p>
                            <p className="text-sm text-gray-700">
                              {deviation.description}
                            </p>
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#271D1D]/20 text-[#271D1D]"
                                onClick={() => setActiveDeviationInsight(deviation)}
                              >
                                View deviation detail
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Contract language aligns with the playbook, so no deviations were flagged.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Priority Snapshot */}
          {showPrioritySnapshot &&
            (totalPriorityItems > 0 && hasSeverityBreakdown ? (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide mb-3">
                  Priority Snapshot
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:gap-2">
                  {SEVERITY_DISPLAY_ORDER.filter(
                    (level) =>
                      level !== "default" &&
                      (severitySummary as Record<string, number>)[level] > 0,
                  ).map((level) => {
                    const style = SEVERITY_CARD_STYLES[level] ?? SEVERITY_CARD_STYLES.default;
                    const count =
                      (severitySummary as Record<string, number>)[level] ?? 0;
                    return (
                      <div
                        key={level}
                        className={`rounded-lg border px-4 py-3 flex items-center justify-between ${style.container} print:px-3 print:py-2`}
                      >
                        <div>
                          <p className="text-xs uppercase tracking-wide opacity-70">
                            {formatLabel(level)}
                          </p>
                          <p className="text-xl font-semibold">{count}</p>
                        </div>
                        <span className={`h-3 w-3 rounded-full ${style.accent}`}></span>
                      </div>
                    );
                  })}
                </div>
                {topDepartments.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium text-[#271D1D]">
                      Concentrated in:
                    </span>
                    {topDepartments.map(([dept, count]) => {
                      const style = getDepartmentStyle(dept);
                      return (
                        <span
                          key={dept}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
                        >
                          {style.label} · {count}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : totalPriorityItems > 0 ? (
              <div className="mb-6 text-sm text-gray-600">
                No severity-ranked issues were highlighted; review general observations for context.
              </div>
            ) : (
              <div className="mb-6 text-sm text-gray-600">
                No critical or high-priority items were flagged in this review.
              </div>
            ))}

            {agentEdits.length > 0 && (
              <div className="mb-8 print:mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-medium text-[#271D1D] print:text-lg">
                    Agent Draft Edits
                  </h2>
                  <span className="text-sm text-gray-500">
                    {acceptedAgentEdits.length} accepted · {agentEdits.length} total
                  </span>
                </div>
                <div className="space-y-3">
                  {agentEdits.map((edit) => {
                    const severityStyle = getSeverityStyle(
                      edit.severity || "default",
                    );
                    return (
                    <div
                      key={edit.internalId}
                      className="rounded-lg border border-[#E8DDDD] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-[#271D1D]">
                            {edit.clauseReference || edit.id || "Clause"}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {formatLabel(edit.changeType || "modify")}
                            {edit.provider ? ` · ${edit.provider}` : ""}
                            {edit.model ? ` (${edit.model})` : ""}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${EDIT_STATUS_STYLES[edit.status].className}`}
                        >
                          {EDIT_STATUS_STYLES[edit.status].label}
                        </span>
                        {edit.severity && (
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${severityStyle.badge}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${severityStyle.dot}`}
                            ></span>
                            {severityStyle.label}
                          </span>
                        )}
                      </div>

                      {edit.originalText && (
                        <div className="mt-3 text-xs">
                          <p className="font-semibold text-gray-600 uppercase tracking-wide">
                            Original
                          </p>
                          <div className="mt-1 rounded border border-gray-200 bg-gray-50 p-3 text-gray-700 whitespace-pre-wrap">
                            {edit.originalText}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-xs">
                        <p className="font-semibold text-gray-600 uppercase tracking-wide">
                          Suggested
                        </p>
                        <div className="mt-1 rounded border border-emerald-200 bg-emerald-50/70 p-3 text-[#1f5130] whitespace-pre-wrap">
                          {edit.suggestedText}
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-600">
                        <span className="font-semibold text-[#271D1D]">Rationale:</span> {edit.rationale}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {edit.status !== "accepted" && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => updateAgentEditStatus(edit.internalId, "accepted")}
                          >
                            Accept
                          </Button>
                        )}
                        {edit.status !== "rejected" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateAgentEditStatus(edit.internalId, "rejected")}
                          >
                            Reject
                          </Button>
                        )}
                        {edit.status !== "pending" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => resetAgentEditStatus(edit.internalId)}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key Metrics Grid */}
            {false && results.key_points && (
              <div />
            )}

            {displayMissingInformation.length > 0 && (
              <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 print:mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-red-700">
                    Missing or Unconfirmed Information
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleSection("missing")}
                    className="text-sm text-red-700 underline"
                  >
                    {expandedSections.missing ? "Hide" : "Show"}
                  </button>
                </div>
                {expandedSections.missing && (
                  <ul className="mt-3 space-y-2 text-sm text-red-800">
                    {displayMissingInformation.map((item, index) => (
                      <li
                        key={`missing-${index}`}
                        className="flex flex-col gap-2 rounded-md border border-red-100 bg-white/60 p-3 text-red-900 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <span className="leading-relaxed">• {item}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-100"
                          onClick={() => handleDraftMissingClause(item)}
                        >
                          Draft clause with agent
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Detailed Analysis Results */}
          {reviewData.review_type === "risk_assessment" && results.risks && (
            <div className="mb-8 print:mb-6">
              <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
                Risk Analysis
              </h2>
              <div className="space-y-4">
                {results.risks.map((risk: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[#271D1D] capitalize">
                        {risk.type} Risk
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          risk.level === "high"
                            ? "bg-red-100 text-red-800"
                            : risk.level === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {risk.level}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{risk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(combinedDecisions.length > 0 || acceptedAgentEdits.length > 0) && (
            <div id="draft-section" className="mb-8 print:hidden">
              <div className="rounded-2xl border border-[#E8DDDD] bg-white shadow-sm p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-lora text-[#271D1D]">
                      Build an AI-assisted contract draft
                    </h2>
                    <p className="text-sm text-[#725A5A] max-w-xl">
                      Select which review recommendations and approved agent edits you want to merge. Maigon will create a fresh contract that applies those changes while preserving the existing structure.
                    </p>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C]/10"
                      onClick={() => setIsAgentOpen(true)}
                    >
                      Ask the AI Instead
                    </Button>
                    <Button
                      className="bg-[#271D1D] hover:bg-[#3A2F2F] text-white"
                      onClick={handleGenerateDraft}
                      disabled={!hasSelectedDraftInputs || isGeneratingDraft}
                    >
                      {isGeneratingDraft ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                        </span>
                      ) : (
                        "Generate updated contract"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#725A5A]">
                  <span>
                    {selectedSuggestionCount} of {combinedDecisions.length} review suggestions selected
                  </span>
                  {combinedDecisions.length > 0 && (
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        className="text-[#9A7C7C] underline"
                        onClick={handleSelectAllSuggestions}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="text-[#9A7C7C] underline"
                        onClick={handleClearAllSuggestions}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                  {acceptedAgentEdits.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={includeAcceptedAgentEdits}
                        onCheckedChange={(checked) => {
                          setHasManuallyToggledIncludeEdits(true);
                          setIncludeAcceptedAgentEdits(Boolean(checked));
                        }}
                      />
                      <span className="text-[#271D1D]">
                        Include {acceptedAgentEdits.length} accepted agent edit{acceptedAgentEdits.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs">No accepted agent edits yet</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Items */}
          {combinedDecisions.length > 0 && (
            <div className="mb-8 print:mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-medium text-[#271D1D] print:text-lg">
                  Action Items
                </h2>
                {combinedDecisions.length > 3 && (
                  <button
                    type="button"
                    className="text-sm text-[#9A7C7C] underline"
                    onClick={() => toggleSection("actions")}
                  >
                    {expandedSections.actions
                      ? "Show fewer"
                      : `Show ${combinedDecisions.length - 3} more`}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {groupedDecisionEntries.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-[#F3E9E9] bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#725A5A]">
                          Clause group
                        </p>
                        <p className="text-sm font-semibold text-[#271D1D]">
                          {group.title}
                        </p>
                      </div>
                      <span className="text-xs text-[#725A5A]">
                        {group.items.length} edit
                        {group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const severityStyle = getSeverityStyle(item.severity);
                        const checked = suggestionSelection[item.id] !== false;
                        const actionPreviewAnchor =
                          item.proposedEdit?.previousText ??
                          item.proposedEdit?.anchorText ??
                          "Current clause text";
                        const actionPreviewUpdated =
                          item.proposedEdit?.updatedText ??
                          item.proposedEdit?.proposedText ??
                          actionPreviewAnchor;
                        return (
                          <div
                            key={item.id}
                            className="rounded-lg border border-orange-100 bg-orange-50 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${severityStyle.badge}`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${severityStyle.dot}`}
                                  ></span>
                                  {severityStyle.label}
                                </span>
                                {item.category && (
                                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-orange-700">
                                    {formatLabel(item.category)}
                                  </span>
                                )}
                              </div>
                              <label
                                htmlFor={`suggestion-${item.id}`}
                                className="flex items-center gap-2 text-xs text-[#725A5A]"
                              >
                                <Checkbox
                                  id={`suggestion-${item.id}`}
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    handleSuggestionSelection(item.id, value === true)
                                  }
                                />
                                Include in draft
                              </label>
                            </div>
                            <div className="mt-3 flex items-start gap-3">
                              <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0 text-orange-600" />
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-[#271D1D]">
                                  {item.proposedEdit?.clauseTitle ||
                                    item.proposedEdit?.anchorText ||
                                    item.title ||
                                    "Action item"}
                                </p>
                                <p className="text-sm text-gray-700">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            {item.proposedEdit ? (
                              <div className="mt-3 space-y-2">
                                <ClausePreview
                                  clauseTitle={item.proposedEdit.clauseTitle}
                                  anchorText={actionPreviewAnchor}
                                  proposedText={actionPreviewUpdated}
                                  previousText={
                                    item.proposedEdit.previousText ??
                                    item.proposedEdit.anchorText ??
                                    null
                                  }
                                  updatedText={
                                    item.proposedEdit.updatedText ??
                                    item.proposedEdit.proposedText ??
                                    null
                                  }
                                  previewHtml={item.proposedEdit.previewHtml ?? null}
                                  isActive={checked}
                                />
                                {!checked && (
                                  <p className="text-xs text-[#9A7C7C]">
                                    Turn on “Include in draft” to apply this change in the generated document.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-[#9A7C7C]">
                                Preview unavailable for this action, but it will still be described in the draft summary.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 print:mt-8 print:pt-4">
            <p>
              This report was generated by Maigon AI-powered contract analysis
              on {new Date(reviewData.created_at).toLocaleDateString()}.
              Analysis ID: {reviewData.id}
            </p>
          </div>
      </div>
    </div>

      {showSimilaritySection && (
        <Dialog
          open={Boolean(activeSimilarityMatch)}
          onOpenChange={(open) => {
            if (!open) setActiveSimilarityMatch(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {activeSimilarityMatch?.sourceTitle || "Similarity insight"}
              </DialogTitle>
              {typeof activeSimilarityMatch?.similarityScore === "number" && (
                <DialogDescription>
                  Similarity score:{" "}
                  {Math.round(activeSimilarityMatch.similarityScore * 100)}%
                </DialogDescription>
              )}
            </DialogHeader>
            {activeSimilarityMatch?.excerpt && (
              <blockquote className="rounded border border-[#E8DDDD] bg-[#FDF8F8] p-4 text-sm italic text-[#271D1D]">
                “{activeSimilarityMatch.excerpt}”
              </blockquote>
            )}
            {activeSimilarityMatch?.rationale && (
              <p className="mt-3 text-sm text-gray-700">
                {activeSimilarityMatch.rationale}
              </p>
            )}
            {activeSimilarityMatch?.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#725A5A]">
                {activeSimilarityMatch.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F6ECEC] px-2.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      {showDeviationSection && (
        <Dialog
          open={Boolean(activeDeviationInsight)}
          onOpenChange={(open) => {
            if (!open) setActiveDeviationInsight(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {activeDeviationInsight?.title || "Deviation detail"}
              </DialogTitle>
              {activeDeviationInsight?.deviationType && (
                <DialogDescription>
                  {formatLabel(activeDeviationInsight.deviationType)}
                </DialogDescription>
              )}
            </DialogHeader>
            {activeDeviationInsight && (
              <div className="space-y-3 text-sm text-gray-700">
                <p>{activeDeviationInsight.description}</p>
                {activeDeviationInsight.expectedStandard && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#271D1D]/70">
                      Expected standard
                    </p>
                    <p>{activeDeviationInsight.expectedStandard}</p>
                  </div>
                )}
                {activeDeviationInsight.observedLanguage && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#271D1D]/70">
                      Observed language
                    </p>
                    <p>{activeDeviationInsight.observedLanguage}</p>
                  </div>
                )}
                {activeDeviationInsight.recommendation && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#271D1D]/70">
                      Recommendation
                    </p>
                    <p>{activeDeviationInsight.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showDraftDialog && !!draftResult} onOpenChange={setShowDraftDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>AI-generated contract draft</DialogTitle>
            {draftResult?.summary && (
              <DialogDescription>{draftResult.summary}</DialogDescription>
            )}
            {draftResult?.htmlSource && (
              <p className="mt-1 text-xs text-gray-500">
                Layout source:{" "}
                {HTML_SOURCE_LABELS[draftResult.htmlSource] ??
                  draftResult.htmlSource}
                {draftResult?.cacheStatus === "hit" ? " · Cached" : ""}
              </p>
            )}
          </DialogHeader>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-[#E8DDDD] bg-[#FDFBFB] p-1 text-xs text-[#725A5A]">
              <span className="rounded-full px-3 py-1 bg-[#271D1D] text-white">
                Preview
              </span>
            </div>
            {draftResult?.originalContract && (
              <span className="text-xs text-[#725A5A]">
                Original length: {draftResult.originalContract.length.toLocaleString()} chars
              </span>
            )}
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {draftResult?.appliedChanges && draftResult.appliedChanges.length > 0 && (
              <div className="rounded-lg border border-[#E8DDDD] bg-[#FDFBFB] p-4">
                <h3 className="text-sm font-semibold text-[#271D1D] uppercase tracking-wide mb-2">
                  Applied changes
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-[#271D1D]/80">
                  {draftResult.appliedChanges.map((change, index) => (
                    <li key={`${change}-${index}`}>{change}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-lg border border-[#E8DDDD] bg-white">
              <div className="border-b border-[#F1E6E6] bg-[#F9F8F8] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#725A5A]">
                Tracked changes
              </div>
              {draftDiffChunks.length > 0 ? (
                <div className="p-4 text-base leading-relaxed text-[#271D1D] space-y-1">
                  {trackedDiffNodes}
                </div>
              ) : previewUpdatedHtml ? (
                <div
                  className="contract-preview p-4 text-sm text-[#271D1D] leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: previewUpdatedHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words p-4 font-mono text-sm text-[#271D1D]">
                  {updatedPlainText || "No draft content available yet."}
                </pre>
              )}
            </div>
            {draftResult?.provider && (
              <p className="text-xs text-[#725A5A]">
                Generated via {draftResult.provider}
                {draftResult.model ? ` – ${draftResult.model}` : ""}
              </p>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleDownloadDocx}>
                <Download className="w-4 h-4 mr-2" /> Download (.docx)
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" /> Download (.pdf)
              </Button>
            </div>
            <Button onClick={() => setShowDraftDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgentChat
        ref={agentChatRef}
        open={isAgentOpen}
        onOpen={() => setIsAgentOpen(true)}
        onClose={() => setIsAgentOpen(false)}
        context={agentContext}
        onEdits={handleAgentEdits}
      />
    </>
  );
}
