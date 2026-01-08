import {
  buildEvidenceExcerpt,
  normalizeAnchorText,
  tokenizeForAnchor,
} from "./reliability";
import type { ClauseExtractionLike, ClauseLocationLike } from "./reliability";
import type { PlaybookChecklistItem } from "./playbooks";

export type EvidenceClause = {
  clauseId: string;
  heading: string;
  text: string;
  normalizedText: string;
  headingNormalized: string;
  locationHint?: ClauseLocationLike | null;
};

export type EvidenceIndex = {
  clauses: EvidenceClause[];
  byClauseId: Map<string, EvidenceClause>;
  byHeading: Map<string, string[]>;
  byTopic: Map<string, string[]>;
  content: string;
};

export type EvidenceRef = {
  clauseId: string;
  heading: string;
  excerpt: string;
  locationHint?: ClauseLocationLike | null;
  matchedSignals: string[];
};

export type EvidenceBundle = {
  status: "met" | "missing" | "attention";
  evidence: string;
  clauseId?: string;
  heading?: string;
  locationHint?: ClauseLocationLike | null;
  matchedSignals: string[];
  missingSignals: string[];
  evidenceRefs: EvidenceRef[];
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeClauseId = (value: string) => value.toLowerCase().trim();

const normalizeSignal = (signal: string) => normalizeText(signal);

const matchSignal = (text: string, normalizedText: string, signal: string) => {
  const trimmed = signal.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("re:")) {
    try {
      const pattern = trimmed.slice(3);
      return new RegExp(pattern, "i").test(text);
    } catch {
      return false;
    }
  }
  if (trimmed.startsWith("/") && trimmed.endsWith("/") && trimmed.length > 2) {
    try {
      return new RegExp(trimmed.slice(1, -1), "i").test(text);
    } catch {
      return false;
    }
  }
  const normalizedSignal = normalizeSignal(trimmed);
  return normalizedSignal.length > 0 && normalizedText.includes(normalizedSignal);
};

const pickAnchorSeed = (item: PlaybookChecklistItem, matchedSignals: string[]) => {
  if (matchedSignals.length > 0) return matchedSignals[0];
  return item.title || item.description || "";
};

const findClauseIdsByHeading = (
  index: EvidenceIndex,
  heading: string,
): string[] => {
  const normalized = normalizeText(heading);
  if (!normalized) return [];
  const matches: string[] = [];
  index.byHeading.forEach((clauseIds, headingKey) => {
    if (headingKey.includes(normalized) || normalized.includes(headingKey)) {
      clauseIds.forEach((clauseId) => matches.push(clauseId));
    }
  });
  return matches;
};

const findClauseIdsByTopic = (
  index: EvidenceIndex,
  topic: string,
): string[] => {
  const normalized = normalizeText(topic);
  if (!normalized) return [];
  const matches: string[] = [];
  index.clauses.forEach((clause) => {
    if (
      clause.headingNormalized.includes(normalized) ||
      clause.normalizedText.includes(normalized)
    ) {
      matches.push(clause.clauseId);
    }
  });
  return matches;
};

const buildEvidenceRefs = (
  item: PlaybookChecklistItem,
  clauses: EvidenceClause[],
  requiredSignals: string[],
): { refs: EvidenceRef[]; matchedSignals: Set<string> } => {
  const refs: EvidenceRef[] = [];
  const matched = new Set<string>();

  clauses.forEach((clause) => {
    const clauseText = clause.text;
    const normalizedClauseText = clause.normalizedText;
    const matchedSignals = requiredSignals.filter((signal) =>
      matchSignal(clauseText, normalizedClauseText, signal),
    );
    if (requiredSignals.length > 0 && matchedSignals.length === 0) return;

    matchedSignals.forEach((signal) => matched.add(signal));

    const anchorSeed = normalizeAnchorText(
      pickAnchorSeed(item, matchedSignals) || item.title,
    );
    const excerpt =
      buildEvidenceExcerpt({
        clauseText,
        anchorText: anchorSeed || item.title,
      }) || clauseText.slice(0, 240);

    refs.push({
      clauseId: clause.clauseId,
      heading: clause.heading,
      excerpt,
      locationHint: clause.locationHint,
      matchedSignals,
    });
  });

  return { refs, matchedSignals: matched };
};

const pickPrimaryEvidence = (
  refs: EvidenceRef[],
  candidateOrder: string[],
): EvidenceRef | null => {
  if (refs.length === 0) return null;
  const scored = refs.map((ref) => ({
    ref,
    score: ref.matchedSignals.length,
    orderIndex: candidateOrder.indexOf(normalizeClauseId(ref.clauseId)),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.orderIndex - b.orderIndex;
  });
  return scored[0]?.ref ?? null;
};

export function buildEvidenceIndex(options: {
  clauses: ClauseExtractionLike[];
  content?: string | null;
}): EvidenceIndex {
  const byClauseId = new Map<string, EvidenceClause>();
  const byHeading = new Map<string, string[]>();
  const byTopic = new Map<string, string[]>();
  const clauses: EvidenceClause[] = [];

  options.clauses.forEach((clause) => {
    const clauseIdRaw =
      typeof clause.clauseId === "string"
        ? clause.clauseId
        : typeof clause.id === "string"
          ? clause.id
          : "";
    const clauseId = clauseIdRaw.trim();
    if (!clauseId) return;
    const heading =
      typeof clause.title === "string" && clause.title.trim().length > 0
        ? clause.title.trim()
        : clauseId;
    const text =
      typeof clause.originalText === "string" && clause.originalText.trim().length > 0
        ? clause.originalText.trim()
        : typeof clause.normalizedText === "string" &&
            clause.normalizedText.trim().length > 0
          ? clause.normalizedText.trim()
          : heading;
    const normalizedText = normalizeText(text);
    const headingNormalized = normalizeText(heading);
    const entry: EvidenceClause = {
      clauseId,
      heading,
      text,
      normalizedText,
      headingNormalized,
      locationHint: clause.location ?? null,
    };
    const normalizedId = normalizeClauseId(clauseId);
    byClauseId.set(normalizedId, entry);
    clauses.push(entry);

    if (headingNormalized) {
      const list = byHeading.get(headingNormalized) ?? [];
      list.push(clauseId);
      byHeading.set(headingNormalized, list);
      tokenizeForAnchor(heading).forEach((token) => {
        const topicList = byTopic.get(token) ?? [];
        topicList.push(clauseId);
        byTopic.set(token, topicList);
      });
    }
  });

  return {
    clauses,
    byClauseId,
    byHeading,
    byTopic,
    content: options.content ?? "",
  };
}

export function resolveEvidence(
  item: PlaybookChecklistItem,
  index: EvidenceIndex,
): EvidenceBundle {
  const requiredSignals = Array.isArray(item.requiredSignals)
    ? item.requiredSignals.filter((signal) => signal && signal.trim().length > 0)
    : [];
  const candidateClauseIds: string[] = [];
  const seen = new Set<string>();
  const pushClauseId = (clauseId: string) => {
    const normalizedId = normalizeClauseId(clauseId);
    if (!normalizedId || seen.has(normalizedId)) return;
    seen.add(normalizedId);
    candidateClauseIds.push(normalizedId);
  };

  item.evidenceMapping?.clauseIds?.forEach((clauseId) => {
    if (index.byClauseId.has(normalizeClauseId(clauseId))) {
      pushClauseId(clauseId);
    }
  });

  item.evidenceMapping?.headings?.forEach((heading) => {
    findClauseIdsByHeading(index, heading).forEach(pushClauseId);
  });

  item.evidenceMapping?.topics?.forEach((topic) => {
    findClauseIdsByTopic(index, topic).forEach(pushClauseId);
  });

  const candidateClauses = candidateClauseIds
    .map((clauseId) => index.byClauseId.get(clauseId))
    .filter(Boolean) as EvidenceClause[];

  let { refs, matchedSignals } = buildEvidenceRefs(
    item,
    candidateClauses,
    requiredSignals,
  );

  if (matchedSignals.size === 0 && requiredSignals.length > 0) {
    const fallback = buildEvidenceRefs(item, index.clauses, requiredSignals);
    if (fallback.matchedSignals.size > 0) {
      refs = fallback.refs;
      matchedSignals = fallback.matchedSignals;
    }
  }

  const matchedSignalsList = Array.from(matchedSignals);
  const missingSignals = requiredSignals.filter(
    (signal) => !matchedSignals.has(signal),
  );

  let status: "met" | "missing" | "attention" = "missing";
  if (requiredSignals.length === 0) {
    status = refs.length > 0 ? "met" : "missing";
  } else if (matchedSignalsList.length === 0) {
    status = "missing";
  } else if (matchedSignalsList.length < requiredSignals.length) {
    status = "attention";
  } else {
    status = "met";
  }

  const primary = pickPrimaryEvidence(refs, candidateClauseIds);
  const evidence = status === "missing" ? "Not present" : primary?.excerpt ?? "";

  return {
    status,
    evidence,
    clauseId: primary?.clauseId,
    heading: primary?.heading,
    locationHint: primary?.locationHint,
    matchedSignals: matchedSignalsList,
    missingSignals,
    evidenceRefs: refs,
  };
}
