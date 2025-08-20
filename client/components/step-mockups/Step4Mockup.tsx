export default function Step4Mockup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#271D1D] font-lora mb-2">Upload Your Contract</h2>
        <p className="text-gray-600 text-sm">Drag and drop your file or click to browse</p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-[#9A7C7C] bg-[#9A7C7C]/5 rounded-lg p-8 mb-6 text-center">
        <div className="w-16 h-16 bg-[#9A7C7C]/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#9A7C7C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#271D1D] mb-2">Drop your contract here</h3>
        <p className="text-gray-600 text-sm mb-4">PDF, DOC, DOCX up to 10MB</p>
        <button className="bg-[#9A7C7C] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#9A7C7C]/90 transition-colors">
          Browse Files
        </button>
      </div>

      {/* Uploaded File */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[#271D1D]">NDA_Company_Template.pdf</h4>
                <p className="text-sm text-gray-600">2.4 MB • Uploaded just now</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Analysis Preview */}
      <div className="bg-green-50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-[#271D1D]">File validated successfully</h4>
            <p className="text-sm text-gray-600">Document is ready for analysis</p>
          </div>
        </div>
      </div>

      {/* Analysis Settings */}
      <div className="space-y-3 mb-6">
        <h4 className="font-medium text-[#271D1D]">Analysis Settings</h4>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">Deep clause analysis</span>
          <div className="w-10 h-6 bg-[#9A7C7C] rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">GDPR compliance check</span>
          <div className="w-10 h-6 bg-[#9A7C7C] rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Back
        </button>
        <button className="flex-1 bg-[#9A7C7C] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#9A7C7C]/90 transition-colors">
          Start Analysis
        </button>
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
