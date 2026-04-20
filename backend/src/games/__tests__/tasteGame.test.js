import { describe, it, expect } from 'vitest';
import { generateTasteGame } from '../tasteGame.js';

describe('TasteGame Logic (Normalized Relative Scaling)', () => {
  /**
   * TEST 1: BAĞIMSIZ ÖLÇEKLENDİRME (Independent Scaling)
   * Bu test, kullanıcının puan verme tarzından bağımsız olarak (cimri veya bonkör),
   * toplulukla olan "nispi" uyumunun nasıl hesaplandığını doğrular.
   *
   * Senaryo: Kullanıcı 4.0 ve 5.0 puan vermiş (aralık 1.0). Topluluk ise 3.0 ve 4.0 puan vermiş (aralık 1.0).
   * Her iki film de kendi dağılımlarında aynı "nispi" yerdedir (biri dipte, biri zirvede).
   * Bu durumda Sapma (Divergence) her ikisi için de 0 olmalıdır.
   */
  it('neutralizes rating styles by normalizing user and community scales independently', () => {
    const mockFilms = [
      {
        slug: 'film-a',
        ratingCount: 1000,
        averageRating: 3.0, // Topluluk Min (0.0 normalize)
        userRating: 4.0, // Kullanıcı Min (0.0 normalize)
      },
      {
        slug: 'film-b',
        ratingCount: 1000,
        averageRating: 4.0, // Topluluk Max (1.0 normalize)
        userRating: 5.0, // Kullanıcı Max (1.0 normalize)
      },
    ];

    const { movies } = generateTasteGame(mockFilms);

    // Film A: User(Min=0.0) vs Comm(Min=0.0) => Sapma 0
    const movieA = movies.find((m) => m.id === 'film-a');
    expect(movieA.divergence).toBeCloseTo(0);

    // Film B: User(Max=1.0) vs Comm(Max=1.0) => Sapma 0
    const movieB = movies.find((m) => m.id === 'film-b');
    expect(movieB.divergence).toBeCloseTo(0);
  });

  /**
   * TEST 2: DERİN SAPMA (Extreme Divergence)
   * Bir film senin listende "en iyisi" iken topluluk için "en kötüsü" ise
   * sapmanın 1.0 (maksimum) çıkması gerekir.
   */
  it('calculates maximum divergence when relative rankings are inverted', () => {
    const mockFilms = [
      {
        slug: 'my-favorite-their-worst',
        ratingCount: 1000,
        averageRating: 2.0, // Comm Min (0.0)
        userRating: 5.0, // User Max (1.0)
      },
      {
        slug: 'my-worst-their-favorite',
        ratingCount: 1000,
        averageRating: 4.5, // Comm Max (1.0)
        userRating: 1.0, // User Min (0.0)
      },
    ];

    const { movies } = generateTasteGame(mockFilms);

    // Her iki film de tam zıt kutuplarda olduğu için sapmaları 1.0 olmalı
    movies.forEach((m) => {
      expect(m.divergence).toBeCloseTo(1.0);
    });
  });

  /**
   * TEST 3: AĞIRLIKLANDIRMA (Centroid Weighting)
   * Puanı düşük olan filmlerin analiz merkezini (centroid) daha az etkilemesi gerekir.
   * Normalize edilmiş puan kullandığımız için, senin verdiğin "en düşük" puan
   * (0-5 ölçeğinde ne olursa olsun) merkeze en az katkıyı yapar.
   */
  it('gives more weight to highly rated films relative to the user set', () => {
    const mockFilms = [
      {
        slug: 'high-rated-niche',
        ratingCount: 100, // Niche
        averageRating: 3.5,
        userRating: 5.0, // Favorite (Weight ~1.1)
      },
      {
        slug: 'low-rated-popular',
        ratingCount: 1000000, // Popular
        averageRating: 4.0,
        userRating: 1.0, // Least favorite (Weight ~0.1)
      },
    ];

    const result = generateTasteGame(mockFilms);

    // Merkez noktası (centroid), popülerlik tarafında (niche olana) daha çok çekilmeli
    // çünkü favori filmimiz niche tarafta ve ağırlığı çok daha yüksek.
    expect(result.actualPopularity).toBeLessThan(0.3); // Niche olan 0'a yakın
  });

  /**
   * TEST 4: KORUMA MANTIKLARI (Defensive Logic)
   * Tek bir film veya tüm puanların aynı olması durumunda sıfıra bölme hatası yapmamalı.
   */
  it('handles datasets with identical ratings without division by zero', () => {
    const identicalFilms = [
      { slug: 'f1', ratingCount: 1000, averageRating: 3.5, userRating: 4.0 },
      { slug: 'f2', ratingCount: 1000, averageRating: 3.5, userRating: 4.0 },
    ];

    const result = generateTasteGame(identicalFilms);
    expect(result.actualAlignment).toBeDefined();
    expect(result.movies[0].divergence).toBe(0);
  });

  it('handles empty datasets gracefully', () => {
    const result = generateTasteGame([]);
    expect(result.movies).toEqual([]);
    expect(result.actualPopularity).toBe(0.5);
    expect(result.actualAlignment).toBe(0.5);
  });
});
