import { useState } from "react";
import { X, Info } from "lucide-react";

interface SolutionCardProps {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  className?: string;
}

export const AnimatedSolutionCard = ({ 
  id, 
  title, 
  description, 
  imageSrc, 
  className = "" 
}: SolutionCardProps) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleCardClick = () => {
    setIsClicked(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(false);
  };

  const handleReviewClick = (type: string) => {
    console.log(`Review as ${type} for ${title}`);
    // Add your review logic here
  };

  return (
    <div className={`relative ${className}`}>
      {/* Base Card */}
      <div 
        className={`flex pt-[15px] flex-col justify-end items-center bg-[#F3F3F3] cursor-pointer hover:bg-[#ECECEC] transition-all duration-200 ${
          isClicked ? 'transform' : ''
        } ${className.includes('h-') ? '' : 'h-[439px]'}`}
        onClick={handleCardClick}
      >
        <div className="w-[265px] h-[424px] relative">
          <img
            src={imageSrc}
            alt={title}
            className="w-[228px] h-[228px] rounded-lg absolute left-[19px] top-0"
          />
          <div className="flex w-[157px] h-[27px] flex-col justify-center text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
            {title}
          </div>
          <div className="flex w-[217px] flex-col justify-center text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
            {description}
          </div>
        </div>
      </div>

      {/* Glassmorphic Overlay */}
      {isClicked && (
        <div className="absolute inset-0 z-10 w-[265px] h-[439px] border border-white/50 bg-gradient-to-br from-white to-white/0 backdrop-blur-sm animate-in fade-in-0 duration-300">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute right-[36px] top-[33px] w-4 h-4 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4 stroke-black" strokeWidth={1} />
          </button>

          {/* Review Buttons Container */}
          <div className="absolute left-[21px] top-[192px] flex flex-col gap-0 w-[223px]">
            {/* Review as data subject button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReviewClick('data subject');
              }}
              className="flex items-center w-[99px] h-[27px] rounded-full bg-[#D6CECE] hover:bg-[#D6CECE]/80 transition-colors group"
            >
              <span className="text-[#271D1D] text-center font-roboto text-[8px] font-normal leading-[8px] flex-1">
                Review as data subject
              </span>
              <div className="w-4 h-4 mr-1 flex items-center justify-center">
                <Info className="w-[10px] h-[9px] text-[#271D1D]" strokeWidth={1.5} />
              </div>
            </button>

            {/* Review as organization button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReviewClick('organization');
              }}
              className="flex items-center w-[99px] h-[27px] rounded-full bg-[#D6CECE] hover:bg-[#D6CECE]/80 transition-colors group absolute left-[124px] top-0"
            >
              <span className="text-[#271D1D] text-center font-roboto text-[8px] font-normal leading-[8px] tracking-[0.08px] flex-1">
                Review as organization
              </span>
              <div className="w-4 h-4 mr-1 flex items-center justify-center">
                <Info className="w-[10px] h-[9px] text-[#271D1D]" strokeWidth={1.5} />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedSolutionCard;
