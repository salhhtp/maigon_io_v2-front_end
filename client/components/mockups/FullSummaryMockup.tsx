export default function FullSummaryMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-[#271D1D]">Document Summary</h3>
        <div className="text-xs text-gray-500">Service Agreement</div>
      </div>

      {/* Key Terms */}
      <div className="bg-white rounded-lg p-2 mb-2">
        <div className="text-sm font-medium text-[#271D1D] mb-1">Key Terms</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">24 months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment:</span>
            <span className="font-medium">Net 30</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Termination:</span>
            <span className="font-medium">30 days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Liability:</span>
            <span className="font-medium">$500K</span>
          </div>
        </div>
      </div>

      {/* Critical Clauses */}
      <div className="bg-white rounded-lg p-2 flex-1">
        <div className="text-sm font-medium text-[#271D1D] mb-1">Critical Clauses</div>
        <div className="space-y-1">
          <div className="text-xs flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
            <span className="font-medium">Indemnification</span>
            <span className="text-gray-600 truncate">- Broad obligations</span>
          </div>
          <div className="text-xs flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
            <span className="font-medium">IP Rights</span>
            <span className="text-gray-600 truncate">- Requires review</span>
          </div>
          <div className="text-xs flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="font-medium">Confidentiality</span>
            <span className="text-gray-600 truncate">- Standard</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-1">
        127 clauses reviewed • Analysis complete
      </div>
    </div>
  );
}
