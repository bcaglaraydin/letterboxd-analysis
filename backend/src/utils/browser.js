/**
 * Browser Utilities
 * =================
 * Single source of truth for browser operations.
 * Re-exports the shared browser session and scraping functions from
 * letterboxd-scraper-engine to guarantee a single singleton browser instance
 * across all Lambda handlers and services.
 */

export {
  fetchHtmlWithBrowser,
  getBrowserSession,
  closeBrowserSession,
  handlePotentialChallenge,
  solveTurnstileIfPresent,
  LETTERBOXD_READY_SELECTORS,
} from 'letterboxd-scraper-engine';
