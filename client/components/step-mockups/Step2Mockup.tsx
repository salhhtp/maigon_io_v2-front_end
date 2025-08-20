import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Step2Mockup() {
  const [activeCard] = useState(1); // DPA is active in the screenshot

  const contractTypes = [
    {
      title: "Non-Disclosure Agreements",
      description: "Review non-disclosure agreements for compliance with established standards and best practices. Get instant report with compliance insights and extracted clauses."
    },
    {
      title: "Data Processing Agreements", 
      description: "Review data processing agreements for compliance with the GDPR and latest EDPB guidelines. Get instant compliance report with extracted clauses, concepts, terms, highlighted risks, and compliance recommendations."
    },
    {
      title: "Privacy Policy Documents",
      description: "Review privacy statements for compliance with the GDPR criteria. Get instant compliance report with extracted clauses and recommendations."
    },
    {
      title: "Consultancy Agreements",
      description: "Review consultancy agreements (and other professional services agreements) for compliance with established standards and best practices. Get instant report with insights and extracted clauses."
    },
    {
      title: "Product Supply Agreements", 
      description: "Review product supply agreements for compliance with established standards and best practices. Get instant report with insights and extracted clauses."
    },
    {
      title: "R&D Agreements",
      description: "Conduct compliance review of R&D agreements to ensure adherence to industry standards. Obtain a report on potential compliance risks and recommendations for risk mitigation."
    },
    {
      title: "End User License Agreements",
      description: "Review end user license agreements for compliance with established standards and best practices. Get instant report with insights and extracted clauses. Used most often for reviewing software license agreements."
    }
  ];

  return (
    <div className="w-full h-full bg-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative">
      {/* Contract Cards Animation */}
      <div className="mb-20 w-full h-full flex items-center justify-center">
        {/* Desktop Layout */}
        <div className="relative w-full max-w-[1073px] min-h-[590px] mx-auto z-10">
          <div className="relative w-full h-full z-10" style={{ padding: "10px" }}>
            {contractTypes.map((type, index) => {
              const isActive = activeCard === index;
              // Make Data Processing Agreements (index 1) and Privacy Policy Documents (index 2) taller
              const needsTallerCard = index === 1 || index === 2;
              const cardHeight = isActive ? (needsTallerCard ? 520 : 390) : 76;
              const leftPosition = 16 + index * 142; // 150px width - 8px overlap

              return (
                <div
                  key={index}
                  className={`absolute transition-all duration-700 ease-in-out cursor-pointer hover:shadow-md ${
                    isActive ? 'z-[100]' : 'z-[20]'
                  }`}
                  style={{
                    width: "150px",
                    height: `${cardHeight}px`,
                    left: `${leftPosition}px`,
                    top: "16px",
                  }}
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

                  {/* Bottom border - hidden when any card is active and this card is not active */}
                  <div
                    className={`absolute left-0 w-full h-px bg-[#D6CECE] rounded-full transition-opacity duration-300 ${
                      contractTypes.some((_, i) => i !== index && i === activeCard) ? 'opacity-0' : 'opacity-100'
                    }`}
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
                      <div className="mt-auto">
                        <Button
                          className="w-full bg-[#9A7C7C] hover:bg-[#9A7C7C]/90 text-white text-xs py-3 px-6 rounded-lg transition-colors duration-200 min-h-[32px]"
                        >
                          Upload a document
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
