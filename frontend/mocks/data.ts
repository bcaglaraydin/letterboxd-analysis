import { MetricsResponse, GenreStat, ThemeGameRound } from '../lib/api';
import { Genre, Film } from '../components/game/genre/genre-matching/types';

// ============================================================================
// THEME GUESSING GAME MOCK DATA
// ============================================================================

export const MOCK_RATING_MOVIES = [
  {
    movieId: 'mock-1',
    title: 'The Godfather',
    director: 'Francis Ford Coppola',
    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    userRating: 10,
    communityRating: 9.2,
    releaseYear: '1972',
    runtimeMinutes: 175,
  },
  {
    movieId: 'mock-2',
    title: 'Spirited Away',
    director: 'Hayao Miyazaki',
    poster: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUKGxwbuFf76.jpg',
    userRating: 9,
    communityRating: 8.5,
    releaseYear: '2001',
    runtimeMinutes: 125,
  },
  {
    movieId: 'mock-3',
    title: 'Parasite',
    director: 'Bong Joon-ho',
    poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    userRating: 8,
    communityRating: 8.5,
    releaseYear: '2019',
    runtimeMinutes: 132,
  },
];

export const MOCK_THEME_ROUNDS: ThemeGameRound[] = [
  {
    id: 'theme-1',
    themes: [
      'Intense violence and sexual transgression',
      'Humanity and the world around us',
      'Twisted dark psychological thriller',
      'Heartbreaking and moving family drama',
      'Heartfelt and sentimental family stories',
      'Enduring stories of family and marital drama',
      'Intense political and terrorist thrillers',
    ],
    userRating: 4.5,
    genres: ['Thriller', 'Comedy', 'Drama'],
    correctMovie: {
      title: 'Parasite',
      year: 2019,
      director: 'Bong Joon Ho',
      posterUrl:
        'https://a.ltrbxd.com/resized/film-poster/4/2/6/4/0/6/426406-parasite-0-230-0-345-crop.jpg?v=8f5653f710',
    },
  },
  {
    id: 'theme-2',
    themes: [
      'Moving relationship stories',
      'Humanity and the world around us',
      'Surreal and thought-provoking visions of life and death',
      'Powerful stories of heartbreak and suffering',
      'Emotional and captivating fantasy storytelling',
      'Tragic sadness and captivating beauty',
      'Captivating relationships and charming romance',
    ],
    userRating: null,
    genres: ['Drama'],
    correctMovie: {
      title: 'Drive My Car',
      year: 2021,
      director: 'Ryusuke Hamaguchi',
      posterUrl:
        'https://a.ltrbxd.com/resized/film-poster/6/7/9/2/9/1/679291-drive-my-car-0-230-0-345-crop.jpg?v=9e1f7c9f35',
    },
  },
  {
    id: 'theme-3',
    themes: [
      'Thrillers and murder mysteries',
      'Crime, drugs and gangsters',
      'Gripping, intense violent crime',
      'Suspenseful crime thrillers',
      'Racism and the powerful fight for justice',
      'Intense political and terrorist thrillers',
      'Violent crime and drugs',
    ],
    userRating: 4,
    genres: ['Crime', 'History', 'Drama'],
    correctMovie: {
      title: 'Killers of the Flower Moon',
      year: 2023,
      director: 'Martin Scorsese',
      posterUrl:
        'https://a.ltrbxd.com/resized/film-poster/3/9/8/0/0/9/398009-killers-of-the-flower-moon-0-230-0-345-crop.jpg?v=49b577149d',
    },
  },
  {
    id: 'theme-4',
    themes: [
      'Crude humor and satire',
      'Intense violence and sexual transgression',
      'Humanity and the world around us',
      'Epic history and literature',
      'Lavish dramas and sumptuous royalty',
      'Challenging or sexual themes & twists',
      'Funny jokes and crude humor',
      'Captivating vision and Shakespearean drama',
      'Dreamlike, quirky, and surreal storytelling',
    ],
    userRating: 4,
    genres: ['Drama', 'Comedy', 'History'],
    correctMovie: {
      title: 'The Favourite',
      year: 2018,
      director: 'Yorgos Lanthimos',
      posterUrl:
        'https://a.ltrbxd.com/resized/film-poster/3/1/0/7/0/5/310705-the-favourite-0-230-0-345-crop.jpg?v=c5488e37ef',
    },
  },
  {
    id: 'theme-5',
    themes: [
      'Humanity and the world around us',
      'Intense violence and sexual transgression',
      'Challenging or sexual themes & twists',
      'Surreal and thought-provoking visions of life and death',
      'Dreamlike, quirky, and surreal storytelling',
      'Erotic relationships and desire',
      'Emotional and captivating fantasy storytelling',
    ],
    userRating: 4.5,
    genres: ['Romance', 'Science Fiction', 'Comedy'],
    correctMovie: {
      title: 'Poor Things',
      year: 2023,
      director: 'Yorgos Lanthimos',
      posterUrl:
        'https://a.ltrbxd.com/resized/film-poster/7/1/0/3/5/2/710352-poor-things-0-230-0-345-crop.jpg?v=a0f2ee9a0e',
    },
  },
];

// ============================================================================
// GENRE MATCHING GAME MOCK DATA
// ============================================================================

export const MOCK_MATCHING_GENRES: Genre[] = [
  // Niche tier (high reward)
  { id: 'noir', name: 'Film Noir', tier: 'niche' },
  { id: 'mumblecore', name: 'Mumblecore', tier: 'niche' },
  { id: 'avant-garde', name: 'Avant-Garde', tier: 'niche' },
  { id: 'neo-noir', name: 'Neo-Noir', tier: 'niche' },
  { id: 'giallo', name: 'Giallo', tier: 'niche' },

  // Mid-tier (medium reward)
  { id: 'thriller', name: 'Thriller', tier: 'mid-tier' },
  { id: 'mystery', name: 'Mystery', tier: 'mid-tier' },
  { id: 'romance', name: 'Romance', tier: 'mid-tier' },
  { id: 'crime', name: 'Crime', tier: 'mid-tier' },
  { id: 'war', name: 'War', tier: 'mid-tier' },
  { id: 'western', name: 'Western', tier: 'mid-tier' },

  // Popular tier (low reward but safer)
  { id: 'drama', name: 'Drama', tier: 'popular' },
  { id: 'comedy', name: 'Comedy', tier: 'popular' },
  { id: 'action', name: 'Action', tier: 'popular' },
  { id: 'horror', name: 'Horror', tier: 'popular' },
  { id: 'scifi', name: 'Sci-Fi', tier: 'popular' },
  { id: 'animation', name: 'Animation', tier: 'popular' },
];

export const MOCK_MATCHING_FILMS: Film[] = [
  {
    id: 'film-1',
    title: 'Blade Runner 2049',
    year: 2017,
    director: 'Denis Villeneuve',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    correctGenres: ['scifi', 'drama', 'mystery', 'neo-noir'],
  },
  {
    id: 'film-2',
    title: 'Parasite',
    year: 2019,
    director: 'Bong Joon-ho',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    correctGenres: ['drama', 'thriller', 'comedy', 'crime'],
  },
  {
    id: 'film-3',
    title: 'The Grand Budapest Hotel',
    year: 2014,
    director: 'Wes Anderson',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    correctGenres: ['comedy', 'drama', 'crime', 'mystery'],
  },
  {
    id: 'film-4',
    title: 'Drive',
    year: 2011,
    director: 'Nicolas Winding Refn',
    posterUrl: 'https://image.tmdb.org/t/p/w500/602vevIURmpDfzbnv5Ubi6wIkQm.jpg',
    correctGenres: ['crime', 'drama', 'thriller', 'neo-noir'],
  },
  {
    id: 'film-5',
    title: 'Spider-Man: Into the Spider-Verse',
    year: 2018,
    director: 'Bob Persichetti',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    correctGenres: ['animation', 'action', 'scifi', 'comedy'],
  },
];

// ============================================================================
// VISUALIZATIONS & STATS MOCK DATA
// ============================================================================

export const MOCK_GENRE_STATS: GenreStat[] = [
  {
    id: 'horror',
    name: 'Horror',
    userAvgRating: 4.2,
    communityAvgRating: 2.8,
    userWatchCount: 120,
    exampleMovies: [
      {
        title: 'The Thing',
        posterUrl: 'https://image.tmdb.org/t/p/w500/tzGY49kseSE9QAKk47uuDGwnSCu.jpg',
      },
      {
        title: 'Hereditary',
        posterUrl: 'https://image.tmdb.org/t/p/w500/lHu1r1ltIdnUoGIpZJW6P2eE1eI.jpg',
      },
      {
        title: 'Alien',
        posterUrl: 'https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg',
      },
      {
        title: 'Psycho',
        posterUrl: 'https://image.tmdb.org/t/p/w500/81d8zuZWonE1LPxN5vS1v7v5c08.jpg',
      },
      {
        title: 'Get Out',
        posterUrl: 'https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfWD24NvqHezc.jpg',
      },
    ],
    tag: { type: 'true_love', label: 'True Love' },
  },
  {
    id: 'romance',
    name: 'Romance',
    userAvgRating: 2.1,
    communityAvgRating: 3.5,
    userWatchCount: 15,
    exampleMovies: [
      {
        title: 'Titanic',
        posterUrl: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
      },
      {
        title: 'The Notebook',
        posterUrl: 'https://image.tmdb.org/t/p/w500/rNzQy54gFcgaPu11MGnJDpn1DfJ.jpg',
      },
      {
        title: 'La La Land',
        posterUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWz7xHl4y7c97n6ghH6.jpg',
      },
      {
        title: 'Pride & Prejudice',
        posterUrl: 'https://image.tmdb.org/t/p/w500/s1c1dD8uC0d21Z3G5A5G2x1H5k.jpg',
      },
      {
        title: 'Before Sunrise',
        posterUrl: 'https://image.tmdb.org/t/p/w500/s1c1dD8uC0d21Z3G5A5G2x1H5k.jpg',
      },
    ],
  },
  {
    id: 'scifi',
    name: 'Science Fiction',
    userAvgRating: 3.8,
    communityAvgRating: 3.7,
    userWatchCount: 95,
    exampleMovies: [
      {
        title: 'Blade Runner 2049',
        posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
      },
      {
        title: 'Inception',
        posterUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      },
      {
        title: 'Interstellar',
        posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      },
      {
        title: 'Arrival',
        posterUrl: 'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63C3cRpumk9xJ7.jpg',
      },
      {
        title: 'Ex Machina',
        posterUrl: 'https://image.tmdb.org/t/p/w500/m1b9d1S5G6gK2j5k5l5g5G5j5.jpg',
      },
    ],
  },
  {
    id: 'action',
    name: 'Action',
    userAvgRating: 3.0,
    communityAvgRating: 3.2,
    userWatchCount: 40,
    exampleMovies: [
      {
        title: 'Mad Max: Fury Road',
        posterUrl: 'https://image.tmdb.org/t/p/w500/8tZYtuWezpScHowardtvqYNYAAg.jpg',
      },
      {
        title: 'John Wick',
        posterUrl: 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg',
      },
      {
        title: 'Die Hard',
        posterUrl: 'https://image.tmdb.org/t/p/w500/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg',
      },
      {
        title: 'The Matrix',
        posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      },
      {
        title: 'Gladiator',
        posterUrl: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
      },
    ],
  },
  {
    id: 'documentary',
    name: 'Documentary',
    userAvgRating: 4.5,
    tag: { type: 'hidden_gem', label: 'Hidden Gem' },
    communityAvgRating: 4.0,
    userWatchCount: 10,
    exampleMovies: [
      {
        title: 'Free Solo',
        posterUrl: 'https://image.tmdb.org/t/p/w500/v4QfYZMACODlWul9do59Pn6Jl7C.jpg',
      },
      {
        title: "Won't You Be My Neighbor?",
        posterUrl: 'https://image.tmdb.org/t/p/w500/l3K1b42z33XW8gM0r8HMEv4xM3u.jpg',
      },
      {
        title: '13th',
        posterUrl: 'https://image.tmdb.org/t/p/w500/tc1O68qK4E9mC0fBdGgKx2E7r4.jpg',
      },
      {
        title: 'My Octopus Teacher',
        posterUrl: 'https://image.tmdb.org/t/p/w500/2f1b4h3H3l3g3g3g3g3g3g3g3g.jpg',
      },
      {
        title: 'Senna',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1h2j3k4l5m6n7o8p9q0r1s2t3u.jpg',
      },
    ],
  },
  {
    id: 'drama',
    name: 'Drama',
    userAvgRating: 3.2,
    communityAvgRating: 3.9,
    userWatchCount: 200,
    tag: { type: 'comfort_zone', label: 'Comfort Zone' },
    exampleMovies: [
      {
        title: 'The Godfather',
        posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      },
      {
        title: 'Parasite',
        posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      },
      {
        title: "Schindler's List",
        posterUrl: 'https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
      },
      {
        title: 'Shawshank Redemption',
        posterUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      },
      {
        title: 'Fight Club',
        posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      },
    ],
  },
  {
    id: 'comedy',
    name: 'Comedy',
    userAvgRating: 2.5,
    communityAvgRating: 3.1,
    userWatchCount: 50,
    exampleMovies: [
      {
        title: 'Superbad',
        posterUrl: 'https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJnhq.jpg',
      },
      {
        title: 'Booksmart',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1I5hkq177Xo56B1bQZ0LwnY4d2e.jpg',
      },
      {
        title: 'Lady Bird',
        posterUrl: 'https://image.tmdb.org/t/p/w500/iy4oe8E0H1D8dTqvT2cEWDvBqU3.jpg',
      },
      {
        title: 'The Grand Budapest Hotel',
        posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpVrKNAYx.jpg',
      },
      {
        title: 'Mean Girls',
        posterUrl: 'https://image.tmdb.org/t/p/w500/f9ZTuTQLLSDRxpucMgwT96hv0sQ.jpg',
      },
    ],
  },
  {
    id: 'thriller',
    name: 'Thriller',
    userAvgRating: 3.9,
    communityAvgRating: 3.4,
    userWatchCount: 110,
    exampleMovies: [
      {
        title: 'Se7en',
        posterUrl: 'https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg',
      },
      {
        title: 'Parasite',
        posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      },
      {
        title: 'Joker',
        posterUrl: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
      },
      {
        title: 'Silence of the Lambs',
        posterUrl: 'https://image.tmdb.org/t/p/w500/rplLJ2hPcOQmkFhTqUte0MkEaO2.jpg',
      },
      {
        title: 'Gone Girl',
        posterUrl: 'https://image.tmdb.org/t/p/w500/qymaJhucquUwjpb8oiqynMeXnID.jpg',
      },
    ],
  },
  {
    id: 'animation',
    name: 'Animation',
    userAvgRating: 4.1,
    communityAvgRating: 3.8,
    userWatchCount: 85,
    exampleMovies: [
      {
        title: 'Spirited Away',
        posterUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUKGnSxQbUgZ.jpg',
      },
      {
        title: 'Spider-Verse',
        posterUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
      },
      {
        title: 'Lion King',
        posterUrl: 'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
      },
      {
        title: 'Toy Story',
        posterUrl: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
      },
      {
        title: 'Coco',
        posterUrl: 'https://image.tmdb.org/t/p/w500/eKi8dRg2GVbGY4cnOF3MQNICWQw.jpg',
      },
    ],
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    userAvgRating: 3.3,
    communityAvgRating: 3.6,
    userWatchCount: 65,
    exampleMovies: [
      {
        title: 'LOTR: Return of the King',
        posterUrl: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOznC.jpg',
      },
      {
        title: 'Harry Potter',
        posterUrl: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
      },
      {
        title: "Pan's Labyrinth",
        posterUrl: 'https://image.tmdb.org/t/p/w500/7DpeE14RK9ZSPP9VVTfXG2G8S8.jpg',
      },
      {
        title: 'Princess Bride',
        posterUrl: 'https://image.tmdb.org/t/p/w500/dvjqlp2sAhUeFjUOFQDmqiZEqqq.jpg',
      },
      {
        title: 'Stardust',
        posterUrl: 'https://image.tmdb.org/t/p/w500/kP7t6RwGz2AvvR9r1aM6Fw.jpg',
      },
    ],
  },
  {
    id: 'crime',
    name: 'Crime',
    userAvgRating: 4.3,
    communityAvgRating: 3.7,
    userWatchCount: 130,
    exampleMovies: [
      {
        title: 'Pulp Fiction',
        posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      },
      {
        title: 'Goodfellas',
        posterUrl: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
      },
      {
        title: 'The Dark Knight',
        posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      },
      {
        title: 'City of God',
        posterUrl: 'https://image.tmdb.org/t/p/w500/k7eYdWqYQyPjFzFqFzFqFzFqFzF.jpg',
      },
      {
        title: 'The Departed',
        posterUrl: 'https://image.tmdb.org/t/p/w500/nRj5511mZdTl4saWEPJPbK9q2M.jpg',
      },
    ],
  },
  {
    id: 'adventure',
    name: 'Adventure',
    userAvgRating: 2.8,
    communityAvgRating: 3.3,
    userWatchCount: 45,
    exampleMovies: [
      {
        title: 'Indiana Jones',
        posterUrl: 'https://image.tmdb.org/t/p/w500/wd1b36k8uM5c0s7eA3wqMD3g5X2.jpg',
      },
      {
        title: 'Back to the Future',
        posterUrl: 'https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAQL9jeRFW5.jpg',
      },
      {
        title: 'The Revenant',
        posterUrl: 'https://image.tmdb.org/t/p/w500/ji3ecJphATlguKMxdGXqZObXG2t.jpg',
      },
      {
        title: 'Life of Pi',
        posterUrl: 'https://image.tmdb.org/t/p/w500/mYdkD4Qd1k3n8b0P4K1a5l7l7l7.jpg',
      },
      {
        title: 'Into the Wild',
        posterUrl: 'https://image.tmdb.org/t/p/w500/2g1z1b1b1b1b1b1b1b1b1b1b1b.jpg',
      },
    ],
  },
  {
    id: 'mystery',
    name: 'Mystery',
    userAvgRating: 3.7,
    communityAvgRating: 3.2,
    userWatchCount: 75,
    exampleMovies: [
      {
        title: 'Knives Out',
        posterUrl: 'https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
      },
      {
        title: 'Memento',
        posterUrl: 'https://image.tmdb.org/t/p/w500/yuNs09hvpHVU1cbtB3WENqA9pkB.jpg',
      },
      {
        title: 'Shutter Island',
        posterUrl: 'https://image.tmdb.org/t/p/w500/4E2lyBkCzIf43UR95eWRWn340F3.jpg',
      },
      {
        title: 'Prisoners',
        posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      },
      {
        title: 'Zodiac',
        posterUrl: 'https://image.tmdb.org/t/p/w500/6uHEDEh906Z5E5fQ2aKxChFqVSs.jpg',
      },
    ],
  },
  {
    id: 'war',
    name: 'War',
    userAvgRating: 4.0,
    communityAvgRating: 3.9,
    userWatchCount: 30,
    exampleMovies: [
      {
        title: '1917',
        posterUrl: 'https://image.tmdb.org/t/p/w500/iZf0KyrE25z1sage4syFLCCrMi9.jpg',
      },
      {
        title: 'Apocalypse Now',
        posterUrl: 'https://image.tmdb.org/t/p/w500/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg',
      },
      {
        title: 'Dunkirk',
        posterUrl: 'https://image.tmdb.org/t/p/w500/ebSnODDg9lbsMIaWg2uAbjn7LNj.jpg',
      },
      {
        title: 'Saving Private Ryan',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1h2j3k4l5m6n7o8p9q0r1s2t3u.jpg',
      },
      {
        title: 'Full Metal Jacket',
        posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      },
    ],
  },
  {
    id: 'western',
    name: 'Western',
    userAvgRating: 3.1,
    communityAvgRating: 3.0,
    userWatchCount: 12,
    exampleMovies: [
      {
        title: 'Django Unchained',
        posterUrl: 'https://image.tmdb.org/t/p/w500/7oWY8VDWW7thTzWh3OKQTFZf96E.jpg',
      },
      {
        title: 'The Good, the Bad...',
        posterUrl: 'https://image.tmdb.org/t/p/w500/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg',
      },
      {
        title: 'No Country for Old Men',
        posterUrl: 'https://image.tmdb.org/t/p/w500/bj1v6YKF8yHqA489NM8QEZuccwk.jpg',
      },
      {
        title: 'True Grit',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1h2j3k4l5m6n7o8p9q0r1s2t3u.jpg',
      },
      {
        title: 'Unforgiven',
        posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      },
    ],
  },
  {
    id: 'history',
    name: 'History',
    userAvgRating: 3.5,
    communityAvgRating: 3.6,
    userWatchCount: 25,
    exampleMovies: [
      {
        title: 'Oppenheimer',
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      },
      {
        title: 'Hamilton',
        posterUrl: 'https://image.tmdb.org/t/p/w500/h1B7tW0t399VDjAcWJh8m87469b.jpg',
      },
      {
        title: 'Braveheart',
        posterUrl: 'https://image.tmdb.org/t/p/w500/or1gBugydmjToBq7KmV0Gxl5Qzp.jpg',
      },
      {
        title: "The King's Speech",
        posterUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWz7xHl4y7c97n6ghH6.jpg',
      },
      {
        title: 'Hotel Rwanda',
        posterUrl: 'https://image.tmdb.org/t/p/w500/s1c1dD8uC0d21Z3G5A5G2x1H5k.jpg',
      },
    ],
  },
  {
    id: 'music',
    name: 'Music',
    userAvgRating: 3.6,
    communityAvgRating: 3.5,
    userWatchCount: 40,
    exampleMovies: [
      {
        title: 'Whiplash',
        posterUrl: 'https://image.tmdb.org/t/p/w500/6uHEDEh906Z5E5fQ2aKxChFqVSs.jpg',
      },
      {
        title: 'Bohemian Rhapsody',
        posterUrl: 'https://image.tmdb.org/t/p/w500/lHu1r1ltIdnUoGIpZJW6P2eE1eI.jpg',
      },
      {
        title: 'Rocketman',
        posterUrl: 'https://image.tmdb.org/t/p/w500/f4FF18r7nhTTQuxWGV5NBJD3LgV.jpg',
      },
      { title: 'A Star Is Born', posterUrl: 'https://image.tmdb.org/t/p/w500/wraub4A71.jpg' },
      {
        title: 'Tick, Tick... Boom!',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1h2j3k4l5m6n7o8p9q0r1s2t3u.jpg',
      },
    ],
  },
];

export const MOCK_METRICS_RESPONSE: MetricsResponse = {
  status: 'ready',
  progress: 100,
  message: 'Analysis complete',
  ratingGame: {
    movies: [
      {
        movieId: '1',
        title: 'The Godfather',
        director: 'Francis Ford Coppola',
        poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        userRating: 5,
        communityRating: 4.8,
        releaseYear: '1972',
        runtimeMinutes: 175,
      },
      {
        movieId: '2',
        title: 'Pulp Fiction',
        director: 'Quentin Tarantino',
        poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
        userRating: 4.5,
        communityRating: 4.3,
        releaseYear: '1994',
        runtimeMinutes: 154,
      },
      {
        movieId: '3',
        title: 'Spirited Away',
        director: 'Hayao Miyazaki',
        poster: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUKGnSxQbUgZ.jpg',
        userRating: 5,
        communityRating: 4.7,
        releaseYear: '2001',
        runtimeMinutes: 125,
      },
      {
        movieId: '4',
        title: 'Parasite',
        director: 'Bong Joon-ho',
        poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
        userRating: 4,
        communityRating: 4.6,
        releaseYear: '2019',
        runtimeMinutes: 132,
      },
      {
        movieId: '5',
        title: 'The Dark Knight',
        director: 'Christopher Nolan',
        poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        userRating: 5,
        communityRating: 4.7,
        releaseYear: '2008',
        runtimeMinutes: 152,
      },
    ],
  },
  genreGame: {
    genres: [
      { id: 'drama', name: 'Drama', averageRating: 4.2, tier: 'popular' },
      { id: 'crime', name: 'Crime', averageRating: 4.5, tier: 'mid-tier' },
      { id: 'scifi', name: 'Science Fiction', averageRating: 3.8, tier: 'popular' },
      { id: 'thriller', name: 'Thriller', averageRating: 4.0, tier: 'mid-tier' },
      { id: 'action', name: 'Action', averageRating: 3.5, tier: 'popular' },
      { id: 'adventure', name: 'Adventure', averageRating: 3.6, tier: 'mid-tier' },
      { id: 'fantasy', name: 'Fantasy', averageRating: 3.7, tier: 'mid-tier' },
      { id: 'comedy', name: 'Comedy', averageRating: 3.2, tier: 'popular' },
      { id: 'romance', name: 'Romance', averageRating: 3.3, tier: 'mid-tier' },
      { id: 'horror', name: 'Horror', averageRating: 3.1, tier: 'popular' },
    ],
    actualRanking: [
      'crime',
      'drama',
      'thriller',
      'scifi',
      'fantasy',
      'adventure',
      'action',
      'romance',
      'comedy',
      'horror',
    ],
  },
  genreMatchingGame: {
    rounds: MOCK_MATCHING_FILMS.map((film) => ({
      id: film.id,
      slug: film.id,
      title: film.title,
      posterUrl: film.posterUrl,
      year: film.year,
      director: film.director,
      correctGenres: film.correctGenres,
      theoreticalMax: 20,
      genreScoring: film.correctGenres.reduce(
        (acc, genreId) => ({
          ...acc,
          [genreId]: { correct: 5, penalty: -2, missed: -1 },
        }),
        {} as Record<string, { correct: number; penalty: number; missed?: number }>,
      ),
    })),
    rarityMap: MOCK_MATCHING_GENRES.reduce(
      (acc, g) => ({ ...acc, [g.id]: g.tier }),
      {} as Record<string, string>,
    ),
    scoring: {
      WEIGHTS: { niche: 3, 'mid-tier': 2, popular: 1 },
      PENALTY_FACTOR: 0.5,
    },
    maxScorePerMovie: 20,
  },
  themeGame: {
    rounds: MOCK_THEME_ROUNDS,
    sortingRounds: [
      {
        id: 't1',
        theme: 'Dreamlike, quirky, and surreal storytelling',
        averageRating: 4.8,
        type: 'favorite',
        topMovies: [
          {
            title: 'Mulholland Drive',
            posterUrl: 'https://image.tmdb.org/t/p/w500/z09QAf8WbZncbitewNk6lKYMZjm.jpg',
          },
          {
            title: 'Blue Velvet',
            posterUrl: 'https://image.tmdb.org/t/p/w500/7aZ3zW66W9P5RzX2YV1ZfC1UaZc.jpg',
          },
          {
            title: 'Eraserhead',
            posterUrl: 'https://image.tmdb.org/t/p/w500/2L2zY0qZw1QZmYlWcR2aYI1X7r2.jpg',
          },
        ],
      },
      {
        id: 't2',
        theme: 'Surreal and thought-provoking visions of life and death',
        averageRating: 4.6,
        type: 'favorite',
        topMovies: [
          {
            title: 'The Seventh Seal',
            posterUrl: 'https://image.tmdb.org/t/p/w500/5Osbx75g1R2tYpM0zW6X2B9cZw5.jpg',
          },
          {
            title: 'Persona',
            posterUrl: 'https://image.tmdb.org/t/p/w500/2cMzL9fXyZ5Qj1s6aP4c6U3Y6k7.jpg',
          },
        ],
      },
      {
        id: 't3',
        theme: 'Epic history and literature',
        averageRating: 4.5,
        type: 'favorite',
        topMovies: [
          {
            title: 'Lawrence of Arabia',
            posterUrl: 'https://image.tmdb.org/t/p/w500/wA1Bf5A3q1v1c0b3N5v8r1u9x4z.jpg',
          },
          {
            title: 'The Lord of the Rings',
            posterUrl: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',
          },
        ],
      },
      {
        id: 't4',
        theme: 'Thrillers and murder mysteries',
        averageRating: 4.9,
        type: 'favorite',
        topMovies: [
          {
            title: 'Se7en',
            posterUrl: 'https://image.tmdb.org/t/p/w500/6yoghtyTpznpAsOUflz2Q1I0P9F.jpg',
          },
          {
            title: 'Zodiac',
            posterUrl: 'https://image.tmdb.org/t/p/w500/rYTOkHk9P0L9fL9P6uXfG1D7d4g.jpg',
          },
          {
            title: 'Prisoners',
            posterUrl: 'https://image.tmdb.org/t/p/w500/sP5r8eH1e7F8TzX7eJ9f3dG1I2e.jpg',
          },
        ],
      },
      {
        id: 't5',
        theme: 'Visually stunning and emotional science fiction',
        averageRating: 4.7,
        type: 'favorite',
        topMovies: [
          {
            title: 'Interstellar',
            posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MvrIdYjC.jpg',
          },
          {
            title: 'Blade Runner 2049',
            posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
          },
        ],
      },
      {
        id: 't6',
        theme: 'Crude humor and satire',
        averageRating: 1.1,
        type: 'least_favorite',
        topMovies: [
          {
            title: 'Movie 43',
            posterUrl: 'https://image.tmdb.org/t/p/w500/2G0Z1Y0kI2pXzX5YQ3G1kR5N8d1.jpg',
          },
          {
            title: 'Sausage Party',
            posterUrl: 'https://image.tmdb.org/t/p/w500/x7fX5vX8B3G0N4a9fB9C2C1Q7p4.jpg',
          },
        ],
      },
      {
        id: 't7',
        theme: 'Intense violence and sexual transgression',
        averageRating: 1.7,
        type: 'least_favorite',
        topMovies: [
          {
            title: 'A Serbian Film',
            posterUrl: 'https://image.tmdb.org/t/p/w500/5A6C2Kx6B1u3fL7t8V9R2Q8x1I0.jpg',
          },
          {
            title: 'Salò',
            posterUrl: 'https://image.tmdb.org/t/p/w500/1X9C2I7V4W0G4m5t7L3Q2Z1X0J9.jpg',
          },
        ],
      },
      {
        id: 't8',
        theme: 'Heartbreaking and moving family drama',
        averageRating: 2.4,
        type: 'least_favorite',
        topMovies: [
          {
            title: 'The Son',
            posterUrl: 'https://image.tmdb.org/t/p/w500/8X5J2V9P6R5X9x4P8K3V6I1L9Q.jpg',
          },
          {
            title: 'Manchester by the Sea',
            posterUrl: 'https://image.tmdb.org/t/p/w500/1I9R0N1X3Q7X8G4E2W6B0Y9Z7K.jpg',
          },
        ],
      },
      {
        id: 't9',
        theme: 'Slasher horror and jump scares',
        averageRating: 1.2,
        type: 'least_favorite',
        topMovies: [
          {
            title: 'Friday the 13th',
            posterUrl: 'https://image.tmdb.org/t/p/w500/5TCH8h4I2V1V1fC9H3r2W5qX1K8.jpg',
          },
          {
            title: 'Halloween Kills',
            posterUrl: 'https://image.tmdb.org/t/p/w500/1V1K2Y5f3B3K7Q6I9T4V5Z1W5V.jpg',
          },
        ],
      },
      {
        id: 't10',
        theme: 'Boring corporate documentaries',
        averageRating: 1.8,
        type: 'least_favorite',
        topMovies: [
          {
            title: 'Corporate',
            posterUrl: 'https://image.tmdb.org/t/p/w500/2L2zY0qZw1QZmYlWcR2aYI1X7r2.jpg',
          },
          {
            title: 'Startup.com',
            posterUrl: 'https://image.tmdb.org/t/p/w500/7aZ3zW66W9P5RzX2YV1ZfC1UaZc.jpg',
          },
        ],
      },
    ],
  },
  userStats: {
    totalMovies: 1250,
    averageRating: 3.8,
    ratingDistribution: {
      '0.5': 10,
      '1': 25,
      '1.5': 30,
      '2': 50,
      '2.5': 80,
      '3': 200,
      '3.5': 300,
      '4': 350,
      '4.5': 150,
      '5': 55,
    },
    generosity: {
      median: 3.5,
      average: 3.8,
      stdDev: 0.8,
    },
    communityComparison: {
      averageCommunityRating: 3.6,
      averageUserRating: 3.8,
    },
    communityRatingDistribution: {
      '0.5': 5,
      '1': 15,
      '1.5': 20,
      '2': 40,
      '2.5': 100,
      '3': 250,
      '3.5': 350,
      '4': 300,
      '4.5': 100,
      '5': 20,
    },
    guiltyPleasures: [
      {
        movieId: '101',
        title: 'Venom',
        director: 'Ruben Fleischer',
        poster: 'https://image.tmdb.org/t/p/w500/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg',
        userRating: 4.5,
        communityRating: 2.8,
        releaseYear: '2018',
        runtimeMinutes: 112,
      },
    ],
    controversialPicks: [
      {
        movieId: '102',
        title: 'The Tree of Life',
        director: 'Terrence Malick',
        poster: 'https://image.tmdb.org/t/p/w500/rAiYBfsmK4x0q3n11b7fI0m8Ym.jpg',
        userRating: 5,
        communityRating: 3.5,
        releaseYear: '2011',
        runtimeMinutes: 139,
      },
    ],
    hotTakes: [],
    skepticPicks: [],
    genreOverview: MOCK_GENRE_STATS,
  },
  tasteMatch: {
    matches: [
      {
        name: 'The Cinephile Ghost',
        url: '/cineghost/',
        avatarUrl:
          'https://a.ltrbxd.com/resized/avatar/upload/7/6/1/5/2/8/shard/avtr-0-80-0-80-crop.jpg?v=cc1d5d884e',
      },
      {
        name: 'Midnight Watcher',
        url: '/midnight/',
        avatarUrl:
          'https://a.ltrbxd.com/resized/avatar/upload/3/3/8/0/0/5/3/shard/avtr-0-80-0-80-crop.jpg?v=0355312d20',
      },
      {
        name: 'Criterion Collector',
        url: '/criterion/',
        avatarUrl:
          'https://a.ltrbxd.com/resized/avatar/upload/3/6/4/2/4/2/2/shard/avtr-0-80-0-80-crop.jpg?v=a21a220fdf',
      },
      {
        name: 'Noir Dreamer',
        url: '/noirdream/',
        avatarUrl:
          'https://a.ltrbxd.com/resized/avatar/upload/9/5/2/8/9/7/shard/avtr-0-80-0-80-crop.jpg?v=72bce02e54',
      },
      {
        name: 'Celluloid Soul',
        url: '/celluloid/',
        avatarUrl:
          'https://a.ltrbxd.com/resized/avatar/upload/1/3/3/1/9/2/6/2/shard/avtr-0-80-0-80-crop.jpg?v=ddd8471f74',
      },
      {
        name: 'Static Echoes',
        url: '/staticecho/',
        avatarUrl:
          'https://a.ltrbxd.com/resized/avatar/upload/2/2/6/6/2/4/3/shard/avtr-0-80-0-80-crop.jpg?v=fef2ec5ac0',
      },
    ],
    userFavorites: [
      {
        slug: 'my-neighbor-totoro',
        title: 'My Neighbor Totoro',
        posterUrl:
          'https://a.ltrbxd.com/resized/film-poster/4/6/9/8/3/46983-my-neighbor-totoro-0-230-0-345-crop.jpg',
      },
      {
        slug: 'autumn-sonata',
        title: 'Autumn Sonata',
        posterUrl:
          'https://a.ltrbxd.com/resized/film-poster/5/1/5/7/0/51570-autumn-sonata-0-230-0-345-crop.jpg',
      },
      {
        slug: 'the-fall',
        title: 'The Fall',
        posterUrl:
          'https://a.ltrbxd.com/resized/film-poster/4/4/5/9/2/44592-the-fall-0-230-0-345-crop.jpg',
      },
      {
        slug: 'birdman',
        title: 'Birdman',
        posterUrl:
          'https://a.ltrbxd.com/resized/film-poster/1/1/6/7/1/2/116712-birdman-or-the-unexpected-virtue-of-ignorance-0-230-0-345-crop.jpg',
      },
    ],
    matchCount: 3,
  },
};

// ============================================================================
// VIEWING HABITS MOCK DATA
// ============================================================================

export interface MockMovie {
  id: string;
  title: string;
  rating: number;
  posterUrl: string;
}

export interface ActorMockData {
  id: string;
  name: string;
  photoUrl: string | null;
  watchCount: number;
  moviesWatched: MockMovie[];
}

export interface DurationBatchMockData {
  id: string;
  label: string;
  avgRating: number;
  watchCount: number;
  minDuration: number;
  maxDuration: number | null;
}

export interface DistributionGraphMockData {
  id: string;
  isActual: boolean; // Tells us if this is the user's real distribution
  batches: DurationBatchMockData[];
}

export const mockActors: ActorMockData[] = [
  {
    id: 'actor-1',
    name: 'Willem Dafoe',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/ui8e4sgZAwMPi3hzEO53jyBJF9B.jpg',
    watchCount: 15,
    moviesWatched: [
      {
        id: '1',
        title: 'The Lighthouse',
        rating: 4.5,
        posterUrl: 'https://image.tmdb.org/t/p/w500/3nk9UoepYmv1G1M8CqIfQOusYvA.jpg',
      },
      {
        id: '2',
        title: 'Spider-Man',
        rating: 4.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/gh4cZbhZxyTbgxQPxD0dOudNPTn.jpg',
      },
      {
        id: '3',
        title: 'Poor Things',
        rating: 5.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/kCGlIMHnOm8PhbO3VFc69xOepqj.jpg',
      },
    ],
  },
  {
    id: 'actor-2',
    name: 'Tilda Swinton',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/6bZkHAkYolV8h7tYfA38oXyV7kH.jpg',
    watchCount: 12,
    moviesWatched: [
      {
        id: '4',
        title: 'The Grand Budapest Hotel',
        rating: 4.5,
        posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzcNvjcXemt00i.jpg',
      },
      {
        id: '5',
        title: 'Suspiria',
        rating: 4.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/dzWTnkPW9vddRS7PyZmnNa8v1B0.jpg',
      },
      {
        id: '6',
        title: 'We Need to Talk About Kevin',
        rating: 4.5,
        posterUrl: 'https://image.tmdb.org/t/p/w500/w1M21sWqN7u1qQ11n2e15y26jS4.jpg',
      },
    ],
  },
  {
    id: 'actor-3',
    name: 'Ethan Hawke',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/w1W1WnINxX2rF2g3Qj82w2YVb3l.jpg',
    watchCount: 10,
    moviesWatched: [
      {
        id: '7',
        title: 'Before Sunrise',
        rating: 5.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/kf1Jb1c2ZA546h4v80c3C9kHlI7.jpg',
      },
      {
        id: '8',
        title: 'First Reformed',
        rating: 4.5,
        posterUrl: 'https://image.tmdb.org/t/p/w500/tLpEUfE83BEd0X7d0FzG5oGZgC.jpg',
      },
    ],
  },
  {
    id: 'actor-4',
    name: 'Anya Taylor-Joy',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/1zA5GuTgxupOcgA12U59iQtoKic.jpg',
    watchCount: 8,
    moviesWatched: [
      {
        id: '9',
        title: 'The Witch',
        rating: 4.5,
        posterUrl: 'https://image.tmdb.org/t/p/w500/oVQ4B7OEDzDnjtq4B9jYitQJmOh.jpg',
      },
      {
        id: '10',
        title: 'The Northman',
        rating: 4.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/8npA2R1XvY7v99yS9S7A9pGgW37.jpg',
      },
    ],
  },
  {
    id: 'actor-5',
    name: 'Cillian Murphy',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/z1eS4f5yT5B7U2nS9tU57M9p3X1.jpg',
    watchCount: 7,
    moviesWatched: [
      {
        id: '11',
        title: 'Oppenheimer',
        rating: 5.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      },
      {
        id: '12',
        title: '28 Days Later',
        rating: 4.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/eQ4mE2c3Nl0UOfLq5Q1zO6K7V1S.jpg',
      },
    ],
  },
];

// Provide some decoy actors for the question list
export const mockActorWaitlist: ActorMockData[] = [
  ...mockActors,
  {
    id: 'actor-6',
    name: 'Zendaya',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/qEzt0XQjYgJ5k5S2sOtyk61C5pU.jpg',
    watchCount: 4,
    moviesWatched: [],
  },
  {
    id: 'actor-7',
    name: 'Timothée Chalamet',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/8ZzS0K4rL5JbK9J6Z2VnY8qL8B4.jpg',
    watchCount: 5,
    moviesWatched: [],
  },
  {
    id: 'actor-8',
    name: 'Florence Pugh',
    photoUrl: 'https://image.tmdb.org/t/p/w235_and_h235_face/6nri1I6009L1O1I06L1rB2A4O7e.jpg',
    watchCount: 6,
    moviesWatched: [],
  },
];

export const mockDurationBatches: DurationBatchMockData[] = [
  {
    id: 'batch-1',
    label: '<90 min',
    avgRating: 3.4,
    watchCount: 45,
    minDuration: 0,
    maxDuration: 89,
  },
  {
    id: 'batch-2',
    label: '90-120 min',
    avgRating: 3.8,
    watchCount: 150,
    minDuration: 90,
    maxDuration: 119,
  },
  {
    id: 'batch-3',
    label: '120-150 min',
    avgRating: 4.1,
    watchCount: 80,
    minDuration: 120,
    maxDuration: 149,
  },
  {
    id: 'batch-4',
    label: '150+ min',
    avgRating: 4.3,
    watchCount: 25,
    minDuration: 150,
    maxDuration: null,
  },
];

export const mockDistributionGraphs: DistributionGraphMockData[] = [
  {
    id: 'graph-1',
    isActual: true, // Let's say Graph 1 is the real one, based on mockDurationBatches
    batches: mockDurationBatches,
  },
  {
    id: 'graph-2',
    isActual: false,
    batches: [
      {
        id: 'b1',
        label: '<90 min',
        avgRating: 4.0,
        watchCount: 120,
        minDuration: 0,
        maxDuration: 89,
      },
      {
        id: 'b2',
        label: '90-120 min',
        avgRating: 3.5,
        watchCount: 60,
        minDuration: 90,
        maxDuration: 119,
      },
      {
        id: 'b3',
        label: '120-150 min',
        avgRating: 3.2,
        watchCount: 30,
        minDuration: 120,
        maxDuration: 149,
      },
      {
        id: 'b4',
        label: '150+ min',
        avgRating: 3.8,
        watchCount: 15,
        minDuration: 150,
        maxDuration: null,
      },
    ],
  },
  {
    id: 'graph-3',
    isActual: false,
    batches: [
      {
        id: 'b1',
        label: '<90 min',
        avgRating: 3.1,
        watchCount: 20,
        minDuration: 0,
        maxDuration: 89,
      },
      {
        id: 'b2',
        label: '90-120 min',
        avgRating: 3.3,
        watchCount: 40,
        minDuration: 90,
        maxDuration: 119,
      },
      {
        id: 'b3',
        label: '120-150 min',
        avgRating: 4.5,
        watchCount: 160,
        minDuration: 120,
        maxDuration: 149,
      },
      {
        id: 'b4',
        label: '150+ min',
        avgRating: 4.1,
        watchCount: 90,
        minDuration: 150,
        maxDuration: null,
      },
    ],
  },
  {
    id: 'graph-4',
    isActual: false,
    batches: [
      {
        id: 'b1',
        label: '<90 min',
        avgRating: 3.5,
        watchCount: 80,
        minDuration: 0,
        maxDuration: 89,
      },
      {
        id: 'b2',
        label: '90-120 min',
        avgRating: 3.7,
        watchCount: 80,
        minDuration: 90,
        maxDuration: 119,
      },
      {
        id: 'b3',
        label: '120-150 min',
        avgRating: 3.6,
        watchCount: 80,
        minDuration: 120,
        maxDuration: 149,
      },
      {
        id: 'b4',
        label: '150+ min',
        avgRating: 3.5,
        watchCount: 80,
        minDuration: 150,
        maxDuration: null,
      },
    ],
  },
];

// ============================================================================
// TASTE POSITIONING MOCK DATA
// ============================================================================

export const MOCK_TASTE_MOVIES = [
  {
    id: 't-1',
    title: 'The Godfather',
    posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    popularity: 0.95,
    userRating: 5.0,
    communityRating: 4.8,
  },
  {
    id: 't-2',
    title: 'Spider-Man: Across the Spider-Verse',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Vtpi9pR7vLq6tVBvmg97S9Ki6v.jpg',
    popularity: 0.9,
    userRating: 4.5,
    communityRating: 4.5,
  },
  {
    id: 't-3',
    title: 'Everything Everywhere All at Once',
    posterUrl: 'https://image.tmdb.org/t/p/w500/r7XChe2I0vSy6EP97J3oR4rG9Z2.jpg',
    popularity: 0.85,
    userRating: 4.0,
    communityRating: 4.4,
  },
  {
    id: 't-4',
    title: 'Parasite',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    popularity: 0.9,
    userRating: 4.0,
    communityRating: 4.6,
  },
  {
    id: 't-5',
    title: 'The Dark Knight',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    popularity: 0.98,
    userRating: 5.0,
    communityRating: 4.7,
  },
  {
    id: 't-6',
    title: 'Interstellar',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    popularity: 0.92,
    userRating: 4.5,
    communityRating: 4.3,
  },
  {
    id: 't-7',
    title: 'La La Land',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWz7xHl4y7c97n6ghH6.jpg',
    popularity: 0.88,
    userRating: 4.0,
    communityRating: 3.9,
  },
  {
    id: 't-8',
    title: 'The Whale',
    posterUrl: 'https://image.tmdb.org/t/p/w500/jQ064lsz9uVBv92pSZnunlx7v9h.jpg',
    popularity: 0.8,
    userRating: 3.5,
    communityRating: 3.6,
  },
  {
    id: 't-9',
    title: 'Barbie',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iuFNmBTD0X4EXI0V9QpKnoIbiHn.jpg',
    popularity: 0.96,
    userRating: 3.0,
    communityRating: 3.8,
  },
  {
    id: 't-10',
    title: 'Oppenheimer',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    popularity: 0.94,
    userRating: 4.5,
    communityRating: 4.3,
  },
  {
    id: 't-11',
    title: 'Aftersun',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vPxIsUvVfE3InmAr0pWizAnYl9A.jpg',
    popularity: 0.6,
    userRating: 5.0,
    communityRating: 4.2,
  },
  {
    id: 't-12',
    title: 'Decision to Leave',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96uIAbqW9Cj8f6Bqis6LzRVsjIe.jpg',
    popularity: 0.55,
    userRating: 4.5,
    communityRating: 4.0,
  },
  {
    id: 't-13',
    title: 'The Banshees of Inisherin',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4H679jYV72OAdMAn3vBfMStvJ8h.jpg',
    popularity: 0.7,
    userRating: 4.0,
    communityRating: 4.0,
  },
  {
    id: 't-14',
    title: 'Titane',
    posterUrl: 'https://image.tmdb.org/t/p/w500/pA7pU671H2l3qUto691I3rZAs5O.jpg',
    popularity: 0.4,
    userRating: 4.5,
    communityRating: 3.5,
  },
  {
    id: 't-15',
    title: 'Perfect Blue',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.5,
    userRating: 5.0,
    communityRating: 4.4,
  },
  {
    id: 't-16',
    title: 'Burning',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.45,
    userRating: 4.0,
    communityRating: 4.0,
  },
  {
    id: 't-17',
    title: 'Portrait of a Lady on Fire',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.52,
    userRating: 4.5,
    communityRating: 4.4,
  },
  {
    id: 't-18',
    title: 'Memories of Murder',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.58,
    userRating: 5.0,
    communityRating: 4.4,
  },
  {
    id: 't-19',
    title: 'Céline and Julie Go Boating',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.1,
    userRating: 4.5,
    communityRating: 3.9,
  },
  {
    id: 't-20',
    title: 'The Holy Mountain',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.2,
    userRating: 4.0,
    communityRating: 4.0,
  },
  {
    id: 't-21',
    title: 'Jeanne Dielman...',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.05,
    userRating: 3.5,
    communityRating: 4.1,
  },
  {
    id: 't-22',
    title: 'Stalker',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.35,
    userRating: 5.0,
    communityRating: 4.4,
  },
  {
    id: 't-23',
    title: 'Mirror',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.3,
    userRating: 4.5,
    communityRating: 4.3,
  },
  {
    id: 't-24',
    title: 'Persona',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.48,
    userRating: 5.0,
    communityRating: 4.5,
  },
  {
    id: 't-25',
    title: 'In the Mood for Love',
    posterUrl: 'https://image.tmdb.org/t/p/w500/96AbB0Zz0w6c0vW9pX8W6W6W6W6.jpg',
    popularity: 0.65,
    userRating: 5.0,
    communityRating: 4.4,
  },
];
