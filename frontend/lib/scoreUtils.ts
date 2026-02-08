/**
 * Calculates a color based on a score value relative to a range.
 * Uses a split spectrum logic to maximize contrast between positive and negative values.
 *
 * @param points - The score value to colorize
 * @param maxPositivePoint - The maximum positive score (defines green intensity)
 * @param maxNegativePoint - The maximum negative score/penalty (defines red intensity)
 * @returns CSS color string (hsl)
 */
export const getScoreColor = (
  points: number,
  maxPositivePoint: number = 100,
  _maxNegativePoint: number = -100,
): { color: string } => {
  if (points >= 0) {
    // Positive: Map [0, maxPositive] to [Hue 0, 120] (Red -> Green)
    const max = maxPositivePoint > 0 ? maxPositivePoint : 100;
    // Clamp to ensure we don't exceed bounds
    const ratio = Math.min(1, Math.max(0, points / max));

    const hue = ratio * 120; // 0 (Red) to 120 (Green)
    return { color: `hsl(${hue}, 85%, 45%)` };
  } else {
    // Negative: Map [maxNegative, 0] to [Hue 0 (Red)]
    // For now, keeping negative as Red to match "Zero is Red" continuity
    return { color: `hsl(0, 85%, 45%)` };
  }
};
