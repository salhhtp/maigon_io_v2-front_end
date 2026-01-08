import type { ClauseExtractionLike, ClauseLocationLike } from "./reliability.ts";

export type InsertionPolicyResult = {
  policyKey: string;
  anchorText: string;
  clauseId?: string;
  locationHint?: ClauseLocationLike | null;
};

type ParsedPolicy =
  | { type: "before_heading" | "after_heading"; targets: string[] }
  | { type: "after_clause"; clauseId: string }
  | { type: "before_signature_block" };

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isHeadingLine = (line: string) => {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^(section|article)\s+\d+/i.test(trimmed)) return true;
  if (/^[A-Z0-9][A-Z0-9\s\-(),.&]{3,}$/.test(trimmed)) return true;
  if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed)) return true;
  return false;
};

const parsePolicyKey = (key: string): ParsedPolicy | null => {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed === "before_signature_block") {
    return { type: "before_signature_block" };
  }
  const [prefix, rest] = trimmed.split(":", 2);
  if ((prefix === "before_heading" || prefix === "after_heading") && rest) {
    const targets = rest
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return targets.length > 0 ? { type: prefix, targets } : null;
  }
  if (prefix === "after_clause" && rest) {
    return { type: "after_clause", clauseId: rest.trim() };
  }
  return null;
};

const findHeadingLine = (
  lines: string[],
  target: string,
): { line: string; index: number } | null => {
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;
  let best: { line: string; index: number } | null = null;
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const normalizedLine = normalizeText(trimmed);
    if (!normalizedLine) return;
    if (
      normalizedLine.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedLine)
    ) {
      if (!best || index < best.index) {
        best = { line: trimmed, index };
      }
    }
  });
  return best;
};

const findSignatureLine = (lines: string[]) => {
  const signaturePatterns = [
    /IN WITNESS WHEREOF/i,
    /SIGNATURES?/i,
    /EXECUTED/i,
  ];
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (signaturePatterns.some((pattern) => pattern.test(trimmed))) {
      return { line: trimmed, index: i };
    }
  }
  return null;
};

const findClauseById = (
  clauses: ClauseExtractionLike[],
  clauseId: string,
) => {
  const normalized = clauseId.toLowerCase().trim();
  return (
    clauses.find((clause) =>
      (clause.clauseId ?? clause.id ?? "").toString().toLowerCase().trim() ===
        normalized,
    ) ?? null
  );
};

const pickFallbackAnchor = (lines: string[]) => {
  const heading = lines.find((line) => isHeadingLine(line));
  if (heading) return heading.trim();
  const firstNonEmpty = lines.find((line) => line.trim().length > 0);
  return firstNonEmpty ? firstNonEmpty.trim() : "";
};

const ensureAnchorExists = (content: string, anchor: string, raw: string) => {
  if (anchor && content.includes(anchor)) return anchor;
  if (raw && content.includes(raw)) return raw;
  return anchor || raw;
};

export function selectInsertionPoint(
  content: string,
  clauses: ClauseExtractionLike[],
  policyKey: string,
): InsertionPolicyResult {
  const lines = content.split(/\r?\n/);
  const parsed = parsePolicyKey(policyKey);
  let anchor = "";
  let clauseId: string | undefined;
  let locationHint: ClauseLocationLike | null | undefined;

  if (parsed?.type === "before_signature_block") {
    const signature = findSignatureLine(lines);
    if (signature) {
      anchor = signature.line;
    }
  }

  if (parsed?.type === "after_clause") {
    const clause = findClauseById(clauses, parsed.clauseId);
    if (clause) {
      const title = clause.title ?? clause.clauseId ?? clause.id ?? "";
      if (title) {
        const match = findHeadingLine(lines, title);
        if (match) {
          anchor = match.line;
          clauseId = (clause.clauseId ?? clause.id ?? "").toString();
          locationHint = clause.location ?? null;
        }
      }
    }
  }

  if (parsed && (parsed.type === "before_heading" || parsed.type === "after_heading")) {
    for (const target of parsed.targets) {
      const match = findHeadingLine(lines, target);
      if (match) {
        anchor = match.line;
        const matchedClause = clauses.find((clause) => {
          const heading = clause.title ?? "";
          return normalizeText(heading).includes(normalizeText(match.line));
        });
        clauseId =
          matchedClause?.clauseId ??
          matchedClause?.id ??
          clauseId;
        locationHint = matchedClause?.location ?? locationHint ?? null;
        break;
      }
    }
  }

  if (!anchor) {
    anchor = pickFallbackAnchor(lines);
  }

  const anchorText = ensureAnchorExists(content, anchor, anchor);

  return {
    policyKey,
    anchorText: anchorText || anchor || "",
    clauseId,
    locationHint: locationHint ?? null,
  };
}
