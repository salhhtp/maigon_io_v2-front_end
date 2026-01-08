import { describe, it, expect } from "vitest";
import { CONTRACT_PLAYBOOKS } from "../../shared/ai/playbooks";
import { buildEvidenceIndex, resolveEvidence } from "../../shared/ai/evidenceResolver";
import { selectInsertionPoint } from "../../shared/ai/insertionPolicy";
import {
  alignIssuesToChecklist,
  buildChecklistCriteria,
  buildProposedEditsFromChecklist,
  toCriteriaReportEntries,
  validateAnchorTextExists,
  validateIssueClauseReference,
} from "../../shared/ai/reviewAlignment";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function isHeading(line: string): boolean {
  return (
    /^\d+\.\s+[A-Z]/.test(line) ||
    /^[A-Z][A-Z\s,&()-]{3,}$/.test(line)
  );
}

function extractClauses(content: string) {
  const lines = content.split(/\r?\n/);
  const clauses: Array<{
    id: string;
    clauseId: string;
    title: string;
    originalText: string;
    normalizedText: string;
    category?: string;
  }> = [];
  let currentHeading = "Preamble";
  let buffer: string[] = [];

  const pushClause = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (!text) {
      buffer = [];
      return;
    }
    const clauseId = slugify(currentHeading) || `clause-${clauses.length + 1}`;
    clauses.push({
      id: clauseId,
      clauseId,
      title: currentHeading,
      originalText: text,
      normalizedText: text.slice(0, 240),
    });
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isHeading(line) && line.length <= 120) {
      pushClause();
      currentHeading = line.replace(/:\s*$/, "");
      continue;
    }
    buffer.push(line);
  }
  pushClause();
  return clauses;
}

function buildSignalsSentence(signals: string[]): string {
  return signals.map((signal) => `Includes ${signal}.`).join(" ");
}

function buildContractText(
  headingA: string,
  headingB: string,
  signals: string[],
): string {
  return [
    headingA,
    "This clause is intentionally minimal.",
    "",
    headingB,
    buildSignalsSentence(signals),
    "",
    "MISCELLANEOUS",
    "General terms and conditions.",
    "",
    "IN WITNESS WHEREOF",
  ].join("\n");
}

function pickChecklistItem(playbook: (typeof CONTRACT_PLAYBOOKS)[keyof typeof CONTRACT_PLAYBOOKS]) {
  return playbook.checklist.find((item) => item.requiredSignals.length > 0) ?? playbook.checklist[0];
}

function pickChecklistItemWithMultipleSignals(
  playbook: (typeof CONTRACT_PLAYBOOKS)[keyof typeof CONTRACT_PLAYBOOKS],
) {
  return (
    playbook.checklist.find((item) => item.requiredSignals.length >= 2) ??
    pickChecklistItem(playbook)
  );
}

function pickChecklistItemWithTwoHeadings(
  playbook: (typeof CONTRACT_PLAYBOOKS)[keyof typeof CONTRACT_PLAYBOOKS],
) {
  return (
    playbook.checklist.find((item) => (item.evidenceMapping.headings?.length ?? 0) >= 2) ??
    playbook.checklist[0]
  );
}

describe("Checklist alignment", () => {
  it("covers every checklist item per playbook", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItem(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const content = buildContractText(heading, heading, []);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const criteria = buildChecklistCriteria(playbook, evidenceIndex);
      const reportEntries = toCriteriaReportEntries(criteria);
      expect(reportEntries).toHaveLength(playbook.checklist.length);
    });
  });

  it("aggregates evidence across related headings", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItemWithTwoHeadings(playbook);
      const headings = item.evidenceMapping.headings ?? ["GENERAL", "DETAILS"];
      const content = buildContractText(headings[0], headings[1] ?? headings[0], item.requiredSignals);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const bundle = resolveEvidence(item, evidenceIndex);
      expect(bundle.status).not.toBe("missing");
      expect(bundle.matchedSignals.length).toBeGreaterThan(0);
    });
  });

  it("rejects borrowed excerpts for issues", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItemWithTwoHeadings(playbook);
      const headings = item.evidenceMapping.headings ?? ["GENERAL", "DETAILS"];
      const content = buildContractText(headings[0], headings[1] ?? headings[0], item.requiredSignals);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const clauseA = clauses[0];
      const clauseB = clauses[1] ?? clauses[0];
      const issue = {
        id: `issue-${playbook.key}`,
        title: item.title,
        recommendation: "Fix this requirement.",
        clauseReference: {
          clauseId: clauseA.clauseId,
          excerpt: clauseB.originalText,
        },
      };
      const validation = validateIssueClauseReference(issue, evidenceIndex);
      expect(validation.valid).toBe(false);
    });
  });

  it("selects deterministic insertion anchors", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItem(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const content = buildContractText(heading, heading, []);
      const clauses = extractClauses(content);
      const first = selectInsertionPoint(content, clauses, item.insertionPolicyKey);
      const second = selectInsertionPoint(content, clauses, item.insertionPolicyKey);
      expect(first.anchorText).toBe(second.anchorText);
      expect(first.clauseId).toBe(second.clauseId);
    });
  });

  it("ensures replace anchors exist in the contract", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItemWithMultipleSignals(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const partialSignals = item.requiredSignals.slice(0, 1);
      const content = buildContractText(heading, heading, partialSignals);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const criteria = buildChecklistCriteria(playbook, evidenceIndex);
      const { issues } = alignIssuesToChecklist({
        issues: [],
        criteria,
        evidenceIndex,
      });
      const edits = buildProposedEditsFromChecklist({
        criteria,
        issues,
        existingEdits: [],
        evidenceIndex,
        content,
        clauses,
      });
      const editForItem = edits.find((edit) => edit.id === `EDIT_${item.id}`);
      if (editForItem?.intent === "replace") {
        expect(validateAnchorTextExists(content, editForItem.anchorText ?? "")).toBe(true);
      }
    });
  });

  it("ensures proposed edits add missing required signals", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItemWithMultipleSignals(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const content = buildContractText(heading, heading, []);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const criteria = buildChecklistCriteria(playbook, evidenceIndex);
      const { issues } = alignIssuesToChecklist({
        issues: [],
        criteria,
        evidenceIndex,
      });
      const edits = buildProposedEditsFromChecklist({
        criteria,
        issues,
        existingEdits: [],
        evidenceIndex,
        content,
        clauses,
      });
      const edit = edits.find((entry) => entry.id === `EDIT_${item.id}`);
      expect(edit).toBeTruthy();
      if (edit) {
        item.requiredSignals.forEach((signal) => {
          expect(edit.proposedText?.toLowerCase()).toContain(signal.toLowerCase());
        });
      }
    });
  });

  it("avoids placeholder drafting text in proposed edits", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItem(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const content = buildContractText(heading, heading, []);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const criteria = buildChecklistCriteria(playbook, evidenceIndex);
      const { issues } = alignIssuesToChecklist({
        issues: [],
        criteria,
        evidenceIndex,
      });
      const edits = buildProposedEditsFromChecklist({
        criteria,
        issues,
        existingEdits: [],
        evidenceIndex,
        content,
        clauses,
      });
      edits.forEach((edit) => {
        const text = edit.proposedText?.toLowerCase() ?? "";
        expect(text).not.toMatch(/include:/i);
        expect(text).not.toMatch(/shall address/i);
        expect(text).not.toMatch(/add or clarify/i);
        expect(text).not.toMatch(/not present/i);
      });
    });
  });

  it("keeps one issue per missing or attention checklist item", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItem(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const content = buildContractText(heading, heading, []);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const criteria = buildChecklistCriteria(playbook, evidenceIndex);
      const { issues } = alignIssuesToChecklist({
        issues: [],
        criteria,
        evidenceIndex,
      });
      const unmetCriteria = criteria.filter((criterion) => !criterion.met);
      unmetCriteria.forEach((criterion) => {
        const hasIssue = issues.some(
          (issue) => Array.isArray(issue.tags) && issue.tags.includes(criterion.id),
        );
        expect(hasIssue).toBe(true);
      });
    });
  });

  it("avoids placeholder drafting notes in proposed edits", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      const item = pickChecklistItem(playbook);
      const heading = item.evidenceMapping.headings?.[0] ?? "GENERAL";
      const content = buildContractText(heading, heading, []);
      const clauses = extractClauses(content);
      const evidenceIndex = buildEvidenceIndex({ clauses, content });
      const criteria = buildChecklistCriteria(playbook, evidenceIndex);
      const { issues } = alignIssuesToChecklist({
        issues: [],
        criteria,
        evidenceIndex,
      });
      const edits = buildProposedEditsFromChecklist({
        criteria,
        issues,
        existingEdits: [],
        evidenceIndex,
        content,
        clauses,
      });
      const edit = edits.find((entry) => entry.id === `EDIT_${item.id}`);
      if (edit?.proposedText) {
        expect(edit.proposedText).not.toMatch(/include:/i);
        expect(edit.proposedText).not.toMatch(/shall address/i);
      }
    });
  });
});
