import { describe, it, expect } from 'vitest';
import { generateTasteGame } from '../tasteGame.js';

describe('TasteGame Generator', () => {
  const mockFilms = [
    {
      slug: 'popular-film',
      title: 'Popular Film',
      ratingCount: 1000000,
      averageRating: 4.0,
      userRating: 4.5,
      poster: 'poster-1',
    },
    {
      slug: 'niche-film',
      title: 'Niche Film',
      ratingCount: 100,
      averageRating: 3.5,
      userRating: 2.0,
      poster: 'poster-2',
    },
  ];

  it('calculates weighted centroid correctly', () => {
    const result = generateTasteGame(mockFilms);

    expect(result).toHaveProperty('actualPopularity');
    expect(result).toHaveProperty('actualAlignment');
    expect(result.movies).toHaveLength(2);

    // Popular film: log10(1,000,001) ~ 6
    // Niche film: log10(101) ~ 2
    // Weight for popular: 4.5, for niche: 2.0
    // Centroid should be closer to the popular film because it has a higher user rating (weight)
    expect(result.actualPopularity).toBeGreaterThan(0.5);
  });

  it('normalizes divergence based on maximum difference in the dataset', () => {
    const customFilms = [
      {
        slug: 'aligned',
        ratingCount: 1000,
        averageRating: 4.0,
        userRating: 4.0, // diff 0
      },
      {
        slug: 'divergent',
        ratingCount: 1000,
        averageRating: 4.0,
        userRating: 5.0, // diff 1.0 (This is the maxDiff)
      },
    ];

    const result = generateTasteGame(customFilms);

    // The movie with 1.0 diff should have divergence 1.0 (relative normalization)
    const divergentMovie = result.movies.find((m) => m.id === 'divergent');
    expect(divergentMovie.divergence).toBe(1.0);

    // The movie with 0 diff should have divergence 0
    const alignedMovie = result.movies.find((m) => m.id === 'aligned');
    expect(alignedMovie.divergence).toBe(0);
  });

  it('handles empty datasets gracefully', () => {
    const result = generateTasteGame([]);
    expect(result.movies).toEqual([]);
    expect(result.actualPopularity).toBe(0.5);
    expect(result.actualAlignment).toBe(0.5);
  });

  it('handles movies missing required metadata by filtering them out', () => {
    const incompleteFilms = [
      ...mockFilms,
      { slug: 'missing-meta', userRating: 5 }, // missing ratingCount, averageRating
    ];
    const result = generateTasteGame(incompleteFilms);
    expect(result.movies).toHaveLength(2);
  });
});
