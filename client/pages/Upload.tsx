import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Upload as UploadIcon, AlertCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ConfirmationModal";
import ContractClassificationDisplay from "@/components/ContractClassificationDisplay";
import { useUser } from "@/contexts/SupabaseUserContext";
import { DataService } from "@/services/dataService";
import { useToast } from "@/hooks/use-toast";

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
  const [contractClassification, setContractClassification] = useState<any>(null);
  const [showClassification, setShowClassification] = useState(false);
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
      "text/plain"
    ];
    const fileName = file.name.toLowerCase();
    console.log("File selected:", file.name, "Type:", file.type);

    if (allowedTypes.includes(file.type) || fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.txt')) {
      setSelectedFile(file);
      setHasStartedProcess(true); // Mark that user has started the process
      console.log("File accepted:", file.name);
    } else {
      alert(`Please select a PDF, DOCX, or TXT file. You selected: ${file.type}`);
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
        // We have a specific destination to navigate to
        navigate(pendingNavigation);
        setPendingNavigation(null);
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

  // Helper function to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      // PDF files - use PDF.js or similar for parsing in production
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        console.log('PDF file detected, processing with file reader...');

        // Check file size limit (5MB for PDFs to prevent processing issues)
        const maxPdfSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxPdfSize) {
          reject(new Error(`PDF file is too large (${Math.round(file.size / 1024 / 1024)}MB). Please use a PDF smaller than 5MB or convert to text format.`));
          return;
        }

        // For production PDF parsing, we'll read the file and send it to the backend
        // The backend Edge function will handle PDF text extraction
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              reject(new Error('Failed to read PDF file'));
              return;
            }

            console.log(`📄 Processing PDF: ${file.name} (${Math.round(file.size / 1024)}KB)`);

            // Convert to base64 using the most reliable method for large files
            const uint8Array = new Uint8Array(arrayBuffer);
            let base64 = '';

            // Process in smaller chunks to avoid "Maximum call stack size exceeded" error
            const chunkSize = 1024; // Smaller chunk size for better reliability
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.slice(i, i + chunkSize);
              // Use safer approach without .apply() which causes stack overflow
              let chunkString = '';
              for (let j = 0; j < chunk.length; j++) {
                chunkString += String.fromCharCode(chunk[j]);
              }
              base64 += btoa(chunkString);
            }

            console.log(`✅ PDF converted to base64 successfully (${Math.round(base64.length / 1024)}KB)`);

            // Return special marker indicating this is a PDF that needs backend processing
            resolve(`PDF_FILE_BASE64:${base64}`);
          } catch (error) {
            console.error('❌ PDF processing error:', error);
            reject(new Error(`Failed to process PDF file: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a smaller PDF or convert to text format.`));
          }
        };
        reader.onerror = (error) => {
          console.error('❌ PDF file reading error:', error);
          reject(new Error('Failed to read PDF file. Please ensure the file is not corrupted.'));
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      // For text files, read as text
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content && content.trim().length > 0) {
            resolve(content);
          } else {
            reject(new Error('File appears to be empty or unreadable'));
          }
        };
        reader.onerror = (e) => reject(new Error('Failed to read file: ' + e.target?.error?.message));
        reader.readAsText(file);
        return;
      }

      // DOCX files - process similarly to PDF
      if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        console.log('DOCX file detected, processing with file reader...');

        // Check file size limit (5MB for DOCX files)
        const maxDocxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxDocxSize) {
          reject(new Error(`DOCX file is too large (${Math.round(file.size / 1024 / 1024)}MB). Please use a file smaller than 5MB or convert to text format.`));
          return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              reject(new Error('Failed to read DOCX file'));
              return;
            }

            console.log(`📄 Processing DOCX: ${file.name} (${Math.round(file.size / 1024)}KB)`);

            // Convert to base64 using the most reliable method for large files
            const uint8Array = new Uint8Array(arrayBuffer);
            let base64 = '';

            // Process in smaller chunks to avoid "Maximum call stack size exceeded" error
            const chunkSize = 1024; // Smaller chunk size for better reliability
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.slice(i, i + chunkSize);
              // Use safer approach without .apply() which causes stack overflow
              let chunkString = '';
              for (let j = 0; j < chunk.length; j++) {
                chunkString += String.fromCharCode(chunk[j]);
              }
              base64 += btoa(chunkString);
            }

            console.log(`✅ DOCX converted to base64 successfully (${Math.round(base64.length / 1024)}KB)`);

            // Return special marker indicating this is a DOCX that needs backend processing
            resolve(`DOCX_FILE_BASE64:${base64}`);
          } catch (error) {
            console.error('❌ DOCX processing error:', error);
            reject(new Error(`Failed to process DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a smaller file or convert to text format.`));
          }
        };
        reader.onerror = (error) => {
          console.error('❌ DOCX file reading error:', error);
          reject(new Error('Failed to read DOCX file. Please ensure the file is not corrupted.'));
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      // Unsupported file type
      reject(new Error(`Unsupported file type: ${fileType}. Please upload a PDF, DOCX, or TXT file.`));
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

    // Comprehensive validation before processing
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

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const fileName = selectedFile.name.toLowerCase();
    const isValidType = allowedTypes.includes(selectedFile.type) ||
                       fileName.endsWith('.pdf') ||
                       fileName.endsWith('.docx') ||
                       fileName.endsWith('.txt');

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

    if (selectedFile.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      maxSize = 5 * 1024 * 1024; // 5MB for PDFs
      fileTypeName = 'PDF';
    } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      maxSize = 5 * 1024 * 1024; // 5MB for DOCX
      fileTypeName = 'DOCX';
    } else {
      maxSize = 1 * 1024 * 1024; // 1MB for text files
      fileTypeName = 'text';
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
        description: "The selected file appears to be empty. Please choose a different file.",
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
      lastModified: new Date(selectedFile.lastModified).toISOString()
    });

    // Step 1: Submit Clicked → Smart Animate - Ease Out - 1500ms
    setIsSubmitting(true);
    console.log("Starting real contract processing...");

    try {
      // Step 2: After Delay - 1ms → Smart Animate - Ease out 1500ms → Disappeared Upload Button
      setTimeout(() => {
        setUploadButtonHidden(true);
      }, 1);

      // Step 3: After Delay 1ms → Smart Animate - Ease in and out back → Loading Screen pops up
      setTimeout(() => {
        setShowLoadingTransition(true);
      }, 2);

      // Read file content
      const fileContent = await readFileContent(selectedFile);

      // Determine review type based on perspective
      const reviewType = getReviewTypeFromPerspective(perspective);

      // Show toast for processing start
      toast({
        title: "Processing contract",
        description: "Your contract is being analyzed...",
      });

      // Process contract using real workflow with enhanced file information
      const result = await DataService.processContractWorkflow(
        user.id,
        {
          title: selectedFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          content: fileContent,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          // contract_type will be automatically determined by AI classification
        },
        reviewType
      );

      // Show classification results if available
      if (result.contract?.metadata?.classification) {
        setContractClassification(result.contract.metadata.classification);
        setShowClassification(true);
        console.log("📊 Contract classification completed:", result.contract.metadata.classification);
      }

      // Show success toast
      toast({
        title: "Contract processed successfully",
        description: "Review completed. Redirecting to results...",
      });

      // Navigate to contract review with real data
      setTimeout(() => {
        console.log("Navigating to contract review with real data:", result);

        try {
          navigate("/contract-review", {
            state: {
              contract: result.contract,
              review: result.review,
              selectedFile: selectedFile,
              solutionTitle: solutionTitle,
              perspective: perspective,
              classification: result.contract?.metadata?.classification,
            },
          });
        } catch (error) {
          console.error("Navigation error:", error);
          // Fallback: try direct navigation
          navigate("/contract-review");
        }
      }, 2500); // Longer delay to show classification

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Contract processing error:", {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.name : typeof error
      });

      // Reset UI state immediately to prevent stuck state
      setIsSubmitting(false);
      setUploadButtonHidden(false);
      setShowLoadingTransition(false);

      // Determine user-friendly error message
      let userMessage = "Unknown error occurred";
      let shouldRetry = true;

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('file') && errorMsg.includes('empty')) {
          userMessage = "The selected file appears to be empty or corrupted. Please try a different file.";
          shouldRetry = false;
        } else if (errorMsg.includes('unsupported file type')) {
          userMessage = "Please upload a PDF, DOCX, or TXT file.";
          shouldRetry = false;
        } else if (errorMsg.includes('user id')) {
          userMessage = "Authentication issue detected. Please try signing out and signing back in.";
          shouldRetry = false;
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          userMessage = "Network connection issue. Please check your internet connection and try again.";
          shouldRetry = true;
        } else if (errorMsg.includes('ai') || errorMsg.includes('analysis')) {
          userMessage = "Contract analysis service is temporarily unavailable. Please try again in a few minutes.";
          shouldRetry = true;
        } else {
          userMessage = error.message;
          shouldRetry = true;
        }
      }

      // Show appropriate error toast
      toast({
        title: "Processing failed",
        description: `${userMessage}${shouldRetry ? ' Please try again.' : ''}`,
        variant: "destructive",
      });

      // Log comprehensive error info for debugging
      console.error("📊 Error analysis:", {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        fileType: selectedFile?.type,
        perspective,
        userId: user?.id,
        userShouldRetry: shouldRetry,
        timestamp: new Date().toISOString()
      });

      // Additional cleanup - clear selected file if it's a file issue
      if (!shouldRetry && error instanceof Error && error.message.toLowerCase().includes('file')) {
        console.log("🧹 Clearing selected file due to file-related error");
        setSelectedFile(null);
      }
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

          {/* Contract Classification Display */}
          {contractClassification && (
            <ContractClassificationDisplay
              classification={contractClassification}
              isVisible={showClassification}
            />
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
