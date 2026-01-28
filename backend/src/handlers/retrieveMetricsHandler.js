import { batchGet } from '../services/dynamoDbService.js';
import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { closeBrowserSession } from '../utils/browser.js';
import { generateRatingGame } from '../games/ratingGame.js';
import { sendMessageBatch } from '../services/sqsQueueService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

export const handler = async (event) => {
  console.log('Metrics/Game event:', JSON.stringify(event));

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    // --- GAME MODE (Single User Start) ---
    if (body.username) {
      const username = body.username;
      console.log(`Starting game for user: ${username}`);

      // 1. Scrape User's Film List (fast - just list pages)
      // This gives us: {slug, title, posterUrl, userRating}
      let userFilms;
      try {
        userFilms = await scrapeUserFilmsList(username);
        console.log(`Found ${userFilms.length} films for ${username}`);
      } catch (error) {
        console.error(`Failed to scrape user list:`, error);

        let userMessage = 'Failed to fetch user profile';
        let statusCode = 500;

        if (error.message?.includes('Page not found (404)')) {
          userMessage = 'Letterboxd user not found. Please check the username and try again.';
          statusCode = 404;
        } else if (error.message?.includes('profile is private')) {
          userMessage = 'User not found or profile is private.';
          statusCode = 404;
        }

        return {
          statusCode,
          body: JSON.stringify({ error: userMessage }),
        };
      }

      if (userFilms.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No films found for this user' }),
        };
      }

      // 2. Check Metadata Cache
      const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));
      console.log(`Checking metadata for ${uniqueSlugs.length} films...`);

      let dbItems = [];
      if (FILMS_TABLE) {
        try {
          dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);
        } catch (err) {
          console.error('DynamoDB BatchGet failed:', err);
        }
      }

      const metadataMap = new Map();
      dbItems.forEach((item) => metadataMap.set(item.slug, item));

      // 3. Dispatch Missing Films for Scraping
      const validSlugs = new Set(
        dbItems.filter((i) => i.year && i.year !== '????').map((i) => i.slug)
      );
      const missingFilms = userFilms.filter((f) => !validSlugs.has(f.slug));

      if (process.env.SQS_QUEUE_URL && missingFilms.length > 0) {
        console.log(`Dispatching ${missingFilms.length} missing films for scraping...`);
        const BATCH_SIZE = 10;
        const messages = [];

        for (let i = 0; i < missingFilms.length; i += BATCH_SIZE) {
          const chunk = missingFilms.slice(i, i + BATCH_SIZE).map((f) => f.slug);
          messages.push({
            action: 'scrape_batch',
            slugs: chunk,
          });
        }

        try {
          await sendMessageBatch(process.env.SQS_QUEUE_URL, messages);
        } catch (sqsErr) {
          console.error('Failed to dispatch to SQS:', sqsErr);
        }
      }

      // 4. Check Game Readiness
      // Count rated films with valid metadata
      let ratedWithMetadata = 0;
      userFilms.forEach((f) => {
        if (f.userRating != null && validSlugs.has(f.slug)) {
          ratedWithMetadata++;
        }
      });

      if (ratedWithMetadata < 5 && userFilms.length >= 5) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'processing',
            totalFilms: userFilms.length,
            cachedFilms: validSlugs.size,
          }),
        };
      }

      // 5. Generate Rating Game
      let ratingGameData;
      try {
        const filmsForGame = userFilms.filter(
          (f) => f.userRating != null && validSlugs.has(f.slug)
        );
        ratingGameData = await generateRatingGame(filmsForGame, metadataMap);
      } catch (err) {
        if (err.message.includes('User needs at least')) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: err.message }),
          };
        }
        console.warn('Game generation failed, returning processing:', err);
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'processing',
            totalFilms: userFilms.length,
            cachedFilms: validSlugs.size,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'processing', // Still processing for stats/genreGame
          totalFilms: userFilms.length,
          cachedFilms: validSlugs.size,
          ratingGame: ratingGameData,
          userStats: null,
          genreGame: null,
        }),
      };
    }

    // --- METRICS MODE (Batch Analysis) ---
    const users = body.users || [];
    if (users.length === 0) {
      if (body.films) {
        users.push({ username: 'unknown', films: body.films });
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No users or films provided' }),
        };
      }
    }

    // Extract all unique slugs
    const allSlugs = new Set();
    users.forEach((user) => {
      if (user.films && Array.isArray(user.films)) {
        user.films.forEach((film) => {
          if (film.slug) allSlugs.add(film.slug);
        });
      }
    });

    const uniqueSlugs = Array.from(allSlugs).map((slug) => ({ slug }));
    console.log(`Fetching metadata for ${uniqueSlugs.length} unique films`);

    const metadataItems = await batchGet(FILMS_TABLE, uniqueSlugs);
    const metadataMap = new Map();
    metadataItems.forEach((item) => metadataMap.set(item.slug, item));

    // Compute Metrics
    const results = users.map((user) => {
      const userFilms = user.films || [];
      const filmsWithMetadata = userFilms.map((f) => {
        const meta = metadataMap.get(f.slug) || {};
        return { ...f, ...meta };
      });

      const genreCounts = {};
      filmsWithMetadata.forEach((f) => {
        if (f.genres && Array.isArray(f.genres)) {
          f.genres.forEach((g) => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
      });

      const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const ratedFilms = filmsWithMetadata.filter((f) => f.userRating != null);
      const avgRating =
        ratedFilms.length > 0
          ? ratedFilms.reduce((sum, f) => sum + f.userRating, 0) / ratedFilms.length
          : 0;

      const directorCounts = {};
      filmsWithMetadata.forEach((f) => {
        if (f.director) {
          const directors = f.director.split(',').map((d) => d.trim());
          directors.forEach((d) => {
            if (d) directorCounts[d] = (directorCounts[d] || 0) + 1;
          });
        }
      });

      const topDirectors = Object.entries(directorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        username: user.username,
        totalFilms: userFilms.length,
        averageRating: parseFloat(avgRating.toFixed(2)),
        topGenres,
        topDirectors,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ metrics: results }),
    };
  } catch (error) {
    console.error('[RetrieveMetrics] Handler error:', error);

    let userMessage = 'An unexpected error occurred';
    let statusCode = 500;

    if (error.message?.includes('Page not found (404)')) {
      userMessage = 'Letterboxd user not found. Please check the username and try again.';
      statusCode = 404;
    } else if (error.message?.includes('Cloudflare challenge failed')) {
      userMessage =
        'Unable to access Letterboxd due to rate limiting. Please try again in a few minutes.';
      statusCode = 503;
    } else if (error.message?.includes('Unexpected page state')) {
      userMessage = 'Letterboxd returned an unexpected response. Please try again.';
      statusCode = 502;
    }

    return {
      statusCode,
      body: JSON.stringify({ error: userMessage }),
    };
  } finally {
    await closeBrowserSession();
  }
};
