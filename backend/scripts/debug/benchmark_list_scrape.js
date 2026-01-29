import 'dotenv/config';
import { scrapeUserFilmsList } from '../../src/services/letterboxdScrapingService.js';

const username = 'bcaglaraydin';

async function benchmark() {
  console.log(`Starting benchmark for user: ${username}`);
  const start = Date.now();

  try {
    const films = await scrapeUserFilmsList(username);
    const duration = (Date.now() - start) / 1000;
    console.log(`\n✅ Scraped ${films.length} films in ${duration.toFixed(2)} seconds`);
  } catch (err) {
    const duration = (Date.now() - start) / 1000;
    console.error(`\n❌ Failed after ${duration.toFixed(2)} seconds:`, err.message);
  }
}

benchmark();
