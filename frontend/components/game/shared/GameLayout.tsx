'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { DebugControls } from '@/components/debug/DebugControls';

interface GameLayoutProps {
  top?: React.ReactNode;
  middle: React.ReactNode;
  bottom?: React.ReactNode;
  className?: string;
  /** Center content horizontally with max-width constraint (absorbs GameContainer functionality) */
  centered?: boolean;
  /** Max width class when centered (default: "max-w-7xl") */
  maxWidth?: string;
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  top,
  middle,
  bottom,
  className,
  centered = false,
  maxWidth = 'max-w-7xl',
}) => {
  const contentWrapper = centered
    ? cn(
        'flex-1 flex flex-col items-center justify-start md:justify-center w-full mx-auto',
        maxWidth,
      )
    : '';

  return (
    <div
      className={cn(
        'flex flex-col h-[100dvh] md:min-h-screen w-full relative overflow-hidden md:overflow-visible',
        centered && contentWrapper,
        className,
      )}
    >
      {/* Top Zone - High z-index to stay above overlays if needed */}
      {(top || (!top && !bottom)) && (
        <div className="shrink-0 z-[60] w-full relative flex flex-col justify-center">{top}</div>
      )}

      {/* Middle Zone */}
      <div className="flex-1 min-h-0 w-full relative flex flex-col justify-center items-center">
        {middle}
      </div>

      {/* Bottom Zone */}
      {bottom && (
        <div className="shrink-0 z-10 w-full relative flex flex-col justify-center">{bottom}</div>
      )}

      <DebugControls />
    </div>
  );
};
