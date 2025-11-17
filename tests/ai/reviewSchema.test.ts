import { describe, it, expect } from "vitest";
import { validateAnalysisReport } from "../../shared/ai/reviewSchema";

const baseReport = {
  version: "v3",
  generatedAt: new Date().toISOString(),
  generalInformation: {
    complianceScore: 82,
    selectedPerspective: "compliance",
    reviewTimeSeconds: 140,
    timeSavingsMinutes: 15,
    reportExpiry: new Date(Date.now() + 86_400_000).toISOString(),
  },
  contractSummary: {
    contractName: "Test Agreement",
    filename: "test.pdf",
    parties: ["Acme Ltd.", "Beta Corp."],
    agreementDirection: "mutual",
    purpose: "Proof of schema handling",
    verbalInformationCovered: true,
    contractPeriod: "12 months",
    governingLaw: "England & Wales",
    jurisdiction: "London",
  },
  issuesToAddress: [
    {
      id: "issue-1",
      title: "Missing sub-processor approvals",
      severity: "high",
      clauseReference: {
        heading: "Sub-processors",
        locationHint: { page: 8, section: "7.2" },
      },
      legalBasis: [{ authority: "GDPR Art. 28(2)", summary: "controller veto" }],
      recommendation: "Require prior written consent before onboarding.",
      rationale: "Controller loses oversight otherwise.",
    },
  ],
  criteriaMet: [
    {
      id: "criterion-1",
      title: "Security clause present",
      description: "Contract references ISO controls.",
      met: true,
    },
  ],
  clauseFindings: [
    {
      clauseId: "clause-1",
      title: "Security Measures",
      summary: "Controls listed but audit rights absent.",
      riskLevel: "medium",
      recommendation: "Add annual audit rights.",
    },
  ],
  proposedEdits: [
    {
      id: "edit-1",
      clauseId: "clause-1",
      anchorText: "Security Measures",
      proposedText: "Processor shall allow annual audits.",
      intent: "add audit rights",
      applyByDefault: true,
    },
  ],
  playbookInsights: [
    {
      id: "playbook-1",
      title: "Security posture",
      summary: "Controls referenced but evidence missing.",
      severity: "medium",
      guidance: ["Add SOC 2 mention"],
    },
  ],
  clauseExtractions: [
    {
      id: "extract-1",
      clauseId: "clause-1",
      title: "Security Measures",
      originalText: "Processor shall implement reasonable controls.",
      references: [],
    },
  ],
  similarityAnalysis: [
    {
      id: "sim-1",
      sourceTitle: "Standard DPA",
      similarityScore: 0.82,
    },
  ],
  deviationInsights: [
    {
      id: "dev-1",
      title: "Missing audit right",
      severity: "high",
      description: "Standard playbook expects annual audit rights.",
      recommendation: "Add audit clause.",
    },
  ],
  actionItems: [
    {
      id: "item-1",
      title: "Confirm audit process",
      description: "Align with security team.",
      status: "open",
    },
  ],
  draftMetadata: {
    previewAvailable: true,
    selectedEditIds: ["edit-1"],
  },
  metadata: {
    model: "gpt-5-mini",
    modelCategory: "default",
    playbookKey: "data_processing_agreement",
    classification: { contractType: "data_processing_agreement", confidence: 0.88 },
    tokenUsage: { input: 12_000, output: 1_200, totalCostUsd: 0.45 },
  },
};

describe("AnalysisReport schema", () => {
  it("accepts a well-formed structured report", () => {
    expect(() => validateAnalysisReport(baseReport)).not.toThrow();
  });

  it("upgrades legacy v2 payloads to v3 automatically", () => {
    const legacy = { ...baseReport, version: "v2" as const };
    const parsed = validateAnalysisReport(legacy);
    expect(parsed.version).toBe("v3");
    expect(parsed.playbookInsights).toEqual([]);
  });

  it("rejects invalid severity values", () => {
    const invalid = {
      ...baseReport,
      issuesToAddress: [
        {
          ...baseReport.issuesToAddress[0],
          severity: "urgent",
        },
      ],
    };

    expect(() => validateAnalysisReport(invalid)).toThrow(
      /severity/i,
    );
  });

  it("requires at least one party in summary", () => {
    const invalid = {
      ...baseReport,
      contractSummary: {
        ...baseReport.contractSummary,
        parties: [],
      },
    };

    expect(() => validateAnalysisReport(invalid)).toThrow(
      /parties/i,
    );
  });
});
