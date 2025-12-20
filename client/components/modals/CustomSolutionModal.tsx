import React, { useEffect, useState } from "react";
import { useUser } from "@/contexts/SupabaseUserContext";
import { aiService, AIModel } from "@/services/aiService";
import AdminOrgService from "@/services/adminOrgService";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  FileText,
  Settings,
  AlertCircle,
  Shield,
  Users,
  Database,
  Loader2,
  LayoutGrid,
  Layers,
  GitBranch,
  Link2,
  Trash2,
} from "lucide-react";
import type {
  AdminOrganizationSummary,
  CustomSolutionClauseTemplate,
  CustomSolutionDeviationRule,
  CustomSolutionSimilarityBenchmark,
  CustomSolutionSectionConfig,
  CustomSolutionDraftingSettings,
  CustomSolutionModelSettings,
} from "@shared/api";

const normalizeFrameworkName = (label: string) =>
  label.toLowerCase().replace(/\s+/g, "-");

const COMPLIANCE_FRAMEWORK_OPTIONS = [
  { label: "GDPR", value: normalizeFrameworkName("GDPR") },
  { label: "Data Protection", value: normalizeFrameworkName("Data Protection") },
  {
    label: "Financial Regulations",
    value: normalizeFrameworkName("Financial Regulations"),
  },
  { label: "Employment Law", value: normalizeFrameworkName("Employment Law") },
  { label: "Commercial Law", value: normalizeFrameworkName("Commercial Law") },
  {
    label: "Industry Standards",
    value: normalizeFrameworkName("Industry Standards"),
  },
  { label: "Privacy Laws", value: normalizeFrameworkName("Privacy Laws") },
  { label: "Contract Law", value: normalizeFrameworkName("Contract Law") },
  {
    label: "Intellectual Property",
    value: normalizeFrameworkName("Intellectual Property"),
  },
];

const AI_MODEL_OPTIONS: Array<{ label: string; value: AIModel }> = [
  { label: "OpenAI GPT-5 Pro (Reasoning)", value: AIModel.OPENAI_GPT5_PRO },
  { label: "OpenAI GPT-5 (Balanced)", value: AIModel.OPENAI_GPT5 },
  { label: "OpenAI GPT-5 Mini", value: AIModel.OPENAI_GPT5_MINI },
  { label: "OpenAI GPT-5 Nano", value: AIModel.OPENAI_GPT5_NANO },
  { label: "OpenAI GPT-4o", value: AIModel.OPENAI_GPT4O },
  { label: "OpenAI GPT-4", value: AIModel.OPENAI_GPT4 },
  { label: "OpenAI GPT-3.5 Turbo", value: AIModel.OPENAI_GPT35 },
  { label: "Anthropic Claude 3", value: AIModel.ANTHROPIC_CLAUDE },
  { label: "Anthropic Claude 3 Opus", value: AIModel.ANTHROPIC_CLAUDE_OPUS },
  { label: "Google Gemini Pro", value: AIModel.GOOGLE_GEMINI },
];

const SECTION_PRESETS: ReadonlyArray<CustomSolutionSectionConfig> = [
  { id: "generalInformation", title: "General information", enabled: true },
  { id: "contractSummary", title: "Contract summary", enabled: true },
  { id: "issues", title: "Issues to be addressed", enabled: true },
  { id: "criteria", title: "Criteria met", enabled: true },
  { id: "playbookInsights", title: "Playbook deviations", enabled: true },
  { id: "clauseInsights", title: "Clause insights", enabled: true },
  { id: "similarity", title: "Similarity analysis", enabled: false },
  { id: "actionItems", title: "Action items", enabled: true },
];

const buildDefaultSectionLayout = (): CustomSolutionSectionConfig[] =>
  SECTION_PRESETS.map((section) => ({ ...section }));

const DEFAULT_MODEL_SETTINGS: CustomSolutionModelSettings = {
  reasoningModel: AIModel.OPENAI_GPT5_PRO,
  classifierModel: AIModel.OPENAI_GPT4O,
  embeddingsModel: "text-embedding-3-large",
  temperature: 0.1,
  enableChainOfThought: true,
};

const buildDefaultDraftingSettings = (): CustomSolutionDraftingSettings => ({
  previewMode: "side_by_side",
  enableInstantPreview: true,
  autoApplyLowRiskEdits: false,
  trackedChanges: true,
  downloadFormats: ["pdf", "docx"],
});

const createLocalId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createNewClauseDraft = () => ({
  title: "",
  category: "",
  mustInclude: "",
  redFlags: "",
  severity: "high" as CustomSolutionClauseTemplate["severity"],
});

const createNewDeviationDraft = () => ({
  title: "",
  expected: "",
  severity: "high" as CustomSolutionDeviationRule["severity"],
  guidance: "",
  clauseCategory: "",
});

const createNewBenchmarkDraft = () => ({
  title: "",
  description: "",
  threshold: 0.85,
  referenceType: "precedent" as
    | CustomSolutionSimilarityBenchmark["referenceType"]
    | undefined,
  url: "",
});

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
    aiModel: AIModel.OPENAI_GPT5,
    systemPrompt: "",
    analysisPrompt: "",
    riskPrompt: "",
    compliancePrompt: "",
  });
  const [sectionLayout, setSectionLayout] = useState<
    CustomSolutionSectionConfig[]
  >(buildDefaultSectionLayout());
  const [clauseLibrary, setClauseLibrary] = useState<
    CustomSolutionClauseTemplate[]
  >([]);
  const [newClause, setNewClause] = useState(createNewClauseDraft());
  const [deviationRules, setDeviationRules] = useState<
    CustomSolutionDeviationRule[]
  >([]);
  const [newDeviation, setNewDeviation] = useState(createNewDeviationDraft());
  const [similarityBenchmarks, setSimilarityBenchmarks] = useState<
    CustomSolutionSimilarityBenchmark[]
  >([]);
  const [newBenchmark, setNewBenchmark] = useState(createNewBenchmarkDraft());
  const [modelSettings, setModelSettings] =
    useState<CustomSolutionModelSettings>({
      ...DEFAULT_MODEL_SETTINGS,
    });
  const [draftingSettings, setDraftingSettings] =
    useState<CustomSolutionDraftingSettings>(buildDefaultDraftingSettings());

  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const isMaigonAdmin = Boolean(user?.isMaigonAdmin);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationOptions, setOrganizationOptions] = useState<
    AdminOrganizationSummary[]
  >([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setOrganizationError(null);
      setIsLoadingOrganizations(false);
      setOrganizationOptions([]);
      setOrganizationId(null);
      return;
    }

    if (!user) {
      setOrganizationId(null);
      setOrganizationError("You must be signed in to create a custom solution.");
      return;
    }

    if (!user.isMaigonAdmin) {
      setOrganizationId(null);
      setOrganizationError(
        "Only Maigon administrators can create custom solutions for organizations.",
      );
      return;
    }

    setOrganizationError(null);
    setIsLoadingOrganizations(true);
    AdminOrgService.listOrganizations(user.authUserId)
      .then((orgs) =>
        orgs
          .filter((org) => {
            const plan = org.billingPlan?.toLowerCase().trim();
            return plan === "professional" || plan === "enterprise";
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      .then((enterpriseOrgs) => {
        setOrganizationOptions(enterpriseOrgs);
        if (enterpriseOrgs.length > 0) {
          setOrganizationId(enterpriseOrgs[0].id);
        } else {
          setOrganizationId(null);
          setOrganizationError(
            "No enterprise organizations are available. Create or upgrade an organization first.",
          );
        }
      })
      .catch((error) => {
        console.error("Failed to load organizations", error);
        setOrganizationId(null);
        setOrganizationError("Unable to load organizations. Please try again.");
      })
      .finally(() => setIsLoadingOrganizations(false));
  }, [isOpen, user]);

  const updateSectionLayout = (
    id: string,
    update: Partial<CustomSolutionSectionConfig>,
  ) => {
    setSectionLayout((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, ...update } : section,
      ),
    );
  };

  const handleSectionToggle = (id: string, enabled: boolean) => {
    updateSectionLayout(id, { enabled });
  };

  const handleSectionTitleChange = (id: string, title: string) => {
    updateSectionLayout(id, { title });
  };

  const addClauseTemplate = () => {
    if (!newClause.title.trim()) {
      toast({
        title: "Clause title required",
        description: "Provide a clause title before adding it to the library.",
        variant: "destructive",
      });
      return;
    }
    const clauseEntry: CustomSolutionClauseTemplate = {
      id: createLocalId("clause"),
      title: newClause.title.trim(),
      category: newClause.category.trim() || undefined,
      mustInclude: splitList(newClause.mustInclude),
      redFlags: splitList(newClause.redFlags),
      severity: newClause.severity,
    };
    setClauseLibrary((prev) => [...prev, clauseEntry]);
    setNewClause(createNewClauseDraft());
  };

  const removeClauseTemplate = (id: string) => {
    setClauseLibrary((prev) => prev.filter((clause) => clause.id !== id));
  };

  const addDeviationRule = () => {
    if (!newDeviation.title.trim() || !newDeviation.expected.trim()) {
      toast({
        title: "Incomplete deviation rule",
        description:
          "Add both a title and expected language before saving the deviation rule.",
        variant: "destructive",
      });
      return;
    }
    const deviationEntry: CustomSolutionDeviationRule = {
      id: createLocalId("deviation"),
      title: newDeviation.title.trim(),
      expected: newDeviation.expected.trim(),
      severity: newDeviation.severity,
      guidance: newDeviation.guidance.trim() || undefined,
      clauseCategory: newDeviation.clauseCategory.trim() || undefined,
    };
    setDeviationRules((prev) => [...prev, deviationEntry]);
    setNewDeviation(createNewDeviationDraft());
  };

  const removeDeviationRule = (id: string) => {
    setDeviationRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const addSimilarityBenchmark = () => {
    if (!newBenchmark.title.trim()) {
      toast({
        title: "Benchmark title required",
        description: "Provide a benchmark title before adding it.",
        variant: "destructive",
      });
      return;
    }
    const benchmarkEntry: CustomSolutionSimilarityBenchmark = {
      id: createLocalId("benchmark"),
      title: newBenchmark.title.trim(),
      description: newBenchmark.description.trim() || undefined,
      referenceType: newBenchmark.referenceType ?? "precedent",
      url: newBenchmark.url.trim() || undefined,
      threshold: Math.min(
        1,
        Math.max(0, Number(newBenchmark.threshold) || 0.85),
      ),
    };
    setSimilarityBenchmarks((prev) => [...prev, benchmarkEntry]);
    setNewBenchmark(createNewBenchmarkDraft());
  };

  const removeSimilarityBenchmark = (id: string) => {
    setSimilarityBenchmarks((prev) =>
      prev.filter((benchmark) => benchmark.id !== id),
    );
  };

  const handleModelSettingsChange = <
    K extends keyof CustomSolutionModelSettings,
  >(
    key: K,
    value: CustomSolutionModelSettings[K],
  ) => {
    setModelSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDraftingSettingsChange = <
    K extends keyof CustomSolutionDraftingSettings,
  >(
    key: K,
    value: CustomSolutionDraftingSettings[K],
  ) => {
    setDraftingSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDownloadFormatsChange = (value: string) => {
    handleDraftingSettingsChange("downloadFormats", splitList(value));
  };

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

    if (!isMaigonAdmin) {
      toast({
        title: "Not available",
        description:
          "Custom solutions can only be authored by Maigon administrators.",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId) {
      toast({
        title: "Organization required",
        description:
          "Select an enterprise organization to attach this custom solution to.",
        variant: "destructive",
      });
      return;
    }

    if (organizationError) {
      toast({
        title: "Not available",
        description: organizationError,
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
        organizationId,
        prompts: {
          systemPrompt: formData.systemPrompt || getDefaultSystemPrompt(formData.contractType),
          analysisPrompt: formData.analysisPrompt || getDefaultAnalysisPrompt(formData.analysisDepth),
          riskPrompt: formData.riskPrompt,
          compliancePrompt: formData.compliancePrompt,
        },
        sectionLayout,
        clauseLibrary,
        deviationRules,
        similarityBenchmarks,
        modelSettings: {
          ...modelSettings,
          reasoningModel: modelSettings.reasoningModel || formData.aiModel,
        },
        draftingSettings,
      };

      // Save to database
      const solutionId = await aiService.saveCustomSolution(
        customSolution,
        user.authUserId || user.id,
        organizationId,
      );
      
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

  const requiredFieldsComplete =
    formData.name.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    formData.contractType.trim().length > 0;
  const canSubmit =
    requiredFieldsComplete &&
    Boolean(user) &&
    Boolean(organizationId) &&
    !organizationError &&
    isMaigonAdmin &&
    !loading;

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
      aiModel: AIModel.OPENAI_GPT5,
      systemPrompt: "",
      analysisPrompt: "",
      riskPrompt: "",
      compliancePrompt: "",
    });
    setSectionLayout(buildDefaultSectionLayout());
    setClauseLibrary([]);
    setDeviationRules([]);
    setSimilarityBenchmarks([]);
    setNewClause(createNewClauseDraft());
    setNewDeviation(createNewDeviationDraft());
    setNewBenchmark(createNewBenchmarkDraft());
    setModelSettings({ ...DEFAULT_MODEL_SETTINGS });
    setDraftingSettings(buildDefaultDraftingSettings());
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

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

  const handleComplianceFrameworkChange = (
    value: string,
    checked: boolean,
  ) => {
    setFormData((previous) => {
      const current = Array.isArray(previous.complianceFramework)
        ? previous.complianceFramework
        : [];

      if (checked) {
        if (current.includes(value)) {
          return previous;
        }
        return {
          ...previous,
          complianceFramework: [...current, value],
        };
      }

      return {
        ...previous,
        complianceFramework: current.filter((item) => item !== value),
      };
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
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

        {organizationError ? (
          <Alert
            variant="destructive"
            className="border-red-200 bg-red-50 text-red-900"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div>
                <AlertTitle>Unavailable</AlertTitle>
                <AlertDescription>{organizationError}</AlertDescription>
              </div>
            </div>
          </Alert>
        ) : null}

        {isMaigonAdmin && !organizationError ? (
          <Alert className="border-[#9A7C7C]/20 bg-[#FDF1F1] text-[#271D1D]">
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 mt-0.5 text-[#9A7C7C]" />
              <div>
                <AlertTitle>Attach to an enterprise organization</AlertTitle>
                <AlertDescription>
                  Custom solutions created here are scoped to enterprise plans.
                  Select which organization should gain access before saving.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ) : null}

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
              <Label
                htmlFor="organization"
                className="text-sm font-medium text-[#271D1D]"
              >
                Enterprise Organization *
              </Label>
              {isMaigonAdmin ? (
                <>
                  <Select
                    value={organizationId ?? undefined}
                    onValueChange={(value) => setOrganizationId(value)}
                    disabled={
                      isLoadingOrganizations || organizationOptions.length === 0
                    }
                  >
                    <SelectTrigger id="organization">
                      <SelectValue
                        placeholder={
                          isLoadingOrganizations
                            ? "Loading organizations..."
                            : "Select an organization"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationOptions.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#725A5A]">
                    Only organizations on the Enterprise plan are eligible for
                    custom solutions.
                  </p>
                </>
              ) : (
                <Input
                  id="organization"
                  value="Custom solutions are created by Maigon administrators."
                  disabled
                  className="border-[#271D1D]/20 bg-[#F9F8F8] text-[#725A5A]"
                />
              )}
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
              <Select
                value={formData.aiModel}
                onValueChange={(value) =>
                  handleInputChange("aiModel", value as AIModel)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
              {COMPLIANCE_FRAMEWORK_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={formData.complianceFramework.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleComplianceFrameworkChange(
                        option.value,
                        checked === true,
                      )
                    }
                  />
                  <Label htmlFor={option.value} className="text-sm text-[#271D1D]">
                    {option.label}
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

          {/* Review Layout */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Review Layout
            </h3>
            <p className="text-xs text-[#725A5A]">
              Toggle and rename the sections that will appear in the final review, matching the legacy Maigon experience.
            </p>
            <div className="space-y-3">
              {sectionLayout.map((section) => (
                <div
                  key={section.id}
                  className="border border-[#271D1D]/10 rounded-md p-3 flex flex-col gap-2"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                    <div className="flex-1">
                      <Label className="text-xs uppercase tracking-wide text-[#725A5A]">
                        {section.id}
                      </Label>
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          handleSectionTitleChange(section.id, e.target.value)
                        }
                        placeholder="Section title"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <span className="text-xs text-[#725A5A]">
                        {section.enabled === false ? "Hidden" : "Visible"}
                      </span>
                      <Switch
                        checked={section.enabled !== false}
                        onCheckedChange={(checked) =>
                          handleSectionToggle(section.id, checked === true)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clause Library */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Clause Library
            </h3>
            <p className="text-xs text-[#725A5A]">
              Define canonical clauses, must-include language, and red flags that the AI should enforce for this solution.
            </p>

            {clauseLibrary.length > 0 ? (
              <div className="space-y-2">
                {clauseLibrary.map((clause) => (
                  <div
                    key={clause.id}
                    className="border border-[#271D1D]/10 rounded-md p-3 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-[#271D1D]">{clause.title}</p>
                      {clause.category ? (
                        <p className="text-xs text-[#725A5A]">{clause.category}</p>
                      ) : null}
                      <p className="text-xs text-[#271D1D]/70 mt-1">
                        Must include: {clause.mustInclude?.join(", ") || "n/a"}
                      </p>
                      <p className="text-xs text-[#9A2A2A] mt-1">
                        Red flags: {clause.redFlags?.join(", ") || "n/a"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeClauseTemplate(clause.id)}
                      className="text-[#9A2A2A] hover:text-[#9A2A2A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#725A5A]">
                No clause templates added yet. Use the form below to define them.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Clause title</Label>
                <Input
                  value={newClause.title}
                  onChange={(e) =>
                    setNewClause((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Confidentiality obligations"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Category</Label>
                <Input
                  value={newClause.category}
                  onChange={(e) =>
                    setNewClause((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="Optional category"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Severity</Label>
                <Select
                  value={newClause.severity}
                  onValueChange={(value) =>
                    setNewClause((prev) => ({
                      ...prev,
                      severity: value as CustomSolutionClauseTemplate["severity"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Must include</Label>
                <Textarea
                  value={newClause.mustInclude}
                  onChange={(e) =>
                    setNewClause((prev) => ({
                      ...prev,
                      mustInclude: e.target.value,
                    }))
                  }
                  placeholder="Comma-separated bullet points"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Red flags</Label>
                <Textarea
                  value={newClause.redFlags}
                  onChange={(e) =>
                    setNewClause((prev) => ({
                      ...prev,
                      redFlags: e.target.value,
                    }))
                  }
                  placeholder="Comma-separated red flags"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={addClauseTemplate}
                className="bg-[#271D1D] text-white hover:bg-[#271D1D]/90"
              >
                Add clause template
              </Button>
            </div>
          </div>

          {/* Deviation Rules */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Deviation Rules
            </h3>
            <p className="text-xs text-[#725A5A]">
              Define what “good” looks like so the AI can flag deviations from your playbook.
            </p>

            {deviationRules.length > 0 ? (
              <div className="space-y-2">
                {deviationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="border border-[#271D1D]/10 rounded-md p-3 flex justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-[#271D1D]">{rule.title}</p>
                      <p className="text-xs text-[#725A5A]">
                        Expected: {rule.expected}
                      </p>
                      {rule.guidance ? (
                        <p className="text-xs text-[#271D1D]/70 mt-1">
                          Guidance: {rule.guidance}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeviationRule(rule.id)}
                      className="text-[#9A2A2A] hover:text-[#9A2A2A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#725A5A]">No deviation rules yet.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Rule title</Label>
                <Input
                  value={newDeviation.title}
                  onChange={(e) =>
                    setNewDeviation((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Mutual NDA expectation"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Clause category</Label>
                <Input
                  value={newDeviation.clauseCategory}
                  onChange={(e) =>
                    setNewDeviation((prev) => ({
                      ...prev,
                      clauseCategory: e.target.value,
                    }))
                  }
                  placeholder="Optional category"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Severity</Label>
                <Select
                  value={newDeviation.severity}
                  onValueChange={(value) =>
                    setNewDeviation((prev) => ({
                      ...prev,
                      severity: value as CustomSolutionDeviationRule["severity"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-[#271D1D]">Expected language</Label>
              <Textarea
                value={newDeviation.expected}
                onChange={(e) =>
                  setNewDeviation((prev) => ({ ...prev, expected: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-[#271D1D]">Guidance</Label>
              <Textarea
                value={newDeviation.guidance}
                onChange={(e) =>
                  setNewDeviation((prev) => ({
                    ...prev,
                    guidance: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Optional remediation guidance"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={addDeviationRule}
                className="bg-[#271D1D] text-white hover:bg-[#271D1D]/90"
              >
                Add deviation rule
              </Button>
            </div>
          </div>

          {/* Similarity Benchmarks */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Similarity Benchmarks
            </h3>
            <p className="text-xs text-[#725A5A]">
              Provide precedent agreements or policy references the AI should compare against.
            </p>

            {similarityBenchmarks.length > 0 ? (
              <div className="space-y-2">
                {similarityBenchmarks.map((benchmark) => (
                  <div
                    key={benchmark.id}
                    className="border border-[#271D1D]/10 rounded-md p-3 flex justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-[#271D1D]">
                        {benchmark.title}
                      </p>
                      {benchmark.description ? (
                        <p className="text-xs text-[#725A5A]">
                          {benchmark.description}
                        </p>
                      ) : null}
                      <p className="text-xs text-[#271D1D]/70 mt-1">
                        Threshold: {(benchmark.threshold ?? 0.85) * 100}%
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSimilarityBenchmark(benchmark.id)}
                      className="text-[#9A2A2A] hover:text-[#9A2A2A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#725A5A]">No benchmarks configured yet.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Benchmark title</Label>
                <Input
                  value={newBenchmark.title}
                  onChange={(e) =>
                    setNewBenchmark((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Standard NDA template"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Threshold (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={(newBenchmark.threshold ?? 0.85) * 100}
                  onChange={(e) =>
                    setNewBenchmark((prev) => ({
                      ...prev,
                      threshold: (Number(e.target.value) || 85) / 100,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Reference type</Label>
                <Select
                  value={newBenchmark.referenceType ?? "precedent"}
                  onValueChange={(value) =>
                    setNewBenchmark((prev) => ({
                      ...prev,
                      referenceType:
                        value as CustomSolutionSimilarityBenchmark["referenceType"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="precedent">Precedent</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-[#271D1D]">Description</Label>
              <Textarea
                value={newBenchmark.description}
                onChange={(e) =>
                  setNewBenchmark((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-[#271D1D]">Reference URL / ID</Label>
              <Input
                value={newBenchmark.url}
                onChange={(e) =>
                  setNewBenchmark((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="Optional URL or document ID"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={addSimilarityBenchmark}
                className="bg-[#271D1D] text-white hover:bg-[#271D1D]/90"
              >
                Add benchmark
              </Button>
            </div>
          </div>

          {/* Draft & Preview Settings */}
          <div className="space-y-4">
            <h3 className="font-medium text-[#271D1D] flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Draft & Preview Settings
            </h3>
            <p className="text-xs text-[#725A5A]">
              Control how AI-powered edits are previewed and exported.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-[#271D1D]/10 rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#271D1D]">
                    Instant preview
                  </p>
                  <p className="text-xs text-[#725A5A]">
                    Show Side-by-side preview as edits are toggled.
                  </p>
                </div>
                <Switch
                  checked={draftingSettings.enableInstantPreview !== false}
                  onCheckedChange={(checked) =>
                    handleDraftingSettingsChange(
                      "enableInstantPreview",
                      checked === true,
                    )
                  }
                />
              </div>
              <div className="border border-[#271D1D]/10 rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#271D1D]">
                    Auto-apply safe edits
                  </p>
                  <p className="text-xs text-[#725A5A]">
                    Automatically apply low-risk, advisory edits.
                  </p>
                </div>
                <Switch
                  checked={draftingSettings.autoApplyLowRiskEdits === true}
                  onCheckedChange={(checked) =>
                    handleDraftingSettingsChange(
                      "autoApplyLowRiskEdits",
                      checked === true,
                    )
                  }
                />
              </div>
              <div className="border border-[#271D1D]/10 rounded-md p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#271D1D]">
                    Tracked changes
                  </p>
                  <p className="text-xs text-[#725A5A]">
                    Produce downloadable redlines with tracked changes.
                  </p>
                </div>
                <Switch
                  checked={draftingSettings.trackedChanges !== false}
                  onCheckedChange={(checked) =>
                    handleDraftingSettingsChange(
                      "trackedChanges",
                      checked === true,
                    )
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">Preview mode</Label>
                <Select
                  value={draftingSettings.previewMode ?? "side_by_side"}
                  onValueChange={(value) =>
                    handleDraftingSettingsChange(
                      "previewMode",
                      value as CustomSolutionDraftingSettings["previewMode"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="side_by_side">Side-by-side</SelectItem>
                    <SelectItem value="inline">Inline redline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-[#271D1D]">
                  Download formats
                </Label>
                <Input
                  value={(draftingSettings.downloadFormats ?? []).join(", ")}
                  onChange={(e) => handleDownloadFormatsChange(e.target.value)}
                  placeholder="e.g., pdf, docx"
                />
              </div>
            </div>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-dashed border-[#271D1D]/10">
                <div className="space-y-1">
                  <Label className="text-sm text-[#271D1D]">
                    Reasoning model override
                  </Label>
                  <Select
                    value={modelSettings.reasoningModel ?? formData.aiModel}
                    onValueChange={(value) =>
                      handleModelSettingsChange(
                        "reasoningModel",
                        value as CustomSolutionModelSettings["reasoningModel"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-[#271D1D]">Classifier model</Label>
                  <Select
                    value={
                      (modelSettings.classifierModel as AIModel) ??
                      AIModel.OPENAI_GPT4O
                    }
                    onValueChange={(value) =>
                      handleModelSettingsChange("classifierModel", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODEL_OPTIONS.filter(
                        (option) => option.value !== AIModel.OPENAI_GPT5,
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-[#271D1D]">Temperature</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={modelSettings.temperature ?? 0.1}
                    onChange={(e) =>
                      handleModelSettingsChange(
                        "temperature",
                        Number(e.target.value),
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm text-[#271D1D]">
                    Embeddings model
                  </Label>
                  <Input
                    value={modelSettings.embeddingsModel ?? "text-embedding-3-large"}
                    onChange={(e) =>
                      handleModelSettingsChange("embeddingsModel", e.target.value)
                    }
                  />
                </div>
                <div className="border border-[#271D1D]/10 rounded-md p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      Chain of Thought
                    </p>
                    <p className="text-xs text-[#725A5A]">
                      Enable deliberate reasoning traces for auditing.
                    </p>
                  </div>
                  <Switch
                    checked={modelSettings.enableChainOfThought !== false}
                    onCheckedChange={(checked) =>
                      handleModelSettingsChange(
                        "enableChainOfThought",
                        checked === true,
                      )
                    }
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
            disabled={!canSubmit}
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
