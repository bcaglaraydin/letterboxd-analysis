/**
 * Dynamic Dialogue Timing Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates natural, content-aware timing for progressive text reveal.
 *
 * Rules:
 * 1. Short sentences → faster appear speed
 * 2. Long sentences  → slower (nonlinear scaling — never excessively slow)
 * 3. Punctuation-aware pauses (comma < period < question/exclamation)
 * 4. Emotional weight modifier (dramatic = slower, casual = faster)
 * 5. All output durations are in milliseconds
 *
 * This module is pure logic — no React dependencies.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DialoguePause {
  /** Character index (0-based) where the pause occurs */
  index: number;
  /** Pause duration in ms */
  duration: number;
  /** The punctuation character that triggered this pause */
  char: string;
}

export interface DialogueTiming {
  /** Full text that was analyzed */
  text: string;
  /** Total duration for the full text to appear (ms) */
  totalDuration: number;
  /** Delay between each character appearing (ms) */
  perCharacterDelay: number;
  /** Delay between each word appearing (ms) — alternative metric */
  perWordDelay: number;
  /** Map of punctuation-aware pauses */
  pauses: DialoguePause[];
  /** Total pause time from punctuation (ms) */
  totalPauseTime: number;
  /** Character count */
  charCount: number;
  /** Word count */
  wordCount: number;
}

export type EmotionalWeight = 'dramatic' | 'normal' | 'casual' | 'ui';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Base per-character delay in ms.
 * This is the "anchor" — all scaling is relative to this value.
 * Tuned to feel natural at ~40 characters (a short sentence).
 */
const BASE_CHAR_DELAY = 28; // Slightly faster base speed to compensate for closer scaling

/**
 * Character count that maps to the "base" speed with no adjustment.
 * Sentences shorter than this go faster; longer go slower.
 */
const ANCHOR_LENGTH = 40;

/**
 * Nonlinear scaling exponent.
 * Values closer to 1.0 mean less variation between short and long sentences.
 * Increased to 0.8 to reduce the speed difference between short and long sentences.
 */
const SCALING_EXPONENT = 0.8;

/**
 * Absolute speed bounds (ms per character) to prevent extremes.
 */
const MIN_CHAR_DELAY = 18; // Fastest possible (very short / UI text)
const MAX_CHAR_DELAY = 55; // Slowest possible (very long / dramatic)

/**
 * Punctuation pause durations in ms.
 * These are injected as extra wait time at the given character index.
 */
const PUNCTUATION_PAUSES: Record<string, number> = {
  ',': 120,
  ';': 150,
  ':': 150,
  '.': 250,
  '!': 350,
  '?': 350,
  '…': 400,
  '—': 180,
  '–': 150,
};

/**
 * Emotional weight multipliers.
 * Applied to both per-character delay and punctuation pauses.
 */
const EMOTION_MULTIPLIERS: Record<EmotionalWeight, number> = {
  dramatic: 1.25,
  normal: 1.0,
  casual: 0.8,
  ui: 0.6,
};

// ─── Ellipsis Detection ─────────────────────────────────────────────────────

/**
 * Detects `...` (3 consecutive dots) and treats them as a single ellipsis
 * pause instead of 3 separate period pauses.
 * Returns indices that are part of a `...` sequence (the first 2 dots).
 */
function getEllipsisSkipIndices(text: string): Set<number> {
  const skip = new Set<number>();
  for (let i = 0; i < text.length - 2; i++) {
    if (text[i] === '.' && text[i + 1] === '.' && text[i + 2] === '.') {
      skip.add(i);
      skip.add(i + 1);
      // The third dot (i+2) will produce the pause as '…'
    }
  }
  return skip;
}

// ─── Core Engine ────────────────────────────────────────────────────────────

/**
 * Calculate dynamic dialogue timing for a single line of text.
 *
 * @param text     - The raw dialogue text
 * @param emotion  - Emotional weight of the line (default: 'normal')
 * @returns        DialogueTiming with all calculated values
 *
 * @example
 * ```ts
 * const timing = calculateDialogueTiming("I don't think this is a good idea...");
 * // → { totalDuration: 2178, perCharacterDelay: 35, pauses: [...], ... }
 * ```
 */
export function calculateDialogueTiming(
  text: string,
  emotion: EmotionalWeight = 'normal',
): DialogueTiming {
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const emotionMul = EMOTION_MULTIPLIERS[emotion];

  // ── Step 1: Calculate base per-character delay with nonlinear scaling ──
  const ratio = charCount / ANCHOR_LENGTH;
  const scaleFactor = Math.pow(ratio, SCALING_EXPONENT - 1);
  // scaleFactor > 1 for short texts (faster feel via shorter total),
  // scaleFactor < 1 for long texts (slower per-char to avoid tedium)

  let perCharDelay = Math.round(BASE_CHAR_DELAY * scaleFactor * emotionMul);
  perCharDelay = Math.max(MIN_CHAR_DELAY, Math.min(MAX_CHAR_DELAY, perCharDelay));

  // ── Step 2: Build punctuation pause map ──
  const ellipsisSkips = getEllipsisSkipIndices(text);
  const pauses: DialoguePause[] = [];

  for (let i = 0; i < charCount; i++) {
    const char = text[i];

    // Skip dots that are part of a `...` sequence (handled as ellipsis below)
    if (ellipsisSkips.has(i)) continue;

    // Check if this dot is the third in a `...` sequence → treat as ellipsis
    if (char === '.' && i >= 2 && ellipsisSkips.has(i - 1)) {
      pauses.push({
        index: i,
        duration: Math.round(PUNCTUATION_PAUSES['…'] * emotionMul),
        char: '…',
      });
      continue;
    }

    // Standard punctuation pause
    const pauseDuration = PUNCTUATION_PAUSES[char];
    if (pauseDuration !== undefined) {
      // Don't pause for punctuation inside numbers (e.g. "3.5")
      if (char === '.' || char === ',') {
        const prev = text[i - 1];
        const next = text[i + 1];
        if (prev && next && /\d/.test(prev) && /\d/.test(next)) continue;
      }

      pauses.push({
        index: i,
        duration: Math.round(pauseDuration * emotionMul),
        char,
      });
    }
  }

  const totalPauseTime = pauses.reduce((sum, p) => sum + p.duration, 0);

  // ── Step 3: Calculate total duration ──
  const baseDuration = charCount * perCharDelay;
  const totalDuration = baseDuration + totalPauseTime;

  // ── Step 4: Derive per-word delay ──
  const perWordDelay = wordCount > 0 ? Math.round(totalDuration / wordCount) : 0;

  return {
    text,
    totalDuration,
    perCharacterDelay: perCharDelay,
    perWordDelay,
    pauses,
    totalPauseTime,
    charCount,
    wordCount,
  };
}

// ─── Batch Processing ───────────────────────────────────────────────────────

/**
 * Calculate timing for multiple dialogue lines at once.
 * Useful for processing an entire scene or dialogue sequence.
 */
export function calculateDialogueTimings(
  lines: Array<{ text: string; emotion?: EmotionalWeight }>,
): DialogueTiming[] {
  return lines.map(({ text, emotion }) => calculateDialogueTiming(text, emotion));
}

// ─── Cumulative Delay Helpers ───────────────────────────────────────────────

/**
 * For a sequence of dialogue lines that play one after another,
 * calculates the cumulative start time for each line.
 *
 * @param timings  - Array of DialogueTiming objects (in order)
 * @param gapMs    - Gap between lines finishing and the next starting (default: 300ms)
 * @returns        Array of start times in ms (same length as timings)
 *
 * @example
 * ```ts
 * const timings = calculateDialogueTimings([
 *   { text: "Hello." },
 *   { text: "Welcome to the game." },
 * ]);
 * const starts = getCumulativeStartTimes(timings);
 * // → [0, timings[0].totalDuration + 300]
 * ```
 */
export function getCumulativeStartTimes(timings: DialogueTiming[], gapMs: number = 300): number[] {
  const starts: number[] = [];
  let cursor = 0;

  for (let i = 0; i < timings.length; i++) {
    starts.push(cursor);
    cursor += timings[i].totalDuration + gapMs;
  }

  return starts;
}

// ─── Step Delay Converter ───────────────────────────────────────────────────

/**
 * Converts a DialogueTiming into a Framer Motion step delay value (seconds).
 * This bridges the new timing engine with the existing DIALOGUE_TIMING.STEP_DELAY
 * pattern used throughout the codebase.
 *
 * @param timing - A DialogueTiming object
 * @returns      Duration in seconds suitable for Framer Motion delay
 */
export function toStepDelay(timing: DialogueTiming): number {
  return Number((timing.totalDuration / 1000).toFixed(2));
}

/**
 * For an array of dialogue lines, returns the step delays as an array of seconds.
 * Each value represents how long to wait before showing the NEXT line.
 *
 * Integrates with the existing `sequentialFade` / `sequentialSlide` variant pattern:
 * ```ts
 * const stepDelays = toStepDelays(timings);
 * // Use stepDelays[i] as the custom delay for motion.div at index i
 * ```
 */
export function toStepDelays(timings: DialogueTiming[]): number[] {
  return timings.map((t) => toStepDelay(t));
}
