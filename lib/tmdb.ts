const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY as string;
const BASE_URL = 'https://api.themoviedb.org/3';

const safeFetch = async (url: string, retries: number = 2) => {
  try {
    const res = await fetch(url);
    
    // Handle transient server errors with retries
    if (!res.ok && res.status >= 500 && retries > 0) {
      console.warn(`Retrying fetch due to server error ${res.status}: ${url}. Retries left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return safeFetch(url, retries - 1);
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`API Request failed with status ${res.status}: ${url}. Response: ${errorText.substring(0, 100)}`);
      throw new Error(`API error ${res.status}`);
    }
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`Expected JSON but got ${contentType} from ${url}. Response: ${text.substring(0, 100)}`);
      throw new Error('Invalid response format');
    }
    return res.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Retrying fetch due to exception: ${url}. Retries left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return safeFetch(url, retries - 1);
    }
    console.warn(`Fetch error for ${url}:`, error);
    throw error;
  }
};

export const getImageUrl = (path: string, size: string = 'w500') => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const fetchTrending = async () => {
  return safeFetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
};

export const fetchPopular = async () => {
  return safeFetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`);
};

export const fetchTopRated = async () => {
  return safeFetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`);
};

export const fetchNowPlaying = async () => {
  return safeFetch(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}`);
};

export const fetchMovieDetails = async (id: number) => {
  return safeFetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=credits,recommendations,videos,external_ids`);
};

export const fetchTrendingTV = async () => {
  return safeFetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}`);
};

export const fetchPopularTV = async () => {
  return safeFetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`);
};

export const fetchTVDetails = async (id: number) => {
  return safeFetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&append_to_response=credits,recommendations,videos,external_ids`);
};

export const fetchRecommendations = async (type: 'movie' | 'tv', id: number) => {
  return safeFetch(`${BASE_URL}/${type}/${id}/recommendations?api_key=${API_KEY}`);
};

export const fetchSimilar = async (type: 'movie' | 'tv', id: number) => {
  return safeFetch(`${BASE_URL}/${type}/${id}/similar?api_key=${API_KEY}`);
};

export const fetchSeasonDetails = async (tvId: number, seasonNumber: number) => {
  return safeFetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`);
};

export const searchMulti = async (query: string, page: number = 1) => {
  return safeFetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}`);
};

export const fetchMovieGenres = async () => {
  return safeFetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
};

export const fetchTVGenres = async () => {
  return safeFetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`);
};

export const fetchTopRatedTV = async () => {
  return safeFetch(`${BASE_URL}/tv/top_rated?api_key=${API_KEY}`);
};

export const fetchByGenre = async (type: 'movie' | 'tv', genreId: number) => {
  return safeFetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`);
};

export const discoverMedia = async (type: 'movie' | 'tv', filters: { genre?: string, year?: string, rating?: string }, page: number = 1) => {
  let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&page=${page}&sort_by=popularity.desc`;
  
  if (filters.genre) {
    url += `&with_genres=${filters.genre}`;
  }
  
  if (filters.year) {
    const yearParam = type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
    url += `&${yearParam}=${filters.year}`;
  }
  
  if (filters.rating) {
    url += `&vote_average.gte=${filters.rating}`;
  }
  
  return safeFetch(url);
};
