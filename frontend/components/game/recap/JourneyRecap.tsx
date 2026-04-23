/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/core/userStore';
import { useExperienceStore } from '@/store/core/experienceStore';
import { useTasteStore } from '@/store/taste/tasteStore';
import { useThemeStore } from '@/store/theme/themeStore';
import { Button } from '@/components/ui/button';
import { Download, Film, Star } from 'lucide-react';
import html2canvas from 'html2canvas';
import { getScoreColor } from '@/lib/scoreUtils';

import { cn } from '@/lib/utils';
import { UserStats, ThemeSortingRound } from '@/lib/api';
import { ExperienceState } from '@/store/core/experienceStore';

interface RecapCardProps {
  isExport?: boolean;
  username: string | null;
  userStats: UserStats;
  scores: ExperienceState['scores'];
  actualPopularity: number;
  actualAlignment: number;
  themeSortingRounds: ThemeSortingRound[];
}

const RecapCard = React.forwardRef<HTMLDivElement, RecapCardProps>(
  (
    {
      isExport,
      username,
      userStats,
      scores,
      actualPopularity,
      actualAlignment,
      themeSortingRounds,
    },
    ref,
  ) => {
    // Shared calculations
    const totalRatings = userStats.ratingDistribution
      ? Object.values(userStats.ratingDistribution).reduce((a: number, b: number) => a + b, 0)
      : 0;
    const avgRating = userStats.averageRating || 0;

    const guiltyPleasure = userStats.guiltyPleasures?.[0];
    const controversialPick = userStats.controversialPicks?.[0];
    const hotTake = userStats.hotTakes?.[0];
    const skepticPick = userStats.skepticPicks?.[0];

    const topGenres = userStats.genreOverview?.slice(0, 3) || [];
    let leastGenres: { id?: string; name: string; userWatchCount: number }[] = [];
    if (userStats.genreOverview && userStats.genreOverview.length > 3) {
      leastGenres = [...userStats.genreOverview]
        .filter((g) => g.userWatchCount > 0)
        .reverse()
        .slice(0, 3);
    }

    let highestRatedGenre = null;
    let leastRatedGenre = null;
    if (userStats.genreOverview && userStats.genreOverview.length > 1) {
      const sorted = [...userStats.genreOverview].sort((a, b) => b.userAvgRating - a.userAvgRating);
      highestRatedGenre = sorted[0];
      leastRatedGenre = sorted[sorted.length - 1];
    }

    const topActors = userStats.topActors?.slice(0, 3) || [];
    const topCountries = userStats.countryStats?.slice(0, 3) || [];

    let preferredDuration = null;
    const distr = userStats.durationDistribution?.find((d) => d.isActual);
    if (distr && distr.batches) {
      const maxBatch = distr.batches.reduce((prev, curr) =>
        curr.watchCount > prev.watchCount ? curr : prev,
      );
      preferredDuration = maxBatch.label;
    }

    const topThemeRound = themeSortingRounds?.find((r) => r.type === 'favorite');

    const isMainstream = actualPopularity > 0.5;
    const isDivergent = actualAlignment > 0.5;
    let persona = 'An NPC';
    let personaColor = 'text-[#E76F51]';
    if (isMainstream && isDivergent) {
      persona = 'A Provocateur';
      personaColor = 'text-[#2A9D8F]';
    } else if (!isMainstream && isDivergent) {
      persona = 'Actually Mental';
      personaColor = 'text-[#F4A261]';
    } else if (!isMainstream && !isDivergent) {
      persona = 'Criterion Slave';
      personaColor = 'text-[#264653]';
    }

    const affinityLabel = isMainstream ? 'Popular' : 'Niche';
    const affinityVal = isMainstream
      ? Math.round(actualPopularity * 100)
      : Math.round((1 - actualPopularity) * 100);

    const alignLabel = isDivergent ? 'Diverge' : 'Converge';
    const alignVal = isDivergent
      ? Math.round(actualAlignment * 100)
      : Math.round((1 - actualAlignment) * 100);

    const totalScoreRaw =
      scores.rating + scores.genre + scores.taste + scores.habits + scores.theme;
    const totalMaxRaw = 100 + 120 + 100 + 100 + 40; // 460
    const totalOutOf100 = Math.round((totalScoreRaw / totalMaxRaw) * 100);

    // Helpers
    const renderDeviation = (
      dev: {
        title: string;
        poster?: string | null;
        posterUrl?: string | null;
        userRating: number;
        communityRating: number;
      },
      label: string,
      color: string,
      badgeColor: string,
    ) => {
      if (!dev) return null;
      const imgUrl = dev.poster || dev.posterUrl;
      return (
        <div
          className={cn(
            'flex items-center gap-3 text-left relative overflow-hidden rounded-xl',
            isExport ? 'p-4 h-[92px]' : 'p-3 md:p-4 h-[84px] md:h-[92px]',
            color,
          )}
        >
          <div className="flex-1 min-w-0 z-10 flex flex-col justify-center gap-0.5">
            <h4
              className={cn(
                'font-bold uppercase tracking-widest leading-none mb-1',
                isExport ? 'text-[10px]' : 'text-[8px] md:text-[10px]',
                badgeColor,
              )}
            >
              {label}
            </h4>
            <p
              className={cn(
                'font-serif leading-tight line-clamp-2 text-[#2D2D2D]',
                isExport ? 'text-base' : 'text-xs md:text-base',
              )}
            >
              {dev.title}
            </p>
            <p
              className={cn(
                'font-medium leading-none mt-1 text-[#2D2D2D]/60',
                isExport ? 'text-xs' : 'text-[9px] md:text-xs',
              )}
            >
              {dev.userRating}★ / {dev.communityRating}★
            </p>
          </div>
          {imgUrl && (
            <div
              className={cn('shrink-0 relative', isExport ? 'w-14 h-full' : 'w-12 md:w-14 h-full')}
            >
              <img
                src={imgUrl}
                alt="poster"
                className="absolute inset-0 w-full h-full object-cover rounded-md shadow-sm"
              />
            </div>
          )}
        </div>
      );
    };

    const renderListRow = (
      label: string,
      value: string | number,
      valueColor = 'text-[#2A9D8F]',
      showFilmIcon = false,
    ) => (
      <div
        className={cn(
          'flex justify-between items-center leading-relaxed',
          isExport ? 'text-base' : 'text-xs md:text-base',
        )}
      >
        <span className="font-serif text-[#2D2D2D] truncate pr-2">{label}</span>
        <span
          className={cn(
            'font-bold tabular-nums shrink-0 flex items-center gap-1',
            isExport ? 'text-sm' : 'text-[10px] md:text-sm',
            valueColor,
          )}
        >
          {value}
          {showFilmIcon && (
            <Film
              className={cn('opacity-50', isExport ? 'w-3 h-3' : 'w-2.5 h-2.5 md:w-3 md:h-3')}
            />
          )}
        </span>
      </div>
    );

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-2xl shadow-lg border border-black/5 flex flex-col gap-0 relative overflow-hidden',
          isExport ? 'p-10 w-[800px]' : 'p-4 md:p-10',
        )}
      >
        {/* SECTION 1: HEADER */}
        <div
          className={cn(
            'flex justify-between pb-6',
            isExport
              ? 'flex-row items-center gap-6'
              : 'flex-col md:flex-row md:items-center gap-5 md:gap-6',
          )}
        >
          <div className="flex flex-col gap-1">
            <p
              className={cn(
                'uppercase tracking-[0.2em] font-bold text-[#888] leading-none mb-0.5',
                isExport ? 'text-xs' : 'text-[10px] md:text-xs',
              )}
            >
              @{username || 'Movie Lover'}
            </p>
            <p
              className={cn(
                'font-serif leading-none tracking-tight',
                isExport ? 'text-6xl' : 'text-4xl md:text-6xl',
                personaColor,
              )}
            >
              {persona}
            </p>
          </div>

          <div
            className={cn(
              'flex bg-black/[0.03] rounded-2xl overflow-hidden shrink-0',
              isExport ? 'w-auto' : 'w-full md:w-auto',
            )}
          >
            <div
              className={cn(
                'px-4 py-3 md:px-6 md:py-4 text-center border-r border-black/5',
                isExport ? 'flex-none' : 'flex-1 md:flex-none',
              )}
            >
              <p
                className={cn(
                  'uppercase tracking-wider text-[#888] font-bold leading-none mb-2',
                  isExport ? 'text-xs' : 'text-[9px] md:text-xs',
                )}
              >
                Watch Count
              </p>
              <p
                className={cn(
                  'font-serif text-[#2D2D2D] leading-none',
                  isExport ? 'text-4xl' : 'text-2xl md:text-4xl',
                )}
              >
                {totalRatings}
              </p>
            </div>
            <div
              className={cn(
                'px-4 py-3 md:px-6 md:py-4 text-center',
                isExport ? 'flex-none' : 'flex-1 md:flex-none',
              )}
            >
              <p
                className={cn(
                  'uppercase tracking-wider text-[#E76F51] font-bold leading-none mb-2',
                  isExport ? 'text-xs' : 'text-[9px] md:text-xs',
                )}
              >
                Avg Rating
              </p>
              <p
                className={cn(
                  'font-serif text-[#2D2D2D] leading-none flex items-baseline justify-center gap-1',
                  isExport ? 'text-4xl' : 'text-2xl md:text-4xl',
                )}
              >
                {avgRating.toFixed(1)}
                <Star
                  className={cn(
                    'fill-[#E9C46A] text-[#E9C46A] relative -top-0.5',
                    isExport ? 'w-4 h-4' : 'w-3.5 h-3.5 md:w-4 md:h-4',
                  )}
                />
              </p>
            </div>
          </div>
        </div>

        {/* TASTE SLIDERS */}
        <div className="pb-5">
          <div className="flex justify-between items-baseline mb-1.5">
            <span
              className={cn(
                'uppercase text-[#888] tracking-wider font-bold',
                isExport ? 'text-xs' : 'text-[10px] md:text-xs',
              )}
            >
              Mainstream Affinity
            </span>
            <span
              className={cn(
                'font-bold text-[#264653]',
                isExport ? 'text-xs' : 'text-[10px] md:text-xs',
              )}
            >
              {affinityVal}% {affinityLabel}
            </span>
          </div>
          <div
            className="relative h-2 w-full rounded-full overflow-hidden"
            style={{
              backgroundColor: (() => {
                const pct = Math.round(actualPopularity * 100);
                const indigo = { r: 129, g: 140, b: 248 };
                const midpoint = { r: 244, g: 63, b: 94 };
                const amber = { r: 245, g: 158, b: 11 };
                let r, g, b;
                if (pct < 50) {
                  const f = pct / 50;
                  r = Math.round(indigo.r + (midpoint.r - indigo.r) * f);
                  g = Math.round(indigo.g + (midpoint.g - indigo.g) * f);
                  b = Math.round(indigo.b + (midpoint.b - indigo.b) * f);
                } else {
                  const f = (pct - 50) / 50;
                  r = Math.round(midpoint.r + (amber.r - midpoint.r) * f);
                  g = Math.round(midpoint.g + (amber.g - midpoint.g) * f);
                  b = Math.round(midpoint.b + (amber.b - midpoint.b) * f);
                }
                return `rgba(${r}, ${g}, ${b}, 0.7)`;
              })(),
            }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="relative h-0">
            <div
              className="absolute -top-[13px] h-4 w-4 bg-white border-2 border-[#264653] rounded-full shadow-md z-10"
              style={{ left: `calc(${Math.round(actualPopularity * 100)}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[8px] md:text-[9px] uppercase font-bold mt-2.5">
            <span style={{ color: '#818cf8' }}>Niche</span>
            <span style={{ color: '#f59e0b' }}>Popular</span>
          </div>
        </div>

        <div className="pb-6 border-b border-black/5">
          <div className="flex justify-between items-baseline mb-1.5">
            <span
              className={cn(
                'uppercase text-[#888] tracking-wider font-bold',
                isExport ? 'text-xs' : 'text-[10px] md:text-xs',
              )}
            >
              Independence
            </span>
            <span
              className={cn(
                'font-bold text-[#E76F51]',
                isExport ? 'text-xs' : 'text-[10px] md:text-xs',
              )}
            >
              {alignVal}% {alignLabel}
            </span>
          </div>
          <div
            className="relative h-2 w-full rounded-full overflow-hidden"
            style={{
              backgroundColor: (() => {
                const pct = Math.round(actualAlignment * 100);
                const emerald = { r: 16, g: 185, b: 129 };
                const indigo = { r: 99, g: 102, b: 241 };
                const rose = { r: 244, g: 63, b: 94 };
                let r, g, b;
                if (pct < 50) {
                  const f = pct / 50;
                  r = Math.round(emerald.r + (indigo.r - emerald.r) * f);
                  g = Math.round(emerald.g + (indigo.g - emerald.g) * f);
                  b = Math.round(emerald.b + (indigo.b - emerald.b) * f);
                } else {
                  const f = (pct - 50) / 50;
                  r = Math.round(indigo.r + (rose.r - indigo.r) * f);
                  g = Math.round(indigo.g + (rose.g - indigo.g) * f);
                  b = Math.round(indigo.b + (rose.b - indigo.b) * f);
                }
                return `rgba(${r}, ${g}, ${b}, 0.7)`;
              })(),
            }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="relative h-0">
            <div
              className="absolute -top-[13px] h-4 w-4 bg-white border-2 border-[#E76F51] rounded-full shadow-md z-10"
              style={{ left: `calc(${Math.round(actualAlignment * 100)}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[8px] md:text-[9px] uppercase font-bold mt-2.5">
            <span style={{ color: '#10b981' }}>Converge</span>
            <span style={{ color: '#f43f5e' }}>Diverge</span>
          </div>
        </div>

        {/* SECTION 2: DEVIATIONS */}
        <div
          className={cn(
            'grid gap-2.5 md:gap-3 py-6 border-b border-black/5',
            isExport ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2',
          )}
        >
          {renderDeviation(guiltyPleasure, 'Guilty Pleasure', 'bg-[#F4A261]/10', 'text-[#D9822B]')}
          {renderDeviation(hotTake, 'Hot Take', 'bg-[#E76F51]/10', 'text-[#C95032]')}
          {renderDeviation(skepticPick, 'Skeptic Pick', 'bg-[#2A9D8F]/10', 'text-[#1B756A]')}
          {renderDeviation(controversialPick, 'Controversial', 'bg-[#E9C46A]/20', 'text-[#B89635]')}
        </div>

        {/* SECTION 3: DATA GRID */}
        <div
          className={cn(
            'grid gap-6 md:gap-8 py-6 border-b border-black/5',
            isExport ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-3',
          )}
        >
          {/* Column 1: Genres */}
          <div className="space-y-5">
            <div>
              <p
                className={cn(
                  'uppercase text-[#888] tracking-wider font-bold mb-2',
                  isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                )}
              >
                Most Watched
              </p>
              <div className="flex flex-col gap-1.5">
                {topGenres.map((g, idx) => (
                  <React.Fragment key={idx}>
                    {renderListRow(g.name, g.userWatchCount, 'text-[#2A9D8F]', true)}
                  </React.Fragment>
                ))}
              </div>
            </div>
            {leastGenres.length > 0 && (
              <div>
                <p
                  className={cn(
                    'uppercase text-[#888] tracking-wider font-bold mb-2',
                    isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                  )}
                >
                  Least Watched
                </p>
                <div className="flex flex-col gap-1.5">
                  {leastGenres.map((g, idx) => (
                    <React.Fragment key={idx}>
                      {renderListRow(g.name, g.userWatchCount, 'text-[#E76F51]', true)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Geography etc */}
          <div className="space-y-5">
            <div>
              <p
                className={cn(
                  'uppercase text-[#888] tracking-wider font-bold mb-2',
                  isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                )}
              >
                Top Countries
              </p>
              <div className="flex flex-col gap-1.5">
                {topCountries.map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center justify-between leading-relaxed',
                      isExport ? 'text-base' : 'text-sm md:text-base',
                    )}
                  >
                    <span className="font-serif truncate pr-2 text-[#2D2D2D]">{c.name}</span>
                    <span
                      className={cn(
                        'font-bold text-[#E76F51] tabular-nums shrink-0 flex items-center gap-1',
                        isExport ? 'text-sm' : 'text-xs md:text-sm',
                      )}
                    >
                      {c.watchCount}
                      <Film className="w-3 h-3 opacity-50" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {preferredDuration && (
              <div>
                <p
                  className={cn(
                    'uppercase text-[#888] tracking-wider font-bold mb-2',
                    isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                  )}
                >
                  Preferred Duration
                </p>
                <p
                  className={cn(
                    'font-serif text-[#2D2D2D]',
                    isExport ? 'text-base' : 'text-sm md:text-base',
                  )}
                >
                  {preferredDuration}
                </p>
              </div>
            )}
            {topThemeRound && (
              <div>
                <p
                  className={cn(
                    'uppercase text-[#888] tracking-wider font-bold mb-2',
                    isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                  )}
                >
                  Top Theme
                </p>
                <p
                  className={cn(
                    'font-serif text-[#2D2D2D] italic leading-snug',
                    isExport ? 'text-base' : 'text-sm md:text-base',
                  )}
                >
                  &ldquo;{topThemeRound.theme}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Column 3: Actors etc */}
          <div className="space-y-5">
            <div>
              <p
                className={cn(
                  'uppercase text-[#888] tracking-wider font-bold mb-2',
                  isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                )}
              >
                Top Actors
              </p>
              <div className="flex flex-col gap-2">
                {topActors.map((actor, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {actor.photoUrl ? (
                        <img
                          src={actor.photoUrl}
                          className="w-7 h-7 rounded-full object-cover shadow-sm shrink-0"
                          alt=""
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-black/10 shrink-0" />
                      )}
                      <span
                        className={cn(
                          'font-serif truncate text-[#2D2D2D]',
                          isExport ? 'text-base' : 'text-sm md:text-base',
                        )}
                      >
                        {actor.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#888] tabular-nums shrink-0 flex items-center gap-1">
                      {actor.count}
                      <Film className="w-3 h-3 opacity-40" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {highestRatedGenre && (
              <div>
                <p
                  className={cn(
                    'uppercase text-[#888] tracking-wider font-bold mb-2',
                    isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                  )}
                >
                  Highest Rated
                </p>
                {renderListRow(
                  highestRatedGenre.name,
                  `${highestRatedGenre.userAvgRating.toFixed(1)}★`,
                  'text-[#2A9D8F]',
                )}
              </div>
            )}
            {leastRatedGenre && (
              <div>
                <p
                  className={cn(
                    'uppercase text-[#888] tracking-wider font-bold mb-2',
                    isExport ? 'text-xs' : 'text-[10px] md:text-xs',
                  )}
                >
                  Least Rated
                </p>
                {renderListRow(
                  leastRatedGenre.name,
                  `${leastRatedGenre.userAvgRating.toFixed(1)}★`,
                  'text-[#E76F51]',
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: SCORE FOOTER */}
        <div className="flex items-start gap-0 pt-5 pb-1">
          <div className="flex-1 grid grid-cols-5 gap-2">
            {[
              { label: 'Rating', val: scores.rating, max: 100 },
              { label: 'Genre', val: scores.genre, max: 120 },
              { label: 'Theme', val: scores.theme, max: 100 },
              { label: 'Taste', val: scores.taste, max: 100 },
              { label: 'Habits', val: scores.habits, max: 40 },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className={cn(
                    'font-bold uppercase tracking-widest text-[#aaa] leading-none mb-1.5',
                    isExport ? 'text-[10px]' : 'text-[9px] md:text-[10px]',
                  )}
                >
                  {s.label}
                </p>
                <p
                  className={cn(
                    'font-serif leading-none font-bold',
                    isExport ? 'text-xl' : 'text-lg md:text-xl',
                  )}
                  style={getScoreColor((s.val / s.max) * 100)}
                >
                  {Math.round(s.val)}
                </p>
                <p
                  className={cn(
                    'text-[#aaa] mt-0.5 leading-none',
                    isExport ? 'text-[9px]' : 'text-[8px] md:text-[9px]',
                  )}
                >
                  / {s.max}
                </p>
              </div>
            ))}
          </div>
          <div
            className={cn(
              'border-l border-black/10 text-center shrink-0 flex flex-col items-center',
              isExport ? 'pl-8 ml-3' : 'pl-5 md:pl-8 ml-3',
            )}
          >
            <p
              className={cn(
                'font-bold uppercase tracking-widest text-[#888] leading-none mb-1.5',
                isExport ? 'text-[10px]' : 'text-[9px] md:text-[10px]',
              )}
            >
              Total
            </p>
            <p
              className={cn(
                'font-serif font-bold leading-none',
                isExport ? 'text-5xl' : 'text-4xl md:text-5xl',
              )}
              style={getScoreColor(totalOutOf100)}
            >
              {totalOutOf100}
            </p>
            <p
              className={cn(
                'text-[#aaa] mt-1 leading-none',
                isExport ? 'text-[10px]' : 'text-[9px] md:text-[10px]',
              )}
            >
              / 100
            </p>
          </div>
        </div>
      </div>
    );
  },
);

RecapCard.displayName = 'RecapCard';

export const JourneyRecap = () => {
  const userStats = useUserStore((s) => s.userStats);
  const username = useUserStore((s) => s.username);
  const scores = useExperienceStore((s) => s.scores);
  const actualPopularity = useTasteStore((s) => s.actualPopularity);
  const actualAlignment = useTasteStore((s) => s.actualAlignment);
  const themeSortingRounds = useThemeStore((s) => s.sortingRounds);

  const recapRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!userStats) return null;

  const handleShare = async () => {
    if (!exportRef.current || downloading) return;
    setDownloading(true);
    try {
      const element = exportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#F8F5F2',
        useCORS: true,
        logging: false,
      });

      const fileName = 'my-cinematic-identity.png';

      const fallbackDownload = () => {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        setDownloading(false);
      };

      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            fallbackDownload();
            return;
          }
          const file = new File([blob], fileName, { type: 'image/png' });
          const shareData = {
            title: 'My Cinematic Identity',
            files: [file],
          };

          if (navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              setDownloading(false);
            } catch (err) {
              console.error('Share aborted/failed:', err);
              setDownloading(false);
            }
          } else {
            fallbackDownload();
          }
        }, 'image/png');
      } else {
        fallbackDownload();
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
      setDownloading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F5F2] text-[#2D2D2D] overflow-hidden">
      {/* Hidden Export Card (Always Desktop Layout) */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <RecapCard
          ref={exportRef}
          isExport
          username={username}
          userStats={userStats}
          scores={scores}
          actualPopularity={actualPopularity}
          actualAlignment={actualAlignment}
          themeSortingRounds={themeSortingRounds}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar px-3 py-6 md:px-8 md:py-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto flex flex-col gap-4 md:gap-6"
        >
          <motion.div variants={itemVariants} className="text-center space-y-1 mt-0 md:mt-6">
            <h1 className="text-2xl md:text-5xl font-serif tracking-tight text-[#264653]">
              Cinematic Identity
            </h1>
          </motion.div>

          <motion.div variants={itemVariants}>
            <RecapCard
              ref={recapRef}
              username={username}
              userStats={userStats}
              scores={scores}
              actualPopularity={actualPopularity}
              actualAlignment={actualAlignment}
              themeSortingRounds={themeSortingRounds}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Action Buttons — Fixed at Bottom */}
      <div className="flex-shrink-0 w-full bg-[#F8F5F2] border-t border-black/5 p-4 md:p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col md:flex-row gap-3 justify-center items-center max-w-3xl mx-auto"
        >
          <Button
            onClick={handleShare}
            disabled={downloading}
            className="w-full md:w-auto md:px-10 h-14 rounded-full bg-[#264653] hover:bg-[#2A9D8F] text-white font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-3"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Processing...' : 'Share / Save Image'}
          </Button>

          <Button
            asChild
            className="w-full md:w-auto md:px-10 h-14 rounded-full bg-[#00e054] hover:bg-[#00b845] text-black font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
          >
            <a
              href="https://letterboxd.com/bcaglaraydin/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow Me on Letterboxd
            </a>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full md:w-auto md:px-8 h-14 rounded-full border-2 border-[#264653]/10 text-[#264653] font-bold tracking-widest uppercase hover:bg-black/5 hover:scale-[1.02] active:scale-95 transition-all text-xs"
          >
            Analyze Another Profile
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
