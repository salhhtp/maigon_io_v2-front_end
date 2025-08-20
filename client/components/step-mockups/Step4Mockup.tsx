export default function Step4Mockup() {
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
      <div className="flex flex-col items-center justify-center px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-[#271D1D] font-lora mb-4">
            Upload your document
          </h1>
          <p className="text-[#4B5563] text-base">
            Once your document is uploaded and submitted, Maigon AI will start analysing and generating your review.
          </p>
        </div>

        {/* Upload Area */}
        <div className="w-full max-w-md">
          {/* File Upload Container */}
          <div className="bg-[#D6CECE] rounded-lg p-8 mb-4 text-center">
            <div className="w-16 h-16 bg-[#725A5A]/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#725A5A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-[#271D1D] font-medium text-lg mb-2">DPIA.pdf</div>
            <button className="bg-[#725A5A] text-white p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>

          {/* Supported Formats */}
          <div className="text-center mb-6">
            <p className="text-[#4B5563] text-sm">
              Supported formats: <span className="font-medium">docx • doc • pdf</span>
            </p>
          </div>

          {/* Submit Button */}
          <button className="w-full bg-[#725A5A] text-white py-3 px-6 rounded-lg text-base font-medium hover:bg-[#725A5A]/90 transition-colors">
            Submit
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-[#4B5563] text-sm">
            Your document will be analyzed using our AI-powered legal review system
          </p>
        </div>
      </div>
    </div>
  );
}
