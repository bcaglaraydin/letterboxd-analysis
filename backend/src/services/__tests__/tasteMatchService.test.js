import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTasteMatches } from '../tasteMatchService.js';
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
            <div class="poster-container">
              <img src="fav1-1.jpg" alt="Film 1">
              <img src="fav1-2.jpg" alt="Film 2">
            </div>
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

  it('should extract user favorites and fetch matching members', async () => {
    vi.mocked(browserUtils.fetchHtmlWithBrowser)
      .mockResolvedValueOnce(mockProfileHtml) // First call for profile
      .mockResolvedValueOnce(mockSearchHtml); // Second call for search

    const result = await fetchTasteMatches(mockUsername);

    expect(result.userFavorites).toHaveLength(2);
    expect(result.userFavorites[0]).toEqual({
      slug: 'parasite',
      posterUrl: 'parasite-poster.jpg',
      title: 'Parasite',
    });

    expect(result.matches).toHaveLength(1); // Should exclude self
    expect(result.matches[0].name).toBe('Soulmate One');
    expect(result.matches[0].favorites).toHaveLength(2);
    expect(result.matches[0].favorites[0]).toEqual({
      title: 'Film 1',
      posterUrl: 'fav1-1.jpg',
    });
    expect(result.matchCount).toBe(2);
  });

  it('should return empty result if no favorites found', async () => {
    vi.mocked(browserUtils.fetchHtmlWithBrowser).mockResolvedValueOnce(
      '<html><body></body></html>'
    );

    const result = await fetchTasteMatches(mockUsername);

    expect(result.userFavorites).toHaveLength(0);
    expect(result.matches).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });
});
