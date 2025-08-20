export default function Step1Mockup() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-white to-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative flex items-center justify-center">
      {/* Login/Signup Interface */}
      <div className="w-full max-w-md mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#9A7C7C] rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#271D1D] font-lora mb-2">Welcome to Maigon</h2>
          <p className="text-gray-600">Sign in to access AI-powered contract review</p>
        </div>

        {/* Login Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#271D1D] mb-1">Email</label>
            <input
              type="email"
              placeholder="adam.smith@company.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent outline-none"
              value="adam.smith@company.com"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#271D1D] mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9A7C7C] focus:border-transparent outline-none"
              value="••••••••••"
              readOnly
            />
          </div>

          <button className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white py-3 rounded-lg font-medium transition-colors">
            Sign In
          </button>

          <div className="text-center">
            <span className="text-gray-500 text-sm">or</span>
          </div>

          <button className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Create New Account
          </button>
        </div>

        {/* Features Preview */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">What you'll get access to:</p>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              AI-powered contract analysis
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              7 specialized contract types
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              GDPR compliance checking
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-4 right-4 w-12 h-12 bg-[#9A7C7C]/10 rounded-full"></div>
      <div className="absolute bottom-6 left-6 w-8 h-8 bg-[#271D1D]/5 rounded-full"></div>
    </div>
  );
}
