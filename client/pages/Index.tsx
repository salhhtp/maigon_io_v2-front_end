import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Camera, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";

export default function Index() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqData = [
    {
      question: "How do I get started?",
      answer: "Getting started is easy! Our solutions are available out-of-the-box. If you are looking for a one-time contract review, simply upload your contract and receive a comprehensive compliance report in just a few clicks. If you have larger volumes of contracts, contact us to create a corporate account and start using our AI review modules right away, streamlining your contract review process with ease."
    },
    {
      question: "Can I use Maigon without Playbook?",
      answer: "Yes! Our standard solution is available for use right away, even without Playbook. While Playbook allows for more customization of contract review, adjusted to your specific review guidelines, the standard solution is designed to check for the most important compliance aspects and adherence to best practices. Whether you choose to use Playbook or the standard solution, Maigon provides you with valuable insights every time."
    },
    {
      question: "Will you use my data for training?",
      answer: "No, we won't use your data for any other purpose than the intended contract review. We do not use your contract data for AI training or any other service improvements, unless you need us to look into your contract for troubleshooting. You can trust that your data is kept confidential and secure with us."
    },
    {
      question: "Is API available?",
      answer: "Yes! We offer an API that can be used by contract platform vendors and companies with internal contract review tools. Our API is tailored to specific contract types and is designed to be both simple to use and comprehensive, providing advanced AI insights into submitted agreements for compliance. To get started with our API, please contact our team."
    }
  ];

  const contractTypes = [
    {
      title: "Non-Disclosure Agreements",
      description: "Review non-disclosure agreements for compliance with established standards and best practices. Get instant report with compliance insights and extracted clauses."
    },
    {
      title: "Data Processing Agreements",
      description: "Review data processing agreements for compliance with the GDPR and latest EDPB guidelines. Get instant compliance report with extracted clauses, concepts, terms, highlighted risks, and compliance recommendations. Used by large corporate clients with high volumes of DPAs."
    },
    {
      title: "Consultancy Agreements",
      description: "Review consultancy agreements (and other professional services agreements) for compliance with established standards and best practices. Get instant report with insights and extracted clauses."
    },
    {
      title: "Privacy Policy Documents",
      description: "Review privacy statements for compliance with the GDPR criteria. Get instant compliance report with extracted clauses and recommendations. Used most often for reviewing privacy notices of websites, as well as mobile applications published on App Store and Google Play."
    },
    {
      title: "Product Supply Agreements",
      description: "Review product supply agreements for compliance with established standards and best practices. Get instant report with insights and extracted clauses."
    },
    {
      title: "R&D Agreements",
      description: "Conduct compliance review of R&D agreements to ensure adherence to industry standards. Obtain a report on potential compliance risks and recommendations for risk mitigation."
    },
    {
      title: "End User License Agreements",
      description: "Review end user license agreements for compliance with established standards and best practices. Get instant report with insights and extracted clauses. Used most often for reviewing software license agreements."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Logo size="xl" />
        
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
          <Link to="/news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
          <Link to="/team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>
          <Button asChild className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg">
            <Link to="/signin">Sign In/Up</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center justify-between px-8 lg:px-16 py-12 lg:py-20 max-w-7xl mx-auto">
        <div className="flex-1 lg:pr-12 mb-12 lg:mb-0">
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-medium leading-tight">
              <span className="text-[#171614] font-lora">Experience the power of</span>
              <br />
              <span className="text-[#9A7C7C] font-lora">AI-Driven</span>
              <br />
              <span className="text-[#171614] font-lora">contract review</span>
            </h1>
          </div>
          
          <p className="text-[#171614] text-lg leading-relaxed mb-8 max-w-lg">
            Efficiency is the key to closing deals fast. Our AI contract review tools screen agreements, answer legal questions, and provide guidance for finalizing contracts in record time.
          </p>
          
          <Button className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-10 py-6 text-xl rounded-lg">
            Try for free
          </Button>
        </div>
        
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="bg-white rounded-lg border border-[#271D1D]/15 p-16 lg:p-20 flex items-center justify-center w-full max-w-md aspect-square">
            <Camera className="w-32 h-32 lg:w-40 lg:h-40 text-[#1E1E1E] stroke-1" />
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="px-8 lg:px-16 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#271D1D] text-lg mb-4">Solutions</p>
            <h2 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora leading-tight">
              State-Of-The-Art AI for Legal Review
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-20">
            {/* Card 1 */}
            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden">
              <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                <div className="w-32 h-32 rounded-full border-2 border-[#271D1D] flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">73%</span>
                </div>
              </div>
              <CardContent className="p-6 text-center">
                <CardTitle className="text-xl font-medium mb-4 font-lora">Learn Your Compliance Score</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Our machine learning algorithms are trained to give you the full look on what you need to know the most from your agreements.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden">
              <div className="h-80 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="w-8 h-8 transform rotate-45 bg-black"></div>
              </div>
              <CardContent className="p-6 text-center">
                <CardTitle className="text-xl font-medium mb-4 font-lora">Review From Different Perspectives</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  You can choose to review your document/s from the "Data Subject" or "Organization" perspective to get tailored analysis of your document.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden">
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/7c87d01d9be178b894e267d4b9d0734052823086?width=916" 
                alt="Full Summary"
                className="w-full h-80 object-cover"
              />
              <CardContent className="p-6 text-center">
                <CardTitle className="text-xl font-medium mb-4 font-lora">Full Summary</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Nothing's out of sight! Every member has access to the fully summary and more key insights for their documents.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Card 4 */}
            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden">
              <div className="h-80 bg-[#B3BBB3] flex items-center justify-center">
                <img 
                  src="https://api.builder.io/api/v1/image/assets/TEMP/8cfe4c4f940f1afd5a3eb4c4cc5773dcf04b118a?width=1411" 
                  alt="Laptop"
                  className="w-full h-full object-contain"
                />
              </div>
              <CardContent className="p-6 text-center">
                <CardTitle className="text-xl font-medium mb-4 font-lora">See All The Risks</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Find out all the issues that needs to be addressed in your documents.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* OpenAI Integration Card */}
          <div className="flex justify-center mb-20">
            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden max-w-md">
              <div className="h-80 bg-[#D6CECE] flex items-center justify-center p-12">
                <img 
                  src="https://api.builder.io/api/v1/image/assets/TEMP/36565312d2d6200939ff336eb31f7d63d829ac13?width=722" 
                  alt="OpenAI"
                  className="w-full h-auto"
                />
              </div>
              <CardContent className="p-6 text-center">
                <CardTitle className="text-xl font-medium mb-4 font-lora">OpenAI Integration</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-[#313832]">
                  All of our products integrate the latest deep learning technology to ensure maximum accuracy and efficiency.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Contract Types Section */}
          <div className="text-center mb-12">
            <h3 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-6">One-For-Each!</h3>
            <p className="text-xl text-center max-w-3xl mx-auto">
              Enjoy Maigon for all your agreements with industry leading <strong>SEVEN</strong> different, AI models that are each tailor made for any agreement you'd want to review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-20">
            {contractTypes.map((type, index) => (
              <div key={index} className="border-t border-[#D6CECE] pt-4">
                <h4 className="font-bold text-[#271D1D] text-center mb-4 text-sm leading-tight">
                  {type.title}
                </h4>
                <p className="text-xs text-[#271D1D] leading-relaxed">
                  {type.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section id="news" className="px-8 lg:px-16 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#271D1D] text-lg mb-4">News</p>
            <h2 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora">
              Stay up-to-date with everything.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden">
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/defadcd8445be3dc8712f81677c887b3ef4db62b?width=820" 
                alt="News article"
                className="w-full h-64 object-cover"
              />
              <CardContent className="p-6">
                <div className="flex flex-col space-y-1 mb-4">
                  <span className="text-xs font-medium text-[#271D1D]">Published</span>
                  <span className="text-xs text-[#271D1D] font-lora">Feb 24, 2025</span>
                </div>
                <CardTitle className="text-2xl font-medium font-lora leading-tight">
                  Smarter Legal Solutions: How Maigon is Redefining Contract Review
                </CardTitle>
              </CardContent>
            </Card>

            <Card className="border border-[#271D1D]/15 rounded-lg overflow-hidden">
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/c498213c0b4214c6db0aac491c03b8a8739f2f72?width=820" 
                alt="News article"
                className="w-full h-64 object-cover"
              />
              <CardContent className="p-6">
                <div className="flex flex-col space-y-1 mb-4">
                  <span className="text-xs font-medium text-[#271D1D]">Published</span>
                  <span className="text-xs text-[#271D1D] font-lora">Mar 19, 2025</span>
                </div>
                <CardTitle className="text-2xl font-medium font-lora leading-tight">
                  Code to Clause: The Engineering Behind AI's Contract Review
                </CardTitle>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-8 lg:px-16 py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-2xl lg:text-4xl font-lora text-black mb-8 leading-relaxed">
            "DPA AI makes review of data processing agreements much faster."
          </blockquote>
          <cite className="text-[#271D1D] text-lg">
            Sara Edlund, General Counsel at Dustin Group
          </cite>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-8 lg:px-16 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <div key={index} className="border border-[#725A5A]/15 rounded-lg bg-[#725A5A]/3">
                <button
                  className="w-full flex items-center justify-between p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <h3 className="text-xl lg:text-2xl font-semibold text-[#725A5A]">
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={`w-6 h-6 text-[#725A5A] transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-lg lg:text-xl text-[#725A5A] leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 lg:px-16 py-16 bg-[#F9F8F8]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <Logo size="md" className="mb-6" />
              <address className="text-[#271D1D] text-sm leading-relaxed not-italic">
                Maigon AB<br />
                c/o Synch Advokat AB<br />
                Box 3631<br />
                103 59 Stockholm, Sweden
              </address>
            </div>

            <div className="flex flex-col justify-center items-end">
              <h4 className="text-[#9A7C7C] font-lora text-sm mb-4">Overview</h4>
              <ul className="space-y-2 text-sm text-[#271D1D]">
                <li><a href="#solutions" className="hover:text-[#9A7C7C] transition-colors">Solutions</a></li>
                <li><Link to="/news" className="hover:text-[#9A7C7C] transition-colors">News</Link></li>
                <li><Link to="/team" className="hover:text-[#9A7C7C] transition-colors">Team</Link></li>
              </ul>
            </div>

            <div className="flex flex-col justify-center items-end">
              <h4 className="text-[#9A7C7C] font-lora text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-[#271D1D]">
                <li><a href="#" className="hover:text-[#9A7C7C] transition-colors">Terms of Use</a></li>
                <li><a href="#" className="hover:text-[#9A7C7C] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#9A7C7C] transition-colors">Cookies Policy</a></li>
              </ul>
            </div>

            <div className="flex flex-col justify-center items-end mb-10">
              <h4 className="text-[#9A7C7C] font-lora text-sm mx-3 my-0">Socials</h4>
              <ul className="space-y-2 text-sm text-[#271D1D]">
                <li className="pt-2"><a href="#" className="hover:text-[#9A7C7C] transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-[#9A7C7C] transition-colors">Gmail</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
