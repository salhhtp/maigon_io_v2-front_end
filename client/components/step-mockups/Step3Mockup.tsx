export default function Step3Mockup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-[#271D1D] font-lora mb-1">
          Select Your Perspective
        </h2>
        <p className="text-gray-600 text-xs">
          Choose the viewpoint for contract analysis
        </p>
      </div>

      {/* Perspective Options */}
      <div className="space-y-3 mb-4">
        {/* Data Subject Perspective */}
        <div className="bg-white rounded-lg border-2 border-[#9A7C7C] p-4 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-[#271D1D]">Data Subject</h3>
                <div className="w-4 h-4 border-2 border-[#9A7C7C] rounded-full bg-[#9A7C7C] flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Analyze the contract from the individual's perspective, focusing
                on personal data rights, privacy protections, and data subject
                obligations.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  Privacy Rights
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  Data Protection
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  GDPR Compliance
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Perspective */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path
                  fillRule="evenodd"
                  d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-[#271D1D]">Organization</h3>
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Review from the company's perspective, emphasizing business
                obligations, compliance requirements, and organizational
                responsibilities.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Business Risk
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Legal Compliance
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  Liability
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Preview */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-[#271D1D] mb-2">
          Analysis will focus on:
        </h4>
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
            Individual privacy rights and data access
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
            Consent mechanisms and withdrawal options
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
            Data retention and deletion rights
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Back
        </button>
        <button className="flex-1 bg-[#9A7C7C] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#9A7C7C]/90 transition-colors">
          Continue
        </button>
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
          <div className="w-2 h-2 bg-[#9A7C7C] rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
