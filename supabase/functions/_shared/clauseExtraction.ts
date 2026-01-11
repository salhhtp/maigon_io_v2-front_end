import type { AnalysisReport, ClauseExtraction } from "./reviewSchema.ts";
import {
  buildEvidenceExcerpt,
  checkEvidenceMatch,
  checkEvidenceMatchAgainstClause,
  isMissingEvidenceMarker,
  matchClauseToText as matchClauseToTextWithDebug,
  normalizeForMatch,
  resolveClauseMatch,
} from "../../../shared/ai/reliability.ts";

const DEBUG_REVIEW = (() => {
  if (typeof Deno === "undefined") return false;
  const raw = (Deno.env.get("MAIGON_REVIEW_DEBUG") ?? "1").toLowerCase().trim();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
})();
const MIN_ISSUE_CONFIDENCE = 0.2;
const MIN_CRITERIA_CONFIDENCE = 0.2;
const DUPLICATE_EXCERPT_MIN_CONFIDENCE = 0.35;
const NEGATIVE_EVIDENCE_MARKERS = [
  "no clause",
  "not present",
  "not specified",
  "absent",
  "missing",
  "lacks",
  "does not",
  "no explicit",
  "ambiguous",
  "unclear",
  "conflict",
  "inconsistent",
];

const normalizeIssueKey = (value: string) => value.trim().toUpperCase();
const buildMissingClauseId = (value: string) => {
  const slug = normalizeForMatch(value).replace(/\s+/g, "-");
  return slug ? `missing-${slug.slice(0, 40)}` : "missing-criterion";
};
const looksNegativeEvidence = (value: string) => {
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  return NEGATIVE_EVIDENCE_MARKERS.some((marker) => normalized.includes(marker));
};

export function matchClauseToText(
  text: string,
  clauses: ClauseExtraction[],
) {
  return matchClauseToTextWithDebug(text, clauses);
}

export function enhanceReportWithClauses(
  report: AnalysisReport,
  options: {
    clauses?: ClauseExtraction[] | null;
    content?: string | null;
  },
): AnalysisReport {
  const clauseCandidates = options.clauses ?? [];
  const content = options.content ?? "";
  const normalizedContent = normalizeForMatch(content);
  const issueEvidenceStats = {
    total: report.issuesToAddress.length,
    matched: 0,
    missing: 0,
  };
  const criteriaEvidenceStats = {
    total: report.criteriaMet.length,
    matched: 0,
    missing: 0,
  };
  const issueMatchMeta: Array<{
    index: number;
    confidence: number;
    clauseId: string;
    excerptKey: string;
    method: string;
  }> = [];
  const evidenceDebug: Record<
    string,
    { clauseId: string; heading?: string | null; excerpt: string }
  > = {};

  const issuesWithEvidence = report.issuesToAddress.map((issue, index) => {
    const fallbackText = `${issue.title} ${issue.recommendation ?? ""}`.trim();
    const matchResult = resolveClauseMatch({
      clauseReference: issue.clauseReference ?? null,
      fallbackText,
      clauses: clauseCandidates,
    });
    const acceptedMatch = Boolean(
      matchResult.match &&
        (matchResult.method === "id" ||
          matchResult.method === "heading" ||
          matchResult.confidence >= MIN_ISSUE_CONFIDENCE),
    );
    const match = acceptedMatch ? matchResult.match : null;
    const existingReference = issue.clauseReference ?? {
      clauseId: "",
      heading: undefined,
      excerpt: undefined,
      locationHint: undefined,
    };

    const matchedClauseId = match?.clauseId ?? match?.id ?? null;
    const stableClauseId =
      matchedClauseId ??
      (existingReference?.clauseId && existingReference.clauseId.trim().length > 0
        ? existingReference.clauseId
        : `unmatched-issue-${index + 1}`);

    if (match && (issue.id || stableClauseId)) {
      const longExcerpt = (match.originalText ?? match.normalizedText ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (longExcerpt) {
        evidenceDebug[issue.id ?? `issue-${index + 1}`] = {
          clauseId: stableClauseId,
          heading: match.title ?? null,
          excerpt: longExcerpt.slice(0, 1200),
        };
      }
    }

    const preferredExcerpt = match
      ? buildEvidenceExcerpt({
        clauseText:
          match.originalText ??
            match.normalizedText ??
            match.title ??
            "",
        anchorText: existingReference?.excerpt ?? issue.title,
      })
      : "";

    const currentExcerpt =
      preferredExcerpt ||
      (existingReference?.excerpt && existingReference.excerpt.trim().length > 0
        ? existingReference.excerpt
        : "");
    const clauseText = match
      ? match.originalText ?? match.normalizedText ?? match.title ?? ""
      : "";

    let nextExcerpt = currentExcerpt;
    if (!currentExcerpt) {
      if (isMissingEvidenceMarker(existingReference?.excerpt)) {
        nextExcerpt = existingReference?.excerpt ?? "Not present in contract";
      } else if (match && clauseText) {
        nextExcerpt = preferredExcerpt || buildEvidenceExcerpt({
          clauseText,
          anchorText: issue.title,
        });
      } else {
        nextExcerpt = "Not present in contract";
      }
    } else if (match && clauseText) {
      const clauseEvidenceResult = checkEvidenceMatchAgainstClause(
        currentExcerpt,
        clauseText,
      );
      if (!clauseEvidenceResult.matched && preferredExcerpt) {
        nextExcerpt = preferredExcerpt;
      }
    } else if (isMissingEvidenceMarker(currentExcerpt)) {
      nextExcerpt = currentExcerpt;
    }

    const evidenceResult = nextExcerpt
      ? checkEvidenceMatch(nextExcerpt, content)
      : { matched: false, reason: "empty-excerpt" };
    const clauseEvidenceResult = match && nextExcerpt
      ? checkEvidenceMatchAgainstClause(nextExcerpt, clauseText)
      : { matched: false, reason: "empty-content" };
    const evidenceMatched =
      isMissingEvidenceMarker(nextExcerpt) ||
      clauseEvidenceResult.matched ||
      evidenceResult.matched;

    if (evidenceMatched) {
      issueEvidenceStats.matched += 1;
    } else {
      issueEvidenceStats.missing += 1;
    }

    if (DEBUG_REVIEW) {
      console.debug("🔎 Clause match", {
        issueId: issue.id,
        method: matchResult.method,
        confidence: matchResult.confidence,
        candidates: matchResult.candidates,
        evidence: evidenceResult,
        clauseEvidence: clauseEvidenceResult,
        clauseId: stableClauseId,
      });
    }

    if (!issue.clauseReference && !match) {
      return issue;
    }

    const updatedIssue = {
      ...issue,
      clauseReference: {
        clauseId: stableClauseId,
        heading: existingReference?.heading ?? match?.title,
        excerpt: nextExcerpt,
        locationHint: existingReference?.locationHint ??
          match?.location ?? {
            page: null,
            paragraph: null,
            section: match?.title ?? (match ? null : "Not present in contract"),
            clauseNumber: matchedClauseId ?? null,
          },
      },
    };
    const excerptKey = normalizeForMatch(updatedIssue.clauseReference?.excerpt ?? "");
    if (excerptKey && !isMissingEvidenceMarker(updatedIssue.clauseReference?.excerpt)) {
      issueMatchMeta.push({
        index,
        confidence: matchResult.confidence,
        clauseId: stableClauseId,
        excerptKey,
        method: matchResult.method,
      });
    }
    return updatedIssue;
  });

  let issuesWithNormalizedEvidence = issuesWithEvidence;
  if (issueMatchMeta.length > 1) {
    const duplicates = new Map<string, typeof issueMatchMeta>();
    issueMatchMeta.forEach((meta) => {
      const list = duplicates.get(meta.excerptKey) ?? [];
      list.push(meta);
      duplicates.set(meta.excerptKey, list);
    });
    duplicates.forEach((entries) => {
      if (entries.length <= 1) return;
      const clauseIds = new Set(entries.map((entry) => entry.clauseId));
      if (clauseIds.size <= 1) return;
      const ranked = [...entries].sort((a, b) => b.confidence - a.confidence);
      ranked.slice(1).forEach((entry) => {
        if (entry.confidence >= DUPLICATE_EXCERPT_MIN_CONFIDENCE) return;
        const issue = issuesWithNormalizedEvidence[entry.index];
        if (!issue?.clauseReference) return;
        issue.clauseReference.excerpt = "Evidence not found";
      });
    });
  }

  const criteriaWithEvidence = report.criteriaMet.map((criterion) => {
    const fallbackText = `${criterion.title} ${criterion.description ?? ""}`.trim();
    const matchResult = resolveClauseMatch({
      clauseReference: null,
      fallbackText,
      clauses: clauseCandidates,
    });
    const acceptedMatch = Boolean(
      matchResult.match &&
        (matchResult.method === "id" ||
          matchResult.method === "heading" ||
          matchResult.confidence >= MIN_CRITERIA_CONFIDENCE),
    );
    const match = acceptedMatch ? matchResult.match : null;
    const fallbackExcerpt = match
      ? buildEvidenceExcerpt({
        clauseText:
          match.originalText ??
            match.normalizedText ??
            match.title ??
            "",
        anchorText: criterion.evidence ?? criterion.title,
      })
      : "";
    const clauseText = match
      ? match.originalText ?? match.normalizedText ?? match.title ?? ""
      : "";

    const currentEvidence =
      typeof criterion.evidence === "string" && criterion.evidence.trim().length > 0
        ? criterion.evidence
        : fallbackExcerpt;

    let nextEvidence = currentEvidence;
    if (!currentEvidence) {
      nextEvidence =
        fallbackExcerpt || (match ? "Evidence not found" : "Not present in contract");
    } else if (match && clauseText) {
      const clauseEvidenceResult = checkEvidenceMatchAgainstClause(
        currentEvidence,
        clauseText,
      );
      if (!clauseEvidenceResult.matched && fallbackExcerpt) {
        nextEvidence = fallbackExcerpt;
      }
    } else if (isMissingEvidenceMarker(currentEvidence)) {
      nextEvidence = currentEvidence;
    }

    const evidenceResult = nextEvidence
      ? checkEvidenceMatch(nextEvidence, content)
      : { matched: false, reason: "empty-excerpt" };
    const clauseEvidenceResult = match && nextEvidence
      ? checkEvidenceMatchAgainstClause(nextEvidence, clauseText)
      : { matched: false, reason: "empty-content" };
    const evidenceMatched =
      isMissingEvidenceMarker(nextEvidence) ||
      clauseEvidenceResult.matched ||
      evidenceResult.matched;
    const negativeEvidence =
      !clauseEvidenceResult.matched && looksNegativeEvidence(nextEvidence ?? "");

    if (evidenceMatched) {
      criteriaEvidenceStats.matched += 1;
    } else {
      criteriaEvidenceStats.missing += 1;
    }

    if (DEBUG_REVIEW) {
      console.debug("🔎 Criteria evidence", {
        criterionId: criterion.id,
        method: matchResult.method,
        confidence: matchResult.confidence,
        candidates: matchResult.candidates,
        evidence: evidenceResult,
        clauseEvidence: clauseEvidenceResult,
      });
    }

    const hasEvidence =
      evidenceMatched &&
      !isMissingEvidenceMarker(nextEvidence) &&
      !negativeEvidence;
    const shouldUpgradeMet = Boolean(match) && hasEvidence;
    const nextMet = shouldUpgradeMet ? true : !hasEvidence ? false : criterion.met;
    return {
      ...criterion,
      evidence: nextEvidence,
      met: nextMet,
    };
  });

  let criteriaAlignedWithIssues = alignCriteriaWithIssues(
    criteriaWithEvidence,
    issuesWithNormalizedEvidence,
  );

  const issuesBackfilledFromCriteria = backfillIssuesFromCriteria(
    criteriaAlignedWithIssues,
    issuesWithNormalizedEvidence,
    clauseCandidates,
  );

  const issuesBackfilledFromEdits = backfillIssuesFromEdits(
    issuesBackfilledFromCriteria,
    report.proposedEdits ?? [],
    clauseCandidates,
  );

  criteriaAlignedWithIssues = alignCriteriaWithIssues(
    criteriaAlignedWithIssues,
    issuesBackfilledFromEdits,
  );

  const recomputeStats = (
    issues: AnalysisReport["issuesToAddress"],
    criteria: AnalysisReport["criteriaMet"],
  ) => {
    const issueStats = issues.reduce(
      (acc, issue) => {
        const excerpt = issue.clauseReference?.excerpt ?? "";
        const result = checkEvidenceMatch(excerpt, content);
        if (result.matched || isMissingEvidenceMarker(excerpt)) {
          acc.matched += 1;
        } else {
          acc.missing += 1;
        }
        return acc;
      },
      { total: issues.length, matched: 0, missing: 0 },
    );
    const criteriaStats = criteria.reduce(
      (acc, criterion) => {
        const evidence = criterion.evidence ?? "";
        const result = checkEvidenceMatch(evidence, content);
        if (result.matched || isMissingEvidenceMarker(evidence)) {
          acc.matched += 1;
        } else {
          acc.missing += 1;
        }
        return acc;
      },
      { total: criteria.length, matched: 0, missing: 0 },
    );
    return { issueStats, criteriaStats };
  };

  if (DEBUG_REVIEW) {
    const { issueStats, criteriaStats } = recomputeStats(
      issuesWithNormalizedEvidence,
      criteriaWithEvidence,
    );
    console.info("🧭 Evidence alignment summary", {
      issues: issueStats,
      criteria: criteriaStats,
      contentLength: normalizedContent.length,
      clauseCount: clauseCandidates.length,
    });
  }

  const nextMetadata =
    report.metadata && typeof report.metadata === "object"
      ? { ...(report.metadata as Record<string, unknown>) }
      : {};
  if (Object.keys(evidenceDebug).length > 0) {
    nextMetadata.evidenceDebug = evidenceDebug;
  }

  return {
    ...report,
    clauseExtractions: clauseCandidates,
    issuesToAddress: issuesBackfilledFromEdits,
    criteriaMet: criteriaAlignedWithIssues,
    metadata: nextMetadata as AnalysisReport["metadata"],
  };
}

function normalizeChecklistKey(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeTitleKey(value: string): string {
  return normalizeForMatch(value);
}

function extractChecklistIds(value: string): string[] {
  const matches = new Set<string>();
  const raw = value.toUpperCase();
  const issueMatches = raw.match(/ISSUE_CHECK_[A-Z0-9_]+/g) ?? [];
  const checkMatches = raw.match(/CHECK_[A-Z0-9_]+/g) ?? [];
  issueMatches.forEach((match) => {
    matches.add(match.replace(/^ISSUE_/, ""));
  });
  checkMatches.forEach((match) => matches.add(match));
  return Array.from(matches);
}

function alignCriteriaWithIssues(
  criteria: AnalysisReport["criteriaMet"],
  issues: AnalysisReport["issuesToAddress"],
): AnalysisReport["criteriaMet"] {
  if (!criteria.length || !issues.length) return criteria;
  const criteriaCopy = criteria.map((criterion) => ({ ...criterion }));
  const criteriaById = new Map<string, number>();
  const criteriaByTitle = new Map<string, number>();
  criteriaCopy.forEach((criterion, index) => {
    criteriaById.set(normalizeChecklistKey(criterion.id), index);
    criteriaByTitle.set(normalizeTitleKey(criterion.title), index);
  });

  issues.forEach((issue) => {
    const sources: string[] = [];
    if (issue.id) sources.push(issue.id);
    if (Array.isArray(issue.tags)) {
      issue.tags.forEach((tag) => {
        if (typeof tag === "string") sources.push(tag);
      });
    }
    const matchedIds = new Set<string>();
    sources.forEach((source) => {
      extractChecklistIds(source).forEach((id) => matchedIds.add(id));
    });

    if (matchedIds.size === 0 && issue.title) {
      const baseTitle = issue.title.split(":")[0]?.trim();
      if (baseTitle) {
        const titleKey = normalizeTitleKey(baseTitle);
        const index = criteriaByTitle.get(titleKey);
        if (index !== undefined) {
          matchedIds.add(criteriaCopy[index].id);
        }
      }
    }

    matchedIds.forEach((id) => {
      const index = criteriaById.get(normalizeChecklistKey(id));
      if (index === undefined) return;
      const criterion = criteriaCopy[index];
      criteriaCopy[index] = {
        ...criterion,
        met: false,
        evidence:
          criterion.evidence &&
          !isMissingEvidenceMarker(criterion.evidence) &&
          criterion.evidence !== "Evidence not found"
            ? criterion.evidence
            : issue.clauseReference?.excerpt ??
              criterion.evidence ??
              "Not present in contract",
      };
    });
  });

  return criteriaCopy;
}

function issueMatchesCriterion(
  issue: AnalysisReport["issuesToAddress"][number],
  criterion: AnalysisReport["criteriaMet"][number],
) {
  const criterionId = normalizeIssueKey(criterion.id);
  const criterionTitle = normalizeTitleKey(criterion.title);
  if (normalizeIssueKey(issue.id) === criterionId) return true;
  if (normalizeTitleKey(issue.title) === criterionTitle) return true;
  if (Array.isArray(issue.tags)) {
    const tags = issue.tags.map((tag) => normalizeIssueKey(tag));
    if (tags.includes(criterionId)) return true;
  }
  return false;
}

function backfillIssuesFromCriteria(
  criteria: AnalysisReport["criteriaMet"],
  issues: AnalysisReport["issuesToAddress"],
  clauses: ClauseExtraction[],
): AnalysisReport["issuesToAddress"] {
  const nextIssues = [...issues];
  criteria.forEach((criterion) => {
    if (criterion.met) return;
    const hasIssue = nextIssues.some((issue) =>
      issueMatchesCriterion(issue, criterion)
    );
    if (hasIssue) return;

    const fallbackText = `${criterion.title} ${criterion.description ?? ""}`.trim();
    const matchResult = resolveClauseMatch({
      clauseReference: null,
      fallbackText,
      clauses,
    });
    const match = matchResult.match;
    const clauseText = match
      ? match.originalText ?? match.normalizedText ?? match.title ?? ""
      : "";
    const excerpt = match
      ? buildEvidenceExcerpt({
        clauseText,
        anchorText: criterion.evidence ?? criterion.title,
      })
      : "Not present in contract";
    const clauseId = match
      ? (match.clauseId ?? match.id ?? buildMissingClauseId(criterion.id))
      : buildMissingClauseId(criterion.id);

    const issueId = `ISSUE_${criterion.id}`;
    nextIssues.push({
      id: issueId,
      title: criterion.title,
      severity: "medium",
      category: criterion.title,
      tags: [criterion.id],
      clauseReference: {
        clauseId,
        heading: match?.title ?? criterion.title,
        excerpt,
        locationHint: match?.location ?? {
          page: null,
          paragraph: null,
          section: match?.title ?? null,
          clauseNumber: clauseId ?? null,
        },
      },
      recommendation: criterion.description
        ? `Add or clarify: ${criterion.description}`
        : `Add or clarify: ${criterion.title}`,
      rationale: `Criterion ${criterion.id} is not met.`,
    });
  });
  return nextIssues;
}

function issueMatchesEdit(
  issue: AnalysisReport["issuesToAddress"][number],
  edit: AnalysisReport["proposedEdits"][number],
) {
  const issueClauseId = normalizeForMatch(issue.clauseReference?.clauseId ?? "");
  const editClauseId = normalizeForMatch(edit.clauseId ?? "");
  if (issueClauseId && editClauseId && issueClauseId === editClauseId) return true;

  const issueText = normalizeForMatch(
    `${issue.title ?? ""} ${issue.recommendation ?? ""}`,
  );
  const anchorText = normalizeForMatch(edit.anchorText ?? "");
  return Boolean(issueText && anchorText && issueText.includes(anchorText));
}

function backfillIssuesFromEdits(
  issues: AnalysisReport["issuesToAddress"],
  edits: AnalysisReport["proposedEdits"],
  clauses: ClauseExtraction[],
): AnalysisReport["issuesToAddress"] {
  const nextIssues = [...issues];
  edits.forEach((edit, index) => {
    const hasIssue = nextIssues.some((issue) => issueMatchesEdit(issue, edit));
    if (hasIssue) return;

    const clauseId = edit.clauseId?.toString().trim().length
      ? edit.clauseId!.toString().trim()
      : buildMissingClauseId(edit.id ?? `edit-${index + 1}`);
    const match = resolveClauseMatch({
      clauseReference: null,
      fallbackText: edit.anchorText ?? edit.proposedText ?? edit.id,
      clauses,
    }).match;
    const clauseText = match
      ? match.originalText ?? match.normalizedText ?? match.title ?? ""
      : "";
    const excerpt = clauseText
      ? buildEvidenceExcerpt({
        clauseText,
        anchorText: edit.anchorText ?? edit.id,
      })
      : "Not present in contract";
    nextIssues.push({
      id: `ISSUE_${edit.id ?? `EDIT_${index + 1}`}`,
      title: edit.rationale ?? `Draft update for ${edit.clauseId ?? edit.id}`,
      severity: "medium",
      category: "Draft update",
      tags: [edit.id ?? `EDIT_${index + 1}`],
      clauseReference: {
        clauseId: match?.clauseId ?? match?.id ?? clauseId,
        heading: match?.title ?? undefined,
        excerpt,
        locationHint: match?.location ?? {
          page: null,
          paragraph: null,
          section: match?.title ?? null,
          clauseNumber: clauseId ?? null,
        },
      },
      recommendation: edit.rationale ?? "Address proposed drafting update.",
      rationale: "Proposed edit provided without a linked issue.",
    });
  });
  return nextIssues;
}
