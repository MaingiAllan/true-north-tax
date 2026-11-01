'use client';

import React, { memo } from 'react';
import AppImage from './AppImage';

type LogoVariant = 'mark' | 'full';

interface AppLogoProps {
  /** "mark" is the TN map symbol for small spaces. "full" includes the name and tagline. */
  variant?: LogoVariant;
  /** Rendered height in pixels. Width follows the image's proportions. */
  height?: number;
  className?: string;
  onClick?: () => void;
}

const SOURCES: Record<LogoVariant, { src: string; ratio: number }> = {
  mark: { src: '/assets/images/app_mark.png', ratio: 605 / 424 },
  full: { src: '/assets/images/app_logo.png', ratio: 1024 / 742 },
};

const AppLogo = memo(function AppLogo({
  variant = 'mark',
  height = 32,
  className = '',
  onClick,
}: AppLogoProps) {
  const { src, ratio } = SOURCES[variant];
  const width = Math.round(height * ratio);

  return (
    <div
      className={`flex items-center ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      onClick={onClick}
    >
      <AppImage
        src={src}
        alt="True North"
        width={width}
        height={height}
        className="flex-shrink-0"
        priority={true}
      />
    </div>
  );
});

export default AppLogo;
