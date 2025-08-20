export default function FullSummaryMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-[#271D1D]">Document Summary</h3>
        <div className="text-xs text-gray-500">Service Agreement</div>
      </div>
      
      {/* Key Insights */}
      <div className="flex-1 space-y-2 min-h-0">
        <div className="bg-white rounded-lg p-2">
          <div className="text-sm font-medium text-[#271D1D] mb-2">Key Terms</div>
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

        <div className="bg-white rounded-lg p-2">
          <div className="text-sm font-medium text-[#271D1D] mb-2">Critical Clauses</div>
          <div className="space-y-1">
            <div className="text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="font-medium">Indemnification</span>
              <span className="text-gray-600">- Broad obligations</span>
            </div>

            <div className="text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">IP Rights</span>
              <span className="text-gray-600">- Requires review</span>
            </div>

            <div className="text-xs flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Confidentiality</span>
              <span className="text-gray-600">- Standard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-2">
        127 clauses reviewed • Analysis complete
      </div>
    </div>
  );
}
