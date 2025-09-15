import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler';

// Enhanced AI Model Configuration for Advanced Contract Analysis
export enum AIModel {
  OPENAI_GPT4 = 'openai-gpt-4',
  OPENAI_GPT4O = 'openai-gpt-4o',
  OPENAI_GPT35 = 'openai-gpt-3.5-turbo',
  ANTHROPIC_CLAUDE = 'anthropic-claude-3',
  ANTHROPIC_CLAUDE_OPUS = 'anthropic-claude-3-opus',
  GOOGLE_GEMINI = 'google-gemini-pro',
}

export interface ContractAnalysisRequest {
  content: string;
  reviewType: string;
  contractType?: string;
  customSolution?: CustomSolution;
  model?: AIModel;
  userId: string;
}

export interface CustomSolution {
  id?: string;
  name: string;
  description: string;
  contractType: string;
  complianceFramework: string[];
  riskLevel: 'low' | 'medium' | 'high';
  customRules: string;
  analysisDepth: 'basic' | 'standard' | 'comprehensive';
  reportFormat: 'summary' | 'detailed' | 'executive';
  aiModel: AIModel;
  prompts: {
    systemPrompt: string;
    analysisPrompt: string;
    riskPrompt?: string;
    compliancePrompt?: string;
  };
}

export interface AnalysisResult {
  timestamp: string;
  pages: number;
  processing_time: number;
  score: number;
  confidence: number;
  model_used: AIModel;
  custom_solution_id?: string;
  
  // Risk Assessment specific
  risks?: Array<{
    type: 'financial' | 'legal' | 'operational' | 'compliance';
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation?: string;
    impact_score?: number;
  }>;
  
  // Compliance specific
  compliance_areas?: {
    gdpr?: number;
    financial_regulations?: number;
    industry_standards?: number;
    data_protection?: number;
    employment_law?: number;
    [key: string]: number | undefined;
  };
  violations?: Array<{
    framework: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  
  // Perspective Review specific
  perspectives?: {
    buyer?: { score: number; concerns: string[]; advantages: string[] };
    seller?: { score: number; concerns: string[]; advantages: string[] };
    legal?: { score: number; concerns: string[]; advantages: string[] };
    individual?: { score: number; concerns: string[]; advantages: string[] };
  };
  
  // Full Summary specific
  summary?: string;
  key_points?: string[];
  critical_clauses?: Array<{
    clause: string;
    importance: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  
  // Common fields
  recommendations: string[];
  action_items?: string[];
  extracted_terms?: Record<string, any>;
  confidence_breakdown?: {
    content_clarity: number;
    legal_complexity: number;
    risk_identification: number;
    compliance_assessment: number;
  };
}

class AIService {
  private static instance: AIService;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Main contract analysis method with enhanced reliability
  async analyzeContract(request: ContractAnalysisRequest): Promise<AnalysisResult> {
    const startTime = performance.now();
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.contractAction('AI analysis started', undefined, {
          reviewType: request.reviewType,
          model: request.model || AIModel.OPENAI_GPT4,
          userId: request.userId,
          hasCustomSolution: !!request.customSolution,
          attempt
        });

        // Get or create custom solution if provided
        let customSolution = request.customSolution;
        if (!customSolution && request.reviewType !== 'ai_integration') {
          customSolution = await this.getDefaultSolution(request.reviewType, request.contractType);
        }

        // Call the appropriate AI service with retries for different models
        let result: Partial<AnalysisResult>;
        try {
          result = await this.callAIService(request, customSolution);
        } catch (apiError) {
          // If primary model fails, try fallback model
          if (attempt === 1 && request.model !== AIModel.OPENAI_GPT35) {
            console.log('🔄 Primary model failed, trying fallback model...');
            const fallbackRequest = { ...request, model: AIModel.OPENAI_GPT35 };
            result = await this.callAIService(fallbackRequest, customSolution);
          } else {
            throw apiError;
          }
        }

        const processingTime = (performance.now() - startTime) / 1000;

        // Validate result completeness
        if (!result.score || typeof result.score !== 'number') {
          throw new Error('Invalid AI response: missing or invalid score');
        }

        const analysisResult: AnalysisResult = {
          ...result,
          processing_time: processingTime,
          timestamp: new Date().toISOString(),
          model_used: request.model || AIModel.OPENAI_GPT4,
          custom_solution_id: customSolution?.id,
          pages: result.pages || 1,
          confidence: result.confidence || 0.75,
          score: result.score,
          recommendations: result.recommendations || []
        };

        logger.contractAction('AI analysis completed', undefined, {
          reviewType: request.reviewType,
          processingTime,
          score: result.score,
          confidence: result.confidence,
          userId: request.userId,
          attempt
        });

        return analysisResult;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`AI analysis attempt ${attempt} failed`, {
          reviewType: request.reviewType,
          userId: request.userId,
          error: errorMessage,
          errorType: error instanceof Error ? error.name : typeof error,
          attempt,
          timestamp: new Date().toISOString()
        });

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
          console.log(`⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed - provide detailed error message
    const finalErrorMessage = lastError?.message || 'Unknown error occurred';
    const errorDetails = {
      attempts: maxRetries,
      reviewType: request.reviewType,
      userId: request.userId,
      lastError: finalErrorMessage,
      timestamp: new Date().toISOString()
    };

    console.error('❌ All AI analysis attempts failed:', errorDetails);
    throw new Error(`Contract analysis failed after ${maxRetries} attempts: ${finalErrorMessage}`);
  }

  // Call AI service with enhanced error handling and validation
  private async callAIService(
    request: ContractAnalysisRequest,
    customSolution?: CustomSolution
  ): Promise<Partial<AnalysisResult>> {
    const model = request.model || customSolution?.aiModel || AIModel.OPENAI_GPT4;

    // Validate request before sending
    if (!request.content || request.content.trim().length === 0) {
      throw new Error('Cannot analyze empty contract content');
    }

    if (!request.reviewType) {
      throw new Error('Review type is required for analysis');
    }

    try {
      console.log('🔗 Calling Supabase Edge Function for AI analysis...', {
        model,
        reviewType: request.reviewType,
        contractType: request.contractType,
        contentLength: request.content.length,
        hasClassification: !!(request as any).classification
      });

      // Prepare the request body with all necessary data
      const requestBody = {
        content: request.content,
        reviewType: request.reviewType,
        model,
        customSolution,
        contractType: request.contractType,
        fileType: (request as any).fileType,
        fileName: (request as any).fileName,
        classification: (request as any).classification
      };

      // Call Supabase Edge Function for AI processing with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      try {
        const { data, error } = await supabase.functions.invoke('analyze-contract', {
          body: requestBody,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Supabase Edge Function error:', error);
          throw new Error(`AI service error: ${error.message}`);
        }

        if (!data) {
          console.error('❌ No data returned from Edge Function');
          throw new Error('No data returned from AI service');
        }

        // Validate the response structure
        if (typeof data !== 'object') {
          throw new Error('Invalid response format from AI service');
        }

        if (!data.score && data.score !== 0) {
          console.warn('⚠️ Response missing score, using default');
          data.score = 75; // Default score
        }

        if (!data.confidence && data.confidence !== 0) {
          console.warn('⚠️ Response missing confidence, using default');
          data.confidence = 0.8; // Default confidence
        }

        console.log('✅ Edge Function call successful:', {
          hasData: !!data,
          score: data.score,
          confidence: data.confidence,
          hasRecommendations: !!(data.recommendations && data.recommendations.length > 0)
        });

        return data;

      } catch (timeoutError) {
        clearTimeout(timeoutId);
        if (timeoutError.name === 'AbortError') {
          throw new Error('AI analysis timed out - please try again with a smaller document');
        }
        throw timeoutError;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMessage,
        type: error instanceof Error ? error.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        model,
        reviewType: request.reviewType,
        contractType: request.contractType,
        contentLength: request.content.length,
        timestamp: new Date().toISOString()
      };

      console.error('❌ AI service call failed:', errorDetails);

      // Enhanced error context
      const enhancedMessage = `AI service call failed: ${errorMessage}. Model: ${model}, Review Type: ${request.reviewType}`;

      throw new Error(enhancedMessage);
    }
  }

  // Get default solution for review type
  private async getDefaultSolution(reviewType: string, contractType?: string): Promise<CustomSolution> {
    const defaultSolutions: Record<string, CustomSolution> = {
      risk_assessment: {
        name: 'Advanced Risk Assessment',
        description: 'Comprehensive multi-dimensional risk analysis with scenario planning and interconnection analysis',
        contractType: contractType || 'general',
        complianceFramework: ['general-legal', 'commercial-law', 'regulatory-compliance'],
        riskLevel: 'medium',
        customRules: 'Conduct comprehensive risk assessment including financial, legal, operational, compliance, reputational, and strategic risks. Analyze risk interconnections, cascading effects, and scenario planning.',
        analysisDepth: 'comprehensive',
        reportFormat: 'detailed',
        aiModel: AIModel.OPENAI_GPT4O,
        prompts: {
          systemPrompt: 'You are a senior contract risk analyst with expertise in commercial law, regulatory compliance, and enterprise risk management. You have 15+ years of experience reviewing complex commercial agreements across multiple industries.',
          analysisPrompt: 'Conduct a comprehensive risk assessment examining financial, legal, operational, compliance, reputational, and strategic risks. Analyze risk interconnections, provide scenario planning, and deliver strategic recommendations.',
          riskPrompt: 'Focus on multi-dimensional risk analysis including cascading effects, hidden dependencies, and long-term implications. Consider contract lifecycle risks, performance risks, and market condition impacts.',
        },
      },
      compliance_score: {
        name: 'Advanced Regulatory Compliance Assessment',
        description: 'Comprehensive multi-jurisdictional compliance analysis with regulatory trend assessment',
        contractType: contractType || 'data-processing',
        complianceFramework: ['gdpr', 'ccpa', 'data-protection', 'financial-regulations', 'industry-standards', 'cross-border-compliance'],
        riskLevel: 'high',
        customRules: 'Conduct comprehensive regulatory compliance assessment across multiple jurisdictions. Analyze current and emerging regulations, cross-framework impacts, and enforcement risks. Provide detailed remediation roadmap.',
        analysisDepth: 'comprehensive',
        reportFormat: 'detailed',
        aiModel: AIModel.ANTHROPIC_CLAUDE_OPUS,
        prompts: {
          systemPrompt: 'You are a leading compliance expert and regulatory attorney with deep expertise in GDPR, CCPA, HIPAA, SOX, PCI-DSS, international data protection laws, financial regulations, and industry-specific compliance frameworks.',
          analysisPrompt: 'Conduct comprehensive regulatory compliance assessment using multi-jurisdictional analysis, regulatory evolution consideration, cross-framework impact analysis, and enforcement risk evaluation.',
          compliancePrompt: 'Provide detailed compliance scoring with regulatory-specific analysis, gap identification, remediation roadmap, and regulatory landscape assessment.',
        },
      },
      perspective_review: {
        name: 'Advanced Stakeholder Analysis',
        description: 'Sophisticated multi-stakeholder analysis with power dynamics, strategic implications, and negotiation opportunities',
        contractType: contractType || 'commercial',
        complianceFramework: ['commercial-law', 'contract-law', 'negotiation-strategy'],
        riskLevel: 'medium',
        customRules: 'Conduct sophisticated multi-stakeholder analysis including stakeholder mapping, power dynamics, strategic implications, risk allocation, and relationship dynamics. Identify negotiation opportunities and stakeholder conflicts.',
        analysisDepth: 'comprehensive',
        reportFormat: 'detailed',
        aiModel: AIModel.OPENAI_GPT4O,
        prompts: {
          systemPrompt: 'You are a senior contract strategist with expertise in multi-stakeholder analysis, commercial negotiations, and stakeholder management. You have extensive experience representing different parties in complex commercial transactions.',
          analysisPrompt: 'Conduct sophisticated multi-stakeholder analysis using stakeholder mapping, power dynamics analysis, strategic implications assessment, and relationship dynamics evaluation.',
        },
      },
      full_summary: {
        name: 'Executive Strategic Analysis',
        description: 'Executive-level comprehensive analysis with business intelligence, strategic context, and decision support',
        contractType: contractType || 'general',
        complianceFramework: ['general-legal', 'business-strategy', 'commercial-intelligence'],
        riskLevel: 'medium',
        customRules: 'Provide executive-level contract analysis combining legal expertise with business acumen and strategic insight. Include strategic context, commercial intelligence, risk-reward analysis, and implementation roadmap.',
        analysisDepth: 'comprehensive',
        reportFormat: 'executive',
        aiModel: AIModel.ANTHROPIC_CLAUDE_OPUS,
        prompts: {
          systemPrompt: 'You are a distinguished senior partner and contract strategist with 20+ years of experience in complex commercial transactions, M&A, and strategic partnerships. You provide executive-level analysis that combines legal expertise with business acumen.',
          analysisPrompt: 'Provide comprehensive executive-level contract analysis using strategic context, commercial intelligence, risk-reward analysis, competitive positioning, and operational impact assessment.',
        },
      },
    };

    return defaultSolutions[reviewType] || defaultSolutions.full_summary;
  }


  // Custom solution management
  async saveCustomSolution(solution: CustomSolution, userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('custom_solutions')
      .insert({
        name: solution.name,
        description: solution.description,
        contract_type: solution.contractType,
        compliance_framework: solution.complianceFramework,
        risk_level: solution.riskLevel,
        custom_rules: solution.customRules,
        analysis_depth: solution.analysisDepth,
        report_format: solution.reportFormat,
        ai_model: solution.aiModel,
        prompts: solution.prompts,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save custom solution: ${error.message}`);
    }

    logger.userAction('Custom solution created', { 
      solutionName: solution.name,
      userId 
    });

    return data.id;
  }

  async getCustomSolutions(userId: string): Promise<CustomSolution[]> {
    const { data, error } = await supabase
      .from('custom_solutions')
      .select('*')
      .or(`created_by.eq.${userId},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch custom solutions: ${error.message}`);
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      contractType: item.contract_type,
      complianceFramework: item.compliance_framework,
      riskLevel: item.risk_level,
      customRules: item.custom_rules,
      analysisDepth: item.analysis_depth,
      reportFormat: item.report_format,
      aiModel: item.ai_model,
      prompts: item.prompts,
    }));
  }
}

export const aiService = AIService.getInstance();
export default aiService;
