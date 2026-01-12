import { describe, expect, it } from "vitest";

import { enhanceReportWithClauses } from "../../supabase/functions/_shared/clauseExtraction.ts";
import { resolvePlaybook } from "../../supabase/functions/_shared/playbooks.ts";
import type { AnalysisReport, ClauseExtraction } from "../../supabase/functions/_shared/reviewSchema.ts";

describe("clauseExtraction", () => {
  it("binds term/survival issues to a term clause when evidence is missing", () => {
    const clauses: ClauseExtraction[] = [
      {
        id: "term-and-termination",
        clauseId: "term-and-termination",
        title: "term and termination",
        category: "term_and_termination",
        originalText:
          "This Agreement enters into force upon signing and will be valid indefinitely.",
        normalizedText:
          "This Agreement enters into force upon signing and will be valid indefinitely.",
        importance: "high",
        location: {
          page: null,
          section: "term and termination",
          paragraph: null,
          clauseNumber: "term-and-termination",
        },
        references: ["segment 7"],
        metadata: {
          source: "segment-parser",
          contractType: "non_disclosure_agreement",
        },
      },
    ];

    const report: AnalysisReport = {
      version: "v3",
      generatedAt: "2026-01-12T00:00:00Z",
      generalInformation: {
        complianceScore: 0,
        selectedPerspective: "nda",
        reviewTimeSeconds: 0,
        timeSavingsMinutes: 0,
        reportExpiry: "Not specified",
      },
      contractSummary: {
        contractName: "Test NDA",
        filename: "test-nda.txt",
        parties: ["Company A", "Company B"],
        agreementDirection: "Mutual",
        purpose: "Confidentiality for evaluation",
        verbalInformationCovered: true,
        contractPeriod: "Indefinite",
        governingLaw: "Not specified",
        jurisdiction: "Not specified",
      },
      issuesToAddress: [
        {
          id: "ISS-1",
          title:
            "Term & survival: Fixed-term for non-trade-secret CI required; survival for trade secrets",
          category: "Term & Survival",
          severity: "high",
          tags: ["term", "survival", "non_trade_secret"],
          recommendation:
            "Insert a fixed term for non-trade-secret Confidential Information (2-5 years) and specify post-termination survival for trade secrets.",
          rationale:
            "Align with playbook requirements for term and survival; avoid perpetual obligations for non-confidential information.",
          clauseReference: {
            clauseId: "missing-term-survival",
            heading: "Term & survival",
            excerpt: "Not present in contract",
            locationHint: {
              page: null,
              section: "term_and_termination",
              paragraph: null,
              clauseNumber: "7",
            },
          },
        },
      ],
      criteriaMet: [],
      clauseFindings: [],
      proposedEdits: [],
      metadata: {
        model: "test",
        modelCategory: "default",
        playbookKey: "non_disclosure_agreement",
      },
      playbookInsights: [],
      clauseExtractions: [],
      similarityAnalysis: [],
      deviationInsights: [],
      actionItems: [],
      draftMetadata: null,
    };

    const playbook = resolvePlaybook("nda");
    const result = enhanceReportWithClauses(report, {
      clauses,
      content:
        "This Agreement enters into force upon signing and will be valid indefinitely.",
      playbook,
    });

    const issue = result.issuesToAddress[0];
    expect(issue.clauseReference?.clauseId).toBe("term-and-termination");
    expect(issue.clauseReference?.excerpt).not.toBe("Not present in contract");
  });
});
