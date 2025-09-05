import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'lg', align = 'center' }) => {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-8'
  };

  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end'
  };

  return (
    <div className={`flex ${alignClasses[align]} items-center ${className}`}>
      <img
        src="https://cdn.builder.io/api/v1/image/assets%2F4c5b06bbdfb6468489995bc62588cb90%2Fa83cb15a032a4c21a65e4974c98ce161?format=webp&width=800"
        alt="MAIGON"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;
