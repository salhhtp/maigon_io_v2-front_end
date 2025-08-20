import React, { useState, useEffect } from "react";
import {
  FileText,
  Shield,
  Users,
  Database,
  Cog,
  Scale,
  Package,
} from "lucide-react";

const AnimatedSolutionsMockup: React.FC = () => {
  const [activeContract, setActiveContract] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  const contractTypes = [
    { icon: Shield, name: "NDA", color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Database, name: "DPA", color: "text-green-500", bg: "bg-green-50" },
    {
      icon: Users,
      name: "Privacy Policy",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      icon: Cog,
      name: "CA",
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    { icon: Scale, name: "R&D", color: "text-red-500", bg: "bg-red-50" },
    {
      icon: FileText,
      name: "EULA",
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    { icon: Package, name: "Supply", color: "text-teal-500", bg: "bg-teal-50" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveContract((prev) => (prev + 1) % contractTypes.length);
      setScanProgress(0);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 3;
      });
    }, 80);

    return () => clearInterval(progressInterval);
  }, [activeContract]);

  const activeContractData = contractTypes[activeContract];

  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative">
      {/* Header */}
      <div className="bg-[#271D1D] text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#9A7C7C] rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-medium">
                Contract Analysis Dashboard
              </h3>
              <p className="text-sm text-gray-300">AI-Powered Review System</p>
            </div>
          </div>
          <div className="text-sm bg-green-500/20 text-green-400 px-3 py-2 rounded-lg">
            Live
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 h-full">
        {/* Contract Type Selector */}
        <div className="grid grid-cols-7 gap-3 mb-8">
          {contractTypes.map((contract, index) => {
            const IconComponent = contract.icon;
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                  index === activeContract
                    ? `${contract.bg} border-current ${contract.color} scale-105 shadow-lg`
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() => setActiveContract(index)}
              >
                <IconComponent
                  className={`w-6 h-6 mx-auto ${
                    index === activeContract ? contract.color : "text-gray-400"
                  }`}
                />
                <div
                  className={`text-center mt-2 font-medium leading-tight ${
                    contract.name.length > 6 ? "text-[10px]" : "text-xs"
                  } ${
                    index === activeContract ? contract.color : "text-gray-500"
                  }`}
                >
                  {contract.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analysis Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-14 h-14 ${activeContractData.bg} rounded-lg flex items-center justify-center`}
            >
              <activeContractData.icon
                className={`w-7 h-7 ${activeContractData.color}`}
              />
            </div>
            <div>
              <h4 className="text-lg font-medium text-[#271D1D]">
                {activeContractData.name} Analysis
              </h4>
              <p className="text-base text-gray-500">
                Scanning contract clauses...
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-base mb-2">
              <span className="text-gray-600">Analysis Progress</span>
              <span className={`font-medium ${activeContractData.color}`}>
                {Math.round(scanProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-200 ease-out bg-gradient-to-r ${
                  activeContractData.color.includes("blue")
                    ? "from-blue-400 to-blue-600"
                    : activeContractData.color.includes("green")
                      ? "from-green-400 to-green-600"
                      : activeContractData.color.includes("purple")
                        ? "from-purple-400 to-purple-600"
                        : activeContractData.color.includes("orange")
                          ? "from-orange-400 to-orange-600"
                          : activeContractData.color.includes("red")
                            ? "from-red-400 to-red-600"
                            : activeContractData.color.includes("indigo")
                              ? "from-indigo-400 to-indigo-600"
                              : "from-teal-400 to-teal-600"
                }`}
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {85 + Math.floor(Math.random() * 15)}%
              </div>
              <div className="text-sm text-green-700">Compliance</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {1 + Math.floor(Math.random() * 3)}
              </div>
              <div className="text-sm text-orange-700">Risks</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {8 + Math.floor(Math.random() * 7)}
              </div>
              <div className="text-sm text-blue-700">Clauses</div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-base">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">
              GDPR compliance check complete
            </span>
          </div>
          <div className="flex items-center gap-3 text-base">
            <div
              className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <span className="text-gray-600">Risk assessment in progress</span>
          </div>
          <div className="flex items-center gap-3 text-base">
            <div
              className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
            <span className="text-gray-600">Extracting key provisions</span>
          </div>
        </div>
      </div>

      {/* Floating Action */}
      <div className="absolute bottom-6 right-6">
        <div className="bg-[#9A7C7C] text-white px-4 py-3 rounded-full text-sm font-medium shadow-lg">
          AI Processing...
        </div>
      </div>
    </div>
  );
};

export default AnimatedSolutionsMockup;
