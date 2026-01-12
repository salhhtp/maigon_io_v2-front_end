import type { AnalysisReport, ClauseExtraction } from "./reviewSchema.ts";
import type { ContractPlaybook } from "./playbooks.ts";
import {
  buildEvidenceExcerpt,
  checkEvidenceMatch,
  checkEvidenceMatchAgainstClause,
  findRequirementMatch,
  hasStructuralMatch,
  isStructuralToken,
  isMissingEvidenceMarker,
  matchClauseToText as matchClauseToTextWithDebug,
  normalizeForMatch,
  resolveClauseMatch,
  tokenVariants,
  tokenizeForMatch,
} from "../../../shared/ai/reliability.ts";

const DEBUG_REVIEW = (() => {
  if (typeof Deno === "undefined") return false;
  const raw = (Deno.env.get("MAIGON_REVIEW_DEBUG") ?? "1").toLowerCase().trim();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
})();
const OPTIONAL_ANCHOR_PATTERN = /\bif (applicable|relevant)\b/i;
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
  "not clearly",
  "not addressed",
];
const normalizeIssueKey = (value: string) => value.trim().toUpperCase();
const buildMissingClauseId = (value?: string | null) => {
  const slug = normalizeForMatch(value ?? "").replace(/\s+/g, "-");
  return slug ? `missing-${slug.slice(0, 40)}` : "missing-criterion";
};
const looksNegativeEvidence = (value: string) => {
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  return NEGATIVE_EVIDENCE_MARKERS.some((marker) => normalized.includes(marker));
};
const getClauseKey = (clause: ClauseExtraction) =>
  clause.clauseId ?? clause.id ?? clause.title ?? "";
const findClauseByEvidence = (
  evidence: string | undefined,
  clauses: ClauseExtraction[],
): ClauseExtraction | null => {
  if (!evidence) return null;
  const evidenceKey = normalizeForMatch(evidence);
  if (!evidenceKey) return null;
  return (
    clauses.find((clause) => {
      const idKey = normalizeForMatch(getClauseKey(clause));
      const titleKey = normalizeForMatch(clause.title ?? "");
      return idKey === evidenceKey || titleKey === evidenceKey;
    }) ?? null
  );
};
const findClauseBySignals = (
  signals: string[],
  clauses: ClauseExtraction[],
  content: string,
): ClauseExtraction | null => {
  if (!signals.length) return null;
  const scoreByClause = new Map<
    string,
    { clause: ClauseExtraction; hits: number; score: number }
  >();
  signals.forEach((signal) => {
    const match = findRequirementMatch(signal, clauses, content);
    if (!match.met || !match.evidence) return;
    const clause = findClauseByEvidence(match.evidence, clauses);
    if (!clause) return;
    const key = normalizeForMatch(getClauseKey(clause));
    const entry = scoreByClause.get(key) ?? {
      clause,
      hits: 0,
      score: 0,
    };
    entry.hits += 1;
    entry.score += match.score;
    scoreByClause.set(key, entry);
  });
  let best: { clause: ClauseExtraction; hits: number; score: number } | null =
    null;
  scoreByClause.forEach((entry) => {
    if (!best) {
      best = entry;
      return;
    }
    if (entry.hits > best.hits) {
      best = entry;
      return;
    }
    if (entry.hits === best.hits && entry.score > best.score) {
      best = entry;
    }
  });
  return best?.clause ?? null;
};

const similarityForText = (a: string, b: string) => {
  const tokensA = tokenizeForMatch(a);
  const tokensB = tokenizeForMatch(b);
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const buildCriterionId = (
  value: string,
  used: Map<string, number>,
  fallback: string,
): string => {
  const base = normalizeForMatch(value).replace(/\s+/g, "_").toUpperCase();
  const baseKey = base || fallback;
  const count = used.get(baseKey) ?? 0;
  used.set(baseKey, count + 1);
  if (count === 0) return baseKey.slice(0, 64) || fallback;
  const suffix = `_${count + 1}`;
  return `${baseKey.slice(0, 64 - suffix.length)}${suffix}`;
};

const isAnchorRedundant = (
  anchor: string,
  criticalTitles: string[],
): boolean => {
  const anchorTokens = tokenizeForMatch(anchor);
  if (!anchorTokens.length) return false;
  const anchorSet = new Set(anchorTokens);
  return criticalTitles.some((criticalTitle) => {
    const criticalTokens = tokenizeForMatch(criticalTitle);
    if (!criticalTokens.length) return false;
    const matched = criticalTokens.filter((token) =>
      tokenVariants(token).some((variant) => anchorSet.has(variant)),
    );
    const coverage = matched.length / criticalTokens.length;
    return coverage >= 0.8;
  });
};

const buildCriteriaFromPlaybook = (playbook: ContractPlaybook) => {
  const criteria: AnalysisReport["criteriaMet"] = [];
  const requirementsById = new Map<string, string[]>();
  const usedIds = new Map<string, number>();
  const optionalCriteriaIds = new Set<string>();
  const criticalTitles = playbook.criticalClauses.map((clause) => clause.title);

  playbook.criticalClauses.forEach((clause, index) => {
    const id = buildCriterionId(
      clause.title,
      usedIds,
      `CRITICAL_${index + 1}`,
    );
    requirementsById.set(
      id,
      clause.mustInclude?.length ? clause.mustInclude : [clause.title],
    );
    criteria.push({
      id,
      title: clause.title,
      description: clause.mustInclude?.length
        ? `Must include: ${clause.mustInclude.join("; ")}`
        : clause.title,
      met: false,
      evidence: "",
    });
  });

  const existingTitles = new Set(
    criteria.map((entry) => normalizeForMatch(entry.title ?? "")),
  );
  playbook.clauseAnchors.forEach((anchor, index) => {
    const titleKey = normalizeForMatch(anchor);
    if (existingTitles.has(titleKey)) return;
    const id = buildCriterionId(anchor, usedIds, `ANCHOR_${index + 1}`);
    requirementsById.set(id, [anchor]);
    if (
      OPTIONAL_ANCHOR_PATTERN.test(anchor) ||
      isAnchorRedundant(anchor, criticalTitles)
    ) {
      optionalCriteriaIds.add(id);
    }
    criteria.push({
      id,
      title: anchor,
      description: anchor,
      met: false,
      evidence: "",
    });
  });

  return { criteria, requirementsById, optionalCriteriaIds };
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
    playbook?: ContractPlaybook | null;
  },
): AnalysisReport {
  const clauseCandidates = options.clauses ?? [];
  const content = options.content ?? "";
  const normalizedContent = normalizeForMatch(content);
  const playbookCriteria = options.playbook
    ? buildCriteriaFromPlaybook(options.playbook)
    : null;
  const baseCriteria = playbookCriteria?.criteria ?? report.criteriaMet;
  const requiredSignalsById =
    playbookCriteria?.requirementsById ?? new Map<string, string[]>();
  const optionalCriteriaIds =
    playbookCriteria?.optionalCriteriaIds ?? new Set<string>();
  const issueEvidenceStats = {
    total: report.issuesToAddress.length,
    matched: 0,
    missing: 0,
  };
  const criteriaEvidenceStats = {
    total: baseCriteria.length,
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
    const issueSignal = `${issue.title ?? ""} ${issue.category ?? ""} ${
      issue.recommendation ?? ""
    }`.trim();
    const issueTokens = tokenizeForMatch(issueSignal || fallbackText);
    const issueStructuralTokens = issueTokens.filter((token) =>
      isStructuralToken(token),
    );
    const existingReference = issue.clauseReference ?? {
      clauseId: "",
      heading: undefined,
      excerpt: undefined,
      locationHint: undefined,
    };
    let matchResult = resolveClauseMatch({
      clauseReference: issue.clauseReference ?? null,
      fallbackText,
      clauses: clauseCandidates,
    });
    let acceptedMatch = Boolean(
      matchResult.match &&
        (matchResult.method === "id" ||
          matchResult.method === "heading" ||
          matchResult.confidence >= MIN_ISSUE_CONFIDENCE),
    );
    let match = acceptedMatch ? matchResult.match : null;
    let issueStructuralMismatch = false;

    let trustExistingClauseId = true;
    const existingClauseId =
      typeof existingReference.clauseId === "string"
        ? existingReference.clauseId.trim()
        : "";
    const existingClauseIdKnown = existingClauseId
      ? clauseCandidates.some((clause) =>
        normalizeForMatch(getClauseKey(clause)) ===
          normalizeForMatch(existingClauseId)
      )
      : false;
    if (!existingClauseIdKnown) {
      trustExistingClauseId = false;
    }
    const existingExcerpt =
      typeof existingReference.excerpt === "string"
        ? existingReference.excerpt.trim()
        : "";
    if (match && matchResult.method === "id" && existingClauseId) {
      const clauseText =
        match.originalText ?? match.normalizedText ?? match.title ?? "";
      const excerptMismatch =
        existingExcerpt &&
        !isMissingEvidenceMarker(existingExcerpt) &&
        !checkEvidenceMatchAgainstClause(existingExcerpt, clauseText).matched;
      const missingMarkerWithId =
        existingExcerpt &&
        isMissingEvidenceMarker(existingExcerpt);
      if (excerptMismatch || missingMarkerWithId) {
        trustExistingClauseId = false;
        const fallback = [fallbackText, existingExcerpt]
          .filter(Boolean)
          .join(" ")
          .trim();
        const reMatch = resolveClauseMatch({
          clauseReference: null,
          fallbackText: fallback,
          clauses: clauseCandidates,
        });
        const reAccepted = Boolean(
          reMatch.match &&
            (reMatch.method === "heading" ||
              reMatch.confidence >= MIN_ISSUE_CONFIDENCE),
        );
        matchResult = reMatch;
        acceptedMatch = reAccepted;
        match = reAccepted ? reMatch.match : null;
        if (match && issueStructuralTokens.length > 0) {
          const reClauseText =
            match.originalText ?? match.normalizedText ?? match.title ?? "";
          const reClauseTokens = tokenizeForMatch(reClauseText);
          if (!hasStructuralMatch(issueStructuralTokens, reClauseTokens)) {
            match = null;
            acceptedMatch = false;
            issueStructuralMismatch = true;
          }
        }
      }
    }
    if (match && issueStructuralTokens.length > 0) {
      const clauseText =
        match.originalText ?? match.normalizedText ?? match.title ?? "";
      const clauseTokens = tokenizeForMatch(clauseText);
      const structuralMismatch = !hasStructuralMatch(
        issueStructuralTokens,
        clauseTokens,
      );
      if (structuralMismatch) {
        issueStructuralMismatch = true;
        trustExistingClauseId = false;
        const reMatch = resolveClauseMatch({
          clauseReference: null,
          fallbackText: issueSignal || fallbackText,
          clauses: clauseCandidates,
        });
        const reAccepted = Boolean(
          reMatch.match &&
            (reMatch.method === "heading" ||
              reMatch.confidence >= MIN_ISSUE_CONFIDENCE),
        );
        matchResult = reMatch;
        acceptedMatch = reAccepted;
        match = reAccepted ? reMatch.match : null;
        if (match && issueStructuralTokens.length > 0) {
          const reClauseText =
            match.originalText ?? match.normalizedText ?? match.title ?? "";
          const reClauseTokens = tokenizeForMatch(reClauseText);
          if (hasStructuralMatch(issueStructuralTokens, reClauseTokens)) {
            issueStructuralMismatch = false;
          } else {
            match = null;
            acceptedMatch = false;
          }
        }
      }
    }

    const matchedClauseId = match?.clauseId ?? match?.id ?? null;
    const missingLabel =
      issue.title ?? issue.category ?? issue.id ?? `issue-${index + 1}`;
    const stableClauseId =
      matchedClauseId ??
      (trustExistingClauseId && existingClauseId.trim().length > 0
        ? existingClauseId
        : buildMissingClauseId(missingLabel));

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
      !issueStructuralMismatch
        ? preferredExcerpt ||
          (existingReference?.excerpt &&
              existingReference.excerpt.trim().length > 0
            ? existingReference.excerpt
            : "")
        : isMissingEvidenceMarker(existingReference?.excerpt)
        ? existingReference?.excerpt ?? ""
        : "";
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
        heading: match?.title ?? existingReference?.heading,
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

  const criteriaWithEvidence = baseCriteria.map((criterion) => {
    const fallbackText = `${criterion.title} ${criterion.description ?? ""}`.trim();
    const headingReference =
      typeof criterion.title === "string" && criterion.title.trim().length > 0
        ? { heading: criterion.title }
        : null;
    const matchResult = resolveClauseMatch({
      clauseReference: headingReference,
      fallbackText,
      clauses: clauseCandidates,
    });
    const acceptedMatch = Boolean(
      matchResult.match &&
        (matchResult.method === "id" ||
          matchResult.method === "heading" ||
          matchResult.confidence >= MIN_CRITERIA_CONFIDENCE),
    );
    let match = acceptedMatch ? matchResult.match : null;
    const requiredSignals = requiredSignalsById.get(criterion.id) ?? [];
    const optionalCriterion = optionalCriteriaIds.has(criterion.id);
    const signalsForMatch = requiredSignals.length > 0
      ? requiredSignals
      : [criterion.title ?? ""].filter(Boolean);
    let clauseText = match
      ? match.originalText ?? match.normalizedText ?? match.title ?? ""
      : "";
    const titleTokens = tokenizeForMatch(criterion.title ?? "");
    const structuralTokens = titleTokens.filter((token) =>
      isStructuralToken(token),
    );
    if (structuralTokens.length > 0 && match) {
      const clauseTokens = tokenizeForMatch(clauseText);
      if (!hasStructuralMatch(structuralTokens, clauseTokens)) {
        const signalClause = findClauseBySignals(
          signalsForMatch,
          clauseCandidates,
          content,
        );
        match = signalClause ?? null;
        clauseText = match
          ? match.originalText ?? match.normalizedText ?? match.title ?? ""
          : "";
      }
    } else if (!match && signalsForMatch.length > 0) {
      const signalClause = findClauseBySignals(
        signalsForMatch,
        clauseCandidates,
        content,
      );
      if (signalClause) {
        match = signalClause;
        clauseText =
          match.originalText ?? match.normalizedText ?? match.title ?? "";
      }
    }
    const clauseTokens = tokenizeForMatch(clauseText);
    const structuralMismatch =
      structuralTokens.length > 0 &&
      Boolean(match) &&
      !hasStructuralMatch(structuralTokens, clauseTokens);
    if (structuralMismatch) {
      match = null;
      clauseText = "";
    }
    const signalResults = requiredSignals.map((signal) =>
      findRequirementMatch(signal, clauseCandidates, content),
    );
    const missingSignals = optionalCriterion
      ? []
      : requiredSignals.filter((signal, index) => !signalResults[index]?.met);
    const matchedSignals = requiredSignals.filter(
      (signal, index) => signalResults[index]?.met,
    );
    const hasMatchedSignals =
      requiredSignals.length === 0 ? Boolean(match) : matchedSignals.length > 0;
    const hasStrongMatch =
      Boolean(match) &&
      (matchResult.method === "heading" || matchResult.method === "id");
    if (!optionalCriterion && requiredSignals.length > 0) {
      if (!hasMatchedSignals && !hasStrongMatch) {
        match = null;
        clauseText = "";
      }
    }
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
      !structuralMismatch &&
        typeof criterion.evidence === "string" &&
        criterion.evidence.trim().length > 0
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
    const negativeDescription =
      looksNegativeEvidence(criterion.description ?? "") ||
      looksNegativeEvidence(criterion.title ?? "");
    const meetsRequiredSignals =
      optionalCriterion || missingSignals.length === 0;
    const nextDescription =
      !optionalCriterion && missingSignals.length > 0
        ? `Must include: ${missingSignals.join("; ")}`
        : criterion.description;

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
    const shouldUpgradeMet =
      Boolean(match) &&
      hasEvidence &&
      !structuralMismatch &&
      meetsRequiredSignals;
    const nextMet = negativeDescription ||
        structuralMismatch ||
        !meetsRequiredSignals
      ? false
      : shouldUpgradeMet
      ? true
      : !hasEvidence
      ? false
      : criterion.met;
    return {
      ...criterion,
      description: nextDescription,
      evidence: nextEvidence,
      met: nextMet,
    };
  });

  let issuesBackfilledFromCriteria = backfillIssuesFromCriteria(
    criteriaWithEvidence,
    issuesWithNormalizedEvidence,
    clauseCandidates,
    optionalCriteriaIds,
  );

  if (issuesBackfilledFromCriteria.length === 0) {
    issuesBackfilledFromCriteria = backfillIssuesFromEdits(
      issuesBackfilledFromCriteria,
      report.proposedEdits ?? [],
      clauseCandidates,
    );
  }

  const issuesFiltered = filterIssuesByCriteria(
    issuesBackfilledFromCriteria,
    criteriaWithEvidence,
    optionalCriteriaIds,
  );

  const criteriaAlignedWithIssues = alignCriteriaWithIssues(
    criteriaWithEvidence,
    issuesFiltered,
  );
  const metOnlyCriteria = criteriaAlignedWithIssues.filter((criterion) =>
    Boolean(criterion.met)
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
    issuesToAddress: issuesFiltered,
    criteriaMet: metOnlyCriteria,
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
  issues.forEach((issue) => {
    criteriaCopy.forEach((criterion, index) => {
      if (!issueMatchesCriterion(issue, criterion)) return;
      if (criterion.met) return;
      const currentEvidence = criterion.evidence ?? "";
      const nextEvidence =
        currentEvidence &&
        !isMissingEvidenceMarker(currentEvidence) &&
        currentEvidence !== "Evidence not found"
          ? currentEvidence
          : issue.clauseReference?.excerpt ??
            criterion.evidence ??
            "Not present in contract";
      criteriaCopy[index] = {
        ...criterion,
        evidence: nextEvidence,
      };
    });
  });

  return criteriaCopy;
}

function scoreIssueCriterionMatch(
  issue: AnalysisReport["issuesToAddress"][number],
  criterion: AnalysisReport["criteriaMet"][number],
): number {
  const criterionId = normalizeIssueKey(criterion.id);
  const criterionTitle = normalizeTitleKey(criterion.title ?? "");
  const issueTitle = normalizeTitleKey(issue.title ?? "");
  const rawIssueId = normalizeIssueKey(issue.id ?? "");
  const issueId = rawIssueId.replace(/^ISSUE_/, "");
  let score = 0;

  if (issueId === criterionId) score = Math.max(score, 100 + criterionId.length);
  if (issueId.startsWith(`${criterionId}_`)) {
    score = Math.max(score, 90 + criterionId.length);
  } else if (issueId.includes(criterionId)) {
    score = Math.max(score, 70 + criterionId.length);
  }
  if (issueTitle && issueTitle === criterionTitle) {
    score = Math.max(score, 85 + criterionTitle.length);
  } else if (issueTitle && criterionTitle && issueTitle.includes(criterionTitle)) {
    score = Math.max(score, 60 + criterionTitle.length);
  }
  if (Array.isArray(issue.tags)) {
    const tags = issue.tags.map((tag) => normalizeIssueKey(tag));
    if (tags.includes(criterionId)) {
      score = Math.max(score, 95 + criterionId.length);
    }
  }
  const checklistIds = new Set<string>();
  extractChecklistIds(issue.id ?? "").forEach((id) => checklistIds.add(id));
  (issue.tags ?? []).forEach((tag) => {
    extractChecklistIds(tag ?? "").forEach((id) => checklistIds.add(id));
  });
  if (checklistIds.has(criterionId)) {
    score = Math.max(score, 88 + criterionId.length);
  }

  return score;
}

function issueMatchesCriterion(
  issue: AnalysisReport["issuesToAddress"][number],
  criterion: AnalysisReport["criteriaMet"][number],
) {
  return scoreIssueCriterionMatch(issue, criterion) > 0;
}

function backfillIssuesFromCriteria(
  criteria: AnalysisReport["criteriaMet"],
  issues: AnalysisReport["issuesToAddress"],
  clauses: ClauseExtraction[],
  optionalCriteriaIds: Set<string>,
): AnalysisReport["issuesToAddress"] {
  const nextIssues = [...issues];
  criteria.forEach((criterion) => {
    if (optionalCriteriaIds.has(criterion.id)) return;
    if (criterion.met) return;
    const hasIssue = nextIssues.some((issue) => {
      const match = findMatchingCriterion(issue, criteria);
      return match?.id === criterion.id;
    });
    if (hasIssue) return;

    const fallbackText = `${criterion.title} ${criterion.description ?? ""}`.trim();
    const criterionEvidence =
      typeof criterion.evidence === "string" ? criterion.evidence.trim() : "";
    const shouldAttemptMatch =
      Boolean(fallbackText) &&
      !isMissingEvidenceMarker(criterionEvidence);
    const matchResult = shouldAttemptMatch
      ? resolveClauseMatch({
          clauseReference: null,
          fallbackText,
          clauses,
        })
      : { match: null, confidence: 0, method: "none", candidates: [] };
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
      ? (match.clauseId ?? match.id ?? buildMissingClauseId(criterion.title ?? criterion.id))
      : buildMissingClauseId(criterion.title ?? criterion.id);

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

function findMatchingCriterion(
  issue: AnalysisReport["issuesToAddress"][number],
  criteria: AnalysisReport["criteriaMet"],
) {
  let best: AnalysisReport["criteriaMet"][number] | undefined;
  let bestScore = 0;
  criteria.forEach((criterion) => {
    const score = scoreIssueCriterionMatch(issue, criterion);
    if (score > bestScore) {
      bestScore = score;
      best = criterion;
    }
  });
  return bestScore > 0 ? best : undefined;
}

function isDraftIssue(issue: AnalysisReport["issuesToAddress"][number]) {
  const id = normalizeIssueKey(issue.id ?? "");
  const category = normalizeIssueKey(issue.category ?? "");
  if (id.startsWith("ISSUE_EDIT_")) return true;
  if (category.includes("DRAFT UPDATE")) return true;
  if (Array.isArray(issue.tags)) {
    return issue.tags.some((tag) => normalizeIssueKey(tag).startsWith("EDIT_"));
  }
  return false;
}

function filterIssuesByCriteria(
  issues: AnalysisReport["issuesToAddress"],
  criteria: AnalysisReport["criteriaMet"],
  optionalCriteriaIds: Set<string>,
): AnalysisReport["issuesToAddress"] {
  if (!issues.length || !criteria.length) return issues;
  const filtered = issues.filter((issue) => {
    const matched = findMatchingCriterion(issue, criteria);
    if (!matched) return false;
    if (optionalCriteriaIds.has(matched.id)) return false;
    return !matched.met;
  });
  const nonDraftIssues = filtered.filter((issue) => !isDraftIssue(issue));
  return filtered.filter((issue) => {
    if (!isDraftIssue(issue)) return true;
    const hasNonDraftMatch = nonDraftIssues.some((other) => {
      const titleSimilarity = similarityForText(
        issue.title ?? "",
        other.title ?? "",
      );
      if (titleSimilarity >= 0.35) return true;
      const clauseMatch =
        normalizeForMatch(issue.clauseReference?.clauseId ?? "") &&
        normalizeForMatch(issue.clauseReference?.clauseId ?? "") ===
          normalizeForMatch(other.clauseReference?.clauseId ?? "");
      return clauseMatch;
    });
    return !hasNonDraftMatch;
  });
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
      : buildMissingClauseId(
          edit.anchorText ??
            edit.proposedText ??
            edit.id ??
            `edit-${index + 1}`,
        );
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
