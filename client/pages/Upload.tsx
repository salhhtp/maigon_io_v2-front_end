import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Upload as UploadIcon, AlertCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useUser } from "@/contexts/SupabaseUserContext";
import { useToast } from "@/hooks/use-toast";
import { reviewProcessingStore } from "@/lib/reviewProcessingStore";

export default function Upload() {
  const { user } = useUser();
  const { toast } = useToast();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [hasStartedProcess, setHasStartedProcess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadButtonHidden, setUploadButtonHidden] = useState(false);
  const [showLoadingTransition, setShowLoadingTransition] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get the solution info from navigation state
  const { solutionTitle, perspective, quickUpload, adminAccess } = location.state || {};

  // Block navigation when user is on upload page (always show confirmation), but not during submission
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname === "/upload" &&
      currentLocation.pathname !== nextLocation.pathname &&
      !isSubmitting, // Don't block navigation during submission process
  );

  // Handle browser back/forward buttons and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showConfirmModal) {
        // Only show if modal isn't already open
        e.preventDefault();
        e.returnValue =
          "You will lose all your progress and need to start all over again if you leave this page.";
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (!showConfirmModal) {
        // Only show if modal isn't already open
        e.preventDefault();
        setShowConfirmModal(true);
        window.history.pushState(null, "", window.location.href);
      }
    };

    // Always add listeners when on upload page
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    // Prevent back navigation
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showConfirmModal]);

  // Handle React Router navigation blocking
  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowConfirmModal(true);
    }
  }, [blocker.state]);

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    console.log("File selected:", file.name, "Type:", file.type);

    if (allowedTypes.includes(file.type)) {
      setSelectedFile(file);
      setHasStartedProcess(true); // Mark that user has started the process
      console.log("File accepted:", file.name);
    } else {
      alert(`Please select a PDF or DOCX file. You selected: ${file.type}`);
      console.log("File rejected - invalid type:", file.type);
    }
  };

  const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default to avoid conflicts
    if (!isSubmitting) {
      setPendingNavigation(path);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmNavigation = () => {
    // First, clean up modal state
    setShowConfirmModal(false);
    setHasStartedProcess(false);

    // Check blocker state before resetting it
    const wasBlocked = blocker.state === "blocked";

    // Navigate to the pending destination
    if (pendingNavigation) {
      // We have a specific destination to navigate to
      navigate(pendingNavigation);
      setPendingNavigation(null);
    } else if (wasBlocked) {
      // No pending navigation, proceed with the blocked navigation
      blocker.proceed();
    }
  };

  const handleCancelNavigation = () => {
    setShowConfirmModal(false);
    setPendingNavigation(null);

    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Helper function to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Helper function to determine review type from perspective
  const getReviewTypeFromPerspective = (perspectiveValue: string): string => {
    switch (perspectiveValue) {
      case 'risk':
        return 'risk_assessment';
      case 'compliance':
        return 'compliance_score';
      case 'perspective':
        return 'perspective_review';
      case 'summary':
        return 'full_summary';
      case 'ai':
        return 'ai_integration';
      default:
        return 'full_summary';
    }
  };

  const handleSubmit = async () => {
    console.log(
      "Submit clicked. Selected file:",
      selectedFile?.name,
      "Perspective:",
      perspective,
    );

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload contracts.",
        variant: "destructive",
      });
      return;
    }

    // Step 1: Submit Clicked → Smart Animate - Ease Out - 1500ms
    setIsSubmitting(true);
    console.log("Starting contract processing workflow...");

    try {
      setTimeout(() => {
        setUploadButtonHidden(true);
      }, 1);

      setTimeout(() => {
        setShowLoadingTransition(true);
      }, 2);

      const fileContent = await readFileContent(selectedFile);
      const reviewType = getReviewTypeFromPerspective(perspective);

      reviewProcessingStore.setPending({
        userId: user.id,
        contractInput: {
          title: selectedFile.name.replace(/\.[^/.]+$/, ""),
          content: fileContent,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        },
        reviewType,
        metadata: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          solutionTitle,
          perspective,
        },
      });

      toast({
        title: "Processing contract",
        description: "Your contract is being analyzed...",
      });

      navigate("/loading", {
        state: {
          fileName: selectedFile.name,
          solutionTitle,
          perspective,
        },
        replace: true,
      });
    } catch (error) {
      console.error("Contract preparation failed:", error);
      setIsSubmitting(false);
      setUploadButtonHidden(false);
      setShowLoadingTransition(false);

      toast({
        title: "Processing failed",
        description: "There was an error preparing your contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#F9F8F8] flex flex-col transition-all duration-[1500ms] ${
        showLoadingTransition
          ? "opacity-0 ease-in-out transform scale-105"
          : isSubmitting
            ? "opacity-80 ease-out"
            : "opacity-100"
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
            onClick={handleLinkClick("/news")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            News
          </div>
          <div
            onClick={handleLinkClick("/team")}
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
          className={`w-full max-w-[800px] flex flex-col items-center gap-8 transition-all duration-[1500ms] ${
            isSubmitting ? "ease-out" : ""
          } ${showLoadingTransition ? "opacity-0 scale-110" : isSubmitting ? "opacity-70 scale-98" : "opacity-100 scale-100"}`}
        >
          {/* Header */}
          <div className="text-center">
            {quickUpload && solutionTitle ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="px-3 py-1 bg-[#9A7C7C]/10 text-[#9A7C7C] rounded-full text-sm font-medium">
                    {adminAccess ? "Admin Quick Upload" : "Quick Upload"}
                  </div>
                </div>
                <h1 className="text-[#271D1D] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[90px] mb-4">
                  Upload {solutionTitle}
                </h1>
                <p className="text-black font-roboto text-sm lg:text-base font-normal leading-relaxed">
                  Your {solutionTitle.toLowerCase()} will be analyzed with the selected perspective.
                  Maigon AI will start processing once submitted.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[#271D1D] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[90px] mb-4">
                  Upload your document
                </h1>
                <p className="text-black font-roboto text-sm lg:text-base font-normal leading-relaxed">
                  Once your document is uploaded and submitted, Maigon AI will start
                  analysing and generating your review.
                </p>
              </>
            )}
            {perspective && (
              <div className="mt-4 inline-flex items-center px-3 py-1 bg-[#9A7C7C]/10 border border-[#9A7C7C]/20 rounded-full">
                <span className="text-[#9A7C7C] text-sm font-medium">
                  Analysis Perspective:{" "}
                  {perspective === "data-subject"
                    ? "Data Subject"
                    : "Organization"}
                </span>
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="w-full max-w-[624px] relative">
            {/* Upload Area */}
            <div
              className={`relative w-full h-14 rounded-lg cursor-pointer transition-colors ${
                isDragOver
                  ? "bg-[#C4B5B5]"
                  : selectedFile
                    ? "bg-[#B6A5A5]"
                    : "bg-[#D6CECE] hover:bg-[#C4B5B5]"
              }`}
              onClick={handleUploadClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Progress Bar Background */}
              <div
                className="absolute left-0.5 top-0 h-full w-0 bg-[#B6A5A5] rounded-lg transition-all duration-300"
                style={{ width: selectedFile ? "100%" : "0%" }}
              />

              {/* Upload Content */}
              <div className="relative z-10 flex items-center justify-end h-full px-6">
                <div className="flex items-center gap-4">
                  {selectedFile ? (
                    <span className="text-[#271D1D] font-roboto text-sm">
                      {selectedFile.name}
                    </span>
                  ) : (
                    <span className="text-[#271D1D] font-roboto text-sm">
                      Click to upload or drag and drop
                    </span>
                  )}
                  <UploadIcon className="w-8 h-8 text-[#271D1D]" />
                </div>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Supported Formats */}
            <div className="flex items-end gap-3 mt-4">
              <span className="text-black font-lora text-xs font-medium">
                Supported Formats
              </span>
              <span className="text-black font-roboto text-xs font-normal tracking-[0.08px]">
                docx • pdf •
              </span>
            </div>

            {/* Submit Button */}
            <div
              className={`absolute right-0 top-[66px] transition-all duration-[1500ms] ease-out ${
                uploadButtonHidden
                  ? "opacity-0 scale-0 pointer-events-none"
                  : "opacity-100 scale-100"
              }`}
            >
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-[#F9F8F8] px-8 py-2 rounded-lg font-roboto text-base font-normal leading-6 tracking-[0.16px] disabled:opacity-70"
              >
                Submit
              </Button>
            </div>
          </div>

          {/* Solution Info */}
          {solutionTitle && perspective && (
            <div className="text-center text-sm text-[#9A7C7C] font-roboto">
              {quickUpload ? (
                <>
                  <span className="font-medium">{solutionTitle}</span> Analysis •{" "}
                  <span className="font-medium capitalize">{perspective.replace("-", " ")}</span> Perspective
                  {adminAccess && <span className="ml-2 px-2 py-1 bg-[#9A7C7C]/10 rounded text-xs">Admin Mode</span>}
                </>
              ) : (
                <>
                  Selected: <span className="font-medium">{solutionTitle}</span> •
                  Perspective:{" "}
                  <span className="font-medium capitalize">{perspective}</span>
                </>
              )}
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
