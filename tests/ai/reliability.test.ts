import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONTRACT_PLAYBOOKS } from "../../shared/ai/playbooks";
import {
  bindProposedEditsToClauses,
  buildEvidenceExcerpt,
  buildUniqueEvidenceExcerpt,
  checkEvidenceMatch,
  checkEvidenceMatchAgainstClause,
  dedupeIssues,
  dedupeProposedEdits,
  evaluatePlaybookCoverageFromContent,
  findRequirementMatch,
  isMissingEvidenceMarker,
  normaliseReportExpiry,
  resolveClauseMatch,
  tokenizeForMatch,
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

  it("excludes optional anchors from coverage scoring", () => {
    const clauses = [
      {
        id: "remedies",
        clauseId: "remedies",
        title: "Remedies",
        originalText:
          "The Discloser may seek injunctive relief and other remedies at law.",
        normalizedText:
          "The Discloser may seek injunctive relief and other remedies at law.",
      },
    ];
    const content = clauses[0].originalText;
    const playbook = {
      clauseAnchors: [
        "Remedies / injunctive relief",
        "Export control / sanctions (if relevant)",
      ],
      criticalClauses: [],
    };

    const coverage = evaluatePlaybookCoverageFromContent(playbook, {
      content,
      clauses,
    });

    expect(coverage.anchorCoverage).toHaveLength(2);
    expect(coverage.coverageScore).toBe(1);
  });

  it("matches structural requirements with synonyms", () => {
    const clauses = [
      {
        id: "exceptions",
        clauseId: "exceptions",
        title: "Exceptions",
        originalText:
          "If the Receiving Party is required by law or court order to disclose Confidential Information, it shall promptly notify the Discloser and seek a protective order before disclosure.",
        normalizedText:
          "If the Receiving Party is required by law or court order to disclose Confidential Information, it shall promptly notify the Discloser and seek a protective order before disclosure.",
      },
      {
        id: "return-destruction",
        clauseId: "return-destruction",
        title: "Return/Destruction",
        originalText:
          "Upon request, the Receiving Party shall return or destroy all Confidential Information, including backups and archives, and certify destruction in writing.",
        normalizedText:
          "Upon request, the Receiving Party shall return or destroy all Confidential Information, including backups and archives, and certify destruction in writing.",
      },
    ];
    const content = clauses.map((clause) => clause.originalText).join(" ");

    const compelled = findRequirementMatch(
      "Compelled disclosure prompt notice protective order",
      clauses,
      content,
    );
    expect(compelled.met).toBe(true);

    const returnDestroy = findRequirementMatch(
      "Return/Destroy obligations backups certificate",
      clauses,
      content,
    );
    expect(returnDestroy.met).toBe(true);
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

  it("normalizes anchor text to an exact clause excerpt", () => {
    const clauses = [
      {
        id: "term-and-termination",
        clauseId: "term-and-termination",
        title: "term and termination",
        originalText:
          "This Agreement enters into force upon signing and will be valid indefinitely.",
        normalizedText:
          "This Agreement enters into force upon signing and will be valid indefinitely.",
      },
    ];
    const proposedEdits = [
      {
        id: "edit-term",
        clauseId: "term-and-termination",
        anchorText:
          "term and termination (term and termination) -> This Agreement enters into force upon signing and will be valid indefinitely.",
        proposedText: "Replace term.",
        intent: "replace",
      },
    ];

    const bound = bindProposedEditsToClauses({
      proposedEdits,
      issues: [],
      clauses,
    });

    expect(bound[0].anchorText).toBe(
      "This Agreement enters into force upon signing and will be valid indefinitely.",
    );
  });

  it("rebinds definition edits to the definition clause when anchor text is elsewhere", () => {
    const clauses = [
      {
        id: "confidential-information",
        clauseId: "confidential-information",
        title: "Confidential Information",
        originalText:
          "Confidential Information means any information disclosed by the Discloser.",
        normalizedText:
          "Confidential Information means any information disclosed by the Discloser.",
      },
      {
        id: "receiving-party",
        clauseId: "receiving-party",
        title: "Obligations of Receiving Party",
        originalText:
          "The Receiving Party shall not disclose Confidential Information to third parties.",
        normalizedText:
          "The Receiving Party shall not disclose Confidential Information to third parties.",
      },
    ];
    const proposedEdits = [
      {
        id: "edit-definition",
        clauseId: "receiving-party",
        anchorText:
          "The Receiving Party shall not disclose Confidential Information to third parties.",
        proposedText:
          "Confidential Information shall mean any information marked or designated as confidential.",
        intent: "insert",
      },
    ];

    const bound = bindProposedEditsToClauses({
      proposedEdits,
      issues: [],
      clauses,
    });

    expect(bound[0].clauseId).toBe("confidential-information");
  });

  it("rebinds remedies edits to a remedies clause over compelled-disclosure text", () => {
    const clauses = [
      {
        id: "exceptions",
        clauseId: "exceptions",
        title: "Exceptions",
        originalText:
          "If disclosure is required by law, the Receiving Party shall notify Discloser and assist in seeking a protective order or other appropriate remedy.",
        normalizedText:
          "If disclosure is required by law, the Receiving Party shall notify Discloser and assist in seeking a protective order or other appropriate remedy.",
      },
      {
        id: "remedies",
        clauseId: "remedies",
        title: "Remedies",
        originalText:
          "The Discloser may seek injunctive relief and specific performance for any breach.",
        normalizedText:
          "The Discloser may seek injunctive relief and specific performance for any breach.",
      },
    ];
    const proposedEdits = [
      {
        id: "edit-remedies",
        clauseId: "exceptions",
        anchorText:
          "assist in seeking a protective order or other appropriate remedy",
        proposedText:
          "Remedies. The Discloser shall have the right to seek injunctive relief and specific performance in addition to other remedies.",
        intent: "insert",
      },
    ];

    const bound = bindProposedEditsToClauses({
      proposedEdits,
      issues: [],
      clauses,
    });

    expect(bound[0].clauseId).toBe("remedies");
  });

  it("replaces missing anchor text when a clause match exists", () => {
    const clauses = [
      {
        id: "confidentiality",
        clauseId: "confidentiality",
        title: "Confidentiality",
        originalText:
          "The Receiving Party shall return or destroy Confidential Information upon request.",
        normalizedText:
          "The Receiving Party shall return or destroy Confidential Information upon request.",
      },
    ];
    const proposedEdits = [
      {
        id: "edit-return",
        clauseId: "confidentiality",
        anchorText: "Not present in contract",
        proposedText: "Return or destroy Confidential Information.",
        intent: "insert",
      },
    ];

    const bound = bindProposedEditsToClauses({
      proposedEdits,
      issues: [],
      clauses,
    });

    expect(bound[0].anchorText).not.toBe("Not present in contract");
    expect(
      clauses[0].originalText.includes(bound[0].anchorText),
    ).toBe(true);
  });

  it("matches short query signals within long clauses", () => {
    const clauses = [
      {
        id: "confidentiality",
        clauseId: "confidentiality",
        title: "Confidentiality Undertakings",
        originalText:
          "The Receiving Party shall not use any Confidential Information for any purpose other than the Project and shall apply sufficient security measures and degree of care.",
        normalizedText:
          "The Receiving Party shall not use any Confidential Information for any purpose other than the Project and shall apply sufficient security measures and degree of care.",
      },
    ];

    const match = resolveClauseMatch({
      clauseReference: null,
      fallbackText: "Purpose/use limitation",
      clauses,
    });

    expect(match.match?.clauseId).toBe("confidentiality");
    expect(match.confidence).toBeGreaterThan(0.15);
  });

  it("avoids term/survival matches when no term clause exists", () => {
    const clauses = [
      {
        id: "definition",
        clauseId: "definition",
        title: "Confidential Information",
        originalText:
          "Confidential Information includes trade secrets and proprietary information.",
        normalizedText:
          "Confidential Information includes trade secrets and proprietary information.",
      },
    ];
    const content = clauses[0].originalText;
    const match = findRequirementMatch(
      "Term & survival (trade secrets vs other CI)",
      clauses,
      content,
    );
    expect(match.met).toBe(false);
  });

  it("rejects termination rights when the clause forbids termination", () => {
    const clauses = [
      {
        id: "term-and-termination",
        clauseId: "term-and-termination",
        title: "Term and termination",
        originalText:
          "This Agreement cannot be terminated unilaterally by either party.",
        normalizedText:
          "This Agreement cannot be terminated unilaterally by either party.",
      },
    ];
    const content = clauses[0].originalText;
    const match = findRequirementMatch("Termination rights", clauses, content);
    expect(match.met).toBe(false);
  });

  it("requires legal trigger signals for compelled disclosure", () => {
    const clauses = [
      {
        id: "whereas",
        clauseId: "whereas",
        title: "Whereas",
        originalText:
          "The parties may disclose information to support the project discussions.",
        normalizedText:
          "The parties may disclose information to support the project discussions.",
      },
    ];
    const content = clauses[0].originalText;
    const match = findRequirementMatch("Compelled disclosure", clauses, content);
    expect(match.met).toBe(false);
  });

  it("verifies evidence against the matched clause text", () => {
    const ndaContent = readFixture("NDA_Sample.txt");
    const ndaClauses = extractClausesFromSample(ndaContent);
    const obligationsClause = ndaClauses.find((clause) =>
      clause.title.includes("OBLIGATIONS OF RECEIVING PARTY"),
    );
    const remediesClause = ndaClauses.find((clause) =>
      clause.title.includes("REMEDIES"),
    );

    expect(obligationsClause).toBeTruthy();
    expect(remediesClause).toBeTruthy();

    const inClause = checkEvidenceMatchAgainstClause(
      "Use the Confidential Information solely for the Purpose",
      obligationsClause?.originalText ?? "",
    );
    expect(inClause.matched).toBe(true);

    const wrongClause = checkEvidenceMatchAgainstClause(
      "injunction and specific performance",
      obligationsClause?.originalText ?? "",
    );
    expect(wrongClause.matched).toBe(false);
  });

  it("dedupes overlapping issues and edits while keeping higher severity", () => {
    const issues = dedupeIssues([
      {
        id: "issue-1",
        title: "Term and Survival",
        recommendation: "Set a fixed term and survival for trade secrets.",
        severity: "medium",
        clauseReference: { clauseId: "clause-term" },
      },
      {
        id: "issue-2",
        title: "Survival for Trade Secrets",
        recommendation: "Set a fixed term and survival for trade secrets.",
        severity: "high",
        clauseReference: { clauseId: "clause-term" },
      },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe("issue-2");

    const edits = dedupeProposedEdits([
      {
        id: "edit-1",
        clauseId: "clause-term",
        intent: "replace",
        proposedText: "Confidentiality survives 3 years, trade secrets survive indefinitely.",
      },
      {
        id: "edit-2",
        clauseId: "clause-term",
        intent: "replace",
        proposedText: "Confidentiality survives 3 years; trade secrets survive indefinitely.",
      },
    ]);
    expect(edits).toHaveLength(1);
  });

  it("dedupes missing issues across different IDs", () => {
    const issues = dedupeIssues([
      {
        id: "ISS-1",
        title: "Missing remedies clause",
        recommendation: "Add a remedies clause.",
        severity: "medium",
        clauseReference: { clauseId: "missing-remedies" },
      },
      {
        id: "ISS-2",
        title: "Remedies missing",
        recommendation: "Add a remedies clause.",
        severity: "high",
        clauseReference: { clauseId: "missing-injunctive" },
      },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("high");
  });

  it("normalizes invalid report expiry values to ISO dates", () => {
    const normalized = normaliseReportExpiry("Invalid Date");
    expect(Number.isFinite(Date.parse(normalized))).toBe(true);
  });

  it("normalizes clause IDs when binding proposed edits", () => {
    const clauses = [
      {
        id: "Section-7",
        clauseId: "Section-7",
        title: "Section 7",
        originalText: "Payment terms and timing.",
        normalizedText: "Payment terms and timing.",
      },
    ];
    const issues = [
      {
        id: "issue-payment",
        title: "Payment",
        recommendation: "Clarify payment timing.",
        clauseReference: {
          clauseId: "section-7",
          excerpt: "Payment terms",
        },
      },
    ];
    const proposedEdits = [
      {
        id: "edit-1",
        clauseId: "section-7",
        anchorText: "Payment terms",
        proposedText: "Payment is due within 30 days.",
        intent: "replace",
      },
    ];

    const bound = bindProposedEditsToClauses({
      proposedEdits,
      issues,
      clauses,
    });
    expect(bound[0].clauseId).toBe("Section-7");
  });

  it("drops placeholder proposed edits", () => {
    const bound = bindProposedEditsToClauses({
      proposedEdits: [
        {
          id: "edit-placeholder",
          anchorText: "Not present in contract",
          proposedText: "[Insert exact project date]",
          intent: "insert",
        },
      ],
      issues: [],
      clauses: [],
    });
    expect(bound).toHaveLength(0);
  });

  it("fails evidence checks when content is empty", () => {
    const result = checkEvidenceMatch("Any excerpt", "");
    expect(result.matched).toBe(false);
    expect(result.reason).toBe("empty-content");
  });

  it("uses explicit missing-evidence markers only", () => {
    expect(isMissingEvidenceMarker("missing approvals")).toBe(false);
    expect(
      isMissingEvidenceMarker("Evidence not found in contract"),
    ).toBe(true);
  });

  it("retains negation tokens during matching", () => {
    const tokens = tokenizeForMatch("may not disclose");
    expect(tokens).toContain("not");
  });

  it("prefers strong heading matches over weaker text matches", () => {
    const clauses = [
      {
        id: "clause-a",
        clauseId: "clause-a",
        title: "PAYMENT TERMS",
        originalText: "Payment shall be due within 30 days.",
        normalizedText: "Payment shall be due within 30 days.",
      },
      {
        id: "clause-b",
        clauseId: "clause-b",
        title: "CONFIDENTIALITY",
        originalText: "Confidential information must be protected.",
        normalizedText: "Confidential information must be protected.",
      },
    ];

    const match = resolveClauseMatch({
      clauseReference: {
        heading: "PAYMENT TERMS",
        excerpt: "confidential information",
      },
      fallbackText: "",
      clauses,
    });

    expect(match.match?.clauseId).toBe("clause-a");
    expect(match.method).toBe("heading");
  });

  describe("buildUniqueEvidenceExcerpt", () => {
    it("returns unique excerpts when excludeExcerpts is provided", () => {
      const clauseText =
        "This Agreement shall remain in effect for three (3) years from the Effective Date. " +
        "The Receiving Party shall keep all Confidential Information strictly confidential. " +
        "No license or intellectual property rights are granted under this Agreement.";

      const firstExcerpt = buildUniqueEvidenceExcerpt({
        clauseText,
        criterionId: "TERM_SURVIVAL",
        anchorText: "term survival",
      });

      const secondExcerpt = buildUniqueEvidenceExcerpt({
        clauseText,
        criterionId: "IP_NO_LICENSE",
        anchorText: "license intellectual property",
        excludeExcerpts: new Set([firstExcerpt]),
      });

      // Excerpts should be different when excludeExcerpts is used
      expect(firstExcerpt).not.toBe(secondExcerpt);
      // First excerpt should contain term-related content
      expect(firstExcerpt.toLowerCase()).toMatch(/years|term|effect/);
      // Second excerpt should contain IP-related content
      expect(secondExcerpt.toLowerCase()).toMatch(/license|intellectual|rights/);
    });

    it("uses criterion-specific anchor phrases", () => {
      const clauseText =
        "The term of this Agreement is five years. " +
        "All intellectual property rights remain with the Disclosing Party.";

      const termExcerpt = buildUniqueEvidenceExcerpt({
        clauseText,
        criterionId: "TERM_SURVIVAL",
      });

      const ipExcerpt = buildUniqueEvidenceExcerpt({
        clauseText,
        criterionId: "IP_NO_LICENSE",
      });

      expect(termExcerpt.toLowerCase()).toContain("years");
      expect(ipExcerpt.toLowerCase()).toContain("intellectual property");
    });
  });

  describe("redundant edit filtering", () => {
    it("filters out edits that suggest adding existing clause content", () => {
      const clauses = [
        {
          id: "term-clause",
          clauseId: "term-clause",
          title: "Term and Termination",
          originalText:
            "This Agreement shall remain in effect for three (3) years from the Effective Date. " +
            "Confidentiality obligations shall survive termination.",
          normalizedText: "Term and termination clause",
          category: "term_and_termination",
        },
      ];

      const proposedEdits = [
        {
          id: "PE-4",
          anchorText: "Not present in contract",
          proposedText:
            "Term and survival. This Agreement remains in effect for 2 years. " +
            "Obligations survive termination.",
          intent: "insert",
          rationale: "Add term clause",
        },
      ];

      const bound = bindProposedEditsToClauses({
        proposedEdits,
        issues: [],
        clauses,
      });

      // Edit should be filtered out because term clause already exists
      expect(bound).toHaveLength(0);
    });

    it("keeps edits for genuinely missing clauses", () => {
      const clauses = [
        {
          id: "confidentiality",
          clauseId: "confidentiality",
          title: "Confidentiality",
          originalText: "All information shall be kept confidential.",
          normalizedText: "Confidentiality clause",
        },
      ];

      const proposedEdits = [
        {
          id: "PE-1",
          anchorText: "Not present in contract",
          proposedText:
            "Remedies. The Discloser may seek injunctive relief and specific performance.",
          intent: "insert",
          rationale: "Add remedies clause",
        },
      ];

      const bound = bindProposedEditsToClauses({
        proposedEdits,
        issues: [],
        clauses,
      });

      // Edit should be kept because remedies clause doesn't exist
      expect(bound).toHaveLength(1);
    });
  });
});
