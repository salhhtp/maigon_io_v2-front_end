import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  User,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";

export default function FindingContractSolution() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, isLoggedIn, logout } = useUser();

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to={isLoggedIn ? "/home" : "/"}>
          <Logo size="xl" />
        </Link>

        {isLoggedIn ? (
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
                  @{user?.name.split(" ")[0]}
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
        ) : (
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/solutions"
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
              to="/news"
              className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
            >
              News
            </Link>
            <Link
              to="/team"
              className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
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

      {/* Article Content */}
      <main className="pt-24 lg:pt-32 pb-20 px-8 lg:px-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Link
              to={isLoggedIn ? "/user-news" : "/news"}
              className="inline-flex items-center gap-2 text-[#9A7C7C] hover:text-[#271D1D] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to News
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-12">
            <div className="flex items-center gap-4 text-sm text-[#271D1D]/70 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Mar 24, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>4 min read</span>
              </div>
            </div>

            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight mb-6">
              Finding your contract solution: A no-nonsense approach
            </h1>

            <div className="w-full h-px bg-[#D6CECE] rounded-full mb-8"></div>
          </header>

          {/* Featured Image */}
          <div className="mb-12">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/354d86037e54edc0a4f3120d61da3d802119a819?width=1200"
              alt="Finding your contract solution: A no-nonsense approach"
              className="w-full h-64 lg:h-96 object-cover rounded-lg border border-[#271D1D]/15"
            />
          </div>

          {/* Article Body */}
          <article className="prose prose-lg max-w-none">
            <div className="text-lg leading-relaxed text-[#271D1D] space-y-6">
              <p>
                Amid the growing array of AI contract solutions, finding the
                right fit requires a strategic approach focused on practical
                value rather than technological hype. Legal professionals need a
                clear framework to cut through the noise and identify tools that
                deliver genuine results.
              </p>

              <div className="bg-gradient-to-r from-[#9A7C7C]/10 to-[#B6A5A5]/10 rounded-lg p-6 my-8 border border-[#9A7C7C]/20">
                <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-4">
                  5 Essential Steps to Remember
                </h3>
                <p className="text-[#271D1D]">
                  Here are the key considerations when choosing the right
                  contract review tool for your legal practice.
                </p>
              </div>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6 flex items-center gap-3">
                <span className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
                  1
                </span>
                Start with your workflow challenges
              </h2>

              <p>
                Map your specific contract management pain points before
                exploring solutions. Whether you're handling real estate leases,
                energy agreements, or M&A documentation, identify where
                technology could most effectively reduce bottlenecks and improve
                outcomes in your practice area.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6 flex items-center gap-3">
                <span className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
                  2
                </span>
                Test with your own documents
              </h2>

              <p>
                Request demonstrations using your actual contracts rather than
                vendor samples. Evaluate how effectively the software identifies
                key provisions, extracts critical data, and flags potential
                issues in documents relevant to your practice. Real-world
                performance matters more than feature lists.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6 flex items-center gap-3">
                <span className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
                  3
                </span>
                Evaluate the learning curve
              </h2>

              <p>
                The most powerful software becomes worthless if your team
                abandons it. Look for intuitive interfaces that require minimal
                training and integrate with tools your team already uses.
                Solutions that work alongside your existing document management
                system typically see higher adoption rates.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6 flex items-center gap-3">
                <span className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
                  4
                </span>
                Calculate true implementation costs
              </h2>

              <p>
                Consider the full implementation picture beyond subscription
                fees. Some solutions require extensive document preparation or
                custom configuration that creates hidden costs. Pre-configured
                systems with minimal setup requirements often provide faster
                returns despite potentially higher initial pricing.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6 flex items-center gap-3">
                <span className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
                  5
                </span>
                Seek proven expertise
              </h2>

              <p>
                With numerous new entrants in the market, prioritize vendors
                with demonstrated legal expertise and a track record of reliable
                service. The most effective solutions are developed by teams
                that combine technical capabilities with a deep understanding of
                legal workflows and requirements.
              </p>

              <div className="bg-[#F3F3F3] rounded-lg p-6 my-8 border-l-4 border-[#9A7C7C]">
                <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-4">
                  Key Evaluation Criteria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9A7C7C]" />
                      <span className="text-sm text-[#271D1D]">
                        Real-world testing capabilities
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9A7C7C]" />
                      <span className="text-sm text-[#271D1D]">
                        Intuitive user interface
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9A7C7C]" />
                      <span className="text-sm text-[#271D1D]">
                        Integration with existing tools
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9A7C7C]" />
                      <span className="text-sm text-[#271D1D]">
                        Transparent pricing structure
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9A7C7C]" />
                      <span className="text-sm text-[#271D1D]">
                        Proven legal expertise
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9A7C7C]" />
                      <span className="text-sm text-[#271D1D]">
                        Reliable customer support
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">
                The Human Element Remains Essential
              </h2>

              <p>
                Though technology advances rapidly, lawyers won't be replaced.
                Today's tools can analyse contracts but can't match human legal
                judgment and strategy. The future belongs to professionals who
                combine their expertise with new technology while providing the
                personalized insight that clients truly need.
              </p>

              <p>
                The most successful legal practices will be those that
                thoughtfully integrate AI tools to enhance rather than replace
                human expertise, creating a partnership that delivers superior
                results for clients while improving efficiency and job
                satisfaction for legal professionals.
              </p>
            </div>
          </article>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10">
              <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
                Ready to Find Your Perfect Contract Solution?
              </h3>
              <p className="text-[#271D1D]/70 mb-6">
                Test Maigon's proven AI contract review platform with your own
                documents.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={isLoggedIn ? "/user-solutions" : "/signin"}>
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20 px-8 py-3"
                  >
                    View Pricing Plans
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-16">
            <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-8">
              Related Articles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link to="/articles/smarter-legal-solutions" className="group">
                <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/defadcd8445be3dc8712f81677c887b3ef4db62b?width=400"
                    alt="Smarter Legal Solutions"
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h4 className="font-lora text-lg font-medium text-[#271D1D] mb-2 group-hover:text-[#9A7C7C] transition-colors">
                    Smarter Legal Solutions: How Maigon is Redefining Contract
                    Review
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    The legal sector is experiencing changes due to
                    technological advancements, moving from manual processes...
                  </p>
                </div>
              </Link>

              <Link to="/articles/llms-and-lawyers" className="group">
                <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/514bf38fbf249296cea00faa8d72c0d0024ec018?width=400"
                    alt="LLMs and Lawyers"
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h4 className="font-lora text-lg font-medium text-[#271D1D] mb-2 group-hover:text-[#9A7C7C] transition-colors">
                    LLMs and Lawyers: A New Partnership in Contract Management
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    The legal industry is undergoing a major shift as Large
                    Language Models change the way contract review is done...
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
