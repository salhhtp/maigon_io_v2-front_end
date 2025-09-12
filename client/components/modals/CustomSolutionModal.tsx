import React, { useState } from "react";
import { useUser } from "@/contexts/SupabaseUserContext";
import { aiService, AIModel } from "@/services/aiService";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  FileText,
  Settings,
  AlertCircle,
  Shield,
  Users,
  Database,
  Loader2,
} from "lucide-react";

interface CustomSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (solutionData: any) => void;
}

export default function CustomSolutionModal({
  isOpen,
  onClose,
  onSuccess,
}: CustomSolutionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contractType: "",
    complianceFramework: [] as string[],
    riskLevel: "medium" as "low" | "medium" | "high",
    customRules: "",
    analysisDepth: "standard" as "basic" | "standard" | "comprehensive",
    reportFormat: "detailed" as "summary" | "detailed" | "executive",
    aiModel: "openai-gpt-4" as AIModel,
    systemPrompt: "",
    analysisPrompt: "",
    riskPrompt: "",
    compliancePrompt: "",
  });

  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.contractType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error", 
        description: "You must be logged in to create custom solutions.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare custom solution data
      const customSolution = {
        name: formData.name,
        description: formData.description,
        contractType: formData.contractType,
        complianceFramework: Array.isArray(formData.complianceFramework) 
          ? formData.complianceFramework 
          : [formData.complianceFramework].filter(Boolean),
        riskLevel: formData.riskLevel,
        customRules: formData.customRules,
        analysisDepth: formData.analysisDepth,
        reportFormat: formData.reportFormat,
        aiModel: formData.aiModel,
        prompts: {
          systemPrompt: formData.systemPrompt || getDefaultSystemPrompt(formData.contractType),
          analysisPrompt: formData.analysisPrompt || getDefaultAnalysisPrompt(formData.analysisDepth),
          riskPrompt: formData.riskPrompt,
          compliancePrompt: formData.compliancePrompt,
        },
      };

      // Save to database
      const solutionId = await aiService.saveCustomSolution(customSolution, user.id);
      
      const solutionData = {
        id: solutionId,
        ...customSolution,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      toast({
        title: "Success",
        description: "Custom solution created successfully!",
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(solutionData);
      }

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating solution:", error);
      toast({
        title: "Error",
        description: "Failed to create custom solution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      contractType: "",
      complianceFramework: [],
      riskLevel: "medium",
      customRules: "",
      analysisDepth: "standard",
      reportFormat: "detailed",
      aiModel: "openai-gpt-4",
      systemPrompt: "",
      analysisPrompt: "",
      riskPrompt: "",
      compliancePrompt: "",
    });
  };

  const getDefaultSystemPrompt = (contractType: string): string => {
    const prompts: Record<string, string> = {
      'data-processing': 'You are a GDPR and data protection expert specializing in privacy law compliance.',
      'employment': 'You are an employment law specialist focusing on HR compliance and worker rights.',
      'commercial': 'You are a commercial contract expert with expertise in business law and risk assessment.',
      'nda': 'You are a confidentiality and intellectual property expert specializing in NDAs.',
      'service': 'You are a service agreement specialist focusing on operational and performance terms.',
    };
    return prompts[contractType] || 'You are an expert legal analyst specializing in contract review.';
  };

  const getDefaultAnalysisPrompt = (depth: string): string => {
    const prompts: Record<string, string> = {
      'basic': 'Provide a concise analysis focusing on the most critical terms and potential issues.',
      'standard': 'Conduct a thorough analysis of key terms, risks, and compliance requirements.',
      'comprehensive': 'Perform an exhaustive analysis covering all aspects including detailed risk assessment, compliance review, and strategic recommendations.',
    };
    return prompts[depth] || prompts.standard;
  };

  const handleComplianceFrameworkChange = (framework: string) => {
    const current = Array.isArray(formData.complianceFramework)
      ? formData.complianceFramework
      : [];
    
    if (current.includes(framework)) {
      setFormData({
        ...formData,
        complianceFramework: current.filter((f) => f !== framework),
      });
    } else {
      setFormData({
        ...formData,
        complianceFramework: [...current, framework],
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[#271D1D]">
            <Plus className="w-5 h-5" />
            Create Custom Solution
          </DialogTitle>
          <DialogDescription className="text-[#271D1D]/70">
            Design a custom AI-powered contract analysis solution tailored to your specific needs and compliance requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-[#271D1D]">
                  Solution Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., GDPR Data Processing Review"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="border-[#271D1D]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractType" className="text-sm font-medium text-[#271D1D]">
                  Contract Type *
                </Label>
                <Select value={formData.contractType} onValueChange={(value) => handleInputChange('contractType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contract type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data-processing">Data Processing Agreement</SelectItem>
                    <SelectItem value="employment">Employment Contract</SelectItem>
                    <SelectItem value="commercial">Commercial Agreement</SelectItem>
                    <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                    <SelectItem value="service">Service Agreement</SelectItem>
                    <SelectItem value="supply">Supply Agreement</SelectItem>
                    <SelectItem value="license">License Agreement</SelectItem>
                    <SelectItem value="general">General Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-[#271D1D]">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what this solution analyzes and its specific focus areas..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="border-[#271D1D]/20"
                rows={3}
              />
            </div>
          </div>

          {/* Analysis Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Analysis Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#271D1D] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Risk Level
                </Label>
                <Select value={formData.riskLevel} onValueChange={(value) => handleInputChange('riskLevel', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk Focus</SelectItem>
                    <SelectItem value="medium">Medium Risk Focus</SelectItem>
                    <SelectItem value="high">High Risk Focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#271D1D] flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Analysis Depth
                </Label>
                <Select value={formData.analysisDepth} onValueChange={(value) => handleInputChange('analysisDepth', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Analysis</SelectItem>
                    <SelectItem value="standard">Standard Analysis</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#271D1D] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Report Format
                </Label>
                <Select value={formData.reportFormat} onValueChange={(value) => handleInputChange('reportFormat', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="executive">Executive Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#271D1D] flex items-center gap-2">
                <Database className="w-4 h-4" />
                AI Model
              </Label>
              <Select value={formData.aiModel} onValueChange={(value) => handleInputChange('aiModel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai-gpt-4">OpenAI GPT-4 (Recommended)</SelectItem>
                  <SelectItem value="openai-gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="anthropic-claude-3">Anthropic Claude 3</SelectItem>
                  <SelectItem value="google-gemini-pro">Google Gemini Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Compliance Framework */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Compliance Framework
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "GDPR",
                "Data Protection",
                "Financial Regulations",
                "Employment Law",
                "Commercial Law",
                "Industry Standards",
                "Privacy Laws",
                "Contract Law",
                "Intellectual Property",
              ].map((framework) => (
                <div key={framework} className="flex items-center space-x-2">
                  <Checkbox
                    id={framework}
                    checked={formData.complianceFramework.includes(framework.toLowerCase().replace(" ", "-"))}
                    onCheckedChange={() => handleComplianceFrameworkChange(framework.toLowerCase().replace(" ", "-"))}
                  />
                  <Label htmlFor={framework} className="text-sm text-[#271D1D]">
                    {framework}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Rules */}
          <div className="space-y-2">
            <Label htmlFor="customRules" className="text-sm font-medium text-[#271D1D]">
              Custom Analysis Rules
            </Label>
            <Textarea
              id="customRules"
              placeholder="Define specific rules, focus areas, or requirements for the AI analysis. These rules will be processed by our AI engine to customize the review process..."
              value={formData.customRules}
              onChange={(e) => handleInputChange('customRules', e.target.value)}
              className="border-[#271D1D]/20"
              rows={4}
            />
            <p className="text-xs text-[#271D1D]/60">
              Example: "Focus on intellectual property clauses, prioritize data retention periods, flag any unusual termination conditions"
            </p>
          </div>

          {/* Advanced AI Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-[#271D1D] flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Advanced AI Configuration (Optional)
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-[#271D1D]">System Prompt</Label>
                <Textarea
                  placeholder="Define the AI's role and expertise (e.g., 'You are a GDPR compliance expert...')"
                  value={formData.systemPrompt}
                  onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-[#271D1D]">Analysis Instructions</Label>
                <Textarea
                  placeholder="Specific instructions for contract analysis"
                  value={formData.analysisPrompt}
                  onChange={(e) => handleInputChange('analysisPrompt', e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-[#271D1D]">Risk Assessment Focus</Label>
                  <Textarea
                    placeholder="Specific risk analysis instructions"
                    value={formData.riskPrompt}
                    onChange={(e) => handleInputChange('riskPrompt', e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-[#271D1D]">Compliance Focus</Label>
                  <Textarea
                    placeholder="Compliance-specific analysis instructions"
                    value={formData.compliancePrompt}
                    onChange={(e) => handleInputChange('compliancePrompt', e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-[#271D1D]/20 text-[#271D1D]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Solution
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
