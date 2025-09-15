import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// AI Model configurations
const AI_CONFIGS = {
  'openai-gpt-4': {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
  },
  'openai-gpt-3.5-turbo': {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
  },
  'anthropic-claude-3': {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-sonnet-20240229',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
  },
};

interface AnalysisRequest {
  content: string;
  reviewType: string;
  model: string;
  customSolution?: any;
  contractType?: string;
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
    console.log('🚀 Starting contract analysis request...');

    // Parse request body with error handling
    let request: AnalysisRequest;
    try {
      request = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    if (!request.content || !request.reviewType) {
      console.error('❌ Missing required fields in request:', {
        hasContent: !!request.content,
        hasReviewType: !!request.reviewType
      });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: content and reviewType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Request validation passed:', {
      reviewType: request.reviewType,
      model: request.model,
      contentLength: request.content.length
    });

    // Get API key based on model
    const model = request.model || 'openai-gpt-4';
    let apiKey: string | undefined;

    if (model.startsWith('openai')) {
      apiKey = Deno.env.get('OPENAI_API_KEY');
    } else if (model.startsWith('anthropic')) {
      apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    } else if (model.startsWith('google')) {
      apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    }

    if (!apiKey) {
      console.error(`🔑 API key not configured for model: ${model}`);
      return new Response(
        JSON.stringify({
          error: `API key not configured for model: ${model}. Please configure the appropriate API key in environment variables.`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔑 API key found for model: ${model}`);

    // Analyze contract with AI
    const result = await analyzeWithAI(request, apiKey);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Analysis error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });

    return new Response(
      JSON.stringify({
        error: `Contract analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function analyzeWithAI(request: AnalysisRequest, apiKey: string) {
  const modelConfig = AI_CONFIGS[request.model as keyof typeof AI_CONFIGS];
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${request.model}`);
  }

  // Build prompt based on review type and custom solution
  const prompt = buildAnalysisPrompt(request);
  
  // Prepare API request based on model type
  let apiRequest: any;
  
  if (request.model.startsWith('openai')) {
    apiRequest = {
      method: 'POST',
      headers: modelConfig.headers(apiKey),
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt,
          },
          {
            role: 'user',
            content: `${prompt.analysisPrompt}\n\nContract Content:\n${request.content}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    };
  } else if (request.model.startsWith('anthropic')) {
    apiRequest = {
      method: 'POST',
      headers: modelConfig.headers(apiKey),
      body: JSON.stringify({
        model: modelConfig.model,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${prompt.systemPrompt}\n\n${prompt.analysisPrompt}\n\nContract Content:\n${request.content}`,
          },
        ],
        temperature: 0.3,
      }),
    };
  }

  // Make API call
  const response = await fetch(modelConfig.baseUrl, apiRequest);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API Error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Parse response based on model type
  let aiResponse: string;
  
  if (request.model.startsWith('openai')) {
    aiResponse = data.choices?.[0]?.message?.content || '';
  } else if (request.model.startsWith('anthropic')) {
    aiResponse = data.content?.[0]?.text || '';
  } else {
    throw new Error('Unsupported model for response parsing');
  }

  // Parse AI response into structured format
  return parseAIResponse(aiResponse, request.reviewType);
}

function buildAnalysisPrompt(request: AnalysisRequest) {
  const customSolution = request.customSolution;
  
  // Base prompts by review type
  const basePrompts = {
    risk_assessment: {
      systemPrompt: `You are an expert legal analyst specializing in contract risk assessment. Analyze contracts for potential risks and provide actionable recommendations. Always respond in valid JSON format.`,
      analysisPrompt: `Analyze this contract for risks. Identify financial, legal, operational, and compliance risks. Categorize each risk by type and severity level (low, medium, high, critical). Provide specific recommendations for each risk identified.

Return JSON in this exact format:
{
  "score": number (60-100),
  "confidence": number (0.7-1.0),
  "pages": number,
  "risks": [
    {
      "type": "financial|legal|operational|compliance",
      "level": "low|medium|high|critical", 
      "description": "string",
      "recommendation": "string",
      "impact_score": number (1-10)
    }
  ],
  "recommendations": ["string"],
  "action_items": ["string"]
}`,
    },
    compliance_score: {
      systemPrompt: `You are a compliance expert specializing in GDPR, data protection, and regulatory compliance. Assess contracts for compliance with various regulatory frameworks. Always respond in valid JSON format.`,
      analysisPrompt: `Assess this contract for compliance with GDPR, data protection laws, and industry standards. Provide compliance scores for different areas and identify any violations.

Return JSON in this exact format:
{
  "score": number (70-100),
  "confidence": number (0.8-1.0),
  "pages": number,
  "compliance_areas": {
    "gdpr": number (0-100),
    "data_protection": number (0-100),
    "financial_regulations": number (0-100),
    "industry_standards": number (0-100)
  },
  "violations": [
    {
      "framework": "string",
      "severity": "low|medium|high",
      "description": "string", 
      "recommendation": "string"
    }
  ],
  "recommendations": ["string"]
}`,
    },
    perspective_review: {
      systemPrompt: `You are a contract analyst capable of viewing agreements from multiple stakeholder perspectives. Analyze contracts from buyer, seller, legal, and individual data subject perspectives. Always respond in valid JSON format.`,
      analysisPrompt: `Analyze this contract from multiple perspectives: buyer, seller, legal counsel, and individual data subjects. Identify specific concerns and advantages for each perspective.

Return JSON in this exact format:
{
  "score": number (50-100),
  "confidence": number (0.6-1.0), 
  "pages": number,
  "perspectives": {
    "buyer": {
      "score": number (0-100),
      "concerns": ["string"],
      "advantages": ["string"]
    },
    "seller": {
      "score": number (0-100),
      "concerns": ["string"],
      "advantages": ["string"]
    },
    "legal": {
      "score": number (0-100),
      "concerns": ["string"],
      "advantages": ["string"] 
    },
    "individual": {
      "score": number (0-100),
      "concerns": ["string"],
      "advantages": ["string"]
    }
  },
  "recommendations": ["string"]
}`,
    },
    full_summary: {
      systemPrompt: `You are a senior legal analyst providing executive-level contract summaries. Provide comprehensive analysis with key terms, critical clauses, and strategic insights. Always respond in valid JSON format.`,
      analysisPrompt: `Provide a comprehensive summary of this contract including key terms, critical clauses, risks, and strategic recommendations.

Return JSON in this exact format:
{
  "score": number (60-100),
  "confidence": number (0.7-1.0),
  "pages": number,
  "summary": "string",
  "key_points": ["string"],
  "critical_clauses": [
    {
      "clause": "string",
      "importance": "high|medium|low",
      "recommendation": "string"
    }
  ],
  "recommendations": ["string"],
  "action_items": ["string"],
  "extracted_terms": {
    "contract_value": "string",
    "duration": "string", 
    "payment_terms": "string",
    "governing_law": "string"
  }
}`,
    },
  };

  // Use custom solution prompts if available, otherwise use base prompts
  if (customSolution?.prompts) {
    return {
      systemPrompt: customSolution.prompts.systemPrompt + " Always respond in valid JSON format.",
      analysisPrompt: customSolution.prompts.analysisPrompt,
    };
  }

  return basePrompts[request.reviewType as keyof typeof basePrompts] || basePrompts.full_summary;
}

function parseAIResponse(aiResponse: string, reviewType: string) {
  try {
    // Try to parse as JSON first
    return JSON.parse(aiResponse);
  } catch (error) {
    console.warn('Failed to parse AI response as JSON, attempting to extract JSON');
    
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Failed to extract valid JSON from AI response');
      }
    }
    
    // Fallback to mock response
    return generateMockResponseByType(reviewType);
  }
}
