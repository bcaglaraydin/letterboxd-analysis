import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActorMockData } from '@/mocks/data';

export type ActorData = ActorMockData;

interface ActorResultAccordionProps {
  actor: ActorData;
  index: number;
  isSelected: boolean;
  delay: number;
}

export function ActorResultAccordion({
  actor,
  index,
  isSelected,
  delay,
}: ActorResultAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize animation with state
  useEffect(() => {
    controls.start({
      x: isOpen ? '100%' : '0%',
      opacity: isOpen ? 0.3 : 1, // Fade out the lid slightly as it opens
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
      controls.start({ x: isOpen ? '100%' : '0%', opacity: isOpen ? 0.3 : 1 });
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      ref={containerRef}
      className={cn(
        'relative w-full shrink-0 min-h-[4.5rem] md:min-h-[9rem] rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border transition-all duration-300 cursor-pointer',
        isSelected ? 'border-primary shadow-md shadow-primary/20' : 'border-primary/10',
        'bg-card',
      )}
      onClick={toggleOpen}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Background Layer: Movies Watched */}
      <div className="absolute inset-0 bg-background/50 flex items-center pl-4 pr-12 gap-3 overflow-x-auto no-scrollbar shadow-inner">
        {actor.moviesWatched && actor.moviesWatched.length > 0 ? (
          actor.moviesWatched.slice(0, 5).map((movie, i) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.9 }}
              transition={{ delay: isOpen ? i * 0.05 : 0 }}
              className="relative h-[90%] aspect-[2/3] shrink-0 rounded-md overflow-hidden shadow-md bg-black/20"
            >
              <Image
                src={movie.posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </motion.div>
          ))
        ) : (
          <div className="w-full text-center text-sm font-serif text-muted-foreground/70">
            No movies available
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

      {/* Foreground Layer: The "Lid" (Actor Details) */}
      <motion.div
        drag="x"
        dragConstraints={containerRef}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ cursor: 'grabbing' }}
        className={cn(
          'absolute inset-0 w-full h-full bg-card flex items-center gap-3 py-2 px-3 sm:px-4 origin-left',
          'hover:bg-muted/30',
        )}
      >
        <div className="h-[calc(100%-0.5rem)] aspect-[3/4] shrink-0 relative">
          <div className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden bg-muted border border-border relative">
            {actor.photoUrl ? (
              <Image
                src={actor.photoUrl}
                alt={actor.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-center text-muted-foreground p-1 leading-tight">
                No photo
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-background text-primary font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] border border-primary/20 shadow-sm z-10">
            #{index + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-serif text-base sm:text-lg font-bold truncate">{actor.name}</h3>
          {isSelected && (
            <span className="inline-block text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full mt-0.5">
              Your Guess
            </span>
          )}
        </div>

        <div className="text-right pr-2">
          <span className="text-xl sm:text-2xl font-bold text-accent leading-none block">
            {actor.watchCount}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground block leading-tight mt-0.5">
            movies
          </span>
        </div>

        {/* Hint to swipe right (only on first item usually) */}
        {index === 0 && !isOpen && (
          <motion.div
            animate={{ x: [0, 4, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute right-4 text-muted-foreground flex items-center pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
