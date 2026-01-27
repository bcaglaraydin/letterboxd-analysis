/* eslint-disable */
/**
 * @file benchmark_performance.js
 * @description Benchmark end-to-end scraping performance on AWS
 * Usage: node backend/scripts/debug/benchmark_performance.js
 */

const API_Endpoint = 'https://mpnd4bu9jg.execute-api.eu-west-1.amazonaws.com';
const USERNAME = 'bcaglaraydin';
const MIN_FILMS = 5;

async function benchmark() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           SCRAPING PERFORMANCE BENCHMARK (AWS)                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log(`\nUser: ${USERNAME}`);
  console.log(`API: ${API_Endpoint}`);
  console.log('Starting benchmark...\n');

  const startTime = Date.now();

  // 1. Trigger Scrape
  console.log('[1/2] Triggering Scrape...');
  try {
    const response = await fetch(`${API_Endpoint}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME }),
    });

    if (!response.ok) {
      if (response.status === 503 || response.status === 504) {
        console.log(
          `  ⚠️ Trigger returned ${response.status} (likely timeout), but Lambda continues in background.`
        );
        console.log('  Continuing to poll status...');
      } else {
        const text = await response.text();
        throw new Error(`Trigger failed: ${response.status} ${text}`);
      }
    } else {
      const data = await response.json();
      console.log(`  ✓ Triggered successfully. Films found: ${data.totalFilms}`);
    }
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.log(`  ⚠️ Network error triggered (possible timeout): ${err.message}. Continuing...`);
    } else {
      console.log(`  ⚠️ Trigger error: ${err.message}. Assuming background execution.`);
    }
  }

  // 2. Poll Status until Ready
  console.log('[2/2] Polling Status...');
  let status = 'pending';
  let attempts = 0;

  while (status !== 'ready') {
    attempts++;
    await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s

    try {
      const res = await fetch(
        `${API_Endpoint}/metrics/status?username=${USERNAME}&minFilms=${MIN_FILMS}`
      );

      if (!res.ok) {
        // console.log(`  (Retrieving status: ${res.status})`);
        // 404 is expected initially if stats aren't created yet
        continue;
      }

      const data = await res.json();
      status = data.status || 'unknown';
      const progress = data.progress || 0;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(
        `\r  Time: ${elapsed}s | Status: ${status} | Progress: ${(progress * 100).toFixed(1)}%`
      );

      if (status === 'error') {
        console.log('\n❌ Scrape failed with error status');
        process.exit(1);
      }

      if (elapsed > 300) {
        // 5 min timeout
        console.log('\n❌ Benchmark timed out > 300s');
        process.exit(1);
      }
    } catch (err) {
      // console.log(`\n  Error polling: ${err.message}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ BENCHMARK COMPLETE`);
  console.log(`Total Time: ${totalTime} seconds`);
}

benchmark();
