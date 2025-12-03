import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, ChevronDown } from "lucide-react";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { useToast } from "@/hooks/use-toast";

type PerspectiveOption = {
  value: string;
  title: string;
  description: string;
  focusAreas: string[];
  tone: "blue" | "green" | "rose" | "amber";
};

const PERSPECTIVE_OPTIONS: Record<string, PerspectiveOption[]> = {
  ppc: [
    {
      value: "data-subject",
      title: "Data Subject",
      description:
        "Review from the individual’s viewpoint with emphasis on privacy rights, consent, and transparency.",
      focusAreas: [
        "Individual privacy rights and data access",
        "Consent mechanisms and withdrawal options",
        "Data retention and deletion rights",
        "Data portability and transparency requirements",
      ],
      tone: "blue",
    },
    {
      value: "organization",
      title: "Organization",
      description:
        "Assess obligations and liabilities for the business publishing the privacy notice.",
      focusAreas: [
        "Organizational compliance obligations",
        "Business risk assessment and mitigation",
        "Legal liability and financial exposure",
        "Operational and procedural requirements",
      ],
      tone: "green",
    },
  ],
  dpa: [
    {
      value: "data-controller",
      title: "Data Controller",
      description:
        "Ensure processor commitments, safeguards, and data subject protections meet controller obligations.",
      focusAreas: [
        "Processor obligations and sub-processor controls",
        "Data breach notification and cooperation",
        "Security safeguards and audit rights",
        "Data subject rights support and deletion/return",
      ],
      tone: "blue",
    },
    {
      value: "data-processor",
      title: "Data Processor",
      description:
        "Evaluate controller requirements, liability exposure, and operational feasibility for the processor.",
      focusAreas: [
        "Scope of processing and documented instructions",
        "Limitation of liability and indemnities",
        "Security, certifications, and audit scope",
        "Return/deletion timelines and assistance duties",
      ],
      tone: "green",
    },
  ],
  nda: [
    {
      value: "disclosing-party",
      title: "Disclosing Party",
      description:
        "Protect confidential information, limit use, and secure remedies for unauthorized disclosure.",
      focusAreas: [
        "Definition and scope of Confidential Information",
        "Use restrictions and purpose limitations",
        "Return/destruction obligations",
        "Remedies, injunctive relief, and liability caps",
      ],
      tone: "blue",
    },
    {
      value: "receiving-party",
      title: "Receiving Party",
      description:
        "Ensure obligations are feasible, exclusions are reasonable, and liability is proportionate.",
      focusAreas: [
        "Exclusions (public domain, independently developed)",
        "Duration of confidentiality and survival",
        "Information handling and security requirements",
        "Liability exposure and indemnities",
      ],
      tone: "green",
    },
    {
      value: "mutual",
      title: "Mutual",
      description:
        "Balance obligations for both parties when each shares confidential information.",
      focusAreas: [
        "Reciprocal confidentiality duties and exclusions",
        "Residual knowledge and purpose limits",
        "Return/destruction and survival periods",
        "Remedies and enforcement symmetry",
      ],
      tone: "amber",
    },
  ],
  ca: [
    {
      value: "supplier",
      title: "Supplier",
      description:
        "Check scope clarity, payment triggers, IP ownership, and limits on liability for delivering services.",
      focusAreas: [
        "Scope of work and change control",
        "Fees, milestones, and payment terms",
        "IP ownership and license back",
        "Liability caps and exclusions",
      ],
      tone: "blue",
    },
    {
      value: "client",
      title: "Client",
      description:
        "Validate deliverable quality, acceptance rights, IP ownership, and protections for delays or defects.",
      focusAreas: [
        "Acceptance criteria and remedies",
        "Service levels and delivery timelines",
        "IP transfer/use rights",
        "Indemnities and liability coverage",
      ],
      tone: "green",
    },
  ],
  psa: [
    {
      value: "supplier",
      title: "Supplier",
      description:
        "Assess supply commitments, forecasts, warranties, and limits on liability for providing goods.",
      focusAreas: [
        "Order commitments and forecast flexibility",
        "Delivery terms, risk transfer, and delays",
        "Product warranties and remedy scope",
        "Liability caps and exclusions",
      ],
      tone: "blue",
    },
    {
      value: "customer",
      title: "Customer",
      description:
        "Check supply reliability, quality protections, and commercial remedies for non-conforming goods.",
      focusAreas: [
        "Quantity/forecast protections and minimums",
        "Delivery obligations and penalties",
        "Quality standards, inspections, and returns",
        "Indemnities and limitation of liability",
      ],
      tone: "green",
    },
  ],
  rda: [
    {
      value: "contractor",
      title: "Contractor",
      description:
        "Clarify research scope, IP ownership, and risk allocation while delivering development work.",
      focusAreas: [
        "Scope, milestones, and change control",
        "Foreground/background IP and licensing",
        "Confidential data handling",
        "Liability caps and indemnities",
      ],
      tone: "blue",
    },
    {
      value: "customer",
      title: "Customer",
      description:
        "Protect investment with clear deliverables, ownership rights, and remedies for delays or defects.",
      focusAreas: [
        "Milestones, acceptance, and performance criteria",
        "Ownership of results and license rights",
        "Data security and confidentiality",
        "Warranties, indemnities, and liability",
      ],
      tone: "green",
    },
  ],
  eula: [
    {
      value: "supplier",
      title: "Supplier",
      description:
        "Review licensing scope, restrictions, and liability to protect the software publisher.",
      focusAreas: [
        "License scope, restrictions, and revocation",
        "Warranty disclaimers and limitation of liability",
        "IP protection and enforcement",
        "Support/maintenance obligations",
      ],
      tone: "blue",
    },
    {
      value: "end-user",
      title: "End User",
      description:
        "Validate license rights, acceptable use, and available remedies for the software user.",
      focusAreas: [
        "Permitted uses and restrictions",
        "Data usage/telemetry and privacy",
        "Support, updates, and uptime expectations",
        "Liability caps and available remedies",
      ],
      tone: "green",
    },
  ],
};

export default function PerspectiveSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const {
    solutionTitle,
    solutionId,
    solutionKey,
    quickUpload,
    adminAccess,
    customSolutionId,
  } = location.state || {};

  const normalizedKey = (solutionKey ?? solutionId ?? "")
    ?.toString()
    .toLowerCase();
  const perspectiveOptions =
    PERSPECTIVE_OPTIONS[normalizedKey] ?? PERSPECTIVE_OPTIONS.ppc;

  const [selectedPerspective, setSelectedPerspective] = useState<string>(
    perspectiveOptions[0]?.value ?? "data-subject",
  );
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const paygOutOfCredits = Boolean(
    user?.plan?.type === "pay_as_you_go" &&
      (user.plan.payg?.creditsBalance ?? 0) <= 0,
  );

  useEffect(() => {
    if (paygOutOfCredits) {
      toast({
        title: "No reviews remaining",
        description: "Buy another review to keep analysing contracts.",
        variant: "destructive",
      });
      navigate("/user-dashboard", { replace: true });
    }
  }, [navigate, toast, paygOutOfCredits]);

  const handleContinue = () => {
    if (paygOutOfCredits) {
      toast({
        title: "No reviews remaining",
        description: "Purchase another review before uploading a contract.",
        variant: "destructive",
      });
      navigate("/user-dashboard");
      return;
    }

    if (selectedPerspective) {
      // Navigate to upload page with the selected perspective and solution info
      navigate("/upload", {
        state: {
          perspective: selectedPerspective,
          perspectiveLabel:
            perspectiveOptions.find((opt) => opt.value === selectedPerspective)
              ?.title ?? selectedPerspective,
          solutionTitle,
          quickUpload,
          adminAccess,
          solutionId: solutionId ?? solutionKey,
          solutionKey,
          customSolutionId,
        }
      });
    }
  };

  const handleBack = () => {
    navigate(quickUpload ? "/dashboard" : "/user-solutions");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/user-solutions"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Solutions
          </Link>
          <Link
            to="/pricing"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/user-news"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            News
          </Link>
          <Link
            to="/user-team"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Team
          </Link>

          {/* User Button */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">
                @{user?.name?.split(" ")[0] || "User"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    void logout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation
          isLoggedIn={true}
          userName={user?.name?.split(" ")[0] || "User"}
        />
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 lg:px-16 py-12 pt-24 lg:pt-32">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            {quickUpload && solutionTitle ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="px-3 py-1 bg-[#9A7C7C]/10 text-[#9A7C7C] rounded-full text-sm font-medium">
                    {adminAccess ? "Admin Quick Upload" : "Quick Upload"}
                  </div>
                </div>
                <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-4">
                  {solutionTitle} Analysis
                </h1>
                <p className="text-gray-600 text-lg">
                  Choose your perspective for this {solutionTitle.toLowerCase()} review
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-4">
                  Select Your Perspective
                </h1>
                <p className="text-gray-600 text-lg">
                  Choose the viewpoint for contract analysis to get tailored
                  insights
                </p>
              </>
            )}
          </div>

          {/* Perspective Options */}
          <div className="space-y-6 mb-8">
            {perspectiveOptions.map((option) => {
              const isSelected = selectedPerspective === option.value;
              const accentBg =
                option.tone === "blue"
                  ? "bg-blue-100 text-blue-700"
                  : option.tone === "green"
                    ? "bg-green-100 text-green-700"
                    : option.tone === "rose"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700";
              const focusDot =
                option.tone === "blue"
                  ? "bg-blue-500"
                  : option.tone === "green"
                    ? "bg-green-500"
                    : option.tone === "rose"
                      ? "bg-rose-500"
                      : "bg-amber-500";

              return (
                <div
                  key={option.value}
                  className={`bg-white rounded-lg border-2 p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? "border-[#9A7C7C] bg-[#9A7C7C]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedPerspective(option.value)}
                >
                  <div className="flex items-start gap-6">
                    <div
                      className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        option.tone === "blue"
                          ? "bg-blue-50 text-blue-600"
                          : option.tone === "green"
                            ? "bg-green-50 text-green-600"
                            : option.tone === "rose"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      <User className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-medium text-[#271D1D]">
                          {option.title}
                        </h3>
                        <div
                          className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                            isSelected
                              ? "border-[#9A7C7C] bg-[#9A7C7C]"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {option.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {option.focusAreas.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`px-3 py-1 text-sm rounded-full ${accentBg}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Analysis Preview */}
          <div className="rounded-lg p-6 mb-8 transition-all bg-white border border-gray-200">
            <h4 className="font-medium text-[#271D1D] mb-4">
              Analysis will focus on:
            </h4>
            <div className="space-y-2">
              {perspectiveOptions
                .find((opt) => opt.value === selectedPerspective)
                ?.focusAreas.map((area) => (
                  <div
                    key={area}
                    className="flex items-center text-gray-700"
                  >
                    <div className="w-2 h-2 bg-[#9A7C7C] rounded-full mr-3"></div>
                    {area}
                  </div>
                )) ?? (
                <div className="flex items-center text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Select a perspective to see analysis focus areas
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {quickUpload ? "Back to Dashboard" : "Back to Solutions"}
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedPerspective}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                selectedPerspective
                  ? "bg-[#9A7C7C] text-white hover:bg-[#9A7C7C]/90"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Continue to Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
