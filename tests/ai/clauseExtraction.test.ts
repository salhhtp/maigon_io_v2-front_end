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

  it("does not bind remedies issues to compelled-disclosure clauses", () => {
    const clauses: ClauseExtraction[] = [
      {
        id: "exceptions",
        clauseId: "exceptions",
        title: "Exceptions",
        category: "confidential_information",
        originalText:
          "If disclosure is required by law, the Receiving Party shall notify Discloser and assist in seeking a protective order or other appropriate remedy.",
        normalizedText:
          "If disclosure is required by law, the Receiving Party shall notify Discloser and assist in seeking a protective order or other appropriate remedy.",
        importance: "high",
        location: {
          page: null,
          section: "Exceptions",
          paragraph: null,
          clauseNumber: "exceptions",
        },
        references: ["segment 5"],
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
          id: "ISS-REMEDIES",
          title: "Remedies: Injunctive relief and specific performance not specified",
          category: "Remedies",
          severity: "critical",
          tags: ["injunctive-relief", "remedies", "specific-performance"],
          recommendation:
            "Insert explicit injunctive relief and specific performance language.",
          rationale:
            "Without injunctive relief or specific performance, urgent breaches may not be promptly remedied.",
          clauseReference: {
            clauseId: "exceptions",
            heading: "Exceptions",
            excerpt:
              "assist in seeking a protective order or other appropriate remedy",
            locationHint: {
              page: null,
              section: "Exceptions",
              paragraph: null,
              clauseNumber: "exceptions",
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
      content: clauses[0].originalText,
      playbook,
    });

    const issue = result.issuesToAddress[0];
    expect(issue.clauseReference?.clauseId).not.toBe("exceptions");
    expect(issue.clauseReference?.excerpt).toBe("Not present in contract");
  });

  it("binds IP/no-license issues to clauses with intellectual property language", () => {
    const clauses: ClauseExtraction[] = [
      {
        id: "no-binding",
        clauseId: "no-binding",
        title: "No Binding Commitments",
        category: "confidential_information",
        originalText:
          "No license under any trademark, patent, copyright, trade secret or other intellectual property right is granted or implied by disclosure of Confidential Information.",
        normalizedText:
          "No license under any trademark, patent, copyright, trade secret or other intellectual property right is granted or implied by disclosure of Confidential Information.",
        importance: "high",
        location: {
          page: null,
          section: "No Binding Commitments",
          paragraph: null,
          clauseNumber: "no-binding",
        },
        references: ["segment 6"],
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
          id: "ISS-IP",
          title: "IP ownership/no license: unclear transfer/license of IP rights",
          category: "IP & no license",
          severity: "high",
          tags: ["IP", "license", "ownership"],
          recommendation:
            "Insert express provision: no transfer of IP ownership; no license to use Confidential Information beyond the agreed purpose.",
          rationale: "IP/no-license language is missing.",
          clauseReference: {
            clauseId: "missing-ip-no-license",
            heading: "IP & no license",
            excerpt: "Not present in contract",
            locationHint: {
              page: null,
              section: "IP & no license",
              paragraph: null,
              clauseNumber: "missing-ip-no-license",
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
      content: clauses[0].originalText,
      playbook,
    });

    const issue = result.issuesToAddress[0];
    expect(issue.clauseReference?.clauseId).toBe("no-binding");
    expect(issue.clauseReference?.excerpt).not.toBe("Not present in contract");
  });
});
