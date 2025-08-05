import { Link } from "react-router-dom";
import AnimatedLoadingLogo from "@/components/AnimatedLoadingLogo";

export default function AnimationTest() {
  const handleComplete = () => {
    alert('🎉 Animation completed successfully!');
  };

  return (
    <div className="min-h-screen bg-[#F9F8F8] flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-3xl font-lora font-medium text-[#271D1D] mb-8">
          🧪 Animation Test Lab
        </h1>
        
        <div className="bg-white rounded-lg p-8 shadow-sm border border-[#9A7C7C]/20">
          <h2 className="text-xl font-lora text-[#271D1D] mb-4">
            Animated Loading Logo Test
          </h2>
          
          <div className="mb-6">
            <AnimatedLoadingLogo
              duration={5000}
              onComplete={handleComplete}
            />
          </div>
          
          <div className="text-sm text-[#9A7C7C] space-y-2">
            <p>• Logo should be outlined initially</p>
            <p>• Fill should start from bottom and move up</p>
            <p>• Duration: 5 seconds</p>
            <p>• Check console for debug logs</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#9A7C7C] text-white rounded-lg hover:bg-[#9A7C7C]/90 transition-colors"
          >
            🔄 Restart Test
          </button>
          
          <Link
            to="/test-loading"
            className="px-6 py-3 bg-[#D6CECE] text-[#271D1D] rounded-lg hover:bg-[#D6CECE]/90 transition-colors"
          >
            📱 Test Full Loading Page
          </Link>
          
          <Link
            to="/upload"
            className="px-6 py-3 border border-[#9A7C7C] text-[#9A7C7C] rounded-lg hover:bg-[#9A7C7C]/10 transition-colors"
          >
            ← Back to Upload
          </Link>
        </div>

        <div className="text-xs text-[#9A7C7C]/70 mt-8">
          <p>Test routes:</p>
          <p><code>/animation-test</code> - Logo only</p>
          <p><code>/test-loading</code> - Full page with entrance</p>
          <p><code>/loading</code> - Original loading page</p>
        </div>
      </div>
    </div>
  );
}
