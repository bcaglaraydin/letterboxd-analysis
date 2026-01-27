import chromium from '@sparticuz/chromium';
import { chromium as playwrightExtra } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply stealth plugin to playwright-extra
playwrightExtra.use(stealthPlugin());

// Timeout and delay constants
const WARM_SESSION_DELAY_MS = 2000;
const WARM_SESSION_TIMEOUT_MS = 5000;
const COLD_SESSION_TIMEOUT_MS = 20000;
const CHALLENGE_WAIT_BASE_MS = 5000;
const CHALLENGE_SELECTOR_TIMEOUT_MS = 10000;
const MAX_CHALLENGE_ATTEMPTS = 3;

// Selectors that indicate the page has fully loaded (Cloudflare challenge passed)
const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

/**
 * Shared browser session with page pool for parallel requests.
 * All pages share cookies/session after first Cloudflare bypass.
 */
class BrowserSession {
  constructor() {
    this.browser = null;
    this.context = null;
    this.maxConcurrentPages = parseInt(process.env.BROWSER_MAX_PAGES || '3', 10);
    this.activeFetches = 0;
    this.isWarm = false;
  }

  async getBrowser() {
    if (this.browser) {
      return this.browser;
    }

    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    console.log(
      `[Browser] Launching shared browser in ${isLambda ? 'Lambda' : 'Local'} mode with Stealth...`
    );

    const args = [
      ...chromium.args,
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--exclude-switches=enable-automation',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-size=1920,1080',
    ];

    if (isLambda) {
      // Use playwright-extra with Lambda executable
      console.log('[Browser] Using @sparticuz/chromium executable for Lambda.');
      this.browser = await playwrightExtra.launch({
        args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      try {
        // Local: Use playwright-extra (headless: true, implicit bundled chromium + stealth)
        console.log('[Browser] Using bundled local chromium with stealth plugin.');
        this.browser = await playwrightExtra.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled', '--window-size=1920,1080'],
        });
      } catch (e) {
        console.error('Failed to launch local playwright.', e);
        throw new Error('Playwright not installed or failed to launch');
      }
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Europe/London',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
    });

    return this.browser;
  }

  async getPage() {
    await this.getBrowser();

    // Wait for available slot in the pool
    while (this.activeFetches >= this.maxConcurrentPages) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.activeFetches++;

    // Create new page for this request (shares context cookies)
    const page = await this.context.newPage();

    // Block images/fonts to save bandwidth (keep CSS for Cloudflare)
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());

    return page;
  }

  async releasePage(page) {
    // Close the page to free resources
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch {
      // Ignore close errors
    }
    this.activeFetches--;
  }

  async close() {
    if (this.browser) {
      console.log('[Browser] Closing shared browser...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.activeFetches = 0;
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
 * Performs random mouse movements, clicks, and scrolling for entropy.
 * @param {import('playwright-core').Page} page - Playwright page instance.
 * @returns {Promise<void>}
 */
async function simulateHumanInteraction(page) {
  try {
    const x = Math.floor(Math.random() * 400) + 400;
    const y = Math.floor(Math.random() * 300) + 200;

    await page.mouse.move(x, y, { steps: 5 });

    if (Math.random() > 0.5) {
      await page.mouse.down();
      await page.waitForTimeout(Math.floor(Math.random() * 100) + 50);
      await page.mouse.up();
    }

    await page.mouse.wheel(0, Math.floor(Math.random() * 100) + 50);
    await page.waitForTimeout(Math.floor(Math.random() * 1000) + 500);
  } catch (err) {
    console.warn('[Browser] Interaction simulation failed (ignoring):', err.message);
  }
}

/**
 * Fetches HTML content using a headless browser (Playwright with Stealth).
 * Reuses a shared browser instance.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} - The HTML content.
 */
export async function fetchHtmlWithBrowser(url) {
  const session = getBrowserSession();
  let page = null;

  try {
    page = await session.getPage();

    console.log(`[Browser] Navigating to ${url}... (Warm: ${!!session.isWarm})`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (session.isWarm) {
      await page.waitForTimeout(WARM_SESSION_DELAY_MS);
    }

    // Logic to handle potential challenge even if warm
    let passed = false;
    try {
      const timeout = session.isWarm ? WARM_SESSION_TIMEOUT_MS : COLD_SESSION_TIMEOUT_MS;
      await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout });
      passed = true;
    } catch {
      if (session.isWarm) {
        console.warn('[Browser] Warm session challenge verification failed. Retrying as cold...');
        session.isWarm = false;
      }
    }

    if (!passed) {
      // Check for 404 or error pages BEFORE assuming Cloudflare challenge
      const pageContent = await page.content();
      const pageTitle = await page.title();

      // Detect 404/error pages (Letterboxd shows specific patterns for non-existent users/pages)
      const is404 =
        pageContent.includes('Page Not Found') ||
        pageContent.includes('Error 404') ||
        pageContent.includes('Sorry, we could not find') ||
        pageTitle.includes('Not Found') ||
        pageTitle.includes('404');

      if (is404) {
        throw new Error(`Page not found (404): ${url}`);
      }

      // Detect Cloudflare challenge page specifically
      const isCloudflareChallenge =
        pageContent.includes('Just a moment') ||
        pageContent.includes('Checking your browser') ||
        pageContent.includes('cf-browser-verification') ||
        pageContent.includes('Cloudflare');

      if (!isCloudflareChallenge) {
        // Unknown error state - not 404 and not Cloudflare challenge
        console.warn('[Browser] Unknown page state - not 404 and not Cloudflare challenge');
        throw new Error(`Unexpected page state (no expected content found): ${url}`);
      }

      for (let attempt = 1; attempt <= MAX_CHALLENGE_ATTEMPTS; attempt++) {
        console.log(
          `[Browser] Waiting for Cloudflare challenge (Attempt ${attempt}/${MAX_CHALLENGE_ATTEMPTS})...`
        );
        await page.waitForTimeout(CHALLENGE_WAIT_BASE_MS * attempt);
        await simulateHumanInteraction(page);

        try {
          await page.waitForSelector(LETTERBOXD_READY_SELECTORS, {
            timeout: CHALLENGE_SELECTOR_TIMEOUT_MS,
          });
          console.log('[Browser] Cloudflare challenge passed.');
          passed = true;
          session.isWarm = true;
          break;
        } catch {
          console.warn(`[Browser] Attempt ${attempt} failed. Retrying...`);
        }
      }

      if (!passed) {
        throw new Error(`Cloudflare challenge failed after ${MAX_CHALLENGE_ATTEMPTS} attempts.`);
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
