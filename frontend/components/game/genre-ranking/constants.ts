/**
 * Genre Ranking Game Configuration
 * Points per item = maxScore / itemCount
 */
export const GENRE_RANKING_CONFIG = {
  MAX_SCORE: 120,
  ITEM_COUNT: 8,
  get MAX_DISTANCE() {
    return this.ITEM_COUNT - 1;
  },
  get POINTS_PER_ITEM() {
    return this.MAX_SCORE / this.ITEM_COUNT;
  },
} as const;

/** Animation timing constants (in milliseconds) */
export const REVEAL_ANIMATION_TIMING = {
  /** Delay before column shift begins */
  SHIFT_DELAY: 100,
  /** Delay before slots appear */
  SLOTS_APPEAR_DELAY: 2200,
  /** Delay before items start flying */
  ITEM_FLYING_DELAY: 3200,
  /** Delay for reveal within each item */
  ITEM_REVEAL_DELAY: 200,
  /** Delay for item landing */
  ITEM_LAND_DELAY: 1200,
  /** Delay before moving to next item */
  NEXT_ITEM_DELAY: 1300,
  /** Delay before completing the reveal */
  COMPLETION_DELAY: 1000,
} as const;

