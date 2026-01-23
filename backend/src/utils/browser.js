import chromium from '@sparticuz/chromium';
import playwright from 'playwright-core';

// Selectors that indicate the page has fully loaded (Cloudflare challenge passed)
const LETTERBOXD_READY_SELECTORS = '.site-footer, .poster-list, #content';

/**
 * Fetches HTML content using a headless browser (Playwright).
 * Handles Cloudflare challenges by waiting for content.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} - The HTML content.
 */
export async function fetchHtmlWithBrowser(url) {
  let browser = null;
  try {
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    console.log(`[Browser] Launching in ${isLambda ? 'Lambda' : 'Local'} mode...`);

    if (isLambda) {
      // AWS Lambda Environment
      browser = await playwright.chromium.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // Local Environment
      try {
        // Dynamic import to avoid bundling 'playwright' in prod if not needed
        const { chromium: localChromium } = await import('playwright');
        browser = await localChromium.launch({
          headless: true, // Visible for debugging if needed, set to false
        });
      } catch {
        console.error('Failed to launch local playwright. Ensure "playwright" is installed.');
        throw new Error('Playwright not installed or failed to launch');
      }
    }

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // Block images/fonts/CSS to save bandwidth
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,css}', (route) => route.abort());

    console.log(`[Browser] Navigating to ${url}...`);
    // Increase timeout for Cloudflare
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the Cloudflare challenge to pass
    // We look for a common element in Letterboxd or absence of "Just a moment"
    // Letterboxd body usually has class 'no-mobile' or similar, or we check for title
    // "Just a moment..." is the Cloudflare title.

    try {
      // Wait for title to NOT be "Just a moment..."
      // This is a bit tricky, simpler to wait for a known element.
      // E.g. .site-footer or #content
      await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout: 15000 });
      console.log('[Browser] Cloudflare challenge likely passed.');
    } catch {
      console.warn(
        '[Browser] Timeout waiting for specific selectors. Returning page content anyway.'
      );
    }

    const content = await page.content();
    return content;
  } catch (err) {
    console.error('[Browser] Error fetching page:', err);
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
