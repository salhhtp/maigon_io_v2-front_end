import { useEffect, useRef, useState } from "react";

interface AnimatedLoadingLogoProps {
  duration?: number; // Duration in milliseconds
  onComplete?: () => void;
  isComplete?: boolean;
  externalProgress?: number;
  outlineColor?: string;
  fillColor?: string;
  baseOpacity?: number;
}

export const AnimatedLoadingLogo = ({
  duration = 30000, // 30 seconds - realistic review time
  onComplete,
  isComplete = false,
  externalProgress,
  outlineColor = "#CDBABA",
  fillColor = "#9A7C7C",
  baseOpacity = 0.2,
}: AnimatedLoadingLogoProps) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const progressRef = useRef(0);
  const externalProgressRef = useRef<number | undefined>(externalProgress);

  useEffect(() => {
    externalProgressRef.current = externalProgress;
  }, [externalProgress]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const startTime = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const fallbackProgress = (elapsed / duration) * 100;
      const targetProgress = Math.min(
        100,
        Math.max(
          externalProgressRef.current ?? 0,
          fallbackProgress,
        ),
      );

      if (targetProgress <= progressRef.current) {
        return;
      }

      const delta = targetProgress - progressRef.current;
      const easedProgress = progressRef.current + delta * 0.35;
      const nextProgress = Math.min(100, Math.max(progressRef.current + 0.5, easedProgress));

      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              onComplete?.();
            });
          });
        }
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [duration, onComplete]);

  useEffect(() => {
    if (isComplete && !hasCompletedRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      hasCompletedRef.current = true;
      progressRef.current = 100;
      setProgress(100);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          onComplete?.();
        });
      });
    }
  }, [isComplete, onComplete]);

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const clipValue = `${100 - clampedProgress}%`;

  return (
    <div className="relative mx-auto flex h-auto max-w-[534px] items-center justify-center overflow-hidden">
      <span
        className="block font-lora text-[clamp(68px,12vw,128px)] font-medium uppercase tracking-[0.04em]"
        style={{
          fontFamily: "Lora, serif",
          color: outlineColor,
          opacity: baseOpacity,
        }}
      >
        MAIGON
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center overflow-hidden transition-[clip-path] duration-200 ease-out"
        style={{ clipPath: `inset(${clipValue} 0 0 0)` }}
      >
        <span
          className="block font-lora text-[clamp(68px,12vw,128px)] font-medium uppercase tracking-[0.04em]"
          style={{ fontFamily: "Lora, serif", color: fillColor }}
        >
          MAIGON
        </span>
      </span>
    </div>
  );
};

export default AnimatedLoadingLogo;
