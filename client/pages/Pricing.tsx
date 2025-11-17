import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  User,
  Check,
  Star,
  Building2,
  Calculator,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";
import { toast } from "sonner";
import {
  getPlanByKey,
  type PlanKey,
  type PlanDefinition,
} from "@shared/plans";
import { createCheckoutSession } from "@/services/billingService";

const formatCurrency = (value: number) =>
  `€${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const PricingCard = ({
  tier,
  title,
  subtitle,
  price,
  period,
  description,
  features,
  buttonText,
  buttonAction,
  highlighted = false,
  savings = null,
  popular = false,
  loading = false,
}: {
  tier: string;
  title: string;
  subtitle: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonAction: () => void;
  highlighted?: boolean;
  savings?: string | null;
  popular?: boolean;
  loading?: boolean;
}) => (
  <div
    className={`relative bg-white rounded-lg p-6 border transition-all duration-200 ${
      highlighted
        ? "border-[#9A7C7C] shadow-lg scale-105"
        : "border-[#271D1D]/10 hover:border-[#9A7C7C]/50"
    }`}
  >
    {popular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 scale-95 z-10">
        <span className="bg-[#9A7C7C] text-white px-4 py-1 text-sm rounded-full shadow-md whitespace-nowrap">
          Most Popular
        </span>
      </div>
    )}

    <div className="text-center mb-6">
      <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[#9A7C7C] font-medium mb-4">{subtitle}</p>

      <div className="mb-4">
        <span className="font-lora text-3xl font-bold text-[#271D1D]">
          {price}
        </span>
        <span className="text-sm text-[#271D1D]/70 ml-1">{period}</span>
        {savings && (
          <div className="text-sm text-green-600 font-medium mt-1">
            {savings}
          </div>
        )}
      </div>

      <p className="text-sm text-[#271D1D]/70">{description}</p>
    </div>

    <div className="mb-6">
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-4 h-4 text-[#9A7C7C] mt-0.5 flex-shrink-0" />
            <span className="text-sm text-[#271D1D]">{feature}</span>
          </li>
        ))}
      </ul>
    </div>

    <Button
      onClick={buttonAction}
      disabled={loading}
      className={`w-full ${
        highlighted
          ? "bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
          : "bg-[#F3F3F3] hover:bg-[#D6CECE] text-[#271D1D] border border-[#271D1D]/20"
      }`}
    >
      {loading ? "Redirecting..." : buttonText}
    </Button>
  </div>
);

const PricingCalculator = ({
  onPlanSelect,
}: {
  onPlanSelect: (plan: PlanKey) => void;
}) => {
  const [contractCount, setContractCount] = useState(5);

  const calculatePricing = (contracts: number) => {
    const paygCost = contracts * 69;

    if (contracts <= 0) {
      return {
        planLabel: "Free Trial",
        planKey: "free_trial" as const,
        price: 0,
        savings: 0,
      };
    }

    if (contracts <= 9) {
      return {
        planLabel: "Pay-As-You-Go",
        planKey: "pay_as_you_go" as const,
        price: paygCost,
        savings: 0,
      };
    }

    if (contracts === 10) {
      const savings = paygCost - 590;
      return {
        planLabel: "Monthly Subscription",
        planKey: "monthly_10" as const,
        price: 590,
        savings: savings > 0 ? savings : 0,
      };
    }

    return {
      planLabel: "Enterprise Plan",
      planKey: "professional" as const,
      price: "Custom" as const,
      savings: null,
    };
  };

  const result = calculatePricing(contractCount);

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Calculator className="w-8 h-8 text-[#9A7C7C] mx-auto mb-3" />
        <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-2">
          Pricing Calculator
        </h3>
        <p className="text-sm text-[#271D1D]/70">
          Find the perfect plan for your needs
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[#271D1D] mb-3">
          How many contracts do you review per month?
        </label>
        <div className="slider-container">
          <div
            className="slider-tooltip"
            style={{
              left: `${((contractCount - 1) / 19) * 100}%`
            }}
          >
            {contractCount}
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={contractCount}
            onChange={(e) => setContractCount(parseInt(e.target.value))}
            className="custom-range-slider"
            style={{
              background: `linear-gradient(to right, #9A7C7C 0%, #9A7C7C ${((contractCount - 1) / 19) * 100}%, #E5E5E5 ${((contractCount - 1) / 19) * 100}%, #E5E5E5 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-[#271D1D]/50 mt-3">
            <span>1</span>
            <span className="font-medium text-[#271D1D]">{contractCount}</span>
            <span>20+</span>
          </div>
        </div>
      </div>

      <div className="bg-[#F9F8F8] rounded-lg p-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-[#271D1D]/70 mb-1">Recommended Plan</p>
          <p className="font-lora text-lg font-medium text-[#271D1D]">
            {result.planLabel}
          </p>
          <p className="font-lora text-2xl font-bold text-[#9A7C7C]">
            {typeof result.price === "number"
              ? formatCurrency(result.price)
              : result.price}
            {result.planKey === "monthly_10" && (
              <span className="text-sm font-normal">/month</span>
            )}
          </p>
          {typeof result.savings === "number" && result.savings > 0 && (
            <p className="text-sm text-green-600 font-medium">
              Save {formatCurrency(result.savings)} vs pay-as-you-go
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={() => onPlanSelect(result.planKey)}
        className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
      >
        {result.planKey === "professional"
          ? "Request Consultation"
          : "Select This Plan"}
      </Button>
    </div>
  );
};

export default function Pricing() {
  const { user, isLoggedIn, logout } = useUser();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const [checkoutPlanKey, setCheckoutPlanKey] = useState<PlanKey | null>(null);
  const freeTrialPlan = useMemo<PlanDefinition | undefined>(
    () => getPlanByKey("free_trial"),
    [],
  );
  const paygPlan = useMemo<PlanDefinition | undefined>(
    () => getPlanByKey("pay_as_you_go"),
    [],
  );
  const monthlyPlan = useMemo<PlanDefinition | undefined>(
    () => getPlanByKey("monthly_10"),
    [],
  );
  const enterprisePlan = useMemo<PlanDefinition | undefined>(
    () => getPlanByKey("professional"),
    [],
  );
  const monthlySavingsLabel = useMemo(() => {
    const savings = 69 * 10 - 590;
    return savings > 0 ? `${formatCurrency(savings)} vs pay-as-you-go` : null;
  }, []);

  // Custom styles for range slider
  const rangeSliderStyles = `
    .slider-container {
      position: relative;
      padding-top: 50px;
    }

    .custom-range-slider {
      width: 100%;
      height: 8px;
      border-radius: 20px;
      appearance: none;
      cursor: pointer;
      outline: none;
    }

    .custom-range-slider::-webkit-slider-thumb {
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #9A7C7C;
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 12px rgba(154, 124, 124, 0.3);
      transition: all 0.2s ease;
      position: relative;
    }

    .custom-range-slider::-webkit-slider-thumb:hover {
      background: #8B6F6F;
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(154, 124, 124, 0.4);
    }

    .custom-range-slider::-webkit-slider-thumb:active {
      background: #7A5F5F;
      transform: scale(1.05);
    }

    .custom-range-slider::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #9A7C7C;
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 12px rgba(154, 124, 124, 0.3);
      transition: all 0.2s ease;
    }

    .custom-range-slider::-moz-range-thumb:hover {
      background: #8B6F6F;
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(154, 124, 124, 0.4);
    }

    .custom-range-slider::-moz-range-thumb:active {
      background: #7A5F5F;
      transform: scale(1.05);
    }

    .slider-tooltip {
      position: absolute;
      top: -2px;
      transform: translateX(-50%);
      background: #9A7C7C;
      color: white;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      min-width: 35px;
      text-align: center;
      transition: left 0.1s ease;
    }

    .slider-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -6px;
      border-width: 6px;
      border-style: solid;
      border-color: #9A7C7C transparent transparent transparent;
    }
  `;

  const handlePlanSelect = async (planKey: PlanKey) => {
    const plan = getPlanByKey(planKey);

    if (!plan) {
      toast.error("Unknown plan selected. Please refresh and try again.");
      return;
    }

    if (planKey === "professional") {
      navigate("/demo-login", { state: { selectedPlan: planKey } });
      return;
    }

    if (planKey === "free_trial") {
      if (isLoggedIn) {
        toast.info("You're already in the platform. Reach out to support to adjust your plan if needed.");
      } else {
        navigate("/demo-login", { state: { selectedPlan: planKey } });
      }
      return;
    }

    if (!isLoggedIn || !user) {
      navigate("/demo-login", { state: { selectedPlan: planKey } });
      return;
    }

    if (!plan.stripe || plan.stripe.mode === "none") {
      toast.info("Please contact support to activate this plan.");
      return;
    }

    try {
      setCheckoutPlanKey(planKey);
      const session = await createCheckoutSession({
        planKey,
        userId: user.id,
        email: user.email,
        organizationId: user.organization?.id,
        successPath: "/pricing/checkout-success",
        cancelPath: location.pathname,
        metadata: {
          source: "app-pricing",
        },
      });

      if (session.url) {
        window.location.href = session.url;
      } else {
        toast.success("Checkout session created. Please follow the Stripe window.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start checkout";
      toast.error(message);
    } finally {
      setCheckoutPlanKey(null);
    }
  };

  const handleCalculatorSelect = (planKey: PlanKey) => {
    if (planKey === "professional") {
      handlePlanSelect(planKey);
      return;
    }

    handlePlanSelect(planKey);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <style>{rangeSliderStyles}</style>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to={isLoggedIn ? "/dashboard" : "/"}>
          <Logo size="xl" />
        </Link>

        {isLoggedIn ? (
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/user-solutions"
              className={`transition-colors ${
                location.pathname === "/user-solutions"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              Solutions
            </Link>
            <Link
              to="/pricing"
              className={`transition-colors ${
                location.pathname === "/pricing"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/user-news"
              className={`transition-colors ${
                location.pathname === "/user-news"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              News
            </Link>
            <Link
              to="/user-team"
              className={`transition-colors ${
                location.pathname === "/user-team"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              Team
            </Link>
            <Link
              to="/dashboard"
              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                location.pathname === "/dashboard"
                  ? "bg-[#9A7C7C] text-white shadow-md transform scale-105"
                  : "bg-[#D6CECE] text-[#271D1D] hover:bg-[#9A7C7C] hover:text-white hover:shadow-md hover:transform hover:scale-105"
              }`}
            >
              Dashboard
            </Link>

            {/* User Button */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-[#271D1D]" />
                <span className="text-[#271D1D] font-medium">
                  @{user?.name.split(" ")[0]}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                  >
                    Profile & Settings
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
        ) : (
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/solutions"
              className={`transition-colors ${
                location.pathname === "/solutions"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              Solutions
            </Link>
            <Link
              to="/public-pricing"
              className={`transition-colors ${
                location.pathname === "/public-pricing"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              Pricing
            </Link>
            <Link
              to="/news"
              className={`transition-colors ${
                location.pathname === "/news"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              News
            </Link>
            <Link
              to="/team"
              className={`transition-colors ${
                location.pathname === "/team"
                  ? "text-[#9A7C7C] font-medium"
                  : "text-[#271D1D] hover:text-[#9A7C7C]"
              }`}
            >
              Team
            </Link>
            <Button
              asChild
              className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg"
            >
              <Link to="/signin">Sign In/Up</Link>
            </Button>
          </div>
        )}

        {/* Mobile Navigation */}
        <MobileNavigation
          isLoggedIn={isLoggedIn}
          userName={user?.name.split(" ")[0]}
        />
      </nav>

      {/* Hero Section */}
      <section className="pt-24 lg:pt-32 pb-16 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora mb-6">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-[#271D1D]/70 mb-8">
            From free trials to enterprise solutions, we have pricing that
            scales with your contract review needs.
          </p>

          {isLoggedIn && user && (
            <div className="bg-white rounded-lg p-4 border border-[#9A7C7C]/20 mb-8 max-w-md mx-auto">
              <p className="text-sm text-[#271D1D] mb-1">Current Plan</p>
              <p className="font-medium text-[#9A7C7C]">{user.plan.name}</p>
              {user.plan.type !== "professional" && (
                <p className="text-xs text-[#271D1D]/70">
                  Looking to upgrade? Choose a new plan below.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="pb-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-medium text-[#271D1D] font-lora mb-4">
              Find Your Ideal Plan
            </h2>
            <p className="text-[#271D1D]/70">
              Use our calculator to find the most cost-effective plan for your
              needs.
            </p>
          </div>

          <PricingCalculator onPlanSelect={handleCalculatorSelect} />
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-medium text-[#271D1D] font-lora mb-4">
              All Available Plans
            </h2>
            <p className="text-[#271D1D]/70">
              Detailed breakdown of all our service packages and pricing tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PricingCard
              tier="free_trial"
              title="Free Trial"
              subtitle="Try Maigon Risk-Free"
              price={formatCurrency(0)}
              period=""
              description="Perfect for getting started with our platform"
              features={freeTrialPlan?.features ?? []}
              buttonText={isLoggedIn ? "Already Using" : "Start Free Trial"}
              buttonAction={() => handlePlanSelect("free_trial")}
              highlighted={user?.plan.type === "free_trial"}
            />

            <PricingCard
              tier="pay_as_you_go"
              title="Pay-As-You-Go"
              subtitle="Perfect for Occasional Use"
              price={formatCurrency(paygPlan?.price ?? 69)}
              period="per contract"
              description="Ideal for irregular contract review needs"
              features={paygPlan?.features ?? []}
              buttonText={
                user?.plan.type === "pay_as_you_go"
                  ? "Current Plan"
                  : "Purchase Now"
              }
              buttonAction={() => handlePlanSelect("pay_as_you_go")}
              highlighted={user?.plan.type === "pay_as_you_go"}
              loading={checkoutPlanKey === "pay_as_you_go"}
            />

            <PricingCard
              tier="monthly_10"
              title="Monthly Subscription"
              subtitle="Save with a Volume Package"
              price={formatCurrency(monthlyPlan?.price ?? 590)}
              period="per month"
              description="10 contracts per month"
              savings={monthlySavingsLabel}
              features={monthlyPlan?.features ?? []}
              buttonText={
                user?.plan.type === "monthly_10"
                  ? "Current Plan"
                  : "Subscribe"
              }
              buttonAction={() => handlePlanSelect("monthly_10")}
              highlighted={user?.plan.type === "monthly_10"}
              popular={true}
              loading={checkoutPlanKey === "monthly_10"}
            />

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm relative">
              <div className="bg-gradient-to-r from-[#9A7C7C] to-[#B6A5A5] rounded-lg p-6 text-white text-center h-full flex flex-col">
                <Building2 className="w-8 h-8 mx-auto mb-3" />
                <h3 className="font-lora text-lg font-medium mb-2">
                  Enterprise Plan
                </h3>
                <div className="text-2xl font-bold text-white mb-1">
                  Custom
                </div>
                <div className="text-sm text-white/90 mb-4">pricing</div>

                <div className="space-y-3 mb-6 flex-grow">
                  <div className="text-left">
                    <h4 className="text-xs font-medium mb-2 uppercase tracking-wider">Enterprise Features</h4>
                    <ul className="space-y-1">
                      {(enterprisePlan?.features ?? []).map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-xs">
                          <Check className="w-3 h-3 text-white flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={() => handlePlanSelect("professional")}
                  className="w-full bg-white text-[#9A7C7C] hover:bg-white/90 mt-auto"
                >
                  {user?.plan.type === "professional"
                    ? "Current Plan"
                    : "Request Consultation"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 px-8 lg:px-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-medium text-[#271D1D] font-lora text-center mb-12">
            Plan Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#271D1D]/10">
                  <th className="text-left p-4 font-medium text-[#271D1D]">
                    Features
                  </th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">
                    Free Trial
                  </th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">
                    Pay-as-you-go
                  </th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">
                    Monthly Subscription
                  </th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">
                    Enterprise Plan
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">Contract Reviews</td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    5 contracts (14-day trial)
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Pay per contract
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    10/month
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Unlimited
                  </td>
                </tr>
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">Report Storage</td>
                  <td className="p-4 text-center text-[#271D1D]/70">7 days</td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Permanent
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Permanent
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Permanent
                  </td>
                </tr>
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">Support Response</td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Email (48 hours)
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Email (48 hours)
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Enhanced email (48 hours)
                  </td>
                  <td className="p-4 text-center text-[#271D1D]/70">
                    Priority + dedicated
                  </td>
                </tr>
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">API Access</td>
                  <td className="p-4 text-center text-[#271D1D]/70">❌</td>
                  <td className="p-4 text-center text-[#271D1D]/70">❌</td>
                  <td className="p-4 text-center text-[#271D1D]/70">❌</td>
                  <td className="p-4 text-center text-[#271D1D]/70">✅</td>
                </tr>
                <tr>
                  <td className="p-4 text-[#271D1D]">Custom Integrations</td>
                  <td className="p-4 text-center text-[#271D1D]/70">❌</td>
                  <td className="p-4 text-center text-[#271D1D]/70">❌</td>
                  <td className="p-4 text-center text-[#271D1D]/70">❌</td>
                  <td className="p-4 text-center text-[#271D1D]/70">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
