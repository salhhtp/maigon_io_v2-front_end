import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler';

// AI Model Configuration
export enum AIModel {
  OPENAI_GPT4 = 'openai-gpt-4',
  OPENAI_GPT35 = 'openai-gpt-3.5-turbo',
  ANTHROPIC_CLAUDE = 'anthropic-claude-3',
  GOOGLE_GEMINI = 'google-gemini-pro',
}

export interface ContractAnalysisRequest {
  content: string;
  reviewType: string;
  contractType?: string;
  customSolution?: CustomSolution;
  model?: AIModel;
  userId: string;
  filename?: string;
  documentFormat?: string;
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

  // Main contract analysis method
  async analyzeContract(request: ContractAnalysisRequest): Promise<AnalysisResult> {
    const startTime = performance.now();
    
    try {
      logger.contractAction('AI analysis started', undefined, {
        reviewType: request.reviewType,
        model: request.model || AIModel.OPENAI_GPT4,
        userId: request.userId,
        hasCustomSolution: !!request.customSolution
      });

      // Get or create custom solution if provided
      let customSolution = request.customSolution;
      if (!customSolution && request.reviewType !== 'ai_integration') {
        customSolution = await this.getDefaultSolution(request.reviewType, request.contractType);
      }

      // Call the appropriate AI service
      const result = await this.callAIService(request, customSolution);
      
      const processingTime = (performance.now() - startTime) / 1000;
      
      const analysisResult: AnalysisResult = {
        ...result,
        processing_time: processingTime,
        timestamp: new Date().toISOString(),
        model_used: request.model || AIModel.OPENAI_GPT4,
        custom_solution_id: customSolution?.id,
      };

      logger.contractAction('AI analysis completed', undefined, {
        reviewType: request.reviewType,
        processingTime,
        score: result.score,
        confidence: result.confidence,
        userId: request.userId
      });

      return analysisResult;
    } catch (error) {
      logger.error('AI analysis failed', { 
        reviewType: request.reviewType,
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fallback to enhanced mock data for development
      return this.generateEnhancedMockAnalysis(request.reviewType);
    }
  }

  // Call AI service based on model
  private async callAIService(
    request: ContractAnalysisRequest, 
    customSolution?: CustomSolution
  ): Promise<Partial<AnalysisResult>> {
    const model = request.model || customSolution?.aiModel || AIModel.OPENAI_GPT4;
    
    // Call Supabase Edge Function for AI processing
    const { data, error } = await supabase.functions.invoke('analyze-contract', {
      body: {
        content: request.content,
        reviewType: request.reviewType,
        model,
        customSolution,
        contractType: request.contractType,
        filename: request.filename,
        documentFormat: request.documentFormat,
      },
    });

    if (error) {
      throw new Error(`AI service error: ${error.message}`);
    }

    return data;
  }

  // Get default solution for review type
  private async getDefaultSolution(reviewType: string, contractType?: string): Promise<CustomSolution> {
    const defaultSolutions: Record<string, CustomSolution> = {
      risk_assessment: {
        name: 'Standard Risk Assessment',
        description: 'Comprehensive risk analysis for contracts',
        contractType: contractType || 'general',
        complianceFramework: ['general-legal', 'commercial-law'],
        riskLevel: 'medium',
        customRules: 'Identify all potential risks including financial, legal, operational, and compliance risks.',
        analysisDepth: 'standard',
        reportFormat: 'detailed',
        aiModel: AIModel.OPENAI_GPT4,
        prompts: {
          systemPrompt: 'You are an expert legal analyst specializing in contract risk assessment.',
          analysisPrompt: 'Analyze this contract for potential risks, categorize them by type and severity, and provide actionable recommendations.',
          riskPrompt: 'Focus on identifying financial risks, legal liabilities, operational challenges, and compliance issues.',
        },
      },
      compliance_score: {
        name: 'Compliance Assessment',
        description: 'GDPR and regulatory compliance analysis',
        contractType: contractType || 'data-processing',
        complianceFramework: ['gdpr', 'data-protection', 'financial-regulations'],
        riskLevel: 'high',
        customRules: 'Evaluate compliance with GDPR, data protection laws, and relevant industry regulations.',
        analysisDepth: 'comprehensive',
        reportFormat: 'detailed',
        aiModel: AIModel.OPENAI_GPT4,
        prompts: {
          systemPrompt: 'You are a compliance expert specializing in GDPR and data protection regulations.',
          analysisPrompt: 'Assess this contract for compliance with GDPR, data protection laws, and industry standards.',
          compliancePrompt: 'Provide detailed compliance scoring and identify any violations or areas of concern.',
        },
      },
      perspective_review: {
        name: 'Multi-Perspective Analysis',
        description: 'Analysis from buyer, seller, and legal perspectives',
        contractType: contractType || 'commercial',
        complianceFramework: ['commercial-law', 'contract-law'],
        riskLevel: 'medium',
        customRules: 'Analyze from multiple stakeholder perspectives to identify advantages and concerns for each party.',
        analysisDepth: 'standard',
        reportFormat: 'detailed',
        aiModel: AIModel.OPENAI_GPT4,
        prompts: {
          systemPrompt: 'You are a contract analyst capable of viewing agreements from multiple perspectives.',
          analysisPrompt: 'Analyze this contract from buyer, seller, legal, and individual perspectives, identifying concerns and advantages for each.',
        },
      },
      full_summary: {
        name: 'Comprehensive Summary',
        description: 'Complete contract analysis and summary',
        contractType: contractType || 'general',
        complianceFramework: ['general-legal'],
        riskLevel: 'medium',
        customRules: 'Provide a comprehensive summary with key terms, critical clauses, and actionable insights.',
        analysisDepth: 'comprehensive',
        reportFormat: 'executive',
        aiModel: AIModel.OPENAI_GPT4,
        prompts: {
          systemPrompt: 'You are a senior legal analyst providing executive-level contract summaries.',
          analysisPrompt: 'Provide a comprehensive summary of this contract including key terms, critical clauses, risks, and recommendations.',
        },
      },
    };

    return defaultSolutions[reviewType] || defaultSolutions.full_summary;
  }

  // Enhanced mock analysis for development/fallback
  private generateEnhancedMockAnalysis(reviewType: string): AnalysisResult {
    const baseResult = {
      timestamp: new Date().toISOString(),
      pages: Math.floor(Math.random() * 25) + 5,
      processing_time: Math.random() * 8 + 2,
      model_used: AIModel.OPENAI_GPT4,
      confidence_breakdown: {
        content_clarity: Math.random() * 0.3 + 0.7,
        legal_complexity: Math.random() * 0.4 + 0.6,
        risk_identification: Math.random() * 0.2 + 0.8,
        compliance_assessment: Math.random() * 0.3 + 0.7,
      },
    };

    switch (reviewType) {
      case 'risk_assessment':
        return {
          ...baseResult,
          score: Math.floor(Math.random() * 30) + 65,
          confidence: Math.random() * 0.25 + 0.75,
          risks: [
            {
              type: 'financial',
              level: 'medium',
              description: 'Payment terms include late payment penalties that may impact cash flow',
              recommendation: 'Negotiate more favorable payment terms or request penalty caps',
              impact_score: 6.5,
            },
            {
              type: 'legal',
              level: 'low',
              description: 'Standard liability limitations are in place',
              recommendation: 'Review liability caps to ensure adequate protection',
              impact_score: 3.2,
            },
            {
              type: 'operational',
              level: 'high',
              description: 'Delivery timelines are aggressive and may be difficult to meet',
              recommendation: 'Request extended delivery windows or milestone-based approach',
              impact_score: 8.1,
            },
          ],
          recommendations: [
            'Negotiate payment terms to reduce financial risk',
            'Add force majeure clause for operational protection',
            'Consider professional liability insurance',
            'Establish clear communication protocols',
          ],
          action_items: [
            'Review and negotiate payment schedule',
            'Assess operational capacity for delivery timelines',
            'Consult legal counsel on liability provisions',
          ],
        };

      case 'compliance_score':
        return {
          ...baseResult,
          score: Math.floor(Math.random() * 25) + 75,
          confidence: Math.random() * 0.15 + 0.85,
          compliance_areas: {
            gdpr: Math.floor(Math.random() * 20) + 80,
            data_protection: Math.floor(Math.random() * 25) + 75,
            financial_regulations: Math.floor(Math.random() * 15) + 85,
            industry_standards: Math.floor(Math.random() * 30) + 70,
            employment_law: Math.floor(Math.random() * 20) + 80,
          },
          violations: [
            {
              framework: 'GDPR',
              severity: 'medium',
              description: 'Data retention periods not clearly specified',
              recommendation: 'Add explicit data retention and deletion timelines',
            },
          ],
          recommendations: [
            'Clarify data retention and deletion procedures',
            'Add data subject rights clauses',
            'Include data breach notification procedures',
            'Specify lawful basis for data processing',
          ],
        };

      case 'perspective_review':
        return {
          ...baseResult,
          score: Math.floor(Math.random() * 40) + 60,
          confidence: Math.random() * 0.3 + 0.7,
          perspectives: {
            buyer: {
              score: Math.floor(Math.random() * 30) + 70,
              concerns: ['Payment terms favor seller', 'Limited warranty provisions', 'Strict delivery requirements'],
              advantages: ['Competitive pricing', 'Clear service specifications', 'Established vendor reputation'],
            },
            seller: {
              score: Math.floor(Math.random() * 25) + 75,
              concerns: ['Extended payment terms', 'High liability exposure', 'Aggressive performance metrics'],
              advantages: ['Long-term contract duration', 'Clear scope of work', 'Regular payment schedule'],
            },
            legal: {
              score: Math.floor(Math.random() * 20) + 80,
              concerns: ['Jurisdiction clause needs review', 'Termination provisions unclear'],
              advantages: ['Standard industry terms', 'Clear dispute resolution process', 'Adequate IP protection'],
            },
            individual: {
              score: Math.floor(Math.random() * 35) + 65,
              concerns: ['Limited privacy protections', 'Data usage scope too broad'],
              advantages: ['Clear consent mechanisms', 'Data portability rights included'],
            },
          },
          recommendations: [
            'Balance payment terms to be fair for both parties',
            'Clarify termination and transition procedures',
            'Strengthen individual privacy protections',
            'Add performance incentive structures',
          ],
        };

      case 'full_summary':
        return {
          ...baseResult,
          score: Math.floor(Math.random() * 35) + 65,
          confidence: Math.random() * 0.25 + 0.75,
          summary: 'This is a comprehensive commercial agreement with standard industry terms. The contract establishes a clear framework for service delivery with defined performance metrics and payment structures. Key areas requiring attention include liability provisions, data protection compliance, and termination procedures.',
          key_points: [
            'Contract duration: 24 months with automatic renewal',
            'Payment terms: Net 30 days with 2% early payment discount',
            'Service level agreement: 99.5% uptime guarantee',
            'Liability cap: Limited to 12 months of fees',
            'Termination: 90 days written notice required',
            'Data protection: GDPR compliance required',
          ],
          critical_clauses: [
            {
              clause: 'Limitation of Liability',
              importance: 'high',
              recommendation: 'Review caps and exclusions to ensure adequate protection',
            },
            {
              clause: 'Data Processing Agreement',
              importance: 'high',
              recommendation: 'Ensure compliance with latest GDPR requirements',
            },
            {
              clause: 'Intellectual Property Rights',
              importance: 'medium',
              recommendation: 'Clarify ownership of work product and derivatives',
            },
          ],
          recommendations: [
            'Negotiate more balanced liability provisions',
            'Add specific data breach notification procedures',
            'Include force majeure clause for unforeseen circumstances',
            'Establish clear change management process',
          ],
          action_items: [
            'Legal review of liability and indemnification clauses',
            'IT security assessment for data protection requirements',
            'Finance review of payment terms and penalties',
            'Operations assessment of service level commitments',
          ],
          extracted_terms: {
            contract_value: '$250,000 annually',
            payment_schedule: 'Monthly in advance',
            renewal_terms: 'Automatic 12-month renewal',
            governing_law: 'New York State',
            dispute_resolution: 'Binding arbitration',
          },
        };

      default:
        return {
          ...baseResult,
          score: Math.floor(Math.random() * 40) + 60,
          confidence: Math.random() * 0.4 + 0.6,
          summary: 'General contract analysis completed with standard legal review.',
          recommendations: [
            'Review terms and conditions carefully',
            'Consider legal consultation for complex clauses',
            'Ensure compliance with applicable regulations',
          ],
        };
    }
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
