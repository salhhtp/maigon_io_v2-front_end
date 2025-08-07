import { Button } from "@/components/ui/button";
import { ChevronDown, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedQuotes from "@/components/AnimatedQuotes";
import MobileNavigation from "@/components/MobileNavigation";

const TeamMemberCard = ({ name, role, imageSrc }: { name: string; role: string; imageSrc: string }) => (
  <div className="bg-[#F3F3F3] p-4 flex flex-col items-center">
    <img 
      src={imageSrc} 
      alt={name} 
      className="w-57 h-57 object-cover rounded-lg mb-4" 
    />
    <h3 className="text-xl font-medium text-[#271D1D] font-lora text-center mb-2">{name}</h3>
    <p className="text-sm text-[#271D1D] text-center leading-tight">{role}</p>
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

export default function UserTeam() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // User data - can be replaced with actual user context/auth later
  const userName = "Adam";

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

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
              <span className="text-[#271D1D] font-medium">@{userName}</span>
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

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={true} userName={userName} />
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-8 lg:px-16 bg-[#F9F8F8] pt-24 lg:pt-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content */}
            <div className="flex-1 max-w-lg">
              <h1 className="text-4xl lg:text-5xl font-medium text-[#171614] font-lora mb-8 leading-tight">
                Meet the Team!
              </h1>
              <p className="text-lg text-[#171614] leading-relaxed">
                Our team has been working tirelessly to make sure you, the next person who's about to experience the future of contract review, will enjoy and witness what's possible; Also, what the tomorrow will bring to our lives.
              </p>
            </div>

            {/* Right Image */}
            <div className="flex-1">
              <img 
                src="https://api.builder.io/api/v1/image/assets/TEMP/1859784f8bfcdd9ec48637d54377d9c248a1289d?width=1248" 
                alt="Team workspace"
                className="w-full h-auto max-w-2xl rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-20 px-8 lg:px-16 bg-[#F9F8F8]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* About Us Content */}
            <div className="flex-1 max-w-md">
              <h2 className="text-4xl lg:text-5xl font-medium text-[#271D1D] font-lora mb-8">
                About Us
              </h2>
              <p className="text-lg text-black leading-relaxed">
                We are an international team of highly skilled developers, lawyers, and legal data engineers on a mission to automate contract review with the help of AI. Some of our developers are also qualified lawyers. This powerful mix of expertise gives us competitive edge and enables fast, efficient and value-oriented development of high-quality legal AI solutions.
              </p>
            </div>

            {/* Team Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
                {/* Top Row */}
                <TeamMemberCard
                  name="Jim Runsten"
                  role="Business Development & Strategy"
                  imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/c4a03f978a3ac266e94c724e92ce5b1dd2ac4600?width=456"
                />
                <TeamMemberCard
                  name="Erica Antonovic"
                  role="Business Development & Strategy"
                  imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/18be04a7d077b7e202d85c21a16dc5b04365c22b?width=456"
                />
                <TeamMemberCard
                  name="Andreas Börjesson"
                  role="Business Development & Investor Relations"
                  imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/c15caa6bb2aefa8a854a3ae2fa4a7b6679ceb4da?width=456"
                />
                
                {/* Bottom Row - Centered */}
                <div className="col-span-2 lg:col-span-3 flex justify-center gap-1">
                  <div className="grid grid-cols-2 gap-1">
                    <TeamMemberCard
                      name="Salih Hatipoglu"
                      role="Head of Technology"
                      imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/bc7260ff7b3b8e5320a5d6f55b88e4968080c4d4?width=456"
                    />
                    <TeamMemberCard
                      name="Arunendu Mazumder"
                      role="Head of Sales"
                      imageSrc="https://api.builder.io/api/v1/image/assets/TEMP/ccc0fa373e58bf89213b7240c1551afe1599a976?width=456"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Office Photos Section */}
      <section className="py-20 bg-[#F9F8F8]">
        <div className="max-w-[1400px] mx-auto px-2.5">
          <div className="flex flex-col lg:flex-row justify-center items-center gap-4 lg:gap-6">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/6b6a9254ee69888f18e1b533e3e64360bfa95ab9?width=1254"
              alt="Office view with terrace"
              className="w-full lg:w-[627px] h-80 lg:h-[440px] object-cover rounded-lg flex-shrink-0"
            />
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8e4999b353eaf0cc207c714664e88e596f0bb4f9?width=1514"
              alt="Team meeting in office"
              className="w-full lg:w-[757px] h-80 lg:h-[440px] object-cover rounded-lg flex-shrink-0"
            />
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
