import React, { useState } from 'react';
import mascotPng from '../assets/images/bob-logo.png';

interface BobLogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  textClassName?: string;
  shape?: 'square' | 'rounded' | 'circle' | 'transparent';
}

export const BobLogo: React.FC<BobLogoProps> = ({
  size = 32,
  className = '',
  withText = false,
  textClassName = 'text-xl font-extrabold tracking-tight',
  shape = 'transparent',
}) => {
  const [imgError, setImgError] = useState(false);

  const borderRadiusClass = 
    shape === 'circle' ? 'rounded-full' : 
    shape === 'rounded' ? 'rounded-[10px]' : 
    shape === 'transparent' ? 'bg-transparent' : 'rounded-none';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        style={{ width: size, height: size }}
        className={`relative flex items-center justify-center overflow-hidden flex-shrink-0 ${borderRadiusClass}`}
      >
        {!imgError ? (
          <img
            src={mascotPng}
            onError={() => setImgError(true)}
            alt="Bob Mascot"
            className="w-full h-full object-contain drop-shadow-sm select-none"
          />
        ) : (
          <img
            src="./bob-logo.png"
            alt="Bob Mascot"
            className="w-full h-full object-contain select-none"
          />
        )}
      </div>

      {withText && (
        <span className={`text-[var(--t)] ${textClassName}`}>
          Bob
        </span>
      )}
    </div>
  );
};
