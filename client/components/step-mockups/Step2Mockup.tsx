export default function Step2Mockup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#271D1D] font-lora mb-2">Choose Your Contract Type</h2>
        <p className="text-gray-600 text-sm">Select the type of contract you want to analyze</p>
      </div>

      {/* Contract Type Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { name: "NDA", icon: "🛡️", active: true },
          { name: "DPA", icon: "📊", active: false },
          { name: "Privacy Policy", icon: "🔒", active: false },
          { name: "Consultancy", icon: "💼", active: false },
          { name: "R&D Agreement", icon: "🔬", active: false },
          { name: "EULA", icon: "📄", active: false },
        ].map((contract, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
              contract.active
                ? "border-[#9A7C7C] bg-[#9A7C7C]/10 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{contract.icon}</div>
              <div className={`text-sm font-medium ${
                contract.active ? "text-[#9A7C7C]" : "text-gray-700"
              }`}>
                {contract.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Contract Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#9A7C7C]/10 rounded-lg flex items-center justify-center">
            <span className="text-lg">🛡️</span>
          </div>
          <div>
            <h3 className="font-medium text-[#271D1D]">Non-Disclosure Agreement</h3>
            <p className="text-sm text-gray-600">Confidentiality & Privacy Protection</p>
          </div>
        </div>
        <div className="text-xs text-gray-600">
          Our NDA analysis checks for confidentiality clauses, term definitions, 
          permitted disclosures, and compliance with industry standards.
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
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
