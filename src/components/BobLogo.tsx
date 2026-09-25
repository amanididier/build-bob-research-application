import React, { useState } from 'react';
import mascotImage from '../assets/images/bob_mascot_logo_1790332628517.jpg';

interface BobLogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  textClassName?: string;
  shape?: 'square' | 'rounded' | 'circle';
}

export const BobLogo: React.FC<BobLogoProps> = ({
  size = 32,
  className = '',
  withText = false,
  textClassName = 'text-xl font-extrabold tracking-tight',
  shape = 'rounded',
}) => {
  const [imgError, setImgError] = useState(false);

  const borderRadiusClass = 
    shape === 'circle' ? 'rounded-full' : 
    shape === 'rounded' ? 'rounded-[10px]' : 'rounded-none';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        style={{ width: size, height: size }}
        className={`relative flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm ${borderRadiusClass}`}
      >
        {!imgError ? (
          <img
            src="/bob-logo.jpg"
            onError={() => {
              // try imported asset
              if (mascotImage) {
                // If static fails, let fallback SVG render
                setImgError(true);
              }
            }}
            alt="Bob"
            className="w-full h-full object-cover"
          />
        ) : (
          /* High-fidelity SVG of Bob: sunny yellow rounded triangle with big friendly eyes & blue bowtie */
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="bobBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffdb4d" />
                <stop offset="60%" stopColor="#f5bd19" />
                <stop offset="100%" stopColor="#e5a70b" />
              </linearGradient>
              <filter id="bobShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Rounded Triangle Body */}
            <path
              d="M 50 12 
                 C 55 12, 85 68, 87 73 
                 C 89 78, 86 85, 78 85 
                 L 22 85 
                 C 14 85, 11 78, 13 73 
                 C 15 68, 45 12, 50 12 Z"
              fill="url(#bobBodyGrad)"
              filter="url(#bobShadow)"
            />

            {/* Eyebrows */}
            <path d="M 33 32 Q 40 28 47 33" stroke="#3d2a10" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 53 33 Q 60 28 67 32" stroke="#3d2a10" strokeWidth="2.5" strokeLinecap="round" />

            {/* Left Eye */}
            <ellipse cx="40" cy="48" rx="8.5" ry="11.5" fill="#ffffff" />
            <ellipse cx="41" cy="49" rx="6.5" ry="9" fill="#151515" />
            <circle cx="39" cy="45" r="2.8" fill="#ffffff" />
            <circle cx="43" cy="52" r="1.3" fill="#ffffff" />

            {/* Right Eye */}
            <ellipse cx="60" cy="48" rx="8.5" ry="11.5" fill="#ffffff" />
            <ellipse cx="59" cy="49" rx="6.5" ry="9" fill="#151515" />
            <circle cx="57" cy="45" r="2.8" fill="#ffffff" />
            <circle cx="61" cy="52" r="1.3" fill="#ffffff" />

            {/* Happy Open Smile */}
            <path
              d="M 40 64 Q 50 78 60 64 Z"
              fill="#1b120c"
            />
            {/* Tongue */}
            <path
              d="M 44 71 Q 50 78 56 71 Q 50 67 44 71 Z"
              fill="#f06277"
            />

            {/* Sky Blue Bow Tie at the bottom center */}
            <g transform="translate(50, 83)">
              {/* Left wing */}
              <path d="M -2 0 L -15 -6 C -18 -7, -19 7, -15 6 Z" fill="#00b4d8" />
              {/* Right wing */}
              <path d="M 2 0 L 15 -6 C 18 -7, 19 7, 15 6 Z" fill="#00b4d8" />
              {/* Center knot */}
              <ellipse cx="0" cy="0" rx="3.5" ry="4.5" fill="#0096c7" />
            </g>
          </svg>
        )}
      </div>

      {withText && (
        <span className={`${textClassName} text-[var(--t)]`}>
          Bob
        </span>
      )}
    </div>
  );
};
