'use client';

import React from 'react';
import { GameDialogue } from '@/components/game/shared/GameDialogue';

interface GenreMatchingIntroProps {
  onComplete: () => void;
}

export const GenreMatchingIntro: React.FC<GenreMatchingIntroProps> = ({ onComplete }) => {
  return (
    <GameDialogue
      messages={[
        <p key="msg1">Next up is the part I struggled with the most while building.</p>,
        <p key="msg2">
          I want you to{' '}
          <span className="font-bold">correctly guess the genres of the movie shown.</span>
        </p>,
        <p key="msg3">
          Some genres are more <span className="font-bold">niche</span> and correctly guessing them
          earns you <span className="font-bold text-green-500">more points.</span>
        </p>,
        <p key="msg4">
          Missing a genre or guessing wrong genres will give you a slight{' '}
          <span className="font-bold text-red-500">negative penalty</span>
        </p>,
      ]}
      buttonText="I got this"
      onComplete={onComplete}
    />
  );
};
