export default function RiskAssessmentMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-[#271D1D]">Risk Assessment</h3>
        <div className="text-xs text-gray-500">Employment Contract</div>
      </div>

      {/* Risk Overview */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-white rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-red-600">3</div>
          <div className="text-xs text-gray-600">High</div>
        </div>
        <div className="flex-1 bg-white rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-yellow-600">7</div>
          <div className="text-xs text-gray-600">Medium</div>
        </div>
        <div className="flex-1 bg-white rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">12</div>
          <div className="text-xs text-gray-600">Low</div>
        </div>
      </div>
      
      {/* Risk Details */}
      <div className="flex-1 space-y-1 min-h-0">
        <div className="bg-white rounded-lg p-2 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#271D1D]">Unlimited Liability</span>
            <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">HIGH</span>
          </div>
          <div className="text-xs text-gray-600">No liability cap defined</div>
        </div>

        <div className="bg-white rounded-lg p-2 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#271D1D]">Non-Compete Clause</span>
            <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">HIGH</span>
          </div>
          <div className="text-xs text-gray-600">Overly broad restrictions</div>
        </div>

        <div className="bg-white rounded-lg p-2 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#271D1D]">Termination Terms</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">MED</span>
          </div>
          <div className="text-xs text-gray-600">Unclear notice requirements</div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-2">
        22 risks identified • Recommendations available
      </div>
    </div>
  );
}
