import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ChevronDown } from "lucide-react";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";

export default function PerspectiveSelection() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [selectedPerspective, setSelectedPerspective] = useState<"data-subject" | "organization" | null>("data-subject");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleContinue = () => {
    if (selectedPerspective) {
      // Navigate to upload page with the selected perspective
      navigate("/upload", { state: { perspective: selectedPerspective } });
    }
  };

  const handleBack = () => {
    navigate("/user-solutions");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/user-solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">
            Solutions
          </Link>
          <Link to="/pricing" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">
            Pricing
          </Link>
          <Link to="/user-news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">
            News
          </Link>
          <Link to="/user-team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">
            Team
          </Link>
          
          {/* User Button */}
          <div className="relative">
            <button className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors">
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">@{user?.name?.split(' ')[0] || 'User'}</span>
              <ChevronDown className="w-4 h-4 text-[#271D1D]" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={true} userName={user?.name?.split(' ')[0] || 'User'} />
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 lg:px-16 py-12 pt-24 lg:pt-32">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-4">
              Select Your Perspective
            </h1>
            <p className="text-gray-600 text-lg">
              Choose the viewpoint for contract analysis to get tailored insights
            </p>
          </div>

          {/* Perspective Options */}
          <div className="space-y-6 mb-8">
            {/* Data Subject Perspective */}
            <div 
              className={`bg-white rounded-lg border-2 p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selectedPerspective === "data-subject" 
                  ? "border-[#9A7C7C] bg-[#9A7C7C]/5" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedPerspective("data-subject")}
            >
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-medium text-[#271D1D]">Data Subject</h3>
                    <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                      selectedPerspective === "data-subject" 
                        ? "border-[#9A7C7C] bg-[#9A7C7C]" 
                        : "border-gray-300"
                    }`}>
                      {selectedPerspective === "data-subject" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Analyze the contract from the individual's perspective, focusing on personal data rights, 
                    privacy protections, and data subject obligations under GDPR and other privacy regulations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">Privacy Rights</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">Data Protection</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">GDPR Compliance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Perspective */}
            <div 
              className={`bg-white rounded-lg border-2 p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selectedPerspective === "organization" 
                  ? "border-[#9A7C7C] bg-[#9A7C7C]/5" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedPerspective("organization")}
            >
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-medium text-[#271D1D]">Organization</h3>
                    <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center ${
                      selectedPerspective === "organization" 
                        ? "border-[#9A7C7C] bg-[#9A7C7C]" 
                        : "border-gray-300"
                    }`}>
                      {selectedPerspective === "organization" && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    Review from the company's perspective, emphasizing business obligations, 
                    compliance requirements, organizational responsibilities, and legal liability.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">Business Risk</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">Legal Compliance</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">Liability Assessment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Preview */}
          <div className={`rounded-lg p-6 mb-8 transition-all ${
            selectedPerspective === "data-subject" 
              ? "bg-blue-50 border border-blue-200" 
              : selectedPerspective === "organization"
              ? "bg-green-50 border border-green-200"
              : "bg-gray-50 border border-gray-200"
          }`}>
            <h4 className="font-medium text-[#271D1D] mb-4">Analysis will focus on:</h4>
            <div className="space-y-2">
              {selectedPerspective === "data-subject" ? (
                <>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Individual privacy rights and data access
                  </div>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Consent mechanisms and withdrawal options
                  </div>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Data retention and deletion rights
                  </div>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Data portability and transparency requirements
                  </div>
                </>
              ) : selectedPerspective === "organization" ? (
                <>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Organizational compliance obligations
                  </div>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Business risk assessment and mitigation
                  </div>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Legal liability and financial exposure
                  </div>
                  <div className="flex items-center text-gray-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Operational and procedural requirements
                  </div>
                </>
              ) : (
                <div className="flex items-center text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                  Select a perspective to see analysis focus areas
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button 
              onClick={handleBack}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Solutions
            </button>
            <button 
              onClick={handleContinue}
              disabled={!selectedPerspective}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                selectedPerspective
                  ? "bg-[#9A7C7C] text-white hover:bg-[#9A7C7C]/90"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Continue to Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
