export default function RiskAssessmentMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#271D1D]">Risk Assessment</h3>
        <div className="text-xs text-gray-500">Employment Contract</div>
      </div>
      
      {/* Risk Overview */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-white rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-600">3</div>
          <div className="text-xs text-gray-600">High Risk</div>
        </div>
        <div className="flex-1 bg-white rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">7</div>
          <div className="text-xs text-gray-600">Medium Risk</div>
        </div>
        <div className="flex-1 bg-white rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-600">12</div>
          <div className="text-xs text-gray-600">Low Risk</div>
        </div>
      </div>
      
      {/* Risk Details */}
      <div className="flex-1 space-y-2">
        <div className="bg-white rounded-lg p-3 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#271D1D]">Unlimited Liability</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">HIGH</span>
          </div>
          <div className="text-xs text-gray-600">No liability cap defined for damages</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#271D1D]">Non-Compete Clause</span>
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">HIGH</span>
          </div>
          <div className="text-xs text-gray-600">Overly broad non-compete restrictions</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#271D1D]">Termination Terms</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MED</span>
          </div>
          <div className="text-xs text-gray-600">Unclear notice period requirements</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[#271D1D]">IP Assignment</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MED</span>
          </div>
          <div className="text-xs text-gray-600">Broad intellectual property assignment</div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-2">
        22 total risks identified • Recommendations available
      </div>
    </div>
  );
}
