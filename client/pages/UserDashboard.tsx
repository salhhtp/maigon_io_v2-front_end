import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  User,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  CreditCard,
  Loader2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import { SOLUTION_DISPLAY_NAMES, type SolutionKey } from "@/utils/solutionMapping";
import { getSolutionIcon } from "@/utils/solutionIcons";
import { useToast } from "@/hooks/use-toast";
import { startPaygCheckout } from "@/services/billingService";

interface DashboardData {
  contracts: any[];
  contractStats: any;
  recentActivities: any[];
  usageStats: any;
  recentReviews: any[];
}

const MetricCard = ({
  title,
  value,
  icon,
  description,
  isLoading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
}) => (
  <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-[#F3F3F3] rounded-lg">{icon}</div>
      <h3 className="font-lora text-sm font-medium text-[#271D1D]">{title}</h3>
    </div>
    {isLoading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    ) : (
      <div>
        <p className="font-lora text-2xl font-medium text-[#271D1D] mb-2">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="text-xs text-[#271D1D]/70">{description}</p>
        )}
      </div>
    )}
  </div>
);

const ActivityItem = ({ activity }: { activity: any }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contract_upload':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'review_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'login':
        return <User className="w-4 h-4 text-gray-600" />;
      case 'profile_update':
        return <User className="w-4 h-4 text-orange-600" />;
      case 'export_data':
        return <Download className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityDescription = (activity: any) => {
    if (activity.description) return activity.description;
    
    switch (activity.activity_type) {
      case 'contract_upload':
        return 'Uploaded a new contract';
      case 'review_completed':
        return 'Completed contract review';
      case 'login':
        return 'Signed in to account';
      case 'profile_update':
        return 'Updated profile information';
      case 'export_data':
        return 'Exported account data';
      default:
        return 'Activity performed';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-[#F9F8F8] rounded-lg">
      <div className="flex-shrink-0">
        {getActivityIcon(activity.activity_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#271D1D] truncate">
          {getActivityDescription(activity)}
        </p>
        <p className="text-xs text-[#271D1D]/70">
          {new Date(activity.created_at).toLocaleDateString()} at{" "}
          {new Date(activity.created_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

const ContractCard = ({ contract }: { contract: any }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-[#271D1D]/10 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-[#271D1D] truncate flex-1 mr-3">
          {contract.title}
        </h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
          {contract.status}
        </span>
      </div>
      <div className="text-sm text-[#271D1D]/70 space-y-1">
        <p>File: {contract.file_name}</p>
        <p>Uploaded: {new Date(contract.created_at).toLocaleDateString()}</p>
        {contract.file_size && (
          <p>Size: {(contract.file_size / 1024).toFixed(1)}KB</p>
        )}
      </div>
    </div>
  );
};

const ReviewCard = ({ review }: { review: any }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReviewTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'risk_assessment': 'Risk Assessment',
      'compliance_score': 'Compliance Review',
      'perspective_review': 'Perspective Analysis',
      'full_summary': 'Full Summary',
      'ai_integration': 'AI Integration Review'
    };
    return types[type] || type.replace('_', ' ');
  };

  return (
    <div className="border border-[#271D1D]/10 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-[#271D1D] mb-1">
            {getReviewTypeDisplay(review.review_type)}
          </h4>
          <p className="text-sm text-[#271D1D]/70">
            {review.contracts?.title || 'Contract Review'}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${getScoreColor(review.score || 0)}`}>
            {review.score || 0}%
          </span>
        </div>
      </div>
      <div className="text-xs text-[#271D1D]/70">
        Completed: {new Date(review.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};

export default function UserDashboard() {
  const { user, isLoggedIn, logout } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showAllQuickSolutions, setShowAllQuickSolutions] = useState(false);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const [paygBannerDismissed, setPaygBannerDismissed] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const plan = user?.plan ?? null;
  const isMonthlyPlan = plan?.billing_cycle === "monthly";
  const isFreeTrial = plan?.type === "free_trial";
  const isPayAsYouGo = plan?.type === "pay_as_you_go";
  const trialDaysRemaining =
    typeof plan?.trial_days_remaining === "number"
      ? plan.trial_days_remaining
      : null;
  const trialExpired = Boolean(isFreeTrial && (trialDaysRemaining ?? 0) <= 0);

  const paygBalance = plan?.payg?.creditsBalance ?? 0;
  const paygConsumed = plan?.payg?.creditsConsumed ?? 0;
  const paygTotalCredits = paygConsumed + (plan?.payg?.creditsBalance ?? 0);
  const paygOutOfCredits = Boolean(isPayAsYouGo && paygBalance <= 0);
  const paygLowCredits = Boolean(isPayAsYouGo && !paygOutOfCredits && paygBalance <= 1);

  const fallbackTrialLimit =
    isFreeTrial && typeof plan?.contracts_limit !== "number" ? 5 : null;
  const rawContractsLimit = isPayAsYouGo
    ? paygTotalCredits
    : typeof plan?.contracts_limit === "number"
      ? plan.contracts_limit
      : fallbackTrialLimit;
  const rawContractsUsed = isPayAsYouGo
    ? paygConsumed
    : typeof plan?.contracts_used === "number"
      ? plan.contracts_used
      : dashboardData?.usageStats?.contracts_reviewed ?? 0;

  const showQuota = Boolean(
    (isMonthlyPlan || isFreeTrial || isPayAsYouGo) &&
      rawContractsLimit !== null &&
      Number.isFinite(rawContractsLimit) &&
      rawContractsLimit > 0,
  );

  const normalizedQuotaLimit = showQuota
    ? Math.max(0, Math.floor(rawContractsLimit as number))
    : 0;
  const normalizedQuotaUsed = showQuota
    ? Math.max(0, Math.floor(rawContractsUsed))
    : 0;
  const quotaUsageLabel = showQuota
    ? normalizedQuotaLimit > 0
      ? `${normalizedQuotaUsed.toLocaleString()}/${normalizedQuotaLimit.toLocaleString()}`
      : `${normalizedQuotaUsed.toLocaleString()}/0`
    : null;
  const remainingQuota = showQuota
    ? Math.max(normalizedQuotaLimit - normalizedQuotaUsed, 0)
    : 0;
  const quotaTimeframeLabel = isMonthlyPlan
    ? "this month"
    : isFreeTrial
      ? "in trial"
      : isPayAsYouGo
        ? "from purchased credits"
        : "";

  const totalContractsValue: string | number = showQuota && quotaUsageLabel
    ? quotaUsageLabel
    : dashboardData?.contractStats.total || 0;
  const totalContractsDescription = showQuota
    ? `${remainingQuota.toLocaleString()} review${remainingQuota === 1 ? "" : "s"} remaining${quotaTimeframeLabel ? ` ${quotaTimeframeLabel}` : ""}`
    : "Contracts uploaded";
  const totalReviewsValue: string | number = showQuota && quotaUsageLabel
    ? quotaUsageLabel
    : dashboardData?.usageStats?.contracts_reviewed || 0;
  const totalReviewsDescription = showQuota
    ? `${remainingQuota.toLocaleString()} review${remainingQuota === 1 ? "" : "s"} remaining${quotaTimeframeLabel ? ` ${quotaTimeframeLabel}` : ""}`
    : "All-time reviews";
  const showQuickAccess = Boolean(
    plan &&
      !trialExpired &&
      !paygOutOfCredits &&
      (plan.type === "free_trial" ||
        plan.type === "pay_as_you_go" ||
        plan.billing_cycle === "monthly"),
  );
  const trialDaysLabel =
    trialDaysRemaining === null
      ? "—"
      : trialDaysRemaining > 0
        ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"}`
        : "Expired";
  const trialCardDescription = !isFreeTrial
    ? undefined
    : trialExpired
      ? "Trial ended — choose a plan to keep analysing contracts."
      : trialDaysRemaining !== null && trialDaysRemaining <= 3
        ? "Upgrade now to avoid losing access."
        : "Enjoy full access during your 14-day trial.";
  const shouldShowTrialCard = Boolean(isFreeTrial);
  const shouldShowTrialUrgencyBanner = Boolean(
    isFreeTrial &&
      trialDaysRemaining !== null &&
      trialDaysRemaining > 0 &&
      trialDaysRemaining <= 3 &&
      !trialBannerDismissed,
  );
  const trialUrgencyHeadline =
    shouldShowTrialUrgencyBanner && trialDaysRemaining !== null
      ? trialDaysRemaining === 1
        ? "Your trial ends tomorrow"
        : `Your trial ends in ${trialDaysRemaining} days`
      : null;
  const shouldShowPaygBanner = Boolean(
    isPayAsYouGo &&
      (paygOutOfCredits || paygLowCredits) &&
      !paygBannerDismissed,
  );
  const paygBannerHeadline = paygOutOfCredits
    ? "No reviews remaining"
    : "Low balance: buy another review";
  const upgradeCtaLabel = trialExpired
    ? "Choose a Plan"
    : paygOutOfCredits
      ? "Buy Review"
      : "Upgrade Now";

  useEffect(() => {
    if (trialExpired || paygOutOfCredits) {
      setShowAllQuickSolutions(false);
    }
  }, [trialExpired, paygOutOfCredits]);

  const quickAccessSolutions = useMemo(
    () => [
      {
        key: "dpa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.dpa,
        description: "Jump straight into a data processing agreement review.",
        icon: getSolutionIcon("dpa"),
      },
      {
        key: "nda" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.nda,
        description: "Assess confidentiality terms and obligations within minutes.",
        icon: getSolutionIcon("nda"),
      },
      {
        key: "psa" as SolutionKey,
        name: SOLUTION_DISPLAY_NAMES.psa,
        description: "Review supplier agreements for delivery and liability gaps.",
        icon: getSolutionIcon("psa"),
      },
    ],
    [],
  );

  const allQuickSolutions = useMemo(
    () =>
      Object.entries(SOLUTION_DISPLAY_NAMES).map(([key, name]) => ({
        key: key as SolutionKey,
        name,
        description: "Launch a review tailored to this contract type.",
        icon: getSolutionIcon(key as SolutionKey),
      })),
    [],
  );

  const visibleQuickSolutions = showAllQuickSolutions ? allQuickSolutions : quickAccessSolutions;

  const handlePaygPurchase = useCallback(async () => {
    if (!user) {
      navigate("/pricing?plan=pay-as-you-go");
      return;
    }

    try {
      setIsCheckoutLoading(true);
      const session = await startPaygCheckout(user.id, {
        email: user.email,
        successPath: "/user-dashboard?checkout=payg-success",
        cancelPath: "/user-dashboard",
        metadata: {
          source: "user-dashboard",
        },
      });

      if (session.url) {
        window.location.href = session.url;
      } else {
        toast({
          title: "Checkout created",
          description: "Follow the Stripe window to finish purchasing your review.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start checkout";
      toast({
        title: "Unable to start checkout",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [navigate, toast, user]);

  const handleQuickAccess = useCallback(
    (solutionKey: SolutionKey) => {
      if (trialExpired) {
        navigate("/pricing");
        return;
      }

      if (paygOutOfCredits) {
        void handlePaygPurchase();
        return;
      }

      const solutionTitle = SOLUTION_DISPLAY_NAMES[solutionKey];
      navigate("/perspective-selection", {
        state: {
          solutionId: solutionKey,
          solutionKey,
          solutionTitle,
          quickUpload: true,
        },
      });
    },
    [navigate, trialExpired, paygOutOfCredits, handlePaygPurchase],
  );

  const handleUpgradeNavigation = useCallback(() => {
    navigate("/pricing");
  }, [navigate]);

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await DataService.getUserDashboardData(user.id);
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Track dashboard visit and load data
  useEffect(() => {
    if (user && isLoggedIn) {
      // Update last activity
      DataService.userUsageStats.updateLastActivity(user.id).catch(error => {
        console.error('Error updating last activity:', error);
      });
      
      // Load dashboard data
      loadDashboardData();
    }
  }, [user, isLoggedIn]);

  // Redirect if not logged in
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F9F8F8] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-lora font-medium text-[#271D1D] mb-4">
            Access Denied
          </h1>
          <p className="text-[#271D1D]/70 mb-6">
            Please log in to view your dashboard.
          </p>
          <Link to="/signin">
            <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <MobileNavigation />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

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
                @{user.name.split(" ")[0]}
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
      </nav>

      {/* Main Content */}
      <main className="pt-24 lg:pt-32 pb-20 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-lora font-bold text-[#271D1D] mb-2">
                Welcome back, {user.name.split(" ")[0]}!
              </h1>
              <p className="text-[#271D1D]/70">
                Here's an overview of your contract analysis activity
              </p>
            </div>
                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                  <Button
                    onClick={loadDashboardData}
                    variant="outline"
                size="sm"
                disabled={isLoading}
                className="text-[#271D1D] border-[#271D1D]/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {trialExpired ? (
                <Link to="/pricing">
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                    Choose a Plan
                  </Button>
                </Link>
              ) : paygOutOfCredits ? (
                <Button
                  onClick={() => void handlePaygPurchase()}
                  className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                  disabled={isCheckoutLoading}
                >
                  {isCheckoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting
                    </>
                  ) : (
                    "Buy Review"
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {shouldShowTrialUrgencyBanner && (
            <div className="mb-6 rounded-lg border border-[#9A7C7C]/40 bg-[#FDF1F1] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#9A7C7C] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      {trialUrgencyHeadline ?? "Your trial is ending soon"}
                    </p>
                    <p className="text-xs text-[#725A5A] mt-1">
                      Upgrade now to keep uploading contracts beyond the 5-review trial limit.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                    onClick={handleUpgradeNavigation}
                  >
                    {upgradeCtaLabel}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setTrialBannerDismissed(true)}
                    className="rounded-full p-1 text-[#725A5A] hover:text-[#271D1D]"
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {shouldShowPaygBanner && (
            <div
              className={`mb-6 rounded-lg border p-4 ${
                paygOutOfCredits
                  ? "border-red-200 bg-red-50"
                  : "border-[#9A7C7C]/40 bg-[#FDF1F1]"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CreditCard
                    className={`w-5 h-5 mt-0.5 ${
                      paygOutOfCredits ? "text-red-500" : "text-[#9A7C7C]"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#271D1D]">
                      {paygBannerHeadline}
                    </p>
                    <p className="text-xs text-[#725A5A] mt-1">
                      {paygOutOfCredits
                        ? "Purchase another review to keep analysing your contracts."
                        : "You're almost out of reviews. Top up now to avoid any interruptions."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                    onClick={() => void handlePaygPurchase()}
                    disabled={isCheckoutLoading}
                  >
                    {isCheckoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecting
                      </>
                    ) : (
                      "Buy Review"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPaygBannerDismissed(true)}
                    className="rounded-full p-1 text-[#725A5A] hover:text-[#271D1D]"
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {showQuickAccess && (
            <section className="mb-8">
              <div className="bg-gradient-to-br from-[#FDF1F1] via-[#F9E8E8] to-[#FDEDEA] border border-[#E8CACA] rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#9A7C7C]">
                      Quick Access
                    </p>
                    <h2 className="text-xl font-lora text-[#271D1D]">
                      Launch Contract Reviews Instantly
                    </h2>
                    <p className="text-sm text-[#725A5A]">
                      Pick a solution and jump straight to a tailored review workflow.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#9A7C7C] text-[#9A7C7C]"
                      onClick={() => setShowAllQuickSolutions((prev) => !prev)}
                    >
                      {showAllQuickSolutions ? "Collapse" : "Show all"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#9A7C7C] text-[#9A7C7C]"
                      onClick={() => navigate("/user-solutions")}
                    >
                      Browse all solutions
                    </Button>
                  </div>
                </div>
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    showAllQuickSolutions
                      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "sm:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {visibleQuickSolutions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleQuickAccess(item.key)}
                      className="text-left bg-[#F9F8F8] border border-[#271D1D]/10 rounded-xl p-4 hover:border-[#9A7C7C]/40 hover:shadow-sm transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#9A7C7C]/15 text-[#9A7C7C] flex items-center justify-center">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#271D1D] font-lora">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#725A5A] leading-relaxed mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Contracts"
              value={totalContractsValue}
              icon={<FileText className="w-5 h-5 text-[#9A7C7C]" />}
              description={totalContractsDescription}
              isLoading={isLoading}
            />
            <MetricCard
              title="Completed Reviews"
              value={dashboardData?.contractStats.completed || 0}
              icon={<CheckCircle className="w-5 h-5 text-[#9A7C7C]" />}
              description="Successfully analyzed"
              isLoading={isLoading}
            />
            {isPayAsYouGo && (
              <MetricCard
                title="Reviews Remaining"
                value={paygBalance}
                icon={<CreditCard className="w-5 h-5 text-[#9A7C7C]" />}
                description={
                  paygTotalCredits > 0
                    ? `Used ${paygConsumed}/${paygTotalCredits} purchased`
                    : "Buy your first review to get started"
                }
                isLoading={isLoading}
              />
            )}
            {shouldShowTrialCard && (
              <MetricCard
                title="Trial Days Remaining"
                value={trialDaysLabel}
                icon={<Clock className="w-5 h-5 text-[#9A7C7C]" />}
                description={trialCardDescription}
                isLoading={isLoading}
              />
            )}
            <MetricCard
              title="Total Reviews"
              value={totalReviewsValue}
              icon={<BarChart3 className="w-5 h-5 text-[#9A7C7C]" />}
              description={totalReviewsDescription}
              isLoading={isLoading}
            />
            <MetricCard
              title="Pages Analyzed"
              value={dashboardData?.usageStats?.total_pages_reviewed || 0}
              icon={<Activity className="w-5 h-5 text-[#9A7C7C]" />}
              description="Total pages processed"
              isLoading={isLoading}
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Recent Contracts */}
            <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-lora text-lg font-medium text-[#271D1D]">
                  Recent Contracts
                </h2>
                <Link to="/user-solutions">
                  <Button variant="outline" size="sm" className="text-[#271D1D] border-[#271D1D]/20">
                    View All
                  </Button>
                </Link>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.contracts && dashboardData.contracts.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.contracts.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#271D1D]/50">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-[#271D1D]/30" />
                  <p className="text-sm mb-4">No contracts uploaded yet</p>
                  {trialExpired ? (
                    <Button
                      className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                      onClick={handleUpgradeNavigation}
                    >
                      Choose a Plan to Continue
                    </Button>
                  ) : paygOutOfCredits ? (
                    <Button
                      className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
                      onClick={() => void handlePaygPurchase()}
                      disabled={isCheckoutLoading}
                    >
                      {isCheckoutLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecting
                        </>
                      ) : (
                        "Buy a Review to Continue"
                      )}
                    </Button>
                  ) : (
                    <Link to="/perspective-selection">
                      <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white">
                        Upload Your First Contract
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-lora text-lg font-medium text-[#271D1D]">
                  Recent Reviews
                </h2>
                <Link to="/user-solutions">
                  <Button variant="outline" size="sm" className="text-[#271D1D] border-[#271D1D]/20">
                    View All
                  </Button>
                </Link>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardData?.recentReviews && dashboardData.recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#271D1D]/50">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[#271D1D]/30" />
                  <p className="text-sm">No reviews completed yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
            <h2 className="font-lora text-lg font-medium text-[#271D1D] mb-6">
              Recent Activity
            </h2>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#271D1D]/50">
                <Activity className="w-12 h-12 mx-auto mb-4 text-[#271D1D]/30" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
