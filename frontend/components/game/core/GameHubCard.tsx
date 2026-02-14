import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Check } from 'lucide-react';
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
    <motion.div variants={itemVariants} className="w-full h-full">
      <button
        className={cn(
          'w-full text-left h-full bg-card border rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none',
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

        <div className="space-y-4 h-full flex flex-col">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              {isLocked ? <Lock className="w-6 h-6" /> : icon}
            </div>
            {isCompleted && (
              <div className="bg-green-500/10 text-green-500 rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold">
              {isCompleted ? title : isUnlocked ? actionLabel : 'Locked'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isCompleted
                ? 'Analysis Complete'
                : isUnlocked
                  ? `Ready to play ${title}`
                  : 'Complete previous games to unlock'}
            </p>
          </div>

          {isCompleted ? (
            <div className="flex items-end gap-1">
              <span
                className="text-4xl font-serif font-bold transition-colors"
                style={getScoreColor((score / maxScore) * 100)}
              >
                {Math.round(score)}
              </span>
              <span className="text-sm text-muted-foreground mb-1.5 opacity-60">/ {maxScore}</span>
            </div>
          ) : isUnlocked ? (
            <div className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center text-base font-bold shadow-lg shadow-accent/20 transition-all group">
              Start Game
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div className="h-12 w-full rounded-xl bg-muted/20" />
          )}
        </div>
      </button>
    </motion.div>
  );
};
