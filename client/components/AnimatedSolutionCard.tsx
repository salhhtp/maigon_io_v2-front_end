import { useState } from "react";
import { X } from "lucide-react";

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
  const [dataSubjectHovered, setDataSubjectHovered] = useState(false);
  const [organizationHovered, setOrganizationHovered] = useState(false);

  const handleCardClick = () => {
    setIsClicked(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(false);
  };

  const handleReviewClick = (type: string) => {
    console.log(`Review as ${type} for ${title}`);
    // Here you would implement the actual review flow
    // For now, we'll just close the overlay after selection
    setIsClicked(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Base Card */}
      <div
        className={`flex pt-[15px] flex-col justify-end items-center bg-[#F3F3F3] cursor-pointer hover:bg-[#ECECEC] transition-all duration-200 h-[439px] w-full`}
        onClick={handleCardClick}
      >
        <div className="w-[265px] h-[424px] relative">
          <img
            src={imageSrc}
            alt={title}
            className="w-[228px] h-[228px] rounded-lg absolute left-[19px] top-0 object-cover"
          />
          <div className="flex w-[174px] h-[27px] flex-col justify-center text-[#271D1D] font-lora text-xl font-medium leading-[22px] absolute left-[30px] top-[246px]">
            {title}
          </div>
          <div className="flex w-[217px] flex-col justify-center text-[#271D1D] font-roboto text-xs font-normal leading-[18px] tracking-[0.12px] absolute left-[30px] top-[291px]">
            {description}
          </div>
        </div>
      </div>

      {/* Glassmorphic Overlay */}
      {isClicked && (
        <div
          className="absolute inset-0 z-10 w-[265px] h-[439px] border border-white/50 bg-gradient-to-b from-white via-white/95 to-white/0 backdrop-blur-[10px] transition-all duration-300 ease-out"
          style={{
            background: 'linear-gradient(160deg, #FFF 0%, rgba(255, 255, 255, 0.00) 100%)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute right-[36px] top-[33px] w-4 h-4 hover:opacity-70 transition-opacity"
            aria-label="Close"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
            >
              <path
                d="M0.5 16C0.5 16 5.22344 11.2766 8.25 8.25C11.2766 5.22344 16 0.5 16 0.5M0.5 0.5L16 16"
                stroke="black"
                strokeWidth="1"
              />
            </svg>
          </button>

          {/* Review Buttons Container */}
          <div className="absolute left-[21px] top-[192px] w-[223px] flex items-center gap-[24px]">
            {/* Review as data subject button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReviewClick('data subject');
                }}
                className="flex items-center justify-between w-[99px] h-[27px] rounded-full bg-[#D6CECE] hover:bg-[#D6CECE]/80 transition-colors px-3 group"
              >
                <span className="text-[#271D1D] font-roboto text-[8px] font-normal leading-[8px] flex-1 text-center">
                  Review as data subject
                </span>
                <div
                  className="w-4 h-4 flex items-center justify-center relative"
                  onMouseEnter={() => setDataSubjectHovered(true)}
                  onMouseLeave={() => setDataSubjectHovered(false)}
                >
                  <svg
                    width="16"
                    height="15"
                    viewBox="0 0 16 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-[15px]"
                  >
                    <g clipPath="url(#clip0_649_783)">
                      <path
                        d="M8.00065 10V7.5M8.00065 5H8.00732M14.6673 7.5C14.6673 10.9518 11.6826 13.75 8.00065 13.75C4.31875 13.75 1.33398 10.9518 1.33398 7.5C1.33398 4.04822 4.31875 1.25 8.00065 1.25C11.6826 1.25 14.6673 4.04822 14.6673 7.5Z"
                        stroke="#271D1D"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_649_783">
                        <rect width="16" height="15" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>

                  {/* Data Subject Tooltip */}
                  {dataSubjectHovered && (
                    <div className="absolute right-4 top-0 w-[116px] h-[122px] bg-[#F3F3F3] rounded-lg p-[10px] z-20 animate-in fade-in-0 duration-200">
                      <div className="w-[96px] h-[99px]">
                        <h3 className="text-[#271D1D] font-lora text-xs font-normal leading-3 mb-1">
                          Data Subject
                        </h3>
                        <p className="text-[#271D1D] font-roboto text-[8px] font-normal leading-[9px] tracking-[0.08px]">
                          Choose this perspective if you are an individual (data subject), e.g. end user of the website, whose personal data is processed in accordance with the privacy policy.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Review as organization button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReviewClick('organization');
                }}
                className="flex items-center justify-between w-[99px] h-[27px] rounded-full bg-[#D6CECE] hover:bg-[#D6CECE]/80 transition-colors px-3 group"
              >
                <span className="text-[#271D1D] font-roboto text-[8px] font-normal leading-[8px] tracking-[0.08px] flex-1 text-center">
                  Review as organization
                </span>
                <div
                  className="w-4 h-4 flex items-center justify-center relative"
                  onMouseEnter={() => setOrganizationHovered(true)}
                  onMouseLeave={() => setOrganizationHovered(false)}
                >
                  <svg
                    width="16"
                    height="15"
                    viewBox="0 0 16 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-[15px]"
                  >
                    <g clipPath="url(#clip0_649_754)">
                      <path
                        d="M8.00065 10V7.5M8.00065 5H8.00732M14.6673 7.5C14.6673 10.9518 11.6826 13.75 8.00065 13.75C4.31875 13.75 1.33398 10.9518 1.33398 7.5C1.33398 4.04822 4.31875 1.25 8.00065 1.25C11.6826 1.25 14.6673 4.04822 14.6673 7.5Z"
                        stroke="#271D1D"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_649_754">
                        <rect width="16" height="15" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>

                  {/* Organization Tooltip */}
                  {organizationHovered && (
                    <div className="absolute right-4 top-0 w-[116px] h-[122px] bg-[#F3F3F3] rounded-lg p-[10px] z-20 animate-in fade-in-0 duration-200">
                      <div className="w-[96px] h-[99px]">
                        <h3 className="text-[#271D1D] font-lora text-xs font-normal leading-3 mb-1">
                          Organization
                        </h3>
                        <p className="text-[#271D1D] font-roboto text-[8px] font-normal leading-[9px] tracking-[0.08px]">
                          Choose this perspective if your organization will collect, store, and otherwise process personal data, e.g. information provided by end users on your website, in accordance with the privacy policy.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedSolutionCard;
