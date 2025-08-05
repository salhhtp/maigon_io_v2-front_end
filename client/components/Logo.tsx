import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-8'
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <img 
        src="https://api.builder.io/api/v1/image/assets/TEMP/b0949329babe110fdd188f56bd092ac7588362ee?width=400" 
        alt="MAIGON"
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

export default Logo;
