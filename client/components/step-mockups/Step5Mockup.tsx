import { useState, useEffect } from "react";

export default function Step5Mockup() {
  const [progress, setProgress] = useState(65); // Show at 65% progress to match the loading state

  // Animate to show loading progress
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(75);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full bg-[#F9F8F8] rounded-lg border border-[#271D1D]/15 overflow-hidden relative">
      {/* Main Content - matching Loading page layout */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-16 py-20 h-full">
        <div className="w-full max-w-[554px] flex flex-col items-center gap-7">
          {/* Header Text - exact same structure as Loading page */}
          <div className="w-full max-w-[237px] flex flex-col items-center gap-2">
            <div className="text-center px-2.5 py-2.5">
              <h1 className="text-black font-lora text-xl lg:text-2xl font-medium leading-6">
                Don't go anywhere!
              </h1>
            </div>
            <div className="text-center px-2.5 py-2.5">
              <p className="text-black font-roboto text-xs font-normal leading-6">
                This won't take too long
              </p>
            </div>
          </div>

          {/* Animated Loading Logo - exact same component logic */}
          <div className="w-full px-2.5 py-2.5">
            <div className="relative w-full max-w-[534px] h-auto aspect-[534/140] mx-auto">
              {/* Outlined Logo (Always visible) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="534"
                  height="140"
                  viewBox="0 0 534 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <text
                    x="267"
                    y="100"
                    textAnchor="middle"
                    className="font-lora text-[128px] font-normal"
                    style={{
                      fontSize: "clamp(64px, 12vw, 128px)",
                      fill: "none",
                      stroke: "#B6A5A5",
                      strokeWidth: "1px",
                      filter: "drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25))",
                    }}
                  >
                    MAIGON
                  </text>
                </svg>
              </div>

              {/* Filled Logo (Clipped by progress) */}
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{
                  clipPath: `inset(${100 - progress}% 0 0 0)`,
                  transition: "clip-path 0.1s ease-out",
                }}
              >
                <svg
                  width="534"
                  height="140"
                  viewBox="0 0 534 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <text
                    x="267"
                    y="100"
                    textAnchor="middle"
                    className="font-lora text-[128px] font-normal"
                    style={{
                      fontSize: "clamp(64px, 12vw, 128px)",
                      fill: "#9A7C7C",
                      filter: "drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25))",
                    }}
                  >
                    MAIGON
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Processing Info - simulating document processing */}
          <div className="text-center text-sm text-[#9A7C7C] font-roboto mt-4">
            <div>
              Processing: <span className="font-medium">sample_agreement.pdf</span>
            </div>
            <div>
              Solution: <span className="font-medium">Data Processing Agreements</span>
            </div>
            <div>
              Perspective: <span className="font-medium capitalize">Organization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
