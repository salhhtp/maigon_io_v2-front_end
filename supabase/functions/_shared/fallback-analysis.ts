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
  const text = context.contractContent?.trim() ?? "";
  const contractType = normaliseContractType(
    context.contractType || context.classification?.contractType,
  );
  const sentences = splitSentences(text);
  const summary = buildSummary(sentences, contractType);
  const keyPoints = buildKeyPoints(sentences, contractType);
  const wordCount = countWords(text);
  const pages = Math.max(1, Math.round(wordCount / 360));
  const processingTime = Number(Math.max(2.5, Math.min(9, wordCount / 520)).toFixed(2));
  const score = estimateScore(wordCount, context.reviewType);
  const confidence = estimateConfidence(wordCount, context.reviewType);
  const criticalClauses = buildCriticalClauses(text, contractType);
  const recommendations = buildRecommendations(contractType, context.reviewType);
  const actionItems = buildActionItems(contractType, context.reviewType);

  const baseResult: Record<string, unknown> = {
    model_used: FALLBACK_MODEL_NAME,
    fallback_used: true,
    fallback_reason:
      context.fallbackReason ||
      "Primary AI provider unavailable. Generated deterministic analysis.",
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
    critical_clauses: criticalClauses,
    recommendations,
    action_items: actionItems,
    extracted_terms: extractBasicTerms(text),
  };

  switch (context.reviewType) {
    case "risk_assessment":
      return {
        ...baseResult,
        risks: buildRisks(text, contractType),
        risk_interactions: buildRiskInteractions(),
        scenario_analysis: buildScenarioAnalysis(contractType),
      };
    case "compliance_score":
      return {
        ...baseResult,
        compliance_areas: buildComplianceAreas(text),
        violations: buildComplianceViolations(text),
        compliance_gaps: buildComplianceGaps(text),
        regulatory_landscape: buildRegulatoryLandscape(contractType),
        remediation_roadmap: buildRemediationRoadmap(contractType),
      };
    case "perspective_review":
      const perspectives = buildPerspectives(sentences);
      return {
        ...baseResult,
        perspectives,
        stakeholder_conflicts: buildStakeholderConflicts(),
        negotiation_opportunities: buildNegotiationOpportunities(),
      };
    case "ai_integration":
    case "full_summary":
    default:
      return {
        ...baseResult,
        executive_summary: summary,
        business_impact: buildBusinessImpact(contractType),
        key_commercial_terms: buildCommercialTerms(text),
        risk_summary: buildRiskSummary(contractType),
        commercial_analysis: buildCommercialAnalysis(contractType),
        performance_framework: buildPerformanceFramework(),
        strategic_recommendations: buildStrategicRecommendations(contractType),
        implementation_roadmap: buildImplementationRoadmap(contractType),
      };
  }
}

function normaliseContractType(contractType?: string) {
  if (!contractType) return "general_commercial";
  return contractType.toLowerCase().replace(/\s+/g, "_");
}

function splitSentences(content: string) {
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function buildSummary(sentences: string[], contractType: string) {
  if (sentences.length === 0) {
    return `This ${contractType.replace("_", " ")} outlines obligations, commercial terms, and mutual responsibilities.`;
  }
  return sentences.slice(0, 3).join(" ");
}

function buildKeyPoints(sentences: string[], contractType: string) {
  if (sentences.length === 0) {
    return [
      `The ${contractType.replace("_", " ")} specifies key duties for all parties involved.`,
      "Risk allocation, commercial terms, and termination mechanics are highlighted for immediate review.",
    ];
  }
  return sentences.slice(0, 5);
}

function countWords(content: string) {
  return content.split(/\s+/).filter(Boolean).length;
}

function estimateScore(wordCount: number, reviewType: string) {
  const base = 66 + Math.min(22, Math.round(Math.log10(wordCount + 20) * 12));
  const modifier =
    reviewType === "compliance_score"
      ? 5
      : reviewType === "risk_assessment"
        ? 3
        : reviewType === "perspective_review"
          ? 4
          : 6;
  return Math.max(60, Math.min(92, base + modifier));
}

function estimateConfidence(wordCount: number, reviewType: string) {
  const base = 0.7 + Math.min(0.2, wordCount / 12000);
  const modifier = reviewType === "compliance_score" ? 0.05 : 0.03;
  return Number(Math.min(0.95, base + modifier).toFixed(2));
}

function buildCriticalClauses(content: string, contractType: string) {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const clauses: Array<{ clause: string; importance: string; recommendation: string }> = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];
  const headingPattern = /^(section\s+\d+|article\s+\d+|\d+\.\d+|[A-Z][A-Z\s\-]{3,})/;

  const pushClause = () => {
    if (!currentHeading) return;
    const text = buffer.join(" ");
    if (text.length < 40) return;
    clauses.push({
      clause: currentHeading.replace(/[:\-\s]+$/, "").slice(0, 120),
      importance: deriveClauseImportance(currentHeading),
      recommendation: deriveClauseRecommendation(currentHeading, contractType),
    });
  };

  for (const line of lines) {
    if (!line) continue;
    if (headingPattern.test(line)) {
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
        "Summarise obligations, escalation paths, and termination mechanics for quick reference.",
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

function deriveClauseRecommendation(heading: string, contractType: string) {
  const lowered = heading.toLowerCase();
  if (/(liability|indemnification|limitation)/.test(lowered)) {
    return "Align liability caps, exclusions, and indemnity triggers with current insurance and risk appetite.";
  }
  if (/(payment|fees|pricing)/.test(lowered)) {
    return "Verify invoicing cadence, indexation mechanisms, and late payment remedies.";
  }
  if (/(termination|term)/.test(lowered)) {
    return "Clarify termination triggers, cure periods, and transition support obligations.";
  }
  if (/(confidential|privacy|data)/.test(lowered)) {
    return "Confirm confidentiality and data processing provisions meet regulatory expectations.";
  }
  if (/(service level|sla|performance)/.test(lowered)) {
    return "Benchmark SLAs against operational capacity and downstream commitments.";
  }
  return `Document how this section influences ongoing governance for the ${contractType.replace("_", " ")}.`;
}

function buildRecommendations(contractType: string, reviewType: string) {
  const items = [
    "Circulate a concise briefing to legal, commercial, and delivery owners covering core obligations.",
    "Create a shared workspace to track milestones, approvals, and compliance evidence.",
  ];
  switch (reviewType) {
    case "risk_assessment":
      items.push(
        "Prioritise mitigation plans for high-impact clauses and update the enterprise risk register.",
      );
      break;
    case "compliance_score":
      items.push(
        "Validate data handling, security safeguards, and audit readiness against the latest regulatory standards.",
      );
      break;
    case "perspective_review":
      items.push(
        "Prepare negotiation scripts addressing each stakeholder's objectives before the next governance checkpoint.",
      );
      break;
    default:
      items.push(
        `Translate the ${contractType.replace("_", " ")} into an executive playbook highlighting strategic opportunities.`,
      );
  }
  return items;
}

function buildActionItems(contractType: string, reviewType: string) {
  const items = [
    "Assign accountable owners to monitor contractual milestones and escalate risks promptly.",
    "Schedule a 30-day post-signature review to confirm implementation readiness.",
  ];
  if (reviewType === "compliance_score") {
    items.push(
      "Document data inventories, retention rules, and incident response steps tied to contractual obligations.",
    );
  } else if (reviewType === "risk_assessment") {
    items.push("Capture identified risks with owners, due dates, and success indicators.");
  } else if (reviewType === "perspective_review") {
    items.push("Prepare tailored comms for each stakeholder covering benefits, trade-offs, and next steps.");
  } else {
    items.push(
      `Develop a one-page executive summary emphasising the ${contractType.replace("_", " ")} objectives and metrics.`,
    );
  }
  return items;
}

function extractBasicTerms(content: string) {
  const sanitized = content.replace(/\s+/g, " ");
  const money = sanitized.match(/\$\s?([0-9,.]+)/);
  const netTerms = sanitized.match(/net\s*(\d{1,3})/i);
  const governingLaw = sanitized.match(/governing law[:\s]+([A-Za-z ]{3,40})/i);
  const duration = sanitized.match(/(term|duration)[:\s]+([0-9]+\s*(days?|months?|years?))/i);
  return {
    contract_value: money ? `$${money[1]}` : "Confirm contract value",
    payment_terms: netTerms ? `Payment due net ${netTerms[1]} days` : "Review payment cadence",
    governing_law: governingLaw ? governingLaw[1].trim() : "Confirm governing law",
    duration: duration ? duration[2] : "Review stated term",
    key_milestones: [
      "Capture milestone due dates and acceptance criteria in the delivery tracker.",
    ],
    performance_metrics: [
      "Define measureable KPIs aligned to the contract's service expectations.",
    ],
    termination_triggers: [
      "Document termination rights, notice periods, and exit responsibilities.",
    ],
  };
}

function buildRisks(content: string, contractType: string) {
  const lowered = content.toLowerCase();
  const risks = [] as Array<{ type: string; level: string; description: string; recommendation: string; impact_score: number; probability: number; mitigation_complexity: string; timeline: string; cascading_effects: string[] }>;
  if (/(liability|indemnification|damages)/.test(lowered)) {
    risks.push({
      type: "legal",
      level: "high",
      description: `Liability and indemnity language in the ${contractType.replace("_", " ")} may increase exposure if not aligned with insurance coverage.`,
      recommendation: "Reconcile liability caps and exclusions with current insurance policies and negotiate fair carve-outs.",
      impact_score: 8,
      probability: 0.42,
      mitigation_complexity: "moderate",
      timeline: "immediate",
      cascading_effects: ["Higher litigation cost", "Potential disputes with counterparties"],
    });
  }
  if (/(payment|invoice|fees|pricing)/.test(lowered)) {
    risks.push({
      type: "financial",
      level: "medium",
      description: "Payment and pricing clauses require disciplined cash-flow management and billing accuracy.",
      recommendation: "Align invoicing cadence, approval workflows, and revenue recognition policies.",
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
      description: "Data handling clauses impose regulatory obligations that must match internal controls.",
      recommendation: "Review privacy and security commitments, confirm breach notification timings, and evidence safeguards.",
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
      description: `Ensure the ${contractType.replace("_", " ")} remains aligned with business objectives and capacity planning.",
      recommendation: "Hold a cross-functional review to validate objectives, resources, and success measures.",
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
      description: "Financial penalties may escalate if liability provisions are triggered and payment controls lag behind.",
    },
  ];
}

function buildScenarioAnalysis(contractType: string) {
  return {
    best_case: `All parties execute obligations smoothly, accelerating the ${contractType.replace("_", " ")} objectives and strengthening partnership confidence.`,
    worst_case: "Unmanaged disputes, compliance findings, or service failures trigger renegotiation or termination events.",
    most_likely: "Routine governance with targeted improvements keeps commitments on track and risks contained.",
  };
}

function buildComplianceAreas(content: string) {
  const lowered = content.toLowerCase();
  return {
    gdpr: /(gdpr|european)/.test(lowered) ? 78 : 66,
    ccpa: /(ccpa|california)/.test(lowered) ? 74 : 62,
    data_protection: /(security|encryption|breach)/.test(lowered) ? 82 : 70,
    financial_regulations: /(sox|audit|financial reporting)/.test(lowered) ? 72 : 60,
    industry_standards: 72,
    cross_border_transfers: /(transfer|international)/.test(lowered) ? 70 : 58,
    consent_management: /(consent|opt[- ]out)/.test(lowered) ? 73 : 60,
    breach_response: /(incident|breach)/.test(lowered) ? 80 : 68,
  };
}

function buildComplianceViolations(content: string) {
  const lowered = content.toLowerCase();
  const violations = [] as Array<{ framework: string; severity: string; description: string; recommendation: string; regulatory_risk: string; enforcement_likelihood: number; potential_penalty: string }>;
  if (!/(breach|notification|incident)/.test(lowered)) {
    violations.push({
      framework: "Incident Response",
      severity: "medium",
      description: "Incident response steps are not clearly documented within the contract.",
      recommendation: "Add explicit breach notification timelines, roles, and evidence requirements.",
      regulatory_risk: "medium",
      enforcement_likelihood: 0.3,
      potential_penalty: "Regulatory remediation and contractual penalties",
    });
  }
  if (!/(consent|opt[- ]out)/.test(lowered)) {
    violations.push({
      framework: "Consent Management",
      severity: "medium",
      description: "Individual consent and rights handling obligations should be clarified.",
      recommendation: "Document lawful basis, consent withdrawal processes, and response SLAs.",
      regulatory_risk: "medium",
      enforcement_likelihood: 0.28,
      potential_penalty: "Compliance remediation programme",
    });
  }
  if (violations.length === 0) {
    violations.push({
      framework: "General Compliance",
      severity: "low",
      description: "Maintain continuous monitoring to evidence contractual compliance.",
      recommendation: "Schedule quarterly compliance reviews with documented outcomes.",
      regulatory_risk: "low",
      enforcement_likelihood: 0.18,
      potential_penalty: "Minimal if monitoring remains active",
    });
  }
  return violations;
}

function buildComplianceGaps(content: string) {
  const gaps = [] as Array<{ area: string; gap_description: string; remediation_steps: string[]; priority: string; timeline: string }>;
  gaps.push({
    area: "Policy Alignment",
    gap_description: "Ensure internal policies reflect contractual obligations for data handling and security.",
    remediation_steps: [
      "Review security policies",
      "Update privacy notices",
      "Document evidence repositories",
    ],
    priority: "high",
    timeline: "90_days",
  });
  if (!/(audit|evidence|reporting)/i.test(content)) {
    gaps.push({
      area: "Audit Readiness",
      gap_description: "Audit and evidence production requirements are not explicitly documented.",
      remediation_steps: ["Create audit checklist", "Define evidence storage process"],
      priority: "medium",
      timeline: "120_days",
    });
  }
  return gaps;
}

function buildRegulatoryLandscape(contractType: string) {
  return {
    upcoming_changes: [
      "Monitor evolving AI governance and privacy regulations impacting contractual obligations.",
    ],
    enforcement_trends: [
      "Regulators increasingly expect demonstrable accountability and evidence of compliance controls.",
    ],
    best_practices: [
      `Embed privacy-by-design and security-by-design checkpoints into the ${contractType.replace("_", " ")} delivery lifecycle.`,
    ],
  };
}

function buildRemediationRoadmap(contractType: string) {
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
        `Introduce continuous monitoring dashboards covering ${contractType.replace("_", " ")} KPIs and compliance evidence.`,
      ],
      timeline: "30-90 days",
      priority: "high",
    },
  ];
}

function buildPerspectives(sentences: string[]) {
  return {
    buyer: {
      score: 74,
      concerns: [
        sentences[0] || "Validate that deliverables and acceptance criteria are measurable and achievable.",
      ],
      advantages: [
        sentences[1] || "Structured obligations provide predictable service outcomes and transparency.",
      ],
      strategic_priorities: ["Protect continuity", "Maintain cost predictability"],
      negotiation_leverage: "medium",
      risk_tolerance: "moderate",
    },
    seller: {
      score: 76,
      concerns: [
        sentences[2] || "Manage resource allocation, change control, and out-of-scope requests carefully.",
      ],
      advantages: [
        sentences[3] || "Contract clarifies payment structure and governance cadences for reliable delivery.",
      ],
      strategic_priorities: ["Secure long-term value", "Preserve margin"],
      negotiation_leverage: "medium",
      risk_tolerance: "moderate",
    },
    legal: {
      score: 72,
      concerns: [
        "Indemnity, liability, and dispute resolution terms require structured oversight and documentation.",
      ],
      advantages: [
        "Confidentiality and IP protections appear sufficient but should be monitored for compliance.",
      ],
      enforcement_issues: ["Ensure governing law and jurisdiction align with enforcement strategy."],
      regulatory_considerations: [
        "Track privacy, data residency, and export control obligations introduced by the contract.",
      ],
    },
    individual: {
      score: 70,
      concerns: [
        "Confirm personal data usage, monitoring, or audit rights remain proportionate and transparent.",
      ],
      advantages: ["Clear escalation channels support individual rights and issue resolution."],
      privacy_impact: "medium",
      rights_protection: "adequate",
    },
  };
}

function buildStakeholderConflicts() {
  return [
    {
      conflicting_interests: ["buyer", "seller"],
      impact: "Commercial flexibility versus cost certainty requires structured negotiation.",
      resolution_strategies: [
        "Introduce tiered service options with aligned pricing to balance cost and flexibility.",
      ],
    },
    {
      conflicting_interests: ["legal", "seller"],
      impact: "Liability posture must reconcile with commercial appetite for risk.",
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
        "Buyer gains operational assurance, seller retains flexibility to remediate issues collaboratively.",
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

function buildBusinessImpact(contractType: string) {
  return {
    revenue_implications: "Revenue realisation depends on disciplined invoicing and milestone acceptance.",
    cost_structure: "Cost management should reflect resourcing, change control, and potential penalties.",
    operational_changes: "Operational teams must align processes to contractual obligations from day one.",
    strategic_value: `Formalises a ${contractType.replace("_", " ")} partnership reinforcing strategic goals.`,
  };
}

function buildCommercialTerms(content: string) {
  const terms = [] as Array<{ term: string; value: string; business_impact: string; benchmark: string }>;
  if (/net\s*30/i.test(content)) {
    terms.push({
      term: "Payment Terms",
      value: "Net 30",
      business_impact: "Requires tight invoice approval and cash-flow monitoring.",
      benchmark: "market",
    });
  }
  if (/exclusive/i.test(content)) {
    terms.push({
      term: "Exclusivity",
      value: "Exclusive arrangement",
      business_impact: "Limits optionality; ensure performance gates justify exclusivity.",
      benchmark: "unfavorable",
    });
  }
  if (terms.length === 0) {
    terms.push({
      term: "Commercial Overview",
      value: "Standard obligations",
      business_impact: "Document key commercial assumptions to support governance.",
      benchmark: "market",
    });
  }
  return terms;
}

function buildRiskSummary(contractType: string) {
  return {
    overall_risk_level: "medium",
    key_risks: [
      `Monitor liability, payment, and termination provisions across the ${contractType.replace("_", " ")}.`,
    ],
    mitigation_strategies: [
      "Assign owners, track mitigation progress, and integrate obligations into governance cadences.",
    ],
    risk_tolerance_required: "moderate",
  };
}

function buildCommercialAnalysis(contractType: string) {
  return {
    deal_structure: `Structured ${contractType.replace("_", " ")} with clear obligations and shared governance expectations.`,
    value_proposition: "Delivers mutual value when obligations are tracked and communication stays active.",
    competitive_position: "neutral",
    market_conditions: "Monitor regulatory and market developments influencing contractual assumptions.",
  };
}

function buildPerformanceFramework() {
  return {
    success_metrics: [
      "Service availability meets contractual thresholds",
      "Milestones completed on schedule with approvals recorded",
    ],
    performance_standards: [
      "Document SLAs and escalation paths with accountable owners",
    ],
    monitoring_requirements: [
      "Publish monthly dashboards and convene quarterly governance reviews",
    ],
  };
}

function buildStrategicRecommendations(contractType: string) {
  return [
    {
      recommendation: `Create a living playbook summarising the ${contractType.replace("_", " ")} obligations and decision points.",
      rationale: "Improves cross-functional visibility and accelerates issue resolution.",
      priority: "high",
      timeline: "30_days",
    },
    {
      recommendation: "Align commercial, legal, and delivery teams on renewal strategy six months ahead of expiry.",
      rationale: "Reduces renegotiation friction and supports long-term value.\n",
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