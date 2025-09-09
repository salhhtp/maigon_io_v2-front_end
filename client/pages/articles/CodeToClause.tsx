import { Button } from "@/components/ui/button";
import { ChevronDown, User, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/SupabaseUserContext";

export default function CodeToClause() {
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
                <span>Mar 19, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>7 min read</span>
              </div>
            </div>

            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight mb-6">
              Code to Clause: The Engineering Behind AI's Contract Review
            </h1>

            <div className="w-full h-px bg-[#D6CECE] rounded-full mb-8"></div>
          </header>

          {/* Featured Image */}
          <div className="mb-12">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/c498213c0b4214c6db0aac491c03b8a8739f2f72?width=1200"
              alt="Code to Clause: The Engineering Behind AI's Contract Review"
              className="w-full h-64 lg:h-96 object-cover rounded-lg border border-[#271D1D]/15"
            />
          </div>

          {/* Article Body */}
          <article className="prose prose-lg max-w-none">
            <div className="text-lg leading-relaxed text-[#271D1D] space-y-6">
              <p>
                AI contract review systems combine several advanced technologies
                to automate traditionally manual legal processes. These systems
                work through a sophisticated multi-step workflow that begins
                when a contract is uploaded to the platform.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">
                Document Processing Pipeline
              </h2>

              <p>
                First, Optical Character Recognition (OCR) technology converts
                scanned documents into machine-readable text. This digitized
                content then enters a Natural Language Processing (NLP) pipeline
                where the AI parses the document structure, identifying
                sections, clauses, and hierarchical relationships.
              </p>

              <p>
                The system's language understanding capabilities then extract
                key information using named entity recognition to identify
                parties, dates, monetary values, and locations. More advanced
                systems employ semantic analysis to understand contractual
                obligations, rights, conditions, and termination clauses.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">
                Machine Learning Models
              </h2>

              <p>
                Contract review AI leverages machine learning models trained on
                thousands of legal documents to recognize standard clauses and
                identify unusual provisions. These models compare contract
                language against databases of standard terms, flagging
                deviations that might require attorney attention. The AI
                assesses risk by evaluating clauses against predefined criteria
                and organizational requirements.
              </p>

              <div className="bg-[#F3F3F3] rounded-lg p-6 my-8">
                <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-4">
                  Key Technologies at Work
                </h3>
                <ul className="space-y-2 text-[#271D1D]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#9A7C7C] font-bold">•</span>
                    <span>
                      <strong>OCR Technology:</strong> Converts scanned
                      documents to readable text
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#9A7C7C] font-bold">•</span>
                    <span>
                      <strong>NLP Pipeline:</strong> Parses document structure
                      and relationships
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#9A7C7C] font-bold">•</span>
                    <span>
                      <strong>Named Entity Recognition:</strong> Identifies key
                      information and parties
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#9A7C7C] font-bold">•</span>
                    <span>
                      <strong>Semantic Analysis:</strong> Understands
                      contractual obligations and rights
                    </span>
                  </li>
                </ul>
              </div>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">
                Clause Libraries and Matching
              </h2>

              <p>
                Behind the scenes, these systems maintain clause libraries that
                catalog standard legal language. When reviewing a new contract,
                the AI matches text against these libraries to identify missing
                clauses or suggest improvements. Many platforms use large
                language models to generate explanations of complex legal
                concepts in simpler terms for non-legal stakeholders.
              </p>

              <p>
                The AI creates customizable reports highlighting potential
                issues, risks, and recommendations. Most systems maintain audit
                trails documenting all changes and approval workflows. The
                technology continuously improves through feedback loops - every
                contract review provides new training data to enhance future
                performance.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">
                Integration and Human Collaboration
              </h2>

              <p>
                Modern contract review AI doesn't work in isolation; it
                integrates with contract lifecycle management systems, document
                repositories, and e-signature platforms. While powerful, these
                systems still work best alongside human legal experts who
                provide context, judgment, and strategic decision-making that AI
                currently cannot replicate.
              </p>

              <div className="bg-gradient-to-r from-[#9A7C7C]/10 to-[#B6A5A5]/10 rounded-lg p-6 my-8 border border-[#9A7C7C]/20">
                <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-4">
                  The Future of AI Contract Review
                </h3>
                <p className="text-[#271D1D]">
                  As technology continues to evolve, AI contract review systems
                  are becoming more sophisticated, offering greater accuracy,
                  speed, and integration capabilities. However, the most
                  successful implementations maintain the crucial balance
                  between automated efficiency and human expertise.
                </p>
              </div>
            </div>
          </article>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10">
              <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
                Experience Advanced AI Contract Review
              </h3>
              <p className="text-[#271D1D]/70 mb-6">
                See how Maigon's cutting-edge technology can transform your
                contract review process.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={isLoggedIn ? "/user-solutions" : "/solutions"}>
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3">
                    Try Our Platform
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

              <Link to="/articles/finding-contract-solution" className="group">
                <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/354d86037e54edc0a4f3120d61da3d802119a819?width=400"
                    alt="Finding Contract Solution"
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                  <h4 className="font-lora text-lg font-medium text-[#271D1D] mb-2 group-hover:text-[#9A7C7C] transition-colors">
                    Finding your contract solution: A no-nonsense approach
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    Amid the growing array of AI contract solutions, finding the
                    right fit requires a strategic approach...
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
