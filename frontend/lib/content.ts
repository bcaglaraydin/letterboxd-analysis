export const GAME_TEXT = {
  RATING_GAME: {
    INTRO: {
      PART_1:
        'To begin, you’ll see movies you’ve rated before. Your task is to guess the score you gave each one.',
      PART_2_PREFIX: 'If you score',
      PART_2_SUFFIX: '/100 or higher, we’ll unlock a deeper analysis of your rating behavior.',
      BUTTON: 'I understand',
      COMPLETION: 'Good',
    },
    INTERACTION: {
      PROMPT: 'What did you rate this movie?',
      BUTTON_REVEAL: 'Reveal Rating',
    },
  },
};

export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'Who is that?',
  GENERIC: 'Something went wrong. Please try again.',
  ANALYSIS_FAILED: 'Analysis failed',
};

export const API_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  PROFILE_PRIVATE: 'profile is private',
  NOT_FOUND_404: 'Request failed with status code 404',
};
