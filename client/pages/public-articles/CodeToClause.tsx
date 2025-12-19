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

export default function PublicCodeToClause() {
  const articleUrl = "/public-articles/code-to-clause";
  const articleImage =
    "https://api.builder.io/api/v1/image/assets/TEMP/c498213c0b4214c6db0aac491c03b8a8739f2f72?width=1200";

  const organizationSchema = buildOrganizationSchema({
    name: "Maigon",
    url: "/",
    logo: "/maigon-logo_3.png",
  });

  const articleSchema = buildArticleSchema({
    headline: "Code to Clause: The Engineering Behind AI's Contract Review",
    description:
      "Inside the technical architecture and engineering innovations that power Maigon's AI contract analysis.",
    url: articleUrl,
    image: articleImage,
    datePublished: "2025-02-20",
    authorName: "Maigon",
    publisherLogo: "/maigon-logo_3.png",
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Articles", url: "/news" },
    { name: "Code to Clause", url: articleUrl },
  ]);

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      <SEO
        title="Code to Clause: The Engineering Behind AI's Contract Review"
        description="Explore how Maigon engineers AI-driven contract review, from data pipelines to compliance-grade outputs."
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

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={false} />
      </nav>

      {/* Article Content */}
      <article className="pt-24 lg:pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-8 lg:px-16">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-2 text-sm text-[#271D1D]/60 mb-4">
              <span>Published</span>
              <span>•</span>
              <span>Feb 20, 2025</span>
              <span>•</span>
              <span>7 min read</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight mb-6">
              Code to Clause: The Engineering Behind AI's Contract Review
            </h1>
            <p className="text-xl text-[#271D1D]/70 leading-relaxed">
              Dive deep into the technical architecture and engineering
              innovations that power modern AI-driven contract analysis systems.
            </p>
          </header>

          {/* Featured Image */}
          <div className="mb-12">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/c498213c0b4214c6db0aac491c03b8a8739f2f72?width=1200"
              alt="Code to Clause: The Engineering Behind AI's Contract Review"
              className="w-full h-64 lg:h-96 object-cover rounded-lg"
            />
          </div>

          {/* Article Body */}
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4">
              The Architecture of Intelligence
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              Behind every successful AI contract review lies a sophisticated
              engineering architecture designed to handle the complexity and
              nuance of legal language. At Maigon, our engineering team has
              developed a multi-layered system that combines cutting-edge
              natural language processing with domain-specific legal expertise.
            </p>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              The journey from raw contract text to actionable insights involves
              multiple stages of processing, each optimized for accuracy, speed,
              and reliability. Understanding this technical foundation helps
              explain why AI-powered contract review delivers such
              transformative results.
            </p>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Natural Language Processing Pipeline
            </h2>

            <div className="bg-[#F3F3F3] rounded-lg p-6 mb-6">
              <h3 className="font-medium text-[#271D1D] mb-4">
                Core Processing Stages
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#9A7C7C] text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-[#271D1D] mb-1">
                      Document Parsing
                    </h4>
                    <p className="text-sm text-[#271D1D]/70">
                      Intelligent extraction and structure recognition from
                      various document formats
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#9A7C7C] text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-[#271D1D] mb-1">
                      Semantic Analysis
                    </h4>
                    <p className="text-sm text-[#271D1D]/70">
                      Deep understanding of legal concepts and clause
                      relationships
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#9A7C7C] text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-[#271D1D] mb-1">
                      Risk Assessment
                    </h4>
                    <p className="text-sm text-[#271D1D]/70">
                      Automated identification of potential compliance and legal
                      risks
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#9A7C7C] text-white rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-[#271D1D] mb-1">
                      Report Generation
                    </h4>
                    <p className="text-sm text-[#271D1D]/70">
                      Comprehensive insights compiled into actionable
                      recommendations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Machine Learning Models
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              Our AI system employs multiple specialized machine learning
              models, each trained for specific aspects of contract analysis:
            </p>

            <ul className="list-disc pl-6 mb-6 space-y-2 text-[#271D1D]/80">
              <li>
                <strong>Classification Models:</strong> Identify contract types
                and categorize clauses
              </li>
              <li>
                <strong>Named Entity Recognition:</strong> Extract parties,
                dates, monetary values, and key terms
              </li>
              <li>
                <strong>Sentiment Analysis:</strong> Assess the favorability of
                contract terms
              </li>
              <li>
                <strong>Compliance Checkers:</strong> Verify adherence to
                specific regulations like GDPR
              </li>
              <li>
                <strong>Risk Scoring:</strong> Quantify potential legal and
                business risks
              </li>
            </ul>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Training Data and Quality Assurance
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              The accuracy of AI contract review depends heavily on the quality
              and comprehensiveness of training data. Our approach to data
              curation involves:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                <h4 className="font-medium text-[#271D1D] mb-3">
                  Data Sources
                </h4>
                <ul className="text-sm text-[#271D1D]/70 space-y-2">
                  <li>• Anonymized real-world contracts</li>
                  <li>• Legal precedents and case law</li>
                  <li>• Regulatory compliance databases</li>
                  <li>• Industry-specific templates</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10">
                <h4 className="font-medium text-[#271D1D] mb-3">
                  Quality Control
                </h4>
                <ul className="text-sm text-[#271D1D]/70 space-y-2">
                  <li>• Legal expert validation</li>
                  <li>• Continuous model refinement</li>
                  <li>• Cross-validation testing</li>
                  <li>• Performance monitoring</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Scalability and Performance
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              Engineering an AI system that can handle varying document
              complexities and volumes requires careful attention to
              scalability. Our infrastructure includes:
            </p>

            <blockquote className="border-l-4 border-[#9A7C7C] pl-6 my-8 italic text-[#271D1D]/80">
              "The challenge isn't just making AI understand contracts—it's
              making it understand them consistently, accurately, and at scale."
            </blockquote>

            <div className="bg-[#F3F3F3] rounded-lg p-6 mb-6">
              <h3 className="font-medium text-[#271D1D] mb-4">
                Technical Specifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Processing Speed
                  </h4>
                  <p className="text-[#271D1D]/70">
                    Average contract analysis completed in under 2 minutes
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Accuracy Rate
                  </h4>
                  <p className="text-[#271D1D]/70">
                    95%+ accuracy in clause identification and risk assessment
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-[#271D1D] mb-2">
                    Language Support
                  </h4>
                  <p className="text-[#271D1D]/70">
                    50+ languages with multilingual contract handling
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-medium text-[#271D1D] font-lora mb-4 mt-8">
              Future Developments
            </h2>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              The field of AI contract review continues to evolve rapidly.
              Emerging technologies like transformer architectures and few-shot
              learning are opening new possibilities for even more sophisticated
              contract analysis capabilities.
            </p>

            <p className="text-[#271D1D]/80 leading-relaxed mb-6">
              At Maigon, we're continuously researching and implementing these
              advances to ensure our platform remains at the cutting edge of
              legal technology innovation.
            </p>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-lg p-8 border border-[#271D1D]/10">
              <h3 className="font-lora text-2xl font-medium text-[#271D1D] mb-4">
                Experience Advanced AI Contract Analysis
              </h3>
              <p className="text-[#271D1D]/70 mb-6">
                See how our engineering innovations translate into practical
                benefits for your legal practice.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signin">
                  <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 py-3">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/public-pricing">
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
            <h3 className="text-xl font-medium text-[#271D1D] font-lora mb-6">
              Related Articles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link
                to="/public-articles/smarter-legal-solutions"
                className="group"
              >
                <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/defadcd8445be3dc8712f81677c887b3ef4db62b?width=400"
                    alt="Smarter Legal Solutions"
                    className="w-full h-32 object-cover rounded mb-4"
                  />
                  <h4 className="font-medium text-[#271D1D] mb-2 group-hover:text-[#9A7C7C] transition-colors">
                    Smarter Legal Solutions: How Maigon is Redefining Contract
                    Review
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    Discover how AI is transforming the legal industry.
                  </p>
                </div>
              </Link>

              <Link
                to="/public-articles/finding-contract-solution"
                className="group"
              >
                <div className="bg-white rounded-lg p-6 border border-[#271D1D]/10 hover:border-[#9A7C7C]/50 transition-colors">
                  <img
                    src="https://api.builder.io/api/v1/image/assets/TEMP/354d86037e54edc0a4f3120d61da3d802119a819?width=400"
                    alt="Finding Contract Solution"
                    className="w-full h-32 object-cover rounded mb-4"
                  />
                  <h4 className="font-medium text-[#271D1D] mb-2 group-hover:text-[#9A7C7C] transition-colors">
                    Finding Your Contract Solution: A No-Nonsense Approach
                  </h4>
                  <p className="text-sm text-[#271D1D]/70">
                    A practical guide to choosing the right contract review
                    solution.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
