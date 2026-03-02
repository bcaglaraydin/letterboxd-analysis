import { describe, it, expect, vi } from 'vitest';
import { calculateGenreStats } from '../statsService.js';

vi.mock('../tmdbService.js', () => ({
  getActorPhotoUrl: vi.fn().mockResolvedValue('mock-url.jpg'),
}));

describe('calculateGenreStats', () => {
  it('should calculate basic genre stats correctly', () => {
    const films = [
      {
        genres: ['Action'],
        userRating: 4,
        averageRating: 3.5,
        poster: 'url1',
        title: 'Movie 1',
      },
      {
        genres: ['Action'],
        userRating: 5,
        averageRating: 4.0,
        poster: 'url2',
        title: 'Movie 2',
      },
    ];

    const stats = calculateGenreStats(films);
    expect(stats).toHaveLength(1);
    expect(stats[0].name).toBe('Action');
    expect(stats[0].userAvgRating).toBe(4.5);
    expect(stats[0].communityAvgRating).toBe(3.75);
    expect(stats[0].userWatchCount).toBe(2);
  });

  it('should assign Comfort Zone tag to top watched genre > 5 films', () => {
    const films = [];
    // 6 Action movies
    for (let i = 0; i < 6; i++) {
      films.push({
        genres: ['Action'],
        userRating: 3,
        averageRating: 3,
        poster: 'url',
        title: `Action ${i}`,
      });
    }
    // 1 Comedy movie
    films.push({
      genres: ['Comedy'],
      userRating: 3,
      averageRating: 3,
      poster: 'url',
      title: 'Comedy 1',
    });

    const stats = calculateGenreStats(films);
    const action = stats.find((s) => s.name === 'Action');

    expect(action.tag).toBeDefined();
    expect(action.tag.type).toBe('comfort_zone');
  });

  it('should assign True Love tag to high rated (>=4.0) and significant watch count (top 75%)', () => {
    const films = [];
    // Genre A: 4 films, 4.5 rating -> Top percentile (75%), not Comfort Zone (count <= 5)
    for (let i = 0; i < 4; i++) {
      films.push({ genres: ['GenreA'], userRating: 4.5, title: `A${i}` });
    }
    // Genre B: 3 films
    for (let i = 0; i < 3; i++) {
      films.push({ genres: ['GenreB'], userRating: 3, title: `B${i}` });
    }
    // Genre C: 2 films
    for (let i = 0; i < 2; i++) {
      films.push({ genres: ['GenreC'], userRating: 3, title: `C${i}` });
    }
    // Genre D: 1 film
    for (let i = 0; i < 1; i++) {
      films.push({ genres: ['GenreD'], userRating: 3, title: `D${i}` });
    }

    // Counts: [1, 2, 3, 4]
    // Genre A (4): Index 3. 3/4 = 75% -> True Love

    const stats = calculateGenreStats(films);
    const trueLove = stats.find((s) => s.name === 'GenreA');

    expect(trueLove.tag).toBeDefined();
    expect(trueLove.tag.type).toBe('true_love');
  });

  it('should assign Hidden Gem tag to high rated (>=4.0) and low watch count (bottom 10%)', () => {
    const films = [];
    // 9 genres with 10 films each.
    for (let g = 0; g < 9; g++) {
      for (let f = 0; f < 10; f++) {
        films.push({
          genres: [`Genre${g}`],
          userRating: 3,
          title: `G${g}F${f}`,
        });
      }
    }
    // 1 genre with 3 films (min is 3), rated 5.0
    for (let f = 0; f < 3; f++) {
      films.push({
        genres: ['HiddenGemGenre'],
        userRating: 5,
        title: `Hidden${f}`,
      });
    }

    const stats = calculateGenreStats(films);
    const hidden = stats.find((s) => s.name === 'HiddenGemGenre');

    expect(hidden.tag).toBeDefined();
    expect(hidden.tag.type).toBe('hidden_gem');
  });
});
