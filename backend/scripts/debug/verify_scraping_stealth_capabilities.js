/* eslint-disable */
/**
 * @file verify_scraping_stealth_capabilities.js
 * @description Runs a standalone Playwright script with specific flags to mimic
 * the Lambda environment (Strict Headless, specific args).
 * Verifies if Cloudflare/Antibot evasion (Stealth Plugin) is working.
 *
 * Usage: node backend/scripts/debug/verify_scraping_stealth_capabilities.js
 */

// verify-lambda-strict.js
// Standalone script to test scraping with Lambda-like constraints (Chromium, Headless)
// Uses playwright-extra + puppeteer-extra-plugin-stealth

import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

// Selectors
const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

async function run() {
  const username = 'bcaglaraydin';
  const urls = [
    `https://letterboxd.com/${username}/`,
    `https://letterboxd.com/${username}/films/page/1/`,
    `https://letterboxd.com/${username}/films/page/2/`,
  ];

  console.log('--- Starting Lambda-Simulation (Playwright Extra + Stealth) ---');

  let browser;
  try {
    // MIMIC LAMBDA LAUNCH ARGS EXACTLY (but using local chromium binary from playwright)
    // Note: We use the 'chromium' export from playwright-extra which wraps the underlying playwright chromium
    browser = await chromium.launch({
      headless: true, // Strict headless
      // NO channel: 'chrome' (Simulate Lambda)
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--exclude-switches=enable-automation',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--window-size=1920,1080',
      ],
    });

    const context = await browser.newContext({
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

    const page = await context.newPage();

    // Fingerprint check
    const fingerprint = await page.evaluate(() => {
      let gl, glVendor, glRenderer;
      try {
        gl = document.createElement('canvas').getContext('webgl');
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        glVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      } catch (e) {
        glVendor = 'Error';
        glRenderer = 'Error';
      }
      return {
        webdriver: navigator.webdriver,
        plugins_length: navigator.plugins.length,
        chrome: !!window.chrome,
        webgl_vendor: glVendor,
        webgl_renderer: glRenderer,
      };
    });
    console.log('--- Browser Fingerprint (Stealth Plugin) ---');
    console.log(fingerprint);
    console.log('--------------------------------------------');

    for (const url of urls) {
      console.log(`Fetching ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Check for challenge
      try {
        await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout: 5000 });
        console.log(`Success: ${url} (Passed Check)`);
      } catch (e) {
        console.error(`FAILED: ${url} - Likely Cloudflare Block`);
        const content = await page.content();
        if (content.includes('Just a moment')) console.error('Confirmed: "Just a moment..."');
      }

      await page.waitForTimeout(2000);
    }
  } catch (err) {
    console.error('Script Failed:', err);
  } finally {
    if (browser) await browser.close();
  }
}

run();
