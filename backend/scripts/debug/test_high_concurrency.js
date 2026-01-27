/* eslint-disable */
/**
 * @file test_high_concurrency.js
 * @description Test high concurrency levels to find the maximum safe limit for Cloudflare
 *
 * Usage: node backend/scripts/debug/test_high_concurrency.js
 */

import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

const LETTERBOXD_READY_SELECTORS = '.poster-grid, .site-body, .navitem';

async function createBrowser() {
  return await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--exclude-switches=enable-automation',
      '--window-size=1920,1080',
    ],
  });
}

async function createContext(browser) {
  return await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
}

async function fetchUrl(page, url, timeout = 30000) {
  const start = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForSelector(LETTERBOXD_READY_SELECTORS, { timeout: 10000 });
    return { success: true, elapsed: Date.now() - start };
  } catch (e) {
    const content = await page.content().catch(() => '');
    const isChallenge =
      content.includes('Just a moment') || content.includes('Checking your browser');
    return {
      success: false,
      elapsed: Date.now() - start,
      reason: isChallenge ? 'cloudflare' : 'timeout',
    };
  }
}

const TEST_FILMS = [
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
  'taxi-driver',
  'blade-runner-2049',
  'mad-max-fury-road',
  'her',
  'arrival-2016',
  'moonlight-2016',
  'get-out-2017',
  'jojo-rabbit',
  'little-women-2019',
  'portrait-of-a-lady-on-fire',
  'the-favourite',
  'roma-2018',
];

async function testConcurrency(browser, concurrency, numRequests) {
  console.log(`\n--- Testing Concurrency: ${concurrency} parallel, ${numRequests} requests ---`);

  const context = await createContext(browser);
  const urls = TEST_FILMS.slice(0, numRequests).map((f) => `https://letterboxd.com/film/${f}/`);

  const results = [];
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const pages = await Promise.all(
      batch.map(async () => {
        const page = await context.newPage();
        await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (r) => r.abort());
        return page;
      })
    );

    const batchResults = await Promise.all(batch.map((url, idx) => fetchUrl(pages[idx], url)));

    await Promise.all(pages.map((p) => p.close()));
    results.push(...batchResults);

    // Show progress
    batchResults.forEach((r) => process.stdout.write(r.success ? '✓' : '✗'));
  }

  const totalTime = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const avgTime = Math.round(results.reduce((a, r) => a + r.elapsed, 0) / results.length);
  const successRate = ((successCount / numRequests) * 100).toFixed(1);

  await context.close();

  console.log(`\n  Success: ${successRate}% (${successCount}/${numRequests})`);
  console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Avg response: ${avgTime}ms`);
  console.log(`  Throughput: ${(numRequests / (totalTime / 1000)).toFixed(2)} req/s`);

  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    const cfBlocks = failures.filter((f) => f.reason === 'cloudflare').length;
    console.log(`  ⚠️ ${cfBlocks} Cloudflare blocks, ${failures.length - cfBlocks} timeouts`);
  }

  return {
    concurrency,
    successRate: parseFloat(successRate),
    throughput: numRequests / (totalTime / 1000),
    totalTime,
  };
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          HIGH CONCURRENCY LIMIT TEST                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const browser = await createBrowser();
  const results = [];

  try {
    // Warmup
    console.log('\n[WARMUP] Single request to establish session...');
    const warmupCtx = await createContext(browser);
    const warmupPage = await warmupCtx.newPage();
    await fetchUrl(warmupPage, 'https://letterboxd.com/film/dune-part-two/');
    await warmupPage.close();
    await warmupCtx.close();
    console.log('  Warmup complete');

    // Test increasing concurrency levels
    const concurrencyLevels = [3, 5, 8, 10, 15];

    for (const level of concurrencyLevels) {
      await new Promise((r) => setTimeout(r, 3000)); // Cool-down between tests
      const result = await testConcurrency(browser, level, 20);
      results.push(result);

      // Stop if we hit significant failures
      if (result.successRate < 80) {
        console.log(`\n⛔ Stopping tests - too many failures at concurrency ${level}`);
        break;
      }
    }

    // Summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       SUMMARY                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n┌───────────────┬─────────────┬────────────────┬─────────────┐');
    console.log('│ Concurrency   │ Success %   │ Throughput     │ Total Time  │');
    console.log('├───────────────┼─────────────┼────────────────┼─────────────┤');

    for (const r of results) {
      console.log(
        `│ ${String(r.concurrency).padEnd(13)} │ ${String(r.successRate + '%').padEnd(11)} │ ${String(r.throughput.toFixed(2) + ' req/s').padEnd(14)} │ ${String((r.totalTime / 1000).toFixed(1) + 's').padEnd(11)} │`
      );
    }
    console.log('└───────────────┴─────────────┴────────────────┴─────────────┘');

    // Recommendation
    const bestResult = results
      .filter((r) => r.successRate >= 95)
      .sort((a, b) => b.throughput - a.throughput)[0];
    if (bestResult) {
      console.log(
        `\n📋 RECOMMENDATION: Use concurrency ${bestResult.concurrency} (${bestResult.throughput.toFixed(2)} req/s, ${bestResult.successRate}% success)`
      );
    } else {
      console.log('\n⚠️ No concurrency level achieved 95%+ success rate');
    }
  } finally {
    await browser.close();
  }
}

runTests();
