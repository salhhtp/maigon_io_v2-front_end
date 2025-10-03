// AI Model configurations for classification
const AI_CONFIGS = {
  "openai-gpt-4": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4-turbo-preview",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
  },
};

interface ClassificationRequest {
  content: string;
  fileName: string;
}

interface ClassificationResult {
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
  fallback_used?: boolean;
  fallback_reason?: string;
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let request: ClassificationRequest | null = null;

  try {
    console.log("🤖 Starting contract classification request...");

    try {
      request = await req.json();
    } catch (parseError) {
      const message = extractErrorMessage(parseError);
      console.error("❌ Failed to parse request JSON:", {
        message,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!request || !request.content) {
      return new Response(
        JSON.stringify({ error: "Content is required for classification" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("📄 Classification request:", {
      contentLength: request.content.length,
      fileName: request.fileName,
    });

    // Get API key
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("🔑 OpenAI API key not configured for classification:", {
        timestamp: new Date().toISOString(),
      });

      const fallback = generateFallbackClassification(
        request.content,
        request.fileName,
      );
      fallback.fallback_reason = "OpenAI API key not configured for classification";

      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: ClassificationResult;
    try {
      result = await classifyWithAI(request, apiKey);
    } catch (analysisError) {
      const message = extractErrorMessage(analysisError);
      console.error("❌ AI classification provider failed:", {
        message,
        timestamp: new Date().toISOString(),
      });

      const fallback = generateFallbackClassification(
        request.content,
        request.fileName,
      );
      fallback.fallback_reason = `Primary classification provider error: ${message}`;

      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Contract classification completed:", {
      contractType: result.contractType,
      confidence: result.confidence,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    const type = error instanceof Error ? error.name : typeof error;

    console.error("❌ Classification error:", {
      message,
      type,
      timestamp: new Date().toISOString(),
    });

    const fallback = generateFallbackClassification(
      request?.content || "",
      request?.fileName,
    );
    fallback.fallback_reason = `Edge function error: ${message}`;

    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "[object Object]";
    }
  }
  return String(error);
}

async function classifyWithAI(
  request: ClassificationRequest,
  apiKey: string,
): Promise<ClassificationResult> {
  const modelConfig = AI_CONFIGS["openai-gpt-4"];

  const systemPrompt = `You are a world-class legal document classifier and contract analysis expert with 20+ years of experience across multiple jurisdictions and industries. You have deep expertise in:

- International commercial law and contract structures
- Regulatory compliance frameworks (GDPR, CCPA, HIPAA, SOX, PCI-DSS)
- Industry-specific contracting practices
- Legal terminology and clause identification
- Multi-jurisdictional contract types and variations
- Commercial transaction patterns and business models

Your classifications are relied upon by Fortune 500 companies, law firms, and regulatory bodies for critical business decisions.

**PRIMARY CONTRACT CATEGORIES** (with detailed identification criteria):

1. **data_processing_agreement**:
   - Keywords: "personal data", "data subject", "controller", "processor", "GDPR", "EDPB", "data protection", "processing activities"
   - Clauses: security measures, sub-processing, data breach notification, audit rights, cross-border transfers, SCCs
   - Regulatory: GDPR Article 28 compliance, data protection impact assessments

2. **non_disclosure_agreement**:
   - Keywords: "confidential information", "proprietary", "trade secrets", "non-disclosure", "confidentiality obligations"
   - Clauses: definition of confidential info, permitted disclosures, return/destruction, non-compete/non-solicit
   - Types: mutual/unilateral NDAs, standalone/embedded confidentiality provisions

3. **privacy_policy_document**:
   - Keywords: "privacy policy", "data collection", "user rights", "cookie policy", "privacy notice", "personal information"
   - Elements: data categories, processing purposes, legal basis, retention, rights, contact details
   - Compliance: GDPR transparency requirements, CCPA disclosures, privacy shield

4. **consultancy_agreement**:
   - Keywords: "consulting services", "professional services", "advisory", "expertise", "deliverables", "statement of work"
   - Clauses: scope of services, fees, expenses, independent contractor, work product ownership
   - Types: strategic advisory, technical consulting, interim management

5. **research_development_agreement**:
   - Keywords: "research", "development", "innovation", "intellectual property", "patents", "technology transfer", "R&D collaboration"
   - Clauses: IP ownership, joint inventions, publication rights, commercialization, milestones
   - Types: sponsored research, joint development, technology licensing

6. **end_user_license_agreement**:
   - Keywords: "license", "end user", "software", "permitted use", "restrictions", "license grant", "proprietary rights"
   - Clauses: license scope, restrictions, warranties, support, updates, termination
   - Types: perpetual/subscription, enterprise/individual, SaaS/on-premise

7. **product_supply_agreement**:
   - Keywords: "supply", "purchase", "procurement", "delivery", "goods", "products", "specifications", "quantity"
   - Clauses: pricing, delivery terms, quality standards, warranties, returns, force majeure
   - Types: master supply, purchase orders, distribution, manufacturing

8. **general_commercial**:
   - Any other commercial agreements: service agreements, partnership agreements, joint ventures, franchise, licensing (non-software), employment, sales contracts
   - Use when contract doesn't clearly fit the 7 specific categories above

**CLASSIFICATION METHODOLOGY**:
1. Analyze document title and headings (weight: 20%)
2. Identify key legal terminology and phrases (weight: 30%)
3. Examine clause structure and obligations (weight: 25%)
4. Assess regulatory references and compliance requirements (weight: 15%)
5. Consider business context and transaction type (weight: 10%)

Be precise, analytical, and provide high confidence classifications only when clear indicators are present.`;

  const analysisPrompt = `Perform a comprehensive classification analysis of this contract using your expert methodology:

**ANALYSIS FRAMEWORK**:

1. **Document Structure Analysis**: Examine title, sections, headings, and overall organization
2. **Terminology Extraction**: Identify key legal terms, defined terms, and specialized vocabulary
3. **Clause Identification**: Categorize main clauses (obligations, rights, warranties, liabilities, etc.)
4. **Regulatory Mapping**: Identify referenced laws, regulations, and compliance frameworks
5. **Transaction Pattern Recognition**: Determine the underlying business model and transaction type
6. **Jurisdiction Assessment**: Note governing law and jurisdictional indicators
7. **Party Relationship**: Understand roles (controller/processor, buyer/seller, licensor/licensee, etc.)

**REQUIRED OUTPUT**:

Provide detailed classification with:
- **Primary Classification**: Most appropriate category from the 8 types
- **Confidence Score**: Based on clarity of indicators (0.9+ for clear matches, 0.7-0.9 for strong matches, 0.5-0.7 for partial matches)
- **Sub-Type**: Specific variant within category (e.g., "Mutual NDA", "GDPR-compliant DPA", "SaaS EULA")
- **Key Characteristics**: 5-10 distinctive features that led to classification
- **Classification Reasoning**: Detailed explanation of decision factors
- **Suggested Solutions**: Recommended analysis types based on contract type and complexity

**CRITICAL INDICATORS TO EXAMINE**:
${request.fileName ? `- File Name: "${request.fileName}" (may contain type hints)` : ""}
- Opening recitals and whereas clauses
- Definitions section (especially defined terms like "Personal Data", "Confidential Information")
- Primary obligations and deliverables
- Payment/consideration structure
- Regulatory references (GDPR, CCPA, industry standards)
- Termination and duration provisions
- Governing law and jurisdiction
- Special provisions (IP, warranties, indemnification)

Return JSON in this EXACT structure (valid JSON required):
{
  "contractType": "string (exactly one of: data_processing_agreement, non_disclosure_agreement, privacy_policy_document, consultancy_agreement, research_development_agreement, end_user_license_agreement, product_supply_agreement, general_commercial)",
  "confidence": number (0.5-1.0, precise to 2 decimals),
  "subType": "string (specific variant or null)",
  "characteristics": [
    "string (5-10 distinctive features)",
    "include specific clause references",
    "note regulatory frameworks",
    "identify party roles and relationships",
    "highlight unique contractual elements"
  ],
  "reasoning": "string (2-3 sentences explaining why this classification was chosen, referencing specific evidence from the contract)",
  "suggestedSolutions": [
    "string array (2-4 recommended analysis types)",
    "match to contract nature: compliance_score for DPAs/Privacy, risk_assessment for commercial deals, perspective_review for negotiations, full_summary for complex agreements"
  ],
  "keyTerms": [
    "string array (5-10 important defined terms or legal concepts found in contract)"
  ],
  "jurisdiction": "string (governing law if identifiable, or 'Not specified')",
  "partyRoles": {
    "party1": "string (role description, e.g., 'Data Controller', 'Disclosing Party')",
    "party2": "string (role description, e.g., 'Data Processor', 'Receiving Party')"
  }
}

**CONTRACT CONTENT TO ANALYZE**:
${request.content.substring(0, 8000)}

${request.content.length > 8000 ? `\n[Note: Content truncated at 8000 characters for analysis. Full length: ${request.content.length} characters]` : ""}

**FILE NAME**: ${request.fileName || "Not provided"}

Analyze thoroughly and provide precise classification based on the evidence found in the contract.`;

  const requestBody = {
    model: modelConfig.model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: analysisPrompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  };

  console.log("🚀 Calling OpenAI for contract classification...");

  const response = await fetch(modelConfig.baseUrl, {
    method: "POST",
    headers: modelConfig.headers(apiKey),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ OpenAI API error:", {
      status: response.status,
      errorText: errorText,
      model: modelConfig.model,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response from OpenAI API");
  }

  const content = data.choices[0].message.content;

  try {
    const result = JSON.parse(content);
    console.log("📊 AI Classification result:", result);

    const validatedResult: ClassificationResult = {
      contractType: result.contractType || "general_commercial",
      confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
      subType: result.subType || null,
      characteristics:
        Array.isArray(result.characteristics) &&
        result.characteristics.length > 0
          ? result.characteristics
          : ["Commercial agreement requiring detailed analysis"],
      reasoning:
        result.reasoning ||
        "AI-powered classification based on content analysis",
      suggestedSolutions:
        Array.isArray(result.suggestedSolutions) &&
        result.suggestedSolutions.length > 0
          ? result.suggestedSolutions
          : ["full_summary", "risk_assessment"],
      keyTerms: Array.isArray(result.keyTerms) ? result.keyTerms : [],
      jurisdiction: result.jurisdiction || "Not specified",
      partyRoles: {
        party1: result.partyRoles?.party1 || "Not specified",
        party2: result.partyRoles?.party2 || "Not specified",
      },
    };

    console.log("✅ Enhanced classification result:", {
      type: validatedResult.contractType,
      confidence: validatedResult.confidence,
      subType: validatedResult.subType,
      suggestedSolutions: validatedResult.suggestedSolutions,
    });

    return validatedResult;
  } catch (parseError) {
    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    console.error("❌ Failed to parse AI response:", {
      error: errorMessage,
      type: parseError instanceof Error ? parseError.name : typeof parseError,
      timestamp: new Date().toISOString(),
    });
    throw new Error("Failed to parse AI classification response");
  }
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
    confidence: 0.87,
    keywords: [
      "research",
      "development",
      "intellectual property",
      "invention",
      "technology transfer",
      "commercialization",
      "publication",
    ],
    characteristics: [
      "Innovation or R&D cooperation described",
      "IP ownership or licensing language",
      "Milestones or research phases outlined",
      "Publication or confidentiality restrictions",
    ],
    solutions: ["full_summary", "perspective_review"],
    reasoning:
      "IP-centric collaboration language indicates a research and development agreement.",
    aliases: ["r&d", "research-development", "collaboration"],
    partyRoles: {
      party1: "Research Sponsor",
      party2: "Research Partner",
    },
  },
  {
    type: "end_user_license_agreement",
    confidence: 0.9,
    keywords: [
      "license",
      "end user",
      "software",
      "permitted use",
      "license grant",
      "restrictions",
      "updates",
      "support",
    ],
    characteristics: [
      "Software license grant and restrictions",
      "Usage limitations or prohibited actions",
      "Update, maintenance, or support terms",
      "Termination tied to license violations",
    ],
    solutions: ["risk_assessment", "full_summary"],
    reasoning:
      "Software usage and licensing restrictions identify an end user license agreement.",
    aliases: ["eula", "license agreement"],
    partyRoles: {
      party1: "Licensor",
      party2: "Licensee",
    },
  },
  {
    type: "product_supply_agreement",
    confidence: 0.86,
    keywords: [
      "supply",
      "purchase",
      "buyer",
      "seller",
      "delivery",
      "quantity",
      "specifications",
      "warranty",
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

function generateFallbackClassification(
  content: string,
  fileName?: string,
): ClassificationResult {
  const contentLower = (content || "").toLowerCase();
  const fileLower = (fileName || "").toLowerCase();

  if (contentLower.length === 0) {
    return {
      contractType: DEFAULT_RULE.type,
      confidence: DEFAULT_RULE.confidence,
      subType: DEFAULT_RULE.subType || null,
      characteristics: DEFAULT_RULE.characteristics,
      reasoning: `${DEFAULT_RULE.reasoning} Original content unavailable for analysis.`,
      suggestedSolutions: DEFAULT_RULE.solutions,
      keyTerms: ["Contract content unavailable"],
      jurisdiction: "Not specified",
      partyRoles: DEFAULT_RULE.partyRoles,
      fallback_used: true,
    };
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
      const targets = [
        rule.type.replace(/_/g, " "),
        ...(rule.aliases ?? []),
      ];
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

  const chosenRule = bestRule.score >= 2 ? bestRule.rule : DEFAULT_RULE;
  const keyTerms = deriveKeyTerms(contentLower, chosenRule);

  return {
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
  };
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
      return [
        "commercial obligations",
        "service levels",
        "payment terms",
      ];
    }
    return rule.keywords.slice(0, 6).map(formatKeyword);
  }

  return Array.from(unique).slice(0, 8);
}

function formatKeyword(keyword: string): string {
  return keyword.replace(/[_-]/g, " ").trim();
}
