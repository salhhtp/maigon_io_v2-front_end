import { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedLoadingLogo from "@/components/AnimatedLoadingLogo";

export default function TestLoading() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const handleLoadingComplete = () => {
    console.log('🎉 Loading animation completed successfully!');
    alert('Loading animation completed! The logo filled from bottom to top.');
  };

  // Entrance animation
  useEffect(() => {
    console.log('📱 Test Loading page mounted - starting animations...');
    
    // Trigger entrance animation after component mounts
    const timer = setTimeout(() => {
      console.log('✨ Loading page entrance animation started');
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen bg-[#F9F8F8] flex flex-col transition-all duration-700 ease-out ${
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6">
        <Link to="/upload">
          <Logo size="xl" />
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link to="/user-solutions" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Solutions</Link>
          <Link to="/news" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">News</Link>
          <Link to="/team" className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors">Team</Link>

          {/* User Button */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">@Salih</span>
              <ChevronDown className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                <a href="#" className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors">Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors">Settings</a>
                <Link to="/" className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors">Log Out</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 lg:px-16 py-20">
        <div className={`w-full max-w-[554px] flex flex-col items-center gap-7 transition-all duration-1000 ${
          isVisible ? 'transform translate-y-0 scale-100 opacity-100' : 'transform translate-y-8 scale-95 opacity-0'
        }`} style={{ 
          transitionTimingFunction: isVisible ? 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'ease-out'
        }}>
          
          {/* Header Text */}
          <div className="w-full max-w-[237px] flex flex-col items-center gap-2">
            <div className="text-center px-2.5 py-2.5">
              <h1 className="text-black font-lora text-xl lg:text-2xl font-medium leading-6">
                Don't go anywhere!
              </h1>
            </div>
            <div className="text-center px-2.5 py-2.5">
              <p className="text-black font-roboto text-xs font-normal leading-6">
                This won't take too long
              </p>
            </div>
          </div>

          {/* Animated Loading Logo */}
          <div className="w-full px-2.5 py-2.5">
            <AnimatedLoadingLogo
              duration={5000} // 5 seconds for testing
              onComplete={handleLoadingComplete}
            />
          </div>

          {/* Test Info */}
          <div className="text-center text-sm text-[#9A7C7C] font-roboto mt-4">
            <div className="bg-white/50 rounded-lg p-4 border border-[#9A7C7C]/20">
              <h3 className="font-medium mb-2">🧪 Test Mode</h3>
              <div>Testing loading animation independently</div>
              <div>Duration: 5 seconds</div>
              <div>Fill direction: Bottom to top</div>
              <div className="mt-2 text-xs opacity-70">Check console for debug logs</div>
            </div>
          </div>

          {/* Manual Reset Button */}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#9A7C7C] text-white rounded-lg hover:bg-[#9A7C7C]/90 transition-colors text-sm"
          >
            🔄 Restart Animation
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
