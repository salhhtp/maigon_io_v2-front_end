import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  validateExtractedText,
} from "../_shared/pdf-parser.ts";
import {
  generateFallbackAnalysis,
  type FallbackAnalysisContext,
} from "../_shared/fallback-analysis.ts";

// Advanced AI Model configurations for sophisticated contract analysis
const AI_CONFIGS = {
  "openai-gpt-4": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4-turbo-preview",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    maxTokens: 4000,
    temperature: 0.1, // Lower temperature for more consistent legal analysis
  },
  "openai-gpt-4o": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
  "openai-gpt-3.5-turbo": {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
  "anthropic-claude-3": {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-sonnet-20240229",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
  "anthropic-claude-3-opus": {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-opus-20240229",
    headers: (apiKey: string) => ({
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    maxTokens: 4000,
    temperature: 0.1,
  },
};

interface AnalysisRequest {
  content: string;
  reviewType: string;
  model: string;
  customSolution?: any;
  contractType?: string;
  fileType?: string;
  fileName?: string;
  documentFormat?: string;
  filename?: string;
  classification?: {
    contractType: string;
    confidence: number;
    characteristics: string[];
    reasoning: string;
    suggestedSolutions: string[];
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTRACT_PATTERNS: Record<string, RegExp[]> = {
  nda: [
    /non[-\s]?disclosure agreement/i,
    /confidential information/i,
    /disclosing party/i,
  ],
  dpa: [/data processing agreement/i, /processor/i, /controller/i, /gdpr/i],
  eula: [/end[-\s]?user license/i, /software license/i, /licensor/i],
  ppc: [/purchase and sale contract/i, /purchase price/i, /buyer/i, /seller/i],
  rda: [
    /research and development/i,
    /collaboration/i,
    /intellectual property rights/i,
  ],
  ca: [/consulting agreement/i, /services? provider/i, /consultant/i],
  psa: [
    /professional services agreement/i,
    /statement of work/i,
    /service levels?/i,
  ],
};

function formatTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function inferDocumentFormat(filename?: string, providedFormat?: string) {
  if (providedFormat) return providedFormat.toLowerCase();
  if (!filename) return undefined;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;
  if (ext === "doc") return "docx";
  return ext;
}

function detectContractType(
  content: string,
  filename?: string,
  provided?: string,
) {
  if (provided) return provided;
  const shortContent = content.slice(0, 4000);
  let bestMatch: { type: string; score: number } | null = null;
  for (const [type, patterns] of Object.entries(CONTRACT_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(shortContent)) {
        score += 1;
      }
    }
    if (filename && filename.toLowerCase().includes(type)) {
      score += 1.5;
    }
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { type, score };
    }
  }

  return bestMatch && bestMatch.score >= 1 ? bestMatch.type : "general";
}

type ClauseSummary = {
  title: string;
  snippet: string;
  importance?: "high" | "medium" | "low";
};

function extractClauses(
  content: string,
  contractType: string,
): ClauseSummary[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const clauses: ClauseSummary[] = [];
  let currentTitle = "";
  let buffer: string[] = [];

  const headingRegex =
    /^(section\s+\d+|article\s+\d+|\d+\.\d+|[A-Z][^a-z\n]{3,})/i;

  for (const line of lines) {
    if (!line) continue;
    const isHeading = headingRegex.test(line);
    if (isHeading) {
      if (currentTitle && buffer.length) {
        clauses.push({
          title: currentTitle,
          snippet: buffer.join(" ").slice(0, 220),
        });
        buffer = [];
      }
      currentTitle = line.replace(/[:.-\s]+$/, "").slice(0, 120);
    } else if (currentTitle) {
      buffer.push(line);
    }
  }

  if (currentTitle && buffer.length) {
    clauses.push({
      title: currentTitle,
      snippet: buffer.join(" ").slice(0, 220),
    });
  }

  if (!clauses.length) {
    clauses.push({
      title: `${formatTitleCase(contractType)} overview`,
      snippet: content.slice(0, 220),
    });
  }

  return clauses.slice(0, 30);
}

function buildKpis(
  result: any,
  contractType: string,
  clauseCount: number,
  timeSavedLabel?: string,
) {
  const base = {
    contract_type: contractType,
    clauses_mapped: clauseCount,
  } as Record<string, any>;

  if (typeof result.score === "number") {
    base.score = result.score;
  }

  if (Array.isArray(result.violations)) {
    base.high_risk_findings = result.violations.filter(
      (item: any) =>
        typeof item?.severity === "string" &&
        item.severity.toLowerCase() === "high",
    ).length;
  }

  if (Array.isArray(result.risks)) {
    base.risk_count = result.risks.length;
  }

  if (Array.isArray(result.recommendations)) {
    base.recommendation_count = result.recommendations.length;
  }

  if (timeSavedLabel) {
    base.time_savings = timeSavedLabel;
  }

  return base;
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let request: AnalysisRequest | null = null;
  let processedContent: string | null = null;
  let fallbackContext: FallbackAnalysisContext | null = null;

  try {
    console.log("🚀 Starting contract analysis request...");

    // Parse request body with error handling
    try {
      request = await req.json();
    } catch (parseError) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : String(parseError);
      console.error("❌ Failed to parse request JSON:", {
        error: errorMessage,
        type: parseError instanceof Error ? parseError.name : typeof parseError,
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

    // Validate request
    if (!request || !request.content || !request.reviewType) {
      console.error("❌ Missing required fields in request:", {
        hasContent: !!request.content,
        hasReviewType: !!request.reviewType,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          error: "Missing required fields: content and reviewType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("✅ Request validation passed:", {
      reviewType: request.reviewType,
      model: request.model,
      contentLength: request.content.length,
      fileType: request.fileType,
      fileName: request.fileName,
    });

    // Handle PDF and DOCX file processing
    processedContent = request.content;
    if (
      request.content.startsWith("PDF_FILE_BASE64:") ||
      request.content.startsWith("DOCX_FILE_BASE64:")
    ) {
      try {
        console.log("📄 Starting file text extraction...");
        processedContent = await extractTextFromFile(
          request.content,
          request.fileType || "",
        );
        console.log(
          "✅ File text extraction completed, content length:",
          processedContent.length,
        );

        if (!processedContent || processedContent.trim().length === 0) {
          return new Response(
            JSON.stringify({
              error:
                "No text content could be extracted from the file. Please ensure the file contains readable text or try converting to a text file.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } catch (extractError) {
        const errorMessage =
          extractError instanceof Error
            ? extractError.message
            : String(extractError);
        console.error("❌ File extraction failed:", {
          error: errorMessage,
          type:
            extractError instanceof Error
              ? extractError.name
              : typeof extractError,
          timestamp: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({
            error: `Failed to extract text from file: ${errorMessage}. Please try a smaller file or convert to text format.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const filename = request.fileName || request.filename;
    const resolvedContractType =
      request.contractType ||
      request.classification?.contractType ||
      detectContractType(processedContent, filename);
    const resolvedDocumentFormat = inferDocumentFormat(
      filename,
      request.documentFormat,
    );

    fallbackContext = {
      reviewType: request.reviewType,
      contractContent: processedContent,
      contractType: resolvedContractType,
      classification: request.classification,
      documentFormat: resolvedDocumentFormat,
      fileName: filename,
    };

    // Get API key based on model
    const model = request.model || "openai-gpt-4";
    let apiKey: string | undefined;

    if (model.startsWith("openai")) {
      apiKey = Deno.env.get("OPENAI_API_KEY");
    } else if (model.startsWith("anthropic")) {
      apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    } else if (model.startsWith("google")) {
      apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    }

    if (!apiKey) {
      console.error("🔑 API key not configured:", {
        model: model,
        timestamp: new Date().toISOString(),
      });

      const fallbackResponse = generateFallbackAnalysis({
        ...fallbackContext!,
        fallbackReason: `API key not configured for model: ${model}`,
      });

      return new Response(JSON.stringify(fallbackResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔑 API key found for model: ${model}`);

    // Create enhanced request with processed content
    const enhancedRequest = {
      ...request,
      content: processedContent,
      contractType: resolvedContractType,
      documentFormat: resolvedDocumentFormat,
    };

    try {
      const result = await analyzeWithAI(enhancedRequest, apiKey);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (analysisError) {
      const errorMessage =
        analysisError instanceof Error
          ? analysisError.message
          : String(analysisError);

      console.error("❌ AI provider failed, using fallback analysis:", {
        message: errorMessage,
        model,
        timestamp: new Date().toISOString(),
      });

      const fallbackResponse = generateFallbackAnalysis({
        ...fallbackContext!,
        fallbackReason: `Primary AI provider error: ${errorMessage}`,
      });

      return new Response(JSON.stringify(fallbackResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }

    const errorDetails = {
      message: errorMessage,
      type: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    console.error("❌ Analysis error:", errorDetails);

    if (!fallbackContext) {
      const filename = request?.fileName || request?.filename;
      const inferredFormat = inferDocumentFormat(filename, request?.documentFormat);
      const contentForFallback = processedContent || request?.content || "";
      const inferredContractType =
        request?.contractType ||
        request?.classification?.contractType ||
        detectContractType(contentForFallback, filename);

      fallbackContext = {
        reviewType: request?.reviewType || "full_summary",
        contractContent: contentForFallback,
        contractType: inferredContractType,
        classification: request?.classification,
        documentFormat: inferredFormat,
        fileName: filename,
      };
    }

    const fallbackResponse = generateFallbackAnalysis({
      ...fallbackContext,
      fallbackReason: `Edge function error: ${errorMessage}`,
    });

    return new Response(
      JSON.stringify({
        ...fallbackResponse,
        fallback_error_details: errorDetails,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Extract text from PDF or DOCX files
async function extractTextFromFile(
  content: string,
  fileType: string,
): Promise<string> {
  if (content.startsWith("PDF_FILE_BASE64:")) {
    const base64Data = content.replace("PDF_FILE_BASE64:", "");

    console.log("📄 Processing PDF file for text extraction...");
    console.log(
      `📊 Base64 data length: ${Math.round(base64Data.length / 1024)}KB`,
    );

    try {
      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error("Invalid PDF data received");
      }

      // For development/testing, decode base64 to validate file
      let binaryData: string;
      try {
        binaryData = atob(base64Data);
      } catch (decodeError) {
        throw new Error("Invalid base64 PDF data");
      }

      const estimatedPages = Math.ceil(binaryData.length / 2000); // Rough estimation
      const fileSizeKB = Math.round(binaryData.length / 1024);

      console.log(
        `📄 PDF file stats: ~${estimatedPages} pages, ${fileSizeKB}KB`,
      );

      // Extract text from PDF using real extraction
      console.log("📄 Extracting text from PDF file...");
      const extractedText = await extractTextFromPDF(base64Data);

      // Validate extracted text
      const validation = validateExtractedText(extractedText);
      if (!validation.valid) {
        throw new Error(validation.error || "PDF text extraction failed");
      }

      console.log(
        `✅ Successfully extracted ${extractedText.length} characters from PDF`,
      );
      console.log(
        `📊 Estimated pages: ~${estimatedPages}, File size: ${fileSizeKB}KB`,
      );

      return extractedText;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ PDF processing error:", {
        error: errorMessage,
        type: error instanceof Error ? error.name : typeof error,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to process PDF file: ${errorMessage}`);
    }
  }

  if (content.startsWith("DOCX_FILE_BASE64:")) {
    const base64Data = content.replace("DOCX_FILE_BASE64:", "");

    console.log("📄 Processing DOCX file for text extraction...");
    console.log(
      `📊 Base64 data length: ${Math.round(base64Data.length / 1024)}KB`,
    );

    try {
      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error("Invalid DOCX data received");
      }

      // For development/testing, decode base64 to validate file
      let binaryData: string;
      try {
        binaryData = atob(base64Data);
      } catch (decodeError) {
        throw new Error("Invalid base64 DOCX data");
      }

      const fileSizeKB = Math.round(binaryData.length / 1024);
      console.log(`📄 DOCX file processed: ${fileSizeKB}KB`);

      // Extract text from DOCX using real extraction
      console.log("📄 Extracting text from DOCX file...");
      const extractedText = await extractTextFromDOCX(base64Data);

      // Validate extracted text
      const validation = validateExtractedText(extractedText);
      if (!validation.valid) {
        throw new Error(validation.error || "DOCX text extraction failed");
      }

      console.log(
        `✅ Successfully extracted ${extractedText.length} characters from DOCX`,
      );
      console.log(`📊 File size: ${fileSizeKB}KB`);

      return extractedText;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ DOCX processing error:", {
        error: errorMessage,
        type: error instanceof Error ? error.name : typeof error,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to process DOCX file: ${errorMessage}`);
    }
  }

  return content;
}

async function analyzeWithAI(request: AnalysisRequest, apiKey: string) {
  const modelConfig = AI_CONFIGS[request.model as keyof typeof AI_CONFIGS];
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${request.model}`);
  }

  // Build prompt based on review type and custom solution
  const prompt = buildAnalysisPrompt(request);

  // Prepare API request based on model type
  let apiRequest: any;

  if (request.model.startsWith("openai")) {
    apiRequest = {
      method: "POST",
      headers: modelConfig.headers(apiKey),
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          {
            role: "system",
            content: prompt.systemPrompt,
          },
          {
            role: "user",
            content: `${prompt.analysisPrompt}\n\nContract Content:\n${request.content}`,
          },
        ],
        temperature: modelConfig.temperature || 0.1,
        max_tokens: modelConfig.maxTokens || 4000,
        response_format: { type: "json_object" },
      }),
    };
  } else if (request.model.startsWith("anthropic")) {
    apiRequest = {
      method: "POST",
      headers: modelConfig.headers(apiKey),
      body: JSON.stringify({
        model: modelConfig.model,
        max_tokens: modelConfig.maxTokens || 4000,
        messages: [
          {
            role: "user",
            content: `${prompt.systemPrompt}\n\n${prompt.analysisPrompt}\n\nContract Content:\n${request.content}`,
          },
        ],
        temperature: modelConfig.temperature || 0.1,
      }),
    };
  }

  // Make API call
  const response = await fetch(modelConfig.baseUrl, apiRequest);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API Error:", {
      status: response.status,
      errorText: errorText,
      model: modelConfig.model,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();

  // Parse response based on model type
  let aiResponse: string;

  if (request.model.startsWith("openai")) {
    aiResponse = data.choices?.[0]?.message?.content || "";
  } else if (request.model.startsWith("anthropic")) {
    aiResponse = data.content?.[0]?.text || "";
  } else {
    throw new Error("Unsupported model for response parsing");
  }

  // Parse AI response into structured format
  return parseAIResponse(aiResponse, request.reviewType);
}

function buildAnalysisPrompt(request: AnalysisRequest) {
  const customSolution = request.customSolution;
  const classification = request.classification;

  // Build classification context for enhanced AI analysis
  let classificationContext = "";
  if (classification) {
    classificationContext = `

DOCUMENT CLASSIFICATION CONTEXT:
Contract Type: ${classification.contractType}
Classification Confidence: ${Math.round(classification.confidence * 100)}%
Key Characteristics: ${classification.characteristics.join(", ")}
Classification Reasoning: ${classification.reasoning}

Use this classification context to provide more targeted and accurate analysis specific to this contract type.`;
  }

  // Enhanced base prompts with advanced legal analysis capabilities
  const basePrompts = {
    risk_assessment: {
      systemPrompt: `You are a senior contract risk analyst with expertise in commercial law, regulatory compliance, and enterprise risk management. You have 15+ years of experience reviewing complex commercial agreements across multiple industries. You excel at identifying subtle risks, assessing interconnected risk factors, and providing strategic recommendations. Always respond in valid JSON format with comprehensive analysis.${classificationContext}`,
      analysisPrompt: `Conduct a comprehensive risk assessment of this contract with the following advanced analysis framework:

1. **Multi-dimensional Risk Analysis**: Examine financial, legal, operational, compliance, reputational, and strategic risks
2. **Risk Interconnection**: Identify how different risks compound or mitigate each other
3. **Scenario Planning**: Consider best-case, worst-case, and most-likely scenarios
4. **Industry Context**: Apply industry-specific risk considerations
5. **Regulatory Landscape**: Assess compliance with current and anticipated regulations
6. **Quantitative Risk Scoring**: Provide precise impact and probability assessments

Analyze risk cascading effects, hidden dependencies, and long-term implications. Consider contract lifecycle risks, performance risks, and market condition impacts.

**CLAUSE EXTRACTION REQUIREMENT**: Extract and analyze specific contract clauses, identifying:
- Clause titles and sections
- Risk-bearing provisions
- Limitation of liability clauses
- Indemnification terms
- Termination conditions
- Payment and penalty terms
- Force majeure provisions
- Dispute resolution mechanisms

Return JSON in this exact format:
{
  "score": number (60-100),
  "confidence": number (0.7-1.0),
  "pages": number,
  "critical_clauses": [
    {
      "clause_number": "string (e.g., 'Section 7.2' or 'Article 4(a)')",
      "clause_title": "string",
      "clause_text": "string (key excerpt, 100-300 chars)",
      "clause_type": "liability|indemnification|termination|payment|warranty|confidentiality|ip_rights|compliance|other",
      "importance": "critical|high|medium|low",
      "risk_level": "high|medium|low",
      "interpretation": "string (legal interpretation and implications)",
      "recommendation": "string (specific actionable advice)"
    }
  ],
  "risks": [
    {
      "type": "financial|legal|operational|compliance|reputational|strategic",
      "level": "low|medium|high|critical",
      "description": "string (detailed risk description with context)",
      "recommendation": "string (specific actionable recommendation)",
      "impact_score": number (1-10),
      "probability": number (0.1-1.0),
      "mitigation_complexity": "simple|moderate|complex",
      "timeline": "immediate|short_term|medium_term|long_term",
      "cascading_effects": ["string"]
    }
  ],
  "risk_interactions": [
    {
      "risk_combination": ["string"],
      "compound_effect": "amplified|mitigated|neutral",
      "description": "string"
    }
  ],
  "recommendations": ["string (strategic recommendations)"],
  "action_items": ["string (specific action items with priority)"],
  "scenario_analysis": {
    "best_case": "string",
    "worst_case": "string",
    "most_likely": "string"
  }
}`,
    },
    compliance_score: {
      systemPrompt: `You are a leading compliance expert and regulatory attorney with deep expertise in GDPR, CCPA, HIPAA, SOX, PCI-DSS, international data protection laws, financial regulations, and industry-specific compliance frameworks. You have extensive experience with cross-border regulatory requirements, emerging privacy laws, and regulatory enforcement trends. You excel at identifying subtle compliance gaps and providing strategic compliance guidance. Always respond in valid JSON format.${classificationContext}`,
      analysisPrompt: `Conduct a comprehensive regulatory compliance assessment using this advanced framework:

1. **Multi-Jurisdictional Analysis**: Assess compliance across relevant jurisdictions
2. **Regulatory Evolution**: Consider upcoming regulatory changes and trends
3. **Cross-Framework Impact**: Analyze how different regulations interact
4. **Enforcement Risk**: Evaluate likelihood and severity of regulatory enforcement
5. **Industry Standards**: Apply relevant industry-specific compliance requirements
6. **Data Flow Analysis**: Map data processing activities and cross-border transfers
7. **Rights Management**: Assess individual rights and consent mechanisms
8. **Breach Preparedness**: Evaluate incident response and notification requirements

Provide detailed compliance scoring with regulatory-specific analysis, gap identification, and remediation roadmap.

**CLAUSE EXTRACTION REQUIREMENT**: Extract and analyze compliance-related clauses:
- Data protection and privacy provisions
- Security and encryption requirements
- Breach notification obligations
- Audit rights and compliance reporting
- Cross-border transfer mechanisms
- Consent and legal basis provisions
- Data retention and deletion terms
- Subject rights implementation

Return JSON in this exact format:
{
  "score": number (70-100),
  "confidence": number (0.8-1.0),
  "pages": number,
  "critical_clauses": [
    {
      "clause_number": "string",
      "clause_title": "string",
      "clause_text": "string (key excerpt)",
      "compliance_framework": "GDPR|CCPA|HIPAA|SOX|PCI-DSS|Industry Standard",
      "compliance_status": "compliant|partially_compliant|non_compliant|unclear",
      "gap_description": "string (if non-compliant)",
      "regulatory_risk": "low|medium|high|critical",
      "remediation": "string (specific steps to achieve compliance)"
    }
  ],
  "compliance_areas": {
    "gdpr": number (0-100),
    "ccpa": number (0-100),
    "data_protection": number (0-100),
    "financial_regulations": number (0-100),
    "industry_standards": number (0-100),
    "cross_border_transfers": number (0-100),
    "consent_management": number (0-100),
    "breach_response": number (0-100)
  },
  "violations": [
    {
      "framework": "string",
      "severity": "low|medium|high|critical",
      "description": "string (detailed violation description)",
      "recommendation": "string (specific remediation steps)",
      "regulatory_risk": "low|medium|high",
      "enforcement_likelihood": number (0.1-1.0),
      "potential_penalty": "string"
    }
  ],
  "compliance_gaps": [
    {
      "area": "string",
      "gap_description": "string",
      "remediation_steps": ["string"],
      "priority": "low|medium|high|critical",
      "timeline": "immediate|30_days|90_days|6_months"
    }
  ],
  "regulatory_landscape": {
    "upcoming_changes": ["string"],
    "enforcement_trends": ["string"],
    "best_practices": ["string"]
  },
  "recommendations": ["string (strategic compliance recommendations)"],
  "remediation_roadmap": [
    {
      "phase": "string",
      "actions": ["string"],
      "timeline": "string",
      "priority": "string"
    }
  ]
}`,
    },
    perspective_review: {
      systemPrompt: `You are a senior contract strategist with expertise in multi-stakeholder analysis, commercial negotiations, and stakeholder management. You have extensive experience representing different parties in complex commercial transactions and understand the nuanced interests, priorities, and concerns of various stakeholders. You excel at identifying hidden motivations, power dynamics, and strategic implications from each perspective. Always respond in valid JSON format.${classificationContext}`,
      analysisPrompt: `Conduct a sophisticated multi-stakeholder analysis using this advanced framework:

1. **Stakeholder Mapping**: Identify all relevant parties and their interests
2. **Power Dynamics**: Analyze negotiating positions and leverage
3. **Strategic Implications**: Assess long-term impacts for each party
4. **Risk Allocation**: Evaluate how risks and rewards are distributed
5. **Market Context**: Consider industry dynamics and market conditions
6. **Operational Impact**: Assess day-to-day operational implications
7. **Financial Analysis**: Examine financial implications and cash flow impacts
8. **Relationship Dynamics**: Consider ongoing relationship management

Provide detailed perspective analysis with strategic insights, negotiation opportunities, and relationship implications.

Return JSON in this exact format:
{
  "score": number (50-100),
  "confidence": number (0.6-1.0),
  "pages": number,
  "perspectives": {
    "buyer": {
      "score": number (0-100),
      "concerns": ["string (detailed concerns with impact analysis)"],
      "advantages": ["string (specific advantages with value quantification)"],
      "strategic_priorities": ["string"],
      "negotiation_leverage": "low|medium|high",
      "risk_tolerance": "conservative|moderate|aggressive"
    },
    "seller": {
      "score": number (0-100),
      "concerns": ["string (detailed concerns with impact analysis)"],
      "advantages": ["string (specific advantages with value quantification)"],
      "strategic_priorities": ["string"],
      "negotiation_leverage": "low|medium|high",
      "risk_tolerance": "conservative|moderate|aggressive"
    },
    "legal": {
      "score": number (0-100),
      "concerns": ["string (legal risks and liability exposures)"],
      "advantages": ["string (protective mechanisms and safeguards)"],
      "enforcement_issues": ["string"],
      "regulatory_considerations": ["string"]
    },
    "individual": {
      "score": number (0-100),
      "concerns": ["string (privacy and data protection concerns)"],
      "advantages": ["string (individual rights and protections)"],
      "privacy_impact": "low|medium|high",
      "rights_protection": "weak|adequate|strong"
    }
  },
  "stakeholder_conflicts": [
    {
      "conflicting_interests": ["string"],
      "impact": "string",
      "resolution_strategies": ["string"]
    }
  ],
  "negotiation_opportunities": [
    {
      "area": "string",
      "potential_improvements": ["string"],
      "stakeholder_benefits": ["string"]
    }
  ],
  "recommendations": ["string (strategic recommendations for balanced outcomes)"]
}`,
    },
    full_summary: {
      systemPrompt: `You are a distinguished senior partner and contract strategist with 20+ years of experience in complex commercial transactions, M&A, and strategic partnerships. You provide executive-level analysis that combines legal expertise with business acumen and strategic insight. You excel at distilling complex agreements into actionable intelligence for C-level executives and board members. Your analysis influences major business decisions and strategic direction. Always respond in valid JSON format.${classificationContext}`,
      analysisPrompt: `Provide a comprehensive executive-level contract analysis using this advanced framework:

1. **Strategic Context**: Analyze the contract within broader business strategy
2. **Commercial Intelligence**: Extract key commercial terms and their implications
3. **Risk-Reward Analysis**: Balance risk exposure against business value
4. **Competitive Positioning**: Assess competitive advantages and disadvantages
5. **Operational Impact**: Evaluate implementation and management requirements
6. **Financial Modeling**: Analyze financial implications and cash flow impacts
7. **Performance Metrics**: Identify KPIs and success measures
8. **Exit Strategies**: Assess termination and transition mechanisms
9. **Relationship Management**: Consider long-term partnership dynamics
10. **Market Intelligence**: Apply industry knowledge and benchmarking

Provide executive summary suitable for board presentation with strategic recommendations and decision support.

**CLAUSE EXTRACTION REQUIREMENT**: Extract and categorize all major contract clauses:
- Obligations and deliverables
- Payment terms and pricing
- Performance metrics and SLAs
- Intellectual property provisions
- Confidentiality and non-disclosure
- Warranties and representations
- Limitation of liability
- Termination and renewal terms
- Governing law and jurisdiction

Return JSON in this exact format:
{
  "score": number (60-100),
  "confidence": number (0.7-1.0),
  "pages": number,
  "critical_clauses": [
    {
      "clause_number": "string",
      "clause_title": "string",
      "clause_text": "string (key excerpt)",
      "category": "obligations|financial|ip|liability|termination|governance|other",
      "business_impact": "high|medium|low",
      "summary": "string (business implications in plain language)"
    }
  ],
  "executive_summary": "string (concise strategic overview for executives)",
  "business_impact": {
    "revenue_implications": "string",
    "cost_structure": "string",
    "operational_changes": "string",
    "strategic_value": "string"
  },
  "key_commercial_terms": [
    {
      "term": "string",
      "value": "string",
      "business_impact": "string",
      "benchmark": "favorable|market|unfavorable"
    }
  ],
  "critical_clauses": [
    {
      "clause": "string",
      "importance": "critical|high|medium|low",
      "business_impact": "string",
      "recommendation": "string",
      "negotiation_priority": "must_have|should_have|nice_to_have"
    }
  ],
  "risk_summary": {
    "overall_risk_level": "low|medium|high|critical",
    "key_risks": ["string"],
    "mitigation_strategies": ["string"],
    "risk_tolerance_required": "conservative|moderate|aggressive"
  },
  "commercial_analysis": {
    "deal_structure": "string",
    "value_proposition": "string",
    "competitive_position": "strong|neutral|weak",
    "market_conditions": "string"
  },
  "performance_framework": {
    "success_metrics": ["string"],
    "performance_standards": ["string"],
    "monitoring_requirements": ["string"]
  },
  "strategic_recommendations": [
    {
      "recommendation": "string",
      "rationale": "string",
      "priority": "critical|high|medium|low",
      "timeline": "immediate|30_days|90_days|ongoing"
    }
  ],
  "action_items": [
    {
      "action": "string",
      "owner": "legal|business|finance|operations",
      "priority": "critical|high|medium|low",
      "timeline": "string"
    }
  ],
  "extracted_terms": {
    "contract_value": "string",
    "duration": "string",
    "payment_terms": "string",
    "governing_law": "string",
    "key_milestones": ["string"],
    "performance_metrics": ["string"],
    "termination_triggers": ["string"]
  },
  "implementation_roadmap": [
    {
      "phase": "string",
      "activities": ["string"],
      "timeline": "string",
      "resources_required": ["string"]
    }
  ]
}`,
    },
  };

  // Use custom solution prompts if available, otherwise use base prompts
  if (customSolution?.prompts) {
    return {
      systemPrompt:
        customSolution.prompts.systemPrompt +
        " Always respond in valid JSON format.",
      analysisPrompt: customSolution.prompts.analysisPrompt,
    };
  }

  return (
    basePrompts[request.reviewType as keyof typeof basePrompts] ||
    basePrompts.full_summary
  );
}

function parseAIResponse(aiResponse: string, reviewType: string) {
  try {
    // Try to parse as JSON first
    return JSON.parse(aiResponse);
  } catch (error) {
    console.warn(
      "Failed to parse AI response as JSON, attempting to extract JSON",
    );

    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to extract valid JSON from AI response");
      }
    }

    // Throw error instead of falling back to mock response
    console.error("AI Response that failed to parse:", aiResponse);
    throw new Error(
      `AI response could not be parsed as JSON. This may indicate an issue with the AI model or prompt. Review type: ${reviewType}`,
    );
  }
}
