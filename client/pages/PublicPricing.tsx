import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";

const PricingCard = ({
  tier,
  title,
  subtitle,
  price,
  period,
  features,
  buttonText,
  buttonAction,
  popular = false,
}: {
  tier: string;
  title: string;
  subtitle: string;
  price: number | string;
  period: string;
  features: string[];
  buttonText: string;
  buttonAction: () => void;
  popular?: boolean;
}) => (
  <Card
    className={`relative ${popular ? "ring-2 ring-[#9A7C7C] scale-105" : ""}`}
  >
    {popular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 scale-95 z-10">
        <span className="bg-[#9A7C7C] text-white px-4 py-1 text-sm rounded-full shadow-md whitespace-nowrap">
          Most Popular
        </span>
      </div>
    )}
    <CardHeader className="text-center">
      <CardTitle className="text-xl font-medium text-[#271D1D] font-lora">
        {title}
      </CardTitle>
      <p className="text-sm text-[#271D1D]/70">{subtitle}</p>
      <div className="mt-4">
        <span className="text-4xl font-bold text-[#271D1D]">
          {typeof price === "number" ? `€${price}` : price}
        </span>
        <span className="text-[#271D1D]/70 ml-1">{period}</span>
      </div>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-[#271D1D]">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={buttonAction}
        className={`w-full ${
          popular
            ? "bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
            : "bg-white border border-[#271D1D]/20 text-[#271D1D] hover:bg-[#F9F8F8]"
        }`}
        variant={popular ? "default" : "outline"}
      >
        {buttonText}
      </Button>
    </CardContent>
  </Card>
);

const PricingCalculator = ({
  onPlanSelect,
}: {
  onPlanSelect: (plan: string) => void;
}) => {
  const [contractCount, setContractCount] = useState(5);

  const calculatePricing = (contracts: number) => {
    if (contracts <= 1) return { plan: "Free Trial", price: 0, savings: 0 };
    if (contracts <= 10) {
      const payAsYouGo = contracts * 89;
      const monthly10 = 799;
      return {
        plan: contracts <= 9 ? "Pay-as-you-go" : "Monthly 10",
        price: contracts <= 9 ? payAsYouGo : monthly10,
        savings: contracts <= 9 ? 0 : payAsYouGo - monthly10,
      };
    }
    if (contracts <= 15) {
      const payAsYouGo = contracts * 89;
      const monthly15 = 1199;
      return {
        plan: "Monthly 15",
        price: monthly15,
        savings: payAsYouGo - monthly15,
      };
    }
    return { plan: "Enterprise", price: "Custom", savings: "Contact us" };
  };

  const result = calculatePricing(contractCount);

  return (
    <Card className="bg-[#F9F8F8] border-[#271D1D]/10">
      <CardContent className="p-6">
        <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-2">
          Pricing Calculator
        </h3>
        <p className="text-sm text-[#271D1D]/70 mb-4">
          How many contracts do you review monthly?
        </p>

        <div className="space-y-4">
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
            <div className="flex justify-between text-xs text-[#271D1D]/60 mt-3">
              <span>1</span>
              <span className="font-medium text-[#271D1D]">
                {contractCount} contracts
              </span>
              <span>20+</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-[#271D1D]/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-[#271D1D]">
                  Recommended: {result.plan}
                </p>
                <p className="text-sm text-[#271D1D]/70">
                  {typeof result.price === "number"
                    ? `€${result.price}${result.price > 0 ? "/month" : ""}`
                    : result.price
                  }
                </p>
              </div>
              {typeof result.savings === "number" && result.savings > 0 && (
                <div className="text-right">
                  <p className="text-sm text-green-600 font-medium">
                    Save €{result.savings}/month
                  </p>
                </div>
              )}
            </div>
            <Button
              onClick={() => onPlanSelect(result.plan)}
              className="w-full mt-3 bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PublicPricing() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const handlePlanSelect = (plan: string) => {
    // Redirect to sign up for public users
    navigate("/signin");
  };

  const handleCalculatorSelect = (plan: string) => {
    // Redirect to sign up for public users
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <style>{rangeSliderStyles}</style>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/">
          <Logo size="xl" />
        </Link>

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

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={false} />
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-8 lg:px-16 bg-[#F9F8F8] pt-24 lg:pt-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-[#271D1D]/70 mb-8">
            From free trials to enterprise solutions, we have pricing that
            scales with your contract review needs.
          </p>
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="pb-16 px-8 lg:px-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4">
              Find Your Perfect Plan
            </h2>
          </div>

          <PricingCalculator onPlanSelect={handleCalculatorSelect} />
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-4">
              Choose Your Plan
            </h2>
            <p className="text-[#271D1D]/70">
              Detailed breakdown of all our service packages and pricing tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Free Trial */}
            <PricingCard
              tier="free_trial"
              title="Free Trial"
              subtitle="Try Maigon Risk-Free"
              price={0}
              period=""
              features={[
                "One complete contract review",
                "Full compliance report with risk assessment",
                "Clause extraction and recommendations",
                "Access to all 7 contract type modules",
                "Professional-grade analysis (worth ���89)",
                "Personal dashboard access",
                "Contract review history tracking",
                "Report storage for 7 days only",
              ]}
              buttonText="Start Free Trial"
              buttonAction={() => handlePlanSelect("free_trial")}
            />

            {/* Pay-as-you-go */}
            <PricingCard
              tier="pay_as_you_go"
              title="Pay-As-You-Go"
              subtitle="Perfect for Occasional Use"
              price={89}
              period="per contract"
              features={[
                "Instant compliance reports",
                "All 7 contract type modules",
                "Risk assessment and scoring",
                "Clause extraction with recommendations",
                "Email support (48-hour response)",
                "Permanent report storage",
                "Basic playbook templates",
                "Unlimited report storage",
                "Download reports in multiple formats",
              ]}
              buttonText="Get Started"
              buttonAction={() => handlePlanSelect("pay_as_you_go")}
            />

            {/* Monthly 10 */}
            <PricingCard
              tier="monthly_10"
              title="Monthly 10"
              subtitle="Save with Volume Package"
              price={799}
              period="per month"
              popular={true}
              features={[
                "10 contracts per month (€79.90 each)",
                "10% savings vs. pay-as-you-go",
                "Priority processing",
                "Enhanced email support (48-hour response)",
                "90-day usage analytics and reporting",
                "Advanced playbook templates",
                "Monthly billing cycle",
                "Cancel anytime with 30-day notice",
              ]}
              buttonText="Get Started"
              buttonAction={() => handlePlanSelect("monthly_10")}
            />

            {/* Monthly 15 */}
            <PricingCard
              tier="monthly_15"
              title="Monthly 15"
              subtitle="Maximum Value Package"
              price={1199}
              period="per month"
              features={[
                "15 contracts per month (€79.93 each)",
                "10% savings vs. pay-as-you-go",
                "Priority processing",
                "Enhanced email support (24-hour response)",
                "90-day usage analytics and reporting",
                "Advanced playbook templates",
                "Monthly billing cycle",
                "Cancel anytime with 30-day notice",
              ]}
              buttonText="Get Started"
              buttonAction={() => handlePlanSelect("monthly_15")}
            />

            {/* Enterprise Plan */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm relative">
              <div className="bg-gradient-to-r from-[#9A7C7C] to-[#B6A5A5] rounded-lg p-6 text-white text-center h-full flex flex-col">
                <Phone className="w-8 h-8 mx-auto mb-3" />
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
                      <li className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                        <span>Unlimited contract reviews</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                        <span>Custom pricing based on volume</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                        <span>Dedicated account manager</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                        <span>Custom integrations & API access</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                        <span>Advanced analytics & reporting</span>
                      </li>
                      <li className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                        <span>Priority support & training</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/signin")}
                  className="w-full bg-white text-[#9A7C7C] hover:bg-white/90 mt-auto"
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-8 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-8 text-center">
            Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border border-[#271D1D]/20 rounded-lg">
              <thead>
                <tr className="bg-[#F9F8F8]">
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
                    Monthly 10
                  </th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">
                    Monthly 15
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: "Contract Reviews",
                    trial: "1",
                    paygo: "Unlimited",
                    monthly10: "10/month",
                    monthly15: "15/month",
                  },
                  {
                    feature: "AI Analysis",
                    trial: "Basic",
                    paygo: "Full",
                    monthly10: "Advanced",
                    monthly15: "Premium",
                  },
                  {
                    feature: "Compliance Reports",
                    trial: "✓",
                    paygo: "✓",
                    monthly10: "✓",
                    monthly15: "✓",
                  },
                  {
                    feature: "Custom Rules",
                    trial: "✗",
                    paygo: "Limited",
                    monthly10: "✓",
                    monthly15: "✓",
                  },
                  {
                    feature: "API Access",
                    trial: "✗",
                    paygo: "✗",
                    monthly10: "✗",
                    monthly15: "✓",
                  },
                  {
                    feature: "Priority Support",
                    trial: "✗",
                    paygo: "✓",
                    monthly10: "✓",
                    monthly15: "✓",
                  },
                ].map((row, index) => (
                  <tr key={index} className="border-t border-[#271D1D]/10">
                    <td className="p-4 font-medium text-[#271D1D]">
                      {row.feature}
                    </td>
                    <td className="p-4 text-center text-[#271D1D]">
                      {row.trial}
                    </td>
                    <td className="p-4 text-center text-[#271D1D]">
                      {row.paygo}
                    </td>
                    <td className="p-4 text-center text-[#271D1D]">
                      {row.monthly10}
                    </td>
                    <td className="p-4 text-center text-[#271D1D]">
                      {row.monthly15}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
