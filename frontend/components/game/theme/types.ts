export interface ThemeRound {
  id: string;
  themes: string[];
  userRating: number | null;
  genres: string[];
  correctMovie: {
    title: string;
    year: number;
    director: string;
    posterUrl: string;
  };
}
