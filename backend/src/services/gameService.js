import { generateGenreGame } from '../games/genreGame.js';
import { generateRatingGame } from '../games/ratingGame.js';
import { generateGenreMatchingGame } from '../games/genreMatchingGame.js';
import {
  calculateRatingDistribution,
  calculateBasicStats,
  calculateCommunityComparison,
  findGuiltyPleasure,
} from './statsService.js';

export const GameService = {
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
        genres: meta.genres || [], // Ensure genres array exists
      };
    });

    // Generate Genre Game
    const genreGameData = generateGenreGame(allFilmsWithMeta, { limit: 8 });

    // Generate Rating Game
    const ratingGameData = await generateRatingGame(userFilms, metadataMap, {
      minRatedFilms: minFilms,
    });

    // Generate Genre Matching Game
    const genreMatchingGameData = generateGenreMatchingGame(allFilmsWithMeta);

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
      guiltyPleasures,
      controversialPicks,
    };

    return {
      userStats,
      ratingGame: ratingGameData,
      genreGame: genreGameData,
      genreMatchingGame: genreMatchingGameData,
    };
  },
};
