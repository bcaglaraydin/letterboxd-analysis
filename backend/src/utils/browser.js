/**
 * Browser Session Manager for Lambda Container Images and Local Dev
 * =================================================================
 * Manages shared Chromium browser sessions with anti-bot stealth and Cloudflare Turnstile handling.
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

// Timeout constants
const CHALLENGE_WAIT_BASE_MS = 3000;
const CHALLENGE_SELECTOR_TIMEOUT_MS = 10000;
const MAX_CHALLENGE_ATTEMPTS = 3;

// Ready selectors indicating full page load
export const LETTERBOXD_READY_SELECTORS =
  '.poster-grid, .site-body, .navitem, .griditem, .films-list';

/**
 * Resolves the Chromium executable path in container environments.
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
      try {
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

    const lambdaArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-zygote',
      '--single-process',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--exclude-switches=enable-automation',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=user-gesture-required',
      '--window-size=1920,1080',
    ];

    if (isLambda && execPath) {
      console.log('[Browser] Using pre-installed Chromium from base image.');
      this.browser = await playwrightExtra.launch({
        args: lambdaArgs,
        executablePath: execPath,
        headless: true,
        chromiumSandbox: false,
        dumpio: true,
      });
    } else {
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
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });

    return this.browser;
  }

  async getPage() {
    await this.getBrowser();

    while (this.activeFetches >= this.maxConcurrentPages) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.activeFetches++;

    let page;
    try {
      page = await this.context.newPage();
    } catch (err) {
      console.warn(
        '[Browser] Failed to create new page on existing context, recycling browser...',
        err.message
      );
      await this.close();
      await this.getBrowser();
      page = await this.context.newPage();
    }

    // Selectively block heavy resized posters, but NEVER block Cloudflare assets or styles
    await page.route('**/*', (route) => {
      const reqUrl = route.request().url();
      if (reqUrl.includes('challenges.cloudflare.com') || reqUrl.includes('cloudflare.com')) {
        return route.continue();
      }
      if (reqUrl.includes('a.ltrbxd.com/resized/')) {
        return route.abort();
      }
      return route.continue();
    });

    return page;
  }

  async releasePage(page) {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch {
      // Ignore close errors
    }
    this.activeFetches = Math.max(0, this.activeFetches - 1);
  }

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

// Global session singleton
let globalSession = null;

export function getBrowserSession() {
  if (!globalSession) {
    globalSession = new BrowserSession();
  }
  return globalSession;
}

export async function closeBrowserSession() {
  if (globalSession) {
    await globalSession.close();
    globalSession = null;
  }
}

/**
 * Attempts to detect and solve Cloudflare Turnstile if present on the page.
 */
export async function solveTurnstileIfPresent(page) {
  try {
    const iframeSelector = 'iframe[src*="challenges.cloudflare.com"]';
    const iframeHandle = await page.$(iframeSelector);

    if (!iframeHandle) {
      return false;
    }

    console.log('[Browser] Cloudflare Turnstile iframe detected. Attempting solve...');
    const frame = await iframeHandle.contentFrame();
    if (!frame) return false;

    const clicked = await frame.evaluate(() => {
      /* global document */
      try {
        function findElementDeep(root, selector) {
          let found = root.querySelector(selector);
          if (found) return found;
          for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) {
              found = findElementDeep(el.shadowRoot, selector);
              if (found) return found;
            }
          }
          return null;
        }

        const target =
          findElementDeep(document, 'input[type="checkbox"]') ||
          findElementDeep(document, '.cb-lb') ||
          findElementDeep(document, '#challenge-stage');

        if (target) {
          target.click();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    });

    if (clicked) {
      console.log('[Browser] Successfully triggered click on Turnstile widget.');
      await page.waitForTimeout(2500);
      return true;
    }
  } catch (err) {
    console.warn('[Browser] Turnstile interaction note:', err.message);
  }
  return false;
}

/**
 * Handles potential Cloudflare challenge on an already navigated page.
 */
export async function handlePotentialChallenge(page, readySelector = LETTERBOXD_READY_SELECTORS) {
  try {
    await page.waitForSelector(readySelector, { timeout: 3000 });
    return true;
  } catch {
    const content = await page.content();
    const isChallenge =
      content.includes('Just a moment') ||
      content.includes('Checking your browser') ||
      content.includes('challenges.cloudflare.com');

    if (!isChallenge) {
      return false;
    }

    console.log('[Browser] Challenge detected. Waiting and attempting resolution...');
    for (let attempt = 1; attempt <= MAX_CHALLENGE_ATTEMPTS; attempt++) {
      await solveTurnstileIfPresent(page);
      await page.waitForTimeout(CHALLENGE_WAIT_BASE_MS * attempt);

      try {
        await page.waitForSelector(readySelector, { timeout: CHALLENGE_SELECTOR_TIMEOUT_MS });
        console.log('[Browser] Challenge successfully passed.');
        return true;
      } catch {
        console.warn(
          `[Browser] Challenge attempt ${attempt}/${MAX_CHALLENGE_ATTEMPTS} still pending...`
        );
      }
    }
    return false;
  }
}

/**
 * Fetches HTML content using a headless browser (Playwright with Stealth).
 */
export async function fetchHtmlWithBrowser(url, options = {}) {
  const session = getBrowserSession();
  let page = null;

  try {
    page = await session.getPage();
    const readySelector = options.waitForSelector || LETTERBOXD_READY_SELECTORS;

    console.log(`[Browser] Navigating to ${url}... (Warm: ${!!session.isWarm})`);
    await page.goto(url, {
      waitUntil: options.waitUntil || 'domcontentloaded',
      timeout: options.timeout || 30000,
    });

    const passed = await handlePotentialChallenge(page, readySelector);
    if (!passed) {
      const pageTitle = await page.title();
      if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
        throw new Error(`Page not found (404): ${url}`);
      }
      throw new Error(
        `Cloudflare challenge failed after ${MAX_CHALLENGE_ATTEMPTS} attempts: ${url}`
      );
    }

    session.isWarm = true;
    return await page.content();
  } catch (err) {
    console.error('[Browser] Error fetching page:', err);
    throw err;
  } finally {
    if (page) {
      await session.releasePage(page);
    }
  }
}
