import React, { useState } from "react";
import { ChevronDown, User, Download, ArrowLeft, Printer } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import MobileNavigation from "@/components/MobileNavigation";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

export default function ContractReview() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Get contract data from navigation state (from loading page)
  const { selectedFile, perspective, solutionTitle } = location.state || {};

  const handleBackToSolutions = () => {
    navigate("/user-solutions");
  };

  const handleNewReview = () => {
    navigate("/perspective-selection");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header Bar - Hidden when printed */}
      <div className="print:hidden bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSolutions}
            className="flex items-center gap-2 text-[#9A7C7C] hover:text-[#725A5A] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Solutions
          </button>
          <div className="text-gray-300">|</div>
          <Logo />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleNewReview}
            variant="outline"
            size="sm"
            className="border-[#9A7C7C] text-[#9A7C7C] hover:bg-[#9A7C7C] hover:text-white"
          >
            New Review
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            className="bg-[#9A7C7C] hover:bg-[#725A5A] text-white"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 print:px-8 print:py-6">
        {/* Report Header */}
        <div className="mb-8 pb-6 border-b border-gray-200 print:mb-6 print:pb-4">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-medium text-[#271D1D] font-lora mb-3 print:text-xl">
                Contract Analysis Report
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">Document:</span>{" "}
                  {selectedFile?.name || "contract_document.pdf"}
                </div>
                <div>
                  <span className="font-medium">Analysis Type:</span>{" "}
                  {solutionTitle || "GDPR Compliance Review"}
                </div>
                <div>
                  <span className="font-medium">Perspective:</span>{" "}
                  {perspective === "data-subject"
                    ? "Data Subject"
                    : "Organization"}
                </div>
                <div>
                  <span className="font-medium">Generated:</span>{" "}
                  {new Date().toLocaleDateString()} at{" "}
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[#725A5A] font-lora text-xl font-medium mb-1">
                MAIGON
              </div>
              <div className="text-xs text-gray-500">
                AI-Powered Contract Analysis
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
            Executive Summary
          </h2>

          {/* Overall Score - Prominent Display */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6 print:border print:p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#271D1D]">
                Overall Compliance Score
              </h3>
              <span className="text-4xl font-bold text-green-600 print:text-3xl">
                87%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4 print:h-3">
              <div
                className="h-4 rounded-full bg-green-500 transition-all duration-1000 print:h-3"
                style={{ width: "87%" }}
              ></div>
            </div>
            <p className="text-gray-700">
              <strong>Excellent compliance</strong> with GDPR standards. Your
              contract demonstrates strong privacy protection measures with
              minor areas for improvement.
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:gap-3">
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200 print:p-3">
              <div className="text-2xl font-bold text-green-600 mb-1 print:text-xl">
                23
              </div>
              <div className="text-sm text-green-700 font-medium">
                Compliant Clauses
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200 print:p-3">
              <div className="text-2xl font-bold text-yellow-600 mb-1 print:text-xl">
                3
              </div>
              <div className="text-sm text-yellow-700 font-medium">
                Minor Issues
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200 print:p-3">
              <div className="text-2xl font-bold text-red-600 mb-1 print:text-xl">
                1
              </div>
              <div className="text-sm text-red-700 font-medium">High Risk</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200 print:p-3">
              <div className="text-2xl font-bold text-blue-600 mb-1 print:text-xl">
                47
              </div>
              <div className="text-sm text-blue-700 font-medium">
                Total Clauses
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-medium text-[#271D1D] mb-6 print:text-lg print:mb-4">
            Detailed Findings
          </h2>

          {/* Critical Issues */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[#271D1D] mb-4 print:text-base">
              🔴 Critical Issues Requiring Immediate Attention
            </h3>

            <div className="bg-red-50 rounded-lg p-5 border-l-4 border-red-500 mb-4 print:p-4">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-red-800 text-base">
                  Unlimited Liability Clause
                </h4>
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                  HIGH RISK
                </span>
              </div>
              <div className="mb-3">
                <span className="font-medium text-red-700">Location:</span>{" "}
                <span className="text-red-600">Section 8.3</span>
              </div>
              <p className="text-red-700 mb-4 leading-relaxed">
                No liability cap is defined for damages, creating unlimited
                financial exposure for your organization. This poses significant
                business risk.
              </p>
              <div className="bg-red-100 p-3 rounded border border-red-200">
                <div className="font-medium text-red-800 mb-2">
                  💡 Recommended Action:
                </div>
                <p className="text-red-700 text-sm">
                  Add a liability cap clause limiting damages to the contract
                  value or a reasonable amount (e.g., €100,000 or 12 months of
                  contract value).
                </p>
              </div>
            </div>
          </div>

          {/* Medium Priority Issues */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-[#271D1D] mb-4 print:text-base">
              🟡 Medium Priority Issues
            </h3>

            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500 print:p-3">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-yellow-800">
                    Data Retention Period
                  </h4>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                    MEDIUM
                  </span>
                </div>
                <p className="text-yellow-700 text-sm mb-2">
                  <span className="font-medium">Section 4.2:</span> Data
                  retention period is not clearly specified, potentially
                  violating GDPR Article 5(1)(e).
                </p>
                <p className="text-yellow-600 text-xs">
                  <strong>Recommendation:</strong> Define specific retention
                  periods for different data categories.
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500 print:p-3">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-yellow-800">
                    Third Party Data Sharing
                  </h4>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                    MEDIUM
                  </span>
                </div>
                <p className="text-yellow-700 text-sm mb-2">
                  <span className="font-medium">Section 6.1:</span> Third party
                  data sharing conditions are not sufficiently detailed.
                </p>
                <p className="text-yellow-600 text-xs">
                  <strong>Recommendation:</strong> Specify all third parties and
                  obtain explicit consent for data sharing.
                </p>
              </div>
            </div>
          </div>

          {/* Compliant Areas */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-[#271D1D] mb-4 print:text-base">
              ✅ Compliant Areas
            </h3>

            <div className="bg-green-50 rounded-lg p-5 border-l-4 border-green-500 print:p-4">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <span className="font-medium text-green-800">
                      Strong Consent Mechanisms
                    </span>
                    <p className="text-green-700 text-sm">
                      Complies with GDPR Article 7 requirements for valid
                      consent.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <span className="font-medium text-green-800">
                      Clear Data Subject Rights
                    </span>
                    <p className="text-green-700 text-sm">
                      Properly outlines rights under GDPR Chapter 3.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <span className="font-medium text-green-800">
                      Lawful Basis Specified
                    </span>
                    <p className="text-green-700 text-sm">
                      Clear specification of data processing lawful basis.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                  <div>
                    <span className="font-medium text-green-800">
                      Data Breach Procedures
                    </span>
                    <p className="text-green-700 text-sm">
                      Proper notification procedures defined.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-medium text-[#271D1D] mb-4 print:text-lg">
            Analysis Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
            <div className="bg-gray-50 rounded-lg p-4 print:p-3">
              <h3 className="font-medium text-[#271D1D] mb-3">
                Processing Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="font-medium">2.3 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence Level:</span>
                  <span className="font-medium text-green-600">98.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pages Analyzed:</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Clauses Reviewed:</span>
                  <span className="font-medium">47</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 print:p-3">
              <h3 className="font-medium text-[#271D1D] mb-3">
                Document Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span className="font-medium">
                    {selectedFile?.size
                      ? `${Math.round(selectedFile.size / 1024)} KB`
                      : "2.4 MB"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Type:</span>
                  <span className="font-medium">PDF</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Language:</span>
                  <span className="font-medium">English</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract Type:</span>
                  <span className="font-medium">Data Processing Agreement</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 print:pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              <p>
                Generated by{" "}
                <span className="font-medium text-[#725A5A]">MAIGON AI</span>
              </p>
              <p>© 2025 Maigon. All rights reserved.</p>
            </div>
            <div className="text-right">
              <p>Report ID: MG-{Date.now().toString().slice(-8)}</p>
              <p>Page 1 of 1</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
