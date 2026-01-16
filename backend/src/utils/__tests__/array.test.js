import { describe, it, expect } from 'vitest';
import { shuffle } from '../array.js';

describe('shuffle', () => {
  describe('basic functionality', () => {
    it('returns an array with the same length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffle([...input]);

      expect(result).toHaveLength(input.length);
    });

    it('contains all original elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffle([...input]);

      expect(result.sort()).toEqual(input.sort());
    });

    it('modifies the array in place', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffle(input);

      expect(result).toBe(input); // Same reference
    });
  });

  describe('edge cases', () => {
    it('handles empty array', () => {
      const result = shuffle([]);

      expect(result).toEqual([]);
    });

    it('handles single element array', () => {
      const result = shuffle([42]);

      expect(result).toEqual([42]);
    });

    it('handles two element array', () => {
      const input = [1, 2];
      const result = shuffle([...input]);

      expect(result).toHaveLength(2);
      expect(result.sort()).toEqual([1, 2]);
    });
  });

  describe('randomness', () => {
    it('actually shuffles the array (not identity)', () => {
      // Run multiple times to verify shuffling occurs
      // With 10 elements, probability of no change is 1/10! ≈ 0.00003%
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let hasChanged = false;

      for (let i = 0; i < 10; i++) {
        const result = shuffle([...input]);
        if (JSON.stringify(result) !== JSON.stringify(input)) {
          hasChanged = true;
          break;
        }
      }

      expect(hasChanged).toBe(true);
    });
  });
});
