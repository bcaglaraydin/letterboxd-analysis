'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TasteMovie } from '@/store/taste/tasteStore';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TasteScatterPlotProps {
  movies: TasteMovie[];
  guessPop: number;
  guessAlign: number;
  actualPop: number;
  actualAlign: number;
  // Layer visibility controls for sequenced reveal
  showPoints?: boolean;
  showGuess?: boolean;
  showActual?: boolean;
  showLine?: boolean;
}

export const TasteScatterPlot: React.FC<TasteScatterPlotProps> = ({
  movies,
  guessPop,
  guessAlign,
  actualPop,
  actualAlign,
  showPoints = true,
  showGuess = false,
  showActual = false,
  showLine = false,
}) => {
  const [selectedMovie, setSelectedMovie] = useState<TasteMovie | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Select 10 representative movies for interactivity to avoid clutter
  const interactiveMovieIds = useMemo(() => {
    if (movies.length <= 10) return new Set(movies.map((m) => m.id));

    // Strategy: 5 most divergent, 5 most aligned (or mixed)
    const sorted = [...movies].sort(
      (a, b) =>
        Math.abs(b.userRating - b.communityRating) - Math.abs(a.userRating - a.communityRating),
    );
    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.slice(-5);
    return new Set([...top5, ...bottom5].map((m) => m.id));
  }, [movies]);

  const handleTrigger = (e: React.MouseEvent | React.TouchEvent, movie: TasteMovie) => {
    if (!interactiveMovieIds.has(movie.id)) return;

    if (selectedMovie?.id === movie.id) {
      setSelectedMovie(null);
      return;
    }

    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    setSelectedMovie(movie);
    setMousePos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // --- Coordinate Mapping (Safe Grid System) ---
  // We map data [0, 1] to SVG coordinates [10, 90] to ensure a clean 10-unit margin for labels.
  const MARGIN = 10;
  const GRID_SIZE = 80; // 90 - 10

  const mapX = (v: number) => v * GRID_SIZE + MARGIN;
  const mapY = (v: number) => (1 - v) * GRID_SIZE + MARGIN; // Invert for SVG Y-down

  const plotPoints = useMemo(() => {
    return movies.map((movie) => {
      const absDiff = Math.abs(movie.userRating - movie.communityRating);
      const independence = Math.max(0, Math.min(1, absDiff / 1.5));

      return {
        ...movie,
        x: mapX(movie.popularity),
        y: mapY(independence),
        isInteractive: interactiveMovieIds.has(movie.id),
      };
    });
  }, [movies, interactiveMovieIds]);

  const userPoint = {
    actual: {
      x: mapX(actualPop),
      y: mapY(actualAlign),
    },
    guess: {
      x: mapX(guessPop),
      y: mapY(guessAlign),
    },
  };

  return (
    <div className="relative w-full h-full bg-muted/10 rounded-3xl border border-primary/5 p-2 md:p-4 select-none overflow-hidden flex flex-col items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Quadrant Text Labels - Discrete helper text */}
        <AnimatePresence>
          {showPoints && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className="absolute inset-[10%] grid grid-cols-2 grid-rows-2 pointer-events-none"
            >
              <div className="border-r border-b border-primary/20 flex items-start justify-start p-4 text-[9px] uppercase font-black tracking-[0.2em] text-fuchsia-500">
                Originalist
              </div>
              <div className="border-b border-primary/20 flex items-start justify-end p-4 text-[9px] uppercase font-black tracking-[0.2em] text-fuchsia-500">
                Provocateur
              </div>
              <div className="border-r border-primary/20 flex items-end justify-start p-4 text-[9px] uppercase font-black tracking-[0.2em] text-slate-500">
                Cult Consensus
              </div>
              <div className="flex items-end justify-end p-4 text-[9px] uppercase font-black tracking-[0.2em] text-slate-500">
                Mainstream Harmony
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-hidden relative z-10 font-sans"
        >
          {/* Axis Lines (Crosshair) - Bound strictly to safe grid 10-90 */}
          <line x1="10" y1="50" x2="90" y2="50" className="stroke-primary/30 stroke-[0.4]" />
          <line x1="50" y1="10" x2="50" y2="90" className="stroke-primary/30 stroke-[0.4]" />

          {/* Precision Labels at Margins (5/95) */}
          {/* X Axis - Offset below the line */}
          <text
            x="5"
            y="55"
            textAnchor="start"
            className="fill-[#818cf8] text-[2px] font-black uppercase tracking-[0.1em] opacity-80"
          >
            Niche
          </text>
          <text
            x="95"
            y="55"
            textAnchor="end"
            className="fill-[#f59e0b] text-[2px] font-black uppercase tracking-[0.1em] opacity-80"
          >
            Mainstream
          </text>

          {/* Y Axis - Offset to the right of the line */}
          <text
            x="54"
            y="6"
            textAnchor="start"
            className="fill-[#f43f5e] text-[2px] font-black uppercase tracking-[0.1em] opacity-80"
          >
            Divergence
          </text>
          <text
            x="54"
            y="96"
            textAnchor="start"
            className="fill-[#10b981] text-[2px] font-black uppercase tracking-[0.1em] opacity-80"
          >
            Consensus
          </text>

          {/* Movie Points */}
          <AnimatePresence>
            {showPoints &&
              plotPoints.map((point, i) => (
                <motion.circle
                  key={point.id}
                  cx={point.x}
                  cy={point.y}
                  r={point.isInteractive ? (selectedMovie?.id === point.id ? '2' : '1.2') : '0.6'}
                  className={cn(
                    'transition-all duration-300',
                    point.isInteractive
                      ? selectedMovie?.id === point.id
                        ? 'fill-primary'
                        : 'fill-primary/60 cursor-pointer hover:fill-primary'
                      : 'fill-primary/20 pointer-events-none',
                  )}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.002 }}
                  onClick={(e) => handleTrigger(e, point)}
                  onMouseEnter={(e) => {
                    if (window.innerWidth > 768) handleTrigger(e, point);
                  }}
                  onMouseLeave={() => {
                    if (window.innerWidth > 768) setSelectedMovie(null);
                  }}
                />
              ))}
          </AnimatePresence>

          {/* Connection Line */}
          <AnimatePresence>
            {showLine && showGuess && showActual && (
              <motion.line
                x1={userPoint.guess.x}
                y1={userPoint.guess.y}
                x2={userPoint.actual.x}
                y2={userPoint.actual.y}
                className="stroke-primary/30 stroke-[0.3]"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                strokeDasharray="1 1"
              />
            )}
          </AnimatePresence>

          {/* Guess Position (Projection) */}
          <AnimatePresence>
            {showGuess && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.8 }}
              >
                <circle
                  cx={userPoint.guess.x}
                  cy={userPoint.guess.y}
                  r="2.2"
                  className="fill-accent"
                  stroke="white"
                  strokeWidth="0.4"
                />
                <text
                  x={userPoint.guess.x}
                  y={userPoint.guess.y + 6}
                  textAnchor="middle"
                  className="fill-accent text-[2px] font-black uppercase tracking-widest pointer-events-none"
                >
                  Projection
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Actual Reality Position (Identity) - Double Ring */}
          <AnimatePresence>
            {showActual && (
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 1 }}
              >
                <motion.circle
                  cx={userPoint.actual.x}
                  cy={userPoint.actual.y}
                  r="3.5"
                  className="fill-primary/10"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <circle
                  cx={userPoint.actual.x}
                  cy={userPoint.actual.y}
                  r="2.2"
                  className="fill-primary"
                  stroke="white"
                  strokeWidth="0.4"
                />
                <text
                  x={userPoint.actual.x}
                  y={userPoint.actual.y - 5}
                  textAnchor="middle"
                  className="fill-primary text-[2px] font-black uppercase tracking-widest pointer-events-none"
                >
                  Identity
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* Tooltip implementation remains similar, but z-index and clamping verified */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-[200]"
            style={{
              left: mousePos.x,
              top: Math.max(80, mousePos.y - 150),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-background/95 backdrop-blur-md border border-primary/20 rounded-lg shadow-2xl p-2 flex flex-col items-center space-y-2 w-32 md:w-28 overflow-hidden pointer-events-none">
              <div className="relative w-full aspect-[2/3] shadow-md overflow-hidden rounded">
                <Image
                  src={selectedMovie.posterUrl}
                  alt={selectedMovie.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="text-center w-full">
                <p className="text-[10px] font-bold leading-tight truncate px-1">
                  {selectedMovie.title}
                </p>
                <div className="flex justify-between w-full mt-1 px-1 text-[8px] text-muted-foreground font-medium">
                  <span>You: {selectedMovie.userRating}</span>
                  <span>Avg: {selectedMovie.communityRating}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
