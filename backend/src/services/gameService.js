import { generateGenreGame } from '../games/genreGame.js';
import { generateRatingGame } from '../games/ratingGame.js';
import { generateGenreMatchingGame } from '../games/genreMatchingGame.js';
import { generateThemeGame } from '../games/themeGame.js';
import { generateTasteGame } from '../games/tasteGame.js';
import { Logger } from '../utils/logger.js';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
  findRatingDeviations,
  calculateGenreStats,
  calculateTopActors,
  calculateDurationDistribution,
  calculateCountryStats,
  calculateComparisonMovies,
} from './statsService.js';

export const GameService = {
  /**
   * Generates a rating game for partial_ready state.
   * Filters films to only those with valid metadata before generating.
   * @param {Array} userFilms - List of user's films with basic info (slug, userRating).
   * @param {Map} metadataMap - Map of slug -> full metadata from DB.
   * @param {number} minFilms - Minimum number of rated films required.
   * @returns {Promise<object>} - Rating game data.
   */
  async generatePartialRatingGame(userFilms, metadataMap, minFilms) {
    // Filter for films with valid metadata and ratings
    const partialUserFilms = userFilms.filter((f) => {
      const meta = metadataMap.get(f.slug);
      return meta && meta.year && meta.year !== '????' && f.userRating != null;
    });

    return generateRatingGame(partialUserFilms, metadataMap, {
      minRatedFilms: minFilms,
    });
  },

  /**
   * Generates all games and statistics for a user.
   * @param {Array} userFilms - List of user's films with basic info (slug, userRating).
   * @param {Map} metadataMap - Map of slug -> full metadata from DB.
   * @param {number} minFilms - Minimum number of rated films required for the rating game.
   * @returns {Promise<object>} - object containing userStats, ratingGame, genreGame, genreMatchingGame.
   */
  async generateAll(userFilms, metadataMap, minFilms) {
    const allFilmsWithMeta = userFilms.map((f) => {
      const meta = metadataMap.get(f.slug) || {};
      return {
        slug: f.slug,
        userRating: f.userRating,
        ...meta,
        poster: meta.posterUrl || f.posterUrl,
        title: meta.title || f.title || f.slug,
        genres: meta.genres || [],
        themes: meta.themes || [],
      };
    });

    // Generate Genre Game
    const genreGameData = generateGenreGame(allFilmsWithMeta, { limit: 8 });

    // Diagnostic: Log genre game output for debugging empty-genre issues
    Logger.info('Genre game generated', {
      genreCount: genreGameData?.genres?.length ?? 0,
      actualRankingCount: genreGameData?.actualRanking?.length ?? 0,
      inputFilmCount: allFilmsWithMeta.length,
      filmsWithGenres: allFilmsWithMeta.filter((f) => f.genres && f.genres.length > 0).length,
    });

    // Generate Rating Game
    const ratingGameData = await generateRatingGame(userFilms, metadataMap, {
      minRatedFilms: minFilms,
    });

    // Generate Genre Matching Game
    const genreMatchingGameData = generateGenreMatchingGame(allFilmsWithMeta);

    // Generate Theme Guessing Game
    const themeGameData = generateThemeGame(allFilmsWithMeta);

    // Generate Taste Positioning Analysis
    const tasteGameData = generateTasteGame(allFilmsWithMeta);

    // Calculate User Stats
    const userRatings = userFilms.map((f) => f.userRating).filter((r) => r !== null);
    const ratingDist = calculateRatingDistribution(userRatings);
    const basicStats = calculateBasicStats(userRatings);
    const commStats = calculateCommunityComparison(allFilmsWithMeta);
    const commRatings = allFilmsWithMeta
      .map((f) => f.averageRating)
      .filter((r) => r != null && r > 0);
    const commDist = calculateRatingDistribution(commRatings);

    // Guilty Pleasure and Controversial Picks
    const candidates = allFilmsWithMeta
      .filter((f) => f.averageRating)
      .map((f) => ({
        ...f,
        communityRating: f.averageRating,
      }));
    const ratingDeviations = findRatingDeviations(candidates);

    // Calculate Genre Stats
    const genreOverview = calculateGenreStats(allFilmsWithMeta);

    // Calculate Top Actors (Fetching TMDB Profiles)
    const topActors = await calculateTopActors(allFilmsWithMeta);

    // Calculate Duration Distribution with decoy graphs
    const durationData = calculateDurationDistribution(allFilmsWithMeta);

    // Calculate Country Stats
    const countryStats = calculateCountryStats(allFilmsWithMeta);

    // Calculate 5 Comparison Movies for Habits Game
    const comparisonMovies = calculateComparisonMovies(allFilmsWithMeta);

    const userStats = {
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
      guiltyPleasures: ratingDeviations.guiltyPleasures.slice(0, 5),
      controversialPicks: ratingDeviations.controversialPicks.slice(0, 5),
      hotTakes: ratingDeviations.hotTakes.slice(0, 5),
      skepticPicks: ratingDeviations.skepticPicks.slice(0, 5),
      comparisonMovies,
      genreOverview,
      topActors,
      durationDistribution: durationData.graphs,
      countryStats,
    };

    const result = {
      userStats,
      ratingGame: ratingGameData,
      genreGame: genreGameData,
      genreMatchingGame: genreMatchingGameData,
      themeGame: themeGameData,
      tasteGame: tasteGameData,
    };

    // Diagnostic: Log full game data shape for debugging hydration issues
    Logger.info('All games generated', {
      hasUserStats: !!userStats,
      ratingMovies: ratingGameData?.movies?.length ?? 0,
      genreCount: genreGameData?.genres?.length ?? 0,
      matchingRounds: genreMatchingGameData?.rounds?.length ?? 0,
      themeRounds: themeGameData?.rounds?.length ?? 0,
      tasteMovies: tasteGameData?.movies?.length ?? 0,
    });

    return result;
  },
};
