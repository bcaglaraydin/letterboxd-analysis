import { useCallback } from "react";

interface UseRankingScoreProps {
  maxScore: number;
  itemCount: number;
}

interface ScoreResult {
  /** Calculate score for a single item based on its position */
  calculateItemScore: (userIndex: number, actualIndex: number) => number;
  /** Get the color string (HSL) for a given total score */
  getScoreColor: (currentScore: number) => string;
  /** Maximum points possible per item */
  pointsPerItem: number;
}

export const useRankingScore = ({
  maxScore,
  itemCount,
}: UseRankingScoreProps): ScoreResult => {
  const pointsPerItem = maxScore / itemCount;

  const calculateItemScore = useCallback(
    (userIndex: number, actualIndex: number) => {
      // Avoid division by zero for single item lists (though unlikely in a game)
      if (itemCount <= 1) return pointsPerItem;

      const distance = Math.abs(userIndex - actualIndex);
      const maxDistance = itemCount - 1;

      // Normalized distance (0 to 1)
      // 0 means perfect match (distance 0)
      // 1 means maximum error (distance n-1)
      const normalizedDistance = distance / maxDistance;

      // Formula: pointsPerItem * (1 - normalizedDistance)
      const rawScore = pointsPerItem * (1 - normalizedDistance);

      // Clamp and round
      // Clamp between 0 and pointsPerItem to ensure validity
      const clampedScore = Math.max(0, Math.min(pointsPerItem, rawScore));

      // Round to nearest integer for UI clarity
      return Math.round(clampedScore);
    },
    [itemCount, pointsPerItem],
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
    calculateItemScore,
    getScoreColor,
    pointsPerItem,
  };
};
