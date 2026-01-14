import { useCallback } from "react";

/**
 * Pure function for distance-based scoring (for use outside React components).
 * Formula: score = pointsPerUnit × (1 - distance / maxDistance)
 */
export function calculateDistanceScore(
  distance: number,
  maxScore: number,
  maxDistance: number,
): number {
  if (maxDistance <= 0) return maxScore;
  const pointsPerUnit = maxScore / (maxDistance + 1);
  const normalizedDistance = Math.abs(distance) / maxDistance;
  const rawScore = pointsPerUnit * (1 - normalizedDistance);
  const clampedScore = Math.max(0, Math.min(pointsPerUnit, rawScore));
  return Math.round(clampedScore);
}

interface UseDistanceScoreProps {
  /** Maximum possible total score */
  maxScore: number;
  /** Maximum possible distance/error (e.g., itemCount-1 for ranking, 5.0 for ratings) */
  maxDistance: number;
}

interface DistanceScoreResult {
  /** Calculate score based on distance from correct answer */
  calculateScore: (distance: number) => number;
  /** Get the color string (HSL) for a given score */
  getScoreColor: (currentScore: number) => string;
  /** Maximum points possible per item/round */
  pointsPerUnit: number;
}

/**
 * Generic distance-based scoring hook.
 * Works for both ranking games (discrete positions) and rating games (continuous values).
 *
 * Formula: score = pointsPerUnit × (1 - distance / maxDistance)
 */
export const useDistanceScore = ({
  maxScore,
  maxDistance,
}: UseDistanceScoreProps): DistanceScoreResult => {
  // For ranking: pointsPerUnit = maxScore / itemCount
  // For rating: pointsPerUnit = maxScore / totalRounds
  // Since we don't know the "units" here, we derive from maxDistance
  // Actually, the caller should pass maxScore that represents their max total
  // and maxDistance that represents max error for ONE item/round
  const pointsPerUnit =
    maxDistance > 0 ? maxScore / (maxDistance + 1) : maxScore;

  const calculateScore = useCallback(
    (distance: number) => {
      if (maxDistance <= 0) return maxScore;

      // Normalize distance (0 to 1)
      const normalizedDistance = Math.abs(distance) / maxDistance;

      // Formula: pointsPerUnit * (1 - normalizedDistance)
      // Actually for full maxScore range: maxScore * (1 - normalizedDistance) / itemCount
      // Let's simplify: score per item = (maxScore/itemCount) * (1 - distance/(itemCount-1))

      // For rating game: score = 20 * (1 - diff/5)
      // For ranking game: score = 15 * (1 - distance/7)

      // Generic: score = pointsPerUnit * (1 - distance/maxDistance)
      const rawScore = pointsPerUnit * (1 - normalizedDistance);

      // Clamp and round
      const clampedScore = Math.max(0, Math.min(pointsPerUnit, rawScore));
      return Math.round(clampedScore);
    },
    [maxDistance, pointsPerUnit, maxScore],
  );

  const getScoreColor = useCallback(
    (currentScore: number) => {
      const ratio = maxScore > 0 ? currentScore / maxScore : 0;
      const GREEN_HUE = 120;
      const RED_HUE = 0;
      const hue = Math.min(GREEN_HUE, Math.max(RED_HUE, ratio * GREEN_HUE));
      return `hsl(${hue}, 70%, 35%)`;
    },
    [maxScore],
  );

  return {
    calculateScore,
    getScoreColor,
    pointsPerUnit,
  };
};

// Re-export old name for backwards compatibility during migration
export const useRankingScore = ({
  maxScore,
  itemCount,
}: {
  maxScore: number;
  itemCount: number;
}) => {
  const result = useDistanceScore({
    maxScore,
    maxDistance: itemCount - 1,
  });

  return {
    calculateItemScore: (userIndex: number, actualIndex: number) =>
      result.calculateScore(Math.abs(userIndex - actualIndex)),
    getScoreColor: result.getScoreColor,
    pointsPerItem: result.pointsPerUnit,
  };
};
