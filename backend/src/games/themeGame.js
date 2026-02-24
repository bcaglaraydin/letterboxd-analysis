/**
 * Generates the Theme Guessing Game data.
 *
 * Game Rules:
 * - 5 Rounds total.
 * - Each round presents a set of themes.
 * - User guesses the movie.
 * - Hints available: Genre, Year, Rating, Director.
 *
 * @param {Array} allFilms - List of all user's films with full metadata.
 * @param {object} options - Configuration options (limit, exclusions, etc).
 * @returns {object} - Theme game data structure { rounds: [] }.
 */
export function generateThemeGame(allFilms, options = {}) {
  const { limit = 5 } = options;

  // 1. Filter valid candidates
  // Must have themes, title, year, director, poster
  const candidates = allFilms.filter((film) => {
    return (
      film.themes &&
      film.themes.length > 0 &&
      film.title &&
      film.year &&
      film.director &&
      film.posterUrl
    );
  });

  if (candidates.length < limit) {
    console.warn(
      `[ThemeGame] Not enough candidates with themes. Found ${candidates.length}, need ${limit}.`
    );
    // Fallback: If we have at least 1, just use what we have. If 0, return empty.
    if (candidates.length === 0) return { rounds: [] };
  }

  // 2. Shuffle and Select
  // Prioritize films with User Ratings if possible, but mix it up.
  // We want a mix of "High rated", "Low rated", "Unrated but watched/listed" if available.
  // For now, simple shuffle of all valid candidates.
  const shuffled = candidates.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, limit);

  // 3. Construct Rounds
  const rounds = selected.map((film) => {
    // Select up to 10 themes, prioritizing unique ones if we had a global uniqueness check (skip for now)
    const gameThemes = film.themes.slice(0, 10);

    // Take top 3 genres for hints
    const gameGenres = (film.genres || []).slice(0, 3);

    return {
      id: film.slug,
      themes: gameThemes,
      userRating: film.userRating, // null if not rated
      genres: gameGenres,
      correctMovie: {
        title: film.title,
        year: film.year,
        director: film.director,
        posterUrl: film.posterUrl,
      },
    };
  });

  // 4. Generate Sorting Rounds based on statistical averages
  const themeStats = {}; // { [themeName]: { totalRating: 0, count: 0, movies: [] } }

  allFilms.forEach((film) => {
    // We only care about themes attached to rated files
    if (film.userRating && film.themes && film.themes.length > 0 && film.posterUrl && film.title) {
      // Use standardized userRating assuming max 10. (If it's already /10 or /100)
      // Note: userRating is generally out of 10 or 100 depending on metric parse.
      // Let's assume it's up to 10 or 100 consistently.

      const rating = film.userRating;

      film.themes.forEach((theme) => {
        if (!themeStats[theme]) {
          themeStats[theme] = { totalRating: 0, count: 0, movies: [] };
        }
        themeStats[theme].totalRating += rating;
        themeStats[theme].count += 1;
        themeStats[theme].movies.push({
          title: film.title,
          posterUrl: film.posterUrl,
          userRating: rating,
        });
      });
    }
  });

  const validThemes = Object.keys(themeStats)
    .map((theme) => {
      const stats = themeStats[theme];
      const avg = stats.totalRating / stats.count;
      // Sort movies descending by rating for the "Top Movies" strip
      const topMovies = stats.movies
        .sort((a, b) => b.userRating - a.userRating)
        .slice(0, 3)
        .map((m) => ({ title: m.title, posterUrl: m.posterUrl }));

      return {
        theme,
        averageRating: Number(avg.toFixed(1)),
        count: stats.count,
        topMovies,
      };
    })
    // Only include themes with enough data points to be somewhat interesting
    .filter((t) => t.count >= 2);

  validThemes.sort((a, b) => b.averageRating - a.averageRating); // highest to lowest

  // Top 5 and Bottom 5 (ensuring no overlap if very few themes exist)
  const topCut = Math.min(5, validThemes.length);
  const favorites = validThemes.slice(0, topCut).map((t, i) => ({
    id: `fav-${i}`,
    theme: t.theme,
    averageRating: t.averageRating,
    type: 'favorite',
    topMovies: t.topMovies,
  }));

  // Take from bottom, invert to standard order (lowest to highest? Or keep Descending order?)
  // Let's keep descending order, so the absolute worst is at the very bottom
  const leastFavorites = validThemes.slice(-5).map((t, i) => ({
    id: `least-${i}`,
    theme: t.theme,
    averageRating: t.averageRating,
    type: 'least_favorite',
    topMovies: t.topMovies,
  }));

  const sortingRounds = [...favorites, ...leastFavorites];

  return { rounds, sortingRounds };
}

// Trigger CI deployment
