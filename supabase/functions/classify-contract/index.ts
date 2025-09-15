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
    const errorMessage = error instanceof Error ? error.message : String(error);
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

  const systemPrompt = `You are an expert legal document classifier with extensive knowledge of contract types, legal frameworks, and commercial agreements. Your task is to analyze contract content and accurately classify it into specific contract types.

Analyze the provided contract content and classify it into one of these primary categories based on the 7 specific solution types:
- data_processing_agreement: DPAs, GDPR compliance documents, EDPB guidelines adherence
- non_disclosure_agreement: NDAs, confidentiality agreements, trade secret protection
- privacy_policy_document: Privacy statements, privacy policies, GDPR criteria compliance
- consultancy_agreement: Professional services agreements, consulting contracts, advisory services
- research_development_agreement: R&D agreements, innovation contracts, technology development
- end_user_license_agreement: EULAs, software license agreements, usage rights
- product_supply_agreement: Supply agreements, procurement contracts, product delivery terms
- general_commercial: Other commercial agreements not fitting the 7 specific categories

Consider document structure, legal terminology, clause types, and specific obligations when classifying.`;

  const analysisPrompt = `Analyze this contract content and provide a detailed classification. Consider:

1. Primary subject matter and purpose
2. Key legal obligations and rights
3. Specific terminology and clause structures
4. Regulatory compliance requirements
5. Risk profiles and business implications

Return a JSON response with this exact structure:
{
  "contractType": "string (one of the specified categories)",
  "confidence": number (0.0-1.0),
  "subType": "string (optional specific subcategory)",
  "characteristics": ["string array of key contract features"],
  "reasoning": "string (explanation of classification decision)",
  "suggestedSolutions": ["string array of recommended analysis types"]
}

Contract Content:
${request.content}

File Name: ${request.fileName}`;

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
    
    // Validate and enhance the result
    return {
      contractType: result.contractType || 'general_commercial',
      confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
      subType: result.subType,
      characteristics: Array.isArray(result.characteristics) ? result.characteristics : [],
      reasoning: result.reasoning || 'AI-powered classification based on content analysis',
      suggestedSolutions: Array.isArray(result.suggestedSolutions) ? result.suggestedSolutions : ['full_summary', 'risk_assessment']
    };
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
