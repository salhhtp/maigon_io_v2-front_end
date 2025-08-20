import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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

  // Auto-animate cards every 10 seconds
  useEffect(() => {
    if (contractTypes.length > 0) {
      const interval = setInterval(() => {
        setActiveCard((prev) => (prev + 1) % contractTypes.length);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [contractTypes.length]);

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
      <div className="hidden lg:block relative w-full max-w-[1073px] h-[590px] mx-auto overflow-hidden">
        <div className="relative w-full h-full" style={{ padding: "10px" }}>
          {contractTypes.map((type, index) => {
            const isActive = activeCard === index;
            // Make Data Processing Agreements (index 1) and Privacy Policy Documents (index 3) taller
            const needsTallerCard = index === 1 || index === 3;
            const cardHeight = isActive ? (needsTallerCard ? 520 : 390) : 76;
            const leftPosition = 16 + index * 142; // 150px width - 8px overlap

            return (
              <div
                key={index}
                className="absolute transition-all duration-700 ease-in-out cursor-pointer hover:shadow-md"
                style={{
                  width: "150px",
                  height: `${cardHeight}px`,
                  left: `${leftPosition}px`,
                  top: "16px",
                  zIndex: isActive ? 50 : 10,
                }}
                onClick={() => handleCardClick(index)}
              >
                {/* Top border */}
                <div className="absolute top-0 left-0 w-full h-px bg-[#D6CECE] rounded-full" />

                {/* Progress indicator for active card */}
                <div
                  className="absolute top-0 left-0 h-px bg-[#271D1D] rounded-full transition-all duration-700"
                  style={{ width: isActive ? "100%" : "0%" }}
                />

                {/* Card title */}
                <div className="absolute top-1 left-0 right-0 flex flex-col justify-center items-center h-[59px] px-2">
                  <h4 className="text-[#271D1D] text-center font-bold leading-[26px] text-sm">
                    {type.title}
                  </h4>
                </div>

                {/* Bottom border */}
                <div
                  className="absolute left-0 w-full h-px bg-[#D6CECE] rounded-full"
                  style={{ top: `${cardHeight - 1}px` }}
                />

                {/* Expanded content - only visible when active */}
                <div
                  className={`absolute left-4 right-4 top-[83px] transition-all duration-700 overflow-hidden ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ height: isActive ? (needsTallerCard ? "425px" : "295px") : "0px" }}
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
      </div>

      {/* Mobile/Tablet Layout - Vertical Stack */}
      <div className="lg:hidden w-full max-w-lg mx-auto px-4">
        <div className="space-y-4">
          {contractTypes.map((type, index) => {
            const isActive = activeCard === index;

            return (
              <div
                key={index}
                className={`w-full bg-white rounded-lg border transition-all duration-300 ease-in-out cursor-pointer ${
                  isActive
                    ? 'border-[#9A7C7C] shadow-lg'
                    : 'border-[#D6CECE] hover:border-[#9A7C7C]/50 hover:shadow-md'
                }`}
                onClick={() => handleCardClick(index)}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-[#D6CECE]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[#271D1D] font-bold text-base md:text-lg leading-tight">
                      {type.title}
                    </h4>
                    <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      isActive ? 'bg-[#9A7C7C]' : 'bg-[#D6CECE]'
                    }`} />
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-3 w-full h-1 bg-[#D6CECE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9A7C7C] rounded-full transition-all duration-700 ease-in-out"
                      style={{ width: isActive ? '100%' : '0%' }}
                    />
                  </div>
                </div>

                {/* Expandable Content */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  isActive ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-4 space-y-4">
                    <p className="text-[#271D1D] text-sm md:text-base leading-relaxed">
                      {type.description}
                    </p>

                    {onButtonClick && (
                      <Button
                        onClick={(e) => handleButtonClick(e, index)}
                        className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white text-sm md:text-base py-3 px-6 rounded-lg transition-colors duration-200 min-h-[44px]"
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
                index === activeCard ? 'bg-[#9A7C7C]' : 'bg-[#D6CECE] hover:bg-[#9A7C7C]/50'
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
