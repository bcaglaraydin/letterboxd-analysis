'use client';

import { useMemo } from 'react';
import { type Variants } from 'framer-motion';
import {
  calculateDialogueTiming,
  type EmotionalWeight,
  type DialogueTiming,
} from './dialogueTiming';
import { DIALOGUE_TIMING } from './dialogueConfig';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DialogueLine {
  /** The plain text of the dialogue line (used for timing calculation) */
  text: string;
  /** Emotional weight override (default: 'normal') */
  emotion?: EmotionalWeight;
}

export interface DialogueTimingResult {
  /**
   * Cumulative delay in seconds for each line index.
   * Use as: `custom={delays[i]}` with the dynamic variants.
   * The value represents the absolute delay from t=0 to when this line starts appearing.
   */
  delays: number[];

  /**
   * Total duration of the entire sequence in seconds.
   * Useful for knowing when to enable CTAs / buttons.
   */
  totalSequenceDuration: number;

  /**
   * Per-line timing data (access charCount, pauses, etc.)
   */
  timings: DialogueTiming[];

  /**
   * Framer Motion variants that use absolute delay values instead of index-based.
   * Usage: `<motion.div variants={fadeVariants} custom={delays[i]}>`
   */
  fadeVariants: Variants;

  /**
   * Slide-up variant (same as fade but with y offset).
   * Usage: `<motion.div variants={slideVariants} custom={delays[i]}>`
   */
  slideVariants: Variants;
}

// ─── Gap between lines ──────────────────────────────────────────────────────

/**
 * Time to wait between one line finishing its "read time" and the next appearing.
 * Kept short because Framer's fade-in already provides visual breathing room.
 */
const INTER_LINE_GAP_MS = 250;

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * React hook that computes dynamic dialogue timing for a set of lines.
 *
 * Replaces the old `i * DIALOGUE_TIMING.STEP_DELAY` pattern with
 * content-aware cumulative delays.
 *
 * @param lines - Array of dialogue lines (text + optional emotion)
 * @returns     Delays array, total duration, and ready-made Framer variants
 *
 * @example
 * ```tsx
 * const { delays, fadeVariants, slideVariants, totalSequenceDuration } = useDialogueTiming([
 *   { text: "You've successfully entered a valid username" },
 *   { text: "Good!" },
 *   { text: "Before we start" },
 *   { text: "I need to ask you a few questions." },
 * ]);
 *
 * // In JSX:
 * <motion.span variants={fadeVariants} custom={delays[0]}>Line 1</motion.span>
 * <motion.span variants={fadeVariants} custom={delays[1]}>Line 2</motion.span>
 * <motion.div  variants={slideVariants} custom={delays[4]}>Button</motion.div>
 * ```
 */
export function useDialogueTiming(lines: DialogueLine[]): DialogueTimingResult {
  return useMemo(() => {
    const timings = lines.map((l) => calculateDialogueTiming(l.text, l.emotion));

    // Build cumulative delays in ms
    const delaysMs: number[] = [];
    let cursor = 0;
    for (let i = 0; i < timings.length; i++) {
      delaysMs.push(cursor);
      cursor += timings[i].totalDuration + INTER_LINE_GAP_MS;
    }

    // Convert to seconds for Framer Motion
    const delays = delaysMs.map((d) => Number((d / 1000).toFixed(3)));
    // Subtract 200ms from the end to overlap the button reveal slightly with the end of the text reading
    // to make the interface feel snappier.
    const totalSequenceDuration = Math.max(0, Number((cursor / 1000 - 0.2).toFixed(3)));

    // ── Dynamic Framer Motion variants ──
    // `custom` is now the absolute delay in seconds (not an index)
    const fadeVariants: Variants = {
      hidden: { opacity: 0 },
      visible: (delaySec: number) => ({
        opacity: 1,
        transition: {
          delay: delaySec,
          duration: DIALOGUE_TIMING.FADE_DURATION,
        },
      }),
      show: (delaySec: number) => ({
        opacity: 1,
        transition: {
          delay: delaySec,
          duration: DIALOGUE_TIMING.FADE_DURATION,
        },
      }),
    };

    const slideVariants: Variants = {
      hidden: { opacity: 0, y: DIALOGUE_TIMING.SLIDE_Y_OFFSET },
      visible: (delaySec: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: delaySec,
          duration: DIALOGUE_TIMING.FADE_DURATION,
        },
      }),
      show: (delaySec: number) => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: delaySec,
          duration: DIALOGUE_TIMING.FADE_DURATION,
        },
      }),
    };

    return { delays, totalSequenceDuration, timings, fadeVariants, slideVariants };
  }, [lines]);
}

// ─── Static helper (for components that don't use React) ────────────────────

/**
 * Non-hook version for use outside React components (e.g. in constant definitions).
 * Same logic as the hook, just not memoized.
 */
export function computeDialogueTiming(lines: DialogueLine[]): DialogueTimingResult {
  const timings = lines.map((l) => calculateDialogueTiming(l.text, l.emotion));

  const delaysMs: number[] = [];
  let cursor = 0;
  for (let i = 0; i < timings.length; i++) {
    delaysMs.push(cursor);
    cursor += timings[i].totalDuration + INTER_LINE_GAP_MS;
  }

  const delays = delaysMs.map((d) => Number((d / 1000).toFixed(3)));
  // Subtract 200ms from the end to overlap the button reveal slightly with the end of the text reading
  // to make the interface feel snappier.
  const totalSequenceDuration = Math.max(0, Number((cursor / 1000 - 0.2).toFixed(3)));

  const fadeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: (delaySec: number) => ({
      opacity: 1,
      transition: {
        delay: delaySec,
        duration: DIALOGUE_TIMING.FADE_DURATION,
      },
    }),
    show: (delaySec: number) => ({
      opacity: 1,
      transition: {
        delay: delaySec,
        duration: DIALOGUE_TIMING.FADE_DURATION,
      },
    }),
  };

  const slideVariants: Variants = {
    hidden: { opacity: 0, y: DIALOGUE_TIMING.SLIDE_Y_OFFSET },
    visible: (delaySec: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: delaySec,
        duration: DIALOGUE_TIMING.FADE_DURATION,
      },
    }),
    show: (delaySec: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: delaySec,
        duration: DIALOGUE_TIMING.FADE_DURATION,
      },
    }),
  };

  return { delays, totalSequenceDuration, timings, fadeVariants, slideVariants };
}
