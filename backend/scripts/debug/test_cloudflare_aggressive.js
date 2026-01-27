/* eslint-disable */
/**
 * @file test_cloudflare_aggressive.js
 * @description More aggressive Cloudflare limit testing including:
 * - Testing specific problematic users
 * - Higher concurrency levels
 * - Sustained load over time
 * - Cold vs warm session behavior
 *
 * Usage: node backend/scripts/debug/test_cloudflare_aggressive.js
 */

import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

// Selectors that indicate the page has fully loaded (Cloudflare challenge passed)
const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

async function createBrowser() {
  return await chromium.launch({
    headless: true,
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
}

async function createContext(browser) {
  return await browser.newContext({
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
}

async function fetchUrl(page, url, timeout = 30000) {
  const start = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    try {
      await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout: 10000 });
      const elapsed = Date.now() - start;
      return { success: true, elapsed, url };
    } catch (e) {
      const content = await page.content();
      const isChallenge =
        content.includes('Just a moment') || content.includes('Checking your browser');
      const elapsed = Date.now() - start;
      return {
        success: false,
        elapsed,
        url,
        reason: isChallenge ? 'cloudflare_challenge' : 'selector_timeout',
      };
    }
  } catch (e) {
    const elapsed = Date.now() - start;
    return { success: false, elapsed, url, reason: e.message };
  }
}

/**
 * Test specific user to diagnose issue
 */
async function testSpecificUser(browser, context, username, maxPages = 5) {
  console.log(`\n--- Testing User: ${username} ---`);

  const results = [];
  const page = await context.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());

  // First, test the films list endpoint
  const filmsUrl = `https://letterboxd.com/${username}/films/`;
  console.log(`[1] Testing films list: ${filmsUrl}`);

  const listResult = await fetchUrl(page, filmsUrl);
  results.push(listResult);
  console.log(
    `  ${listResult.success ? '✓' : '✗'} Films list (${listResult.elapsed}ms) ${listResult.reason || ''}`
  );

  if (!listResult.success) {
    await page.close();
    return { user: username, results, success: false, reason: listResult.reason };
  }

  // Get page count
  let totalPages = 1;
  try {
    const pagination = await page.$('.paginate-pages ul li.paginate-page:last-child');
    if (pagination) {
      const pageText = await pagination.textContent();
      totalPages = parseInt(pageText?.trim() || '1', 10);
    }
  } catch (e) {
    console.log('  Could not determine total pages');
  }
  console.log(`  Total pages: ${totalPages}`);

  // Test a few more pages
  const pagesToTest = Math.min(totalPages, maxPages);
  for (let i = 2; i <= pagesToTest; i++) {
    const pageUrl = `https://letterboxd.com/${username}/films/page/${i}/`;
    console.log(`[${i}] Testing page ${i}/${pagesToTest}: ${pageUrl}`);

    await new Promise((r) => setTimeout(r, 500)); // 500ms between requests

    const pageResult = await fetchUrl(page, pageUrl);
    results.push(pageResult);
    console.log(
      `  ${pageResult.success ? '✓' : '✗'} Page ${i} (${pageResult.elapsed}ms) ${pageResult.reason || ''}`
    );

    if (!pageResult.success) {
      console.log(`  ⚠️ FAILED at page ${i} - stopping test`);
      break;
    }
  }

  await page.close();

  const successCount = results.filter((r) => r.success).length;
  console.log(`\nUser ${username}: ${successCount}/${results.length} pages successful`);

  return {
    user: username,
    results,
    success: results.every((r) => r.success),
    successCount,
    totalTests: results.length,
  };
}

/**
 * Test high concurrency - simulating multiple Lambda workers
 */
async function testHighConcurrency(browser, concurrency, numRequests) {
  console.log(`\n--- High Concurrency Test: ${concurrency} parallel, ${numRequests} total ---`);

  const urls = [];
  const testFilms = [
    'dune-part-two',
    'oppenheimer',
    'parasite-2019',
    'the-godfather',
    'pulp-fiction',
    'inception',
    'fight-club',
    'the-dark-knight',
    'interstellar',
    'the-matrix',
    'goodfellas',
    'whiplash-2014',
    'everything-everywhere-all-at-once',
    'the-shawshank-redemption',
    'spirited-away',
    'seven-samurai',
    'schindlers-list',
    'the-prestige',
  ];

  for (let i = 0; i < numRequests; i++) {
    urls.push(`https://letterboxd.com/film/${testFilms[i % testFilms.length]}/`);
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Create multiple contexts (simulating different Lambda invocations)
  const contexts = await Promise.all(
    Array(concurrency)
      .fill(null)
      .map(() => createContext(browser))
  );

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const pages = await Promise.all(
      batch.map(async (_, idx) => {
        const page = await contexts[idx % contexts.length].newPage();
        await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());
        return page;
      })
    );

    const batchResults = await Promise.all(batch.map((url, idx) => fetchUrl(pages[idx], url)));

    await Promise.all(pages.map((p) => p.close()));

    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        successCount++;
        process.stdout.write('✓');
      } else {
        failCount++;
        process.stdout.write('✗');
      }
    }

    // Small delay between batches
    if (i + concurrency < urls.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Close all contexts
  await Promise.all(contexts.map((c) => c.close()));

  const successRate = ((successCount / numRequests) * 100).toFixed(1);
  console.log(`\n  Result: ${successRate}% success (${successCount}/${numRequests})`);

  // Show failures
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.slice(0, 5).forEach((f) => {
      console.log(`    - ${f.url}: ${f.reason}`);
    });
  }

  return { concurrency, successRate, successCount, failCount, results };
}

/**
 * Test sustained load over time
 */
async function testSustainedLoad(
  browser,
  context,
  durationSeconds,
  requestsPerBatch,
  batchDelayMs
) {
  console.log(
    `\n--- Sustained Load Test: ${durationSeconds}s, ${requestsPerBatch}/batch, ${batchDelayMs}ms delay ---`
  );

  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  const results = [];
  let batchNum = 0;

  const testFilms = [
    'dune-part-two',
    'oppenheimer',
    'parasite-2019',
    'the-godfather',
    'pulp-fiction',
    'inception',
    'fight-club',
    'the-dark-knight',
  ];

  while (Date.now() < endTime) {
    batchNum++;
    const batchUrls = testFilms
      .slice(0, requestsPerBatch)
      .map((f) => `https://letterboxd.com/film/${f}/`);

    const pages = await Promise.all(
      batchUrls.map(async () => {
        const page = await context.newPage();
        await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());
        return page;
      })
    );

    const batchResults = await Promise.all(batchUrls.map((url, idx) => fetchUrl(pages[idx], url)));

    await Promise.all(pages.map((p) => p.close()));

    const batchSuccess = batchResults.filter((r) => r.success).length;
    results.push(...batchResults);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(
      `\r  Batch ${batchNum}: ${batchSuccess}/${requestsPerBatch} ok (${elapsed}s elapsed)`
    );

    if (batchSuccess < requestsPerBatch) {
      console.log('\n  ⚠️ Failures detected - Cloudflare may be rate limiting');
    }

    await new Promise((r) => setTimeout(r, batchDelayMs));
  }

  const successCount = results.filter((r) => r.success).length;
  const successRate = ((successCount / results.length) * 100).toFixed(1);
  console.log(
    `\n  Final: ${successRate}% success (${successCount}/${results.length} over ${batchNum} batches)`
  );

  return { durationSeconds, results, successRate, batchNum };
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       AGGRESSIVE CLOUDFLARE LIMIT INVESTIGATION                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  let browser;
  let context;

  try {
    browser = await createBrowser();
    context = await createContext(browser);

    // Test 1: The problematic user
    console.log('\n[TEST 1] Specific User Investigation');
    const eceeResult = await testSpecificUser(browser, context, 'Eceeozeer', 10);

    // Wait before next test
    await new Promise((r) => setTimeout(r, 5000));

    // Test 2: Other users for comparison
    console.log('\n[TEST 2] Control User Test');
    const controlResult = await testSpecificUser(browser, context, 'bcaglaraydin', 5);

    // Wait before next test
    await new Promise((r) => setTimeout(r, 5000));

    // Test 3: High concurrency (if previous tests passed)
    console.log('\n[TEST 3] High Concurrency (5 parallel)');
    const highConcResult = await testHighConcurrency(browser, 5, 15);

    // Summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(
      `\n1. User Eceeozeer: ${eceeResult.success ? 'PASSED' : 'FAILED'} (${eceeResult.successCount}/${eceeResult.totalTests})`
    );
    console.log(
      `2. User bcaglaraydin: ${controlResult.success ? 'PASSED' : 'FAILED'} (${controlResult.successCount}/${controlResult.totalTests})`
    );
    console.log(`3. High Concurrency (5): ${highConcResult.successRate}% success`);

    if (
      !eceeResult.success ||
      !controlResult.success ||
      parseFloat(highConcResult.successRate) < 90
    ) {
      console.log('\n⚠️ CLOUDFLARE IS RATE LIMITING');
      console.log('Recommendations:');
      console.log('  - Reduce BROWSER_CONCURRENCY to 1-2');
      console.log('  - Add longer delays between requests (1-2 seconds)');
      console.log('  - Session warmup may not be reliable');
    }
  } catch (err) {
    console.error('\n❌ Test Failed:', err);
  } finally {
    if (browser) await browser.close();
  }
}

runTests();
