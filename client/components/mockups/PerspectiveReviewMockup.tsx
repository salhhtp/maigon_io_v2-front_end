export default function PerspectiveReviewMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#271D1D]">Perspective Analysis</h3>
        <div className="text-xs text-gray-500">Privacy Policy</div>
      </div>
      
      {/* Perspective Toggle */}
      <div className="flex bg-white rounded-lg p-1 mb-4">
        <button className="flex-1 py-2 px-3 text-sm font-medium bg-[#271D1D] text-white rounded-md">
          Data Subject
        </button>
        <button className="flex-1 py-2 px-3 text-sm font-medium text-gray-600">
          Organization
        </button>
      </div>
      
      {/* Analysis Results */}
      <div className="flex-1 space-y-3">
        <div className="bg-white rounded-lg p-3 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-[#271D1D] mb-1">Data Collection Rights</div>
          <div className="text-xs text-gray-600">Clear consent mechanisms are properly defined</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border-l-4 border-green-500">
          <div className="text-sm font-medium text-[#271D1D] mb-1">Deletion Rights</div>
          <div className="text-xs text-gray-600">Right to erasure is explicitly mentioned</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border-l-4 border-yellow-500">
          <div className="text-sm font-medium text-[#271D1D] mb-1">Data Portability</div>
          <div className="text-xs text-gray-600">Requires clearer implementation details</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border-l-4 border-red-500">
          <div className="text-sm font-medium text-[#271D1D] mb-1">Access Rights</div>
          <div className="text-xs text-gray-600">Missing timeframe for data access requests</div>
        </div>
      </div>
      
      {/* Summary */}
      <div className="text-center text-xs text-gray-500 mt-2">
        4 key areas analyzed from Data Subject perspective
      </div>
    </div>
  );
}
