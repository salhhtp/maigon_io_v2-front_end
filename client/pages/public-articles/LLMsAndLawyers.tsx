import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { SEO } from "@/components/SEO";
import {
  StructuredData,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
} from "@/components/StructuredData";

export default function PublicLLMsAndLawyers() {
  const articleUrl = "/public-articles/llms-and-lawyers";
  const articleImage =
    "https://api.builder.io/api/v1/image/assets/TEMP/e9cc1c073340e0862fe30d5940c137df82b0ee7e?width=1200";

  const organizationSchema = buildOrganizationSchema({
    name: "Maigon",
    url: "/",
    logo: "/maigon-logo_3.png",
  });

  const articleSchema = buildArticleSchema({
    headline: "LLMs and Lawyers: Collaboration or Competition?",
    description:
      "Exploring how large language models and legal professionals can collaborate for better, faster contract review.",
    url: articleUrl,
    image: articleImage,
    datePublished: "2025-02-10",
    authorName: "Maigon",
    publisherLogo: "/maigon-logo_3.png",
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Articles", url: "/news" },
    { name: "LLMs and Lawyers", url: articleUrl },
  ]);

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <SEO
        title="LLMs and Lawyers: Collaboration or Competition?"
        description="How AI-powered language models and legal professionals work together to deliver faster, more accurate contract review."
        canonicalPath={articleUrl}
        ogImage={articleImage}
        ogType="article"
      />
      <StructuredData data={[organizationSchema, breadcrumbSchema, articleSchema]} />
      {/* Navigation - Always Public */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/solutions"
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors"
          >
            Solutions
          </Link>
          <Link
            to="/public-pricing"
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

        <MobileNavigation isLoggedIn={false} />
      </nav>

      {/* Article Content */}
      <article className="pt-24 lg:pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-8 lg:px-16">
          <header className="mb-12">
            <div className="flex items-center gap-2 text-sm text-[#271D1D]/60 mb-4">
              <span>Published</span>
              <span>•</span>
              <span>Feb 18, 2025</span>
              <span>•</span>
              <span>6 min read</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight mb-6">
              LLMs and Lawyers: A New Partnership in Contract Management
            </h1>
            <p className="text-xl text-[#271D1D]/70 leading-relaxed">
              Exploring how large language models are reshaping legal practice
              and creating new opportunities for legal professionals.
            </p>
          </header>

          <div className="mb-12">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/514bf38fbf249296cea00faa8d72c0d0024ec018?width=1200"
              alt="LLMs and Lawyers: A New Partnership in Contract Management"
              className="w-full h-64 lg:h-96 object-cover rounded-lg"
            />
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4">
              The Rise of Large Language Models
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              Large Language Models (LLMs) represent a breakthrough in
              artificial intelligence that's particularly relevant to legal
              practice. These sophisticated AI systems can understand,
              interpret, and generate human-like text with remarkable accuracy,
              making them powerful tools for contract analysis and legal
              document review.
            </p>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              Unlike traditional rule-based systems, LLMs learn from vast
              amounts of text data, enabling them to grasp nuanced legal
              concepts and terminology that were previously challenging for AI
              systems to handle effectively.
            </p>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Transforming Legal Workflows
            </h2>

            <div className="bg-[#F3F3F3] rounded-lg p-6 mb-6">
              <h3 className="font-medium text-[#271D1D] mb-4">
                Key Applications in Legal Practice
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Document Review
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    Automated analysis of contracts, agreements, and legal
                    documents with human-level comprehension.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Risk Assessment
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    Intelligent identification of potential legal risks and
                    compliance issues across document portfolios.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Legal Research
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    Rapid analysis of case law, statutes, and regulations to
                    support legal arguments and strategies.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Contract Drafting
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    AI-assisted creation of legal documents based on established
                    templates and best practices.
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              The Human-AI Partnership
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              Rather than replacing lawyers, LLMs are creating a powerful
              partnership that augments human expertise. This collaboration
              allows legal professionals to:
            </p>

            <ul className="list-disc pl-6 mb-6 space-y-2 text-[#271D1D]/80">
              <li>
                Focus on high-value strategic work while AI handles routine
                analysis
              </li>
              <li>
                Process larger volumes of documents without compromising quality
              </li>
              <li>
                Identify patterns and insights that might be missed in manual
                review
              </li>
              <li>
                Provide more consistent and comprehensive legal services to
                clients
              </li>
            </ul>

            <blockquote className="border-l-4 border-[#9A7C7C] pl-6 my-8 italic text-[#271D1D]/80">
              "LLMs don't replace legal expertise—they amplify it, enabling
              lawyers to deliver better outcomes for their clients while working
              more efficiently."
            </blockquote>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Challenges and Considerations
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              While LLMs offer tremendous potential, their implementation in
              legal practice requires careful consideration of several factors:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                <h4 className="font-medium text-[#271D1D] mb-3">
                  Quality Assurance
                </h4>
                <ul className="text-sm text-[#271D1D]/70 space-y-2">
                  <li>• Ensuring accuracy in legal interpretation</li>
                  <li>• Maintaining consistency across analyses</li>
                  <li>• Regular model updates and validation</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                <h4 className="font-medium text-[#271D1D] mb-3">
                  Ethical Considerations
                </h4>
                <ul className="text-sm text-[#271D1D]/70 space-y-2">
                  <li>• Client confidentiality and data security</li>
                  <li>• Professional responsibility standards</li>
                  <li>• Transparency in AI-assisted work</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              The Future of Legal Practice
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              As LLM technology continues to advance, we can expect even more
              sophisticated applications in legal practice. The future likely
              holds developments in real-time legal advice, predictive case
              outcome modeling, and seamless integration with existing legal
              software ecosystems.
            </p>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              At Maigon, we're at the forefront of this transformation,
              developing LLM-powered solutions that enhance legal practice while
              maintaining the highest standards of accuracy and professionalism.
            </p>
          </div>

          <div className="mt-16 text-center">
            <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10">
              <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
                Partner with AI for Better Legal Outcomes
              </h3>
              <p className="text-[#271D1D]/70 mb-6">
                Discover how LLM-powered contract analysis can transform your
                legal practice.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signin">
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/solutions">
                  <Button
                    variant="outline"
                    className="text-[#271D1D] border-[#271D1D]/20 px-8 py-3"
                  >
                    Explore AI Solutions
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
