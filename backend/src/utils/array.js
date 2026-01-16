/**
 * Fisher-Yates shuffle for unbiased randomization.
 * @param {Array} array - Array to shuffle in place.
 * @returns {Array} - The shuffled array.
 */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
