/**
 * Standardized timing configuration for all dialogues in the application.
 * Values are in seconds.
 */
export const DIALOGUE_TIMING = {
  /** Delay between consecutive phrases appearing in a sequence. */
  STEP_DELAY: 1.2,

  /** Duration of the fade-in animation for a phrase. */
  FADE_DURATION: 0.8,

  /** Duration of the screen-level exit transition. */
  EXIT_DURATION: 0.2,

  /** Starting vertical offset for "slide up" animations. */
  SLIDE_Y_OFFSET: 20,
} as const;
