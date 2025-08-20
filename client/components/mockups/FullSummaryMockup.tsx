export default function FullSummaryMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#271D1D]">Document Summary</h3>
        <div className="text-xs text-gray-500">Service Agreement • 12 pages</div>
      </div>
      
      {/* Key Insights */}
      <div className="flex-1 space-y-3">
        <div className="bg-white rounded-lg p-3">
          <div className="text-sm font-medium text-[#271D1D] mb-2">Key Terms</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Contract Duration:</span>
              <span className="font-medium">24 months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Terms:</span>
              <span className="font-medium">Net 30</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Termination:</span>
              <span className="font-medium">30 days notice</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Liability Cap:</span>
              <span className="font-medium">$500K</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3">
          <div className="text-sm font-medium text-[#271D1D] mb-2">Critical Clauses</div>
          <div className="space-y-2">
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-medium">Indemnification (Section 8.2)</span>
              </div>
              <div className="text-gray-600 ml-4">Broad indemnification obligations for service provider</div>
            </div>
            
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="font-medium">Intellectual Property (Section 5.1)</span>
              </div>
              <div className="text-gray-600 ml-4">IP ownership assignment requires review</div>
            </div>
            
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">Confidentiality (Section 6.3)</span>
              </div>
              <div className="text-gray-600 ml-4">Standard confidentiality provisions</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-2">
        Analysis completed • 127 clauses reviewed
      </div>
    </div>
  );
}
