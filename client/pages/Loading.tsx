import { useCallback, useEffect, useRef, useState } from "react";
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

const PROGRESS_MESSAGES: Record<string, string> = {
  preparing: "Preparing contract upload…",
  uploading: "Uploading securely…",
  extracting: "Extracting text…",
  classification_complete: "Identifying contract type…",
  contract_persisted: "Saving contract securely…",
  analysis_start: "Analyzing clauses with GPT-5…",
  analysis_complete: "Summarizing review findings…",
  review_saved: "Finalizing your report…",
  complete: "Report ready",
  error: "Review interrupted",
};

const STAGE_PROGRESS: Record<string, number> = {
  preparing: 6,
  uploading: 12,
  extracting: 18,
  classification_complete: 22,
  contract_persisted: 42,
  analysis_start: 55,
  analysis_complete: 85,
  review_saved: 96,
  complete: 99,
  error: 96,
};

export default function Loading() {
  const { user, logout, refreshUser } = useUser();
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
  const [targetProgress, setTargetProgress] = useState(6);
  const [workflowStageMessage, setWorkflowStageMessage] = useState(
    PROGRESS_MESSAGES.preparing,
  );
  const [allowCompletion, setAllowCompletion] = useState(false);
  const hasStartedProcessingRef = useRef(false); // prevents duplicate workflow execution when context updates
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

  const handleWorkflowProgress = useCallback((stage: string, percent: number) => {
    setWorkflowStageMessage(
      PROGRESS_MESSAGES[stage] ?? "Processing contract…",
    );
    setTargetProgress((prev) => {
      const fallbackPercent =
        typeof percent === "number" && Number.isFinite(percent) ? percent : prev;
      const mapped =
        stage === "complete"
          ? STAGE_PROGRESS.complete
          : Math.min(
              STAGE_PROGRESS[stage] ?? fallbackPercent,
              STAGE_PROGRESS.complete - 2,
            );
      return Math.max(prev, mapped);
    });
  }, []);

  const handleAnimationFinished = () => {
    setAnimationComplete(true);
  };

  useEffect(() => {
    if (hasStartedProcessingRef.current) {
      return;
    }
    hasStartedProcessingRef.current = true;

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
          {
            authId: pending.userAuthId,
            profileId: pending.userProfileId,
          },
          pending.contractInput,
          pending.reviewType,
          {
            onProgress: handleWorkflowProgress,
          },
        );

        if (user?.plan.type === "pay_as_you_go" && user?.id) {
          try {
            await DataService.paygCredits.consume({
              userId: user.id,
              amount: 1,
              reason: "consumption",
              referenceId: result.contract?.id ?? null,
              metadata: {
                ingestionId: (pending as any)?.contractInput?.ingestion_id ?? null,
              },
            });
            void refreshUser();
          } catch (creditError) {
            logError("Failed to decrement PAYG credits", creditError, {
              userId: user.id,
            });
          }
        }

        const payload: ContractReviewPayload = {
          contract: result.contract,
          review: result.review,
          metadata: {
            ...pending.metadata,
            customSolutionId:
              pending.metadata?.customSolutionId ??
              pending.contractInput?.custom_solution_id ??
              undefined,
          },
          classification: result.classification ?? null,
          timings: result.timings,
        };

        sessionStorage.setItem("maigon:lastReview", JSON.stringify(payload));

        setPendingResult(payload);
        setIsProcessing(false);
        setWorkflowStageMessage(PROGRESS_MESSAGES.complete);
        setTargetProgress((prev) =>
          Math.max(prev, STAGE_PROGRESS.complete - 1),
        );
        setAllowCompletion(true);

        toast({
          title: "Contract processed successfully",
          description: "Review completed. Preparing your report...",
        });
      } catch (error) {
        const errorDetails = logError("❌ Contract processing error", error, {
          userId: pending.userProfileId || pending.userAuthId,
          reviewType: pending.reviewType,
          fileName: pending.metadata.fileName,
        });

        const userMessage = createUserFriendlyMessage(
          error,
          "There was an error processing your contract. Please try again.",
        );

        setWorkflowStageMessage(PROGRESS_MESSAGES.error);
        setProcessingError(userMessage);
        setIsProcessing(false);
        setAllowCompletion(true);
        setTargetProgress((prev) => Math.max(prev, 96));
        reviewProcessingStore.clear();
        toast({
          title: "Processing failed",
          description: userMessage,
          variant: "destructive",
        });
      }
    };

    runProcessing();
  }, [handleWorkflowProgress, refreshUser, toast, user?.id, user?.plan?.type]);

  useEffect(() => {
    const updateInterval = window.setInterval(() => {
      setLogoProgress((prev) => {
        const destination = allowCompletion ? 100 : targetProgress;
        if (prev >= destination) {
          return prev;
        }
        const delta = destination - prev;
        const increment = Math.max(0.1, Math.min(delta, delta * 0.12));
        const next = Math.min(destination, prev + increment);
        return Number(next.toFixed(2));
      });
    }, 160);

    return () => {
      window.clearInterval(updateInterval);
    };
  }, [allowCompletion, targetProgress]);

  useEffect(() => {
    if (!pendingResult || !animationComplete) {
      return;
    }

    const timeout = window.setTimeout(() => {
      navigate("/contract-review", {
        state: pendingResult,
        replace: true,
      });
    }, 650);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pendingResult, animationComplete, navigate]);

  const LOGOUT_DESTINATION = "__logout";

  const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default to avoid conflicts
    if (isProcessing) {
      setPendingNavigation(path);
      setShowConfirmModal(true);
    } else {
      // If not processing, navigate directly
      if (path === LOGOUT_DESTINATION) {
        void logout();
      } else {
        navigate(path);
      }
    }
  };

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setUserDropdownOpen(false);
    if (isProcessing) {
      setPendingNavigation(LOGOUT_DESTINATION);
      setShowConfirmModal(true);
    } else {
      void logout();
    }
  };

  const handleConfirmNavigation = () => {
    setIsProcessing(false);
    setShowConfirmModal(false);

    if (pendingNavigation === LOGOUT_DESTINATION) {
      setPendingNavigation(null);
      void logout();
      return;
    }

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
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="block w-full text-left px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors"
                >
                  Log Out
                </button>
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
              duration={45000}
              onComplete={handleAnimationFinished}
              isComplete={allowCompletion}
              externalProgress={logoProgress}
              outlineColor="#CDBABA"
              fillColor="#CDBABA"
            />
            <p className="mt-3 text-center text-xs text-[#9A7C7C]">
              {workflowStageMessage}
            </p>
          </div>

          {/* Processing Info */}
          {displayInfo.fileName && (
            <div className="text-center text-sm text-[#9A7C7C] font-roboto mt-4">
              Processing:
              <span className="font-medium"> {displayInfo.fileName}</span>
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
