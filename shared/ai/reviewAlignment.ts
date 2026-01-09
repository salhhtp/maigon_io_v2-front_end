import type {
  ClauseExtractionLike,
  ClauseLocationLike,
  ClauseReferenceLike,
  IssueLike,
  ProposedEditLike,
} from "./reliability";
import {
  buildEvidenceExcerpt,
  isMissingEvidenceMarker,
  normalizeAnchorText,
  tokenizeForAnchor,
} from "./reliability";
import type { ContractPlaybook, PlaybookChecklistItem } from "./playbooks";
import {
  buildEvidenceIndex,
  resolveEvidence,
  type EvidenceIndex,
} from "./evidenceResolver";
import { selectInsertionPoint } from "./insertionPolicy";

export type ChecklistCriterion = {
  id: string;
  title: string;
  description: string;
  met: boolean;
  status: "met" | "missing" | "attention";
  evidence: string;
  clauseId?: string;
  heading?: string;
  locationHint?: ClauseLocationLike | null;
  requiredSignals: string[];
  matchedSignals: string[];
  missingSignals: string[];
  insertionPolicyKey: string;
};

export type CriteriaReportEntry = {
  id: string;
  title: string;
  description: string;
  met: boolean;
  evidence: string;
};

export type IssueValidationResult = {
  valid: boolean;
  reason?: string;
};

export type ChecklistProposedEdit = ProposedEditLike & {
  rationale?: string;
  previousText?: string;
  updatedText?: string;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeClauseId = (value: string) => value.toLowerCase().trim();

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const isExcerptFromClause = (excerpt: string, clauseText: string) => {
  if (!excerpt || !clauseText) return false;
  const normalizedClause = normalizeWhitespace(clauseText).toLowerCase();
  const normalizedExcerpt = normalizeWhitespace(excerpt).toLowerCase();
  return normalizedClause.includes(normalizedExcerpt);
};

const findExactMatchInContent = (content: string, candidate: string) => {
  const trimmed = candidate.trim();
  if (!trimmed) return "";
  if (content.includes(trimmed)) return trimmed;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/\s+/g, "\\s+");
  const regex = new RegExp(pattern, "i");
  const match = content.match(regex);
  return match?.[0] ?? "";
};

const splitIntoSentences = (text: string) => {
  const parts = text
    .split(/[.\n;:]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.filter((part) => part.length >= 30 && part.length <= 220);
};

const buildCriterionFromChecklistItem = (
  item: PlaybookChecklistItem,
  index: EvidenceIndex,
): ChecklistCriterion => {
  const bundle = resolveEvidence(item, index);
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    met: bundle.status === "met",
    status: bundle.status,
    evidence: bundle.evidence || (bundle.status === "missing" ? "Not present" : ""),
    clauseId: bundle.clauseId,
    heading: bundle.heading,
    locationHint: bundle.locationHint ?? null,
    requiredSignals: item.requiredSignals,
    matchedSignals: bundle.matchedSignals,
    missingSignals: bundle.missingSignals,
    insertionPolicyKey: item.insertionPolicyKey,
  };
};

export function buildChecklistCriteria(
  playbook: ContractPlaybook,
  evidenceIndex: EvidenceIndex,
): ChecklistCriterion[] {
  return (playbook.checklist ?? []).map((item) =>
    buildCriterionFromChecklistItem(item, evidenceIndex),
  );
}

export function toCriteriaReportEntries(
  criteria: ChecklistCriterion[],
): CriteriaReportEntry[] {
  return criteria.map((criterion) => ({
    id: criterion.id,
    title: criterion.title,
    description: criterion.description,
    met: criterion.met,
    evidence: criterion.evidence,
  }));
}

const scoreIssueToCriterion = (issue: IssueLike, criterion: ChecklistCriterion) => {
  const issueText = `${issue.title ?? ""} ${issue.recommendation ?? ""} ${
    issue.rationale ?? ""
  }`.trim();
  if (!issueText) return 0;
  const normalizedIssue = normalizeText(issueText);
  let signalHits = 0;
  criterion.requiredSignals.forEach((signal) => {
    const normalizedSignal = normalizeText(signal);
    if (normalizedSignal && normalizedIssue.includes(normalizedSignal)) {
      signalHits += 1;
    }
  });
  const issueTokens = new Set(tokenizeForAnchor(issueText));
  const criterionTokens = new Set(
    tokenizeForAnchor(
      `${criterion.title} ${criterion.description} ${criterion.requiredSignals.join(" ")}`.trim(),
    ),
  );
  let tokenHits = 0;
  criterionTokens.forEach((token) => {
    if (issueTokens.has(token)) tokenHits += 1;
  });
  const tokenScore =
    criterionTokens.size > 0 ? tokenHits / criterionTokens.size : 0;
  return signalHits > 0 ? tokenScore + signalHits : tokenScore;
};

const addChecklistTag = (issue: IssueLike, criterionId: string) => {
  const tags = Array.isArray(issue.tags) ? [...issue.tags] : [];
  if (!tags.includes(criterionId)) tags.push(criterionId);
  return { ...issue, tags };
};

const buildIssueTitle = (criterion: ChecklistCriterion) => {
  if (criterion.status === "missing") {
    return `${criterion.title}: Missing requirement`;
  }
  return `${criterion.title}: Needs attention`;
};

const buildIssueRecommendation = (criterion: ChecklistCriterion) => {
  const missingSignals = criterion.missingSignals.length
    ? criterion.missingSignals
    : criterion.requiredSignals;
  if (!missingSignals.length) {
    return "Provide the missing requirement in the contract.";
  }
  return `Add or clarify: ${missingSignals.join("; ")}.`;
};

const buildIssueRationale = (criterion: ChecklistCriterion) =>
  `Checklist ${criterion.id} requires ${criterion.title.toLowerCase()}.`;

const buildClauseReference = (
  criterion: ChecklistCriterion,
): ClauseReferenceLike => {
  const clauseId =
    criterion.clauseId && criterion.clauseId.trim().length > 0
      ? criterion.clauseId
      : `missing-${criterion.id.toLowerCase()}`;
  const excerpt = criterion.status === "missing" ? "Not present" : criterion.evidence;
  return {
    clauseId,
    heading: criterion.heading ?? undefined,
    excerpt,
    locationHint: criterion.locationHint ?? null,
  };
};

export function validateIssueClauseReference(
  issue: IssueLike,
  evidenceIndex: EvidenceIndex,
): IssueValidationResult {
  const reference = issue.clauseReference;
  const clauseId = reference?.clauseId?.toString() ?? "";
  const excerpt = reference?.excerpt?.toString() ?? "";
  if (!clauseId.trim()) {
    return isMissingEvidenceMarker(excerpt)
      ? { valid: true }
      : { valid: false, reason: "missing-clause-id" };
  }
  const clause = evidenceIndex.byClauseId.get(normalizeClauseId(clauseId));
  if (!clause) {
    return isMissingEvidenceMarker(excerpt)
      ? { valid: true }
      : { valid: false, reason: "unknown-clause-id" };
  }
  if (!excerpt) {
    return { valid: false, reason: "empty-excerpt" };
  }
  if (isMissingEvidenceMarker(excerpt)) {
    return { valid: false, reason: "missing-marker-with-existing-clause" };
  }
  return isExcerptFromClause(excerpt, clause.text)
    ? { valid: true }
    : { valid: false, reason: "excerpt-not-from-clause" };
}

export function enforceIssueClauseReference(
  issue: IssueLike,
  evidenceIndex: EvidenceIndex,
): IssueLike {
  const reference = issue.clauseReference ?? null;
  const clauseId = reference?.clauseId?.toString() ?? "";
  if (!clauseId.trim()) {
    return {
      ...issue,
      clauseReference: {
        clauseId: `missing-${issue.id ?? "issue"}`,
        excerpt: "Not present",
        heading: undefined,
        locationHint: null,
      },
    };
  }
  const clause = evidenceIndex.byClauseId.get(normalizeClauseId(clauseId));
  if (!clause) {
    return {
      ...issue,
      clauseReference: {
        clauseId,
        excerpt: "Not present",
        heading: reference?.heading ?? undefined,
        locationHint: reference?.locationHint ?? null,
      },
    };
  }
  const currentExcerpt = reference?.excerpt ?? "";
  if (currentExcerpt && isExcerptFromClause(currentExcerpt, clause.text)) {
    return issue;
  }
  const anchorSeed = normalizeAnchorText(
    `${issue.title ?? ""} ${issue.recommendation ?? ""}`.trim(),
  );
  const excerpt =
    buildEvidenceExcerpt({
      clauseText: clause.text,
      anchorText: anchorSeed || clause.heading,
    }) || clause.text.slice(0, 240);
  return {
    ...issue,
    clauseReference: {
      clauseId: clause.clauseId,
      heading: clause.heading,
      excerpt,
      locationHint: clause.locationHint ?? null,
    },
  };
}

export function alignIssuesToChecklist(options: {
  issues: IssueLike[];
  criteria: ChecklistCriterion[];
  evidenceIndex: EvidenceIndex;
}): { issues: IssueLike[]; issueToCriterion: Map<string, string> } {
  const { issues, criteria, evidenceIndex } = options;
  const issueToCriterion = new Map<string, string>();
  const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));

  const updatedIssues = issues.map((issue) => {
    let bestCriterion: ChecklistCriterion | null = null;
    let bestScore = 0;
    criteria.forEach((criterion) => {
      const score = scoreIssueToCriterion(issue, criterion);
      if (score > bestScore) {
        bestScore = score;
        bestCriterion = criterion;
      }
    });

    if (bestCriterion && bestScore >= 0.2) {
      issueToCriterion.set(issue.id ?? `${bestCriterion.id}-issue`, bestCriterion.id);
      const alignedIssue = {
        ...issue,
        clauseReference: buildClauseReference(bestCriterion),
      };
      return addChecklistTag(alignedIssue, bestCriterion.id);
    }

    return enforceIssueClauseReference(issue, evidenceIndex);
  });

  const issuesWithChecklistCoverage = [...updatedIssues];
  criteria.forEach((criterion) => {
    if (criterion.status === "met") return;
    const alreadyMapped = issuesWithChecklistCoverage.some((issue) =>
      Array.isArray(issue.tags) && issue.tags.includes(criterion.id),
    );
    if (alreadyMapped) return;
    const issue: IssueLike = {
      id: `ISSUE_${criterion.id}`,
      title: buildIssueTitle(criterion),
      severity: criterion.status === "missing" ? "high" : "medium",
      recommendation: buildIssueRecommendation(criterion),
      rationale: buildIssueRationale(criterion),
      tags: [criterion.id],
      clauseReference: buildClauseReference(criterion),
    };
    issuesWithChecklistCoverage.push(issue);
  });

  return { issues: issuesWithChecklistCoverage, issueToCriterion };
}

export function validateAnchorTextExists(
  content: string,
  anchorText: string,
): boolean {
  if (!anchorText) return false;
  return content.includes(anchorText.trim());
}

export function ensureDeltaSignals(
  proposedText: string,
  missingSignals: string[],
): { proposedText: string; addedSignals: string[] } {
  const normalizedProposed = normalizeText(proposedText);
  const addedSignals: string[] = [];
  const missingToAdd = missingSignals.filter((signal) => {
    const normalizedSignal = normalizeText(signal);
    return normalizedSignal && !normalizedProposed.includes(normalizedSignal);
  });
  if (missingToAdd.length === 0) {
    return { proposedText, addedSignals };
  }
  addedSignals.push(...missingToAdd);
  const appended = `${proposedText.trim()}\n\nInclude: ${missingToAdd.join("; ")}.`;
  return { proposedText: appended, addedSignals };
}

const buildFallbackProposedText = (criterion: ChecklistCriterion) => {
  const missingSignals = criterion.missingSignals.length
    ? criterion.missingSignals
    : criterion.requiredSignals;
  if (!missingSignals.length) {
    return `${criterion.title}. Add the missing requirement.`;
  }
  return `${criterion.title}. The parties shall address: ${missingSignals.join(
    "; ",
  )}.`;
};

const pickEditCandidate = (
  edit: ProposedEditLike,
  criteria: ChecklistCriterion[],
): { criterionId: string; score: number } | null => {
  const text = `${edit.anchorText ?? ""} ${edit.proposedText ?? ""}`.trim();
  if (!text) return null;
  const normalizedText = normalizeText(text);
  let best: { criterionId: string; score: number } | null = null;

  criteria.forEach((criterion) => {
    let score = 0;
    criterion.requiredSignals.forEach((signal) => {
      const normalizedSignal = normalizeText(signal);
      if (normalizedSignal && normalizedText.includes(normalizedSignal)) {
        score += 1;
      }
    });
    if (score > 0 && (!best || score > best.score)) {
      best = { criterionId: criterion.id, score };
    }
  });

  return best;
};

const ensureReplaceAnchor = (options: {
  content: string;
  anchorHint?: string | null;
  clauseText?: string | null;
  heading?: string | null;
  fallbackText?: string | null;
}) => {
  const { content, anchorHint, clauseText, heading, fallbackText } = options;
  const hintCandidate = anchorHint ? findExactMatchInContent(content, anchorHint) : "";
  if (hintCandidate) return hintCandidate;
  if (heading) {
    const headingCandidate = findExactMatchInContent(content, heading);
    if (headingCandidate) return headingCandidate;
  }
  if (clauseText) {
    const sentences = splitIntoSentences(clauseText);
    for (const sentence of sentences) {
      const match = findExactMatchInContent(content, sentence);
      if (match) return match;
    }
    const clauseMatch = findExactMatchInContent(content, clauseText.slice(0, 200));
    if (clauseMatch) return clauseMatch;
  }
  if (fallbackText) {
    const fallbackMatch = findExactMatchInContent(content, fallbackText);
    if (fallbackMatch) return fallbackMatch;
  }
  return "";
};

export function buildProposedEditsFromChecklist(options: {
  criteria: ChecklistCriterion[];
  issues: IssueLike[];
  existingEdits: ProposedEditLike[];
  evidenceIndex: EvidenceIndex;
  content: string;
  clauses: ClauseExtractionLike[];
}): ChecklistProposedEdit[] {
  const { criteria, issues, existingEdits, evidenceIndex, content, clauses } = options;
  const editsByCriterion = new Map<string, ProposedEditLike[]>();

  existingEdits.forEach((edit) => {
    const mapped = pickEditCandidate(edit, criteria);
    if (!mapped) return;
    const list = editsByCriterion.get(mapped.criterionId) ?? [];
    list.push(edit);
    editsByCriterion.set(mapped.criterionId, list);
  });

  const issuesByCriterion = new Map<string, IssueLike[]>();
  issues.forEach((issue) => {
    const tags = Array.isArray(issue.tags) ? issue.tags : [];
    tags.forEach((tag) => {
      if (!criteria.find((criterion) => criterion.id === tag)) return;
      const list = issuesByCriterion.get(tag) ?? [];
      list.push(issue);
      issuesByCriterion.set(tag, list);
    });
  });

  const results: ChecklistProposedEdit[] = [];

  criteria.forEach((criterion) => {
    if (criterion.status === "met") return;
    const candidateEdits = editsByCriterion.get(criterion.id) ?? [];
    const baseEdit = candidateEdits[0] ?? null;
    const issuesForCriterion = issuesByCriterion.get(criterion.id) ?? [];
    const issueClauseId = issuesForCriterion[0]?.clauseReference?.clauseId ?? null;

    const intent =
      criterion.status === "missing" && !criterion.clauseId
        ? "insert"
        : "replace";

    let proposedText =
      (baseEdit?.proposedText as string | undefined) ??
      buildFallbackProposedText(criterion);
    const deltaResult = ensureDeltaSignals(proposedText, criterion.missingSignals);
    proposedText = deltaResult.proposedText;

    let anchorText =
      typeof baseEdit?.anchorText === "string" ? baseEdit.anchorText : "";
    let clauseId =
      typeof baseEdit?.clauseId === "string"
        ? baseEdit.clauseId
        : criterion.clauseId ?? issueClauseId ?? undefined;

    if (intent === "replace") {
      const clause = clauseId
        ? evidenceIndex.byClauseId.get(normalizeClauseId(clauseId))
        : null;
      const anchorCandidate = ensureReplaceAnchor({
        content,
        anchorHint: anchorText,
        clauseText: clause?.text ?? null,
        heading: clause?.heading ?? criterion.heading ?? null,
        fallbackText: criterion.evidence,
      });
      if (anchorCandidate) {
        anchorText = anchorCandidate;
      }
    } else {
      const insertion = selectInsertionPoint(content, clauses, criterion.insertionPolicyKey);
      anchorText = insertion.anchorText;
      clauseId = insertion.clauseId ?? clauseId;
    }

    if (!anchorText) {
      if (intent === "insert") {
        anchorText = "";
      } else if (
        criterion.evidence &&
        validateAnchorTextExists(content, criterion.evidence)
      ) {
        anchorText = criterion.evidence;
      }
    }

    const id = (baseEdit?.id as string | undefined) ?? `EDIT_${criterion.id}`;
    const rationale =
      (baseEdit as { rationale?: string } | null)?.rationale ??
      `Address checklist item ${criterion.id}.`;

    results.push({
      id,
      clauseId,
      anchorText,
      proposedText,
      intent,
      rationale,
    });
  });

  return results;
}

export function buildEvidenceContext(options: {
  playbook: ContractPlaybook;
  clauses: ClauseExtractionLike[];
  content: string;
}) {
  const evidenceIndex = buildEvidenceIndex({
    clauses: options.clauses,
    content: options.content,
  });
  const criteria = buildChecklistCriteria(options.playbook, evidenceIndex);
  return { evidenceIndex, criteria };
}
