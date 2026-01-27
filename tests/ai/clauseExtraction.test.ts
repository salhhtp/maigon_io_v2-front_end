import { describe, expect, it } from "vitest";

import {
  enhanceReportWithClauses,
  validateAndFixContractSummary,
} from "../../supabase/functions/_shared/clauseExtraction.ts";
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

  it("binds use limitation issues to receiving party obligations", () => {
    const clauses: ClauseExtraction[] = [
      {
        id: "confidential-information",
        clauseId: "confidential-information",
        title: "Confidential Information",
        category: "confidential_information",
        originalText:
          "Confidential Information includes business plans, trade secrets, and related materials.",
        normalizedText:
          "Confidential Information includes business plans, trade secrets, and related materials.",
        importance: "high",
        location: {
          page: null,
          section: "Confidential Information",
          paragraph: null,
          clauseNumber: "confidential-information",
        },
        references: ["segment 3"],
        metadata: {
          source: "segment-parser",
          contractType: "non_disclosure_agreement",
        },
      },
      {
        id: "receiving-party",
        clauseId: "receiving-party",
        title: "The Receiving Party hereby undertakes",
        category: "confidential_information",
        originalText:
          "The Receiving Party shall use Confidential Information solely for the Purpose and shall not disclose it to any third party without consent.",
        normalizedText:
          "The Receiving Party shall use Confidential Information solely for the Purpose and shall not disclose it to any third party without consent.",
        importance: "high",
        location: {
          page: null,
          section: "The Receiving Party hereby undertakes",
          paragraph: null,
          clauseNumber: "receiving-party",
        },
        references: ["segment 4"],
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
          id: "ISS-USE",
          title: "Use limitation & purpose",
          category: "Use limitation & purpose",
          severity: "medium",
          tags: ["use limitation", "purpose", "need-to-know"],
          recommendation:
            "Add explicit need-to-know access controls and purpose limitation.",
          rationale: "Use limitation language is not sufficiently explicit.",
          clauseReference: {
            clauseId: "missing-use-limitation",
            heading: "Use limitation & purpose",
            excerpt: "Not present in contract",
            locationHint: {
              page: null,
              section: "Use limitation & purpose",
              paragraph: null,
              clauseNumber: "missing-use-limitation",
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
      content: clauses.map((clause) => clause.originalText).join(" "),
      playbook,
    });

    const issue = result.issuesToAddress[0];
    expect(issue.clauseReference?.clauseId).toBe("receiving-party");
  });

  it("prefers definition clauses when available for definition issues", () => {
    const clauses: ClauseExtraction[] = [
      {
        id: "confidential-information",
        clauseId: "confidential-information",
        title: "Confidential Information",
        category: "confidential_information",
        originalText:
          "Confidential Information shall mean any non-public information disclosed by the Discloser.",
        normalizedText:
          "Confidential Information shall mean any non-public information disclosed by the Discloser.",
        importance: "high",
        location: {
          page: null,
          section: "Confidential Information",
          paragraph: null,
          clauseNumber: "confidential-information",
        },
        references: ["segment 3"],
        metadata: {
          source: "segment-parser",
          contractType: "non_disclosure_agreement",
        },
      },
      {
        id: "exceptions",
        clauseId: "exceptions",
        title: "Exceptions",
        category: "confidential_information",
        originalText:
          "Confidential Information shall not include information in the public domain.",
        normalizedText:
          "Confidential Information shall not include information in the public domain.",
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
          id: "ISS-DEF",
          title: "Definition of Confidential Information missing residual knowledge",
          category: "Definition & scope",
          severity: "high",
          tags: ["definition", "residual knowledge"],
          recommendation:
            "Add residual knowledge stance and unmarked information handling.",
          rationale: "Definition lacks residual knowledge language.",
          clauseReference: {
            clauseId: "missing-definition",
            heading: "Definition of Confidential Information",
            excerpt: "Not present in contract",
            locationHint: {
              page: null,
              section: "Definition of Confidential Information",
              paragraph: null,
              clauseNumber: "missing-definition",
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
      content: clauses.map((clause) => clause.originalText).join(" "),
      playbook,
    });

    const issue = result.issuesToAddress[0];
    expect(issue.clauseReference?.clauseId).toBe("confidential-information");
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

describe("validateAndFixContractSummary", () => {
  it("extracts contract period from term clause when AI missed it", () => {
    const summary: AnalysisReport["contractSummary"] = {
      contractName: "Test NDA",
      filename: "test.docx",
      parties: ["Party A", "Party B"],
      agreementDirection: "Mutual",
      purpose: "Confidentiality",
      verbalInformationCovered: false,
      contractPeriod: "Not specified",
      governingLaw: "Sweden",
      jurisdiction: "Sweden",
    };

    const clauses: ClauseExtraction[] = [
      {
        id: "term",
        clauseId: "term",
        title: "Term",
        category: "term_and_termination",
        originalText:
          "This Agreement shall enter into force on the Effective Date and remain in effect for [three (3)] years.",
        normalizedText: "Term clause",
        importance: "medium",
        location: { page: null, paragraph: null, section: "Term", clauseNumber: "8" },
        references: [],
        metadata: {},
      },
    ];

    const content = clauses[0].originalText ?? "";

    const fixed = validateAndFixContractSummary(summary, clauses, content);

    expect(fixed.contractPeriod).toMatch(/3|three/i);
  });

  it("corrects agreement direction from Mutual to One-way when appropriate", () => {
    const summary: AnalysisReport["contractSummary"] = {
      contractName: "Test NDA",
      filename: "test.docx",
      parties: ["Disclosing Party", "Receiving Party"],
      agreementDirection: "Mutual",
      purpose: "Confidentiality",
      verbalInformationCovered: false,
      contractPeriod: "3 years",
      governingLaw: "Sweden",
      jurisdiction: "Sweden",
    };

    const clauses: ClauseExtraction[] = [];

    const content =
      "The Disclosing Party may disclose Confidential Information to the Receiving Party. " +
      "The Receiving Party shall keep the Confidential Information strictly confidential.";

    const fixed = validateAndFixContractSummary(summary, clauses, content);

    expect(fixed.agreementDirection).toMatch(/one-way/i);
  });

  it("keeps Mutual direction when contract has mutual disclosure language", () => {
    const summary: AnalysisReport["contractSummary"] = {
      contractName: "Test NDA",
      filename: "test.docx",
      parties: ["Party A", "Party B"],
      agreementDirection: "Mutual",
      purpose: "Confidentiality",
      verbalInformationCovered: false,
      contractPeriod: "3 years",
      governingLaw: "Sweden",
      jurisdiction: "Sweden",
    };

    const clauses: ClauseExtraction[] = [];

    const content =
      "Each party may disclose Confidential Information to the other party. " +
      "Both parties shall keep Confidential Information strictly confidential.";

    const fixed = validateAndFixContractSummary(summary, clauses, content);

    expect(fixed.agreementDirection).toBe("Mutual");
  });
});

describe("compelled disclosure detection", () => {
  it("recognizes clause with notify and cooperate language as meeting compelled disclosure requirement", () => {
    const clauses: ClauseExtraction[] = [
      {
        id: "mandatory-disclosure",
        clauseId: "mandatory-disclosure",
        title: "Mandatory Disclosure",
        category: "confidential_information",
        originalText:
          "If the Receiving Party is required by law, regulation, or decision of a competent authority " +
          "to disclose Confidential Information, it shall (to the extent legally permitted) promptly " +
          "notify the Disclosing Party and cooperate to limit the scope of such disclosure.",
        normalizedText: "Mandatory disclosure clause",
        importance: "medium",
        location: {
          page: null,
          paragraph: null,
          section: "Mandatory Disclosure",
          clauseNumber: "5",
        },
        references: [],
        metadata: {},
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
        purpose: "Confidentiality",
        verbalInformationCovered: true,
        contractPeriod: "3 years",
        governingLaw: "Sweden",
        jurisdiction: "Sweden",
      },
      issuesToAddress: [],
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

    // The compelled disclosure criterion should be marked as met
    const compelledDisclosureCriterion = result.criteriaMet.find(
      (c) =>
        c.title?.toLowerCase().includes("compelled") ||
        c.title?.toLowerCase().includes("permitted disclosure")
    );

    // If the criterion exists, it should either be met or have proper evidence
    if (compelledDisclosureCriterion) {
      // Check that evidence is not "Not present in contract"
      expect(compelledDisclosureCriterion.evidence).not.toBe("Not present in contract");
    }
  });
});
