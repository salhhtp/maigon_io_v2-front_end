export default function Step5Mockup() {
  return (
    <div className="w-full h-full bg-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 py-3">
        <div className="text-[#725A5A] font-lora text-lg font-medium">
          MAIGON
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-[#271D1D]">Solutions</span>
          <span className="text-[#271D1D]">News</span>
          <span className="text-[#271D1D]">Team</span>
          <div className="flex items-center space-x-1 bg-[#D6CECE] px-2 py-1 rounded">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
            </svg>
            <span className="text-xs">@Salih</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-medium text-[#271D1D] font-lora mb-4">
            Don't go anywhere!
          </h1>
          <p className="text-[#4B5563] text-base">
            This won't take too long
          </p>
        </div>

        {/* Animated MAIGON Logo */}
        <div className="mb-12">
          <div className="text-[#725A5A]/40 font-lora text-6xl font-medium tracking-wider">
            MAIGON
          </div>
        </div>

        {/* Processing Status */}
        <div className="w-full max-w-md">
          {/* Progress Steps */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-[#271D1D] text-sm">Document uploaded successfully</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-[#271D1D] text-sm">Document parsing completed</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-[#725A5A] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-[#271D1D] text-sm">AI analysis in progress...</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-gray-500 text-sm">Generating compliance report</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-[#725A5A] h-2 rounded-full transition-all duration-1000" style={{ width: '65%' }}></div>
          </div>

          {/* Progress Percentage */}
          <div className="text-center">
            <span className="text-[#725A5A] font-medium text-lg">65%</span>
            <span className="text-gray-500 text-sm ml-2">Complete</span>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="mt-8 text-center">
          <p className="text-[#4B5563] text-sm">
            Estimated time remaining: <span className="font-medium">30 seconds</span>
          </p>
        </div>
      </div>
    </div>
  );
}
