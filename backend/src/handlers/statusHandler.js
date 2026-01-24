import { getItem, batchGet } from '../services/dynamoDbService.js';
import { generateGenreGame } from '../games/genreGame.js';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
  findGuiltyPleasure,
} from '../services/statsService.js';

const FILMS_TABLE = process.env.FILMS_TABLE;

export const handler = async (event) => {
  try {
    const { username } = event.queryStringParameters || {};

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username is required' }),
      };
    }

    if (!FILMS_TABLE) {
      throw new Error('FILMS_TABLE environment variable is not set');
    }

    // 1. Fetch User's Film List Log (Stored by retrieveMetricsHandler)
    const userItemKey = { slug: `USER#${username}` };
    const userItem = await getItem(FILMS_TABLE, userItemKey);

    if (!userItem || !userItem.films) {
      // If we don't have the user list, maybe it hasn't started or expired?
      // Or new user?
      // Return 404 or "processing" with 0 progress?
      return {
        statusCode: 200, // Return 200 processing to avoid frontend erroring out immediately
        body: JSON.stringify({ status: 'processing', progress: 0 }),
      };
    }

    const { films: filmSlugs, totalFilms } = userItem;

    if (totalFilms === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ready', progress: 1, userStats: {}, genreGame: {} }),
      };
    }

    // 2. Check Completeness (BatchGet Metadata)
    const filmSlugStrings = filmSlugs.map((f) => (typeof f === 'string' ? f : f.slug));
    const uniqueSlugs = [...new Set(filmSlugStrings)].map((slug) => ({ slug }));

    // We fetch ALL metadata to check completeness AND to generate stats if ready.
    // This might be heavy if user has 2000 films.
    // Optimization: BatchGet is efficient enough for <1000 items (10 batches).
    const dbItems = await batchGet(FILMS_TABLE, uniqueSlugs);

    // Create Map
    const metadataMap = new Map();
    dbItems.forEach((item) => metadataMap.set(item.slug, item));

    // Check count of VALID metadata (must have year/director etc to be useful)
    let validCount = 0;
    filmSlugs.forEach((slug) => {
      const meta = metadataMap.get(slug);
      if (meta && meta.year && meta.year !== '????') {
        validCount++;
      }
    });

    const progress = validCount / filmSlugs.length;

    // Threshold: 95% complete is good enough? Or strict 100%?
    // Let's go with 98% to account for permanent failures.
    const isReady = progress >= 0.98;

    if (!isReady) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'processing',
          progress: parseFloat(progress.toFixed(2)),
        }),
      };
    }

    // 3. Generate Stats & Game (If Ready)
    console.log(`User ${username} data ready (${validCount}/${totalFilms}). Generating stats...`);

    // Reconstruct "User Films with Metadata"
    // We rely on 'userItem.films' (slugs) but we need 'userRating' which isn't stored in USER# item?
    // ERROR: I stored only SLUGS in USER# item. I LOST THE USER RATINGS!

    // CRITICAL FIX: I need to store { slug, userRating } in USER# item!
    // I need to update retrieveMetricsHandler.js FIRST.

    // Assuming I fix retrieveMetricsHandler.js:
    // Let's write code assuming userItem.films is objects { slug, userRating }
    // Or I need to fetch it from somewhere else.

    // Actually, storing just slugs makes the `USER#` item smaller (DynamoDB item limit 400KB).
    // If user has 2000 films:
    // 2000 * (slug=30 + rating=5) = 70KB. Safe.

    // I will Assume userItem.films contains object { slug, userRating }.
    // If it contains strings, I'm stuck.

    // Let's assume I fix retrieveMetricsHandler to store objects.
    const userFilms = filmSlugs.map((f) => {
      // Handle legacy string format just in case (though we will fix it)
      if (typeof f === 'string') return { slug: f, userRating: null };
      return f;
    });

    const allFilmsWithMeta = userFilms.map((f) => {
      const meta = metadataMap.get(f.slug) || {};
      return {
        ...f,
        ...meta,
        userRating: f.userRating,
        poster: meta.posterUrl || f.posterUrl,
        title: meta.title || f.title || f.slug,
      };
    });

    // Generate Genre Game
    const genreGameData = generateGenreGame(allFilmsWithMeta, { limit: 8 });

    // Calculate User Stats
    const userRatings = userFilms.map((f) => f.userRating).filter((r) => r !== null);
    const ratingDist = calculateRatingDistribution(userRatings);
    const basicStats = calculateBasicStats(userRatings);
    const commStats = calculateCommunityComparison(allFilmsWithMeta);
    const commRatings = allFilmsWithMeta
      .map((f) => f.averageRating)
      .filter((r) => r != null && r > 0);
    const commDist = calculateRatingDistribution(commRatings);

    // Guilty Pleasure
    const candidates = allFilmsWithMeta
      .filter((f) => f.averageRating)
      .map((f) => ({
        ...f,
        communityRating: f.averageRating,
      }));

    const { guiltyPleasures, controversialPicks } = findGuiltyPleasure(candidates);

    const stats = {
      totalMovies: userFilms.length,
      averageRating: basicStats.average,
      ratingDistribution: ratingDist,
      generosity: {
        median: basicStats.median,
        average: basicStats.average,
        stdDev: basicStats.stdDev,
      },
      communityComparison: commStats,
      communityRatingDistribution: commDist,
      guiltyPleasures,
      controversialPicks,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'ready',
        progress: 1,
        userStats: stats,
        genreGame: genreGameData,
      }),
    };
  } catch (error) {
    console.error('Status Handler Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to check status' }),
    };
  }
};
