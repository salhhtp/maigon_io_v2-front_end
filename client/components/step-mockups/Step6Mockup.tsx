export default function Step6Mockup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#271D1D] font-lora mb-2">Analysis Complete!</h2>
        <p className="text-gray-600 text-sm">Your contract has been thoroughly analyzed</p>
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-[#271D1D]">Compliance Score</h3>
          <span className="text-2xl font-bold text-green-600">87%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div className="h-2 rounded-full bg-green-500" style={{ width: '87%' }}></div>
        </div>
        <p className="text-sm text-gray-600">Excellent compliance with GDPR standards</p>
      </div>

      {/* Key Findings */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-600">23</div>
          <div className="text-xs text-green-700">Compliant Clauses</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">3</div>
          <div className="text-xs text-yellow-700">Minor Issues</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-600">1</div>
          <div className="text-xs text-red-700">High Risk</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-600">47</div>
          <div className="text-xs text-blue-700">Total Clauses</div>
        </div>
      </div>

      {/* Key Issues */}
      <div className="space-y-2 mb-4">
        <h4 className="font-medium text-[#271D1D] text-sm">Key Issues Found:</h4>
        
        <div className="bg-red-50 rounded-lg p-3 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">Unlimited Liability</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">HIGH</span>
          </div>
          <p className="text-xs text-red-700 mt-1">No liability cap defined for damages</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">Data Retention</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MED</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">Unclear data retention period</p>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">Third Party Access</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MED</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">Third party data sharing not specified</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 bg-[#9A7C7C] text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-[#9A7C7C]/90 transition-colors">
          View Full Report
        </button>
        <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Download PDF
        </button>
      </div>

      {/* Success indicator */}
      <div className="absolute top-4 right-4">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}
