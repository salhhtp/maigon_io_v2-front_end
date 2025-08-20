import React, { useState } from "react";
import { ChevronDown, User, Download, ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

export default function ContractReview() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Get contract data from navigation state (from loading page)
  const { selectedFile, perspective, solutionTitle } = location.state || {};
  
  const handleBackToSolutions = () => {
    navigate("/user-solutions");
  };

  const handleNewReview = () => {
    navigate("/perspective-selection");
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-6 bg-[#F9F8F8]">
        <Link to="/home">
          <Logo size="xl" />
        </Link>
        
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
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">@{user?.name?.split(' ')[0] || 'User'}</span>
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

        {/* Mobile Navigation */}
        <MobileNavigation isLoggedIn={true} userName={user?.name?.split(' ')[0] || 'User'} />
      </nav>

      {/* Main Content */}
      <div className="pt-24 lg:pt-32 pb-16">
        <div className="max-w-6xl mx-auto px-8 lg:px-16">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={handleBackToSolutions}
              className="flex items-center gap-2 text-[#9A7C7C] hover:text-[#725A5A] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Solutions
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-medium text-[#271D1D] font-lora mb-2">
                  Contract Analysis Complete
                </h1>
                <p className="text-gray-600">
                  {selectedFile?.name || "contract_document.pdf"} • {perspective === 'data-subject' ? 'Data Subject' : 'Organization'} Perspective
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleNewReview}
                  variant="outline" 
                  className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C] hover:text-white"
                >
                  New Review
                </Button>
                <Button className="bg-[#9A7C7C] hover:bg-[#725A5A] text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overall Score */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-medium text-[#271D1D]">Overall Compliance Score</h3>
                  <span className="text-3xl font-bold text-green-600">87%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div className="h-3 rounded-full bg-green-500 transition-all duration-1000" style={{ width: '87%' }}></div>
                </div>
                <p className="text-gray-600">
                  Excellent compliance with GDPR standards. Your contract demonstrates strong privacy protection measures.
                </p>
              </div>

              {/* Key Findings Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">23</div>
                  <div className="text-sm text-green-700">Compliant Clauses</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">3</div>
                  <div className="text-sm text-yellow-700">Minor Issues</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-600 mb-1">1</div>
                  <div className="text-sm text-red-700">High Risk</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">47</div>
                  <div className="text-sm text-blue-700">Total Clauses</div>
                </div>
              </div>

              {/* Detailed Issues */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-medium text-[#271D1D] mb-4">Issues Identified</h3>
                
                <div className="space-y-4">
                  {/* High Risk Issue */}
                  <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-red-800">Unlimited Liability Clause</h4>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">HIGH RISK</span>
                    </div>
                    <p className="text-red-700 text-sm mb-3">
                      Section 8.3: No liability cap is defined for damages, creating unlimited financial exposure.
                    </p>
                    <div className="text-xs text-red-600">
                      <strong>Recommendation:</strong> Add a liability cap clause limiting damages to the contract value or a reasonable amount.
                    </div>
                  </div>

                  {/* Medium Risk Issues */}
                  <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-yellow-800">Data Retention Period</h4>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">MEDIUM</span>
                    </div>
                    <p className="text-yellow-700 text-sm mb-3">
                      Section 4.2: Data retention period is not clearly specified, potentially violating GDPR Article 5(1)(e).
                    </p>
                    <div className="text-xs text-yellow-600">
                      <strong>Recommendation:</strong> Define specific retention periods for different data categories.
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-yellow-800">Third Party Data Sharing</h4>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">MEDIUM</span>
                    </div>
                    <p className="text-yellow-700 text-sm mb-3">
                      Section 6.1: Third party data sharing conditions are not sufficiently detailed.
                    </p>
                    <div className="text-xs text-yellow-600">
                      <strong>Recommendation:</strong> Specify all third parties and obtain explicit consent for data sharing.
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Highlights */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-medium text-[#271D1D] mb-4">Compliance Highlights</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">Strong consent mechanisms in place (GDPR Article 7)</span>
                  </div>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">Clear data subject rights outlined (GDPR Chapter 3)</span>
                  </div>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">Proper data processing lawful basis specified</span>
                  </div>
                  <div className="flex items-center text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm">Data breach notification procedures defined</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="font-medium text-[#271D1D] mb-4">Contract Details</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">File:</span>
                    <div className="font-medium">{selectedFile?.name || "contract_document.pdf"}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Analysis Type:</span>
                    <div className="font-medium">{solutionTitle || "GDPR Compliance Review"}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Perspective:</span>
                    <div className="font-medium">
                      {perspective === 'data-subject' ? 'Data Subject' : 'Organization'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Processed:</span>
                    <div className="font-medium">{new Date().toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">File Size:</span>
                    <div className="font-medium">
                      {selectedFile?.size ? `${Math.round(selectedFile.size / 1024)} KB` : "2.4 MB"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="font-medium text-[#271D1D] mb-4">Analysis Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Processing Time</span>
                    <span className="font-medium">2.3 seconds</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Confidence Level</span>
                    <span className="font-medium text-green-600">98.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Pages Analyzed</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Clauses Reviewed</span>
                    <span className="font-medium">47</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="font-medium text-[#271D1D] mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.print()}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handleNewReview}
                  >
                    Upload New Contract
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigator.share && navigator.share({ title: 'Contract Analysis Results' })}
                  >
                    Share Results
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
