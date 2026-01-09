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
const MIN_ISSUE_CONFIDENCE = 0.32;
const MIN_CRITERIA_CONFIDENCE = 0.32;
const DUPLICATE_EXCERPT_MIN_CONFIDENCE = 0.35;

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
    let evidenceResult = currentExcerpt
      ? checkEvidenceMatch(currentExcerpt, content)
      : { matched: false, reason: "empty-excerpt" };
    let clauseEvidenceResult = match && currentExcerpt
      ? checkEvidenceMatchAgainstClause(currentExcerpt, clauseText)
      : { matched: false, reason: "empty-content" };

    if (!currentExcerpt) {
      if (isMissingEvidenceMarker(existingReference?.excerpt)) {
        nextExcerpt = existingReference?.excerpt ?? "Not present";
      } else {
        nextExcerpt = match ? "Evidence not found" : "Not present";
      }
      evidenceResult = { matched: false, reason: "empty-excerpt" };
    } else if (!clauseEvidenceResult.matched || !evidenceResult.matched) {
      if (isMissingEvidenceMarker(currentExcerpt)) {
        nextExcerpt = currentExcerpt;
      } else if (preferredExcerpt && preferredExcerpt !== currentExcerpt) {
        const preferredClauseResult = checkEvidenceMatchAgainstClause(
          preferredExcerpt,
          clauseText,
        );
        const preferredResult = checkEvidenceMatch(preferredExcerpt, content);
        if (preferredClauseResult.matched && preferredResult.matched) {
          nextExcerpt = preferredExcerpt;
          evidenceResult = preferredResult;
          clauseEvidenceResult = preferredClauseResult;
        } else {
          nextExcerpt = match ? "Evidence not found" : "Not present";
        }
      } else {
        nextExcerpt = match ? "Evidence not found" : "Not present";
      }
    }

    if (evidenceResult.matched || isMissingEvidenceMarker(nextExcerpt)) {
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
        heading: match?.title ?? existingReference?.heading,
        excerpt: nextExcerpt,
        locationHint: match?.location ??
          existingReference?.locationHint ?? {
            page: null,
            paragraph: null,
            section: match?.title ?? (match ? null : "Not present"),
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

    let evidenceResult = currentEvidence
      ? checkEvidenceMatch(currentEvidence, content)
      : { matched: false, reason: "empty-excerpt" };
    let clauseEvidenceResult = match && currentEvidence
      ? checkEvidenceMatchAgainstClause(currentEvidence, clauseText)
      : { matched: false, reason: "empty-content" };

    let nextEvidence = currentEvidence;
    if (!currentEvidence) {
      nextEvidence = fallbackExcerpt || "Evidence not found";
      evidenceResult = { matched: false, reason: "empty-excerpt" };
    } else if (!clauseEvidenceResult.matched || !evidenceResult.matched) {
      if (fallbackExcerpt && fallbackExcerpt !== currentEvidence) {
        const fallbackClauseResult = checkEvidenceMatchAgainstClause(
          fallbackExcerpt,
          clauseText,
        );
        const fallbackResult = checkEvidenceMatch(fallbackExcerpt, content);
        if (fallbackClauseResult.matched && fallbackResult.matched) {
          nextEvidence = fallbackExcerpt;
          evidenceResult = fallbackResult;
          clauseEvidenceResult = fallbackClauseResult;
        } else if (isMissingEvidenceMarker(currentEvidence)) {
          nextEvidence = currentEvidence;
        } else {
          nextEvidence = "Evidence not found";
        }
      } else if (isMissingEvidenceMarker(currentEvidence)) {
        nextEvidence = currentEvidence;
      } else {
        nextEvidence = "Evidence not found";
      }
    }

    if (evidenceResult.matched || isMissingEvidenceMarker(nextEvidence)) {
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

    const hasEvidence = evidenceResult.matched && !isMissingEvidenceMarker(nextEvidence);
    return {
      ...criterion,
      evidence: nextEvidence,
      met: hasEvidence ? criterion.met : false,
    };
  });

  const filteredCriteria = criteriaWithEvidence.filter((criterion) =>
    Boolean(criterion.met) &&
    !isMissingEvidenceMarker(criterion.evidence),
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
      filteredCriteria,
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
    issuesToAddress: issuesWithNormalizedEvidence,
    criteriaMet: filteredCriteria,
    metadata: nextMetadata as AnalysisReport["metadata"],
  };
}
