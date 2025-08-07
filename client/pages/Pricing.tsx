import { Button } from "@/components/ui/button";
import { ChevronDown, User, Check, Star, Phone, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";

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
  popular = false 
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
}) => (
  <div className={`relative bg-white rounded-lg p-6 border transition-all duration-200 ${
    highlighted ? 'border-[#9A7C7C] shadow-lg scale-105' : 'border-[#271D1D]/10 hover:border-[#9A7C7C]/50'
  }`}>
    {popular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <div className="bg-[#9A7C7C] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
          <Star className="w-3 h-3" />
          Most Popular
        </div>
      </div>
    )}
    
    <div className="text-center mb-6">
      <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-2">{title}</h3>
      <p className="text-sm text-[#9A7C7C] font-medium mb-4">{subtitle}</p>
      
      <div className="mb-4">
        <span className="font-lora text-3xl font-bold text-[#271D1D]">{price}</span>
        <span className="text-sm text-[#271D1D]/70 ml-1">{period}</span>
        {savings && (
          <div className="text-sm text-green-600 font-medium mt-1">{savings}</div>
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
      className={`w-full ${
        highlighted 
          ? 'bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white' 
          : 'bg-[#F3F3F3] hover:bg-[#D6CECE] text-[#271D1D] border border-[#271D1D]/20'
      }`}
    >
      {buttonText}
    </Button>
  </div>
);

const PricingCalculator = ({ onPlanSelect }: { onPlanSelect: (contracts: number) => void }) => {
  const [contractCount, setContractCount] = useState(5);
  
  const calculatePricing = (contracts: number) => {
    if (contracts <= 1) return { plan: 'Free Trial', price: 0, savings: 0 };
    if (contracts <= 10) {
      const payAsYouGo = contracts * 89;
      const monthly10 = 799;
      return {
        plan: contracts <= 9 ? 'Pay-as-you-go' : 'Monthly 10',
        price: contracts <= 9 ? payAsYouGo : monthly10,
        savings: contracts <= 9 ? 0 : payAsYouGo - monthly10
      };
    }
    if (contracts <= 15) {
      const payAsYouGo = contracts * 89;
      const monthly15 = 1199;
      return {
        plan: 'Monthly 15',
        price: monthly15,
        savings: payAsYouGo - monthly15
      };
    }
    return { plan: 'Professional', price: 'Custom', savings: 'Contact us' };
  };

  const result = calculatePricing(contractCount);

  return (
    <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 max-w-md mx-auto">
      <div className="text-center mb-6">
        <Calculator className="w-8 h-8 text-[#9A7C7C] mx-auto mb-3" />
        <h3 className="font-lora text-lg font-medium text-[#271D1D] mb-2">Pricing Calculator</h3>
        <p className="text-sm text-[#271D1D]/70">Find the perfect plan for your needs</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[#271D1D] mb-3">
          How many contracts do you review per month?
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={contractCount}
          onChange={(e) => setContractCount(parseInt(e.target.value))}
          className="w-full h-2 bg-[#F3F3F3] rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #9A7C7C 0%, #9A7C7C ${(contractCount/20)*100}%, #F3F3F3 ${(contractCount/20)*100}%, #F3F3F3 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-[#271D1D]/50 mt-1">
          <span>1</span>
          <span className="font-medium text-[#271D1D]">{contractCount}</span>
          <span>20+</span>
        </div>
      </div>

      <div className="bg-[#F9F8F8] rounded-lg p-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-[#271D1D]/70 mb-1">Recommended Plan</p>
          <p className="font-lora text-lg font-medium text-[#271D1D]">{result.plan}</p>
          <p className="font-lora text-2xl font-bold text-[#9A7C7C]">
            {typeof result.price === 'number' ? `€${result.price}` : result.price}
            {typeof result.price === 'number' && <span className="text-sm font-normal">/month</span>}
          </p>
          {typeof result.savings === 'number' && result.savings > 0 && (
            <p className="text-sm text-green-600 font-medium">Save €{result.savings}/month</p>
          )}
        </div>
      </div>

      <Button 
        onClick={() => onPlanSelect(contractCount)}
        className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white"
      >
        {contractCount >= 15 ? 'Request Consultation' : 'Select This Plan'}
      </Button>
    </div>
  );
};

export default function Pricing() {
  const { user, isLoggedIn } = useUser();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handlePlanSelect = (planType: string) => {
    if (isLoggedIn) {
      // Navigate to plan selection/upgrade page
      console.log(`Selecting plan: ${planType}`);
      // In a real app, this would trigger plan upgrade flow
    } else {
      // Navigate to sign up with selected plan
      // navigate('/signup', { state: { selectedPlan: planType } });
      console.log(`Sign up with plan: ${planType}`);
    }
  };

  const handleCalculatorSelect = (contracts: number) => {
    if (contracts >= 15) {
      // Trigger consultation request
      console.log('Requesting consultation for professional plan');
    } else {
      const planType = contracts <= 1 ? 'free_trial' : 
                      contracts <= 9 ? 'pay_as_you_go' :
                      contracts <= 10 ? 'monthly_10' : 'monthly_15';
      handlePlanSelect(planType);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to={isLoggedIn ? "/home" : "/"}>
          <Logo size="xl" />
        </Link>
        
        {isLoggedIn ? (
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/user-solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
            <Link to="/user-news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
            <Link to="/user-team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>
            <Link to="/pricing" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Pricing</Link>

            {/* User Button */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-[#271D1D]" />
                <span className="text-[#271D1D] font-medium">@{user?.name.split(' ')[0]}</span>
                <ChevronDown className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors">Profile</Link>
                  <Link to="/settings" className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors">Settings</Link>
                  <Link to="/" className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors">Log Out</Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
            <Link to="/news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
            <Link to="/team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>
            <Link to="/pricing" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Pricing</Link>
            <Button asChild className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg">
              <Link to="/signin">Sign In/Up</Link>
            </Button>
          </div>
        )}

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={isLoggedIn} userName={user?.name.split(' ')[0]} />
      </nav>

      {/* Hero Section */}
      <section className="pt-24 lg:pt-32 pb-16 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora mb-6">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-[#271D1D]/70 mb-8">
            From free trials to enterprise solutions, we have pricing that scales with your contract review needs.
          </p>
          
          {isLoggedIn && user && (
            <div className="bg-white rounded-lg p-4 border border-[#9A7C7C]/20 mb-8 max-w-md mx-auto">
              <p className="text-sm text-[#271D1D] mb-1">Current Plan</p>
              <p className="font-medium text-[#9A7C7C]">{user.plan.name}</p>
              {user.plan.type !== 'professional' && (
                <p className="text-xs text-[#271D1D]/70">Looking to upgrade? Choose a new plan below.</p>
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
              Use our calculator to find the most cost-effective plan for your needs.
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
            {/* Free Trial */}
            <PricingCard
              tier="free_trial"
              title="Free Trial"
              subtitle="Try Maigon Risk-Free"
              price="€0"
              period=""
              description="Perfect for testing our platform"
              features={[
                "One complete contract review",
                "Full compliance report with risk assessment",
                "Clause extraction and recommendations",
                "Access to all 7 contract type modules",
                "Professional-grade analysis (worth €89)",
                "Personal dashboard access",
                "Contract review history tracking",
                "Report storage for 7 days only"
              ]}
              buttonText={isLoggedIn ? "Already Using" : "Start Free Trial"}
              buttonAction={() => handlePlanSelect('free_trial')}
              highlighted={user?.plan.type === 'free_trial'}
            />

            {/* Pay-as-you-go */}
            <PricingCard
              tier="pay_as_you_go"
              title="Pay-As-You-Go"
              subtitle="Perfect for Occasional Use"
              price="€89"
              period="per contract"
              description="Ideal for irregular contract review needs"
              features={[
                "Instant compliance reports",
                "All 7 contract type modules",
                "Risk assessment and scoring",
                "Clause extraction with recommendations",
                "Email support (48-hour response)",
                "Permanent report storage",
                "Basic playbook templates",
                "Unlimited report storage",
                "Download reports in multiple formats"
              ]}
              buttonText={user?.plan.type === 'pay_as_you_go' ? "Current Plan" : "Choose Plan"}
              buttonAction={() => handlePlanSelect('pay_as_you_go')}
              highlighted={user?.plan.type === 'pay_as_you_go'}
            />

            {/* Monthly 10 */}
            <PricingCard
              tier="monthly_10"
              title="Monthly 10"
              subtitle="Save with Volume Package"
              price="€799"
              period="per month"
              description="10 contracts per month"
              savings="Save €91/month vs pay-as-you-go"
              features={[
                "10 contracts per month (€79.90 each)",
                "10% savings vs. pay-as-you-go",
                "Priority processing",
                "Enhanced email support (48-hour response)",
                "90-day usage analytics and reporting",
                "Advanced playbook templates",
                "Monthly billing cycle",
                "Cancel anytime with 30-day notice"
              ]}
              buttonText={user?.plan.type === 'monthly_10' ? "Current Plan" : "Choose Plan"}
              buttonAction={() => handlePlanSelect('monthly_10')}
              highlighted={user?.plan.type === 'monthly_10'}
              popular={true}
            />

            {/* Monthly 15 */}
            <PricingCard
              tier="monthly_15"
              title="Monthly 15"
              subtitle="Maximum Value Package"
              price="€1,199"
              period="per month"
              description="15 contracts per month"
              savings="Save €136/month vs pay-as-you-go"
              features={[
                "15 contracts per month (€79.93 each)",
                "10% savings vs. pay-as-you-go",
                "Priority processing",
                "Enhanced email support (24-hour response)",
                "90-day usage analytics and reporting",
                "Advanced playbook templates",
                "Monthly billing cycle",
                "Cancel anytime with 30-day notice"
              ]}
              buttonText={user?.plan.type === 'monthly_15' ? "Current Plan" : "Choose Plan"}
              buttonAction={() => handlePlanSelect('monthly_15')}
              highlighted={user?.plan.type === 'monthly_15'}
            />
          </div>

          {/* Professional Plan */}
          <div className="mt-8">
            <div className="bg-gradient-to-r from-[#9A7C7C] to-[#B6A5A5] rounded-lg p-8 text-white text-center">
              <div className="max-w-3xl mx-auto">
                <Phone className="w-12 h-12 mx-auto mb-4" />
                <h3 className="font-lora text-2xl font-medium mb-4">Professional Plan</h3>
                <p className="text-lg mb-2">For 15+ Contracts Monthly - Custom Pricing</p>
                <p className="text-white/90 mb-6">
                  Perfect for large law firms and enterprises requiring custom integrations, 
                  advanced features, and dedicated support.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="text-left">
                    <h4 className="font-medium mb-2">What's Included:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Custom pricing based on exact volume</li>
                      <li>• Feature customization assessment</li>
                      <li>• Integration requirements discussion</li>
                      <li>• Implementation timeline planning</li>
                    </ul>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium mb-2">Enterprise Features:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Unlimited contract reviews</li>
                      <li>• Priority support & dedicated account manager</li>
                      <li>• Custom integrations & API access</li>
                      <li>• Advanced analytics & reporting</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={() => handlePlanSelect('professional')}
                  className="bg-white text-[#9A7C7C] hover:bg-white/90 px-8 py-3"
                >
                  {user?.plan.type === 'professional' ? 'Current Plan' : 'Request Consultation'}
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
                  <th className="text-left p-4 font-medium text-[#271D1D]">Features</th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">Free Trial</th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">Pay-as-you-go</th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">Monthly Plans</th>
                  <th className="text-center p-4 font-medium text-[#271D1D]">Professional</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">Contract Reviews</td>
                  <td className="p-4 text-center text-[#271D1D]/70">1</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Unlimited</td>
                  <td className="p-4 text-center text-[#271D1D]/70">10 or 15/month</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Unlimited</td>
                </tr>
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">Report Storage</td>
                  <td className="p-4 text-center text-[#271D1D]/70">7 days</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Permanent</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Permanent</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Permanent</td>
                </tr>
                <tr className="border-b border-[#271D1D]/5">
                  <td className="p-4 text-[#271D1D]">Support Response</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Email only</td>
                  <td className="p-4 text-center text-[#271D1D]/70">48 hours</td>
                  <td className="p-4 text-center text-[#271D1D]/70">24-48 hours</td>
                  <td className="p-4 text-center text-[#271D1D]/70">Priority + dedicated</td>
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
