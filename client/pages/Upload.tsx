import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, User, Upload as UploadIcon } from "lucide-react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useUser } from "@/contexts/SupabaseUserContext";
import { useToast } from "@/hooks/use-toast";
import { logError, createUserFriendlyMessage } from "@/utils/errorLogger";
import { reviewProcessingStore } from "@/lib/reviewProcessingStore";
import {
  uploadDocument,
  extractDocument,
} from "@/services/documentIngestionService";
import { supabase } from "@/lib/supabase";
import { deriveSolutionKey } from "@/utils/solutionMapping";

export default function Upload() {
  const { user, logout } = useUser();
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
  const [workflowStage, setWorkflowStage] = useState<string | null>(null);
  const [hasNavigatedToLoading, setHasNavigatedToLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    solutionId,
    solutionTitle,
    solutionKey: stateSolutionKey,
    perspective,
    perspectiveLabel: statePerspectiveLabel,
    quickUpload,
    adminAccess,
    customSolutionId: stateCustomSolutionId,
  } = location.state || {};

  const isUuid = (value?: string | null) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );

  const customSolutionId =
    stateCustomSolutionId ??
    (typeof solutionId === "string" && isUuid(solutionId)
      ? solutionId
      : undefined);

  const navigateToLoadingPage = useCallback(
    (fileLabel: string) => {
      if (hasNavigatedToLoading) {
        return;
      }
      setHasNavigatedToLoading(true);
      navigate("/loading", {
        state: {
          fileName: fileLabel,
          solutionTitle,
          perspective,
          perspectiveLabel: statePerspectiveLabel,
          customSolutionId,
        },
        replace: false,
      });
    },
    [
      customSolutionId,
      hasNavigatedToLoading,
      navigate,
      perspective,
      solutionTitle,
    ],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const organizationId = user?.organization?.id ?? null;
  const perspectiveLabel =
    statePerspectiveLabel ??
    (typeof perspective === "string"
      ? perspective.replace(/-/g, " ")
      : null);

  const paygOutOfCredits = Boolean(
    user?.plan?.type === "pay_as_you_go" &&
      (user.plan.payg?.creditsBalance ?? 0) <= 0,
  );

  useEffect(() => {
    if (paygOutOfCredits) {
      toast({
        title: "No reviews remaining",
        description: "Buy another review before uploading a contract.",
        variant: "destructive",
      });
      navigate("/user-dashboard", { replace: true });
    }
  }, [navigate, paygOutOfCredits, toast]);

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
      "text/plain",
    ];
    const fileName = file.name.toLowerCase();
    console.log("File selected:", file.name, "Type:", file.type);

    if (
      allowedTypes.includes(file.type) ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".txt")
    ) {
      setSelectedFile(file);
      setHasStartedProcess(true); // Mark that user has started the process
      console.log("File accepted:", file.name);
    } else {
      alert(
        `Please select a PDF, DOCX, or TXT file. You selected: ${file.type}`,
      );
      console.log("File rejected - invalid type:", file.type);
    }
  };

  const LOGOUT_DESTINATION = "__logout";

  const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault(); // Always prevent default to avoid conflicts
    if (!isSubmitting) {
      setPendingNavigation(path);
      setShowConfirmModal(true);
    }
  };

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setUserDropdownOpen(false);
    if (!isSubmitting) {
      setPendingNavigation(LOGOUT_DESTINATION);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmNavigation = () => {
    // Prevent multiple calls
    if (!showConfirmModal) return;

    // First, clean up modal state
    setShowConfirmModal(false);
    setHasStartedProcess(false);

    // Check blocker state before resetting it
    const wasBlocked = blocker.state === "blocked";

    // Add delay to prevent double-click issues
    setTimeout(() => {
      // Navigate to the pending destination
      if (pendingNavigation) {
        if (pendingNavigation === LOGOUT_DESTINATION) {
          setPendingNavigation(null);
          void logout();
        } else {
          navigate(pendingNavigation);
          setPendingNavigation(null);
        }
      } else if (wasBlocked) {
        // No pending navigation, proceed with the blocked navigation
        blocker.proceed();
      }
    }, 50);
  };

  const handleCancelNavigation = () => {
    // Prevent multiple calls
    if (!showConfirmModal) return;

    setShowConfirmModal(false);
    setPendingNavigation(null);

    // Add delay to prevent double-click issues
    setTimeout(() => {
      if (blocker.state === "blocked") {
        blocker.reset();
      }
    }, 50);
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


  const handleSubmit = async () => {
    console.log(
      "Submit clicked. Selected file:",
      selectedFile?.name,
      "Perspective:",
      perspective,
    );

    if (paygOutOfCredits) {
      toast({
        title: "No reviews remaining",
        description: "Purchase another review before uploading.",
        variant: "destructive",
      });
      navigate("/user-dashboard");
      return;
    }

    // Comprehensive validation before processing
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !user.authUserId) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload contracts.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const fileName = selectedFile.name.toLowerCase();
    const isValidType =
      allowedTypes.includes(selectedFile.type) ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".txt");

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or TXT file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size with type-specific limits
    let maxSize: number;
    let fileTypeName: string;

    if (selectedFile.type === "application/pdf" || fileName.endsWith(".pdf")) {
      maxSize = 5 * 1024 * 1024; // 5MB for PDFs
      fileTypeName = "PDF";
    } else if (
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      maxSize = 5 * 1024 * 1024; // 5MB for DOCX
      fileTypeName = "DOCX";
    } else {
      maxSize = 1 * 1024 * 1024; // 1MB for text files
      fileTypeName = "text";
    }

    if (selectedFile.size > maxSize) {
      const sizeMB = Math.round(selectedFile.size / 1024 / 1024);
      const limitMB = Math.round(maxSize / 1024 / 1024);
      toast({
        title: "File too large",
        description: `${fileTypeName} file is ${sizeMB}MB. Please use a file smaller than ${limitMB}MB or convert to text format.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file is not empty
    if (selectedFile.size === 0) {
      toast({
        title: "Empty file",
        description:
          "The selected file appears to be empty. Please choose a different file.",
        variant: "destructive",
      });
      return;
    }

    // Validate perspective is selected
    if (!perspective) {
      toast({
        title: "No analysis type selected",
        description: "Please select an analysis perspective before proceeding.",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ All validations passed, starting processing...");
    console.log("📁 File info:", {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      lastModified: new Date(selectedFile.lastModified).toISOString(),
    });

    const userProfileId = user.profileId ?? user.id;
    setHasNavigatedToLoading(false);

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

      if (showLoadingTransition) {
        console.warn("⚠️ Duplicate submission ignored while processing in progress.");
        return;
      }

      setWorkflowStage("uploading");
      const solutionKey = deriveSolutionKey(
        solutionId ?? stateSolutionKey,
        solutionTitle ?? stateSolutionKey,
      );

      const uploadResponse = await uploadDocument(selectedFile, {
        userId: user.authUserId,
        userProfileId,
      });
      console.log("📤 File uploaded to ingestion service", uploadResponse);

      setWorkflowStage("extracting");
      const extractionResponse = await extractDocument(
        uploadResponse.ingestionId,
      );
      console.log("📄 Extraction response received", extractionResponse);

      const extraction = extractionResponse.result;

      if (!extraction) {
        throw new Error("Document extraction did not return any data");
      }

      if (extraction.needsOcr) {
        throw new Error(
          "This document requires OCR processing before analysis. Please upload a text-based version (PDF/DOCX/TXT).",
        );
      }

      const extractedText = (extraction.text || "").trim();

      if (!extractedText) {
        throw new Error(
          "No readable text was extracted from the document. Please convert it to a text-based PDF or DOCX and try again.",
        );
      }

      // Warm up ingestion cache (text + clause digest) to speed up later analysis
      try {
        setWorkflowStage("preparing");
        const { error: ingestError } = await supabase.functions.invoke(
          "ingest-contract",
          {
            body: { ingestionId: uploadResponse.ingestionId },
          },
        );
        if (ingestError) {
          console.warn("⚠️ Ingestion warmup failed", ingestError);
        }
      } catch (err) {
        console.warn("⚠️ Ingestion warmup threw", err);
      }

      const reviewType = getReviewTypeFromPerspective(perspective);
      const normalizedFileName =
        extraction.originalFileName || uploadResponse.file.originalName;

      reviewProcessingStore.setPending({
        userAuthId: user.authUserId,
        userProfileId,
        contractInput: {
          title: normalizedFileName.replace(/\.[^/.]+$/, ""),
          content: extractedText,
          content_html: extraction.html ?? null,
          file_name: normalizedFileName,
          file_size: extraction.fileSize ?? uploadResponse.file.size,
          file_type: extraction.mimeType ?? uploadResponse.file.mimeType,
          ingestion_id: uploadResponse.ingestionId,
          ingestion_strategy: extraction.strategy,
          ingestion_warnings: extraction.warnings ?? [],
          ingestion_needs_ocr: extraction.needsOcr,
          document_word_count: extraction.wordCount,
          document_page_count: extraction.pageCount,
          user_auth_id: user.authUserId,
          user_profile_id: userProfileId,
          custom_solution_id: customSolutionId,
          selected_solution_id: solutionId,
          selected_solution_title: solutionTitle,
          selected_solution_key: solutionKey,
          assets: extraction.assets ?? undefined,
          organization_id: organizationId,
          perspective,
          perspective_label: perspectiveLabel,
        },
        reviewType,
        metadata: {
          fileName: normalizedFileName,
          fileSize: extraction.fileSize ?? uploadResponse.file.size,
          solutionTitle,
          solutionId,
          solutionKey,
          perspective,
          perspectiveLabel,
          ingestionWarnings: extraction.warnings ?? [],
          userProfileId,
          customSolutionId,
          organizationId,
        },
      });

      navigateToLoadingPage(normalizedFileName);

      if (extraction.warnings && extraction.warnings.length > 0) {
        console.warn("⚠️ Extraction warnings", extraction.warnings);
        toast({
          title: "Extraction completed with warnings",
          description:
            extraction.warnings[0] ||
            "Some parts of the document may be low quality. Analysis will continue with available text.",
        });
      }

      setWorkflowStage("ready");

      toast({
        title: "Processing contract",
        description: "Your contract is being analyzed...",
      });

    } catch (error) {
      // Log error with detailed context
      const errorDetails = logError("❌ Contract processing error", error, {
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        fileType: selectedFile?.type,
        perspective,
        userId: userProfileId,
      });

      // Reset UI state immediately to prevent stuck state
      setIsSubmitting(false);
      setUploadButtonHidden(false);
      setShowLoadingTransition(false);
      setWorkflowStage(null);
      setHasNavigatedToLoading(false);

      // Generate user-friendly error message using utility
      const userMessage = createUserFriendlyMessage(
        error,
        "There was an error processing your contract.",
      );
      let shouldRetry = true;

      // Determine retry logic based on error characteristics
      if (
        errorDetails.message.toLowerCase().includes("empty") ||
        errorDetails.message.toLowerCase().includes("unsupported") ||
        errorDetails.message.toLowerCase().includes("authentication") ||
        errorDetails.message.toLowerCase().includes("user id") ||
        errorDetails.message.toLowerCase().includes("invalid file") ||
        errorDetails.message.toLowerCase().includes("ocr") ||
        errorDetails.message.toLowerCase().includes("extraction")
      ) {
        shouldRetry = false;
      }

      // Show appropriate error toast
      toast({
        title: "Processing failed",
        description: `${userMessage}${shouldRetry ? " Please try again." : ""}`,
        variant: "destructive",
      });

      // Additional debugging context (main error already logged above)
      if (process.env.NODE_ENV === "development") {
        console.debug("📊 Error analysis context:", {
          userShouldRetry: shouldRetry,
          userMessage: userMessage,
          errorType: errorDetails.type,
          hasSelectedFile: !!selectedFile,
          hasUser: !!user,
        });
      }

      // Additional cleanup - clear selected file if it's a file issue
      if (
        !shouldRetry &&
        error instanceof Error &&
        error.message.toLowerCase().includes("file")
      ) {
        console.log("🧹 Clearing selected file due to file-related error");
        setSelectedFile(null);
      }
    }
  };

function getReviewTypeFromPerspective(perspective: string): string {
  switch (perspective) {
    case 'compliance':
    case 'compliance-review':
      return 'compliance_score';
    case 'risk':
    case 'risk-review':
      return 'risk_assessment';
    case 'perspective':
    case 'perspective-review':
    case 'stakeholder':
      return 'perspective_review';
    case 'ai-integration':
    case 'integration':
      return 'ai_integration';
    default:
      return 'full_summary';
  }
}

  return (
    <div
      className={`min-h-screen bg-[#F9F8F8] flex flex-col transition-all duration-1000 ${
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
          className={`w-full max-w-[800px] flex flex-col items-center gap-8 transition-all duration-1000 ${
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
                  Your {solutionTitle.toLowerCase()} will be analyzed with the
                  selected perspective. Maigon AI will start processing once
                  submitted.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[#271D1D] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[90px] mb-4">
                  Upload your document
                </h1>
                <p className="text-black font-roboto text-sm lg:text-base font-normal leading-relaxed">
                  Once your document is uploaded and submitted, Maigon AI will
                  start analysing and generating your review.
                </p>
              </>
            )}
            {perspective && (
              <div className="mt-4 inline-flex items-center px-3 py-1 bg-[#9A7C7C]/10 border border-[#9A7C7C]/20 rounded-full">
                <span className="text-[#9A7C7C] text-sm font-medium">
                  Analysis Perspective:{" "}
                  {perspectiveLabel ?? perspective.replace(/-/g, " ")}
                </span>
              </div>
            )}
            {workflowStage && (
              <div className="mt-4 text-sm text-[#6F5E5E]">
                {workflowStage === "uploading" && 'Uploading document to secure ingestion...'}
                {workflowStage === "extracting" && 'Extracting readable text from your document...'}
                {workflowStage === "ready" && 'Text extracted. Preparing intelligent analysis...'}
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
                docx, pdf
              </span>
            </div>

            {/* Submit Button */}
            <div
              className={`absolute right-0 top-[66px] transition-all duration-1000 ease-out ${
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
                  <span className="font-medium">{solutionTitle}</span> Analysis
                  •{" "}
                  <span className="font-medium capitalize">
                    {perspective.replace("-", " ")}
                  </span>{" "}
                  Perspective
                  {adminAccess && (
                    <span className="ml-2 px-2 py-1 bg-[#9A7C7C]/10 rounded text-xs">
                      Admin Mode
                    </span>
                  )}
                </>
              ) : (
                <>
                  Selected: <span className="font-medium">{solutionTitle}</span>{" "}
                  • Perspective:{" "}
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
