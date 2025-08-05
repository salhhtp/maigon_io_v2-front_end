import { useEffect, useState } from "react";

interface AnimatedLoadingLogoProps {
  duration?: number; // Duration in milliseconds
  onComplete?: () => void;
}

export const AnimatedLoadingLogo = ({
  duration = 5000, // Reduced to 5 seconds for testing
  onComplete
}: AnimatedLoadingLogoProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log('🚀 AnimatedLoadingLogo mounted, starting animation...');

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      // Debug progress
      if (Math.floor(newProgress) % 10 === 0 && Math.floor(newProgress) !== Math.floor((newProgress - 1))) {
        console.log(`⏳ Loading progress: ${Math.floor(newProgress)}%`);
      }

      if (newProgress >= 100) {
        console.log('✅ Loading animation complete!');
        clearInterval(interval);
        onComplete?.();
      }
    }, 50); // Update every 50ms for smooth animation

    return () => {
      console.log('🛑 AnimatedLoadingLogo unmounted');
      clearInterval(interval);
    };
  }, [duration, onComplete]);

  return (
    <div className="relative w-full max-w-[534px] h-24 mx-auto">
      {/* Outlined Logo (Always visible) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="534"
          height="96"
          viewBox="0 0 534 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <text
            x="267"
            y="72"
            textAnchor="middle"
            className="font-lora text-[128px] font-normal"
            style={{
              fontSize: 'clamp(64px, 12vw, 128px)',
              fill: 'none',
              stroke: '#B6A5A5',
              strokeWidth: '1px',
              filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25))'
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
          transition: 'clip-path 0.1s ease-out'
        }}
      >
        <svg
          width="534"
          height="96"
          viewBox="0 0 534 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <text
            x="267"
            y="72"
            textAnchor="middle"
            className="font-lora text-[128px] font-normal"
            style={{
              fontSize: 'clamp(64px, 12vw, 128px)',
              fill: '#9A7C7C',
              filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25))'
            }}
          >
            MAIGON
          </text>
        </svg>
      </div>
    </div>
  );
};

export default AnimatedLoadingLogo;
