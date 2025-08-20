export default function AIIntegrationMockup() {
  return (
    <div className="w-full h-80 bg-gradient-to-br from-gray-50 to-gray-100 border border-[#271D1D]/15 rounded-lg p-6 flex flex-col items-center justify-center">
      {/* AI Processing Animation */}
      <div className="relative mb-6">
        <div className="w-20 h-20 border-4 border-[#271D1D]/20 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-t-[#271D1D] rounded-full animate-spin"></div>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* AI Status */}
      <div className="text-center mb-4">
        <h4 className="text-lg font-semibold text-[#271D1D] mb-2">
          AI Analysis Engine
        </h4>
        <div className="text-sm text-gray-600 mb-3">
          Processing contract with OpenAI GPT-4
        </div>

        {/* Processing Steps */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Document parsing completed</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Legal clause identification</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-gray-700">Risk assessment in progress</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span className="text-gray-500">Compliance scoring pending</span>
          </div>
        </div>
      </div>

      {/* AI Capabilities */}
      <div className="bg-white rounded-lg p-3 w-full">
        <div className="text-center">
          <div className="text-sm font-medium text-[#271D1D] mb-2">
            AI Capabilities
          </div>
          <div className="flex justify-around text-xs">
            <div className="text-center">
              <div className="font-medium text-blue-600">7</div>
              <div className="text-gray-600">Contract Types</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">99.2%</div>
              <div className="text-gray-600">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-600">15s</div>
              <div className="text-gray-600">Avg. Speed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
