import { sendGTMEvent } from '@next/third-parties/google';

/**
 * Standardized wrapper for Google Tag Manager events to ensure consistency
 * across the application and avoid magic strings.
 */
export const trackEvent = (
  eventName: string,
  data?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (typeof window !== 'undefined') {
    sendGTMEvent({ event: eventName, ...data });
  }
};

/**
 * Fired when a user successfully starts the analysis (submits their username).
 * This is used to track the conversion from 'page_view' to active participation.
 */
export const trackAnalysisStarted = (username: string) => {
  trackEvent('analysis_started', { username });
};

/**
 * Fired when a user enters a new phase/game in the experience.
 * Helps visualize drop-offs within the experience funnel.
 */
export const trackPhaseStart = (phaseName: string, username: string | null) => {
  trackEvent('phase_start', { phase_name: phaseName, username });
};

/**
 * Fired when a user completes a phase/game and receives a score.
 */
export const trackPhaseComplete = (phaseName: string, score: number, username: string | null) => {
  trackEvent('phase_complete', { phase_name: phaseName, score, username });
};

/**
 * Fired when the user completes the entire experience and reaches the recap screen.
 */
export const trackJourneyComplete = (username: string | null) => {
  trackEvent('journey_complete', { username });
};
