import React from 'react';
import { BobLogo } from './BobLogo';

interface BobAvatarProps {
  size?: number;
  className?: string;
}

export const BobAvatar: React.FC<BobAvatarProps> = ({ size = 28, className = '' }) => {
  return (
    <BobLogo
      size={size}
      className={className}
      shape="rounded"
    />
  );
};
