import { Button } from "@/components/ui/button";
import { ChevronDown, User, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";

export default function LLMsAndLawyers() {
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
            <Link to="/user-solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
            <Link to="/user-news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
            <Link to="/user-team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>

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
            <Button asChild className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg">
              <Link to="/signin">Sign In/Up</Link>
            </Button>
          </div>
        )}

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={isLoggedIn} userName={user?.name.split(' ')[0]} />
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
                <span>Feb 26, 2025</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>6 min read</span>
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight mb-6">
              LLMs and Lawyers: A New Partnership in Contract Management
            </h1>
            
            <div className="w-full h-px bg-[#D6CECE] rounded-full mb-8"></div>
          </header>

          {/* Featured Image */}
          <div className="mb-12">
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/514bf38fbf249296cea00faa8d72c0d0024ec018?width=1200" 
              alt="LLMs and Lawyers: A New Partnership in Contract Management"
              className="w-full h-64 lg:h-96 object-cover rounded-lg border border-[#271D1D]/15"
            />
          </div>

          {/* Article Body */}
          <article className="prose prose-lg max-w-none">
            <div className="text-lg leading-relaxed text-[#271D1D] space-y-6">
              <p>
                The legal industry is undergoing a major shift as Large Language Models (LLMs) change the way contract review is done, setting new standards for speed and accuracy. This development, driven by advanced AI capabilities and performance metrics, is fundamentally reshaping how legal professionals approach document analysis and risk assessment.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">The New Benchmarking Landscape</h2>

              <p>
                The benchmarking landscape for contract review has shifted from manual review to focusing more on speed, accuracy, and thoroughness. Modern LLMs handle everything from simple NDAs to complex commercial agreements, identifying risks and ensuring compliance with precision. This allows legal teams to move away from time-consuming manual reviews and adopt workflows where AI handles the heavy lifting, leaving lawyers to focus on critical decisions.
              </p>

              <div className="bg-gradient-to-r from-[#9A7C7C]/10 to-[#B6A5A5]/10 rounded-lg p-6 my-8 border border-[#9A7C7C]/20">
                <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-4">AI-Powered Workflow Transformation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 font-bold">1</div>
                    <p className="font-medium text-[#271D1D]">Quick Initial Scan</p>
                    <p className="text-[#271D1D]/70">AI performs rapid document analysis</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 font-bold">2</div>
                    <p className="font-medium text-[#271D1D]">Detailed Analysis</p>
                    <p className="text-[#271D1D]/70">Deep dive into key sections</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-[#9A7C7C] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2 font-bold">3</div>
                    <p className="font-medium text-[#271D1D]">Lawyer Review</p>
                    <p className="text-[#271D1D]/70">Final human oversight and strategy</p>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">Real-World Impact</h2>

              <p>
                The benefits of these tools are clear in real-world use. For example, a 100-page commercial contract that used to take days to review can now be processed in three steps: a quick initial scan, a detailed analysis of key sections, and a final review by a lawyer. This approach saves time while ensuring accuracy, with human oversight remaining a key part of the process.
              </p>

              <p>
                Looking ahead to 2025, LLMs are expected to handle even more complex tasks, like reviewing multi-jurisdictional contracts and industry-specific agreements. They can cross-check terms with internal guidelines and regulations, flagging issues and suggesting changes. This technology allows lawyers to focus on strategy and problem-solving instead of routine document work.
              </p>

              <h2 className="text-2xl font-lora font-medium text-[#271D1D] mt-12 mb-6">The Future of Legal Practice</h2>

              <p>
                As LLMs continue to improve, regular testing and benchmarking help ensure legal teams are using the best tools for their needs. For lawyers, AI-powered contract review isn't just about saving time, it's about combining technology and expertise to deliver better, more consistent results in contract management.
              </p>

              <div className="bg-[#F3F3F3] rounded-lg p-6 my-8 border-l-4 border-[#9A7C7C]">
                <h3 className="font-lora text-xl font-medium text-[#271D1D] mb-4">Key Benefits of LLM Integration</h3>
                <ul className="space-y-3 text-[#271D1D]">
                  <li className="flex items-start gap-3">
                    <span className="text-[#9A7C7C] font-bold text-lg">•</span>
                    <div>
                      <strong>Speed Enhancement:</strong> 100-page contracts reviewed in hours instead of days
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#9A7C7C] font-bold text-lg">•</span>
                    <div>
                      <strong>Accuracy Improvement:</strong> Consistent identification of risks and compliance issues
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#9A7C7C] font-bold text-lg">•</span>
                    <div>
                      <strong>Strategic Focus:</strong> Lawyers can focus on high-value decision-making
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#9A7C7C] font-bold text-lg">•</span>
                    <div>
                      <strong>Multi-jurisdictional Support:</strong> Handle complex international agreements
                    </div>
                  </li>
                </ul>
              </div>

              <p>
                The transformation of the legal industry through LLMs represents a fundamental shift in how legal professionals work. Rather than replacing lawyers, these technologies amplify their capabilities, allowing them to deliver more value to clients while maintaining the critical human judgment that defines excellent legal practice.
              </p>
            </div>
          </article>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10">
              <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
                Partner with AI for Better Contract Management
              </h3>
              <p className="text-[#271D1D]/70 mb-6">
                Discover how Maigon's LLM-powered platform can enhance your legal practice.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={isLoggedIn ? "/user-solutions" : "/solutions"}>
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3">
                    Explore AI Solutions
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" className="text-[#271D1D] border-[#271D1D]/20 px-8 py-3">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-16">
            <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-8">Related Articles</h3>
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
                    AI contract review systems combine several advanced technologies to automate traditionally manual legal processes...
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
                    Amid the growing array of AI contract solutions, finding the right fit requires a strategic approach...
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
