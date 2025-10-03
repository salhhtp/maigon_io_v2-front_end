import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// AI Model configurations for classification
const AI_CONFIGS = {
  'openai-gpt-4': {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
  },
};

interface ClassificationRequest {
  content: string;
  fileName: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 Starting contract classification request...');

    const request: ClassificationRequest = await req.json();
    
    if (!request.content) {
      return new Response(
        JSON.stringify({ error: 'Content is required for classification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📄 Classification request:', {
      contentLength: request.content.length,
      fileName: request.fileName
    });

    // Get API key
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('🔑 OpenAI API key not configured for classification:', {
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ error: 'AI classification service not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Classify contract using AI
    const result = await classifyWithAI(request, apiKey);

    console.log('✅ Contract classification completed:', {
      contractType: result.contractType,
      confidence: result.confidence
    });

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Safely extract error message
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }

    const errorDetails = {
      message: errorMessage,
      type: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    console.error('❌ Classification error:', errorDetails);

    return new Response(
      JSON.stringify({
        error: `Contract classification failed: ${errorMessage}`,
        type: errorDetails.type,
        timestamp: errorDetails.timestamp
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function classifyWithAI(request: ClassificationRequest, apiKey: string) {
  const modelConfig = AI_CONFIGS['openai-gpt-4'];

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
${request.fileName ? `- File Name: "${request.fileName}" (may contain type hints)` : ''}
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

${request.content.length > 8000 ? `\n[Note: Content truncated at 8000 characters for analysis. Full length: ${request.content.length} characters]` : ''}

**FILE NAME**: ${request.fileName || 'Not provided'}

Analyze thoroughly and provide precise classification based on the evidence found in the contract.`;

  const requestBody = {
    model: modelConfig.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: analysisPrompt,
      },
    ],
    temperature: 0.1, // Low temperature for consistent classification
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  };

  console.log('🚀 Calling OpenAI for contract classification...');

  const response = await fetch(modelConfig.baseUrl, {
    method: 'POST',
    headers: modelConfig.headers(apiKey),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI API error:', {
      status: response.status,
      errorText: errorText,
      model: modelConfig.model,
      timestamp: new Date().toISOString()
    });
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from OpenAI API');
  }

  const content = data.choices[0].message.content;
  
  try {
    const result = JSON.parse(content);
    console.log('📊 AI Classification result:', result);
    
    // Validate and enhance the result with additional fields
    const validatedResult = {
      contractType: result.contractType || 'general_commercial',
      confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
      subType: result.subType || null,
      characteristics: Array.isArray(result.characteristics) && result.characteristics.length > 0
        ? result.characteristics
        : ['Commercial agreement requiring detailed analysis'],
      reasoning: result.reasoning || 'AI-powered classification based on content analysis',
      suggestedSolutions: Array.isArray(result.suggestedSolutions) && result.suggestedSolutions.length > 0
        ? result.suggestedSolutions
        : ['full_summary', 'risk_assessment'],
      keyTerms: Array.isArray(result.keyTerms) ? result.keyTerms : [],
      jurisdiction: result.jurisdiction || 'Not specified',
      partyRoles: result.partyRoles || {}
    };

    console.log('✅ Enhanced classification result:', {
      type: validatedResult.contractType,
      confidence: validatedResult.confidence,
      subType: validatedResult.subType,
      suggestedSolutions: validatedResult.suggestedSolutions
    });

    return validatedResult;
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    console.error('❌ Failed to parse AI response:', {
      error: errorMessage,
      type: parseError instanceof Error ? parseError.name : typeof parseError,
      timestamp: new Date().toISOString()
    });
    throw new Error('Failed to parse AI classification response');
  }
}
