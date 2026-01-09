import type { AnalysisReport, ClauseExtraction } from "./reviewSchema.ts";
import {
  buildEvidenceExcerpt,
  buildEvidenceExcerptFromContent,
  checkEvidenceMatch,
  checkEvidenceMatchAgainstClause,
  hasTopicOverlap,
  isMissingEvidenceMarker,
  matchClauseToText as matchClauseToTextWithDebug,
  normalizeForMatch,
  resolveClauseMatch,
  tokenizeForMatch,
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
const GENERIC_TOKENS = new Set([
  "confidential",
  "information",
  "agreement",
  "party",
  "parties",
  "receiving",
  "disclosing",
  "discloser",
  "recipient",
  "disclosure",
  "project",
  "purpose",
]);
const MIN_ANCHOR_TOKEN_HITS = 2;

function hasAnchorTokenOverlap(anchor: string, excerpt: string): boolean {
  const anchorTokens = tokenizeForMatch(anchor).filter(
    (token) => !GENERIC_TOKENS.has(token),
  );
  if (!anchorTokens.length) return false;
  const excerptTokens = new Set(tokenizeForMatch(excerpt));
  let hits = 0;
  anchorTokens.forEach((token) => {
    if (excerptTokens.has(token)) hits += 1;
  });
  const requiredHits = Math.min(MIN_ANCHOR_TOKEN_HITS, anchorTokens.length);
  return hits >= requiredHits;
}

const FALLBACK_CLAUSE_LIMIT = 28;

function isClauseSetWeak(clauses: ClauseExtraction[]): boolean {
  if (!clauses.length) return true;
  let shortExcerpts = 0;
  let titled = 0;
  let withLocation = 0;
  const headings = new Set<string>();
  const genericHeading = /^(section|article|clause)\s*\d*$/i;
  clauses.forEach((clause) => {
    if (
      typeof clause.originalText !== "string" ||
      clause.originalText.trim().length < 60
    ) {
      shortExcerpts += 1;
    }
    if (clause.title) {
      const cleaned = clause.title.toLowerCase().trim();
      headings.add(cleaned);
      if (!genericHeading.test(cleaned) && cleaned.length > 3) {
        titled += 1;
      }
    }
    if (clause.location?.section) {
      withLocation += 1;
    }
  });
  if (shortExcerpts >= Math.max(2, clauses.length * 0.5)) {
    return true;
  }
  if (headings.size <= Math.ceil(clauses.length * 0.3)) {
    return true;
  }
  if (titled < Math.max(2, Math.ceil(clauses.length * 0.4))) {
    return true;
  }
  if (withLocation < Math.max(1, Math.ceil(clauses.length * 0.3))) {
    return true;
  }
  return false;
}

function mergeClauseCandidates(
  primary: ClauseExtraction[],
  fallback: ClauseExtraction[],
): ClauseExtraction[] {
  if (!fallback.length) return primary;
  const seen = new Set<string>();
  const merged: ClauseExtraction[] = [];
  const pushClause = (clause: ClauseExtraction) => {
    const key =
      clause.clauseId ??
      clause.id ??
      (clause.title
        ? clause.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64)
        : "");
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    merged.push(clause);
  };
  primary.forEach(pushClause);
  fallback.forEach(pushClause);
  return merged;
}

function buildFallbackClausesFromContent(
  content: string,
  limit: number,
): ClauseExtraction[] {
  if (!content || !content.trim()) return [];
  const lines = content.split(/\r?\n/);
  const clauses: ClauseExtraction[] = [];
  let currentTitle = "";
  let buffer: string[] = [];
  const headingRegex =
    /^(section\s+\d+|article\s+\d+|\d+(\.\d+)*\.?|[A-Z][A-Z\s-]+)$/i;
  const pushClause = () => {
    if (!currentTitle || buffer.length === 0) return;
    const snippet = buffer.join(" ").replace(/\s+/g, " ").trim().slice(0, 480);
    const clauseId = currentTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    clauses.push({
      id: `fallback-${clauses.length + 1}`,
      clauseId: clauseId || `fallback-${clauses.length + 1}`,
      title: currentTitle,
      originalText: snippet,
      normalizedText: snippet,
      category: "general",
      importance: "medium",
      location: {
        page: null,
        paragraph: null,
        section: currentTitle,
        clauseNumber: null,
      },
      references: [],
      metadata: { source: "fallback-parser" },
    });
    buffer = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (headingRegex.test(line) && line.length <= 140) {
      pushClause();
      currentTitle = line.replace(/[:.-\s]+$/, "").slice(0, 160);
      continue;
    }
    if (!currentTitle) {
      currentTitle = "Preamble";
    }
    buffer.push(line);
    if (buffer.join(" ").length > 520) {
      pushClause();
    }
  }
  pushClause();
  if (!clauses.length) {
    const snippet = content.replace(/\s+/g, " ").trim().slice(0, 480);
    clauses.push({
      id: "fallback-1",
      clauseId: "overview",
      title: "Contract overview",
      originalText: snippet,
      normalizedText: snippet,
      category: "general",
      importance: "low",
      location: {
        page: null,
        paragraph: null,
        section: "overview",
        clauseNumber: null,
      },
      references: [],
      metadata: { source: "fallback-parser" },
    });
  }
  return clauses.slice(0, limit);
}
function sanitizeLocationHint(location?: ClauseExtraction["location"] | null) {
  if (!location || typeof location !== "object") return null;
  const section =
    typeof location.section === "string" ? location.section.trim() : "";
  const normalized = section.toLowerCase();
  if (normalized.includes("unknown") || normalized.includes("not present")) {
    return { ...location, section: null };
  }
  return location;
}



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
  const content = options.content ?? "";
  const clauseCandidates = options.clauses ?? [];
  const fallbackClauses =
    isClauseSetWeak(clauseCandidates) && content
      ? buildFallbackClausesFromContent(content, FALLBACK_CLAUSE_LIMIT)
      : [];
  const mergedClauseCandidates = mergeClauseCandidates(
    clauseCandidates,
    fallbackClauses,
  );
  const anchoredClauseCandidates = content
    ? mergedClauseCandidates.filter((clause) => {
        const clauseText =
          clause.originalText ?? clause.normalizedText ?? clause.title ?? "";
        return clauseText
          ? checkEvidenceMatch(clauseText, content).matched
          : false;
      })
    : mergedClauseCandidates;
  const clauseCandidatesForMatch =
    anchoredClauseCandidates.length > 0
      ? anchoredClauseCandidates
      : mergedClauseCandidates;
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
      clauses: clauseCandidatesForMatch,
    });
    const matchClauseText = matchResult.match
      ? matchResult.match.originalText ??
          matchResult.match.normalizedText ??
          matchResult.match.title ??
          ""
      : "";
    const topicAligned =
      !fallbackText ||
      fallbackText.trim().length === 0 ||
      (matchClauseText
        ? hasTopicOverlap(fallbackText, matchClauseText)
        : false);
    const acceptedMatch = Boolean(
      matchResult.match &&
        (matchResult.method === "id" ||
          (topicAligned &&
            (matchResult.method === "heading" ||
              matchResult.confidence >= MIN_ISSUE_CONFIDENCE))),
    );
    const match = acceptedMatch ? matchResult.match : null;
    const existingReference = issue.clauseReference ?? {
      clauseId: "",
      heading: undefined,
      excerpt: undefined,
      locationHint: undefined,
    };
    const existingLocation = sanitizeLocationHint(
      existingReference?.locationHint ?? null,
    );

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

    const contentAnchor = fallbackText || issue.title || "";
    const contentExcerpt = contentAnchor
      ? buildEvidenceExcerptFromContent({
          content,
          anchorText: contentAnchor,
        })
      : "";
    const contentResult = contentExcerpt
      ? checkEvidenceMatch(contentExcerpt, content)
      : { matched: false, reason: "empty-excerpt" };
    const contentAligned =
      Boolean(contentExcerpt) &&
      contentResult.matched &&
      hasAnchorTokenOverlap(contentAnchor, contentExcerpt);

    let nextExcerpt = currentExcerpt;
    let evidenceResult = currentExcerpt
      ? checkEvidenceMatch(currentExcerpt, content)
      : { matched: false, reason: "empty-excerpt" };
    let clauseEvidenceResult = match && currentExcerpt
      ? checkEvidenceMatchAgainstClause(currentExcerpt, clauseText)
      : { matched: false, reason: "empty-content" };

    if (!currentExcerpt) {
      if (contentAligned) {
        nextExcerpt = contentExcerpt;
        evidenceResult = contentResult;
      } else if (isMissingEvidenceMarker(existingReference?.excerpt)) {
        nextExcerpt = existingReference?.excerpt ?? "Not present";
        evidenceResult = { matched: false, reason: "empty-excerpt" };
      } else {
        nextExcerpt = match ? "Evidence not found" : "Not present";
        evidenceResult = { matched: false, reason: "empty-excerpt" };
      }
    } else if (!clauseEvidenceResult.matched || !evidenceResult.matched) {
      if (contentAligned) {
        nextExcerpt = contentExcerpt;
        evidenceResult = contentResult;
        clauseEvidenceResult = match && contentExcerpt
          ? checkEvidenceMatchAgainstClause(contentExcerpt, clauseText)
          : clauseEvidenceResult;
      } else if (isMissingEvidenceMarker(currentExcerpt)) {
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
        heading: match ? (match.title ?? existingReference?.heading) : undefined,
        excerpt: nextExcerpt,
        locationHint: match?.location ??
          existingLocation ?? {
            page: null,
            paragraph: null,
            section: match?.title ?? null,
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
      clauses: clauseCandidatesForMatch,
    });
    const matchClauseText = matchResult.match
      ? matchResult.match.originalText ??
          matchResult.match.normalizedText ??
          matchResult.match.title ??
          ""
      : "";
    const topicAligned =
      !fallbackText ||
      fallbackText.trim().length === 0 ||
      (matchClauseText
        ? hasTopicOverlap(fallbackText, matchClauseText)
        : false);
    const acceptedMatch = Boolean(
      matchResult.match &&
        (matchResult.method === "id" ||
          (topicAligned &&
            (matchResult.method === "heading" ||
              matchResult.confidence >= MIN_CRITERIA_CONFIDENCE))),
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

    const contentAnchor = fallbackText || issue.title || "";
    const contentExcerpt = contentAnchor
      ? buildEvidenceExcerptFromContent({
          content,
          anchorText: contentAnchor,
        })
      : "";
    const contentResult = contentExcerpt
      ? checkEvidenceMatch(contentExcerpt, content)
      : { matched: false, reason: "empty-excerpt" };
    const contentAligned =
      Boolean(contentExcerpt) &&
      contentResult.matched &&
      hasAnchorTokenOverlap(contentAnchor, contentExcerpt);

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
      if (contentAligned) {
        nextEvidence = contentExcerpt;
        evidenceResult = contentResult;
      } else {
        nextEvidence = fallbackExcerpt || "Evidence not found";
        evidenceResult = { matched: false, reason: "empty-excerpt" };
      }
    } else if (!clauseEvidenceResult.matched || !evidenceResult.matched) {
      if (contentAligned) {
        nextEvidence = contentExcerpt;
        evidenceResult = contentResult;
        clauseEvidenceResult = match && contentExcerpt
          ? checkEvidenceMatchAgainstClause(contentExcerpt, clauseText)
          : clauseEvidenceResult;
      } else if (fallbackExcerpt && fallbackExcerpt !== currentEvidence) {
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
      clauseCount: clauseCandidatesForMatch.length,
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
    clauseExtractions: mergedClauseCandidates,
    issuesToAddress: issuesWithNormalizedEvidence,
    criteriaMet: filteredCriteria,
    metadata: nextMetadata as AnalysisReport["metadata"],
  };
}
