export default function Step2Mockup() {
  return (
    <div className="w-full h-full bg-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 py-3 bg-[#F9F8F8]">
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
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[#271D1D] text-sm mb-2">Solutions</p>
          <h2 className="text-2xl font-medium text-[#271D1D] font-lora leading-tight">
            State-Of-The-Art AI for Legal Review
          </h2>
        </div>

        {/* Contract Cards Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Card 1 - Active/Selected */}
          <div className="bg-white rounded-lg border-2 border-[#9A7C7C] p-4 shadow-md">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#9A7C7C]/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#9A7C7C]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="font-medium text-[#271D1D] mb-2">Learn Your Compliance Score</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Our machine learning algorithms are trained to give you the full look on what you need to know the most from your agreements.
              </p>
              <button className="w-full bg-[#9A7C7C] text-white py-2 px-3 rounded-lg text-sm font-medium mt-3 hover:bg-[#9A7C7C]/90 transition-colors">
                Upload a document
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </div>
              <h3 className="font-medium text-[#271D1D] mb-2">Review From Different Perspectives</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                You can choose to review your document/s from the "Data Subject" or "Organization" perspective.
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium mt-3 hover:bg-gray-200 transition-colors">
                Upload a document
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="font-medium text-[#271D1D] mb-2">Full Summary</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Nothing's out of sight! Every member has access to the full summary and more key insights.
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium mt-3 hover:bg-gray-200 transition-colors">
                Upload a document
              </button>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="font-medium text-[#271D1D] mb-2">See All The Risks</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Find out all the issues that need to be addressed in your documents.
              </p>
              <button className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium mt-3 hover:bg-gray-200 transition-colors">
                Upload a document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
