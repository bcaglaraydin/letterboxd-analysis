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

  return { rounds };
}
