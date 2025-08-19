import React, { useState, useEffect } from "react";

interface ContractType {
  title: string;
  description: string;
}

interface ContractCardsAnimationProps {
  contractTypes: ContractType[];
  onCardClick?: (index: number, contractType: ContractType) => void;
}

const ContractCardsAnimation: React.FC<ContractCardsAnimationProps> = ({
  contractTypes,
  onCardClick,
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
  };

  return (
    <div className="mb-20 w-full">
      <div className="relative w-full max-w-[1073px] h-[458px] mx-auto overflow-hidden">
        <div className="relative w-full h-full" style={{ padding: "10px" }}>
          {contractTypes.map((type, index) => {
            const isActive = activeCard === index;
            const cardHeight = isActive ? 314 : 76;
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

                {/* Expanded description - only visible when active */}
                <div
                  className={`absolute left-4 right-4 top-[83px] transition-all duration-700 overflow-hidden ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ height: isActive ? "220px" : "0px" }}
                >
                  <p className="text-[#271D1D] text-xs leading-5 tracking-[0.12px]">
                    {type.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContractCardsAnimation;
