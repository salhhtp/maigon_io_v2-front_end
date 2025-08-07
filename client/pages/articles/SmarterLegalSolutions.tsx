import { Button } from "@/components/ui/button";
import { ChevronDown, User, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";

export default function SmarterLegalSolutions() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, isLoggedIn } = useUser();

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
                  <Link
                    to="/"
                    className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                  >
                    Log Out
                  </Link>
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
                <span>Feb 24, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>5 min read</span>
              </div>
            </div>

            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight mb-6">
              Smarter Legal Solutions: How Maigon is Redefining Contract Review
            </h1>

            <div className="w-full h-px bg-[#D6CECE] rounded-full mb-8"></div>
          </header>

          {/* Featured Image */}
          <div className="mb-12">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/defadcd8445be3dc8712f81677c887b3ef4db62b?width=1200"
              alt="Smarter Legal Solutions"
              className="w-full h-64 lg:h-96 object-cover rounded-lg border border-[#271D1D]/15"
            />
          </div>

          {/* Article Body */}
          <article className="prose prose-lg max-w-none">
            <div className="text-lg leading-relaxed text-[#271D1D] space-y-6">
              <p>
                The legal sector is experiencing changes due to technological
                advancements, moving from manual processes to tools that use
                technology capable of understanding context. This transition,
                driven by developments in language processing and
                general-purpose intelligence, is changing how contracts are
                analyzed and managed.
              </p>

              <p>
                Maigon is gradually working toward embracing this change,
                developing tools and solutions that align with the evolving
                needs of the legal industry. Its contract review solutions are
                designed to meet the increasing demands of modern legal teams,
                particularly within the EU's complex regulatory environment. Its
                platform uses proprietary models to provide in-depth analysis,
                going beyond identifying clauses to understand how different
                contract elements interact within frameworks such as GDPR.
              </p>

              <div className="bg-[#F3F3F3] rounded-lg p-6 my-8 border-l-4 border-[#9A7C7C]">
                <p className="text-[#271D1D] italic font-medium">
                  "This has dramatically reduced the time we spend going through
                  each NDA, allowing our small legal team to prioritize our
                  resources on more demanding and interesting legal work."
                </p>
                <p className="text-[#271D1D]/70 text-sm mt-2">— Maigon User</p>
              </div>

              <p>
                The impact of this approach is evident, as it has significantly
                enhanced the contract review process. One of our users explains
                how the platform has transformed their workflow and allowed
                their team to focus on higher-value legal work.
              </p>

              <p>
                Looking ahead to 2025, Maigon's platform offers deployment
                without the need for extensive training, supports over 50
                languages, and handles bilingual contracts, making it ideal for
                EU organizations operating in global markets. Custom Playbooks
                allow companies to integrate their internal policies directly
                into the system, ensuring consistent application of standards.
              </p>

              <div className="bg-[#F3F3F3] rounded-lg p-6 my-8 border-l-4 border-[#9A7C7C]">
                <p className="text-[#271D1D] italic font-medium">
                  "DPA AI makes review of data processing agreements much
                  faster."
                </p>
                <p className="text-[#271D1D]/70 text-sm mt-2">— Maigon User</p>
              </div>

              <p>
                As systems become more advanced in understanding legal context,
                Maigon ensures compliance by continuously updating its platform
                to reflect changes in legislation and case law. Its ability to
                assess risks proactively, extract critical information, and
                analyze patterns transforms contract review from a
                time-consuming process into a strategic advantage.
              </p>

              <p>
                As technology continues to evolve, Maigon is prepared to adapt
                while maintaining its focus on practical solutions and
                compliance with EU regulations. For legal teams in this changing
                landscape, Maigon provides tools to enhance efficiency,
                accuracy, and strategic decision-making in contract management.
              </p>
            </div>
          </article>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10">
              <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
                Ready to Transform Your Contract Review Process?
              </h3>
              <p className="text-[#271D1D]/70 mb-6">
                Experience the power of AI-driven contract analysis with
                Maigon's advanced platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={isLoggedIn ? "/user-solutions" : "/solutions"}>
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3">
                    Explore Solutions
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20 px-8 py-3"
                  >
                    View Pricing
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
              <Link to="/articles/code-to-clause" className="group">
                <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/c498213c0b4214c6db0aac491c03b8a8739f2f72?width=400"
                    alt="Code to Clause"
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h4 className="font-lora text-lg font-medium text-[#271D1D] mb-2 group-hover:text-[#9A7C7C] transition-colors">
                    Code to Clause: The Engineering Behind AI's Contract Review
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    AI contract review systems combine several advanced
                    technologies to automate traditionally manual legal
                    processes...
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
