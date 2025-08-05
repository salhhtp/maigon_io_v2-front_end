import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Camera, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedQuotes from "@/components/AnimatedQuotes";
import ContractCardsAnimation from "@/components/ContractCardsAnimation";
import MobileNavigation from "@/components/MobileNavigation";







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
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
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
      <section className="flex flex-col lg:flex-row justify-center items-center gap-8 lg:gap-[67px] px-8 lg:px-16 py-12 lg:py-20 max-w-[1270px] mx-auto pt-24 lg:pt-32">
        <div className="flex flex-col items-start gap-6 lg:gap-[71px] w-full lg:w-[579px] mb-8 lg:mb-0 flex-shrink-0">
          <div className="flex flex-col items-start gap-8 lg:gap-[137px] w-full">
            <div className="flex flex-col items-start gap-2 lg:gap-[17px] w-full">
              <h1 className="w-full h-8 lg:h-16 text-[#171614] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[72px]">
                Experience the power of
              </h1>
              <h1 className="w-full h-8 lg:h-16 text-[#9A7C7C] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[72px]">
                AI-Driven
              </h1>
              <h1 className="w-full h-8 lg:h-16 text-[#171614] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[72px]">
                contract review
              </h1>
            </div>
            <div className="flex justify-center items-center gap-2.5 p-2.5">
              <p className="w-full lg:w-[458px] text-[#171614] font-roboto text-sm lg:text-base font-normal leading-relaxed lg:leading-[30px] tracking-[0.16px]">
                Efficiency is the key to closing deals fast. Our AI contract review tools screen agreements, answer legal questions, and provide guidance for finalizing contracts in record time.
              </p>
            </div>
          </div>
          <Button className="flex py-3 px-10 justify-center items-center gap-2.5 rounded-xl bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-[#F9F8F8] text-center font-roboto text-lg lg:text-xl font-normal leading-6 tracking-[0.2px]">
            Try for free
          </Button>
        </div>

        <div className="flex py-32 lg:py-[214px] px-16 lg:px-[122px] items-center gap-2.5 bg-white w-full lg:w-auto rounded-lg border border-[#271D1D]/15">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/ee4cddf9ea0f3a0dccdc24e4e7e8b76698d62ba8?width=758"
            alt="Camera"
            className="w-full h-auto lg:w-[379px] lg:h-[403px] flex justify-center items-center"
          />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-20 place-items-center">
            {/* Card 1 */}
            <div className="flex flex-col items-center relative w-full max-w-md">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/e33365b24a4962ef5c0529d0c37ac13af63f6f48?width=916"
                alt="Compliance Dashboard Interface"
                className="w-full h-80 object-cover border border-[#271D1D]/15 rounded-lg"
              />

              {/* Card Description */}
              <div className="flex flex-col items-center w-full relative mt-4">
                <div className="flex h-[89px] flex-col justify-center w-full text-black text-center font-lora text-xl font-medium leading-[90px] relative">
                  <span>Learn Your Compliance Score</span>
                </div>
                <div className="w-full text-black text-center text-xs font-normal leading-[26px] tracking-[0.12px] relative">
                  <span>Our machine learning algorithms are trained to give you the full look on what you need to know the most from your agreements.</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col items-center relative w-full max-w-md">
              <div
                className="flex justify-between items-center px-24 py-14 w-full h-80 border border-[#271D1D]/15 rounded-lg relative bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://api.builder.io/api/v1/image/assets/TEMP/2a007dd35a383d1ae8dd9a022fe6283585484de4?width=916')`,
                  backgroundPosition: 'center center',
                  backgroundSize: 'cover'
                }}
              >
                <div className="w-8 h-8 p-2 flex flex-col items-start gap-2"></div>
                <svg
                  className="flex p-1 items-center gap-2"
                  width="31"
                  height="31"
                  viewBox="0 0 31 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.375 4.14062L13.8017 26.7673L17.1483 16.914L27.0017 13.5673L4.375 4.14062Z"
                    fill="black"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Card Description */}
              <div className="flex flex-col items-center w-full relative mt-4">
                <div className="flex h-[89px] flex-col justify-center w-full text-black text-center font-lora text-xl font-medium leading-[90px] relative">
                  <span>Review From Different Perspectives</span>
                </div>
                <div className="w-full text-black text-center text-xs font-normal leading-[26px] tracking-[0.12px] relative">
                  <span>You can choose to review your document/s from the "Data Subject" or "Organization" perspective to get tailored analysis of your document.</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col items-center relative w-full max-w-md">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/7c87d01d9be178b894e267d4b9d0734052823086?width=916"
                alt="Contract Summary Interface"
                className="w-full h-80 object-cover border border-[#271D1D]/15 rounded-lg"
              />

              {/* Card Description */}
              <div className="flex flex-col items-center w-full relative mt-4">
                <div className="flex h-[89px] flex-col justify-center w-full text-black text-center font-lora text-xl font-medium leading-[90px] relative">
                  <span>Full Summary</span>
                </div>
                <div className="w-full text-black text-center text-xs font-normal leading-[26px] tracking-[0.12px] relative">
                  <span>Nothing's out of sight! Every member has access to the fully summary and more key insights for their documents.</span>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="flex flex-col items-center relative w-full max-w-md">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/72edd72cd0f4d42d5f5a36fcc0d9e59c5460050c?width=916"
                alt="Card 4"
                className="w-full h-80 object-cover border border-[#271D1D]/15 rounded-lg"
              />

              {/* Card Description */}
              <div className="flex flex-col items-center w-full relative mt-4">
                <div className="flex h-[89px] flex-col justify-center w-full text-black text-center font-lora text-xl font-medium leading-[90px] relative">
                  <span>See All The Risks</span>
                </div>
                <div className="w-full text-black text-center text-xs font-normal leading-[26px] tracking-[0.12px] relative">
                  <span>Find out all the issues that needs to be addressed in your documents.</span>
                </div>
              </div>
            </div>
          </div>

          {/* OpenAI Integration Card */}
          <div className="flex justify-center mb-20">
            <div className="flex flex-col items-center relative w-full max-w-md">
              <div className="h-80 bg-[#D6CECE] flex items-center justify-center p-12 w-full border border-[#271D1D]/15 rounded-lg">
                <img
                  src="https://api.builder.io/api/v1/image/assets/TEMP/36565312d2d6200939ff336eb31f7d63d829ac13?width=722"
                  alt="OpenAI"
                  className="w-full h-auto"
                />
              </div>

              {/* Card Description */}
              <div className="flex flex-col items-center w-full relative mt-4">
                <div className="flex h-[89px] flex-col justify-center w-full text-black text-center font-lora text-xl font-medium leading-[90px] relative">
                  <span>OpenAI Integration</span>
                </div>
                <div className="w-full text-black text-center text-xs font-normal leading-[26px] tracking-[0.12px] relative">
                  <span>All of our products integrate the latest deep learning technology to ensure maximum accuracy and efficiency.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Types Section */}
          <div className="flex flex-col items-center justify-center w-full">
            <div className="text-center mb-12 w-full max-w-5xl">
              <h3 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-6 mt-75">One-For-Each!</h3>
              <p className="text-xl text-center max-w-3xl mx-auto">
                Enjoy Maigon for all your agreements with industry leading <strong>SEVEN</strong> different, AI models that are each tailor made for any agreement you'd want to review.
              </p>
            </div>

            <div className="flex justify-center w-full">
              <ContractCardsAnimation contractTypes={contractTypes} />
            </div>
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

      {/* Animated Quotes */}
      <AnimatedQuotes />

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

      <Footer />
    </div>
  );
}
