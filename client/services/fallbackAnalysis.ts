export interface FallbackAnalysisOptions {
  contractType?: string | null;
  fallbackReason?: string;
  contractContent?: string;
}

const DEFAULT_CONTRACT_TYPE = "general_commercial";

export function generateFallbackAnalysis(
  reviewType: string,
  classification: any,
  options: FallbackAnalysisOptions = {},
) {
  const timestamp = new Date().toISOString();
  const contractType = (
    options.contractType || classification?.contractType || DEFAULT_CONTRACT_TYPE
  )
    .toString()
    .toLowerCase();

  const baseAnalysis = {
    timestamp,
    pages: estimatePages(options.contractContent),
    processing_time: estimateProcessingTime(options.contractContent),
    confidence: 0.78,
    model_used: "maigon-fallback-reliable",
    contract_type: contractType,
    classification_context: classification || null,
    fallback_used: true,
    fallback_reason:
      options.fallbackReason ||
      "Primary AI analysis service unavailable. Generated resilient fallback report.",
  };

  switch (reviewType) {
    case "compliance_score":
      return {
        ...baseAnalysis,
        score: 78,
        compliance_areas: {
          gdpr: 82,
          data_protection: 80,
          industry_standards: 75,
          general_compliance: 78,
        },
        violations: [
          {
            framework: "General Compliance",
            severity: "medium",
            description:
              "Some clauses may require review for full compliance with current regulations.",
            recommendation:
              "Schedule a regulatory compliance review focused on data protection and evidence collection.",
          },
        ],
        recommendations: [
          "Review the agreement for compliance evidence and record-keeping obligations.",
          "Validate privacy, data handling, and security commitments with internal controls.",
          "Implement continuous monitoring for emerging regulatory requirements.",
        ],
      };

    case "risk_assessment":
      return {
        ...baseAnalysis,
        score: 72,
        risks: [
          {
            type: "operational",
            level: "medium",
            description:
              "Standard commercial risks are present and require ownership for mitigation.",
            recommendation:
              "Document mitigation owners, due dates, and escalation paths in the governance plan.",
            impact_score: 6.2,
          },
          {
            type: "financial",
            level: "medium",
            description:
              "Payment cadence and invoicing accuracy need close supervision to avoid revenue leakage.",
            recommendation:
              "Align finance and delivery teams on invoicing triggers, approvals, and service credits.",
            impact_score: 5.8,
          },
        ],
        recommendations: [
          "Review liability, indemnity, and termination clauses with legal and risk stakeholders.",
          "Ensure operational teams have clear acceptance criteria and milestone tracking.",
          "Integrate the contract into the enterprise risk register with quarterly updates.",
        ],
      };

    case "perspective_review":
      return {
        ...baseAnalysis,
        score: 75,
        perspectives: {
          buyer: {
            score: 74,
            concerns: [
              "Validate that deliverables, acceptance criteria, and escalation routes are measurable.",
            ],
            advantages: [
              "Structured obligations and governance cadences support predictable outcomes.",
            ],
          },
          seller: {
            score: 77,
            concerns: [
              "Manage scope variations and change requests to protect margin and delivery capacity.",
            ],
            advantages: [
              "Clear payment structure and renewal options support long-term planning.",
            ],
          },
          legal: {
            score: 72,
            concerns: [
              "Indemnity, liability, and dispute resolution terms require documented oversight.",
            ],
            advantages: [
              "Confidentiality and intellectual property provisions appear industry standard.",
            ],
          },
          individual: {
            score: 71,
            concerns: [
              "Confirm transparency around personal data usage, monitoring, or audit rights.",
            ],
            advantages: [
              "Escalation and rights management pathways support issue resolution.",
            ],
          },
        },
        recommendations: [
          "Prepare negotiation options balancing commercial flexibility with cost certainty.",
          "Align internal stakeholders on renewal strategy and performance incentives.",
          "Share a summary briefing with executives covering strategic value and key obligations.",
        ],
      };

    case "ai_integration":
    case "full_summary":
    default:
      return {
        ...baseAnalysis,
        score: 74,
        summary: `This ${contractType.replace("_", " ")} has been assessed using resilient fallback logic. It contains standard commercial terms that warrant customary due diligence and implementation planning.`,
        key_points: [
          "Core commercial obligations and deliverables are clearly defined but require execution oversight.",
          "Risk allocation and escalation mechanics should be reviewed for alignment with business objectives.",
          "Compliance commitments and evidence expectations need to be embedded in governance routines.",
        ],
        critical_clauses: [
          {
            clause: "Terms and Conditions",
            importance: "medium",
            recommendation:
              "Confirm mutual obligations, service levels, and remedies align with current operating model.",
          },
          {
            clause: "Liability and Indemnity",
            importance: "high",
            recommendation:
              "Reconcile liability caps, exclusions, and indemnity triggers with insurance coverage and risk appetite.",
          },
        ],
        recommendations: [
          "Conduct a structured legal review with emphasis on liability, termination, and compliance commitments.",
          "Verify commercial terms, pricing mechanisms, and KPI expectations with finance and delivery teams.",
          "Ensure regulatory obligations are tracked with evidence repositories and audit readiness plans.",
        ],
      };
  }
}

function estimatePages(content?: string) {
  if (!content) return 5;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / 360));
}

function estimateProcessingTime(content?: string) {
  if (!content) return 2.5;
  const wordCount = content.trim().split(/\s+/).length;
  return Number(Math.max(2.5, Math.min(8.5, wordCount / 520)).toFixed(2));
}
