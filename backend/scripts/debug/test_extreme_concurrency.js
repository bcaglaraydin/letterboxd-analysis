/* eslint-disable */
/**
 * @file test_extreme_concurrency.js
 * @description Push concurrency to the breaking point to find Cloudflare's actual limit
 *
 * Note: Lambda worker has 2048MB memory, 300s timeout, BROWSER_MAX_PAGES=3
 * In production, multiple Lambda instances process SQS messages in parallel,
 * so the TOTAL concurrency = (Lambda instances) × (BROWSER_CONCURRENCY per instance)
 *
 * Usage: node backend/scripts/debug/test_extreme_concurrency.js
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
      '--disable-dev-shm-usage', // Important for Lambda/low memory
      '--no-sandbox',
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
    const is403 = content.includes('403') || content.includes('Forbidden');
    return {
      success: false,
      elapsed: Date.now() - start,
      reason: isChallenge ? 'cloudflare' : is403 ? '403' : 'timeout',
    };
  }
}

// 50 different films to avoid caching effects
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
  'la-la-land',
  'birdman-or-the-unexpected-virtue-of-ignorance',
  '12-years-a-slave',
  'gravity-2013',
  'argo',
  'the-artist',
  'the-kings-speech',
  'the-hurt-locker',
  'slumdog-millionaire',
  'no-country-for-old-men',
  'the-departed',
  'crash-2004',
  'million-dollar-baby',
  'the-lord-of-the-rings-the-return-of-the-king',
  'chicago',
  'a-beautiful-mind',
  'gladiator',
  'american-beauty',
  'shakespeare-in-love',
];

async function testConcurrency(browser, concurrency, numRequests) {
  console.log(`\n--- Concurrency ${concurrency}: ${numRequests} requests ---`);

  const context = await createContext(browser);
  const urls = TEST_FILMS.slice(0, numRequests).map((f) => `https://letterboxd.com/film/${f}/`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const pages = await Promise.all(
      batch.map(async () => {
        const page = await context.newPage();
        await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', (r) => r.abort());
        return page;
      })
    );

    const batchStart = Date.now();
    const batchResults = await Promise.all(batch.map((url, idx) => fetchUrl(pages[idx], url)));

    await Promise.all(pages.map((p) => p.close()));
    results.push(...batchResults);

    batchResults.forEach((r) => process.stdout.write(r.success ? '✓' : '✗'));

    // Check for rate limiting mid-test
    const cfBlocks = batchResults.filter(
      (r) => r.reason === 'cloudflare' || r.reason === '403'
    ).length;
    if (cfBlocks > 0) {
      console.log(`\n  ⚠️ ${cfBlocks} blocks in batch - Cloudflare may be rate limiting`);
    }
  }

  const totalTime = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const avgTime = Math.round(results.reduce((a, r) => a + r.elapsed, 0) / results.length);
  const successRate = ((successCount / numRequests) * 100).toFixed(1);
  const throughput = numRequests / (totalTime / 1000);

  await context.close();

  const failures = results.filter((r) => !r.success);
  const cfBlocks = failures.filter((f) => f.reason === 'cloudflare' || f.reason === '403').length;
  const timeouts = failures.length - cfBlocks;

  console.log(
    `\n  Success: ${successRate}% | Throughput: ${throughput.toFixed(2)} req/s | Total: ${(totalTime / 1000).toFixed(1)}s`
  );
  if (failures.length > 0) {
    console.log(`  Failures: ${cfBlocks} CF blocks, ${timeouts} timeouts`);
  }

  return {
    concurrency,
    successRate: parseFloat(successRate),
    throughput,
    totalTime,
    cfBlocks,
    timeouts,
  };
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         EXTREME CONCURRENCY LIMIT TEST                         ║');
  console.log('║   Finding Cloudflare breaking point                            ║');
  console.log('║   Lambda: 2048MB, 300s timeout                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const browser = await createBrowser();
  const results = [];

  try {
    // Warmup
    console.log('\n[WARMUP] Establishing session...');
    const warmupCtx = await createContext(browser);
    const warmupPage = await warmupCtx.newPage();
    await fetchUrl(warmupPage, 'https://letterboxd.com/film/dune-part-two/');
    await warmupPage.close();
    await warmupCtx.close();
    console.log('  Complete');

    // Aggressive concurrency levels - push until we break
    const levels = [5, 10, 15, 20, 25, 30];

    for (const level of levels) {
      await new Promise((r) => setTimeout(r, 5000)); // 5s cooldown
      const result = await testConcurrency(browser, level, 30); // 30 requests each
      results.push(result);

      // Stop if we hit significant rate limiting
      if (result.cfBlocks >= 3 || result.successRate < 70) {
        console.log(`\n⛔ LIMIT FOUND: Cloudflare blocks starting at concurrency ${level}`);
        break;
      }
    }

    // Summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    RESULTS SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n┌─────────────┬───────────┬────────────┬──────────┬─────────────┐');
    console.log('│ Concurrency │ Success % │ Throughput │ CF Block │ Lambda Safe │');
    console.log('├─────────────┼───────────┼────────────┼──────────┼─────────────┤');

    for (const r of results) {
      const lambdaSafe =
        r.successRate >= 95 && r.concurrency <= 10
          ? '✓ Yes'
          : r.successRate >= 95
            ? '? Maybe'
            : '✗ No';
      console.log(
        `│ ${String(r.concurrency).padStart(11)} │ ${String(r.successRate + '%').padStart(9)} │ ${String(r.throughput.toFixed(2) + '/s').padStart(10)} │ ${String(r.cfBlocks).padStart(8)} │ ${lambdaSafe.padStart(11)} │`
      );
    }
    console.log('└─────────────┴───────────┴────────────┴──────────┴─────────────┘');

    // Find optimal for Lambda
    const safeResults = results.filter((r) => r.successRate >= 95 && r.cfBlocks === 0);
    const best = safeResults.sort((a, b) => b.throughput - a.throughput)[0];

    console.log('\n📋 RECOMMENDATIONS:');
    if (best) {
      console.log(
        `  ✓ Max safe concurrency: ${best.concurrency} (${best.throughput.toFixed(2)} req/s)`
      );
      // For Lambda, suggest lower due to memory constraints
      const lambdaConcurrency = Math.min(best.concurrency, 5);
      console.log(`  ✓ Recommended for Lambda (2048MB): ${lambdaConcurrency}`);
      console.log(
        `\n  Note: In production with N Lambda instances, total concurrency = N × ${lambdaConcurrency}`
      );
    } else {
      console.log('  ⚠️ No safe concurrency level found above 5');
    }
  } finally {
    await browser.close();
  }
}

runTests();
