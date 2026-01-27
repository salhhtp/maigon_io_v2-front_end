import type { AnalysisReport, ClauseExtraction } from "./reviewSchema.ts";
import type { ContractPlaybook } from "./playbooks.ts";
import {
  buildEvidenceExcerpt,
  buildUniqueEvidenceExcerpt,
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
const REBIND_MIN_COVERAGE = 0.3;
const REBIND_SCORE_DELTA = 0.15;
const HEADING_REBIND_MIN_COVERAGE = 0.4;
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

const buildClauseMatchText = (clause: ClauseExtraction) =>
  [clause.title, clause.originalText, clause.normalizedText]
    .filter(Boolean)
    .join(" ")
    .trim();

const buildClauseHeadingText = (clause: ClauseExtraction) =>
  [
    clause.title,
    clause.location?.section,
    clause.clauseId,
    clause.id,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

const tokenCoverageWithVariants = (
  tokens: string[],
  clauseTokens: string[],
): number => {
  if (!tokens.length || !clauseTokens.length) return 0;
  const clauseSet = new Set(clauseTokens);
  let hits = 0;
  tokens.forEach((token) => {
    if (tokenVariants(token).some((variant) => clauseSet.has(variant))) {
      hits += 1;
    }
  });
  return hits / tokens.length;
};

const findBestClauseByCoverage = (
  tokens: string[],
  clauses: ClauseExtraction[],
  options?: { headingOnly?: boolean },
): { clause: ClauseExtraction; score: number } | null => {
  if (!tokens.length) return null;
  let best: { clause: ClauseExtraction; score: number } | null = null;
  clauses.forEach((clause) => {
    const clauseText = options?.headingOnly
      ? buildClauseHeadingText(clause)
      : buildClauseMatchText(clause);
    if (!clauseText) return;
    const clauseTokens = tokenizeForMatch(clauseText);
    const score = tokenCoverageWithVariants(tokens, clauseTokens);
    if (score <= 0) return;
    if (!best || score > best.score) {
      best = { clause, score };
    }
  });
  return best;
};

const findBestClauseByCoverageWithSupport = (
  tokens: string[],
  clauses: ClauseExtraction[],
  supportCheck: (clause: ClauseExtraction, clauseText: string) => boolean,
  options?: { headingOnly?: boolean },
): { clause: ClauseExtraction; score: number } | null => {
  if (!tokens.length) return null;
  let best: { clause: ClauseExtraction; score: number } | null = null;
  clauses.forEach((clause) => {
    const clauseText = options?.headingOnly
      ? buildClauseHeadingText(clause)
      : buildClauseMatchText(clause);
    if (!clauseText) return;
    if (!supportCheck(clause, clauseText)) return;
    const clauseTokens = tokenizeForMatch(clauseText);
    const score = tokenCoverageWithVariants(tokens, clauseTokens);
    if (score <= 0) return;
    if (!best || score > best.score) {
      best = { clause, score };
    }
  });
  return best;
};

const findBestClauseBySupport = (
  tokens: string[],
  clauses: ClauseExtraction[],
  supportCheck: (clause: ClauseExtraction, clauseText: string) => boolean,
): { clause: ClauseExtraction; score: number } | null => {
  let best: { clause: ClauseExtraction; score: number } | null = null;
  clauses.forEach((clause) => {
    const clauseText = buildClauseMatchText(clause);
    if (!clauseText) return;
    if (!supportCheck(clause, clauseText)) return;
    const clauseTokens = tokenizeForMatch(clauseText);
    const score = tokens.length > 0
      ? tokenCoverageWithVariants(tokens, clauseTokens)
      : 0;
    if (!best || score > best.score) {
      best = { clause, score };
    }
  });
  return best;
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
  const criticalCriteriaIds = new Set<string>();
  const criticalTitles = playbook.criticalClauses.map((clause) => clause.title);

  playbook.criticalClauses.forEach((clause, index) => {
    const id = buildCriterionId(
      clause.title,
      usedIds,
      `CRITICAL_${index + 1}`,
    );
    criticalCriteriaIds.add(id);
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

  return {
    criteria,
    requirementsById,
    optionalCriteriaIds,
    criticalCriteriaIds,
  };
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
  const clauseCandidates =
    options.clauses && options.clauses.length > 0
      ? options.clauses
      : report.clauseExtractions ?? [];
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
  const criticalCriteriaIds =
    playbookCriteria?.criticalCriteriaIds ?? new Set<string>();
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
  // Track used excerpts per clause to ensure unique evidence across criteria
  const usedExcerptsByClause = new Map<string, Set<string>>();
  const isMissingLocationValue = (value: unknown) => {
    if (typeof value !== "string") return true;
    const normalized = normalizeForMatch(value);
    if (!normalized) return true;
    return (
      normalized.includes("not present") ||
      normalized.includes("not found") ||
      normalized.includes("evidence not found") ||
      normalized.startsWith("missing") ||
      normalized.startsWith("unbound")
    );
  };
  const cleanLocationHint = (
    locationHint: ClauseExtraction["location"] | undefined | null,
  ): ClauseExtraction["location"] | null => {
    if (!locationHint) return null;
    const page =
      typeof locationHint.page === "number" ? locationHint.page : null;
    const paragraph =
      typeof locationHint.paragraph === "number" ? locationHint.paragraph : null;
    const section = isMissingLocationValue(locationHint.section)
      ? null
      : locationHint.section ?? null;
    const clauseNumber = isMissingLocationValue(locationHint.clauseNumber)
      ? null
      : locationHint.clauseNumber ?? null;
    if (!section && !clauseNumber && page === null && paragraph === null) {
      return null;
    }
    return {
      page,
      paragraph,
      section,
      clauseNumber,
    };
  };
  const isMissingLocationHint = (
    locationHint: ClauseExtraction["location"] | undefined | null,
  ) => !cleanLocationHint(locationHint);

  const issuesWithEvidence = report.issuesToAddress.map((issue, index) => {
    const fallbackText = `${issue.title} ${issue.recommendation ?? ""}`.trim();
    const issueSignal = `${issue.title ?? ""} ${issue.category ?? ""} ${
      issue.recommendation ?? ""
    }`.trim();
    const issueStructuralSeed = `${issue.title ?? ""} ${issue.category ?? ""}`.trim();
    const issueTokens = tokenizeForMatch(issueSignal || fallbackText);
    const issueStructuralTokens = tokenizeForMatch(
      issueStructuralSeed || issueSignal || fallbackText,
    ).filter((token) => isStructuralToken(token));
    const existingReference = issue.clauseReference ?? {
      clauseId: "",
      heading: undefined,
      excerpt: undefined,
      locationHint: undefined,
    };
    const supportCheck = getIssueSupportCheck(issue);
    const matchedCriticalCriterion =
      criticalCriteriaIds.size > 0 && baseCriteria.length > 0
        ? findMatchingCriterion(issue, baseCriteria)
        : undefined;
    const isCriticalIssue = Boolean(
      matchedCriticalCriterion &&
        criticalCriteriaIds.has(matchedCriticalCriterion.id),
    );
    const existingClauseKey = normalizeForMatch(existingReference?.clauseId ?? "");
    const preserveMissingEvidence =
      isMissingEvidenceMarker(existingReference?.excerpt ?? "") ||
      existingClauseKey.startsWith("missing") ||
      existingClauseKey.startsWith("unbound");
    const allowCriticalStructuralMismatch =
      isCriticalIssue &&
      (isMissingEvidenceMarker(existingReference?.excerpt ?? "") ||
        existingClauseKey.startsWith("missing") ||
        existingClauseKey.startsWith("unbound"));
    const canIgnoreStructuralMismatch = (
      method: string,
      confidence: number,
    ) =>
      allowCriticalStructuralMismatch &&
      (method === "heading" || method === "id" ||
        confidence >= MIN_ISSUE_CONFIDENCE + 0.1);
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
      const clauseText = buildClauseMatchText(match);
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
          const reClauseText = buildClauseMatchText(match);
          const reClauseTokens = tokenizeForMatch(reClauseText);
          const structuralMismatch = !hasStructuralMatch(
            issueStructuralTokens,
            reClauseTokens,
          );
          if (
            structuralMismatch &&
            !canIgnoreStructuralMismatch(reMatch.method, reMatch.confidence)
          ) {
            match = null;
            acceptedMatch = false;
            issueStructuralMismatch = true;
          }
        }
      }
    }
    if (match && issueStructuralTokens.length > 0) {
      const clauseText = buildClauseMatchText(match);
      const clauseTokens = tokenizeForMatch(clauseText);
      const structuralMismatch = !hasStructuralMatch(
        issueStructuralTokens,
        clauseTokens,
      );
      if (
        structuralMismatch &&
        !canIgnoreStructuralMismatch(matchResult.method, matchResult.confidence)
      ) {
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
          const reClauseText = buildClauseMatchText(match);
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

    const issueMatchTokens = issueStructuralTokens.length > 0
      ? issueStructuralTokens
      : issueTokens;
    const hasMissingEvidence =
      isMissingEvidenceMarker(existingReference?.excerpt ?? "") ||
      existingClauseKey.startsWith("missing") ||
      existingClauseKey.startsWith("unbound");
    const currentClauseText = match ? buildClauseMatchText(match) : "";
    const currentCoverage =
      currentClauseText && issueMatchTokens.length > 0
        ? tokenCoverageWithVariants(
          issueMatchTokens,
          tokenizeForMatch(currentClauseText),
        )
        : 0;
    const bestCoverageMatch = issueMatchTokens.length > 0
      ? findBestClauseByCoverage(issueMatchTokens, clauseCandidates)
      : null;
    const headingCoverageMatch =
      isCriticalIssue && hasMissingEvidence && issueMatchTokens.length > 0
        ? findBestClauseByCoverage(issueMatchTokens, clauseCandidates, {
          headingOnly: true,
        })
        : null;
    const shouldRebindByCoverage = Boolean(
      bestCoverageMatch &&
        bestCoverageMatch.score >= REBIND_MIN_COVERAGE &&
        (!match ||
          currentCoverage < REBIND_MIN_COVERAGE ||
          bestCoverageMatch.score >= currentCoverage + REBIND_SCORE_DELTA),
    );
    const shouldRebindByHeading = Boolean(
      !shouldRebindByCoverage &&
        headingCoverageMatch &&
        headingCoverageMatch.score >= HEADING_REBIND_MIN_COVERAGE &&
        (!match || currentCoverage < REBIND_MIN_COVERAGE),
    );
    if (shouldRebindByCoverage || shouldRebindByHeading) {
      const rebindCandidate = shouldRebindByCoverage
        ? bestCoverageMatch!
        : headingCoverageMatch!;
      const rebindMethod = shouldRebindByHeading ? "heading" : "text";
      match = rebindCandidate.clause;
      matchResult = {
        match,
        confidence: rebindCandidate.score,
        method: rebindMethod,
        candidates: matchResult.candidates,
      };
      acceptedMatch = true;
      issueStructuralMismatch = false;
      trustExistingClauseId = false;
    } else if (
      isCriticalIssue &&
      match &&
      issueMatchTokens.length > 0 &&
      currentCoverage < REBIND_MIN_COVERAGE
    ) {
      match = null;
      acceptedMatch = false;
      issueStructuralMismatch = true;
      trustExistingClauseId = false;
    }

    if (supportCheck) {
      const currentClauseText = match ? buildClauseMatchText(match) : "";
      const supportsCurrent =
        match && currentClauseText ? supportCheck(match, currentClauseText) : false;
      if (!supportsCurrent) {
        let supportedMatch =
          issueMatchTokens.length > 0
            ? findBestClauseByCoverageWithSupport(
              issueMatchTokens,
              clauseCandidates,
              supportCheck,
            )
            : null;
        if (!supportedMatch && preserveMissingEvidence) {
          supportedMatch = findBestClauseBySupport(
            issueMatchTokens,
            clauseCandidates,
            supportCheck,
          );
        }
        if (
          supportedMatch &&
          (supportedMatch.score >= REBIND_MIN_COVERAGE || preserveMissingEvidence)
        ) {
          match = supportedMatch.clause;
          matchResult = {
            match,
            confidence: Math.max(supportedMatch.score, MIN_ISSUE_CONFIDENCE),
            method: "text",
            candidates: matchResult.candidates,
          };
          acceptedMatch = true;
          issueStructuralMismatch = false;
          trustExistingClauseId = false;
        } else if (match) {
          match = null;
          acceptedMatch = false;
          issueStructuralMismatch = true;
          trustExistingClauseId = false;
        }
      }
    }

    const clauseText = match
      ? match.originalText ?? match.normalizedText ?? match.title ?? ""
      : "";
    const supportsMatchedClause =
      preserveMissingEvidence &&
      Boolean(match && clauseText && supportCheck && supportCheck(match, clauseText));
    const shouldPreserveMissingEvidence =
      preserveMissingEvidence && !supportsMatchedClause;
    const matchedClauseId = shouldPreserveMissingEvidence
      ? null
      : match?.clauseId ?? match?.id ?? null;
    const missingLabel =
      issue.title ?? issue.category ?? issue.id ?? `issue-${index + 1}`;
    const stableClauseId =
      matchedClauseId ??
      (!shouldPreserveMissingEvidence &&
          trustExistingClauseId &&
          existingClauseId.trim().length > 0
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

    const clauseExcerptSource = match
      ? match.originalText ??
        match.normalizedText ??
        match.title ??
        ""
      : "";
    const excerptAnchor = match
      ? getIssueExcerptAnchor(issue, clauseExcerptSource)
      : null;
    const preferredExcerpt = !shouldPreserveMissingEvidence && match
      ? buildEvidenceExcerpt({
        clauseText: clauseExcerptSource,
        anchorText: excerptAnchor?.anchorText ?? existingReference?.excerpt ?? issue.title,
        maxLength: excerptAnchor?.maxLength,
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
    } else if (
      match &&
      clauseText &&
      preferredExcerpt &&
      isMissingEvidenceMarker(currentExcerpt)
    ) {
      nextExcerpt = preferredExcerpt;
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
    if (shouldPreserveMissingEvidence && !nextExcerpt) {
      nextExcerpt = "Not present in contract";
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

    const resolvedHeading = shouldPreserveMissingEvidence
      ? existingReference?.heading ?? null
      : match?.title ?? existingReference?.heading ?? null;
    const cleanedExistingLocation = cleanLocationHint(
      existingReference?.locationHint,
    );
    const cleanedMatchLocation = cleanLocationHint(match?.location);
    const fallbackLocation = match
      ? cleanLocationHint({
          page: match?.location?.page ?? null,
          paragraph: match?.location?.paragraph ?? null,
          section: match?.location?.section ?? match?.title ?? null,
          clauseNumber: match?.location?.clauseNumber ?? matchedClauseId ?? null,
        })
      : null;
    const resolvedLocation = shouldPreserveMissingEvidence
      ? cleanedExistingLocation ?? cleanedMatchLocation ?? fallbackLocation
      : match && isMissingLocationHint(existingReference?.locationHint)
      ? cleanedMatchLocation ?? fallbackLocation
      : cleanedExistingLocation ?? cleanedMatchLocation ?? fallbackLocation;
    const updatedIssue = {
      ...issue,
      clauseReference: {
        clauseId: stableClauseId,
        heading: resolvedHeading,
        excerpt: nextExcerpt,
        locationHint: resolvedLocation,
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
    // Get clause key for excerpt tracking
    const matchClauseKey = match
      ? normalizeForMatch(getClauseKey(match))
      : "";
    const existingExcerpts = matchClauseKey
      ? usedExcerptsByClause.get(matchClauseKey) ?? new Set<string>()
      : new Set<string>();

    const fallbackExcerpt = match
      ? buildUniqueEvidenceExcerpt({
        clauseText:
          match.originalText ??
            match.normalizedText ??
            match.title ??
            "",
        criterionId: criterion.id,
        anchorText: criterion.evidence ?? criterion.title,
        excludeExcerpts: existingExcerpts,
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

    // Track this excerpt to ensure uniqueness for subsequent criteria
    if (matchClauseKey && nextEvidence && !isMissingEvidenceMarker(nextEvidence)) {
      existingExcerpts.add(nextEvidence);
      usedExcerptsByClause.set(matchClauseKey, existingExcerpts);
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
    criticalCriteriaIds,
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

  const issuesWithDefinitionFix = rewriteDefinitionExclusionIssues(
    issuesFiltered,
    clauseCandidates,
  );
  const issuesWithRationaleFix = rewriteCompelledDisclosureRationale(
    issuesWithDefinitionFix,
    clauseCandidates,
  );
  const issuesWithNormalizedLocations = issuesWithRationaleFix.map((issue) => {
    if (!issue.clauseReference) return issue;
    const clauseId = normalizeForMatch(issue.clauseReference.clauseId ?? "");
    const matchedClause = clauseId
      ? clauseCandidates.find((clause) =>
          normalizeForMatch(getClauseKey(clause)) === clauseId
        )
      : null;
    const resolvedLocation =
      cleanLocationHint(matchedClause?.location) ??
      cleanLocationHint(issue.clauseReference.locationHint) ??
      null;
    return {
      ...issue,
      clauseReference: {
        ...issue.clauseReference,
        locationHint: resolvedLocation,
      },
    };
  });
  const { playbookInsights: updatedPlaybookInsights, deviationInsights: updatedDeviationInsights } =
    rewriteDefinitionInsights(
      issuesWithNormalizedLocations,
      report.playbookInsights ?? [],
      report.deviationInsights ?? [],
      clauseCandidates,
    );

  const criteriaAlignedWithIssues = alignCriteriaWithIssues(
    criteriaWithEvidence,
    issuesWithNormalizedLocations,
  );
  const metOnlyCriteria = criteriaAlignedWithIssues.filter(
    (criterion) =>
      Boolean(criterion.met) && !optionalCriteriaIds.has(criterion.id),
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

  // Validate and fix contract summary (e.g., contractPeriod, agreementDirection)
  const validatedSummary = validateAndFixContractSummary(
    report.contractSummary,
    clauseCandidates,
    content,
  );

  return {
    ...report,
    contractSummary: validatedSummary,
    clauseExtractions: clauseCandidates,
    issuesToAddress: issuesWithNormalizedLocations,
    criteriaMet: metOnlyCriteria,
    playbookInsights: updatedPlaybookInsights,
    deviationInsights: updatedDeviationInsights,
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
  const issueCategory = normalizeTitleKey(issue.category ?? "");
  const issueRecommendation = normalizeTitleKey(issue.recommendation ?? "");
  const issueRationale = normalizeTitleKey(issue.rationale ?? "");
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
  if (issueCategory && issueCategory === criterionTitle) {
    score = Math.max(score, 82 + criterionTitle.length);
  } else if (
    issueCategory &&
    criterionTitle &&
    issueCategory.includes(criterionTitle)
  ) {
    score = Math.max(score, 58 + criterionTitle.length);
  }
  if (
    issueRecommendation &&
    criterionTitle &&
    issueRecommendation.includes(criterionTitle)
  ) {
    score = Math.max(score, 52 + criterionTitle.length);
  }
  if (issueRationale && criterionTitle && issueRationale.includes(criterionTitle)) {
    score = Math.max(score, 50 + criterionTitle.length);
  }
  const similarity = similarityForText(
    `${issueTitle} ${issueCategory} ${issueRecommendation}`,
    criterionTitle,
  );
  if (similarity >= 0.45) {
    score = Math.max(score, 55 + Math.round(similarity * 20));
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
  criticalCriteriaIds: Set<string>,
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
    const isCriticalCriterion = criticalCriteriaIds.has(criterion.id);
    const shouldAttemptMatch =
      Boolean(fallbackText) &&
      (!isMissingEvidenceMarker(criterionEvidence) || isCriticalCriterion);
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

function buildIssueSignalText(
  issue: AnalysisReport["issuesToAddress"][number],
): string {
  return [
    issue.title,
    issue.category,
    issue.id,
    ...(issue.tags ?? []),
    issue.recommendation,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeIssueSignals(
  issue: AnalysisReport["issuesToAddress"][number],
): string {
  return normalizeForMatch(buildIssueSignalText(issue));
}

function issueHasTokens(
  issue: AnalysisReport["issuesToAddress"][number],
  tokens: string[],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  return tokens.every((token) => normalized.includes(token));
}

function isRemediesIssue(issue: AnalysisReport["issuesToAddress"][number]): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("remedies") || normalized.includes("remedy")) return true;
  if (normalized.includes("injunctive")) return true;
  if (normalized.includes("specific performance")) return true;
  if (normalized.includes("injunction")) return true;
  return normalized.includes("equitable relief");
}

function clauseSupportsRemedies(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const headingText = buildClauseHeadingText(clause);
  const normalizedHeading = normalizeForMatch(headingText);
  const normalizedText = normalizeForMatch(clauseText);
  const headingSignals =
    normalizedHeading.includes("remedies") ||
    normalizedHeading.includes("remedy");
  const hasInjunctive =
    normalizedText.includes("injunctive") ||
    normalizedText.includes("injunction");
  const hasSpecificPerformance =
    normalizedText.includes("specific performance") ||
    (normalizedText.includes("specific") && normalizedText.includes("performance"));
  const hasEquitableRelief =
    normalizedText.includes("equitable relief") ||
    (normalizedText.includes("equitable") && normalizedText.includes("relief"));
  return headingSignals || hasInjunctive || hasSpecificPerformance || hasEquitableRelief;
}

function isUseLimitationIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("use limitation")) return true;
  if (normalized.includes("need to know") || normalized.includes("need-to-know")) {
    return true;
  }
  return normalized.includes("purpose") && normalized.includes("use");
}

function clauseSupportsUseLimitation(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  const hasReceivingPartyObligation =
    normalized.includes("receiving party shall") ||
    normalized.includes("receiving party must") ||
    normalized.includes("receiving party hereby undertakes") ||
    normalized.includes("receiving party agrees") ||
    normalized.includes("recipient shall");
  if (!hasReceivingPartyObligation) return false;
  return (
    normalized.includes("use") ||
    normalized.includes("purpose") ||
    normalized.includes("need to know") ||
    normalized.includes("disclose") ||
    normalized.includes("divulge")
  );
}

function isDefinitionIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("definition")) return true;
  if (normalized.includes("exclusion") || normalized.includes("exclusions")) return true;
  if (normalized.includes("residual")) return true;
  return normalized.includes("unmarked");
}

function clauseSupportsDefinition(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  if (!normalized.includes("confidential information")) return false;
  if (normalized.includes("shall mean") || normalized.includes("means")) return true;
  if (normalized.includes("definition")) return true;
  if (normalized.includes("shall not include") || normalized.includes("does not include")) {
    return true;
  }
  return normalized.includes("exception") || normalized.includes("exclude");
}

function clauseSupportsStrongDefinition(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  if (!normalized.includes("confidential information")) return false;
  if (normalized.includes("shall mean") || normalized.includes("means")) return true;
  return normalized.includes("definition");
}

function isTermSurvivalIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("term")) return true;
  if (normalized.includes("survival")) return true;
  return normalized.includes("termination");
}

function clauseSupportsTermSurvival(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  return (
    normalized.includes("term") ||
    normalized.includes("termination") ||
    normalized.includes("survival") ||
    normalized.includes("expires") ||
    normalized.includes("duration")
  );
}

function isReturnDestructionIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("return") || normalized.includes("destroy")) return true;
  if (normalized.includes("destruction") || normalized.includes("backup")) return true;
  return normalized.includes("certificate");
}

function clauseSupportsReturnDestruction(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  const hasConfidential = normalized.includes("confidential information");
  const hasReturn = normalized.includes("return");
  const hasDestroy =
    normalized.includes("destroy") || normalized.includes("destruction");
  const hasBackup =
    normalized.includes("backup") || normalized.includes("archive");
  return hasConfidential && (hasReturn || hasDestroy || hasBackup);
}

function isIpIssue(issue: AnalysisReport["issuesToAddress"][number]): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("intellectual property")) return true;
  if (normalized.includes("ip")) return true;
  if (normalized.includes("license") || normalized.includes("licence")) return true;
  return normalized.includes("ownership");
}

function clauseSupportsIp(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  return (
    normalized.includes("intellectual property") ||
    normalized.includes("license") ||
    normalized.includes("licence") ||
    normalized.includes("patent") ||
    normalized.includes("copyright") ||
    normalized.includes("trademark") ||
    normalized.includes("ownership")
  );
}

function isGoverningLawIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("governing law")) return true;
  if (normalized.includes("jurisdiction")) return true;
  if (normalized.includes("dispute resolution")) return true;
  if (normalized.includes("arbitration")) return true;
  return normalized.includes("governing") && normalized.includes("law");
}

function clauseSupportsGoverningLaw(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  if (normalized.includes("governing law")) return true;
  if (normalized.includes("governed by")) return true;
  if (normalized.includes("jurisdiction")) return true;
  if (normalized.includes("court")) return true;
  return normalized.includes("arbitration");
}

function isCompelledDisclosureIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("compelled disclosure")) return true;
  if (normalized.includes("legal process")) return true;
  if (normalized.includes("subpoena")) return true;
  if (normalized.includes("court order")) return true;
  return normalized.includes("compelled") && normalized.includes("disclosure");
}

function hasCompelledDisclosureProximity(normalized: string): boolean {
  if (!normalized) return false;
  const disclosureKey = "disclos";
  const compulsionSignals = [
    "compel",
    "compelled",
    "required by law",
    "required under",
    "legally required",
    "court order",
    "order of a court",
    "subpoena",
    "competent authority",
    "regulator",
    "regulatory",
    "legal process",
    "mandatory",
  ];
  let index = normalized.indexOf(disclosureKey);
  while (index !== -1) {
    const start = Math.max(0, index - 120);
    const end = Math.min(normalized.length, index + 120);
    const window = normalized.slice(start, end);
    if (compulsionSignals.some((signal) => window.includes(signal))) {
      return true;
    }
    index = normalized.indexOf(disclosureKey, index + disclosureKey.length);
  }
  return false;
}

function clauseSupportsCompelledDisclosure(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  return hasCompelledDisclosureProximity(normalized);
}

function isMarkingNoticeIssue(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  if (normalized.includes("marking")) return true;
  if (normalized.includes("reasonable notice")) return true;
  return normalized.includes("unmarked");
}

function clauseSupportsMarkingNotice(
  clause: ClauseExtraction,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  if (!normalized.includes("confidential")) return false;
  if (normalized.includes("mark") || normalized.includes("designate")) return true;
  return normalized.includes("notice") || normalized.includes("reasonable");
}

function getIssueSupportCheck(
  issue: AnalysisReport["issuesToAddress"][number],
):
  | ((clause: ClauseExtraction, clauseText: string) => boolean)
  | null {
  if (isRemediesIssue(issue)) return clauseSupportsRemedies;
  if (isCompelledDisclosureIssue(issue)) return clauseSupportsCompelledDisclosure;
  if (isReturnDestructionIssue(issue)) return clauseSupportsReturnDestruction;
  if (isTermSurvivalIssue(issue)) return clauseSupportsTermSurvival;
  if (isIpIssue(issue)) return clauseSupportsIp;
  if (isGoverningLawIssue(issue)) return clauseSupportsGoverningLaw;
  if (isMarkingNoticeIssue(issue)) return clauseSupportsMarkingNotice;
  if (isUseLimitationIssue(issue)) return clauseSupportsUseLimitation;
  if (isDefinitionIssue(issue)) return clauseSupportsDefinition;
  return null;
}

function hasPromptNoticeEvidence(value: string): boolean {
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  const hasPrompt = normalized.includes("prompt");
  const hasNotice =
    normalized.includes("notice") ||
    normalized.includes("notify") ||
    normalized.includes("notification");
  return hasPrompt && hasNotice;
}

function mentionsDisclosureLimit(value: string): boolean {
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  if (
    normalized.includes("limit") ||
    normalized.includes("minimiz") ||
    normalized.includes("minimis") ||
    normalized.includes("restrict") ||
    normalized.includes("narrow")
  ) {
    return true;
  }
  return false;
}

function issueMentionsExclusions(
  issue: AnalysisReport["issuesToAddress"][number],
): boolean {
  const normalized = normalizeIssueSignals(issue);
  if (!normalized) return false;
  return (
    normalized.includes("exclusion") ||
    normalized.includes("public domain") ||
    normalized.includes("prior knowledge")
  );
}

function clauseHasExclusionSignals(normalized: string): boolean {
  if (!normalized) return false;
  return (
    normalized.includes("exclusion") ||
    normalized.includes("exclude") ||
    normalized.includes("shall not include") ||
    normalized.includes("does not include") ||
    normalized.includes("not include")
  );
}

function clauseHasPriorKnowledge(normalized: string): boolean {
  if (!normalized) return false;
  return (
    normalized.includes("prior") ||
    normalized.includes("previously known") ||
    normalized.includes("already known") ||
    normalized.includes("lawfully known") ||
    normalized.includes("lawfully in possession")
  );
}

function clauseHasPublicDomain(normalized: string): boolean {
  if (!normalized) return false;
  return (
    normalized.includes("public domain") ||
    normalized.includes("publicly available") ||
    normalized.includes("publicly known") ||
    normalized.includes("public")
  );
}

function clauseHasResidualKnowledge(normalized: string): boolean {
  if (!normalized) return false;
  return normalized.includes("residual") || normalized.includes("unaided memory");
}

function clauseHasReasonablePersonStandard(normalized: string): boolean {
  if (!normalized) return false;
  return (
    normalized.includes("reasonable person") ||
    normalized.includes("reasonably")
  );
}

function clauseHasUnmarkedHandling(normalized: string): boolean {
  if (!normalized) return false;
  return (
    normalized.includes("unmarked") ||
    normalized.includes("not marked") ||
    normalized.includes("without marking") ||
    normalized.includes("not designated") ||
    normalized.includes("without designation")
  );
}

function excerptHasDefinitionSignals(excerpt: string): boolean {
  const normalized = normalizeForMatch(excerpt);
  if (!normalized) return false;
  return (
    normalized.includes("confidential information") ||
    normalized.includes("definition") ||
    normalized.includes("exclusion")
  );
}

type DefinitionGapDetail = {
  clause: ClauseExtraction;
  clauseText: string;
  hasExclusionBlock: boolean;
  missingExclusions: boolean;
  missingResidual: boolean;
  missingUnmarked: boolean;
  missingParts: string[];
};

function findDefinitionClause(
  issue: AnalysisReport["issuesToAddress"][number],
  clauses: ClauseExtraction[],
): ClauseExtraction | null {
  const clauseId = normalizeForMatch(issue.clauseReference?.clauseId ?? "");
  if (clauseId) {
    const direct = clauses.find((clause) =>
      normalizeForMatch(getClauseKey(clause)) === clauseId
    );
    if (direct) return direct;
  }
  const issueTokens = tokenizeForMatch(buildIssueSignalText(issue));
  const prefersExclusions = issueMentionsExclusions(issue);
  const primarySupport = prefersExclusions
    ? clauseSupportsDefinition
    : clauseSupportsStrongDefinition;
  const supported = findBestClauseBySupport(issueTokens, clauses, primarySupport);
  if (supported?.clause) return supported.clause;
  if (!prefersExclusions) {
    const fallback = findBestClauseBySupport(
      issueTokens,
      clauses,
      clauseSupportsDefinition,
    );
    return fallback?.clause ?? null;
  }
  return null;
}

function getDefinitionGapDetail(
  issue: AnalysisReport["issuesToAddress"][number],
  clauses: ClauseExtraction[],
): DefinitionGapDetail | null {
  if (!isDefinitionIssue(issue)) return null;
  const clause = findDefinitionClause(issue, clauses);
  if (!clause) return null;
  const clauseText =
    clause.originalText ?? clause.normalizedText ?? clause.title ?? "";
  const normalized = normalizeForMatch(clauseText);
  if (!normalized) return null;

  const hasExclusionBlock = clauseHasExclusionSignals(normalized);
  const hasPrior = clauseHasPriorKnowledge(normalized);
  const hasPublic = clauseHasPublicDomain(normalized);
  const hasRequiredExclusions = hasExclusionBlock && hasPrior && hasPublic;
  const hasResidual = clauseHasResidualKnowledge(normalized);
  const hasReasonable = clauseHasReasonablePersonStandard(normalized);
  const hasUnmarked = clauseHasUnmarkedHandling(normalized);

  const missingExclusions = !hasRequiredExclusions;
  const missingResidual = !hasResidual;
  const missingUnmarked = !(hasReasonable || hasUnmarked);

  const missingParts: string[] = [];
  if (missingExclusions) {
    missingParts.push("exclusions for prior knowledge and public domain");
  }
  if (missingResidual) missingParts.push("residual knowledge stance");
  if (missingUnmarked) {
    missingParts.push("reasonable-person standard for unmarked information");
  }

  return {
    clause,
    clauseText,
    hasExclusionBlock,
    missingExclusions,
    missingResidual,
    missingUnmarked,
    missingParts,
  };
}

function buildDefinitionGapSummary(missingParts: string[]): string {
  if (missingParts.length === 0) return "";
  const verb = missingParts.length > 1 ? "are" : "is";
  return `The definition section is present, but ${missingParts.join("; ")} ${verb} not addressed.`;
}

function getIssueExcerptAnchor(
  issue: AnalysisReport["issuesToAddress"][number],
  clauseText: string,
): { anchorText: string; maxLength?: number } | null {
  const normalized = normalizeForMatch(clauseText);
  if (!normalized) return null;

  if (isReturnDestructionIssue(issue)) {
    if (normalized.includes("return or destruction")) {
      return { anchorText: "Return or Destruction", maxLength: 240 };
    }
    if (normalized.includes("return or destroy")) {
      return { anchorText: "Return or Destroy", maxLength: 240 };
    }
    if (normalized.includes("return") && normalized.includes("destroy")) {
      return { anchorText: "Return", maxLength: 240 };
    }
  }

  if (isCompelledDisclosureIssue(issue)) {
    if (normalized.includes("mandatory disclosure")) {
      return { anchorText: "Mandatory Disclosure", maxLength: 240 };
    }
    if (normalized.includes("required by law")) {
      return { anchorText: "required by law", maxLength: 240 };
    }
    if (normalized.includes("competent authority")) {
      return { anchorText: "competent authority", maxLength: 240 };
    }
  }

  if (isDefinitionIssue(issue)) {
    if (normalized.includes("exclusions")) {
      return { anchorText: "Exclusions", maxLength: 260 };
    }
    if (normalized.includes("definition of confidential information")) {
      return {
        anchorText: "Definition of Confidential Information",
        maxLength: 260,
      };
    }
    if (normalized.includes("confidential information means")) {
      return { anchorText: "Confidential Information means", maxLength: 260 };
    }
  }

  return null;
}

function rewriteDefinitionExclusionIssues(
  issues: AnalysisReport["issuesToAddress"],
  clauses: ClauseExtraction[],
): AnalysisReport["issuesToAddress"] {
  return issues.map((issue) => {
    if (!isDefinitionIssue(issue)) return issue;
    const detail = getDefinitionGapDetail(issue, clauses);
    if (!detail) return issue;
    if (
      !detail.missingExclusions &&
      !detail.missingResidual &&
      !detail.missingUnmarked
    ) {
      return issue;
    }

    const needsRewrite =
      (!detail.missingExclusions && issueMentionsExclusions(issue)) ||
      looksNegativeEvidence(issue.clauseReference?.excerpt ?? "");

    const nextTitle = needsRewrite && !detail.missingExclusions
      ? "Definition of Confidential Information missing residual knowledge and unmarked-info standard"
      : issue.title;
    const nextRecommendation = needsRewrite
      ? `Add or clarify: ${detail.missingParts.join("; ")}.`
      : issue.recommendation;
    const nextRationale = needsRewrite
      ? buildDefinitionGapSummary(detail.missingParts)
      : issue.rationale;

    const clauseIdNormalized = normalizeForMatch(issue.clauseReference?.clauseId ?? "");
    const needsClauseId =
      !clauseIdNormalized ||
      clauseIdNormalized.startsWith("missing") ||
      clauseIdNormalized.startsWith("unbound");
    const existingExcerpt = issue.clauseReference?.excerpt ?? "";
    const excerptNeedsAnchor = existingExcerpt &&
      !excerptHasDefinitionSignals(existingExcerpt);
    const shouldUpdateExcerpt =
      looksNegativeEvidence(existingExcerpt) ||
      isMissingEvidenceMarker(existingExcerpt) ||
      excerptNeedsAnchor;
    const anchorText = detail.hasExclusionBlock
      ? "Exclusions"
      : "Confidential Information means";

    const nextClauseReference = issue.clauseReference
      ? { ...issue.clauseReference }
      : {
          clauseId: "",
          heading: null,
          excerpt: "",
          locationHint: null,
    };

    if (needsClauseId) {
      nextClauseReference.clauseId = detail.clause.clauseId ?? detail.clause.id ?? nextClauseReference.clauseId;
      nextClauseReference.heading = detail.clause.title ?? nextClauseReference.heading;
      nextClauseReference.locationHint = detail.clause.location ?? nextClauseReference.locationHint;
    }
    if (shouldUpdateExcerpt) {
      nextClauseReference.excerpt = buildEvidenceExcerpt({
        clauseText: detail.clauseText,
        anchorText,
      });
    }

    return {
      ...issue,
      title: nextTitle,
      recommendation: nextRecommendation,
      rationale: nextRationale,
      clauseReference: nextClauseReference,
    };
  });
}

function rewriteDefinitionInsights(
  issues: AnalysisReport["issuesToAddress"],
  playbookInsights: AnalysisReport["playbookInsights"],
  deviationInsights: AnalysisReport["deviationInsights"],
  clauses: ClauseExtraction[],
): {
  playbookInsights: AnalysisReport["playbookInsights"];
  deviationInsights: AnalysisReport["deviationInsights"];
} {
  if (!issues.length) {
    return { playbookInsights, deviationInsights };
  }
  const definitionIssue = issues.find((issue) => isDefinitionIssue(issue));
  if (!definitionIssue) {
    return { playbookInsights, deviationInsights };
  }
  const detail = getDefinitionGapDetail(definitionIssue, clauses);
  if (!detail || detail.missingParts.length === 0) {
    return { playbookInsights, deviationInsights };
  }

  const summary = buildDefinitionGapSummary(detail.missingParts);
  const recommendation = `Add or clarify: ${detail.missingParts.join("; ")}.`;
  const definitionId = normalizeIssueKey(definitionIssue.id ?? "");
  const definitionTitleKey = normalizeForMatch(definitionIssue.title ?? "");

  const updatedPlaybook = playbookInsights.map((insight) => {
    const insightId = normalizeIssueKey(insight.id ?? "");
    const insightTitleKey = normalizeForMatch(insight.title ?? "");
    const matchesId = definitionId && insightId === definitionId;
    const matchesTitle =
      insightTitleKey.includes("definition") ||
      insightTitleKey.includes("exclusion");
    if (!matchesId && !matchesTitle) return insight;
    return {
      ...insight,
      title: definitionIssue.title ?? insight.title,
      summary,
      recommendation,
      relatedClauseIds: insight.relatedClauseIds?.length
        ? insight.relatedClauseIds
        : detail.clause.clauseId
        ? [detail.clause.clauseId]
        : insight.relatedClauseIds,
    };
  });

  const updatedDeviations = deviationInsights.map((insight) => {
    const titleKey = normalizeForMatch(insight.title ?? "");
    const expectedKey = normalizeForMatch(insight.expectedStandard ?? "");
    const matchesDefinition =
      titleKey.includes("definition") ||
      titleKey.includes("exclusion") ||
      expectedKey.includes("definition");
    if (!matchesDefinition) return insight;
    return {
      ...insight,
      title: definitionIssue.title ?? insight.title,
      description: summary || insight.description,
      observedLanguage: summary || insight.observedLanguage,
      recommendation,
      clauseId: insight.clauseId ?? detail.clause.clauseId,
    };
  });

  return {
    playbookInsights: updatedPlaybook,
    deviationInsights: updatedDeviations,
  };
}

function rewriteCompelledDisclosureRationale(
  issues: AnalysisReport["issuesToAddress"],
  clauses: ClauseExtraction[],
): AnalysisReport["issuesToAddress"] {
  return issues.map((issue) => {
    if (!isCompelledDisclosureIssue(issue)) return issue;
    if (mentionsDisclosureLimit(issue.rationale ?? "")) return issue;
    const clauseId = issue.clauseReference?.clauseId ?? "";
    const normalizedId = normalizeForMatch(clauseId);
    const clause = normalizedId
      ? clauses.find((entry) =>
          normalizeForMatch(getClauseKey(entry)) === normalizedId
        )
      : undefined;
    const clauseText =
      clause?.originalText ?? clause?.normalizedText ?? clause?.title ?? "";
    const evidenceText = issue.clauseReference?.excerpt ?? "";
    const combinedEvidence = [evidenceText, clauseText]
      .filter(Boolean)
      .join(" ");
    if (!hasPromptNoticeEvidence(combinedEvidence)) return issue;
    if (mentionsDisclosureLimit(combinedEvidence)) return issue;
    return {
      ...issue,
      rationale:
        "Prompt notice is present, but the clause does not require limiting or minimizing compelled disclosure (for example, disclosing only the minimum legally required information).",
    };
  });
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

/**
 * Validates and fixes AI-generated contract summary fields.
 * Corrects common errors like:
 * - Missing contract period when it exists in a Term clause
 * - Misclassified agreement direction (Mutual vs One-way)
 */
export function validateAndFixContractSummary(
  summary: AnalysisReport["contractSummary"],
  clauses: ClauseExtraction[],
  content: string,
): AnalysisReport["contractSummary"] {
  if (!summary) return summary;

  const fixed = { ...summary };

  // Fix contractPeriod if AI missed it
  const periodNotSpecified =
    !fixed.contractPeriod ||
    fixed.contractPeriod === "Not specified" ||
    fixed.contractPeriod === "Not verified";

  if (periodNotSpecified) {
    // Find a term/duration clause
    const termClause = clauses.find((c) => {
      const title = normalizeForMatch(c.title ?? "");
      const category = c.category ?? "";
      return (
        /term|duration|period|effective/i.test(title) ||
        category === "term_and_termination"
      );
    });

    if (termClause) {
      const clauseText = termClause.originalText ?? termClause.normalizedText ?? "";
      // Extract duration patterns like "[three (3)] years", "three (3) years", "2 years", "12 months"
      const patterns = [
        // Handle "[three (3)] years" or "[three (3)] year" with square brackets
        /\[(\w+)\s*\((\d+)\)\]\s*years?/i,
        // Handle "three (3) years" without square brackets
        /(\w+)\s*\((\d+)\)\s*years?/i,
        // Handle plain "3 years" or "3 (three) years"
        /(\d+)\s*(?:\([^)]+\))?\s*years?/i,
        // Handle months: "[twelve (12)] months", "twelve (12) months", "12 months"
        /\[(\w+)\s*\((\d+)\)\]\s*months?/i,
        /(\w+)\s*\((\d+)\)\s*months?/i,
        /(\d+)\s*(?:\([^)]+\))?\s*months?/i,
      ];

      for (const pattern of patterns) {
        const match = clauseText.match(pattern);
        if (match) {
          // Clean up the match - remove square brackets for cleaner output
          const period = match[0].trim().replace(/\[|\]/g, "");
          fixed.contractPeriod = period;
          break;
        }
      }
    }

    // Fallback: search full content if still not found
    if (!fixed.contractPeriod || fixed.contractPeriod === "Not specified" || fixed.contractPeriod === "Not verified") {
      const contentPatterns = [
        /\[(\w+)\s*\((\d+)\)\]\s*years?/i,
        /(\w+)\s*\((\d+)\)\s*years?/i,
        /(\d+)\s*(?:\([^)]+\))?\s*years?/i,
        /\[(\w+)\s*\((\d+)\)\]\s*months?/i,
        /(\w+)\s*\((\d+)\)\s*months?/i,
        /(\d+)\s*(?:\([^)]+\))?\s*months?/i,
      ];
      for (const pattern of contentPatterns) {
        const match = content.match(pattern);
        if (match) {
          const period = match[0].trim().replace(/\[|\]/g, "");
          fixed.contractPeriod = period;
          break;
        }
      }
    }
  }

  // Fix agreementDirection if misclassified
  if (
    fixed.agreementDirection === "Mutual" ||
    fixed.agreementDirection === "mutual"
  ) {
    const contentLower = content.toLowerCase();

    // One-way indicators (Discloser -> Receiver pattern)
    const oneWayIndicators = [
      /disclosing party.*receiving party/i,
      /receiving party shall.*keep.*confidential/i,
      /discloser.*receiver/i,
      /disclosed by.*to the receiving/i,
    ];

    // Mutual indicators (both parties disclose)
    const mutualIndicators = [
      /each party.*disclose/i,
      /mutual.*disclosure/i,
      /both parties.*confidential information/i,
      /either party.*may disclose/i,
      /each party may disclose.*to the other/i,
    ];

    const hasOneWay = oneWayIndicators.some((p) => p.test(content));
    const hasMutual = mutualIndicators.some((p) => p.test(content));

    // Only change if clearly one-way (has one-way indicators without mutual ones)
    if (hasOneWay && !hasMutual) {
      fixed.agreementDirection = "One-way (Discloser to Receiver)";
    }
  }

  return fixed;
}
