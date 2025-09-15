import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

export interface ContractClassificationResult {
  contractType: string;
  confidence: number;
  subType?: string;
  characteristics: string[];
  reasoning: string;
  suggestedSolutions: string[];
}

export class ContractClassificationService {
  private static instance: ContractClassificationService;
  
  static getInstance(): ContractClassificationService {
    if (!ContractClassificationService.instance) {
      ContractClassificationService.instance = new ContractClassificationService();
    }
    return ContractClassificationService.instance;
  }

  /**
   * Analyze contract content to automatically determine its type
   */
  async classifyContract(content: string, fileName?: string): Promise<ContractClassificationResult> {
    try {
      console.log('🤖 Starting intelligent contract classification...');
      
      // Call Supabase Edge Function for AI-powered classification
      const { data, error } = await supabase.functions.invoke('classify-contract', {
        body: {
          content: content.substring(0, 5000), // First 5000 chars for classification
          fileName: fileName || 'unknown'
        },
      });

      if (error) {
        console.warn('⚠️ AI classification failed, using fallback rules:', error);
        return this.fallbackClassification(content, fileName);
      }

      if (!data) {
        console.warn('⚠️ No classification data returned, using fallback');
        return this.fallbackClassification(content, fileName);
      }

      console.log('✅ AI contract classification completed:', data);
      return data as ContractClassificationResult;

    } catch (error) {
      console.warn('⚠️ Classification error, using fallback:', error);
      return this.fallbackClassification(content, fileName);
    }
  }

  /**
   * Fallback rule-based classification when AI is unavailable
   */
  private fallbackClassification(content: string, fileName?: string): ContractClassificationResult {
    const contentLower = content.toLowerCase();
    const fileNameLower = (fileName || '').toLowerCase();

    // Define classification rules based on the 7 specific solution types
    const rules = [
      {
        type: 'data_processing_agreement',
        confidence: 0.95,
        keywords: ['data processing', 'personal data', 'gdpr', 'data subject', 'controller', 'processor', 'privacy', 'edpb', 'data protection'],
        characteristics: ['GDPR compliance focused', 'Data processing roles defined', 'EDPB guidelines adherence', 'Data protection safeguards'],
        solutions: ['compliance_score', 'perspective_review']
      },
      {
        type: 'non_disclosure_agreement',
        confidence: 0.95,
        keywords: ['non-disclosure', 'confidentiality', 'proprietary information', 'trade secrets', 'confidential', 'nda', 'non disclosure'],
        characteristics: ['Confidentiality protection', 'Trade secret safeguards', 'Information disclosure restrictions', 'Penalty enforcement'],
        solutions: ['compliance_score', 'risk_assessment']
      },
      {
        type: 'privacy_policy_document',
        confidence: 0.9,
        keywords: ['privacy policy', 'privacy statement', 'data collection', 'privacy notice', 'cookies', 'user data', 'privacy practices'],
        characteristics: ['GDPR criteria compliance', 'Privacy rights outlined', 'Data usage transparency', 'User consent mechanisms'],
        solutions: ['compliance_score', 'perspective_review']
      },
      {
        type: 'consultancy_agreement',
        confidence: 0.9,
        keywords: ['consultancy', 'professional services', 'consulting', 'advisory', 'expertise', 'consultant', 'service provider'],
        characteristics: ['Professional service delivery', 'Expertise provision', 'Service standards defined', 'Deliverable specifications'],
        solutions: ['risk_assessment', 'full_summary', 'perspective_review']
      },
      {
        type: 'research_development_agreement',
        confidence: 0.85,
        keywords: ['research', 'development', 'r&d', 'innovation', 'technology', 'intellectual property', 'research and development'],
        characteristics: ['Industry standards compliance', 'Innovation framework', 'IP ownership clauses', 'Research deliverables'],
        solutions: ['compliance_score', 'risk_assessment', 'perspective_review']
      },
      {
        type: 'end_user_license_agreement',
        confidence: 0.9,
        keywords: ['end user license', 'eula', 'software license', 'license agreement', 'usage rights', 'software terms', 'license terms'],
        characteristics: ['Software usage rights', 'License restrictions', 'User obligations', 'IP protections'],
        solutions: ['compliance_score', 'risk_assessment']
      },
      {
        type: 'product_supply_agreement',
        confidence: 0.85,
        keywords: ['product supply', 'supply agreement', 'supplier', 'product delivery', 'manufacturing', 'goods supply', 'procurement'],
        characteristics: ['Product delivery terms', 'Supply chain standards', 'Quality specifications', 'Delivery obligations'],
        solutions: ['risk_assessment', 'full_summary', 'perspective_review']
      }
    ];

    // Score each rule
    let bestMatch = {
      type: 'general_commercial',
      confidence: 0.5,
      characteristics: ['General commercial agreement'],
      solutions: ['full_summary', 'risk_assessment']
    };

    for (const rule of rules) {
      let score = 0;
      const foundKeywords: string[] = [];

      // Check content keywords
      for (const keyword of rule.keywords) {
        if (contentLower.includes(keyword)) {
          score += 1;
          foundKeywords.push(keyword);
        }
      }

      // Check filename keywords  
      for (const keyword of rule.keywords) {
        if (fileNameLower.includes(keyword.replace(' ', '_'))) {
          score += 0.5;
        }
      }

      // Calculate confidence based on keyword matches
      const keywordConfidence = Math.min(score / rule.keywords.length, 1) * rule.confidence;

      if (keywordConfidence > bestMatch.confidence) {
        bestMatch = {
          type: rule.type,
          confidence: keywordConfidence,
          characteristics: rule.characteristics,
          solutions: rule.solutions
        };
      }
    }

    return {
      contractType: bestMatch.type,
      confidence: bestMatch.confidence,
      characteristics: bestMatch.characteristics,
      reasoning: `Classified based on content analysis and keyword matching. Primary indicators: document structure and terminology.`,
      suggestedSolutions: bestMatch.solutions
    };
  }

  /**
   * Get contract type display name
   */
  static getContractTypeDisplayName(contractType: string): string {
    const displayNames: Record<string, string> = {
      data_processing_agreement: 'Data Processing Agreement',
      non_disclosure_agreement: 'Non-Disclosure Agreement',
      privacy_policy_document: 'Privacy Policy Document',
      consultancy_agreement: 'Consultancy Agreement',
      research_development_agreement: 'R&D Agreement',
      end_user_license_agreement: 'End User License Agreement',
      product_supply_agreement: 'Product Supply Agreement',
      general_commercial: 'General Commercial Agreement'
    };

    return displayNames[contractType] || 'Commercial Agreement';
  }

  /**
   * Get recommended analysis solutions based on contract type
   */
  static getRecommendedSolutions(contractType: string): string[] {
    const recommendations: Record<string, string[]> = {
      data_processing_agreement: ['compliance_score', 'perspective_review'],
      non_disclosure_agreement: ['compliance_score', 'risk_assessment'],
      privacy_policy_document: ['compliance_score', 'perspective_review'],
      consultancy_agreement: ['risk_assessment', 'full_summary', 'perspective_review'],
      research_development_agreement: ['compliance_score', 'risk_assessment', 'perspective_review'],
      end_user_license_agreement: ['compliance_score', 'risk_assessment'],
      product_supply_agreement: ['risk_assessment', 'full_summary', 'perspective_review'],
      general_commercial: ['full_summary', 'risk_assessment']
    };

    return recommendations[contractType] || ['full_summary', 'risk_assessment'];
  }
}

export const contractClassificationService = ContractClassificationService.getInstance();
export default contractClassificationService;
