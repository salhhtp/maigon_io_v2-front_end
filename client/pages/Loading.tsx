import { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedLoadingLogo from "@/components/AnimatedLoadingLogo";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useUser } from "@/contexts/UserContext";

export default function Loading() {
  const { user } = useUser();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Get the upload info from navigation state
  const { selectedFile, solutionTitle, perspective } = location.state || {};

  // Block navigation when processing is in progress
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isProcessing && currentLocation.pathname !== nextLocation.pathname,
  );

  const handleLoadingComplete = () => {
    setIsProcessing(false);
    // Navigate to contract review results page
    setTimeout(() => {
      navigate("/contract-review", {
        state: {
          selectedFile: selectedFile,
          solutionTitle: solutionTitle,
          perspective: perspective,
        },
      });
    }, 1000);
  };

  const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default to avoid conflicts
    if (isProcessing) {
      setPendingNavigation(path);
      setShowConfirmModal(true);
    } else {
      // If not processing, navigate directly
      navigate(path);
    }
  };

  const handleConfirmNavigation = () => {
    setIsProcessing(false);
    setShowConfirmModal(false);

    if (blocker.state === "blocked") {
      blocker.proceed();
    } else if (pendingNavigation) {
      navigate(pendingNavigation);
    }

    setPendingNavigation(null);
  };

  const handleCancelNavigation = () => {
    setShowConfirmModal(false);
    setPendingNavigation(null);

    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  // Entrance animation
  useEffect(() => {
    // Trigger entrance animation after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // The AnimatedLoadingLogo component handles the loading progression and calls handleLoadingComplete when done

  // Handle React Router navigation blocking
  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowConfirmModal(true);
    }
  }, [blocker.state]);

  // Handle browser back/forward buttons and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue =
          "Your document is being processed. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isProcessing) {
        e.preventDefault();
        setShowConfirmModal(true);
        window.history.pushState(null, "", window.location.href);
      }
    };

    if (isProcessing) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("popstate", handlePopState);
      // Prevent back navigation
      window.history.pushState(null, "", window.location.href);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isProcessing]);

  return (
    <div
      className={`min-h-screen bg-[#F9F8F8] flex flex-col transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6">
        <div onClick={handleLinkClick("/home")} className="cursor-pointer">
          <Logo size="xl" />
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <div
            onClick={handleLinkClick("/user-solutions")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            Solutions
          </div>
          <div
            onClick={handleLinkClick("/user-news")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            News
          </div>
          <div
            onClick={handleLinkClick("/user-team")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            Team
          </div>

          {/* User Button */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 bg-[#D6CECE] hover:bg-[#D6CECE]/90 px-4 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-[#271D1D]" />
              <span className="text-[#271D1D] font-medium">
                @{user?.name?.split(" ")[0] || "User"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#271D1D] transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-[#271D1D]/15 rounded-lg shadow-lg py-2 z-10">
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Profile
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Settings
                </a>
                <div
                  onClick={handleLinkClick("/")}
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors cursor-pointer"
                >
                  Log Out
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 lg:px-16 py-20">
        <div
          className={`w-full max-w-[554px] flex flex-col items-center gap-7 transition-all duration-1000 ${
            isVisible
              ? "transform translate-y-0 scale-100 opacity-100"
              : "transform translate-y-8 scale-95 opacity-0"
          }`}
          style={{
            transitionTimingFunction: isVisible
              ? "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
              : "ease-out",
          }}
        >
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
              duration={8000} // 8 seconds - good for demo while showing full animation
              onComplete={handleLoadingComplete}
            />
          </div>

          {/* Processing Info */}
          {selectedFile && solutionTitle && (
            <div className="text-center text-sm text-[#9A7C7C] font-roboto mt-4">
              <div>
                Processing:{" "}
                <span className="font-medium">{selectedFile.name}</span>
              </div>
              <div>
                Solution: <span className="font-medium">{solutionTitle}</span>
              </div>
              <div>
                Perspective:{" "}
                <span className="font-medium capitalize">{perspective}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
}
