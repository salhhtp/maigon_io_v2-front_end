import type { AnalysisReport, ClauseExtraction } from "./reviewSchema.ts";
import {
  buildEvidenceExcerpt,
  checkEvidenceMatch,
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
    const match = matchResult.match;
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

    let nextExcerpt = currentExcerpt;
    let evidenceResult = currentExcerpt
      ? checkEvidenceMatch(currentExcerpt, content)
      : { matched: false, reason: "empty-excerpt" };

    if (!currentExcerpt) {
      if (isMissingEvidenceMarker(existingReference?.excerpt)) {
        nextExcerpt = existingReference?.excerpt ?? "Evidence not found";
      } else {
        nextExcerpt = "Evidence not found";
      }
      evidenceResult = { matched: false, reason: "empty-excerpt" };
    } else if (!evidenceResult.matched) {
      if (isMissingEvidenceMarker(currentExcerpt)) {
        nextExcerpt = currentExcerpt;
      } else if (preferredExcerpt && preferredExcerpt !== currentExcerpt) {
        const preferredResult = checkEvidenceMatch(preferredExcerpt, content);
        if (preferredResult.matched) {
          nextExcerpt = preferredExcerpt;
          evidenceResult = preferredResult;
        } else {
          nextExcerpt = "Evidence not found";
        }
      } else {
        nextExcerpt = "Evidence not found";
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
        clauseId: stableClauseId,
      });
    }

    if (!issue.clauseReference && !match) {
      return issue;
    }

    return {
      ...issue,
      clauseReference: {
        clauseId: stableClauseId,
        heading: existingReference?.heading ?? match?.title,
        excerpt: nextExcerpt,
        locationHint: existingReference?.locationHint ??
          match?.location ?? {
            page: null,
            paragraph: null,
            section: match?.title ?? null,
            clauseNumber: matchedClauseId ?? null,
          },
      },
    };
  });

  const criteriaWithEvidence = report.criteriaMet.map((criterion) => {
    const fallbackText = `${criterion.title} ${criterion.description ?? ""}`.trim();
    const matchResult = resolveClauseMatch({
      clauseReference: null,
      fallbackText,
      clauses: clauseCandidates,
    });
    const match = matchResult.match;
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

    const currentEvidence =
      typeof criterion.evidence === "string" && criterion.evidence.trim().length > 0
        ? criterion.evidence
        : fallbackExcerpt;

    let evidenceResult = currentEvidence
      ? checkEvidenceMatch(currentEvidence, content)
      : { matched: false, reason: "empty-excerpt" };

    let nextEvidence = currentEvidence;
    if (!currentEvidence) {
      nextEvidence = fallbackExcerpt || "Evidence not found";
      evidenceResult = { matched: false, reason: "empty-excerpt" };
    } else if (!evidenceResult.matched) {
      if (fallbackExcerpt && fallbackExcerpt !== currentEvidence) {
        const fallbackResult = checkEvidenceMatch(fallbackExcerpt, content);
        if (fallbackResult.matched) {
          nextEvidence = fallbackExcerpt;
          evidenceResult = fallbackResult;
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
      });
    }

    return { ...criterion, evidence: nextEvidence };
  });

  if (DEBUG_REVIEW) {
    console.info("🧭 Evidence alignment summary", {
      issues: issueEvidenceStats,
      criteria: criteriaEvidenceStats,
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
    issuesToAddress: issuesWithEvidence,
    criteriaMet: criteriaWithEvidence,
    metadata: nextMetadata as AnalysisReport["metadata"],
  };
}
