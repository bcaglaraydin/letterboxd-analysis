const { scrapeUserFilmsList } = require('../src/services/letterboxdScrapingService');

async function verify() {
  const username = 'bcaglaraydin'; // Or any public user
  console.log(`Verifying Step 1 for user: ${username}`);

  try {
    const films = await scrapeUserFilmsList(username);
    console.log(`Successfully scraped ${films.length} films.`);

    if (films.length > 0) {
      console.log('Sample films:', films.slice(0, 5));

      const ratedFilms = films.filter((f) => f.userRating !== null);
      console.log(`Found ${ratedFilms.length} rated films.`);
      if (ratedFilms.length > 0) {
        console.log('Sample rated film:', ratedFilms[0]);
      }
    } else {
      console.warn('No films found. Check username or selector.');
    }
  } catch (error) {
    console.error('Verification failed:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

verify();
