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

  return (
    <div className={`flex ${alignClasses[align]} items-center ${className}`}>
      <img
        src="/maigon-logo_2.png"
        alt="MAIGON"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;
