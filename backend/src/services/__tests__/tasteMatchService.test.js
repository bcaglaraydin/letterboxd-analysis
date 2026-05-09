import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSoulmates } from '../tasteMatchService.js';
import * as browserUtils from '../../utils/browser.js';

vi.mock('../../utils/browser.js');

describe('tasteMatchService', () => {
  const mockUsername = 'testuser';

  const mockSearchHtmlA = `<html><body><div class="results"><div class="person-summary"><a href="/userA/" class="name">User A</a><img src="avatarA.jpg"></div></div></body></html>`;
  const mockSearchHtmlB = `<html><body><div class="results"><div class="person-summary"><a href="/userB/" class="name">User B</a><img src="avatarB.jpg"></div></div></body></html>`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSoulmates', () => {
    it('should aggregate unique matches from multiple combinations at the same level', async () => {
      // 4 film veriyoruz, seviye 4'te kimseyi bulamasın (null dönsün)
      // Seviye 3'te ise 4 kombinasyon var. Her kombinasyon farklı birini bulsun.
      vi.mocked(browserUtils.fetchHtmlWithBrowser)
        .mockResolvedValueOnce('<html><body><div class="results"></div></body></html>') // Level 4 (0 results)
        .mockResolvedValueOnce(mockSearchHtmlA) // Level 3 Combo 1 (User A)
        .mockResolvedValueOnce(mockSearchHtmlB) // Level 3 Combo 2 (User B)
        .mockResolvedValueOnce(mockSearchHtmlA) // Level 3 Combo 3 (User A again)
        .mockResolvedValueOnce(mockSearchHtmlB); // Level 3 Combo 4 (User B)

      const result = await fetchSoulmates(mockUsername, ['f1', 'f2', 'f3', 'f4']);

      // Level 3'te sonuç bulduğu için Level 2'ye hiç geçmemeli
      // Level 4 (1 call) + Level 3 (4 combos) = 5 total calls
      expect(browserUtils.fetchHtmlWithBrowser).toHaveBeenCalledTimes(5);

      expect(result.matches).toHaveLength(2); // Unique: User A and User B
      expect(result.matchCount).toBe(3);
    });

    it('should stop and return higher level matches immediately if found', async () => {
      // Level 4'te sonuç bulursa diğer seviyelere bakmamalı
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockResolvedValueOnce(mockSearchHtmlA);

      const result = await fetchSoulmates(mockUsername, ['f1', 'f2', 'f3', 'f4']);

      expect(result.matchCount).toBe(4);
      expect(result.matches).toHaveLength(1);
      expect(browserUtils.fetchHtmlWithBrowser).toHaveBeenCalledTimes(1);
    });

    it('should exclude the user themselves from results', async () => {
      const mockSearchWithSelf = `
        <html><body><div class="results">
          <div class="person-summary"><a href="/testuser/" class="name">Me</a></div>
          <div class="person-summary"><a href="/other-user/" class="name">Other</a></div>
        </div></body></html>
      `;
      vi.mocked(browserUtils.fetchHtmlWithBrowser).mockResolvedValueOnce(mockSearchWithSelf);

      const result = await fetchSoulmates(mockUsername, ['f1', 'f2']);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].name).toBe('Other');
    });
  });
});
