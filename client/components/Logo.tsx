import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'lg' }) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-12',
    xl: 'h-16'
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
