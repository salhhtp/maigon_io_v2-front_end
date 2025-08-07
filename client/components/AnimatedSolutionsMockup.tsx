import React, { useState, useEffect } from 'react';
import { FileText, Shield, Users, Database, Cog, Scale, Package } from 'lucide-react';

const AnimatedSolutionsMockup: React.FC = () => {
  const [activeContract, setActiveContract] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  const contractTypes = [
    { icon: Shield, name: "NDA", color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Database, name: "DPA", color: "text-green-500", bg: "bg-green-50" },
    { icon: Users, name: "Privacy Policy", color: "text-purple-500", bg: "bg-purple-50" },
    { icon: Cog, name: "Consultancy", color: "text-orange-500", bg: "bg-orange-50" },
    { icon: Scale, name: "R&D", color: "text-red-500", bg: "bg-red-50" },
    { icon: FileText, name: "EULA", color: "text-indigo-500", bg: "bg-indigo-50" },
    { icon: Package, name: "Supply", color: "text-teal-500", bg: "bg-teal-50" }
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
      <div className="bg-[#271D1D] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#9A7C7C] rounded flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium">Contract Analysis Dashboard</h3>
              <p className="text-xs text-gray-300">AI-Powered Review System</p>
            </div>
          </div>
          <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
            Live
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 h-full">
        {/* Contract Type Selector */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {contractTypes.map((contract, index) => {
            const IconComponent = contract.icon;
            return (
              <div
                key={index}
                className={`p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                  index === activeContract
                    ? `${contract.bg} border-current ${contract.color} scale-105 shadow-lg`
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => setActiveContract(index)}
              >
                <IconComponent className={`w-4 h-4 mx-auto ${
                  index === activeContract ? contract.color : 'text-gray-400'
                }`} />
                <div className={`text-xs text-center mt-1 font-medium ${
                  index === activeContract ? contract.color : 'text-gray-500'
                }`}>
                  {contract.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analysis Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${activeContractData.bg} rounded-lg flex items-center justify-center`}>
              <activeContractData.icon className={`w-5 h-5 ${activeContractData.color}`} />
            </div>
            <div>
              <h4 className="font-medium text-[#271D1D]">
                {activeContractData.name} Analysis
              </h4>
              <p className="text-sm text-gray-500">Scanning contract clauses...</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Analysis Progress</span>
              <span className={`font-medium ${activeContractData.color}`}>{Math.round(scanProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-200 ease-out bg-gradient-to-r ${
                  activeContractData.color.includes('blue') ? 'from-blue-400 to-blue-600' :
                  activeContractData.color.includes('green') ? 'from-green-400 to-green-600' :
                  activeContractData.color.includes('purple') ? 'from-purple-400 to-purple-600' :
                  activeContractData.color.includes('orange') ? 'from-orange-400 to-orange-600' :
                  activeContractData.color.includes('red') ? 'from-red-400 to-red-600' :
                  activeContractData.color.includes('indigo') ? 'from-indigo-400 to-indigo-600' :
                  'from-teal-400 to-teal-600'
                }`}
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">
                {85 + Math.floor(Math.random() * 15)}%
              </div>
              <div className="text-xs text-green-700">Compliance</div>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <div className="text-lg font-bold text-orange-600">
                {1 + Math.floor(Math.random() * 3)}
              </div>
              <div className="text-xs text-orange-700">Risks</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">
                {8 + Math.floor(Math.random() * 7)}
              </div>
              <div className="text-xs text-blue-700">Clauses</div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-600">GDPR compliance check complete</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <span className="text-gray-600">Risk assessment in progress</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <span className="text-gray-600">Extracting key provisions</span>
          </div>
        </div>
      </div>

      {/* Floating Action */}
      <div className="absolute bottom-4 right-4">
        <div className="bg-[#9A7C7C] text-white px-3 py-2 rounded-full text-xs font-medium shadow-lg">
          AI Processing...
        </div>
      </div>
    </div>
  );
};

export default AnimatedSolutionsMockup;
