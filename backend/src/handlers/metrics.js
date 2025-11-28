const { batchGet } = require('../services/dynamo');

const FILMS_TABLE = process.env.FILMS_TABLE;

exports.handler = async (event) => {
  console.log('Metrics event:', JSON.stringify(event));

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    // Input: { users: [{ username, films: [{ slug, rating }] }] }
    // Or simpler fallback: { films: [{ slug, rating }] } (if single user)

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
    // batchGet expects keys as objects, e.g. [{ slug: 'dune-2021' }, ...]
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
    console.error('Metrics error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
