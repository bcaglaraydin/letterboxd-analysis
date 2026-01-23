import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';

// Selectors that indicate the page has fully loaded (Cloudflare challenge passed)
const LETTERBOXD_READY_SELECTORS = '.site-footer, .poster-list, #content';

/**
 * Shared browser session for reuse across multiple requests.
 * This avoids launching a new browser for every 403 fallback.
 */
class BrowserSession {
  constructor() {
    this.browser = null;
    this.context = null;
    this.activePages = 0;
  }

  async getBrowser() {
    if (this.browser) {
      return this.browser;
    }

    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    console.log(`[Browser] Launching shared browser in ${isLambda ? 'Lambda' : 'Local'} mode...`);

    if (isLambda) {
      this.browser = await playwright.chromium.launch({
        args: [
          ...chromium.args,
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--exclude-switches=enable-automation',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      try {
        const { chromium: localChromium } = await import('playwright');
        this.browser = await localChromium.launch({
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--exclude-switches=enable-automation',
          ],
        });
      } catch {
        console.error('Failed to launch local playwright. Ensure "playwright" is installed.');
        throw new Error('Playwright not installed or failed to launch');
      }
    }

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    return this.browser;
  }

  async getPage() {
    await this.getBrowser();

    // Reuse the existing page if available (Persistent Page Strategy)
    // This works best with pLimit(1) to simulate a single user browsing
    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
      this.activePages++;
      this.isWarm = false; // Reset warm status for new page

      // Evasion: Mask navigator.webdriver
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      // Block images/fonts to save bandwidth (keep CSS for Cloudflare)
      await this.page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());
    }

    return this.page;
  }

  async releasePage(_page) {
    // In persistent mode, we DO NOT close the page.
    // We keep it open for the next request.
    // The browser.close() method will handle cleanup.
  }

  async close() {
    if (this.browser) {
      console.log('[Browser] Closing shared browser...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.activePages = 0;
      this.isWarm = false;
    }
  }
}

// Global session instance
let globalSession = null;

/**
 * Gets or creates a shared browser session.
 * @returns {BrowserSession}
 */
export function getBrowserSession() {
  if (!globalSession) {
    globalSession = new BrowserSession();
  }
  return globalSession;
}

/**
 * Closes the global browser session.
 * Call this at the end of Lambda execution to clean up.
 */
export async function closeBrowserSession() {
  if (globalSession) {
    await globalSession.close();
    globalSession = null;
  }
}

/**
 * Simulates human-like mouse movements to trick anti-bot scripts.
 */
async function simulateHumanInteraction(page) {
  try {
    // Random mouse movements
    // Move to random center-ish point
    const x = Math.floor(Math.random() * 400) + 400; // 400-800
    const y = Math.floor(Math.random() * 300) + 200; // 200-500

    await page.mouse.move(x, y, { steps: 5 });

    // Small random scroll
    await page.mouse.wheel(0, Math.floor(Math.random() * 100) + 50);

    // Random short delay
    await page.waitForTimeout(Math.floor(Math.random() * 1000) + 500);
  } catch (err) {
    console.warn('[Browser] Interaction simulation failed (ignoring):', err.message);
  }
}

/**
 * Fetches HTML content using a headless browser (Playwright).
 * Reuses a shared browser instance to avoid launching multiple browsers.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} - The HTML content.
 */
export async function fetchHtmlWithBrowser(url) {
  const session = getBrowserSession();
  let page = null;

  try {
    page = await session.getPage();

    console.log(`[Browser] Navigating to ${url}... (Warm: ${!!session.isWarm})`);
    // Use domcontentloaded (networkidle times out with Cloudflare)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (!session.isWarm) {
      // First time or cold session: Wait for challenge + simulate interaction
      console.log('[Browser] Cold session. Waiting for Cloudflare challenge...');
      await page.waitForTimeout(5000);
      await simulateHumanInteraction(page);
    } else {
      // Warm session: Just a small delay to be safe
      await page.waitForTimeout(1000);
    }

    try {
      // Check if we passed the challenge
      // If warm, we expect this to return almost immediately
      await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout: 10000 });
      if (!session.isWarm) {
        console.log('[Browser] Cloudflare challenge passed. Session marked as warm.');
        session.isWarm = true;
      }
    } catch {
      console.warn(
        '[Browser] Timeout waiting for specific selectors. Returning page content anyway.'
      );
      // NOTE: We do NOT set isWarm = true here because we aren't sure.
    }

    const content = await page.content();
    return content;
  } catch (err) {
    console.error('[Browser] Error fetching page:', err);
    throw err;
  } finally {
    if (page) {
      await session.releasePage(page);
    }
  }
}
