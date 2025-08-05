import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Upload as UploadIcon } from "lucide-react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function Upload() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [hasStartedProcess, setHasStartedProcess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadButtonHidden, setUploadButtonHidden] = useState(false);
  const [showLoadingTransition, setShowLoadingTransition] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get the solution info from navigation state
  const { solutionTitle, perspective } = location.state || {};

  // Block navigation when user has started the upload process
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasStartedProcess && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser back/forward buttons and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasStartedProcess) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasStartedProcess) {
        e.preventDefault();
        setShowConfirmModal(true);
        window.history.pushState(null, '', window.location.href);
      }
    };

    if (hasStartedProcess) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      // Prevent back navigation
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasStartedProcess]);

  // Handle React Router navigation blocking
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowConfirmModal(true);
    }
  }, [blocker.state]);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.type)) {
      setSelectedFile(file);
      setHasStartedProcess(true); // Mark that user has started the process
    } else {
      alert('Please select a PDF or DOCX file.');
    }
  };

  const handleLinkClick = (path: string) => (e: React.MouseEvent) => {
    if (hasStartedProcess || isSubmitting) {
      e.preventDefault();
      if (!isSubmitting) {
        setPendingNavigation(path);
        setShowConfirmModal(true);
      }
    }
  };

  const handleConfirmNavigation = () => {
    setHasStartedProcess(false);
    setShowConfirmModal(false);

    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else if (pendingNavigation) {
      navigate(pendingNavigation);
    }

    setPendingNavigation(null);
  };

  const handleCancelNavigation = () => {
    setShowConfirmModal(false);
    setPendingNavigation(null);

    if (blocker.state === 'blocked') {
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

  const handleSubmit = () => {
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    console.log('Submitting:', {
      file: selectedFile,
      solution: solutionTitle,
      perspective: perspective
    });

    // Step 1: Submit Clicked → Smart Animate - Ease Out - 1500ms
    setIsSubmitting(true);

    // Step 2: After Delay - 1ms → Smart Animate - Ease out 1500ms → Disappeared Upload Button
    setTimeout(() => {
      setUploadButtonHidden(true);

      // Step 3: After Delay 1ms → Smart Animate - Ease in and out back → Loading Screen pops up
      setTimeout(() => {
        setShowLoadingTransition(true);

        // Navigate to loading page after transition starts
        setTimeout(() => {
          navigate('/loading', {
            state: {
              selectedFile: selectedFile,
              solutionTitle: solutionTitle,
              perspective: perspective
            }
          });
        }, 500); // Give time for transition animation to start

      }, 1); // 1ms delay
    }, 1501); // 1500ms + 1ms delay
  };

  return (
    <div className={`min-h-screen bg-[#F9F8F8] flex flex-col transition-all duration-[1500ms] ${
      showLoadingTransition ? 'opacity-0 ease-in-out transform scale-105' :
      isSubmitting ? 'opacity-80 ease-out' : 'opacity-100'
    }`}>
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-6">
        <div onClick={handleLinkClick("/home")} className="cursor-pointer">
          <Logo size="xl" />
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a
            href="/user-solutions"
            onClick={handleLinkClick("/user-solutions")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            Solutions
          </a>
          <a
            href="/news"
            onClick={handleLinkClick("/news")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            News
          </a>
          <a
            href="/team"
            onClick={handleLinkClick("/team")}
            className="text-[#271D1D] hover:text-[#9A7C7C] transition-colors cursor-pointer"
          >
            Team
          </a>

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
                <a
                  href="/"
                  onClick={handleLinkClick("/")}
                  className="block px-4 py-2 text-sm text-[#271D1D] hover:bg-[#F9F8F8] transition-colors cursor-pointer"
                >
                  Log Out
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 lg:px-16 py-20">
        <div className={`w-full max-w-[800px] flex flex-col items-center gap-8 transition-all duration-[1500ms] ${
          isSubmitting ? 'ease-out' : ''
        } ${showLoadingTransition ? 'opacity-0 scale-110' : isSubmitting ? 'opacity-70 scale-98' : 'opacity-100 scale-100'}`}>
          
          {/* Header */}
          <div className="text-center">
            <h1 className="text-[#271D1D] font-lora text-3xl lg:text-5xl font-medium leading-tight lg:leading-[90px] mb-4">
              Upload your document
            </h1>
            <p className="text-black font-roboto text-sm lg:text-base font-normal leading-relaxed">
              Once your document is uploaded and submitted, Maigon AI will start analysing and generating your review.
            </p>
          </div>

          {/* Upload Section */}
          <div className="w-full max-w-[624px] relative">
            {/* Upload Area */}
            <div
              className={`relative w-full h-14 rounded-lg cursor-pointer transition-colors ${
                isDragOver ? 'bg-[#C4B5B5]' : selectedFile ? 'bg-[#B6A5A5]' : 'bg-[#D6CECE] hover:bg-[#C4B5B5]'
              }`}
              onClick={handleUploadClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Progress Bar Background */}
              <div className="absolute left-0.5 top-0 h-full w-0 bg-[#B6A5A5] rounded-lg transition-all duration-300" 
                   style={{ width: selectedFile ? '100%' : '0%' }} />
              
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
            <div className={`absolute right-0 top-[66px] transition-all duration-[1500ms] ease-out ${
              uploadButtonHidden ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'
            }`}>
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
              Selected: <span className="font-medium">{solutionTitle}</span> • 
              Perspective: <span className="font-medium capitalize">{perspective}</span>
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
