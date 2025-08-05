import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedQuotes from "@/components/AnimatedQuotes";
import MobileNavigation from "@/components/MobileNavigation";

const NewsCard = ({ title, date, imageSrc, featured = false }: { title: string; date: string; imageSrc: string; featured?: boolean }) => (
  <div className={`flex flex-col ${featured ? 'gap-4' : 'gap-4'}`}>
    <img 
      src={imageSrc} 
      alt={title} 
      className={`w-full ${featured ? 'h-96' : 'h-84'} object-cover rounded-lg border border-[#271D1D]/15`} 
    />
    <div className="flex flex-col gap-1">
      <p className="text-xs text-[#271D1D] font-medium">Published</p>
      <p className="text-xs text-[#271D1D] font-lora">{date}</p>
    </div>
    <h3 className={`${featured ? 'text-2xl lg:text-3xl' : 'text-xl lg:text-2xl'} font-medium text-black font-lora leading-tight`}>
      {title}
    </h3>
  </div>
);

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-[#725A5A]/15 bg-[#725A5A]/3 rounded-lg">
      <button
        className="w-full flex justify-between items-center p-6 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xl lg:text-2xl font-semibold text-[#725A5A]">{question}</span>
        <ChevronDown 
          className={`w-6 h-6 text-[#725A5A] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-xl lg:text-2xl text-[#725A5A] leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default function News() {
  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/">
          <Logo size="xl" />
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
          <Link to="/news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
          <Link to="/team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>
          <Button asChild className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white px-8 rounded-lg">
            <Link to="/signin">Sign In/Up</Link>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={false} />
      </nav>

      {/* Featured News Section */}
      <section className="py-20 px-8 lg:px-16 bg-[#F9F8F8] pt-24 lg:pt-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-end gap-8">
            {/* Left Content */}
            <div className="flex-1 max-w-2xl">
              <div className="space-y-20">
                {/* Page Title */}
                <h1 className="text-4xl lg:text-5xl font-medium text-[#171614] font-lora">
                  News
                </h1>

                {/* Featured Article */}
                <div className="space-y-16">
                  {/* Divider */}
                  <div className="w-full h-px bg-[#D6CECE] rounded-full"></div>
                  
                  {/* Article Info */}
                  <div className="space-y-16">
                    <div className="flex flex-col justify-start items-start space-y-2">
                      <p className="text-xs text-[#271D1D] font-medium">Published</p>
                      <p className="text-xs text-[#271D1D] font-lora">Mar 24, 2025</p>
                    </div>
                    
                    <h2 className="text-2xl lg:text-4xl font-medium text-black font-lora leading-tight">
                      Finding your contract solution: A no-nonsense approach
                    </h2>
                  </div>
                </div>
              </div>
              
              {/* Bottom Divider */}
              <div className="w-full h-px bg-[#D6CECE] rounded-full mt-20"></div>
            </div>

            {/* Right Image */}
            <div className="flex-1">
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/354d86037e54edc0a4f3120d61da3d802119a819?width=1146" 
                alt="Featured news article"
                className="w-full max-w-2xl h-96 lg:h-[424px] object-cover rounded-lg border border-[#271D1D]/15"
              />
            </div>
          </div>
        </div>
      </section>

      {/* News Grid Section */}
      <section className="py-20 px-8 lg:px-16 bg-[#F9F8F8]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-8 lg:p-28">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-16 lg:gap-20">
              <NewsCard
                title="Smarter Legal Solutions: How Maigon is Redefining Contract Review"
                date="Feb 24, 2025"
                imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/defadcd8445be3dc8712f81677c887b3ef4db62b?width=820"
              />
              <NewsCard
                title="Code to Clause: The Engineering Behind AI's Contract Review"
                date="Mar 19, 2025"
                imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/c498213c0b4214c6db0aac491c03b8a8739f2f72?width=820"
              />
            </div>
            
            {/* Third article centered in new row */}
            <div className="flex justify-center mt-16 lg:mt-20">
              <div className="w-full max-w-md">
                <NewsCard
                  title="LLMs and Lawyers: A New Partnership in Contract Management"
                  date="Feb 26, 2025"
                  imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/514bf38fbf249296cea00faa8d72c0d0024ec018?width=822"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatedQuotes />

      {/* FAQ Section */}
      <section className="py-20 bg-[#F9F8F8]">
        <div className="max-w-4xl mx-auto px-8 lg:px-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <FAQItem 
              question="How do I get started?"
              answer="Getting started is easy! Our solutions are available out-of-the-box. If you are looking for a one-time contract review, simply upload your contract and receive a comprehensive compliance report in just a few clicks. If you have larger volumes of contracts, contact us to create a corporate account and start using our AI review modules right away, streamlining your contract review process with ease."
            />
            <FAQItem 
              question="Can I use Maigon without Playbook ?"
              answer="Yes! Our standard solution is available for use right away, even without Playbook. While Playbook allows for more customization of contract review, adjusted to your specific review guidelines, the standard solution is designed to check for the most important compliance aspects and adherence to best practices. Whether you choose to use Playbook or the standard solution, Maigon provides you with valuable insights every time."
            />
            <FAQItem 
              question="Will you use my data for training ?"
              answer="No, we won't use your data for any other purpose than the intended contract review. We do not use your contract data for AI training or any other service improvements, unless you need us to look into your contract for troubleshooting. You can trust that your data is kept confidential and secure with us."
            />
            <FAQItem 
              question="Is API available ?"
              answer="Yes! We offer an API that can be used by contract platform vendors and companies with internal contract review tools. Our API is tailored to specific contract types and is designed to be both simple to use and comprehensive, providing advanced AI insights into submitted agreements for compliance. To get started with our API, please contact our team."
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
