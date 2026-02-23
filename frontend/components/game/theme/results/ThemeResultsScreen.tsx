'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/theme/themeStore';
import { Heart, ThumbsDown } from 'lucide-react';
import { GAME_TEXT } from '@/lib/content';

interface ThemeResultsScreenProps {
  onComplete: () => void;
}

export function ThemeResultsScreen({ onComplete }: ThemeResultsScreenProps) {
  const { sortingRounds } = useThemeStore();

  // Split the rounds into the two categories
  const favorites = sortingRounds.filter((r) => r.type === 'favorite');
  const leastFavorites = sortingRounds.filter((r) => r.type === 'least_favorite');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden bg-background text-foreground">
      {/* Main Content: Two Columns */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-32 pt-8 sm:pt-16 custom-scrollbar flex flex-col">
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 w-full max-w-5xl mx-auto px-4 sm:px-8">
              {/* Top 5 Themes */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col"
              >
                <div className="flex items-center gap-4 mb-8 px-2">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                    <Heart className="w-6 h-6 fill-current" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-serif text-foreground">Your Top 5</h3>
                </div>

                <div className="flex flex-col gap-4">
                  {favorites.map((theme, idx) => (
                    <motion.div
                      key={`fav-${theme.id}`}
                      variants={itemVariants}
                      className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 shadow-sm flex items-center gap-5"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold font-serif text-lg shrink-0">
                        {idx + 1}
                      </div>
                      <p className="font-serif text-foreground/90 text-lg sm:text-xl leading-snug">
                        {theme.theme}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Bottom 5 Themes */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col"
              >
                <div className="flex items-center gap-4 mb-8 px-2">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                    <ThumbsDown className="w-6 h-6 fill-current" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-serif text-foreground">Not For You</h3>
                </div>

                <div className="flex flex-col gap-4">
                  {leastFavorites.map((theme, idx) => (
                    <motion.div
                      key={`least-${theme.id}`}
                      variants={itemVariants}
                      className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 shadow-sm flex items-center gap-5 opacity-90"
                    >
                      <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold font-serif text-lg shrink-0">
                        {idx + 1}
                      </div>
                      <p className="font-serif text-foreground/90 text-lg sm:text-xl leading-snug">
                        {theme.theme}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-0 right-0 px-6 flex justify-center z-50 bg-gradient-to-t from-background via-background pb-6 pt-12 pointer-events-none"
      >
        <Button
          size="lg"
          onClick={onComplete}
          className="w-full max-w-sm rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg shadow-xl pointer-events-auto h-14"
        >
          {GAME_TEXT.THEME_EXPERIENCE.CONTINUE}
        </Button>
      </motion.div>
    </div>
  );
}
