export interface ClassificationResult {
  contractType: string;
  confidence: number;
  subType: string | null;
  characteristics: string[];
  reasoning: string;
  suggestedSolutions: string[];
  keyTerms: string[];
  jurisdiction: string;
  partyRoles: {
    party1: string;
    party2: string;
  };
  fallback_used: boolean;
  fallback_reason?: string;
  confidence_band?: "high" | "medium" | "low";
  generated_at?: string;
  source?: string;
  model_used?: string;
  recommendedSolutionKey?: SolutionKey | null;
  recommendedSolutionTitle?: string | null;
}

type SolutionKey = "nda" | "dpa" | "eula" | "ppc" | "psa" | "ca" | "rda";

const TYPE_TO_SOLUTION_KEY: Record<string, SolutionKey> = {
  non_disclosure_agreement: "nda",
  data_processing_agreement: "dpa",
  end_user_license_agreement: "eula",
  privacy_policy_document: "ppc",
  product_supply_agreement: "psa",
  consultancy_agreement: "ca",
  research_development_agreement: "rda",
};

const SOLUTION_DISPLAY_NAMES: Record<SolutionKey, string> = {
  nda: "Non-Disclosure Agreement",
  dpa: "Data Processing Agreement",
  eula: "End User License Agreement",
  ppc: "Privacy Policy Compliance",
  psa: "Product Supply Agreement",
  ca: "Consultancy Agreement",
  rda: "Research & Development Agreement",
};

function assignRecommendation(
  result: ClassificationResult,
  fallbackContractType?: string,
): ClassificationResult {
  let key =
    result.recommendedSolutionKey ??
    TYPE_TO_SOLUTION_KEY[result.contractType] ??
    undefined;

  if (!key && fallbackContractType) {
    key = TYPE_TO_SOLUTION_KEY[fallbackContractType];
  }

  if (!key) {
    return result;
  }

  const title =
    result.recommendedSolutionTitle ?? SOLUTION_DISPLAY_NAMES[key];

  if (
    result.recommendedSolutionKey === key &&
    result.recommendedSolutionTitle === title
  ) {
    return result;
  }

  return {
    ...result,
    recommendedSolutionKey: key,
    recommendedSolutionTitle: title,
  };
}

interface FallbackRule {
  type: string;
  confidence: number;
  keywords: string[];
  characteristics: string[];
  solutions: string[];
  reasoning: string;
  subType?: string;
  aliases?: string[];
  partyRoles: {
    party1: string;
    party2: string;
  };
}

const FALLBACK_RULES: FallbackRule[] = [
  {
    type: "data_processing_agreement",
    confidence: 0.92,
    keywords: [
      "data processing",
      "personal data",
      "controller",
      "processor",
      "gdpr",
      "data subject",
      "edpb",
      "data protection",
      "sub-processor",
      "breach notification",
    ],
    characteristics: [
      "GDPR and data protection obligations referenced",
      "Controller and processor roles defined",
      "Security and breach notification terms present",
      "Sub-processing or data transfer restrictions identified",
    ],
    solutions: ["compliance_score", "perspective_review"],
    reasoning:
      "References to personal data handling and GDPR-style obligations align with a data processing agreement.",
    subType: "GDPR-aligned DPA",
    aliases: ["dpa", "data-processing"],
    partyRoles: {
      party1: "Data Controller",
      party2: "Data Processor",
    },
  },
  {
    type: "non_disclosure_agreement",
    confidence: 0.9,
    keywords: [
      "confidential",
      "non-disclosure",
      "receiving party",
      "disclosing party",
      "trade secret",
      "proprietary information",
      "return or destroy",
    ],
    characteristics: [
      "Confidential information definitions present",
      "Restrictions on disclosure or use",
      "Obligations to return or destroy materials",
      "Duration or survival clauses for confidentiality",
    ],
    solutions: ["full_summary", "risk_assessment"],
    reasoning:
      "Confidentiality-focused language and party roles indicate a non-disclosure agreement.",
    subType: "Mutual NDA",
    aliases: ["nda", "non-disclosure"],
    partyRoles: {
      party1: "Disclosing Party",
      party2: "Receiving Party",
    },
  },
  {
    type: "privacy_policy_document",
    confidence: 0.88,
    keywords: [
      "privacy policy",
      "personal information",
      "cookie",
      "user rights",
      "data retention",
      "data collection",
      "do not sell",
      "ccpa",
      "gdpr",
    ],
    characteristics: [
      "User rights and privacy disclosures present",
      "References to data collection or retention",
      "Mentions of GDPR, CCPA, or similar regulations",
      "Instructions for contacting privacy officer or exercising rights",
    ],
    solutions: ["compliance_score", "full_summary"],
    reasoning:
      "Regulatory transparency and user rights language matches a privacy policy document.",
    aliases: ["privacy", "privacy-policy"],
    partyRoles: {
      party1: "Service Provider",
      party2: "End User",
    },
  },
  {
    type: "consultancy_agreement",
    confidence: 0.85,
    keywords: [
      "consulting",
      "services",
      "professional services",
      "statement of work",
      "fees",
      "expenses",
      "deliverables",
      "independent contractor",
    ],
    characteristics: [
      "Professional services scope defined",
      "Payment and expense handling clauses",
      "Independent contractor language present",
      "Deliverables or milestones described",
    ],
    solutions: ["full_summary", "risk_assessment"],
    reasoning:
      "Service delivery language and statement of work references align with a consultancy agreement.",
    aliases: ["consulting", "consultancy"],
    partyRoles: {
      party1: "Client",
      party2: "Consultant",
    },
  },
  {
    type: "research_development_agreement",
    confidence: 0.82,
    keywords: [
      "research",
      "development",
      "innovation",
      "intellectual property",
      "patent",
      "technology transfer",
      "collaboration",
    ],
    characteristics: [
      "Research collaboration or development activities outlined",
      "Intellectual property ownership and licensing addressed",
      "Milestones or deliverables defined",
      "Confidentiality and publication considerations referenced",
    ],
    solutions: ["full_summary", "risk_assessment", "perspective_review"],
    reasoning:
      "Repeated references to research activity, IP ownership, and development milestones indicate an R&D agreement.",
    aliases: ["r&d", "research and development"],
    partyRoles: {
      party1: "Research Sponsor",
      party2: "Research Provider",
    },
  },
  {
    type: "end_user_license_agreement",
    confidence: 0.88,
    keywords: [
      "end user license",
      "license grant",
      "software",
      "licensor",
      "licensee",
      "usage rights",
      "subscription",
      "software updates",
    ],
    characteristics: [
      "Software or digital product licence conditions defined",
      "Usage restrictions and prohibited actions detailed",
      "Support, maintenance, or updates referenced",
      "Termination and IP ownership provisions present",
    ],
    solutions: ["risk_assessment", "full_summary"],
    reasoning:
      "Terminology around licensing, permitted use, and software maintenance is consistent with an EULA.",
    aliases: ["eula", "license agreement"],
    partyRoles: {
      party1: "Licensor",
      party2: "Licensee",
    },
  },
  {
    type: "product_supply_agreement",
    confidence: 0.84,
    keywords: [
      "supply",
      "purchase order",
      "delivery",
      "goods",
      "products",
      "quantity",
      "specifications",
      "inventory",
    ],
    characteristics: [
      "Product or goods supply obligations",
      "Delivery schedule or logistics language",
      "Pricing, invoicing, or acceptance terms",
      "Quality standards or warranties referenced",
    ],
    solutions: ["risk_assessment", "perspective_review"],
    reasoning:
      "References to goods delivery and purchase obligations indicate a product supply agreement.",
    aliases: ["supply", "supply-agreement", "purchase"],
    partyRoles: {
      party1: "Buyer",
      party2: "Supplier",
    },
  },
];

const DEFAULT_RULE: FallbackRule = {
  type: "general_commercial",
  confidence: 0.6,
  keywords: ["agreement", "services", "party", "terms", "obligations"],
  characteristics: [
    "General commercial obligations outlined",
    "Payment and performance expectations implied",
    "Risk allocation and termination provisions likely present",
  ],
  solutions: ["full_summary", "risk_assessment"],
  reasoning:
    "Contract content references broad commercial terms without clear indicators of a specialised template.",
  aliases: ["general", "commercial"],
  partyRoles: {
    party1: "Primary Party",
    party2: "Counterparty",
  },
};

function formatKeyword(keyword: string): string {
  return keyword.replace(/[_-]/g, " ").trim();
}

function deriveKeyTerms(contentLower: string, rule: FallbackRule): string[] {
  const unique = new Set<string>();

  for (const keyword of rule.keywords) {
    if (contentLower.includes(keyword)) {
      unique.add(formatKeyword(keyword));
    }
  }

  if (unique.size === 0) {
    if (rule === DEFAULT_RULE) {
      return ["commercial obligations", "service levels", "payment terms"];
    }
    return rule.keywords.slice(0, 6).map(formatKeyword);
  }

  return Array.from(unique).slice(0, 8);
}

function deriveConfidenceBand(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}

const SOLUTION_TO_TYPE: Record<string, string> = {
  dpa: "data_processing_agreement",
  nda: "non_disclosure_agreement",
  ppc: "privacy_policy_document",
  ca: "consultancy_agreement",
  rda: "research_development_agreement",
  eula: "end_user_license_agreement",
  psa: "product_supply_agreement",
};

export function generateFallbackClassification(
  content: string,
  fileName?: string,
  reason?: string,
  solutionHint?: string | null,
): ClassificationResult {
  const contentLower = (content || "").toLowerCase();
  const fileLower = (fileName || "").toLowerCase();
  const generatedAt = new Date().toISOString();
  const normalizedSolutionHint =
    typeof solutionHint === "string" && solutionHint.trim().length > 0
      ? solutionHint.trim().toLowerCase()
      : null;
  const solutionRule =
    normalizedSolutionHint && SOLUTION_TO_TYPE[normalizedSolutionHint]
      ? FALLBACK_RULES.find(
          (rule) => rule.type === SOLUTION_TO_TYPE[normalizedSolutionHint],
        )
      : undefined;
  const fallbackReasonMessage =
    reason ??
    (solutionRule
      ? `Classification fallback derived from selected solution hint "${normalizedSolutionHint}".`
      : undefined);

  if (contentLower.length === 0) {
    const rule = solutionRule ?? DEFAULT_RULE;
    return assignRecommendation({
      contractType: rule.type,
      confidence: rule.confidence,
      subType: rule.subType || null,
      characteristics: rule.characteristics,
      reasoning: `${rule.reasoning} Original content unavailable for analysis.`,
      suggestedSolutions: rule.solutions,
      keyTerms: ["Contract content unavailable"],
      jurisdiction: "Not specified",
      partyRoles: rule.partyRoles,
      fallback_used: true,
      fallback_reason: fallbackReasonMessage,
      confidence_band: deriveConfidenceBand(rule.confidence),
      generated_at: generatedAt,
      source: "fallback-rule-engine",
      model_used: "classification-fallback-v1",
    }, rule.type);
  }

  if (solutionRule) {
    const keyTerms = deriveKeyTerms(contentLower, solutionRule);

    return assignRecommendation({
      contractType: solutionRule.type,
      confidence: solutionRule.confidence,
      subType: solutionRule.subType || null,
      characteristics: solutionRule.characteristics,
      reasoning: `${solutionRule.reasoning} Applied selected solution hint as fallback.`,
      suggestedSolutions: solutionRule.solutions,
      keyTerms: keyTerms.length ? keyTerms : ["Solution-guided classification"],
      jurisdiction: "Not specified",
      partyRoles: solutionRule.partyRoles,
      fallback_used: true,
      fallback_reason: fallbackReasonMessage,
      confidence_band: deriveConfidenceBand(solutionRule.confidence),
      generated_at: generatedAt,
      source: "fallback-rule-engine",
      model_used: "classification-fallback-v1",
    }, solutionRule.type);
  }

  let bestRule: { rule: FallbackRule; score: number } = {
    rule: DEFAULT_RULE,
    score: 0,
  };

  for (const rule of FALLBACK_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (contentLower.includes(keyword)) {
        score += 1;
      }
    }

    if (fileLower) {
      const targets = [rule.type.replace(/_/g, " "), ...(rule.aliases ?? [])];
      for (const target of targets) {
        const normalized = target.toLowerCase();
        if (
          normalized &&
          (fileLower.includes(normalized) ||
            fileLower.includes(normalized.replace(/\s+/g, "")))
        ) {
          score += 1.5;
        }
      }
    }

    if (score > bestRule.score) {
      bestRule = { rule, score };
    }
  }

  const chosenRule =
    bestRule.score >= 2
      ? bestRule.rule
      : contentLower.includes("license agreement") || fileLower.includes("eula")
        ? FALLBACK_RULES.find((rule) => rule.type === "end_user_license_agreement") ??
          DEFAULT_RULE
        : DEFAULT_RULE;

  const keyTerms = deriveKeyTerms(contentLower, chosenRule);
  const confidenceBand = deriveConfidenceBand(chosenRule.confidence);

  return assignRecommendation({
    contractType: chosenRule.type,
    confidence: chosenRule.confidence,
    subType: chosenRule.subType || null,
    characteristics: chosenRule.characteristics,
    reasoning: chosenRule.reasoning,
    suggestedSolutions: chosenRule.solutions,
    keyTerms,
    jurisdiction: "Not specified",
    partyRoles: chosenRule.partyRoles,
    fallback_used: true,
    fallback_reason: fallbackReasonMessage,
    confidence_band: confidenceBand,
    generated_at: generatedAt,
    source: "fallback-rule-engine",
    model_used: "classification-fallback-v1",
  }, chosenRule.type);
}
