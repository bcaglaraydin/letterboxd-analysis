import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { ThemeSortingRound } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ThemeResultItemProps {
  theme: ThemeSortingRound;
  index: number;
  isFavorite: boolean;
  showHint?: boolean;
}

export function ThemeResultItem({ theme, index, isFavorite, showHint }: ThemeResultItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize animation with state
  useEffect(() => {
    controls.start({
      x: isOpen ? '100%' : '0%',
      opacity: isOpen ? 0.5 : 1, // Fade out the lid slightly as it opens
      transition: { type: 'spring', stiffness: 350, damping: 30 },
    });
  }, [isOpen, controls]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 40; // px
    if (!isOpen && info.offset.x > threshold) {
      setIsOpen(true);
    } else if (isOpen && info.offset.x < -threshold) {
      setIsOpen(false);
    } else {
      // Snap back if threshold not met
      controls.start({ x: isOpen ? '100%' : '0%', opacity: isOpen ? 0.5 : 1 });
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-[7rem] md:h-[8.5rem] lg:h-[10rem] rounded-2xl overflow-hidden shadow-sm border border-primary/10 cursor-pointer overflow-x-hidden shrink-0 transition-shadow hover:shadow-md',
        isFavorite ? 'bg-card' : 'bg-card opacity-90',
      )}
      onClick={toggleOpen}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Background Layer: Posters */}
      <div className="absolute inset-0 bg-background/50 flex items-center pl-4 pr-12 gap-3 overflow-x-auto no-scrollbar shadow-inner">
        {theme.topMovies && theme.topMovies.length > 0 ? (
          theme.topMovies.map((movie, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.9 }}
              transition={{ delay: isOpen ? i * 0.05 : 0 }}
              className="relative h-[80%] aspect-[2/3] shrink-0 rounded-md overflow-hidden shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          ))
        ) : (
          <div className="w-full text-center text-sm font-serif text-muted-foreground/70">
            No posters available
          </div>
        )}

        {/* Subtle close hint on the right edge */}
        <motion.div
          className="absolute right-3 h-full flex items-center justify-center text-muted-foreground/40"
          animate={{ x: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </motion.div>
      </div>

      {/* Foreground Layer: The "Lid" */}
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ cursor: 'grabbing' }}
        className={cn(
          'absolute inset-0 w-full h-full bg-card flex items-center gap-5 p-5 sm:p-6 origin-left',
          'hover:bg-muted/10',
        )}
      >
        <div
          className={cn(
            'w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 shrink-0 rounded-full flex items-center justify-center font-bold font-serif text-lg md:text-xl lg:text-2xl',
            isFavorite ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground',
          )}
        >
          {index + 1}
        </div>

        <div className="flex-1 flex flex-col justify-center min-w-0 pr-6">
          <p className="font-serif text-foreground/90 text-sm sm:text-base md:text-lg lg:text-xl leading-snug break-words selection:bg-transparent">
            {theme.theme}
          </p>
          <div className="text-xs md:text-sm lg:text-base font-semibold text-muted-foreground whitespace-nowrap mt-1 lg:mt-2 selection:bg-transparent">
            ★ {theme.averageRating.toFixed(1)}
          </div>
        </div>

        {/* Hint to swipe right (only on first item usually) */}
        {showHint && !isOpen && (
          <motion.div
            animate={{ x: [0, 4, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute right-4 text-muted-foreground flex items-center pointer-events-none"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
