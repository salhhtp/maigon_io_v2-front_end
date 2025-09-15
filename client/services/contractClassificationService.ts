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

    // Define classification rules
    const rules = [
      {
        type: 'data_processing_agreement',
        confidence: 0.9,
        keywords: ['data processing', 'personal data', 'gdpr', 'data subject', 'controller', 'processor', 'privacy'],
        characteristics: ['Contains data protection clauses', 'References GDPR compliance', 'Defines data processing roles'],
        solutions: ['compliance_score', 'perspective_review']
      },
      {
        type: 'service_agreement',
        confidence: 0.85,
        keywords: ['service agreement', 'professional services', 'service level', 'sla', 'performance metrics'],
        characteristics: ['Defines service delivery terms', 'Contains SLA requirements', 'Specifies performance standards'],
        solutions: ['risk_assessment', 'full_summary', 'perspective_review']
      },
      {
        type: 'software_license',
        confidence: 0.8,
        keywords: ['software license', 'intellectual property', 'copyright', 'usage rights', 'license terms'],
        characteristics: ['Grants software usage rights', 'Contains IP protections', 'Defines usage restrictions'],
        solutions: ['compliance_score', 'risk_assessment']
      },
      {
        type: 'employment_contract',
        confidence: 0.85,
        keywords: ['employment', 'employee', 'salary', 'benefits', 'termination', 'non-compete', 'confidentiality'],
        characteristics: ['Defines employment terms', 'Contains compensation details', 'Includes confidentiality clauses'],
        solutions: ['compliance_score', 'risk_assessment', 'perspective_review']
      },
      {
        type: 'non_disclosure_agreement',
        confidence: 0.9,
        keywords: ['non-disclosure', 'confidentiality', 'proprietary information', 'trade secrets', 'confidential'],
        characteristics: ['Protects confidential information', 'Defines disclosure restrictions', 'Contains penalty clauses'],
        solutions: ['compliance_score', 'risk_assessment']
      },
      {
        type: 'vendor_agreement',
        confidence: 0.8,
        keywords: ['vendor', 'supplier', 'procurement', 'purchase', 'delivery', 'payment terms'],
        characteristics: ['Governs vendor relationships', 'Contains delivery requirements', 'Specifies payment terms'],
        solutions: ['risk_assessment', 'full_summary', 'perspective_review']
      },
      {
        type: 'partnership_agreement',
        confidence: 0.75,
        keywords: ['partnership', 'joint venture', 'collaboration', 'revenue sharing', 'mutual'],
        characteristics: ['Establishes business partnership', 'Defines shared responsibilities', 'Contains revenue arrangements'],
        solutions: ['full_summary', 'perspective_review', 'risk_assessment']
      },
      {
        type: 'lease_agreement',
        confidence: 0.85,
        keywords: ['lease', 'rental', 'premises', 'property', 'landlord', 'tenant', 'rent'],
        characteristics: ['Governs property rental', 'Defines rental terms', 'Contains property usage rights'],
        solutions: ['risk_assessment', 'compliance_score', 'perspective_review']
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
      service_agreement: 'Service Agreement',
      software_license: 'Software License Agreement',
      employment_contract: 'Employment Contract',
      non_disclosure_agreement: 'Non-Disclosure Agreement',
      vendor_agreement: 'Vendor/Supplier Agreement',
      partnership_agreement: 'Partnership Agreement',
      lease_agreement: 'Lease Agreement',
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
      service_agreement: ['risk_assessment', 'full_summary', 'perspective_review'],
      software_license: ['compliance_score', 'risk_assessment'],
      employment_contract: ['compliance_score', 'risk_assessment', 'perspective_review'],
      non_disclosure_agreement: ['compliance_score', 'risk_assessment'],
      vendor_agreement: ['risk_assessment', 'full_summary', 'perspective_review'],
      partnership_agreement: ['full_summary', 'perspective_review', 'risk_assessment'],
      lease_agreement: ['risk_assessment', 'compliance_score', 'perspective_review'],
      general_commercial: ['full_summary', 'risk_assessment']
    };

    return recommendations[contractType] || ['full_summary', 'risk_assessment'];
  }
}

export const contractClassificationService = ContractClassificationService.getInstance();
export default contractClassificationService;
