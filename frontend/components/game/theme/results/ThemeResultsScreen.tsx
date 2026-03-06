'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/store/theme/themeStore';
import { Sparkles, CloudRain } from 'lucide-react';
import { GAME_TEXT } from '@/lib/content';
import { ThemeResultItem } from './ThemeResultItem';

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
    <div className="flex flex-col h-[100dvh] w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative bg-background text-foreground">
      {/* Main Content: Two Columns */}
      <div className="flex-1 w-full min-h-0 relative flex flex-col items-center justify-center">
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
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-full blur-sm" />
                    <Sparkles className="w-5 h-5 relative z-10" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-serif text-foreground">Your Top 5</h3>
                </div>

                <div className="grid auto-rows-[1fr] gap-4">
                  {favorites.map((theme, idx) => (
                    <motion.div
                      key={`fav-${theme.id}`}
                      variants={itemVariants}
                      className="w-full h-full"
                    >
                      <ThemeResultItem
                        theme={theme}
                        index={idx}
                        isFavorite={true}
                        showHint={idx === 0}
                      />
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
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 relative">
                    <div className="absolute inset-0 bg-muted/30 rounded-full blur-sm" />
                    <CloudRain className="w-5 h-5 relative z-10" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-serif text-muted-foreground/80">
                    Your Bottom 5
                  </h3>
                </div>

                <div className="grid auto-rows-[1fr] gap-4">
                  {leastFavorites.map((theme, idx) => (
                    <motion.div
                      key={`least-${theme.id}`}
                      variants={itemVariants}
                      className="w-full h-full"
                    >
                      <ThemeResultItem theme={theme} index={idx} isFavorite={false} />
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
        className="absolute bottom-6 left-0 right-0 px-6 sm:px-12 flex justify-center md:justify-end z-50 pointer-events-none"
      >
        <Button
          onClick={onComplete}
          className="w-full md:w-auto h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200 pointer-events-auto"
        >
          {GAME_TEXT.THEME_EXPERIENCE.CONTINUE}
        </Button>
      </motion.div>
    </div>
  );
}
