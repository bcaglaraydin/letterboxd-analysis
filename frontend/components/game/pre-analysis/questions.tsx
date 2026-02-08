import React from 'react';

export type QuestionType = 'philosophical' | 'technical' | 'absurd' | 'neutral';

export interface QuestionOption {
  id: string;
  text: string;
  scoreEffect: number; // Positive for correct, negative for wrong, 0 for neutral
}

export interface Question {
  id: string;
  text: React.ReactNode;
  type: QuestionType;
  options: QuestionOption[];
}

const PHILOSOPHICAL_SCORE = -15; // Always negative
const TECHNICAL_CORRECT_SCORE = 20;
const TECHNICAL_WRONG_SCORE = -10;
const ABSURD_SCORE = -50; // Harsh penalty for absurd math

export const questions: Question[] = [
  // 1) Philosophical Questions (NO correct answer — always negative)
  {
    id: 'phil-1',
    text: (
      <>
        What <span className="font-bold text-primary">fundamentally</span> makes an object a work of
        art?
      </>
    ),
    type: 'philosophical',
    options: [
      { id: 'a', text: 'The artist’s intention', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'b', text: 'The emotion it evokes in the viewer', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'c', text: 'Aesthetic value and formal mastery', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'd', text: 'Social recognition as “art”', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'e', text: 'Innovation or transformative impact', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'f', text: 'Art cannot be defined', scoreEffect: PHILOSOPHICAL_SCORE },
    ],
  },
  {
    id: 'phil-2',
    text: (
      <>
        What makes an action{' '}
        <span className="font-bold underline decoration-primary/50">morally right</span>?
      </>
    ),
    type: 'philosophical',
    options: [
      { id: 'a', text: 'Its consequences', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'b', text: 'The intention behind it', scoreEffect: PHILOSOPHICAL_SCORE },
    ],
  },
  {
    id: 'phil-3',
    text: (
      <>
        If human behavior is entirely determined by biology and environment,
        <br />
        can individuals still be{' '}
        <span className="font-bold text-red-500/80">morally responsible</span>?
      </>
    ),
    type: 'philosophical',
    options: [
      {
        id: 'a',
        text: 'Yes, responsibility is a social necessity',
        scoreEffect: PHILOSOPHICAL_SCORE,
      },
      {
        id: 'b',
        text: 'No, without free will there is no responsibility',
        scoreEffect: PHILOSOPHICAL_SCORE,
      },
      {
        id: 'c',
        text: 'Yes, because people still experience choice',
        scoreEffect: PHILOSOPHICAL_SCORE,
      },
      { id: 'd', text: 'The premise itself is flawed', scoreEffect: PHILOSOPHICAL_SCORE },
    ],
  },
  {
    id: 'phil-4',
    text: (
      <>
        Can a state <span className="italic font-bold">restrict individual freedoms</span> to
        protect the majority?
      </>
    ),
    type: 'philosophical',
    options: [
      {
        id: 'a',
        text: 'Yes, public good outweighs individual liberty',
        scoreEffect: PHILOSOPHICAL_SCORE,
      },
      { id: 'b', text: 'No, individual rights are inviolable', scoreEffect: PHILOSOPHICAL_SCORE },
    ],
  },
  {
    id: 'phil-5',
    text: (
      <>
        Can large social inequalities be accepted as a{' '}
        <span className="font-bold">natural outcome</span> of a system?
      </>
    ),
    type: 'philosophical',
    options: [
      {
        id: 'a',
        text: 'Yes, competition inevitably creates inequality',
        scoreEffect: PHILOSOPHICAL_SCORE,
      },
      { id: 'b', text: 'No, this indicates systemic failure', scoreEffect: PHILOSOPHICAL_SCORE },
      {
        id: 'c',
        text: 'The real issue is inequality of opportunity',
        scoreEffect: PHILOSOPHICAL_SCORE,
      },
      { id: 'd', text: 'Yes, but the state should correct it', scoreEffect: PHILOSOPHICAL_SCORE },
    ],
  },
  {
    id: 'phil-6',
    text: (
      <>
        Can ethical boundaries be crossed for{' '}
        <span className="font-mono text-primary font-bold">scientific progress</span>?
      </>
    ),
    type: 'philosophical',
    options: [
      { id: 'a', text: 'Yes, long-term benefit matters more', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'b', text: 'No, ethical limits are absolute', scoreEffect: PHILOSOPHICAL_SCORE },
      { id: 'c', text: 'The real issue is who decides', scoreEffect: PHILOSOPHICAL_SCORE },
    ],
  },

  // 2) Technical / Logic Questions (DO have correct answers — normal scoring)
  {
    id: 'tech-1',
    text: (
      <>
        When the{' '}
        <span className="font-mono text-sm bg-muted/20 px-1 rounded">
          renin–angiotensin–aldosterone system (RAAS)
        </span>{' '}
        is activated, through which mechanism does blood pressure increase?
      </>
    ),
    type: 'technical',
    options: [
      { id: 'a', text: 'Vasodilation of afferent arterioles', scoreEffect: TECHNICAL_WRONG_SCORE },
      {
        id: 'b',
        text: 'Vasoconstriction and increased sodium retention',
        scoreEffect: TECHNICAL_CORRECT_SCORE,
      }, // Correct
      { id: 'c', text: 'Decreased cardiac output', scoreEffect: TECHNICAL_WRONG_SCORE },
      {
        id: 'd',
        text: 'Inhibition of antidiuretic hormone (ADH)',
        scoreEffect: TECHNICAL_WRONG_SCORE,
      },
    ],
  },
  {
    id: 'tech-2',
    text: (
      <>
        If a <span className="font-bold">Turing machine</span> attempts to run a halting algorithm
        for a general decision problem, which statement is true?
      </>
    ),
    type: 'technical',
    options: [
      {
        id: 'a',
        text: 'It will always find a solution in polynomial time',
        scoreEffect: TECHNICAL_WRONG_SCORE,
      },
      {
        id: 'b',
        text: 'It contradicts the undecidability of the Halting Problem',
        scoreEffect: TECHNICAL_CORRECT_SCORE,
      }, // Correct
      {
        id: 'c',
        text: 'It requires quantum superposition to resolve',
        scoreEffect: TECHNICAL_WRONG_SCORE,
      },
      {
        id: 'd',
        text: 'It acts as a non-deterministic finite automaton',
        scoreEffect: TECHNICAL_WRONG_SCORE,
      },
    ],
  },
  {
    id: 'tech-3',
    text: (
      <>
        In tonal harmony, what is the typical function of the{' '}
        <span className="italic font-bold">tritone interval</span>?
      </>
    ),
    type: 'technical',
    options: [
      {
        id: 'a',
        text: 'Resolution to a perfect fifth or third',
        scoreEffect: TECHNICAL_CORRECT_SCORE,
      }, // Correct (creating tension that resolves)
      { id: 'b', text: 'Establishing stability in the tonic', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'c', text: 'Doubling the root of the chord', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'd', text: 'Replacing the leading tone', scoreEffect: TECHNICAL_WRONG_SCORE },
    ],
  },
  {
    id: 'tech-4',
    text: (
      <>
        In the <span className="font-mono font-bold">TCP three-way handshake</span>, which sequence
        is correct?
      </>
    ),
    type: 'technical',
    options: [
      { id: 'a', text: 'SYN → ACK → SYN-ACK', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'b', text: 'SYN → SYN-ACK → ACK', scoreEffect: TECHNICAL_CORRECT_SCORE }, // Correct
      { id: 'c', text: 'ACK → SYN → FIN', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'd', text: 'SYN → FIN → ACK', scoreEffect: TECHNICAL_WRONG_SCORE },
    ],
  },
  {
    id: 'tech-5',
    text: (
      <>
        Three inhabitants A, B, and C live on an island. Some always tell the truth, others always
        lie.
        <div className="my-4 p-4 border rounded-lg bg-card/50 text-base font-mono space-y-2 text-left w-full max-w-sm mx-auto">
          <div>A: "B is not a liar."</div>
          <div>B: "C tells the truth."</div>
          <div>C: "A and B are of the same type."</div>
        </div>
        Assuming all statements are logically consistent, which must be true?
      </>
    ),
    type: 'technical',
    options: [
      { id: 'a', text: 'A tells the truth', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'b', text: 'B is a liar', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'c', text: 'C tells the truth', scoreEffect: TECHNICAL_CORRECT_SCORE }, // Logic puzzle solution
      { id: 'd', text: 'A and B are the same type', scoreEffect: TECHNICAL_WRONG_SCORE },
      { id: 'e', text: 'The statements are inconsistent', scoreEffect: TECHNICAL_WRONG_SCORE },
    ],
  },

  // 3) Absurd Math Question (NO correct answer)
  {
    id: 'absurd-1',
    text: (
      <>
        421 − 85 = <span className="text-4xl md:text-5xl font-bold ml-2 text-primary">?</span>
      </>
    ),
    type: 'absurd',
    options: [
      { id: 'a', text: '334', scoreEffect: ABSURD_SCORE }, // Wrong (Actual 336)
      { id: 'b', text: '348', scoreEffect: ABSURD_SCORE },
      { id: 'c', text: '2', scoreEffect: ABSURD_SCORE },
      { id: 'd', text: '421', scoreEffect: ABSURD_SCORE },
    ],
  },

  // 4) Neutral Question (No score change -> HARSH penalty)
  {
    id: 'neutral-1',
    text: (
      <>
        Is everything going <span className="font-bold italic">well</span>?
      </>
    ),
    type: 'neutral',
    options: [
      { id: 'a', text: 'Yes', scoreEffect: -50 },
      { id: 'b', text: 'I didn’t sign up for this', scoreEffect: -50 },
    ],
  },
];
