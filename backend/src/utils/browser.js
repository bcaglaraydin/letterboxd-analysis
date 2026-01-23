import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';

// Selectors that indicate the page has fully loaded (Cloudflare challenge passed)
const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

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

    // Simulate a click (randomly)
    if (Math.random() > 0.5) {
      await page.mouse.down();
      await page.waitForTimeout(Math.floor(Math.random() * 100) + 50);
      await page.mouse.up();
    }

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

    // Warm session: Just a small delay to be safe
    if (session.isWarm) {
      await page.waitForTimeout(2000); // 2s delay
    }

    // Logic to handle potential challenge even if warm
    let passed = false;
    try {
      // Short timeout check for warm session, longer for cold
      const timeout = session.isWarm ? 5000 : 20000;
      await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout });
      passed = true;
    } catch {
      if (session.isWarm) {
        console.warn('[Browser] Warm session challenge verification failed. Retrying as cold...');
        session.isWarm = false;
      }
    }

    if (!passed) {
      // Loop to try solving challenge (max 3 attempts)
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[Browser] Waiting for Cloudflare challenge (Attempt ${attempt}/3)...`);
        await page.waitForTimeout(5000 * attempt); // Increasing wait
        await simulateHumanInteraction(page);

        try {
          await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout: 10000 });
          console.log('[Browser] Cloudflare challenge passed.');
          passed = true;
          session.isWarm = true;
          break;
        } catch {
          console.warn(`[Browser] Attempt ${attempt} failed. Retrying...`);
        }
      }

      if (!passed) {
        console.warn(
          '[Browser] Failed to pass challenge after 3 attempts. Returning content anyway.'
        );
        // NOTE: isWarm remains false
      }
    } else if (!session.isWarm) {
      console.log('[Browser] Cloudflare challenge passed. Session marked as warm.');
      session.isWarm = true;
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
