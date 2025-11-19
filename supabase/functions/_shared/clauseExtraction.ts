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

export function enhanceReportWithClauses(
  report: AnalysisReport,
  options: {
    clauses?: ClauseExtraction[] | null;
  },
): AnalysisReport {
  const clauseCandidates = options.clauses ?? [];

  if (!clauseCandidates.length) {
    return {
      ...report,
      clauseExtractions: [],
    };
  }

  const issuesWithEvidence = report.issuesToAddress.map((issue) => {
    if (issue.clauseReference?.excerpt && issue.clauseReference?.clauseId) {
      return issue;
    }
    const match = matchClauseToText(
      `${issue.title} ${issue.recommendation ?? ""}`,
      clauseCandidates,
    );
    if (!match) return issue;
    const existingReference = issue.clauseReference ?? {
      clauseId: "",
      heading: undefined,
      excerpt: undefined,
      locationHint: undefined,
    };
    return {
      ...issue,
      clauseReference: {
        clauseId:
          existingReference?.clauseId &&
          existingReference.clauseId.trim().length > 0
            ? existingReference.clauseId
            : match.clauseId ?? match.id ?? `clause-${match.title ?? "ref"}`,
        heading: existingReference?.heading ?? match.title,
        excerpt:
          existingReference?.excerpt && existingReference.excerpt.trim().length > 0
            ? existingReference.excerpt
            : match.originalText,
        locationHint: match.location ?? {
          page: null,
          paragraph: null,
          section: match.title ?? null,
          clauseNumber: match.clauseId ?? null,
        },
      },
    };
  });

  const criteriaWithEvidence = report.criteriaMet.map((criterion) => {
    if (criterion.evidence) {
      return criterion;
    }
    const match = matchClauseToText(
      `${criterion.title} ${criterion.description ?? ""}`,
      clauseCandidates,
    );
    if (!match) return criterion;
    return {
      ...criterion,
      evidence: match.originalText,
    };
  });

  return {
    ...report,
    clauseExtractions: clauseCandidates,
    issuesToAddress: issuesWithEvidence,
    criteriaMet: criteriaWithEvidence,
  };
}
