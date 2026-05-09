import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFavoriteSlugs, fetchSoulmates } from '../tasteMatchService.js';
import * as browserUtils from '../../utils/browser.js';

vi.mock('../../utils/browser.js');

describe('tasteMatchService', () => {
  const mockUsername = 'testuser';

  const mockProfileHtml = `
    <html>
      <body>
        <section id="favourites">
          <div class="react-component" data-component-class="LazyPoster" data-item-slug="parasite">
            <img src="parasite-poster.jpg" alt="Parasite">
          </div>
          <div class="react-component" data-component-class="LazyPoster" data-item-slug="the-godfather">
            <img src="godfather-poster.jpg" alt="The Godfather">
          </div>
        </section>
      </body>
    </html>
  `;

  const mockSearchHtml = `
    <html>
      <body>
        <div class="results">
          <div class="person-summary">
            <a href="/soulmate1/" class="name">Soulmate One</a>
            <img src="avatar1.jpg" class="avatar">
          </div>
          <div class="person-summary">
            <a href="/testuser/" class="name">Test User</a>
            <img src="avatar-self.jpg">
          </div>
        </div>
      </body>
    </html>
  `;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchFavoriteSlugs', () => {
    it('should extract favorite slugs from profile', async () => {
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockResolvedValueOnce(mockProfileHtml);

      const slugs = await fetchFavoriteSlugs(mockUsername);

      expect(slugs).toEqual(['parasite', 'the-godfather']);
    });

    it('should return empty array if no favorites found', async () => {
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockResolvedValueOnce(
        '<html><body></body></html>'
      );

      const slugs = await fetchFavoriteSlugs(mockUsername);

      expect(slugs).toHaveLength(0);
    });

    it('should return empty array on error', async () => {
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockRejectedValueOnce(new Error('Network'));

      const slugs = await fetchFavoriteSlugs(mockUsername);

      expect(slugs).toHaveLength(0);
    });
  });

  describe('fetchSoulmates', () => {
    it('should fetch matching members excluding self', async () => {
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockResolvedValueOnce(mockSearchHtml);

      const result = await fetchSoulmates(mockUsername, ['parasite', 'the-godfather']);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].name).toBe('Soulmate One');
      expect(result.matches[0]).not.toHaveProperty('favorites');
      expect(result.matchCount).toBe(2);
    });

    it('should return empty result if no slugs provided', async () => {
      const result = await fetchSoulmates(mockUsername, []);

      expect(result.matches).toHaveLength(0);
      expect(result.matchCount).toBe(0);
    });

    it('should return empty result on search error', async () => {
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockRejectedValueOnce(new Error('Search'));

      const result = await fetchSoulmates(mockUsername, ['parasite', 'the-godfather']);

      expect(result.matches).toHaveLength(0);
      expect(result.matchCount).toBe(0);
    });
  });
});
