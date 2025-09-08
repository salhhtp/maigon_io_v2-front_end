import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  CheckCircle,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

const AnimatedHeroMockupMobile: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { id: "upload", title: "Upload Contract", duration: 2000 },
    { id: "analyzing", title: "AI Analysis", duration: 3000 },
    { id: "results", title: "Results Ready", duration: 4000 },
  ];

  useEffect(() => {
    const stepDuration = 3000;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
      setProgress(0);
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 60);

    return () => clearInterval(progressInterval);
  }, [currentStep]);

  return (
    <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-[#F9F8F8] to-[#F0F0F0] rounded-lg border border-[#271D1D]/15 p-4 sm:p-6 overflow-hidden relative">
      {/* Main Content */}
      <div className="relative h-full">
        {/* Upload Step */}
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            currentStep === 0
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-[#9A7C7C] rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <Upload
                className={`w-8 h-8 sm:w-10 sm:h-10 text-[#9A7C7C] transition-transform duration-500 ${
                  currentStep === 0 ? "scale-100" : "scale-75"
                }`}
              />
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-[#271D1D] mb-2 sm:mb-3 text-center">
              Upload Your Contract
            </h3>
            <p className="text-sm sm:text-base text-[#271D1D]/70 text-center mb-4 sm:mb-6">
              Drag & drop or click to upload
            </p>
            <div className="w-32 sm:w-40 h-2 sm:h-3 bg-[#D6CECE] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#9A7C7C] transition-all duration-300 ease-out"
                style={{
                  width:
                    currentStep === 0 ? `${Math.min(progress, 100)}%` : "0%",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Analysis Step */}
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            currentStep === 1
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative mb-4 sm:mb-6">
              <FileText className="w-16 h-16 sm:w-20 sm:h-20 text-[#271D1D]" />
              <div className="absolute -inset-2 sm:-inset-3">
                <div
                  className={`w-20 h-20 sm:w-26 sm:h-26 border-2 sm:border-3 border-[#9A7C7C] rounded-full animate-spin ${
                    currentStep === 1 ? "opacity-100" : "opacity-0"
                  }`}
                ></div>
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-medium text-[#271D1D] mb-2 sm:mb-3 text-center">
              AI Analysis in Progress
            </h3>
            <p className="text-sm sm:text-base text-[#271D1D]/70 text-center mb-3 sm:mb-4">
              Scanning for compliance issues...
            </p>

            {/* Analysis indicators */}
            <div className="space-y-2 w-full max-w-xs sm:max-w-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#9A7C7C] rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-[#271D1D]/60">
                  Checking GDPR compliance
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 bg-[#9A7C7C] rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <span className="text-xs sm:text-sm text-[#271D1D]/60">
                  Analyzing risk factors
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 bg-[#9A7C7C] rounded-full animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                <span className="text-xs sm:text-sm text-[#271D1D]/60">
                  Extracting key clauses
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Step */}
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            currentStep === 2
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-[#271D1D] mb-3 sm:mb-4 text-center">
              Analysis Complete!
            </h3>

            {/* Results preview */}
            <div className="w-full max-w-xs sm:max-w-sm space-y-2">
              <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  <span className="text-xs sm:text-sm">Compliance Score</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-green-600">
                  94%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  <span className="text-xs sm:text-sm">Risk Level</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-orange-600">
                  Low
                </span>
              </div>

              <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <span className="text-xs sm:text-sm">Key Clauses</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-blue-600">
                  12 found
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 sm:gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                index === currentStep ? "bg-[#9A7C7C]" : "bg-[#D6CECE]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedHeroMockupMobile;
