export interface Provider {
  name: string;
  key: string;
  buildMovieUrl: (id: string, imdbId?: string) => string;
  buildTvUrl: (id: string, season: number, episode: number, imdbId?: string) => string;
}

export const PROVIDERS: Provider[] = [
  {
    name: 'VidSrc',
    key: 'vidsrc',
    buildMovieUrl: (id, imdbId) => `https://vidsrc.icu/embed/movie/${id}`,
    buildTvUrl: (id, season, episode) => `https://vidsrc.icu/embed/tv/${id}/${season}/${episode}`,
  },
  {
    name: '2Embed',
    key: '2embed',
    buildMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    buildTvUrl: (id, season, episode) => `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
  },
  {
    name: 'VidZee',
    key: 'vidzee',
    buildMovieUrl: (id) => `https://player.vidzee.wtf/v2/embed/movie/${id}`,
    buildTvUrl: (id, season, episode) => `https://player.vidzee.wtf/v2/embed/tv/${id}/${season}/${episode}`,
  },
  {
    name: 'GoDrivePlayer',
    key: 'godriveplayer',
    buildMovieUrl: (id, imdbId) => `https://godriveplayer.com/player.php?imdb=${imdbId || id}`,
    buildTvUrl: (id, season, episode) => `https://godriveplayer.com/player.php?type=series&tmdb=${id}`,
  },
  {
    name: 'VidBinge',
    key: 'vidbinge',
    buildMovieUrl: (id) => `https://vidbinge.to/movie/${id}`,
    buildTvUrl: (id, season, episode) => `https://vidbinge.to/tv/${id}/${season}/${episode}`,
  },
  {
    name: 'PrimeSrc',
    key: 'primesrc',
    buildMovieUrl: (id, imdbId) => `https://primesrc.me/embed/movie?tmdb=${imdbId || id}`,
    buildTvUrl: (id, season, episode) => `https://primesrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`,
  },
];

export const DEFAULT_PROVIDER = PROVIDERS[0];

let sessionProvider = DEFAULT_PROVIDER;

export const getSessionProvider = () => sessionProvider;
export const setSessionProvider = (provider: Provider) => {
  sessionProvider = provider;
};
