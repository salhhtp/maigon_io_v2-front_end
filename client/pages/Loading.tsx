import { useEffect, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import AnimatedLoadingLogo from "@/components/AnimatedLoadingLogo";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useUser } from "@/contexts/SupabaseUserContext";
import { useToast } from "@/hooks/use-toast";
import { logError, createUserFriendlyMessage } from "@/utils/errorLogger";
import { reviewProcessingStore } from "@/lib/reviewProcessingStore";
import { DataService } from "@/services/dataService";
import type { ContractReviewPayload } from "@shared/api";

export default function Loading() {
  const { user } = useUser();
  const { toast } = useToast();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] =
    useState<ContractReviewPayload | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [logoProgress, setLogoProgress] = useState(4);
  const [processingFinishedAt, setProcessingFinishedAt] = useState<
    number | null
  >(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get the upload info from navigation state
  const initialState = location.state || {};
  const [displayInfo, setDisplayInfo] = useState({
    fileName: initialState?.fileName as string | undefined,
    solutionTitle: initialState?.solutionTitle as string | undefined,
    perspective: initialState?.perspective as string | undefined,
  });

  // Block navigation when processing is in progress
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isProcessing && currentLocation.pathname !== nextLocation.pathname,
  );

  const handleAnimationFinished = () => {
    setAnimationComplete(true);
  };

  useEffect(() => {
    const pending = reviewProcessingStore.consumePending();

    if (!pending) {
      setProcessingError(
        "We couldn't find a contract to process. Please upload your document again.",
      );
      setIsProcessing(false);
      return;
    }

    setDisplayInfo((prev) => ({
      fileName: pending.metadata.fileName || prev.fileName,
      solutionTitle: pending.metadata.solutionTitle || prev.solutionTitle,
      perspective: pending.metadata.perspective || prev.perspective,
    }));

    const runProcessing = async () => {
      try {
        const result = await DataService.processContractWorkflow(
          pending.userId,
          pending.contractInput,
          pending.reviewType,
        );

        const payload: ContractReviewPayload = {
          contract: result.contract,
          review: result.review,
          metadata: pending.metadata,
        };

        sessionStorage.setItem("maigon:lastReview", JSON.stringify(payload));

        setPendingResult(payload);
        setIsProcessing(false);
        setProcessingFinishedAt(Date.now());
        setLogoProgress((prev) => Math.max(prev, 94));

        toast({
          title: "Contract processed successfully",
          description: "Review completed. Preparing your report...",
        });
      } catch (error) {
        const errorDetails = logError("❌ Contract processing error", error, {
          userId: pending.userId,
          reviewType: pending.reviewType,
          fileName: pending.metadata.fileName,
        });

        const userMessage = createUserFriendlyMessage(
          error,
          "There was an error processing your contract. Please try again.",
        );

        setProcessingError(userMessage);
        setIsProcessing(false);
        setProcessingFinishedAt(Date.now());
        reviewProcessingStore.clear();
        toast({
          title: "Processing failed",
          description: userMessage,
          variant: "destructive",
        });
      }
    };

    runProcessing();
  }, [toast]);

  useEffect(() => {
    const updateInterval = window.setInterval(() => {
      setLogoProgress((prev) => {
        const finishedAt = processingFinishedAt;
        const now = Date.now();

        let target = 92;
        let step = 0.8;

        if (pendingResult) {
          const elapsed = finishedAt ? now - finishedAt : 0;
          if (elapsed >= 1400) {
            target = 100;
            step = 1.5;
          } else {
            target = 99;
            step = 1.0;
          }
        } else if (!isProcessing) {
          target = 96;
          step = 0.9;
        }

        if (processingError) {
          target = 96;
          step = 0.6;
        }

        if (prev >= target) {
          return prev;
        }

        const next = Math.min(target, prev + step);
        return Number(next.toFixed(2));
      });
    }, 120);

    return () => {
      window.clearInterval(updateInterval);
    };
  }, [isProcessing, pendingResult, processingFinishedAt, processingError]);

  useEffect(() => {
    if (!pendingResult || !animationComplete) {
      return;
    }

    const timeout = window.setTimeout(() => {
      navigate("/contract-review", {
        state: {
          contract: pendingResult.contract,
          review: pendingResult.review,
          metadata: pendingResult.metadata,
        },
        replace: true,
      });
    }, 650);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pendingResult, animationComplete, navigate]);

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
              onComplete={handleAnimationFinished}
              isComplete={Boolean(pendingResult)}
              externalProgress={logoProgress}
              outlineColor="#CDBABA"
              fillColor="#CDBABA"
            />
          </div>

          {/* Processing Info */}
          {(displayInfo.fileName || displayInfo.solutionTitle) && (
            <div className="text-center text-sm text-[#9A7C7C] font-roboto mt-4">
              <div>
                Processing:{" "}
                <span className="font-medium">
                  {displayInfo.fileName || "Contract"}
                </span>
              </div>
              <div>
                Solution:{" "}
                <span className="font-medium">
                  {displayInfo.solutionTitle || "Custom Analysis"}
                </span>
              </div>
              <div>
                Perspective:{" "}
                <span className="font-medium capitalize">
                  {displayInfo.perspective || "general"}
                </span>
              </div>
            </div>
          )}

          {processingError && (
            <div className="mt-6 w-full max-w-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
              <p className="text-sm font-medium">{processingError}</p>
              <button
                onClick={() => navigate("/upload")}
                className="mt-3 text-sm font-medium underline hover:text-red-800"
              >
                Return to upload
              </button>
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
