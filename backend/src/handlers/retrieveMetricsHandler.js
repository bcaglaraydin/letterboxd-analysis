import { batchGet, putItem } from '../services/dynamoDbService.js';
import { scrapeUserFilmsList } from '../services/letterboxdScrapingService.js';
import { closeBrowserSession } from '../utils/browser.js';
import { generateRatingGame } from '../games/ratingGame.js';

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

      // 1. Scrape User's Film List
      const userFilms = await scrapeUserFilmsList(username);
      if (userFilms.length < 5) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'User needs at least 5 rated films to play.' }),
        };
      }

      // 1.5 Store User List (for status checking)
      // We store the list of slugs so statusHandler knows what to check for completeness
      if (FILMS_TABLE) {
        try {
          // Store item USER#<username>
          // Set TTL to 1 hour
          const ttl = Math.floor(Date.now() / 1000) + 3600;
          const userItem = {
            slug: `USER#${username}`,
            films: userFilms.map((f) => ({ slug: f.slug, userRating: f.userRating })),
            totalFilms: userFilms.length,
            ttl,
          };
          // Import putItem dynamically or assume imported (need to add import)
          await putItem(FILMS_TABLE, userItem);
        } catch (err) {
          console.error('Failed to store user list payload:', err);
        }
      }

      // 2. Fetch Metadata (Check DB first)
      const uniqueSlugs = [...new Set(userFilms.map((f) => f.slug))].map((slug) => ({ slug }));
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

      // 2.5 Dispatch Missing Films to SQS (Background Processing)
      const cachedSlugs = new Set(dbItems.map((i) => i.slug));
      const missingFilms = userFilms.filter(
        (f) => !cachedSlugs.has(f.slug) || !metadataMap.get(f.slug)?.year
      );

      if (process.env.SQS_QUEUE_URL && missingFilms.length > 0) {
        const { sendMessageBatch } = await import('../services/sqsQueueService.js');
        const queueUrl = process.env.SQS_QUEUE_URL;

        // Dispatch in background (we await the dispatch call itself but workers process async)
        // Only send SLUGs to worker
        const messages = missingFilms.map((f) => ({ slug: f.slug }));
        try {
          console.log(`Dispatching ${messages.length} missing films to SQS...`);
          await sendMessageBatch(queueUrl, messages);
        } catch (sqsErr) {
          console.error('Failed to dispatch to SQS:', sqsErr);
        }
      }

      // 3. Generate Rating Game Data (Will scrape 5 random if needed)
      let ratingGameData;
      try {
        ratingGameData = await generateRatingGame(userFilms, metadataMap);
      } catch (err) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: err.message }),
        };
      }

      // 4. Return Immediate Response (Partial)
      // We do NOT generate Genre Game or User Stats yet as data is incomplete

      return {
        statusCode: 200,
        body: JSON.stringify({
          username: username,
          status: 'processing', // Indicates background work is active
          totalFilms: userFilms.length,
          cachedFilms: dbItems.length,
          ratingGame: ratingGameData,
          userStats: null, // Will be fetched later
          genreGame: null, // Will be fetched later
        }),
      };
    }

    // --- METRICS MODE (Existing Logic) ---
    // Input: { users: [{ username, films: [{ slug, rating }] }] }
    // ... (Keep existing logic below)

    const users = body.users || [];
    if (users.length === 0) {
      // Fallback for simple list input if frontend sends just films
      if (body.films) {
        users.push({ username: 'unknown', films: body.films });
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No users or films provided' }),
        };
      }
    }

    // 1. Extract all unique slugs
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

    // 2. Batch Get Metadata
    const metadataItems = await batchGet(FILMS_TABLE, uniqueSlugs);

    // Create a map for quick lookup
    const metadataMap = new Map();
    metadataItems.forEach((item) => {
      metadataMap.set(item.slug, item);
    });

    // 3. Compute Metrics
    const results = users.map((user) => {
      const userFilms = user.films || [];
      const filmsWithMetadata = userFilms.map((f) => {
        const meta = metadataMap.get(f.slug) || {};
        return { ...f, ...meta };
      });

      // Example Metric: Top Genres
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

      // Example Metric: Average Rating
      const ratedFilms = filmsWithMetadata.filter((f) => f.userRating != null);
      const avgRating =
        ratedFilms.length > 0
          ? ratedFilms.reduce((sum, f) => sum + f.userRating, 0) / ratedFilms.length
          : 0;

      // Example Metric: Top Directors
      const directorCounts = {};
      filmsWithMetadata.forEach((f) => {
        if (f.director) {
          // Directors are often comma-separated strings in our data
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected error occurred' }),
    };
  } finally {
    // Always clean up browser session at the end of the request
    await closeBrowserSession();
  }
};
