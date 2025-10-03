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

const FALLBACK_MODEL_NAME = "maigon-fallback-v1";

export function generateFallbackAnalysis(context: FallbackAnalysisContext) {
  const text = (context.contractContent || "").trim();
  const contractTypeKey = normaliseContractType(
    context.contractType || context.classification?.contractType,
  );
  const readableType = formatContractType(contractTypeKey);
  const wordStats = analyseWordCounts(text);

  const baseResult: Record<string, unknown> = {
    model_used: FALLBACK_MODEL_NAME,
    fallback_used: true,
    fallback_reason:
      context.fallbackReason ||
      "Primary AI provider unavailable. Generated deterministic analysis.",
    generated_at: new Date().toISOString(),
    contract_type: contractTypeKey,
    classification_context: context.classification || null,
    file_metadata: {
      name: context.fileName || null,
      format: context.documentFormat || null,
      word_count: wordStats.wordCount,
    },
    score: estimateScore(wordStats.wordCount, context.reviewType),
    confidence: estimateConfidence(wordStats.wordCount, context.reviewType),
    pages: wordStats.estimatedPages,
    processing_time: wordStats.estimatedProcessingSeconds,
    summary: buildSummary(text, readableType),
    key_points: buildKeyPoints(text, readableType),
    critical_clauses: buildCriticalClauses(text, readableType),
    recommendations: buildRecommendations(context.reviewType, readableType),
    action_items: buildActionItems(context.reviewType, readableType),
    extracted_terms: extractBasicTerms(text, readableType),
  };

  switch (context.reviewType) {
    case "compliance_score":
      return {
        ...baseResult,
        compliance_areas: buildComplianceAreas(text),
        violations: buildComplianceViolations(text),
        compliance_gaps: buildComplianceGaps(text),
        regulatory_landscape: buildRegulatoryLandscape(readableType),
        remediation_roadmap: buildRemediationRoadmap(readableType),
      };
    case "risk_assessment":
      return {
        ...baseResult,
        risks: buildRisks(text, readableType),
        risk_interactions: buildRiskInteractions(),
        scenario_analysis: buildScenarioAnalysis(readableType),
      };
    case "perspective_review":
      return {
        ...baseResult,
        perspectives: buildPerspectives(text),
        stakeholder_conflicts: buildStakeholderConflicts(),
        negotiation_opportunities: buildNegotiationOpportunities(),
      };
    default:
      return {
        ...baseResult,
        executive_summary: baseResult.summary,
        business_impact: buildBusinessImpact(readableType),
        key_commercial_terms: buildCommercialTerms(text, readableType),
        risk_summary: buildRiskSummary(readableType),
        commercial_analysis: buildCommercialAnalysis(readableType),
        performance_framework: buildPerformanceFramework(),
        strategic_recommendations: buildStrategicRecommendations(readableType),
        implementation_roadmap: buildImplementationRoadmap(readableType),
      };
  }
}

function normaliseContractType(contractType?: string) {
  if (!contractType) return "general_commercial";
  return contractType.trim().toLowerCase().replace(/\s+/g, "_");
}

function formatContractType(contractType: string) {
  return contractType.replace(/_/g, " ");
}

function analyseWordCounts(text: string) {
  const wordCount =
    text.length === 0 ? 1200 : text.split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.round(wordCount / 360));
  const estimatedProcessingSeconds = Number(
    Math.max(2.5, Math.min(9, wordCount / 520)).toFixed(2),
  );
  return { wordCount, estimatedPages, estimatedProcessingSeconds };
}

function estimateScore(wordCount: number, reviewType: string): number {
  // Base score depends on review type
  const baseScores: Record<string, number> = {
    compliance_score: 78,
    risk_assessment: 72,
    perspective_review: 75,
    full_summary: 74,
    ai_integration: 74,
  };

  const baseScore = baseScores[reviewType] || 74;

  // Adjust slightly based on content length (more content = slightly higher confidence)
  const contentBonus = Math.min(4, Math.floor(wordCount / 1000));

  return Math.min(100, baseScore + contentBonus);
}

function estimateConfidence(wordCount: number, reviewType: string): number {
  // Fallback confidence is always moderate (0.75-0.82)
  // More content = slightly higher confidence
  const baseConfidence = 0.75;
  const contentBonus = Math.min(0.07, wordCount / 10000);

  return Number((baseConfidence + contentBonus).toFixed(2));
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function buildSummary(text: string, readableType: string) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return (
      "This " +
      readableType +
      " outlines commercial obligations and should undergo standard legal and operational review."
    );
  }
  const slice = sentences.slice(0, 3);
  return slice.join(" ");
}

function buildKeyPoints(text: string, readableType: string) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return [
      "Commercial responsibilities and deliverables are clearly defined but require structured oversight.",
      "Risk allocation and escalation mechanics should be aligned with business objectives.",
      "Compliance commitments need evidence tracking and executive visibility.",
    ];
  }
  return sentences.slice(0, Math.min(5, sentences.length));
}

function buildCriticalClauses(text: string, readableType: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const clauses: Array<{
    clause: string;
    importance: string;
    recommendation: string;
  }> = [];
  let currentTitle: string | null = null;
  let buffer: string[] = [];
  const headingPattern =
    /^(section\s+\d+|article\s+\d+|\d+\.\d+|[A-Z][A-Z\s\-]{3,})/;

  const pushClause = () => {
    if (!currentTitle) return;
    const combined = buffer.join(" ");
    if (combined.length < 40) return;
    clauses.push({
      clause: currentTitle.replace(/[:\-\s]+$/, ""),
      importance: deriveClauseImportance(currentTitle),
      recommendation: deriveClauseRecommendation(currentTitle, readableType),
    });
  };

  for (const line of lines) {
    if (!line) continue;
    if (headingPattern.test(line)) {
      pushClause();
      currentTitle = line;
      buffer = [];
    } else if (currentTitle) {
      buffer.push(line);
    }
  }
  pushClause();

  if (clauses.length === 0) {
    clauses.push({
      clause: readableType + " Overview",
      importance: "medium",
      recommendation:
        "Summarise obligations, escalation paths, and termination mechanics so stakeholders can respond quickly.",
    });
  }

  return clauses.slice(0, 6);
}

function deriveClauseImportance(heading: string) {
  const lowered = heading.toLowerCase();
  if (/(liability|indemnification|limitation)/.test(lowered)) return "critical";
  if (/(payment|fees|pricing)/.test(lowered)) return "high";
  if (/(termination|term)/.test(lowered)) return "high";
  if (/(confidential|privacy|data)/.test(lowered)) return "high";
  if (/(service level|sla|performance)/.test(lowered)) return "high";
  return "medium";
}

function deriveClauseRecommendation(heading: string, readableType: string) {
  const lowered = heading.toLowerCase();
  if (/(liability|indemnification|limitation)/.test(lowered)) {
    return "Align liability caps, exclusions, and indemnity triggers with insurance limits and risk appetite.";
  }
  if (/(payment|fees|pricing)/.test(lowered)) {
    return "Verify invoicing cadence, indexation mechanisms, and late payment remedies against finance policies.";
  }
  if (/(termination|term)/.test(lowered)) {
    return "Clarify termination triggers, cure periods, and transition support responsibilities.";
  }
  if (/(confidential|privacy|data)/.test(lowered)) {
    return "Confirm confidentiality and data-processing provisions meet regulatory expectations.";
  }
  if (/(service level|sla|performance)/.test(lowered)) {
    return "Benchmark service commitments against operational capacity and downstream obligations.";
  }
  return (
    "Document how this section influences governance for the " +
    readableType +
    "."
  );
}

function buildRecommendations(reviewType: string, readableType: string) {
  const recommendations = [
    "Circulate a concise briefing covering legal, commercial, and operational obligations.",
    "Create a shared workspace to track milestones, approvals, and compliance evidence.",
  ];

  if (reviewType === "risk_assessment") {
    recommendations.push(
      "Prioritise mitigation plans for high-impact clauses and update the enterprise risk register.",
    );
  } else if (reviewType === "compliance_score") {
    recommendations.push(
      "Validate privacy, data handling, and security commitments against current control frameworks.",
    );
  } else if (reviewType === "perspective_review") {
    recommendations.push(
      "Prepare negotiation options that address each stakeholder's commercial and strategic objectives.",
    );
  } else {
    recommendations.push(
      "Translate the " +
        readableType +
        " into an executive playbook highlighting strategic opportunities.",
    );
  }

  return recommendations;
}

function buildActionItems(reviewType: string, readableType: string) {
  const items = [
    "Assign accountable owners to monitor contractual milestones and escalate risks promptly.",
    "Schedule a 30-day post-signature readiness review covering resources and compliance evidence.",
  ];

  if (reviewType === "compliance_score") {
    items.push(
      "Document data inventories, retention rules, and incident response steps tied to contractual obligations.",
    );
  } else if (reviewType === "risk_assessment") {
    items.push(
      "Capture identified risks with owners, due dates, and success indicators.",
    );
  } else if (reviewType === "perspective_review") {
    items.push(
      "Prepare tailored communications for each stakeholder outlining benefits and trade-offs.",
    );
  } else {
    items.push(
      "Develop a one-page executive summary emphasising the " +
        readableType +
        " objectives and metrics.",
    );
  }

  return items;
}

function extractBasicTerms(text: string, readableType: string) {
  const sanitized = text.replace(/\s+/g, " ");
  const money = sanitized.match(/\$\s?([0-9,.]+)/);
  const netTerms = sanitized.match(/net\s*(\d{1,3})/i);
  const governingLaw = sanitized.match(/governing law[:\s]+([A-Za-z ]{3,40})/i);
  const duration = sanitized.match(
    /(term|duration)[:\s]+([0-9]+\s*(days?|months?|years?))/i,
  );

  return {
    contract_value: money ? "$" + money[1] : "Confirm contract value",
    payment_terms: netTerms
      ? "Payment due net " + netTerms[1] + " days"
      : "Review payment cadence",
    governing_law: governingLaw
      ? governingLaw[1].trim()
      : "Confirm governing law",
    duration: duration ? duration[2] : "Review stated term",
    key_milestones: [
      "Capture milestone due dates and acceptance criteria in the delivery tracker.",
    ],
    performance_metrics: [
      "Define measurable KPIs aligned to the " +
        readableType +
        " service expectations.",
    ],
    termination_triggers: [
      "Document termination rights, notice periods, and exit responsibilities.",
    ],
  };
}

function buildRisks(text: string, readableType: string) {
  const lowered = text.toLowerCase();
  const risks: Array<{
    type: string;
    level: string;
    description: string;
    recommendation: string;
    impact_score: number;
    probability: number;
    mitigation_complexity: string;
    timeline: string;
    cascading_effects: string[];
  }> = [];

  if (/(liability|indemnification|damages)/.test(lowered)) {
    risks.push({
      type: "legal",
      level: "high",
      description:
        "Liability and indemnity language may increase exposure if not aligned with insurance coverage.",
      recommendation:
        "Reconcile liability caps and exclusions with insurance policies and negotiate fair carve-outs.",
      impact_score: 8,
      probability: 0.42,
      mitigation_complexity: "moderate",
      timeline: "immediate",
      cascading_effects: [
        "Higher litigation cost",
        "Potential disputes with counterparties",
      ],
    });
  }

  if (/(payment|invoice|fees|pricing)/.test(lowered)) {
    risks.push({
      type: "financial",
      level: "medium",
      description:
        "Payment and pricing clauses require disciplined cash-flow management and billing accuracy.",
      recommendation:
        "Align invoicing cadence, approval workflows, and revenue recognition policies.",
      impact_score: 7,
      probability: 0.38,
      mitigation_complexity: "simple",
      timeline: "short_term",
      cascading_effects: ["Revenue leakage", "Customer dissatisfaction"],
    });
  }

  if (/(privacy|data|gdpr|security|breach)/.test(lowered)) {
    risks.push({
      type: "compliance",
      level: "high",
      description:
        "Data handling clauses impose regulatory obligations that must match internal controls.",
      recommendation:
        "Review privacy and security commitments, confirm breach notification timings, and evidence safeguards.",
      impact_score: 8,
      probability: 0.35,
      mitigation_complexity: "moderate",
      timeline: "short_term",
      cascading_effects: ["Regulatory enquiry", "Mandatory remediation"],
    });
  }

  if (risks.length === 0) {
    risks.push({
      type: "strategic",
      level: "medium",
      description:
        "Ensure the " +
        readableType +
        " remains aligned with business objectives and capacity planning.",
      recommendation:
        "Hold a cross-functional review to validate objectives, resources, and success measures.",
      impact_score: 6,
      probability: 0.32,
      mitigation_complexity: "moderate",
      timeline: "short_term",
      cascading_effects: ["Delayed value realisation"],
    });
  }

  return risks.slice(0, 4);
}

function buildRiskInteractions() {
  return [
    {
      risk_combination: ["legal", "financial"],
      compound_effect: "amplified",
      description:
        "Financial penalties may escalate if liability provisions are triggered and payment controls lag behind.",
    },
  ];
}

function buildScenarioAnalysis(readableType: string) {
  return {
    best_case:
      "All parties execute obligations smoothly, accelerating the " +
      readableType +
      " objectives and strengthening partnership confidence.",
    worst_case:
      "Unmanaged disputes, compliance findings, or service failures trigger renegotiation or termination events.",
    most_likely:
      "Routine governance with targeted improvements keeps commitments on track and risks contained.",
  };
}

function buildComplianceAreas(text: string) {
  const lowered = text.toLowerCase();
  return {
    gdpr: /(gdpr|european)/.test(lowered) ? 78 : 66,
    ccpa: /(ccpa|california)/.test(lowered) ? 74 : 62,
    data_protection: /(security|encryption|breach)/.test(lowered) ? 82 : 70,
    financial_regulations: /(sox|audit|financial reporting)/.test(lowered)
      ? 72
      : 60,
    industry_standards: 72,
    cross_border_transfers: /(transfer|international)/.test(lowered) ? 70 : 58,
    consent_management: /(consent|opt[- ]out)/.test(lowered) ? 73 : 60,
    breach_response: /(incident|breach)/.test(lowered) ? 80 : 68,
  };
}

function buildComplianceViolations(text: string) {
  const lowered = text.toLowerCase();
  const violations: Array<{
    framework: string;
    severity: string;
    description: string;
    recommendation: string;
    regulatory_risk: string;
    enforcement_likelihood: number;
    potential_penalty: string;
  }> = [];

  if (!/(breach|notification|incident)/.test(lowered)) {
    violations.push({
      framework: "Incident Response",
      severity: "medium",
      description:
        "Incident response steps are not clearly documented within the contract.",
      recommendation:
        "Add explicit breach notification timelines, roles, and evidence requirements.",
      regulatory_risk: "medium",
      enforcement_likelihood: 0.3,
      potential_penalty: "Regulatory remediation and contractual penalties",
    });
  }

  if (!/(consent|opt[- ]out)/.test(lowered)) {
    violations.push({
      framework: "Consent Management",
      severity: "medium",
      description:
        "Individual consent and rights handling obligations should be clarified.",
      recommendation:
        "Document lawful basis, consent withdrawal processes, and response SLAs.",
      regulatory_risk: "medium",
      enforcement_likelihood: 0.28,
      potential_penalty: "Compliance remediation programme",
    });
  }

  if (violations.length === 0) {
    violations.push({
      framework: "General Compliance",
      severity: "low",
      description:
        "Maintain continuous monitoring to evidence contractual compliance.",
      recommendation:
        "Schedule quarterly compliance reviews with documented outcomes.",
      regulatory_risk: "low",
      enforcement_likelihood: 0.18,
      potential_penalty: "Minimal if monitoring remains active",
    });
  }

  return violations;
}

function buildComplianceGaps(text: string) {
  const gaps: Array<{
    area: string;
    gap_description: string;
    remediation_steps: string[];
    priority: string;
    timeline: string;
  }> = [];

  gaps.push({
    area: "Policy Alignment",
    gap_description:
      "Ensure internal policies reflect contractual obligations for data handling and security.",
    remediation_steps: [
      "Review security policies",
      "Update privacy notices",
      "Document evidence repositories",
    ],
    priority: "high",
    timeline: "90_days",
  });

  if (!/(audit|evidence|reporting)/i.test(text)) {
    gaps.push({
      area: "Audit Readiness",
      gap_description:
        "Audit and evidence production requirements are not explicitly documented.",
      remediation_steps: [
        "Create audit checklist",
        "Define evidence storage process",
      ],
      priority: "medium",
      timeline: "120_days",
    });
  }

  return gaps;
}

function buildRegulatoryLandscape(readableType: string) {
  return {
    upcoming_changes: [
      "Monitor evolving AI governance and privacy regulations impacting contractual obligations.",
    ],
    enforcement_trends: [
      "Regulators increasingly expect demonstrable accountability and evidence of compliance controls.",
    ],
    best_practices: [
      "Embed privacy-by-design and security-by-design checkpoints into the " +
        readableType +
        " delivery lifecycle.",
    ],
  };
}

function buildRemediationRoadmap(readableType: string) {
  return [
    {
      phase: "Stabilise",
      actions: [
        "Confirm data inventories, retention schedules, and access controls align with contractual promises.",
      ],
      timeline: "0-30 days",
      priority: "critical",
    },
    {
      phase: "Optimise",
      actions: [
        "Introduce continuous monitoring dashboards covering " +
          readableType +
          " KPIs and compliance evidence.",
      ],
      timeline: "30-90 days",
      priority: "high",
    },
  ];
}

function buildPerspectives(text: string) {
  const sentences = splitSentences(text);
  const first =
    sentences[0] ||
    "Validate that deliverables and acceptance criteria are measurable and achievable.";
  const second =
    sentences[1] ||
    "Structured obligations provide predictable service outcomes and transparency.";
  const third =
    sentences[2] ||
    "Manage resource allocation, change control, and out-of-scope requests carefully.";
  const fourth =
    sentences[3] ||
    "Contract clarifies payment structure and governance cadences for reliable delivery.";

  return {
    buyer: {
      score: 74,
      concerns: [first],
      advantages: [second],
    },
    seller: {
      score: 77,
      concerns: [third],
      advantages: [fourth],
    },
    legal: {
      score: 72,
      concerns: [
        "Indemnity, liability, and dispute resolution terms require structured oversight and documentation.",
      ],
      advantages: [
        "Confidentiality and intellectual property provisions appear sufficient but should be monitored for compliance.",
      ],
    },
    individual: {
      score: 71,
      concerns: [
        "Confirm personal data usage, monitoring, or audit rights remain proportionate and transparent.",
      ],
      advantages: [
        "Clear escalation channels support individual rights and issue resolution.",
      ],
    },
  };
}

function buildStakeholderConflicts() {
  return [
    {
      conflicting_interests: ["buyer", "seller"],
      impact:
        "Commercial flexibility versus cost certainty requires structured negotiation and performance triggers.",
      resolution_strategies: [
        "Introduce tiered service options with aligned pricing to balance cost and flexibility.",
      ],
    },
    {
      conflicting_interests: ["legal", "seller"],
      impact:
        "Liability posture must reconcile with commercial appetite for risk.",
      resolution_strategies: [
        "Propose calibrated liability caps with carve-outs supported by insurance evidence.",
      ],
    },
  ];
}

function buildNegotiationOpportunities() {
  return [
    {
      area: "Service Levels",
      potential_improvements: [
        "Offer credit mechanisms convertible to service enhancements for repeated SLA misses.",
      ],
      stakeholder_benefits: [
        "Buyer gains operational assurance while seller retains flexibility to remediate issues collaboratively.",
      ],
    },
    {
      area: "Renewal",
      potential_improvements: [
        "Link renewal options to agreed performance outcomes and market benchmarking.",
      ],
      stakeholder_benefits: [
        "Supports predictable planning while recognising demonstrated performance.",
      ],
    },
  ];
}

function buildBusinessImpact(readableType: string) {
  return {
    revenue_implications:
      "Revenue realisation depends on disciplined invoicing and milestone acceptance aligned to the agreement.",
    cost_structure:
      "Cost management should reflect resourcing, change control, and potential penalties.",
    operational_changes:
      "Operational teams must align processes to contractual obligations from day one.",
    strategic_value:
      "Formalises a " +
      readableType +
      " partnership reinforcing strategic goals.",
  };
}

function buildCommercialTerms(text: string, readableType: string) {
  const terms: Array<{
    term: string;
    value: string;
    business_impact: string;
    benchmark: string;
  }> = [];

  if (/net\s*30/i.test(text)) {
    terms.push({
      term: "Payment Terms",
      value: "Net 30",
      business_impact:
        "Requires tight invoice approval and cash-flow monitoring.",
      benchmark: "market",
    });
  }

  if (/exclusive/i.test(text)) {
    terms.push({
      term: "Exclusivity",
      value: "Exclusive arrangement",
      business_impact:
        "Limits optionality; ensure performance gates justify exclusivity and capture renegotiation levers.",
      benchmark: "unfavorable",
    });
  }

  if (terms.length === 0) {
    terms.push({
      term: "Commercial Overview",
      value: "Standard obligations",
      business_impact:
        "Document key commercial assumptions to support governance and reporting.",
      benchmark: "market",
    });
  }

  return terms;
}

function buildRiskSummary(readableType: string) {
  return {
    overall_risk_level: "medium",
    key_risks: [
      "Monitor liability, payment, and termination provisions across the " +
        readableType +
        ".",
    ],
    mitigation_strategies: [
      "Assign owners, track mitigation progress, and integrate obligations into governance cadences.",
    ],
    risk_tolerance_required: "moderate",
  };
}

function buildCommercialAnalysis(readableType: string) {
  return {
    deal_structure:
      "Structured " +
      readableType +
      " with clear obligations and shared governance expectations.",
    value_proposition:
      "Delivers mutual value when obligations are tracked and communication stays active.",
    competitive_position: "neutral",
    market_conditions:
      "Monitor regulatory and market developments influencing contractual assumptions.",
  };
}

function buildPerformanceFramework() {
  return {
    success_metrics: [
      "Service availability meets contractual thresholds.",
      "Milestones completed on schedule with approvals recorded.",
    ],
    performance_standards: [
      "Document SLAs and escalation paths with accountable owners.",
    ],
    monitoring_requirements: [
      "Publish monthly dashboards and convene quarterly governance reviews.",
    ],
  };
}

function buildStrategicRecommendations(readableType: string) {
  return [
    {
      recommendation:
        "Create a living playbook summarising the " +
        readableType +
        " obligations and decision points.",
      rationale:
        "Improves cross-functional visibility and accelerates issue resolution.",
      priority: "high",
      timeline: "30_days",
    },
    {
      recommendation:
        "Align commercial, legal, and delivery teams on renewal strategy six months ahead of expiry.",
      rationale: "Reduces renegotiation friction and supports long-term value.",
      priority: "medium",
      timeline: "90_days",
    },
  ];
}

function buildImplementationRoadmap(readableType: string) {
  return [
    {
      phase: "Mobilise",
      activities: [
        "Kick-off covering obligations, success metrics, and communication cadence.",
      ],
      timeline: "Week 1",
      resources_required: ["Legal", "Commercial", "Delivery"],
    },
    {
      phase: "Execute",
      activities: [
        "Track milestone completion, manage change requests, and document approvals in a shared workspace.",
      ],
      timeline: "Weeks 2-8",
      resources_required: ["Project Management", "Operations"],
    },
  ];
}
