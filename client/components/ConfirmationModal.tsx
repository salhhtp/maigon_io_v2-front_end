import { Button } from "@/components/ui/button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Are you sure ?",
  message = "You will lose all your progress and need to start all over again if you leave this page.",
  confirmText = "Yes, leave",
  cancelText = "No, go back"
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Glassmorphic Overlay */}
      <div 
        className="absolute inset-0 border border-white/50 backdrop-blur-[10px]"
        style={{
          background: 'linear-gradient(122deg, #FFF 0%, rgba(255, 255, 255, 0.00) 100%)'
        }}
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-black font-lora text-5xl font-medium leading-6">
            {title}
          </h2>
        </div>

        {/* Message */}
        <div className="text-center max-w-[605px]">
          <p className="text-[#271D1D] font-roboto text-base font-normal leading-[90px] tracking-[0.16px]">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            className="bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-[#F9F8F8] px-11 py-3 rounded-lg font-roboto text-xl font-normal leading-6 tracking-[0.2px] h-12 min-w-[179px]"
          >
            {confirmText}
          </Button>

          {/* Cancel Button */}
          <Button
            onClick={onCancel}
            className="bg-[#D6CECE] hover:bg-[#D6CECE]/90 text-[#271D1D] px-9 py-3 rounded-lg font-roboto text-xl font-normal leading-6 tracking-[0.2px] h-12 min-w-[179px]"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
