export type ClauseLocationLike = {
  page?: number | null;
  paragraph?: number | null;
  section?: string | null;
  clauseNumber?: string | null;
};

export type ClauseExtractionLike = {
  clauseId?: string | null;
  id?: string | null;
  title?: string | null;
  category?: string | null;
  originalText?: string | null;
  normalizedText?: string | null;
  location?: ClauseLocationLike | null;
  metadata?: Record<string, unknown> | null;
};

export type ClauseReferenceLike = {
  clauseId?: string | null;
  heading?: string | null;
  excerpt?: string | null;
  locationHint?: ClauseLocationLike | null;
};

export type IssueLike = {
  id?: string | null;
  title?: string | null;
  recommendation?: string | null;
  rationale?: string | null;
  clauseReference?: ClauseReferenceLike | null;
};

export type ProposedEditLike = {
  id?: string | null;
  clauseId?: string | null;
  anchorText?: string | null;
  intent?: string | null;
  proposedText?: string | null;
};

export type PlaybookLike = {
  clauseAnchors?: string[];
  criticalClauses?: Array<{
    title: string;
    mustInclude: string[];
  }>;
};

export type ClauseMatchMethod = "id" | "heading" | "text" | "ngram" | "none";

export type ClauseMatchCandidate = {
  clauseId: string;
  title?: string | null;
  score: number;
  method: ClauseMatchMethod;
};

export type ClauseMatchResult = {
  match: ClauseExtractionLike | null;
  confidence: number;
  method: ClauseMatchMethod;
  candidates: ClauseMatchCandidate[];
};

export type EvidenceMatchResult = {
  matched: boolean;
  reason:
    | "empty-content"
    | "missing-marker"
    | "empty-excerpt"
    | "exact"
    | "prefix"
    | "ngram"
    | "no-match";
  ratio?: number;
};

export type PlaybookCoverageSummary = {
  coverageScore: number;
  criticalClauses: Array<{
    title: string;
    met: boolean;
    evidence?: string;
    missingMustInclude: string[];
  }>;
  anchorCoverage: Array<{
    anchor: string;
    met: boolean;
    evidence?: string;
  }>;
};

const STOP_TOKENS = new Set([
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "a",
  "an",
  "by",
  "with",
  "on",
  "at",
  "as",
  "is",
  "are",
  "be",
  "this",
  "that",
  "from",
  "any",
  "all",
  "each",
  "per",
  "shall",
  "may",
  "must",
  "will",
  "not",
]);

const SHORT_TOKENS = new Set([
  "ip",
  "law",
  "term",
  "use",
  "nda",
  "dpa",
  "gdpr",
  "ci",
]);

const MISSING_EVIDENCE_MARKERS = [
  "not present",
  "missing",
  "not found",
  "evidence not found",
];

const DEFAULT_EXCERPT_LENGTH = 320;
const MIN_MATCH_SCORE = 0.18;
const MIN_HEADING_SCORE = 0.3;

export function normalizeForMatch(value: string): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u00a7/g, " section ")
    .replace(/[\u2018\u2019\u201a\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f\u2033]/g, "\"")
    .replace(/\u00a0/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tokenizeForMatch(value: string): string[] {
  const normalized = normalizeForMatch(value);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => {
      if (STOP_TOKENS.has(token)) return false;
      if (token.length >= 2) return true;
      if (/^\d+$/.test(token)) return true;
      return SHORT_TOKENS.has(token);
    });
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function buildNgrams(value: string, n = 4): Set<string> {
  const normalized = normalizeForMatch(value).replace(/\s+/g, "");
  if (!normalized) return new Set();
  if (normalized.length <= n) return new Set([normalized]);
  const grams = new Set<string>();
  for (let i = 0; i <= normalized.length - n; i += 1) {
    grams.add(normalized.slice(i, i + n));
  }
  return grams;
}

function ngramSimilarity(a: string, b: string, n = 4): number {
  const aGrams = buildNgrams(a, n);
  const bGrams = buildNgrams(b, n);
  if (!aGrams.size || !bGrams.size) return 0;
  let intersection = 0;
  aGrams.forEach((gram) => {
    if (bGrams.has(gram)) intersection += 1;
  });
  const union = aGrams.size + bGrams.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreTextSimilarity(query: string, candidate: string): {
  score: number;
  method: ClauseMatchMethod;
} {
  if (!query || !candidate) {
    return { score: 0, method: "none" };
  }
  const tokensQuery = tokenizeForMatch(query);
  const tokensCandidate = tokenizeForMatch(candidate);
  const tokenScore = jaccardSimilarity(tokensQuery, tokensCandidate);
  const ngramScore = ngramSimilarity(query, candidate);
  if (tokenScore >= ngramScore) {
    return { score: tokenScore, method: "text" };
  }
  return { score: ngramScore, method: "ngram" };
}

function getClauseIdentifier(clause: ClauseExtractionLike): string | null {
  const candidate =
    typeof clause.clauseId === "string"
      ? clause.clauseId
      : typeof clause.id === "string"
        ? clause.id
        : null;
  return candidate && candidate.trim().length > 0 ? candidate : null;
}

function rankClauseCandidates(
  query: string,
  clauses: ClauseExtractionLike[],
  mode: "heading" | "text",
): ClauseMatchCandidate[] {
  const results: ClauseMatchCandidate[] = [];
  for (const clause of clauses) {
    const clauseId = getClauseIdentifier(clause) ?? "";
    if (!clauseId) continue;
    const clauseText =
      mode === "heading"
        ? clause.title ?? ""
        : `${clause.title ?? ""} ${clause.originalText ?? ""} ${
          clause.normalizedText ?? ""
        }`;
    const { score, method } = scoreTextSimilarity(query, clauseText);
    results.push({
      clauseId,
      title: clause.title ?? null,
      score,
      method: mode === "heading" ? "heading" : method,
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

function mergeCandidates(
  candidates: ClauseMatchCandidate[],
): ClauseMatchCandidate[] {
  const deduped = new Map<string, ClauseMatchCandidate>();
  for (const candidate of candidates) {
    const existing = deduped.get(candidate.clauseId);
    if (!existing || candidate.score > existing.score) {
      deduped.set(candidate.clauseId, candidate);
    }
  }
  return Array.from(deduped.values()).sort((a, b) => b.score - a.score);
}

function resolveClauseById(
  clauseId: string,
  clauses: ClauseExtractionLike[],
): ClauseExtractionLike | null {
  const normalized = clauseId.toLowerCase().trim();
  if (!normalized) return null;
  return (
    clauses.find((clause) =>
      (getClauseIdentifier(clause) ?? "").toLowerCase().trim() === normalized
    ) ?? null
  );
}

export function matchClauseToText(
  text: string,
  clauses: ClauseExtractionLike[],
): ClauseMatchResult {
  return resolveClauseMatch({ clauseReference: null, fallbackText: text, clauses });
}

export function resolveClauseMatch(options: {
  clauseReference?: ClauseReferenceLike | null;
  fallbackText?: string | null;
  clauses: ClauseExtractionLike[];
}): ClauseMatchResult {
  const { clauseReference, fallbackText, clauses } = options;
  if (!clauses.length) {
    return { match: null, confidence: 0, method: "none", candidates: [] };
  }

  const clauseId = clauseReference?.clauseId?.toString() ?? "";
  if (clauseId.trim().length > 0) {
    const direct = resolveClauseById(clauseId, clauses);
    if (direct) {
      const clauseIdentifier = getClauseIdentifier(direct) ?? clauseId.trim();
      return {
        match: direct,
        confidence: 1,
        method: "id",
        candidates: [
          {
            clauseId: clauseIdentifier,
            title: direct.title ?? null,
            score: 1,
            method: "id",
          },
        ],
      };
    }
  }

  const headingQuery =
    typeof clauseReference?.heading === "string"
      ? clauseReference?.heading
      : null;
  const excerptQuery =
    typeof clauseReference?.excerpt === "string"
      ? clauseReference?.excerpt
      : null;
  const fallbackQuery =
    typeof fallbackText === "string" ? fallbackText : null;
  const textQuery = [excerptQuery, fallbackQuery]
    .filter((value) => value && value.trim().length > 0)
    .join(" ");

  const headingCandidates = headingQuery
    ? rankClauseCandidates(headingQuery, clauses, "heading")
    : [];
  const textCandidates = textQuery
    ? rankClauseCandidates(textQuery, clauses, "text")
    : [];
  const candidates = mergeCandidates([
    ...headingCandidates,
    ...textCandidates,
  ]);
  const bestCandidate = candidates[0];
  if (!bestCandidate) {
    return { match: null, confidence: 0, method: "none", candidates: [] };
  }

  const bestClause =
    clauses.find((clause) =>
      getClauseIdentifier(clause) === bestCandidate.clauseId
    ) ?? null;
  const bestScore = bestCandidate.score;
  const bestMethod = bestCandidate.method;

  const headingScore = headingCandidates[0]?.score ?? 0;

  const minScore = bestMethod === "heading" ? MIN_HEADING_SCORE : MIN_MATCH_SCORE;
  if (bestScore < minScore && headingScore < MIN_HEADING_SCORE) {
    return {
      match: null,
      confidence: bestScore,
      method: "none",
      candidates: candidates.slice(0, 3),
    };
  }

  return {
    match: bestClause,
    confidence: bestScore,
    method: bestMethod,
    candidates: candidates.slice(0, 3),
  };
}

export function isMissingEvidenceMarker(value?: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return MISSING_EVIDENCE_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

export function buildEvidenceExcerpt(options: {
  clauseText: string;
  anchorText?: string | null;
  maxLength?: number;
}): string {
  const maxLength = options.maxLength ?? DEFAULT_EXCERPT_LENGTH;
  const clauseText = (options.clauseText ?? "").replace(/\s+/g, " ").trim();
  if (!clauseText) return "";
  if (clauseText.length <= maxLength) return clauseText;

  const anchorText =
    typeof options.anchorText === "string" ? options.anchorText.trim() : "";
  if (anchorText) {
    const clauseLower = clauseText.toLowerCase();
    const anchorLower = anchorText.toLowerCase();
    const anchorSeed = anchorLower.slice(0, Math.min(anchorLower.length, 64));
    const index = clauseLower.indexOf(anchorSeed);
    if (index >= 0) {
      const start = Math.max(0, index - Math.floor(maxLength * 0.4));
      const end = Math.min(clauseText.length, start + maxLength);
      return clauseText.slice(start, end);
    }
  }

  return clauseText.slice(0, maxLength);
}

export function checkEvidenceMatch(
  excerpt: string,
  content: string,
): EvidenceMatchResult {
  const normalizedContent = normalizeForMatch(content ?? "");
  if (!normalizedContent) {
    return { matched: true, reason: "empty-content" };
  }
  if (!excerpt || excerpt.trim().length === 0) {
    return { matched: false, reason: "empty-excerpt" };
  }
  if (isMissingEvidenceMarker(excerpt)) {
    return { matched: true, reason: "missing-marker" };
  }
  const normalizedExcerpt = normalizeForMatch(excerpt);
  if (!normalizedExcerpt) {
    return { matched: false, reason: "empty-excerpt" };
  }
  if (normalizedContent.includes(normalizedExcerpt)) {
    return { matched: true, reason: "exact" };
  }
  const prefix = normalizedExcerpt.slice(0, 220);
  if (prefix.length > 40 && normalizedContent.includes(prefix)) {
    return { matched: true, reason: "prefix" };
  }
  const excerptGrams = buildNgrams(normalizedExcerpt, 4);
  if (!excerptGrams.size) {
    return { matched: false, reason: "no-match" };
  }
  let hits = 0;
  excerptGrams.forEach((gram) => {
    if (normalizedContent.includes(gram)) {
      hits += 1;
    }
  });
  const ratio = hits / excerptGrams.size;
  if (ratio >= 0.45) {
    return { matched: true, reason: "ngram", ratio };
  }
  return { matched: false, reason: "no-match", ratio };
}

function scoreAnchorToIssue(anchor: string, issue: IssueLike): number {
  const candidate = [
    issue.clauseReference?.excerpt,
    issue.clauseReference?.heading,
    issue.title,
  ]
    .filter(Boolean)
    .join(" ");
  return scoreTextSimilarity(anchor, candidate).score;
}

export function bindProposedEditsToClauses(options: {
  proposedEdits: ProposedEditLike[];
  issues: IssueLike[];
  clauses: ClauseExtractionLike[];
}): ProposedEditLike[] {
  const { proposedEdits, issues, clauses } = options;
  if (!proposedEdits.length) return proposedEdits;

  const clauseIds = new Set(
    clauses.map((clause) => getClauseIdentifier(clause)).filter(Boolean) as string[],
  );

  const issueClauseMap = new Map<IssueLike, string>();
  issues.forEach((issue) => {
    const clauseId = issue.clauseReference?.clauseId ?? "";
    if (clauseId && clauseIds.has(clauseId)) {
      issueClauseMap.set(issue, clauseId);
      return;
    }
    const fallbackText = `${issue.title ?? ""} ${issue.recommendation ?? ""}`.trim();
    const match = resolveClauseMatch({
      clauseReference: issue.clauseReference ?? null,
      fallbackText,
      clauses,
    });
    const matchedId = match.match ? getClauseIdentifier(match.match) : null;
    if (matchedId) {
      issueClauseMap.set(issue, matchedId);
    }
  });

  return proposedEdits.map((edit, index) => {
    if (!edit || typeof edit !== "object") return edit;
    const currentId =
      typeof edit.clauseId === "string" ? edit.clauseId.trim() : "";
    if (currentId && clauseIds.has(currentId)) {
      return edit;
    }
    const anchorText =
      typeof edit.anchorText === "string" ? edit.anchorText.trim() : "";
    if (anchorText) {
      let bestIssue: IssueLike | null = null;
      let bestScore = 0;
      issues.forEach((issue) => {
        const score = scoreAnchorToIssue(anchorText, issue);
        if (score > bestScore) {
          bestScore = score;
          bestIssue = issue;
        }
      });
      if (bestIssue && bestScore >= MIN_MATCH_SCORE) {
        const boundId = issueClauseMap.get(bestIssue);
        if (boundId) {
          return { ...edit, clauseId: boundId };
        }
      }

      const clauseMatch = resolveClauseMatch({
        clauseReference: null,
        fallbackText: anchorText,
        clauses,
      });
      const matchedId = clauseMatch.match
        ? getClauseIdentifier(clauseMatch.match)
        : null;
      if (matchedId) {
        return { ...edit, clauseId: matchedId };
      }
    }

    const fallbackId = currentId || `proposed-edit-${index + 1}`;
    return { ...edit, clauseId: fallbackId };
  });
}

function findRequirementMatch(
  requirement: string,
  clauses: ClauseExtractionLike[],
  content: string,
): { met: boolean; evidence?: string; score: number } {
  if (!requirement || !requirement.trim()) {
    return { met: false, score: 0 };
  }
  let bestScore = 0;
  let bestEvidence: string | undefined;

  for (const clause of clauses) {
    const clauseText = `${clause.title ?? ""} ${clause.originalText ?? ""} ${
      clause.normalizedText ?? ""
    }`;
    const { score } = scoreTextSimilarity(requirement, clauseText);
    if (score > bestScore) {
      bestScore = score;
      bestEvidence = clause.title ?? getClauseIdentifier(clause) ?? undefined;
    }
  }

  if (bestScore >= MIN_MATCH_SCORE) {
    return { met: true, evidence: bestEvidence, score: bestScore };
  }

  const normalizedRequirement = normalizeForMatch(requirement);
  const normalizedContent = normalizeForMatch(content ?? "");
  if (
    normalizedRequirement &&
    normalizedContent &&
    normalizedContent.includes(normalizedRequirement)
  ) {
    return { met: true, evidence: "Contract text", score: MIN_MATCH_SCORE };
  }

  return { met: false, score: bestScore };
}

export function evaluatePlaybookCoverageFromContent(
  playbook: PlaybookLike,
  options: {
    content?: string | null;
    clauses?: ClauseExtractionLike[] | null;
  },
): PlaybookCoverageSummary {
  const clauses = options.clauses ?? [];
  const content = options.content ?? "";

  const criticalClauses = (playbook.criticalClauses ?? []).map((clause) => {
    const titleMatch = findRequirementMatch(clause.title, clauses, content);
    const missingMustInclude =
      clause.mustInclude?.filter((item) => {
        const itemMatch = findRequirementMatch(item, clauses, content);
        return !itemMatch.met;
      }) ?? [];
    const met = titleMatch.met && missingMustInclude.length === 0;
    return {
      title: clause.title,
      met,
      evidence: titleMatch.evidence,
      missingMustInclude,
    };
  });

  const anchorCoverage = (playbook.clauseAnchors ?? []).map((anchor) => {
    const anchorMatch = findRequirementMatch(anchor, clauses, content);
    return {
      anchor,
      met: anchorMatch.met,
      evidence: anchorMatch.evidence,
    };
  });

  const totalChecks =
    criticalClauses.length + anchorCoverage.length || 1;
  const metChecks =
    criticalClauses.filter((clause) => clause.met).length +
    anchorCoverage.filter((anchor) => anchor.met).length;

  return {
    coverageScore: Number(Math.max(0, metChecks / totalChecks).toFixed(2)),
    criticalClauses,
    anchorCoverage,
  };
}

export function buildRetrievedClauseContext(options: {
  playbook: PlaybookLike;
  clauses: ClauseExtractionLike[];
  maxPerAnchor?: number;
  maxTotal?: number;
  excerptLength?: number;
}): { summary: string; snippets: Array<{ clauseId: string; title: string; anchor: string; excerpt: string }> } {
  const { playbook, clauses } = options;
  if (!clauses.length) {
    return { summary: "", snippets: [] };
  }

  const maxPerAnchor = options.maxPerAnchor ?? 1;
  const maxTotal = options.maxTotal ?? 12;
  const excerptLength = options.excerptLength ?? DEFAULT_EXCERPT_LENGTH;

  const anchors = [
    ...(playbook.clauseAnchors ?? []),
    ...(playbook.criticalClauses ?? []).map((clause) => clause.title),
    ...(playbook.criticalClauses ?? []).flatMap((clause) => clause.mustInclude ?? []),
  ].filter((value) => typeof value === "string" && value.trim().length > 0);

  const snippets: Array<{ clauseId: string; title: string; anchor: string; excerpt: string }> = [];
  const seen = new Set<string>();

  for (const anchor of anchors) {
    const candidates = rankClauseCandidates(anchor, clauses, "text")
      .slice(0, maxPerAnchor)
      .filter((candidate) => candidate.score >= MIN_MATCH_SCORE);

    for (const candidate of candidates) {
      if (snippets.length >= maxTotal) break;
      if (seen.has(candidate.clauseId)) continue;
      const clause = clauses.find((entry) =>
        getClauseIdentifier(entry) === candidate.clauseId
      );
      if (!clause) continue;
      const excerpt = buildEvidenceExcerpt({
        clauseText:
          clause.originalText ??
          clause.normalizedText ??
          clause.title ??
          "",
        anchorText: anchor,
        maxLength: excerptLength,
      });
      snippets.push({
        clauseId: candidate.clauseId,
        title: clause.title ?? candidate.clauseId,
        anchor,
        excerpt,
      });
      seen.add(candidate.clauseId);
    }
    if (snippets.length >= maxTotal) break;
  }

  const summary = snippets
    .map((snippet, index) => {
      return `${index + 1}. (${snippet.anchor}) [${snippet.clauseId}] ${snippet.title} -> ${snippet.excerpt}`;
    })
    .join("\n");

  return { summary, snippets };
}
