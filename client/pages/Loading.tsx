import { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedLoadingLogo from "@/components/AnimatedLoadingLogo";

export default function Loading() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the upload info from navigation state
  const { selectedFile, solutionTitle, perspective } = location.state || {};

  const handleLoadingComplete = () => {
    // Navigate to results page after review completion
    // For now, navigate back to user solutions with success message
    setTimeout(() => {
      navigate('/user-solutions', {
        state: {
          reviewCompleted: true,
          fileName: selectedFile?.name,
          solutionTitle: solutionTitle,
          perspective: perspective
        }
      });
    }, 1000);
  };

  // Entrance animation
  useEffect(() => {
    console.log('📱 Loading page mounted!', { selectedFile, solutionTitle, perspective });

    // Trigger entrance animation after component mounts
    const timer = setTimeout(() => {
      console.log('✨ Loading page entrance animation started');
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Prevent navigation during loading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your document is being processed. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className={`min-h-screen bg-[#F9F8F8] flex flex-col transition-all duration-700 ease-out ${
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6">
        <Logo size="xl" />

        <div className="hidden md:flex items-center space-x-8">
          <span className="text-[#271D1D] cursor-default">Solutions</span>
          <span className="text-[#271D1D] cursor-default">News</span>
          <span className="text-[#271D1D] cursor-default">Team</span>

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
                <span className="block px-4 py-2 text-sm text-[#271D1D] opacity-50 cursor-not-allowed">Log Out</span>
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

          {/* Processing Info */}
          {selectedFile && solutionTitle && (
            <div className="text-center text-sm text-[#9A7C7C] font-roboto mt-4">
              <div>Processing: <span className="font-medium">{selectedFile.name}</span></div>
              <div>Solution: <span className="font-medium">{solutionTitle}</span></div>
              <div>Perspective: <span className="font-medium capitalize">{perspective}</span></div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
