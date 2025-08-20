import { useState } from "react";
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
    complianceFramework: [],
    riskLevel: "medium",
    customRules: "",
    analysisDepth: "standard",
    reportFormat: "detailed",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const complianceOptions = [
    {
      id: "gdpr",
      label: "GDPR (General Data Protection Regulation)",
      icon: Shield,
    },
    {
      id: "ccpa",
      label: "CCPA (California Consumer Privacy Act)",
      icon: Shield,
    },
    { id: "hipaa", label: "HIPAA (Health Insurance Portability)", icon: Users },
    { id: "sox", label: "SOX (Sarbanes-Oxley Act)", icon: FileText },
    {
      id: "iso27001",
      label: "ISO 27001 (Information Security)",
      icon: Database,
    },
    { id: "pci", label: "PCI DSS (Payment Card Industry)", icon: Settings },
  ];

  const contractTypes = [
    "Non-Disclosure Agreements",
    "Data Processing Agreements",
    "Consultancy Agreements",
    "Privacy Policy Documents",
    "Product Supply Agreements",
    "R&D Agreements",
    "End User License Agreements",
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Solution name is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (!formData.contractType)
      newErrors.contractType = "Contract type is required";
    if (formData.complianceFramework.length === 0)
      newErrors.complianceFramework =
        "Select at least one compliance framework";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      const solutionData = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        contractType: formData.contractType,
        complianceFramework: formData.complianceFramework,
        riskLevel: formData.riskLevel,
        customRules: formData.customRules,
        analysisDepth: formData.analysisDepth,
        reportFormat: formData.reportFormat,
        status: "active",
        dateCreated: new Date().toLocaleDateString(),
        createdBy: "Current User",
      };

      setIsSubmitting(false);
      onSuccess?.(solutionData);
      onClose();

      // Reset form
      setFormData({
        name: "",
        description: "",
        contractType: "",
        complianceFramework: [],
        riskLevel: "medium",
        customRules: "",
        analysisDepth: "standard",
        reportFormat: "detailed",
      });
      setErrors({});
    }, 2000);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleComplianceChange = (frameworkId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      complianceFramework: checked
        ? [...prev.complianceFramework, frameworkId]
        : prev.complianceFramework.filter((id) => id !== frameworkId),
    }));
    if (errors.complianceFramework) {
      setErrors((prev) => ({ ...prev, complianceFramework: "" }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#9A7C7C]" />
            Create Custom Solution
          </DialogTitle>
          <DialogDescription>
            Design a tailored contract analysis solution for your specific needs
            and compliance requirements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[#271D1D]">
              Basic Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">Solution Name</Label>
              <Input
                id="name"
                placeholder="Custom GDPR Analysis for SaaS Contracts"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this solution will analyze and its specific use case..."
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
              />
              {errors.description && (
                <p className="text-red-500 text-xs">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractType">Primary Contract Type</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) =>
                  handleInputChange("contractType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contractType && (
                <p className="text-red-500 text-xs">{errors.contractType}</p>
              )}
            </div>
          </div>

          {/* Compliance Frameworks */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[#271D1D]">
              Compliance Frameworks
            </h3>
            <p className="text-sm text-gray-600">
              Select the compliance standards this solution should check
              against:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {complianceOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <Checkbox
                      id={option.id}
                      checked={formData.complianceFramework.includes(option.id)}
                      onCheckedChange={(checked) =>
                        handleComplianceChange(option.id, checked as boolean)
                      }
                    />
                    <IconComponent className="w-4 h-4 text-[#9A7C7C]" />
                    <Label
                      htmlFor={option.id}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
            {errors.complianceFramework && (
              <p className="text-red-500 text-xs">
                {errors.complianceFramework}
              </p>
            )}
          </div>

          {/* Analysis Configuration */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[#271D1D]">
              Analysis Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskLevel">Risk Assessment Level</Label>
                <Select
                  value={formData.riskLevel}
                  onValueChange={(value) =>
                    handleInputChange("riskLevel", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      Conservative (Strict)
                    </SelectItem>
                    <SelectItem value="medium">Balanced (Standard)</SelectItem>
                    <SelectItem value="lenient">Lenient (Flexible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="analysisDepth">Analysis Depth</Label>
                <Select
                  value={formData.analysisDepth}
                  onValueChange={(value) =>
                    handleInputChange("analysisDepth", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Quick Scan</SelectItem>
                    <SelectItem value="standard">Standard Analysis</SelectItem>
                    <SelectItem value="deep">Deep Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportFormat">Report Format</Label>
              <Select
                value={formData.reportFormat}
                onValueChange={(value) =>
                  handleInputChange("reportFormat", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Executive Summary</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="technical">Technical Analysis</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Rules */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[#271D1D]">
              Custom Rules (Optional)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="customRules">Additional Analysis Rules</Label>
              <Textarea
                id="customRules"
                placeholder="Define any specific clauses, terms, or conditions this solution should look for..."
                value={formData.customRules}
                onChange={(e) =>
                  handleInputChange("customRules", e.target.value)
                }
                rows={4}
              />
              <p className="text-xs text-gray-500">
                <AlertCircle className="inline w-3 h-3 mr-1" />
                These rules will be processed by our AI engine to create custom
                analysis patterns.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#9A7C7C] hover:bg-[#725A5A]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Solution...
                </div>
              ) : (
                "Create Solution"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
