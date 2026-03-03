import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScoreColor } from '@/lib/scoreUtils';
import type { GameStatus } from '@/store/core/experienceStore';

interface GameHubCardProps {
  title: string;
  status: GameStatus;
  score: number;
  maxScore: number;
  icon: React.ReactNode;
  onClick: () => void;
  actionLabel?: string;
  onHoverBorderColor?: string;
  gradientColor?: string;
  index?: number;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export const GameHubCard: React.FC<GameHubCardProps> = ({
  title,
  status,
  score,
  maxScore,
  icon,
  onClick,
  actionLabel = 'Continue',
  onHoverBorderColor = 'focus-visible:ring-primary',
  gradientColor = 'from-primary/5',
}) => {
  const isLocked = status === 'LOCKED';
  const isCompleted = status === 'COMPLETED';
  const isUnlocked = status === 'UNLOCKED';

  // Specific logic for "Rating Intuition" replayability
  // If it's the first card (Rating), we might want to allow replay even if completed.
  // The original code allowed replay if `allGamesCompleted`.
  // For now, let's treat "COMPLETED" as a state where we show the score.
  // The parent component decides if `onClick` is passed or disabled.

  const isDisabled = isLocked;

  return (
    <motion.div
      variants={itemVariants}
      className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[max(250px,calc(25%-1.5rem))] max-w-[320px] h-full"
    >
      <button
        className={cn(
          'w-full text-left h-full bg-card border rounded-3xl p-4 sm:p-5 md:p-8 relative overflow-hidden transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none flex flex-col',
          onHoverBorderColor,
          isUnlocked || isCompleted
            ? `border-accent/50 bg-gradient-to-br ${gradientColor} to-transparent hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.02] cursor-pointer`
            : 'border-border/30 opacity-60 cursor-not-allowed',
        )}
        onClick={!isDisabled ? onClick : undefined}
        disabled={isDisabled}
        aria-label={`${title} - ${status}`}
      >
        {isLocked && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-3 md:space-y-4 h-full flex flex-col">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              {isLocked ? <Lock className="w-5 h-5 md:w-6 md:h-6" /> : icon}
            </div>
            {/* Green check icon removed as requested */}
          </div>

          <div className="flex-1 min-h-[40px] md:min-h-auto">
            <h3 className="text-base sm:text-lg md:text-xl font-bold leading-tight line-clamp-2">
              {isCompleted ? title : isUnlocked ? actionLabel : 'Locked'}
            </h3>
            {/* Status description removed as requested */}
          </div>

          {isCompleted ? (
            <div className="flex items-end gap-1 mt-auto shrink-0">
              <span
                className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold transition-colors leading-none"
                style={getScoreColor((score / maxScore) * 100)}
              >
                {Math.round(score)}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1 opacity-60 whitespace-nowrap">
                / {maxScore}
              </span>
            </div>
          ) : isUnlocked ? (
            <div className="w-full mt-auto shrink-0 h-10 md:h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center text-sm md:text-base font-bold shadow-lg shadow-accent/20 transition-all group px-2">
              <span className="truncate">{actionLabel}</span>
              <ArrowRight className="w-3 h-3 md:w-4 md:h-4 shrink-0 ml-1.5 md:ml-2 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div className="h-10 md:h-12 w-full mt-auto shrink-0 rounded-xl bg-muted/20" />
          )}
        </div>
      </button>
    </motion.div>
  );
};
