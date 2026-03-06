import { describe, it, expect } from 'vitest';
import { generateThemeGame } from '../themeGame.js';

describe('ThemeGame Generator', () => {
  const mockFilms = [
    {
      slug: 'film-1',
      title: 'Movie 1',
      year: '2020',
      director: 'Dir A',
      posterUrl: '/poster1.jpg',
      userRating: 10,
      themes: ['Sci-Fi Adventure', 'Space'],
      genres: ['Sci-Fi'],
    },
    {
      slug: 'film-2',
      title: 'Movie 2',
      year: '2021',
      director: 'Dir B',
      posterUrl: '/poster2.jpg',
      userRating: 4,
      themes: ['Sci-Fi Adventure', 'Dystopian'],
      genres: ['Sci-Fi', 'Thriller'],
    },
    {
      slug: 'film-3',
      title: 'Movie 3',
      year: '2019',
      director: 'Dir C',
      posterUrl: '/poster3.jpg',
      userRating: 2,
      themes: ['Dystopian', 'Sadness'],
      genres: ['Drama'],
    },
    {
      slug: 'film-4',
      title: 'Movie 4',
      year: '2022',
      director: 'Dir D',
      posterUrl: '/poster4.jpg',
      userRating: 10,
      themes: ['Space', 'Sadness'],
      genres: ['Drama'],
    },
  ];

  it('generates standard theme rounds successfully', () => {
    const { rounds } = generateThemeGame(mockFilms, { limit: 2 });
    expect(rounds.length).toBe(2);
    expect(rounds[0]).toHaveProperty('id');
    expect(rounds[0]).toHaveProperty('themes');
    expect(rounds[0]).toHaveProperty('correctMovie');
  });

  it('generates sortingRounds based on average ratings of themes with count >= 2', () => {
    const { sortingRounds } = generateThemeGame(mockFilms, { limit: 4 });

    // Sci-Fi Adventure: Movie 1 (10) + Movie 2 (4) -> count 2, avg 7.0
    // Space: Movie 1 (10) + Movie 4 (10) -> count 2, avg 10.0
    // Dystopian: Movie 2 (4) + Movie 3 (2) -> count 2, avg 3.0
    // Sadness: Movie 3 (2) + Movie 4 (10) -> count 2, avg 6.0

    // Sorted properly: Space (10), Sci-Fi Adventure (7), Sadness (6), Dystopian (3)
    // Only 4 themes meet count >= 2.

    expect(sortingRounds).toBeDefined();
    expect(sortingRounds.length).toBe(10); // Now always padded to 10 distinct themes

    const favorites = sortingRounds.filter((r) => r.type === 'favorite');
    const leastFavorites = sortingRounds.filter((r) => r.type === 'least_favorite');

    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites[0].theme).toBe('Space');
    expect(favorites[0].averageRating).toBe(10);
    expect(favorites[0].topMovies.map((m) => m.title)).toContain('Movie 1');
    expect(favorites[0].topMovies.map((m) => m.title)).toContain('Movie 4');

    // The absolute worst should be the LAST element of leastFavorites because we inverted from top to bottom
    // Wait, the slice array logic:
    // leastFavorites: validThemes.slice(-5).map(...)
    // validThemes sorted descending. Last elements are the lowest.
    // slice(-5) keeps them in same relative order (descending): [...] -> [..., Dystopian]
    // The last element is Dystopian.
    const worst = leastFavorites[leastFavorites.length - 1];
    expect(worst.theme).toBe('Dystopian');
    expect(worst.averageRating).toBe(3);
  });

  it('handles empty movies safely', () => {
    const { rounds, sortingRounds } = generateThemeGame([], { limit: 5 });
    expect(rounds).toEqual([]);
    expect(sortingRounds).toBeUndefined(); // Returns early with just { rounds: [] }
  });
});
