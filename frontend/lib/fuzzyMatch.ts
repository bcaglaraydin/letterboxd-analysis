/**
 * Normalizes text for better matching:
 * - Lowercase
 * - Replaces '&' with 'and'
 * - Converts numbers (2 -> two) *basic implementation for common cases*
 * - Removes special characters
 * - Trims whitespace
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b1\b/g, 'one')
    .replace(/\b2\b/g, 'two')
    .replace(/\b3\b/g, 'three')
    .replace(/\b4\b/g, 'four')
    .replace(/\b5\b/g, 'five')
    .replace(/\b6\b/g, 'six')
    .replace(/\b7\b/g, 'seven')
    .replace(/\b8\b/g, 'eight')
    .replace(/\b9\b/g, 'nine')
    .replace(/\b10\b/g, 'ten')
    .replace(/[^a-z0-9\s]/g, '') // Keep spaces for tokenization
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Levenshtein Distance between two strings.
 * Returns the number of edits (insert, delete, sub) needed to transform a into b.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          ),
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if the user's guess fuzzy matches the correct title.
 * Strategy: Level 3 (High Tolerance / Intent Matching)
 */
export function isFuzzyMatch(userGuess: string, correctTitle: string): boolean {
  if (!userGuess || !correctTitle) return false;

  const normalizedGuess = normalize(userGuess);
  const normalizedTarget = normalize(correctTitle);

  // 1. Exact Match (after normalization)
  if (normalizedGuess === normalizedTarget) return true;

  // 2. Subtitle Check (e.g., "Infinity War" matches "Avengers: Infinity War")
  // If the guess is a significant substring of the target (at least 40% length)
  if (
    normalizedTarget.includes(normalizedGuess) &&
    normalizedGuess.length > normalizedTarget.length * 0.4 &&
    normalizedGuess.length >= 4
  ) {
    return true;
  }

  // 3. Token Overlap (Intent Matching)
  const guessTokens = normalizedGuess
    .split(' ')
    .filter((t) => t.length > 2 && !['the', 'and', 'for', 'of'].includes(t));
  const targetTokens = normalizedTarget
    .split(' ')
    .filter((t) => t.length > 2 && !['the', 'and', 'for', 'of'].includes(t));

  if (targetTokens.length > 0 && guessTokens.length > 0) {
    let matchedTokens = 0;

    for (const gToken of guessTokens) {
      // Find best match for this guess token in target tokens
      const bestTokenMatch = targetTokens.reduce((best, tToken) => {
        const dist = levenshteinDistance(gToken, tToken);
        // Allow 1 edit for short words (4-5 chars), 2 for long (6+)
        const allowedEdits = tToken.length > 5 ? 2 : 1;
        if (dist <= allowedEdits) return true;
        return best;
      }, false);

      if (bestTokenMatch) matchedTokens++;
    }

    // If users matched at least 75% of the *significant* words in the title
    // Example: "Lord Rings" (2 tokens) vs "Lord of the Rings" (2 tokens) -> 2/2 -> 100%
    const matchRatio = matchedTokens / targetTokens.length;
    if (matchRatio >= 0.75) return true;
  }

  // 4. Fallback: Levenshtein Ratio for the whole string (for short titles like "Jaws" or "Seven")
  // Allow ~20% error rate roughly (e.g. 2 edits in a 10 char string)
  const dist = levenshteinDistance(normalizedGuess, normalizedTarget);
  const maxLength = Math.max(normalizedGuess.length, normalizedTarget.length);
  const similarity = 1 - dist / maxLength;

  return similarity >= 0.8;
}
