import type { AnalysisReport, ClauseExtraction } from "./reviewSchema.ts";

export function matchClauseToText(
  text: string,
  clauses: ClauseExtraction[],
): ClauseExtraction | null {
  if (!clauses.length) return null;
  const normalized = text.toLowerCase();
  if (!normalized.trim()) {
    return clauses[0] ?? null;
  }
  const keywords = normalized.match(/[a-z]{4,}/g) ?? [];
  const scores = clauses.map((clause) => {
    const candidate = `${clause.title ?? ""} ${clause.originalText ?? ""}`.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (candidate.includes(keyword)) {
        score += 1;
      }
    }
    return score;
  });
  let bestIndex = -1;
  let bestScore = 0;
  scores.forEach((score, index) => {
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  if (bestIndex >= 0 && bestScore > 0) {
    return clauses[bestIndex];
  }
  return clauses[0] ?? null;
}

const MISSING_EVIDENCE_MARKERS = [
  "not present",
  "missing",
  "not found",
  "evidence not found",
];

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMissingEvidenceMarker(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return MISSING_EVIDENCE_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

function evidenceMatchesContent(
  excerpt: string,
  normalizedContent: string,
) {
  if (!normalizedContent) {
    return true;
  }
  if (isMissingEvidenceMarker(excerpt)) {
    return true;
  }
  const normalizedExcerpt = normalizeForMatch(excerpt);
  if (!normalizedExcerpt) {
    return false;
  }
  if (normalizedExcerpt.length <= 240) {
    return normalizedContent.includes(normalizedExcerpt);
  }
  const sample = normalizedExcerpt.slice(0, 240);
  return normalizedContent.includes(sample);
}

function resolveClauseMatch(
  clauseReference: AnalysisReport["issuesToAddress"][number]["clauseReference"],
  fallbackText: string,
  clauses: ClauseExtraction[],
) {
  if (!clauses.length) return null;
  const clauseId = clauseReference?.clauseId?.toLowerCase().trim();
  if (clauseId) {
    const found = clauses.find((clause) =>
      (clause.clauseId || clause.id || "").toLowerCase().trim() === clauseId
    );
    if (found) return found;
  }
  const heading = clauseReference?.heading?.toLowerCase().trim();
  if (heading) {
    const found = clauses.find((clause) =>
      (clause.title || "").toLowerCase().includes(heading)
    );
    if (found) return found;
  }
  return matchClauseToText(fallbackText, clauses);
}

export function enhanceReportWithClauses(
  report: AnalysisReport,
  options: {
    clauses?: ClauseExtraction[] | null;
    content?: string | null;
  },
): AnalysisReport {
  const clauseCandidates = options.clauses ?? [];
  const normalizedContent = normalizeForMatch(options.content ?? "");

  const issuesWithEvidence = report.issuesToAddress.map((issue) => {
    const fallbackText = `${issue.title} ${issue.recommendation ?? ""}`.trim();
    const match = resolveClauseMatch(
      issue.clauseReference,
      fallbackText,
      clauseCandidates,
    );
    const existingReference = issue.clauseReference ?? {
      clauseId: "",
      heading: undefined,
      excerpt: undefined,
      locationHint: undefined,
    };

    const fallbackExcerpt = match?.originalText || match?.normalizedText;
    const currentExcerpt =
      existingReference?.excerpt && existingReference.excerpt.trim().length > 0
        ? existingReference.excerpt
        : fallbackExcerpt;

    let nextExcerpt = currentExcerpt;
    if (currentExcerpt && !evidenceMatchesContent(currentExcerpt, normalizedContent)) {
      if (fallbackExcerpt && evidenceMatchesContent(fallbackExcerpt, normalizedContent)) {
        nextExcerpt = fallbackExcerpt;
      } else if (isMissingEvidenceMarker(currentExcerpt)) {
        nextExcerpt = currentExcerpt;
      } else {
        nextExcerpt = "Evidence not found";
      }
    }

    if (!currentExcerpt && fallbackExcerpt) {
      nextExcerpt = evidenceMatchesContent(fallbackExcerpt, normalizedContent)
        ? fallbackExcerpt
        : "Evidence not found";
    }

    if (!issue.clauseReference && !match) {
      return issue;
    }

    return {
      ...issue,
      clauseReference: {
        clauseId:
          existingReference?.clauseId &&
          existingReference.clauseId.trim().length > 0
            ? existingReference.clauseId
            : match?.clauseId ?? match?.id ?? `clause-${match?.title ?? "ref"}`,
        heading: existingReference?.heading ?? match?.title,
        excerpt: nextExcerpt,
        locationHint: existingReference?.locationHint ??
          match?.location ?? {
            page: null,
            paragraph: null,
            section: match?.title ?? null,
            clauseNumber: match?.clauseId ?? null,
          },
      },
    };
  });

  const criteriaWithEvidence = report.criteriaMet.map((criterion) => {
    const fallbackText = `${criterion.title} ${criterion.description ?? ""}`.trim();
    const match = resolveClauseMatch(null, fallbackText, clauseCandidates);
    const fallbackExcerpt = match?.originalText || match?.normalizedText;
    if (!criterion.evidence) {
      if (!fallbackExcerpt) return criterion;
      return {
        ...criterion,
        evidence: evidenceMatchesContent(fallbackExcerpt, normalizedContent)
          ? fallbackExcerpt
          : "Evidence not found",
      };
    }

    if (!evidenceMatchesContent(criterion.evidence, normalizedContent)) {
      if (fallbackExcerpt && evidenceMatchesContent(fallbackExcerpt, normalizedContent)) {
        return { ...criterion, evidence: fallbackExcerpt };
      }
      if (isMissingEvidenceMarker(criterion.evidence)) {
        return criterion;
      }
      return { ...criterion, evidence: "Evidence not found" };
    }

    return criterion;
  });

  return {
    ...report,
    clauseExtractions: clauseCandidates,
    issuesToAddress: issuesWithEvidence,
    criteriaMet: criteriaWithEvidence,
  };
}
