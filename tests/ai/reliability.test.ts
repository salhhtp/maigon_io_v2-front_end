import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONTRACT_PLAYBOOKS } from "../../shared/ai/playbooks";
import {
  bindProposedEditsToClauses,
  buildEvidenceExcerpt,
  checkEvidenceMatch,
  evaluatePlaybookCoverageFromContent,
  resolveClauseMatch,
} from "../../shared/ai/reliability";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, "../../test_documents");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

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

function extractClausesFromSample(content: string) {
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

describe("Reliability harness", () => {
  it("anchors NDA issues to real clauses with evidence present in the contract", () => {
    const ndaContent = readFixture("NDA_Sample.txt");
    const ndaClauses = extractClausesFromSample(ndaContent);

    const issues = [
      {
        id: "issue-use",
        title: "Use limitation",
        recommendation: "Limit use to the defined Purpose.",
        clauseReference: {
          heading: "OBLIGATIONS OF RECEIVING PARTY",
          excerpt: "Use the Confidential Information solely for the Purpose",
        },
        expectedHeading: "OBLIGATIONS OF RECEIVING PARTY",
      },
      {
        id: "issue-return",
        title: "Return/Destruction",
        recommendation: "Add return or destruction obligations.",
        clauseReference: {
          heading: "OWNERSHIP AND RETURN OF CONFIDENTIAL INFORMATION",
          excerpt: "return or destroy all Confidential Information",
        },
        expectedHeading: "OWNERSHIP AND RETURN OF CONFIDENTIAL INFORMATION",
      },
      {
        id: "issue-compelled",
        title: "Compelled disclosure",
        recommendation: "Require prompt notice before legal disclosure.",
        clauseReference: {
          heading: "DEFINITION OF CONFIDENTIAL INFORMATION",
          excerpt: "required to be disclosed by law",
        },
        expectedHeading: "DEFINITION OF CONFIDENTIAL INFORMATION",
      },
      {
        id: "issue-remedies",
        title: "Remedies",
        recommendation: "Confirm injunctive relief availability.",
        clauseReference: {
          heading: "REMEDIES",
          excerpt: "injunction and specific performance",
        },
        expectedHeading: "REMEDIES",
      },
      {
        id: "issue-term",
        title: "Term and termination",
        recommendation: "Ensure term and survival clarity.",
        clauseReference: {
          heading: "TERM AND TERMINATION",
          excerpt: "continue for a period of three",
        },
        expectedHeading: "TERM AND TERMINATION",
      },
    ];

    let matchedEvidence = 0;
    issues.forEach((issue) => {
      const match = resolveClauseMatch({
        clauseReference: issue.clauseReference,
        fallbackText: `${issue.title} ${issue.recommendation}`,
        clauses: ndaClauses,
      });
      expect(match.match).toBeTruthy();
      expect(match.confidence).toBeGreaterThan(0.1);
      expect(match.match?.title).toContain(issue.expectedHeading);

      const excerpt = buildEvidenceExcerpt({
        clauseText: match.match?.originalText ?? "",
        anchorText: issue.clauseReference.excerpt,
      });
      const evidence = checkEvidenceMatch(excerpt, ndaContent);
      if (evidence.matched) {
        matchedEvidence += 1;
      }
    });

    const evidenceRatio = matchedEvidence / issues.length;
    expect(evidenceRatio).toBeGreaterThanOrEqual(0.8);
  });

  it("computes playbook coverage from contract content, not model output", () => {
    const dpaContent = readFixture("DPA_Sample.txt");
    const dpaClauses = extractClausesFromSample(dpaContent);
    const playbook = CONTRACT_PLAYBOOKS.data_processing_agreement;

    const coverage = evaluatePlaybookCoverageFromContent(playbook, {
      content: dpaContent,
      clauses: dpaClauses,
    });
    const securityAnchor = coverage.anchorCoverage.find((anchor) =>
      /security measures/i.test(anchor.anchor),
    );
    const subprocessorAnchor = coverage.anchorCoverage.find((anchor) =>
      /sub-processor approvals/i.test(anchor.anchor),
    );

    expect(securityAnchor?.met).toBe(true);
    expect(subprocessorAnchor?.met).toBe(true);

    const emptyCoverage = evaluatePlaybookCoverageFromContent(playbook, {
      content: "",
      clauses: [],
    });
    expect(emptyCoverage.coverageScore).toBe(0);
  });

  it("binds proposed edits to stable clause IDs using issue anchors", () => {
    const ndaContent = readFixture("NDA_Sample.txt");
    const ndaClauses = extractClausesFromSample(ndaContent);

    const issueMatch = resolveClauseMatch({
      clauseReference: {
        heading: "OBLIGATIONS OF RECEIVING PARTY",
        excerpt: "Use the Confidential Information solely for the Purpose",
      },
      fallbackText: "Use limitation for Purpose only",
      clauses: ndaClauses,
    });
    const clauseId = issueMatch.match?.clauseId ?? "";
    expect(clauseId).toBeTruthy();

    const issues = [
      {
        id: "issue-use",
        title: "Use limitation",
        recommendation: "Limit use to the defined Purpose.",
        clauseReference: {
          clauseId,
          heading: "OBLIGATIONS OF RECEIVING PARTY",
          excerpt: "Use the Confidential Information solely for the Purpose",
        },
      },
    ];

    const proposedEdits = [
      {
        id: "edit-1",
        anchorText: "Use the Confidential Information solely for the Purpose",
        proposedText: "Receiving Party shall use Confidential Information only for the Purpose.",
        intent: "replace",
      },
    ];

    const bound = bindProposedEditsToClauses({
      proposedEdits,
      issues,
      clauses: ndaClauses,
    });

    expect(bound[0].clauseId).toBe(clauseId);
  });
});
