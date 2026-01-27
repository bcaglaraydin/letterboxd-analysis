/* eslint-disable */
/**
 * @file test_cloudflare_limits.js
 * @description Tests Cloudflare rate limits to find optimal concurrency settings.
 *
 * Runs multiple test scenarios:
 * 1. Sequential requests with varying delays
 * 2. Concurrent requests at different levels
 * 3. Measures success/failure rates and timing
 *
 * Usage: node backend/scripts/debug/test_cloudflare_limits.js
 */

import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

// Test configuration
const TEST_USERNAMES = ['bcaglaraydin', 'remiemiyo'];
const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

// Results storage
const results = {
  sequential: [],
  concurrent: [],
  summary: {},
};

/**
 * Creates a browser session similar to production
 */
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

/**
 * Creates a browser context with production-like settings
 */
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

/**
 * Fetches a URL and checks if it passed Cloudflare
 */
async function fetchUrl(page, url, timeout = 30000) {
  const start = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Check for Cloudflare challenge
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
 * Test 1: Sequential requests with varying delays
 */
async function testSequential(browser, context, delayMs, numRequests) {
  console.log(`\n--- Sequential Test: ${numRequests} requests with ${delayMs}ms delay ---`);

  const urls = generateTestUrls(numRequests);
  const page = await context.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());

  const testResults = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const result = await fetchUrl(page, urls[i]);
    testResults.push(result);

    if (result.success) {
      successCount++;
      process.stdout.write('✓');
    } else {
      failCount++;
      process.stdout.write('✗');
    }

    if (i < urls.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  await page.close();

  const summary = {
    type: 'sequential',
    delayMs,
    numRequests,
    successCount,
    failCount,
    successRate: ((successCount / numRequests) * 100).toFixed(1) + '%',
    avgElapsed:
      (testResults.reduce((sum, r) => sum + r.elapsed, 0) / numRequests).toFixed(0) + 'ms',
  };

  console.log(
    `\n  Result: ${summary.successRate} success (${successCount}/${numRequests}), avg ${summary.avgElapsed}`
  );
  results.sequential.push({ summary, details: testResults });

  return summary;
}

/**
 * Test 2: Concurrent requests
 */
async function testConcurrent(browser, context, concurrency, numRequests) {
  console.log(`\n--- Concurrent Test: ${numRequests} requests with concurrency ${concurrency} ---`);

  const urls = generateTestUrls(numRequests);
  const testResults = [];
  let successCount = 0;
  let failCount = 0;

  // Process in batches of 'concurrency'
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    // Create pages for this batch
    const pages = await Promise.all(
      batch.map(async () => {
        const page = await context.newPage();
        await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (route) => route.abort());
        return page;
      })
    );

    // Fetch concurrently
    const batchResults = await Promise.all(batch.map((url, idx) => fetchUrl(pages[idx], url)));

    // Close pages
    await Promise.all(pages.map((p) => p.close()));

    // Record results
    for (const result of batchResults) {
      testResults.push(result);
      if (result.success) {
        successCount++;
        process.stdout.write('✓');
      } else {
        failCount++;
        process.stdout.write('✗');
      }
    }

    // Small delay between batches to avoid overwhelming
    if (i + concurrency < urls.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const summary = {
    type: 'concurrent',
    concurrency,
    numRequests,
    successCount,
    failCount,
    successRate: ((successCount / numRequests) * 100).toFixed(1) + '%',
    avgElapsed:
      (testResults.reduce((sum, r) => sum + r.elapsed, 0) / numRequests).toFixed(0) + 'ms',
  };

  console.log(
    `\n  Result: ${summary.successRate} success (${successCount}/${numRequests}), avg ${summary.avgElapsed}`
  );
  results.concurrent.push({ summary, details: testResults });

  return summary;
}

/**
 * Generates test URLs for film pages
 */
function generateTestUrls(count) {
  // Mix of user pages and popular film pages for diverse testing
  const baseUrls = [
    // User film pages
    'https://letterboxd.com/bcaglaraydin/films/page/1/',
    'https://letterboxd.com/bcaglaraydin/films/page/2/',
    'https://letterboxd.com/remiemiyo/films/page/1/',
    'https://letterboxd.com/remiemiyo/films/page/2/',
    // Popular films (likely cached by Cloudflare)
    'https://letterboxd.com/film/dune-part-two/',
    'https://letterboxd.com/film/oppenheimer/',
    'https://letterboxd.com/film/parasite-2019/',
    'https://letterboxd.com/film/the-godfather/',
    'https://letterboxd.com/film/pulp-fiction/',
    'https://letterboxd.com/film/inception/',
    'https://letterboxd.com/film/fight-club/',
    'https://letterboxd.com/film/the-dark-knight/',
    'https://letterboxd.com/film/interstellar/',
    'https://letterboxd.com/film/the-matrix/',
    'https://letterboxd.com/film/goodfellas/',
    'https://letterboxd.com/film/whiplash-2014/',
  ];

  const urls = [];
  for (let i = 0; i < count; i++) {
    urls.push(baseUrls[i % baseUrls.length]);
  }
  return urls;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           CLOUDFLARE RATE LIMIT TEST                           ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  Testing with usernames: bcaglaraydin, remiemiyo               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  let browser;
  let context;

  try {
    browser = await createBrowser();
    context = await createContext(browser);

    console.log('\n[1/6] Warming up session with single request...');
    const warmupPage = await context.newPage();
    const warmupResult = await fetchUrl(warmupPage, 'https://letterboxd.com/bcaglaraydin/');
    await warmupPage.close();
    console.log(
      `  Warmup: ${warmupResult.success ? 'SUCCESS' : 'FAILED'} (${warmupResult.elapsed}ms)`
    );

    if (!warmupResult.success) {
      console.error('\n⚠️  Warmup failed! Cloudflare may be actively blocking. Aborting tests.');
      console.error('  Reason:', warmupResult.reason);
      return;
    }

    // Wait for session to settle
    await new Promise((r) => setTimeout(r, 2000));

    // Test 1: Sequential with 2s delay (conservative baseline)
    console.log('\n[2/6] Testing baseline (2000ms delay)...');
    await testSequential(browser, context, 2000, 10);

    // Wait between test phases
    await new Promise((r) => setTimeout(r, 3000));

    // Test 2: Sequential with 1s delay
    console.log('\n[3/6] Testing medium delay (1000ms)...');
    await testSequential(browser, context, 1000, 10);

    await new Promise((r) => setTimeout(r, 3000));

    // Test 3: Sequential with 500ms delay
    console.log('\n[4/6] Testing fast delay (500ms)...');
    await testSequential(browser, context, 500, 10);

    await new Promise((r) => setTimeout(r, 3000));

    // Test 4: Concurrent with 2 parallel
    console.log('\n[5/6] Testing concurrency=2...');
    await testConcurrent(browser, context, 2, 10);

    await new Promise((r) => setTimeout(r, 3000));

    // Test 5: Concurrent with 3 parallel
    console.log('\n[6/6] Testing concurrency=3...');
    await testConcurrent(browser, context, 3, 12);
  } catch (err) {
    console.error('\n❌ Test Failed:', err);
  } finally {
    if (browser) await browser.close();
  }

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log('\nSequential Tests:');
  console.log('┌─────────────┬──────────┬─────────────┬────────────┐');
  console.log('│ Delay (ms)  │ Requests │ Success Rate│ Avg Time   │');
  console.log('├─────────────┼──────────┼─────────────┼────────────┤');
  for (const test of results.sequential) {
    const s = test.summary;
    console.log(
      `│ ${s.delayMs.toString().padEnd(11)} │ ${s.numRequests.toString().padEnd(8)} │ ${s.successRate.padEnd(11)} │ ${s.avgElapsed.padEnd(10)} │`
    );
  }
  console.log('└─────────────┴──────────┴─────────────┴────────────┘');

  console.log('\nConcurrent Tests:');
  console.log('┌─────────────┬──────────┬─────────────┬────────────┐');
  console.log('│ Concurrency │ Requests │ Success Rate│ Avg Time   │');
  console.log('├─────────────┼──────────┼─────────────┼────────────┤');
  for (const test of results.concurrent) {
    const s = test.summary;
    console.log(
      `│ ${s.concurrency.toString().padEnd(11)} │ ${s.numRequests.toString().padEnd(8)} │ ${s.successRate.padEnd(11)} │ ${s.avgElapsed.padEnd(10)} │`
    );
  }
  console.log('└─────────────┴──────────┴─────────────┴────────────┘');

  // Recommendations
  console.log('\n📋 RECOMMENDATIONS:');
  const bestSequential = results.sequential.reduce(
    (best, t) =>
      parseFloat(t.summary.successRate) >= parseFloat(best.summary.successRate) &&
      t.summary.delayMs <= best.summary.delayMs
        ? t
        : best,
    results.sequential[0]
  );

  const bestConcurrent = results.concurrent.reduce(
    (best, t) =>
      parseFloat(t.summary.successRate) >= 90 && t.summary.concurrency > best.summary.concurrency
        ? t
        : best,
    results.concurrent[0]
  );

  if (bestSequential) {
    console.log(
      `  • Safe sequential delay: ${bestSequential.summary.delayMs}ms (${bestSequential.summary.successRate} success)`
    );
  }
  if (bestConcurrent && parseFloat(bestConcurrent.summary.successRate) >= 90) {
    console.log(
      `  • Safe concurrency: ${bestConcurrent.summary.concurrency} parallel requests (${bestConcurrent.summary.successRate} success)`
    );
  } else {
    console.log('  • Concurrency: Keep at 1 (concurrent tests showed high failure rate)');
  }
}

runTests();
