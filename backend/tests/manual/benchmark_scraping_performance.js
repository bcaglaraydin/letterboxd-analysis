/**
 * @file benchmark_scraping_performance.js
 * @description Benchmark scraping performance with various concurrency settings.
 * Use this to tune `SCRAPING_CONCURRENCY_LIST` and `SCRAPING_CONCURRENCY_FILM`.
 *
 * Usage: node backend/tests/manual/benchmark_scraping_performance.js
 */

import { scrapeUserFilms } from '../../src/services/letterboxdScrapingService.js';
import { performance } from 'perf_hooks';

const USERNAME = 'bcaglaraydin';

const CONFIGS = [
  { name: 'Baseline', list: 5, film: 15 },
  { name: 'Conservative', list: 5, film: 5 },
  { name: 'Balanced', list: 10, film: 10 },
  { name: 'Aggressive', list: 10, film: 20 },
];

async function runBenchmark() {
  console.log(`Starting benchmark for user: ${USERNAME}`);
  console.log('----------------------------------------');

  for (const config of CONFIGS) {
    console.log(`Testing Config: ${config.name} (List=${config.list}, Film=${config.film})`);

    // Set env vars
    process.env.SCRAPING_CONCURRENCY_LIST = config.list.toString();
    process.env.SCRAPING_CONCURRENCY_FILM = config.film.toString();

    const start = performance.now();
    try {
      const films = await scrapeUserFilms(USERNAME);
      const end = performance.now();
      const duration = ((end - start) / 1000).toFixed(2);

      console.log(`✅ Success! Fetched ${films.length} films in ${duration}s`);
    } catch (error) {
      console.error(`❌ Failed! Error: ${error.message}`);
    }

    console.log('Cooling down for 5 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('----------------------------------------');
  }
}

runBenchmark();
