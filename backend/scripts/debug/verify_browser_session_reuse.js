/**
 * @file verify_browser_session_reuse.js
 * @description Verifies that `browser.js` correctly reuses the browser session
 * (Warmer) across multiple requests, ensuring cookies/fingerprint are preserved
 * to bypass Cloudflare challenges efficiently.
 *
 * Usage: node backend/scripts/debug/verify_browser_session_reuse.js
 */

import { fetchHtmlWithBrowser, closeBrowserSession } from '../../src/utils/browser.js';
import fs from 'fs';

// Mock process.env
process.env.AWS_LAMBDA_FUNCTION_NAME = ''; // Local mode

async function runDebug() {
  const url1 = 'https://letterboxd.com/bcaglaraydin/films/page/1/';
  const url2 = 'https://letterboxd.com/bcaglaraydin/films/page/2/';

  try {
    console.log(`Fetching ${url1} (Cold)...`);
    const html1 = await fetchHtmlWithBrowser(url1);
    console.log(`Page 1 Length: ${html1.length}`);
    if (html1.includes('Just a moment') || html1.includes('Challenge')) {
      console.warn('WARNING: Page 1 is Cloudflare challenge.');
    } else {
      console.log('Page 1 seems valid.');
    }

    console.log(`\nFetching ${url2} (Warm)...`);
    const html2 = await fetchHtmlWithBrowser(url2);
    console.log(`Page 2 Length: ${html2.length}`);
    fs.writeFileSync('debug_output_p2.html', html2);

    if (html2.includes('Just a moment') || html2.includes('Challenge')) {
      console.warn('WARNING: Page 2 is Cloudflare challenge.');
    } else {
      console.log('Page 2 seems valid. Saved to debug_output_p2.html');
    }
  } catch (err) {
    console.error('Debug run failed:', err);
  } finally {
    await closeBrowserSession();
  }
}

runDebug();
