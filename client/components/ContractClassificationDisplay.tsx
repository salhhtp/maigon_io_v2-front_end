import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FileText, Lightbulb, Target } from 'lucide-react';

interface ContractClassificationResult {
  contractType: string;
  confidence: number;
  subType?: string;
  characteristics: string[];
  reasoning: string;
  suggestedSolutions: string[];
}

interface ContractClassificationDisplayProps {
  classification: ContractClassificationResult;
  isVisible: boolean;
}

const ContractClassificationDisplay: React.FC<ContractClassificationDisplayProps> = ({
  classification,
  isVisible
}) => {
  if (!isVisible) return null;

  const getContractTypeDisplayName = (contractType: string): string => {
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
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getSolutionDisplayName = (solution: string): string => {
    const names: Record<string, string> = {
      risk_assessment: 'Risk Assessment',
      compliance_score: 'Compliance Analysis',
      perspective_review: 'Multi-Perspective Review',
      full_summary: 'Executive Summary',
      ai_integration: 'AI Integration Analysis'
    };
    return names[solution] || solution;
  };

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Contract Classification Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Type & Confidence */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900">
              {getContractTypeDisplayName(classification.contractType)}
            </span>
            {classification.subType && (
              <span className="text-sm text-gray-600">({classification.subType})</span>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={getConfidenceColor(classification.confidence)}
          >
            {Math.round(classification.confidence * 100)}% confidence
          </Badge>
        </div>

        {/* Key Characteristics */}
        {classification.characteristics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Key Characteristics:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {classification.characteristics.map((characteristic, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {characteristic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Solutions */}
        {classification.suggestedSolutions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Recommended Analysis:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {classification.suggestedSolutions.map((solution, index) => (
                <Badge key={index} variant="outline" className="text-xs border-blue-200 text-blue-700">
                  {getSolutionDisplayName(solution)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Reasoning */}
        {classification.reasoning && (
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border">
            <strong>AI Analysis:</strong> {classification.reasoning}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractClassificationDisplay;
