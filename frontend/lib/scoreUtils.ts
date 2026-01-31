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
  maxNegativePoint: number = -100,
): { color: string } => {
  // Zero is yellow
  if (points === 0) return { color: `hsl(60, 85%, 45%)` };

  if (points > 0) {
    // Positive: Map [0, maxPositive] to [Hue 85, 120] (Greenish -> Green)
    const max = maxPositivePoint > 0 ? maxPositivePoint : 100;
    // Clamp to ensure we don't exceed bounds
    const ratio = Math.min(1, Math.max(0, points / max));

    const hue = 85 + ratio * 35; // 85 to 120
    return { color: `hsl(${hue}, 85%, 45%)` };
  } else {
    // Negative: Map [maxNegative, 0] to [Hue 0, 35] (Red -> Orange)
    const min = maxNegativePoint < 0 ? maxNegativePoint : -100;

    // Calculate severity ratio: 1 = max penalty (points == min), 0 = no penalty
    const ratio = Math.min(1, Math.max(0, points / min));

    // Map ratio 1 -> Hue 0 (Red), Ratio 0 -> Hue 35 (Orange)
    const hue = 35 * (1 - ratio);
    return { color: `hsl(${hue}, 85%, 45%)` };
  }
};
