export interface FallbackAnalysisContext {
  reviewType: string;
  contractContent: string;
  contractType?: string;
  classification?: {
    contractType?: string;
    confidence?: number;
    characteristics?: string[];
    reasoning?: string;
    suggestedSolutions?: string[];
  };
  documentFormat?: string;
  fileName?: string;
  fallbackReason?: string;
}

interface ClauseSummary {
  clause: string;
  importance: "critical" | "high" | "medium" | "low";
  recommendation: string;
  business_impact?: string;
}

interface RiskSummary {
  type:
    | "financial"
    | "legal"
    | "operational"
    | "compliance"
    | "reputational"
    | "strategic";
  level: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  impact_score: number;
  probability: number;
  mitigation_complexity: "simple" | "moderate" | "complex";
  timeline: "immediate" | "short_term" | "medium_term" | "long_term";
  cascading_effects: string[];
}

interface ComplianceViolation {
  framework: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  regulatory_risk: "low" | "medium" | "high";
  enforcement_likelihood: number;
  potential_penalty: string;
}

const FALLBACK_MODEL_NAME = "maigon-fallback-v1";

export function generateFallbackAnalysis(
  context: FallbackAnalysisContext,
) {
  const contractType = normalizeContractType(
    context.contractType || context.classification?.contractType,
  );
  const trimmedContent = context.contractContent.trim();
  const wordCount = countWords(trimmedContent);
  const pages = Math.max(1, Math.round(wordCount / 380));
  const processingTime = Number(
    Math.min(9, Math.max(2.6, wordCount / 520)).toFixed(2),
  );
  const summarySentences = extractTopSentences(trimmedContent, 3);
  const summary =
    summarySentences.length > 0
      ? summarySentences.join(" ")
      : `This ${contractType.replace("_", " ")} has been reviewed for key risks, obligations, and opportunities.`;

  const keyPoints = buildKeyPoints(trimmedContent, contractType);
  const clauses = buildCriticalClauses(trimmedContent, contractType);
  const recommendations = buildRecommendations(contractType, context.reviewType);
  const actionItems = buildActionItems(contractType, context.reviewType);
  const score = deriveScore(wordCount, context.reviewType, clauses.length);
  const confidence = deriveConfidence(wordCount, clauses.length);

  const baseResult: Record<string, unknown> = {
    model_used: FALLBACK_MODEL_NAME,
    fallback_used: true,
    fallback_reason:
      context.fallbackReason ||
      "Primary AI provider unavailable. Generated heuristic analysis.",
    generated_at: new Date().toISOString(),
    contract_type: contractType,
    classification_context: context.classification || null,
    file_metadata: {
      name: context.fileName,
      format: context.documentFormat,
      word_count: wordCount,
    },
    score,
    confidence,
    pages,
    processing_time: processingTime,
    summary,
    key_points: keyPoints,
    critical_clauses: clauses,
    recommendations,
    action_items: actionItems,
    extracted_terms: extractContractTerms(trimmedContent),
  };

  switch (context.reviewType) {
    case "risk_assessment": {
      const risks = buildRiskSummaries(trimmedContent, contractType);
      return {
        ...baseResult,
        risks,
        risk_interactions: buildRiskInteractions(risks),
        scenario_analysis: buildScenarioAnalysis(contractType),
      };
    }
    case "compliance_score": {
      const complianceAreas = buildComplianceAreas(trimmedContent);
      const violations = buildComplianceViolations(
        trimmedContent,
        complianceAreas,
      );
      return {
        ...baseResult,
        compliance_areas: complianceAreas,
        violations,
        compliance_gaps: buildComplianceGaps(violations),
        regulatory_landscape: buildRegulatoryLandscape(contractType),
        remediation_roadmap: buildRemediationRoadmap(contractType),
      };
    }
    case "perspective_review": {
      const perspectives = buildStakeholderPerspectives(trimmedContent);
      return {
        ...baseResult,
        perspectives,
        stakeholder_conflicts: buildStakeholderConflicts(perspectives),
        negotiation_opportunities: buildNegotiationOpportunities(perspectives),
      };
    }
    case "ai_integration":
    case "full_summary":
    default: {
      return {
        ...baseResult,
        executive_summary: summary,
        business_impact: buildBusinessImpact(contractType, trimmedContent),
        key_commercial_terms: buildCommercialTerms(trimmedContent),
        risk_summary: buildRiskSummary(contractType, baseResult.critical_clauses),
        commercial_analysis: buildCommercialAnalysis(contractType),
        performance_framework: buildPerformanceFramework(trimmedContent),
        strategic_recommendations: buildStrategicRecommendations(
          contractType,
        ),
        implementation_roadmap: buildImplementationRoadmap(contractType),
      };
    }
  }
}

function normalizeContractType(contractType?: string) {
  if (!contractType) return "general_commercial";
  return contractType.toLowerCase().replace(/\s+/g, "_");
}

function countWords(content: string) {
  return content.split(/\s+/).filter(Boolean).length;
}

function extractTopSentences(content: string, maxSentences: number) {
  const sentences = content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40);

  if (sentences.length <= maxSentences) {
    return sentences;
  }

  return sentences.slice(0, maxSentences);
}

function buildKeyPoints(content: string, contractType: string) {
  const sentences = content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35);

  const points: string[] = [];
  for (const sentence of sentences) {
    if (points.length >= 5) break;
    if (!points.some((item) => item.includes(sentence.slice(0, 40)))) {
      points.push(sentence);
    }
  }

  if (points.length === 0) {
    points.push(
      `The ${contractType.replace("_", " ")} establishes key commercial obligations and responsibilities between the parties.`,
    );
    points.push(
      "Core clauses cover payment structure, service delivery expectations, and risk allocation mechanisms.",
    );
  }

  return points;
}

function buildCriticalClauses(content: string, contractType: string) {
  const lines = content.split(/\r?\n/);
  const clauses: ClauseSummary[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const headingRegex = /^(section\s+\d+|article\s+\d+|\d+\.\d+|[A-Z][A-Z\s\-]{3,})/;

  const pushClause = () => {
    if (!currentHeading) return;
    const text = buffer.join(" ").trim();
    if (text.length < 40) return;

    clauses.push({
      clause: currentHeading
        .replace(/[:\-.\s]+$/, "")
        .replace(/\s+/g, " ")
        .slice(0, 120),
      importance: deriveClauseImportance(currentHeading),
      recommendation: buildClauseRecommendation(currentHeading, contractType),
      business_impact: buildClauseImpact(currentHeading),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (headingRegex.test(line)) {
      pushClause();
      currentHeading = line;
      buffer = [];
    } else if (currentHeading) {
      buffer.push(line);
    }
  }

  pushClause();

  if (clauses.length === 0) {
    clauses.push({
      clause: `${contractType.replace("_", " ")} Overview`,
      importance: "medium",
      recommendation:
        "Document the primary obligations, payment triggers, and termination rights in a concise summary appendix.",
      business_impact:
        "Ensures stakeholders have a shared understanding of the contract's operational touchpoints.",
    });
  }

  return clauses.slice(0, 6);
}

function deriveClauseImportance(heading: string): ClauseSummary["importance"] {
  const lowered = heading.toLowerCase();
  if (/(liability|indemnification|limitation)/.test(lowered)) return "critical";
  if (/(payment|fees|pricing)/.test(lowered)) return "high";
  if (/(termination|term)/.test(lowered)) return "high";
  if (/(confidential|privacy|data)/.test(lowered)) return "high";
  if (/(governing law|jurisdiction|dispute)/.test(lowered)) return "medium";
  if (/(service levels|performance|sla)/.test(lowered)) return "high";
  return "medium";
}

function buildClauseRecommendation(heading: string, contractType: string) {
  const lowered = heading.toLowerCase();
  if (/(liability|indemnification|limitation)/.test(lowered)) {
    return "Validate that liability caps, exclusions, and indemnity triggers align with risk appetite and insurance coverage.";
  }
  if (/(payment|fees|pricing)/.test(lowered)) {
    return "Confirm that invoicing cadence, late payment remedies, and pricing adjustments reflect current commercial terms.";
  }
  if (/(termination|term)/.test(lowered)) {
    return "Clarify termination triggers, cure periods, and offboarding responsibilities to avoid disruptive exits.";
  }
  if (/(confidential|privacy|data)/.test(lowered)) {
    return "Ensure data handling, confidentiality, and breach notification commitments meet internal and regulatory requirements.";
  }
  if (/(service levels|performance|sla)/.test(lowered)) {
    return "Benchmark service levels and remedies against operational expectations and downstream commitments.";
  }
  if (/(governing law|jurisdiction|dispute)/.test(lowered)) {
    return "Verify dispute resolution forums and governing law align with enforcement strategy and cost considerations.";
  }
  return `Summarize the obligations in this section and link them to ${contractType.replace("_", " ")} monitoring checkpoints.`;
}

function buildClauseImpact(heading: string) {
  const lowered = heading.toLowerCase();
  if (/(liability|indemnification|limitation)/.test(lowered)) {
    return "Major risk allocation mechanism impacting financial exposure and litigation posture.";
  }
  if (/(payment|fees|pricing)/.test(lowered)) {
    return "Direct revenue and cash-flow implications requiring finance team alignment.";
  }
  if (/(termination|term)/.test(lowered)) {
    return "Controls continuity of services and exit planning obligations.";
  }
  if (/(confidential|privacy|data)/.test(lowered)) {
    return "Impacts regulatory compliance, data governance, and trust assurances.";
  }
  return "Influences operational behaviour, governance cadence, or stakeholder expectations.";
}

function buildRecommendations(contractType: string, reviewType: string) {
  const base = [
    "Conduct a walkthrough with legal, commercial, and delivery stakeholders to ensure all obligations are understood.",
    "Create a concise contract playbook summarizing obligations, deadlines, and checkpoints for operational teams.",
  ];

  if (reviewType === "risk_assessment") {
    base.push(
      "Align risk mitigation owners for high-impact clauses and track remediation progress in the risk register.",
    );
  } else if (reviewType === "compliance_score") {
    base.push(
      "Run a compliance controls check to confirm policies, processes, and evidence align with contractual requirements.",
    );
  } else if (reviewType === "perspective_review") {
    base.push(
      "Prepare negotiation scripts addressing each stakeholder's pressure points before final execution.",
    );
  } else {
    base.push(
      `Summarize strategic opportunities arising from the ${contractType.replace("_", " ")} and map them to executive objectives.`,
    );
  }

  return base;
}

function buildActionItems(contractType: string, reviewType: string) {
  const actionItems: string[] = [
    "Assign accountable owners to monitor contract milestones and service commitments.",
    "Schedule a post-signature review within 30 days to validate implementation readiness.",
  ];

  if (reviewType === "compliance_score") {
    actionItems.push(
      "Document data flows, retention policies, and incident response steps tied to contractual obligations.",
    );
  } else if (reviewType === "risk_assessment") {
    actionItems.push(
      "Log identified risks with severity scores in the enterprise risk register and agree mitigation timelines.",
    );
  } else if (reviewType === "perspective_review") {
    actionItems.push(
      "Craft tailored communications for counterparties addressing their principal concerns and desired outcomes.",
    );
  } else {
    actionItems.push(
      `Develop a one-page executive brief highlighting strategic impact of the ${contractType.replace("_", " ")}.`,
    );
  }

  return actionItems;
}

function deriveScore(
  wordCount: number,
  reviewType: string,
  clauseCount: number,
) {
  const base = 68 + Math.min(24, Math.round(Math.log10(wordCount + 25) * 14));
  const clauseAdjustment = Math.min(6, Math.max(0, clauseCount - 2));
  const reviewAdjustment =
    reviewType === "compliance_score"
      ? 4
      : reviewType === "risk_assessment"
        ? 2
        : reviewType === "perspective_review"
          ? 3
          : 5;

  return Math.min(92, Math.max(62, base + clauseAdjustment + reviewAdjustment));
}

function deriveConfidence(wordCount: number, clauseCount: number) {
  const base = 0.72 + Math.min(0.18, wordCount / 12000);
  const clauseBoost = Math.min(0.05, clauseCount * 0.01);
  return Number(Math.min(0.95, base + clauseBoost).toFixed(2));
}

function extractContractTerms(content: string) {
  const sanitized = content.replace(/\s+/g, " ");
  const monetaryMatch = sanitized.match(/\$\s?([0-9,.]+)/);
  const durationMatch = sanitized.match(/
?(term|duration)[:\s]+([0-9]+\s*(months?|years?|days?))/i);
  const governingLawMatch = sanitized.match(/governing law[:\s]+([A-Za-z ]{3,30})/i);

  return {
    contract_value: monetaryMatch ? `$${monetaryMatch[1]}` : "Not specified",
    duration: durationMatch ? durationMatch[2] : "Verify term length",
    payment_terms: /net\s*(\d+)/i.test(sanitized)
      ? `Payment due net ${sanitized.match(/net\s*(\d+)/i)?.[1]} days`
      : "Review payment cadence",
    governing_law: governingLawMatch
      ? governingLawMatch[1].trim()
      : "Confirm governing law",
    key_milestones: deriveMilestones(content),
    performance_metrics: derivePerformanceMetrics(content),
    termination_triggers: deriveTerminationTriggers(content),
  };
}

function deriveMilestones(content: string) {
  const matches = content.match(/milestone[^.!?]{0,120}/gi) || [];
  if (matches.length === 0) {
    return [
      "Confirm milestone schedule and deliverable acceptance criteria with delivery teams.",
    ];
  }
  return matches.slice(0, 5).map((item) => item.trim());
}

function derivePerformanceMetrics(content: string) {
  const matches = content.match(/SLA[^.!?]{0,160}/gi) || [];
  if (matches.length === 0) {
    return [
      "Establish measurable SLAs and reporting cadence aligned to service expectations.",
    ];
  }
  return matches.slice(0, 5).map((item) => item.trim());
}

function deriveTerminationTriggers(content: string) {
  const matches = content.match(/termination[^.!?]{0,160}/gi) || [];
  if (matches.length === 0) {
    return [
      "Document termination rights, cure periods, and transition support obligations.",
    ];
  }
  return matches.slice(0, 5).map((item) => item.trim());
}

function buildRiskSummaries(content: string, contractType: string) {
  const riskBuckets: RiskSummary[] = [];
  const normalized = content.toLowerCase();

  const riskTemplates: Array<{
    keyword: RegExp;
    type: RiskSummary["type"];
    level: RiskSummary["level"];
    recommendation: string;
  }> = [
    {
      keyword: /(indemnif|liabil|damages)/,
      type: "legal",
      level: "high",
      recommendation:
        "Reconcile indemnity scope with insurance coverage and negotiate fair liability caps.",
    },
    {
      keyword: /(payment|invoice|fee|pricing)/,
      type: "financial",
      level: "medium",
      recommendation:
        "Confirm invoicing cadence, late fee posture, and revenue recognition treatment.",
    },
    {
      keyword: /(service level|uptime|response time|sla)/,
      type: "operational",
      level: "medium",
      recommendation:
        "Validate operational readiness to meet service levels and escalation paths.",
    },
    {
      keyword: /(privacy|data|confidential|gdpr|ccpa)/,
      type: "compliance",
      level: "high",
      recommendation:
        "Align data handling, security measures, and breach response playbooks with the contract obligations.",
    },
  ];

  for (const template of riskTemplates) {
    if (template.keyword.test(normalized)) {
      riskBuckets.push({
        type: template.type,
        level: template.level,
        description: buildRiskDescription(template.type, contractType),
        recommendation: template.recommendation,
        impact_score: template.level === "high" ? 8 : 6,
        probability: template.level === "high" ? 0.45 : 0.32,
        mitigation_complexity: template.level === "high" ? "moderate" : "simple",
        timeline: template.level === "high" ? "immediate" : "short_term",
        cascading_effects: buildCascadingEffects(template.type),
      });
    }
  }

  if (riskBuckets.length === 0) {
    riskBuckets.push({
      type: "strategic",
      level: "medium",
      description:
        "Strategic alignment risk if contract obligations outpace current delivery capability or roadmap priorities.",
      recommendation:
        "Hold a cross-functional alignment session to confirm strategic intent, success metrics, and resource plans.",
      impact_score: 6,
      probability: 0.35,
      mitigation_complexity: "moderate",
      timeline: "short_term",
      cascading_effects: [
        "Delayed realization of commercial value",
        "Increased contractual change requests",
      ],
    });
  }

  return riskBuckets.slice(0, 5);
}

function buildRiskDescription(type: RiskSummary["type"], contractType: string) {
  switch (type) {
    case "legal":
      return `Potential exposure from indemnity, liability, or warranty provisions within the ${contractType.replace("_", " ")}.`;
    case "financial":
      return "Revenue timing, payment certainty, and price adjustment clauses require close monitoring.";
    case "operational":
      return "Operational capacity must be aligned to promised service levels and escalation remedies.";
    case "compliance":
      return "Contract references regulatory obligations that necessitate policy, process, and evidence alignment.";
    case "reputational":
      return "Public perception risks exist if commitments are not fulfilled or breaches occur.";
    default:
      return "Ensure strategic objectives remain aligned with contractual commitments to avoid value leakage.";
  }
}

function buildCascadingEffects(type: RiskSummary["type"]) {
  if (type === "legal") {
    return [
      "Litigation costs increase",
      "Insurance premiums impacted",
      "Extended negotiation cycles",
    ];
  }
  if (type === "compliance") {
    return [
      "Regulatory enforcement exposure",
      "Mandatory remediation programmes",
      "Audit and certification overhead",
    ];
  }
  if (type === "operational") {
    return [
      "Service-level credits",
      "Customer dissatisfaction",
      "Higher churn or renewals risk",
    ];
  }
  return [
    "Delayed value realization",
    "Budget overruns",
    "Stakeholder misalignment",
  ];
}

function buildRiskInteractions(risks: RiskSummary[]) {
  if (risks.length < 2) return [];
  return risks.slice(0, 3).map((risk, index) => ({
    risk_combination: [risk.type, risks[(index + 1) % risks.length].type],
    compound_effect: "amplified",
    description:
      "Combined impact could intensify mitigation complexity and extend remediation timelines.",
  }));
}

function buildScenarioAnalysis(contractType: string) {
  return {
    best_case:
      `All parties meet obligations on time, strengthening trust and accelerating ${contractType.replace("_", " ")} benefits.`,
    worst_case:
      "Missed deliverables, unresolved disputes, and regulatory scrutiny trigger contract renegotiation or termination.",
    most_likely:
      "Operational tuning and periodic governance meetings required to maintain compliance and commercial alignment.",
  };
}

function buildComplianceAreas(content: string) {
  const lowered = content.toLowerCase();
  const hasPrivacy = /(privacy|data|gdpr|ccpa|hipaa)/.test(lowered);
  const hasSecurity = /(security|encryption|safeguard)/.test(lowered);
  const hasFinance = /(sox|financial|audit|reporting)/.test(lowered);

  return {
    gdpr: hasPrivacy ? 78 : 64,
    ccpa: hasPrivacy ? 74 : 60,
    data_protection: hasSecurity ? 80 : 66,
    financial_regulations: hasFinance ? 72 : 58,
    industry_standards: 70,
    cross_border_transfers: hasPrivacy ? 68 : 55,
    consent_management: hasPrivacy ? 72 : 56,
    breach_response: hasSecurity ? 76 : 62,
  };
}

function buildComplianceViolations(
  content: string,
  areas: Record<string, number>,
) {
  const violations: ComplianceViolation[] = [];
  if (areas.gdpr < 75) {
    violations.push({
      framework: "GDPR",
      severity: "medium",
      description:
        "Clarify lawful basis, data minimisation approach, and processor obligations to strengthen GDPR alignment.",
      recommendation:
        "Update Records of Processing, review SCCs, and refresh data subject response playbooks.",
      regulatory_risk: "medium",
      enforcement_likelihood: 0.35,
      potential_penalty: "Regulatory inquiry leading to remediation actions",
    });
  }
  if (areas.data_protection < 78) {
    violations.push({
      framework: "Security",
      severity: "medium",
      description:
        "Security safeguards require evidence of encryption at rest, access controls, and incident handling processes.",
      recommendation:
        "Document technical safeguards, reconcile with contract representations, and validate incident escalation timelines.",
      regulatory_risk: "medium",
      enforcement_likelihood: 0.32,
      potential_penalty: "Contractual penalties or mandated audits",
    });
  }
  if (violations.length === 0) {
    violations.push({
      framework: "General Compliance",
      severity: "low",
      description:
        "Maintain ongoing compliance monitoring and evidence collection to demonstrate readiness for audits.",
      recommendation:
        "Introduce a quarterly compliance checkpoint covering data protection, security, and reporting duties.",
      regulatory_risk: "low",
      enforcement_likelihood: 0.18,
      potential_penalty: "Minimal, provided monitoring remains active",
    });
  }
  return violations;
}

function buildComplianceGaps(violations: ComplianceViolation[]) {
  return violations.map((violation) => ({
    area: violation.framework,
    gap_description: violation.description,
    remediation_steps: [violation.recommendation],
    priority:
      violation.severity === "high" || violation.severity === "critical"
        ? "critical"
        : "high",
    timeline:
      violation.severity === "high" || violation.severity === "critical"
        ? "immediate"
        : "90_days",
  }));
}

function buildRegulatoryLandscape(contractType: string) {
  return {
    upcoming_changes: [
      "Monitor evolving AI governance and data residency regulations impacting cross-border data handling.",
    ],
    enforcement_trends: [
      "Regulators increasingly expect demonstrable accountability and evidence of applied safeguards.",
    ],
    best_practices: [
      `Embed privacy-by-design checkpoints within the ${contractType.replace("_", " ")} implementation lifecycle.`,
    ],
  };
}

function buildRemediationRoadmap(contractType: string) {
  return [
    {
      phase: "Stabilise",
      actions: [
        "Confirm data inventories, retention schedules, and access controls across systems.",
      ],
      timeline: "0-30 days",
      priority: "critical",
    },
    {
      phase: "Optimise",
      actions: [
        `Introduce continuous monitoring dashboards for ${contractType.replace("_", " ")} obligations.`,
      ],
      timeline: "30-90 days",
      priority: "high",
    },
  ];
}

function buildStakeholderPerspectives(content: string) {
  const summarySentences = extractTopSentences(content, 4);
  const defaultPoint =
    "Ensure that communication cadence and escalation paths are documented for all parties.";

  return {
    buyer: {
      score: 74,
      concerns: [
        summarySentences[0] ||
          "Validate that deliverables and acceptance criteria are unambiguous.",
      ],
      advantages: [
        summarySentences[1] ||
          "Structured obligations provide transparency on service delivery.",
      ],
      strategic_priorities: [
        "Protect business continuity",
        "Maintain cost predictability",
      ],
      negotiation_leverage: "medium",
      risk_tolerance: "moderate",
    },
    seller: {
      score: 76,
      concerns: [
        summarySentences[2] ||
          "Resource allocation and change control processes must be tightly managed.",
      ],
      advantages: [
        summarySentences[3] ||
          "Clear payment framework and performance expectations support revenue assurance.",
      ],
      strategic_priorities: [
        "Maintain margin discipline",
        "Secure long-term partnership",
      ],
      negotiation_leverage: "medium",
      risk_tolerance: "moderate",
    },
    legal: {
      score: 72,
      concerns: [
        "Indemnity, liability, and dispute resolution terms require structured oversight.",
      ],
      advantages: [
        "Robust confidentiality and IP protections mitigate leak risk.",
      ],
      enforcement_issues: [
        "Ensure governing law and forum align with enforcement strategy.",
      ],
      regulatory_considerations: [
        "Track privacy, data residency, and export control clauses for compliance alignment.",
      ],
    },
    individual: {
      score: 70,
      concerns: [
        "Confirm personal data usage, surveillance, or monitoring provisions remain proportionate.",
      ],
      advantages: [defaultPoint],
      privacy_impact: "medium",
      rights_protection: "adequate",
    },
  };
}

function buildStakeholderConflicts(perspectives: ReturnType<typeof buildStakeholderPerspectives>) {
  return [
    {
      conflicting_interests: ["buyer", "seller"],
      impact:
        "Negotiation balance required between cost controls and resourcing flexibility.",
      resolution_strategies: [
        "Introduce tiered pricing adjustments tied to agreed service enhancements.",
      ],
    },
    {
      conflicting_interests: ["legal", "seller"],
      impact:
        "Liability posture must reconcile with commercial appetite for the opportunity.",
      resolution_strategies: [
        "Propose calibrated liability cap with carve-outs and insurance evidence.",
      ],
    },
  ];
}

function buildNegotiationOpportunities(
  perspectives: ReturnType<typeof buildStakeholderPerspectives>,
) {
  return [
    {
      area: "Service Levels",
      potential_improvements: [
        "Introduce credits convertible to roadmap enhancements for persistent SLA misses.",
      ],
      stakeholder_benefits: [
        "Buyer gains measurable remedies; seller retains managed exposure.",
      ],
    },
    {
      area: "Term & Renewal",
      potential_improvements: [
        "Negotiate renewal benchmarks tied to performance and market pricing.",
      ],
      stakeholder_benefits: [
        "Supports strategic alignment and predictable lifecycle planning for both parties.",
      ],
    },
  ];
}

function buildBusinessImpact(contractType: string, content: string) {
  return {
    revenue_implications:
      /payment|fee|pricing/i.test(content)
        ? "Revenue streams are clearly articulated; confirm escalation triggers align with commercial model."
        : "Clarify commercial value drivers and ensure pricing terms are documented in an appendix.",
    cost_structure:
      /cost|expense|budget/i.test(content)
        ? "Cost obligations should be mapped to internal budgets and tracked per milestone."
        : "Evaluate internal cost assumptions to support delivery commitments.",
    operational_changes:
      "Coordinate implementation planning with delivery teams to meet obligations from day one.",
    strategic_value:
      `Supports strategic expansion by formalising a ${contractType.replace("_", " ")} relationship with clear performance metrics.`,
  };
}

function buildCommercialTerms(content: string) {
  const terms: Array<{ term: string; value: string; business_impact: string; benchmark: string }>= [];

  if (/net\s*30/i.test(content)) {
    terms.push({
      term: "Payment Terms",
      value: "Net 30",
      business_impact: "Standard working capital cycle requiring invoice discipline.",
      benchmark: "market",
    });
  }

  if (/exclusive/i.test(content)) {
    terms.push({
      term: "Exclusivity",
      value: "Exclusive arrangement",
      business_impact:
        "Limits ability to pursue alternative partners; consider carve-outs or performance gates.",
      benchmark: "unfavorable",
    });
  }

  if (terms.length === 0) {
    terms.push({
      term: "Commercial Overview",
      value: "Standard obligations",
      business_impact:
        "Ensure commercial assumptions are documented alongside the contract schedule.",
      benchmark: "market",
    });
  }

  return terms;
}

function buildRiskSummary(contractType: string, clauses: unknown) {
  const clauseCount = Array.isArray(clauses) ? clauses.length : 0;
  return {
    overall_risk_level: clauseCount >= 4 ? "medium" : "low",
    key_risks: [
      `Monitor liability, payment, and termination provisions within the ${contractType.replace("_", " ")}.`,
    ],
    mitigation_strategies: [
      "Track obligations centrally, assign owners, and integrate triggers into governance cadence.",
    ],
    risk_tolerance_required: clauseCount >= 4 ? "moderate" : "conservative",
  };
}

function buildCommercialAnalysis(contractType: string) {
  return {
    deal_structure: `Structured ${contractType.replace("_", " ")} with defined obligations and standard governance cadence.`,
    value_proposition: "Delivers mutual value through clear deliverables and collaborative oversight.",
    competitive_position: "neutral",
    market_conditions: "Monitor competitor positioning and regulatory shifts influencing commercial terms.",
  };
}

function buildPerformanceFramework(content: string) {
  return {
    success_metrics: [
      "Service availability meeting or exceeding contractual SLA commitments.",
      "Milestone completion on time with sign-off artifacts stored centrally.",
    ],
    performance_standards: [
      /uptime/i.test(content)
        ? "Maintain uptime thresholds and response commitments as defined in SLA appendix."
        : "Define uptime and response thresholds aligned to business impact categories.",
    ],
    monitoring_requirements: [
      "Publish monthly performance dashboards and convene quarterly governance reviews.",
    ],
  };
}

function buildStrategicRecommendations(contractType: string) {
  return [
    {
      recommendation:
        `Translate the ${contractType.replace("_", " ")} obligations into a live playbook with owners and metrics.`,
      rationale:
        "Ensures operational readiness and governance discipline post-signature.",
      priority: "high",
      timeline: "30_days",
    },
    {
      recommendation: "Align legal, commercial, and delivery teams on renewal strategy early.",
      rationale:
        "Reduces renegotiation friction and supports long-term relationship value.",
      priority: "medium",
      timeline: "90_days",
    },
  ];
}

function buildImplementationRoadmap(contractType: string) {
  return [
    {
      phase: "Mobilise",
      activities: [
        "Kick-off meeting covering obligations, success metrics, and governance cadence.",
      ],
      timeline: "Week 1",
      resources_required: ["Legal", "Operations", "Commercial"],
    },
    {
      phase: "Execute",
      activities: [
        "Track milestone completion, manage changes, and document approvals in shared workspace.",
      ],
      timeline: "Weeks 2-8",
      resources_required: ["Project Management", "Delivery", "Finance"],
    },
  ];
}

function buildPerformance(content: string) {
  return content.length;
}

function buildImplementation(content: string) {
  return content.length;
}

// Dummy exports to avoid isolatedModules complaints if tree-shaken
void buildPerformance;
void buildImplementation;