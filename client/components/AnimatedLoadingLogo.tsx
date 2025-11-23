import { useEffect, useRef, useState } from "react";

interface AnimatedLoadingLogoProps {
  onComplete?: () => void;
  isComplete?: boolean;
  externalProgress?: number;
  fillColor?: string;
  baseOpacity?: number;
}

export const AnimatedLoadingLogo = ({
  onComplete,
  isComplete = false,
  externalProgress,
  fillColor = "#9A7C7C",
  baseOpacity = 0.18,
}: AnimatedLoadingLogoProps) => {
  const [progress, setProgress] = useState(externalProgress ?? 0);
  const hasCompletedRef = useRef(false);
  const progressRef = useRef(0);
  const isCompleteRef = useRef(isComplete);
  const LOGO_SRC = "/maigon-logo_2.png";
  const maskStyles: React.CSSProperties = {
    WebkitMaskImage: `url(${LOGO_SRC})`,
    maskImage: `url(${LOGO_SRC})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };

  useEffect(() => {
    const next = Math.max(
      0,
      Math.min(100, externalProgress ?? progressRef.current),
    );
    if (next >= progressRef.current) {
      progressRef.current = next;
      setProgress(next);
    }
  }, [externalProgress]);

  useEffect(() => {
    isCompleteRef.current = isComplete;
    if (isComplete) {
      progressRef.current = 100;
      setProgress(100);
    }
  }, [isComplete]);

  useEffect(() => {
    if (progress >= 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          onComplete?.();
        });
      });
    }
  }, [progress, onComplete]);

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const clipValue = `${100 - clampedProgress}%`;
  const aspectRatio = 280 / 1391;
  const containerPadding = `${aspectRatio * 100}%`;

  return (
    <div className="relative mx-auto flex w-full max-w-[580px] flex-col items-center px-6">
      <div className="relative w-full">
        <div style={{ paddingTop: containerPadding }} />
        {/* Outline */}
        <img
          src={LOGO_SRC}
          alt="Maigon outline"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            opacity: baseOpacity,
            filter: "grayscale(1) contrast(1.1)",
          }}
        />
        {/* Fill mask */}
        <div
          className="absolute inset-0 overflow-hidden transition-[clip-path] duration-200 ease-out"
          style={{ clipPath: `inset(${clipValue} 0 0 0)` }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: fillColor,
              ...maskStyles,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AnimatedLoadingLogo;
