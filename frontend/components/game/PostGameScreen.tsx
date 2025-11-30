"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Activity,
  Trophy,
  ArrowRight,
  Users,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/gameStore";

export const PostGameScreen = () => {
  const { score, theme, resetGame, userStats } = useGameStore();

  if (!userStats) return null;

  const { averageRating, ratingDistribution, generosity, communityComparison } =
    userStats;

  // Histogram Data
  const histogramData = Object.entries(ratingDistribution).map(
    ([range, count]) => ({
      range,
      count,
      label: range.split("-")[1], // Use upper bound for label (0.5, 1, 1.5...)
    }),
  );
  const maxCount = Math.max(...histogramData.map((d) => d.count), 1);

  // Generosity Logic
  const isGenerous = generosity.median > generosity.average;
  const isCommunityGenerous =
    communityComparison.averageUserRating >
    communityComparison.averageCommunityRating;

  const generosityLabel = isGenerous ? "Generous" : "Strict";
  const communityLabel = isCommunityGenerous ? "More Generous" : "Stricter";

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium tracking-widest uppercase text-slate-300"
        >
          Analysis Complete
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-serif text-white">
          Your Taste Profile
        </h1>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Final Score */}
        <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden group">
          <div
            className={cn(
              "absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20",
              theme.bgGradient,
            )}
          />
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg relative z-10",
              theme.bgGradient,
            )}
          >
            <Trophy size={40} className="text-white" />
          </div>
          <div className="relative z-10">
            <div className="text-sm text-slate-400 uppercase tracking-widest">
              Game Score
            </div>
            <div className={cn("text-6xl font-serif", theme.accentText)}>
              {score}
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-2 text-slate-300 relative z-10">
            <BarChart size={20} />
            <h3 className="font-medium uppercase tracking-widest text-sm">
              Rating Distribution
            </h3>
          </div>

          <div className="h-40 flex items-end gap-2 relative z-10 px-2">
            {histogramData.map((data, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
              >
                {/* Bar Track */}
                <div className="w-full h-full bg-white/5 rounded-t-sm relative flex items-end overflow-hidden">
                  {/* Actual Bar */}
                  <div
                    className={cn(
                      "w-full transition-all duration-1000 ease-out relative opacity-80 group-hover:opacity-100",
                      theme.sliderColor,
                    )}
                    style={{ height: `${(data.count / maxCount) * 100}%` }}
                  />
                </div>

                {/* Tooltip */}
                <div className="absolute -top-8 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none">
                  {data.count} films ({data.label})
                </div>

                {/* X-Axis Label */}
                <div className="text-[10px] text-slate-500 h-4 font-medium">
                  {i % 2 !== 0 ? data.label : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deep Dive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generosity Analysis */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <Activity size={20} />
              <h3 className="font-medium uppercase tracking-widest text-sm">
                Rating Style
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                Average
              </div>
              <div className="text-2xl font-serif text-white">
                {generosity.average.toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 space-y-1">
              <div className="text-xs text-slate-400 uppercase tracking-wider">
                Median
              </div>
              <div className="text-2xl font-serif text-white">
                {generosity.median.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Verdict</span>
              <span
                className={cn(
                  "text-lg font-medium",
                  isGenerous ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {generosityLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Compares your median rating to your average. If Median &gt;
              Average, you tend to rate higher than the mathematical mean.
            </p>
          </div>
        </div>

        {/* Community Comparison */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-slate-300">
            <Users size={20} />
            <h3 className="font-medium uppercase tracking-widest text-sm">
              Vs. Community
            </h3>
          </div>

          <div className="space-y-6">
            <div className="relative pt-2">
              {/* Bar Comparison */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <User size={16} className="text-slate-400" />
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${(communityComparison.averageUserRating / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">
                    {communityComparison.averageUserRating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Users size={16} className="text-slate-400" />
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(communityComparison.averageCommunityRating / 5) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">
                    {communityComparison.averageCommunityRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-center space-y-2">
              <p className="text-slate-300">
                You are{" "}
                <span
                  className={cn(
                    "font-bold",
                    isCommunityGenerous ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {communityLabel}
                </span>{" "}
                than the average viewer.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compares your average rating for these specific films against
                the global Letterboxd community average.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-center pt-8">
        <button
          onClick={resetGame}
          className={cn(
            "group flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-lg hover:shadow-emerald-500/20",
            theme.buttonColor,
          )}
        >
          <span>Play Again</span>
          <ArrowRight
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};
