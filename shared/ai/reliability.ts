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
  severity?: string | null;
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

export const STRUCTURAL_TOKENS = new Set([
  "term",
  "termination",
  "survival",
  "remedies",
  "remedy",
  "injunctive",
  "injunction",
  "relief",
  "specific",
  "performance",
  "return",
  "destruction",
  "destroy",
  "backup",
  "backups",
  "archive",
  "archives",
  "certificate",
  "certify",
  "compelled",
  "disclosure",
  "disclosures",
  "permit",
  "permitted",
  "allow",
  "allowed",
  "approval",
  "approved",
  "release",
  "license",
  "ownership",
  "ip",
  "purpose",
  "use",
  "need",
  "know",
  "knowledge",
  "prior",
  "public",
  "domain",
  "exclusion",
  "exclude",
  "excluded",
  "exception",
  "exceptions",
  "residual",
  "unmarked",
  "governing",
  "law",
  "jurisdiction",
  "arbitration",
  "export",
  "sanctions",
  "liability",
  "cap",
  "limitation",
  "notice",
  "notify",
  "protective",
  "order",
  "solicit",
  "compete",
  "noncompete",
  // Added for compelled disclosure matching
  "cooperation",
  "cooperate",
  "limit",
  "scope",
  "minimize",
]);

const HEADING_PRIORITY_TOKENS = new Set([
  "definition",
  "remedies",
  "remedy",
  "governing",
  "jurisdiction",
  "termination",
  "survival",
  "miscellaneous",
]);

const STRUCTURAL_SYNONYMS: Record<string, string[]> = {
  governing: ["governed", "govern", "governs"],
  governed: ["governing", "govern", "governs"],
  compelled: [
    "compel",
    "required",
    "require",
    "court",
    "subpoena",
    "regulator",
    "regulatory",
    "order",
    "authority",
    "demand",
  ],
  disclosure: ["disclose", "disclosed", "disclosing", "disclosures"],
  return: ["return", "returned", "returning"],
  destruction: ["destroy", "destroyed", "destroying", "destruction"],
  backup: [
    "backups",
    "archive",
    "archives",
    "storage",
    "medium",
    "media",
    "cloud",
    "computer",
    "copies",
    "copy",
  ],
  backups: [
    "backup",
    "archive",
    "archives",
    "storage",
    "medium",
    "media",
    "cloud",
    "computer",
    "copies",
    "copy",
  ],
  archive: ["archives", "backup", "backups", "storage", "media"],
  certificate: ["certify", "certification", "certificate"],
  certify: ["certify", "certification", "certificate"],
  residual: ["memory", "retained", "unaided"],
  unmarked: ["marked", "marking", "designated", "declared", "label", "identified"],
  license: ["licence", "licensed", "licensing"],
  ip: ["intellectual", "intellectual-property"],
  ownership: ["owner", "owned", "ownership", "transfer"],
  term: ["duration", "period", "expiry", "expiration", "expires", "expire"],
  termination: ["terminate", "terminated", "terminates", "terminating"],
  survival: ["survive", "survival"],
  solicit: ["solicit", "solicitation"],
  compete: ["compete", "competition", "competitive", "noncompete"],
  notice: ["notify", "notification", "prompt", "promptly"],
  notify: ["notice", "notification", "prompt", "promptly"],
  // Enhanced for compelled disclosure: "protective order" covers limiting/minimizing scope
  protective: ["protect", "protection", "protective", "limit", "minimize", "scope"],
  order: ["order", "orders"],
  // Add cooperation synonyms for compelled disclosure requirements
  cooperation: ["cooperate", "cooperating", "cooperation", "assist", "work with"],
  cooperate: ["cooperate", "cooperating", "cooperation", "assist", "limit scope"],
  limit: ["limit", "limiting", "minimize", "restrict", "scope"],
  injunctive: ["injunction", "injunctive"],
  injunction: ["injunctive", "injunction"],
  remedies: ["remedy", "remedies"],
  remedy: ["remedy", "remedies"],
  permit: ["permit", "permitted", "allow", "allowed", "authorize", "authorise"],
  permitted: [
    "permit",
    "permitted",
    "allow",
    "allowed",
    "authorized",
    "authorised",
    "approved",
    "approval",
    "release",
    "lawful",
    "lawfully",
  ],
  allow: ["allow", "allowed", "permit", "permitted", "authorized", "authorised"],
  allowed: ["allow", "allowed", "permit", "permitted", "authorized", "authorised"],
  approval: ["approval", "approved", "authorize", "authorise"],
  approved: ["approval", "approved", "authorize", "authorise", "release"],
  release: ["release", "released", "approval", "approved"],
  exclusion: ["exclusion", "exclude", "excluded", "exception", "exceptions"],
  exclude: ["exclude", "excluded", "exclusion", "exception", "exceptions"],
  excluded: ["exclude", "excluded", "exclusion", "exception", "exceptions"],
  exception: ["exception", "exceptions", "exclude", "excluded", "exclusion"],
  exceptions: ["exception", "exceptions", "exclude", "excluded", "exclusion"],
  prior: ["prior", "previous", "preexisting", "pre-existing"],
  public: ["public", "publicly"],
  knowledge: ["knowledge", "known"],
};

export function tokenVariants(token: string): string[] {
  const direct = STRUCTURAL_SYNONYMS[token];
  if (direct && direct.length > 0) {
    return [token, ...direct];
  }
  const fallbackKey = Object.keys(STRUCTURAL_SYNONYMS).find((key) =>
    STRUCTURAL_SYNONYMS[key]?.includes(token),
  );
  if (fallbackKey) {
    const fallbackVariants = STRUCTURAL_SYNONYMS[fallbackKey] ?? [];
    return Array.from(new Set([token, fallbackKey, ...fallbackVariants]));
  }
  return [token];
}

export function isStructuralToken(token: string): boolean {
  if (STRUCTURAL_TOKENS.has(token)) return true;
  return Object.keys(STRUCTURAL_SYNONYMS).some((key) =>
    tokenVariants(key).includes(token),
  );
}

function requiredStructuralHits(structuralTokens: string[]): number {
  if (structuralTokens.length <= 1) return 1;
  return 2;
}

function requiresLegalTrigger(requirement: string): boolean {
  const normalized = normalizeForMatch(requirement);
  return normalized.includes("compelled disclosure");
}

function hasLegalTrigger(clauseText: string): boolean {
  const normalized = normalizeForMatch(clauseText);
  if (!normalized) return false;
  return (
    normalized.includes("law") ||
    normalized.includes("court") ||
    normalized.includes("subpoena") ||
    normalized.includes("regulator") ||
    normalized.includes("regulatory") ||
    normalized.includes("authority") ||
    normalized.includes("government")
  );
}

function isTerminationRightsRequirement(requirement: string): boolean {
  const normalized = normalizeForMatch(requirement);
  return normalized.includes("termination rights");
}

function hasTerminationRightsSignal(clauseText: string): boolean {
  const normalized = normalizeForMatch(clauseText);
  if (!normalized) return false;
  return (
    normalized.includes("may terminate") ||
    normalized.includes("right to terminate") ||
    normalized.includes("terminate upon") ||
    normalized.includes("terminate on") ||
    normalized.includes("either party may terminate") ||
    normalized.includes("termination for cause") ||
    normalized.includes("termination for convenience")
  );
}

function hasTerminationRightsBlocker(clauseText: string): boolean {
  const normalized = normalizeForMatch(clauseText);
  if (!normalized) return false;
  return (
    normalized.includes("cannot be terminated") ||
    normalized.includes("may not be terminated") ||
    normalized.includes("cannot terminate") ||
    normalized.includes("may not terminate") ||
    normalized.includes("not be terminated unilaterally") ||
    normalized.includes("no termination")
  );
}

function passesRequirementGuards(
  requirement: string,
  clauseText: string,
): boolean {
  if (requiresLegalTrigger(requirement) && !hasLegalTrigger(clauseText)) {
    return false;
  }
  if (
    isTerminationRightsRequirement(requirement) &&
    hasTerminationRightsBlocker(clauseText) &&
    !hasTerminationRightsSignal(clauseText)
  ) {
    return false;
  }
  return true;
}

function countStructuralMatches(
  structuralTokens: string[],
  clauseTokens: string[],
): number {
  if (!structuralTokens.length || !clauseTokens.length) return 0;
  const clauseSet = new Set(clauseTokens);
  let hits = 0;
  structuralTokens.forEach((token) => {
    if (tokenVariants(token).some((variant) => clauseSet.has(variant))) {
      hits += 1;
    }
  });
  return hits;
}

export function hasStructuralMatch(
  structuralTokens: string[],
  clauseTokens: string[],
): boolean {
  if (!structuralTokens.length) return true;
  if (!clauseTokens.length) return false;
  const hits = countStructuralMatches(structuralTokens, clauseTokens);
  return hits >= requiredStructuralHits(structuralTokens);
}

function tokenMatchesClause(
  token: string,
  clauseTokenSet: Set<string>,
): boolean {
  if (isStructuralToken(token)) {
    return tokenVariants(token).some((variant) => clauseTokenSet.has(variant));
  }
  return clauseTokenSet.has(token);
}

function countTokenMatches(
  requirementTokens: string[],
  clauseTokens: string[],
): number {
  if (!requirementTokens.length || !clauseTokens.length) return 0;
  const clauseSet = new Set(clauseTokens);
  let hits = 0;
  requirementTokens.forEach((token) => {
    if (tokenMatchesClause(token, clauseSet)) hits += 1;
  });
  return hits;
}

function coverageWithSynonyms(
  requirementTokens: string[],
  clauseTokens: string[],
): number {
  if (!requirementTokens.length) return 0;
  const hits = countTokenMatches(requirementTokens, clauseTokens);
  return hits / requirementTokens.length;
}

const MISSING_EVIDENCE_MARKERS = [
  "evidence not found",
  "no evidence found",
  "not found in contract",
  "not present in contract",
];

const DEFAULT_EXCERPT_LENGTH = 320;
const MIN_MATCH_SCORE = 0.18;
const MIN_HEADING_SCORE = 0.3;
const STRONG_HEADING_SCORE = 0.7;

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

function queryCoverageScore(queryTokens: string[], candidateTokens: string[]): number {
  if (!queryTokens.length || !candidateTokens.length) return 0;
  const candidateSet = new Set(candidateTokens);
  let hits = 0;
  queryTokens.forEach((token) => {
    if (candidateSet.has(token)) hits += 1;
  });
  return hits / queryTokens.length;
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
  const tokenScore = Math.max(
    jaccardSimilarity(tokensQuery, tokensCandidate),
    queryCoverageScore(tokensQuery, tokensCandidate),
  );
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

function normalizeClauseId(value?: string | null): string {
  const normalized = normalizeForMatch(value ?? "");
  if (!normalized) return "";
  return normalized.replace(/\s+/g, "-");
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
    const normalizedId = normalizeClauseId(candidate.clauseId);
    if (!normalizedId) continue;
    const existing = deduped.get(normalizedId);
    if (!existing || candidate.score > existing.score) {
      deduped.set(normalizedId, candidate);
    }
  }
  return Array.from(deduped.values()).sort((a, b) => b.score - a.score);
}

function resolveClauseById(
  clauseId: string,
  clauses: ClauseExtractionLike[],
): ClauseExtractionLike | null {
  const normalized = normalizeClauseId(clauseId);
  if (!normalized) return null;
  return (
    clauses.find((clause) =>
      normalizeClauseId(getClauseIdentifier(clause)) === normalized
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
  const excerptQueryRaw =
    typeof clauseReference?.excerpt === "string"
      ? clauseReference?.excerpt
      : null;
  const excerptQuery =
    excerptQueryRaw && !isMissingEvidenceMarker(excerptQueryRaw)
      ? excerptQueryRaw
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

  const topHeading = headingCandidates[0];
  const topText = textCandidates[0];
  const headingScore = topHeading?.score ?? 0;
  const textScore = topText?.score ?? 0;
  const hasHeadingReference = Boolean(headingQuery?.trim());
  const shouldPreferHeading =
    topHeading &&
    headingScore >= MIN_HEADING_SCORE &&
    (!topText ||
      textScore < MIN_MATCH_SCORE ||
      headingScore >= textScore + 0.08 ||
      (hasHeadingReference &&
        headingScore >= STRONG_HEADING_SCORE &&
        headingScore >= textScore - 0.05));
  const preferredCandidate = shouldPreferHeading
    ? topHeading
    : topText ?? bestCandidate;
  const bestClause =
    clauses.find((clause) =>
      normalizeClauseId(getClauseIdentifier(clause)) ===
        normalizeClauseId(preferredCandidate.clauseId)
    ) ?? null;
  const bestScore = preferredCandidate.score;
  const bestMethod = shouldPreferHeading
    ? "heading"
    : preferredCandidate.method;

  const minScore = bestMethod === "heading" ? MIN_HEADING_SCORE : MIN_MATCH_SCORE;
  if (bestScore < minScore && headingScore < MIN_HEADING_SCORE) {
    return {
      match: null,
      confidence: bestScore,
      method: "none",
      candidates: candidates.slice(0, 3),
    };
  }

  const topCandidates = candidates.slice(0, 3);
  if (shouldPreferHeading && topHeading) {
    const hasHeading = topCandidates.some(
      (candidate) =>
        normalizeClauseId(candidate.clauseId) ===
        normalizeClauseId(topHeading.clauseId),
    );
    if (!hasHeading) {
      topCandidates.pop();
      topCandidates.push(topHeading);
    }
  }

  return {
    match: bestClause,
    confidence: bestScore,
    method: bestMethod,
    candidates: topCandidates,
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
    const anchorTokens = tokenizeForMatch(anchorText);
    const structuralTokens = anchorTokens.filter((token) =>
      isStructuralToken(token),
    );
    const nonStructuralTokens = anchorTokens
      .filter((token) => !isStructuralToken(token))
      .sort((a, b) => b.length - a.length);
    const prioritizedTokens = [...structuralTokens, ...nonStructuralTokens];

    for (const token of prioritizedTokens) {
      const variants = isStructuralToken(token)
        ? tokenVariants(token)
        : [token];
      for (const variant of variants) {
        const index = clauseLower.indexOf(variant.toLowerCase());
        if (index >= 0) {
          const start = Math.max(0, index - Math.floor(maxLength * 0.4));
          const end = Math.min(clauseText.length, start + maxLength);
          return clauseText.slice(start, end);
        }
      }
    }

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

/**
 * Criterion-specific anchor phrases for targeted evidence extraction.
 * Maps criterion ID patterns to key phrases that should appear in evidence.
 */
const CRITERION_ANCHOR_PHRASES: Record<string, string[]> = {
  TERM_SURVIVAL: ["years", "term", "survival", "remain in effect", "duration", "period"],
  IP_NO_LICENSE: ["license", "intellectual property", "rights", "no transfer", "ownership"],
  GOVERNING_LAW: ["governed by", "jurisdiction", "courts", "laws of", "dispute"],
  USE_LIMITATION: ["purpose", "use", "solely for", "need to know", "restrict"],
  DEFINITION: ["confidential information", "means", "includes", "definition"],
  RETURN_DESTRUCTION: ["return", "destroy", "destruction", "certificate", "backup"],
  COMPELLED_DISCLOSURE: ["required by law", "notify", "cooperate", "court", "authority"],
  REMEDIES: ["injunctive", "relief", "specific performance", "remedy", "damages"],
};

/**
 * Builds an evidence excerpt that avoids already-used excerpts.
 * Uses criterion-specific anchor phrases when available.
 */
export function buildUniqueEvidenceExcerpt(options: {
  clauseText: string;
  criterionId?: string | null;
  anchorText?: string | null;
  excludeExcerpts?: Set<string>;
  maxLength?: number;
}): string {
  const maxLength = options.maxLength ?? DEFAULT_EXCERPT_LENGTH;
  const clauseText = (options.clauseText ?? "").replace(/\s+/g, " ").trim();
  if (!clauseText) return "";
  if (clauseText.length <= maxLength) return clauseText;

  const excludeExcerpts = options.excludeExcerpts ?? new Set<string>();
  const clauseLower = clauseText.toLowerCase();

  // Get criterion-specific phrases if available
  const criterionId = options.criterionId ?? "";
  const criterionKey = Object.keys(CRITERION_ANCHOR_PHRASES).find(
    (key) => criterionId.toUpperCase().includes(key)
  );
  const criterionPhrases = criterionKey
    ? CRITERION_ANCHOR_PHRASES[criterionKey]
    : [];

  // Combine with provided anchor text
  const anchorText =
    typeof options.anchorText === "string" ? options.anchorText.trim() : "";
  const anchorTokens = tokenizeForMatch(anchorText);
  const structuralTokens = anchorTokens.filter((token) => isStructuralToken(token));
  const nonStructuralTokens = anchorTokens
    .filter((token) => !isStructuralToken(token))
    .sort((a, b) => b.length - a.length);

  // Prioritize: criterion phrases -> structural tokens -> non-structural tokens
  const prioritizedSearchTerms = [
    ...criterionPhrases,
    ...structuralTokens,
    ...nonStructuralTokens,
  ];

  // Track positions we've tried to avoid duplicates
  const triedPositions = new Set<number>();

  for (const searchTerm of prioritizedSearchTerms) {
    const variants = isStructuralToken(searchTerm)
      ? tokenVariants(searchTerm)
      : [searchTerm];

    for (const variant of variants) {
      let searchStart = 0;
      while (searchStart < clauseText.length) {
        const index = clauseLower.indexOf(variant.toLowerCase(), searchStart);
        if (index < 0) break;

        // Skip if we've already tried this position region
        const positionKey = Math.floor(index / 50) * 50; // Group by 50-char regions
        if (triedPositions.has(positionKey)) {
          searchStart = index + variant.length;
          continue;
        }
        triedPositions.add(positionKey);

        const start = Math.max(0, index - Math.floor(maxLength * 0.4));
        const end = Math.min(clauseText.length, start + maxLength);
        const excerpt = clauseText.slice(start, end);

        // Check if this excerpt overlaps significantly with excluded excerpts
        const normalizedExcerpt = normalizeForMatch(excerpt);
        let isExcluded = false;
        for (const excluded of excludeExcerpts) {
          const normalizedExcluded = normalizeForMatch(excluded);
          // Check for significant overlap (>60% of characters match)
          const overlap = computeOverlapRatio(normalizedExcerpt, normalizedExcluded);
          if (overlap > 0.6) {
            isExcluded = true;
            break;
          }
        }

        if (!isExcluded) {
          return excerpt;
        }

        searchStart = index + variant.length;
      }
    }
  }

  // Fallback: find any non-excluded region
  for (let start = 0; start < clauseText.length - maxLength; start += Math.floor(maxLength * 0.5)) {
    const excerpt = clauseText.slice(start, start + maxLength);
    const normalizedExcerpt = normalizeForMatch(excerpt);

    let isExcluded = false;
    for (const excluded of excludeExcerpts) {
      const normalizedExcluded = normalizeForMatch(excluded);
      if (computeOverlapRatio(normalizedExcerpt, normalizedExcluded) > 0.6) {
        isExcluded = true;
        break;
      }
    }

    if (!isExcluded) {
      return excerpt;
    }
  }

  // Last resort: return standard excerpt even if duplicate
  return buildEvidenceExcerpt({
    clauseText: options.clauseText,
    anchorText: options.anchorText,
    maxLength,
  });
}

/**
 * Computes overlap ratio between two normalized strings.
 */
function computeOverlapRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;

  // Check if shorter is substring of longer
  if (longer.includes(shorter)) return 1;

  // Count matching characters in sequence
  let matches = 0;
  let bIndex = 0;
  for (let i = 0; i < shorter.length && bIndex < longer.length; i++) {
    const foundAt = longer.indexOf(shorter[i], bIndex);
    if (foundAt >= 0) {
      matches++;
      bIndex = foundAt + 1;
    }
  }

  return matches / shorter.length;
}

function normalizeAnchorText(
  anchorText: string,
  clauseText: string,
  maxLength = 160,
): string {
  const trimmed = anchorText.trim();
  const clauseSource = clauseText ?? "";
  if (!clauseSource.trim()) return trimmed;
  const candidates: string[] = [];
  if (trimmed) candidates.push(trimmed);
  const arrowIndex = trimmed.lastIndexOf("->");
  if (arrowIndex >= 0) {
    const candidate = trimmed.slice(arrowIndex + 2).trim();
    if (candidate) candidates.push(candidate);
  }
  const unicodeArrowIndex = trimmed.lastIndexOf("→");
  if (unicodeArrowIndex >= 0) {
    const candidate = trimmed.slice(unicodeArrowIndex + 1).trim();
    if (candidate) candidates.push(candidate);
  }
  for (const candidate of candidates) {
    if (candidate && clauseSource.includes(candidate)) {
      return candidate;
    }
  }
  const excerpt = buildEvidenceExcerpt({
    clauseText: clauseSource,
    anchorText: trimmed,
    maxLength,
  });
  return excerpt || trimmed;
}

export function checkEvidenceMatch(
  excerpt: string,
  content: string,
): EvidenceMatchResult {
  const normalizedContent = normalizeForMatch(content ?? "");
  if (!normalizedContent) {
    // Empty content cannot validate evidence.
    return { matched: false, reason: "empty-content" };
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

export function checkEvidenceMatchAgainstClause(
  excerpt: string,
  clauseText: string,
): EvidenceMatchResult {
  const normalizedClause = normalizeForMatch(clauseText ?? "");
  if (!normalizedClause) {
    return { matched: false, reason: "empty-content" };
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
  if (normalizedClause.includes(normalizedExcerpt)) {
    return { matched: true, reason: "exact" };
  }
  const prefix = normalizedExcerpt.slice(0, 200);
  if (prefix.length > 40 && normalizedClause.includes(prefix)) {
    return { matched: true, reason: "prefix" };
  }
  const excerptGrams = buildNgrams(normalizedExcerpt, 4);
  if (!excerptGrams.size) {
    return { matched: false, reason: "no-match" };
  }
  let hits = 0;
  excerptGrams.forEach((gram) => {
    if (normalizedClause.includes(gram)) {
      hits += 1;
    }
  });
  const ratio = hits / excerptGrams.size;
  if (ratio >= 0.5) {
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

function scoreEditToIssue(edit: ProposedEditLike, issue: IssueLike): number {
  const editParts = [
    edit.id,
    edit.intent,
    edit.rationale,
    edit.proposedText,
  ].filter(Boolean);
  if (editParts.length === 0 && edit.anchorText) {
    editParts.push(edit.anchorText);
  }
  const editText = editParts.join(" ");
  const issueText = [
    issue.id,
    issue.title,
    issue.category,
    issue.recommendation,
  ]
    .filter(Boolean)
    .join(" ");
  let score = scoreTextSimilarity(editText, issueText).score;
  if (edit.id && Array.isArray(issue.tags)) {
    const tagMatch = issue.tags.some(
      (tag) => normalizeForMatch(tag) === normalizeForMatch(edit.id ?? ""),
    );
    if (tagMatch) score = Math.max(score, 0.7);
  }
  return score;
}

const PLACEHOLDER_PATTERNS = [
  /^\s*\[[^\]]+\]\s*$/i,
  /\binsert exact\b/i,
  /\bto be provided\b/i,
  /\bplaceholder\b/i,
  /\btbd\b/i,
];

function isPlaceholderText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isPlaceholderEdit(edit: ProposedEditLike): boolean {
  const proposedText =
    typeof edit.proposedText === "string" ? edit.proposedText : "";
  return isPlaceholderText(proposedText);
}

function getEditContent(edit: ProposedEditLike): string {
  if (typeof edit.proposedText === "string" && edit.proposedText.trim()) {
    return edit.proposedText.trim();
  }
  const updatedText =
    typeof edit.updatedText === "string" ? edit.updatedText.trim() : "";
  if (updatedText) return updatedText;
  const rationale =
    typeof edit.rationale === "string" ? edit.rationale.trim() : "";
  if (rationale) return rationale;
  return typeof edit.anchorText === "string" ? edit.anchorText.trim() : "";
}

type EditHeadingHint = {
  heading: string;
  strength: "strong" | "weak";
};

type ClauseSupportCheck = (
  clause: ClauseExtractionLike,
  clauseText: string,
) => boolean;

function extractEditHeadingHint(text: string): EditHeadingHint | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const directHeading = trimmed.match(
    /^["“]?([A-Z][A-Za-z0-9 &/\\-]{2,80})["”]?\s*[:.]\s/,
  );
  if (directHeading?.[1]) {
    return { heading: directHeading[1].trim(), strength: "strong" };
  }
  if (/^["“]?confidential information["”]?\s+shall\s+mean/i.test(trimmed)) {
    return { heading: "Confidential Information", strength: "strong" };
  }
  if (/^exceptions\s*(->|:)/i.test(trimmed)) {
    return { heading: "Exceptions", strength: "strong" };
  }
  return null;
}

function clauseHasDefinitionSignals(value: string): boolean {
  const normalized = normalizeForMatch(value);
  if (!normalized.includes("confidential information")) return false;
  if (normalized.includes("shall mean")) return true;
  if (normalized.includes("definition")) return true;
  if (normalized.includes("means")) return true;
  return normalized.includes("shall not include") || normalized.includes("does not include");
}

function clauseHasReceivingPartyObligation(value: string): boolean {
  const normalized = normalizeForMatch(value);
  return (
    normalized.includes("receiving party shall") ||
    normalized.includes("receiving party must") ||
    normalized.includes("receiving party hereby undertakes") ||
    normalized.includes("receiving party agrees") ||
    normalized.includes("recipient shall")
  );
}

function clauseSupportsUseLimitation(
  clause: ClauseExtractionLike,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  const hasObligation = clauseHasReceivingPartyObligation(normalized);
  const hasUsePurpose =
    normalized.includes("purpose") ||
    normalized.includes("use") ||
    normalized.includes("need to know") ||
    normalized.includes("disclose") ||
    normalized.includes("divulge");
  return hasObligation && hasUsePurpose;
}

function clauseSupportsReturnDestruction(
  clause: ClauseExtractionLike,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  const hasConfidential = normalized.includes("confidential information");
  const hasReturn = normalized.includes("return");
  const hasDestroy =
    normalized.includes("destroy") || normalized.includes("destruction");
  return hasConfidential && (hasReturn || hasDestroy);
}

function clauseSupportsTermSurvival(
  clause: ClauseExtractionLike,
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

function clauseSupportsRemediesEdit(
  clause: ClauseExtractionLike,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  if (normalized.includes("remedies") || normalized.includes("remedy")) {
    return true;
  }
  if (normalized.includes("injunctive") || normalized.includes("injunction")) {
    return true;
  }
  return normalized.includes("specific performance") ||
    (normalized.includes("specific") && normalized.includes("performance"));
}

function clauseSupportsIpEdit(
  clause: ClauseExtractionLike,
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

function clauseSupportsCompelledDisclosure(
  clause: ClauseExtractionLike,
  clauseText: string,
): boolean {
  const normalized = normalizeForMatch(
    `${clause.title ?? ""} ${clauseText}`,
  );
  if (normalized.includes("required by law")) return true;
  if (normalized.includes("required to disclose")) return true;
  if (normalized.includes("court order")) return true;
  if (normalized.includes("competent authority")) return true;
  if (normalized.includes("regulator") || normalized.includes("regulatory")) {
    return true;
  }
  if (normalized.includes("subpoena")) return true;
  return normalized.includes("required") && normalized.includes("disclose");
}

function getEditSupportCheck(editContent: string): ClauseSupportCheck | null {
  const normalized = normalizeForMatch(editContent ?? "");
  if (!normalized) return null;
  if (
    normalized.includes("confidential information") &&
    (normalized.includes("shall mean") ||
      normalized.includes("means") ||
      normalized.includes("definition"))
  ) {
    return (clause, clauseText) =>
      clauseHasDefinitionSignals(`${clause.title ?? ""} ${clauseText}`);
  }
  if (
    normalized.includes("injunctive") ||
    normalized.includes("specific performance") ||
    normalized.includes("remedies")
  ) {
    return clauseSupportsRemediesEdit;
  }
  if (
    normalized.includes("return") ||
    normalized.includes("destroy") ||
    normalized.includes("destruction")
  ) {
    return clauseSupportsReturnDestruction;
  }
  if (
    normalized.includes("term") ||
    normalized.includes("termination") ||
    normalized.includes("survival")
  ) {
    return clauseSupportsTermSurvival;
  }
  if (
    normalized.includes("need to know") ||
    normalized.includes("purpose") ||
    normalized.includes("use limitation") ||
    normalized.includes("receiving party hereby undertakes") ||
    normalized.includes("receiving party shall")
  ) {
    return clauseSupportsUseLimitation;
  }
  if (
    normalized.includes("license") ||
    normalized.includes("licence") ||
    normalized.includes("intellectual property") ||
    normalized.includes("ownership")
  ) {
    return clauseSupportsIpEdit;
  }
  if (
    normalized.includes("compelled") ||
    normalized.includes("required by law") ||
    normalized.includes("court order") ||
    normalized.includes("regulator")
  ) {
    return clauseSupportsCompelledDisclosure;
  }
  return null;
}

function findBestSupportedClause(
  editContent: string,
  clauses: ClauseExtractionLike[],
  supportCheck: ClauseSupportCheck,
): { clause: ClauseExtractionLike; score: number } | null {
  let best: { clause: ClauseExtractionLike; score: number } | null = null;
  clauses.forEach((clause) => {
    const clauseText =
      clause.originalText ?? clause.normalizedText ?? clause.title ?? "";
    if (!clauseText) return;
    if (!supportCheck(clause, clauseText)) return;
    const candidateText = `${clause.title ?? ""} ${clauseText}`.trim();
    const { score } = scoreTextSimilarity(editContent, candidateText);
    if (!best || score > best.score) {
      best = { clause, score };
    }
  });
  return best;
}

/**
 * Checks if a proposed edit is redundant because a clause already exists
 * that adequately covers the same topic.
 */
function isRedundantEdit(
  edit: ProposedEditLike,
  clauses: ClauseExtractionLike[],
): boolean {
  const editContent = getEditContent(edit);
  const editSignal = [edit.proposedText, edit.rationale, edit.id, edit.intent]
    .filter(Boolean)
    .join(" ");
  const fullContent = editContent || editSignal;
  if (!fullContent) return false;

  // Get the support check function for this edit's topic
  const supportCheck = getEditSupportCheck(fullContent);
  if (!supportCheck) return false;

  // Find if any clause supports this topic
  const supportingClause = clauses.find((clause) => {
    const clauseText =
      clause.originalText ?? clause.normalizedText ?? clause.title ?? "";
    if (!clauseText) return false;
    return supportCheck(clause, clauseText);
  });

  if (!supportingClause) return false;

  // Check if the supporting clause has substantial overlap with the edit
  const clauseText =
    supportingClause.originalText ??
    supportingClause.normalizedText ??
    supportingClause.title ??
    "";
  const candidateText = `${supportingClause.title ?? ""} ${clauseText}`.trim();
  const { score } = scoreTextSimilarity(fullContent, candidateText);

  // If the clause covers >40% of the edit's content, consider it redundant
  // This threshold is chosen to catch obvious duplicates while allowing
  // legitimate enhancement suggestions
  if (score > 0.4) {
    return true;
  }

  return false;
}

export function bindProposedEditsToClauses(options: {
  proposedEdits: ProposedEditLike[];
  issues: IssueLike[];
  clauses: ClauseExtractionLike[];
}): ProposedEditLike[] {
  const { proposedEdits, issues, clauses } = options;
  if (!proposedEdits.length) return proposedEdits;

  const missingIssueIds = new Set<string>();
  issues.forEach((issue) => {
    const issueId = typeof issue.id === "string" ? issue.id.toLowerCase() : "";
    if (!issueId) return;
    const clauseId = normalizeClauseId(issue.clauseReference?.clauseId ?? "");
    const hasMissingEvidence =
      clauseId.startsWith("missing") ||
      clauseId.startsWith("unbound") ||
      isMissingEvidenceMarker(issue.clauseReference?.excerpt ?? "");
    if (hasMissingEvidence) {
      missingIssueIds.add(issueId);
    }
  });

  const filteredEdits = proposedEdits.filter(
    (edit) =>
      edit &&
      typeof edit === "object" &&
      !isPlaceholderEdit(edit) &&
      // Filter out edits that suggest adding something already covered by existing clauses
      !isRedundantEdit(edit, clauses),
  );
  if (!filteredEdits.length) return [];

  const clauseIdMap = new Map<string, string>();
  const clauseById = new Map<string, ClauseExtractionLike>();
  clauses.forEach((clause) => {
    const clauseId = getClauseIdentifier(clause);
    const normalized = normalizeClauseId(clauseId);
    if (!normalized) return;
    if (!clauseIdMap.has(normalized)) {
      clauseIdMap.set(normalized, clauseId ?? normalized);
    }
    if (!clauseById.has(normalized)) {
      clauseById.set(normalized, clause);
    }
  });
  const clauseIds = new Set(clauseIdMap.keys());

  const issueClauseMap = new Map<IssueLike, string>();
  issues.forEach((issue) => {
    const clauseId = issue.clauseReference?.clauseId ?? "";
    const normalizedId = normalizeClauseId(clauseId);
    const hasMissingEvidence =
      normalizedId.startsWith("missing") ||
      normalizedId.startsWith("unbound") ||
      isMissingEvidenceMarker(issue.clauseReference?.excerpt ?? "");
    if (hasMissingEvidence) {
      return;
    }
    if (normalizedId && clauseIds.has(normalizedId)) {
      issueClauseMap.set(
        issue,
        clauseIdMap.get(normalizedId) ?? clauseId,
      );
      return;
    }
    const fallbackText = `${issue.title ?? ""} ${issue.recommendation ?? ""}`.trim();
    const match = resolveClauseMatch({
      clauseReference: issue.clauseReference ?? null,
      fallbackText,
      clauses,
    });
    const matchedId = match.match ? getClauseIdentifier(match.match) : null;
    const normalizedMatched = normalizeClauseId(matchedId);
    if (normalizedMatched && clauseIds.has(normalizedMatched)) {
      issueClauseMap.set(
        issue,
        clauseIdMap.get(normalizedMatched) ?? matchedId ?? "",
      );
    }
  });

  return filteredEdits.map((edit, index) => {
    if (!edit || typeof edit !== "object") return edit;
    const rawAnchorText =
      typeof edit.anchorText === "string" ? edit.anchorText.trim() : "";
    const rawPreviousText =
      typeof edit.previousText === "string" ? edit.previousText.trim() : "";
    const intent =
      typeof edit.intent === "string" ? edit.intent.toLowerCase() : "";
    const missingAnchor = isMissingEvidenceMarker(
      rawPreviousText || rawAnchorText,
    );
    const editId = typeof edit.id === "string" ? edit.id : "";
    const normalizedEditId = editId.toLowerCase();
    const editClauseId =
      typeof edit.clauseId === "string" ? edit.clauseId : "";
    const normalizedEditClauseId = normalizeClauseId(editClauseId);
    const isAutoMissingEdit =
      normalizedEditId.startsWith("auto-") ||
      normalizedEditClauseId.startsWith("missing") ||
      missingIssueIds.has(normalizedEditId);
    if (intent.includes("insert") && missingAnchor && isAutoMissingEdit) {
      return {
        ...edit,
        clauseId: undefined,
        anchorText: rawPreviousText || rawAnchorText || "Not present in contract",
        intent: "insert",
      };
    }
    const editContent = getEditContent(edit);
    const editSignal = [
      edit.proposedText,
      edit.rationale,
      edit.id,
      edit.intent,
    ]
      .filter(Boolean)
      .join(" ");
    const editTokens = tokenizeForMatch(editContent || editSignal);
    const editStructuralTokens = editTokens.filter((token) =>
      isStructuralToken(token),
    );

    const currentId =
      typeof edit.clauseId === "string" ? edit.clauseId.trim() : "";
    const normalizedCurrentId = normalizeClauseId(currentId);
    if (normalizedCurrentId && clauseIds.has(normalizedCurrentId)) {
      const canonical = clauseIdMap.get(normalizedCurrentId) ?? currentId;
      const boundClause = clauseById.get(normalizedCurrentId);
      const clauseText = boundClause
        ? boundClause.originalText ?? boundClause.normalizedText ?? boundClause.title ?? ""
        : "";
      const clauseTokens = tokenizeForMatch(clauseText);
      const structuralMismatch =
        editStructuralTokens.length > 0 &&
        !hasStructuralMatch(editStructuralTokens, clauseTokens);
      const anchorText =
        typeof edit.anchorText === "string" ? edit.anchorText : "";
      const anchorSeed = isMissingEvidenceMarker(anchorText) ? "" : anchorText;
      const nextAnchor = clauseText
        ? normalizeAnchorText(anchorSeed, clauseText)
        : anchorText;
      const anchorMatches = nextAnchor && clauseText
        ? checkEvidenceMatchAgainstClause(nextAnchor, clauseText).matched
        : false;
      let nextIntent = edit.intent;
      if (structuralMismatch) nextIntent = "insert";
      if (nextIntent === "replace" && !anchorMatches) nextIntent = "insert";
      const rebindQuery = editContent || editSignal;
      if ((structuralMismatch || !anchorMatches) && rebindQuery.trim()) {
        const altMatch = resolveClauseMatch({
          clauseReference: null,
          fallbackText: rebindQuery,
          clauses,
        });
        const altId = altMatch.match
          ? getClauseIdentifier(altMatch.match)
          : null;
        const normalizedAlt = normalizeClauseId(altId);
        const canRebind =
          normalizedAlt &&
          normalizedAlt !== normalizedCurrentId &&
          altMatch.confidence >= MIN_MATCH_SCORE + 0.08;
        if (canRebind) {
          const altClause = clauseById.get(normalizedAlt);
          const altText = altClause
            ? altClause.originalText ?? altClause.normalizedText ?? altClause.title ?? ""
            : "";
          const altAnchorSeed = editContent || anchorSeed || rebindQuery;
          const altAnchor = altText
            ? normalizeAnchorText(altAnchorSeed, altText)
            : anchorText;
          const altAnchorMatches = altText
            ? checkEvidenceMatchAgainstClause(altAnchor, altText).matched
            : false;
          if (altAnchorMatches || altMatch.method === "heading") {
            return {
              ...edit,
              clauseId: clauseIdMap.get(normalizedAlt) ?? altId ?? canonical,
              anchorText: altAnchor,
              intent: "insert",
            };
          }
        }
      }

      if (editTokens.length >= 3 && rebindQuery.trim()) {
        const currentCandidateText = boundClause
          ? `${boundClause.title ?? ""} ${clauseText}`.trim()
          : clauseText;
        const currentScore = currentCandidateText
          ? scoreTextSimilarity(rebindQuery, currentCandidateText).score
          : 0;
        const altMatch = resolveClauseMatch({
          clauseReference: null,
          fallbackText: rebindQuery,
          clauses,
        });
        const altId = altMatch.match
          ? getClauseIdentifier(altMatch.match)
          : null;
        const normalizedAlt = normalizeClauseId(altId);
        const canRebindByText =
          normalizedAlt &&
          normalizedAlt !== normalizedCurrentId &&
          altMatch.confidence >=
            Math.max(MIN_MATCH_SCORE + 0.12, currentScore + 0.12);
        if (canRebindByText) {
          const altClause = clauseById.get(normalizedAlt);
          const altText = altClause
            ? altClause.originalText ?? altClause.normalizedText ?? altClause.title ?? ""
            : "";
          const rebindAnchorSeed =
            editContent || rebindQuery;
          const altAnchor = altText
            ? normalizeAnchorText(rebindAnchorSeed, altText)
            : anchorText;
          const altAnchorMatches = altText
            ? checkEvidenceMatchAgainstClause(altAnchor, altText).matched
            : false;
          const altClauseTokens = tokenizeForMatch(altText);
          const altStructuralMismatch =
            editStructuralTokens.length > 0 &&
            !hasStructuralMatch(editStructuralTokens, altClauseTokens);
          let rebindIntent = edit.intent;
          if (altStructuralMismatch) rebindIntent = "insert";
          if (rebindIntent === "replace" && !altAnchorMatches) {
            rebindIntent = "insert";
          }
          return {
            ...edit,
            clauseId: clauseIdMap.get(normalizedAlt) ?? altId ?? canonical,
            anchorText: altAnchor,
            intent: rebindIntent ?? edit.intent,
          };
        }
      }

      const headingHint = extractEditHeadingHint(editContent);
      if (headingHint) {
        const hintMatch = resolveClauseMatch({
          clauseReference: { heading: headingHint.heading },
          fallbackText: editContent,
          clauses,
        });
        const hintId = hintMatch.match
          ? getClauseIdentifier(hintMatch.match)
          : null;
        const normalizedHint = normalizeClauseId(hintId);
        const hintThreshold =
          headingHint.strength === "strong" ? MIN_HEADING_SCORE : STRONG_HEADING_SCORE;
        if (
          normalizedHint &&
          normalizedHint !== normalizedCurrentId &&
          hintMatch.confidence >= hintThreshold
        ) {
          const hintClause = clauseById.get(normalizedHint);
          const hintText = hintClause
            ? hintClause.originalText ?? hintClause.normalizedText ?? hintClause.title ?? ""
            : "";
          const hintAnchor = hintText
            ? normalizeAnchorText(editContent || anchorSeed, hintText)
            : anchorText;
          return {
            ...edit,
            clauseId: clauseIdMap.get(normalizedHint) ?? hintId ?? canonical,
            anchorText: hintAnchor,
            intent: "insert",
          };
        }
      }
      const supportCheck = getEditSupportCheck(editContent || editSignal);
      if (supportCheck && boundClause) {
        const supports = supportCheck(boundClause, clauseText);
        if (!supports) {
          const supported = findBestSupportedClause(
            editContent || editSignal,
            clauses,
            supportCheck,
          );
          const supportedId = supported?.clause
            ? getClauseIdentifier(supported.clause)
            : null;
          const normalizedSupported = normalizeClauseId(supportedId);
          if (
            supported &&
            normalizedSupported &&
            normalizedSupported !== normalizedCurrentId &&
            supported.score >= MIN_MATCH_SCORE
          ) {
            const supportedClause = supported.clause;
            const supportedText =
              supportedClause.originalText ??
              supportedClause.normalizedText ??
              supportedClause.title ??
              "";
            const supportedAnchor = supportedText
              ? normalizeAnchorText(editContent || anchorSeed, supportedText)
              : anchorText;
            return {
              ...edit,
              clauseId: clauseIdMap.get(normalizedSupported) ?? supportedId ?? canonical,
              anchorText: supportedAnchor,
              intent: "insert",
            };
          }
          return {
            ...edit,
            clauseId: undefined,
            anchorText: anchorText && !isMissingEvidenceMarker(anchorText)
              ? anchorText
              : "Not present in contract",
            intent: "insert",
          };
        }
      }
      return {
        ...edit,
        clauseId: canonical,
        anchorText: nextAnchor,
        intent: nextIntent ?? edit.intent,
      };
    }

    const anchorText =
      typeof edit.anchorText === "string" ? edit.anchorText.trim() : "";
    let bestEditIssue: IssueLike | null = null;
    let bestEditScore = 0;
    let bestAnchorIssue: IssueLike | null = null;
    let bestAnchorScore = 0;
    issues.forEach((issue) => {
      const anchorScore = anchorText ? scoreAnchorToIssue(anchorText, issue) : 0;
      if (anchorScore > bestAnchorScore) {
        bestAnchorScore = anchorScore;
        bestAnchorIssue = issue;
      }
      const editScore = scoreEditToIssue(edit, issue);
      if (editScore > bestEditScore) {
        bestEditScore = editScore;
        bestEditIssue = issue;
      }
    });
    const useEditMatch =
      bestEditIssue !== null && bestEditScore >= MIN_MATCH_SCORE;
    const useAnchorMatch =
      !useEditMatch &&
      bestAnchorIssue !== null &&
      bestAnchorScore >= MIN_MATCH_SCORE;
    const bestIssue = useEditMatch ? bestEditIssue : bestAnchorIssue;
    const bestScore = useEditMatch ? bestEditScore : bestAnchorScore;
    if (bestIssue && bestScore >= MIN_MATCH_SCORE) {
      const bestIssueClauseId = normalizeClauseId(
        bestIssue.clauseReference?.clauseId ?? "",
      );
      const bestIssueMissing =
        bestIssueClauseId.startsWith("missing") ||
        bestIssueClauseId.startsWith("unbound") ||
        isMissingEvidenceMarker(bestIssue.clauseReference?.excerpt ?? "");
      if (bestIssueMissing) {
        const safeAnchor = isMissingEvidenceMarker(anchorText)
          ? anchorText
          : "Not present in contract";
        return {
          ...edit,
          clauseId: undefined,
          anchorText: safeAnchor,
          intent: "insert",
        };
      }
      const boundId = issueClauseMap.get(bestIssue);
      if (boundId) {
        const normalizedBound = normalizeClauseId(boundId);
        const boundClause = clauseById.get(normalizedBound);
        const clauseText = boundClause
          ? boundClause.originalText ??
            boundClause.normalizedText ??
            boundClause.title ??
            ""
          : "";
        const clauseTokens = tokenizeForMatch(clauseText);
        const issueStructuralMismatch =
          editStructuralTokens.length > 0 &&
          !hasStructuralMatch(editStructuralTokens, clauseTokens);
        const issueAnchor =
          bestIssue.clauseReference?.excerpt ??
          bestIssue.clauseReference?.heading ??
          anchorText;
        const anchorSeed = isMissingEvidenceMarker(issueAnchor) ? "" : issueAnchor;
        const nextAnchor = clauseText
          ? normalizeAnchorText(anchorSeed, clauseText)
          : issueAnchor ?? anchorText;
        const anchorMatches = nextAnchor && clauseText
          ? checkEvidenceMatchAgainstClause(nextAnchor, clauseText).matched
          : false;
        if (!issueStructuralMismatch || anchorMatches) {
          const boundMissing =
            isMissingEvidenceMarker(bestIssue.clauseReference?.excerpt) ||
            normalizeForMatch(boundId).startsWith("missing");
          let nextIntent = edit.intent;
          if (issueStructuralMismatch) nextIntent = "insert";
          if (boundMissing) nextIntent = "insert";
          if (nextIntent === "replace" && !anchorMatches) nextIntent = "insert";
          return {
            ...edit,
            clauseId: boundId,
            anchorText: nextAnchor,
            intent: nextIntent ?? edit.intent,
          };
        }
      }
    }

    const safeAnchor = isMissingEvidenceMarker(anchorText) ? "" : anchorText;
    const fallbackQuery = [safeAnchor, editSignal, edit.id]
      .filter(Boolean)
      .join(" ");
    if (fallbackQuery) {
      const clauseMatch = resolveClauseMatch({
        clauseReference: null,
        fallbackText: fallbackQuery,
        clauses,
      });
      const matchedId = clauseMatch.match
        ? getClauseIdentifier(clauseMatch.match)
        : null;
      const normalizedMatched = normalizeClauseId(matchedId);
      if (normalizedMatched && clauseIds.has(normalizedMatched)) {
        const canonical = clauseIdMap.get(normalizedMatched) ?? matchedId;
        const boundClause = clauseById.get(normalizedMatched);
        const clauseText = boundClause
          ? boundClause.originalText ?? boundClause.normalizedText ?? boundClause.title ?? ""
          : "";
        const clauseTokens = tokenizeForMatch(clauseText);
        const structuralMismatch =
          editStructuralTokens.length > 0 &&
          !hasStructuralMatch(editStructuralTokens, clauseTokens);
        const anchorSeed = isMissingEvidenceMarker(anchorText) ? "" : anchorText;
        const nextAnchor = clauseText
          ? normalizeAnchorText(anchorSeed, clauseText)
          : anchorText;
        const anchorMatches = nextAnchor && clauseText
          ? checkEvidenceMatchAgainstClause(nextAnchor, clauseText).matched
          : false;
        if (structuralMismatch && !anchorMatches) {
          return {
            ...edit,
            clauseId: undefined,
            anchorText: anchorText && !isMissingEvidenceMarker(anchorText)
              ? anchorText
              : "Not present in contract",
            intent: "insert",
          };
        }
        if (structuralMismatch && anchorMatches) {
          return {
            ...edit,
            clauseId: canonical,
            anchorText: nextAnchor,
            intent: "insert",
          };
        }
        const nextIntent =
          edit.intent === "replace" && !anchorMatches ? "insert" : edit.intent;
        return { ...edit, clauseId: canonical, anchorText: nextAnchor, intent: nextIntent };
      }
    }

    return {
      ...edit,
      clauseId: undefined,
      anchorText: anchorText && !isMissingEvidenceMarker(anchorText)
        ? anchorText
        : "Not present in contract",
      intent: "insert",
    };
  });
}

export function findRequirementMatch(
  requirement: string,
  clauses: ClauseExtractionLike[],
  content: string,
): { met: boolean; evidence?: string; score: number } {
  if (!requirement || !requirement.trim()) {
    return { met: false, score: 0 };
  }
  const requirementTokens = tokenizeForMatch(requirement);
  const structuralTokens = requirementTokens.filter((token) =>
    isStructuralToken(token),
  );
  const matchTokens =
    structuralTokens.length > 0 ? structuralTokens : requirementTokens;
  const minCoverage =
    matchTokens.length <= 3 ? 0.5 : 0.35;
  const minHits = matchTokens.length >= 4 ? 2 : 1;
  let bestScore = 0;
  let bestCoverage = 0;
  let bestHits = 0;
  let bestEvidence: string | undefined;

  for (const clause of clauses) {
    const clauseText = `${clause.title ?? ""} ${clause.originalText ?? ""} ${
      clause.normalizedText ?? ""
    }`;
    if (!passesRequirementGuards(requirement, clauseText)) {
      continue;
    }
    const clauseTokens = tokenizeForMatch(clauseText);
    if (
      structuralTokens.length > 0 &&
      !hasStructuralMatch(structuralTokens, clauseTokens)
    ) {
      continue;
    }
    const { score } = scoreTextSimilarity(requirement, clauseText);
    const coverage = coverageWithSynonyms(matchTokens, clauseTokens);
    const hits = countTokenMatches(matchTokens, clauseTokens);
    const shouldPromote =
      score > bestScore ||
      (score === bestScore &&
        (coverage > bestCoverage ||
          (coverage === bestCoverage && hits > bestHits)));
    if (shouldPromote) {
      bestScore = score;
      bestCoverage = coverage;
      bestHits = hits;
      bestEvidence = clause.title ?? getClauseIdentifier(clause) ?? undefined;
    }
  }

  const headingCandidates = rankClauseCandidates(requirement, clauses, "heading");
  const topHeading = headingCandidates[0];
  if (topHeading && topHeading.score >= MIN_HEADING_SCORE) {
    const headingClause =
      clauses.find((entry) =>
        normalizeClauseId(getClauseIdentifier(entry)) ===
          normalizeClauseId(topHeading.clauseId)
      ) ?? null;
    if (headingClause) {
      const clauseText = `${headingClause.title ?? ""} ${
        headingClause.originalText ?? ""
      } ${headingClause.normalizedText ?? ""}`;
      if (passesRequirementGuards(requirement, clauseText)) {
        const clauseTokens = tokenizeForMatch(clauseText);
        const passesStructure =
          structuralTokens.length === 0 ||
          hasStructuralMatch(structuralTokens, clauseTokens);
        const preferHeading = requirementTokens.some((token) =>
          HEADING_PRIORITY_TOKENS.has(token),
        );
        const preferDefinitionHeading =
          requirementTokens.includes("definition") &&
          normalizeForMatch(headingClause.title ?? "").includes(
            "confidential information",
          );
        const headingThreshold = preferHeading
          ? Math.max(MIN_HEADING_SCORE, bestScore - 0.05)
          : bestScore + 0.08;
        if (
          passesStructure &&
          (topHeading.score >= headingThreshold || preferDefinitionHeading)
        ) {
          const coverage = coverageWithSynonyms(matchTokens, clauseTokens);
          const hits = countTokenMatches(matchTokens, clauseTokens);
          bestScore = topHeading.score;
          bestCoverage = coverage;
          bestHits = hits;
          bestEvidence =
            headingClause.title ?? getClauseIdentifier(headingClause) ?? undefined;
        }
      }
    }
  }

  if (
    bestCoverage >= minCoverage &&
    bestHits >= minHits &&
    (bestScore >= MIN_MATCH_SCORE || structuralTokens.length > 0)
  ) {
    const score = Math.max(bestScore, MIN_MATCH_SCORE);
    return { met: true, evidence: bestEvidence, score };
  }

  const normalizedRequirement = normalizeForMatch(requirement);
  const normalizedContent = normalizeForMatch(content ?? "");
  if (
    normalizedRequirement &&
    normalizedContent &&
    normalizedContent.includes(normalizedRequirement) &&
    passesRequirementGuards(requirement, content ?? "")
  ) {
    return { met: true, evidence: "Contract text", score: MIN_MATCH_SCORE };
  }

  return { met: false, score: bestScore };
}

function isOptionalAnchor(anchor: string): boolean {
  return /\bif (applicable|relevant)\b/i.test(anchor);
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

  const requiredAnchors = anchorCoverage.filter((anchor) =>
    !isOptionalAnchor(anchor.anchor),
  );
  const totalChecks =
    criticalClauses.length + requiredAnchors.length || 1;
  const metChecks =
    criticalClauses.filter((clause) => clause.met).length +
    requiredAnchors.filter((anchor) => anchor.met).length;

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
    const headingCandidates = rankClauseCandidates(anchor, clauses, "heading");
    const textCandidates = rankClauseCandidates(anchor, clauses, "text");
    const topHeading = headingCandidates[0];
    const topText = textCandidates[0];
    const anchorTokens = tokenizeForMatch(anchor);
    const anchorStructuralTokens = anchorTokens.filter((token) =>
      isStructuralToken(token),
    );
    const forceHeading =
      anchorTokens.some((token) => HEADING_PRIORITY_TOKENS.has(token)) &&
      topHeading &&
      topHeading.score >= MIN_HEADING_SCORE;
    const preferHeading =
      topHeading &&
      topHeading.score >= MIN_HEADING_SCORE &&
      (!topText || topHeading.score >= topText.score + 0.08);

    let candidates = mergeCandidates([
      ...textCandidates,
      ...headingCandidates,
    ]).filter((candidate) => candidate.score >= MIN_MATCH_SCORE);

    if (forceHeading || preferHeading) {
      if (topHeading) {
        const alreadyIncluded = candidates.some(
          (candidate) =>
            normalizeClauseId(candidate.clauseId) ===
            normalizeClauseId(topHeading.clauseId),
        );
        if (!alreadyIncluded) {
          candidates = [topHeading, ...candidates];
        } else {
          candidates = candidates.sort((a, b) => {
            if (
              normalizeClauseId(a.clauseId) ===
              normalizeClauseId(topHeading.clauseId)
            ) {
              return -1;
            }
            if (
              normalizeClauseId(b.clauseId) ===
              normalizeClauseId(topHeading.clauseId)
            ) {
              return 1;
            }
            return b.score - a.score;
          });
        }
      }
    }

    if (forceHeading && topHeading) {
      candidates = candidates.filter(
        (candidate) =>
          normalizeClauseId(candidate.clauseId) ===
          normalizeClauseId(topHeading.clauseId),
      );
    }

    candidates = candidates.slice(0, Math.max(maxPerAnchor * 2, maxPerAnchor));
    const minClauseLength = anchorTokens.length >= 2 ? 80 : 0;
    let addedForAnchor = 0;

    const canUseClause = (clauseText: string, clauseTokens: string[]) => {
      if (minClauseLength > 0 && clauseText.length < minClauseLength) {
        return false;
      }
      if (
        anchorStructuralTokens.length > 0 &&
        !hasStructuralMatch(anchorStructuralTokens, clauseTokens)
      ) {
        return false;
      }
      return true;
    };

    for (const candidate of candidates) {
      if (snippets.length >= maxTotal) break;
      const seenKey = `${anchor}::${candidate.clauseId}`;
      if (seen.has(seenKey)) continue;
      const clause = clauses.find((entry) =>
        normalizeClauseId(getClauseIdentifier(entry)) ===
          normalizeClauseId(candidate.clauseId)
      );
      if (!clause) continue;
      const clauseText =
        clause.originalText ??
        clause.normalizedText ??
        clause.title ??
        "";
      const clauseTokens = tokenizeForMatch(clauseText);
      if (!canUseClause(clauseText, clauseTokens)) {
        continue;
      }
      const excerpt = buildEvidenceExcerpt({
        clauseText,
        anchorText: anchor,
        maxLength: excerptLength,
      });
      snippets.push({
        clauseId: candidate.clauseId,
        title: clause.title ?? candidate.clauseId,
        anchor,
        excerpt,
      });
      seen.add(seenKey);
      addedForAnchor += 1;
      if (addedForAnchor >= maxPerAnchor) break;
    }
    if (addedForAnchor === 0 && candidates.length > 0) {
      const fallbackCandidate = candidates[0];
      const seenKey = `${anchor}::${fallbackCandidate.clauseId}`;
      if (!seen.has(seenKey)) {
        const clause = clauses.find((entry) =>
          normalizeClauseId(getClauseIdentifier(entry)) ===
            normalizeClauseId(fallbackCandidate.clauseId)
        );
        if (clause) {
          const clauseText =
            clause.originalText ??
            clause.normalizedText ??
            clause.title ??
            "";
          const clauseTokens = tokenizeForMatch(clauseText);
          if (!canUseClause(clauseText, clauseTokens)) {
            continue;
          }
          const excerpt = buildEvidenceExcerpt({
            clauseText,
            anchorText: anchor,
            maxLength: excerptLength,
          });
          snippets.push({
            clauseId: fallbackCandidate.clauseId,
            title: clause.title ?? fallbackCandidate.clauseId,
            anchor,
            excerpt,
          });
          seen.add(seenKey);
        }
      }
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

const severityRank: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function similarityForText(a: string, b: string): number {
  const tokensA = tokenizeForMatch(a);
  const tokensB = tokenizeForMatch(b);
  return jaccardSimilarity(tokensA, tokensB);
}

function isMissingClauseId(value?: string | null): boolean {
  const normalized = normalizeClauseId(value ?? "");
  if (!normalized) return true;
  return (
    normalized.startsWith("missing") ||
    normalized.startsWith("issue-clause") ||
    normalized.startsWith("unbound")
  );
}

export function dedupeIssues(issues: IssueLike[]): IssueLike[] {
  const buckets = new Map<string, IssueLike[]>();
  issues.forEach((issue) => {
    const clauseId = issue.clauseReference?.clauseId ?? "unbound";
    const missingClause =
      isMissingClauseId(clauseId) ||
      isMissingEvidenceMarker(issue.clauseReference?.excerpt);
    let bucketKey = normalizeClauseId(clauseId) || clauseId;
    if (missingClause) {
      const keySource =
        issue.id ??
        issue.title ??
        issue.category ??
        issue.clauseReference?.heading ??
        "";
      const normalizedKey = normalizeForMatch(keySource).replace(/\s+/g, "-");
      bucketKey = normalizedKey ? `missing:${normalizedKey}` : "missing";
    }
    const bucket = buckets.get(bucketKey) ?? [];
    bucket.push(issue);
    buckets.set(bucketKey, bucket);
  });

  const deduped: IssueLike[] = [];
  buckets.forEach((bucket) => {
    const kept: IssueLike[] = [];
    bucket.forEach((issue) => {
      const issueText = `${issue.title ?? ""} ${issue.recommendation ?? ""}`.trim();
      const matchIndex = kept.findIndex((existing) => {
        const existingText =
          `${existing.title ?? ""} ${existing.recommendation ?? ""}`.trim();
        const similarity = similarityForText(issueText, existingText);
        return similarity >= 0.82;
      });
      if (matchIndex === -1) {
        kept.push(issue);
        return;
      }
      const existing = kept[matchIndex];
      const existingRank =
        severityRank[(existing.severity ?? "").toLowerCase()] ?? 0;
      const nextRank =
        severityRank[(issue.severity ?? "").toLowerCase()] ?? 0;
      if (nextRank > existingRank) {
        kept[matchIndex] = issue;
      }
    });
    deduped.push(...kept);
  });

  const missingIssues: IssueLike[] = [];
  const boundIssues: IssueLike[] = [];
  deduped.forEach((issue) => {
    const clauseId = issue.clauseReference?.clauseId ?? "unbound";
    const missing =
      isMissingClauseId(clauseId) ||
      isMissingEvidenceMarker(issue.clauseReference?.excerpt);
    if (missing) {
      missingIssues.push(issue);
    } else {
      boundIssues.push(issue);
    }
  });

  const mergedMissing: IssueLike[] = [];
  missingIssues.forEach((issue) => {
    const issueText = `${issue.title ?? ""} ${issue.recommendation ?? ""}`.trim();
    const matchIndex = mergedMissing.findIndex((existing) => {
      const existingText =
        `${existing.title ?? ""} ${existing.recommendation ?? ""}`.trim();
      const similarity = similarityForText(issueText, existingText);
      return similarity >= 0.82;
    });
    if (matchIndex === -1) {
      mergedMissing.push(issue);
      return;
    }
    const existing = mergedMissing[matchIndex];
    const existingRank =
      severityRank[(existing.severity ?? "").toLowerCase()] ?? 0;
    const nextRank =
      severityRank[(issue.severity ?? "").toLowerCase()] ?? 0;
    if (nextRank > existingRank) {
      mergedMissing[matchIndex] = issue;
    }
  });

  return [...boundIssues, ...mergedMissing];
}

export function dedupeProposedEdits(
  edits: ProposedEditLike[],
): ProposedEditLike[] {
  const buckets = new Map<string, ProposedEditLike[]>();
  edits.forEach((edit) => {
    const clauseId = edit.clauseId ?? "unbound";
    const bucket = buckets.get(clauseId) ?? [];
    bucket.push(edit);
    buckets.set(clauseId, bucket);
  });

  const deduped: ProposedEditLike[] = [];
  buckets.forEach((bucket) => {
    const kept: ProposedEditLike[] = [];
    bucket.forEach((edit) => {
      const editText = `${edit.intent ?? ""} ${edit.proposedText ?? ""}`.trim();
      const matchIndex = kept.findIndex((existing) => {
        const existingText =
          `${existing.intent ?? ""} ${existing.proposedText ?? ""}`.trim();
        const similarity = similarityForText(editText, existingText);
        return similarity >= 0.86;
      });
      if (matchIndex === -1) {
        kept.push(edit);
      }
    });
    deduped.push(...kept);
  });
  return deduped;
}

export function normaliseReportExpiry(value?: string | null): string {
  if (typeof value !== "string") {
    return new Date(Date.now() + 86_400_000 * 30).toISOString();
  }
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date(Date.now() + 86_400_000 * 30).toISOString();
}
