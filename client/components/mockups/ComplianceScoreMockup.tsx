export default function ComplianceScoreMockup() {
  return (
    <div className="w-full h-80 bg-gray-50 border border-[#271D1D]/15 rounded-lg p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#271D1D]">Compliance Dashboard</h3>
        <div className="text-xs text-gray-500">NDA Agreement</div>
      </div>
      
      {/* Score Circle */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="#E5E7EB"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="#10B981"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${85 * 3.39} 339`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#271D1D]">85%</div>
              <div className="text-xs text-gray-500">Compliant</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Score Details */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Privacy Protection</span>
          <span className="text-sm font-medium text-green-600">92%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Data Security</span>
          <span className="text-sm font-medium text-green-600">88%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Legal Terms</span>
          <span className="text-sm font-medium text-yellow-600">75%</span>
        </div>
      </div>
    </div>
  );
}
