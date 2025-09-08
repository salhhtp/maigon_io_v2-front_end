import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface ContractType {
  title: string;
  description: string;
}

interface ContractCardsAnimationProps {
  contractTypes: ContractType[];
  onCardClick?: (index: number, contractType: ContractType) => void;
  buttonText?: string;
  onButtonClick?: (index: number, contractType: ContractType) => void;
}

const ContractCardsAnimation: React.FC<ContractCardsAnimationProps> = ({
  contractTypes,
  onCardClick,
  buttonText = "Try for free",
  onButtonClick,
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Autoplay behavior: advance when isPlaying (only on desktop)
  useEffect(() => {
    if (!isPlaying || contractTypes.length === 0) return;

    // Disable autoplay on mobile/tablet for better UX
    const isMobile = window.innerWidth < 1024; // lg breakpoint
    if (isMobile) return;

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % contractTypes.length);
    }, 6000); // 6s for smoother demo

    return () => clearInterval(interval);
  }, [isPlaying, contractTypes.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveCard((prev) => (prev - 1 + contractTypes.length) % contractTypes.length);
    setIsPlaying(false);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveCard((prev) => (prev + 1) % contractTypes.length);
    setIsPlaying(false);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPlaying((v) => !v);
  };

  // Ensure we have contract types
  if (!contractTypes || contractTypes.length === 0) {
    return <div>No contract types available</div>;
  }

  const handleCardClick = (index: number) => {
    setActiveCard(index);
    if (onCardClick) {
      onCardClick(index, contractTypes[index]);
    }
  };

  const handleButtonClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onButtonClick) {
      onButtonClick(index, contractTypes[index]);
    }
  };

  return (
    <div className="mb-20 w-full">
      {/* Desktop Layout - Hidden on mobile/tablet */}
      <div className="hidden lg:block relative w-full max-w-[1073px] min-h-[590px] mx-auto z-10">
        <div
          className="relative w-full h-full z-10"
          style={{ padding: "10px" }}
        >
          {contractTypes.map((type, index) => {
            const isActive = activeCard === index;
            // Make Data Processing Agreements (index 1) and Privacy Policy Documents (index 3) taller
            const needsTallerCard = index === 1 || index === 3;
            const cardHeight = isActive ? (needsTallerCard ? 520 : 390) : 76;
            const leftPosition = 16 + index * 142; // 150px width - 8px overlap

            // Determine overlap against the active (opened) card bounds
            const activeLeft = 16 + activeCard * 142 - 180;
            const activeRight = activeLeft + 520;
            const nonActiveWidth = 120;
            const thisLeft = leftPosition;
            const thisRight = thisLeft + (isActive ? 520 : nonActiveWidth);
            const isOverlapped = !isActive && thisLeft < activeRight && thisRight > activeLeft;

            return (
              <div
                key={index}
                className={`absolute transition-all duration-700 ease-in-out cursor-pointer ${
                  isActive ? "z-[100] scale-105 shadow-xl" : "z-[20] hover:shadow-md"
                } ${isActive ? "opacity-100" : "opacity-40 pointer-events-auto"}`}
                style={{
                  width: isActive ? "520px" : "120px",
                  height: `${cardHeight}px`,
                  left: `${leftPosition - (isActive ? 180 : 0)}px`,
                  top: "16px",
                }}
                onClick={() => handleCardClick(index)}
              >
                {/* Top border */}
                <div className="absolute top-0 left-0 w-full h-px bg-[#D6CECE] rounded-full" />
                {/* Glass blur overlay only when this card lies behind the opened card */}
                {isOverlapped && (
                  <div className="absolute inset-0 rounded-lg bg-white/30 backdrop-blur-sm transition-opacity duration-300 pointer-events-none z-40" />
                )}

                {/* Progress indicator for active card */}
                <div
                  className="absolute top-0 left-0 h-px bg-[#271D1D] rounded-full transition-all duration-700"
                  style={{ width: isActive ? "100%" : "0%" }}
                />

                {/* Card title */}
                <div className="absolute top-1 left-0 right-0 flex flex-col justify-center items-center h-[59px] px-2">
                  <h4 className={`text-[#271D1D] text-center font-bold leading-[26px] text-sm transition-all duration-300 ${isOverlapped ? 'blur-sm' : ''}`}>
                    {type.title}
                  </h4>
                </div>

                {/* Bottom border - hidden when any card is active and this card is not active */}
                <div
                  className={`absolute left-0 w-full h-px bg-[#D6CECE] rounded-full transition-opacity duration-300 ${
                    contractTypes.some(
                      (_, i) => i !== index && i === activeCard,
                    )
                      ? "opacity-0"
                      : "opacity-100"
                  }`}
                  style={{ top: `${cardHeight - 1}px` }}
                />

                {/* Expanded content - only visible when active */}
                <div
                  className={`absolute left-6 right-6 top-[83px] transition-all duration-700 overflow-hidden ${
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                  }`}
                  style={{
                    height: isActive
                      ? needsTallerCard
                        ? "320px"
                        : "240px"
                      : "0px",
                  }}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1 mb-4">
                      <p className="text-[#271D1D] text-xs leading-5 tracking-[0.12px]">
                        {type.description}
                      </p>
                    </div>
                    {onButtonClick && (
                      <div className="mt-auto">
                        <Button
                          onClick={(e) => handleButtonClick(e, index)}
                          className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white text-xs py-3 px-6 rounded-lg transition-colors duration-200 min-h-[32px]"
                        >
                          {buttonText}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls: centered small buttons with dots and play/pause */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
          <div className="flex items-center gap-3 bg-transparent">
            <button
              onClick={handlePrev}
              aria-label="Previous"
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#271D1D] shadow-sm flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2 px-2 py-1 bg-white/90 rounded-full shadow-sm">
              {contractTypes.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { setActiveCard(i); setIsPlaying(false); }}
                  className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${i === activeCard ? 'bg-[#271D1D]' : 'bg-[#D6CECE]'}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              aria-label="Next"
              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#271D1D] shadow-sm flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Play/Pause and count */}
            <div className="ml-3 flex items-center gap-2 bg-white/90 rounded-full px-2 py-1 shadow-sm">
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center text-[#271D1D]">
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <div className="text-sm text-[#271D1D]">{activeCard + 1}/{contractTypes.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout - Vertical Stack */}
      <div className="lg:hidden w-full max-w-2xl mx-auto px-4 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          {contractTypes.map((type, index) => {
            const isActive = activeCard === index;

            return (
              <div
                key={index}
                className={`w-full bg-white rounded-lg border transition-all duration-300 ease-in-out cursor-pointer ${
                  isActive
                    ? "border-[#9A7C7C] shadow-lg"
                    : "border-[#D6CECE] hover:border-[#9A7C7C]/50 hover:shadow-md"
                }`}
                onClick={() => handleCardClick(index)}
              >
                {/* Card Header */}
                <div className="p-3 sm:p-4 border-b border-[#D6CECE]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[#271D1D] font-bold text-base md:text-lg leading-tight transition-all duration-300">
                      {type.title}
                    </h4>
                    <div
                      className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                        isActive ? "bg-[#9A7C7C]" : "bg-[#D6CECE]"
                      }`}
                    />
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-3 w-full h-1 bg-[#D6CECE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9A7C7C] rounded-full transition-all duration-700 ease-in-out"
                      style={{ width: isActive ? "100%" : "0%" }}
                    />
                  </div>
                </div>

                {/* Expandable Content */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isActive ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <p className="text-[#271D1D] text-sm sm:text-base leading-relaxed">
                      {type.description}
                    </p>

                    {onButtonClick && (
                      <Button
                        onClick={(e) => handleButtonClick(e, index)}
                        className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white text-sm sm:text-base py-3 px-6 rounded-lg transition-colors duration-200 min-h-[40px] sm:min-h-[44px]"
                      >
                        {buttonText}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Navigation Dots */}
        <div className="flex justify-center mt-6 space-x-2">
          {contractTypes.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveCard(index)}
              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                index === activeCard
                  ? "bg-[#9A7C7C]"
                  : "bg-[#D6CECE] hover:bg-[#9A7C7C]/50"
              }`}
              aria-label={`Go to solution ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContractCardsAnimation;
