export default function Step5Mockup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#9A7C7C] rounded-full mx-auto mb-4 flex items-center justify-center relative">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-[#271D1D] font-lora mb-2">AI Analysis in Progress</h2>
        <p className="text-gray-600 text-sm">Our AI is reviewing your contract for compliance and risks</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Analysis Progress</span>
          <span className="font-medium text-[#9A7C7C]">73%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="h-3 rounded-full bg-gradient-to-r from-[#9A7C7C] to-[#271D1D] transition-all duration-500 ease-out"
            style={{ width: '73%' }}
          ></div>
        </div>
      </div>

      {/* Analysis Steps */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className="text-sm text-gray-700">Document parsing completed</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <span className="text-sm text-gray-700">Clause identification finished</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#9A7C7C] rounded-full flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <span className="text-sm text-gray-700">GDPR compliance analysis in progress</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-sm text-gray-500">Risk assessment pending</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-sm text-gray-500">Report generation pending</span>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <div className="text-lg font-bold text-[#9A7C7C]">47</div>
          <div className="text-xs text-gray-600">Clauses Found</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <div className="text-lg font-bold text-blue-600">12</div>
          <div className="text-xs text-gray-600">Key Terms</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
          <div className="text-lg font-bold text-orange-600">3</div>
          <div className="text-xs text-gray-600">Potential Issues</div>
        </div>
      </div>

      {/* Processing Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          <h4 className="font-medium text-[#271D1D]">Current Analysis</h4>
        </div>
        <p className="text-sm text-gray-600">
          Analyzing confidentiality clauses and non-disclosure obligations for GDPR compliance
        </p>
      </div>

      {/* Estimated time */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        Est. time remaining: 30 seconds
      </div>
    </div>
  );
}
