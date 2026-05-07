'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
  ZoomableGroup,
} from 'react-simple-maps';
import { interpolateRgb } from 'd3-interpolate';
import { GameRoundIndicator } from '@/components/game/shared/GameRoundIndicator';
import { ScorePanel } from '@/components/game/shared/ScorePanel';
import { Button } from '@/components/ui/button';
import type { CountryStat } from '@/lib/api';
import { GAME_SECTION_TITLE_CLASS } from '@/components/game/shared/titleStyles';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Power scale for color mapping (replaces d3-scale dependency for simplicity)
function powerScale(value: number, max: number, exponent: number): number {
  if (max <= 0) return 0;
  const normalized = Math.min(Math.max(value / max, 0), 1);
  return Math.pow(normalized, exponent);
}

// Letterboxd country name → Natural Earth / TopoJSON NAME mapping
// This handles mismatches between how Letterboxd labels countries vs. how
// the world-atlas TopoJSON names them.
const COUNTRY_NAME_MAP: Record<string, string> = {
  USA: 'United States of America',
  'United States': 'United States of America',
  UK: 'United Kingdom',
  'South Korea': 'South Korea',
  'North Korea': 'North Korea',
  Russia: 'Russia',
  'Czech Republic': 'Czechia',
  'Hong Kong': 'Hong Kong',
  Taiwan: 'Taiwan',
  Palestine: 'Palestine',
  'Ivory Coast': "Côte d'Ivoire",
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Republic of the Congo': 'Congo',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'Dominican Republic': 'Dominican Rep.',
  'North Macedonia': 'North Macedonia',
};

interface WorldMapRoundProps {
  onComplete: () => void;
  currentScore: number;
  roundNumber: number;
  totalRounds: number;
  countryStats: CountryStat[];
}

type MapMode = 'watchCount' | 'avgRating';
type Phase = 'map' | 'analysis';

export function WorldMapRound({
  onComplete,
  currentScore,
  roundNumber,
  totalRounds,
  countryStats,
}: WorldMapRoundProps) {
  const [mode, setMode] = useState<MapMode>('watchCount');
  const [phase, setPhase] = useState<Phase>('map');
  const [tooltip, setTooltip] = useState<{
    name: string;
    stat: CountryStat | null;
    x: number;
    y: number;
    safeX: number;
    safeY: number;
  } | null>(null);

  // Helper to calculate safe tooltip coordinates
  const getSafePosition = (
    evt: React.MouseEvent,
    width: number,
    height: number,
    offset: number = 10,
  ) => {
    const margin = 10;
    const x = evt.clientX;
    const y = evt.clientY;

    // Default: right side, above cursor
    let safeX = x + offset;
    let safeY = y - height - offset;

    // Check right boundary
    if (safeX + width > window.innerWidth - margin) {
      safeX = x - width - offset; // flip to left side
    }

    // Check left boundary (if flipped and still off-screen)
    if (safeX < margin) {
      safeX = margin;
    }

    // Check top boundary
    if (safeY < margin) {
      safeY = y + offset; // flip to below cursor
    }

    return { x, y, safeX, safeY };
  };

  // Build lookup map: normalized country name → CountryStat
  const countryLookup = useMemo(() => {
    const map = new Map<string, CountryStat>();
    countryStats.forEach((cs) => {
      // Add both the original name and the mapped name
      map.set(cs.name.toLowerCase(), cs);
      const mapped = COUNTRY_NAME_MAP[cs.name];
      if (mapped) map.set(mapped.toLowerCase(), cs);
    });
    return map;
  }, [countryStats]);

  // Color scales
  const maxWatch = useMemo(
    () => Math.max(...countryStats.map((c) => c.watchCount), 1),
    [countryStats],
  );
  const maxRating = useMemo(
    () => Math.max(...countryStats.map((c) => c.avgRating), 1),
    [countryStats],
  );

  // Interpolators for color mapping
  const watchInterpolator = interpolateRgb('#F0EBE4', '#E76F51');
  const ratingInterpolator = interpolateRgb('#F0EBE4', '#4b5e4e');

  const findCountryStat = (geoName: string): CountryStat | null => {
    // Try direct match first
    const direct = countryLookup.get(geoName.toLowerCase());
    if (direct) return direct;

    // Try reverse mapping — check if any COUNTRY_NAME_MAP value matches geo
    for (const [letterboxdName, topoName] of Object.entries(COUNTRY_NAME_MAP)) {
      if (topoName.toLowerCase() === geoName.toLowerCase()) {
        const stat = countryLookup.get(letterboxdName.toLowerCase());
        if (stat) return stat;
      }
    }

    return null;
  };

  const getColor = (geoName: string) => {
    const stat = findCountryStat(geoName);
    if (!stat) return '#E8E4DF'; // Unvisited — warm muted grey

    if (mode === 'watchCount') {
      // Soft power curve (exponent 0.4) — even low values show noticeable color
      const t = powerScale(stat.watchCount, maxWatch, 0.4);
      return watchInterpolator(t);
    } else {
      if (stat.avgRating <= 0) return '#E8E4DF';
      // Sharp power curve (exponent 2.5) — only high ratings get strong color
      const t = powerScale(stat.avgRating, maxRating, 2.5);
      return ratingInterpolator(t);
    }
  };

  // Analysis data
  const sortedByWatch = useMemo(
    () => [...countryStats].sort((a, b) => b.watchCount - a.watchCount),
    [countryStats],
  );
  const sortedByRating = useMemo(
    () =>
      [...countryStats]
        .filter((c) => c.avgRating > 0 && c.watchCount >= 3) // Min 3 films for meaningful rating
        .sort((a, b) => b.avgRating - a.avgRating),
    [countryStats],
  );

  if (phase === 'analysis') {
    return (
      <CountryAnalysis
        sortedByWatch={sortedByWatch}
        sortedByRating={sortedByRating}
        onComplete={onComplete}
        currentScore={currentScore}
        roundNumber={roundNumber}
        totalRounds={totalRounds}
      />
    );
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col overflow-hidden relative font-sans bg-background">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-start p-4 md:p-8 relative z-[60] shrink-0">
        <GameRoundIndicator major={roundNumber} majorTotal={totalRounds} />
        <ScorePanel
          score={currentScore}
          pointsEarned={null}
          maxScore={100}
          size="lg"
          position="static"
          showMaxScore={true}
        />
      </div>

      {/* Title + Toggle */}
      <div className="shrink-0 px-4 pb-2 md:pb-4 flex flex-col items-center gap-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GAME_SECTION_TITLE_CLASS} text-center text-primary`}
        >
          Your Cinema World Map
        </motion.h2>

        {/* Mode Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex bg-muted rounded-full p-1 gap-1"
        >
          <button
            onClick={() => setMode('watchCount')}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
              mode === 'watchCount'
                ? 'bg-[#E76F51] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Watch Count
          </button>
          <button
            onClick={() => setMode('avgRating')}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
              mode === 'avgRating'
                ? 'bg-[#4b5e4e] text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Avg Rating
          </button>
        </motion.div>
      </div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="flex-1 min-h-0 relative w-full flex items-center justify-center overflow-hidden"
      >
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{
            scale: 155,
            center: [10, 0],
          }}
          width={800}
          height={450}
          className="w-full max-h-[75vh] md:max-h-full touch-none"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        >
          <ZoomableGroup
            minZoom={1}
            maxZoom={4}
            translateExtent={[
              [-100, -50],
              [900, 500],
            ]}
          >
            {/* Ocean background */}
            <Sphere id="ocean-sphere" fill="#F5F1EB" stroke="#D5CFC7" strokeWidth={0.8} />
            {/* Lat/lon grid — subtle depth cue */}
            <Graticule stroke="#E0DBD3" strokeWidth={0.3} />
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoName = geo.properties.name || '';
                  const stat = findCountryStat(geoName);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColor(geoName)}
                      stroke="#C9C3B8"
                      strokeWidth={0.4}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      onMouseEnter={(evt) => {
                        const width = 200; // rough max width
                        const height = stat ? 150 : 40;
                        const pos = getSafePosition(evt, width, height);
                        setTooltip({
                          name: geoName,
                          stat,
                          ...pos,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={(evt) => {
                        const width = 200;
                        const height = stat ? 150 : 40;
                        const pos = getSafePosition(evt, width, height);
                        setTooltip({
                          name: geoName,
                          stat,
                          ...pos,
                        });
                      }}
                      style={{
                        default: {
                          outline: 'none',
                          transition: 'fill 0.3s ease',
                        },
                        hover: {
                          fill: stat ? (mode === 'watchCount' ? '#D4533B' : '#3a4d3f') : '#DAD5CD',
                          outline: 'none',
                          cursor: stat ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Mobile Interaction Hint */}
        <div className="absolute top-4 right-4 md:hidden pointer-events-none bg-background/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 border border-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M5 9l-3 3 3 3" />
            <path d="M9 5l3-3 3 3" />
            <path d="M19 9l3 3-3 3" />
            <path d="M15 19l-3 3-3-3" />
            <path d="M2 12h20" />
            <path d="M12 2v20" />
          </svg>
          <span className="text-[10px] text-muted-foreground font-medium">Drag to pan</span>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-[100] pointer-events-none"
              style={{ left: tooltip.safeX, top: tooltip.safeY }}
            >
              <div className="bg-card/95 backdrop-blur-md border border-primary/10 rounded-xl shadow-lg px-4 py-3 md:px-6 md:py-4 max-w-[300px] md:max-w-[420px]">
                <p className="font-serif font-bold text-sm md:text-base text-foreground">
                  {tooltip.name}
                </p>
                {tooltip.stat ? (
                  <div className="mt-1.5 md:mt-2.5 space-y-1 md:space-y-1.5 text-xs md:text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{tooltip.stat.watchCount}</span>{' '}
                      films watched
                    </p>
                    {tooltip.stat.avgRating > 0 && (
                      <p>
                        ★{' '}
                        <span className="font-medium text-foreground">
                          {tooltip.stat.avgRating.toFixed(1)}
                        </span>{' '}
                        avg rating
                      </p>
                    )}
                    {tooltip.stat.topMovies.length > 0 && (
                      <div className="flex gap-2 mt-2.5">
                        {tooltip.stat.topMovies.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 min-w-0">
                            <div className="w-10 h-[60px] md:w-20 md:h-[120px] rounded-md overflow-hidden bg-muted border border-primary/5 shrink-0 shadow-sm">
                              {m.posterUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={m.posterUrl}
                                  alt={m.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span className="text-[8px] md:text-[10px] text-muted-foreground leading-tight text-center line-clamp-2 max-w-[56px] md:max-w-[80px]">
                              {m.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground italic">No films watched</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 bg-card/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-primary/10 shadow-sm">
          <p className="text-[10px] md:text-xs text-muted-foreground mb-1.5 font-medium">
            {mode === 'watchCount' ? 'Films Watched' : 'Average Rating'}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">0</span>
            <div
              className="w-20 md:w-28 h-2.5 rounded-full"
              style={{
                background:
                  mode === 'watchCount'
                    ? 'linear-gradient(to right, #F0EBE4, #E76F51)'
                    : 'linear-gradient(to right, #F0EBE4, #4b5e4e)',
              }}
            />
            <span className="text-[9px] text-muted-foreground">
              {mode === 'watchCount' ? maxWatch : maxRating.toFixed(1)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Continue Button */}
      <div className="shrink-0 px-4 pb-6 md:pb-8 pt-2 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="w-full max-w-sm"
        >
          <Button
            className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
            onClick={() => setPhase('analysis')}
          >
            See Country Analysis
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Country Analysis Reveal ──────────────────────────────────────────

interface CountryAnalysisProps {
  sortedByWatch: CountryStat[];
  sortedByRating: CountryStat[];
  onComplete: () => void;
  currentScore: number;
  roundNumber: number;
  totalRounds: number;
}

function CountryAnalysis({
  sortedByWatch,
  sortedByRating,
  onComplete,
  currentScore,
  roundNumber,
  totalRounds,
}: CountryAnalysisProps) {
  const topWatched = sortedByWatch.slice(0, 5);
  const bottomWatched = sortedByWatch.slice(-5).reverse();
  const topRated = sortedByRating.slice(0, 5);
  const bottomRated = sortedByRating.slice(-5).reverse();

  const [hoveredMovies, setHoveredMovies] = useState<{
    movies: { title: string; posterUrl: string }[];
    safeX: number;
    safeY: number;
  } | null>(null);

  return (
    <div className="w-full h-[100dvh] flex flex-col overflow-hidden relative font-sans bg-background">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-start p-4 md:p-8 relative z-[60] shrink-0">
        <GameRoundIndicator major={roundNumber} majorTotal={totalRounds} />
        <ScorePanel
          score={currentScore}
          pointsEarned={null}
          maxScore={100}
          size="lg"
          position="static"
          showMaxScore={true}
        />
      </div>

      {/* Title */}
      <div className="shrink-0 px-4 pb-3 md:pb-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GAME_SECTION_TITLE_CLASS} text-primary`}
        >
          Country Breakdown
        </motion.h2>
      </div>

      {/* Scrollable Analysis Grid — vertically centered on desktop, normal flow on mobile */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 md:px-8 lg:px-12 pb-4 md:flex md:flex-col md:justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto w-full md:my-auto">
          <AnalysisSection
            title="Most Watched"
            items={topWatched}
            valueKey="watchCount"
            valueSuffix=" films"
            color="#E76F51"
            delay={0}
            onHover={setHoveredMovies}
          />
          <AnalysisSection
            title="Least Watched"
            items={bottomWatched}
            valueKey="watchCount"
            valueSuffix=" films"
            color="#b28a4d"
            delay={0.15}
            onHover={setHoveredMovies}
          />
          <AnalysisSection
            title="Highest Rated"
            items={topRated}
            valueKey="avgRating"
            valueSuffix=""
            isRating
            color="#4b5e4e"
            delay={0.3}
            onHover={setHoveredMovies}
          />
          <AnalysisSection
            title="Lowest Rated"
            items={bottomRated}
            valueKey="avgRating"
            valueSuffix=""
            isRating
            color="#9a7b6a"
            delay={0.45}
            onHover={setHoveredMovies}
          />
        </div>
      </div>

      {/* Film Posters Tooltip */}
      <AnimatePresence>
        {hoveredMovies && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[100] pointer-events-none"
            style={{ left: hoveredMovies.safeX, top: hoveredMovies.safeY }}
          >
            <div className="bg-card/95 backdrop-blur-md border border-primary/10 rounded-xl shadow-lg p-2 md:p-3 flex gap-1.5 md:gap-2.5">
              {hoveredMovies.movies.map((m, i) => (
                <div
                  key={i}
                  className="w-10 h-[60px] md:w-16 md:h-[96px] rounded-md overflow-hidden bg-muted border border-primary/5 shrink-0 shadow-sm"
                >
                  {m.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[6px] text-muted-foreground">
                      ?
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue Button */}
      <div className="shrink-0 px-4 pb-6 md:pb-8 pt-2 flex justify-center bg-background/80 backdrop-blur-sm relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-sm"
        >
          <Button
            className="w-full h-12 md:h-14 px-8 md:px-12 rounded-xl text-base md:text-lg font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:-translate-y-0.5 md:hover:-translate-y-1 transform duration-200"
            onClick={onComplete}
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Analysis Section Card ──────────────────────────────────────────

interface AnalysisSectionProps {
  title: string;
  items: CountryStat[];
  valueKey: 'watchCount' | 'avgRating';
  valueSuffix: string;
  isRating?: boolean;
  color: string;
  delay: number;
  onHover: (
    data: { movies: { title: string; posterUrl: string }[]; safeX: number; safeY: number } | null,
  ) => void;
}

function AnalysisSection({
  title,
  items,
  valueKey,
  valueSuffix,
  isRating,
  color,
  delay,
  onHover,
}: AnalysisSectionProps) {
  if (items.length === 0) return null;

  const maxVal = Math.max(...items.map((i) => i[valueKey]), 0.01);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-card rounded-2xl border border-primary/10 p-4 md:p-6 lg:p-8 shadow-sm"
    >
      <h3 className="text-sm md:text-lg font-serif font-bold text-foreground mb-3 md:mb-5">
        {title}
      </h3>
      <div className="space-y-2.5 md:space-y-4">
        {items.map((item, idx) => {
          const val = item[valueKey];
          const barWidth = (val / maxVal) * 100;

          return (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + idx * 0.06 }}
              className="flex items-center gap-3 group cursor-default"
              onMouseEnter={(e) => {
                if (item.topMovies.length > 0) {
                  // Calculate safe tooltip coordinates
                  const margin = 10;
                  const width = 160; // rough tooltip width on mobile
                  const height = 100; // rough tooltip height
                  let safeX = e.clientX + 12;
                  let safeY = e.clientY - 60;

                  // Check boundaries
                  if (safeX + width > window.innerWidth - margin) {
                    safeX = e.clientX - width - 12; // flip to left side
                  }
                  if (safeX < margin) safeX = margin;

                  if (safeY < margin) safeY = e.clientY + 20; // flip to bottom
                  if (safeY + height > window.innerHeight - margin) {
                    safeY = window.innerHeight - height - margin;
                  }

                  onHover({ movies: item.topMovies, safeX, safeY });
                }
              }}
              onMouseLeave={() => onHover(null)}
            >
              {/* Rank */}
              <span className="text-xs md:text-sm font-mono text-muted-foreground w-4 md:w-6 shrink-0 text-right">
                {idx + 1}
              </span>
              {/* Name + Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="text-xs md:text-base font-medium text-foreground truncate pr-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </span>
                  <span className="text-xs md:text-sm font-mono text-muted-foreground shrink-0">
                    {isRating ? `★ ${val.toFixed(1)}` : `${val}${valueSuffix}`}
                  </span>
                </div>
                <div className="w-full h-1.5 md:h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ delay: delay + idx * 0.06 + 0.2, duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
