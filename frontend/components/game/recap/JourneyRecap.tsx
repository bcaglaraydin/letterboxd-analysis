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

export const JourneyRecap = () => {
  const userStats = useUserStore((s) => s.userStats);
  const scores = useExperienceStore((s) => s.scores);
  const { actualPopularity, actualAlignment } = useTasteStore();
  const themeSortingRounds = useThemeStore((s) => s.sortingRounds);
  const recapRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!userStats) return null;

  // Rating Stats
  const totalRatings = userStats.ratingDistribution
    ? Object.values(userStats.ratingDistribution).reduce((a: number, b: number) => a + b, 0)
    : 0;
  const avgRating = userStats.averageRating || 0;

  // Deviations
  const guiltyPleasure = userStats.guiltyPleasures?.[0];
  const controversialPick = userStats.controversialPicks?.[0];
  const hotTake = userStats.hotTakes?.[0];
  const skepticPick = userStats.skepticPicks?.[0];

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
        className={`flex flex-col justify-center gap-1 text-left relative overflow-hidden rounded-xl p-3 md:p-4 ${color} h-[80px] md:h-[88px]`}
      >
        <h4
          className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${badgeColor} leading-none`}
        >
          {label}
        </h4>
        <p className="font-serif text-sm md:text-base leading-tight line-clamp-1 pr-16 text-[#2D2D2D] md:pr-20 z-10">
          {dev.title}
        </p>
        <p className="text-[10px] md:text-xs text-[#2D2D2D]/60 font-medium z-10 leading-none">
          {dev.userRating}★ / {dev.communityRating}★
        </p>
        {imgUrl && (
          <img
            src={imgUrl}
            alt="poster"
            className="w-[54px] md:w-[60px] object-cover absolute right-0 inset-y-0 rounded-l shadow-sm"
          />
        )}
      </div>
    );
  };

  // Genre Stats (Top 3 Watched)
  const topGenres = userStats.genreOverview?.slice(0, 3) || [];

  // Least Watched 3
  let leastGenres: { id?: string; name: string; userWatchCount: number }[] = [];
  if (userStats.genreOverview && userStats.genreOverview.length > 3) {
    leastGenres = [...userStats.genreOverview]
      .filter((g) => g.userWatchCount > 0)
      .reverse()
      .slice(0, 3);
  }

  // Highest Rated Genre & Least Rated Genre
  let highestRatedGenre = null;
  let leastRatedGenre = null;
  if (userStats.genreOverview && userStats.genreOverview.length > 1) {
    const sorted = [...userStats.genreOverview].sort((a, b) => b.userAvgRating - a.userAvgRating);
    highestRatedGenre = sorted[0];
    leastRatedGenre = sorted[sorted.length - 1];
  }

  // Habits Stats
  const topActors = userStats.topActors?.slice(0, 3) || [];
  const topCountries = userStats.countryStats?.slice(0, 3) || [];

  // Duration
  let preferredDuration = null;
  const distr = userStats.durationDistribution?.find((d) => d.isActual);
  if (distr && distr.batches) {
    const maxBatch = distr.batches.reduce((prev, curr) =>
      curr.watchCount > prev.watchCount ? curr : prev,
    );
    preferredDuration = maxBatch.label;
  }

  // Theme
  const topThemeRound = themeSortingRounds?.find((r) => r.type === 'favorite');

  // Taste Stats
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

  const totalScoreRaw = scores.rating + scores.genre + scores.taste + scores.habits + scores.theme;
  const totalMaxRaw = 100 + 120 + 100 + 100 + 40; // 460
  const totalOutOf100 = Math.round((totalScoreRaw / totalMaxRaw) * 100);

  const handleShare = async () => {
    if (!recapRef.current || downloading) return;
    setDownloading(true);
    try {
      const element = recapRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#F8F5F2',
        useCORS: true,
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

  // List row renderer
  const renderListRow = (
    label: string,
    value: string | number,
    valueColor = 'text-[#2A9D8F]',
    showFilmIcon = false,
  ) => (
    <div className="flex justify-between items-center text-sm md:text-base leading-relaxed">
      <span className="font-serif text-[#2D2D2D] truncate pr-2">{label}</span>
      <span
        className={`text-xs md:text-sm font-bold ${valueColor} tabular-nums shrink-0 flex items-center gap-1`}
      >
        {value}
        {showFilmIcon && <Film className="w-3 h-3 opacity-50" />}
      </span>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F5F2] text-[#2D2D2D] overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 w-full overflow-y-auto no-scrollbar px-4 py-8 md:px-8 md:py-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto flex flex-col gap-6"
        >
          <motion.div variants={itemVariants} className="text-center space-y-1 mt-2 md:mt-6">
            <h1 className="text-3xl md:text-5xl font-serif tracking-tight text-[#264653]">
              Cinematic Identity
            </h1>
          </motion.div>

          <motion.div
            variants={itemVariants}
            ref={recapRef}
            className="bg-white rounded-2xl p-6 md:p-10 shadow-lg border border-black/5 flex flex-col gap-0 relative overflow-hidden"
          >
            {/* ════════════════════════════════════════════════════
                SECTION 1: HEADER — Persona + Stats (tight row)
               ════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between gap-4 md:gap-6 pb-5">
              {/* Persona Title */}
              <p className={`text-4xl md:text-6xl font-serif leading-none ${personaColor}`}>
                {persona}
              </p>

              {/* Stats Pill */}
              <div className="flex items-stretch bg-black/[0.03] rounded-2xl overflow-hidden shrink-0">
                <div className="px-5 py-3 md:px-6 md:py-4 text-center">
                  <p className="text-[10px] md:text-xs uppercase tracking-wider text-[#888] font-bold leading-none mb-2">
                    Watch Count
                  </p>
                  <p className="font-serif text-3xl md:text-4xl text-[#2D2D2D] leading-none">
                    {totalRatings}
                  </p>
                </div>
                <div className="w-px bg-black/10 self-stretch my-2" />
                <div className="px-5 py-3 md:px-6 md:py-4 text-center">
                  <p className="text-[10px] md:text-xs uppercase tracking-wider text-[#E76F51] font-bold leading-none mb-2">
                    Avg Rating
                  </p>
                  <p className="font-serif text-3xl md:text-4xl text-[#2D2D2D] leading-none flex items-baseline justify-center gap-1">
                    {avgRating.toFixed(1)}
                    <Star className="w-4 h-4 fill-[#E9C46A] text-[#E9C46A] relative -top-0.5" />
                  </p>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                Taste Sliders — each on its own full-width row
                with colored gradient tracks from the Taste Game
               ════════════════════════════════════════════════════ */}
            {/* Mainstream Affinity Slider */}
            <div className="pb-5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold">
                  Mainstream Affinity
                </span>
                <span className="text-[10px] md:text-xs font-bold text-[#264653]">
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

            {/* Independence Slider */}
            <div className="pb-6 border-b border-black/5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold">
                  Independence
                </span>
                <span className="text-[10px] md:text-xs font-bold text-[#E76F51]">
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

            {/* ════════════════════════════════════════════════════
                SECTION 2: DEVIATIONS — Always 2×2
               ════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 gap-2.5 md:gap-3 py-6 border-b border-black/5">
              {renderDeviation(
                guiltyPleasure,
                'Guilty Pleasure',
                'bg-[#F4A261]/10',
                'text-[#D9822B]',
              )}
              {renderDeviation(hotTake, 'Hot Take', 'bg-[#E76F51]/10', 'text-[#C95032]')}
              {renderDeviation(skepticPick, 'Skeptic Pick', 'bg-[#2A9D8F]/10', 'text-[#1B756A]')}
              {renderDeviation(
                controversialPick,
                'Controversial',
                'bg-[#E9C46A]/20',
                'text-[#B89635]',
              )}
            </div>

            {/* ════════════════════════════════════════════════════
                SECTION 3: DATA GRID — 3 balanced columns
                Left: Genres | Center: Geography + Meta | Right: Stars + Ratings
               ════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-6 border-b border-black/5">
              {/* Column 1: Genre Rankings */}
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
                    Most Watched
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {topGenres.map((g) =>
                      renderListRow(g.name, g.userWatchCount, 'text-[#2A9D8F]', true),
                    )}
                  </div>
                </div>
                {leastGenres.length > 0 && (
                  <div>
                    <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
                      Least Watched
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {leastGenres.map((g) =>
                        renderListRow(g.name, g.userWatchCount, 'text-[#E76F51]', true),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Geography + Duration + Theme */}
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
                    Top Countries
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {topCountries.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm md:text-base leading-relaxed"
                      >
                        <span className="font-serif truncate pr-2 text-[#2D2D2D]">{c.name}</span>
                        <span className="text-xs md:text-sm font-bold text-[#E76F51] tabular-nums shrink-0 flex items-center gap-1">
                          {c.watchCount}
                          <Film className="w-3 h-3 opacity-50" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {preferredDuration && (
                  <div>
                    <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
                      Preferred Duration
                    </p>
                    <p className="font-serif text-sm md:text-base text-[#2D2D2D]">
                      {preferredDuration}
                    </p>
                  </div>
                )}
                {topThemeRound && (
                  <div>
                    <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
                      Top Theme
                    </p>
                    <p className="font-serif text-sm md:text-base text-[#2D2D2D] italic leading-snug">
                      &ldquo;{topThemeRound.theme}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Column 3: Stars + Ratings */}
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
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
                          <span className="font-serif text-sm md:text-base truncate text-[#2D2D2D]">
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
                    <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
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
                    <p className="text-[10px] md:text-xs uppercase text-[#888] tracking-wider font-bold mb-2">
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

            {/* ════════════════════════════════════════════════════
                SECTION 4: SCORE FOOTER — Individual + Total merged
               ════════════════════════════════════════════════════ */}
            <div className="flex items-start gap-0 pt-5 pb-1">
              {/* Individual scores — left side */}
              <div className="flex-1 grid grid-cols-5 gap-2">
                {[
                  { label: 'Rating', val: scores.rating, max: 100 },
                  { label: 'Genre', val: scores.genre, max: 120 },
                  { label: 'Theme', val: scores.theme, max: 100 },
                  { label: 'Taste', val: scores.taste, max: 100 },
                  { label: 'Habits', val: scores.habits, max: 40 },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#aaa] leading-none mb-1.5">
                      {s.label}
                    </p>
                    <p
                      className="font-serif text-lg md:text-xl leading-none font-bold"
                      style={getScoreColor((s.val / s.max) * 100)}
                    >
                      {Math.round(s.val)}
                    </p>
                    <p className="text-[8px] md:text-[9px] text-[#aaa] mt-0.5 leading-none">
                      / {s.max}
                    </p>
                  </div>
                ))}
              </div>
              {/* Total — right side, visually dominant */}
              <div className="border-l border-black/10 pl-5 md:pl-8 ml-3 text-center shrink-0 flex flex-col items-center">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#888] leading-none mb-1.5">
                  Total
                </p>
                <p
                  className="font-serif text-4xl md:text-5xl font-bold leading-none"
                  style={getScoreColor(totalOutOf100)}
                >
                  {totalOutOf100}
                </p>
                <p className="text-[9px] md:text-[10px] text-[#aaa] mt-1 leading-none">/ 100</p>
              </div>
            </div>
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
            className="w-full md:w-auto md:px-12 h-14 rounded-full bg-[#264653] hover:bg-[#2A9D8F] text-white font-bold tracking-widest uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-3"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Processing...' : 'Share / Save Image'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="w-full md:w-auto h-14 rounded-full border border-black/10 text-[#888] font-bold tracking-widest uppercase hover:bg-black/5 hover:scale-[1.02] active:scale-95 transition-all text-xs"
          >
            Analyze Another Profile
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
