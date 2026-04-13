/**
 * Browser Session Manager for Lambda Container Images
 * ====================================================
 * This module manages a shared Chromium browser session for web scraping.
 *
 * Architecture:
 * - Uses playwright-extra with stealth plugin for anti-bot bypass
 * - In Lambda containers: uses pre-installed Chromium at CHROMIUM_PATH
 * - In local dev: uses Playwright's bundled browser
 * - Implements page pooling for concurrent requests
 * - Shares cookies/session after first Cloudflare bypass
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { chromium as playwrightExtra } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

// Apply stealth plugin to playwright-extra
if (process.env.DISABLE_STEALTH !== 'true') {
  playwrightExtra.use(stealthPlugin());
} else {
  console.log('[Browser] Stealth plugin disabled');
}

// Timeout and delay constants
const WARM_SESSION_TIMEOUT_MS = 5000;
const COLD_SESSION_TIMEOUT_MS = 20000;
const CHALLENGE_WAIT_BASE_MS = 5000;
const CHALLENGE_SELECTOR_TIMEOUT_MS = 10000;
const MAX_CHALLENGE_ATTEMPTS = 3;

// Selectors that indicate the page has fully loaded (Cloudflare challenge passed)
const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

/**
 * Resolves the Chromium executable path in container environments.
 * In Lambda containers, Chromium is pre-installed at /opt/browsers/chromium-xxx/chrome-linux/chrome
 * Locally, returns null to use Playwright's bundled browser.
 *
 * @returns {(string|null)} Path to Chromium executable or null for bundled browser
 */
function getChromiumPath() {
  const browsersDir = process.env.CHROMIUM_PATH || '/opt/browsers';

  if (!existsSync(browsersDir)) {
    return null;
  }

  try {
    const dirs = readdirSync(browsersDir).filter((d) => d.startsWith('chromium-'));
    if (dirs.length === 0) {
      return null;
    }

    const chromiumDir = join(browsersDir, dirs[0]);

    // Try different path structures used by Playwright on different architectures
    const pathsToTry = [
      join(chromiumDir, 'chrome-linux', 'chrome'), // arm64
      join(chromiumDir, 'chrome-linux64', 'chrome'), // amd64/x86_64
      join(chromiumDir, 'chrome'), // fallback
    ];

    for (const chromePath of pathsToTry) {
      if (existsSync(chromePath)) {
        console.log(`[Browser] Found Chromium at: ${chromePath}`);
        return chromePath;
      }
    }
  } catch (err) {
    console.warn('[Browser] Error resolving Chromium path:', err.message);
  }

  return null;
}

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

  /**
   * Gets or creates a browser instance.
   * Implements health check to detect and recover from crashed browsers.
   */
  async getBrowser() {
    // Health check: verify existing browser is still alive
    if (this.browser) {
      try {
        // Quick health check - try to get browser contexts
        const contexts = this.browser.contexts();
        if (contexts) {
          return this.browser;
        }
      } catch (err) {
        console.warn(
          '[Browser] Existing browser crashed or disconnected, recreating...',
          err.message
        );
        this.browser = null;
        this.context = null;
        this.isWarm = false;
      }
    }

    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const execPath = getChromiumPath();

    console.log(
      `[Browser] Launching browser in ${isLambda ? 'Lambda' : 'Local'} mode...` +
        (execPath ? ` (Chromium: ${execPath})` : ' (bundled browser)')
    );

    // Browser launch arguments optimized for Lambda containers
    // Based on best practices for running Chromium in Docker/Lambda
    const args = [
      // Required for Lambda/Docker environments (no sandbox available)
      '--no-sandbox',
      '--disable-setuid-sandbox',

      // Use /tmp for shared memory (Lambda has limited /dev/shm)
      '--disable-dev-shm-usage',

      // Disable GPU (not available in Lambda)
      '--disable-gpu',
      '--disable-software-rasterizer',

      // Anti-detection flags
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--exclude-switches=enable-automation',

      // Performance optimizations for Lambda
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-renderer-backgrounding',
      '--disable-background-networking',
      '--single-process', // Required for Lambda stability (avoids IPC/PID limits)

      // Memory optimization
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',

      // Media handling (for stealth)
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=user-gesture-required',

      // Window size
      '--window-size=1920,1080',
    ];

    if (isLambda && execPath) {
      // Lambda container: use pre-installed Chromium
      console.log('[Browser] Using pre-installed Chromium from base image.');
      this.browser = await playwrightExtra.launch({
        args,
        executablePath: execPath,
        headless: true,
        dumpio: true, // Log Chromium stdout/stderr
      });
    } else {
      // Local development: use Playwright's bundled browser
      try {
        console.log('[Browser] Using bundled local chromium with stealth plugin.');
        this.browser = await playwrightExtra.launch({
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080',
            '--no-sandbox',
          ],
        });
      } catch (e) {
        console.error('Failed to launch local playwright.', e);
        throw new Error('Playwright not installed or failed to launch');
      }
    }

    // Create browser context with realistic settings
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

  /**
   * Gets a page from the pool, waiting if necessary for an available slot.
   * Pages share cookies via the browser context for Cloudflare session reuse.
   */
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

  /**
   * Releases a page back to the pool.
   */
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

  /**
   * Closes the browser session.
   */
  async close() {
    if (this.browser) {
      console.log('[Browser] Closing shared browser...');
      try {
        await this.browser.close();
      } catch (err) {
        console.warn('[Browser] Error closing browser:', err.message);
      }
      this.browser = null;
      this.context = null;
      this.activeFetches = 0;
      this.isWarm = false;
    }
  }
}

// Global session instance (singleton per Lambda container)
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
