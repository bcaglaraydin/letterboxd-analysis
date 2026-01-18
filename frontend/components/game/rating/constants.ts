/**
 * Rating Game Configuration
 * Points per round = maxScore / totalRounds
 */
export const RATING_GAME_CONFIG = {
  MAX_SCORE: 100,
  TOTAL_ROUNDS: 5,
  /** Maximum possible rating difference (0 to 5 stars) */
  MAX_DISTANCE: 5.0,
  get POINTS_PER_ROUND() {
    return this.MAX_SCORE / this.TOTAL_ROUNDS;
  },
} as const;

/** Score feedback thresholds and messages */
export const SCORE_FEEDBACK = {
  PERFECT: { threshold: 20, message: 'Spot On.', color: 'text-emerald-400' },
  CLOSE: { threshold: 15, message: 'So Close!', color: 'text-green-400' },
  OK: { threshold: 8, message: 'Not Bad', color: 'text-yellow-400' },
  MISS: { threshold: 0, message: 'Way Off...', color: 'text-red-400' },
} as const;

/** Get feedback for a given score */
export const getScoreFeedback = (score: number | null) => {
  if (score === null) return SCORE_FEEDBACK.OK;
  if (score === SCORE_FEEDBACK.PERFECT.threshold) return SCORE_FEEDBACK.PERFECT;
  if (score >= SCORE_FEEDBACK.CLOSE.threshold) return SCORE_FEEDBACK.CLOSE;
  if (score >= SCORE_FEEDBACK.OK.threshold) return SCORE_FEEDBACK.OK;
  return SCORE_FEEDBACK.MISS;
};
