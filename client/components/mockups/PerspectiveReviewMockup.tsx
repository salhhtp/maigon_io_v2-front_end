export default function PerspectiveReviewMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-[#271D1D]">Perspective Analysis</h3>
        <div className="text-xs text-gray-500">Privacy Policy</div>
      </div>

      {/* Perspective Toggle */}
      <div className="flex bg-white rounded-lg p-1 mb-2">
        <button className="flex-1 py-2 px-3 text-sm font-medium bg-[#271D1D] text-white rounded-md">
          Data Subject
        </button>
        <button className="flex-1 py-2 px-3 text-sm font-medium text-gray-600">
          Organization
        </button>
      </div>
      
      {/* Analysis Results */}
      <div className="flex-1 space-y-2 min-h-0">
        <div className="bg-white rounded-lg p-2 border-l-4 border-blue-500">
          <div className="text-sm font-medium text-[#271D1D]">Data Collection Rights</div>
          <div className="text-xs text-gray-600">Clear consent mechanisms defined</div>
        </div>

        <div className="bg-white rounded-lg p-2 border-l-4 border-green-500">
          <div className="text-sm font-medium text-[#271D1D]">Deletion Rights</div>
          <div className="text-xs text-gray-600">Right to erasure mentioned</div>
        </div>

        <div className="bg-white rounded-lg p-2 border-l-4 border-yellow-500">
          <div className="text-sm font-medium text-[#271D1D]">Data Portability</div>
          <div className="text-xs text-gray-600">Needs implementation details</div>
        </div>
      </div>

      {/* Summary */}
      <div className="text-center text-xs text-gray-500 mt-2">
        3 key areas analyzed from Data Subject perspective
      </div>
    </div>
  );
}
