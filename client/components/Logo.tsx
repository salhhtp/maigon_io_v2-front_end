import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'lg', align = 'center' }) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
  };

  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end'
  };

  const baseColor = '#9A7C7C';
  const accentColor = '#4B3F3F';
  const letterColor = (letter: string) =>
    letter === 'A' || letter === 'I' ? accentColor : baseColor;
  const letters = ['M', 'A', 'I', 'G', 'O', 'N'];

  return (
    <div className={`flex ${alignClasses[align]} items-center ${className}`}>
      <div className={`font-semibold tracking-[0.14em] uppercase leading-none ${sizeClasses[size]}`}>
        {letters.map((letter) => (
          <span key={letter} style={{ color: letterColor(letter) }}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Logo;
